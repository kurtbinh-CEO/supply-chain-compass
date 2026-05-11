// DRP Engine — UNIS allocation rules
// Order: LCNB → Hub → NM → Substitution → Gap
// Demand at sku_base, dual demand = MAX(forecast, po_pending)
// on_hand_available = quantity - reserved_hard - quarantine - soft_reserved
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Body {
  tenant_id: string;
  demand_version_id?: string | null;
  run_name?: string;
  allocation_objective?: "LEADTIME_SHORTEST" | "LOWEST_COST";
}

const skuBase = (sku: string) => sku.split(/[-_ ]/)[0] ?? sku;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: Body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { tenant_id, demand_version_id = null, run_name, allocation_objective = "LEADTIME_SHORTEST" } = body;
  if (!tenant_id) {
    return new Response(JSON.stringify({ error: "tenant_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Resolve tenant code (inventory & demand_forecasts use tenant TEXT)
  const { data: tenantRow, error: tErr } = await supabase
    .from("tenants").select("tenant_code").eq("id", tenant_id).maybeSingle();
  if (tErr || !tenantRow) {
    return new Response(JSON.stringify({ error: "Tenant not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const tenantCode: string = tenantRow.tenant_code;

  // ── Step 1 LOAD ────────────────────────────────────────
  const [
    fcRes, invRes, ssRes, ltRes, poRes, subsRes, niRes, nmcRes,
  ] = await Promise.all([
    supabase.from("demand_forecasts").select("cn_code, sku, forecast_qty").eq("tenant", tenantCode),
    supabase.from("inventory").select("cn_code, sku, quantity, reserved_hard, quarantine, soft_reserved, warehouse_code").eq("tenant", tenantCode),
    supabase.from("safety_stock").select("cn_code, sku_code, ss_qty").eq("tenant_id", tenant_id),
    supabase.from("lead_times").select("source_code, dest_code, leadtime_days, transport_cost").eq("tenant_id", tenant_id),
    supabase.from("purchase_orders").select("sku, quantity, status").eq("tenant", tenantCode).in("status", ["draft", "approved", "in_transit", "ordered"] as never),
    supabase.from("substitution_lists").select("original_sku, substitute_sku, cn_code, priority, max_depth").eq("tenant_id", tenant_id).eq("is_active", true),
    supabase.from("master_items").select("code, nm_id").eq("tenant", tenantCode).eq("is_active", true),
    supabase.from("nm_sku_constraint").select("sku_code, nm_code, can_produce, moq_base_uom").eq("tenant_id", tenant_id).eq("is_active", true),
  ]);

  const fc = fcRes.data ?? [];
  const inv = invRes.data ?? [];
  const ss = ssRes.data ?? [];
  const po = poRes.data ?? [];
  const subs = subsRes.data ?? [];
  const items = niRes.data ?? [];
  const nmc = nmcRes.data ?? [];

  // Aggregate forecast at sku_base × cn
  type Key = string; // `${cn}|${base}`
  const fcAgg = new Map<Key, number>();
  for (const r of fc) {
    const k = `${r.cn_code}|${skuBase(r.sku)}`;
    fcAgg.set(k, (fcAgg.get(k) ?? 0) + Number(r.forecast_qty ?? 0));
  }

  // PO pending aggregated at sku_base (network-wide)
  const poAgg = new Map<string, number>();
  for (const r of po) {
    const b = skuBase(r.sku);
    poAgg.set(b, (poAgg.get(b) ?? 0) + Number(r.quantity ?? 0));
  }

  // Inventory: available per cn × sku_base, plus a "hub pool" (warehouse_code starts with WH-) treated as networked surplus
  const availByCnBase = new Map<Key, number>();
  let hubPool = 0;
  for (const r of inv) {
    const avail = Number(r.quantity ?? 0)
      - Number(r.reserved_hard ?? 0)
      - Number(r.quarantine ?? 0)
      - Number(r.soft_reserved ?? 0);
    const base = skuBase(r.sku);
    const k = `${r.cn_code}|${base}`;
    availByCnBase.set(k, (availByCnBase.get(k) ?? 0) + avail);
    if ((r.warehouse_code ?? "").startsWith("WH-")) hubPool += Math.max(avail, 0);
  }

  const ssMap = new Map<Key, number>();
  for (const r of ss) ssMap.set(`${r.cn_code}|${skuBase(r.sku_code)}`, Number(r.ss_qty ?? 0));

  // Build demand list with dual demand
  type Row = { cn: string; base: string; demand: number; netReq: number };
  const demandRows: Row[] = [];
  for (const [k, fcQty] of fcAgg.entries()) {
    const [cn, base] = k.split("|");
    const poQty = poAgg.get(base) ?? 0;
    const effDemand = Math.max(fcQty, poQty);
    const avail = availByCnBase.get(k) ?? 0;
    const ssQty = ssMap.get(k) ?? 0;
    const netReq = effDemand - (avail - ssQty);
    demandRows.push({ cn, base, demand: effDemand, netReq });
  }

  // Surplus map for LCNB (cn × base) — capacity above SS
  const surplus = new Map<Key, number>();
  for (const [k, avail] of availByCnBase.entries()) {
    const ssQty = ssMap.get(k) ?? 0;
    const s = avail - ssQty;
    if (s > 0) surplus.set(k, s);
  }

  // Step 0 SNAPSHOT
  const snapshot = {
    tenant_code: tenantCode,
    demand_version_id,
    counts: {
      forecast_rows: fc.length, inventory_rows: inv.length, po_rows: po.length,
      ss_rows: ss.length, lt_rows: ltRes.data?.length ?? 0,
      subs_rows: subs.length, items_rows: items.length, nmc_rows: nmc.length,
    },
    hub_pool_qty: hubPool,
    captured_at: new Date().toISOString(),
  };

  const finalRunName = run_name?.trim() || `DRP-${new Date().toISOString().slice(0, 16).replace(/[-T:]/g, "")}`;

  const { data: prInsert, error: prErr } = await supabase
    .from("plan_runs")
    .insert({
      tenant_id,
      run_name: finalRunName,
      run_type: "WEEKLY_DRP",
      lifecycle: "RUNNING",
      demand_version_id,
      allocation_objective,
      input_snapshot_json: snapshot,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (prErr || !prInsert) {
    return new Response(JSON.stringify({ error: prErr?.message ?? "plan_runs insert failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const planRunId: string = prInsert.id;

  // ── Step 3 ALLOCATE ────────────────────────────────────
  type Result = {
    plan_run_id: string; cn_code: string; sku_code: string; sku_base: string;
    demand_qty: number; allocated_qty: number;
    source_type: "ON_HAND" | "PIPELINE" | "HUB_PO" | "LCNB" | "INTERNAL_TO" | "GAP";
    source_location?: string | null; gap_qty?: number; exception_type?: string | null;
  };
  const results: Result[] = [];
  const exceptions: Array<{
    tenant_id: string; drp_run_id: string; cn_code: string; sku_code: string;
    kind: string; severity: string; message: string;
    suggested_action?: string;
  }> = [];

  let totalDemand = 0, totalAllocated = 0;

  // Build NM map: base -> nm_code (from master_items + nm_sku_constraint)
  const itemNm = new Map<string, string>(); // sku_code -> nm_id
  for (const it of items) if (it.code && it.nm_id) itemNm.set(it.code, it.nm_id);
  const nmCanProduce = new Map<string, boolean>(); // `${nm}|${sku}`
  for (const c of nmc) nmCanProduce.set(`${c.nm_code}|${c.sku_code}`, c.can_produce !== false);

  // Substitution: original_sku(base) -> ranked substitutes
  const subMap = new Map<string, Array<{ sub: string; pri: number; depth: number }>>();
  for (const s of subs) {
    const base = skuBase(s.original_sku);
    const arr = subMap.get(base) ?? [];
    arr.push({ sub: s.substitute_sku, pri: Number(s.priority ?? 99), depth: Number(s.max_depth ?? 3) });
    subMap.set(base, arr);
  }
  for (const arr of subMap.values()) arr.sort((a, b) => a.pri - b.pri);

  for (const row of demandRows) {
    totalDemand += row.demand;
    if (row.netReq <= 0) {
      // Already covered by on_hand - SS
      const covered = Math.min(row.demand, row.demand - row.netReq); // = row.demand
      results.push({
        plan_run_id: planRunId, cn_code: row.cn, sku_code: row.base, sku_base: row.base,
        demand_qty: row.demand, allocated_qty: covered, source_type: "ON_HAND",
        source_location: row.cn, gap_qty: 0,
      });
      totalAllocated += covered;
      continue;
    }

    let need = row.netReq;
    let alloc = 0;

    // 3a LCNB — surplus from other CNs
    for (const [k, s] of surplus.entries()) {
      if (need <= 0) break;
      const [srcCn, srcBase] = k.split("|");
      if (srcBase !== row.base || srcCn === row.cn || s <= 0) continue;
      const take = Math.min(s, need);
      surplus.set(k, s - take);
      results.push({
        plan_run_id: planRunId, cn_code: row.cn, sku_code: row.base, sku_base: row.base,
        demand_qty: row.demand, allocated_qty: take, source_type: "LCNB",
        source_location: srcCn,
      });
      alloc += take; need -= take;
    }

    // 3b Hub pool
    if (need > 0 && hubPool > 0) {
      const take = Math.min(hubPool, need);
      hubPool -= take;
      results.push({
        plan_run_id: planRunId, cn_code: row.cn, sku_code: row.base, sku_base: row.base,
        demand_qty: row.demand, allocated_qty: take, source_type: "HUB_PO",
        source_location: "HUB",
      });
      alloc += take; need -= take;
    }

    // 3c NM (factory) — must have can_produce
    if (need > 0) {
      const nm = itemNm.get(row.base);
      if (nm && nmCanProduce.get(`${nm}|${row.base}`) !== false) {
        const take = need; // assume capacity available
        results.push({
          plan_run_id: planRunId, cn_code: row.cn, sku_code: row.base, sku_base: row.base,
          demand_qty: row.demand, allocated_qty: take, source_type: "PIPELINE",
          source_location: nm,
        });
        alloc += take; need -= take;
      }
    }

    // 3d Substitution (depth ≤3)
    if (need > 0) {
      const subList = subMap.get(row.base) ?? [];
      let depth = 0;
      for (const s of subList) {
        if (need <= 0 || depth >= (s.depth ?? 3)) break;
        // try to draw from any CN surplus of substitute base
        for (const [k, sQty] of surplus.entries()) {
          if (need <= 0) break;
          const [srcCn, srcBase] = k.split("|");
          if (srcBase !== skuBase(s.sub) || sQty <= 0) continue;
          const take = Math.min(sQty, need);
          surplus.set(k, sQty - take);
          results.push({
            plan_run_id: planRunId, cn_code: row.cn, sku_code: row.base, sku_base: row.base,
            demand_qty: row.demand, allocated_qty: take, source_type: "INTERNAL_TO",
            source_location: `SUB:${s.sub}@${srcCn}`,
          });
          alloc += take; need -= take;
        }
        depth++;
      }
    }

    // 3e GAP
    if (need > 0) {
      results.push({
        plan_run_id: planRunId, cn_code: row.cn, sku_code: row.base, sku_base: row.base,
        demand_qty: row.demand, allocated_qty: 0, source_type: "GAP",
        gap_qty: need, exception_type: "SHORTAGE",
      });
      exceptions.push({
        tenant_id, drp_run_id: planRunId, cn_code: row.cn, sku_code: row.base,
        kind: "SHORTAGE", severity: "warn",
        message: `Thiếu ${Math.round(need)} đơn vị tại ${row.cn} cho ${row.base}`,
        suggested_action: "Tạo PO khẩn hoặc điều chuyển nội bộ",
      });
    }

    totalAllocated += alloc;
  }

  // ── Step 4 SAVE ───────────────────────────────────────
  if (results.length > 0) {
    // Chunk insert to avoid payload limits
    const CHUNK = 500;
    for (let i = 0; i < results.length; i += CHUNK) {
      const slice = results.slice(i, i + CHUNK);
      const { error } = await supabase.from("plan_run_results").insert(slice);
      if (error) console.error("plan_run_results insert error:", error);
    }
  }
  if (exceptions.length > 0) {
    const { error } = await supabase.from("drp_exceptions").insert(exceptions);
    if (error) console.error("drp_exceptions insert error:", error);
  }

  // Auto-generate TO Plan DRAFT rows from allocated results (INTERNAL_TO/LCNB/HUB_PO/PIPELINE)
  const toPlanRows = results
    .filter((r: any) => r.allocated_qty > 0 && ["INTERNAL_TO", "LCNB", "HUB_PO", "PIPELINE"].includes(r.source_type))
    .map((r: any) => ({
      tenant_id,
      plan_run_id: planRunId,
      to_code: "", // trigger will assign
      source_nm: r.source_location ?? null,
      dest_cn: r.cn_code,
      sku_code: r.sku_code,
      planned_qty: r.allocated_qty,
      dispatch_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      status: "DRAFT",
    }));
  if (toPlanRows.length > 0) {
    const CHUNK = 200;
    for (let i = 0; i < toPlanRows.length; i += CHUNK) {
      const { error } = await supabase.from("to_plans").insert(toPlanRows.slice(i, i + CHUNK));
      if (error) console.error("to_plans auto-insert error:", error);
    }
  }

  const fillRate = totalDemand > 0 ? totalAllocated / totalDemand : 0;
  const lostSales = Math.max(totalDemand - totalAllocated, 0);

  await supabase.from("plan_runs").update({
    lifecycle: "SUCCEEDED",
    completed_at: new Date().toISOString(),
    fill_rate: fillRate,
    total_demand: totalDemand,
    total_allocated: totalAllocated,
    lost_sales_qty: lostSales,
    exception_count: exceptions.length,
  }).eq("id", planRunId);

  return new Response(JSON.stringify({
    ok: true,
    plan_run_id: planRunId,
    fill_rate: fillRate,
    total_demand: totalDemand,
    total_allocated: totalAllocated,
    lost_sales_qty: lostSales,
    exception_count: exceptions.length,
    result_rows: results.length,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

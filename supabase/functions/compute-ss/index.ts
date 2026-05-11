/**
 * compute-ss — Compute Safety Stock per CN×SKU using 2-tier UNIS formula.
 *
 * SS_CN = z × √(LT × σ²_fc + ADU² × σ²_LT)
 *   - σ_fc : stdev(actual − forecast) from demand_forecasts (≥ 6 months → as-is, else floor 60% of ADU as σ_fc proxy)
 *   - σ_LT : 0 (deterministic LT — kept for future tier)
 *   - ADU  : Σ forecast_qty / 30 (last 6 months)
 *   - LT   : lead_times.leadtime_days (priority=1)
 * Floor : SS_CN ≥ 0.6 × ADU × LT
 * LCNB  : if config_registry.allocation.lcnb.enabled = 'true' → SS_CN × 0.75
 *
 * Persists result via UPSERT into safety_stock.
 */
// @ts-nocheck — Deno runtime
// deploy: 1
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const tenant_id: string | undefined = body.tenant_id;
    const z_factor: number = Number(body.z_factor ?? 1.65);
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve tenant_code (demand_forecasts uses TEXT tenant)
    const { data: tenantRow, error: tErr } = await supabase
      .from("tenants").select("tenant_code").eq("id", tenant_id).maybeSingle();
    if (tErr || !tenantRow) {
      return new Response(JSON.stringify({ error: "tenant not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tenant_code = tenantRow.tenant_code as string;

    // LCNB flag
    const { data: lcnbRow } = await supabase
      .from("config_registry").select("config_value")
      .eq("tenant_id", tenant_id).eq("config_key", "allocation.lcnb.enabled")
      .maybeSingle();
    const lcnbEnabled = (lcnbRow?.config_value ?? "false").toLowerCase() === "true";
    const lcnbFactor = lcnbEnabled ? 0.75 : 1.0;

    // Fetch forecasts (TEXT tenant)
    const { data: fcs, error: fErr } = await supabase
      .from("demand_forecasts")
      .select("cn_code, sku, forecast_qty, actual_qty, period_start")
      .eq("tenant", tenant_code)
      .order("period_start", { ascending: true });
    if (fErr) throw fErr;

    // Lead times keyed by dest_code (priority 1)
    const { data: lts } = await supabase
      .from("lead_times").select("dest_code, leadtime_days, priority")
      .eq("tenant_id", tenant_id);
    const ltByDest: Record<string, number> = {};
    (lts ?? []).forEach((r) => {
      const cur = ltByDest[r.dest_code];
      if (cur === undefined || (r.priority ?? 99) < 99) {
        ltByDest[r.dest_code] = Number(r.leadtime_days);
      }
    });

    // Existing SS for compare
    const { data: existing } = await supabase
      .from("safety_stock").select("sku_code, cn_code, ss_qty")
      .eq("tenant_id", tenant_id);
    const oldByKey: Record<string, number> = {};
    (existing ?? []).forEach((r) => {
      oldByKey[`${r.cn_code}|${r.sku_code}`] = Number(r.ss_qty);
    });

    // Group fcs by CN×SKU
    const groups = new Map<string, { cn: string; sku: string; fc: number[]; act: number[] }>();
    (fcs ?? []).forEach((r) => {
      const k = `${r.cn_code}|${r.sku}`;
      if (!groups.has(k)) groups.set(k, { cn: r.cn_code, sku: r.sku, fc: [], act: [] });
      const g = groups.get(k)!;
      g.fc.push(Number(r.forecast_qty));
      g.act.push(Number(r.actual_qty ?? 0));
    });

    const results: Array<Record<string, unknown>> = [];
    const upserts: Array<Record<string, unknown>> = [];

    for (const [, g] of groups) {
      const months = g.fc.length;
      const sumFc = g.fc.reduce((a, b) => a + b, 0);
      const adu = sumFc / 30; // per-day across the window of months × 30 = sum/30 per "month-equivalent day"
      // errors only where actual > 0
      const errors = g.fc
        .map((f, i) => ({ f, a: g.act[i] }))
        .filter((x) => x.a > 0)
        .map((x) => x.a - x.f);
      let sigmaFc = stdev(errors);
      // Floor 60% if data < 6 months OR sigma too small
      const floorSigma = 0.6 * adu;
      if (months < 6 || sigmaFc < floorSigma) sigmaFc = Math.max(sigmaFc, floorSigma);

      const lt = ltByDest[g.cn] ?? 7;
      const sigmaLt = 0; // deterministic LT
      let ss = z_factor * Math.sqrt(lt * sigmaFc ** 2 + adu ** 2 * sigmaLt ** 2);
      // Floor SS ≥ 0.6 × ADU × LT
      const ssFloor = 0.6 * adu * lt;
      if (ss < ssFloor) ss = ssFloor;
      // LCNB reduction
      const ssBefore = ss;
      ss = ss * lcnbFactor;

      const ssRounded = Math.round(ss);
      const oldSs = oldByKey[`${g.cn}|${g.sku}`] ?? 0;
      const delta = ssRounded - oldSs;
      const deltaPct = oldSs === 0 ? 100 : (delta / oldSs) * 100;

      results.push({
        cn_code: g.cn,
        sku_code: g.sku,
        old_ss: oldSs,
        new_ss: ssRounded,
        delta,
        delta_pct: Number(deltaPct.toFixed(2)),
        adu: Number(adu.toFixed(2)),
        sigma_fc: Number(sigmaFc.toFixed(2)),
        lead_time_days: lt,
        ss_before_lcnb: Math.round(ssBefore),
        lcnb_applied: lcnbEnabled,
        needs_confirm: Math.abs(deltaPct) >= 10,
      });

      upserts.push({
        tenant_id,
        sku_code: g.sku,
        cn_code: g.cn,
        ss_qty: ssRounded,
        z_factor,
        lead_time_days: lt,
      });
    }

    if (upserts.length > 0) {
      const { error: upErr } = await supabase
        .from("safety_stock")
        .upsert(upserts, { onConflict: "tenant_id,sku_code,cn_code" });
      if (upErr) throw upErr;
    }

    return new Response(
      JSON.stringify({
        tenant_id,
        tenant_code,
        z_factor,
        lcnb_enabled: lcnbEnabled,
        lcnb_factor: lcnbFactor,
        rows: results,
        updated: upserts.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

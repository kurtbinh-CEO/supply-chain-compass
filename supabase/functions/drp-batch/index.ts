// Edge function: drp-batch
// Handles DRP batch lifecycle (create/review/approve/release/cancel/reject_items)
// Server-side ensures audit log + atomic PO insert on release.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface BatchItem {
  code: string;
  kind: "RPO" | "TO";
  nm?: string;
  fromCn?: string;
  toCn?: string;
  sku: string;
  qty: number;
  value: number;
  eta: string;
  rejected?: boolean;
}

interface CreatePayload {
  action: "create";
  batch: {
    batchCode: string;
    items: BatchItem[];
    unresolved: Array<Record<string, unknown>>;
  };
}
interface TransitionPayload {
  action: "review" | "approve" | "release" | "cancel";
  batchId: string;
  note?: string;
}
interface RejectPayload {
  action: "reject_items";
  batchId: string;
  codes: string[];
  note: string;
}
interface ApproveSubsetPayload {
  action: "approve_subset";
  batchId: string;
  codes: string[];
  note: string;
}
type Payload =
  | CreatePayload
  | TransitionPayload
  | RejectPayload
  | ApproveSubsetPayload;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller via JWT
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "Invalid token" }, 401);
    }
    const userId = userData.user.id;

    // Fetch role for audit trail
    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    const actorRole = roleRow?.role ?? "viewer";

    // Privileged client for writes (server bypasses RLS but we still gate ourselves)
    const admin = createClient(supabaseUrl, serviceKey);

    const body = (await req.json()) as Payload;
    if (!body || !body.action) {
      return json({ error: "Missing action" }, 400);
    }

    // ─────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────
    if (body.action === "create") {
      if (!["admin", "sc_manager"].includes(actorRole)) {
        return json({ error: "Forbidden — need SC Manager" }, 403);
      }
      const { batch } = body;
      if (!batch?.batchCode || !Array.isArray(batch.items)) {
        return json({ error: "Invalid batch payload" }, 400);
      }
      const items = batch.items;
      const totalRpo = items.filter((i) => i.kind === "RPO").length;
      const totalTo = items.filter((i) => i.kind === "TO").length;
      const totalValue = items.reduce((s, i) => s + (i.value || 0), 0);
      const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);

      const { data: run, error: insErr } = await admin
        .from("drp_runs")
        .insert({
          batch_code: batch.batchCode,
          status: "draft",
          total_rpo: totalRpo,
          total_to: totalTo,
          total_value: totalValue,
          total_qty: totalQty,
          unresolved_count: batch.unresolved?.length ?? 0,
          payload: { items, unresolved: batch.unresolved ?? [] },
          created_by: userId,
        })
        .select()
        .single();
      if (insErr) return json({ error: insErr.message }, 500);

      await admin.from("drp_audit_log").insert({
        batch_id: run.id,
        action: "created",
        from_status: null,
        to_status: "draft",
        actor_id: userId,
        actor_role: actorRole,
        note: `Batch ${batch.batchCode} created with ${totalRpo} RPO + ${totalTo} TO`,
        metadata: { totalValue, totalQty },
      });

      return json({ batch: run }, 200);
    }

    // ─────────────────────────────────────────────
    // Common: load batch
    // ─────────────────────────────────────────────
    const batchId = (body as TransitionPayload).batchId;
    if (!batchId) return json({ error: "Missing batchId" }, 400);
    const { data: batch, error: loadErr } = await admin
      .from("drp_runs")
      .select("*")
      .eq("id", batchId)
      .single();
    if (loadErr || !batch) return json({ error: "Batch not found" }, 404);

    const fromStatus = batch.status as string;
    const writeRoles = ["admin", "sc_manager"];
    if (!writeRoles.includes(actorRole)) {
      return json({ error: "Forbidden — need SC Manager" }, 403);
    }

    // ─────────────────────────────────────────────
    // REVIEW
    // ─────────────────────────────────────────────
    if (body.action === "review") {
      if (fromStatus !== "draft") {
        return json({ error: `Cannot review from ${fromStatus}` }, 409);
      }
      const ts = new Date().toISOString();
      await admin.from("drp_runs").update({
        status: "reviewed",
        reviewed_by: userId,
        reviewed_at: ts,
      }).eq("id", batchId);
      await admin.from("drp_audit_log").insert({
        batch_id: batchId,
        action: "reviewed",
        from_status: fromStatus,
        to_status: "reviewed",
        actor_id: userId,
        actor_role: actorRole,
        note: body.note ?? null,
      });
      return json({ ok: true, status: "reviewed", at: ts }, 200);
    }

    // ─────────────────────────────────────────────
    // APPROVE
    // ─────────────────────────────────────────────
    if (body.action === "approve") {
      if (!["draft", "reviewed"].includes(fromStatus)) {
        return json({ error: `Cannot approve from ${fromStatus}` }, 409);
      }
      const ts = new Date().toISOString();
      await admin.from("drp_runs").update({
        status: "approved",
        approved_by: userId,
        approved_at: ts,
      }).eq("id", batchId);
      await admin.from("drp_audit_log").insert({
        batch_id: batchId,
        action: "approved",
        from_status: fromStatus,
        to_status: "approved",
        actor_id: userId,
        actor_role: actorRole,
        note: body.note ?? null,
      });
      return json({ ok: true, status: "approved", at: ts }, 200);
    }

    // ─────────────────────────────────────────────
    // RELEASE — actually write purchase_orders
    // ─────────────────────────────────────────────
    if (body.action === "release") {
      if (fromStatus !== "approved") {
        return json({ error: `Cannot release from ${fromStatus}` }, 409);
      }
      const payload = (batch.payload ?? {}) as { items?: BatchItem[] };
      const items = (payload.items ?? []).filter((i) => !i.rejected);

      const today = new Date().toISOString().slice(0, 10);
      const rows = items.map((i) => ({
        po_number: i.code,
        supplier: i.kind === "RPO" ? (i.nm ?? "Mikado") : (i.fromCn ?? "INTERNAL"),
        sku: i.sku,
        quantity: i.qty,
        unit_price: i.qty > 0 ? Math.round((i.value || 0) / i.qty) : 0,
        currency: "VND",
        status: "submitted" as const,
        order_date: today,
        expected_date: null,
        notes: `Released from DRP batch ${batch.batch_code}`,
        created_by: userId,
        drp_batch_id: batch.id,
        po_kind: i.kind,
        from_cn: i.fromCn ?? null,
        to_cn: i.toCn ?? null,
      }));

      let insertedCount = 0;
      if (rows.length > 0) {
        const { error: poErr, count } = await admin
          .from("purchase_orders")
          .insert(rows, { count: "exact" });
        if (poErr) return json({ error: `PO insert failed: ${poErr.message}` }, 500);
        insertedCount = count ?? rows.length;
      }

      const ts = new Date().toISOString();
      await admin.from("drp_runs").update({
        status: "released",
        released_by: userId,
        released_at: ts,
        released_po_count: insertedCount,
      }).eq("id", batchId);
      await admin.from("drp_audit_log").insert({
        batch_id: batchId,
        action: "released",
        from_status: fromStatus,
        to_status: "released",
        actor_id: userId,
        actor_role: actorRole,
        note: body.note ?? `Released ${insertedCount} POs to /orders`,
        metadata: { releasedCount: insertedCount, batchCode: batch.batch_code },
      });

      return json({ ok: true, status: "released", at: ts, releasedCount: insertedCount }, 200);
    }

    // ─────────────────────────────────────────────
    // CANCEL
    // ─────────────────────────────────────────────
    if (body.action === "cancel") {
      if (fromStatus === "released") {
        return json({ error: "Cannot cancel released batch" }, 409);
      }
      const ts = new Date().toISOString();
      await admin.from("drp_runs").update({ status: "cancelled" }).eq("id", batchId);
      await admin.from("drp_audit_log").insert({
        batch_id: batchId,
        action: "cancelled",
        from_status: fromStatus,
        to_status: "cancelled",
        actor_id: userId,
        actor_role: actorRole,
        note: body.note ?? null,
      });
      return json({ ok: true, status: "cancelled", at: ts }, 200);
    }

    // ─────────────────────────────────────────────
    // REJECT_ITEMS — flag items inside payload
    // ─────────────────────────────────────────────
    if (body.action === "reject_items") {
      if (!Array.isArray(body.codes) || body.codes.length === 0) {
        return json({ error: "Missing codes" }, 400);
      }
      if (!body.note?.trim()) return json({ error: "Note required" }, 400);
      const payload = (batch.payload ?? {}) as { items?: BatchItem[] };
      const codeSet = new Set(body.codes);
      const items = (payload.items ?? []).map((i) =>
        codeSet.has(i.code) ? { ...i, rejected: true } : i
      );
      await admin.from("drp_runs").update({
        payload: { ...payload, items },
      }).eq("id", batchId);
      await admin.from("drp_audit_log").insert({
        batch_id: batchId,
        action: "rejected_items",
        from_status: fromStatus,
        to_status: fromStatus,
        actor_id: userId,
        actor_role: actorRole,
        note: body.note,
        metadata: { rejectedCodes: body.codes },
      });
      return json({ ok: true, rejectedCount: body.codes.length }, 200);
    }

    // ─────────────────────────────────────────────
    // APPROVE_SUBSET — log only (still becomes 'approved')
    // ─────────────────────────────────────────────
    if (body.action === "approve_subset") {
      if (!Array.isArray(body.codes) || body.codes.length === 0) {
        return json({ error: "Missing codes" }, 400);
      }
      if (!body.note?.trim()) return json({ error: "Note required" }, 400);
      if (!["draft", "reviewed"].includes(fromStatus)) {
        return json({ error: `Cannot approve from ${fromStatus}` }, 409);
      }
      const ts = new Date().toISOString();
      await admin.from("drp_runs").update({
        status: "approved",
        approved_by: userId,
        approved_at: ts,
      }).eq("id", batchId);
      await admin.from("drp_audit_log").insert({
        batch_id: batchId,
        action: "approved_subset",
        from_status: fromStatus,
        to_status: "approved",
        actor_id: userId,
        actor_role: actorRole,
        note: body.note,
        metadata: { approvedCodes: body.codes, approvedCount: body.codes.length },
      });
      return json({ ok: true, status: "approved", at: ts }, 200);
    }

    return json({ error: `Unknown action` }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 500);
  }
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

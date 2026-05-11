/**
 * useEntityCrud — Generic CRUD hook cho Master Data với:
 *  - Soft-delete (UPDATE is_active=false, deleted_at=now())
 *  - Audit log vào master_data_audit (entity, action, before/after, actor)
 *  - FK reference guard (chặn xóa nếu đang được tham chiếu)
 *  - Auto-tenant_id injection
 *
 * Tránh dùng hard-delete. Mọi danh sách filter `is_active=true`.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Bảng được hỗ trợ — gating tránh truyền sai
export type CrudTable =
  | "cn_sku_pricing"
  | "sku_unit_conversion"
  | "nm_sku_constraint"
  | "substitution_lists"
  | "stock_policies";

type Row = Record<string, unknown> & { id: string };

/** FK reference checks: trước khi soft-delete, đếm số entity đang reference. */
type RefRule = { table: string; column: string; valueFromKey: string; label: string };
const REFERENCE_RULES: Partial<Record<CrudTable, RefRule[]>> = {
  // Khi xóa NM constraint không có ref ngược; ví dụ rule cho master tables (chưa wire).
};

async function getActor() {
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return { actor_id: null, actor_name: "Khách" };
  const meta = u.user_metadata as { display_name?: string; full_name?: string } | null;
  return {
    actor_id: u.id,
    actor_name: meta?.display_name ?? meta?.full_name ?? u.email ?? "Người dùng",
  };
}

async function logAudit(params: {
  entity: string;
  entity_code: string;
  action: "create" | "update" | "delete" | "restore";
  before?: unknown;
  after?: unknown;
}) {
  try {
    const actor = await getActor();
    await supabase.from("master_data_audit").insert({
      entity: params.entity,
      entity_code: params.entity_code,
      action: params.action,
      actor_id: actor.actor_id,
      actor_name: actor.actor_name,
      before_data: (params.before ?? null) as never,
      after_data: (params.after ?? null) as never,
    });
  } catch (e) {
    console.warn("[useEntityCrud] audit failed", e);
  }
}

export interface UseEntityCrudOptions {
  table: CrudTable;
  tenantId: string | undefined;
  /** Field dùng để hiển thị code trong audit & error messages */
  codeField?: string;
  /** Field xác định entity unique (ngoài id), join để hiện FK. */
  entityName?: string;
}

export function useEntityList(table: CrudTable, tenantId: string | undefined) {
  return useQuery({
    queryKey: [table, tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(table)
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
}

export function useEntityCrud(opts: UseEntityCrudOptions) {
  const qc = useQueryClient();
  const { table, tenantId, codeField = "id", entityName = table } = opts;

  const invalidate = () => qc.invalidateQueries({ queryKey: [table] });

  const create = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (!tenantId) throw new Error("Không xác định được tenant");
      const { data, error } = await (supabase as any)
        .from(table)
        .insert({ ...payload, tenant_id: tenantId })
        .select("*")
        .single();
      if (error) throw error;
      await logAudit({
        entity: entityName,
        entity_code: String((data as any)?.[codeField] ?? data?.id ?? ""),
        action: "create",
        after: data,
      });
      return data;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(`Tạo thất bại: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { data: before } = await (supabase as any).from(table).select("*").eq("id", id).maybeSingle();
      const { data, error } = await (supabase as any)
        .from(table)
        .update(patch)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      await logAudit({
        entity: entityName,
        entity_code: String((data as any)?.[codeField] ?? id),
        action: "update",
        before,
        after: data,
      });
      return data;
    },
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(`Cập nhật thất bại: ${e.message}`),
  });

  /** Soft-delete: KHÔNG dùng .delete() — UPDATE is_active=false + deleted_at=now() */
  const softDelete = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      // 1. FK guard
      const rules = REFERENCE_RULES[table] ?? [];
      const { data: before } = await (supabase as any).from(table).select("*").eq("id", id).maybeSingle();
      if (!before) throw new Error("Không tìm thấy bản ghi");

      for (const rule of rules) {
        const value = (before as any)[rule.valueFromKey];
        if (value == null) continue;
        const { count } = await (supabase as any)
          .from(rule.table)
          .select("*", { count: "exact", head: true })
          .eq(rule.column, value)
          .eq("is_active", true);
        if ((count ?? 0) > 0) {
          throw new Error(`Không thể xóa: đang được tham chiếu bởi ${count} ${rule.label}`);
        }
      }

      // 2. Soft-delete
      const { data, error } = await (supabase as any)
        .from(table)
        .update({ is_active: false, deleted_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;

      await logAudit({
        entity: entityName,
        entity_code: String((before as any)?.[codeField] ?? id),
        action: "delete",
        before,
        after: { ...(data as any), reason: reason ?? null },
      });
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Đã xóa (soft-delete)");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { create, update, softDelete };
}

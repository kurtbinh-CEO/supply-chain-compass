/**
 * useMasterData — React Query hooks cho 4 entity Master Data trên Lovable Cloud.
 *
 * Mỗi entity có 5 hook:
 *   useMasterX()             — list (read)
 *   useCreateMasterX()       — insert (auto audit: action=create)
 *   useUpdateMasterX()       — update by id (auto audit: action=update + before/after diff)
 *   useDeleteMasterX()       — delete by id (auto audit: action=delete + snapshot before)
 *   useBulkInsertMasterX()   — insert nhiều dòng (auto audit: 1 entry / row, action=bulk_import)
 *
 * Audit ghi vào bảng `master_data_audit` — RLS public read, authenticated write.
 *
 * RLS data tables: mọi người đọc, authenticated mới được write.
 * Khi chưa đăng nhập, mutation sẽ fail với toast cảnh báo.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ItemRow      = Database["public"]["Tables"]["master_items"]["Row"];
type ItemInsert   = Database["public"]["Tables"]["master_items"]["Insert"];
type FactoryRow   = Database["public"]["Tables"]["master_factories"]["Row"];
type FactoryInsert= Database["public"]["Tables"]["master_factories"]["Insert"];
type BranchRow    = Database["public"]["Tables"]["master_branches"]["Row"];
type BranchInsert = Database["public"]["Tables"]["master_branches"]["Insert"];
type ContainerRow = Database["public"]["Tables"]["master_containers"]["Row"];
type ContainerInsert = Database["public"]["Tables"]["master_containers"]["Insert"];

type MasterTable = "master_items" | "master_factories" | "master_branches" | "master_containers";
type MasterEntity = "item" | "factory" | "branch" | "container";

const reportError = (action: string, e: unknown) => {
  const msg = (e as { message?: string })?.message ?? String(e);
  toast.error(`${action}: ${msg}`);
};

/* ════════════════════════════════════════════════════════════════════════ */
/* Audit helpers                                                             */
/* ════════════════════════════════════════════════════════════════════════ */
async function getActor(): Promise<{ actor_id: string | null; actor_name: string }> {
  const { data } = await supabase.auth.getUser();
  const u = data.user;
  if (!u) return { actor_id: null, actor_name: "Khách" };
  const display =
    (u.user_metadata as { display_name?: string; full_name?: string } | null)?.display_name ??
    (u.user_metadata as { full_name?: string } | null)?.full_name ??
    u.email ??
    "Người dùng";
  return { actor_id: u.id, actor_name: display };
}

async function logAudit(params: {
  entity: MasterEntity;
  entity_code: string;
  action: "create" | "update" | "delete" | "bulk_import";
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
    // Don't block the main mutation on audit failure
    console.warn("audit log insert failed", e);
  }
}

async function fetchSnapshot(table: MasterTable, id: string): Promise<Record<string, unknown> | null> {
  const { data } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  return (data as Record<string, unknown> | null) ?? null;
}

/* ════════════════════════════════════════════════════════════════════════ */
/* Audit log query (for UI panel)                                            */
/* ════════════════════════════════════════════════════════════════════════ */
export interface AuditEntry {
  id: string;
  entity: MasterEntity;
  entity_code: string;
  action: "create" | "update" | "delete" | "bulk_import";
  actor_id: string | null;
  actor_name: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
}

export function useMasterAudit(filter?: { entity?: MasterEntity; entity_code?: string; limit?: number }) {
  return useQuery({
    queryKey: ["master_data_audit", filter ?? null],
    queryFn: async () => {
      let q = supabase
        .from("master_data_audit")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(filter?.limit ?? 100);
      if (filter?.entity) q = q.eq("entity", filter.entity);
      if (filter?.entity_code) q = q.eq("entity_code", filter.entity_code);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as AuditEntry[];
    },
  });
}

/* ════════════════════════════════════════════════════════════════════════ */
/* Items                                                                     */
/* ════════════════════════════════════════════════════════════════════════ */
export function useMasterItems() {
  return useQuery({
    queryKey: ["master_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_items")
        .select("*")
        .order("code");
      if (error) throw error;
      return data as ItemRow[];
    },
  });
}

const invalidateAudit = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: ["master_data_audit"] });

export function useCreateMasterItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: ItemInsert) => {
      const { data, error } = await supabase.from("master_items").insert(row).select().single();
      if (error) throw error;
      await logAudit({ entity: "item", entity_code: data.code, action: "create", after: data });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_items"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Tạo mã hàng thất bại", e),
  });
}

export function useUpdateMasterItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ItemInsert>) => {
      const before = await fetchSnapshot("master_items", id);
      const { data, error } = await supabase.from("master_items").update(patch).eq("id", id).select().single();
      if (error) throw error;
      await logAudit({ entity: "item", entity_code: data.code, action: "update", before, after: data });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_items"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Cập nhật mã hàng thất bại", e),
  });
}

export function useDeleteMasterItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const before = await fetchSnapshot("master_items", id);
      const { error } = await supabase.from("master_items").delete().eq("id", id);
      if (error) throw error;
      const code = (before?.code as string) ?? id;
      await logAudit({ entity: "item", entity_code: code, action: "delete", before });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_items"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Xóa mã hàng thất bại", e),
  });
}

export function useBulkInsertMasterItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ItemInsert[]) => {
      const { data, error } = await supabase.from("master_items").insert(rows).select();
      if (error) throw error;
      await Promise.all(
        (data ?? []).map((r) => logAudit({ entity: "item", entity_code: r.code, action: "bulk_import", after: r })),
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_items"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Nhập mã hàng hàng loạt thất bại", e),
  });
}

/* ════════════════════════════════════════════════════════════════════════ */
/* Factories                                                                 */
/* ════════════════════════════════════════════════════════════════════════ */
export function useMasterFactories() {
  return useQuery({
    queryKey: ["master_factories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_factories")
        .select("*")
        .order("code");
      if (error) throw error;
      return data as FactoryRow[];
    },
  });
}

export function useCreateMasterFactory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: FactoryInsert) => {
      const { data, error } = await supabase.from("master_factories").insert(row).select().single();
      if (error) throw error;
      await logAudit({ entity: "factory", entity_code: data.code, action: "create", after: data });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_factories"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Tạo NM thất bại", e),
  });
}

export function useUpdateMasterFactory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<FactoryInsert>) => {
      const before = await fetchSnapshot("master_factories", id);
      const { data, error } = await supabase.from("master_factories").update(patch).eq("id", id).select().single();
      if (error) throw error;
      await logAudit({ entity: "factory", entity_code: data.code, action: "update", before, after: data });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_factories"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Cập nhật NM thất bại", e),
  });
}

export function useDeleteMasterFactory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const before = await fetchSnapshot("master_factories", id);
      const { error } = await supabase.from("master_factories").delete().eq("id", id);
      if (error) throw error;
      const code = (before?.code as string) ?? id;
      await logAudit({ entity: "factory", entity_code: code, action: "delete", before });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_factories"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Xóa NM thất bại", e),
  });
}

export function useBulkInsertMasterFactories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: FactoryInsert[]) => {
      const { data, error } = await supabase.from("master_factories").insert(rows).select();
      if (error) throw error;
      await Promise.all(
        (data ?? []).map((r) => logAudit({ entity: "factory", entity_code: r.code, action: "bulk_import", after: r })),
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_factories"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Nhập NM hàng loạt thất bại", e),
  });
}

/* ════════════════════════════════════════════════════════════════════════ */
/* Branches                                                                  */
/* ════════════════════════════════════════════════════════════════════════ */
export function useMasterBranches() {
  return useQuery({
    queryKey: ["master_branches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_branches")
        .select("*")
        .order("code");
      if (error) throw error;
      return data as BranchRow[];
    },
  });
}

export function useCreateMasterBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: BranchInsert) => {
      const { data, error } = await supabase.from("master_branches").insert(row).select().single();
      if (error) throw error;
      await logAudit({ entity: "branch", entity_code: data.code, action: "create", after: data });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_branches"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Tạo CN thất bại", e),
  });
}

export function useUpdateMasterBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<BranchInsert>) => {
      const before = await fetchSnapshot("master_branches", id);
      const { data, error } = await supabase.from("master_branches").update(patch).eq("id", id).select().single();
      if (error) throw error;
      await logAudit({ entity: "branch", entity_code: data.code, action: "update", before, after: data });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_branches"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Cập nhật CN thất bại", e),
  });
}

export function useDeleteMasterBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const before = await fetchSnapshot("master_branches", id);
      const { error } = await supabase.from("master_branches").delete().eq("id", id);
      if (error) throw error;
      const code = (before?.code as string) ?? id;
      await logAudit({ entity: "branch", entity_code: code, action: "delete", before });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_branches"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Xóa CN thất bại", e),
  });
}

export function useBulkInsertMasterBranches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: BranchInsert[]) => {
      const { data, error } = await supabase.from("master_branches").insert(rows).select();
      if (error) throw error;
      await Promise.all(
        (data ?? []).map((r) => logAudit({ entity: "branch", entity_code: r.code, action: "bulk_import", after: r })),
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_branches"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Nhập CN hàng loạt thất bại", e),
  });
}

/* ════════════════════════════════════════════════════════════════════════ */
/* Containers                                                                */
/* ════════════════════════════════════════════════════════════════════════ */
export function useMasterContainers() {
  return useQuery({
    queryKey: ["master_containers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_containers")
        .select("*")
        .order("code");
      if (error) throw error;
      return data as ContainerRow[];
    },
  });
}

export function useCreateMasterContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: ContainerInsert) => {
      const { data, error } = await supabase.from("master_containers").insert(row).select().single();
      if (error) throw error;
      await logAudit({ entity: "container", entity_code: data.code, action: "create", after: data });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_containers"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Tạo loại container thất bại", e),
  });
}

export function useUpdateMasterContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ContainerInsert>) => {
      const before = await fetchSnapshot("master_containers", id);
      const { data, error } = await supabase.from("master_containers").update(patch).eq("id", id).select().single();
      if (error) throw error;
      await logAudit({ entity: "container", entity_code: data.code, action: "update", before, after: data });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_containers"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Cập nhật loại container thất bại", e),
  });
}

export function useDeleteMasterContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const before = await fetchSnapshot("master_containers", id);
      const { error } = await supabase.from("master_containers").delete().eq("id", id);
      if (error) throw error;
      const code = (before?.code as string) ?? id;
      await logAudit({ entity: "container", entity_code: code, action: "delete", before });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_containers"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Xóa loại container thất bại", e),
  });
}

export function useBulkInsertMasterContainers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ContainerInsert[]) => {
      const { data, error } = await supabase.from("master_containers").insert(rows).select();
      if (error) throw error;
      await Promise.all(
        (data ?? []).map((r) => logAudit({ entity: "container", entity_code: r.code, action: "bulk_import", after: r })),
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master_containers"] });
      invalidateAudit(qc);
    },
    onError: (e) => reportError("Nhập loại container hàng loạt thất bại", e),
  });
}

export type {
  ItemRow, ItemInsert,
  FactoryRow, FactoryInsert,
  BranchRow, BranchInsert,
  ContainerRow, ContainerInsert,
};

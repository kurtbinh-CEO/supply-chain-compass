/**
 * useMasterData — React Query hooks cho 4 entity Master Data trên Lovable Cloud.
 *
 * Mỗi entity có 4 hook:
 *   useMasterX()             — list (read)
 *   useCreateMasterX()       — insert
 *   useUpdateMasterX()       — update by id
 *   useDeleteMasterX()       — delete by id
 *   useBulkInsertMasterX()   — insert nhiều dòng (cho Excel wizard)
 *
 * RLS: mọi người đọc, authenticated mới được write.
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

const reportError = (action: string, e: unknown) => {
  const msg = (e as { message?: string })?.message ?? String(e);
  toast.error(`${action}: ${msg}`);
};

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

export function useCreateMasterItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: ItemInsert) => {
      const { data, error } = await supabase
        .from("master_items")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_items"] }),
    onError: (e) => reportError("Tạo mã hàng thất bại", e),
  });
}

export function useUpdateMasterItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ItemInsert>) => {
      const { data, error } = await supabase
        .from("master_items")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_items"] }),
    onError: (e) => reportError("Cập nhật mã hàng thất bại", e),
  });
}

export function useDeleteMasterItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("master_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_items"] }),
    onError: (e) => reportError("Xóa mã hàng thất bại", e),
  });
}

export function useBulkInsertMasterItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ItemInsert[]) => {
      const { data, error } = await supabase.from("master_items").insert(rows).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_items"] }),
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
      const { data, error } = await supabase
        .from("master_factories")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_factories"] }),
    onError: (e) => reportError("Tạo NM thất bại", e),
  });
}

export function useUpdateMasterFactory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<FactoryInsert>) => {
      const { data, error } = await supabase
        .from("master_factories")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_factories"] }),
    onError: (e) => reportError("Cập nhật NM thất bại", e),
  });
}

export function useDeleteMasterFactory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("master_factories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_factories"] }),
    onError: (e) => reportError("Xóa NM thất bại", e),
  });
}

export function useBulkInsertMasterFactories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: FactoryInsert[]) => {
      const { data, error } = await supabase.from("master_factories").insert(rows).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_factories"] }),
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
      const { data, error } = await supabase
        .from("master_branches")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_branches"] }),
    onError: (e) => reportError("Tạo CN thất bại", e),
  });
}

export function useUpdateMasterBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<BranchInsert>) => {
      const { data, error } = await supabase
        .from("master_branches")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_branches"] }),
    onError: (e) => reportError("Cập nhật CN thất bại", e),
  });
}

export function useDeleteMasterBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("master_branches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_branches"] }),
    onError: (e) => reportError("Xóa CN thất bại", e),
  });
}

export function useBulkInsertMasterBranches() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: BranchInsert[]) => {
      const { data, error } = await supabase.from("master_branches").insert(rows).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_branches"] }),
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
      const { data, error } = await supabase
        .from("master_containers")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_containers"] }),
    onError: (e) => reportError("Tạo loại container thất bại", e),
  });
}

export function useUpdateMasterContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<ContainerInsert>) => {
      const { data, error } = await supabase
        .from("master_containers")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_containers"] }),
    onError: (e) => reportError("Cập nhật loại container thất bại", e),
  });
}

export function useDeleteMasterContainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("master_containers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_containers"] }),
    onError: (e) => reportError("Xóa loại container thất bại", e),
  });
}

export function useBulkInsertMasterContainers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ContainerInsert[]) => {
      const { data, error } = await supabase.from("master_containers").insert(rows).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["master_containers"] }),
    onError: (e) => reportError("Nhập loại container hàng loạt thất bại", e),
  });
}

export type {
  ItemRow, ItemInsert,
  FactoryRow, FactoryInsert,
  BranchRow, BranchInsert,
  ContainerRow, ContainerInsert,
};

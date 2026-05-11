/**
 * useDemandVersions — Quản lý phiên bản nhu cầu (AOP / S&OP).
 *
 * Lifecycle: DRAFT → LOCKED → ARCHIVED
 * - DRAFT: cho phép chỉnh sửa
 * - LOCKED: chỉ xem (đã chốt)
 * - ARCHIVED: lưu trữ, không hiển thị mặc định
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserTenantId } from "./useUserTenantId";
import { toast } from "sonner";

export type DemandVersionStatus = "DRAFT" | "LOCKED" | "ARCHIVED";

export interface DemandVersion {
  id: string;
  tenant_id: string;
  name: string;
  version_type: string;
  status: DemandVersionStatus;
  locked_by: string | null;
  locked_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const QK = "demand-versions";

export function useDemandVersions() {
  const qc = useQueryClient();
  const { data: tenantId } = useUserTenantId();

  const list = useQuery({
    queryKey: [QK, tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demand_versions")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DemandVersion[];
    },
  });

  const createVersion = useMutation({
    mutationFn: async (input: { name: string; version_type?: string }) => {
      if (!tenantId) throw new Error("Không xác định tenant");
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("demand_versions")
        .insert({
          tenant_id: tenantId,
          name: input.name,
          version_type: input.version_type ?? "SOP",
          status: "DRAFT",
          created_by: auth.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as DemandVersion;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast.success("Đã tạo phiên bản mới");
    },
    onError: (e: Error) => toast.error(`Không tạo được: ${e.message}`),
  });

  const lockVersion = useMutation({
    mutationFn: async (id: string) => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("demand_versions")
        .update({
          status: "LOCKED",
          locked_by: auth.user?.id ?? null,
          locked_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "DRAFT")
        .select()
        .single();
      if (error) throw error;
      return data as DemandVersion;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast.success("Đã khóa phiên bản — chuyển sang chế độ chỉ xem");
    },
    onError: (e: Error) => toast.error(`Không khóa được: ${e.message}`),
  });

  const archiveVersion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("demand_versions")
        .update({ status: "ARCHIVED" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      toast.success("Đã lưu trữ phiên bản");
    },
    onError: (e: Error) => toast.error(`Không lưu trữ được: ${e.message}`),
  });

  return {
    versions: list.data ?? [],
    loading: list.isLoading,
    createVersion,
    lockVersion,
    archiveVersion,
  };
}

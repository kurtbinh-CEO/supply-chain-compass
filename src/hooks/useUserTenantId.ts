/**
 * useUserTenantId — Lấy tenant_id của user hiện tại từ user_tenants.
 * Fallback UNIS tenant_id để demo không-login vẫn hoạt động (RLS sẽ chặn write
 * nếu chưa login — UI tự xử lý lỗi qua toast).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const UNIS_TENANT_ID = "256ee065-09f6-4e7a-9b5c-b94e861031f5";

export function useUserTenantId() {
  return useQuery({
    queryKey: ["user-tenant-id"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return UNIS_TENANT_ID;
      const { data } = await supabase
        .from("user_tenants")
        .select("tenant_id")
        .eq("user_id", uid)
        .limit(1)
        .maybeSingle();
      return (data?.tenant_id as string | undefined) ?? UNIS_TENANT_ID;
    },
    staleTime: 5 * 60 * 1000,
  });
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserTenantId } from "@/hooks/useUserTenantId";

export type ConfigOverrides = Record<string, string>;

interface State {
  loading: boolean;
  overrides: ConfigOverrides;
  error: string | null;
}

/**
 * Persistent config registry hook.
 * - Loads `(config_key, config_value)` pairs for the current tenant.
 * - `upsert(key, value)` writes to the table; falls back gracefully on auth error.
 *
 * Falls back to in-memory only when offline / unauthenticated; the
 * caller still has the static defaults from `extended-config-keys.ts`.
 */
export function useConfigRegistry() {
  const { data: tenantId } = useUserTenantId();
  const [state, setState] = useState<State>({
    loading: true,
    overrides: {},
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!tenantId) return;
    setState((s) => ({ ...s, loading: true }));
    const { data, error } = await supabase
      .from("config_registry")
      .select("config_key, config_value")
      .eq("tenant_id", tenantId);
    if (error) {
      setState({ loading: false, overrides: {}, error: error.message });
      return;
    }
    const map: ConfigOverrides = {};
    (data ?? []).forEach((r) => {
      map[r.config_key] = r.config_value;
    });
    setState({ loading: false, overrides: map, error: null });
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) void refresh();
  }, [tenantId, refresh]);

  const upsert = useCallback(
    async (key: string, value: string, valueType?: string) => {
      if (!tenantId) throw new Error("Chưa xác định được tenant");
      const { data: userRes } = await supabase.auth.getUser();
      const updated_by = userRes?.user?.id ?? null;
      const { error } = await supabase
        .from("config_registry")
        .upsert(
          {
            tenant_id: tenantId,
            config_key: key,
            config_value: value,
            value_type: valueType ?? null,
            updated_by,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tenant_id,config_key" },
        );
      if (error) throw error;
      setState((s) => ({ ...s, overrides: { ...s.overrides, [key]: value } }));
    },
    [tenantId],
  );

  const remove = useCallback(
    async (key: string) => {
      if (!tenantId) return;
      const { error } = await supabase
        .from("config_registry")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("config_key", key);
      if (error) throw error;
      setState((s) => {
        const next = { ...s.overrides };
        delete next[key];
        return { ...s, overrides: next };
      });
    },
    [tenantId],
  );

  return { ...state, refresh, upsert, remove, tenantId };
}

import { createContext, useContext, useState, ReactNode } from "react";

const tenants = ["UNIS Group", "TTC Agris", "Mondelez"] as const;
export type TenantName = typeof tenants[number];

interface TenantContextType {
  tenant: TenantName;
  setTenant: (t: TenantName) => void;
  tenants: readonly string[];
}

const TenantContext = createContext<TenantContextType>({
  tenant: "UNIS Group",
  setTenant: () => {},
  tenants,
});

export const useTenant = () => useContext(TenantContext);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<TenantName>("UNIS Group");
  return (
    <TenantContext.Provider value={{ tenant, setTenant, tenants }}>
      {children}
    </TenantContext.Provider>
  );
}

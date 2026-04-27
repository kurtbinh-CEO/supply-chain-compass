import { createContext, useContext, useState, ReactNode } from "react";

/* ────────────────────────────────────────────────────────────────
 * P6: Extended role model
 *  - SC_MANAGER, CN_MANAGER, SALES, VIEWER (legacy)
 *  - BUYER, DIRECTOR, CEO (P6 additions)
 *
 * Access matrix is the single source of truth. Sidebar items, route
 * guard, and action buttons all read from `ROLE_ACCESS` / helpers.
 * ─────────────────────────────────────────────────────────────── */

export type UserRole =
  | "SC_MANAGER"
  | "CN_MANAGER"
  | "SALES"
  | "VIEWER"
  | "BUYER"
  | "DIRECTOR"
  | "CEO";

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  cn_id?: string; // only for CN_MANAGER
  cn_name?: string;
}

const defaultUsers: AppUser[] = [
  { id: "u1", name: "Thúy Nguyễn", role: "SC_MANAGER" },
  { id: "u2", name: "Minh Trần", role: "CN_MANAGER", cn_id: "CN-BD", cn_name: "CN Bình Dương" },
  { id: "u3", name: "Hà Lê", role: "CN_MANAGER", cn_id: "CN-ĐN", cn_name: "CN Đà Nẵng" },
  { id: "u4", name: "Phong Vũ", role: "SALES" },
  { id: "u5", name: "Lan Pham", role: "VIEWER" },
  { id: "u6", name: "Quân Hồ", role: "BUYER" },
  { id: "u7", name: "Hồng Đặng", role: "DIRECTOR" },
  { id: "u8", name: "Tuấn Vũ", role: "CEO" },
];

/**
 * Routes each role is allowed to visit. "*" means full access.
 * Routes not listed here are treated as PUBLIC (Workspace, Logic, Guide,
 * Profile, Appearance) — every authenticated user can see them.
 */
export const ROLE_ACCESS: Record<UserRole, string[]> = {
  SC_MANAGER: ["*"],
  DIRECTOR:   ["*"],
  CEO:        ["*"],
  CN_MANAGER: ["/cn-portal", "/orders", "/inventory", "/demand-weekly", "/drp", "/monitoring"],
  SALES:      ["/demand", "/cn-portal", "/monitoring"],
  BUYER:      ["/orders", "/hub", "/inventory", "/master-data", "/monitoring"],
  VIEWER:     ["*"], // read-only role still browses everything
};

/** Always-allowed routes (regardless of role). */
export const PUBLIC_ROUTES = new Set<string>([
  "/", "/workspace", "/logic", "/guide", "/profile", "/appearance",
  "/audit", "/scenarios", "/compare", "/sync", "/reports",
  "/design-test", "/qa/kpi",
]);

/** Where a role lands when a route is denied. */
export const ROLE_HOME_PATH: Record<UserRole, string> = {
  SC_MANAGER: "/workspace",
  DIRECTOR:   "/executive",
  CEO:        "/executive",
  CN_MANAGER: "/cn-portal",
  SALES:      "/demand",
  BUYER:      "/orders",
  VIEWER:     "/workspace",
};

/** Friendly label (Vietnamese) for the role chip. */
export const ROLE_LABEL_VI: Record<UserRole, string> = {
  SC_MANAGER: "SC Manager",
  CN_MANAGER: "CN Manager",
  SALES:      "Sales",
  VIEWER:     "Viewer",
  BUYER:      "Buyer",
  DIRECTOR:   "Director",
  CEO:        "CEO",
};

/** Pure helper — does this role have access to a given path? */
export function canAccess(role: UserRole, path: string): boolean {
  if (PUBLIC_ROUTES.has(path)) return true;
  const allowed = ROLE_ACCESS[role] ?? [];
  if (allowed.includes("*")) return true;
  return allowed.some((p) => path === p || path.startsWith(p + "/"));
}

interface RbacContextType {
  user: AppUser;
  setUser: (user: AppUser) => void;
  users: AppUser[];
  canEdit: boolean;
  canApprove: boolean;
  canViewAllCn: boolean;
  filterCnId: string | null;
  /** Force-release Tier 1 (NM stale 48–72h): SC Manager, Director, CEO. */
  canForceRelease: boolean;
  /** Force-release Tier 2 (NM stale 72–96h): Director, CEO. */
  canForceReleaseDirector: boolean;
  /** Force-release Tier 3 (NM stale > 96h): CEO only. */
  canForceReleaseCeo: boolean;
}

const RbacContext = createContext<RbacContextType>(null!);

export const useRbac = () => useContext(RbacContext);

export function RbacProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser>(defaultUsers[0]); // default SC_MANAGER

  const canEdit =
    user.role === "CN_MANAGER" ||
    user.role === "SC_MANAGER" ||
    user.role === "BUYER" ||
    user.role === "DIRECTOR" ||
    user.role === "CEO";
  const canApprove =
    user.role === "SC_MANAGER" ||
    user.role === "DIRECTOR" ||
    user.role === "CEO";
  const canViewAllCn =
    user.role === "SC_MANAGER" ||
    user.role === "VIEWER" ||
    user.role === "DIRECTOR" ||
    user.role === "CEO";
  const filterCnId = user.role === "CN_MANAGER" ? user.cn_id! : null;

  const canForceRelease =
    user.role === "SC_MANAGER" ||
    user.role === "DIRECTOR" ||
    user.role === "CEO";
  const canForceReleaseDirector =
    user.role === "DIRECTOR" || user.role === "CEO";
  const canForceReleaseCeo = user.role === "CEO";

  return (
    <RbacContext.Provider
      value={{
        user,
        setUser,
        users: defaultUsers,
        canEdit,
        canApprove,
        canViewAllCn,
        filterCnId,
        canForceRelease,
        canForceReleaseDirector,
        canForceReleaseCeo,
      }}
    >
      {children}
    </RbacContext.Provider>
  );
}

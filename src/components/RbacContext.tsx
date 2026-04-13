import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type UserRole = "SC_MANAGER" | "CN_MANAGER" | "SALES" | "VIEWER";

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
];

interface RbacContextType {
  user: AppUser;
  setUser: (user: AppUser) => void;
  users: AppUser[];
  canEdit: boolean;
  canApprove: boolean;
  canViewAllCn: boolean;
  filterCnId: string | null;
}

const RbacContext = createContext<RbacContextType>(null!);

export const useRbac = () => useContext(RbacContext);

export function RbacProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser>(defaultUsers[0]); // default SC_MANAGER

  const canEdit = user.role === "CN_MANAGER" || user.role === "SC_MANAGER";
  const canApprove = user.role === "SC_MANAGER";
  const canViewAllCn = user.role === "SC_MANAGER" || user.role === "VIEWER";
  const filterCnId = user.role === "CN_MANAGER" ? user.cn_id! : null;

  return (
    <RbacContext.Provider value={{ user, setUser, users: defaultUsers, canEdit, canApprove, canViewAllCn, filterCnId }}>
      {children}
    </RbacContext.Provider>
  );
}

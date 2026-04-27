/**
 * RouteGuard — RBAC enforcement at the route level (P6).
 *
 * If the current pathname is not in the user's allowed set (per ROLE_ACCESS),
 * we toast a Vietnamese denial message and redirect to ROLE_HOME_PATH.
 *
 * Public routes (Workspace, Logic, Guide, Profile, etc.) bypass the check.
 * Wrap inside <RbacProvider> so `useRbac()` is available.
 */
import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useRbac, canAccess, ROLE_HOME_PATH, ROLE_LABEL_VI } from "@/components/RbacContext";

interface Props {
  children: React.ReactNode;
}

export function RouteGuard({ children }: Props) {
  const { user } = useRbac();
  const location = useLocation();
  const path = location.pathname;
  const allowed = canAccess(user.role, path);
  const home = ROLE_HOME_PATH[user.role];

  useEffect(() => {
    if (!allowed) {
      toast.error("Bạn không có quyền truy cập trang này.", {
        description: `Vai trò ${ROLE_LABEL_VI[user.role]} không truy cập được ${path}. Đã chuyển về ${home}.`,
      });
    }
  }, [allowed, user.role, path, home]);

  if (!allowed && path !== home) {
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}

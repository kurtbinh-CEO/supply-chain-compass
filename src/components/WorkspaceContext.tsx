import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface Approval {
  id: string;
  type: string;
  typeColor: "info" | "warning" | "danger" | "success";
  description: string;
  submitter: string;
  timeAgo: string;
}

export interface ExceptionCard {
  id: string;
  type: string;
  typeLabel: string;
  typeColor: "danger" | "warning" | "info";
  sku: string;
  location: string;
  risk: string;
  fixCost: string;
  roi: string;
  url: string;
}

export interface Notification {
  id: string;
  type: string;
  typeColor: "danger" | "warning" | "info" | "success";
  message: string;
  timeAgo: string;
  read: boolean;
  url: string;
}

const initialApprovals: Approval[] = [
  { id: "APR-001", type: "S&OP", typeColor: "info", description: "Đồng thuận T5: 7.650m² — Ngày khóa 7", submitter: "Chị Thúy", timeAgo: "2 giờ trước" },
  { id: "APR-002", type: "CN điều chỉnh", typeColor: "warning", description: "CN-BD +12,5% GA-300 A4", submitter: "Anh Minh", timeAgo: "45 phút" },
  { id: "APR-003", type: "Phát hành PO", typeColor: "info", description: "PO-BD-W16 Mikado 1.200m²", submitter: "Hệ thống", timeAgo: "30 phút" },
  { id: "APR-004", type: "Phát hành khẩn", typeColor: "danger", description: "Toko dữ liệu cũ 28h — phát hành khẩn 3 cấp?", submitter: "Chị Thúy", timeAgo: "15 phút" },
  { id: "APR-005", type: "Nguồn TO", typeColor: "info", description: "CN-DN→BD 220m² GA-300 A4. HSTK 12d→9d. Tiết kiệm 32Mđ", submitter: "Hệ thống", timeAgo: "10 phút" },
  { id: "APR-006", type: "Thay đổi tồn kho an toàn", typeColor: "warning", description: "GA-300 A4: 900→1.350 (SL 95%→98%). Vốn lưu động +83Mđ", submitter: "Anh Thắng", timeAgo: "5 phút" },
];

const initialExceptions: ExceptionCard[] = [
  { id: "EXC-001", type: "SHORTAGE", typeLabel: "Thiếu hàng", typeColor: "danger", sku: "GA-300 A4", location: "CN-BD", risk: "120 triệu ₫", fixCost: "8,8 triệu ₫", roi: "13,6×", url: "/drp" },
  { id: "EXC-002", type: "PO_OVERDUE", typeLabel: "PO quá hạn", typeColor: "warning", sku: "Toko 557m²", location: "", risk: "85Mđ", fixCost: "", roi: "", url: "/orders" },
  { id: "EXC-003", type: "FC_DRIFT", typeLabel: "Sai lệch dự báo", typeColor: "info", sku: "MAPE 18,4%", location: "", risk: "", fixCost: "", roi: "", url: "/demand-weekly" },
];

const initialNotifications: Notification[] = [
  { id: "NTF-001", type: "PO_OVERDUE", typeColor: "danger", message: "Đơn hàng #PO8829 từ Mikado trễ 3 ngày so với dự kiến.", timeAgo: "2 phút trước", read: false, url: "/orders" },
  { id: "NTF-002", type: "GAP_ALERT", typeColor: "warning", message: "Cảnh báo hụt hàng GA-300 tại kho Miền Tây tuần W18.", timeAgo: "15 phút trước", read: false, url: "/drp" },
  { id: "NTF-003", type: "DATA_STALE", typeColor: "info", message: "Tồn kho ERP chưa cập nhật hơn 24h.", timeAgo: "1 giờ trước", read: false, url: "/monitoring" },
  { id: "NTF-004", type: "SYSTEM", typeColor: "success", message: "Sao lưu hệ thống hoàn tất. Toàn bộ kịch bản đã được lưu.", timeAgo: "3 giờ trước", read: true, url: "/config" },
  { id: "NTF-005", type: "PO_OVERDUE", typeColor: "danger", message: "Hợp đồng #CN229 chưa được ký duyệt bởi Anh Minh.", timeAgo: "5 giờ trước", read: true, url: "/orders" },
];

interface WorkspaceContextType {
  approvals: Approval[];
  pendingCount: number;
  removeApproval: (id: string) => void;
  addApproval: (a: Approval) => void;
  exceptions: ExceptionCard[];
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  addNotification: (n: Notification) => void;
  unreadCount: number;
  criticalCount: number;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const removeApproval = useCallback((id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addApproval = useCallback((a: Approval) => {
    setApprovals((prev) => [a, ...prev]);
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const addNotification = useCallback((n: Notification) => {
    setNotifications((prev) => prev.some((x) => x.id === n.id) ? prev : [n, ...prev]);
  }, []);

  const pendingCount = approvals.length + initialExceptions.length + notifications.filter(n => !n.read).length;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const criticalCount = notifications.filter((n) => n.typeColor === "danger" && !n.read).length;

  return (
    <WorkspaceContext.Provider value={{ approvals, pendingCount, removeApproval, addApproval, exceptions: initialExceptions, notifications, markNotificationRead, addNotification, unreadCount, criticalCount }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

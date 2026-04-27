import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

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

/** Trạng thái lock S&OP & cam kết Hub.
 *  Dùng cho badge sidebar (sop_status, hub_commitment). */
export interface SopLockState {
  /** Phiên S&OP hiện tại (vd "2026-05") đã được khóa hay chưa. */
  locked: boolean;
  /** Thời điểm khóa gần nhất — render cho audit/hover hint. */
  lockedAt?: number;
}
export interface HubCommitState {
  /** Số NM đã confirm cam kết tuần hiện tại. */
  confirmed: number;
  /** Tổng NM trong scope tuần. */
  total: number;
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
  /** Mutators cho exceptions để DRP/Monitoring có thể thêm/giải quyết shortage real-time. */
  addException: (e: ExceptionCard) => void;
  removeException: (id: string) => void;
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  addNotification: (n: Notification) => void;
  unreadCount: number;
  criticalCount: number;
  /** Trạng thái phiên S&OP & Hub commit — dùng cho badge sidebar. */
  sopLock: SopLockState;
  setSopLock: (next: SopLockState) => void;
  hubCommit: HubCommitState;
  setHubCommit: (next: HubCommitState) => void;
  /** Tick tăng mỗi khi state thay đổi đáng kể — hooks badge dựa vào để re-evaluate. */
  badgeRevision: number;
  /** Force refresh các consumer badge (dispatch global event cũng được). */
  bumpBadges: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};

/** Tên event global để các module ngoài context có thể trigger refresh
 *  (vd: import động, edge function callback, debug tool). */
export const WORKSPACE_BADGES_EVENT = "workspace:badges-refresh";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals);
  const [exceptions, setExceptions] = useState<ExceptionCard[]>(initialExceptions);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [sopLock, setSopLock] = useState<SopLockState>({ locked: false });
  const [hubCommit, setHubCommit] = useState<HubCommitState>({ confirmed: 0, total: 0 });
  const [badgeRevision, setBadgeRevision] = useState(0);

  const bumpBadges = useCallback(() => setBadgeRevision((r) => r + 1), []);

  const removeApproval = useCallback((id: string) => {
    setApprovals((prev) => prev.filter((a) => a.id !== id));
    bumpBadges();
  }, [bumpBadges]);

  const addApproval = useCallback((a: Approval) => {
    setApprovals((prev) => [a, ...prev]);
    bumpBadges();
  }, [bumpBadges]);

  const addException = useCallback((e: ExceptionCard) => {
    setExceptions((prev) => prev.some((x) => x.id === e.id) ? prev : [e, ...prev]);
    bumpBadges();
  }, [bumpBadges]);

  const removeException = useCallback((id: string) => {
    setExceptions((prev) => prev.filter((e) => e.id !== id));
    bumpBadges();
  }, [bumpBadges]);

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    bumpBadges();
  }, [bumpBadges]);

  const addNotification = useCallback((n: Notification) => {
    setNotifications((prev) => prev.some((x) => x.id === n.id) ? prev : [n, ...prev]);
    bumpBadges();
  }, [bumpBadges]);

  const setSopLockWithBump = useCallback((next: SopLockState) => {
    setSopLock(next);
    bumpBadges();
  }, [bumpBadges]);

  const setHubCommitWithBump = useCallback((next: HubCommitState) => {
    setHubCommit(next);
    bumpBadges();
  }, [bumpBadges]);

  // ── Lắng nghe event global: bất kỳ module nào (kể cả ngoài React tree)
  //    cũng có thể dispatch để buộc badge re-evaluate (vd: edge function callback,
  //    voice command, hoặc debug tool gọi window.dispatchEvent).
  useEffect(() => {
    const handler = () => bumpBadges();
    window.addEventListener(WORKSPACE_BADGES_EVENT, handler);
    // Cũng refresh khi tab quay lại focus → bắt kịp thay đổi từ tab khác / backend.
    window.addEventListener("focus", handler);
    document.addEventListener("visibilitychange", handler);
    return () => {
      window.removeEventListener(WORKSPACE_BADGES_EVENT, handler);
      window.removeEventListener("focus", handler);
      document.removeEventListener("visibilitychange", handler);
    };
  }, [bumpBadges]);

  const pendingCount = approvals.length + exceptions.length + notifications.filter(n => !n.read).length;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const criticalCount = notifications.filter((n) => n.typeColor === "danger" && !n.read).length;

  return (
    <WorkspaceContext.Provider
      value={{
        approvals, pendingCount, removeApproval, addApproval,
        exceptions, addException, removeException,
        notifications, markNotificationRead, addNotification,
        unreadCount, criticalCount,
        sopLock, setSopLock: setSopLockWithBump,
        hubCommit, setHubCommit: setHubCommitWithBump,
        badgeRevision, bumpBadges,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

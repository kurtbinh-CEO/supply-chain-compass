import { useEffect, useState } from "react";
import { NavLink } from "@/components/NavLink";
import {
  ClipboardCheck, Activity, BarChart3, Handshake, Boxes,
  Package, CalendarDays, GitBranch,
  Truck, Database, FileBarChart, Settings,
  ChevronLeft, Play, BookOpen, Building, GraduationCap, LayoutDashboard,
  AlertTriangle, RefreshCw, Crown, FlaskConical, GitCompare, ScrollText, GraduationCap as GradCap,
  Minimize2, Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/components/SidebarContext";
import { useWorkflow } from "@/components/WorkflowContext";
import { useWorkspace } from "@/components/WorkspaceContext";
import { useRbac, UserRole } from "@/components/RbacContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "@/components/i18n/I18nContext";
import { useOnboarding } from "@/components/onboarding/OnboardingContext";
import { getTourForRoute } from "@/components/onboarding/tours";
import smartlogIcon from "@/assets/smartlog-icon.png";

/* M1 — Sidebar restructure
 *  - Daily ops: 4 items split bởi 3 phase labels (Chuẩn bị / Kết quả / Thực thi)
 *  - Bỏ: Phân bổ (gộp /drp), Cổng NM (UNIS gõ tay), Vận chuyển (gộp /orders)
 *  - Thêm Đồng bộ vào Quản trị
 *  - Mỗi item daily ops có badge dynamic
 */

type DailyBadgeKey =
  // Daily ops
  | "nm_cn_fresh" | "cn_adjust" | "exceptions" | "po_pending"
  // Monthly plan
  | "demand_progress" | "sop_status" | "hub_commitment" | "gap_pending"
  // Monitoring & Executive
  | "monitoring_alerts" | "executive_risk"
  // Partners
  | "cn_portal_pending";

interface NavItem {
  kind: "item";
  titleKey: string;
  icon: React.ElementType;
  url: string;
  roles?: UserRole[];
  badgeKey?: DailyBadgeKey;
  /** Override role được phép thấy badge (mặc định: cùng `roles` của item).
   *  Để undefined → ai thấy item cũng thấy badge.
   *  Để mảng cụ thể → CHỈ những role này thấy số trên badge,
   *  giúp tránh lộ data nhạy cảm (vd: rủi ro lãnh đạo, tổng đơn pending). */
  badgeRoles?: UserRole[];
}

interface PhaseLabel {
  kind: "phase";
  label: string;
}

type NavEntry = NavItem | PhaseLabel;

interface NavGroup {
  labelKey: string;
  items: NavEntry[];
}

const navGroups: NavGroup[] = [
  {
    labelKey: "nav.overview",
    items: [
      { kind: "item", titleKey: "nav.dashboard", icon: LayoutDashboard, url: "/" },
    ],
  },
  {
    labelKey: "nav.executive",
    items: [
      { kind: "item", titleKey: "nav.executiveItem", icon: Crown, url: "/executive", roles: ["SC_MANAGER"], badgeKey: "executive_risk" },
    ],
  },
  {
    labelKey: "nav.workplace",
    items: [
      { kind: "item", titleKey: "nav.workspace", icon: ClipboardCheck, url: "/workspace" },
    ],
  },
  {
    labelKey: "nav.monitoring",
    items: [
      // Số alerts hệ thống — chỉ SC_MANAGER thấy con số chi tiết.
      { kind: "item", titleKey: "nav.monitoringItem", icon: Activity, url: "/monitoring",
        badgeKey: "monitoring_alerts", badgeRoles: ["SC_MANAGER"] },
    ],
  },
  {
    labelKey: "nav.monthlyPlan",
    items: [
      // Demand progress (8/12 CN): SC + CN cùng cần biết tiến độ submit.
      { kind: "item", titleKey: "nav.demandReview",   icon: BarChart3,      url: "/demand",
        badgeKey: "demand_progress", badgeRoles: ["SC_MANAGER", "CN_MANAGER"] },
      // S&OP status (Đã chốt / Cần chốt): SC mới biết phiên họp.
      { kind: "item", titleKey: "nav.sopConsensus",   icon: Handshake,      url: "/sop",
        badgeKey: "sop_status", badgeRoles: ["SC_MANAGER"] },
      // Hub commitment (6/8 NM): nội bộ SC team.
      { kind: "item", titleKey: "nav.hubCommitment",  icon: Boxes,          url: "/hub",
        badgeKey: "hub_commitment", badgeRoles: ["SC_MANAGER"] },
      // Gap/scenario count: SC + CN.
      { kind: "item", titleKey: "nav.gapScenario",    icon: AlertTriangle,  url: "/gap-scenario",
        badgeKey: "gap_pending", badgeRoles: ["SC_MANAGER", "CN_MANAGER"] },
    ],
  },
  {
    labelKey: "nav.dailyOps",
    items: [
      // Daily ops badges = chỉ số vận hành công khai → ai dùng menu cũng thấy được.
      { kind: "phase", label: "Chuẩn bị" },
      { kind: "item", titleKey: "nav.inventory",    icon: Package,      url: "/inventory",     badgeKey: "nm_cn_fresh" },
      { kind: "item", titleKey: "nav.demandWeekly", icon: CalendarDays, url: "/demand-weekly", badgeKey: "cn_adjust" },
      { kind: "phase", label: "Kết quả" },
      { kind: "item", titleKey: "nav.drpResult",    icon: GitBranch,    url: "/drp",           badgeKey: "exceptions" },
      { kind: "phase", label: "Thực thi" },
      // Số PO pending = nhạy cảm cho SALES (lộ workload) → giới hạn SC + CN.
      { kind: "item", titleKey: "nav.orders",       icon: Truck,        url: "/orders",
        badgeKey: "po_pending", badgeRoles: ["SC_MANAGER", "CN_MANAGER"] },
    ],
  },
  {
    labelKey: "nav.partners",
    items: [
      // Số CN có pending: chỉ SC + CN_MANAGER (SALES không cần thấy số nội bộ partners).
      { kind: "item", titleKey: "nav.cnPortal", icon: Building, url: "/cn-portal",
        roles: ["CN_MANAGER", "SC_MANAGER", "SALES"],
        badgeKey: "cn_portal_pending", badgeRoles: ["SC_MANAGER", "CN_MANAGER"] },
    ],
  },
  {
    labelKey: "nav.config",
    items: [
      { kind: "item", titleKey: "nav.masterData", icon: Database,     url: "/master-data" },
      { kind: "item", titleKey: "nav.sync",       icon: RefreshCw,    url: "/sync" },
      { kind: "item", titleKey: "nav.reports",    icon: FileBarChart, url: "/reports" },
      { kind: "item", titleKey: "nav.configItem", icon: Settings,     url: "/config", roles: ["SC_MANAGER"] },
    ],
  },
  {
    labelKey: "nav.support",
    items: [
      { kind: "item", titleKey: "nav.logicOps", icon: BookOpen, url: "/logic" },
      { kind: "item", titleKey: "nav.guide", icon: GraduationCap, url: "/guide" },
      { kind: "item", titleKey: "nav.scenarios", icon: FlaskConical, url: "/scenarios" },
      { kind: "item", titleKey: "nav.compare", icon: GitCompare, url: "/compare" },
      { kind: "item", titleKey: "nav.audit", icon: ScrollText, url: "/audit" },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
 * Badge value resolver
 *
 * Tạm thời dùng dữ liệu giả lập từ WorkspaceContext (exceptions, approvals).
 * Khi data thật có sẵn (M0: NM/CN freshness, /demand-weekly adjust progress,
 * /orders pending PO list) sẽ wire vào đây.
 * ─────────────────────────────────────────────────────────────────────────── */
interface BadgeData { text: string; tone: "success" | "warning" | "danger" }

/** Interval (ms) tự re-evaluate badge — bắt kịp các thay đổi không có event
 *  (vd: timer aging "PO quá hạn", freshness data). 30s đủ mượt cho ops UI. */
const BADGE_TICK_MS = 30_000;

function useDailyBadges(): Record<DailyBadgeKey, BadgeData | null> {
  const { exceptions, approvals, sopLock, hubCommit, badgeRevision } = useWorkspace();

  // ── Tick định kỳ: tăng nonce mỗi BADGE_TICK_MS để hook re-render
  //    ngay cả khi state context không đổi (vd: PO aging warning theo thời gian). ──
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), BADGE_TICK_MS);
    return () => clearInterval(id);
  }, []);
  // `tick` & `badgeRevision` được "sử dụng" trong scope này → mỗi lần đổi
  //  buộc closure re-tính → re-render consumer. Để rõ ý, gắn vào void expression:
  void tick; void badgeRevision;

  // Pending counters (mock-derived).
  const poPending = approvals.filter(a => a.type === "PO Release" || a.type === "Force-release" || a.type === "Phát hành PO" || a.type === "Phát hành khẩn").length;
  const cnAdjustPending = approvals.filter(a => a.type === "CN Adjust" || a.type === "CN điều chỉnh").length;
  const drpExceptions = exceptions.filter(e => e.type === "SHORTAGE").length;
  const sopPendingApprovals = approvals.filter(a => a.type === "S&OP Lock" || a.type === "S&OP").length;

  // Tổng exceptions hệ thống (monitoring + executive).
  const totalAlerts = exceptions.length;

  // ── S&OP & Hub: ưu tiên state thật từ context; fallback approvals/heuristic. ──
  const sopLocked = sopLock.locked;
  const hubReady = hubCommit.total > 0
    ? { confirmed: hubCommit.confirmed, total: hubCommit.total }
    : { confirmed: 6, total: 8 }; // fallback demo

  return {
    // ── Daily ops ──
    nm_cn_fresh:  { text: "5/5", tone: "success" },
    cn_adjust:    cnAdjustPending > 0
      ? { text: `${4 + cnAdjustPending}/12`, tone: cnAdjustPending > 3 ? "danger" : "warning" }
      : { text: "12/12", tone: "success" },
    exceptions:   drpExceptions > 0
      ? { text: String(drpExceptions), tone: drpExceptions > 3 ? "danger" : "warning" }
      : { text: "✓", tone: "success" },
    po_pending:   poPending > 0
      ? { text: String(poPending), tone: poPending > 3 ? "danger" : "warning" }
      : { text: "✓", tone: "success" },

    // ── Monthly plan ──
    // Rút gọn nhãn (bỏ " CN"/" NM" — ngữ cảnh đã rõ từ tên menu) để dành chỗ cho text menu.
    demand_progress: { text: "8/12", tone: "warning" },
    sop_status:      sopLocked
      ? { text: "Đã chốt", tone: "success" }
      : sopPendingApprovals > 0
        ? { text: "Cần chốt", tone: "warning" }
        : { text: "Chờ phiên", tone: "warning" },
    hub_commitment:  hubReady.confirmed >= hubReady.total
      ? { text: `${hubReady.total}/${hubReady.total}`, tone: "success" }
      : { text: `${hubReady.confirmed}/${hubReady.total}`,
          tone: (hubReady.total - hubReady.confirmed) >= 3 ? "danger" : "warning" },
    gap_pending:     { text: "2", tone: "warning" },

    // ── Monitoring & Executive ──
    monitoring_alerts: totalAlerts > 0
      ? { text: String(totalAlerts), tone: totalAlerts > 5 ? "danger" : "warning" }
      : { text: "✓", tone: "success" },
    executive_risk:    { text: "3 rủi ro", tone: "warning" },

    // ── Partners ──
    cn_portal_pending: { text: "4", tone: "warning" },
  };
}

function badgeClasses(tone: BadgeData["tone"]) {
  switch (tone) {
    case "success": return "bg-success-bg text-success";
    case "warning": return "bg-warning-bg text-warning";
    case "danger":  return "bg-danger-bg text-danger";
  }
}

export function AppSidebar() {
  const { collapsed, toggle, compact, toggleCompact, width, sidebarStyle } = useSidebarState();
  const { startWorkflow, isBarVisible, isRouteInWorkflow, requestLeave } = useWorkflow();
  const { pendingCount } = useWorkspace();
  const { user } = useRbac();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const dailyBadges = useDailyBadges();
  const { startTour } = useOnboarding();
  const tourForRoute = getTourForRoute(location.pathname);

  const handleStartWorkflow = (type: "daily" | "monthly") => {
    startWorkflow(type);
    navigate(type === "daily" ? "/inventory" : "/demand");
  };

  return (
    <aside
      // Width động theo context (collapsed → 64 · compact → 232 · normal → 280).
      // Dùng inline style thay vì class cố định để hai mode chuyển mượt qua transition-[width].
      style={{ width }}
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-surface-3 frosted-glass transition-[width] duration-200"
      )}
    >
      {/* Logo area */}
      <div className={cn(
        "flex h-14 items-center border-b border-surface-3 shrink-0",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {collapsed ? (
          <button onClick={toggle} className="flex items-center justify-center rounded-button p-1 hover:bg-surface-3 transition-colors" title="Mở rộng sidebar">
            <img src={smartlogIcon} alt="Smartlog" className="h-7 w-7 rounded-md object-contain" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={smartlogIcon} alt="Smartlog" className="h-8 w-8 rounded-lg object-contain shrink-0" />
              <div className="flex flex-col -space-y-0.5 min-w-0">
                <span className="font-display text-[12px] font-bold text-text-1 tracking-tight leading-tight truncate">Supply Chain</span>
                <span className="font-display text-[9px] font-semibold text-primary tracking-[0.15em] uppercase leading-tight truncate">Planning Intelligence</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              {/* Toggle compact mode (chỉ enable khi không collapsed). 
                  Lưu preference qua localStorage trong SidebarContext. */}
              <button
                onClick={toggleCompact}
                className="rounded-button p-1.5 hover:bg-surface-3 transition-colors"
                title={compact ? "Chuyển sang sidebar rộng (280px)" : "Chuyển sang sidebar gọn (232px)"}
                aria-label={compact ? "Tắt compact mode" : "Bật compact mode"}
                aria-pressed={compact}
              >
                {compact
                  ? <Maximize2 className="h-3.5 w-3.5 text-text-3" />
                  : <Minimize2 className="h-3.5 w-3.5 text-text-3" />}
              </button>
              <button onClick={toggle} className="rounded-button p-1.5 hover:bg-surface-3 transition-colors" title="Thu nhỏ sidebar">
                <ChevronLeft className="h-4 w-4 text-text-3" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {navGroups.map((group) => {
          // Filter ra items hiển thị (theo role) — phase labels luôn hiện
          const visibleEntries = group.items.filter((entry) => {
            if (entry.kind === "phase") return true;
            return !entry.roles || entry.roles.includes(user.role);
          });
          // Nếu group không còn item nào thì ẩn
          const hasItems = visibleEntries.some(e => e.kind === "item");
          if (!hasItems) return null;

          return (
            <div key={group.labelKey}>
              {!collapsed && (
                <p className="px-3 mb-1.5 font-display text-caption font-semibold uppercase tracking-wider text-text-3">
                  {t(group.labelKey)}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleEntries.map((entry, idx) => {
                  // ── Phase label ──
                  if (entry.kind === "phase") {
                    if (collapsed) {
                      // Trong mini mode: chỉ vẽ separator mỏng
                      return (
                        <div
                          key={`phase-${idx}`}
                          className="mx-2 my-1.5 h-px bg-surface-3/60"
                          aria-hidden
                        />
                      );
                    }
                    return (
                      <div
                        key={`phase-${idx}`}
                        className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-[0.3px] text-text-3/70"
                      >
                        {entry.label}
                      </div>
                    );
                  }

                  // ── Nav item ──
                  const item = entry;
                  const isActive = location.pathname === item.url;
                  const handleNavClick = (e: React.MouseEvent) => {
                    if (isBarVisible && !isRouteInWorkflow(item.url) && item.url !== "/workspace" && item.url !== "/") {
                      e.preventDefault();
                      requestLeave(item.url);
                    }
                  };
                  // Badge có 3 trạng thái:
                  //  (1) badge != null  → render con số/text bình thường (có data + đủ quyền).
                  //  (2) hiddenByRole   → có data nhưng role hiện tại không được xem
                  //                       → render placeholder "—" muted + tooltip giải thích.
                  //  (3) cả hai null    → không render gì (item không có badgeKey hoặc data = null).
                  const rawBadge = item.badgeKey ? dailyBadges[item.badgeKey] : null;
                  const canSeeBadge = !item.badgeRoles || item.badgeRoles.includes(user.role);
                  const badge = canSeeBadge ? rawBadge : null;
                  const hiddenByRole = !canSeeBadge && rawBadge !== null;
                  const allowedRolesLabel = item.badgeRoles?.join(" / ") ?? "";

                  return (
                    <NavLink
                      key={item.url}
                      to={item.url}
                      end
                      onClick={handleNavClick}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-button px-2.5 py-2 text-body text-text-2 hover:bg-surface-3 hover:text-text-1 transition-colors",
                        collapsed && "justify-center px-0",
                        isActive && "bg-surface-3 text-text-1 font-medium"
                      )}
                      activeClassName=""
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r bg-gradient-primary" />
                      )}
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate" title={t(item.titleKey)}>{t(item.titleKey)}</span>
                          {/* ── Sidebar badge — chuẩn chung ──
                           * Tất cả badge (workspace pending + daily ops dynamic) dùng cùng:
                           *   - font-size 10px (text-[10px]) · font-semibold · leading-tight
                           *   - padding 1.5×0.5 · rounded-full · min-w 20px (canh giữa cho số 1 chữ số)
                           *   - tabular-nums (số khớp cột) · h-[18px] (canh hàng với icon 18px)
                           * Tone (bg/text color) là biến số duy nhất giữa các badge. */}
                          {item.url === "/workspace" && pendingCount > 0 && (
                            <span className="shrink-0 inline-flex items-center justify-center h-[18px] min-w-[20px] rounded-full bg-danger-bg text-danger text-[10px] font-semibold leading-tight tabular-nums px-1.5">
                              {pendingCount}
                            </span>
                          )}
                          {badge && (
                            <span
                              className={cn(
                                "shrink-0 inline-flex items-center justify-center h-[18px] min-w-[20px] rounded-full text-[10px] font-semibold leading-tight tabular-nums px-1.5",
                                badgeClasses(badge.tone),
                              )}
                            >
                              {badge.text}
                            </span>
                          )}
                          {/* Placeholder khi badge bị ẩn vì role: giữ chỗ + tooltip giải thích.
                              Tránh để user thắc mắc "tại sao menu này không có số như đồng nghiệp". */}
                          {hiddenByRole && (
                            <span
                              className="shrink-0 inline-flex items-center justify-center h-[18px] min-w-[20px] rounded-full bg-surface-3/60 text-text-3 text-[10px] font-semibold leading-tight px-1.5 cursor-help select-none"
                              title={`Số liệu chỉ hiển thị cho vai trò: ${allowedRolesLabel}. Vai trò hiện tại của bạn (${user.role}) không được xem.`}
                              aria-label="Badge ẩn theo phân quyền"
                            >
                              —
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer: Guide (screen tour) + Workflow triggers */}
      <div className="border-t border-surface-3 p-3 shrink-0 space-y-3">
        {!collapsed ? (
          <>
            {/* Group 1: Hướng dẫn theo màn hình hiện tại */}
            {tourForRoute && (
              <div className="space-y-1">
                <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-text-3">
                  Hướng dẫn
                </div>
                <button
                  onClick={() => startTour(tourForRoute)}
                  className="flex w-full items-center gap-2 rounded-button border border-dashed border-surface-3 px-3 py-2 text-body text-text-2 font-medium hover:bg-surface-2 hover:text-text-1 hover:border-surface-3 transition-colors"
                  title="Bắt đầu hướng dẫn cho màn hình này"
                >
                  <GradCap className="h-4 w-4 shrink-0" />
                  <span>Hướng dẫn màn này</span>
                </button>
              </div>
            )}

            {/* Group 2: Quy trình end-to-end */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-semibold uppercase tracking-wider text-text-3">
                Quy trình
              </div>
              <button
                onClick={() => handleStartWorkflow("daily")}
                className="flex w-full items-center gap-2 rounded-button px-3 py-2 text-body text-primary font-medium hover:bg-info-bg transition-colors"
              >
                <Play className="h-4 w-4 shrink-0" />
                <span>{t("workflow.daily")}</span>
              </button>
              <button
                onClick={() => handleStartWorkflow("monthly")}
                className="flex w-full items-center gap-2 rounded-button px-3 py-2 text-body text-primary font-medium hover:bg-info-bg transition-colors"
              >
                <Play className="h-4 w-4 shrink-0" />
                <span>{t("workflow.monthly")}</span>
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => handleStartWorkflow("daily")}
            className="flex w-full justify-center rounded-button p-2 text-primary hover:bg-info-bg transition-colors"
          >
            <Play className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </aside>
  );
}

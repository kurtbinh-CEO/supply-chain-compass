import { NavLink } from "@/components/NavLink";
import {
  ClipboardCheck, Activity, BarChart3, Handshake, Boxes,
  Package, CalendarDays, GitBranch,
  Truck, Database, FileBarChart, Settings,
  ChevronLeft, Play, BookOpen, Building, GraduationCap, LayoutDashboard,
  AlertTriangle, RefreshCw, Crown, FlaskConical, GitCompare, ScrollText, GraduationCap as GradCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/components/SidebarContext";
import { useWorkflow } from "@/components/WorkflowContext";
import { useWorkspace } from "@/components/WorkspaceContext";
import { useRbac, UserRole } from "@/components/RbacContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/components/i18n/I18nContext";
import { useOnboarding } from "@/components/onboarding/OnboardingContext";
import { getTourForRoute } from "@/components/onboarding/tours";
import smartlogIcon from "@/assets/smartlog-icon.png";
import { BRANCHES, FACTORIES } from "@/data/unis-enterprise-dataset";
import { DEMO_SCENARIOS, getCriticalScenarios } from "@/data/demo-scenarios";

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
 * Badge value resolver — CHUẨN HÓA THEO DỮ LIỆU THẬT.
 *
 * Nguồn dữ liệu:
 *   - useWorkspace(): approvals, exceptions, notifications (state runtime).
 *   - BRANCHES (CN), FACTORIES (NM) — master data từ enterprise dataset.
 *   - DEMO_SCENARIOS — tổng kịch bản; getCriticalScenarios() — kịch bản nghiêm trọng.
 *
 * Nguyên tắc: badge phản ánh đúng trạng thái runtime — KHÔNG hardcode "8/12 CN",
 * "6/8 NM", "2 KB" nữa. Khi pending = 0 → tone success + text rỗng/✓.
 * ─────────────────────────────────────────────────────────────────────────── */
interface BadgeData { text: string; tone: "success" | "warning" | "danger" }

function pickTone(pending: number, warnAt: number, dangerAt: number): BadgeData["tone"] {
  if (pending === 0) return "success";
  if (pending >= dangerAt) return "danger";
  if (pending >= warnAt) return "warning";
  return "warning";
}

function useDailyBadges(): Record<DailyBadgeKey, BadgeData | null> {
  const { exceptions, approvals, notifications, criticalCount } = useWorkspace();

  // ── Counters từ approvals (text tiếng Việt match WorkspaceContext) ──
  const cnAdjustPending = approvals.filter(a => a.type === "CN điều chỉnh").length;
  const poPending       = approvals.filter(a => a.type === "Phát hành PO" || a.type === "Phát hành khẩn").length;
  const sopPending      = approvals.filter(a => a.type === "S&OP").length;
  const ssPending       = approvals.filter(a => a.type === "Thay đổi tồn kho an toàn").length;
  // Tập CN có pending bất kỳ (dùng cho cn_portal_pending).
  // Mock approvals chứa tên CN trong description (vd "CN-BD …") — trích bằng regex.
  const cnPendingSet = new Set<string>();
  approvals.forEach(a => {
    const m = a.description.match(/CN-[A-Z]{2,4}/g);
    if (m) m.forEach(c => cnPendingSet.add(c));
  });

  // ── Master totals ──
  const totalCn = BRANCHES.length;       // số CN thực
  const totalNm = FACTORIES.length;      // số NM thực
  const totalScenarios = DEMO_SCENARIOS.length;
  const criticalScenarios = getCriticalScenarios().length;

  // ── DRP exceptions ──
  const drpShortages = exceptions.filter(e => e.type === "SHORTAGE").length;

  // ── Monitoring/Executive ──
  // Alerts = unread notifications (real-time signal); critical = danger unread.
  const unreadAlerts = notifications.filter(n => !n.read).length;

  // ── Demand progress: bao nhiêu CN đã submit (tổng − CN còn pending điều chỉnh) ──
  const cnSubmitted = Math.max(0, totalCn - cnAdjustPending);

  // ── Hub commitment: NM đã confirm (tổng − pending PO) ──
  // Approximation: mỗi PO pending = 1 NM chưa khóa cam kết.
  const nmConfirmed = Math.max(0, totalNm - poPending);

  return {
    // ── Daily ops ──
    nm_cn_fresh:  { text: `5/${totalNm} · ${totalCn} CN`, tone: "success" }, // freshness mock = OK
    cn_adjust:    cnAdjustPending > 0
      ? { text: `${cnSubmitted}/${totalCn}`, tone: pickTone(cnAdjustPending, 1, 4) }
      : { text: `${totalCn}/${totalCn}`, tone: "success" },
    exceptions:   drpShortages > 0
      ? { text: String(drpShortages), tone: pickTone(drpShortages, 1, 4) }
      : { text: "✓", tone: "success" },
    po_pending:   poPending > 0
      ? { text: String(poPending), tone: pickTone(poPending, 1, 4) }
      : { text: "✓", tone: "success" },

    // ── Monthly plan ──
    demand_progress: cnAdjustPending > 0
      ? { text: `${cnSubmitted}/${totalCn} CN`, tone: pickTone(cnAdjustPending, 1, 4) }
      : { text: `${totalCn}/${totalCn} CN`, tone: "success" },
    sop_status:      sopPending > 0
      ? { text: "Cần chốt", tone: "warning" }
      : { text: "Đã chốt", tone: "success" },
    hub_commitment:  poPending > 0
      ? { text: `${nmConfirmed}/${totalNm} NM`, tone: pickTone(poPending, 1, 3) }
      : { text: `${totalNm}/${totalNm} NM`, tone: "success" },
    gap_pending:     totalScenarios > 0
      ? { text: `${totalScenarios} KB`, tone: pickTone(criticalScenarios, 1, 3) }
      : null,

    // ── Monitoring & Executive ──
    monitoring_alerts: unreadAlerts > 0
      ? { text: String(unreadAlerts), tone: pickTone(unreadAlerts, 1, 5) }
      : { text: "✓", tone: "success" },
    executive_risk:    criticalCount > 0 || ssPending > 0
      ? { text: `${criticalCount + ssPending} rủi ro`, tone: pickTone(criticalCount + ssPending, 1, 3) }
      : { text: "Ổn định", tone: "success" },

    // ── Partners ──
    cn_portal_pending: cnPendingSet.size > 0
      ? { text: `${cnPendingSet.size} CN`, tone: pickTone(cnPendingSet.size, 1, 4) }
      : null,
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
  const { collapsed, toggle } = useSidebarState();
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
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-surface-3 frosted-glass transition-all duration-200",
        collapsed ? "w-16" : "w-[260px]"
      )}
    >
      {/* Logo area */}
      <div className={cn(
        "flex h-14 items-center border-b border-surface-3 shrink-0",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {collapsed ? (
          <button onClick={toggle} className="flex items-center justify-center rounded-button p-1 hover:bg-surface-3 transition-colors">
            <img src={smartlogIcon} alt="Smartlog" className="h-7 w-7 rounded-md object-contain" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5">
              <img src={smartlogIcon} alt="Smartlog" className="h-8 w-8 rounded-lg object-contain shrink-0" />
              <div className="flex flex-col -space-y-0.5">
                <span className="font-display text-[12px] font-bold text-text-1 tracking-tight leading-tight">Supply Chain</span>
                <span className="font-display text-[9px] font-semibold text-primary tracking-[0.15em] uppercase leading-tight">Planning Intelligence</span>
              </div>
            </div>
            <button onClick={toggle} className="rounded-button p-1.5 hover:bg-surface-3 transition-colors">
              <ChevronLeft className="h-4 w-4 text-text-3" />
            </button>
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
                  // Badge chỉ hiện nếu (a) item có badgeKey, (b) data ≠ null,
                  // và (c) role hiện tại nằm trong badgeRoles (nếu có khai báo).
                  // Tránh để SALES nhìn thấy số nội bộ như rủi ro/tổng PO pending.
                  const rawBadge = item.badgeKey ? dailyBadges[item.badgeKey] : null;
                  const canSeeBadge = !item.badgeRoles || item.badgeRoles.includes(user.role);
                  const badge = canSeeBadge ? rawBadge : null;

                  return (
                    <NavLink
                      key={item.url}
                      to={item.url}
                      end
                      onClick={handleNavClick}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-button px-3 py-2 text-body text-text-2 hover:bg-surface-3 hover:text-text-1 transition-colors",
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
                          <span className="flex-1 truncate">{t(item.titleKey)}</span>
                          {/* Workspace pending count */}
                          {item.url === "/workspace" && pendingCount > 0 && (
                            <span className="rounded-full bg-danger-bg text-danger text-caption font-semibold px-1.5 py-0.5 min-w-[20px] text-center">
                              {pendingCount}
                            </span>
                          )}
                          {/* Daily-ops dynamic badge */}
                          {badge && (
                            <span
                              className={cn(
                                "rounded-full text-[10px] font-semibold px-1.5 py-0.5 leading-tight tabular-nums",
                                badgeClasses(badge.tone),
                              )}
                            >
                              {badge.text}
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

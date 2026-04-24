import { NavLink } from "@/components/NavLink";
import {
  ClipboardCheck, Activity, BarChart3, Handshake, Boxes,
  Package, CalendarDays, GitBranch,
  Truck, Database, FileBarChart, Settings,
  ChevronLeft, Play, BookOpen, Building, GraduationCap, LayoutDashboard,
  AlertTriangle, RefreshCw, Crown, FlaskConical, GitCompare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/components/SidebarContext";
import { useWorkflow } from "@/components/WorkflowContext";
import { useWorkspace } from "@/components/WorkspaceContext";
import { useRbac, UserRole } from "@/components/RbacContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "@/components/i18n/I18nContext";
import smartlogIcon from "@/assets/smartlog-icon.png";

/* M1 — Sidebar restructure
 *  - Daily ops: 4 items split bởi 3 phase labels (Chuẩn bị / Kết quả / Thực thi)
 *  - Bỏ: Phân bổ (gộp /drp), Cổng NM (UNIS gõ tay), Vận chuyển (gộp /orders)
 *  - Thêm Đồng bộ vào Quản trị
 *  - Mỗi item daily ops có badge dynamic
 */

type DailyBadgeKey = "nm_cn_fresh" | "cn_adjust" | "exceptions" | "po_pending";

interface NavItem {
  kind: "item";
  titleKey: string;
  icon: React.ElementType;
  url: string;
  roles?: UserRole[];
  badgeKey?: DailyBadgeKey;
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
      // M16 — Tổng quan lãnh đạo (chỉ SC_MANAGER thấy; Director/CEO khi roles được mở rộng)
      { kind: "item", titleKey: "nav.executiveItem", icon: Crown, url: "/executive", roles: ["SC_MANAGER"] },
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
      { kind: "item", titleKey: "nav.monitoringItem", icon: Activity, url: "/monitoring" },
    ],
  },
  {
    labelKey: "nav.monthlyPlan",
    items: [
      { kind: "item", titleKey: "nav.demandReview", icon: BarChart3, url: "/demand" },
      { kind: "item", titleKey: "nav.sopConsensus", icon: Handshake, url: "/sop" },
      { kind: "item", titleKey: "nav.hubCommitment", icon: Boxes, url: "/hub" },
      { kind: "item", titleKey: "nav.gapScenario", icon: AlertTriangle, url: "/gap-scenario" },
    ],
  },
  {
    labelKey: "nav.dailyOps",
    items: [
      { kind: "phase", label: "Chuẩn bị" },
      { kind: "item", titleKey: "nav.inventory",    icon: Package,      url: "/inventory",     badgeKey: "nm_cn_fresh" },
      { kind: "item", titleKey: "nav.demandWeekly", icon: CalendarDays, url: "/demand-weekly", badgeKey: "cn_adjust" },
      { kind: "phase", label: "Kết quả" },
      { kind: "item", titleKey: "nav.drpResult",    icon: GitBranch,    url: "/drp",           badgeKey: "exceptions" },
      { kind: "phase", label: "Thực thi" },
      { kind: "item", titleKey: "nav.orders",       icon: Truck,        url: "/orders",        badgeKey: "po_pending" },
    ],
  },
  {
    labelKey: "nav.partners",
    items: [
      { kind: "item", titleKey: "nav.cnPortal", icon: Building, url: "/cn-portal", roles: ["CN_MANAGER", "SC_MANAGER", "SALES"] },
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

function useDailyBadges(): Record<DailyBadgeKey, BadgeData | null> {
  const { exceptions, approvals } = useWorkspace();

  // Số PO/CN-adjust pending (mock: derive từ approvals)
  const poPending = approvals.filter(a => a.type === "PO Release" || a.type === "Force-release").length;
  const cnAdjustPending = approvals.filter(a => a.type === "CN Adjust").length;
  const drpExceptions = exceptions.filter(e => e.type === "SHORTAGE").length;

  return {
    nm_cn_fresh:  { text: "5/5 · 12 CN", tone: "success" },
    cn_adjust:    cnAdjustPending > 0
      ? { text: `${4 + cnAdjustPending}/12`, tone: cnAdjustPending > 3 ? "danger" : "warning" }
      : { text: "12/12", tone: "success" },
    exceptions:   drpExceptions > 0
      ? { text: String(drpExceptions), tone: drpExceptions > 3 ? "danger" : "warning" }
      : { text: "✓", tone: "success" },
    po_pending:   poPending > 0
      ? { text: String(poPending), tone: poPending > 3 ? "danger" : "warning" }
      : { text: "✓", tone: "success" },
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
                  const badge = item.badgeKey ? dailyBadges[item.badgeKey] : null;

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

      {/* Footer: Workflow trigger */}
      <div className="border-t border-surface-3 p-3 space-y-1 shrink-0">
        {!collapsed ? (
          <div className="space-y-1">
            <button
              onClick={() => handleStartWorkflow("daily")}
              className="flex w-full items-center gap-2 rounded-button px-3 py-2 text-body text-primary font-medium hover:bg-info-bg transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>{t("workflow.daily")}</span>
            </button>
            <button
              onClick={() => handleStartWorkflow("monthly")}
              className="flex w-full items-center gap-2 rounded-button px-3 py-2 text-body text-primary font-medium hover:bg-info-bg transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>{t("workflow.monthly")}</span>
            </button>
          </div>
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

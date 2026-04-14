import { NavLink } from "@/components/NavLink";
import {
  ClipboardCheck, Activity, BarChart3, Handshake, Boxes,
  Package, CalendarDays, GitBranch,
  ShoppingCart, Users, Database, FileBarChart, Settings,
  ChevronLeft, Play, BookOpen, Building, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/components/SidebarContext";
import { useWorkflow } from "@/components/WorkflowContext";
import { useWorkspace } from "@/components/WorkspaceContext";
import { useRbac, UserRole } from "@/components/RbacContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useI18n } from "@/components/i18n/I18nContext";
import smartlogIcon from "@/assets/smartlog-icon.png";

interface NavItem {
  titleKey: string;
  icon: React.ElementType;
  url: string;
  roles?: UserRole[];
}

interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    labelKey: "nav.workplace",
    items: [
      { titleKey: "nav.workspace", icon: ClipboardCheck, url: "/workspace" },
    ],
  },
  {
    labelKey: "nav.monitoring",
    items: [
      { titleKey: "nav.monitoringItem", icon: Activity, url: "/monitoring" },
    ],
  },
  {
    labelKey: "nav.monthlyPlan",
    items: [
      { titleKey: "nav.demandReview", icon: BarChart3, url: "/demand" },
      { titleKey: "nav.sopConsensus", icon: Handshake, url: "/sop" },
      { titleKey: "nav.hubCommitment", icon: Boxes, url: "/hub" },
    ],
  },
  {
    labelKey: "nav.dailyOps",
    items: [
      { titleKey: "nav.nmSupply", icon: Package, url: "/supply" },
      { titleKey: "nav.demandWeekly", icon: CalendarDays, url: "/demand-weekly" },
      { titleKey: "nav.drpAllocation", icon: GitBranch, url: "/drp" },
      { titleKey: "nav.orders", icon: ShoppingCart, url: "/orders" },
    ],
  },
  {
    labelKey: "nav.partners",
    items: [
      { titleKey: "nav.cnPortal", icon: Building, url: "/cn-portal", roles: ["CN_MANAGER", "SC_MANAGER", "SALES"] },
      { titleKey: "nav.supplierPortal", icon: Users, url: "/supplier-portal", roles: ["SC_MANAGER"] },
    ],
  },
  {
    labelKey: "nav.config",
    items: [
      { titleKey: "nav.masterData", icon: Database, url: "/master-data" },
      { titleKey: "nav.reports", icon: FileBarChart, url: "/reports" },
      { titleKey: "nav.configItem", icon: Settings, url: "/config", roles: ["SC_MANAGER"] },
    ],
  },
  {
    labelKey: "nav.support",
    items: [
      { titleKey: "nav.logicOps", icon: BookOpen, url: "/logic" },
      { titleKey: "nav.guide", icon: GraduationCap, url: "/guide" },
    ],
  },
];

export function AppSidebar() {
  const { collapsed, toggle } = useSidebarState();
  const { startWorkflow, isBarVisible, isRouteInWorkflow, requestLeave } = useWorkflow();
  const { pendingCount } = useWorkspace();
  const { user } = useRbac();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleStartWorkflow = (type: "daily" | "monthly") => {
    startWorkflow(type);
    navigate(type === "daily" ? "/supply" : "/demand");
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
          const visibleItems = group.items.filter((item) =>
            !item.roles || item.roles.includes(user.role)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.labelKey}>
              {!collapsed && (
                <p className="px-3 mb-1.5 font-display text-caption font-semibold uppercase tracking-wider text-text-3">
                  {t(group.labelKey)}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  const handleNavClick = (e: React.MouseEvent) => {
                    if (isBarVisible && !isRouteInWorkflow(item.url) && item.url !== "/workspace" && item.url !== "/") {
                      e.preventDefault();
                      requestLeave(item.url);
                    }
                  };
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
                          {item.url === "/workspace" && pendingCount > 0 && (
                            <span className="rounded-full bg-danger-bg text-danger text-caption font-semibold px-1.5 py-0.5 min-w-[20px] text-center">
                              {pendingCount}
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

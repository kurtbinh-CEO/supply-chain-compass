import { NavLink } from "@/components/NavLink";
import {
  ClipboardCheck, Activity, BarChart3, Handshake, Boxes,
  Package, CalendarDays, GitBranch, SplitSquareVertical,
  ShoppingCart, Users, Database, FileBarChart, Settings,
  ChevronLeft, Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/components/SidebarContext";
import { useWorkflow } from "@/components/WorkflowContext";
import { useLocation, useNavigate } from "react-router-dom";

interface NavItem {
  title: string;
  icon: React.ElementType;
  url: string;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Nơi làm việc",
    items: [
      { title: "Workspace", icon: ClipboardCheck, url: "/workspace", badge: "3" },
    ],
  },
  {
    label: "Giám sát",
    items: [
      { title: "Monitoring", icon: Activity, url: "/monitoring" },
    ],
  },
  {
    label: "Kế hoạch tháng",
    items: [
      { title: "Demand Review", icon: BarChart3, url: "/demand" },
      { title: "S&OP Consensus", icon: Handshake, url: "/sop" },
      { title: "Hub & Commitment", icon: Boxes, url: "/hub" },
    ],
  },
  {
    label: "Vận hành ngày",
    items: [
      { title: "NM Supply Sync", icon: Package, url: "/supply" },
      { title: "Demand Weekly", icon: CalendarDays, url: "/demand-weekly" },
      { title: "DRP", icon: GitBranch, url: "/drp" },
      { title: "Allocation", icon: SplitSquareVertical, url: "/allocation" },
      { title: "Orders & Tracking", icon: ShoppingCart, url: "/orders" },
    ],
  },
  {
    label: "Đối tác & Cấu hình",
    items: [
      { title: "Supplier Portal", icon: Users, url: "/supplier-portal" },
      { title: "Master Data", icon: Database, url: "/master-data" },
      { title: "Reports", icon: FileBarChart, url: "/reports" },
      { title: "Config", icon: Settings, url: "/config" },
    ],
  },
];

export function AppSidebar() {
  const { collapsed, toggle } = useSidebarState();
  const { startWorkflow } = useWorkflow();
  const location = useLocation();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-surface-3 frosted-glass transition-all duration-200",
        collapsed ? "w-16" : "w-[260px]"
      )}
    >
      {/* Logo area */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-surface-3 shrink-0">
        {!collapsed && (
          <span className="font-display text-section-header text-text-1 tracking-tight">
            Smartlog
          </span>
        )}
        <button onClick={toggle} className="rounded-button p-1.5 hover:bg-surface-3 transition-colors">
          <ChevronLeft className={cn("h-4 w-4 text-text-2 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1.5 font-display text-caption font-semibold uppercase tracking-wider text-text-3">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <NavLink
                    key={item.url}
                    to={item.url}
                    end
                    className={cn(
                      "group relative flex items-center gap-3 rounded-button px-3 py-2 text-body text-text-2 hover:bg-surface-3 hover:text-text-1 transition-colors",
                      collapsed && "justify-center px-0",
                      isActive && "bg-surface-3 text-text-1 font-medium"
                    )}
                    activeClassName=""
                  >
                    {/* Active left accent */}
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r bg-gradient-primary" />
                    )}
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.title}</span>
                        {item.badge && (
                          <span className="rounded-full bg-danger-bg text-danger text-caption font-semibold px-1.5 py-0.5 min-w-[20px] text-center">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: Workflow trigger */}
      <div className="border-t border-surface-3 p-3 space-y-1 shrink-0">
        {!collapsed ? (
          <div className="space-y-1">
            <button
              onClick={() => startWorkflow("daily")}
              className="flex w-full items-center gap-2 rounded-button px-3 py-2 text-body text-primary font-medium hover:bg-info-bg transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>Quy trình ngày</span>
            </button>
            <button
              onClick={() => startWorkflow("monthly")}
              className="flex w-full items-center gap-2 rounded-button px-3 py-2 text-body text-primary font-medium hover:bg-info-bg transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>Quy trình tháng</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => startWorkflow("daily")}
            className="flex w-full justify-center rounded-button p-2 text-primary hover:bg-info-bg transition-colors"
          >
            <Play className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>
    </aside>
  );
}

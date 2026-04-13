import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard,
  AlertTriangle,
  Package,
  TrendingUp,
  Truck,
  ClipboardCheck,
  Settings,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarState } from "@/components/SidebarContext";

const navItems = [
  { title: "Tổng quan", icon: LayoutDashboard, url: "/" },
  { title: "Ngoại lệ", icon: AlertTriangle, url: "/exceptions" },
  { title: "Tồn kho", icon: Package, url: "/inventory" },
  { title: "Dự báo", icon: TrendingUp, url: "/forecast" },
  { title: "Phân phối", icon: Truck, url: "/distribution" },
  { title: "Workspace", icon: ClipboardCheck, url: "/workspace" },
];

export function AppSidebar() {
  const { collapsed, toggle } = useSidebarState();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border frosted-glass transition-all duration-200",
        collapsed ? "w-16" : "w-[260px]"
      )}
    >
      <div className="flex h-14 items-center justify-between px-4 border-b border-border">
        {!collapsed && (
          <span className="font-display text-section-header text-foreground tracking-tight">
            Smartlog
          </span>
        )}
        <button onClick={toggle} className="rounded-button p-1.5 hover:bg-accent transition-colors">
          <ChevronLeft className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className={cn(
              "flex items-center gap-3 rounded-button px-3 py-2 text-body text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
              collapsed && "justify-center px-0"
            )}
            activeClassName="bg-accent text-foreground font-medium"
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <NavLink
          to="/settings"
          className={cn(
            "flex items-center gap-3 rounded-button px-3 py-2 text-body text-muted-foreground hover:bg-accent transition-colors",
            collapsed && "justify-center px-0"
          )}
          activeClassName="bg-accent text-foreground font-medium"
        >
          <Settings className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span>Cài đặt</span>}
        </NavLink>
      </div>
    </aside>
  );
}

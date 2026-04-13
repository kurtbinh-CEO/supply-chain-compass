import { Search, Bell, ChevronRight } from "lucide-react";
import { useLocation } from "react-router-dom";

const routeNames: Record<string, string> = {
  "/workspace": "Workspace",
  "/monitoring": "Monitoring",
  "/demand": "Demand Review",
  "/sop": "S&OP Consensus",
  "/hub": "Hub & Commitment",
  "/supply": "NM Supply Sync",
  "/demand-weekly": "Demand Weekly",
  "/drp": "DRP",
  "/allocation": "Allocation",
  "/orders": "Orders & Tracking",
  "/supplier-portal": "Supplier Portal",
  "/master-data": "Master Data",
  "/reports": "Reports",
  "/config": "Config",
};

const tenants = ["UNIS Group", "TTC Agris", "Mondelez"];

export function TopBar() {
  const location = useLocation();
  const pageName = routeNames[location.pathname] || "Tổng quan";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-surface-3 bg-surface-2 px-6 gap-4">
      {/* Logo */}
      <span className="font-display text-section-header text-text-1 tracking-tight">
        Smartlog <span className="text-primary">SCP</span>
      </span>

      {/* Tenant pill */}
      <select className="rounded-full bg-surface-1 px-3 py-1 text-caption font-medium text-text-2 border border-surface-3 appearance-none cursor-pointer hover:border-primary/40 transition-colors pr-6 bg-no-repeat bg-[length:12px] bg-[right_8px_center]">
        {tenants.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-table-sm text-text-2 ml-2">
        <span>SCP</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-text-1 font-medium">{pageName}</span>
      </nav>

      <div className="flex-1" />

      {/* Search */}
      <button className="flex items-center gap-2 rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-3 hover:border-primary/40 transition-colors">
        <Search className="h-3.5 w-3.5" />
        <span>Tìm kiếm...</span>
        <kbd className="ml-4 rounded bg-surface-1 px-1.5 py-0.5 text-caption font-mono">⌘K</kbd>
      </button>

      {/* Role pill */}
      <span className="rounded-full bg-info-bg text-info text-caption font-medium px-2.5 py-0.5">
        SC Planner
      </span>

      {/* Bell */}
      <button className="relative rounded-button p-2 hover:bg-surface-3 transition-colors">
        <Bell className="h-4 w-4 text-text-2" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger" />
      </button>

      {/* Avatar */}
      <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-caption font-semibold text-primary-foreground">
        NV
      </div>
    </header>
  );
}

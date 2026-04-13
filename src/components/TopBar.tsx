import { Search, Bell, ChevronRight } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-card-elevated px-6 gap-4">
      {/* Logo */}
      <span className="font-display text-section-header text-foreground tracking-tight">
        Smartlog <span className="text-primary">SCP</span>
      </span>

      {/* Tenant pill */}
      <span className="rounded-full bg-card px-3 py-1 text-caption font-medium text-muted-foreground border border-border">
        UNIS Group
      </span>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-table-sm text-muted-foreground ml-2">
        <span>Tổng quan</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Dashboard</span>
      </nav>

      <div className="flex-1" />

      {/* Search */}
      <button className="flex items-center gap-2 rounded-button border border-border bg-background px-3 py-1.5 text-table-sm text-tertiary hover:border-primary/40 transition-colors">
        <Search className="h-3.5 w-3.5" />
        <span>Tìm kiếm...</span>
        <kbd className="ml-4 rounded bg-card px-1.5 py-0.5 text-caption font-mono">⌘K</kbd>
      </button>

      {/* Bell */}
      <button className="relative rounded-button p-2 hover:bg-accent transition-colors">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger" />
      </button>

      {/* Avatar */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center text-caption font-semibold text-primary-foreground">
          NV
        </div>
      </div>
    </header>
  );
}

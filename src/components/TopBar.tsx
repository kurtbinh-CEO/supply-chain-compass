import { Search, Bell, ChevronRight, Sun, Moon, Monitor, Globe, ChevronDown, LogOut } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTenant, TenantName } from "@/components/TenantContext";
import { useThemeMode } from "@/components/ThemeContext";
import { useI18n } from "@/components/i18n/I18nContext";
import type { Locale } from "@/components/i18n/translations";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/components/AuthContext";

const routeKeys: Record<string, string> = {
  "/workspace": "route.workspace",
  "/monitoring": "route.monitoring",
  "/demand": "route.demand",
  "/sop": "route.sop",
  "/hub": "route.hub",
  "/supply": "route.supply",
  "/demand-weekly": "route.demandWeekly",
  "/drp": "route.drp",
  "/allocation": "route.allocation",
  "/orders": "route.orders",
  "/supplier-portal": "route.supplierPortal",
  "/master-data": "route.masterData",
  "/reports": "route.reports",
  "/config": "route.config",
};

const routeGroups: Record<string, string> = {
  "/workspace": "Workspace",
  "/monitoring": "Giám sát",
  "/demand": "Kế hoạch tháng",
  "/sop": "Kế hoạch tháng",
  "/hub": "Kế hoạch tháng",
  "/supply": "Vận hành ngày",
  "/demand-weekly": "Vận hành ngày",
  "/drp": "Vận hành ngày",
  "/allocation": "Vận hành ngày",
  "/orders": "Vận hành ngày",
  "/supplier-portal": "Đối tác",
  "/cn-portal": "Đối tác",
  "/master-data": "Cấu hình",
  "/reports": "Cấu hình",
  "/config": "Cấu hình",
};

function TenantDropdown({ tenant, setTenant, tenants }: { tenant: string; setTenant: (t: TenantName) => void; tenants: readonly string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg bg-surface-0 border border-surface-3 px-3 py-1.5 text-table-sm font-medium text-text-1 hover:border-primary/40 transition-all hover:shadow-sm"
      >
        <span className="h-2 w-2 rounded-full bg-success" />
        <span>{tenant}</span>
        <ChevronDown className={`h-3 w-3 text-text-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-48 rounded-card border border-surface-3 bg-surface-2 shadow-lg py-1 z-50 animate-fade-in">
          {tenants.map(t => (
            <button
              key={t}
              onClick={() => { setTenant(t as TenantName); setOpen(false); }}
              className={`flex items-center gap-2 w-full px-3 py-2 text-table-sm transition-colors ${
                t === tenant ? "bg-primary/5 text-primary font-medium" : "text-text-2 hover:bg-surface-3"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${t === tenant ? "bg-primary" : "bg-text-3/30"}`} />
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const location = useLocation();
  const { tenant, setTenant, tenants } = useTenant();
  const { theme, setTheme } = useThemeMode();
  const { locale, setLocale, t } = useI18n();

  const routeKey = routeKeys[location.pathname];
  const pageName = routeKey ? t(routeKey) : t("route.overview");
  const groupName = routeGroups[location.pathname] || "";

  const themeOptions: { value: "light" | "dark" | "system"; icon: React.ElementType; label: string }[] = [
    { value: "light", icon: Sun, label: t("theme.light") },
    { value: "dark", icon: Moon, label: t("theme.dark") },
    { value: "system", icon: Monitor, label: t("theme.system") },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center border-b border-surface-3 bg-surface-2/80 backdrop-blur-md px-5 gap-3">
      {/* Tenant selector */}
      <TenantDropdown tenant={tenant} setTenant={setTenant} tenants={tenants} />

      {/* Divider */}
      <div className="h-5 w-px bg-surface-3" />

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-table-sm">
        <span className="text-text-3">SCP</span>
        {groupName && (
          <>
            <ChevronRight className="h-3 w-3 text-text-3/50" />
            <span className="text-text-3">{groupName}</span>
          </>
        )}
        <ChevronRight className="h-3 w-3 text-text-3/50" />
        <span className="text-text-1 font-semibold">{pageName}</span>
      </nav>

      <div className="flex-1" />

      {/* Search */}
      <button className="flex items-center gap-2 rounded-lg border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-3 hover:border-primary/40 transition-all hover:shadow-sm">
        <Search className="h-3.5 w-3.5" />
        <span className="hidden xl:inline">{t("search.placeholder")}</span>
        <kbd className="ml-3 rounded bg-surface-3/50 px-1.5 py-0.5 text-caption font-mono text-text-3">⌘K</kbd>
      </button>

      {/* Language toggle */}
      <button
        onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
        className="flex items-center gap-1 rounded-lg border border-surface-3 px-2 py-1.5 text-caption font-semibold text-text-2 hover:border-primary/40 transition-all uppercase tracking-wide"
        title={locale === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
      >
        <Globe className="h-3.5 w-3.5 text-text-3" />
        {locale}
      </button>

      {/* Theme toggle */}
      <div className="flex items-center rounded-lg border border-surface-3 p-0.5 gap-0.5">
        {themeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`rounded-md p-1.5 transition-all ${
              theme === opt.value
                ? "bg-primary text-white shadow-sm"
                : "text-text-3 hover:text-text-1"
            }`}
            title={opt.label}
          >
            <opt.icon className="h-3 w-3" />
          </button>
        ))}
      </div>

      {/* Bell */}
      <button className="relative rounded-lg p-2 hover:bg-surface-3 transition-colors">
        <Bell className="h-4 w-4 text-text-2" />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface-2" />
      </button>

      {/* Role + Avatar */}
      <div className="flex items-center gap-2 pl-1 border-l border-surface-3 ml-1">
        <div className="flex flex-col items-end">
          <span className="text-table-sm font-medium text-text-1 leading-tight">Nguyễn Văn</span>
          <span className="text-caption text-primary font-medium leading-tight">{t("role.planner")}</span>
        </div>
        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-caption font-bold text-white shadow-sm">
          NV
        </div>
      </div>
    </header>
  );
}

import { Search, Bell, ChevronRight, Sun, Moon, Monitor, Globe } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTenant, TenantName } from "@/components/TenantContext";
import { useThemeMode } from "@/components/ThemeContext";
import { useI18n } from "@/components/i18n/I18nContext";
import type { Locale } from "@/components/i18n/translations";

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

export function TopBar() {
  const location = useLocation();
  const { tenant, setTenant, tenants } = useTenant();
  const { theme, setTheme } = useThemeMode();
  const { locale, setLocale, t } = useI18n();

  const routeKey = routeKeys[location.pathname];
  const pageName = routeKey ? t(routeKey) : t("route.overview");

  const themeOptions: { value: "light" | "dark" | "system"; icon: React.ElementType; label: string }[] = [
    { value: "light", icon: Sun, label: t("theme.light") },
    { value: "dark", icon: Moon, label: t("theme.dark") },
    { value: "system", icon: Monitor, label: t("theme.system") },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-surface-3 bg-surface-2 px-6 gap-4">
      {/* Logo */}
      <span className="font-display text-section-header text-text-1 tracking-tight">
        Smartlog <span className="text-primary">SCP</span>
      </span>

      {/* Tenant pill */}
      <select
        value={tenant}
        onChange={e => setTenant(e.target.value as TenantName)}
        className="rounded-full bg-surface-1 px-3 py-1 text-caption font-medium text-text-2 border border-surface-3 appearance-none cursor-pointer hover:border-primary/40 transition-colors pr-6 bg-no-repeat bg-[length:12px] bg-[right_8px_center]">
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
        <span>{t("search.placeholder")}</span>
        <kbd className="ml-4 rounded bg-surface-1 px-1.5 py-0.5 text-caption font-mono">⌘K</kbd>
      </button>

      {/* Language toggle */}
      <button
        onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
        className="flex items-center gap-1.5 rounded-full border border-surface-3 px-2.5 py-1 text-caption font-medium text-text-2 hover:border-primary/40 transition-colors"
        title={locale === "vi" ? "Switch to English" : "Chuyển sang Tiếng Việt"}
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="uppercase">{locale}</span>
      </button>

      {/* Theme toggle */}
      <div className="flex items-center rounded-full border border-surface-3 p-0.5">
        {themeOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`rounded-full p-1.5 transition-colors ${
              theme === opt.value
                ? "bg-primary/10 text-primary"
                : "text-text-3 hover:text-text-1"
            }`}
            title={opt.label}
          >
            <opt.icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>

      {/* Role pill */}
      <span className="rounded-full bg-info-bg text-info text-caption font-medium px-2.5 py-0.5">
        {t("role.planner")}
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

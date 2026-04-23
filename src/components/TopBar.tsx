import { Search, Bell, ChevronRight, Sun, Moon, Monitor, Globe, ChevronDown, LogOut, Wifi } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTenant, TenantName } from "@/components/TenantContext";
import { useThemeMode } from "@/components/ThemeContext";
import { useI18n } from "@/components/i18n/I18nContext";
import type { Locale } from "@/components/i18n/translations";
import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/components/AuthContext";
import { ZoomControls } from "@/components/ZoomControls";
import { useCommandPalette } from "@/components/CommandPalette";
import { NM_INVENTORY, FACTORIES } from "@/data/unis-enterprise-dataset";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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

/* ─────────── Freshness indicator (P26) ───────────
 * Tổng hợp staleness từ NM_INVENTORY → 1 icon trên TopBar.
 * 🟢 Data mới (tất cả NM fresh)
 * 🟡 1+ NM cũ (24–72h)
 * 🔴 1+ NM stale > 72h → DRP có thể bị chặn
 */
function FreshnessIndicator() {
  const navigate = useNavigate();

  const { worst, perNm, label, tone } = useMemo(() => {
    // Lấy staleness tệ nhất theo từng NM
    const perNm = FACTORIES.map((f) => {
      const items = NM_INVENTORY.filter((i) => i.nmId === f.id);
      let s: "fresh" | "1d" | "stale" = "fresh";
      let latestTs = 0;
      items.forEach((it) => {
        if (it.staleness === "stale") s = "stale";
        else if (it.staleness === "1d" && s !== "stale") s = "1d";
        const ts = new Date(it.updatedAt).getTime();
        if (ts > latestTs) latestTs = ts;
      });
      // Giờ "thực" tính từ thời điểm dataset (ngày 13/05/2026 10:00)
      const refTs = new Date("2026-05-13T10:00:00+07:00").getTime();
      const hours = Math.max(0, Math.round((refTs - latestTs) / 3_600_000));
      return { id: f.id, name: f.name, s, hours, hasData: items.length > 0 };
    }).filter((x) => x.hasData);

    const worst = perNm.some((x) => x.s === "stale")
      ? "stale"
      : perNm.some((x) => x.s === "1d")
      ? "1d"
      : "fresh";

    const staleCount = perNm.filter((x) => x.s === "stale").length;
    const oldCount = perNm.filter((x) => x.s === "1d").length;

    const label =
      worst === "stale"
        ? `DRP bị chặn — ${staleCount} NM > 72h`
        : worst === "1d"
        ? `${oldCount} NM cũ`
        : "Data mới";

    const tone =
      worst === "stale"
        ? { dot: "bg-danger", text: "text-danger", border: "border-danger/40 hover:border-danger" }
        : worst === "1d"
        ? { dot: "bg-warning", text: "text-warning", border: "border-warning/40 hover:border-warning" }
        : { dot: "bg-success", text: "text-success", border: "border-success/40 hover:border-success" };

    return { worst, perNm, label, tone };
  }, []);

  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          onClick={() => navigate("/sync")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border bg-surface-0 px-2.5 py-1.5 text-caption font-medium transition-all hover:shadow-sm",
            tone.border,
            tone.text,
          )}
          title="Mở Đồng bộ dữ liệu"
        >
          <Wifi className="h-3.5 w-3.5" />
          <span className={cn("h-2 w-2 rounded-full animate-pulse", tone.dot)} />
          <span className="hidden lg:inline">{label}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="max-w-[300px] bg-surface-1 text-text-1 border border-surface-3 shadow-lg p-3"
      >
        <div className="font-semibold mb-2 text-text-1">Độ tươi dữ liệu NM</div>
        <div className="space-y-1">
          {perNm.map((x) => {
            const icon = x.s === "stale" ? "🔴" : x.s === "1d" ? "⚠️" : "✅";
            const hoursLabel =
              x.hours < 1 ? "vừa cập nhật" : x.hours < 24 ? `${x.hours}h` : `${Math.round(x.hours / 24)} ngày`;
            return (
              <div key={x.id} className="flex items-center justify-between gap-3 text-table-sm">
                <span className="text-text-2">{x.name}</span>
                <span className="font-mono text-text-3">
                  {hoursLabel} {icon}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 pt-2 border-t border-surface-3 text-caption text-text-3">
          Bấm để mở trang <strong>Đồng bộ dữ liệu</strong>.
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { tenant, setTenant, tenants } = useTenant();
  const { theme, setTheme } = useThemeMode();
  const { locale, setLocale, t } = useI18n();
  const { profile, signOut } = useAuth();
  const { open: openPalette } = useCommandPalette();

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

      {/* Freshness indicator (P26) */}
      <FreshnessIndicator />

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
      <button
        onClick={openPalette}
        className="flex items-center gap-2 rounded-lg border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-3 hover:border-primary/40 transition-all hover:shadow-sm"
        title="Command palette (⌘K)"
      >
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

      {/* Zoom controls (R14) */}
      <ZoomControls />

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

      {/* Role + Avatar + Sign out */}
      <div className="flex items-center gap-2 pl-1 border-l border-surface-3 ml-1">
        <div className="flex flex-col items-end">
          <span className="text-table-sm font-medium text-text-1 leading-tight">{profile?.display_name || "Người dùng"}</span>
          <span className="text-caption text-primary font-medium leading-tight">{t("role.planner")}</span>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-caption font-bold text-white shadow-sm hover:opacity-80 transition-opacity cursor-pointer"
          title="Hồ sơ cá nhân"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="h-8 w-8 rounded-lg object-cover" />
          ) : (
            (profile?.display_name || "U").slice(0, 2).toUpperCase()
          )}
        </button>
        <button
          onClick={signOut}
          className="rounded-lg p-1.5 hover:bg-surface-3 transition-colors text-text-3 hover:text-danger"
          title="Đăng xuất"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

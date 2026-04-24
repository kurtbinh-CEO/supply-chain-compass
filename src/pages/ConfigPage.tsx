import { useMemo, useState } from "react";
import {
  Search,
  History,
  Plug,
  Target,
  CalendarRange,
  TrendingUp,
  Shield,
  Factory,
  MapPin,
  Network,
  Truck,
  RefreshCw,
  Activity,
  Settings2,
  Download,
  RotateCcw,
  ChevronRight,
  Info,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TermTooltip } from "@/components/TermTooltip";
import { TERMS } from "@/components/i18n/terms";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CONFIG_KEYS, type ConfigGroup, type ConfigKey as DsConfigKey } from "@/data/unis-enterprise-dataset";
import { KpiTargetsTab } from "@/components/config/KpiTargetsTab";
import { AopSummaryPanel } from "@/components/AopSummaryPanel";

/* ──────────────────────────────────────────────────────────────────────
 * Category structure — 2 sections: META (3) + DOMAIN (8)
 * Mỗi category có icon + caption ngắn để user scan trong 1 giây.
 * ────────────────────────────────────────────────────────────────────── */
type CategoryKind = "meta" | "domain";

type CategoryDef = {
  v: string;
  label: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
  kind: CategoryKind;
  groups: ConfigGroup[];
  include?: (k: DsConfigKey) => boolean;
};

const META_CATS: CategoryDef[] = [
  {
    v: "integration",
    label: "Tích hợp dữ liệu",
    caption: "Bravo / SAP / HubSpot connectors",
    icon: Plug,
    kind: "meta",
    groups: [],
  },
  {
    v: "kpi_targets",
    label: "Mục tiêu KPI",
    caption: "Fill rate, MAPE, FVA targets",
    icon: Target,
    kind: "meta",
    groups: [],
  },
  {
    v: "aop",
    label: "Kế hoạch năm (AOP)",
    caption: "Annual Operating Plan tổng quan",
    icon: CalendarRange,
    kind: "meta",
    groups: [],
  },
];

const DOMAIN_CATS: CategoryDef[] = [
  {
    v: "demand_sop",
    label: "Nhu cầu & S&OP",
    caption: "Forecast, consensus, balance",
    icon: TrendingUp,
    kind: "domain",
    groups: ["Demand", "S&OP"],
  },
  {
    v: "safety_stock",
    label: "Tồn kho an toàn",
    caption: "SS formula, z-score, MAPE",
    icon: Shield,
    kind: "domain",
    groups: ["Inventory", "Feedback"],
    include: (k) =>
      k.group === "Inventory" ||
      k.key.includes("ss") ||
      k.key.includes("trust") ||
      k.key.includes("mape") ||
      k.key.includes("fillrate"),
  },
  {
    v: "nm_commit",
    label: "Cam kết nhà máy",
    caption: "MOQ, sourcing, hub commitment",
    icon: Factory,
    kind: "domain",
    groups: ["Supply", "Hub"],
  },
  {
    v: "cn_adjust",
    label: "Điều chỉnh CN",
    caption: "RBAC, scope, tenant default",
    icon: MapPin,
    kind: "domain",
    groups: ["RBAC", "Tenant"],
  },
  {
    v: "alloc_lcnb",
    label: "Phân bổ & LCNB",
    caption: "Netting, LCNB scan, distance",
    icon: Network,
    kind: "domain",
    groups: ["LCNB", "DRP"],
    include: (k) =>
      k.group === "LCNB" ||
      k.key.startsWith("drp.ss") ||
      k.key.includes("netting") ||
      k.key.includes("review") ||
      k.key.includes("auto_lock"),
  },
  {
    v: "transport",
    label: "Vận tải & đóng hàng",
    caption: "Container fill, top-up, MOQ round",
    icon: Truck,
    kind: "domain",
    groups: ["Transport", "Hub"],
    include: (k) => k.group === "Transport" || k.key.startsWith("hub.moq"),
  },
  {
    v: "po_sync",
    label: "PO & đồng bộ",
    caption: "Batch run, release, high-value",
    icon: RefreshCw,
    kind: "domain",
    groups: ["DRP"],
    include: (k) =>
      k.key.startsWith("drp.run") ||
      k.key.startsWith("drp.batch") ||
      k.key.startsWith("drp.release") ||
      k.key.startsWith("drp.high_value") ||
      k.key.includes("required_role"),
  },
  {
    v: "feedback_ops",
    label: "Phản hồi & vận hành",
    caption: "Workflow, notify, audit",
    icon: Activity,
    kind: "domain",
    groups: ["Workflow", "Notification", "Audit", "Feedback"],
    include: (k) =>
      k.group === "Workflow" ||
      k.group === "Notification" ||
      k.group === "Audit" ||
      (k.group === "Feedback" && (k.key.includes("honoring") || k.key.includes("lcnb_hit"))),
  },
];

const ALL_CATS = [...META_CATS, ...DOMAIN_CATS];

/* ──────────────────────────────────────────────────────────────────────
 * Integrations
 * ────────────────────────────────────────────────────────────────────── */
interface Integration {
  id: string;
  source: string;
  type: string;
  status: "active" | "inactive";
  schedule: string;
}

const INTEGRATIONS: Integration[] = [
  { id: "bravo-cn", source: "Bravo ERP", type: "Tồn CN", status: "active", schedule: "06:00 + 22:00" },
  { id: "bravo-nm", source: "Bravo ERP", type: "Tồn NM", status: "inactive", schedule: "—" },
  { id: "dss-fc", source: "DSS / SAP", type: "FC tháng", status: "inactive", schedule: "—" },
  { id: "hubspot-b2b", source: "HubSpot", type: "B2B Pipeline", status: "inactive", schedule: "—" },
  { id: "nm-commit", source: "Cổng NM xác nhận", type: "Cam kết NM", status: "inactive", schedule: "—" },
  { id: "erp-price", source: "SAP / Oracle NM", type: "Bảng giá NM", status: "inactive", schedule: "—" },
];

function IntegrationsView() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-info/30 bg-info-bg/40 px-4 py-3">
        <Info className="h-4 w-4 text-info shrink-0 mt-0.5" />
        <p className="text-table-sm text-text-2">
          Quản lý các nguồn dữ liệu tích hợp tự động. Dùng nút <b className="text-text-1">Kết nối</b> để cấu hình API URL,
          API Key và mapping fields. Khi connector hoạt động, dữ liệu sẽ tự đồng bộ theo lịch.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {INTEGRATIONS.map((row) => (
          <div
            key={row.id}
            className={cn(
              "group rounded-lg border bg-surface-0 p-4 transition-all hover:shadow-sm",
              row.status === "active" ? "border-success/40" : "border-surface-3 hover:border-surface-3/80",
            )}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-body font-semibold text-text-1 truncate">{row.source}</h4>
                  {row.status === "active" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-bg text-success border border-success/30 px-2 py-0.5 text-[11px] font-medium shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                      Hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-1 text-text-3 border border-surface-3 px-2 py-0.5 text-[11px] font-medium shrink-0">
                      Chưa thiết lập
                    </span>
                  )}
                </div>
                <p className="text-table-sm text-text-3">{row.type}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-caption text-text-3 uppercase tracking-wide">Lịch sync</div>
                <div className="text-table-sm font-medium text-text-2 tabular-nums mt-0.5">{row.schedule}</div>
              </div>
            </div>
            <div className="flex gap-1.5">
              {row.status === "active" ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-table-sm"
                    onClick={() => toast("Cấu hình connector (demo)")}
                  >
                    <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                    Cấu hình
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-table-sm border-warning/30 bg-warning-bg text-warning hover:bg-warning-bg hover:text-warning"
                    onClick={() => toast("Đã tạm dừng sync (demo)")}
                  >
                    Tạm dừng
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  className="h-8 text-table-sm bg-gradient-primary text-primary-foreground hover:opacity-90"
                  onClick={() =>
                    toast.info("Tính năng sắp có trong Phase 2", {
                      description: "Kết nối sẽ mở dialog: API URL + API Key + Mapping fields + Test connection.",
                    })
                  }
                >
                  <Plug className="h-3.5 w-3.5 mr-1.5" />
                  Kết nối
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Runtime config typing
 * ────────────────────────────────────────────────────────────────────── */
type RuntimeConfig = DsConfigKey & {
  value: string;
  inputType: "number" | "toggle" | "select" | "text";
  options?: string[];
};

function deriveType(k: DsConfigKey): { inputType: RuntimeConfig["inputType"]; options?: string[] } {
  if (typeof k.defaultValue === "boolean") return { inputType: "toggle" };
  if (typeof k.defaultValue === "number") return { inputType: "number" };
  if (k.key === "supply.commit.tier_default") return { inputType: "select", options: ["Firm", "Soft", "Best-effort"] };
  if (k.key === "drp.netting.level") return { inputType: "select", options: ["sku_base", "sku_variant"] };
  if (k.key === "drp.ss.formula") return { inputType: "select", options: ["sigma_fc_error", "sigma_demand"] };
  if (k.key.endsWith("required_role") || k.key === "audit.export.role")
    return { inputType: "select", options: ["admin", "sc_manager", "cn_manager", "buyer", "viewer"] };
  if (k.key === "rbac.default_role")
    return { inputType: "select", options: ["admin", "sc_manager", "cn_manager", "buyer", "sales", "viewer"] };
  if (k.key === "rbac.cn_manager.scope") return { inputType: "select", options: ["own_cn", "region", "all"] };
  if (k.key === "lcnb.order") return { inputType: "select", options: ["scan_cn_then_hub", "hub_first", "cn_only"] };
  if (k.key === "hub.sourcing.objective") return { inputType: "select", options: ["Hybrid", "LT", "Cost"] };
  if (k.key === "sop.fva.benchmark") return { inputType: "select", options: ["AI", "HW", "Naive"] };
  if (k.key === "tenant.default") return { inputType: "select", options: ["UNIS Group", "TTC Agro", "Mondelez VN"] };
  if (k.key.startsWith("notify.") && k.key.endsWith(".channel"))
    return { inputType: "select", options: ["in_app", "email", "in_app+email", "sms"] };
  return { inputType: "text" };
}

function toRuntime(k: DsConfigKey): RuntimeConfig {
  const { inputType, options } = deriveType(k);
  return { ...k, value: String(k.defaultValue), inputType, options };
}

interface AuditEntry {
  id: string;
  key: string;
  oldValue: string;
  newValue: string;
  by: string;
  at: number;
}

const SEED_AUDIT: AuditEntry[] = [
  { id: "a1", key: "drp.ss.z_default", oldValue: "1.50", newValue: "1.65", by: "Nguyễn Văn A (SC)", at: Date.now() - 3600_000 * 4 },
  { id: "a2", key: "supply.nm.honoring_min", oldValue: "75", newValue: "80", by: "Trần Thị B (Admin)", at: Date.now() - 3600_000 * 12 },
  { id: "a3", key: "lcnb.distance_max_km", oldValue: "400", newValue: "500", by: "Lê Văn C (SC)", at: Date.now() - 3600_000 * 26 },
  { id: "a4", key: "sop.balance.tolerance_pct", oldValue: "10", newValue: "5", by: "Nguyễn Văn A (SC)", at: Date.now() - 3600_000 * 48 },
  { id: "a5", key: "transport.container.fill_min", oldValue: "55", newValue: "60", by: "Phạm Thị D (Admin)", at: Date.now() - 3600_000 * 72 },
];

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "vừa xong";
  if (h < 24) return `${h}h trước`;
  return `${Math.floor(h / 24)}d trước`;
}

function termKeyFor(cfgKey: string): string | null {
  const upper = cfgKey.toUpperCase();
  if (upper.includes("LCNB")) return "LCNB";
  if (upper.includes(".SS") || upper.includes("SAFETY")) return "SS";
  if (upper.includes("MAPE")) return "MAPE";
  if (upper.includes("FVA")) return "FVA";
  if (upper.includes("HSTK")) return "HSTK";
  if (upper.startsWith("DRP.") && upper.includes("BATCH")) return "PO";
  return null;
}

/* ──────────────────────────────────────────────────────────────────────
 * Value editor
 * ────────────────────────────────────────────────────────────────────── */
function ValueEditor({
  cfg,
  onChange,
  isDirty,
}: {
  cfg: RuntimeConfig;
  onChange: (v: string) => void;
  isDirty: boolean;
}) {
  const ringClass = isDirty ? "ring-2 ring-warning/40 ring-offset-1 ring-offset-background" : "";

  if (cfg.inputType === "toggle") {
    const on = cfg.value === "true";
    return <Switch checked={on} onCheckedChange={(c) => onChange(c ? "true" : "false")} aria-label={cfg.key} />;
  }
  if (cfg.inputType === "select" && cfg.options) {
    return (
      <Select value={cfg.value} onValueChange={onChange}>
        <SelectTrigger className={cn("h-9 w-[200px] text-table", ringClass)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {cfg.options.map((o) => (
            <SelectItem key={o} value={o} className="text-table">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (cfg.inputType === "number") {
    return (
      <div className={cn("inline-flex items-center gap-1.5 rounded-md", ringClass)}>
        <Input
          type="number"
          value={cfg.value}
          onChange={(e) => {
            const v = e.target.value;
            if (v !== "" && Number.isNaN(Number(v))) return;
            onChange(v);
          }}
          className="h-9 w-28 text-table tabular-nums text-right font-mono"
        />
        {cfg.unit && <span className="text-table-sm text-text-3 min-w-[18px]">{cfg.unit}</span>}
      </div>
    );
  }
  return (
    <Input
      value={cfg.value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("h-9 w-[200px] text-table", ringClass)}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Config row card — 1 setting per row, no dense table
 * ────────────────────────────────────────────────────────────────────── */
function ConfigRow({
  cfg,
  onUpdate,
  onReset,
  isDirty,
}: {
  cfg: RuntimeConfig;
  onUpdate: (key: string, v: string) => void;
  onReset: (key: string) => void;
  isDirty: boolean;
}) {
  const tk = termKeyFor(cfg.key);
  const hasTerm = tk && TERMS[tk];
  return (
    <div
      className={cn(
        "flex items-start gap-4 px-4 py-3.5 transition-colors",
        "border-b border-surface-3/60 last:border-b-0",
        isDirty ? "bg-warning-bg/30" : "hover:bg-surface-1/40",
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h4 className="text-table font-medium text-text-1">{cfg.description}</h4>
          {hasTerm && <TermTooltip term={tk!} />}
          {isDirty && (
            <span className="inline-flex items-center rounded-sm bg-warning-bg text-warning border border-warning/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Đã sửa
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <code className="text-[11px] font-mono text-text-3 bg-surface-1 px-1.5 py-0.5 rounded-sm border border-surface-3/50">
            {cfg.key}
          </code>
          {cfg.unit && <span className="text-caption text-text-3">đơn vị: {cfg.unit}</span>}
          <span className="text-caption text-text-3">·</span>
          <span className="text-caption text-text-3">mặc định: <span className="font-mono text-text-2">{String(cfg.defaultValue)}</span></span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <ValueEditor cfg={cfg} onChange={(v) => onUpdate(cfg.key, v)} isDirty={isDirty} />
        {isDirty && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-2 text-text-3 hover:text-text-1"
            onClick={() => onReset(cfg.key)}
            aria-label="Khôi phục mặc định"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ConfigList({
  rows,
  onUpdate,
  onReset,
  dirtyKeys,
}: {
  rows: RuntimeConfig[];
  onUpdate: (key: string, v: string) => void;
  onReset: (key: string) => void;
  dirtyKeys: Set<string>;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-surface-3 bg-surface-1/40 p-12 text-center">
        <Search className="h-8 w-8 text-text-3/40 mx-auto mb-2" />
        <p className="text-table text-text-2">Không có tham số nào khớp</p>
        <p className="text-table-sm text-text-3 mt-1">Thử bỏ filter hoặc đổi từ khoá tìm kiếm.</p>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-surface-3 bg-surface-0 overflow-hidden">
      {rows.map((cfg) => (
        <ConfigRow
          key={cfg.key}
          cfg={cfg}
          onUpdate={onUpdate}
          onReset={onReset}
          isDirty={dirtyKeys.has(cfg.key)}
        />
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Sidebar nav item
 * ────────────────────────────────────────────────────────────────────── */
function NavItem({
  cat,
  active,
  count,
  dirtyCount,
  onClick,
}: {
  cat: CategoryDef;
  active: boolean;
  count?: number;
  dirtyCount?: number;
  onClick: () => void;
}) {
  const Icon = cat.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-md px-3 py-2.5 transition-all flex items-start gap-3 group",
        active
          ? "bg-primary/10 text-text-1 ring-1 ring-primary/20"
          : "text-text-2 hover:bg-surface-1 hover:text-text-1",
      )}
    >
      <div
        className={cn(
          "h-8 w-8 rounded-md flex items-center justify-center shrink-0 transition-colors",
          active ? "bg-primary text-primary-foreground" : "bg-surface-1 text-text-3 group-hover:bg-surface-2",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-table font-medium truncate">{cat.label}</span>
          {dirtyCount && dirtyCount > 0 ? (
            <span className="inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-warning text-warning-foreground text-[10px] font-bold px-1">
              {dirtyCount}
            </span>
          ) : null}
        </div>
        <p className="text-caption text-text-3 truncate mt-0.5">{cat.caption}</p>
      </div>
      {typeof count === "number" && (
        <span
          className={cn(
            "shrink-0 text-caption tabular-nums",
            active ? "text-primary font-semibold" : "text-text-3",
          )}
        >
          {count}
        </span>
      )}
      <ChevronRight
        className={cn(
          "h-3.5 w-3.5 shrink-0 mt-1 transition-transform",
          active ? "text-primary translate-x-0.5" : "text-text-3/40 group-hover:text-text-3",
        )}
      />
    </button>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Page
 * ────────────────────────────────────────────────────────────────────── */
export default function ConfigPage() {
  const [configs, setConfigs] = useState<RuntimeConfig[]>(() => CONFIG_KEYS.map(toRuntime));
  const [audit, setAudit] = useState<AuditEntry[]>(SEED_AUDIT);
  const [search, setSearch] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return ALL_CATS[0].v;
    const param = new URLSearchParams(window.location.search).get("tab");
    return ALL_CATS.find((t) => t.v === param)?.v ?? ALL_CATS[0].v;
  });

  /* Track dirty (changed from default) */
  const dirtyKeys = useMemo(() => {
    const s = new Set<string>();
    for (const c of configs) {
      if (c.value !== String(c.defaultValue)) s.add(c.key);
    }
    return s;
  }, [configs]);

  /* Filter rows by category + search */
  const visibleByCat = useMemo(() => {
    const map: Record<string, RuntimeConfig[]> = {};
    const q = search.trim().toLowerCase();
    for (const cat of DOMAIN_CATS) {
      let rows = configs.filter((c) => cat.groups.includes(c.group));
      if (cat.include) rows = rows.filter(cat.include);
      if (q) {
        rows = rows.filter(
          (c) => c.key.toLowerCase().includes(q) || c.description.toLowerCase().includes(q),
        );
      }
      map[cat.v] = rows;
    }
    return map;
  }, [configs, search]);

  /* Per-cat dirty counts */
  const dirtyByCat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const cat of DOMAIN_CATS) {
      m[cat.v] = (visibleByCat[cat.v] ?? []).filter((c) => dirtyKeys.has(c.key)).length;
    }
    return m;
  }, [visibleByCat, dirtyKeys]);

  const totalKeys = configs.length;
  const totalDirty = dirtyKeys.size;
  const activeCat = ALL_CATS.find((c) => c.v === activeTab) ?? ALL_CATS[0];
  const activeRows = visibleByCat[activeTab] ?? [];

  const handleUpdate = (key: string, newValue: string) => {
    setConfigs((prev) => {
      const idx = prev.findIndex((c) => c.key === key);
      if (idx < 0) return prev;
      const old = prev[idx].value;
      if (old === newValue) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], value: newValue };
      setAudit((a) =>
        [
          { id: `audit-${Date.now()}`, key, oldValue: old, newValue, by: "Bạn (SC Manager)", at: Date.now() },
          ...a,
        ].slice(0, 50),
      );
      toast.success(`${key} = ${newValue}`);
      return next;
    });
  };

  const handleReset = (key: string) => {
    setConfigs((prev) => {
      const idx = prev.findIndex((c) => c.key === key);
      if (idx < 0) return prev;
      const old = prev[idx].value;
      const def = String(prev[idx].defaultValue);
      if (old === def) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], value: def };
      setAudit((a) =>
        [
          { id: `audit-${Date.now()}`, key, oldValue: old, newValue: def, by: "Bạn (SC Manager) — reset", at: Date.now() },
          ...a,
        ].slice(0, 50),
      );
      toast.success(`Đã khôi phục ${key} = ${def}`);
      return next;
    });
  };

  return (
    <AppLayout>
      <ScreenHeader
        title="Cấu hình hệ thống"
        subtitle={`${totalKeys} tham số trong ${DOMAIN_CATS.length} nhóm chức năng${
          totalDirty > 0 ? ` · ${totalDirty} đang chỉnh` : ""
        }`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={() => setAuditOpen(true)}
            >
              <History className="h-3.5 w-3.5 mr-1.5" />
              Nhật ký
              {audit.length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-surface-2 text-text-2 text-[10px] font-semibold px-1">
                  {audit.length}
                </span>
              )}
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => toast("Đã xuất config (demo)")}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Xuất
            </Button>
          </div>
        }
      />

      {/* Search bar — global */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo key code, mô tả VN, hoặc thuật ngữ (vd: SS, MAPE, LCNB)…"
            className="pl-9 pr-9 h-10 text-table bg-surface-0"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-surface-2 flex items-center justify-center text-text-3 hover:text-text-1"
              aria-label="Xoá tìm kiếm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {search && (
          <span className="text-caption text-text-3">
            Tìm thấy{" "}
            <span className="font-semibold text-text-1 tabular-nums">
              {Object.values(visibleByCat).reduce((a, r) => a + r.length, 0)}
            </span>{" "}
            tham số
          </span>
        )}
      </div>

      {/* 2-pane layout */}
      <div className="grid grid-cols-12 gap-5">
        {/* LEFT: sidebar nav */}
        <aside className="col-span-12 lg:col-span-3 xl:col-span-3">
          <div className="lg:sticky lg:top-4 space-y-4">
            {/* META section */}
            <div>
              <div className="px-3 mb-1.5">
                <span className="text-caption uppercase tracking-wider text-text-3 font-semibold">
                  Cấu hình hệ thống
                </span>
              </div>
              <nav className="space-y-1">
                {META_CATS.map((cat) => (
                  <NavItem
                    key={cat.v}
                    cat={cat}
                    active={activeTab === cat.v}
                    onClick={() => setActiveTab(cat.v)}
                  />
                ))}
              </nav>
            </div>

            {/* DOMAIN section */}
            <div>
              <div className="px-3 mb-1.5 flex items-center justify-between">
                <span className="text-caption uppercase tracking-wider text-text-3 font-semibold">
                  Tham số nghiệp vụ
                </span>
                <span className="text-caption text-text-3">{DOMAIN_CATS.length} nhóm</span>
              </div>
              <nav className="space-y-1">
                {DOMAIN_CATS.map((cat) => (
                  <NavItem
                    key={cat.v}
                    cat={cat}
                    active={activeTab === cat.v}
                    count={visibleByCat[cat.v]?.length ?? 0}
                    dirtyCount={dirtyByCat[cat.v]}
                    onClick={() => setActiveTab(cat.v)}
                  />
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* RIGHT: content */}
        <main className="col-span-12 lg:col-span-9 xl:col-span-9 min-w-0">
          {/* Active category header */}
          <div className="mb-4 pb-4 border-b border-surface-3 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <activeCat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-headline-3 font-display font-semibold text-text-1 leading-tight">
                  {activeCat.label}
                </h2>
                <p className="text-table-sm text-text-3 mt-0.5">{activeCat.caption}</p>
              </div>
            </div>
            {activeCat.kind === "domain" && (
              <div className="text-right shrink-0">
                <div className="text-caption uppercase tracking-wide text-text-3">Tham số</div>
                <div className="text-headline-3 font-semibold tabular-nums text-text-1 mt-0.5">
                  {activeRows.length}
                  {dirtyByCat[activeCat.v] ? (
                    <span className="ml-1.5 text-table-sm font-medium text-warning">
                      ({dirtyByCat[activeCat.v]} đã sửa)
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Active content */}
          {activeCat.v === "integration" ? (
            <IntegrationsView />
          ) : activeCat.v === "kpi_targets" ? (
            <KpiTargetsTab />
          ) : activeCat.v === "aop" ? (
            <AopSummaryPanel />
          ) : (
            <ConfigList
              rows={activeRows}
              onUpdate={handleUpdate}
              onReset={handleReset}
              dirtyKeys={dirtyKeys}
            />
          )}
        </main>
      </div>

      {/* Audit drawer */}
      <Sheet open={auditOpen} onOpenChange={setAuditOpen}>
        <SheetContent side="right" className="w-full sm:w-[clamp(420px,42vw,560px)] sm:max-w-[560px] p-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b border-surface-3 bg-surface-1/60">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <History className="h-4.5 w-4.5" />
              </div>
              <div>
                <SheetTitle className="text-headline-3 font-semibold text-text-1">
                  Nhật ký thay đổi cấu hình
                </SheetTitle>
                <p className="text-table-sm text-text-3 mt-0.5">{audit.length} thay đổi gần nhất</p>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            {audit.length === 0 ? (
              <p className="text-table-sm text-text-3 text-center py-8">Chưa có thay đổi nào.</p>
            ) : (
              audit.map((a) => (
                <div
                  key={a.id}
                  className="rounded-md border border-surface-3 bg-surface-0 p-3 hover:border-surface-3/80 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <code className="text-[11px] font-mono text-text-1 bg-surface-1 px-1.5 py-0.5 rounded-sm border border-surface-3/50 truncate">
                      {a.key}
                    </code>
                    <span className="text-caption text-text-3 shrink-0 ml-auto">{timeAgo(a.at)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-table-sm tabular-nums">
                    <span className="text-text-3 line-through">{a.oldValue}</span>
                    <ChevronRight className="h-3 w-3 text-text-3" />
                    <span className="text-success font-semibold">{a.newValue}</span>
                  </div>
                  <p className="text-caption text-text-3 mt-1.5">bởi {a.by}</p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ScreenFooter actionCount={4} />
    </AppLayout>
  );
}

import { useMemo, useState } from "react";
import { Search, History } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TermTooltip } from "@/components/TermTooltip";
import { TERMS } from "@/components/i18n/terms";
import { toast } from "sonner";
import { CONFIG_KEYS, type ConfigGroup, type ConfigKey as DsConfigKey } from "@/data/unis-enterprise-dataset";
import { KpiTargetsTab } from "@/components/config/KpiTargetsTab";

/* ── Tab structure (8 functional groupings) ── */
type TabDef = {
  v: string;
  l: string; // VN label
  groups: ConfigGroup[];
  // optional include/exclude predicate to refine
  include?: (k: DsConfigKey) => boolean;
};

const TABS: TabDef[] = [
  {
    v: "integration",
    l: "Tích hợp",
    groups: [],
  },
  {
    v: "kpi_targets",
    l: "Mục tiêu KPI",
    groups: [],
  },
  {
    v: "aop",
    l: "Kế hoạch năm (AOP)",
    groups: [],
  },
  {
    v: "demand_sop",
    l: "A. Nhu cầu & S&OP",
    groups: ["Demand", "S&OP"],
  },
  {
    v: "safety_stock",
    l: "B. Tồn kho an toàn",
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
    l: "C. Cam kết nhà máy",
    groups: ["Supply", "Hub"],
  },
  {
    v: "cn_adjust",
    l: "D. Điều chỉnh CN",
    groups: ["RBAC", "Tenant"],
  },
  {
    v: "alloc_lcnb",
    l: "E. Phân bổ & LCNB",
    groups: ["LCNB", "DRP"],
    include: (k) => k.group === "LCNB" || k.key.startsWith("drp.ss") || k.key.includes("netting") || k.key.includes("review") || k.key.includes("auto_lock"),
  },
  {
    v: "transport",
    l: "F. Vận tải & đóng hàng",
    groups: ["Transport", "Hub"],
    include: (k) => k.group === "Transport" || k.key.startsWith("hub.moq"),
  },
  {
    v: "po_sync",
    l: "G. PO & đồng bộ",
    groups: ["DRP"],
    include: (k) => k.key.startsWith("drp.run") || k.key.startsWith("drp.batch") || k.key.startsWith("drp.release") || k.key.startsWith("drp.high_value") || k.key.includes("required_role"),
  },
  {
    v: "feedback_ops",
    l: "H. Phản hồi & vận hành",
    groups: ["Workflow", "Notification", "Audit", "Feedback"],
    include: (k) =>
      k.group === "Workflow" ||
      k.group === "Notification" ||
      k.group === "Audit" ||
      (k.group === "Feedback" && (k.key.includes("honoring") || k.key.includes("lcnb_hit"))),
  },
];

/* ─────────── Integrations table ─────────── */
interface Integration {
  id: string;
  source: string;
  type: string;
  status: "active" | "inactive";
  schedule: string;
}

const INTEGRATIONS: Integration[] = [
  { id: "bravo-cn",    source: "Bravo ERP", type: "Tồn CN",  status: "active",   schedule: "06:00 + 22:00" },
  { id: "bravo-nm",    source: "Bravo ERP", type: "Tồn NM",  status: "inactive", schedule: "—" },
  { id: "dss-fc",      source: "DSS / SAP", type: "FC tháng", status: "inactive", schedule: "—" },
  { id: "hubspot-b2b", source: "HubSpot",   type: "B2B Pipeline", status: "inactive", schedule: "—" },
  { id: "nm-commit",   source: "Cổng NM xác nhận", type: "Cam kết NM", status: "inactive", schedule: "—" },
  { id: "erp-price",   source: "SAP / Oracle NM", type: "Bảng giá NM", status: "inactive", schedule: "—" },
];

function IntegrationsTab() {
  return (
    <div className="space-y-4">
      <div className="rounded-card border border-surface-3 bg-info-bg/40 px-4 py-3 text-table-sm text-text-2">
        💡 Quản lý các nguồn dữ liệu tích hợp tự động. Dùng nút <b>Kết nối</b> để cấu hình API URL, API Key và Mapping fields.
        Khi connector hoạt động, dữ liệu sẽ tự đồng bộ theo lịch.
      </div>
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table">
          <thead>
            <tr className="bg-surface-1">
              <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">Nguồn dữ liệu</th>
              <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">Loại</th>
              <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">Trạng thái</th>
              <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">Lịch sync</th>
              <th className="text-right px-4 py-2.5 text-table-header uppercase text-text-3 font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {INTEGRATIONS.map((row, i) => (
              <tr key={row.id} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
                <td className="px-4 py-2.5 font-medium text-text-1">{row.source}</td>
                <td className="px-4 py-2.5 text-text-2">{row.type}</td>
                <td className="px-4 py-2.5">
                  {row.status === "active" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-bg text-success border border-success/30 px-2 py-0.5 text-table-sm font-medium">
                      🟢 Đang hoạt động
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-1 text-text-3 border border-surface-3 px-2 py-0.5 text-table-sm font-medium">
                      🔴 Chưa thiết lập
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-text-2 tabular-nums">{row.schedule}</td>
                <td className="px-4 py-2.5 text-right">
                  {row.status === "active" ? (
                    <div className="inline-flex gap-1.5">
                      <button onClick={() => toast("Cấu hình connector (demo)")} className="h-7 px-2 rounded-button border border-surface-3 bg-surface-1 text-text-2 text-table-sm hover:bg-surface-3 transition-colors">⚙ Cấu hình</button>
                      <button onClick={() => toast("Đã tạm dừng sync (demo)")} className="h-7 px-2 rounded-button border border-warning/30 bg-warning-bg text-warning text-table-sm hover:opacity-80 transition-opacity">⏸ Tạm dừng</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => toast.info("Tính năng sắp có trong Phase 2", { description: "Kết nối sẽ mở dialog: API URL + API Key + Mapping fields + Test connection." })}
                      className="h-7 px-3 rounded-button bg-gradient-primary text-primary-foreground text-table-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      🔌 Kết nối
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Mutable runtime config row ── */
type RuntimeConfig = DsConfigKey & {
  value: string;
  inputType: "number" | "toggle" | "select" | "text";
  options?: string[];
};

function deriveType(k: DsConfigKey): { inputType: RuntimeConfig["inputType"]; options?: string[] } {
  if (typeof k.defaultValue === "boolean") return { inputType: "toggle" };
  if (typeof k.defaultValue === "number") return { inputType: "number" };
  // string heuristics
  const v = String(k.defaultValue);
  // enum-like options
  if (k.key === "supply.commit.tier_default") return { inputType: "select", options: ["Firm", "Soft", "Best-effort"] };
  if (k.key === "drp.netting.level") return { inputType: "select", options: ["sku_base", "sku_variant"] };
  if (k.key === "drp.ss.formula") return { inputType: "select", options: ["sigma_fc_error", "sigma_demand"] };
  if (k.key.endsWith("required_role") || k.key === "audit.export.role") return { inputType: "select", options: ["admin", "sc_manager", "cn_manager", "buyer", "viewer"] };
  if (k.key === "rbac.default_role") return { inputType: "select", options: ["admin", "sc_manager", "cn_manager", "buyer", "sales", "viewer"] };
  if (k.key === "rbac.cn_manager.scope") return { inputType: "select", options: ["own_cn", "region", "all"] };
  if (k.key === "lcnb.order") return { inputType: "select", options: ["scan_cn_then_hub", "hub_first", "cn_only"] };
  if (k.key === "hub.sourcing.objective") return { inputType: "select", options: ["Hybrid", "LT", "Cost"] };
  if (k.key === "sop.fva.benchmark") return { inputType: "select", options: ["AI", "HW", "Naive"] };
  if (k.key === "tenant.default") return { inputType: "select", options: ["UNIS Group", "TTC Agro", "Mondelez VN"] };
  if (k.key.startsWith("notify.") && k.key.endsWith(".channel")) return { inputType: "select", options: ["in_app", "email", "in_app+email", "sms"] };
  return { inputType: "text" };
}

function toRuntime(k: DsConfigKey): RuntimeConfig {
  const { inputType, options } = deriveType(k);
  return { ...k, value: String(k.defaultValue), inputType, options };
}

/* ── Audit log entry ── */
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

/* ── Helpers ── */
function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "vừa xong";
  if (h < 24) return `${h}h trước`;
  return `${Math.floor(h / 24)}d trước`;
}

/** Simple key→TERMS heuristic so the description gets a tooltip when relevant. */
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

/* ── Editable value cell ── */
function ValueEditor({ cfg, onChange }: { cfg: RuntimeConfig; onChange: (v: string) => void }) {
  if (cfg.inputType === "toggle") {
    const on = cfg.value === "true";
    return (
      <Switch
        checked={on}
        onCheckedChange={(c) => onChange(c ? "true" : "false")}
        aria-label={cfg.key}
      />
    );
  }
  if (cfg.inputType === "select" && cfg.options) {
    return (
      <Select value={cfg.value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-44 text-table">
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
      <Input
        type="number"
        value={cfg.value}
        onChange={(e) => {
          const v = e.target.value;
          // Validate numeric
          if (v !== "" && Number.isNaN(Number(v))) return;
          onChange(v);
        }}
        className="h-8 w-28 text-table tabular-nums"
      />
    );
  }
  return (
    <Input
      value={cfg.value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-44 text-table"
    />
  );
}

/* ── Config table ── */
function ConfigTable({
  rows,
  onUpdate,
}: {
  rows: RuntimeConfig[];
  onUpdate: (key: string, newValue: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-surface-3 bg-surface-2 p-8 text-center text-text-3 text-table">
        Không có config nào khớp.
      </div>
    );
  }
  return (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
      <table className="w-full text-table">
        <thead>
          <tr className="bg-surface-1">
            <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 w-[280px]">Key</th>
            <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3">Tên / Mô tả VN</th>
            <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 w-[200px]">Giá trị</th>
            <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 w-[110px]">Loại</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((cfg, i) => {
            const tk = termKeyFor(cfg.key);
            const hasTerm = tk && TERMS[tk];
            return (
              <tr key={cfg.key} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
                <td className="px-4 py-2.5 font-mono text-table-sm text-text-1 align-top">{cfg.key}</td>
                <td className="px-4 py-2.5 text-text-2 align-top">
                  <div className="flex items-start gap-1.5">
                    <span>{cfg.description}</span>
                    {hasTerm && <TermTooltip term={tk!} />}
                  </div>
                  {cfg.unit && (
                    <div className="text-caption text-text-3 mt-0.5">Đơn vị: {cfg.unit}</div>
                  )}
                </td>
                <td className="px-4 py-2.5 align-top">
                  <ValueEditor cfg={cfg} onChange={(v) => onUpdate(cfg.key, v)} />
                </td>
                <td className="px-4 py-2.5 align-top">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm bg-surface-1 text-caption text-text-3 uppercase tracking-wide">
                    {cfg.inputType}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Page ── */
export default function ConfigPage() {
  const [configs, setConfigs] = useState<RuntimeConfig[]>(() => CONFIG_KEYS.map(toRuntime));
  const [audit, setAudit] = useState<AuditEntry[]>(SEED_AUDIT);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return TABS[0].v;
    const param = new URLSearchParams(window.location.search).get("tab");
    return TABS.find((t) => t.v === param)?.v ?? TABS[0].v;
  });

  /** Filter rows by tab + search. */
  const visibleByTab = useMemo(() => {
    const map: Record<string, RuntimeConfig[]> = {};
    const q = search.trim().toLowerCase();
    for (const tab of TABS) {
      let rows = configs.filter((c) => tab.groups.includes(c.group));
      if (tab.include) rows = rows.filter(tab.include);
      if (q) {
        rows = rows.filter(
          (c) =>
            c.key.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q),
        );
      }
      map[tab.v] = rows;
    }
    return map;
  }, [configs, search]);

  const totalKeys = configs.length;

  const handleUpdate = (key: string, newValue: string) => {
    setConfigs((prev) => {
      const idx = prev.findIndex((c) => c.key === key);
      if (idx < 0) return prev;
      const old = prev[idx].value;
      if (old === newValue) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], value: newValue };
      // record audit
      setAudit((a) => [
        {
          id: `audit-${Date.now()}`,
          key,
          oldValue: old,
          newValue,
          by: "Bạn (SC Manager)",
          at: Date.now(),
        },
        ...a,
      ].slice(0, 50));
      toast.success(`${key} = ${newValue}`);
      return next;
    });
  };

  return (
    <AppLayout>
      <ScreenHeader
        title="Config"
        subtitle={`Cấu hình hệ thống — ${totalKeys} tham số trong ${TABS.length} nhóm chức năng`}
      />

      {/* Search bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo key code hoặc tên VN…"
            className="pl-8 h-9 text-table"
          />
        </div>
        <span className="text-caption text-text-3">
          Hiển thị {visibleByTab[activeTab]?.length ?? 0} / {totalKeys} tham số
        </span>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-surface-1 border border-surface-3 mb-4 flex-wrap h-auto">
          {TABS.map((t) => {
            const isMeta = t.v === "integration" || t.v === "kpi_targets" || t.v === "aop";
            return (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="data-[state=active]:bg-surface-2 data-[state=active]:text-text-1 text-text-2 text-table"
              >
                {t.l}
                {!isMeta && (
                  <span className="ml-1.5 text-caption text-text-3">
                    ({visibleByTab[t.v]?.length ?? 0})
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.v} value={t.v}>
            {t.v === "integration" ? (
              <IntegrationsTab />
            ) : t.v === "kpi_targets" ? (
              <KpiTargetsTab />
            ) : t.v === "aop" ? (
              <AopConfigPanel />
            ) : (
              <ConfigTable rows={visibleByTab[t.v] ?? []} onUpdate={handleUpdate} />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Audit log panel */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <History className="h-4 w-4 text-text-2" />
          <h3 className="font-display text-body font-semibold text-text-1">
            Nhật ký thay đổi cấu hình
          </h3>
          <span className="text-caption text-text-3">(5 thay đổi gần nhất)</span>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <table className="w-full text-table">
            <thead>
              <tr className="bg-surface-1">
                <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3">Key</th>
                <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3">Giá trị cũ</th>
                <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3">Giá trị mới</th>
                <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3">Bởi</th>
                <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3">Khi</th>
              </tr>
            </thead>
            <tbody>
              {audit.slice(0, 5).map((a, i) => (
                <tr key={a.id} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
                  <td className="px-4 py-2 font-mono text-table-sm text-text-1">{a.key}</td>
                  <td className="px-4 py-2 text-text-3 line-through tabular-nums">{a.oldValue}</td>
                  <td className="px-4 py-2 text-success font-medium tabular-nums">{a.newValue}</td>
                  <td className="px-4 py-2 text-text-2">{a.by}</td>
                  <td className="px-4 py-2 text-text-3">{timeAgo(a.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ScreenFooter actionCount={4} />
    </AppLayout>
  );
}

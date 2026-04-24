/**
 * DemandWeeklyPage (/demand-weekly) — Nhu cầu tuần (Tuần 20).
 *
 * 2 persona views (toggle persist localStorage):
 *  - 👤 CN Manager: 1 CN duy nhất, edit per-SKU adjust + lý do, gửi cho SC.
 *  - 🏢 SC Manager: list 12 CN, drill-down per-SKU, batch approve in-band.
 *
 * Cutoff 18:00 local — quá giờ inputs readonly, button disabled.
 * Tolerance: default ±30%, trust < 60% → ±15%, trust ≥ 85% → auto-approve.
 */
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { useTenant } from "@/components/TenantContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  User, Building2, Clock, Lock, Send, ShieldCheck, AlertTriangle,
  CheckCircle2, XCircle, Scissors, FileWarning, RefreshCw, Inbox,
  FileSpreadsheet, PenLine,
} from "lucide-react";
import { DataSourceSelector, type DataSource } from "@/components/DataSourceSelector";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { TermTooltip } from "@/components/TermTooltip";
import { ClickableNumber } from "@/components/ClickableNumber";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { PivotToggle, usePivotMode } from "@/components/ViewPivotToggle";
import { PivotChildTable, type PivotChildRow } from "@/components/PivotChildTable";
import { SummaryCards, type SummaryCard } from "@/components/SummaryCards";
import { BRANCHES, TRUST_BY_CN, DEMAND_FC } from "@/data/unis-enterprise-dataset";
import { PhasingDialog } from "@/components/PhasingDialog";
import { usePlanningPeriod } from "@/components/PlanningPeriodContext";
import { Calendar } from "lucide-react";

const tenantScales: Record<string, number> = {
  "UNIS Group": 1, "TTC Agris": 0.7, "Mondelez": 1.35,
};

const PERSONA_KEY = "scp-demand-weekly-persona";
type Persona = "cn" | "sc";

/* ────────────── Trust → tolerance config ────────────── */

const TRUST_OVERRIDES: Record<string, number> = {
  "CN-PK":  58,
  "CN-BD":  65,
  "CN-HN":  70,
  "CN-HCM": 82,
  "CN-DN":  91,
};

interface CnConfig {
  trustPct: number;
  tolerancePct: number;
  band: "low" | "normal" | "auto";
  autoApprove: boolean;
}

function buildCnConfigs(): Record<string, CnConfig> {
  const out: Record<string, CnConfig> = {};
  TRUST_BY_CN.forEach((row) => {
    const trust = TRUST_OVERRIDES[row.cnCode] ?? row.trustPct;
    let band: CnConfig["band"] = "normal";
    let tol = 30;
    if (trust < 60) { band = "low";  tol = 15; }
    else if (trust >= 85) { band = "auto"; tol = 30; }
    out[row.cnCode] = { trustPct: trust, tolerancePct: tol, band, autoApprove: trust >= 85 };
  });
  return out;
}

/* ────────────── Cutoff countdown ────────────── */

function useCutoffCountdown(hour = 18, minute = 0) {
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  const closed = diffMs <= 0;
  const totalMin = Math.max(0, Math.floor(diffMs / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return { closed, hoursLeft: h, minutesLeft: m };
}

/* ────────────── SKU mock data per CN ────────────── */

interface SkuSeed {
  item: string;
  variant: string;
  duKien: number;
  /** Pre-filled CN adjustment (positive = tăng, negative = giảm). */
  preAdjust?: number;
  /** Pre-filled lý do for pre-adjusted rows. */
  preReason?: string;
}

const REASONS = [
  "Nhà thầu mới",
  "Dự án chậm",
  "Đối thủ",
  "Thời tiết",
  "Khuyến mãi",
  "Khác",
] as const;
type Reason = typeof REASONS[number] | "";

/** SKU seeds per CN (~4 SKUs each, scaled by tenant). Pre-filled adjustments
 *  illustrate the 4 demo cases described in spec. */
const CN_SKUS: Record<string, SkuSeed[]> = {
  "CN-HN": [
    { item: "GA-300", variant: "A4", duKien: 564, preAdjust: 100, preReason: "Nhà thầu mới" },
    { item: "GA-300", variant: "B2", duKien: 494 },
    { item: "GA-400", variant: "A4", duKien: 318, preAdjust: 50, preReason: "Khuyến mãi" },
    { item: "GA-600", variant: "A4", duKien: 388 },
  ],
  "CN-HP":  [
    { item: "GA-300", variant: "A4", duKien: 314 },
    { item: "GA-400", variant: "A4", duKien: 274 },
    { item: "GA-600", variant: "A4", duKien: 196 },
    { item: "GA-300", variant: "B2", duKien: 196 },
  ],
  "CN-NA":  [
    { item: "GA-300", variant: "A4", duKien: 230 },
    { item: "GA-400", variant: "A4", duKien: 202 },
    { item: "GA-600", variant: "A4", duKien: 130 },
    { item: "GA-300", variant: "B2", duKien: 158 },
  ],
  "CN-DN":  [
    { item: "GA-300", variant: "A4", duKien: 484, preAdjust:  60, preReason: "Nhà thầu mới" },
    { item: "GA-300", variant: "B2", duKien: 423, preAdjust:  40, preReason: "Khuyến mãi" },
    { item: "GA-400", variant: "A4", duKien: 272, preAdjust:  30, preReason: "Nhà thầu mới" },
    { item: "GA-600", variant: "A4", duKien: 333 },
  ],
  "CN-QN":  [
    { item: "GA-300", variant: "A4", duKien: 205 },
    { item: "GA-400", variant: "A4", duKien: 179 },
    { item: "GA-600", variant: "A4", duKien: 115 },
    { item: "GA-300", variant: "B2", duKien: 141 },
  ],
  "CN-NT":  [
    { item: "GA-300", variant: "A4", duKien: 269 },
    { item: "GA-400", variant: "A4", duKien: 235 },
    { item: "GA-600", variant: "A4", duKien: 151 },
    { item: "GA-300", variant: "B2", duKien: 185 },
  ],
  "CN-BMT": [
    { item: "GA-300", variant: "A4", duKien: 166 },
    { item: "GA-400", variant: "A4", duKien: 145 },
    { item: "GA-600", variant: "A4", duKien:  93 },
    { item: "GA-300", variant: "B2", duKien: 116 },
  ],
  "CN-PK":  [
    { item: "GA-300", variant: "A4", duKien: 147 },
    { item: "GA-400", variant: "A4", duKien: 128 },
    { item: "GA-600", variant: "A4", duKien:  82 },
    { item: "GA-300", variant: "B2", duKien: 103 },
  ],
  "CN-BD":  [
    { item: "GA-300", variant: "A4", duKien: 685, preAdjust: 600, preReason: "Khác" },
    { item: "GA-300", variant: "B2", duKien: 600 },
    { item: "GA-400", variant: "A4", duKien: 386 },
    { item: "GA-600", variant: "A4", duKien: 471 },
  ],
  "CN-HCM": [
    { item: "GA-300", variant: "A4", duKien: 826, preAdjust: 120, preReason: "Nhà thầu mới" },
    { item: "GA-300", variant: "B2", duKien: 722, preAdjust:  80, preReason: "Khuyến mãi" },
    { item: "GA-400", variant: "A4", duKien: 464 },
    { item: "GA-600", variant: "A4", duKien: 568 },
  ],
  "CN-CT":  [
    { item: "GA-300", variant: "A4", duKien: 322 },
    { item: "GA-400", variant: "A4", duKien: 282 },
    { item: "GA-600", variant: "A4", duKien: 181 },
    { item: "GA-300", variant: "B2", duKien: 223 },
  ],
  "CN-LA":  [
    { item: "GA-300", variant: "A4", duKien: 220 },
    { item: "GA-400", variant: "A4", duKien: 193 },
    { item: "GA-600", variant: "A4", duKien: 124 },
    { item: "GA-300", variant: "B2", duKien: 153 },
  ],
};

/* ────────────── Working state shape ────────────── */

interface SkuRow {
  cnCode: string;
  key: string;            // unique row id "<cn>-<item>-<variant>"
  item: string;
  variant: string;
  duKien: number;         // scaled forecast
  adjust: number;         // signed delta in m²
  reason: Reason;
  reasonOther: string;
  /** Per-row override decision from SC: undefined = not yet decided. */
  decision?: "approved" | "rejected" | "override" | "trimmed";
  submitted: boolean;     // CN sent for review
}

type RowSeverity = "ok" | "auto" | "pending" | "over";

function classifyRow(row: SkuRow, cfg: CnConfig | undefined): RowSeverity {
  const tol = cfg?.tolerancePct ?? 30;
  const auto = cfg?.autoApprove ?? false;
  if (row.adjust === 0) return "ok";
  const deltaPct = row.duKien > 0 ? (row.adjust / row.duKien) * 100 : 0;
  if (Math.abs(deltaPct) > tol) return "over";
  if (auto) return "auto";
  return "pending";
}

/* ────────────── Persistence helpers ────────────── */

function loadPersona(): Persona {
  if (typeof window === "undefined") return "cn";
  const v = window.localStorage.getItem(PERSONA_KEY);
  return v === "sc" ? "sc" : "cn";
}

function savePersona(p: Persona) {
  try { window.localStorage.setItem(PERSONA_KEY, p); } catch { /* ignore */ }
}

/* ────────────── CN Manager view ────────────── */

interface CnManagerTabProps {
  cnCode: string;
  setCnCode: (c: string) => void;
  rows: SkuRow[];
  config: CnConfig | undefined;
  closed: boolean;
  onChangeRow: (key: string, patch: Partial<SkuRow>) => void;
  onSubmit: () => void;
}

function CnManagerTab({
  cnCode, setCnCode, rows, config, closed, onChangeRow, onSubmit,
}: CnManagerTabProps) {
  const tol = config?.tolerancePct ?? 30;

  const totals = useMemo(() => {
    const duKien = rows.reduce((s, r) => s + r.duKien, 0);
    const adjust = rows.reduce((s, r) => s + r.adjust, 0);
    const final  = duKien + adjust;
    const pct    = duKien > 0 ? (adjust / duKien) * 100 : 0;
    return { duKien, adjust, final, pct };
  }, [rows]);

  const adjustedCount = rows.filter((r) => r.adjust !== 0).length;
  const allSubmitted  = rows.every((r) => r.adjust === 0 || r.submitted);

  const columns: SmartTableColumn<SkuRow>[] = [
    {
      key: "item", label: "Mã hàng", sortable: true, hideable: false, priority: "high",
      width: 130,
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-text-1 text-table-sm">{r.item}</span>
          <span className="text-[10px] text-text-3">{r.variant}</span>
        </div>
      ),
    },
    {
      key: "duKien", label: "Dự kiến (m²)", sortable: true, numeric: true, align: "right",
      hideable: false, priority: "high", width: 110,
      render: (r) => <span className="tabular-nums text-text-2">{r.duKien.toLocaleString("vi-VN")}</span>,
    },
    {
      key: "adjust", label: "Điều chỉnh", hideable: false, priority: "high", width: 130, align: "right",
      render: (r) => {
        const sev = classifyRow(r, config);
        const overTolerance = sev === "over";
        return (
          <div className="flex items-center justify-end gap-1.5">
            <input
              type="number"
              disabled={closed || r.submitted}
              value={r.adjust === 0 ? "" : r.adjust}
              onChange={(e) => {
                const v = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                if (Number.isNaN(v)) return;
                onChangeRow(r.key, { adjust: v });
              }}
              placeholder="0"
              className={cn(
                "w-20 rounded border bg-surface-0 px-1.5 py-1 text-table-sm text-right tabular-nums outline-none transition-colors",
                overTolerance
                  ? "border-danger text-danger focus:border-danger"
                  : r.adjust !== 0
                    ? "border-primary text-text-1 focus:border-primary"
                    : "border-surface-3 text-text-1 focus:border-primary",
                (closed || r.submitted) && "opacity-60 cursor-not-allowed",
              )}
              title={overTolerance ? `Vượt biên ±${tol}%. SC Manager sẽ duyệt.` : undefined}
            />
            {overTolerance && (
              <span title={`Vượt biên ±${tol}%. SC Manager sẽ duyệt.`}>
                <AlertTriangle className="h-3.5 w-3.5 text-danger" />
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "reason", label: "Lý do", hideable: false, priority: "medium", width: 160,
      render: (r) => {
        if (r.adjust === 0) return <span className="text-text-3 text-table-sm">—</span>;
        return (
          <div className="flex flex-col gap-1">
            <Select
              value={r.reason || undefined}
              disabled={closed || r.submitted}
              onValueChange={(v) => onChangeRow(r.key, { reason: v as Reason })}
            >
              <SelectTrigger className="h-7 text-table-sm">
                <SelectValue placeholder="Chọn lý do…" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {r.reason === "Khác" && (
              <input
                type="text"
                disabled={closed || r.submitted}
                value={r.reasonOther}
                onChange={(e) => onChangeRow(r.key, { reasonOther: e.target.value })}
                placeholder="Mô tả ngắn…"
                className="h-7 rounded border border-surface-3 bg-surface-0 px-1.5 text-[11px] outline-none focus:border-primary"
              />
            )}
          </div>
        );
      },
    },
    {
      key: "final", label: "Sau chỉnh", numeric: true, align: "right", hideable: true,
      priority: "high", width: 110, sortable: true,
      accessor: (r) => r.duKien + r.adjust,
      render: (r) => {
        const final = r.duKien + r.adjust;
        return (
          <span className={cn(
            "tabular-nums font-semibold",
            r.adjust > 0 ? "text-success" : r.adjust < 0 ? "text-danger" : "text-text-1",
          )}>
            {final.toLocaleString("vi-VN")}
          </span>
        );
      },
    },
    {
      key: "status", label: "Trạng thái", hideable: false, priority: "high", width: 130,
      render: (r) => {
        const sev = classifyRow(r, config);
        if (r.adjust === 0) {
          return <span className="text-table-sm text-text-3">—</span>;
        }
        if (r.submitted) {
          return (
            <span className="inline-flex items-center gap-1 text-table-sm text-info">
              <Send className="h-3 w-3" /> Đã gửi
            </span>
          );
        }
        const meta = {
          auto:    { icon: CheckCircle2, label: "Sẽ tự duyệt", cls: "text-success" },
          pending: { icon: Clock,        label: "Chờ duyệt",    cls: "text-warning" },
          over:    { icon: AlertTriangle,label: `Vượt biên`,    cls: "text-danger"  },
          ok:      { icon: CheckCircle2, label: "—",            cls: "text-text-3"  },
        }[sev];
        const Icon = meta.icon;
        return (
          <span className={cn("inline-flex items-center gap-1 text-table-sm", meta.cls)}>
            <Icon className="h-3 w-3" /> {meta.label}
          </span>
        );
      },
    },
  ];

  const trustBadge = config && (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
      config.band === "low"  && "bg-warning-bg text-warning border-warning/40",
      config.band === "auto" && "bg-success-bg text-success border-success/40",
      config.band === "normal" && "bg-info-bg text-info border-info/40",
    )}>
      <ShieldCheck className="h-3 w-3" />
      Trust {config.trustPct}% · biên ±{config.tolerancePct}%
      {config.autoApprove && " · auto"}
    </span>
  );

  return (
    <div className="space-y-4">
      {/* CN selector + trust chip */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-table-sm text-text-2">Chọn chi nhánh:</label>
        <Select value={cnCode} onValueChange={setCnCode}>
          <SelectTrigger className="w-56 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BRANCHES.map((b) => (
              <SelectItem key={b.code} value={b.code}>
                {b.code} — {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {trustBadge}
      </div>

      {/* SmartTable per-SKU */}
      <SmartTable<SkuRow>
        screenId={`demand-weekly-cn-${cnCode}`}
        title={`SKU của ${cnCode}`}
        exportFilename={`demand-weekly-${cnCode}`}
        columns={columns}
        data={rows}
        defaultDensity="compact"
        getRowId={(r) => r.key}
        rowSeverity={(r) => {
          const sev = classifyRow(r, config);
          if (sev === "over") return "shortage";
          if (sev === "pending") return "watch";
          return "ok";
        }}
        summaryRow={{
          item: <span className="font-semibold text-text-1">TỔNG</span>,
          duKien: <span className="tabular-nums font-semibold">{totals.duKien.toLocaleString("vi-VN")}</span>,
          adjust: (
            <span className={cn(
              "tabular-nums font-semibold",
              totals.adjust > 0 ? "text-success" : totals.adjust < 0 ? "text-danger" : "text-text-2",
            )}>
              {totals.adjust > 0 ? "+" : ""}{totals.adjust.toLocaleString("vi-VN")}
              {totals.adjust !== 0 && (
                <span className="text-text-3 ml-1 text-[11px]">
                  ({totals.pct > 0 ? "+" : ""}{totals.pct.toFixed(1).replace(".", ",")}%)
                </span>
              )}
            </span>
          ),
          final: <span className="tabular-nums font-semibold">{totals.final.toLocaleString("vi-VN")}</span>,
        }}
        emptyState={{
          icon: <Inbox />,
          title: "Chi nhánh chưa có SKU nào tuần này",
          description: "Có thể chi nhánh chưa được kích hoạt FC hoặc chưa có nhu cầu phát sinh. Liên hệ SC Manager để mở quyền.",
        }}
      />

      {/* Submit action */}
      <button
        onClick={onSubmit}
        disabled={closed || adjustedCount === 0 || allSubmitted}
        className={cn(
          "w-full rounded-button px-4 py-3 text-table font-semibold inline-flex items-center justify-center gap-2 transition-all",
          (closed || adjustedCount === 0 || allSubmitted)
            ? "bg-surface-2 text-text-3 cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        )}
      >
        {closed ? (
          <><Lock className="h-4 w-4" /> Đã đóng nhập</>
        ) : allSubmitted ? (
          <><CheckCircle2 className="h-4 w-4" /> Đã gửi — chờ SC Manager</>
        ) : (
          <><Send className="h-4 w-4" /> Gửi điều chỉnh ({adjustedCount} mã)</>
        )}
      </button>
    </div>
  );
}

/* ────────────── SC Manager view ────────────── */

interface ScSummaryRow {
  cnCode: string;
  cnName: string;
  trust: number;
  totalDuKien: number;
  totalAdjust: number;
  totalPct: number;
  skuCount: number;       // số SKU adjust ≠ 0
  pendingCount: number;
  overCount: number;
  autoCount: number;
  rows: SkuRow[];
  config: CnConfig | undefined;
  status: "none" | "auto" | "pending" | "over";
}

function buildScRows(
  allRows: SkuRow[],
  configs: Record<string, CnConfig>,
): ScSummaryRow[] {
  const byCn: Record<string, SkuRow[]> = {};
  allRows.forEach((r) => {
    (byCn[r.cnCode] ??= []).push(r);
  });
  return BRANCHES.map((b) => {
    const rows = byCn[b.code] ?? [];
    const cfg = configs[b.code];
    const totalDuKien = rows.reduce((s, r) => s + r.duKien, 0);
    const totalAdjust = rows.reduce((s, r) => s + r.adjust, 0);
    const totalPct = totalDuKien > 0 ? (totalAdjust / totalDuKien) * 100 : 0;
    const adjustedRows = rows.filter((r) => r.adjust !== 0);
    let pendingCount = 0, overCount = 0, autoCount = 0;
    adjustedRows.forEach((r) => {
      const sev = classifyRow(r, cfg);
      if (sev === "over") overCount++;
      else if (sev === "pending") pendingCount++;
      else if (sev === "auto") autoCount++;
    });
    let status: ScSummaryRow["status"] = "none";
    if (overCount > 0) status = "over";
    else if (pendingCount > 0) status = "pending";
    else if (autoCount > 0) status = "auto";
    return {
      cnCode: b.code,
      cnName: b.name,
      trust: cfg?.trustPct ?? 0,
      totalDuKien,
      totalAdjust,
      totalPct,
      skuCount: adjustedRows.length,
      pendingCount,
      overCount,
      autoCount,
      rows,
      config: cfg,
      status,
    };
  });
}

interface ScManagerTabProps {
  scRows: ScSummaryRow[];
  onApproveCn: (cnCode: string) => void;
  onRejectCn: (cnCode: string) => void;
  onApproveRow: (key: string) => void;
  onRejectRow: (key: string) => void;
  onTrimRow: (key: string) => void;
  onOverrideRow: (key: string) => void;
  onApproveAllInBand: () => void;
}

function ScManagerTab({
  scRows, onApproveCn, onRejectCn,
  onApproveRow, onRejectRow, onTrimRow, onOverrideRow, onApproveAllInBand,
}: ScManagerTabProps) {
  const [pivot, setPivot] = usePivotMode("demand-weekly-sc");
  const adjustedCns = scRows.filter((r) => r.skuCount > 0).length;
  const totalPending = scRows.reduce((s, r) => s + r.pendingCount, 0);
  const totalOver    = scRows.reduce((s, r) => s + r.overCount, 0);
  const totalAdjust  = scRows.reduce((s, r) => s + r.totalAdjust, 0);
  const totalDuKien  = scRows.reduce((s, r) => s + r.totalDuKien, 0);
  const adjustPct    = totalDuKien > 0 ? (totalAdjust / totalDuKien) * 100 : 0;
  const worstCn      = [...scRows].filter(r => r.overCount > 0).sort((a, b) => Math.abs(b.totalPct) - Math.abs(a.totalPct))[0];

  const scSummary: SummaryCard[] = [
    {
      key: "cn_adjusted",
      label: "CN đã adjust",
      value: `${adjustedCns}/${BRANCHES.length}`,
      unit: "CN",
      severity: adjustedCns < BRANCHES.length / 2 ? "warn" : "ok",
      trend: { delta: "← cutoff 18:00", direction: "flat", color: "gray" },
      tooltip: "Số CN đã gửi điều chỉnh nhu cầu tuần.",
    },
    {
      key: "total_adjust",
      label: "Tổng adjust",
      value: `${totalAdjust > 0 ? "+" : ""}${totalAdjust.toLocaleString("vi-VN")}`,
      unit: "m²",
      severity: Math.abs(adjustPct) > 10 ? "warn" : "ok",
      trend: { delta: `${adjustPct > 0 ? "+" : ""}${adjustPct.toFixed(1)}% vs FC`, direction: adjustPct > 0 ? "up" : adjustPct < 0 ? "down" : "flat", color: Math.abs(adjustPct) > 10 ? "red" : "gray" },
      tooltip: "Tổng net adjust m² so với FC gốc.",
    },
    {
      key: "over_band",
      label: "Vượt biên",
      value: totalOver,
      unit: "CN",
      severity: totalOver > 0 ? "critical" : "ok",
      trend: worstCn
        ? { delta: `${worstCn.cnCode} ${worstCn.totalPct > 0 ? "+" : ""}${worstCn.totalPct.toFixed(0)}%`, direction: "up", color: "red" }
        : { delta: "→ ổn định", direction: "flat", color: "gray" },
      tooltip: "Số CN có adjust ngoài tolerance band — cần SC xử lý.",
    },
    {
      key: "pending",
      label: "Chờ duyệt",
      value: totalPending,
      unit: "SKU",
      severity: totalPending > 0 ? "warn" : "ok",
      trend: { delta: totalPending > 0 ? "Cần SC duyệt" : "→ trống", direction: totalPending > 0 ? "up" : "flat", color: totalPending > 0 ? "red" : "gray" },
      tooltip: "Số SKU đang chờ SC Manager phê duyệt.",
    },
  ];

  // Build SKU-first pivot: aggregate adjust per SKU across CNs
  interface SkuAggRow {
    sku: string;
    totalAdjust: number;
    cnCount: number;
    overCount: number;
    cnBreakdown: PivotChildRow[];
  }
  const skuAggRows: SkuAggRow[] = (() => {
    const map = new Map<string, SkuAggRow>();
    scRows.forEach((cn) => {
      cn.rows.forEach((r) => {
        if (r.adjust === 0) return;
        const skuLabel = `${r.item} ${r.variant}`;
        if (!map.has(skuLabel)) {
          map.set(skuLabel, { sku: skuLabel, totalAdjust: 0, cnCount: 0, overCount: 0, cnBreakdown: [] });
        }
        const p = map.get(skuLabel)!;
        p.totalAdjust += r.adjust;
        p.cnCount++;
        const pct = r.duKien > 0 ? (r.adjust / r.duKien) * 100 : 0;
        const isOver = Math.abs(pct) > 30;
        if (isOver) p.overCount++;
        const hstk = Math.max(0.5, 30 - Math.abs(pct));
        p.cnBreakdown.push({
          key: `${skuLabel}-${cn.cnCode}`,
          label: cn.cnName,
          qty: r.adjust,
          hstk,
          ssTarget: r.duKien,
          statusOverride: `${pct > 0 ? "+" : ""}${pct.toFixed(0)}%`,
          navKind: "cn",
          navValue: cn.cnCode,
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => b.overCount - a.overCount || Math.abs(b.totalAdjust) - Math.abs(a.totalAdjust));
  })();

  const columns: SmartTableColumn<ScSummaryRow>[] = [
    {
      key: "cnName", label: "Chi nhánh", sortable: true, hideable: false, priority: "high",
      filter: "text", width: 180,
      render: (r) => (
        <div className="flex flex-col">
          <span className="font-medium text-text-1 text-table-sm">{r.cnName}</span>
          <span className="text-[10px] text-text-3 font-mono">{r.cnCode}</span>
        </div>
      ),
    },
    {
      key: "trust", label: "Trust", numeric: true, align: "right", sortable: true,
      hideable: true, priority: "medium", width: 90,
      render: (r) => (
        <span className={cn(
          "tabular-nums text-table-sm font-medium",
          r.trust >= 85 ? "text-success" : r.trust < 60 ? "text-danger" : "text-warning",
        )}>
          {r.trust}%
        </span>
      ),
    },
    {
      key: "totalAdjust", label: "Tổng adjust", numeric: true, align: "right",
      sortable: true, hideable: true, priority: "high", width: 130,
      render: (r) => {
        if (r.skuCount === 0) return <span className="text-text-3 text-table-sm">—</span>;
        return (
          <div className="flex flex-col items-end">
            <span className={cn(
              "tabular-nums font-medium",
              r.totalAdjust > 0 ? "text-success" : r.totalAdjust < 0 ? "text-danger" : "text-text-2",
            )}>
              {r.totalAdjust > 0 ? "+" : ""}{r.totalAdjust.toLocaleString("vi-VN")}
            </span>
            <span className="text-[10px] text-text-3 tabular-nums">
              {r.totalPct > 0 ? "+" : ""}{r.totalPct.toFixed(1).replace(".", ",")}%
            </span>
          </div>
        );
      },
    },
    {
      key: "skuCount", label: "Số SKU", numeric: true, align: "right",
      sortable: true, hideable: true, priority: "medium", width: 80,
      render: (r) => (
        <span className="tabular-nums text-text-2">{r.skuCount}</span>
      ),
    },
    {
      key: "status", label: "Trạng thái", hideable: false, priority: "high", width: 200,
      accessor: (r) => r.status,
      filter: "enum",
      filterOptions: [
        { value: "none",    label: "Chưa adjust" },
        { value: "auto",    label: "✅ Tự duyệt" },
        { value: "pending", label: "⏳ Chờ duyệt" },
        { value: "over",    label: "⚠️ Vượt biên" },
      ],
      render: (r) => {
        if (r.status === "none") {
          return <span className="text-table-sm text-text-3">Chưa adjust</span>;
        }
        if (r.status === "over") {
          return (
            <span className="inline-flex items-center gap-1 text-table-sm text-danger font-medium">
              <AlertTriangle className="h-3 w-3" /> Vượt biên ({r.overCount} SKU)
            </span>
          );
        }
        if (r.status === "pending") {
          return (
            <span className="inline-flex items-center gap-1 text-table-sm text-warning font-medium">
              <Clock className="h-3 w-3" /> Chờ duyệt ({r.pendingCount} SKU)
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 text-table-sm text-success font-medium">
            <CheckCircle2 className="h-3 w-3" /> Tự duyệt
          </span>
        );
      },
    },
    {
      key: "actions", label: "Hành động", hideable: false, align: "right",
      priority: "high", width: 160,
      render: (r) => {
        if (r.skuCount === 0 || r.status === "auto") {
          return <span className="text-table-sm text-text-3">—</span>;
        }
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              size="sm" variant="outline"
              onClick={() => onApproveCn(r.cnCode)}
              className="h-7 px-2 text-[11px]"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" /> Duyệt CN
            </Button>
            <Button
              size="sm" variant="outline"
              onClick={() => onRejectCn(r.cnCode)}
              className="h-7 px-2 text-[11px]"
            >
              <XCircle className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <SummaryCards screenId="demand-weekly-sc" cards={scSummary} />

      {/* Summary banner */}
      <div className="rounded-card border border-surface-3 bg-surface-1 px-4 py-3 flex flex-wrap items-center gap-3">
        <Lock className="h-4 w-4 text-text-3 shrink-0" />
        <span className="text-table-sm text-text-1 font-medium">Đã đóng cutoff 18:00</span>
        <span className="text-text-3">·</span>
        <span className="text-table-sm text-text-2 tabular-nums">
          {adjustedCns}/{BRANCHES.length} CN adjust
        </span>
        {totalPending > 0 && (
          <>
            <span className="text-text-3">·</span>
            <span className="text-table-sm text-warning font-medium tabular-nums">
              {totalPending} chờ duyệt
            </span>
          </>
        )}
        {totalOver > 0 && (
          <>
            <span className="text-text-3">·</span>
            <span className="text-table-sm text-danger font-medium tabular-nums">
              {totalOver} vượt biên
            </span>
          </>
        )}
        <Button
          size="sm" variant="default"
          onClick={onApproveAllInBand}
          disabled={totalPending === 0}
          className="ml-auto"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
          Duyệt tất cả trong biên
          {totalPending > 0 && <span className="ml-1 opacity-70">({totalPending})</span>}
        </Button>
      </div>

      {/* Pivot toggle CN ↔ Mã hàng */}
      <div className="flex items-center justify-between">
        <PivotToggle mode={pivot} onChange={setPivot} cnLabel="Chi nhánh" skuLabel="Mã hàng" />
        <span className="text-caption text-text-3">
          {pivot === "cn" ? "Click 1 CN → xem chi tiết SKU adjust" : "Click 1 SKU → xem CN nào adjust"}
        </span>
      </div>

      {pivot === "cn" ? (
        /* SC Manager table — 12 CN with drilldown */
        <SmartTable<ScSummaryRow>
          screenId="demand-weekly-sc"
          title="12 chi nhánh"
          exportFilename="demand-weekly-sc-summary"
          columns={columns}
          data={scRows}
          defaultDensity="normal"
          getRowId={(r) => r.cnCode}
          rowSeverity={(r) =>
            r.status === "over" ? "shortage" :
            r.status === "pending" ? "watch" : "ok"
          }
          autoExpandWhen={(r) => r.status === "over" || r.status === "pending"}
          drillDown={(r) => (
            <ScCnDrillDown
              row={r}
              onApproveRow={onApproveRow}
              onRejectRow={onRejectRow}
              onTrimRow={onTrimRow}
              onOverrideRow={onOverrideRow}
            />
          )}
          emptyState={{
            icon: <Inbox />,
            title: "Chưa có CN nào gửi điều chỉnh",
            description: "Bảng tổng hợp 12 CN sẽ điền dần khi mỗi CN Manager submit điều chỉnh tuần. Cutoff: 18:00 hàng ngày.",
          }}
        />
      ) : (
        /* SKU-first pivot: aggregate adjust per SKU across CNs */
        <SmartTable<typeof skuAggRows[number]>
          screenId="demand-weekly-sc-sku"
          title="Mã hàng → Chi nhánh adjust"
          exportFilename="demand-weekly-sku-pivot"
          columns={[
            {
              key: "sku", label: "Mã hàng", sortable: true, width: 160,
              render: (r) => <span className="font-medium text-text-1 text-table-sm">{r.sku}</span>,
            },
            {
              key: "totalAdjust", label: "Tổng adjust", numeric: true, align: "right", sortable: true, width: 130,
              render: (r) => (
                <span className={cn("tabular-nums font-medium", r.totalAdjust > 0 ? "text-success" : r.totalAdjust < 0 ? "text-danger" : "text-text-2")}>
                  {r.totalAdjust > 0 ? "+" : ""}{r.totalAdjust.toLocaleString("vi-VN")}
                </span>
              ),
            },
            {
              key: "cnCount", label: "# CN adjust", numeric: true, align: "right", sortable: true, width: 110,
              render: (r) => <span className="tabular-nums text-text-2">{r.cnCount}</span>,
            },
            {
              key: "overCount", label: "Vượt biên", numeric: true, align: "right", sortable: true, width: 110,
              render: (r) => r.overCount > 0
                ? <span className="rounded-full bg-danger-bg text-danger px-2 py-0.5 text-[11px] font-medium">{r.overCount} CN</span>
                : <span className="text-success text-table-sm">🟢 Trong biên</span>,
            },
          ]}
          data={skuAggRows}
          defaultDensity="compact"
          getRowId={(r) => r.sku}
          rowSeverity={(r) => r.overCount > 0 ? "shortage" : "ok"}
          autoExpandWhen={(r) => r.overCount > 0}
          drillDown={(r) => (
            <PivotChildTable
              rows={r.cnBreakdown}
              firstColLabel="Chi nhánh"
              screenId={`demand-weekly-sku-child-${r.sku}`}
              showSoSs={false}
            />
          )}
          emptyState={{
            icon: <Inbox />,
            title: "Chưa có SKU nào được adjust",
            description: "Khi CN gửi điều chỉnh, danh sách SKU sẽ hiện ra ở đây.",
          }}
        />
      )}
    </div>
  );
}

/* ─── SC drill-down per-CN: per-SKU action row ─── */

interface DrillProps {
  row: ScSummaryRow;
  onApproveRow: (key: string) => void;
  onRejectRow: (key: string) => void;
  onTrimRow: (key: string) => void;
  onOverrideRow: (key: string) => void;
}

function ScCnDrillDown({ row, onApproveRow, onRejectRow, onTrimRow, onOverrideRow }: DrillProps) {
  const adjusted = row.rows.filter((r) => r.adjust !== 0);
  if (adjusted.length === 0) {
    return (
      <div className="text-table-sm text-text-3 italic px-2 py-1">
        CN này chưa gửi điều chỉnh.
      </div>
    );
  }
  return (
    <table className="w-full text-table-sm">
      <thead>
        <tr className="text-[10px] uppercase text-text-3 border-b border-surface-3">
          <th className="text-left  px-2 py-1.5 font-medium">Mã hàng</th>
          <th className="text-right px-2 py-1.5 font-medium">Dự kiến</th>
          <th className="text-right px-2 py-1.5 font-medium">Adjust</th>
          <th className="text-left  px-2 py-1.5 font-medium">Lý do</th>
          <th className="text-right px-2 py-1.5 font-medium">Δ%</th>
          <th className="text-right px-2 py-1.5 font-medium">Hành động</th>
        </tr>
      </thead>
      <tbody>
        {adjusted.map((r) => {
          const sev = classifyRow(r, row.config);
          const pct = r.duKien > 0 ? (r.adjust / r.duKien) * 100 : 0;
          const reasonLabel = r.reason === "Khác" && r.reasonOther
            ? `Khác: ${r.reasonOther}` : (r.reason || "—");
          const decided = r.decision !== undefined;
          return (
            <tr key={r.key} className="border-b border-surface-3/50 hover:bg-surface-2/40">
              <td className="px-2 py-1.5 text-text-1">
                <span className="font-medium">{r.item}</span>{" "}
                <span className="text-text-3">{r.variant}</span>
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums text-text-2">
                {r.duKien.toLocaleString("vi-VN")}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <span className={cn(
                  "font-medium",
                  r.adjust > 0 ? "text-success" : "text-danger",
                )}>
                  {r.adjust > 0 ? "+" : ""}{r.adjust.toLocaleString("vi-VN")}
                </span>
              </td>
              <td className="px-2 py-1.5 text-text-2 truncate max-w-[160px]" title={reasonLabel}>
                {reasonLabel}
              </td>
              <td className="px-2 py-1.5 text-right tabular-nums">
                <span className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  sev === "over" ? "text-danger" :
                  sev === "pending" ? "text-warning" : "text-success",
                )}>
                  {sev === "over" ? "🔴" : sev === "pending" ? "🟡" : "🟢"}
                  {pct > 0 ? "+" : ""}{pct.toFixed(1).replace(".", ",")}%
                </span>
              </td>
              <td className="px-2 py-1.5 text-right">
                {decided ? (
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-medium",
                    r.decision === "approved" || r.decision === "override" ? "text-success" :
                    r.decision === "trimmed" ? "text-warning" : "text-danger",
                  )}>
                    {r.decision === "approved" && <><CheckCircle2 className="h-3 w-3" />Duyệt</>}
                    {r.decision === "override" && <><FileWarning className="h-3 w-3" />Ghi đè</>}
                    {r.decision === "trimmed" && <><Scissors className="h-3 w-3" />Đã cắt 30%</>}
                    {r.decision === "rejected" && <><XCircle className="h-3 w-3" />Từ chối</>}
                  </span>
                ) : sev === "over" ? (
                  <div className="inline-flex items-center gap-1">
                    <Button size="sm" variant="default" onClick={() => onOverrideRow(r.key)}
                      className="h-6 px-1.5 text-[10px]" title="Nhận vượt biên (yêu cầu lý do)">
                      <CheckCircle2 className="h-3 w-3" /> Nhận
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onTrimRow(r.key)}
                      className="h-6 px-1.5 text-[10px]" title="Cắt còn 30% dự kiến">
                      <Scissors className="h-3 w-3" /> Cắt 30%
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onRejectRow(r.key)}
                      className="h-6 px-1.5 text-[10px]">
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1">
                    <Button size="sm" variant="default" onClick={() => onApproveRow(r.key)}
                      className="h-6 px-1.5 text-[10px]">
                      <CheckCircle2 className="h-3 w-3" /> Duyệt
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onRejectRow(r.key)}
                      className="h-6 px-1.5 text-[10px]">
                      <XCircle className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ────────────── Page ────────────── */

export default function DemandWeeklyPage() {
  const { tenant } = useTenant();
  const scale = tenantScales[tenant] || 1;
  const cutoff = useCutoffCountdown(18, 0);

  const [persona, setPersonaState] = useState<Persona>(() => loadPersona());
  const setPersona = (p: Persona) => { setPersonaState(p); savePersona(p); };
  const [importerOpen, setImporterOpen] = useState(false);
  const [phasingOpen, setPhasingOpen] = useState(false);
  const { current: planCycle } = usePlanningPeriod();

  // M19 GAP 1 — FC tháng tổng (scale theo tenant)
  const monthlyFcTotal = useMemo(
    () => Math.round(DEMAND_FC.reduce((s, r) => s + r.fcM2, 0) * scale),
    [scale],
  );

  const cnConfigs = useMemo(buildCnConfigs, []);

  /* Build initial flat row list (12 CN × 4 SKUs = 48 rows). */
  const initialRows = useMemo<SkuRow[]>(() => {
    const out: SkuRow[] = [];
    BRANCHES.forEach((b) => {
      const seeds = CN_SKUS[b.code] ?? [];
      seeds.forEach((s) => {
        const duKien = Math.round(s.duKien * scale);
        const adjust = s.preAdjust ? Math.round(s.preAdjust * scale) : 0;
        out.push({
          cnCode: b.code,
          key: `${b.code}-${s.item}-${s.variant}`,
          item: s.item,
          variant: s.variant,
          duKien,
          adjust,
          reason: (s.preReason as Reason) ?? "",
          reasonOther: "",
          submitted: false,
        });
      });
    });
    return out;
  }, [scale]);

  const [rows, setRows] = useState<SkuRow[]>(initialRows);
  // Reset rows when scale changes (tenant switch).
  useEffect(() => { setRows(initialRows); }, [initialRows]);

  const [cnCode, setCnCode] = useState<string>("CN-HN");

  const [overrideTarget, setOverrideTarget] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  /* ── Mutators ── */
  const updateRow = (key: string, patch: Partial<SkuRow>) => {
    setRows((all) => all.map((r) => r.key === key ? { ...r, ...patch } : r));
  };

  const submitCn = () => {
    const cnRows = rows.filter((r) => r.cnCode === cnCode && r.adjust !== 0);
    if (cnRows.length === 0) return;
    // Validation: every adjusted row needs a reason.
    const missingReason = cnRows.find((r) => !r.reason);
    if (missingReason) {
      toast.error(`Thiếu lý do cho ${missingReason.item} ${missingReason.variant}`);
      return;
    }
    setRows((all) => all.map((r) =>
      r.cnCode === cnCode && r.adjust !== 0 ? { ...r, submitted: true } : r,
    ));
    const cfg = cnConfigs[cnCode];
    if (cfg?.autoApprove) {
      toast.success(`Đã gửi ${cnRows.length} mã hàng cho ${cnCode}.`, {
        description: `Trust ${cfg.trustPct}% ≥ 85% → Tự duyệt.`,
      });
    } else {
      toast.success(`Đã gửi ${cnRows.length} mã hàng cho ${cnCode}.`, {
        description: "Đang chờ SC Manager duyệt.",
      });
    }
  };

  const approveCn = (cn: string) => {
    setRows((all) => all.map((r) =>
      r.cnCode === cn && r.adjust !== 0 && r.decision === undefined
        ? { ...r, decision: "approved" } : r,
    ));
    toast.success(`Đã duyệt toàn bộ điều chỉnh ${cn}`);
  };
  const rejectCn = (cn: string) => {
    setRows((all) => all.map((r) =>
      r.cnCode === cn && r.adjust !== 0 && r.decision === undefined
        ? { ...r, decision: "rejected" } : r,
    ));
    toast(`Đã từ chối điều chỉnh ${cn}`);
  };

  const approveRow = (key: string) => {
    updateRow(key, { decision: "approved" });
    toast.success("Đã duyệt 1 SKU");
  };
  const rejectRow = (key: string) => {
    updateRow(key, { decision: "rejected" });
    toast("Đã từ chối 1 SKU");
  };
  const trimRow = (key: string) => {
    setRows((all) => all.map((r) => {
      if (r.key !== key) return r;
      const trimmed = Math.round(r.duKien * 0.3) * (r.adjust > 0 ? 1 : -1);
      return { ...r, adjust: trimmed, decision: "trimmed" };
    }));
    toast.success("Đã cắt còn ±30% dự kiến");
  };
  const openOverride = (key: string) => {
    setOverrideTarget(key);
    setOverrideReason("");
  };
  const submitOverride = () => {
    if (!overrideTarget) return;
    if (overrideReason.trim().length < 6) {
      toast.error("Vui lòng nhập lý do (≥ 6 ký tự).");
      return;
    }
    updateRow(overrideTarget, { decision: "override" });
    toast.success("Override đã ghi nhận", {
      description: `Lý do: ${overrideReason}. Audit logged.`,
    });
    setOverrideTarget(null);
    setOverrideReason("");
  };

  const approveAllInBand = () => {
    let count = 0;
    setRows((all) => all.map((r) => {
      if (r.adjust === 0 || r.decision !== undefined) return r;
      const cfg = cnConfigs[r.cnCode];
      const sev = classifyRow(r, cfg);
      if (sev === "pending") {
        count++;
        return { ...r, decision: "approved" };
      }
      return r;
    }));
    if (count > 0) {
      toast.success(`Đã duyệt ${count} SKU trong biên`);
    } else {
      toast("Không có SKU nào trong biên cần duyệt");
    }
  };

  /* ── Derived ── */
  const cnRows = useMemo(
    () => rows.filter((r) => r.cnCode === cnCode),
    [rows, cnCode],
  );

  const scRows = useMemo(
    () => buildScRows(rows, cnConfigs),
    [rows, cnConfigs],
  );

  const cutoffLabel = cutoff.closed
    ? "🔒 Đã đóng nhập"
    : cutoff.hoursLeft > 0
      ? `⏳ Cutoff 18:00 — còn ${cutoff.hoursLeft}h ${cutoff.minutesLeft}m`
      : `⏳ Cutoff 18:00 — còn ${cutoff.minutesLeft}m`;

  const ADJUST_SOURCES: DataSource[] = [
    {
      key: "excel_upload",
      icon: <FileSpreadsheet />,
      title: "Upload Excel điều chỉnh",
      description: "CN Manager upload file điều chỉnh per SKU theo template. Cột: SKU, Adjust, Lý do.",
    },
    {
      key: "manual_input",
      icon: <PenLine />,
      title: "Nhập tay per SKU",
      description: "Nhập điều chỉnh trực tiếp trên bảng. Phù hợp khi ít SKU cần sửa.",
      badge: "Khuyến nghị",
      badgeColor: "green",
    },
  ];

  return (
    <AppLayout>
      <ScreenHeader
        title="Nhu cầu tuần — Tuần 20"
        subtitle="CN điều chỉnh dự báo tuần · SC Manager duyệt theo biên trust"
        actions={
          <div className="flex items-center gap-2">
            {/* Persona toggle */}
            <div className="inline-flex rounded-button border border-surface-3 bg-surface-1 p-0.5">
              <button
                onClick={() => setPersona("cn")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-button px-3 py-1.5 text-table-sm font-medium transition-all",
                  persona === "cn"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-text-2 hover:text-text-1",
                )}
              >
                <User className="h-3.5 w-3.5" /> CN Manager
              </button>
              <button
                onClick={() => setPersona("sc")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-button px-3 py-1.5 text-table-sm font-medium transition-all",
                  persona === "sc"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-text-2 hover:text-text-1",
                )}
              >
                <Building2 className="h-3.5 w-3.5" /> SC Manager
              </button>
            </div>
            {persona === "cn" && (
              <Button
                size="sm"
                onClick={() => setImporterOpen(true)}
                className="h-8 gap-1.5"
              >
                <Inbox className="h-3.5 w-3.5" />
                Nhập điều chỉnh
              </Button>
            )}
            <button
              type="button"
              onClick={() => setPhasingOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-button border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-table-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
              title="Phân bổ FC tháng → tuần"
            >
              <Calendar className="h-3.5 w-3.5" />
              Phân bổ FC tuần · {planCycle.label.replace("Tháng ", "T")}
            </button>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-1 px-2.5 py-1.5 text-table-sm text-text-2">
              <RefreshCw className="h-3.5 w-3.5 text-info" />
              Demand W20 v2 — 18:00 hôm nay
              <span className="inline-flex items-center gap-1 rounded-full bg-info-bg text-info px-1.5 py-0.5 text-[10px] font-medium">
                Locked
              </span>
            </span>
          </div>
        }
      />

      <PhasingDialog
        open={phasingOpen}
        onClose={() => setPhasingOpen(false)}
        monthlyFcM2={monthlyFcTotal}
        cycleLabel={planCycle.label}
      />

      <DataSourceSelector
        open={importerOpen}
        onClose={() => setImporterOpen(false)}
        title="Nhập điều chỉnh tuần"
        description="Chọn nguồn nhập điều chỉnh cho tuần này. Phù hợp CN Manager."
        sources={ADJUST_SOURCES}
        onSelect={(key) => {
          setImporterOpen(false);
          toast.success(key === "excel_upload" ? "Mở wizard Upload Excel (5 bước)" : "Nhập tay trên bảng SKU");
        }}
      />

      {/* Cutoff banner */}
      <div className={cn(
        "mb-4 rounded-card border px-4 py-2.5 flex flex-wrap items-center gap-2",
        cutoff.closed
          ? "border-danger/40 bg-danger-bg text-danger"
          : cutoff.hoursLeft < 1
            ? "border-warning/40 bg-warning-bg text-warning"
            : "border-info/30 bg-info-bg text-info",
      )}>
        {cutoff.closed
          ? <Lock className="h-4 w-4" />
          : <Clock className="h-4 w-4" />}
        <TermTooltip term="Cutoff">
          <span className="text-table-sm font-medium">{cutoffLabel}</span>
        </TermTooltip>
        {!cutoff.closed && (
          <span className="text-table-sm text-text-2 ml-2">
            Sau giờ này, mọi điều chỉnh phải qua SC Manager override.
          </span>
        )}
      </div>

      {/* Body — switch by persona */}
      {persona === "cn" ? (
        <CnManagerTab
          cnCode={cnCode}
          setCnCode={setCnCode}
          rows={cnRows}
          config={cnConfigs[cnCode]}
          closed={cutoff.closed}
          onChangeRow={updateRow}
          onSubmit={submitCn}
        />
      ) : (
        <ScManagerTab
          scRows={scRows}
          onApproveCn={approveCn}
          onRejectCn={rejectCn}
          onApproveRow={approveRow}
          onRejectRow={rejectRow}
          onTrimRow={trimRow}
          onOverrideRow={openOverride}
          onApproveAllInBand={approveAllInBand}
        />
      )}

      {/* Override-reason dialog (SC Manager) */}
      <Dialog open={overrideTarget !== null} onOpenChange={(open) => !open && setOverrideTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-warning" />
              Nhận điều chỉnh vượt biên
            </DialogTitle>
            <DialogDescription>
              SC Manager xác nhận chấp nhận điều chỉnh ngoài biên ±tolerance.
              Thao tác này được ghi vào audit log.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-caption text-text-2">Lý do (bắt buộc, ≥ 6 ký tự)</label>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={3}
              placeholder="VD: Khách VIP CN-BD — dự án 50.000m² mới ký hôm nay"
              className="w-full rounded-button border border-surface-3 bg-surface-1 px-3 py-2 text-table-sm outline-none focus:border-primary"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideTarget(null)}>Huỷ</Button>
            <Button onClick={submitOverride}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Xác nhận nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScreenFooter actionCount={6} />
    </AppLayout>
  );
}

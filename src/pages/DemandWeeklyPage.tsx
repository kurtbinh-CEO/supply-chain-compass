import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { useTenant } from "@/components/TenantContext";
import { useRbac } from "@/components/RbacContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ChevronRight, ChevronDown, Bell, Clock, Filter,
  AlertTriangle, ShieldAlert, CheckCircle2, Lock, Unlock,
} from "lucide-react";
import { ClickableNumber } from "@/components/ClickableNumber";
import { LogicLink } from "@/components/LogicLink";
import { LogicTooltip } from "@/components/LogicTooltip";
import { ViewPivotToggle, usePivotMode, CnGapBadge } from "@/components/ViewPivotToggle";
import { BatchLockBanner, useBatchLock } from "@/components/BatchLockBanner";
import { TermTooltip } from "@/components/TermTooltip";
import { BRANCHES, TRUST_BY_CN } from "@/data/unis-enterprise-dataset";

const tenantScales: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.7, "Mondelez": 1.35 };

/* ────────────────────────────────────────────────────────────────────────── */
/* CN trust → tolerance bands                                                */
/* Default ±30%. Trust < 60 → ±15% (low-trust band). Trust > 85 → auto-approve.
/* CN-PK is hand-clamped to 58% so the demo always has 1 low-trust branch.   */
/* ────────────────────────────────────────────────────────────────────────── */
const TRUST_OVERRIDES: Record<string, number> = { "CN-PK": 58 };

interface CnConfig {
  trustPct: number;
  tolerancePct: number;       // 15 | 30
  band: "low" | "normal" | "auto";
  autoApprove: boolean;
}

function buildCnConfigs(): Record<string, CnConfig> {
  const out: Record<string, CnConfig> = {};
  TRUST_BY_CN.forEach((row) => {
    const trust = TRUST_OVERRIDES[row.cnCode] ?? row.trustPct;
    let band: CnConfig["band"] = "normal";
    let tol = 30;
    if (trust < 60) { band = "low"; tol = 15; }
    else if (trust > 85) { band = "auto"; tol = 30; }
    out[row.cnCode] = { trustPct: trust, tolerancePct: tol, band, autoApprove: trust > 85 };
  });
  return out;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Demo seed data per CN — duKien (forecast) only; adjust starts editable    */
/* ────────────────────────────────────────────────────────────────────────── */
interface SkuRow { item: string; variant: string; duKien: number; po: number }
interface CnSeed { cn: string; duKien: number; po: number; skus: SkuRow[] }

const PER_CN_SEED: Record<string, { duKien: number; po: number }> = {
  "CN-HN":  { duKien: 1764, po: 500 },
  "CN-HP":  { duKien:  980, po: 280 },
  "CN-NA":  { duKien:  720, po: 180 },
  "CN-DN":  { duKien: 1512, po: 400 },
  "CN-QN":  { duKien:  640, po: 160 },
  "CN-NT":  { duKien:  840, po: 220 },
  "CN-BMT": { duKien:  520, po: 140 },
  "CN-PK":  { duKien:  460, po: 120 },
  "CN-BD":  { duKien: 2142, po: 757 },
  "CN-HCM": { duKien: 2580, po: 820 },
  "CN-CT":  { duKien: 1008, po: 300 },
  "CN-LA":  { duKien:  690, po: 200 },
};

function seedSkus(cnDuKien: number, cnPo: number): SkuRow[] {
  // Distribute across 4 typical SKUs to reuse the SKU-pivot table.
  const split = [0.32, 0.28, 0.18, 0.22];
  const skus = [
    { item: "GA-300", variant: "A4" },
    { item: "GA-300", variant: "B2" },
    { item: "GA-400", variant: "A4" },
    { item: "GA-600", variant: "A4" },
  ];
  return skus.map((s, i) => ({
    ...s,
    duKien: Math.round(cnDuKien * split[i]),
    po: Math.round(cnPo * split[i]),
  }));
}

const baseCnSeeds: CnSeed[] = BRANCHES.map((b) => {
  const seed = PER_CN_SEED[b.code] ?? { duKien: 600, po: 150 };
  return { cn: b.code, duKien: seed.duKien, po: seed.po, skus: seedSkus(seed.duKien, seed.po) };
});

/* ────────────────────────────────────────────────────────────────────────── */
/* Cutoff countdown (18:00 local)                                            */
/* ────────────────────────────────────────────────────────────────────────── */
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
  return { closed, hoursLeft: h, minutesLeft: m, label: closed ? "ĐÃ ĐÓNG" : `còn ${h}h ${m}m` };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Adjustment status helpers                                                 */
/* ────────────────────────────────────────────────────────────────────────── */
type AdjustStatus = "none" | "auto" | "pending" | "over" | "approved" | "rejected" | "override";

function classifyAdjust(deltaPct: number, tolerancePct: number, autoApprove: boolean): AdjustStatus {
  if (Math.abs(deltaPct) < 0.01) return "none";
  if (Math.abs(deltaPct) > tolerancePct) return "over";
  if (autoApprove) return "auto";
  return "pending";
}

const STATUS_META: Record<AdjustStatus, { label: string; color: string; bg: string }> = {
  none:     { label: "Chưa adjust",      color: "text-text-3",   bg: "bg-surface-2" },
  auto:     { label: "Tự duyệt ✅",      color: "text-success",  bg: "bg-success-bg" },
  pending:  { label: "Chờ duyệt",        color: "text-warning",  bg: "bg-warning-bg" },
  over:     { label: "Vượt biên ⚠",      color: "text-danger",   bg: "bg-danger-bg"  },
  approved: { label: "Đã duyệt ✅",      color: "text-success",  bg: "bg-success-bg" },
  rejected: { label: "Đã từ chối ❌",    color: "text-danger",   bg: "bg-danger-bg"  },
  override: { label: "Override khẩn cấp",color: "text-primary",  bg: "bg-info-bg"    },
};

export default function DemandWeeklyPage() {
  const { tenant } = useTenant();
  const { user } = useRbac();
  const s = tenantScales[tenant] || 1;
  const isScManager = user.role === "SC_MANAGER";

  const cnConfigs = useMemo(buildCnConfigs, []);
  const cutoff = useCutoffCountdown(18, 0);

  const [expandedCns, setExpandedCns] = useState<Set<string>>(new Set());
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());
  const [pivotMode, setPivotMode] = usePivotMode("demand-weekly");

  // Per-CN current adjustment in m² (raw, post-scale).
  const [adjustments, setAdjustments] = useState<Record<string, number>>({});
  const [statusOverrides, setStatusOverrides] = useState<Record<string, AdjustStatus>>({});
  const [overrideOpen, setOverrideOpen] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const dwBatch = useBatchLock({
    batchType: "DRP",
    status: "info",
    resultSummary: "DRP đêm qua 23:18. Demand cutoff 18:00.",
    startedAt: "23:18",
  });

  // Apply tenant scale + per-CN adjust on top of seeds.
  const data = baseCnSeeds.map((r) => {
    const duKien = Math.round(r.duKien * s);
    const po = Math.round(r.po * s);
    const adjustDelta = adjustments[r.cn] ?? 0;
    const config = cnConfigs[r.cn];
    const deltaPct = duKien > 0 ? (adjustDelta / duKien) * 100 : 0;
    const baseStatus = classifyAdjust(deltaPct, config?.tolerancePct ?? 30, config?.autoApprove ?? false);
    const status = statusOverrides[r.cn] ?? baseStatus;
    const final = duKien + adjustDelta + po; // simplified
    return {
      cn: r.cn,
      duKien,
      po,
      adjustDelta,
      deltaPct,
      status,
      final,
      config,
      skus: r.skus.map((sk) => ({
        ...sk,
        duKien: Math.round(sk.duKien * s),
        po: Math.round(sk.po * s),
        cnAdjust: null as number | null,
        adjustNote: "",
        adjustStatus: "none" as const,
        final: Math.round(sk.duKien * s) + Math.round(sk.po * s),
      })),
    };
  });

  const totalDuKien = data.reduce((a, r) => a + r.duKien, 0);
  const totalDelta  = data.reduce((a, r) => a + r.adjustDelta, 0);
  const totalPo     = data.reduce((a, r) => a + r.po, 0);
  const totalFinal  = data.reduce((a, r) => a + r.final, 0);
  const adjustedCn  = data.filter((r) => r.adjustDelta !== 0).length;
  const overCn      = data.filter((r) => r.status === "over").length;

  // SKU-first aggregation (kept for pivot view)
  const skuAgg = useMemo(() => {
    const map: Record<string, { item: string; variant: string; totalDuKien: number; totalAdjust: number; totalPo: number; totalFinal: number; cnRows: { cn: string; duKien: number; po: number; final: number; status: AdjustStatus }[] }> = {};
    data.forEach((cnRow) => {
      cnRow.skus.forEach((sk) => {
        const key = `${sk.item}-${sk.variant}`;
        if (!map[key]) map[key] = { item: sk.item, variant: sk.variant, totalDuKien: 0, totalAdjust: 0, totalPo: 0, totalFinal: 0, cnRows: [] };
        map[key].totalDuKien += sk.duKien;
        map[key].totalPo += sk.po;
        map[key].totalFinal += sk.final;
        map[key].cnRows.push({ cn: cnRow.cn, duKien: sk.duKien, po: sk.po, final: sk.final, status: cnRow.status });
      });
    });
    return Object.values(map).sort((a, b) => b.totalFinal - a.totalFinal);
  }, [data]);

  /* ─── Handlers ─── */
  const setAdjust = (cnCode: string, raw: string) => {
    if (cutoff.closed && !isScManager) {
      toast.error("Đã quá cutoff 18:00 — chỉ SC Manager có thể override.");
      return;
    }
    const v = raw === "" || raw === "-" ? 0 : parseInt(raw, 10);
    if (isNaN(v)) return;
    setAdjustments((s) => ({ ...s, [cnCode]: v }));
    setStatusOverrides((s) => {
      const next = { ...s };
      delete next[cnCode]; // re-derive from delta
      return next;
    });
  };

  const handleApprove = (cnCode: string) => {
    setStatusOverrides((s) => ({ ...s, [cnCode]: "approved" }));
    toast.success(`Đã duyệt điều chỉnh cho ${cnCode}`);
  };
  const handleReject = (cnCode: string) => {
    setStatusOverrides((s) => ({ ...s, [cnCode]: "rejected" }));
    setAdjustments((a) => ({ ...a, [cnCode]: 0 }));
    toast(`Đã từ chối điều chỉnh ${cnCode}`);
  };
  const submitOverride = () => {
    if (!overrideOpen) return;
    if (overrideReason.trim().length < 6) {
      toast.error("Vui lòng nhập lý do override (≥ 6 ký tự).");
      return;
    }
    setStatusOverrides((s) => ({ ...s, [overrideOpen]: "override" }));
    toast.success(`Override khẩn cấp ghi nhận cho ${overrideOpen}`, {
      description: `Lý do: ${overrideReason}. Audit logged.`,
    });
    setOverrideOpen(null);
    setOverrideReason("");
  };

  return (
    <AppLayout>
      <ScreenHeader title="Nhu cầu tuần" subtitle="Điều chỉnh nhu cầu CN — 12 chi nhánh" />

      {/* Batch info banner */}
      {dwBatch.batch && (
        <div className="mb-4">
          <BatchLockBanner
            batch={dwBatch.batch}
            dismissed={dwBatch.dismissed}
            onDismiss={dwBatch.dismiss}
            showQueue={dwBatch.showQueue}
            onToggleQueue={() => dwBatch.setShowQueue(!dwBatch.showQueue)}
          />
        </div>
      )}

      {/* Header strip — cutoff countdown + filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-full border px-3 py-1 text-table-sm font-medium",
            cutoff.closed
              ? "border-danger bg-danger-bg text-danger"
              : cutoff.hoursLeft < 1
              ? "border-warning bg-warning-bg text-warning"
              : "border-info-fg bg-info-bg text-primary"
          )}
        >
          {cutoff.closed ? <Lock className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          <TermTooltip term="Cutoff">
            <span>
              Đóng nhập 18:00 — {cutoff.label}
              {cutoff.closed && !isScManager && " (chỉ SC Manager override)"}
            </span>
          </TermTooltip>
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-surface-3 bg-surface-1 px-3 py-1 text-table-sm text-text-2">
          <TermTooltip term="Tolerance" />
          <span>Biên mặc định ±30% · Uy tín thấp ±15%</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-surface-3 bg-surface-1 px-3 py-1 text-table-sm text-text-2">
          {adjustedCn}/{data.length} CN đã điều chỉnh
          {overCn > 0 && <span className="ml-1 text-danger font-semibold">· {overCn} vượt biên</span>}
        </span>
        <button className="ml-auto flex items-center gap-1.5 rounded-full border border-surface-3 bg-surface-2 px-3 py-1 text-table-sm text-text-2 hover:bg-surface-1">
          <Filter className="h-3.5 w-3.5" /> CN: Tất cả ▼
        </button>
      </div>

      {/* Pivot toggle */}
      <div className="flex items-center gap-3 mb-4">
        <ViewPivotToggle value={pivotMode} onChange={(m) => { setPivotMode(m); setExpandedCns(new Set()); setExpandedSkus(new Set()); }} />
      </div>

      {pivotMode === "sku" ? (
        /* ═══ SKU-FIRST — kept simple, reuses old layout ═══ */
        <div className="rounded-card border border-surface-3 bg-surface-2 animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["", "Item", "Variant", "Dự kiến total", "Total PO", "Final total", "# CN"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skuAgg.map((sk) => {
                  const key = `${sk.item}-${sk.variant}`;
                  const isExpanded = expandedSkus.has(key);
                  return (
                    <>
                      <tr
                        key={key}
                        className={cn("border-b border-surface-3/50 hover:bg-surface-1/30 cursor-pointer", isExpanded && "bg-primary/5")}
                        onClick={() => setExpandedSkus((prev) => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; })}
                      >
                        <td className="px-4 py-3 text-text-3 w-8">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                        <td className="px-4 py-3 text-table font-medium text-text-1">{sk.item}</td>
                        <td className="px-4 py-3 text-table text-text-2">{sk.variant}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-2">{sk.totalDuKien.toLocaleString()}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-2">{sk.totalPo.toLocaleString()}</td>
                        <td className="px-4 py-3 text-table tabular-nums font-semibold text-text-1">{sk.totalFinal.toLocaleString()}</td>
                        <td className="px-4 py-3"><CnGapBadge count={sk.cnRows.length} /></td>
                      </tr>
                      {isExpanded && sk.cnRows.map((c) => (
                        <tr key={`${key}-${c.cn}`} className="border-b border-surface-3/30 bg-surface-0 animate-fade-in">
                          <td className="px-4 py-2" />
                          <td colSpan={2} className="px-4 py-2 text-table text-text-2 pl-8">↳ {c.cn}</td>
                          <td className="px-4 py-2 text-table tabular-nums text-text-3">{c.duKien.toLocaleString()}</td>
                          <td className="px-4 py-2 text-table tabular-nums text-text-3">{c.po.toLocaleString()}</td>
                          <td className="px-4 py-2 text-table tabular-nums text-text-2">{c.final.toLocaleString()}</td>
                          <td className="px-4 py-2 text-table text-text-3">{STATUS_META[c.status].label}</td>
                        </tr>
                      ))}
                    </>
                  );
                })}
                <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                  <td />
                  <td className="px-4 py-3 text-table text-text-1" colSpan={2}>TOTAL</td>
                  <td className="px-4 py-3 text-table tabular-nums">{skuAgg.reduce((a, s) => a + s.totalDuKien, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-table tabular-nums">{skuAgg.reduce((a, s) => a + s.totalPo, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-table tabular-nums">{skuAgg.reduce((a, s) => a + s.totalFinal, 0).toLocaleString()}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ═══ CN-FIRST with full tolerance enforcement ═══ */
        <div className="rounded-card border border-surface-3 bg-surface-2 animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  <th className="w-8 px-3 py-2.5"></th>
                  <th className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">CN</th>
                  <th className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">
                    <span className="flex items-center gap-1">
                      <TermTooltip term="TrustScore">Uy tín</TermTooltip>
                    </span>
                  </th>
                  <th className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">
                    <span className="flex items-center gap-1">
                      <TermTooltip term="Tolerance">Biên</TermTooltip>
                    </span>
                  </th>
                  <th className="px-4 py-2.5 text-right text-table-header uppercase text-text-3">Dự kiến (m²)</th>
                  <th className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">
                    CN điều chỉnh <LogicLink tab="daily" node={1} tooltip="Logic CN điều chỉnh & tolerance" />
                  </th>
                  <th className="px-4 py-2.5 text-right text-table-header uppercase text-text-3">PO xác nhận</th>
                  <th className="px-4 py-2.5 text-right text-table-header uppercase text-text-3">Final</th>
                  <th className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">Trạng thái / Hành động</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => {
                  const isExpanded = expandedCns.has(r.cn);
                  const config = r.config;
                  const trust = config?.trustPct ?? 75;
                  const tol = config?.tolerancePct ?? 30;
                  const meta = STATUS_META[r.status];
                  const branch = BRANCHES.find((b) => b.code === r.cn);
                  const inputDisabled = (cutoff.closed && !isScManager) || r.status === "rejected";
                  const isOver = r.status === "over";
                  const adjustZeroWarning = r.adjustDelta === 0 && r.status === "rejected";

                  return (
                    <>
                      <tr
                        key={r.cn}
                        className={cn(
                          "border-b border-surface-3/50 hover:bg-surface-1/30 cursor-pointer transition-colors",
                          isExpanded && "bg-primary/5",
                          isOver && "bg-danger-bg/30"
                        )}
                        onClick={() => setExpandedCns((prev) => { const next = new Set(prev); next.has(r.cn) ? next.delete(r.cn) : next.add(r.cn); return next; })}
                      >
                        <td className="px-3 py-3 text-text-3">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                        <td className="px-4 py-3">
                          <p className="text-table font-medium text-text-1">{r.cn}</p>
                          <p className="text-caption text-text-3">{branch?.name ?? ""}</p>
                        </td>
                        <td className="px-4 py-3 text-table">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-semibold",
                              trust < 60
                                ? "bg-danger-bg text-danger border-danger/30"
                                : trust > 85
                                ? "bg-success-bg text-success border-success/30"
                                : "bg-surface-1 text-text-2 border-surface-3"
                            )}
                          >
                            {trust}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-table">
                          <span className={cn("font-mono", config?.band === "low" ? "text-danger font-semibold" : "text-text-2")}>
                            ±{tol}%
                          </span>
                          {config?.autoApprove && (
                            <span className="ml-1 inline-flex items-center rounded-full bg-success-bg text-success border border-success/30 px-1.5 py-0.5 text-caption font-semibold">
                              Tự duyệt
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-table tabular-nums text-text-2">{r.duKien.toLocaleString()}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={adjustments[r.cn] ?? ""}
                              placeholder="0"
                              disabled={inputDisabled}
                              onChange={(e) => setAdjust(r.cn, e.target.value)}
                              className={cn(
                                "w-24 rounded-button border px-2 py-1 text-table tabular-nums outline-none transition-colors",
                                isOver
                                  ? "border-danger bg-danger-bg/40 text-danger font-semibold focus:border-danger"
                                  : "border-surface-3 bg-surface-0 text-text-1 focus:border-primary",
                                inputDisabled && "opacity-60 cursor-not-allowed"
                              )}
                            />
                            <span
                              className={cn(
                                "text-caption tabular-nums",
                                Math.abs(r.deltaPct) > tol ? "text-danger font-semibold" : "text-text-3"
                              )}
                            >
                              {r.adjustDelta !== 0 ? `${r.deltaPct > 0 ? "+" : ""}${r.deltaPct.toFixed(1)}%` : ""}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-table tabular-nums text-text-2">{r.po.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-table tabular-nums font-semibold text-text-1">
                          <ClickableNumber
                            value={r.final}
                            label={`Final ${r.cn}`}
                            color="font-semibold text-text-1"
                            formula={`Dự kiến ${r.duKien.toLocaleString()} + adjust ${r.adjustDelta >= 0 ? "+" : ""}${r.adjustDelta} + PO ${r.po.toLocaleString()} = ${r.final.toLocaleString()}`}
                          />
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-semibold border-current", meta.color, meta.bg)}>
                              {meta.label}
                            </span>
                            {r.status === "pending" && isScManager && (
                              <>
                                <button onClick={() => handleApprove(r.cn)} className="rounded-button bg-success/10 text-success px-2 py-1 text-caption font-medium hover:bg-success/20">Duyệt</button>
                                <button onClick={() => handleReject(r.cn)} className="rounded-button bg-danger-bg text-danger px-2 py-1 text-caption font-medium hover:bg-danger/20">Từ chối</button>
                              </>
                            )}
                            {(r.status === "over" || (cutoff.closed && r.status !== "approved")) && isScManager && (
                              <button
                                onClick={() => { setOverrideOpen(r.cn); setOverrideReason(""); }}
                                className="rounded-button border border-primary text-primary bg-info-bg px-2 py-1 text-caption font-semibold hover:bg-primary/10 inline-flex items-center gap-1"
                              >
                                <Unlock className="h-3 w-3" /> Override khẩn cấp
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Inline warnings band */}
                      {(isOver || config?.band === "low" || adjustZeroWarning) && (
                        <tr className="bg-surface-0/60">
                          <td />
                          <td colSpan={8} className="px-4 py-2 space-y-1">
                            {isOver && (
                              <div className="flex items-center gap-2 text-caption text-danger">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                  Vượt biên ±{tol}% (hiện {Math.abs(r.deltaPct).toFixed(1)}%). SC Manager phải duyệt hoặc dùng <span className="font-semibold">Override khẩn cấp</span>.
                                </span>
                              </div>
                            )}
                            {config?.band === "low" && (
                              <div className="flex items-center gap-2 text-caption text-warning">
                                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                  Uy tín thấp ({trust}%) — biên giảm còn ±15%. CN cần cải thiện độ chính xác để mở lại biên ±30%.
                                </span>
                              </div>
                            )}
                            {r.adjustDelta === 0 && r.status === "none" && (
                              <div className="flex items-center gap-2 text-caption text-text-3 italic">
                                <span>Nhu cầu = 0. Nếu có bán thực tế, điểm uy tín CN sẽ giảm.</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}

                      {/* Expanded SKU rows */}
                      {isExpanded && r.skus.map((sk, si) => (
                        <tr key={`${r.cn}-${si}`} className="border-b border-surface-3/30 bg-surface-0 animate-fade-in">
                          <td className="px-3 py-2" />
                          <td colSpan={3} className="px-4 py-2 text-table text-text-2 pl-6">↳ {sk.item} {sk.variant}</td>
                          <td className="px-4 py-2 text-right text-table tabular-nums text-text-3">{sk.duKien.toLocaleString()}</td>
                          <td className="px-4 py-2 text-table text-text-3">—</td>
                          <td className="px-4 py-2 text-right text-table tabular-nums text-text-3">{sk.po > 0 ? sk.po.toLocaleString() : "—"}</td>
                          <td className="px-4 py-2 text-right text-table tabular-nums text-text-2">{sk.final.toLocaleString()}</td>
                          <td className="px-4 py-2" />
                        </tr>
                      ))}
                    </>
                  );
                })}

                <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                  <td />
                  <td className="px-4 py-3 text-table text-text-1" colSpan={3}>TOTAL · {data.length} CN</td>
                  <td className="px-4 py-3 text-right text-table tabular-nums">{totalDuKien.toLocaleString()}</td>
                  <td className="px-4 py-3 text-table">
                    <span className={cn("font-semibold", totalDelta > 0 ? "text-success" : totalDelta < 0 ? "text-danger" : "text-text-3")}>
                      {totalDelta >= 0 ? "+" : ""}{totalDelta.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-table tabular-nums text-text-2">{totalPo.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-table tabular-nums text-text-1">{totalFinal.toLocaleString()}</td>
                  <td className="px-4 py-3 text-table text-text-2">{adjustedCn}/{data.length} CN done</td>
                </tr>
              </tbody>
            </table>
          </div>

          {adjustedCn < data.length && (
            <div className="px-5 py-3 border-t border-surface-3">
              <button
                onClick={() => toast.success("Đã nhắc CN chưa adjust", { description: "Notification gửi tới CN Manager qua Zalo." })}
                className="flex items-center gap-1.5 rounded-button border border-warning text-warning px-3 py-1.5 text-table-sm font-medium hover:bg-warning/10"
              >
                <Bell className="h-3.5 w-3.5" /> Nhắc CN chưa adjust ({data.length - adjustedCn})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Override modal */}
      {overrideOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setOverrideOpen(null)}
        >
          <div
            className="rounded-card border border-surface-3 bg-surface-0 w-full max-w-md p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Unlock className="h-4 w-4 text-primary" />
              <p className="text-body font-semibold text-text-1">Override khẩn cấp — {overrideOpen}</p>
            </div>
            <p className="text-caption text-text-3">
              SC Manager cho phép đặt điều chỉnh ngoài biên hoặc sau cutoff 18:00. Thao tác này sẽ
              được ghi vào audit log và gửi notification cho CEO.
            </p>
            <div className="space-y-2">
              <label className="text-caption text-text-2">Lý do override (bắt buộc, ≥ 6 ký tự)</label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
                placeholder="VD: Khách hàng VIP huỷ đơn đột xuất, cần điều chỉnh -45% gấp."
                className="w-full rounded-button border border-surface-3 bg-surface-1 px-3 py-2 text-table-sm text-text-1 outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setOverrideOpen(null)}
                className="rounded-button border border-surface-3 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-1"
              >
                Huỷ
              </button>
              <button
                onClick={submitOverride}
                className="rounded-button bg-gradient-primary text-primary-foreground px-3 py-1.5 text-table-sm font-medium inline-flex items-center gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Xác nhận override
              </button>
            </div>
          </div>
        </div>
      )}

      <ScreenFooter actionCount={7} />
    </AppLayout>
  );
}

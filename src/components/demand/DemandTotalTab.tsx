import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Info, TrendingUp, TrendingDown, Minus, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { LogicTooltip } from "@/components/LogicTooltip";
import { ClickableNumber } from "@/components/ClickableNumber";
import { toast } from "sonner";
import { ViewPivotToggle, usePivotMode, CnGapBadge } from "@/components/ViewPivotToggle";
import type { DemandCnSummary } from "@/hooks/useDemandForecasts";
import { BRANCHES, DEMAND_FC, SKU_BASES, SKU_VARIANTS } from "@/data/unis-enterprise-dataset";
import { FcSourceBadge } from "@/components/demand/FcSourceBadge";

/* ────────────────────────────────────────────────────────────────────── */
/* FC version selector — v3 = SC Manager-adjusted (canonical)            */
/* ────────────────────────────────────────────────────────────────────── */
type FcVersion = "v0" | "v1" | "v2" | "v3";
const FC_VERSIONS: { key: FcVersion; label: string; desc: string }[] = [
  { key: "v0", label: "v0 — Statistical baseline", desc: "AI baseline (XGB / Holt-Winters)" },
  { key: "v1", label: "v1 — CN adjusted",          desc: "Sau khi CN điều chỉnh tuần" },
  { key: "v2", label: "v2 — Sales reviewed",       desc: "Sales review B2B + thị trường" },
  { key: "v3", label: "v3 — SC Manager đã điều chỉnh", desc: "Bản chốt sau S&OP / SC Manager" },
];

/* Deterministic per-CN accuracy (%) for v0 baseline vs v3 adjusted.    */
/* FVA = accuracy(v3) − accuracy(v0). Positive → adjustment improved.   */
const CN_FVA_TABLE: Record<string, { accV0: number; accV3: number }> = {
  "CN-HN":  { accV0: 78, accV3: 86 },  "CN-HP":  { accV0: 80, accV3: 84 },
  "CN-NA":  { accV0: 72, accV3: 75 },  "CN-DN":  { accV0: 81, accV3: 88 },
  "CN-QN":  { accV0: 76, accV3: 79 },  "CN-NT":  { accV0: 70, accV3: 68 }, // FVA<0
  "CN-BMT": { accV0: 74, accV3: 77 },  "CN-PK":  { accV0: 68, accV3: 65 }, // FVA<0
  "CN-BD":  { accV0: 82, accV3: 90 },  "CN-HCM": { accV0: 84, accV3: 91 },
  "CN-CT":  { accV0: 77, accV3: 81 },  "CN-LA":  { accV0: 75, accV3: 78 },
};

function cnFva(cn: string): { fva: number; accV0: number; accV3: number } | null {
  const row = CN_FVA_TABLE[cn];
  if (!row) return null;
  return { fva: row.accV3 - row.accV0, accV0: row.accV0, accV3: row.accV3 };
}

interface Props {
  tenant: string;
  b2bPerCn: Record<string, number>;
  cnSummaries?: DemandCnSummary[];
}

type View = "12m" | "3m" | "week";

const tenantScale: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.72, "Mondelez": 1.35 };

// Mock fallback data
const baseCnDataMock = [
  { cn: "CN-BD", fc: 1600, b2b: 680, po: 345, vsLm: 14, stock: 210 },
  { cn: "CN-ĐN", fc: 1150, b2b: 420, po: 280, vsLm: 7, stock: 840 },
  { cn: "CN-HN", fc: 1350, b2b: 520, po: 310, vsLm: -4, stock: 630 },
  { cn: "CN-CT", fc: 700, b2b: 380, po: 165, vsLm: -4, stock: 440 },
];

const skuPerCnMock: Record<string, { item: string; variant: string; fc: number; b2b: number; po: number; vsLm: number; source: string; mape: number }[]> = {
  "CN-BD": [
    { item: "GA-300", variant: "A4", fc: 580, b2b: 340, po: 155, vsLm: 8, source: "Holt-Winters", mape: 18.4 },
    { item: "GA-300", variant: "B2", fc: 120, b2b: 40, po: 20, vsLm: -3, source: "XGBoost", mape: 12.1 },
    { item: "GA-600", variant: "A4", fc: 620, b2b: 220, po: 130, vsLm: 15, source: "XGBoost", mape: 14.2 },
    { item: "GA-600", variant: "B2", fc: 280, b2b: 80, po: 40, vsLm: 22, source: "Holt-Winters", mape: 16.8 },
  ],
  "CN-ĐN": [
    { item: "GA-300", variant: "A4", fc: 420, b2b: 180, po: 110, vsLm: 5, source: "XGBoost", mape: 11.2 },
    { item: "GA-600", variant: "A4", fc: 480, b2b: 160, po: 120, vsLm: 9, source: "XGBoost", mape: 13.5 },
    { item: "GA-400", variant: "A4", fc: 250, b2b: 80, po: 50, vsLm: 4, source: "Holt-Winters", mape: 19.0 },
  ],
  "CN-HN": [
    { item: "GA-300", variant: "A4", fc: 500, b2b: 220, po: 130, vsLm: -2, source: "XGBoost", mape: 10.8 },
    { item: "GA-300", variant: "C1", fc: 280, b2b: 95, po: 55, vsLm: -6, source: "Holt-Winters", mape: 20.1 },
    { item: "GA-600", variant: "A4", fc: 380, b2b: 150, po: 90, vsLm: -3, source: "XGBoost", mape: 15.0 },
    { item: "GA-400", variant: "D5", fc: 190, b2b: 55, po: 35, vsLm: -8, source: "Holt-Winters", mape: 22.3 },
  ],
  "CN-CT": [
    { item: "GA-300", variant: "A4", fc: 300, b2b: 180, po: 75, vsLm: -2, source: "XGBoost", mape: 14.5 },
    { item: "GA-400", variant: "A4", fc: 250, b2b: 130, po: 55, vsLm: -5, source: "Holt-Winters", mape: 17.2 },
    { item: "GA-600", variant: "B2", fc: 150, b2b: 70, po: 35, vsLm: -7, source: "XGBoost", mape: 13.8 },
  ],
};

const months12 = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];
const base12m = [4200,3800,4100,7280,7650,7280,6620,5500,4800,5200,3800,3500];
const weekLabels = ["W16","W17","W18","W19"];
const weekWeights = [0.28, 0.25, 0.24, 0.23];

// ── Override Modal ──
function OverrideModal({ sku, value, onClose, onSave }: {
  sku: string; value: number; onClose: () => void;
  onSave: (v: number, reason: string) => void;
}) {
  const [newVal, setNewVal] = useState(value);
  const [reason, setReason] = useState("");
  return (
    <>
      <div className="fixed inset-0 bg-text-1/30 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 p-6 space-y-4 animate-fade-in">
        <h3 className="font-display text-section-header text-text-1">Override: {sku}</h3>
        <p className="text-table-sm text-text-3">Current: {value.toLocaleString()} m²</p>
        <div>
          <label className="text-table-header uppercase text-text-3 mb-1 block">New Quantity (m²)</label>
          <input type="number" value={newVal} onChange={e => setNewVal(Number(e.target.value))}
            className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary tabular-nums" />
        </div>
        <div>
          <label className="text-table-header uppercase text-text-3 mb-1 block">Reason</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Lý do điều chỉnh..."
            className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 rounded-button border border-surface-3 py-2 text-table text-text-2 hover:bg-surface-3">Hủy</button>
          <button onClick={() => { onSave(newVal, reason); toast.success(`Override ${sku}: ${newVal.toLocaleString()} m²`); }}
            className="flex-1 rounded-button bg-gradient-primary text-white py-2 text-table font-medium">Lưu</button>
        </div>
      </div>
    </>
  );
}

// ── Section Header ──
function SectionHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-primary" />
        <div>
          <h3 className="font-display text-body font-semibold text-text-1">{title}</h3>
          {subtitle && <p className="text-caption text-text-3">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Demand Composition Mini Bar ──
function CompositionBar({ fc, b2b, po, total }: { fc: number; b2b: number; po: number; total: number }) {
  if (total === 0) return null;
  const fcPct = (fc / total) * 100;
  const b2bPct = (b2b / total) * 100;
  const poPct = (po / total) * 100;
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-surface-3 w-full" title={`FC ${fcPct.toFixed(0)}% · B2B ${b2bPct.toFixed(0)}% · PO ${poPct.toFixed(0)}%`}>
      <div className="bg-primary/70 transition-all" style={{ width: `${fcPct}%` }} />
      <div className="bg-info/70 transition-all" style={{ width: `${b2bPct}%` }} />
      <div className="bg-warning/70 transition-all" style={{ width: `${poPct}%` }} />
    </div>
  );
}

// ── Mini Sparkline (pure SVG) ──
function MiniSparkline({ data, color = "var(--primary)", width = 56, height = 20 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const trend = data[data.length - 1] - data[0];
  const strokeColor = trend > 0 ? "hsl(var(--success))" : trend < 0 ? "hsl(var(--danger))" : "hsl(var(--text-3))";
  // Fill area
  const areaPoints = `0,${height} ${points.join(" ")} ${width},${height}`;
  return (
    <svg width={width} height={height} className="inline-block" viewBox={`0 0 ${width} ${height}`}>
      <polygon points={areaPoints} fill={strokeColor} fillOpacity={0.08} />
      <polyline points={points.join(" ")} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={String((data.length - 1) / (data.length - 1) * width)} cy={String(height - ((data[data.length - 1] - min) / range) * (height - 4) - 2)} r="2" fill={strokeColor} />
    </svg>
  );
}

// ── 3-month trend data per CN (T3, T4, T5) ──
const cnTrend3m: Record<string, number[]> = {
  "CN-BD": [5800, 6200, 7045],
  "CN-ĐN": [3600, 3900, 4130],
  "CN-HN": [7900, 8100, 7735],
  "CN-CT": [1300, 1280, 1245],
};

// ── Trend Icon ──
function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="h-3 w-3 text-success inline" />;
  if (value < 0) return <TrendingDown className="h-3 w-3 text-danger inline" />;
  return <Minus className="h-3 w-3 text-text-3 inline" />;
}

export function DemandTotalTab({ tenant, b2bPerCn, cnSummaries = [] }: Props) {
  const [view, setView] = useState<View>("12m");
  const [expandedCns, setExpandedCns] = useState<Set<string>>(new Set());
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());
  /** L3 — variants opened under a CN→SKU pair, keyed by `${cnCode}::${skuBase}`. */
  const [expandedCnSkus, setExpandedCnSkus] = useState<Set<string>>(new Set());
  /** L3 (SKU-first) — CN→variant breakdown opened under a SKU→CN pair. */
  const [expandedSkuCns, setExpandedSkuCns] = useState<Set<string>>(new Set());
  const [overrideModal, setOverrideModal] = useState<{ sku: string; value: number } | null>(null);
  const [pivotMode, setPivotMode] = usePivotMode("demand");
  const [fcVersion, setFcVersion] = useState<FcVersion>("v3");

  const s = tenantScale[tenant] || 1;

  // Per-version multiplier on top of v0 baseline (FC numbers).
  // Versions reflect successive review passes; v3 is the SC Manager-locked plan.
  const versionMult: Record<FcVersion, number> = { v0: 0.96, v1: 0.99, v2: 1.02, v3: 1.0 };
  const vMult = versionMult[fcVersion];

  const toggleCn = (cnKey: string) => {
    setExpandedCns(prev => {
      const next = new Set(prev);
      if (next.has(cnKey)) next.delete(cnKey); else next.add(cnKey);
      return next;
    });
  };

  const toggleSku = (skuKey: string) => {
    setExpandedSkus(prev => {
      const next = new Set(prev);
      if (next.has(skuKey)) next.delete(skuKey); else next.add(skuKey);
      return next;
    });
  };

  const toggleCnSku = (key: string) => {
    setExpandedCnSkus(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleSkuCn = (key: string) => {
    setExpandedSkuCns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  /** Variant split per SKU base. Phú Mỹ bases ship only A4+B2 (see dataset). */
  const variantSplit = (baseCode: string): Array<{ tag: "A4" | "B2" | "C1"; share: number }> => {
    const variants = SKU_VARIANTS.filter(v => v.baseCode === baseCode);
    if (variants.length === 2) return [{ tag: "A4", share: 0.62 }, { tag: "B2", share: 0.38 }];
    return [{ tag: "A4", share: 0.50 }, { tag: "B2", share: 0.30 }, { tag: "C1", share: 0.20 }];
  };

  /* ── Single source of truth: DEMAND_FC (12 CN × 15 SKU bases ≈ 47 000 m²) ── */
  const cnData = useMemo(() => {
    return BRANCHES.map((br) => {
      const fcRows = DEMAND_FC.filter((r) => r.cnCode === br.code);
      const fcRaw = fcRows.reduce((a, r) => a + r.fcM2, 0);
      const fc = Math.round(fcRaw * s * vMult);
      const b2b = b2bPerCn[br.code] ?? 0;
      // PO confirmed ≈ 22 % of FC (deterministic estimate per branch)
      const po = Math.round(fc * 0.22);
      const total = fc + b2b + po;
      const stock = Math.round(total * 0.45);
      const cover = total > 0 ? Math.round((stock / (total / 30)) * 10) / 10 : 0;
      // vsLM derived deterministically from CN trust hash → −8 .. +14
      const seed = br.code.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
      const vsLm = (seed % 23) - 8;
      return { cn: br.code, fc, b2b, po, total, stock, cover, vsLm, skus: [] as DemandCnSummary["skus"] };
    });
  }, [s, vMult, b2bPerCn]);

  // DB summaries (when present) are merged in only as overlay info — totals stay canonical.
  const useDbData = cnSummaries.length > 0;

  const totals = useMemo(() => ({
    fc: cnData.reduce((a, c) => a + c.fc, 0),
    b2b: cnData.reduce((a, c) => a + c.b2b, 0),
    po: cnData.reduce((a, c) => a + c.po, 0),
    total: cnData.reduce((a, c) => a + c.total, 0),
    vsLm: 4,
    cover: 8.5,
  }), [cnData]);

  /* ── skuPerCn built from DEMAND_FC ── */
  const skuPerCn = useMemo(() => {
    const result: Record<string, { item: string; variant: string; fc: number; b2b: number; po: number; vsLm: number; source: string; mape: number }[]> = {};
    BRANCHES.forEach((br) => {
      const rows = DEMAND_FC.filter((r) => r.cnCode === br.code);
      result[br.code] = rows
        .map((r) => {
          const base = SKU_BASES.find((b) => b.code === r.skuBaseCode);
          const fc = Math.round(r.fcM2 * s * vMult);
          const seed = (br.code + r.skuBaseCode).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
          const mape = 9 + (seed % 14); // 9–22 %
          const vsLm = ((seed % 19) - 7);
          return {
            item: r.skuBaseCode,
            variant: base?.name?.split(" ")[0] ?? "—",
            fc,
            b2b: Math.round(fc * 0.18),
            po: Math.round(fc * 0.22),
            vsLm,
            source: mape <= 14 ? "XGBoost" : "Holt-Winters",
            mape,
          };
        })
        .sort((a, b) => b.fc - a.fc)
        .slice(0, 6); // keep table compact
    });
    return result;
  }, [s, vMult]);

  // SKU-first aggregation
  const skuAggregated = useMemo(() => {
    const skuMap: Record<string, { item: string; variant: string; totalFc: number; totalB2b: number; totalPo: number; totalDemand: number;
      cnDetails: { cn: string; fc: number; b2b: number; po: number; total: number; vsLm: number; mape: number; source: string }[];
    }> = {};
    Object.entries(skuPerCn).forEach(([cnKey, skus]) => {
      skus.forEach(sk => {
        const key = `${sk.item}-${sk.variant}`;
        // skuPerCn already scaled by tenant `s` × FC version `vMult`.
        const fc = sk.fc;
        const b2b = sk.b2b;
        const po = sk.po;
        if (!skuMap[key]) {
          skuMap[key] = { item: sk.item, variant: sk.variant, totalFc: 0, totalB2b: 0, totalPo: 0, totalDemand: 0, cnDetails: [] };
        }
        skuMap[key].totalFc += fc;
        skuMap[key].totalB2b += b2b;
        skuMap[key].totalPo += po;
        skuMap[key].totalDemand += fc + b2b + po;
        skuMap[key].cnDetails.push({ cn: cnKey, fc, b2b, po, total: fc + b2b + po, vsLm: sk.vsLm, mape: sk.mape, source: sk.source });
      });
    });
    return Object.values(skuMap).sort((a, b) => b.totalDemand - a.totalDemand);
  }, [s, skuPerCn, useDbData]);
  // ═══════════════════════════════════════════
  // SECTION 1: KPI Summary Cards
  // ═══════════════════════════════════════════
  const renderKpiCards = () => {
    const fcShare = totals.total > 0 ? Math.round((totals.fc / totals.total) * 100) : 0;
    const b2bShare = totals.total > 0 ? Math.round((totals.b2b / totals.total) * 100) : 0;
    const poShare = totals.total > 0 ? Math.round((totals.po / totals.total) * 100) : 0;

    return (
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-card border border-primary/20 bg-primary/5 p-4">
          <p className="text-caption text-text-3 uppercase tracking-wide mb-1">Tổng Demand</p>
          <p className="font-display text-kpi-lg text-primary tabular-nums">{totals.total.toLocaleString()}</p>
          <p className="text-caption text-text-3 mt-1">m² · Tháng 5</p>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-2 p-4">
          <p className="text-caption text-text-3 uppercase tracking-wide mb-1">Forecast (FC)</p>
          <p className="font-display text-kpi-md text-text-1 tabular-nums">{totals.fc.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 w-12 rounded-full bg-primary/20"><div className="h-full rounded-full bg-primary" style={{ width: `${fcShare}%` }} /></div>
            <span className="text-caption text-text-3">{fcShare}%</span>
          </div>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-2 p-4">
          <p className="text-caption text-text-3 uppercase tracking-wide mb-1">B2B Weighted</p>
          <p className="font-display text-kpi-md text-text-1 tabular-nums">{totals.b2b.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 w-12 rounded-full bg-info/20"><div className="h-full rounded-full bg-info" style={{ width: `${b2bShare}%` }} /></div>
            <span className="text-caption text-text-3">{b2bShare}%</span>
          </div>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-2 p-4">
          <p className="text-caption text-text-3 uppercase tracking-wide mb-1">PO Confirmed</p>
          <p className="font-display text-kpi-md text-text-1 tabular-nums">{totals.po.toLocaleString()}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1.5 w-12 rounded-full bg-warning/20"><div className="h-full rounded-full bg-warning" style={{ width: `${poShare}%` }} /></div>
            <span className="text-caption text-text-3">{poShare}%</span>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════
  // SECTION 2: Summary Table (CN-first)
  // ═══════════════════════════════════════════
  const renderCnTable = () => (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
      <table className="w-full text-table-sm">
        <thead>
          <tr className="border-b border-surface-3 bg-surface-1/50">
            <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3 w-[36px]"></th>
            <th className="px-2 py-2.5 text-left text-table-header uppercase text-text-3 min-w-[90px]">Chi nhánh</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-primary">FC (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-info">B2B (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-warning">PO (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-1 font-semibold border-l border-surface-3">Total (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">Trend 3M</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">Cơ cấu</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">vs LM</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">Cover</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3" title="FVA = accuracy(điều chỉnh) − accuracy(v0)">FVA</th>
          </tr>
        </thead>
        <tbody>
          {cnData.map((c, i) => {
            const isExpanded = expandedCns.has(c.cn);
            const skus = (skuPerCn[c.cn] || []).map(sk => {
              // Already scaled by tenant + FC version inside skuPerCn useMemo.
              return { ...sk, total: sk.fc + sk.b2b + sk.po };
            });
            const shareOfTotal = totals.total > 0 ? Math.round((c.total / totals.total) * 100) : 0;
            return (
              <React.Fragment key={c.cn}>
                <tr
                  onClick={() => toggleCn(c.cn)}
                  className={cn(
                    "border-b border-surface-3/50 cursor-pointer transition-colors hover:bg-primary/5",
                    isExpanded ? "bg-primary/[0.03]" : i % 2 === 0 ? "bg-surface-0" : "bg-surface-2"
                  )}
                >
                  <td className="px-3 py-3 text-center">
                    <div className={cn("transition-transform duration-200 inline-block", isExpanded && "rotate-90")}>
                      <ChevronRight className="h-3.5 w-3.5 text-text-3" />
                    </div>
                  </td>
                  <td className="px-2 py-3 font-bold text-text-1">{c.cn}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-text-1">{c.fc.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-text-1">{c.b2b.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-text-2">{c.po.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center tabular-nums font-bold text-primary border-l border-surface-3">{c.total.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center" title={`T3→T5: ${(cnTrend3m[c.cn] || []).map(v => v.toLocaleString()).join(" → ")}`}>
                      <MiniSparkline data={cnTrend3m[c.cn] || [c.total * 0.9, c.total * 0.95, c.total]} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 justify-center">
                      <CompositionBar fc={c.fc} b2b={c.b2b} po={c.po} total={c.total} />
                      <span className="text-caption text-text-3 tabular-nums w-8 text-right">{shareOfTotal}%</span>
                    </div>
                  </td>
                  <td className={cn("px-3 py-3 text-center tabular-nums font-medium",
                    c.vsLm > 0 ? "text-success" : c.vsLm < 0 ? "text-danger" : "text-text-3"
                  )}>
                    <span className="inline-flex items-center gap-1">
                      <TrendIcon value={c.vsLm} /> {c.vsLm > 0 ? "+" : ""}{c.vsLm}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={cn("inline-flex items-center gap-1 tabular-nums font-medium px-2 py-0.5 rounded-full text-caption",
                      c.cover < 5 ? "text-danger bg-danger/10" : c.cover < 10 ? "text-warning bg-warning/10" : "text-success bg-success/10"
                    )}>
                      {c.cover}d
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {(() => {
                      const f = cnFva(c.cn);
                      if (!f) return <span className="text-text-3 text-caption">—</span>;
                      const positive = f.fva > 0;
                      const zero = f.fva === 0;
                      return (
                        <LogicTooltip
                          title={`FVA — ${c.cn}`}
                          content={`Accuracy v0 (baseline): ${f.accV0}%\nAccuracy ${fcVersion}: ${f.accV3}%\nFVA = ${f.accV3} − ${f.accV0} = ${f.fva > 0 ? "+" : ""}${f.fva} pp\n${positive ? "Điều chỉnh cải thiện độ chính xác." : zero ? "Điều chỉnh không thay đổi accuracy." : "Điều chỉnh làm tệ hơn — review lại."}`}
                        >
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-semibold cursor-help tabular-nums",
                              positive ? "bg-success/10 text-success border-success/30"
                                : zero ? "bg-surface-3 text-text-2 border-surface-3"
                                : "bg-danger/10 text-danger border-danger/30",
                            )}
                          >
                            {positive ? <CheckCircle2 className="h-3 w-3" /> : zero ? null : <AlertTriangle className="h-3 w-3" />}
                            {f.fva > 0 ? "+" : ""}{f.fva} pp
                          </span>
                        </LogicTooltip>
                      );
                    })()}
                  </td>
                </tr>

                {isExpanded && skus.map((sk) => {
                  const cnSkuKey = `${c.cn}::${sk.item}`;
                  const skuExpanded = expandedCnSkus.has(cnSkuKey);
                  const variants = variantSplit(sk.item);
                  return (
                    <React.Fragment key={`${c.cn}-${sk.item}-${sk.variant}`}>
                      <tr
                        onClick={() => toggleCnSku(cnSkuKey)}
                        className="border-b border-surface-3/30 bg-primary/[0.02] hover:bg-primary/[0.06] transition-colors animate-fade-in cursor-pointer"
                      >
                        <td className="px-3 py-2 text-center">
                          <div className={cn("transition-transform duration-200 inline-block", skuExpanded && "rotate-90")}>
                            <ChevronRight className="h-3 w-3 text-text-3" />
                          </div>
                        </td>
                        <td className="px-2 py-2 pl-6">
                          <span className="font-mono text-text-2 text-table-sm">{sk.item}</span>
                          <span className="ml-1 text-text-3 text-table-sm">{sk.variant}</span>
                          <span className="ml-1.5 text-[10px] text-text-3">({variants.length} variants)</span>
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums text-text-2 text-table-sm">
                          <span className="inline-flex items-center gap-1.5">
                            {sk.fc.toLocaleString()}
                            <LogicTooltip
                              title={`${sk.item} ${sk.variant} — FC Model`}
                              content={`Model: ${sk.source}\nHistory: 24 tháng (05/2024–04/2026)\nMAPE: ${sk.mape}% (accuracy ${(100 - sk.mape).toFixed(1)}%)\nAuto-selected: ${sk.source === "Holt-Winters" ? "HW" : "XGB"} vì MAPE thấp hơn cho SKU này.\nChạy: 01/05/2026 auto.`}
                            >
                              <span className={cn(
                                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-medium cursor-pointer",
                                sk.mape <= 15 ? "bg-success-bg text-success" : sk.mape <= 20 ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger"
                              )}>
                                {sk.source === "Holt-Winters" ? "HW" : "XGB"} {sk.mape}%
                              </span>
                            </LogicTooltip>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums text-text-2 text-table-sm">{sk.b2b.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-text-3 text-table-sm">{sk.po.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center tabular-nums font-semibold text-primary/80 text-table-sm border-l border-surface-3/50">{sk.total.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center">
                          <MiniSparkline data={[Math.round(sk.total * 0.88), Math.round(sk.total * 0.94), sk.total]} width={40} height={16} />
                        </td>
                        <td className="px-3 py-2">
                          <CompositionBar fc={sk.fc} b2b={sk.b2b} po={sk.po} total={sk.total} />
                        </td>
                        <td className={cn("px-3 py-2 text-center tabular-nums text-table-sm",
                          sk.vsLm > 0 ? "text-success" : sk.vsLm < 0 ? "text-danger" : "text-text-3"
                        )}>
                          {sk.vsLm > 0 ? "+" : ""}{sk.vsLm}%
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={(e) => { e.stopPropagation(); setOverrideModal({ sku: `${sk.item} ${sk.variant}`, value: sk.total }); }}
                            className="text-[11px] text-primary hover:underline font-medium">Ghi đè</button>
                        </td>
                        <td />
                      </tr>

                      {/* ── L3: Variant breakdown ── */}
                      {skuExpanded && variants.map((v) => {
                        const fcV = Math.round(sk.fc * v.share);
                        const b2bV = Math.round(sk.b2b * v.share);
                        const poV = Math.round(sk.po * v.share);
                        const totalV = fcV + b2bV + poV;
                        return (
                          <tr
                            key={`${cnSkuKey}-${v.tag}`}
                            className="border-b border-surface-3/20 bg-primary/[0.04] hover:bg-primary/[0.08] transition-colors animate-fade-in"
                          >
                            <td className="px-3 py-1.5" />
                            <td className="px-2 py-1.5 pl-12">
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-1 w-1 rounded-full bg-text-3" />
                                <span className="font-mono text-text-3 text-[11px]">{sk.item}-{v.tag}</span>
                                <span className="text-text-3 text-[10px]">({Math.round(v.share * 100)}%)</span>
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-center tabular-nums text-text-3 text-[11px]">{fcV.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums text-text-3 text-[11px]">{b2bV.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums text-text-3 text-[11px]">{poV.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums font-medium text-primary/70 text-[11px] border-l border-surface-3/30">{totalV.toLocaleString()}</td>
                            <td className="px-3 py-1.5" />
                            <td className="px-3 py-1.5">
                              <CompositionBar fc={fcV} b2b={b2bV} po={poV} total={totalV} />
                            </td>
                            <td className="px-3 py-1.5 text-center text-text-3 text-[10px]">—</td>
                            <td className="px-3 py-1.5 text-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOverrideModal({ sku: `${sk.item}-${v.tag}`, value: totalV }); }}
                                className="text-[10px] text-primary/70 hover:text-primary hover:underline"
                              >
                                Ghi đè
                              </button>
                            </td>
                            <td />
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
          <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
            <td />
            <td className="px-2 py-3 text-text-1">TỔNG</td>
            <td className="px-3 py-3 text-center tabular-nums text-text-1">{totals.fc.toLocaleString()}</td>
            <td className="px-3 py-3 text-center tabular-nums text-text-1">{totals.b2b.toLocaleString()}</td>
            <td className="px-3 py-3 text-center tabular-nums text-text-1">{totals.po.toLocaleString()}</td>
            <td className="px-3 py-3 text-center tabular-nums text-primary border-l border-surface-3">{totals.total.toLocaleString()}</td>
            <td className="px-3 py-3 text-center">
              <MiniSparkline data={[Math.round(totals.total * 0.91), Math.round(totals.total * 0.96), totals.total]} />
            </td>
            <td className="px-3 py-3">
              <CompositionBar fc={totals.fc} b2b={totals.b2b} po={totals.po} total={totals.total} />
            </td>
            <td className="px-3 py-3 text-center tabular-nums text-success">+{totals.vsLm}%</td>
            <td className="px-3 py-3 text-center tabular-nums text-text-1">{totals.cover}d</td>
            <td className="px-3 py-3 text-center text-text-3 text-caption">—</td>
          </tr>
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center gap-5 px-4 py-2 border-t border-surface-3/50 bg-surface-1/30">
        <span className="flex items-center gap-1.5 text-caption text-text-3">
          <span className="w-3 h-1.5 rounded-full bg-primary/70" /> FC — Forecast
        </span>
        <span className="flex items-center gap-1.5 text-caption text-text-3">
          <span className="w-3 h-1.5 rounded-full bg-info/70" /> B2B — Weighted deals
        </span>
        <span className="flex items-center gap-1.5 text-caption text-text-3">
          <span className="w-3 h-1.5 rounded-full bg-warning/70" /> PO — Confirmed orders
        </span>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════
  // SECTION 2: Summary Table (SKU-first)
  // ═══════════════════════════════════════════
  const renderSkuTable = () => (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
      <table className="w-full text-table-sm">
        <thead>
          <tr className="border-b border-surface-3 bg-surface-1/50">
            <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3 w-[36px]"></th>
            <th className="px-2 py-2.5 text-left text-table-header uppercase text-text-3">Item</th>
            <th className="px-2 py-2.5 text-left text-table-header uppercase text-text-3">Variant</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-primary">FC (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-info">B2B (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-warning">PO (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-1 font-semibold border-l border-surface-3">Total (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">Cơ cấu</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3"># CN</th>
          </tr>
        </thead>
        <tbody>
          {skuAggregated.map((sk, i) => {
            const skuKey = `${sk.item}-${sk.variant}`;
            const isExpanded = expandedSkus.has(skuKey);
            return (
              <React.Fragment key={skuKey}>
                <tr
                  onClick={() => toggleSku(skuKey)}
                  className={cn(
                    "border-b border-surface-3/50 cursor-pointer transition-colors hover:bg-primary/5",
                    isExpanded ? "bg-primary/[0.03]" : i % 2 === 0 ? "bg-surface-0" : "bg-surface-2"
                  )}
                >
                  <td className="px-3 py-3 text-center">
                    <div className={cn("transition-transform duration-200 inline-block", isExpanded && "rotate-90")}>
                      <ChevronRight className="h-3.5 w-3.5 text-text-3" />
                    </div>
                  </td>
                  <td className="px-2 py-3 font-medium text-text-1 font-mono">{sk.item}</td>
                  <td className="px-2 py-3 text-text-2">{sk.variant}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-text-1">{sk.totalFc.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-text-1">{sk.totalB2b.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-text-2">{sk.totalPo.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center tabular-nums font-bold text-primary border-l border-surface-3">{sk.totalDemand.toLocaleString()}</td>
                  <td className="px-3 py-3">
                    <CompositionBar fc={sk.totalFc} b2b={sk.totalB2b} po={sk.totalPo} total={sk.totalDemand} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <CnGapBadge count={sk.cnDetails.length} />
                  </td>
                </tr>

                {isExpanded && sk.cnDetails.map((c) => {
                  const skuCnKey = `${skuKey}::${c.cn}`;
                  const cnExpanded = expandedSkuCns.has(skuCnKey);
                  const variants = variantSplit(sk.item);
                  return (
                    <React.Fragment key={`${skuKey}-${c.cn}`}>
                      <tr
                        onClick={() => toggleSkuCn(skuCnKey)}
                        className="border-b border-surface-3/30 bg-primary/[0.02] hover:bg-primary/[0.06] transition-colors animate-fade-in cursor-pointer"
                      >
                        <td className="px-3 py-2 text-center">
                          <div className={cn("transition-transform duration-200 inline-block", cnExpanded && "rotate-90")}>
                            <ChevronRight className="h-3 w-3 text-text-3" />
                          </div>
                        </td>
                        <td className="px-2 py-2 pl-6 text-text-2 text-table-sm" colSpan={2}>
                          {c.cn}
                          <span className="ml-1.5 text-[10px] text-text-3">({variants.length} variants)</span>
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums text-text-2 text-table-sm">
                          <span className="cursor-help group relative">
                            {c.fc.toLocaleString()}
                            <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-text-1 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20">
                              {c.source}, MAPE {c.mape}%
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums text-text-2 text-table-sm">{c.b2b.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center tabular-nums text-text-3 text-table-sm">{c.po.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center tabular-nums font-semibold text-primary/80 text-table-sm border-l border-surface-3/50">{c.total.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <CompositionBar fc={c.fc} b2b={c.b2b} po={c.po} total={c.total} />
                        </td>
                        <td className={cn("px-3 py-2 text-center tabular-nums text-table-sm",
                          c.vsLm > 0 ? "text-success" : c.vsLm < 0 ? "text-danger" : "text-text-3"
                        )}>
                          {c.vsLm > 0 ? "+" : ""}{c.vsLm}%
                        </td>
                      </tr>

                      {/* ── L3: Variant breakdown for this SKU at this CN ── */}
                      {cnExpanded && variants.map((v) => {
                        const fcV = Math.round(c.fc * v.share);
                        const b2bV = Math.round(c.b2b * v.share);
                        const poV = Math.round(c.po * v.share);
                        const totalV = fcV + b2bV + poV;
                        return (
                          <tr
                            key={`${skuCnKey}-${v.tag}`}
                            className="border-b border-surface-3/20 bg-primary/[0.04] hover:bg-primary/[0.08] transition-colors animate-fade-in"
                          >
                            <td className="px-3 py-1.5" />
                            <td className="px-2 py-1.5 pl-12 text-table-sm" colSpan={2}>
                              <span className="inline-flex items-center gap-1.5">
                                <span className="h-1 w-1 rounded-full bg-text-3" />
                                <span className="font-mono text-text-3 text-[11px]">{sk.item}-{v.tag}</span>
                                <span className="text-text-3 text-[10px]">({Math.round(v.share * 100)}%)</span>
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-center tabular-nums text-text-3 text-[11px]">{fcV.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums text-text-3 text-[11px]">{b2bV.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums text-text-3 text-[11px]">{poV.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-center tabular-nums font-medium text-primary/70 text-[11px] border-l border-surface-3/30">{totalV.toLocaleString()}</td>
                            <td className="px-3 py-1.5">
                              <CompositionBar fc={fcV} b2b={b2bV} po={poV} total={totalV} />
                            </td>
                            <td className="px-3 py-1.5 text-center text-text-3 text-[10px]">—</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            );
          })}
          <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
            <td />
            <td className="px-2 py-3 text-text-1" colSpan={2}>TỔNG</td>
            <td className="px-3 py-3 text-center tabular-nums">{skuAggregated.reduce((a, s) => a + s.totalFc, 0).toLocaleString()}</td>
            <td className="px-3 py-3 text-center tabular-nums">{skuAggregated.reduce((a, s) => a + s.totalB2b, 0).toLocaleString()}</td>
            <td className="px-3 py-3 text-center tabular-nums">{skuAggregated.reduce((a, s) => a + s.totalPo, 0).toLocaleString()}</td>
            <td className="px-3 py-3 text-center tabular-nums text-primary border-l border-surface-3">{skuAggregated.reduce((a, s) => a + s.totalDemand, 0).toLocaleString()}</td>
            <td />
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );

  // ═══════════════════════════════════════════
  // SECTION 3: Timeline Tables (12m / 3m / week)
  // ═══════════════════════════════════════════
  const render12m = () => {
    const data12 = base12m.map(v => Math.round(v * s));
    return (
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-x-auto">
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1/50">
              <th className="sticky left-0 bg-surface-1/50 z-10 px-3 py-2.5 text-left text-table-header uppercase text-text-3 min-w-[80px]">CN</th>
              {months12.map((m, i) => (
                <th key={m} className={cn("px-2 py-2.5 text-center text-table-header uppercase min-w-[62px]",
                  i < 4 ? "text-text-3/60" : i === 4 ? "text-primary font-bold bg-primary/5" : "text-text-3"
                )}>
                  {m}
                  {i < 4 && <span className="block text-[9px] text-text-3/40 font-normal">Actual</span>}
                  {i === 4 && <span className="block text-[9px] text-primary/60 font-normal">Current</span>}
                </th>
              ))}
              <th className="px-2 py-2.5 text-center text-table-header uppercase text-text-1 bg-surface-1/80 min-w-[70px]">FY</th>
            </tr>
          </thead>
          <tbody>
            {cnData.map((c, i) => (
              <tr key={c.cn} className={cn("border-b border-surface-3/50", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                <td className="sticky left-0 bg-inherit z-10 px-3 py-2.5 font-medium text-text-1">{c.cn}</td>
                {data12.map((v, mi) => {
                  const cnShare = c.total / totals.total;
                  const val = Math.round(v * cnShare);
                  const isPast = mi < 4;
                  const isCurrent = mi === 4;
                  const fcPart = Math.round(val * 0.63);
                  const b2bPart = Math.round(val * 0.29);
                  const poPart = Math.round(val * 0.14);
                  const overlap = val - fcPart - b2bPart - poPart;
                  return (
                    <td key={mi} className={cn("px-2 py-2.5 text-center tabular-nums",
                      isCurrent ? "font-bold text-primary bg-primary/5" : isPast ? "text-text-3/60" : "text-text-2"
                    )}>
                      <ClickableNumber
                        value={val}
                        label={`${c.cn} ${months12[mi]}`}
                        color={isCurrent ? "font-bold text-primary" : isPast ? "text-text-3/60" : "text-text-2"}
                        breakdown={[
                          { label: "FC", value: fcPart },
                          { label: "B2B", value: b2bPart },
                          { label: "PO", value: poPart },
                          ...(overlap !== 0 ? [{ label: "Overlap", value: overlap, color: "text-danger" as const }] : []),
                        ]}
                        note={isPast ? `Actual · Locked ${months12[mi]}` : `S&OP forecast · 70% confidence`}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-2.5 text-center tabular-nums font-bold text-text-1 bg-surface-1/30">
                  {Math.round(data12.reduce((a, b) => a + b, 0) * (c.total / totals.total)).toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
              <td className="sticky left-0 bg-surface-1 z-10 px-3 py-2.5 text-text-1">TỔNG</td>
              {data12.map((v, i) => (
                <td key={i} className={cn("px-2 py-2.5 text-center tabular-nums",
                  i === 4 ? "text-primary" : "text-text-1"
                )}>{v.toLocaleString()}</td>
              ))}
              <td className="px-2 py-2.5 text-center tabular-nums text-primary bg-surface-1/30">
                {data12.reduce((a, b) => a + b, 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const render3m = () => {
    const m3 = ["Th5", "Th6", "Th7"];
    const m3Scale = [1, 0.95, 0.87];
    return (
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-x-auto">
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1/50">
              <th className="sticky left-0 bg-surface-1/50 z-10 px-3 py-2.5 text-left text-table-header uppercase text-text-3 min-w-[80px]">CN</th>
              {m3.map((m, mi) => (
                <React.Fragment key={m}>
                  <th className={cn("px-2 py-2.5 text-center text-table-header uppercase", mi === 0 ? "text-primary bg-primary/5" : "text-text-3")}>{m} FC</th>
                  <th className={cn("px-2 py-2.5 text-center text-table-header uppercase", mi === 0 ? "text-info bg-primary/5" : "text-text-3")}>{m} B2B</th>
                  <th className={cn("px-2 py-2.5 text-center text-table-header uppercase", mi === 0 ? "text-warning bg-primary/5" : "text-text-3")}>{m} PO</th>
                  <th className={cn("px-2 py-2.5 text-center text-table-header uppercase font-semibold border-r border-surface-3", mi === 0 ? "text-primary bg-primary/5" : "text-text-3")}>{m} Σ</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {cnData.map((c, i) => (
              <tr key={c.cn} className={cn("border-b border-surface-3/50", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                <td className="sticky left-0 bg-inherit z-10 px-3 py-2.5 font-medium text-text-1">{c.cn}</td>
                {m3Scale.map((sc, mi) => {
                  const fc = Math.round(c.fc * sc);
                  const b2b = Math.round(c.b2b * sc);
                  const po = Math.round(c.po * sc);
                  const isCur = mi === 0;
                  return (
                    <React.Fragment key={mi}>
                      <td className={cn("px-2 py-2.5 text-center tabular-nums", isCur ? "text-text-1" : "text-text-3")}>{fc.toLocaleString()}</td>
                      <td className={cn("px-2 py-2.5 text-center tabular-nums", isCur ? "text-text-1" : "text-text-3")}>{b2b.toLocaleString()}</td>
                      <td className={cn("px-2 py-2.5 text-center tabular-nums", isCur ? "text-text-1" : "text-text-3")}>{po.toLocaleString()}</td>
                      <td className={cn("px-2 py-2.5 text-center tabular-nums font-bold border-r border-surface-3", isCur ? "text-primary" : "text-text-2")}>{(fc+b2b+po).toLocaleString()}</td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
              <td className="sticky left-0 bg-surface-1 z-10 px-3 py-2.5 text-text-1">TỔNG</td>
              {m3Scale.map((sc, mi) => {
                const fc = Math.round(totals.fc * sc);
                const b2b = Math.round(totals.b2b * sc);
                const po = Math.round(totals.po * sc);
                return (
                  <React.Fragment key={mi}>
                    <td className="px-2 py-2.5 text-center tabular-nums text-text-1">{fc.toLocaleString()}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-text-1">{b2b.toLocaleString()}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-text-1">{po.toLocaleString()}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-primary border-r border-surface-3">{(fc+b2b+po).toLocaleString()}</td>
                  </React.Fragment>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderWeek = () => (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-x-auto">
      <table className="w-full text-table-sm">
        <thead>
          <tr className="border-b border-surface-3 bg-surface-1/50">
            <th className="sticky left-0 bg-surface-1/50 z-10 px-3 py-2.5 text-left text-table-header uppercase text-text-3 min-w-[80px]">CN</th>
            {weekLabels.map((w, i) => (
              <th key={w} className="px-2 py-2.5 text-center text-table-header uppercase text-primary bg-primary/5">
                {w} <span className="text-text-3 font-normal">({Math.round(weekWeights[i]*100)}%)</span>
              </th>
            ))}
            <th className="px-2 py-2.5 text-center text-table-header uppercase text-text-1 bg-surface-1/50">SS gap</th>
            <th className="px-2 py-2.5 text-center text-table-header uppercase text-text-1 bg-surface-1/50">vs S&OP</th>
          </tr>
        </thead>
        <tbody>
          {cnData.map((c, i) => {
            const weeks = weekWeights.map(w => Math.round(c.total * w));
            const ssGap = Math.round(c.stock - c.total * 0.45);
            return (
              <tr key={c.cn} className={cn("border-b border-surface-3/50", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                <td className="sticky left-0 bg-inherit z-10 px-3 py-2.5 font-medium text-text-1">{c.cn}</td>
                {weeks.map((w, wi) => (
                  <td key={wi} className="px-2 py-2.5 text-center tabular-nums text-text-1">{w.toLocaleString()}</td>
                ))}
                <td className={cn("px-2 py-2.5 text-center tabular-nums font-medium", ssGap < 0 ? "text-danger" : "text-success")}>
                  {ssGap > 0 ? "+" : ""}{ssGap.toLocaleString()}
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums text-text-2">OK</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ═══════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* FC Source Badge — top-right */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-section-header text-text-1">Demand tổng — Tháng 5</h2>
          <p className="text-table-sm text-text-2 mt-0.5">
            FC bottom-up · {BRANCHES.length} CN × {SKU_BASES.length} SKU · scaled theo tenant
          </p>
        </div>
        <FcSourceBadge />
      </div>

      {/* KPI Cards */}
      {renderKpiCards()}

      {/* Section 1: Demand Summary */}
      <div className="space-y-3">
        <SectionHeader title="Demand theo nguồn" subtitle="Phân tích cơ cấu FC · B2B · PO tháng hiện tại">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-caption text-text-3 uppercase tracking-wide">Version FC</label>
            <select
              value={fcVersion}
              onChange={(e) => setFcVersion(e.target.value as FcVersion)}
              className="h-8 rounded-button border border-surface-3 bg-surface-0 px-2 pr-7 text-table-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
              title={FC_VERSIONS.find((v) => v.key === fcVersion)?.desc}
            >
              {FC_VERSIONS.map((v) => (
                <option key={v.key} value={v.key}>{v.label}</option>
              ))}
            </select>
            <ViewPivotToggle value={pivotMode} onChange={(m) => { setPivotMode(m); setExpandedCns(new Set()); setExpandedSkus(new Set()); setExpandedCnSkus(new Set()); setExpandedSkuCns(new Set()); }} />
          </div>
        </SectionHeader>
        {pivotMode === "sku" ? renderSkuTable() : renderCnTable()}
      </div>

      {/* Connector */}
      <div className="flex items-center gap-3 px-4">
        <div className="flex-1 h-px bg-surface-3" />
        <span className="flex items-center gap-2 text-caption text-text-3">
          <ArrowRight className="h-3 w-3" />
          Phân bổ theo thời gian
        </span>
        <div className="flex-1 h-px bg-surface-3" />
      </div>

      {/* Section 2: Timeline */}
      <div className="space-y-3">
        <SectionHeader title="Demand theo thời gian" subtitle="Xu hướng và phân bổ demand theo chu kỳ">
          <div className="inline-flex rounded-button border border-surface-3 overflow-hidden">
            {([["12m","12 tháng"],["3m","3 tháng"],["week","Tuần"]] as [View,string][]).map(([k,l]) => (
              <button key={k} onClick={() => setView(k)}
                className={cn("px-4 py-1.5 text-table-sm transition-colors",
                  view === k ? "bg-primary text-white" : "bg-surface-2 text-text-2 hover:bg-surface-3"
                )}>{l}</button>
            ))}
          </div>
        </SectionHeader>
        {view === "12m" && render12m()}
        {view === "3m" && render3m()}
        {view === "week" && renderWeek()}
      </div>

      {overrideModal && (
        <OverrideModal
          sku={overrideModal.sku}
          value={overrideModal.value}
          onClose={() => setOverrideModal(null)}
          onSave={() => setOverrideModal(null)}
        />
      )}
    </div>
  );
}

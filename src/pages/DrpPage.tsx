import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useTenant } from "@/components/TenantContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Play, ChevronDown, ChevronRight, ArrowRight, Lock as LockIcon,
  CheckCircle2, AlertTriangle, Info, X,
} from "lucide-react";
import { ClickableNumber } from "@/components/ClickableNumber";
import { TermTooltip } from "@/components/TermTooltip";
import { BatchLockBanner, useBatchLock } from "@/components/BatchLockBanner";
import { DrpReleaseBar, type DrpBatch, type DrpBatchStatus } from "@/components/drp/DrpReleaseBar";
import { useRbac } from "@/components/RbacContext";
import { usePlanningPeriod } from "@/components/PlanningPeriodContext";
import { supabase } from "@/integrations/supabase/client";
import { BRANCHES, DRP_RESULTS } from "@/data/unis-enterprise-dataset";
import { SummaryCards, type SummaryCard } from "@/components/SummaryCards";
import { BRANCHES as _BR2, DRP_RESULTS as _DRP2, PLAN_VERSIONS } from "@/data/unis-enterprise-dataset";
import { VersionHistoryPanel } from "@/components/VersionHistoryPanel";
import { VersionCompareInline } from "@/components/VersionCompareInline";
import { VersionLockDialog, ViewingVersionBanner } from "@/components/VersionLockDialog";
import { DrpStepIndicator, type DrpStep } from "@/components/drp/DrpStepIndicator";
import { DrpPreflight, type PreflightItem } from "@/components/drp/DrpPreflight";
import { DrpProgress, type ProgressStep } from "@/components/drp/DrpProgress";
import { DrpCalcSummaryLine, type CalcToken } from "@/components/drp/DrpCalcSummaryLine";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TimeRangeFilter, HistoryBanner, useTimeRange, defaultTimeRange } from "@/components/TimeRangeFilter";

const tenantScales: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.7, "Mondelez": 1.35 };

/* ═══════════════════════════════════════════════════════════════════════════
   §  DATA LOGIC — preserved 1:1 from previous version
   ═══════════════════════════════════════════════════════════════════════════ */

interface AllocLayer { name: string; qty: number; pass: boolean; delta?: number; explain: string }
interface AllocSources {
  onHand: number; pipeline: number; hubPo: number; lcnbIn: number; internalTransfer: number;
}
interface SkuException {
  item: string; variant: string;
  demand: number; allocated: number; gap: number;
  type: "SHORTAGE" | "WATCH"; suggestion: string;
  netting: { fcPhased: number; onHand: number; pipeline: number; ssTarget: number; netReq: number };
  allocLayers: AllocLayer[];
  options: { label: string; source: string; qty: number; cost: string; time: string; savingVsB: string; recommended?: boolean }[];
}
interface SkuFull {
  item: string; variant: string; demand: number; allocated: number; fillPct: number; status: string;
  sources: AllocSources;
}
interface CnRow {
  cn: string; demand: number; available: number; fillRate: number; gap: number; exceptions: number;
  exceptionList: SkuException[]; allSkus: SkuFull[]; rpos: number;
}

function buildLayers(args: {
  netReq: number; lcnbCover: number; hubCover: number;
  variantOk?: boolean; fifoOk?: boolean; fairOk?: boolean; ssDelta?: number;
}): AllocLayer[] {
  const { netReq, lcnbCover, hubCover, variantOk = true, fifoOk = true, fairOk = true, ssDelta = 0 } = args;
  const finalAlloc = Math.max(0, netReq + ssDelta);
  return [
    { name: "L0 Chuyển ngang (LCNB)", qty: lcnbCover, pass: lcnbCover > 0,
      explain: lcnbCover > 0 ? `Cover ${lcnbCover.toLocaleString()}m² từ CN sibling.` : "Không có CN sibling thừa hàng." },
    { name: "L1 Hub Pool (PO mới NM)", qty: hubCover, pass: true,
      explain: hubCover > 0 ? `Phần LCNB chưa cover = ${hubCover.toLocaleString()}m² → đặt PO mới.` : "LCNB đã cover 100%." },
    { name: "L2 Đuôi màu (Variant)", qty: netReq, pass: variantOk, explain: "Phân rã mã gốc → variant theo tỷ trọng tồn." },
    { name: "L3 FIFO", qty: netReq, pass: fifoOk, explain: "Lot cũ trước." },
    { name: "L4 Chia công bằng", qty: netReq, pass: fairOk, explain: "Fair-share theo trọng số demand." },
    { name: "L5 Bảo vệ SS", qty: finalAlloc, pass: ssDelta >= 0, delta: ssDelta < 0 ? ssDelta : undefined,
      explain: ssDelta < 0 ? `Cắt ${Math.abs(ssDelta).toLocaleString()}m² để bảo vệ SS.` : "Pass." },
  ];
}

const VISIBLE_BASES = ["GA-300", "GA-400", "GA-600", "GT-300", "GT-600", "GM-300"] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   §  LCNB (TO) catalog — shared across DRP table, drill-downs, summary
   ═══════════════════════════════════════════════════════════════════════════ */
export interface ToLcnbRow {
  code: string;
  fromCn: string;   // "CN-HCM"
  toCn: string;     // "CN-BD"
  sku: string;
  qty: number;      // m²
  costM: number;    // triệu VND
}

export const TO_ROWS_LCNB: ToLcnbRow[] = [
  { code: "TO-HCM-BD-W20-001", fromCn: "CN-HCM", toCn: "CN-BD", sku: "GA-600 A4", qty: 200, costM: 4.2 },
  { code: "TO-QN-NA-W20-001",  fromCn: "CN-QN",  toCn: "CN-NA", sku: "GA-300 A4", qty: 180, costM: 3.6 },
  { code: "TO-HN-NA-W20-002",  fromCn: "CN-HN",  toCn: "CN-NA", sku: "GM-300 A4", qty: 95,  costM: 1.9 },
  { code: "TO-DN-CT-W20-001",  fromCn: "CN-DN",  toCn: "CN-CT", sku: "GA-300 B2", qty: 80,  costM: 1.6 },
];

function findToByDestCn(cnCode: string): ToLcnbRow | undefined {
  const k = cnCode.replace(/^CN-/, "");
  return TO_ROWS_LCNB.find((t) => t.toCn.replace(/^CN-/, "") === k);
}
function lcnbInForCn(cnCode: string): ToLcnbRow[] {
  return TO_ROWS_LCNB.filter((t) => t.toCn === cnCode);
}
function lcnbOutForCn(cnCode: string): ToLcnbRow[] {
  return TO_ROWS_LCNB.filter((t) => t.fromCn === cnCode);
}

type ExcSeed = {
  cn: string; sku: string; type: "SHORTAGE" | "WATCH";
  demand: number; allocated: number; gap: number;
  fcPhased: number; onHand: number; pipeline: number; ssTarget: number;
  suggestion: string;
  lcnbCover: number; hubCover: number; ssDelta: number;
  options: SkuException["options"];
};

const EXCEPTION_SEEDS: ExcSeed[] = [
  { cn: "CN-BMT", sku: "GA-300", type: "SHORTAGE", demand: 480, allocated: 189, gap: 291,
    fcPhased: 412, onHand: 80, pipeline: 60, ssTarget: 240,
    suggestion: "LCNB từ CN-BD (excess 3.408m², 350km, 2 ngày)", lcnbCover: 291, hubCover: 0, ssDelta: 0,
    options: [
      { label: "A. Chuyển ngang", source: "CN-BD excess 3.408m²", qty: 291, cost: "5,8M₫", time: "2 ngày", savingVsB: "−48M₫" },
      { label: "B. PO mới", source: "Mikado", qty: 291, cost: "53,8M₫", time: "14 ngày", savingVsB: "baseline" },
      { label: "C. LCNB 100%", source: "CN-BD lateral 291m²", qty: 291, cost: "5,8M₫", time: "2 ngày", savingVsB: "−48M₫", recommended: true },
    ],
  },
  { cn: "CN-PK", sku: "GT-600", type: "SHORTAGE", demand: 320, allocated: 140, gap: 180,
    fcPhased: 280, onHand: 50, pipeline: 40, ssTarget: 130,
    suggestion: "LCNB từ CN-QN (excess 480m², 215km, 1 ngày)", lcnbCover: 180, hubCover: 0, ssDelta: 0,
    options: [
      { label: "A. Chuyển ngang", source: "CN-QN excess 480m²", qty: 180, cost: "3,6M₫", time: "1 ngày", savingVsB: "−30M₫" },
      { label: "B. PO mới", source: "Đồng Tâm", qty: 180, cost: "33,8M₫", time: "10 ngày", savingVsB: "baseline" },
      { label: "C. LCNB 100%", source: "CN-QN lateral 180m²", qty: 180, cost: "3,6M₫", time: "1 ngày", savingVsB: "−30M₫", recommended: true },
    ],
  },
  { cn: "CN-NA", sku: "GM-300", type: "SHORTAGE", demand: 220, allocated: 125, gap: 95,
    fcPhased: 200, onHand: 70, pipeline: 35, ssTarget: 120,
    suggestion: "LCNB từ CN-HN (excess 1.250m², 290km, 2 ngày)", lcnbCover: 95, hubCover: 0, ssDelta: 0,
    options: [
      { label: "A. Chuyển ngang", source: "CN-HN excess 1.250m²", qty: 95, cost: "1,9M₫", time: "2 ngày", savingVsB: "−14M₫" },
      { label: "B. PO mới", source: "Vigracera", qty: 95, cost: "16M₫", time: "11 ngày", savingVsB: "baseline" },
      { label: "C. LCNB 100%", source: "CN-HN lateral 95m²", qty: 95, cost: "1,9M₫", time: "2 ngày", savingVsB: "−14M₫", recommended: true },
    ],
  },
  { cn: "CN-BD", sku: "GA-400", type: "WATCH", demand: 585, allocated: 535, gap: 50,
    fcPhased: 520, onHand: 360, pipeline: 175, ssTarget: 220,
    suggestion: "ETA Mikado 17/05 sẽ cover dư", lcnbCover: 0, hubCover: 0, ssDelta: -50, options: [],
  },
  { cn: "CN-HN", sku: "GT-300", type: "WATCH", demand: 546, allocated: 516, gap: 30,
    fcPhased: 480, onHand: 320, pipeline: 196, ssTarget: 180,
    suggestion: "Seasonal spike +12% YoY. ETA 16/05.", lcnbCover: 0, hubCover: 0, ssDelta: -30, options: [],
  },
];

function buildSkuRow(cnCode: string, baseCode: string): SkuFull | null {
  const drp = DRP_RESULTS.find((r) => r.cnCode === cnCode && r.skuBaseCode === baseCode);
  if (!drp) return null;
  const exc = EXCEPTION_SEEDS.find((e) => e.cn === cnCode && e.sku === baseCode);
  const demand = drp.fcM2;
  if (demand === 0) return null;
  if (exc) {
    return {
      item: baseCode, variant: "Σ tổng",
      demand: exc.demand, allocated: exc.allocated,
      fillPct: exc.demand > 0 ? Math.round((exc.allocated / exc.demand) * 100) : 100,
      status: exc.type,
      sources: { onHand: exc.onHand, pipeline: exc.pipeline, hubPo: exc.hubCover, lcnbIn: exc.lcnbCover, internalTransfer: 0 },
    };
  }
  const onHand = Math.min(drp.onHandM2, demand);
  const pipeline = Math.min(drp.inTransitM2, Math.max(0, demand - onHand));
  const hubPo = Math.max(0, demand - onHand - pipeline);
  return { item: baseCode, variant: "Σ tổng", demand, allocated: demand, fillPct: 100, status: "OK",
    sources: { onHand, pipeline, hubPo, lcnbIn: 0, internalTransfer: 0 } };
}

const baseData: CnRow[] = BRANCHES.map((cn) => {
  const skus: SkuFull[] = VISIBLE_BASES
    .map((b) => buildSkuRow(cn.code, b))
    .filter((r): r is SkuFull => r !== null);
  const exceptionList: SkuException[] = EXCEPTION_SEEDS
    .filter((e) => e.cn === cn.code)
    .map((e) => ({
      item: e.sku, variant: "Σ tổng",
      demand: e.demand, allocated: e.allocated, gap: e.gap, type: e.type, suggestion: e.suggestion,
      netting: { fcPhased: e.fcPhased, onHand: e.onHand, pipeline: e.pipeline, ssTarget: e.ssTarget,
        netReq: e.demand - e.onHand - e.pipeline + e.ssTarget },
      allocLayers: buildLayers({ netReq: e.gap, lcnbCover: e.lcnbCover, hubCover: e.hubCover, ssDelta: e.ssDelta }),
      options: e.options,
    }));
  const donorBoost: Record<string, number> = { "CN-BD": 220, "CN-QN": 180, "CN-HN": 95 };
  const out = donorBoost[cn.code] ?? 0;
  if (out > 0 && skus.length > 0) {
    skus[0] = { ...skus[0], sources: { ...skus[0].sources, internalTransfer: -out } };
  }
  const demand = skus.reduce((a, s) => a + s.demand, 0);
  const allocated = skus.reduce((a, s) => a + s.allocated, 0);
  const gap = Math.max(0, demand - allocated);
  const fillRate = demand > 0 ? Math.round(((demand - gap) / demand) * 100) : 100;
  return {
    cn: cn.code, demand,
    available: skus.reduce((a, s) => a + s.sources.onHand + s.sources.pipeline, 0),
    fillRate, gap, exceptions: exceptionList.length,
    rpos: exceptionList.filter((e) => e.type === "SHORTAGE").length + (cn.region === "Bắc" ? 1 : 0),
    exceptionList, allSkus: skus,
  };
});

/* ═══════════════════════════════════════════════════════════════════════════
   §  FLOW STEPPER — 11 steps × 3 phases
   ═══════════════════════════════════════════════════════════════════════════ */

type StepBadge = { kind: "ok" | "warn" | "danger"; count?: number };
type FlowStep = { id: number; label: string; badge: StepBadge };

const PHASES: { name: string; steps: FlowStep[] }[] = [
  {
    name: "KẾ HOẠCH",
    steps: [
      { id: 1, label: "Nhu cầu", badge: { kind: "ok" } },
      { id: 2, label: "Trừ tồn CN", badge: { kind: "ok" } },
      { id: 3, label: "Trừ đang về", badge: { kind: "ok" } },
      { id: 4, label: "Cộng SS", badge: { kind: "ok" } },
      { id: 5, label: "Nhu cầu ròng", badge: { kind: "warn", count: 3 } },
    ],
  },
  {
    name: "PHÂN BỔ",
    steps: [
      { id: 6, label: "Chuyển ngang", badge: { kind: "ok" } },
      { id: 7, label: "Hub Pool", badge: { kind: "ok" } },
      { id: 8, label: "Variant", badge: { kind: "warn", count: 1 } },
      { id: 9, label: "Container", badge: { kind: "ok" } },
      { id: 10, label: "Tồn NM", badge: { kind: "danger", count: 1 } },
    ],
  },
  {
    name: "THỰC THI",
    steps: [{ id: 11, label: "Duyệt PO/TO", badge: { kind: "warn", count: 8 } }],
  },
];

function StepBadgeDot({ b }: { b: StepBadge }) {
  if (b.kind === "ok") {
    return (
      <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-success text-primary-foreground flex items-center justify-center text-[8px] font-bold">
        ✓
      </span>
    );
  }
  const cls = b.kind === "danger"
    ? "bg-danger text-primary-foreground"
    : "bg-warning text-primary-foreground";
  return (
    <span className={cn("absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold", cls)}>
      {b.count}
    </span>
  );
}

/* ─── Step detail content (5 = default) ────────────────────────────────── */
function StepDetail({ stepId, scale }: { stepId: number; scale: number }) {
  const sc = (n: number) => Math.round(n * scale);
  const navigate = useNavigate();

  if (stepId === 1) return (
    <div className="space-y-2 text-table-sm">
      <div className="flex justify-between"><span className="text-text-2">FC tuần phased (12 CN, 42 mã)</span>
        <ClickableNumber value={sc(28400)} color="text-text-1"
          breakdown={[
            { label: "GA-300 (4 variant)", value: sc(12400) },
            { label: "GA-400 (3 variant)", value: sc(8200) },
            { label: "GA-600 (2 variant)", value: sc(4800) },
            { label: "Khác", value: sc(3000) },
          ]} /></div>
      <div className="flex justify-between"><span className="text-text-2">CN điều chỉnh (4/12 CN)</span>
        <ClickableNumber value={`+${sc(1475).toLocaleString()}`} color="text-info" /></div>
      <div className="flex justify-between"><span className="text-text-2">B2B pipeline (6 deal ≥70%)</span>
        <ClickableNumber value={`+${sc(1757).toLocaleString()}`} color="text-info" /></div>
      <div className="flex justify-between border-t border-surface-3 pt-2 font-semibold">
        <span>→ Nhu cầu gộp</span>
        <ClickableNumber value={sc(31632)} color="text-text-1" /></div>
    </div>
  );

  if (stepId === 2) return (
    <div className="space-y-2 text-table-sm">
      <div className="text-text-3 text-caption">Tồn kho 12 CN — Bravo sync 06:00</div>
      <div className="flex justify-between"><span>GA-300 tổng</span><ClickableNumber value={sc(1800)} /></div>
      <div className="flex justify-between"><span>GA-400 tổng</span><ClickableNumber value={sc(650)} /></div>
      <div className="flex justify-between"><span>GA-600 tổng</span><ClickableNumber value={sc(450)} /></div>
      <div className="flex justify-between"><span>Khác</span><ClickableNumber value={sc(300)} /></div>
      <div className="flex justify-between border-t border-surface-3 pt-2 font-semibold">
        <span>→ Sau trừ tồn = 31.632 − 3.200</span>
        <ClickableNumber value={sc(28432)} color="text-text-1" /></div>
    </div>
  );

  if (stepId === 3) return (
    <div className="space-y-2 text-table-sm">
      <div className="text-text-3 text-caption">PO đã ship (in-transit)</div>
      <div className="flex justify-between"><span>PO-HN-W18 (ETA 27/04)</span><span className="tabular-nums">{sc(500).toLocaleString()}</span></div>
      <div className="flex justify-between"><span>PO-BD-W19 (ETA 30/04)</span><span className="tabular-nums">{sc(400).toLocaleString()}</span></div>
      <div className="flex justify-between"><span>5 PO khác</span><span className="tabular-nums">{sc(857).toLocaleString()}</span></div>
      <div className="flex justify-between border-t border-surface-3 pt-2 font-semibold">
        <span>→ Sau trừ pipeline = 28.432 − 1.757</span>
        <ClickableNumber value={sc(26675)} color="text-text-1" /></div>
    </div>
  );

  if (stepId === 4) return (
    <div className="space-y-2 text-table-sm">
      <div className="text-text-3 text-caption flex items-center gap-1">
        <TermTooltip term="SsCn">Tồn kho an toàn</TermTooltip> per mã hàng × CN
      </div>
      <div className="flex justify-between"><span>GA-300: 55m²/CN × 12</span><span className="tabular-nums">{sc(660).toLocaleString()}</span></div>
      <div className="flex justify-between"><span>GA-400: 25m²/CN × 12</span><span className="tabular-nums">{sc(300).toLocaleString()}</span></div>
      <div className="flex justify-between"><span>GA-600: 20m²/CN × 12</span><span className="tabular-nums">{sc(240).toLocaleString()}</span></div>
      <div className="flex justify-between border-t border-surface-3 pt-2 font-semibold">
        <span>→ <TermTooltip term="NhuCauRong">Nhu cầu ròng</TermTooltip> = 26.675 + 1.200</span>
        <ClickableNumber value={sc(27875)} color="text-text-1" /></div>
    </div>
  );

  if (stepId === 5) return (
    <div className="space-y-2 text-table-sm">
      <div className="rounded bg-success-bg/40 border border-success/20 px-3 py-2">
        <div className="font-medium text-success">9 CN đủ hàng — bỏ qua</div>
        <div className="text-caption text-text-3 mt-0.5">Net Req ≤ 0, fill ≥ 95%</div>
      </div>
      <div className="rounded bg-warning-bg/40 border border-warning/20 px-3 py-2">
        <div className="font-medium text-warning">3 CN cần phân bổ</div>
        <ul className="text-text-2 mt-1 space-y-0.5">
          <li>CN-BD: +{sc(1200).toLocaleString()}m²</li>
          <li>CN-NA: +{sc(120).toLocaleString()}m²</li>
          <li>CN-CT: +{sc(80).toLocaleString()}m²</li>
        </ul>
      </div>
      <div className="flex justify-between border-t border-surface-3 pt-2 font-semibold">
        <span>→ Tổng cần phân bổ</span>
        <ClickableNumber value={`${sc(1400).toLocaleString()}m²`} color="text-warning" /></div>
    </div>
  );

  if (stepId === 6) {
    const toRows = TO_ROWS_LCNB.map((t) => ({
      code: t.code, from: t.fromCn, to: t.toCn, sku: t.sku, qty: t.qty,
    }));
    const totalQty = toRows.reduce((s, r) => s + r.qty, 0);
    return (
      <div className="space-y-3 text-table-sm">
        <div className="text-text-3 text-caption flex items-center gap-1">
          <TermTooltip term="LCNB">Chuyển ngang (LCNB)</TermTooltip> scan: 4 CN dư hàng → {toRows.length} TO nháp tạo tự động
        </div>
        <div className="rounded-card border border-surface-3 overflow-hidden">
          <table className="w-full text-caption">
            <thead className="bg-surface-2 text-text-3">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium">Mã TO</th>
                <th className="text-left px-2 py-1.5 font-medium">Từ</th>
                <th className="text-left px-2 py-1.5 font-medium">Đến</th>
                <th className="text-left px-2 py-1.5 font-medium">Mã hàng</th>
                <th className="text-right px-2 py-1.5 font-medium">SL</th>
                <th className="text-center px-2 py-1.5 font-medium">TT</th>
                <th className="text-right px-2 py-1.5 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {toRows.map((r) => (
                <tr key={r.code} className="border-t border-surface-3 hover:bg-primary/5">
                  <td className="px-2 py-1.5 font-mono text-text-1">{r.code}</td>
                  <td className="px-2 py-1.5 text-text-2">{r.from}</td>
                  <td className="px-2 py-1.5 text-text-2">{r.to}</td>
                  <td className="px-2 py-1.5 text-text-2">{r.sku}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums text-text-1">{sc(r.qty)} m²</td>
                  <td className="px-2 py-1.5 text-center">
                    <span className="inline-block rounded-full bg-warning-bg text-warning border border-warning/30 px-1.5 py-0.5 text-[10px] font-medium">Nháp</span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => navigate("/orders?tab=approval&filter=TO")}
                      className="inline-flex items-center gap-1 rounded-button border border-primary/30 bg-primary/5 text-primary px-2 py-0.5 text-[10px] font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      Duyệt <ArrowRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-caption text-text-3 border-t border-surface-3 pt-2">
          <span>{toRows.length} TO · tổng <span className="font-semibold text-text-1 tabular-nums">{sc(totalQty)} m²</span> · cước ước tính <span className="font-semibold text-text-1 tabular-nums">15,3 triệu ₫</span> · 1-2 ngày</span>
          <button
            type="button"
            onClick={() => navigate("/orders?tab=approval&filter=TO")}
            className="inline-flex items-center gap-1 rounded-button bg-primary text-primary-foreground px-2.5 py-1 text-caption font-medium hover:opacity-90"
          >
            Mở Đơn hàng → Duyệt TO <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  if (stepId === 7) return (
    <div className="space-y-2 text-table-sm">
      <div className="flex justify-between"><span className="text-text-2">Hub ảo khả dụng</span>
        <ClickableNumber value={sc(12400)} color="text-text-1" /></div>
      <div className="flex justify-between"><span>CN-BD ← Mikado</span><span className="tabular-nums">{sc(600).toLocaleString()}</span></div>
      <div className="flex justify-between"><span>CN-NA ← Đồng Tâm</span><span className="tabular-nums">{sc(100).toLocaleString()}</span></div>
      <div className="flex justify-between"><span>CN-CT ← Toko</span><span className="tabular-nums">{sc(80).toLocaleString()}</span></div>
      <div className="flex justify-between border-t border-surface-3 pt-2 font-semibold">
        <span>→ Hub phân bổ {sc(780)}m². CN-BD vẫn thiếu</span>
        <ClickableNumber value={`${sc(400).toLocaleString()}m²`} color="text-danger" /></div>
    </div>
  );

  if (stepId === 8) return (
    <div className="space-y-2 text-table-sm">
      <div className="text-text-3 text-caption">
        GA-300 base → A4 (45%), B2 (35%), C1 (15%), D3 (5%)
      </div>
      <div className="rounded border border-warning/30 bg-warning-bg/30 px-3 py-2 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
        <div>
          <div className="font-medium text-warning">1 cảnh báo MOQ</div>
          <div className="text-text-2">GA-300 D3 CN-NA: {sc(15)}m² &lt; MOQ 50m². Gợi ý: gom với CN-BD đợt sau.</div>
        </div>
      </div>
    </div>
  );

  if (stepId === 9) return (
    <div className="space-y-2 text-table-sm">
      <div className="text-text-2">8 chuyến vận chuyển</div>
      <div className="flex justify-between"><span>Container 40ft</span><span className="tabular-nums font-medium">3 chuyến</span></div>
      <div className="flex justify-between"><span>Container 20ft</span><span className="tabular-nums font-medium">2 chuyến</span></div>
      <div className="flex justify-between"><span>Xe 10 tấn (LCNB)</span><span className="tabular-nums font-medium">3 chuyến</span></div>
      <div className="rounded border border-warning/30 bg-warning-bg/30 px-3 py-2 mt-1 space-y-1">
        <div className="text-warning font-medium">⏸ TP-003 Toko→DN: fill 53% &lt; ngưỡng 70% → GIỮ LẠI</div>
        <div className="text-caption text-text-2">Tối đa 3 ngày · hết hạn <span className="font-medium">19/05</span></div>
        <div className="text-caption text-text-3">Gợi ý gom: <span className="text-text-1">PO-DN-W21</span> cùng NM Toko → +200m² → fill 75% → XUẤT</div>
      </div>
      <div className="flex justify-between border-t border-surface-3 pt-2 font-semibold">
        <span>→ Tổng cước ước</span><span className="tabular-nums text-text-1">128 triệu ₫</span></div>
    </div>
  );

  if (stepId === 10) return (
    <div className="space-y-2 text-table-sm">
      <div className="text-text-3 text-caption flex items-center gap-1">
        Kiểm tra <TermTooltip term="ATP">tồn NM (ATP)</TermTooltip>
      </div>
      <div className="flex justify-between"><span className="text-success">✅ Mikado</span><span className="tabular-nums">{sc(18000).toLocaleString()}m² PASS</span></div>
      <div className="flex justify-between"><span className="text-success">✅ Đồng Tâm</span><span>PASS</span></div>
      <div className="flex justify-between"><span className="text-success">✅ Vigracera, Phú Mỹ</span><span>PASS</span></div>
      <div className="rounded border border-danger/30 bg-danger-bg/30 px-3 py-2 mt-1">
        <div className="font-medium text-danger">⚠️ Toko: GA-600 thiếu {sc(400)}m² — PARTIAL</div>
        <div className="text-text-2 text-caption mt-0.5">Đề xuất: chia nhỏ PO + chờ ETA 22/05.</div>
      </div>
    </div>
  );

  if (stepId === 11) {
    const toTotalQty = TO_ROWS_LCNB.reduce((s, t) => s + t.qty, 0);
    const toTotalCost = TO_ROWS_LCNB.reduce((s, t) => s + t.costM, 0);
    return (
      <div className="space-y-2 text-table-sm">
        <div className="flex justify-between"><span>PO chờ duyệt</span><span className="tabular-nums font-medium">5</span></div>
        <div className="flex justify-between">
          <span>TO chuyển ngang (LCNB)</span>
          <span className="tabular-nums font-medium">{TO_ROWS_LCNB.length} TO · {toTotalQty} m²</span>
        </div>
        <div className="rounded-card border border-surface-3 overflow-hidden">
          <table className="w-full text-caption">
            <thead className="bg-surface-2 text-text-3">
              <tr>
                <th className="text-left  px-2 py-1.5 font-medium">Mã TO</th>
                <th className="text-left  px-2 py-1.5 font-medium">Từ</th>
                <th className="text-left  px-2 py-1.5 font-medium">Đến</th>
                <th className="text-left  px-2 py-1.5 font-medium">Mã hàng</th>
                <th className="text-right px-2 py-1.5 font-medium">Số lượng</th>
                <th className="text-right px-2 py-1.5 font-medium">Cước</th>
              </tr>
            </thead>
            <tbody>
              {TO_ROWS_LCNB.map((t) => (
                <tr key={t.code} className="border-t border-surface-3">
                  <td className="px-2 py-1.5 font-mono text-text-1">{t.code}</td>
                  <td className="px-2 py-1.5 text-text-2">{t.fromCn.replace("CN-", "")}</td>
                  <td className="px-2 py-1.5 text-text-2">{t.toCn.replace("CN-", "")}</td>
                  <td className="px-2 py-1.5 text-text-2">{t.sku}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{t.qty} m²</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{t.costM.toFixed(1).replace(".", ",")}M₫</td>
                </tr>
              ))}
              <tr className="border-t border-surface-3 bg-surface-2/50 font-semibold">
                <td className="px-2 py-1.5 text-text-1" colSpan={4}>TỔNG</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{toTotalQty} m²</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{toTotalCost.toFixed(1).replace(".", ",")}M₫</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex justify-between"><span>PO khẩn (RPO)</span><span className="tabular-nums font-medium text-danger">1</span></div>
        <button onClick={() => navigate("/orders?tab=approval&filter=TO")}
          className="mt-2 w-full rounded-button bg-gradient-primary text-primary-foreground px-3 py-2 text-table-sm font-semibold flex items-center justify-center gap-1.5">
          Duyệt tất cả TO <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   §  SOURCE BADGES (Vietnamese, semantic tokens)
   ═══════════════════════════════════════════════════════════════════════════ */

type SrcKind = "onHand" | "pipeline" | "hubPo" | "lcnb" | "shortage";
const SRC_META: Record<SrcKind, { label: string; icon: string; cls: string }> = {
  onHand:   { label: "Tồn kho",       icon: "🏠", cls: "bg-success-bg text-success border-success/30" },
  pipeline: { label: "Đang về",       icon: "🚛", cls: "bg-info-bg text-info border-info/30" },
  hubPo:    { label: "Đặt NM",        icon: "📦", cls: "bg-accent text-accent-foreground border-accent" },
  lcnb:     { label: "Chuyển ngang",  icon: "↔",  cls: "bg-warning-bg text-warning border-warning/30" },
  shortage: { label: "Thiếu",         icon: "⚠️", cls: "bg-danger-bg text-danger border-danger/30" },
};

function SourceBadge({ kind, qty, hideLabelMobile = false }: { kind: SrcKind; qty: number; hideLabelMobile?: boolean }) {
  const m = SRC_META[kind];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums", m.cls)}>
      <span>{m.icon}</span>
      <span className={cn(hideLabelMobile && "hidden sm:inline")}>{m.label}</span>
      <span>{qty.toLocaleString()}</span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §  SKU-FIRST PIVOT TABLE — "Mã hàng → Chi nhánh"
   Trả lời: "SKU nào phân bổ thế nào? CN nào thiếu? NM nào nguồn?"
   Header KHÁC + drill-down per-CN với cột LCNB nhận/gửi.
   ═══════════════════════════════════════════════════════════════════════════ */
function SkuFirstPivotTable({
  data, onLcnbClick, onNavigateOrders,
}: {
  data: CnRow[];
  onLcnbClick: (t: ToLcnbRow) => void;
  onNavigateOrders: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Aggregate per SKU base across all CNs
  interface SkuPivotRow {
    sku: string;
    totalDemand: number;
    totalAlloc: number;
    fillPct: number;
    cnShortage: { cn: string; demand: number; alloc: number; fill: number }[];
    nmSources: { name: string; pct: number }[];
    perCn: { cn: string; demand: number; alloc: number; fill: number; onHand: number; lcnbIn: number; lcnbOut: number; hubPo: number; lcnbInFrom?: string; lcnbOutTo?: string }[];
  }

  const skuRows: SkuPivotRow[] = (() => {
    const map = new Map<string, SkuPivotRow>();
    data.forEach((cn) => {
      cn.allSkus.forEach((sk) => {
        const key = sk.item;
        if (!map.has(key)) {
          map.set(key, { sku: key, totalDemand: 0, totalAlloc: 0, fillPct: 0, cnShortage: [], nmSources: [], perCn: [] });
        }
        const p = map.get(key)!;
        p.totalDemand += sk.demand;
        p.totalAlloc += sk.allocated;
        const fill = sk.demand > 0 ? Math.round((sk.allocated / sk.demand) * 100) : 100;
        if (fill < 95) p.cnShortage.push({ cn: cn.cn, demand: sk.demand, alloc: sk.allocated, fill });
        // Match TOs whose SKU starts with this base
        const toIn = TO_ROWS_LCNB.find((t) => t.toCn === cn.cn && t.sku.startsWith(sk.item));
        const toOut = TO_ROWS_LCNB.find((t) => t.fromCn === cn.cn && t.sku.startsWith(sk.item));
        p.perCn.push({
          cn: cn.cn, demand: sk.demand, alloc: sk.allocated, fill,
          onHand: sk.sources.onHand,
          lcnbIn: toIn?.qty ?? sk.sources.lcnbIn,
          lcnbOut: toOut?.qty ?? Math.abs(sk.sources.internalTransfer),
          hubPo: sk.sources.hubPo,
          lcnbInFrom: toIn?.fromCn.replace("CN-", ""),
          lcnbOutTo: toOut?.toCn.replace("CN-", ""),
        });
      });
    });
    // Compute fill, NM source mix (mock based on SKU prefix)
    const NM_MIX: Record<string, { name: string; pct: number }[]> = {
      "GA-300": [{ name: "Mikado", pct: 60 }, { name: "Toko", pct: 40 }],
      "GA-400": [{ name: "Mikado", pct: 70 }, { name: "Vigracera", pct: 30 }],
      "GA-600": [{ name: "Mikado", pct: 55 }, { name: "Toko", pct: 45 }],
      "GT-300": [{ name: "Phú Mỹ", pct: 100 }],
      "GT-600": [{ name: "Toko", pct: 100 }],
      "GM-300": [{ name: "Đồng Tâm", pct: 100 }],
    };
    const out = Array.from(map.values()).map((p) => ({
      ...p,
      fillPct: p.totalDemand > 0 ? Math.round((p.totalAlloc / p.totalDemand) * 100) : 100,
      nmSources: NM_MIX[p.sku] ?? [],
    }));
    // Sort by total gap desc (largest shortage first)
    out.sort((a, b) => (b.totalDemand - b.totalAlloc) - (a.totalDemand - a.totalAlloc));
    return out;
  })();

  const toggle = (sku: string) => setExpanded((s) => {
    const n = new Set(s);
    if (n.has(sku)) n.delete(sku); else n.add(sku);
    return n;
  });

  return (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-1/60 border-b border-surface-3">
              <th className="w-8"></th>
              <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">Mã hàng</th>
              <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3">Nhu cầu tổng</th>
              <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3">Phân bổ tổng</th>
              <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3">Lấp đầy</th>
              <th className="px-3 py-2.5 text-left  text-table-header uppercase text-text-3">CN thiếu</th>
              <th className="px-3 py-2.5 text-left  text-table-header uppercase text-text-3">NM nguồn</th>
            </tr>
          </thead>
          <tbody>
            {skuRows.map((r) => {
              // Auto-expand if ≥2 CN thiếu
              const isOpen = expanded.has(r.sku) || r.cnShortage.length >= 2;
              const sev = r.fillPct >= 95 ? "ok" : r.fillPct >= 80 ? "watch" : "short";
              return (
                <Fragment key={r.sku}>
                  <tr
                    className={cn(
                      "border-b border-surface-3 cursor-pointer transition-colors",
                      sev === "short" && "bg-danger-bg/20 border-l-2 border-l-danger",
                      sev === "watch" && "bg-warning-bg/15 border-l-2 border-l-warning",
                      sev === "ok" && "hover:bg-surface-1/40",
                    )}
                    onClick={() => toggle(r.sku)}
                  >
                    <td className="px-2 py-2.5 text-center">
                      {isOpen ? <ChevronDown className="h-4 w-4 text-text-3 inline" /> : <ChevronRight className="h-4 w-4 text-text-3 inline" />}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-text-1">{r.sku}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-1">{r.totalDemand.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-text-2">{r.totalAlloc.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn("tabular-nums font-semibold",
                        sev === "ok" && "text-success",
                        sev === "watch" && "text-warning",
                        sev === "short" && "text-danger",
                      )}>{r.fillPct}%</span>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.cnShortage.length > 0 ? (
                        <span
                          title={r.cnShortage.map((c) => `${c.cn} (${c.fill}%)`).join(", ")}
                          className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger-bg px-2 py-0.5 text-[11px] font-semibold text-danger"
                        >
                          {r.cnShortage.length} CN
                        </span>
                      ) : <span className="text-success text-caption">🟢 Đủ</span>}
                    </td>
                    <td className="px-3 py-2.5 text-table-sm text-text-2">
                      {r.nmSources.map((n) => `${n.name} ${n.pct}%`).join(" · ")}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={7} className="bg-surface-1/40 px-4 py-3 border-b border-surface-3">
                        <div className="text-caption text-text-3 mb-2">
                          Phân bổ {r.sku} cho {r.perCn.length} CN — cột LCNB nhận/gửi cho thấy luân chuyển ngang
                        </div>
                        <table className="w-full text-table-sm">
                          <thead>
                            <tr className="text-text-3 text-caption border-b border-surface-3">
                              <th className="text-left  py-1 font-medium">CN</th>
                              <th className="text-right py-1 font-medium">Nhu cầu</th>
                              <th className="text-right py-1 font-medium">Tồn CN</th>
                              <th className="text-right py-1 font-medium">LCNB nhận</th>
                              <th className="text-right py-1 font-medium">LCNB gửi</th>
                              <th className="text-right py-1 font-medium">Hub PO</th>
                              <th className="text-right py-1 font-medium">Lấp đầy</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.perCn.map((c) => {
                              const cSev = c.fill >= 95 ? "ok" : c.fill >= 80 ? "watch" : "short";
                              const inTo = TO_ROWS_LCNB.find((t) => t.toCn === c.cn && t.sku.startsWith(r.sku));
                              const outTo = TO_ROWS_LCNB.find((t) => t.fromCn === c.cn && t.sku.startsWith(r.sku));
                              return (
                                <tr key={c.cn} className="border-t border-surface-3/40">
                                  <td className="py-1.5 font-medium text-text-1">{c.cn}</td>
                                  <td className="py-1.5 text-right tabular-nums">{c.demand.toLocaleString()}</td>
                                  <td className="py-1.5 text-right tabular-nums text-text-2">{c.onHand.toLocaleString()}</td>
                                  <td className="py-1.5 text-right tabular-nums">
                                    {c.lcnbIn > 0 && inTo ? (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onLcnbClick(inTo); }}
                                        className="inline-flex items-center gap-0.5 rounded-full border border-success/30 bg-success-bg px-1.5 py-0.5 text-[11px] font-semibold text-success hover:opacity-80"
                                      >
                                        +{c.lcnbIn} ({c.lcnbInFrom})
                                      </button>
                                    ) : <span className="text-text-3">0</span>}
                                  </td>
                                  <td className="py-1.5 text-right tabular-nums">
                                    {c.lcnbOut > 0 && outTo ? (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onLcnbClick(outTo); }}
                                        className="inline-flex items-center gap-0.5 rounded-full border border-warning/30 bg-warning-bg px-1.5 py-0.5 text-[11px] font-semibold text-warning hover:opacity-80"
                                      >
                                        −{c.lcnbOut} (→{c.lcnbOutTo})
                                      </button>
                                    ) : <span className="text-text-3">0</span>}
                                  </td>
                                  <td className="py-1.5 text-right tabular-nums text-text-2">{c.hubPo > 0 ? c.hubPo.toLocaleString() : "—"}</td>
                                  <td className={cn("py-1.5 text-right tabular-nums font-semibold",
                                    cSev === "ok" && "text-success",
                                    cSev === "watch" && "text-warning",
                                    cSev === "short" && "text-danger",
                                  )}>{c.fill}% {cSev === "ok" && "✅"} {cSev === "short" && "🔴"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 text-caption text-text-3 border-t border-surface-3 flex items-center justify-between">
        <span>Sắp xếp theo gap giảm dần · auto-mở SKU có ≥2 CN thiếu</span>
        <button
          type="button"
          onClick={onNavigateOrders}
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Duyệt tất cả TO → <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §  MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function DrpPage() {
  const { tenant } = useTenant();
  const s = tenantScales[tenant] || 1;
  const navigate = useNavigate();
  const { canApprove } = useRbac();
  const { current: planCycle } = usePlanningPeriod();

  /* ── Time-range filter (weekly) ── */
  const [timeRange, setTimeRange] = useTimeRange("drp", "weekly");

  /* ── Step navigation ── */
  const [activeStep, setActiveStep] = useState<number>(5);

  /* ── Pivot ── */
  const [pivot, setPivot] = useState<"cn" | "sku">("cn");
  const [lcnbToDetail, setLcnbToDetail] = useState<ToLcnbRow | null>(null);

  /* ── Filter pills ── */
  const [filter, setFilter] = useState<"watch+short" | "ok" | "watch" | "short" | "all">("watch+short");

  /* ── Expanded rows ── */
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    return new Set(baseData.filter(r => r.fillRate < 80).map(r => `cn-${r.cn}`));
  });
  const toggleRow = (k: string) =>
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  /* ── Source filter dropdown ── */
  const [sourceFilter, setSourceFilter] = useState<SrcKind | "all">("all");

  /* ── DRP run + batch lifecycle ── */
  const [drpRunning, setDrpRunning] = useState(false);
  const [drpStep, setDrpStep] = useState(0);
  const [batchStatus, setBatchStatus] = useState<DrpBatchStatus>("idle");
  const [drpBatchData, setDrpBatchData] = useState<DrpBatch | null>(null);
  const [rejectedCodes, setRejectedCodes] = useState<Set<string>>(new Set());
  const [batchDbId, setBatchDbId] = useState<string | null>(null);
  const isPlanLocked = batchStatus === "approved" || batchStatus === "released";

  /* ══ 3-STEP WIZARD: Preflight (1) → Progress (2) → Results (3) ══ */
  // Mặc định mở thẳng "Kết quả" (DRP đêm qua đã chạy thành công).
  const [wizardStep, setWizardStep] = useState<DrpStep>(3);
  const [wizardCompleted, setWizardCompleted] = useState<DrpStep[]>([1, 2]);
  const [progressIdx, setProgressIdx] = useState(0);
  const [progressElapsed, setProgressElapsed] = useState(0);
  const [progressCanCancel, setProgressCanCancel] = useState(true);
  const [approveExceptionDialog, setApproveExceptionDialog] = useState(false);

  // Preflight items — mock theo PRD D1 rules
  const preflightItems: PreflightItem[] = useMemo(() => [
    { key: "nm-stock", label: "Tồn kho NM", result: "5/5 NM cập nhật < 24h", level: "ok" },
    { key: "cn-stock", label: "Tồn kho CN", result: "12/12 CN sync 06:00", level: "ok" },
    { key: "cn-adj", label: "CN điều chỉnh", result: "4/12 CN adjust · Đã duyệt", level: "ok" },
    { key: "sop", label: "S&OP locked", result: "v4 · Locked 16/04", level: "ok" },
    { key: "nm-commit", label: "NM cam kết", result: "15/25 SKU (60%)", level: "warn",
      detail: "Mục tiêu ≥ 80%. DRP vẫn chạy nhưng kết quả có thể thiếu chính xác cho NM chưa cam kết.",
      fixHref: "/hub", fixLabel: "Mở Hub & Cam kết" },
    { key: "pricelist", label: "Bảng giá NM", result: "5/5 NM hiệu lực", level: "ok" },
  ], []);

  // 10 progress steps cho Bước 2
  const progressSteps: ProgressStep[] = useMemo(() => [
    { id: 1, label: "Nạp nhu cầu", result: "31.632 m² (12 CN, 42 SKU)" },
    { id: 2, label: "Trừ tồn kho CN", result: "−3.200 m² → 28.432 m²" },
    { id: 3, label: "Trừ đang về", result: "−1.757 m² → 26.675 m²" },
    { id: 4, label: "Cộng tồn an toàn", result: "+1.200 m² → 27.875 m²" },
    { id: 5, label: "Phân bổ LCNB", result: "4 TO · 555 m²" },
    { id: 6, label: "Hub Pool", result: "780 m²" },
    { id: 7, label: "Variant split", result: "1 cảnh báo MOQ" },
    { id: 8, label: "Đóng container", result: "8 chuyến · 1 giữ" },
    { id: 9, label: "Kiểm tồn NM (ATP)", result: "4/5 PASS" },
    { id: 10, label: "Tạo PO/TO nháp", result: "5 PO · 4 TO" },
  ], []);



  /* ── Version History / Compare / Lock state ── */
  const drpVersions = useMemo(
    () => PLAN_VERSIONS.filter((v) => v.planType === "DRP"),
    []
  );
  const drpW20 = useMemo(
    () => drpVersions.filter((v) => v.entityId === "DRP-W20"),
    [drpVersions]
  );
  // Version "thực tế đang chạy" = ACTIVE hoặc LOCKED mới nhất của DRP-W20
  const activeDrpVersion = useMemo(() => {
    const live = drpW20.find((v) => v.status === "ACTIVE" || v.status === "LOCKED");
    return live?.versionNumber ?? 3;
  }, [drpW20]);
  const [viewingVersion, setViewingVersion] = useState<number>(activeDrpVersion);
  const [viewingEntityId, setViewingEntityId] = useState<string>("DRP-W20");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareRightVersion, setCompareRightVersion] = useState<number | null>(null);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [drpLocked, setDrpLocked] = useState<{ by: string; at: string; reason: string } | null>(null);
  const isViewingOldVersion = viewingVersion !== activeDrpVersion || viewingEntityId !== "DRP-W20";
  // Mọi action UI bị chặn nếu đang xem cũ HOẶC đã khóa
  const actionsDisabled = isViewingOldVersion || isPlanLocked || drpLocked != null;

  const drpBatch = useBatchLock({
    batchType: "DRP", status: "info",
    resultSummary: "DRP đêm qua 23:02. 142 dòng, 3 ngoại lệ, 5 đơn mua.",
    startedAt: "23:00", queuedActions: [],
  });

  /* ── Scaled data ── */
  const data = useMemo(() => baseData.map(r => ({
    ...r,
    demand: Math.round(r.demand * s),
    available: Math.round(r.available * s),
    gap: Math.round(r.gap * s),
    allSkus: r.allSkus.map(sk => ({
      ...sk,
      demand: Math.round(sk.demand * s),
      allocated: Math.round(sk.allocated * s),
      sources: {
        onHand: Math.round(sk.sources.onHand * s),
        pipeline: Math.round(sk.sources.pipeline * s),
        hubPo: Math.round(sk.sources.hubPo * s),
        lcnbIn: Math.round(sk.sources.lcnbIn * s),
        internalTransfer: Math.round(sk.sources.internalTransfer * s),
      },
    })),
  })), [s]);

  /* ── Severity classification ── */
  const severityOf = (fill: number): "ok" | "watch" | "short" =>
    fill >= 95 ? "ok" : fill >= 80 ? "watch" : "short";

  const counts = useMemo(() => {
    const c = { ok: 0, watch: 0, short: 0 };
    data.forEach(r => { c[severityOf(r.fillRate)]++; });
    return c;
  }, [data]);

  /* ── Filtered rows ── */
  const filteredRows = useMemo(() => {
    return data.filter(r => {
      const sev = severityOf(r.fillRate);
      if (filter === "all") return true;
      if (filter === "ok") return sev === "ok";
      if (filter === "watch") return sev === "watch";
      if (filter === "short") return sev === "short";
      return sev !== "ok"; // watch+short default
    }).filter(r => {
      if (sourceFilter === "all") return true;
      const totals = r.allSkus.reduce((acc, sk) => ({
        onHand: acc.onHand + sk.sources.onHand,
        pipeline: acc.pipeline + sk.sources.pipeline,
        hubPo: acc.hubPo + sk.sources.hubPo,
        lcnb: acc.lcnb + Math.abs(sk.sources.lcnbIn) + Math.abs(sk.sources.internalTransfer),
      }), { onHand: 0, pipeline: 0, hubPo: 0, lcnb: 0 });
      if (sourceFilter === "shortage") return r.gap > 0;
      return totals[sourceFilter] > 0;
    });
  }, [data, filter, sourceFilter]);

  /* ── DRP run handler — wizard Step 1 → 2 → 3 ── */
  const progressTimerRef = useRef<number | null>(null);

  const buildBatchData = async () => {
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const id = `DRP-${ts.getFullYear()}-${pad(ts.getMonth() + 1)}-${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}`;
    const items: DrpBatch["items"] = [];
    let seq = 1;
    data.forEach(cn => cn.allSkus.forEach(sk => {
      if (sk.sources.hubPo > 0) items.push({
        code: `RPO-MKD-${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${String(seq++).padStart(3, "0")}`,
        kind: "RPO", nm: "Mikado", sku: `${sk.item} ${sk.variant}`,
        qty: sk.sources.hubPo, value: sk.sources.hubPo * 145_000,
        eta: `${pad(ts.getDate() + 7)}/${pad(ts.getMonth() + 1)}`,
      });
      if (sk.sources.lcnbIn > 0) items.push({
        code: `TO-LCNB-${cn.cn.replace("CN-", "")}-${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${String(seq++).padStart(3, "0")}`,
        kind: "TO", fromCn: "CN-DN", toCn: cn.cn, sku: `${sk.item} ${sk.variant}`,
        qty: sk.sources.lcnbIn, value: sk.sources.lcnbIn * 8_000,
        eta: `${pad(ts.getDate() + 1)}/${pad(ts.getMonth() + 1)}`,
      });
    }));
    const unresolved: DrpBatch["unresolved"] = [];
    data.forEach(cn => cn.exceptionList.forEach(e =>
      unresolved.push({ cn: cn.cn, item: e.item, variant: e.variant, gap: e.gap, type: e.type })));

    const batch: DrpBatch = { id, createdAt: `${pad(ts.getHours())}:${pad(ts.getMinutes())}`, items, unresolved };
    setDrpBatchData(batch);
    setBatchStatus("draft");
    setRejectedCodes(new Set());

    try {
      const { data: res, error } = await supabase.functions.invoke("drp-batch", {
        body: { action: "create", batch: { batchCode: batch.id, items: batch.items, unresolved: batch.unresolved } },
      });
      if (error) throw error;
      const r = res as { batch?: { id: string } } | null;
      if (r?.batch?.id) {
        setBatchDbId(r.batch.id);
      }
    } catch (err) {
      // Local-only is fine for demo
    }
  };

  const handleRunDrp = async () => {
    if (isPlanLocked) {
      toast.error("Plan đã khoá. Hủy hoặc release batch hiện tại trước khi chạy lại.");
      return;
    }
    // Bước 2: progress
    setWizardStep(2);
    setWizardCompleted([1]);
    setProgressIdx(0);
    setProgressElapsed(0);
    setProgressCanCancel(true);
    setDrpRunning(true);

    // Tổng demo 5s, 10 step → 500ms/step
    const stepMs = 500;
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    progressTimerRef.current = window.setInterval(() => {
      setProgressElapsed((e) => e + 0.1);
    }, 100) as unknown as number;

    for (let i = 0; i < progressSteps.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise<void>((res) => setTimeout(res, stepMs));
      setProgressIdx(i + 1);
      if (i === 0) setProgressCanCancel(false); // Nút Hủy chỉ hiện 10s đầu (≈ 1 step)
    }
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setDrpRunning(false);
    await buildBatchData();
    // Bước 3: kết quả
    setWizardStep(3);
    setWizardCompleted([1, 2]);
    toast.success("DRP hoàn tất — chờ duyệt & chuyển sang Đơn hàng", {
      description: "Xem kết quả & exception ở Bước 3.",
    });
  };

  // "Chạy lại" từ Bước 3 → quay về Bước 1 (Preflight)
  const handleRerun = () => {
    setWizardStep(1);
    setWizardCompleted([]);
  };

  // Cleanup timer
  useEffect(() => () => {
    if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
  }, []);

  // Approve & Hand-off → /orders
  const handleApproveAndHandoff = (force: boolean) => {
    const totalGap = data.reduce((a, r) => a + r.gap, 0);
    const exceptionCount = data.reduce((a, r) => a + r.exceptionList.length, 0);
    if (exceptionCount > 0 && !force) {
      setApproveExceptionDialog(true);
      return;
    }
    const itemCount = drpBatchData?.items.length ?? 0;
    const poCount = drpBatchData?.items.filter(i => i.kind === "RPO").length ?? 5;
    const toCount = drpBatchData?.items.filter(i => i.kind === "TO").length ?? 4;
    toast.success(`Kết quả DRP ${viewingEntityId} v${viewingVersion} đã duyệt`, {
      description: `${poCount} PO + ${toCount} TO chờ xử lý.`,
    });
    setApproveExceptionDialog(false);
    navigate("/orders?filter=todo");
  };


  const visibleBatch = useMemo<DrpBatch | null>(() => {
    if (!drpBatchData) return null;
    return { ...drpBatchData, items: drpBatchData.items.map(i => ({ ...i, rejected: rejectedCodes.has(i.code) })) };
  }, [drpBatchData, rejectedCodes]);

  const invokeBatch = async (payload: Record<string, unknown>) => {
    try {
      const { data: r, error } = await supabase.functions.invoke("drp-batch", { body: payload });
      if (error) throw error;
      return r as { ok: boolean; releasedCount?: number };
    } catch (e) { return null; }
  };

  return (
    <AppLayout>
      {/* Batch lock */}
      {drpBatch.batch && (
        <div className="mb-4">
          <BatchLockBanner
            batch={drpBatch.batch}
            dismissed={drpBatch.dismissed}
            onDismiss={drpBatch.dismiss}
            showQueue={drpBatch.showQueue}
            onToggleQueue={() => drpBatch.setShowQueue(!drpBatch.showQueue)}
            onProcessQueue={(id) => toast.success(`Xử lý queue ${id}`)}
            onCancelQueue={(id) => toast.info(`Hủy queue ${id}`)}
            onRetry={() => toast.info("Đang chạy lại...")}
            onViewResults={() => toast.info("Xem kết quả")}
          />
        </div>
      )}

      {/* Release bar */}
      <DrpReleaseBar
        status={batchStatus}
        batch={visibleBatch}
        canApprove={canApprove}
        onApproveAll={async (note) => {
          if (!batchDbId) return;
          const r = await invokeBatch({ action: "approve", batchId: batchDbId, note });
          if (r?.ok) { setBatchStatus("approved"); toast.success("Batch approved"); }
        }}
        onReject={async (codes, note) => {
          if (!batchDbId) return;
          const r = await invokeBatch({ action: "reject_items", batchId: batchDbId, codes, note });
          if (r?.ok) {
            setRejectedCodes(prev => { const n = new Set(prev); codes.forEach(c => n.add(c)); return n; });
            toast.info(`Đã loại ${codes.length} mục`);
          }
        }}
        onRelease={async () => {
          if (!batchDbId) return;
          const r = await invokeBatch({ action: "release", batchId: batchDbId });
          if (r?.ok) { setBatchStatus("released"); toast.success(`Đã release ${r.releasedCount} POs sang Đơn hàng`); }
        }}
        onMarkReviewed={async () => {
          if (batchDbId) await invokeBatch({ action: "review", batchId: batchDbId });
          setBatchStatus("reviewed");
        }}
        onCancelBatch={async () => {
          if (batchDbId) await invokeBatch({ action: "cancel", batchId: batchDbId });
          setBatchStatus("idle"); setDrpBatchData(null); setRejectedCodes(new Set()); setBatchDbId(null);
          toast.info("Đã hủy batch");
        }}
      />

      {/* ── HEADER ── (step-aware title) */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-h2 font-display font-bold text-text-1">
            {wizardStep === 1 && "Chạy DRP — Tuần 20"}
            {wizardStep === 2 && "Đang chạy DRP — Tuần 20"}
            {wizardStep === 3 && "Kết quả DRP — Tuần 20"}
          </h1>
          <p className="text-table-sm text-text-3 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>
              {wizardStep === 1 && "Kiểm tra dữ liệu trước khi chạy"}
              {wizardStep === 2 && "Vui lòng đợi — DRP đang tính toán"}
              {wizardStep === 3 && (batchStatus === "released" ? "Đã release sang Đơn hàng" : "Chạy lúc 23:02 đêm qua")}
            </span>
            <span>·</span>
            <span>Trong kỳ KH:</span>
            <button
              type="button"
              onClick={() => navigate("/demand")}
              className="inline-flex items-center gap-1 rounded-full bg-info-bg text-info border border-info/30 px-2 py-0.5 text-caption font-medium hover:bg-info/15 transition-colors"
              title="Mở rà soát nhu cầu của kỳ này"
            >
              {planCycle.label}
            </button>
          </p>
        </div>
        {wizardStep === 3 && (isPlanLocked || drpLocked ? (
          <div className="flex items-center gap-2 rounded-button bg-surface-2 text-text-3 px-4 py-2 border border-surface-3">
            <LockIcon className="h-4 w-4" /> Đã khoá plan
          </div>
        ) : (
          <button
            onClick={handleRerun}
            disabled={isViewingOldVersion}
            title={isViewingOldVersion ? "Phiên bản cũ — chỉ xem" : "Quay lại Bước 1 (Preflight) để chạy phiên bản mới"}
            className="flex items-center gap-2 rounded-button bg-gradient-primary text-primary-foreground px-5 py-2.5 text-table font-semibold shadow-sm hover:shadow-md transition-shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-3"
          >
            <Play className="h-4 w-4" /> Chạy lại DRP
          </button>
        ))}
      </div>

      {/* ── 3-STEP INDICATOR ── (luôn hiện) */}
      <DrpStepIndicator current={wizardStep} completed={wizardCompleted} />


      {/* ══ BƯỚC 1 — PREFLIGHT ══ */}
      {wizardStep === 1 && (
        <DrpPreflight
          items={preflightItems}
          onRun={handleRunDrp}
          onBack={undefined}
        />
      )}

      {/* ══ BƯỚC 2 — PROGRESS ══ */}
      {wizardStep === 2 && (
        <DrpProgress
          steps={progressSteps}
          currentIdx={progressIdx}
          elapsedSec={progressElapsed}
          estimatedSec={120}
          canCancel={progressCanCancel}
          onCancel={() => {
            if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
            setDrpRunning(false);
            setWizardStep(1);
            setWizardCompleted([]);
            toast.info("Đã hủy. Quay về Bước 1.");
          }}
        />
      )}

      {/* ══ BƯỚC 3 — KẾT QUẢ ══ */}
      {wizardStep === 3 && (<>
      {/* ── VERSION ROW ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-table-sm">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium",
          drpLocked
            ? "bg-warning-bg text-warning border-warning/30"
            : isViewingOldVersion
            ? "bg-warning-bg text-warning border-warning/30"
            : "bg-success-bg text-success border-success/30"
        )}>
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            drpLocked || isViewingOldVersion ? "bg-warning" : "bg-success"
          )} />
          DRP W20 v{viewingVersion}
          {drpLocked && ` · 🔒 Đã khóa · ${drpLocked.by} ${drpLocked.at}`}
          {!drpLocked && !isViewingOldVersion && " · Active"}
          {!drpLocked && isViewingOldVersion && " · Đã lưu trữ"}
        </span>

        {drpLocked ? (
          <button
            onClick={() => setLockDialogOpen(true)}
            disabled={!canApprove}
            className="inline-flex items-center gap-1 rounded-button border border-info/30 bg-info-bg/50 px-2.5 py-1 text-info hover:text-info disabled:opacity-50 disabled:cursor-not-allowed"
            title={!canApprove ? "Chỉ SC Manager mở khóa được" : "Mở khóa phiên bản"}
          >
            <LockIcon className="h-3 w-3" /> Mở khóa
          </button>
        ) : (
          <button
            onClick={() => setLockDialogOpen(true)}
            disabled={isViewingOldVersion}
            className="inline-flex items-center gap-1 rounded-button border border-surface-3 bg-surface-2 px-2.5 py-1 text-text-2 hover:text-text-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title={isViewingOldVersion ? "Không khóa được phiên cũ" : "Khóa phiên bản hiện tại"}
          >
            <LockIcon className="h-3 w-3" /> Khóa
          </button>
        )}

        <button
          onClick={() => {
            // Mở compare với phiên kế (current − 1)
            const candidate = drpW20.find((v) => v.versionNumber === viewingVersion - 1)
              ?? drpW20.find((v) => v.versionNumber !== viewingVersion);
            if (!candidate) {
              toast.info("Chưa có phiên bản để so sánh.");
              return;
            }
            setCompareRightVersion(candidate.versionNumber);
            setCompareMode((m) => !m);
          }}
          className={cn(
            "inline-flex items-center gap-1 rounded-button border px-2.5 py-1 transition-colors",
            compareMode
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-surface-3 bg-surface-2 text-text-2 hover:text-text-1"
          )}
        >
          So sánh <ChevronDown className="h-3 w-3" />
        </button>
        <button
          onClick={() => setHistoryOpen(true)}
          className="inline-flex items-center gap-1 rounded-button border border-surface-3 bg-surface-2 px-2.5 py-1 text-text-2 hover:text-text-1"
        >
          Lịch sử <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* Banner xem phiên cũ */}
      {isViewingOldVersion && (
        <ViewingVersionBanner
          versionNumber={viewingVersion}
          activeVersion={activeDrpVersion}
          entityLabel={`DRP ${viewingEntityId}`}
          onReturn={() => {
            setViewingVersion(activeDrpVersion);
            setViewingEntityId("DRP-W20");
            setCompareMode(false);
          }}
        />
      )}

      {/* Compare inline */}
      {compareMode && compareRightVersion != null && (
        <VersionCompareInline
          versions={drpW20}
          leftVersion={viewingVersion}
          rightVersion={compareRightVersion}
          onChangeRight={setCompareRightVersion}
          onClose={() => setCompareMode(false)}
          onSwitchTo={(v) => {
            setViewingVersion(v);
            setCompareMode(false);
            toast.info(`Đã chuyển sang DRP W20 v${v}`);
          }}
        />
      )}

      {/* (Old inline 3-step progress ribbon removed — Bước 2 dùng DrpProgress full screen) */}


      {/* ── SS change banner ── */}
      <button onClick={() => navigate("/monitoring")}
        className="mb-4 w-full rounded-card border border-info/30 bg-info-bg/30 px-4 py-2.5 flex items-center gap-2 text-table-sm text-text-2 hover:border-info/50 transition-colors text-left">
        <Info className="h-4 w-4 text-info shrink-0" />
        <span>📊 SS thay đổi tuần này: <span className="font-medium text-text-1">GA-300 CN-BD 900→1.035 (+15%)</span></span>
        <span className="ml-auto text-info text-caption flex items-center gap-1">Xem chi tiết <ArrowRight className="h-3 w-3" /></span>
      </button>

      {/* ═══ 10 BƯỚC TÍNH TOÁN — 1 dòng tóm tắt (thay cho 11-zigzag cũ) ═══ */}
      <div className="mb-4">
        <DrpCalcSummaryLine
          tokens={[
            { stepId: 1, label: "Nhu cầu 31.632" },
            { stepId: 2, label: "→ Trừ tồn −3.200" },
            { stepId: 3, label: "→ Trừ về −1.757" },
            { stepId: 4, label: "→ +SS 1.200" },
            { stepId: 5, label: "→ Ròng 27.875", severity: "warn" },
            { stepId: 6, label: "→ LCNB 4 TO · 555m²" },
            { stepId: 7, label: "→ Hub 780m²" },
            { stepId: 8, label: "→ Variant ⚠️1", severity: "warn" },
            { stepId: 9, label: "→ Container 8 · 1 giữ" },
            { stepId: 10, label: "→ NM 4/5 PASS", severity: "danger" },
          ]}
          onClickToken={(id) => setActiveStep(id)}
        />

        {/* Step detail (chỉ hiện khi có activeStep) */}
        <div className="mt-2 rounded border border-surface-3 bg-surface-1/40 p-3">
          <div className="text-table-sm font-semibold text-text-1 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {activeStep}
              </span>
              <span>{PHASES.flatMap(p => p.steps).find(s => s.id === activeStep)?.label ?? `Bước ${activeStep}`}</span>
            </span>
          </div>
          <StepDetail stepId={activeStep} scale={s} />
        </div>
      </div>


      {/* ═══ SUMMARY CARDS — tóm tắt DRP một lần nhìn ═══ */}
      {(() => {
        const totalDemand = data.reduce((a, r) => a + r.demand, 0);
        const totalAvail = data.reduce((a, r) => a + r.available, 0);
        const totalGap = Math.max(0, totalDemand - totalAvail);
        const fillRate = totalDemand > 0 ? Math.round((totalAvail / totalDemand) * 100) : 100;
        const cards: SummaryCard[] = [
          {
            key: "fill", label: "Fill rate tổng", value: `${fillRate}%`,
            severity: fillRate >= 95 ? "ok" : fillRate >= 80 ? "warn" : "critical",
            trend: { delta: "+2% vs W19", direction: "up", color: "green" },
            tooltip: "Tỷ lệ đáp ứng nhu cầu trên toàn bộ CN trong tuần này",
          },
          {
            key: "short", label: "CN thiếu hàng", value: counts.short, unit: "CN",
            severity: counts.short > 0 ? "critical" : "ok",
            tooltip: "Số chi nhánh có fill rate < 80%. Click để filter bảng.",
            onClick: () => setFilter("short"),
          },
          {
            key: "watch", label: "CN theo dõi", value: counts.watch, unit: "CN",
            severity: counts.watch > 2 ? "warn" : "ok",
            tooltip: "Fill rate 80-95%. Cần giám sát chặt 24h tới.",
            onClick: () => setFilter("watch"),
          },
          {
            key: "gap", label: "Gap m²", value: totalGap.toLocaleString("vi-VN"), unit: "m²",
            severity: totalGap > 5000 ? "critical" : totalGap > 0 ? "warn" : "ok",
            trend: { delta: totalGap > 0 ? "↑ cần bổ sung" : "→ đủ", direction: totalGap > 0 ? "up" : "flat", color: totalGap > 0 ? "red" : "gray" },
            tooltip: "Tổng nhu cầu chưa được đáp ứng — cần PO/TO bổ sung",
          },
          {
            key: "po", label: "PO/TO nháp", value: drpBatchData?.items.length ?? 0, unit: "đơn",
            severity: "ok",
            tooltip: "Số đơn DRP đã tạo, chờ duyệt → Phát hành",
          },
        ];
        return (
          <div data-tour-id="drp-summary">
            <SummaryCards cards={cards} screenId="drp-results" editable />
          </div>
        );
      })()}

      {/* ═══ SUMMARY PILLS ═══ */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setFilter(filter === "ok" ? "watch+short" : "ok")}
          className={cn("rounded-full border px-3 py-1.5 text-table-sm font-medium transition-all flex items-center gap-2",
            filter === "ok"
              ? "border-success bg-success-bg text-success"
              : "border-surface-3 bg-surface-2 text-text-2 hover:border-success/40")}>
          <span className="h-2 w-2 rounded-full bg-success" />
          {counts.ok} CN đủ hàng
        </button>
        <button
          onClick={() => setFilter(filter === "watch" ? "watch+short" : "watch")}
          className={cn("rounded-full border px-3 py-1.5 text-table-sm font-medium transition-all flex items-center gap-2",
            filter === "watch"
              ? "border-warning bg-warning-bg text-warning"
              : "border-surface-3 bg-surface-2 text-text-2 hover:border-warning/40")}>
          <span className="h-2 w-2 rounded-full bg-warning" />
          {counts.watch} CN theo dõi
        </button>
        <button
          onClick={() => setFilter(filter === "short" ? "watch+short" : "short")}
          className={cn("rounded-full border px-3 py-1.5 text-table-sm font-medium transition-all flex items-center gap-2",
            filter === "short"
              ? "border-danger bg-danger-bg text-danger"
              : "border-surface-3 bg-surface-2 text-text-2 hover:border-danger/40")}>
          <span className="h-2 w-2 rounded-full bg-danger" />
          {counts.short} CN thiếu hàng
        </button>
        <button onClick={() => setFilter("all")}
          className={cn("ml-auto text-caption font-medium px-2 py-1",
            filter === "all" ? "text-primary" : "text-text-3 hover:text-primary")}>
          Xem tất cả ({counts.ok + counts.watch + counts.short})
        </button>
      </div>

      {/* ═══ TABLE TOOLBAR ═══ */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <div className="flex rounded-button border border-surface-3 bg-surface-2 p-0.5">
          <button onClick={() => setPivot("cn")}
            className={cn("px-3 py-1 text-table-sm font-medium rounded transition-colors",
              pivot === "cn" ? "bg-primary text-primary-foreground" : "text-text-2 hover:text-text-1")}>
            Chi nhánh → Mã hàng
          </button>
          <button onClick={() => setPivot("sku")}
            className={cn("px-3 py-1 text-table-sm font-medium rounded transition-colors",
              pivot === "sku" ? "bg-primary text-primary-foreground" : "text-text-2 hover:text-text-1")}>
            Mã hàng → Chi nhánh
          </button>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-caption text-text-3">Lọc nguồn:</span>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SrcKind | "all")}
            className="rounded border border-surface-3 bg-surface-2 px-2 py-1 text-table-sm text-text-1">
            <option value="all">Tất cả</option>
            <option value="onHand">🏠 Tồn kho</option>
            <option value="pipeline">🚛 Đang về</option>
            <option value="hubPo">📦 Đặt NM</option>
            <option value="lcnb">↔ Chuyển ngang</option>
            <option value="shortage">⚠️ Thiếu</option>
          </select>
        </div>
      </div>

      {/* ═══ MAIN TABLE ═══ */}
      {pivot === "sku" ? (
        <SkuFirstPivotTable
          data={filteredRows}
          onLcnbClick={(t) => setLcnbToDetail(t)}
          onNavigateOrders={() => navigate("/orders?tab=approval&filter=TO")}
        />
      ) : (
      <div data-tour-id="drp-table" className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-1/60 border-b border-surface-3">
                <th className="w-8"></th>
                <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">Chi nhánh</th>
                <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3">Nhu cầu</th>
                <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3">Có sẵn</th>
                <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3">
                  <TermTooltip term="FillRate">Lấp đầy</TermTooltip>
                </th>
                <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">Nguồn hàng</th>
                <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-text-3 text-table-sm">
                  Không có CN nào khớp bộ lọc.
                </td></tr>
              )}
              {filteredRows.map(r => {
                const sev = severityOf(r.fillRate);
                const rowKey = `cn-${r.cn}`;
                const isOpen = expanded.has(rowKey) || sev === "short";
                const cnTotals = r.allSkus.reduce((acc, sk) => ({
                  onHand: acc.onHand + sk.sources.onHand,
                  pipeline: acc.pipeline + sk.sources.pipeline,
                  hubPo: acc.hubPo + sk.sources.hubPo,
                  lcnb: acc.lcnb + sk.sources.lcnbIn + Math.abs(sk.sources.internalTransfer),
                }), { onHand: 0, pipeline: 0, hubPo: 0, lcnb: 0 });

                return (
                  <Fragment key={rowKey}>
                    <tr className={cn(
                      "border-b border-surface-3 transition-colors cursor-pointer",
                      sev === "short" && "bg-danger-bg/20 border-l-2 border-l-danger",
                      sev === "watch" && "bg-warning-bg/15 border-l-2 border-l-warning",
                      sev === "ok" && "hover:bg-surface-1/40",
                    )} onClick={() => toggleRow(rowKey)}>
                      <td className="px-2 py-2.5 text-center">
                        {isOpen ? <ChevronDown className="h-4 w-4 text-text-3 inline" /> : <ChevronRight className="h-4 w-4 text-text-3 inline" />}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-text-1">{r.cn}</div>
                        <div className="text-caption text-text-3">
                          {sev === "ok" && "Đủ hàng"}
                          {sev === "watch" && "Theo dõi"}
                          {sev === "short" && `Thiếu ${r.gap.toLocaleString()}m²`}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-1">{r.demand.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-text-2">{r.available.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-right">
                        <span className={cn("inline-block tabular-nums font-semibold",
                          sev === "ok" && "text-success",
                          sev === "watch" && "text-warning",
                          sev === "short" && "text-danger")}>
                          {r.fillRate}%
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-table-sm text-text-2 leading-relaxed">
                          {cnTotals.onHand > 0 && <span className="tabular-nums">Tồn <span className="text-text-1 font-medium">{cnTotals.onHand.toLocaleString()}</span></span>}
                          {cnTotals.pipeline > 0 && <span className="tabular-nums"><span className="text-text-3 mx-1">·</span>Về <span className="text-text-1 font-medium">{cnTotals.pipeline.toLocaleString()}</span></span>}
                          {cnTotals.hubPo > 0 && <span className="tabular-nums"><span className="text-text-3 mx-1">·</span>NM <span className="text-text-1 font-medium">{cnTotals.hubPo.toLocaleString()}</span></span>}
                          {cnTotals.lcnb > 0 && (() => {
                            const match = findToByDestCn(r.cn);
                            const fromShort = match ? match.fromCn.replace(/^CN-/, "") : "";
                            const fromLabel = match ? `TO-${fromShort}` : "TO";
                            return (
                              <>
                                <span className="text-text-3 mx-1">·</span>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setLcnbToDetail(match ?? null); }}
                                  title={match ? `${match.code}: ${match.fromCn} → ${match.toCn} · Nháp · click để xem chi tiết TO` : "Chuyển ngang LCNB"}
                                  className="inline-flex items-center gap-0.5 rounded-full border border-warning/30 bg-warning-bg px-1.5 py-0.5 text-[11px] font-semibold text-warning tabular-nums hover:bg-warning hover:text-warning-foreground transition-colors"
                                >
                                  {fromLabel} {cnTotals.lcnb.toLocaleString()}
                                </button>
                              </>
                            );
                          })()}
                          {r.gap > 0 && (
                            <span className="ml-2 inline-flex items-center gap-0.5 rounded-full border border-danger/30 bg-danger-bg px-1.5 py-0.5 text-[11px] font-semibold text-danger tabular-nums align-middle">
                              ⚠️ {r.gap.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {sev === "short" && (
                          <button onClick={(e) => { e.stopPropagation(); toggleRow(rowKey); }}
                            className="rounded-button bg-gradient-primary text-primary-foreground px-3 py-1 text-caption font-semibold inline-flex items-center gap-1">
                            Xử lý <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                        {sev === "watch" && (
                          <button onClick={(e) => { e.stopPropagation(); toggleRow(rowKey); }}
                            className="rounded-button border border-surface-3 px-3 py-1 text-caption font-medium text-text-2 hover:text-text-1 inline-flex items-center gap-1">
                            Chi tiết <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                        {sev === "ok" && <span className="text-text-3 text-caption">—</span>}
                      </td>
                    </tr>

                    {/* Expanded SKU breakdown */}
                    {isOpen && (
                      <tr>
                        <td colSpan={7} className="bg-surface-1/40 px-4 py-3 border-b border-surface-3">
                          <div className="text-caption text-text-3 mb-2">
                            Chi tiết {r.cn} — {r.allSkus.length} mã hàng
                          </div>
                          <table className="w-full text-table-sm">
                            <thead>
                              <tr className="text-text-3 text-caption">
                                <th className="text-left py-1 font-medium">Mã hàng</th>
                                <th className="text-right py-1 font-medium">Nhu cầu</th>
                                <th className="text-right py-1 font-medium">Phân bổ</th>
                                <th className="text-right py-1 font-medium">Lấp đầy</th>
                                <th className="text-left py-1 font-medium pl-3">Nguồn</th>
                                <th className="text-left py-1 font-medium">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.allSkus.map((sk, i) => {
                                const skuFill = sk.fillPct;
                                const skuShort = sk.demand - sk.allocated;
                                const skuSev = severityOf(skuFill);
                                return (
                                  <Fragment key={i}>
                                    <tr className="border-t border-surface-3/40">
                                      <td className="py-1.5 text-text-1 font-medium">{sk.item} <span className="text-text-3 font-normal">(tổng)</span></td>
                                      <td className="py-1.5 text-right tabular-nums">{sk.demand.toLocaleString()}</td>
                                      <td className="py-1.5 text-right tabular-nums">{sk.allocated.toLocaleString()}</td>
                                      <td className={cn("py-1.5 text-right tabular-nums font-semibold",
                                        skuSev === "ok" && "text-success",
                                        skuSev === "watch" && "text-warning",
                                        skuSev === "short" && "text-danger")}>
                                        {skuFill}% {skuSev === "ok" && "✅"} {skuSev === "short" && "🔴"}
                                      </td>
                                      <td className="py-1.5 pl-3">
                                        <div className="flex flex-wrap gap-1">
                                          {sk.sources.onHand > 0 && <SourceBadge kind="onHand" qty={sk.sources.onHand} />}
                                          {sk.sources.pipeline > 0 && <SourceBadge kind="pipeline" qty={sk.sources.pipeline} />}
                                          {sk.sources.hubPo > 0 && <SourceBadge kind="hubPo" qty={sk.sources.hubPo} />}
                                          {sk.sources.lcnbIn > 0 && <SourceBadge kind="lcnb" qty={sk.sources.lcnbIn} />}
                                        </div>
                                      </td>
                                      <td className="py-1.5">
                                        {skuSev === "ok" && <span className="text-success text-caption">Đủ hàng</span>}
                                        {skuSev === "watch" && <span className="text-warning text-caption">Theo dõi</span>}
                                        {skuSev === "short" && <span className="text-danger text-caption">Thiếu {skuShort.toLocaleString()}</span>}
                                      </td>
                                    </tr>

                                    {/* Inline action box for shortages */}
                                    {skuSev === "short" && (
                                      <tr>
                                        <td colSpan={6} className="pb-3 pt-1 px-2">
                                          <div className="rounded border border-danger/30 bg-danger-bg/20 p-3">
                                            <div className="text-table-sm font-medium text-text-1 mb-2">
                                              Gợi ý cho {sk.item} thiếu {skuShort.toLocaleString()}m²:
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                              <button
                                                onClick={() => toast.success(`Đã tạo TO chuyển ngang → ${r.cn} ${skuShort}m² ${sk.item}`)}
                                                className="rounded-button border border-success/40 bg-success-bg/40 px-3 py-1.5 text-caption font-medium text-success hover:bg-success-bg">
                                                ✅ Chuyển ngang từ CN sibling (1 ngày, ~3,2 triệu ₫)
                                              </button>
                                              <button
                                                onClick={() => toast.success(`Đã tạo PO mới NM cho ${sk.item}`)}
                                                className="rounded-button border border-info/40 bg-info-bg/40 px-3 py-1.5 text-caption font-medium text-info hover:bg-info-bg">
                                                📦 Đặt PO mới NM (14 ngày, ~11 triệu ₫)
                                              </button>
                                              <button
                                                onClick={() => toast.info("Đã đánh dấu chờ tuần sau")}
                                                className="rounded-button border border-surface-3 bg-surface-1 px-3 py-1.5 text-caption font-medium text-text-2 hover:text-text-1">
                                                ⏸️ Chờ tuần sau (HSTK còn 4 ngày)
                                              </button>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Footer note */}
      <div className="mt-4 flex items-center gap-2 text-caption text-text-3">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        <span>
          DRP đêm qua đã xử lý {data.length} CN · {counts.ok} đủ hàng · {counts.watch} theo dõi · {counts.short} thiếu hàng.
          Click bất kỳ bước nào ở trên để xem chi tiết tính toán.
        </span>
      </div>

      {/* ═══ APPROVE & HAND-OFF CTA — cuối Bước 3 ═══ */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
        {(() => {
          const exceptionCount = data.reduce((a, r) => a + r.exceptionList.length, 0);
          const disabled = actionsDisabled;
          return (
            <button
              onClick={() => handleApproveAndHandoff(false)}
              disabled={disabled}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-button px-6 py-3 text-table font-semibold shadow-sm transition-all",
                disabled
                  ? "bg-surface-3 text-text-3 cursor-not-allowed"
                  : exceptionCount > 0
                  ? "bg-warning text-primary-foreground hover:opacity-90"
                  : "bg-success text-primary-foreground hover:opacity-90"
              )}
              title={
                isViewingOldVersion ? "Đang xem phiên cũ — không duyệt được"
                  : drpLocked ? "Phiên đã khóa — không duyệt được"
                  : exceptionCount > 0 ? `Còn ${exceptionCount} ngoại lệ chưa xử lý`
                  : "Duyệt kết quả & chuyển sang Đơn hàng"
              }
            >
              {exceptionCount > 0
                ? <>⚠️ Duyệt với {exceptionCount} ngoại lệ & Chuyển sang Đơn hàng <ArrowRight className="h-4 w-4" /></>
                : <>✅ Duyệt kết quả & Chuyển sang Đơn hàng <ArrowRight className="h-4 w-4" /></>}
            </button>
          );
        })()}
      </div>
      </>)}


      {/* ── VERSION HISTORY PANEL (Sheet 420px slide-from-right) ── */}
      <VersionHistoryPanel
        entityType="DRP"
        entityId="DRP-W20"
        versions={drpVersions}
        currentVersion={viewingVersion}
        activeVersion={activeDrpVersion}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSwitchVersion={(v, eid) => {
          setViewingVersion(v);
          setViewingEntityId(eid);
          setHistoryOpen(false);
          if (v !== activeDrpVersion || eid !== "DRP-W20") {
            toast.info(`Đang xem snapshot ${eid} v${v}`, {
              description: "Mọi thay đổi đã khóa cho đến khi quay về phiên hiện hành.",
            });
          }
        }}
        onCompare={(v1, v2, eid) => {
          setViewingEntityId(eid);
          setViewingVersion(v1);
          setCompareRightVersion(v2);
          setCompareMode(true);
          setHistoryOpen(false);
        }}
      />

      {/* ── LOCK / UNLOCK DIALOG ── */}
      <VersionLockDialog
        open={lockDialogOpen}
        onClose={() => setLockDialogOpen(false)}
        mode={drpLocked ? "unlock" : "lock"}
        entityLabel="DRP W20"
        versionNumber={viewingVersion}
        onConfirm={(reason) => {
          if (drpLocked) {
            setDrpLocked(null);
            toast.success(`Đã mở khóa DRP W20 v${viewingVersion}`, { description: reason || undefined });
          } else {
            const now = new Date();
            const at = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
            setDrpLocked({ by: "Thùy", at, reason });
            toast.success(`Đã khóa DRP W20 v${viewingVersion}`, { description: `Bởi Thùy lúc ${at}${reason ? ` · ${reason}` : ""}` });
          }
        }}
      />

      {/* ── APPROVE-WITH-EXCEPTIONS CONFIRM ── */}
      <Dialog open={approveExceptionDialog} onOpenChange={(v) => !v && setApproveExceptionDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Còn ngoại lệ chưa xử lý</DialogTitle>
          </DialogHeader>
          <p className="text-table-sm text-text-2">
            DRP W20 v{viewingVersion} còn {data.reduce((a, r) => a + r.exceptionList.length, 0)} ngoại lệ chưa xử lý.
            Bạn vẫn muốn duyệt và chuyển sang Đơn hàng?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveExceptionDialog(false)}>Hủy</Button>
            <Button onClick={() => handleApproveAndHandoff(true)}>
              Duyệt với ngoại lệ ⚠️
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── LCNB TO DETAIL POPUP ── */}
      <Dialog open={lcnbToDetail !== null} onOpenChange={(v) => !v && setLcnbToDetail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono text-base">{lcnbToDetail?.code}</DialogTitle>
          </DialogHeader>
          {lcnbToDetail && (
            <div className="space-y-2 text-table-sm">
              <div className="text-text-2">
                <span className="text-text-3">Tuyến: </span>
                <span className="font-medium">{lcnbToDetail.fromCn} → {lcnbToDetail.toCn}</span>
              </div>
              <div className="text-text-2">
                <span className="text-text-3">Mã hàng: </span>
                <span className="font-medium">{lcnbToDetail.sku}</span>
                <span className="text-text-3"> · </span>
                <span className="tabular-nums font-medium">{lcnbToDetail.qty} m²</span>
                <span className="text-text-3"> · </span>
                <span className="tabular-nums">{lcnbToDetail.costM.toFixed(1).replace(".", ",")}M₫</span>
              </div>
              <div className="text-text-2">
                <span className="text-text-3">Trạng thái: </span>
                <span className="inline-block rounded-full bg-warning-bg text-warning border border-warning/30 px-1.5 py-0.5 text-[10px] font-medium">Nháp</span>
                <span className="text-text-3"> · ETA 1-2 ngày</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLcnbToDetail(null)}>Đóng</Button>
            <Button onClick={() => { setLcnbToDetail(null); navigate("/orders?tab=approval&filter=TO"); }}>
              Duyệt TO <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

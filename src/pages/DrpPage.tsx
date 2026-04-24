import { useState, useMemo, useEffect, Fragment } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useTenant } from "@/components/TenantContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Play, ChevronDown, ChevronRight, ArrowRight, Lock as LockIcon,
  CheckCircle2, AlertTriangle, Info,
} from "lucide-react";
import { ClickableNumber } from "@/components/ClickableNumber";
import { TermTooltip } from "@/components/TermTooltip";
import { BatchLockBanner, useBatchLock } from "@/components/BatchLockBanner";
import { DrpReleaseBar, type DrpBatch, type DrpBatchStatus } from "@/components/drp/DrpReleaseBar";
import { useRbac } from "@/components/RbacContext";
import { usePlanningPeriod } from "@/components/PlanningPeriodContext";
import { supabase } from "@/integrations/supabase/client";
import { BRANCHES, DRP_RESULTS } from "@/data/unis-enterprise-dataset";

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
    const toRows = [
      { code: "TO-HCM-BD-W20-001", from: "CN-HCM", to: "CN-BD", sku: "GA-600 A4", qty: 200 },
      { code: "TO-QN-NA-W20-001",  from: "CN-QN",  to: "CN-NA", sku: "GA-300 A4", qty: 180 },
      { code: "TO-HN-NA-W20-002",  from: "CN-HN",  to: "CN-NA", sku: "GM-300 A4", qty: 95 },
      { code: "TO-DN-CT-W20-001",  from: "CN-DN",  to: "CN-CT", sku: "GA-300 B2", qty: 80 },
    ];
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
      <div className="rounded border border-info/30 bg-info-bg/30 px-3 py-2 mt-1">
        <div className="text-info">⏸ TP-003 Toko→DN giữ lại — fill 53%, chờ gom</div>
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

  if (stepId === 11) return (
    <div className="space-y-2 text-table-sm">
      <div className="flex justify-between"><span>PO chờ duyệt</span><span className="tabular-nums font-medium">5</span></div>
      <div className="flex justify-between"><span>TO chuyển ngang</span><span className="tabular-nums font-medium">2</span></div>
      <div className="flex justify-between"><span>PO khẩn (RPO)</span><span className="tabular-nums font-medium text-danger">1</span></div>
      <button onClick={() => navigate("/orders?tab=approval")}
        className="mt-2 w-full rounded-button bg-gradient-primary text-primary-foreground px-3 py-2 text-table-sm font-semibold flex items-center justify-center gap-1.5">
        Mở Đơn hàng — Duyệt PO/TO <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );

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
   §  MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function DrpPage() {
  const { tenant } = useTenant();
  const s = tenantScales[tenant] || 1;
  const navigate = useNavigate();
  const { canApprove } = useRbac();
  const { current: planCycle } = usePlanningPeriod();

  /* ── Step navigation ── */
  const [activeStep, setActiveStep] = useState<number>(5);

  /* ── Pivot ── */
  const [pivot, setPivot] = useState<"cn" | "sku">("cn");

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

  /* ── DRP run handler ── */
  const handleRunDrp = async () => {
    if (isPlanLocked) {
      toast.error("Plan đã khoá. Hủy hoặc release batch hiện tại trước khi chạy lại.");
      return;
    }
    setDrpRunning(true);
    setDrpStep(0);
    setTimeout(() => setDrpStep(1), 800);
    setTimeout(() => setDrpStep(2), 1600);
    setTimeout(async () => {
      setDrpRunning(false);
      setDrpStep(0);

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
          toast.success("DRP hoàn tất — chờ Review & Approve", {
            description: `Batch ${batch.id}: ${items.filter(i => i.kind === "RPO").length} RPO + ${items.filter(i => i.kind === "TO").length} TO`,
          });
        }
      } catch (err) {
        toast.warning("Batch tạo cục bộ — không lưu được DB");
      }
    }, 2400);
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

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h1 className="text-h2 font-display font-bold text-text-1">Kết quả DRP — Tuần 20</h1>
          <p className="text-table-sm text-text-3 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>{batchStatus === "released" ? "Đã release sang Đơn hàng" : "Chạy lúc 23:02 đêm qua"}</span>
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
        {isPlanLocked ? (
          <div className="flex items-center gap-2 rounded-button bg-surface-2 text-text-3 px-4 py-2 border border-surface-3">
            <LockIcon className="h-4 w-4" /> Đã khoá plan
          </div>
        ) : (
          <button onClick={handleRunDrp}
            className="flex items-center gap-2 rounded-button bg-gradient-primary text-primary-foreground px-5 py-2.5 text-table font-semibold shadow-sm hover:shadow-md transition-shadow">
            <Play className="h-4 w-4" /> Chạy lại DRP
          </button>
        )}
      </div>

      {/* ── VERSION ROW ── */}
      <div className="flex flex-wrap items-center gap-2 mb-4 text-table-sm">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success border border-success/30 px-2.5 py-0.5 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          DRP W20 v3 · Active
        </span>
        <button
          onClick={() => toast.info(isPlanLocked ? "Plan đã khoá" : "Khoá plan để bảo vệ kết quả DRP")}
          className="inline-flex items-center gap-1 rounded-button border border-surface-3 bg-surface-2 px-2.5 py-1 text-text-2 hover:text-text-1">
          <LockIcon className="h-3 w-3" /> Khoá
        </button>
        <button
          onClick={() => toast.info("So sánh với v2 — sẽ mở panel")}
          className="inline-flex items-center gap-1 rounded-button border border-surface-3 bg-surface-2 px-2.5 py-1 text-text-2 hover:text-text-1">
          So sánh <ChevronDown className="h-3 w-3" />
        </button>
        <button
          onClick={() => toast.info("Lịch sử v1, v2, v3 — sẽ mở panel")}
          className="inline-flex items-center gap-1 rounded-button border border-surface-3 bg-surface-2 px-2.5 py-1 text-text-2 hover:text-text-1">
          Lịch sử <ChevronDown className="h-3 w-3" />
        </button>
      </div>

      {/* ── DRP progress ── */}
      {drpRunning && (
        <div className="mb-4 rounded-card border border-primary/30 bg-primary/5 p-4 animate-fade-in">
          <div className="flex items-center gap-6">
            {["Netting", "Allocation", "PO generation"].map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold",
                  drpStep > i ? "bg-success text-primary-foreground" : drpStep === i ? "bg-primary text-primary-foreground animate-pulse" : "bg-surface-3 text-text-3")}>
                  {drpStep > i ? "✓" : i + 1}
                </div>
                <span className={cn("text-table-sm", drpStep >= i ? "text-text-1 font-medium" : "text-text-3")}>{label}</span>
                {i < 2 && <div className={cn("w-12 h-0.5", drpStep > i ? "bg-success" : "bg-surface-3")} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SS change banner ── */}
      <button onClick={() => navigate("/monitoring")}
        className="mb-4 w-full rounded-card border border-info/30 bg-info-bg/30 px-4 py-2.5 flex items-center gap-2 text-table-sm text-text-2 hover:border-info/50 transition-colors text-left">
        <Info className="h-4 w-4 text-info shrink-0" />
        <span>📊 SS thay đổi tuần này: <span className="font-medium text-text-1">GA-300 CN-BD 900→1.035 (+15%)</span></span>
        <span className="ml-auto text-info text-caption flex items-center gap-1">Xem chi tiết <ArrowRight className="h-3 w-3" /></span>
      </button>

      {/* ═══ FLOW STEPPER ═══ */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-3">
          {PHASES.map((phase, pi) => (
            <div key={phase.name} className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-text-3 font-semibold mb-1.5">{phase.name}</div>
              <div className="flex flex-wrap gap-1.5">
                {phase.steps.map(step => {
                  const active = activeStep === step.id;
                  return (
                    <button key={step.id} onClick={() => setActiveStep(step.id)}
                      className={cn(
                        "relative min-w-[58px] rounded border px-2 py-1.5 text-left transition-all",
                        active ? "border-primary bg-primary/10 shadow-sm" : "border-surface-3 bg-surface-1 hover:border-primary/40"
                      )}>
                      <div className={cn("text-[10px] font-bold tabular-nums", active ? "text-primary" : "text-text-3")}>
                        {step.id < 10 ? `0${step.id}` : step.id}
                      </div>
                      <div className={cn("text-[11px] leading-tight font-medium mt-0.5", active ? "text-text-1" : "text-text-2")}>
                        {step.label}
                      </div>
                      <StepBadgeDot b={step.badge} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Step detail */}
        <div className="rounded border border-surface-3 bg-surface-1/40 p-3">
          <div className="text-table-sm font-semibold text-text-1 mb-2 flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {activeStep}
            </span>
            <span>
              {PHASES.flatMap(p => p.steps).find(s => s.id === activeStep)?.label}
            </span>
          </div>
          <StepDetail stepId={activeStep} scale={s} />
        </div>
      </div>

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
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
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
                          {cnTotals.lcnb > 0 && (
                            <>
                              <span className="text-text-3 mx-1">·</span>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); navigate("/orders?tab=approval&filter=TO"); }}
                                className="inline-flex items-center gap-0.5 rounded-full bg-warning-bg text-warning border border-warning/30 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums hover:bg-warning hover:text-warning-foreground transition-colors"
                                title="Mở Đơn hàng → Duyệt TO (LCNB)"
                              >
                                TO {cnTotals.lcnb.toLocaleString()}
                              </button>
                            </>
                          )}
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

      {/* Footer note */}
      <div className="mt-4 flex items-center gap-2 text-caption text-text-3">
        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
        <span>
          DRP đêm qua đã xử lý {data.length} CN · {counts.ok} đủ hàng · {counts.watch} theo dõi · {counts.short} thiếu hàng.
          Click bất kỳ bước nào ở trên để xem chi tiết tính toán.
        </span>
      </div>
    </AppLayout>
  );
}

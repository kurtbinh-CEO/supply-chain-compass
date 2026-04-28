import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Lock, CheckCircle, AlertTriangle } from "lucide-react";
import { ViewPivotToggle, usePivotMode, WorstCnCell, CnGapBadge, LcnbBadge } from "@/components/ViewPivotToggle";
import { toast } from "sonner";
import { FormulaBar } from "@/components/FormulaBar";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import type { ConsensusRow } from "@/pages/SopPage";

interface Props {
  data: ConsensusRow[];
  totalV3: number;
  totalAop: number;
  locked: boolean;
  onLock: () => void;
  tenant: string;
  unresolvedVariance?: number;
}

interface BalanceRow {
  cn: string;
  demand: number;
  stock: number;
  pipeline: number;
  ssTarget: number;
  skus: { item: string; variant: string; demand: number; stock: number; pipeline: number; pipelineSource: string; ss: number; netReq: number; nmSource: string; nmAtp: number; match: string }[];
}

const baseBalance: BalanceRow[] = [
  { cn: "CN-BD", demand: 2550, stock: 450, pipeline: 557, ssTarget: 900,
    skus: [
      { item: "GA-300", variant: "A4", demand: 617, stock: 120, pipeline: 557, pipelineSource: "Toko", ss: 450, netReq: 270, nmSource: "Mikado", nmAtp: 1500, match: "COVERED ✅" },
      { item: "GA-600", variant: "A4", demand: 881, stock: 60, pipeline: 0, pipelineSource: "", ss: 400, netReq: 1221, nmSource: "Toko", nmAtp: 960, match: "SHORT 261 🔴" },
    ] },
  { cn: "CN-ĐN", demand: 1800, stock: 1200, pipeline: 400, ssTarget: 800,
    skus: [
      { item: "GA-400", variant: "A4", demand: 870, stock: 700, pipeline: 250, pipelineSource: "Đồng Tâm", ss: 500, netReq: 0, nmSource: "", nmAtp: 0, match: "COVERED ✅" },
      { item: "GA-600", variant: "A4", demand: 560, stock: 500, pipeline: 150, pipelineSource: "Vigracera", ss: 300, netReq: 0, nmSource: "", nmAtp: 0, match: "COVERED ✅" },
    ] },
  { cn: "CN-HN", demand: 2100, stock: 800, pipeline: 500, ssTarget: 700,
    skus: [
      { item: "GA-300", variant: "C1", demand: 500, stock: 400, pipeline: 300, pipelineSource: "Mikado", ss: 400, netReq: 0, nmSource: "", nmAtp: 0, match: "COVERED ✅" },
      { item: "GA-600", variant: "B2", demand: 530, stock: 400, pipeline: 200, pipelineSource: "Toko", ss: 300, netReq: 0, nmSource: "", nmAtp: 0, match: "COVERED ✅" },
    ] },
  { cn: "CN-CT", demand: 1200, stock: 750, pipeline: 300, ssTarget: 500,
    skus: [
      { item: "GA-400", variant: "D5", demand: 430, stock: 400, pipeline: 150, pipelineSource: "Đồng Tâm", ss: 250, netReq: 0, nmSource: "", nmAtp: 0, match: "COVERED ✅" },
      { item: "GA-600", variant: "A4", demand: 480, stock: 350, pipeline: 150, pipelineSource: "Vigracera", ss: 250, netReq: 0, nmSource: "", nmAtp: 0, match: "COVERED ✅" },
    ] },
];

const decisionLog = [
  { initials: "TH", who: "Trần Hùng (Vùng)", when: "2024-05-12 14:20", action: "Ghi đè v3 CN-BD +150", note: "Nhà thầu mới Q2" },
  { initials: "LM", who: "Lê Minh (Cung ứng)", when: "2024-05-11 09:15", action: "Duyệt cân đối", note: "Toko đã xác nhận hàng đang về" },
  { initials: "NQ", who: "Nguyễn Quân (Kinh doanh)", when: "2024-05-10 17:45", action: "Gửi v1 Kinh doanh", note: "Flash sale E-commerce" },
];

export function BalanceLockTab({ data, totalV3, totalAop, locked, onLock, tenant, unresolvedVariance = 0 }: Props) {
  const navigate = useNavigate();
  const scale = tenant === "TTC Agris" ? 0.75 : tenant === "Mondelez" ? 1.2 : 1;
  const [pivotMode, setPivotMode] = usePivotMode("sop-balance");
  const [expandedCns, setExpandedCns] = useState<Set<number>>(new Set());
  const [expandedSkuKeys, setExpandedSkuKeys] = useState<Set<string>>(new Set());
  const [showLockModal, setShowLockModal] = useState(false);

  // Use consensus data for demand, scale balance data
  const balRows = baseBalance.map((b, i) => ({
    ...b,
    demand: data[i]?.v3 || Math.round(b.demand * scale),
    stock: Math.round(b.stock * scale),
    pipeline: Math.round(b.pipeline * scale),
    ssTarget: Math.round(b.ssTarget * scale),
    skus: b.skus.map(s => ({
      ...s,
      demand: Math.round(s.demand * scale),
      stock: Math.round(s.stock * scale),
      pipeline: Math.round(s.pipeline * scale),
      ss: Math.round(s.ss * scale),
      netReq: Math.round(s.netReq * scale),
      nmAtp: Math.round(s.nmAtp * scale),
    })),
  }));

  const totalDemand = balRows.reduce((a, r) => a + r.demand, 0);
  const totalStock = balRows.reduce((a, r) => a + r.stock, 0);
  const totalPipeline = balRows.reduce((a, r) => a + r.pipeline, 0);
  const netReq = Math.max(0, totalDemand - totalStock - totalPipeline);
  const ssBuffer = Math.round(1200 * scale);
  const fcMin = netReq + ssBuffer;

  // FormulaBar data derived from balance rows
  const stockDetailForBar = balRows.map(r => ({
    cn: r.cn,
    onHand: Math.round(r.stock * 4.5), // approximate full on-hand
    reserved: Math.round(r.stock * 3.5),
    available: r.stock,
    hstk: r.cn === "CN-BD" ? 5.2 : r.cn === "CN-ĐN" ? 14 : r.cn === "CN-HN" ? 9 : 11,
    updated: "14:32 WMS",
  }));

  const netPerCnForBar = balRows.map(r => ({
    cn: r.cn,
    demand: r.demand,
    stock: r.stock,
    pipeline: r.pipeline,
    net: Math.max(0, r.demand - r.stock - r.pipeline),
  }));

  const handleLock = () => {
    onLock();
    setShowLockModal(false);
    toast.success("✅ S&OP Đồng thuận đã khóa — Ngày 7", { description: "Phasing tự động chạy. Cam kết FC gửi cho 5 NM." });
    setTimeout(() => navigate("/hub"), 1500);
  };

  const [expandedSku, setExpandedSku] = useState<number | null>(null);
  const [bridgeSku, setBridgeSku] = useState<number | null>(null);

  /* ═══ SKU-first pivot ═══ */
  interface BalSkuPivot {
    item: string; variant: string; demand: number; stock: number; pipeline: number; netReq: number;
    worstCn: string; worstCover: number; cnGapCount: number; lcnb: string | null;
    cnBreakdown: { cn: string; demand: number; stock: number; pipeline: number; cover: number; ssTarget: number; ssGap: number; netReq: number; status: string }[];
  }

  const skuPivotData: BalSkuPivot[] = (() => {
    if (pivotMode !== "sku") return [];
    const map = new Map<string, BalSkuPivot>();
    balRows.forEach(row => {
      row.skus.forEach(sk => {
        const key = `${sk.item}|${sk.variant}`;
        if (!map.has(key)) {
          map.set(key, { item: sk.item, variant: sk.variant, demand: 0, stock: 0, pipeline: 0, netReq: 0, worstCn: "", worstCover: Infinity, cnGapCount: 0, lcnb: null, cnBreakdown: [] });
        }
        const r = map.get(key)!;
        r.demand += sk.demand; r.stock += sk.stock; r.pipeline += sk.pipeline; r.netReq += sk.netReq;
        const avail = sk.stock + sk.pipeline;
        const cover = sk.demand > 0 ? sk.stock / (sk.demand / 30) : 99;
        const rowNet = Math.max(0, sk.demand - avail);
        if (cover < r.worstCover) { r.worstCover = cover; r.worstCn = row.cn; }
        if (rowNet > 0) r.cnGapCount++;
        const ssGap = sk.stock - sk.ss;
        r.cnBreakdown.push({ cn: row.cn, demand: sk.demand, stock: sk.stock, pipeline: sk.pipeline, cover: +cover.toFixed(1), ssTarget: sk.ss, ssGap, netReq: rowNet, status: rowNet > 0 ? "CRITICAL" : ssGap > 0 ? "EXCESS" : "OK" });
      });
    });
    // detect LCNB
    map.forEach(r => {
      const excess = r.cnBreakdown.filter(c => c.status === "EXCESS");
      const short = r.cnBreakdown.filter(c => c.status === "CRITICAL");
      if (excess.length > 0 && short.length > 0) {
        r.lcnb = `${excess[0].cn}→${short[0].cn} ${Math.min(Math.abs(excess[0].ssGap), short[0].netReq)}m²`;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.demand - a.demand);
  })();

  /* Drill-down views removed — now using expandable inline rows in tables below */

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Formula bar */}
      <FormulaBar
        demand={totalDemand}
        stock={totalStock}
        pipeline={totalPipeline}
        ssBuffer={ssBuffer}
        stockDetail={stockDetailForBar}
        netPerCn={netPerCnForBar}
      />

      {/* Pivot toggle */}
      <ViewPivotToggle value={pivotMode} onChange={(m) => { setPivotMode(m); setExpandedCns(new Set()); setExpandedSkuKeys(new Set()); }} />

      {/* Balance table — SmartTable parent + drillDown compact */}
      {pivotMode === "sku" ? (
        <BalanceSkuTable
          rows={skuPivotData}
          totals={{ demand: totalDemand, stock: totalStock, pipeline: totalPipeline, netReq }}
        />
      ) : (
        <BalanceCnTable
          rows={balRows}
          totals={{
            demand: totalDemand,
            stock: totalStock,
            pipeline: totalPipeline,
            ssTarget: balRows.reduce((a, r) => a + r.ssTarget, 0),
            netReq,
          }}
        />
      )}

      {/* Alert cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-card border border-danger/30 bg-danger-bg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-danger mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-table font-semibold text-danger mb-1">CN-BD cover 2,5d CRITICAL</p>
            <p className="text-table-sm text-text-2 mb-2">Net requirement {balRows[0] ? Math.max(0, balRows[0].demand - balRows[0].stock - balRows[0].pipeline).toLocaleString() : 0}m²</p>
            <span className="text-danger text-table-sm font-medium">
              Mở dòng CN-BD trong bảng để xem SKU ▸
            </span>
          </div>
        </div>
        <div className="rounded-card border border-info/30 bg-info-bg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-info mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-table font-semibold text-info mb-1">CN-ĐN excess stock</p>
            <p className="text-table-sm text-text-2 mb-2">Khả năng lateral transfer cho CN-BD</p>
            <button className="text-info text-table-sm font-medium hover:underline">Lateral transfer ▸</button>
          </div>
        </div>
      </div>

      {/* AOP Section */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-3">
          <h3 className="font-display text-section-header text-text-1">AOP Reconciliation</h3>
        </div>
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1/50">
              {["Metric", "AOP target", "Consensus", "Delta", "Action"].map(h => (
                <th key={h} className="px-5 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { metric: "Volume (m²)", aop: totalAop.toLocaleString(), cons: totalV3.toLocaleString(), delta: `+${Math.round(((totalV3 - totalAop) / totalAop) * 100)}%`, action: "Sales giải trình", warn: true },
              { metric: "Revenue (₫)", aop: `${(totalAop * 3000).toLocaleString()}`, cons: `${(totalV3 * 3000).toLocaleString()}`, delta: `+${Math.round(((totalV3 - totalAop) / totalAop) * 100)}%`, action: "Cơ hội tăng trưởng", warn: false },
              { metric: "WC impact (₫)", aop: `${(Math.round(totalAop * 0.19)).toLocaleString()}`, cons: `${(Math.round(totalV3 * 0.19)).toLocaleString()}`, delta: `+${Math.round(((totalV3 - totalAop) / totalAop) * 100)}%`, action: "Cần thêm vốn", warn: true },
            ].map((r, i) => (
              <tr key={i} className={cn("border-b border-surface-3/50", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                <td className="px-5 py-2.5 font-medium text-text-1">{r.metric}</td>
                <td className="px-5 py-2.5 tabular-nums text-text-2">{r.aop}</td>
                <td className="px-5 py-2.5 tabular-nums text-text-1 font-medium">{r.cons}</td>
                <td className={cn("px-5 py-2.5 tabular-nums font-medium", r.warn ? "text-warning" : "text-success")}>{r.delta} {r.warn ? "⚠" : ""}</td>
                <td className="px-5 py-2.5 text-text-2">{r.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Variance gate banner */}
      {!locked && unresolvedVariance > 0 && (
        <div className="rounded-card border border-danger/40 bg-danger-bg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-danger mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-table font-semibold text-danger mb-0.5">
              Còn {unresolvedVariance} CN có chênh lệch top-down vs bottom-up &gt; ±10%
            </p>
            <p className="text-table-sm text-text-2">
              Quay lại tab <span className="font-medium text-text-1">Consensus</span> để giải thích trước khi khóa S&OP.
            </p>
          </div>
        </div>
      )}

      {/* Lock Section */}
      <div className={cn("rounded-card border p-5", locked ? "border-success/30 bg-success-bg" : "border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10")}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className={cn("font-display text-lg font-bold", locked ? "text-success" : "text-primary")}>
              {locked ? "✅ Locked 14/05 14:32" : "S&OP Consensus Lock"}
            </h3>
            <p className="text-table-sm text-text-2 mt-0.5">
              {locked ? "Consensus đã lock. Phasing auto-run. FC commitment đã gửi." : "Lock consensus để bắt đầu phasing và FC commitment."}
            </p>
          </div>
          {!locked ? (
            <button
              onClick={() => unresolvedVariance === 0 && setShowLockModal(true)}
              disabled={unresolvedVariance > 0}
              title={unresolvedVariance > 0 ? `Còn ${unresolvedVariance} CN có chênh lệch >10% chưa giải thích — quay lại tab Consensus.` : undefined}
              className={cn(
                "rounded-button px-6 py-2.5 text-table font-medium flex items-center gap-2 shadow-lg transition-opacity",
                unresolvedVariance > 0
                  ? "bg-surface-3 text-text-3 cursor-not-allowed opacity-70"
                  : "bg-gradient-primary text-white",
              )}
            >
              <Lock className="h-4 w-4" /> Lock Consensus
              {unresolvedVariance > 0 && (
                <span className="rounded-full bg-danger text-danger-foreground text-caption font-bold px-1.5 py-0.5 ml-1">
                  {unresolvedVariance}
                </span>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="rounded-button bg-success/20 text-success px-4 py-2 text-table-sm font-medium cursor-default">✅ Locked 14/05 14:32</span>
              <button className="rounded-button border border-surface-3 text-text-3 px-3 py-2 text-table-sm hover:text-text-1">Unlock cần CEO</button>
            </div>
          )}
        </div>

        {/* Decision log */}
        <div className="rounded-card border border-surface-3 bg-surface-0 overflow-hidden">
          <div className="px-4 py-2 border-b border-surface-3 bg-surface-1/50">
            <span className="text-table-header uppercase text-text-3">Decision Log</span>
          </div>
          <table className="w-full text-table-sm">
            <tbody>
              {decisionLog.map((log, i) => (
                <tr key={i} className="border-b border-surface-3/50 last:border-0">
                  <td className="px-4 py-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-primary flex items-center justify-center text-[9px] font-semibold text-white">{log.initials}</div>
                  </td>
                  <td className="px-3 py-2 text-text-1">{log.who}</td>
                  <td className="px-3 py-2 text-text-3 font-mono text-[11px]">{log.when}</td>
                  <td className="px-3 py-2 text-text-1 font-medium">{log.action}</td>
                  <td className="px-3 py-2 text-text-3">{log.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lock Modal */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowLockModal(false)}>
          <div className="rounded-card bg-surface-0 border border-surface-3 shadow-2xl p-6 max-w-md w-full mx-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-bold text-text-1">Lock S&OP Tháng 5</h3>
            </div>
            <p className="text-table text-text-1 mb-1 font-bold">Consensus: {totalV3.toLocaleString()} m²</p>
            <p className="text-table-sm text-text-2 mb-4">Sau khi lock:</p>
            <ul className="text-table-sm text-text-2 space-y-1.5 mb-5 ml-4 list-disc">
              <li>Phasing M→W tự động chạy (28/25/24/23%)</li>
              <li>FC commitment gửi cho 5 NM</li>
              <li>Không sửa được nữa (trừ SC Manager + CEO override)</li>
            </ul>
            <div className="flex items-center gap-3 justify-end">
              <button onClick={() => setShowLockModal(false)} className="rounded-button border border-surface-3 text-text-2 px-4 py-2 text-table-sm hover:bg-surface-2">Hủy</button>
              <button onClick={handleLock} className="rounded-button bg-gradient-primary text-white px-5 py-2 text-table-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" /> Xác nhận Lock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

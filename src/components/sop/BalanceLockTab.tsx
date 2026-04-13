import { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Lock, CheckCircle, ChevronRight, ChevronLeft, AlertTriangle, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { ViewPivotToggle, usePivotMode, WorstCnCell, CnGapBadge, LcnbBadge } from "@/components/ViewPivotToggle";
import { SkuNmPanel } from "./SkuNmPanel";
import { toast } from "sonner";
import { FormulaBar } from "@/components/FormulaBar";
import { DemandToOrderBridge, type BridgeStep } from "@/components/DemandToOrderBridge";
import type { ConsensusRow } from "@/pages/SopPage";

interface Props {
  data: ConsensusRow[];
  totalV3: number;
  totalAop: number;
  locked: boolean;
  onLock: () => void;
  tenant: string;
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
  { initials: "TH", who: "Trần Hùng (Regional)", when: "2024-05-12 14:20", action: "Override v3 CN-BD +150", note: "Nhà thầu mới Q2" },
  { initials: "LM", who: "Lê Minh (Supply)", when: "2024-05-11 09:15", action: "Approve balance", note: "Pipeline Toko confirmed" },
  { initials: "NQ", who: "Nguyễn Quân (Sales)", when: "2024-05-10 17:45", action: "Submit v1 Sales", note: "Flash sale E-commerce" },
];

export function BalanceLockTab({ data, totalV3, totalAop, locked, onLock, tenant }: Props) {
  const navigate = useNavigate();
  const scale = tenant === "TTC Agris" ? 0.75 : tenant === "Mondelez" ? 1.2 : 1;
  const [pivotMode, setPivotMode] = usePivotMode("sop-balance");
  const [drillCn, setDrillCn] = useState<number | null>(null);
  const [drillSku, setDrillSku] = useState<string | null>(null);
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
    toast.success("✅ S&OP Consensus Locked — Day 7", { description: "Phasing auto-run. FC commitment gửi cho 5 NM." });
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

  /* ═══ SKU-first drill ═══ */
  if (pivotMode === "sku" && drillSku) {
    const skuRow = skuPivotData.find(r => `${r.item}|${r.variant}` === drillSku);
    if (!skuRow) return null;
    return (
      <div className="space-y-5 animate-fade-in">
        <FormulaBar demand={totalDemand} stock={totalStock} pipeline={totalPipeline} ssBuffer={ssBuffer} stockDetail={stockDetailForBar} netPerCn={netPerCnForBar} />
        <div className="flex items-center gap-2 text-table-sm">
          <button onClick={() => setDrillSku(null)} className="text-primary font-medium hover:underline flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Per SKU
          </button>
          <span className="text-text-3">/</span>
          <span className="text-text-1 font-medium">{skuRow.item} {skuRow.variant} (demand {skuRow.demand.toLocaleString()}m²)</span>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["CN", "Demand", "Stock", "Pipeline", "Cover", "SS target", "SS gap", "Net req", "Status"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skuRow.cnBreakdown.map((cb, i) => (
                  <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-primary/5", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                    <td className="px-3 py-2.5 font-medium text-text-1">{cb.cn}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-1">{cb.demand.toLocaleString()}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-1">{cb.stock.toLocaleString()}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-2">{cb.pipeline.toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("tabular-nums font-medium text-table-sm", cb.cover < 7 ? "text-danger" : "text-success")}>
                        {cb.cover}d {cb.cover < 7 ? "🔴" : "🟢"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-text-3">{cb.ssTarget.toLocaleString()}</td>
                    <td className={cn("px-3 py-2.5 tabular-nums font-medium", cb.ssGap < 0 ? "text-danger" : "text-success")}>
                      {cb.ssGap > 0 ? "+" : ""}{cb.ssGap.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-medium text-text-1">{cb.netReq.toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-caption font-bold",
                        cb.status === "CRITICAL" ? "bg-danger-bg text-danger" : cb.status === "EXCESS" ? "bg-info-bg text-info" : "bg-success-bg text-success"
                      )}>{cb.status}</span>
                    </td>
                  </tr>
                ))}
                <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                  <td className="px-3 py-2.5 text-text-1">TOTAL</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{skuRow.demand.toLocaleString()}</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{skuRow.stock.toLocaleString()}</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{skuRow.pipeline.toLocaleString()}</td>
                  <td colSpan={3} />
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{skuRow.netReq.toLocaleString()}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        {skuRow.lcnb && (
          <div className="rounded-card border border-info/30 bg-info-bg p-3 text-table-sm">
            <span className="font-medium text-info">💡 LCNB opportunity: {skuRow.lcnb}</span>
          </div>
        )}
      </div>
    );
  }

  // CN-first drill down view
  if (pivotMode === "cn" && drillCn !== null) {
    const row = balRows[drillCn];
    const avail = row.stock + row.pipeline;
    const cover = row.demand > 0 ? +(row.stock / (row.demand / 30)).toFixed(1) : 0;
    const rowNet = Math.max(0, row.demand - avail);

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2 text-table-sm">
          <button onClick={() => { setDrillCn(null); setExpandedSku(null); }} className="text-primary font-medium hover:underline flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Cân đối
          </button>
          <span className="text-text-3">/</span>
          <span className="text-text-1 font-medium">{row.cn} (net req {rowNet.toLocaleString()}, cover {cover}d)</span>
        </div>

        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["Item", "Variant", "Demand", "Stock", "Pipeline", "Net req", "NM status", "Gap", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {row.skus.map((sk, si) => {
                  const skuGap = sk.netReq > 0 ? Math.max(0, sk.netReq - sk.nmAtp) : 0;
                  const isExpanded = expandedSku === si;
                  return (
                    <>
                      <tr key={si} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors cursor-pointer",
                        isExpanded ? "bg-primary/5" : si % 2 === 0 ? "bg-surface-0" : "bg-surface-2"
                      )} onClick={() => setExpandedSku(isExpanded ? null : si)}>
                        <td className="px-4 py-2.5 font-medium text-text-1">{sk.item}</td>
                        <td className="px-4 py-2.5 text-text-2">{sk.variant}</td>
                        <td className="px-4 py-2.5 tabular-nums text-text-1 font-medium">{sk.demand.toLocaleString()}</td>
                        <td className="px-4 py-2.5 tabular-nums text-text-1">{sk.stock.toLocaleString()}</td>
                        <td className="px-4 py-2.5 tabular-nums text-text-2">
                          {sk.pipeline > 0 ? `${sk.pipeline.toLocaleString()} (${sk.pipelineSource})` : "0"}
                        </td>
                        <td className={cn("px-4 py-2.5 tabular-nums font-medium", sk.netReq > 0 ? "text-danger" : "text-success")}>
                          {sk.netReq.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5">
                          {sk.nmSource ? (
                            <span className="text-table-sm">
                              <span className="font-medium text-text-1">{sk.nmSource}</span>{" "}
                              <span className="tabular-nums text-text-2">{sk.nmAtp.toLocaleString()}</span>{" "}
                              <span className={cn("font-medium", sk.match.includes("SHORT") ? "text-danger" : "text-success")}>
                                {sk.match.includes("SHORT") ? "⚠ stale" : "✅"}
                              </span>
                            </span>
                          ) : (
                            <span className="text-text-3">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {skuGap > 0 ? (
                            <span className="tabular-nums font-bold text-danger">−{skuGap.toLocaleString()} 🔴</span>
                          ) : (
                            <span className="tabular-nums font-bold text-success">0</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <button className="text-primary text-table-sm font-medium hover:underline flex items-center gap-0.5">
                            Xem NM {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`panel-${si}`}>
                          <td colSpan={9} className="p-0">
                            <div className="border-t border-surface-3 bg-surface-1/20">
                              <SkuNmPanel
                                item={sk.item}
                                variant={sk.variant}
                                netReq={sk.netReq}
                                primaryNm={sk.nmSource}
                                primaryAtp={sk.nmAtp}
                                scale={scale}
                                onSourceConfirm={(sources) => {
                                  toast.success(`Sourcing ${sk.item} ${sk.variant} confirmed: ${sources.length} NM`);
                                }}
                              />
                              <div className="px-5 py-2 border-t border-surface-3/50">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setBridgeSku(bridgeSku === si ? null : si); }}
                                  className="text-info text-caption font-medium hover:underline flex items-center gap-1"
                                >
                                  {bridgeSku === si ? "Ẩn bridge ▴" : "Xem bridge ▾"}
                                </button>
                                {bridgeSku === si && (
                                  <div className="mt-2">
                                    <DemandToOrderBridge
                                      item={sk.item}
                                      variant={sk.variant}
                                      cn={row.cn}
                                      steps={[
                                        { operator: "", label: "Demand", value: sk.demand, accent: "blue", detail: `S&OP consensus locked`, link: { label: "→ /demand", to: "/demand" }, explain: "Tổng nhu cầu tháng này.", logicTab: "monthly", logicNode: 0 },
                                        { operator: "−", label: "Tồn kho", value: -sk.stock, accent: "green", detail: `Tồn kho ${row.cn}`, link: { label: "→ /monitoring", to: "/monitoring" }, explain: "Hàng có sẵn trong kho CN." },
                                        { operator: "−", label: "Pipeline", value: -sk.pipeline, accent: "green", detail: sk.pipelineSource ? `${sk.pipelineSource}` : "Không có", explain: "Hàng đang về." },
                                        { operator: "=", label: "Gross gap", value: sk.demand - sk.stock - sk.pipeline, accent: "amber", detail: `${sk.demand} − ${sk.stock} − ${sk.pipeline}`, explain: "Chênh lệch chưa tính SS." },
                                        { operator: "+", label: "SS buffer", value: sk.ss, accent: "red", detail: `z(1.65) × σ × √LT`, link: { label: "→ /logic tab SS", to: "/logic?tab=ss&node=0" }, explain: "Dự phòng forecast sai.", logicTab: "ss", logicNode: 0 },
                                        { operator: "=", label: "Net req", value: sk.netReq, accent: "amber", detail: `${sk.demand - sk.stock - sk.pipeline} + ${sk.ss} = ${sk.netReq}`, explain: "Cần đặt NM (chưa round MOQ). MOQ xử lý tại /hub." },
                                      ] satisfies BridgeStep[]}
                                      toStep={5}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

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
      <ViewPivotToggle value={pivotMode} onChange={(m) => { setPivotMode(m); setDrillCn(null); setDrillSku(null); }} />

      {/* Balance table */}
      {pivotMode === "sku" ? (
        /* ═══ SKU-FIRST Layer 1 ═══ */
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-3">
            <h3 className="font-display text-section-header text-text-1">Per SKU — Tháng 5</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["Item", "Variant", "Demand", "Stock", "Pipeline", "Net req", "Worst CN", "# CN gap", "LCNB", ""].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skuPivotData.map((row, i) => (
                  <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors cursor-pointer", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}
                    onClick={() => setDrillSku(`${row.item}|${row.variant}`)}>
                    <td className="px-3 py-2.5 font-medium text-text-1">{row.item}</td>
                    <td className="px-3 py-2.5 text-text-2">{row.variant}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-1 font-medium">{row.demand.toLocaleString()}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-1">{row.stock.toLocaleString()}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-2">{row.pipeline.toLocaleString()}</td>
                    <td className={cn("px-3 py-2.5 tabular-nums font-medium", row.netReq > 0 ? "text-danger" : "text-success")}>{row.netReq.toLocaleString()}</td>
                    <td className="px-3 py-2.5"><WorstCnCell cnName={row.worstCn} hstk={row.worstCover} /></td>
                    <td className="px-3 py-2.5"><CnGapBadge count={row.cnGapCount} /></td>
                    <td className="px-3 py-2.5">{row.lcnb ? <LcnbBadge text={row.lcnb} /> : <span className="text-text-3">—</span>}</td>
                    <td className="px-3 py-2.5"><ChevronRight className="h-3.5 w-3.5 text-text-3" /></td>
                  </tr>
                ))}
                <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                  <td className="px-3 py-2.5 text-text-1">TOTAL</td>
                  <td />
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{totalDemand.toLocaleString()}</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{totalStock.toLocaleString()}</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{totalPipeline.toLocaleString()}</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{netReq.toLocaleString()}</td>
                  <td colSpan={4} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-3 flex items-center justify-between">
          <h3 className="font-display text-section-header text-text-1">Per Location — Tháng 5</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                {["CN", "Demand", "Stock", "Pipeline", "Available", "Cover", "SS target", "SS gap", "Net req", "Status", ""].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {balRows.map((row, i) => {
                const avail = row.stock + row.pipeline;
                const cover = row.demand > 0 ? +(row.stock / (row.demand / 30)).toFixed(1) : 0;
                const ssGap = row.stock - row.ssTarget;
                const rowNet = Math.max(0, row.demand - avail);
                const isCrit = cover < 7;
                const isExcess = cover > 12 && ssGap > 0;
                const status = isCrit ? "CRITICAL" : isExcess ? "EXCESS" : "OK";
                const coverPct = Math.min(100, (cover / 15) * 100);

                return (
                  <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                    <td className="px-3 py-2.5 font-medium text-text-1">{row.cn}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-1 font-medium">{row.demand.toLocaleString()}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-1">{row.stock.toLocaleString()}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-2">{row.pipeline.toLocaleString()}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-1">{avail.toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-2 rounded-full bg-surface-3 overflow-hidden">
                          <div className={cn("h-full rounded-full", cover < 5 ? "bg-danger" : cover < 10 ? "bg-warning" : "bg-success")}
                            style={{ width: `${coverPct}%` }} />
                        </div>
                        <span className={cn("tabular-nums font-medium text-table-sm", isCrit ? "text-danger" : "text-success")}>
                          {cover}d {isCrit ? "🔴" : "🟢"}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-text-1">{row.ssTarget.toLocaleString()}</td>
                    <td className={cn("px-3 py-2.5 tabular-nums font-medium", ssGap < 0 ? "text-danger" : "text-success")}>
                      {ssGap > 0 ? "+" : ""}{ssGap.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums font-medium text-text-1">{rowNet.toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-caption font-bold",
                        status === "CRITICAL" ? "bg-danger-bg text-danger" : status === "EXCESS" ? "bg-info-bg text-info" : "bg-success-bg text-success"
                      )}>{status}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => setDrillCn(i)} className="text-primary text-table-sm font-medium hover:underline flex items-center gap-0.5">
                        Xem SKU <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {/* Total */}
              <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                <td className="px-3 py-2.5 text-text-1">TOTAL</td>
                <td className="px-3 py-2.5 tabular-nums text-text-1">{totalDemand.toLocaleString()}</td>
                <td className="px-3 py-2.5 tabular-nums text-text-1">{totalStock.toLocaleString()}</td>
                <td className="px-3 py-2.5 tabular-nums text-text-1">{totalPipeline.toLocaleString()}</td>
                <td className="px-3 py-2.5 tabular-nums text-text-1">{(totalStock + totalPipeline).toLocaleString()}</td>
                <td className="px-3 py-2.5 tabular-nums text-text-2">
                  {totalDemand > 0 ? (totalStock / (totalDemand / 30)).toFixed(1) : 0}d
                </td>
                <td className="px-3 py-2.5 tabular-nums text-text-1">{balRows.reduce((a, r) => a + r.ssTarget, 0).toLocaleString()}</td>
                <td className={cn("px-3 py-2.5 tabular-nums font-medium", (totalStock - balRows.reduce((a, r) => a + r.ssTarget, 0)) >= 0 ? "text-success" : "text-danger")}>
                  {(totalStock - balRows.reduce((a, r) => a + r.ssTarget, 0)) > 0 ? "+" : ""}
                  {(totalStock - balRows.reduce((a, r) => a + r.ssTarget, 0)).toLocaleString()}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-text-1">{netReq.toLocaleString()}</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Alert cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-card border border-danger/30 bg-danger-bg p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-danger mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-table font-semibold text-danger mb-1">CN-BD cover 2,5d CRITICAL</p>
            <p className="text-table-sm text-text-2 mb-2">Net requirement {balRows[0] ? Math.max(0, balRows[0].demand - balRows[0].stock - balRows[0].pipeline).toLocaleString() : 0}m²</p>
            <button onClick={() => setDrillCn(0)} className="text-danger text-table-sm font-medium hover:underline flex items-center gap-0.5">
              Xem SKU <ChevronRight className="h-3.5 w-3.5" />
            </button>
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
            <button onClick={() => setShowLockModal(true)}
              className="rounded-button bg-gradient-primary text-white px-6 py-2.5 text-table font-medium flex items-center gap-2 shadow-lg">
              <Lock className="h-4 w-4" /> Lock Consensus
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

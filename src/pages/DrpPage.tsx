import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { useTenant } from "@/components/TenantContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, AlertTriangle, ArrowRight, Play, Settings, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const tenantScales: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.7, "Mondelez": 1.35 };

/* ═══ DATA TYPES ═══ */
interface AllocLayer { name: string; qty: number; pass: boolean; delta?: number; explain: string }

interface SkuException {
  item: string; variant: string; demand: number; allocated: number; gap: number;
  type: "SHORTAGE" | "WATCH"; suggestion: string;
  netting: { fcPhased: number; onHand: number; pipeline: number; ssTarget: number; netReq: number };
  allocLayers: AllocLayer[];
  options: { label: string; source: string; qty: number; cost: string; time: string; savingVsB: string; recommended?: boolean }[];
}

interface SkuFull {
  item: string; variant: string; demand: number; allocated: number; fillPct: number; status: string;
}

interface CnRow {
  cn: string; demand: number; available: number; fillRate: number; gap: number; exceptions: number;
  exceptionList: SkuException[]; allSkus: SkuFull[];
  rpos: number;
}

/* ═══ SS DATA ═══ */
interface SsCnRow { cn: string; ssTotal: number; adequate: number; breaches: number; wc: string; rec: string }
interface SsSkuRow { item: string; variant: string; ssCurrent: number; z: number; sigma: number; lt: number; ssProposed: number; delta: number; wcImpact: string }

const baseSsCn: SsCnRow[] = [
  { cn: "CN-BD", ssTotal: 2900, adequate: 72, breaches: 12, wc: "389M₫", rec: "↑ Tăng SS 15% → +58M₫" },
  { cn: "CN-ĐN", ssTotal: 2400, adequate: 146, breaches: 0, wc: "650M₫", rec: "↓ Giảm SS 10% → −65M₫" },
  { cn: "CN-HN", ssTotal: 2100, adequate: 105, breaches: 2, wc: "407M₫", rec: "→ Giữ" },
  { cn: "CN-CT", ssTotal: 1500, adequate: 107, breaches: 1, wc: "296M₫", rec: "→ Giữ" },
];

const ssBdSkus: SsSkuRow[] = [
  { item: "GA-300", variant: "A4", ssCurrent: 900, z: 1.65, sigma: 28.5, lt: 14, ssProposed: 1035, delta: 135, wcImpact: "+25M₫/tháng" },
  { item: "GA-300", variant: "B2", ssCurrent: 700, z: 1.65, sigma: 22.1, lt: 12, ssProposed: 700, delta: 0, wcImpact: "0" },
  { item: "GA-400", variant: "A4", ssCurrent: 600, z: 1.65, sigma: 18.3, lt: 14, ssProposed: 600, delta: 0, wcImpact: "0" },
  { item: "GA-600", variant: "A4", ssCurrent: 1000, z: 1.65, sigma: 32.0, lt: 10, ssProposed: 950, delta: -50, wcImpact: "−9M₫/tháng" },
];

const drpParams = [
  { key: "Horizon", value: "6 tuần", desc: "DRP nhìn trước bao xa" },
  { key: "Run time", value: "23:00", desc: "Nightly auto-run" },
  { key: "Service level", value: "95% (z=1.65)", desc: "Target availability" },
  { key: "Lot sizing", value: "MOQ round ceil", desc: "Cách round đơn hàng" },
  { key: "LCNB enabled", value: "✅", desc: "Scan lateral trước PO" },
  { key: "LCNB cost threshold", value: "70%", desc: "Chỉ lateral nếu rẻ hơn 70% vs PO" },
];

const changeLog = [
  { time: "12/05 14:30", who: "Thúy", change: "SS GA-300 A4 CN-BD: 900→1.035", reason: "Stockout 2x tháng qua" },
  { time: "10/05 09:15", who: "System", change: "LCNB threshold: 60%→70%", reason: "Auto-adjust from closed-loop" },
];

/* ═══ LAYER 1 DATA ═══ */
const baseData: CnRow[] = [
  {
    cn: "CN-BD", demand: 2550, available: 1007, fillRate: 86, gap: 345, exceptions: 2, rpos: 3,
    exceptionList: [
      {
        item: "GA-300", variant: "A4", demand: 617, allocated: 272, gap: 345, type: "SHORTAGE",
        suggestion: "LCNB: CN-ĐN thừa 220. Tiết kiệm 32M₫",
        netting: { fcPhased: 524, onHand: 450, pipeline: 557, ssTarget: 900, netReq: 345 },
        allocLayers: [
          { name: "L1 Source", qty: 617, pass: true, explain: "Demand từ FC phased 524 + B2B 93 = 617" },
          { name: "L2 Variant", qty: 617, pass: true, explain: "Variant A4 match 100%" },
          { name: "L3 FIFO", qty: 500, pass: true, explain: "FIFO sắp xếp theo ngày nhập kho" },
          { name: "L4 Fair", qty: 500, pass: true, explain: "Fair share 100% (CN-BD only requestor)" },
          { name: "L5 SS Guard", qty: 272, pass: false, delta: -228, explain: "On-hand 450 − SS 900 = −450. Chỉ allocate 272 (phần trên SS). SS guard không cho phép allocate dưới safety stock." },
          { name: "L6 Lateral", qty: 0, pass: true, explain: "Chưa có lateral approved" },
        ],
        options: [
          { label: "A. Lateral", source: "CN-ĐN excess 220m²", qty: 220, cost: "8,8M₫", time: "1 ngày", savingVsB: "−55M₫ (86%)" },
          { label: "B. PO mới", source: "Mikado", qty: 345, cost: "63,8M₫", time: "14 ngày", savingVsB: "baseline" },
          { label: "C. Kết hợp", source: "Lateral 220 + PO 125", qty: 345, cost: "31,9M₫", time: "1+14 ngày", savingVsB: "−31,9M₫ (50%)", recommended: true },
        ],
      },
      {
        item: "GA-400", variant: "A4", demand: 347, allocated: 297, gap: 50, type: "WATCH",
        suggestion: "ETA Mikado 17/05 sẽ cover",
        netting: { fcPhased: 310, onHand: 800, pipeline: 0, ssTarget: 600, netReq: 50 },
        allocLayers: [
          { name: "L1 Source", qty: 347, pass: true, explain: "Demand từ FC phased 310 + adj 37" },
          { name: "L2 Variant", qty: 347, pass: true, explain: "Variant A4 match" },
          { name: "L3 FIFO", qty: 347, pass: true, explain: "FIFO OK" },
          { name: "L4 Fair", qty: 347, pass: true, explain: "Fair share 100%" },
          { name: "L5 SS Guard", qty: 297, pass: false, delta: -50, explain: "On-hand 800 − SS 600 = 200. Allocate 297 (giới hạn available)." },
          { name: "L6 Lateral", qty: 0, pass: true, explain: "Không cần — watch only" },
        ],
        options: [],
      },
    ],
    allSkus: [
      { item: "GA-300", variant: "A4", demand: 617, allocated: 272, fillPct: 44, status: "SHORTAGE" },
      { item: "GA-300", variant: "B2", demand: 178, allocated: 178, fillPct: 100, status: "OK" },
      { item: "GA-400", variant: "A4", demand: 347, allocated: 297, fillPct: 86, status: "WATCH" },
      { item: "GA-600", variant: "A4", demand: 881, allocated: 881, fillPct: 100, status: "OK" },
      { item: "GA-600", variant: "B2", demand: 527, allocated: 527, fillPct: 100, status: "OK" },
    ],
  },
  { cn: "CN-ĐN", demand: 1800, available: 1600, fillRate: 100, gap: 0, exceptions: 0, rpos: 1, exceptionList: [], allSkus: [] },
  { cn: "CN-HN", demand: 2100, available: 1300, fillRate: 100, gap: 0, exceptions: 0, rpos: 2, exceptionList: [], allSkus: [] },
  { cn: "CN-CT", demand: 1200, available: 1050, fillRate: 100, gap: 0, exceptions: 0, rpos: 1, exceptionList: [], allSkus: [] },
];

export default function DrpPage() {
  const { tenant } = useTenant();
  const s = tenantScales[tenant] || 1;
  const navigate = useNavigate();
  const [drillCn, setDrillCn] = useState<string | null>(null);
  const [showAllSkus, setShowAllSkus] = useState(false);
  const [expandedExceptions, setExpandedExceptions] = useState<Set<string>>(new Set());
  const [expandOptions, setExpandOptions] = useState<string | null>(null);
  const [showLayer3, setShowLayer3] = useState(false);
  const [ssDrillCn, setSsDrillCn] = useState<string | null>(null);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simZ, setSimZ] = useState(1.65);
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [showDrpConfirm, setShowDrpConfirm] = useState(false);
  const [drpRunning, setDrpRunning] = useState(false);
  const [drpStep, setDrpStep] = useState(0);

  const data = baseData.map((r) => ({
    ...r,
    demand: Math.round(r.demand * s), available: Math.round(r.available * s), gap: Math.round(r.gap * s),
    exceptionList: r.exceptionList.map((e) => ({
      ...e, demand: Math.round(e.demand * s), allocated: Math.round(e.allocated * s), gap: Math.round(e.gap * s),
      netting: {
        ...e.netting,
        fcPhased: Math.round(e.netting.fcPhased * s), onHand: Math.round(e.netting.onHand * s),
        pipeline: Math.round(e.netting.pipeline * s), ssTarget: Math.round(e.netting.ssTarget * s),
        netReq: Math.round(e.netting.netReq * s),
      },
      allocLayers: e.allocLayers.map((l) => ({ ...l, qty: Math.round(l.qty * s), delta: l.delta ? Math.round(l.delta * s) : undefined })),
      options: e.options.map((o) => ({ ...o, qty: Math.round(o.qty * s) })),
    })),
    allSkus: r.allSkus.map((sk) => ({ ...sk, demand: Math.round(sk.demand * s), allocated: Math.round(sk.allocated * s) })),
  }));

  const totalDemand = data.reduce((a, r) => a + r.demand, 0);
  const totalGap = data.reduce((a, r) => a + r.gap, 0);
  const totalExc = data.reduce((a, r) => a + r.exceptions, 0);
  const totalRpos = data.reduce((a, r) => a + r.rpos, 0);
  const totalFill = totalDemand > 0 ? Math.round(((totalDemand - totalGap) / totalDemand) * 1000) / 10 : 100;
  const activeCn = drillCn ? data.find((r) => r.cn === drillCn) : null;

  const toggleException = (key: string) => {
    setExpandedExceptions((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const drpStepLabels = ["Netting", "Allocation", "PO generation"];

  const handleRunDrp = () => {
    setShowDrpConfirm(false);
    setDrpRunning(true);
    setDrpStep(0);
    setTimeout(() => setDrpStep(1), 800);
    setTimeout(() => setDrpStep(2), 1600);
    setTimeout(() => {
      setDrpRunning(false);
      setDrpStep(0);
      toast.success("DRP hoàn tất", { description: `${totalExc} exceptions. ${totalRpos} RPOs.` });
    }, 2400);
  };

  const handleChooseOption = (opt: typeof baseData[0]["exceptionList"][0]["options"][0]) => {
    if (opt.recommended) {
      toast.success(`Đã chọn: ${opt.label}`, { description: "TO + RPO tạo → Workspace duyệt" });
    } else if (opt.label.includes("Lateral")) {
      toast.success(`Đã chọn: ${opt.label}`, { description: "Transfer Order tạo → Workspace duyệt" });
    } else {
      toast.success(`Đã chọn: ${opt.label}`, { description: "RPO draft tạo → /orders" });
    }
    setExpandOptions(null);
  };

  const currentLayer = showLayer3 ? 3 : activeCn ? 2 : 1;

  return (
    <AppLayout>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <ScreenHeader title="DRP & Phân bổ" subtitle="Distribution Requirements Planning + Allocation" />
          {totalExc > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-danger-bg px-3 py-1 text-table-sm font-medium text-danger">
              <AlertTriangle className="h-3.5 w-3.5" /> {totalExc} exceptions
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-caption text-text-3 block">Lần chạy cuối: 23:02 đêm qua</span>
            <button onClick={() => setShowDrpConfirm(true)} className="text-caption text-primary font-medium hover:underline">Chạy lại ngay</button>
          </div>
          <button
            onClick={() => setShowDrpConfirm(true)}
            className="flex items-center gap-2 rounded-button bg-gradient-primary text-primary-foreground px-5 py-2.5 text-table font-semibold shadow-sm hover:shadow-md transition-shadow"
          >
            <Play className="h-4 w-4" /> Chạy DRP
          </button>
        </div>
      </div>

      {/* ── DRP Progress Bar ── */}
      {drpRunning && (
        <div className="mb-4 rounded-card border border-primary/30 bg-primary/5 p-4 animate-fade-in">
          <div className="flex items-center gap-6">
            {drpStepLabels.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={cn("h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-colors",
                  drpStep > i ? "bg-success text-white" : drpStep === i ? "bg-primary text-white animate-pulse" : "bg-surface-3 text-text-3"
                )}>
                  {drpStep > i ? "✓" : i + 1}
                </div>
                <span className={cn("text-table-sm font-medium", drpStep >= i ? "text-text-1" : "text-text-3")}>{label}</span>
                {i < 2 && <div className={cn("w-12 h-0.5 rounded", drpStep > i ? "bg-success" : "bg-surface-3")} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Persistent Breadcrumb ── */}
      <div className="flex items-center gap-1.5 text-table-sm mb-4">
        <button
          onClick={() => { setDrillCn(null); setShowLayer3(false); setShowAllSkus(false); setExpandedExceptions(new Set()); setExpandOptions(null); }}
          className={cn("transition-colors", currentLayer === 1 ? "text-text-1 font-semibold" : "text-primary hover:underline cursor-pointer")}
        >
          Kết quả
        </button>
        {currentLayer >= 2 && !showLayer3 && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-text-3" />
            <span className="text-text-1 font-semibold">{activeCn?.cn} <span className="text-text-3 font-normal">(fill {activeCn?.fillRate}%, gap {activeCn?.gap.toLocaleString()})</span></span>
          </>
        )}
        {showLayer3 && (
          <>
            <ChevronRight className="h-3.5 w-3.5 text-text-3" />
            <span className="text-text-1 font-semibold">Tham số{ssDrillCn && <> › <span className="text-text-2">{ssDrillCn}</span></>}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button
          onClick={() => { setShowLayer3(!showLayer3); setDrillCn(null); }}
          className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-table-sm font-medium transition-colors",
            showLayer3 ? "border-primary bg-primary/10 text-primary" : "border-surface-3 bg-surface-2 text-text-2 hover:text-text-1"
          )}
        >
          <Settings className="h-3.5 w-3.5" /> Tham số
        </button>
      </div>

      {/* ═══ LỚP 1: Per CN (default) ═══ */}
      {!activeCn && !showLayer3 && (
        <div className="rounded-card border border-surface-3 bg-surface-2 animate-slide-in-left">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  <th className="w-10 px-3 py-2.5"></th>
                  {["CN", "Demand (m²)", "Có sẵn", "Fill rate", "Gap", "Exceptions", "RPOs planned", "Action"].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.cn} className={cn("border-b border-surface-3/50 cursor-pointer hover:bg-surface-1/30", r.gap > 0 && "bg-danger-bg/20")} onClick={() => setDrillCn(r.cn)}>
                    <td className="px-3 py-3 text-text-3"><ChevronRight className="h-4 w-4" /></td>
                    <td className="px-4 py-3 text-table font-medium text-text-1">{r.cn}</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-1">{r.demand.toLocaleString()}</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-2">{r.available.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-surface-3 overflow-hidden">
                          <div className={cn("h-full rounded-full", r.fillRate >= 95 ? "bg-success" : r.fillRate >= 85 ? "bg-warning" : "bg-danger")} style={{ width: `${Math.min(r.fillRate, 100)}%` }} />
                        </div>
                        <span className={cn("text-table-sm font-medium", r.fillRate >= 95 ? "text-success" : r.fillRate >= 85 ? "text-warning" : "text-danger")}>
                          {r.fillRate}% {r.fillRate >= 95 ? "🟢" : r.fillRate >= 85 ? "🟡" : "🔴"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-table tabular-nums">
                      {r.gap > 0 ? <span className="text-danger font-medium">{r.gap.toLocaleString()}</span> : <span className="text-text-3">0</span>}
                    </td>
                    <td className="px-4 py-3 text-table">
                      {r.exceptions > 0 ? <span className="text-danger font-medium">{r.exceptions} items</span> : <span className="text-text-3">0</span>}
                    </td>
                    <td className="px-4 py-3 text-table text-text-2">{r.rpos} RPO{r.rpos !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3">
                      {r.exceptions > 0 ? (
                        <span className="text-primary text-table-sm font-medium">Chi tiết ▸</span>
                      ) : <span className="text-text-3">—</span>}
                    </td>
                  </tr>
                ))}
                <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                  <td></td>
                  <td className="px-4 py-3 text-table text-text-1">TOTAL</td>
                  <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalDemand.toLocaleString()}</td>
                  <td className="px-4 py-3 text-table tabular-nums text-text-2">{data.reduce((a, r) => a + r.available, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-table-sm font-medium text-text-1">{totalFill}%</td>
                  <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalGap.toLocaleString()}</td>
                  <td className="px-4 py-3 text-table text-text-1">{totalExc}</td>
                  <td className="px-4 py-3 text-table text-text-1">{totalRpos} RPOs</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══ LỚP 2: Per SKU (drill into CN) ═══ */}
      {activeCn && !showLayer3 && (
        <div className="animate-slide-in-right space-y-4">
          {/* Section A: Exceptions with expandable netting + allocation */}
          <div className="rounded-card border border-surface-3 bg-surface-2">
            <div className="px-5 py-3 border-b border-surface-3">
              <h3 className="font-display text-body font-semibold text-text-1">Exceptions ({activeCn.exceptionList.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["", "Item", "Variant", "Demand", "Allocated", "Gap", "Loại", "Gợi ý", "Action"].map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCn.exceptionList.map((ex, i) => {
                    const exKey = `${ex.item}-${ex.variant}`;
                    const isExpanded = expandedExceptions.has(exKey);
                    return (
                      <>
                        <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-surface-1/30 cursor-pointer", isExpanded && "bg-surface-1/20")} onClick={() => toggleException(exKey)}>
                          <td className="px-3 py-3 text-text-3">{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                          <td className="px-4 py-3 text-table font-medium text-text-1">{ex.item}</td>
                          <td className="px-4 py-3 text-table text-text-2">{ex.variant}</td>
                          <td className="px-4 py-3 text-table tabular-nums text-text-1">{ex.demand.toLocaleString()}</td>
                          <td className="px-4 py-3 text-table tabular-nums text-text-2">{ex.allocated.toLocaleString()}</td>
                          <td className="px-4 py-3 text-table tabular-nums font-medium text-danger">{ex.gap.toLocaleString()} 🔴</td>
                          <td className="px-4 py-3">
                            <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium",
                              ex.type === "SHORTAGE" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"
                            )}>{ex.type}</span>
                          </td>
                          <td className="px-4 py-3 text-caption text-text-2 max-w-[200px]">{ex.suggestion}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            {ex.type === "SHORTAGE" && ex.options.length > 0 && (
                              <button
                                onClick={() => setExpandOptions(expandOptions === exKey ? null : exKey)}
                                className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium"
                              >
                                Xử lý ▸
                              </button>
                            )}
                            {ex.type === "WATCH" && (
                              <button onClick={() => toast.info("Đang chờ ETA cover")} className="rounded-button border border-surface-3 px-2.5 py-1 text-caption font-medium text-text-3">Chờ</button>
                            )}
                          </td>
                        </tr>

                        {/* ── Expanded: Section A (Netting) + Section B (Allocation) ── */}
                        {isExpanded && (
                          <tr key={`detail-${i}`}>
                            <td colSpan={9} className="p-0">
                              <div className="bg-surface-1/40 border-t border-surface-3 px-6 py-4 space-y-4">
                                {/* SECTION A: Netting Formula */}
                                <div>
                                  <h4 className="text-caption font-medium text-text-3 uppercase mb-2">Netting Formula</h4>
                                  <div className="flex items-center gap-2 flex-wrap font-mono text-table text-text-1">
                                    <button onClick={() => navigate("/demand")} className="rounded bg-info-bg/50 border border-info/20 px-2 py-1 hover:bg-info-bg transition-colors cursor-pointer" title="→ /demand tab 1">
                                      FC phased <span className="font-bold">{ex.netting.fcPhased.toLocaleString()}</span>
                                    </button>
                                    <span className="text-text-3">−</span>
                                    <button onClick={() => navigate("/monitoring")} className="rounded bg-success-bg/50 border border-success/20 px-2 py-1 hover:bg-success-bg transition-colors cursor-pointer" title="→ /monitoring tab 1">
                                      On-hand <span className="font-bold">{ex.netting.onHand.toLocaleString()}</span>
                                    </button>
                                    <span className="text-text-3">−</span>
                                    <span className="rounded bg-warning-bg/50 border border-warning/20 px-2 py-1">
                                      Pipeline <span className="font-bold">{ex.netting.pipeline.toLocaleString()}</span>
                                    </span>
                                    <span className="text-text-3">+</span>
                                    <span className="rounded bg-surface-3/50 border border-surface-3 px-2 py-1">
                                      SS <span className="font-bold">{ex.netting.ssTarget.toLocaleString()}</span>
                                    </span>
                                    <span className="text-text-3">=</span>
                                    <span className={cn("rounded px-2 py-1 font-bold", ex.netting.netReq > 0 ? "bg-danger-bg text-danger" : "bg-success-bg text-success")}>
                                      Net req {ex.netting.netReq.toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                {/* SECTION B: Allocation 6-layer trace */}
                                <div>
                                  <h4 className="text-caption font-medium text-text-3 uppercase mb-2">Allocation Trace (6 layers)</h4>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {ex.allocLayers.map((layer, li) => (
                                      <div key={li} className="flex items-center gap-1">
                                        <div className="group relative">
                                          <span className={cn(
                                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium cursor-help border",
                                            layer.pass ? "bg-success-bg text-success border-success/20" : "bg-danger-bg text-danger border-danger/20"
                                          )}>
                                            {layer.name.split(" ")[0]} {layer.pass ? "✓" : "✗"}{layer.qty}
                                            {layer.delta && <span>({layer.delta > 0 ? "+" : ""}{layer.delta})</span>}
                                          </span>
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-surface-0 border border-surface-3 rounded-lg p-3 text-caption text-text-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                                            <strong className="text-text-1 block mb-1">{layer.name}</strong>
                                            {layer.explain}
                                          </div>
                                        </div>
                                        {li < ex.allocLayers.length - 1 && <span className="text-text-3 text-[10px]">→</span>}
                                      </div>
                                    ))}
                                    <span className="text-text-3 text-[10px]">→</span>
                                    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold border border-primary/20">
                                      Final: {ex.allocated.toLocaleString()}
                                    </span>
                                  </div>
                                </div>

                                {/* SECTION C: Options (expand on Xử lý click) */}
                                {expandOptions === exKey && ex.options.length > 0 && (
                                  <div>
                                    <h4 className="text-caption font-medium text-text-3 uppercase mb-2">Options xử lý</h4>
                                    <table className="w-full">
                                      <thead>
                                        <tr className="border-b border-surface-3/50">
                                          {["Option", "Source", "Qty (m²)", "Cost", "Time", "Savings vs B", ""].map((h, j) => (
                                            <th key={j} className="px-3 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {ex.options.map((opt, j) => (
                                          <tr key={j} className={cn("border-b border-surface-3/30", opt.recommended && "bg-success/5")}>
                                            <td className="px-3 py-2.5 text-table font-medium text-text-1">{opt.recommended && "★ "}{opt.label}</td>
                                            <td className="px-3 py-2.5 text-table text-text-2">{opt.source}</td>
                                            <td className="px-3 py-2.5 text-table tabular-nums text-text-1">{opt.qty.toLocaleString()}</td>
                                            <td className="px-3 py-2.5 text-table text-text-2">{opt.cost}</td>
                                            <td className="px-3 py-2.5 text-table text-text-2">{opt.time}</td>
                                            <td className="px-3 py-2.5 text-table text-text-2">{opt.savingVsB}</td>
                                            <td className="px-3 py-2.5">
                                              <button
                                                onClick={() => handleChooseOption(opt)}
                                                className={cn("rounded-button px-2.5 py-1 text-caption font-medium",
                                                  opt.recommended ? "bg-gradient-primary text-primary-foreground" : "border border-surface-3 text-text-2 hover:text-text-1"
                                                )}
                                              >
                                                Chọn {opt.label.charAt(0)}
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                    {ex.options.find(o => o.recommended) && (
                                      <p className="text-caption text-success italic mt-2 px-3">
                                        ★ Recommend: kết hợp. LCNB cover 64%, PO cover 36%.
                                      </p>
                                    )}
                                  </div>
                                )}
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

          {/* All SKU (collapsed) */}
          {activeCn.allSkus.length > 0 && (
            <div className="rounded-card border border-surface-3 bg-surface-2">
              <button onClick={() => setShowAllSkus(!showAllSkus)} className="w-full px-5 py-3 flex items-center justify-between hover:bg-surface-1/30">
                <span className="text-table font-medium text-text-2">Xem tất cả SKU ({activeCn.allSkus.length})</span>
                {showAllSkus ? <ChevronDown className="h-4 w-4 text-text-3" /> : <ChevronRight className="h-4 w-4 text-text-3" />}
              </button>
              {showAllSkus && (
                <div className="border-t border-surface-3 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-3 bg-surface-1/50">
                        {["Item", "Variant", "Demand", "Allocated", "Fill%", "Status"].map((h, i) => (
                          <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeCn.allSkus.map((sk, i) => (
                        <tr key={i} className="border-b border-surface-3/50">
                          <td className="px-4 py-2.5 text-table font-medium text-text-1">{sk.item}</td>
                          <td className="px-4 py-2.5 text-table text-text-2">{sk.variant}</td>
                          <td className="px-4 py-2.5 text-table tabular-nums text-text-1">{sk.demand.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-table tabular-nums text-text-2">{sk.allocated.toLocaleString()}</td>
                          <td className={cn("px-4 py-2.5 text-table tabular-nums font-medium", sk.fillPct >= 100 ? "text-success" : sk.fillPct >= 80 ? "text-warning" : "text-danger")}>{sk.fillPct}%</td>
                          <td className="px-4 py-2.5">
                            <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium",
                              sk.status === "OK" ? "bg-success-bg text-success" : sk.status === "SHORTAGE" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"
                            )}>{sk.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══ LỚP 3: ĐIỀU CHỈNH ═══ */}
      {showLayer3 && (
        <div className="animate-slide-in-right space-y-4">

          {/* SECTION A: Safety Stock */}
          <div className="rounded-card border border-surface-3 bg-surface-2">
            <div className="px-5 py-3 border-b border-surface-3 flex items-center justify-between">
              <h3 className="font-display text-body font-semibold text-text-1">Safety Stock</h3>
              <button onClick={() => setShowSimModal(true)} className="rounded-button border border-primary text-primary px-3 py-1 text-caption font-medium hover:bg-primary/5">
                Mô phỏng thay đổi
              </button>
            </div>

            {!ssDrillCn ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-3 bg-surface-1/50">
                      {["", "CN", "SS tổng (m²)", "SS adequate%", "Breaches tháng", "WC tied up", "Recommendation"].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {baseSsCn.map((r) => (
                      <tr key={r.cn} className="border-b border-surface-3/50 hover:bg-surface-1/30 cursor-pointer" onClick={() => r.cn === "CN-BD" && setSsDrillCn(r.cn)}>
                        <td className="px-3 py-3 text-text-3">{r.cn === "CN-BD" && <ChevronRight className="h-4 w-4" />}</td>
                        <td className="px-4 py-3 text-table font-medium text-text-1">{r.cn}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-1">{r.ssTotal.toLocaleString()}</td>
                        <td className="px-4 py-3 text-table tabular-nums">
                          <span className={cn("font-medium", r.adequate < 80 ? "text-danger" : "text-success")}>{r.adequate}%</span>
                          {r.adequate < 80 && " 🔴"}
                        </td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-2">{r.breaches}x</td>
                        <td className="px-4 py-3 text-table text-text-2">{r.wc}</td>
                        <td className="px-4 py-3 text-table text-text-2">{r.rec}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <button onClick={() => setSsDrillCn(null)} className="text-table-sm text-primary hover:underline flex items-center gap-1">
                  <ChevronLeft className="h-3.5 w-3.5" /> Per CN
                </button>
                <p className="text-caption text-text-3">Safety Stock › <span className="text-text-1 font-medium">{ssDrillCn}</span></p>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-3 bg-surface-1/50">
                        {["Item", "Variant", "SS hiện tại", "Formula", "SS đề xuất", "Delta", "WC impact", ""].map((h, i) => (
                          <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ssBdSkus.map((sk, i) => (
                        <tr key={i} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                          <td className="px-4 py-2.5 text-table font-medium text-text-1">{sk.item}</td>
                          <td className="px-4 py-2.5 text-table text-text-2">{sk.variant}</td>
                          <td className="px-4 py-2.5 text-table tabular-nums text-text-1">{sk.ssCurrent.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-table font-mono text-text-3 text-[11px]">
                            z({sk.z})×σ({sk.sigma})×√LT({sk.lt})
                          </td>
                          <td className="px-4 py-2.5 text-table tabular-nums">
                            <span className={cn("font-medium", sk.delta > 0 ? "text-warning" : sk.delta < 0 ? "text-success" : "text-text-2")}>{sk.ssProposed.toLocaleString()}</span>
                            {sk.delta !== 0 && <span className={cn("ml-1 text-caption", sk.delta > 0 ? "text-warning" : "text-success")}>({sk.delta > 0 ? "+" : ""}{sk.delta})</span>}
                          </td>
                          <td className="px-4 py-2.5 text-table tabular-nums">
                            {sk.delta !== 0 ? (
                              <span className={cn("font-medium", sk.delta > 0 ? "text-warning" : "text-success")}>
                                {sk.delta > 0 ? "+" : ""}{Math.round((sk.delta / sk.ssCurrent) * 100)}%
                              </span>
                            ) : <span className="text-text-3">—</span>}
                          </td>
                          <td className="px-4 py-2.5 text-table text-text-2">{sk.wcImpact}</td>
                          <td className="px-4 py-2.5">
                            {sk.delta !== 0 && (
                              <button
                                onClick={() => toast.success("SS change gửi Workspace duyệt", { description: `${sk.item} ${sk.variant}: ${sk.ssCurrent}→${sk.ssProposed}` })}
                                className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium"
                              >
                                Áp dụng
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* SECTION B: DRP Params */}
          <div className="rounded-card border border-surface-3 bg-surface-2">
            <div className="px-5 py-3 border-b border-surface-3">
              <h3 className="font-display text-body font-semibold text-text-1">Tham số DRP</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["Tham số", "Giá trị", "Mô tả", ""].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {drpParams.map((p) => (
                  <tr key={p.key} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                    <td className="px-4 py-2.5 text-table font-medium text-text-1">{p.key}</td>
                    <td className="px-4 py-2.5 text-table tabular-nums text-text-1">
                      {editingParam === p.key ? (
                        <input
                          defaultValue={p.value}
                          autoFocus
                          onBlur={() => { setEditingParam(null); toast.success(`${p.key} đã lưu`); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { setEditingParam(null); toast.success(`${p.key} đã lưu`); } }}
                          className="w-32 h-7 rounded border border-primary bg-surface-0 px-2 text-table text-text-1 focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      ) : p.value}
                    </td>
                    <td className="px-4 py-2.5 text-caption text-text-3">{p.desc}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => setEditingParam(p.key)} className="text-primary text-caption font-medium hover:underline">Sửa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-2 text-caption text-text-3 italic">Shortcut /config. Config chính tại <button onClick={() => navigate("/config")} className="text-primary hover:underline">/config</button>.</div>
          </div>

          {/* SECTION C: Change Log */}
          <div className="rounded-card border border-surface-3 bg-surface-2">
            <button onClick={() => setShowChangeLog(!showChangeLog)} className="w-full px-5 py-3 flex items-center justify-between hover:bg-surface-1/30">
              <span className="text-table font-medium text-text-2">Lịch sử thay đổi</span>
              {showChangeLog ? <ChevronDown className="h-4 w-4 text-text-3" /> : <ChevronRight className="h-4 w-4 text-text-3" />}
            </button>
            {showChangeLog && (
              <div className="border-t border-surface-3 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-3 bg-surface-1/50">
                      {["Thời gian", "Ai", "Thay đổi", "Lý do"].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {changeLog.map((log, i) => (
                      <tr key={i} className="border-b border-surface-3/50">
                        <td className="px-4 py-2.5 text-table tabular-nums text-text-2">{log.time}</td>
                        <td className="px-4 py-2.5 text-table text-text-1">{log.who}</td>
                        <td className="px-4 py-2.5 text-table text-text-1 font-mono text-[11px]">{log.change}</td>
                        <td className="px-4 py-2.5 text-table text-text-3">{log.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ DRP Confirm Modal ═══ */}
      {showDrpConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDrpConfirm(false)}>
          <div className="bg-surface-0 rounded-card border border-surface-3 p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-section-header text-text-1 mb-2">Chạy DRP</h3>
            <p className="text-table text-text-2 mb-5">Chạy DRP với data hiện tại? Quá trình gồm 3 bước: Netting → Allocation → PO generation.</p>
            <div className="flex gap-3">
              <button onClick={handleRunDrp} className="flex-1 rounded-button bg-gradient-primary text-primary-foreground py-2 text-table font-medium">
                Xác nhận
              </button>
              <button onClick={() => setShowDrpConfirm(false)} className="flex-1 rounded-button border border-surface-3 py-2 text-table font-medium text-text-2">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SS Simulation Modal ═══ */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSimModal(false)}>
          <div className="bg-surface-0 rounded-card border border-surface-3 p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-section-header text-text-1 mb-4">Mô phỏng SS</h3>
            <div className="mb-4">
              <label className="text-caption text-text-3 uppercase block mb-1.5">Service Level (z-score)</label>
              <input
                type="range" min={1.28} max={2.33} step={0.01} value={simZ}
                onChange={(e) => setSimZ(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-caption text-text-3 mt-1">
                <span>90% (z=1.28)</span>
                <span className="text-primary font-medium">{(simZ * 100 / 1.65 * 0.95).toFixed(0)}% (z={simZ.toFixed(2)})</span>
                <span>99% (z=2.33)</span>
              </div>
            </div>
            <div className="space-y-2 border-t border-surface-3 pt-3 mb-4">
              {[
                { label: "z=1.28 (90% SL)", ss: "698", wc: "−37M₫/tháng", risk: "+5%" },
                { label: `z=${simZ.toFixed(2)}`, ss: Math.round(900 * simZ / 1.65).toString(), wc: `${simZ > 1.65 ? "+" : ""}${Math.round((simZ - 1.65) * 40)}M₫`, risk: `${simZ > 1.65 ? "−" : "+"}${Math.abs(Math.round((simZ - 1.65) * 10))}%` },
                { label: "z=2.33 (99% SL)", ss: "1.270", wc: "+68M₫/tháng", risk: "−4%" },
              ].map((row, i) => (
                <div key={i} className={cn("flex justify-between text-table px-3 py-2 rounded", i === 1 && "bg-primary/5 border border-primary/20")}>
                  <span className="text-text-2">{row.label}</span>
                  <span className="tabular-nums text-text-1">SS {row.ss}</span>
                  <span className="text-text-3">WC {row.wc}</span>
                  <span className={cn("font-medium", row.risk.startsWith("+") ? "text-danger" : "text-success")}>Risk {row.risk}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { toast.success("SS mới gửi Workspace duyệt"); setShowSimModal(false); }} className="flex-1 rounded-button bg-gradient-primary text-primary-foreground py-2 text-table font-medium">
                Áp dụng mới
              </button>
              <button onClick={() => setShowSimModal(false)} className="flex-1 rounded-button border border-surface-3 py-2 text-table font-medium text-text-2">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

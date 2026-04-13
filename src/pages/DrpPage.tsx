import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { useTenant } from "@/components/TenantContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, AlertTriangle, ArrowRight, Play, Settings, ChevronLeft } from "lucide-react";
import { LogicLink } from "@/components/LogicLink";
import { useNavigate } from "react-router-dom";
import { ClickableNumber } from "@/components/ClickableNumber";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormulaBar } from "@/components/FormulaBar";

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
  const [simCn, setSimCn] = useState("CN-BD");
  const [simSku, setSimSku] = useState("GA-300 A4");
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [editingParam, setEditingParam] = useState<string | null>(null);
  const [paramHorizon, setParamHorizon] = useState("6 tuần");
  const [paramRunTime, setParamRunTime] = useState("23:00");
  const [paramServiceLevel, setParamServiceLevel] = useState("95% (z=1.65)");
  const [paramMoq, setParamMoq] = useState("ceil");
  const [paramLcnb, setParamLcnb] = useState(true);
  const [paramLcnbThreshold, setParamLcnbThreshold] = useState("70%");
  const [showDrpConfirm, setShowDrpConfirm] = useState(false);
  const [drpRunning, setDrpRunning] = useState(false);
  const [drpStep, setDrpStep] = useState(0);
  const [resolvedExceptions, setResolvedExceptions] = useState<Record<string, string>>({}); // key → chosen label

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

  const handleChooseOption = (exKey: string, opt: typeof baseData[0]["exceptionList"][0]["options"][0]) => {
    if (opt.recommended) {
      toast.success("TO + RPO tạo", { description: "TO-DN-BD-2605-001 (220m²) + RPO-MKD-2605-W17-003 (125m²). Cả 2 gửi Workspace." });
    } else if (opt.label.includes("Lateral")) {
      toast.success("Transfer Order gửi Workspace duyệt", { description: "TO-DN-BD-2605-001 (220m²)" });
    } else {
      toast.success("RPO draft tạo. Xem tại /orders.", { description: "RPO-MKD-2605-W17-003 (345m²)" });
    }
    setResolvedExceptions(prev => ({ ...prev, [exKey]: opt.label }));
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
        <div className="space-y-5 animate-slide-in-left">
          <FormulaBar
            demand={totalDemand}
            stock={Math.round(3200 * s)}
            pipeline={Math.round(1757 * s)}
            ssBuffer={Math.round(1200 * s)}
          />
          <div className="rounded-card border border-surface-3 bg-surface-2">
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
                    <td className="px-4 py-3 text-table tabular-nums text-text-1">
                      <ClickableNumber
                        value={r.demand}
                        label={`Demand ${r.cn}`}
                        color="text-text-1"
                        formula={r.cn === "CN-BD"
                          ? `FC phased ${Math.round(2142 * s).toLocaleString()} + CN adjust +${Math.round(94 * s)} + PO ${Math.round(757 * s).toLocaleString()} − overlap = ${r.demand.toLocaleString()}`
                          : `Demand ${r.cn} = ${r.demand.toLocaleString()} m² (từ S&OP consensus)`}
                        breakdown={r.cn === "CN-BD" ? r.allSkus.map(sk => ({
                          label: `${sk.item} ${sk.variant}`,
                          value: sk.demand,
                          pct: `${Math.round(sk.demand / r.demand * 100)}%`,
                        })) : undefined}
                        links={[{ label: "→ /demand-weekly", to: "/demand-weekly" }, { label: "→ /sop Cân đối", to: "/sop" }]}
                      />
                    </td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-2">
                      <ClickableNumber
                        value={r.available}
                        label={`Có sẵn ${r.cn}`}
                        color="text-text-2"
                        formula={r.cn === "CN-BD"
                          ? `On-hand ${Math.round(450 * s).toLocaleString()} + Pipeline ${Math.round(557 * s).toLocaleString()} = ${r.available.toLocaleString()} (available after SS guard)`
                          : `Stock + Pipeline = ${r.available.toLocaleString()} m²`}
                        breakdown={r.cn === "CN-BD" ? [
                          { label: "On-hand tổng", value: Math.round(1800 * s), detail: "Tồn kho hiện tại" },
                          { label: "− SS target", value: Math.round(-900 * s), color: "text-warning", detail: "Safety stock reserve" },
                          { label: "+ Pipeline (RPO in-transit)", value: Math.round(557 * s), detail: "ETA W17-W18" },
                          { label: "− Reserved/locked", value: Math.round(-450 * s), detail: "Đã allocate trước" },
                          { label: "= Available", value: r.available, color: "text-text-1" },
                        ] : undefined}
                        links={[{ label: "→ /monitoring tab Tồn kho", to: "/monitoring" }]}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-surface-3 overflow-hidden">
                          <div className={cn("h-full rounded-full", r.fillRate >= 95 ? "bg-success" : r.fillRate >= 85 ? "bg-warning" : "bg-danger")} style={{ width: `${Math.min(r.fillRate, 100)}%` }} />
                        </div>
                        <ClickableNumber
                          value={`${r.fillRate}%`}
                          label={`Fill rate ${r.cn}`}
                          color={cn("text-table-sm font-medium", r.fillRate >= 95 ? "text-success" : r.fillRate >= 85 ? "text-warning" : "text-danger")}
                          formula={`Allocated ${r.available.toLocaleString()} ÷ Demand ${r.demand.toLocaleString()} = ${r.fillRate}%`}
                          breakdown={r.exceptionList.length > 0 ? r.exceptionList.map(e => ({
                            label: `${e.item} ${e.variant}`,
                            value: `demand ${e.demand.toLocaleString()}, allocated ${e.allocated.toLocaleString()}, gap ${e.gap.toLocaleString()}`,
                            detail: e.type,
                          })) : [{ label: "Tất cả SKU", value: "100% allocated" }]}
                          note={r.fillRate < 100 ? `${r.fillRate >= 95 ? "🟢" : r.fillRate >= 85 ? "🟡" : "🔴"}` : undefined}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-table tabular-nums">
                      {r.gap > 0 ? <span className="text-danger font-medium">{r.gap.toLocaleString()}</span> : <span className="text-text-3">0</span>}
                    </td>
                    <td className="px-4 py-3 text-table">
                      {r.exceptions > 0 ? <span className="text-danger font-medium">{r.exceptions} items</span> : <span className="text-text-3">0</span>}
                    </td>
                    <td className="px-4 py-3 text-table text-text-2">
                      <ClickableNumber
                        value={`${r.rpos} RPO${r.rpos !== 1 ? "s" : ""}`}
                        label={`RPOs planned ${r.cn}`}
                        color="text-text-2"
                        breakdown={r.cn === "CN-BD" ? [
                          { label: "RPO-MKD-W17-002", value: "1.000m² GA-300 A4", detail: "MOQ round" },
                          { label: "RPO-MKD-W17-003", value: "1.000m² GA-600 A4" },
                          { label: "RPO-DTM-W17-001", value: "500m² GA-300 B2" },
                        ] : r.cn === "CN-ĐN" ? [
                          { label: "RPO-MKD-W18-001", value: `${Math.round(800 * s).toLocaleString()}m² GA-600 A4` },
                        ] : r.cn === "CN-HN" ? [
                          { label: "RPO-VGR-W17-001", value: `${Math.round(600 * s).toLocaleString()}m² GA-300 A4` },
                          { label: "RPO-DTM-W18-001", value: `${Math.round(500 * s).toLocaleString()}m² GA-400 A4` },
                        ] : [
                          { label: "RPO-PMY-W18-001", value: `${Math.round(450 * s).toLocaleString()}m² GA-600 B2` },
                        ]}
                        formula={`Net req → MOQ round → ${r.rpos} RPO(s). Total ${r.cn === "CN-BD" ? "2.500" : r.cn === "CN-ĐN" ? Math.round(800 * s).toLocaleString() : r.cn === "CN-HN" ? Math.round(1100 * s).toLocaleString() : Math.round(450 * s).toLocaleString()}m²`}
                        links={[{ label: "→ /orders tab 1 DRAFT", to: "/orders" }]}
                      />
                    </td>
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
                    {["Item", "Variant", "Demand", "Allocated", "Gap", "Exception", "Gợi ý", "Action"].map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCn.exceptionList.map((ex, i) => {
                    const exKey = `${ex.item}-${ex.variant}`;
                    const isExpanded = expandedExceptions.has(exKey);
                    const isResolved = !!resolvedExceptions[exKey];
                    const resolvedLabel = resolvedExceptions[exKey];
                    return (
                      <>
                        <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-surface-1/30", isExpanded && "bg-surface-1/20")}>
                          <td className="px-4 py-3 text-table font-medium text-text-1">{ex.item}</td>
                          <td className="px-4 py-3 text-table text-text-2">{ex.variant}</td>
                          <td className="px-4 py-3 text-table tabular-nums text-text-1">{ex.demand.toLocaleString()}</td>
                          <td className="px-4 py-3 text-table tabular-nums text-text-2">{ex.allocated.toLocaleString()}</td>
                          <td className="px-4 py-3 text-table tabular-nums font-medium">
                            {isResolved
                              ? <span className="text-text-3 line-through">{ex.gap.toLocaleString()}</span>
                              : <span className="text-danger">{ex.gap.toLocaleString()} {ex.type === "SHORTAGE" ? "🔴" : "🟡"}</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {isResolved ? (
                              <span className="rounded-full px-2 py-0.5 text-caption font-medium bg-info-bg text-info">ĐANG XỬ LÝ</span>
                            ) : (
                              <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium",
                                ex.type === "SHORTAGE" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"
                              )}>{ex.type}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-caption text-text-2 max-w-[200px]">
                            {isResolved ? <span className="text-info">{resolvedLabel}</span> : ex.suggestion}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => toggleException(exKey)}
                                className="rounded-button border border-surface-3 px-2.5 py-1 text-caption font-medium text-text-2 hover:text-text-1"
                              >
                                Xem cách tính {isExpanded ? "▴" : "▾"}
                              </button>
                              {ex.type === "SHORTAGE" && ex.options.length > 0 && !isResolved && (
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
                            </div>
                          </td>
                        </tr>

                        {/* ── Expanded: Netting code block + Allocation chips ── */}
                        {isExpanded && (
                          <tr key={`detail-${i}`}>
                            <td colSpan={8} className="p-0">
                              <div className="border-t border-surface-3 px-6 py-4 space-y-4 bg-surface-1/30">

                                {/* SECTION A: Netting — code block */}
                                <div>
                                  <h4 className="text-caption font-medium text-text-3 uppercase mb-2">Netting</h4>
                                  <div className="bg-[#f8f9ff] rounded-lg border border-surface-3 p-3 font-mono text-[12px] leading-6 text-text-1 overflow-x-auto">
                                    <div className="text-text-3 mb-1">{ex.item} {ex.variant} {activeCn.cn} — Netting W17:</div>
                                    <div className="flex justify-between">
                                      <span>{"  "}Demand:{" ".repeat(8)}<span className="font-bold">{ex.demand.toLocaleString()}</span> m²</span>
                                      <button onClick={() => navigate("/demand")} className="text-primary hover:underline cursor-pointer">← FC {ex.netting.fcPhased.toLocaleString()} + CN adj +{Math.round((ex.demand - ex.netting.fcPhased) * 0.47)} + PO {Math.round((ex.demand - ex.netting.fcPhased) * 0.53 + 151)} − overlap 151</button>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>− On-hand:{" ".repeat(6)}<span className="font-bold">−{ex.netting.onHand.toLocaleString()}</span> m²</span>
                                      <button onClick={() => navigate("/monitoring")} className="text-primary hover:underline cursor-pointer">← WMS sync 14:32</button>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>− In-transit:{" ".repeat(3)}<span className="font-bold">−{ex.netting.pipeline.toLocaleString()}</span> m²</span>
                                      <span className="text-text-3">← Toko RPO-TKO-2605-W16-001, ETA 17/05</span>
                                    </div>
                                    <div className="border-t border-surface-3/50 my-1"></div>
                                    <div>
                                      <span>= Gross gap:{" ".repeat(3)}<span className="font-bold">{(ex.demand - ex.netting.onHand - ex.netting.pipeline) > 0 ? "" : "−"}{Math.abs(ex.demand - ex.netting.onHand - ex.netting.pipeline).toLocaleString()}</span> m²</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>+ SS buffer:{" ".repeat(3)}<span className="font-bold text-warning">+{ex.netting.ssTarget.toLocaleString()}</span> m²</span>
                                      <button onClick={() => { setShowLayer3(true); setDrillCn(null); }} className="text-primary hover:underline cursor-pointer">← z(1.65) × σ(28.5) × √LT(14d)</button>
                                    </div>
                                    <div className="border-t border-surface-3/50 my-1"></div>
                                    <div>
                                      <span>= Net req:{" ".repeat(5)}</span>
                                      <ClickableNumber
                                        value={`${ex.netting.netReq.toLocaleString()} m²`}
                                        label={`Net req ${ex.item} ${ex.variant}`}
                                        color={cn("font-bold", ex.netting.netReq > 0 ? "text-danger" : "text-success")}
                                        formula={`Demand ${ex.demand.toLocaleString()} − On-hand ${ex.netting.onHand.toLocaleString()} − Pipeline ${ex.netting.pipeline.toLocaleString()} + SS ${ex.netting.ssTarget.toLocaleString()} = ${ex.netting.netReq.toLocaleString()}`}
                                        breakdown={[
                                          { label: "FC phased", value: ex.netting.fcPhased.toLocaleString(), detail: "Từ S&OP consensus" },
                                          { label: "− On-hand", value: `−${ex.netting.onHand.toLocaleString()}`, detail: "WMS sync" },
                                          { label: "− In-transit", value: `−${ex.netting.pipeline.toLocaleString()}`, detail: "RPO đang về" },
                                          { label: "+ SS buffer", value: `+${ex.netting.ssTarget.toLocaleString()}`, color: "text-warning", detail: "z×σ×√LT" },
                                          { label: "= Net req", value: ex.netting.netReq.toLocaleString(), color: ex.netting.netReq > 0 ? "text-danger" : "text-success" },
                                        ]}
                                        note={ex.netting.netReq > 0 ? "Cần bổ sung hàng để đáp ứng demand + SS" : "Đủ hàng cover demand + SS"}
                                      />
                                    </div>
                                    {ex.type === "SHORTAGE" && (
                                      <>
                                        <div>
                                          <span>÷ MOQ round:{" ".repeat(3)}<span className="font-bold">1.000</span>{" ".repeat(5)}</span>
                                          <span className="text-text-3">← Mikado MOQ</span>
                                        </div>
                                        <div>
                                          <span>= Planned RPO:{" "}<span className="font-bold text-primary">1.000</span> m²</span>
                                          <span className="text-text-3 ml-2">→ RPO-MKD-2605-W17-002</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* SECTION B: Allocation 6-layer trace — inline chips */}
                                <div>
                                  <h4 className="text-caption font-medium text-text-3 uppercase mb-2">Allocation 6 layers</h4>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {ex.allocLayers.map((layer, li) => (
                                      <div key={li} className="flex items-center gap-1">
                                        <div className="group relative">
                                          <span className={cn(
                                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium cursor-help border",
                                            layer.pass
                                              ? "bg-success-bg text-success border-success/20"
                                              : "bg-danger-bg text-danger border-danger/20"
                                          )}>
                                            {layer.name} {layer.pass ? "✓" : "✗"}{layer.qty}
                                            {layer.delta != null && layer.delta !== 0 && (
                                              <span className="ml-0.5">({layer.delta > 0 ? "+" : ""}{layer.delta})</span>
                                            )}
                                          </span>
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-surface-0 border border-surface-3 rounded-lg p-3 text-caption text-text-2 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                                            <strong className="text-text-1 block mb-1">{layer.name}</strong>
                                            {layer.explain}
                                          </div>
                                        </div>
                                        {li < ex.allocLayers.length - 1 && <span className="text-text-3 text-[11px]">→</span>}
                                      </div>
                                    ))}
                                    <span className="text-text-3 text-[11px]">→</span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-bold border border-primary/20">
                                      Final: {ex.allocated.toLocaleString()} <span className="text-danger">Gap: {ex.gap.toLocaleString()}</span>
                                    </span>
                                  </div>
                                </div>

                              </div>
                            </td>
                          </tr>
                        )}

                        {/* ── Options panel (separate from netting) ── */}
                        {expandOptions === exKey && ex.options.length > 0 && (
                          <tr key={`options-${i}`}>
                            <td colSpan={8} className="p-0">
                              <div className="border-t border-primary/20 px-6 py-4 bg-primary/[0.02]">
                                <h4 className="text-table font-semibold text-text-1 mb-3">
                                  {ex.item} {ex.variant} {activeCn.cn} — Gap {ex.gap.toLocaleString()}m². Chọn cách xử lý:
                                </h4>
                                <table className="w-full">
                                  <thead>
                                    <tr className="border-b border-surface-3/50">
                                      {["Option", "Source", "Qty (m²)", "Cost", "Thời gian", "Savings", ""].map((h, j) => (
                                        <th key={j} className="px-3 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ex.options.map((opt, j) => (
                                      <tr key={j} className={cn("border-b border-surface-3/30", opt.recommended && "border-l-2 border-l-success bg-success/5")}>
                                        <td className="px-3 py-2.5 text-table font-medium text-text-1">
                                          {opt.recommended && <span className="text-success mr-1">★</span>}{opt.label}
                                        </td>
                                        <td className="px-3 py-2.5 text-table text-text-2">{opt.source}</td>
                                        <td className="px-3 py-2.5 text-table tabular-nums text-text-1">{opt.qty.toLocaleString()}</td>
                                        <td className="px-3 py-2.5 text-table text-text-2">{opt.cost}</td>
                                        <td className="px-3 py-2.5 text-table text-text-2">{opt.time}</td>
                                        <td className="px-3 py-2.5 text-table text-text-2">{opt.savingVsB}</td>
                                        <td className="px-3 py-2.5">
                                          <button
                                            onClick={() => handleChooseOption(exKey, opt)}
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
                                    ★ Recommend: Kết hợp LCNB cover 64%, PO cover 36%. Tiết kiệm 31,9M₫.
                                  </p>
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
                          <span className={cn("font-medium", r.adequate < 80 ? "text-danger" : "text-success")}>{r.adequate}% {r.adequate < 80 ? "🔴" : "🟢"}</span>
                          
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
                                onClick={() => toast.success("SS change gửi Workspace duyệt", { description: `${sk.item} ${sk.variant}: ${sk.ssCurrent}→${sk.ssProposed}. DRP đêm nay dùng SS mới.` })}
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
                {/* Horizon - inline edit */}
                <tr className="border-b border-surface-3/50 hover:bg-surface-1/30">
                  <td className="px-4 py-2.5 text-table font-medium text-text-1">Horizon</td>
                  <td className="px-4 py-2.5 text-table tabular-nums text-text-1">
                    {editingParam === "Horizon" ? (
                      <input defaultValue={paramHorizon} autoFocus
                        onBlur={(e) => { setParamHorizon(e.target.value); setEditingParam(null); toast.success("Tham số cập nhật", { description: "Chạy lại DRP để áp dụng." }); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { setParamHorizon((e.target as HTMLInputElement).value); setEditingParam(null); toast.success("Tham số cập nhật", { description: "Chạy lại DRP để áp dụng." }); } }}
                        className="w-32 h-7 rounded border border-primary bg-surface-0 px-2 text-table text-text-1 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : paramHorizon}
                  </td>
                  <td className="px-4 py-2.5 text-caption text-text-3">DRP nhìn trước bao xa</td>
                  <td className="px-4 py-2.5"><button onClick={() => setEditingParam("Horizon")} className="text-primary text-caption font-medium hover:underline">Sửa</button></td>
                </tr>
                {/* Run time - inline edit */}
                <tr className="border-b border-surface-3/50 hover:bg-surface-1/30">
                  <td className="px-4 py-2.5 text-table font-medium text-text-1">Run time</td>
                  <td className="px-4 py-2.5 text-table tabular-nums text-text-1">
                    {editingParam === "Run time" ? (
                      <input defaultValue={paramRunTime} autoFocus
                        onBlur={(e) => { setParamRunTime(e.target.value); setEditingParam(null); toast.success("Tham số cập nhật", { description: "Chạy lại DRP để áp dụng." }); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { setParamRunTime((e.target as HTMLInputElement).value); setEditingParam(null); toast.success("Tham số cập nhật", { description: "Chạy lại DRP để áp dụng." }); } }}
                        className="w-32 h-7 rounded border border-primary bg-surface-0 px-2 text-table text-text-1 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : paramRunTime}
                  </td>
                  <td className="px-4 py-2.5 text-caption text-text-3">Nightly auto-run</td>
                  <td className="px-4 py-2.5"><button onClick={() => setEditingParam("Run time")} className="text-primary text-caption font-medium hover:underline">Sửa</button></td>
                </tr>
                {/* Service level - dropdown */}
                <tr className="border-b border-surface-3/50 hover:bg-surface-1/30">
                  <td className="px-4 py-2.5 text-table font-medium text-text-1">Service level</td>
                  <td className="px-4 py-2.5">
                    <Select value={paramServiceLevel} onValueChange={(v) => { setParamServiceLevel(v); toast.success("Tham số cập nhật", { description: "Chạy lại DRP để áp dụng." }); }}>
                      <SelectTrigger className="w-44 h-8 text-table bg-surface-0 border-surface-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="90% (z=1.28)">90% (z=1.28)</SelectItem>
                        <SelectItem value="95% (z=1.65)">95% (z=1.65)</SelectItem>
                        <SelectItem value="99% (z=2.33)">99% (z=2.33)</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5 text-caption text-text-3">Target availability</td>
                  <td className="px-4 py-2.5" />
                </tr>
                {/* LCNB enabled - switch */}
                <tr className="border-b border-surface-3/50 hover:bg-surface-1/30">
                  <td className="px-4 py-2.5 text-table font-medium text-text-1">LCNB enabled</td>
                  <td className="px-4 py-2.5">
                    <Switch checked={paramLcnb} onCheckedChange={(v) => { setParamLcnb(v); toast.success("Tham số cập nhật", { description: `LCNB ${v ? "bật" : "tắt"}. Chạy lại DRP để áp dụng.` }); }} />
                  </td>
                  <td className="px-4 py-2.5 text-caption text-text-3">Scan lateral trước PO</td>
                  <td className="px-4 py-2.5" />
                </tr>
                {/* LCNB cost threshold - inline edit, disabled when LCNB off */}
                {paramLcnb && (
                <tr className="border-b border-surface-3/50 hover:bg-surface-1/30">
                  <td className="px-4 py-2.5 text-table font-medium text-text-1">LCNB cost threshold</td>
                  <td className="px-4 py-2.5 text-table tabular-nums text-text-1">
                    {editingParam === "LCNB cost threshold" ? (
                      <input defaultValue={paramLcnbThreshold} autoFocus
                        onBlur={(e) => { setParamLcnbThreshold(e.target.value); setEditingParam(null); toast.success("Tham số cập nhật", { description: "Chạy lại DRP để áp dụng." }); }}
                        onKeyDown={(e) => { if (e.key === "Enter") { setParamLcnbThreshold((e.target as HTMLInputElement).value); setEditingParam(null); toast.success("Tham số cập nhật", { description: "Chạy lại DRP để áp dụng." }); } }}
                        className="w-24 h-7 rounded border border-primary bg-surface-0 px-2 text-table text-text-1 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    ) : paramLcnbThreshold}
                  </td>
                  <td className="px-4 py-2.5 text-caption text-text-3">Chỉ lateral nếu rẻ hơn X% vs PO</td>
                  <td className="px-4 py-2.5"><button onClick={() => setEditingParam("LCNB cost threshold")} className="text-primary text-caption font-medium hover:underline">Sửa</button></td>
                </tr>
                )}
                {/* MOQ round - dropdown */}
                <tr className="border-b border-surface-3/50 hover:bg-surface-1/30">
                  <td className="px-4 py-2.5 text-table font-medium text-text-1">MOQ round</td>
                  <td className="px-4 py-2.5">
                    <Select value={paramMoq} onValueChange={(v) => { setParamMoq(v); toast.success("Tham số cập nhật", { description: `MOQ round: ${v}. Chạy lại DRP để áp dụng.` }); }}>
                      <SelectTrigger className="w-36 h-8 text-table bg-surface-0 border-surface-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ceil">ceil</SelectItem>
                        <SelectItem value="nearest">nearest</SelectItem>
                        <SelectItem value="manual">manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5 text-caption text-text-3">Cách round đơn hàng</td>
                  <td className="px-4 py-2.5" />
                </tr>
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
      {showSimModal && (() => {
        const skuRef = ssBdSkus.find(s => `${s.item} ${s.variant}` === simSku) || ssBdSkus[0];
        const simSs = Math.round(simZ * skuRef.sigma * Math.sqrt(skuRef.lt));
        const wcBase = Math.round(skuRef.ssCurrent * 0.185);
        const wcNew = Math.round(simSs * 0.185);
        const riskBefore = simZ <= 1.65 ? 5 : 2;
        const slPct = simZ <= 1.28 ? 90 : simZ <= 1.65 ? 95 : 99;
        const riskAfter = slPct === 90 ? 8 : slPct === 95 ? 5 : 1;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSimModal(false)}>
            <div className="bg-surface-0 rounded-card border border-surface-3 p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display text-section-header text-text-1 mb-4">Mô phỏng thay đổi SS</h3>

              {/* CN + SKU selectors */}
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className="text-caption text-text-3 uppercase block mb-1">CN</label>
                  <select value={simCn} onChange={(e) => setSimCn(e.target.value)}
                    className="w-full h-8 rounded border border-surface-3 bg-surface-1 px-2 text-table text-text-1 focus:outline-none focus:ring-1 focus:ring-primary">
                    {baseSsCn.map(c => <option key={c.cn} value={c.cn}>{c.cn}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-caption text-text-3 uppercase block mb-1">SKU</label>
                  <select value={simSku} onChange={(e) => setSimSku(e.target.value)}
                    className="w-full h-8 rounded border border-surface-3 bg-surface-1 px-2 text-table text-text-1 focus:outline-none focus:ring-1 focus:ring-primary">
                    {ssBdSkus.map(s => <option key={`${s.item}-${s.variant}`} value={`${s.item} ${s.variant}`}>{s.item} {s.variant}</option>)}
                  </select>
                </div>
              </div>

              {/* Z slider */}
              <div className="mb-5">
                <label className="text-caption text-text-3 uppercase block mb-1.5">Service Level (z-score)</label>
                <input type="range" min={1.28} max={2.33} step={0.01} value={simZ}
                  onChange={(e) => setSimZ(Number(e.target.value))} className="w-full accent-primary" />
                <div className="flex justify-between text-caption text-text-3 mt-1">
                  <span>90% (z=1.28)</span>
                  <span className="text-primary font-semibold">{slPct}% (z={simZ.toFixed(2)})</span>
                  <span>99% (z=2.33)</span>
                </div>
              </div>

              {/* Before / After table */}
              <div className="rounded-lg border border-surface-3 overflow-hidden mb-5">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-3 bg-surface-1/50">
                      {["", "Trước", "Sau", "Delta"].map((h, i) => (
                        <th key={i} className="px-4 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-surface-3/50">
                      <td className="px-4 py-2.5 text-table font-medium text-text-1">SS (m²)</td>
                      <td className="px-4 py-2.5 text-table tabular-nums text-text-2">{skuRef.ssCurrent.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-table tabular-nums text-text-1 font-medium">{simSs.toLocaleString()}</td>
                      <td className={cn("px-4 py-2.5 text-table tabular-nums font-medium", simSs > skuRef.ssCurrent ? "text-warning" : simSs < skuRef.ssCurrent ? "text-success" : "text-text-3")}>
                        {simSs - skuRef.ssCurrent > 0 ? "+" : ""}{(simSs - skuRef.ssCurrent).toLocaleString()}
                      </td>
                    </tr>
                    <tr className="border-b border-surface-3/50">
                      <td className="px-4 py-2.5 text-table font-medium text-text-1">WC/tháng</td>
                      <td className="px-4 py-2.5 text-table tabular-nums text-text-2">{wcBase}M₫</td>
                      <td className="px-4 py-2.5 text-table tabular-nums text-text-1 font-medium">{wcNew}M₫</td>
                      <td className={cn("px-4 py-2.5 text-table tabular-nums font-medium", wcNew > wcBase ? "text-warning" : "text-success")}>
                        {wcNew - wcBase > 0 ? "+" : ""}{wcNew - wcBase}M₫
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 text-table font-medium text-text-1">Stockout risk</td>
                      <td className="px-4 py-2.5 text-table tabular-nums text-text-2">{riskBefore}%</td>
                      <td className="px-4 py-2.5 text-table tabular-nums text-text-1 font-medium">{riskAfter}%</td>
                      <td className={cn("px-4 py-2.5 text-table tabular-nums font-medium", riskAfter < riskBefore ? "text-success" : "text-danger")}>
                        {riskAfter - riskBefore > 0 ? "+" : ""}{riskAfter - riskBefore}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { toast.success("SS mới áp dụng", { description: `${simSku} ${simCn}: ${skuRef.ssCurrent}→${simSs}. Gửi Workspace duyệt.` }); setShowSimModal(false); }}
                  className="flex-1 rounded-button bg-gradient-primary text-primary-foreground py-2 text-table font-medium">
                  Áp dụng SS mới
                </button>
                <button onClick={() => setShowSimModal(false)} className="flex-1 rounded-button border border-surface-3 py-2 text-table font-medium text-text-2">
                  Hủy
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </AppLayout>
  );
}

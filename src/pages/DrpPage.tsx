import { useState, useMemo, Fragment } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { useTenant } from "@/components/TenantContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, AlertTriangle, ArrowRight, Play, Settings, ChevronLeft, FileDown, FileText, Pencil, Check, Truck, PackagePlus, X } from "lucide-react";
import { LogicLink } from "@/components/LogicLink";
import { useNavigate } from "react-router-dom";
import { ClickableNumber } from "@/components/ClickableNumber";
import { DemandToOrderBridge, buildFullBridgeSteps } from "@/components/DemandToOrderBridge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormulaBar } from "@/components/FormulaBar";
import { ViewPivotToggle, usePivotMode, WorstCnCell, CnGapBadge, LcnbBadge } from "@/components/ViewPivotToggle";
import { useSafetyStock } from "@/components/SafetyStockContext";
import { BatchLockBanner, useBatchLock } from "@/components/BatchLockBanner";
import { useVersionConflict, VersionConflictDialog } from "@/components/VersionConflict";
import { AllocSourceBar, ExpandedSkuBreakdown, ExpandedCnBreakdown, AllocSourceLegend } from "@/components/drp/AllocSourceBar";
import { exportCsv, exportPdf, type ExportRow } from "@/components/drp/exportLayer1";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

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

interface AllocSources {
  onHand: number;          // Tồn kho có sẵn tại CN
  pipeline: number;        // RPO/PO đang về (Hub đã đặt trước)
  hubPo: number;           // PO mới từ Hub (NM ngoài) – sourcing fresh
  lcnbIn: number;          // Lateral nhận từ CN khác (LCNB)
  internalTransfer: number;// Luân chuyển nội bộ (TO giữa kho cùng CN hoặc tái phân bổ DC)
}

interface SkuFull {
  item: string; variant: string; demand: number; allocated: number; fillPct: number; status: string;
  sources: AllocSources;
}

interface CnRow {
  cn: string; demand: number; available: number; fillRate: number; gap: number; exceptions: number;
  exceptionList: SkuException[]; allSkus: SkuFull[];
  rpos: number;
}

/* ═══ SS DATA — now from shared SafetyStockContext ═══ */
// SsCnRow and SsSkuRow types kept for Layer 3 params table only
type SsCnRow = { cn: string; ssTotal: number; adequate: number; breaches: number; wc: string; rec: string };

// Change log now comes from shared SafetyStockContext

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
      // GA-300 A4: shortage covered by combo (LCNB 220 + Hub PO 125) + on-hand 272 net = 617
      { item: "GA-300", variant: "A4", demand: 617, allocated: 272, fillPct: 44, status: "SHORTAGE",
        sources: { onHand: 272, pipeline: 0, hubPo: 0, lcnbIn: 0, internalTransfer: 0 } },
      { item: "GA-300", variant: "B2", demand: 178, allocated: 178, fillPct: 100, status: "OK",
        sources: { onHand: 128, pipeline: 50, hubPo: 0, lcnbIn: 0, internalTransfer: 0 } },
      { item: "GA-400", variant: "A4", demand: 347, allocated: 297, fillPct: 86, status: "WATCH",
        sources: { onHand: 297, pipeline: 0, hubPo: 0, lcnbIn: 0, internalTransfer: 0 } },
      { item: "GA-600", variant: "A4", demand: 881, allocated: 881, fillPct: 100, status: "OK",
        sources: { onHand: 600, pipeline: 281, hubPo: 0, lcnbIn: 0, internalTransfer: 0 } },
      // GA-600 B2: covered by Hub PO + internal transfer between BD warehouses
      { item: "GA-600", variant: "B2", demand: 527, allocated: 527, fillPct: 100, status: "OK",
        sources: { onHand: 200, pipeline: 0, hubPo: 250, lcnbIn: 0, internalTransfer: 77 } },
    ],
  },
  { cn: "CN-ĐN", demand: 1800, available: 1600, fillRate: 100, gap: 0, exceptions: 0, rpos: 1, exceptionList: [],
    allSkus: [
      { item: "GA-300", variant: "A4", demand: 500, allocated: 500, fillPct: 100, status: "OK",
        sources: { onHand: 720, pipeline: 0, hubPo: 0, lcnbIn: 0, internalTransfer: -220 } }, // give 220 lateral to BD
      { item: "GA-600", variant: "A4", demand: 800, allocated: 800, fillPct: 100, status: "OK",
        sources: { onHand: 400, pipeline: 400, hubPo: 0, lcnbIn: 0, internalTransfer: 0 } },
      { item: "GA-400", variant: "A4", demand: 500, allocated: 500, fillPct: 100, status: "OK",
        sources: { onHand: 350, pipeline: 0, hubPo: 150, lcnbIn: 0, internalTransfer: 0 } },
    ],
  },
  { cn: "CN-HN", demand: 2100, available: 1300, fillRate: 100, gap: 0, exceptions: 0, rpos: 2, exceptionList: [],
    allSkus: [
      { item: "GA-300", variant: "A4", demand: 800, allocated: 800, fillPct: 100, status: "OK",
        sources: { onHand: 200, pipeline: 0, hubPo: 600, lcnbIn: 0, internalTransfer: 0 } },
      { item: "GA-400", variant: "A4", demand: 700, allocated: 700, fillPct: 100, status: "OK",
        sources: { onHand: 200, pipeline: 500, hubPo: 0, lcnbIn: 0, internalTransfer: 0 } },
      { item: "GA-600", variant: "B2", demand: 600, allocated: 600, fillPct: 100, status: "OK",
        sources: { onHand: 480, pipeline: 0, hubPo: 0, lcnbIn: 120, internalTransfer: 0 } }, // received lateral from CT
    ],
  },
  { cn: "CN-CT", demand: 1200, available: 1050, fillRate: 100, gap: 0, exceptions: 0, rpos: 1, exceptionList: [],
    allSkus: [
      { item: "GA-600", variant: "B2", demand: 600, allocated: 600, fillPct: 100, status: "OK",
        sources: { onHand: 750, pipeline: 0, hubPo: 0, lcnbIn: 0, internalTransfer: -120 } }, // give 120 to HN
      { item: "GA-300", variant: "A4", demand: 600, allocated: 600, fillPct: 100, status: "OK",
        sources: { onHand: 150, pipeline: 0, hubPo: 450, lcnbIn: 0, internalTransfer: 0 } },
    ],
  },
];

export default function DrpPage() {
  const { tenant } = useTenant();
  const s = tenantScales[tenant] || 1;
  const navigate = useNavigate();
  const { ssSkuData, ssCnData: baseSsCn, changeLog: ssChangeLog, applySsChange, getSkusByCn } = useSafetyStock();
  const ssBdSkus = getSkusByCn("CN-BD");
  const [drillCn, setDrillCn] = useState<string | null>(null);
  const [drillSku, setDrillSku] = useState<string | null>(null);
  const [showAllSkus, setShowAllSkus] = useState(false);
  const [etaFilter, setEtaFilter] = useState<Set<"Same-day" | "1 ngày" | "Quá hạn">>(new Set());
  const [selectedMove, setSelectedMove] = useState<null | {
    direction: "in" | "out"; kind: "internal" | "lateral";
    item: string; variant: string; qty: number; counterpart: string;
    reason: string; eta: "Same-day" | "1 ngày" | "Quá hạn"; toCode: string;
  }>(null);
  const [pivotMode, setPivotMode] = usePivotMode("drp");
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
  const [resolvedExceptions, setResolvedExceptions] = useState<Record<string, string>>({});

  const drpBatch = useBatchLock({
    batchType: "DRP",
    status: "info",
    resultSummary: "DRP đêm qua 23:18. 142 lines, 3 exceptions, 5 RPOs.",
    startedAt: "23:00",
    queuedActions: [
      { id: "q1", description: "Manual allocation GA-300 A4 CN-BD → 272m²", queuedAt: "23:05", queuedBy: "Planner A" },
      { id: "q2", description: "SS change GA-300 A4 900→1.035", queuedAt: "23:10", queuedBy: "Thúy", superseded: true },
    ],
  });
  const { conflict: drpConflict, triggerConflict: triggerDrpConflict, clearConflict: clearDrpConflict } = useVersionConflict();

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
    allSkus: r.allSkus.map((sk) => ({
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
  }));

  const totalDemand = data.reduce((a, r) => a + r.demand, 0);
  const totalGap = data.reduce((a, r) => a + r.gap, 0);
  const totalExc = data.reduce((a, r) => a + r.exceptions, 0);
  const totalRpos = data.reduce((a, r) => a + r.rpos, 0);
  const totalFill = totalDemand > 0 ? Math.round(((totalDemand - totalGap) / totalDemand) * 1000) / 10 : 100;
  const activeCn = drillCn ? data.find((r) => r.cn === drillCn) : null;

  // SKU-first aggregation for DRP
  const skuAggDrp = useMemo(() => {
    const map: Record<string, { item: string; variant: string; totalDemand: number; totalAllocated: number; totalGap: number; fillPct: number;
      worstCn: string; worstHstk: number; cnGapCount: number; lcnb: string | null;
      sources: AllocSources;
      cnRows: { cn: string; demand: number; allocated: number; fillPct: number; gap: number; status: string; sources: AllocSources }[];
    }> = {};
    data.forEach(cn => {
      cn.allSkus.forEach(sk => {
        const key = `${sk.item}-${sk.variant}`;
        if (!map[key]) map[key] = { item: sk.item, variant: sk.variant, totalDemand: 0, totalAllocated: 0, totalGap: 0, fillPct: 0,
          worstCn: "", worstHstk: 99, cnGapCount: 0, lcnb: null,
          sources: { onHand: 0, pipeline: 0, hubPo: 0, lcnbIn: 0, internalTransfer: 0 }, cnRows: [] };
        map[key].totalDemand += sk.demand;
        map[key].totalAllocated += sk.allocated;
        const gap = sk.demand - sk.allocated;
        map[key].totalGap += gap;
        if (gap > 0) map[key].cnGapCount++;
        map[key].sources.onHand += sk.sources.onHand;
        map[key].sources.pipeline += sk.sources.pipeline;
        map[key].sources.hubPo += sk.sources.hubPo;
        map[key].sources.lcnbIn += sk.sources.lcnbIn;
        map[key].sources.internalTransfer += sk.sources.internalTransfer;
        map[key].cnRows.push({ cn: cn.cn, demand: sk.demand, allocated: sk.allocated, fillPct: sk.fillPct, gap, status: sk.status, sources: sk.sources });
      });
    });
    Object.values(map).forEach(sk => {
      sk.fillPct = sk.totalDemand > 0 ? Math.round((sk.totalAllocated / sk.totalDemand) * 100) : 100;
      const hasExcess = sk.cnRows.some(c => c.gap < 0);
      const hasShort = sk.cnRows.some(c => c.gap > 0);
      if (hasExcess && hasShort) {
        const excessCn = sk.cnRows.find(c => c.gap < 0);
        const shortCn = sk.cnRows.find(c => c.gap > 0);
        if (excessCn && shortCn) sk.lcnb = `${excessCn.cn}→${shortCn.cn} ${Math.abs(excessCn.gap)}m²`;
      }
      if (sk.cnRows.length > 0) {
        const worst = sk.cnRows.reduce((a, b) => a.fillPct < b.fillPct ? a : b);
        sk.worstCn = worst.cn;
        sk.worstHstk = worst.fillPct;
      }
    });
    return Object.values(map).sort((a, b) => a.fillPct - b.fillPct);
  }, [data]);

  // Inline expand state for Layer 1 — persisted per pivot mode in sessionStorage
  const STORAGE_KEY = "drp:expandedRows";
  const [expandedByMode, setExpandedByMode] = useState<Record<"cn" | "sku", Set<string>>>(() => {
    if (typeof window === "undefined") return { cn: new Set(), sku: new Set() };
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { cn?: string[]; sku?: string[] };
        return { cn: new Set(parsed.cn ?? []), sku: new Set(parsed.sku ?? []) };
      }
    } catch { /* ignore */ }
    return { cn: new Set(), sku: new Set() };
  });
  const expandedRows = expandedByMode[pivotMode];
  const toggleRow = (key: string) => {
    setExpandedByMode(prev => {
      const current = new Set(prev[pivotMode]);
      current.has(key) ? current.delete(key) : current.add(key);
      const next = { ...prev, [pivotMode]: current };
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          cn: Array.from(next.cn),
          sku: Array.from(next.sku),
        }));
      } catch { /* ignore */ }
      return next;
    });
  };

  // Source filter for Layer 1 — show only rows containing selected supply sources
  type SourceFilterKey = "hubPo" | "lcnbIn" | "internalTransfer" | "onHand" | "pipeline";
  const [sourceFilter, setSourceFilter] = useState<Set<SourceFilterKey>>(new Set());
  const toggleSourceFilter = (k: SourceFilterKey) => {
    setSourceFilter(prev => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };
  const matchesSourceFilter = (src: AllocSources) => {
    if (sourceFilter.size === 0) return true;
    return Array.from(sourceFilter).some(k => {
      // internalTransfer counts if non-zero (giving or receiving)
      if (k === "internalTransfer") return src.internalTransfer !== 0;
      return src[k] > 0;
    });
  };
  const SOURCE_FILTER_OPTIONS: { key: SourceFilterKey; label: string; cls: string }[] = [
    { key: "hubPo", label: "Hub PO", cls: "border-primary/30 bg-primary/10 text-primary" },
    { key: "lcnbIn", label: "LCNB", cls: "border-warning/30 bg-warning-bg text-warning" },
    { key: "internalTransfer", label: "Internal TO", cls: "border-accent bg-accent text-accent-foreground" },
    { key: "pipeline", label: "Pipeline", cls: "border-info/30 bg-info/10 text-info" },
    { key: "onHand", label: "On-hand", cls: "border-success/30 bg-success-bg text-success" },
  ];

  // Build flat export rows from current Layer 1 view (parent + child rows for sổ-out groups)
  const buildExportRows = (): ExportRow[] => {
    const rows: ExportRow[] = [];
    if (pivotMode === "cn") {
      const filteredCns = data.filter(r => {
        if (sourceFilter.size === 0) return true;
        const cs = r.allSkus.reduce((acc, sk) => ({
          onHand: acc.onHand + sk.sources.onHand,
          pipeline: acc.pipeline + sk.sources.pipeline,
          hubPo: acc.hubPo + sk.sources.hubPo,
          lcnbIn: acc.lcnbIn + sk.sources.lcnbIn,
          internalTransfer: acc.internalTransfer + sk.sources.internalTransfer,
        }), { onHand: 0, pipeline: 0, hubPo: 0, lcnbIn: 0, internalTransfer: 0 });
        return matchesSourceFilter(cs);
      });
      filteredCns.forEach(r => {
        const cs = r.allSkus.reduce((acc, sk) => ({
          onHand: acc.onHand + sk.sources.onHand,
          pipeline: acc.pipeline + sk.sources.pipeline,
          hubPo: acc.hubPo + sk.sources.hubPo,
          lcnbIn: acc.lcnbIn + sk.sources.lcnbIn,
          internalTransfer: acc.internalTransfer + sk.sources.internalTransfer,
        }), { onHand: 0, pipeline: 0, hubPo: 0, lcnbIn: 0, internalTransfer: 0 });
        rows.push({
          group: "CN", parentKey: r.cn, isParent: true,
          demand: r.demand, allocated: r.demand - r.gap,
          fillPct: r.fillRate, gap: r.gap, exceptions: r.exceptions,
          sources: cs,
        });
        // Always include child SKUs for the chosen CNs (matching what the user can sổ ra)
        r.allSkus.filter(sk => matchesSourceFilter(sk.sources)).forEach(sk => {
          rows.push({
            group: "CN", parentKey: r.cn, isParent: false,
            childKey: `${sk.item} ${sk.variant}`,
            demand: sk.demand, allocated: sk.allocated,
            fillPct: sk.fillPct, gap: sk.demand - sk.allocated,
            status: sk.status, sources: sk.sources,
          });
        });
      });
    } else {
      const filteredSkus = skuAggDrp.filter(sk => matchesSourceFilter(sk.sources));
      filteredSkus.forEach(sk => {
        rows.push({
          group: "SKU", parentKey: `${sk.item} ${sk.variant}`, isParent: true,
          demand: sk.totalDemand, allocated: sk.totalAllocated,
          fillPct: sk.fillPct, gap: sk.totalGap,
          exceptions: sk.cnGapCount, sources: sk.sources,
        });
        sk.cnRows.filter(cr => matchesSourceFilter(cr.sources)).forEach(cr => {
          rows.push({
            group: "SKU", parentKey: `${sk.item} ${sk.variant}`, isParent: false,
            childKey: cr.cn,
            demand: cr.demand, allocated: cr.allocated,
            fillPct: cr.fillPct, gap: cr.gap,
            status: cr.status, sources: cr.sources,
          });
        });
      });
    }
    return rows;
  };

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
      {/* Batch Lock Banner */}
      {drpBatch.batch && (
        <div className="mb-4">
          <BatchLockBanner
            batch={drpBatch.batch}
            dismissed={drpBatch.dismissed}
            onDismiss={drpBatch.dismiss}
            showQueue={drpBatch.showQueue}
            onToggleQueue={() => drpBatch.setShowQueue(!drpBatch.showQueue)}
            onProcessQueue={(id) => toast.success(`Xử lý queue action ${id}`)}
            onCancelQueue={(id) => toast.info(`Hủy queue action ${id}`)}
            onRetry={() => toast.info("Đang chạy lại DRP...")}
            onViewResults={() => toast.info("Xem kết quả DRP")}
          />
        </div>
      )}

      {/* Version Conflict */}
      {drpConflict && (
        <VersionConflictDialog
          conflict={drpConflict}
          onReload={clearDrpConflict}
          onForceUpdate={() => { clearDrpConflict(); toast.success("Đã ghi đè. Audit logged."); }}
          onClose={clearDrpConflict}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1" data-tour="drp-header">
        <div className="flex items-center gap-3">
          <ScreenHeader title="DRP & Phân bổ" subtitle="Distribution Requirements Planning + Allocation" />
          <LogicLink tab="daily" node={2} tooltip="Logic DRP Netting" />
          {totalExc > 0 && (
            <span data-tour="drp-exceptions-badge" className="flex items-center gap-1 rounded-full bg-danger-bg px-3 py-1 text-table-sm font-medium text-danger">
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
            data-tour="drp-run-button"
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

      <div className="flex items-center gap-3 mb-5 flex-wrap" data-tour="drp-controls">
        <button
          onClick={() => { setShowLayer3(!showLayer3); setDrillCn(null); }}
          className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-table-sm font-medium transition-colors",
            showLayer3 ? "border-primary bg-primary/10 text-primary" : "border-surface-3 bg-surface-2 text-text-2 hover:text-text-1"
          )}
        >
          <Settings className="h-3.5 w-3.5" /> Tham số
        </button>
        {!showLayer3 && !activeCn && (
          <ViewPivotToggle value={pivotMode} onChange={(m) => { setPivotMode(m); setDrillCn(null); setDrillSku(null); }} />
        )}
      </div>

      {/* ═══ LỚP 1: Per CN (default) ═══ */}
      {!activeCn && !showLayer3 && (
        <div className="space-y-5 animate-slide-in-left" data-tour="drp-results-table">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <FormulaBar
                demand={totalDemand}
                stock={Math.round(3200 * s)}
                pipeline={Math.round(1757 * s)}
                ssBuffer={Math.round(1200 * s)}
              />
            </div>
            <LogicLink tab="monthly" node={2} tooltip="Logic cân đối Demand − Supply" />
          </div>
          <div className="rounded-card border border-surface-3 bg-surface-2">
          {/* Toolbar: export buttons */}
          <div className="px-4 py-2 border-b border-surface-3 flex items-center justify-between gap-3 flex-wrap bg-surface-1/30">
            <div className="text-caption text-text-3">
              <span className="font-medium text-text-2">Bảng Layer 1 — </span>
              {pivotMode === "cn" ? "CN-first" : "SKU-first"} · {expandedRows.size} dòng đang sổ
              {sourceFilter.size > 0 && <span className="ml-1 text-warning">· lọc {sourceFilter.size} nguồn</span>}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const rows = buildExportRows();
                  const ts = new Date().toISOString().slice(0, 10);
                  exportCsv(rows, `drp-layer1-${pivotMode}-${tenant.replace(/\s+/g, "_")}-${ts}.csv`);
                  toast.success(`Đã xuất CSV (${rows.length} dòng)`);
                }}
                className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-caption font-medium text-text-2 hover:text-text-1 hover:border-primary/40"
                title="Xuất CSV (mở bằng Excel/Google Sheets)"
              >
                <FileDown className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                onClick={() => {
                  const rows = buildExportRows();
                  const ts = new Date().toISOString().slice(0, 10);
                  const filters = SOURCE_FILTER_OPTIONS.filter(o => sourceFilter.has(o.key)).map(o => o.label);
                  exportPdf(rows, `drp-layer1-${pivotMode}-${tenant.replace(/\s+/g, "_")}-${ts}.pdf`, {
                    tenant, pivotMode, activeFilters: filters,
                  });
                  toast.success(`Đã xuất PDF (${rows.length} dòng)`);
                }}
                className="inline-flex items-center gap-1.5 rounded-button bg-gradient-primary text-primary-foreground px-3 py-1.5 text-caption font-medium hover:opacity-90"
                title="Xuất PDF báo cáo"
              >
                <FileText className="h-3.5 w-3.5" /> PDF
              </button>
            </div>
          </div>
          <div className="px-4 py-2 border-b border-surface-3 flex items-center justify-between gap-3 flex-wrap">
            <AllocSourceLegend />
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-caption text-text-3 font-medium mr-1">Lọc nguồn:</span>
              {SOURCE_FILTER_OPTIONS.map(opt => {
                const active = sourceFilter.has(opt.key);
                return (
                  <button
                    key={opt.key}
                    onClick={() => toggleSourceFilter(opt.key)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
                      active ? opt.cls : "border-surface-3 bg-surface-1 text-text-3 hover:text-text-2"
                    )}
                    title={active ? `Bỏ lọc ${opt.label}` : `Chỉ xem rows có ${opt.label}`}
                  >
                    {active ? "✓ " : ""}{opt.label}
                  </button>
                );
              })}
              {sourceFilter.size > 0 && (
                <button
                  onClick={() => setSourceFilter(new Set())}
                  className="text-[11px] text-text-3 hover:text-text-1 underline ml-1"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  <th className="w-10 px-3 py-2.5"></th>
                  {pivotMode === "cn"
                    ? ["CN", "Demand (m²)", "Có sẵn", "Fill rate", "Gap", "Exceptions", "Nguồn phân bổ", "Action"].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                      ))
                    : ["SKU", "Demand", "Allocated", "Fill rate", "Gap", "CN có gap", "Nguồn phân bổ", ""].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                      ))
                  }
                </tr>
              </thead>
              <tbody>
                {pivotMode === "cn" && data.filter(r => {
                  if (sourceFilter.size === 0) return true;
                  const cs = r.allSkus.reduce((acc, sk) => ({
                    onHand: acc.onHand + sk.sources.onHand,
                    pipeline: acc.pipeline + sk.sources.pipeline,
                    hubPo: acc.hubPo + sk.sources.hubPo,
                    lcnbIn: acc.lcnbIn + sk.sources.lcnbIn,
                    internalTransfer: acc.internalTransfer + sk.sources.internalTransfer,
                  }), { onHand: 0, pipeline: 0, hubPo: 0, lcnbIn: 0, internalTransfer: 0 });
                  return matchesSourceFilter(cs);
                }).map((r) => {
                  const rowKey = `cn-${r.cn}`;
                  const isOpen = expandedRows.has(rowKey);
                  const cnSources = r.allSkus.reduce((acc, sk) => ({
                    onHand: acc.onHand + sk.sources.onHand,
                    pipeline: acc.pipeline + sk.sources.pipeline,
                    hubPo: acc.hubPo + sk.sources.hubPo,
                    lcnbIn: acc.lcnbIn + sk.sources.lcnbIn,
                    internalTransfer: acc.internalTransfer + sk.sources.internalTransfer,
                  }), { onHand: 0, pipeline: 0, hubPo: 0, lcnbIn: 0, internalTransfer: 0 });
                  return (
                    <Fragment key={r.cn}>
                      <tr className={cn("border-b border-surface-3/50 hover:bg-surface-1/30", r.gap > 0 && "bg-danger-bg/20", isOpen && "bg-surface-1/40")}>
                        <td className="px-3 py-3 text-text-3 cursor-pointer" onClick={() => toggleRow(rowKey)}>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </td>
                        <td className="px-4 py-3 text-table font-medium text-text-1 cursor-pointer" onClick={() => toggleRow(rowKey)}>{r.cn}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-1">{r.demand.toLocaleString()}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-2">{r.available.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-surface-3 overflow-hidden">
                              <div className={cn("h-full rounded-full", r.fillRate >= 95 ? "bg-success" : r.fillRate >= 85 ? "bg-warning" : "bg-danger")} style={{ width: `${Math.min(r.fillRate, 100)}%` }} />
                            </div>
                            <span className={cn("text-table-sm font-medium", r.fillRate >= 95 ? "text-success" : r.fillRate >= 85 ? "text-warning" : "text-danger")}>{r.fillRate}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-table tabular-nums">
                          {r.gap > 0 ? <span className="text-danger font-medium">{r.gap.toLocaleString()}</span> : <span className="text-text-3">0</span>}
                        </td>
                        <td className="px-4 py-3 text-table">
                          {r.exceptions > 0 ? <span className="text-danger font-medium">{r.exceptions} items</span> : <span className="text-text-3">0</span>}
                        </td>
                        <td className="px-4 py-3"><AllocSourceBar sources={cnSources} compact demand={r.demand} allocated={r.demand - r.gap} /></td>
                        <td className="px-4 py-3">
                          {r.exceptions > 0 ? (
                            <button onClick={(e) => { e.stopPropagation(); setDrillCn(r.cn); }} className="text-primary text-table-sm font-medium hover:underline">Xử lý ▸</button>
                          ) : <span className="text-text-3">—</span>}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-surface-1/20">
                          <td></td>
                          <td colSpan={8} className="px-4 py-3">
                            <ExpandedSkuBreakdown title={`SKU breakdown — ${r.cn}`} skus={r.allSkus.filter(sk => matchesSourceFilter(sk.sources))} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {pivotMode === "sku" && skuAggDrp.filter(sk => matchesSourceFilter(sk.sources)).map((sk) => {
                  const rowKey = `sku-${sk.item}-${sk.variant}`;
                  const isOpen = expandedRows.has(rowKey);
                  return (
                    <Fragment key={rowKey}>
                      <tr className={cn("border-b border-surface-3/50 hover:bg-surface-1/30", sk.totalGap > 0 && "bg-danger-bg/20", isOpen && "bg-surface-1/40")}>
                        <td className="px-3 py-3 text-text-3 cursor-pointer" onClick={() => toggleRow(rowKey)}>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </td>
                        <td className="px-4 py-3 text-table font-medium text-text-1 cursor-pointer" onClick={() => toggleRow(rowKey)}>
                          {sk.item} <span className="text-text-3 font-normal">{sk.variant}</span>
                        </td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-1">{sk.totalDemand.toLocaleString()}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-2">{sk.totalAllocated.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-surface-3 overflow-hidden">
                              <div className={cn("h-full rounded-full", sk.fillPct >= 95 ? "bg-success" : sk.fillPct >= 85 ? "bg-warning" : "bg-danger")} style={{ width: `${Math.min(sk.fillPct, 100)}%` }} />
                            </div>
                            <span className={cn("text-table-sm font-medium", sk.fillPct >= 95 ? "text-success" : sk.fillPct >= 85 ? "text-warning" : "text-danger")}>{sk.fillPct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-table tabular-nums">
                          {sk.totalGap > 0 ? <span className="text-danger font-medium">{sk.totalGap.toLocaleString()}</span> : <span className="text-text-3">0</span>}
                        </td>
                        <td className="px-4 py-3 text-table">
                          <CnGapBadge count={sk.cnGapCount} />
                          {sk.lcnb && <span className="ml-1"><LcnbBadge text={sk.lcnb} /></span>}
                        </td>
                        <td className="px-4 py-3"><AllocSourceBar sources={sk.sources} compact demand={sk.totalDemand} allocated={sk.totalAllocated} /></td>
                        <td></td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-surface-1/20">
                          <td></td>
                          <td colSpan={8} className="px-4 py-3">
                            <ExpandedCnBreakdown title={`CN breakdown — ${sk.item} ${sk.variant}`} cnRows={sk.cnRows.filter(cr => matchesSourceFilter(cr.sources))} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}

                {pivotMode === "cn" && sourceFilter.size === 0 && (
                  <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                    <td></td>
                    <td className="px-4 py-3 text-table text-text-1">TOTAL</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalDemand.toLocaleString()}</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-2">{data.reduce((a, r) => a + r.available, 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-table-sm font-medium text-text-1">{totalFill}%</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalGap.toLocaleString()}</td>
                    <td className="px-4 py-3 text-table text-text-1">{totalExc}</td>
                    <td></td>
                    <td></td>
                  </tr>
                )}
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

                                {/* SECTION A: Netting — Bridge */}
                                <div>
                                  <h4 className="text-caption font-medium text-text-3 uppercase mb-2">Netting</h4>
                                  <DemandToOrderBridge
                                    item={ex.item}
                                    variant={ex.variant}
                                    cn={activeCn.cn}
                                    steps={buildFullBridgeSteps({
                                      demand: ex.demand,
                                      fcPhased: ex.netting.fcPhased,
                                      cnAdj: Math.round((ex.demand - ex.netting.fcPhased) * 0.47),
                                      po: Math.round((ex.demand - ex.netting.fcPhased) * 0.53 + 151),
                                      overlap: 151,
                                      onHand: ex.netting.onHand,
                                      pipeline: ex.netting.pipeline,
                                      pipelineSource: "Toko RPO-TKO-2605-W16-001, ETA 17/05 (trễ 4d)",
                                      ssTarget: ex.netting.ssTarget,
                                      zVal: 1.65,
                                      sigma: 28.5,
                                      lt: 14,
                                      moq: 1000,
                                      moqNm: "Mikado",
                                      finalOrder: 1000,
                                      rpoNum: "RPO-MKD-2605-W17-002",
                                    })}
                                    toStep={ex.type === "SHORTAGE" ? 7 : 5}
                                  />
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

          {/* Section: Internal Transfer & Lateral movements */}
          {(() => {
            type Eta = "Same-day" | "1 ngày" | "Quá hạn";
            type Move = {
              direction: "in" | "out";
              kind: "internal" | "lateral";
              item: string;
              variant: string;
              qty: number;
              counterpart: string;
              reason: string;
              eta: Eta;
              toCode: string;
            };
            const moves: Move[] = [];
            activeCn.allSkus.forEach((sk) => {
              if (sk.sources.internalTransfer > 0) {
                moves.push({
                  direction: "in", kind: "internal", item: sk.item, variant: sk.variant,
                  qty: sk.sources.internalTransfer,
                  counterpart: `${activeCn.cn}/WH-vệ tinh → ${activeCn.cn}/DC`,
                  reason: "Cân bằng tồn giữa kho cùng CN để đáp ứng demand cụm",
                  eta: "Same-day",
                  toCode: `TO-${activeCn.cn}-INT-${sk.item}-001`,
                });
              } else if (sk.sources.internalTransfer < 0) {
                const receiver = data.find(c => c.cn !== activeCn.cn
                  && c.allSkus.some(o => o.item === sk.item && o.variant === sk.variant && o.sources.lcnbIn > 0));
                const qty = Math.abs(sk.sources.internalTransfer);
                moves.push({
                  direction: "out", kind: "lateral", item: sk.item, variant: sk.variant,
                  qty,
                  counterpart: `${activeCn.cn} → ${receiver?.cn ?? "CN khác"}`,
                  reason: receiver ? `LCNB cover shortage tại ${receiver.cn} (gap > 0). Tiết kiệm cost vs PO mới.` : "Excess on-hand, chuyển sang CN khác để tránh tồn dư",
                  eta: qty > 200 ? "Quá hạn" : "1 ngày",
                  toCode: `TO-${activeCn.cn}-${receiver?.cn ?? "X"}-${sk.item}-001`,
                });
              }
              if (sk.sources.lcnbIn > 0) {
                const giver = data.find(c => c.cn !== activeCn.cn
                  && c.allSkus.some(o => o.item === sk.item && o.variant === sk.variant && o.sources.internalTransfer < 0));
                moves.push({
                  direction: "in", kind: "lateral", item: sk.item, variant: sk.variant,
                  qty: sk.sources.lcnbIn,
                  counterpart: `${giver?.cn ?? "CN khác"} → ${activeCn.cn}`,
                  reason: `Cover shortage SKU ${sk.item} ${sk.variant} từ excess ${giver?.cn ?? "CN khác"}`,
                  eta: sk.sources.lcnbIn > 200 ? "Quá hạn" : "1 ngày",
                  toCode: `TO-${giver?.cn ?? "X"}-${activeCn.cn}-${sk.item}-001`,
                });
              }
            });

            const etaOptions: { key: Eta; label: string; tone: string }[] = [
              { key: "Same-day", label: "Same-day", tone: "border-success/40 bg-success-bg text-success" },
              { key: "1 ngày", label: "1 ngày", tone: "border-warning/40 bg-warning/10 text-warning" },
              { key: "Quá hạn", label: "Quá hạn", tone: "border-danger/40 bg-danger-bg text-danger" },
            ];
            const etaCount: Record<Eta, number> = { "Same-day": 0, "1 ngày": 0, "Quá hạn": 0 };
            moves.forEach(m => { etaCount[m.eta]++; });
            const visibleMoves = etaFilter.size === 0 ? moves : moves.filter(m => etaFilter.has(m.eta));
            const totalIn = visibleMoves.filter(m => m.direction === "in").reduce((s, m) => s + m.qty, 0);
            const totalOut = visibleMoves.filter(m => m.direction === "out").reduce((s, m) => s + m.qty, 0);
            const net = totalIn - totalOut;

            // Risk reduction estimates (per-unit assumptions, tenant-agnostic demo values)
            const UNIT_REVENUE = 120_000; // ₫/unit — avg gross revenue per unit if shortage avoided
            const UNIT_MARGIN_RATE = 0.22; // 22% gross margin → margin at risk
            const UNIT_COST_SAVED = 15_000; // ₫/unit — logistics+expedite saved vs new factory PO
            // Inbound moves cover gap → revenue at risk avoided
            const revenueAtRiskAvoided = totalIn * UNIT_REVENUE;
            const marginAtRiskAvoided = Math.round(revenueAtRiskAvoided * UNIT_MARGIN_RATE);
            // Outbound lateral (LCNB) avoids new PO at receiving CN → cost saved
            const costAvoided = visibleMoves
              .filter(m => m.direction === "out" && m.kind === "lateral")
              .reduce((s, m) => s + m.qty, 0) * UNIT_COST_SAVED;
            const totalImpact = marginAtRiskAvoided + costAvoided;
            const fmtVnd = (n: number) => {
              if (n >= 1_000_000_000) return `₫${(n / 1_000_000_000).toFixed(2)}B`;
              if (n >= 1_000_000) return `₫${(n / 1_000_000).toFixed(1)}M`;
              if (n >= 1_000) return `₫${(n / 1_000).toFixed(0)}K`;
              return `₫${n.toLocaleString()}`;
            };

            const toggleEta = (k: Eta) => {
              setEtaFilter(prev => {
                const next = new Set(prev);
                if (next.has(k)) next.delete(k); else next.add(k);
                return next;
              });
            };

            return (
              <div className="rounded-card border border-surface-3 bg-surface-2">
                <div className="px-5 py-3 border-b border-surface-3 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-body font-semibold text-text-1">Internal Transfer & LCNB</h3>
                    <span className="text-caption text-text-3">— {activeCn.cn}</span>
                  </div>
                  <div className="flex items-center gap-3 text-caption flex-wrap">
                    <span className="inline-flex items-center gap-1 text-success">
                      <ArrowRight className="h-3 w-3" /> Nhận: <span className="font-semibold tabular-nums">{totalIn.toLocaleString()}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-warning">
                      <ArrowRight className="h-3 w-3 rotate-180" /> Chuyển đi: <span className="font-semibold tabular-nums">{totalOut.toLocaleString()}</span>
                    </span>
                    <span className="text-text-3">Net: <span className={cn("font-semibold tabular-nums", net >= 0 ? "text-success" : "text-warning")}>{net > 0 ? "+" : ""}{net.toLocaleString()}</span></span>
                  </div>
                </div>
                {/* Risk-reduction summary strip */}
                <div className="px-5 py-2.5 border-b border-surface-3 bg-gradient-to-r from-success-bg/40 via-surface-1/30 to-accent/20 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div
                      className="flex flex-col"
                      title={`Revenue at risk = Inbound qty (${totalIn.toLocaleString()}) × ₫${UNIT_REVENUE.toLocaleString()}/unit`}
                    >
                      <span className="text-table-header uppercase text-text-3 tracking-wide">Revenue at risk avoided</span>
                      <span className="font-display text-body font-semibold text-success tabular-nums">{fmtVnd(revenueAtRiskAvoided)}</span>
                    </div>
                    <div className="h-8 w-px bg-surface-3" />
                    <div
                      className="flex flex-col"
                      title={`Margin = Revenue × ${(UNIT_MARGIN_RATE * 100).toFixed(0)}% gross margin`}
                    >
                      <span className="text-table-header uppercase text-text-3 tracking-wide">Margin protected</span>
                      <span className="font-display text-body font-semibold text-text-1 tabular-nums">{fmtVnd(marginAtRiskAvoided)}</span>
                    </div>
                    <div className="h-8 w-px bg-surface-3" />
                    <div
                      className="flex flex-col"
                      title={`Cost saved = Outbound LCNB qty × ₫${UNIT_COST_SAVED.toLocaleString()}/unit (vs new factory PO logistics + expedite)`}
                    >
                      <span className="text-table-header uppercase text-text-3 tracking-wide">Cost avoided (LCNB)</span>
                      <span className="font-display text-body font-semibold text-accent-foreground tabular-nums">{fmtVnd(costAvoided)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-table-header uppercase text-text-3 tracking-wide">Tổng tác động</span>
                    <span className="font-display text-h3 font-bold text-primary tabular-nums">{fmtVnd(totalImpact)}</span>
                  </div>
                </div>
                {/* Qty basis: contributors to revenue/cost calc */}
                {(() => {
                  const inboundContribs = visibleMoves.filter(m => m.direction === "in");
                  const outboundLcnbContribs = visibleMoves.filter(m => m.direction === "out" && m.kind === "lateral");
                  if (inboundContribs.length === 0 && outboundLcnbContribs.length === 0) return null;
                  return (
                    <details className="border-b border-surface-3 group" open>
                      <summary className="px-5 py-2 cursor-pointer flex items-center gap-2 text-caption text-text-3 hover:bg-surface-1/30 list-none [&::-webkit-details-marker]:hidden">
                        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                        <span className="font-medium text-text-2">Qty basis</span>
                        <span className="text-text-3">— {inboundContribs.length} inbound (Internal/LCNB) · {outboundLcnbContribs.length} outbound LCNB</span>
                        {etaFilter.size > 0 && (
                          <span className="ml-auto text-warning">Đang lọc ETA: {Array.from(etaFilter).join(", ")}</span>
                        )}
                      </summary>
                      <div className="px-5 pb-3 grid md:grid-cols-2 gap-3">
                        {/* Inbound contributors → revenue/margin */}
                        <div className="rounded-card border border-surface-3 bg-surface-0">
                          <div className="px-3 py-1.5 border-b border-surface-3 flex items-center justify-between">
                            <span className="text-caption font-medium text-success">↘ Inbound (revenue/margin basis)</span>
                            <span className="text-caption text-text-3 tabular-nums">
                              Σ {inboundContribs.reduce((s, m) => s + m.qty, 0).toLocaleString()}
                            </span>
                          </div>
                          {inboundContribs.length === 0 ? (
                            <div className="px-3 py-2 text-caption text-text-3 italic">Không có inbound trong bộ lọc.</div>
                          ) : (
                            <ul className="divide-y divide-surface-3/60">
                              {inboundContribs.map((m, i) => (
                                <li key={i} className="px-3 py-1.5 flex items-center gap-2 text-caption hover:bg-surface-1/40">
                                  <span className={cn("rounded px-1.5 py-0 text-[10px] font-medium border whitespace-nowrap",
                                    m.kind === "internal" ? "border-accent bg-accent text-accent-foreground" : "border-warning/30 bg-warning/10 text-warning"
                                  )}>{m.kind === "internal" ? "Int.TO" : "LCNB"}</span>
                                  <span className="text-text-1 font-medium truncate">{m.item} {m.variant}</span>
                                  <span className="text-text-3 truncate flex-1">· {m.counterpart}</span>
                                  <span className={cn("text-text-3 whitespace-nowrap",
                                    m.eta === "Same-day" && "text-success",
                                    m.eta === "1 ngày" && "text-warning",
                                    m.eta === "Quá hạn" && "text-danger",
                                  )}>{m.eta}</span>
                                  <span className="tabular-nums font-semibold text-success whitespace-nowrap">+{m.qty.toLocaleString()}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {/* Outbound LCNB contributors → cost saved */}
                        <div className="rounded-card border border-surface-3 bg-surface-0">
                          <div className="px-3 py-1.5 border-b border-surface-3 flex items-center justify-between">
                            <span className="text-caption font-medium text-warning">↗ Outbound LCNB (cost-saved basis)</span>
                            <span className="text-caption text-text-3 tabular-nums">
                              Σ {outboundLcnbContribs.reduce((s, m) => s + m.qty, 0).toLocaleString()}
                            </span>
                          </div>
                          {outboundLcnbContribs.length === 0 ? (
                            <div className="px-3 py-2 text-caption text-text-3 italic">Không có outbound LCNB trong bộ lọc.</div>
                          ) : (
                            <ul className="divide-y divide-surface-3/60">
                              {outboundLcnbContribs.map((m, i) => (
                                <li key={i} className="px-3 py-1.5 flex items-center gap-2 text-caption hover:bg-surface-1/40">
                                  <span className="rounded px-1.5 py-0 text-[10px] font-medium border border-warning/30 bg-warning/10 text-warning whitespace-nowrap">LCNB</span>
                                  <span className="text-text-1 font-medium truncate">{m.item} {m.variant}</span>
                                  <span className="text-text-3 truncate flex-1">· {m.counterpart}</span>
                                  <span className={cn("text-text-3 whitespace-nowrap",
                                    m.eta === "Same-day" && "text-success",
                                    m.eta === "1 ngày" && "text-warning",
                                    m.eta === "Quá hạn" && "text-danger",
                                  )}>{m.eta}</span>
                                  <span className="tabular-nums font-semibold text-warning whitespace-nowrap">−{m.qty.toLocaleString()}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </details>
                  );
                })()}
                {/* ETA filter chips */}
                <div className="px-5 py-2 border-b border-surface-3 flex items-center gap-2 flex-wrap bg-surface-1/30">
                  <span className="text-caption text-text-3 mr-1">Lọc ETA:</span>
                  {etaOptions.map(opt => {
                    const active = etaFilter.has(opt.key);
                    const count = etaCount[opt.key];
                    return (
                      <button
                        key={opt.key}
                        onClick={() => toggleEta(opt.key)}
                        disabled={count === 0}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-caption font-medium transition",
                          active ? opt.tone + " ring-2 ring-offset-1 ring-offset-surface-2 ring-current" : "border-surface-3 bg-surface-0 text-text-2 hover:text-text-1",
                          count === 0 && "opacity-40 cursor-not-allowed",
                        )}
                        title={count === 0 ? "Không có transfer ở mức ETA này" : `${count} transfer`}
                      >
                        {opt.label}
                        <span className="tabular-nums opacity-80">({count})</span>
                      </button>
                    );
                  })}
                  {etaFilter.size > 0 && (
                    <button
                      onClick={() => setEtaFilter(new Set())}
                      className="ml-1 text-caption text-text-3 hover:text-text-1 underline-offset-2 hover:underline"
                    >
                      Xóa lọc
                    </button>
                  )}
                  <span className="ml-auto text-caption text-text-3">
                    Hiển thị <span className="font-semibold text-text-2 tabular-nums">{visibleMoves.length}</span>/{moves.length}
                  </span>
                </div>
                {visibleMoves.length === 0 ? (
                  <div className="px-5 py-6 text-caption text-text-3 italic text-center">
                    {moves.length === 0
                      ? "Không có Transfer Order liên quan đến CN này trong DRP run hiện tại."
                      : "Không có transfer nào khớp bộ lọc ETA. Bỏ chọn để xem lại."}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-surface-3 bg-surface-1/50">
                          {["Hướng", "Loại", "Item", "Variant", "Qty", "Đối tác CN/WH", "Lý do TO", "ETA", "TO #", ""].map((h, i) => (
                            <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleMoves.map((m, i) => (
                          <tr key={i} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                            <td className="px-4 py-2.5">
                              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium",
                                m.direction === "in" ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
                              )}>
                                {m.direction === "in" ? "↘ Nhận" : "↗ Chuyển đi"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium border",
                                m.kind === "internal" ? "border-accent bg-accent text-accent-foreground" : "border-warning/30 bg-warning/10 text-warning"
                              )}>
                                {m.kind === "internal" ? "Internal TO" : "LCNB Lateral"}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-table font-medium text-text-1">{m.item}</td>
                            <td className="px-4 py-2.5 text-table text-text-2">{m.variant}</td>
                            <td className={cn("px-4 py-2.5 text-table tabular-nums font-medium", m.direction === "in" ? "text-success" : "text-warning")}>
                              {m.direction === "in" ? "+" : "−"}{m.qty.toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 text-table text-text-2 whitespace-nowrap">{m.counterpart}</td>
                            <td className="px-4 py-2.5 text-caption text-text-2 max-w-[280px]">{m.reason}</td>
                            <td className="px-4 py-2.5">
                              <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium border",
                                m.eta === "Same-day" && "border-success/40 bg-success-bg text-success",
                                m.eta === "1 ngày" && "border-warning/40 bg-warning/10 text-warning",
                                m.eta === "Quá hạn" && "border-danger/40 bg-danger-bg text-danger",
                              )}>
                                {m.eta}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-caption font-mono text-text-3">{m.toCode}</td>
                            <td className="px-4 py-2.5">
                              <button
                                onClick={() => setSelectedMove(m)}
                                className="rounded-button border border-surface-3 px-2.5 py-1 text-caption font-medium text-text-2 hover:text-text-1 hover:border-primary/40"
                              >
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

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
                                onClick={() => {
                                  applySsChange("CN-BD", sk.item, sk.variant, sk.z, "Planner", "Apply from DRP Layer 3", "drp");
                                  toast.success("SS cập nhật (đồng bộ DRP ↔ Monitoring)", { description: `${sk.item} ${sk.variant}: ${sk.ssCurrent}→${sk.ssProposed}. DRP đêm nay dùng SS mới.` });
                                }}
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
                      {["Thời gian", "Ai", "Thay đổi", "Lý do", "Nguồn"].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ssChangeLog.map((log, i) => (
                      <tr key={i} className="border-b border-surface-3/50">
                        <td className="px-4 py-2.5 text-table tabular-nums text-text-2">{log.time}</td>
                        <td className="px-4 py-2.5 text-table text-text-1">{log.who}</td>
                        <td className="px-4 py-2.5 text-table text-text-1 font-mono text-[11px]">{log.change}</td>
                        <td className="px-4 py-2.5 text-table text-text-3">{log.reason}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", log.source === "drp" ? "bg-primary/10 text-primary" : "bg-info-bg text-info")}>
                            {log.source === "drp" ? "DRP" : "Monitoring"}
                          </span>
                        </td>
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
                <button onClick={() => { applySsChange(simCn, skuRef.item, skuRef.variant, simZ, "Planner", `Simulation z=${simZ.toFixed(2)}`, "drp"); toast.success("SS cập nhật (đồng bộ DRP ↔ Monitoring)", { description: `${simSku} ${simCn}: ${skuRef.ssCurrent}→${simSs}. Gửi Workspace duyệt.` }); setShowSimModal(false); }}
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
      <ScreenFooter actionCount={14} />

      {/* TO Detail slide-in panel */}
      <Sheet open={!!selectedMove} onOpenChange={(o) => !o && setSelectedMove(null)}>
        <SheetContent side="right" className="w-full sm:max-w-[480px] overflow-y-auto bg-surface-1">
          {selectedMove && (() => {
            const m = selectedMove;
            // Derive deterministic synthetic line items + dates from the move
            const today = new Date();
            const created = new Date(today); created.setDate(today.getDate() - 1);
            const etaDays = m.eta === "Same-day" ? 0 : m.eta === "1 ngày" ? 1 : -2;
            const etaDate = new Date(today); etaDate.setDate(today.getDate() + etaDays);
            const fmtDate = (d: Date) => d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
            const fmtDT = (d: Date) => d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
            // Split qty into 2-3 batches
            const batches = m.qty > 300
              ? [Math.round(m.qty * 0.5), Math.round(m.qty * 0.3), m.qty - Math.round(m.qty * 0.5) - Math.round(m.qty * 0.3)]
              : m.qty > 100 ? [Math.round(m.qty * 0.6), m.qty - Math.round(m.qty * 0.6)] : [m.qty];
            const lineItems = batches.map((q, i) => ({
              line: i + 1,
              sku: `${m.item} ${m.variant}`,
              batch: `B${String(today.getFullYear()).slice(2)}${String(today.getMonth() + 1).padStart(2, "0")}-${String(i + 1).padStart(3, "0")}`,
              qty: q,
              uom: "carton",
            }));
            // Status timeline based on ETA
            const statusSteps = [
              { key: "created", label: "Tạo TO", at: fmtDT(created), done: true },
              { key: "approved", label: "Duyệt", at: m.eta === "Quá hạn" ? "—" : fmtDT(new Date(created.getTime() + 3 * 3600 * 1000)), done: m.eta !== "Quá hạn" },
              { key: "shipped", label: "Đã xuất kho", at: m.eta === "Same-day" ? fmtDT(today) : "—", done: m.eta === "Same-day" },
              { key: "received", label: "Nhận", at: "—", done: false },
            ];
            const currentStatus = m.eta === "Same-day" ? "Đang vận chuyển" : m.eta === "Quá hạn" ? "Chờ duyệt (trễ)" : "Đã duyệt";
            const statusTone = m.eta === "Same-day" ? "bg-success-bg text-success" : m.eta === "Quá hạn" ? "bg-danger-bg text-danger" : "bg-warning/10 text-warning";

            return (
              <>
                <SheetHeader className="space-y-2 pb-4 border-b border-surface-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium border",
                      m.kind === "internal" ? "border-accent bg-accent text-accent-foreground" : "border-warning/30 bg-warning/10 text-warning"
                    )}>
                      {m.kind === "internal" ? "Internal TO" : "LCNB Lateral"}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", statusTone)}>{currentStatus}</span>
                  </div>
                  <SheetTitle className="font-display text-h3 font-bold text-text-1 font-mono break-all">{m.toCode}</SheetTitle>
                  <SheetDescription className="text-caption text-text-3">
                    {m.counterpart}
                  </SheetDescription>
                </SheetHeader>

                {/* Summary */}
                <div className="grid grid-cols-3 gap-3 py-4 border-b border-surface-3">
                  <div>
                    <div className="text-table-header uppercase text-text-3 tracking-wide">Hướng</div>
                    <div className={cn("font-display text-body font-semibold", m.direction === "in" ? "text-success" : "text-warning")}>
                      {m.direction === "in" ? "↘ Nhận" : "↗ Chuyển đi"}
                    </div>
                  </div>
                  <div>
                    <div className="text-table-header uppercase text-text-3 tracking-wide">Tổng qty</div>
                    <div className="font-display text-body font-semibold text-text-1 tabular-nums">{m.qty.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-table-header uppercase text-text-3 tracking-wide">ETA</div>
                    <div className={cn("font-display text-body font-semibold",
                      m.eta === "Same-day" && "text-success",
                      m.eta === "1 ngày" && "text-warning",
                      m.eta === "Quá hạn" && "text-danger",
                    )}>{m.eta}</div>
                  </div>
                </div>

                {/* Dates */}
                <div className="py-4 border-b border-surface-3 space-y-2">
                  <div className="text-table-header uppercase text-text-3 tracking-wide mb-1">Ngày</div>
                  <div className="flex justify-between text-table">
                    <span className="text-text-3">Tạo lúc</span>
                    <span className="text-text-1 tabular-nums">{fmtDate(created)}</span>
                  </div>
                  <div className="flex justify-between text-table">
                    <span className="text-text-3">ETA giao</span>
                    <span className={cn("tabular-nums font-medium",
                      m.eta === "Quá hạn" ? "text-danger" : "text-text-1"
                    )}>{fmtDate(etaDate)}{m.eta === "Quá hạn" && " (trễ 2 ngày)"}</span>
                  </div>
                </div>

                {/* Line items */}
                <div className="py-4 border-b border-surface-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-table-header uppercase text-text-3 tracking-wide">Line items</div>
                    <span className="text-caption text-text-3">{lineItems.length} dòng</span>
                  </div>
                  <div className="rounded-card border border-surface-3 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-surface-2 border-b border-surface-3">
                          <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">#</th>
                          <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">SKU</th>
                          <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">Batch</th>
                          <th className="px-3 py-2 text-right text-table-header uppercase text-text-3">Qty</th>
                          <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">UoM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map(li => (
                          <tr key={li.line} className="border-b border-surface-3/50 last:border-0">
                            <td className="px-3 py-2 text-table text-text-3 tabular-nums">{li.line}</td>
                            <td className="px-3 py-2 text-table font-medium text-text-1">{li.sku}</td>
                            <td className="px-3 py-2 text-caption font-mono text-text-2">{li.batch}</td>
                            <td className="px-3 py-2 text-table tabular-nums text-text-1 text-right">{li.qty.toLocaleString()}</td>
                            <td className="px-3 py-2 text-caption text-text-3">{li.uom}</td>
                          </tr>
                        ))}
                        <tr className="bg-surface-2/60">
                          <td colSpan={3} className="px-3 py-2 text-caption font-medium text-text-2 text-right">Tổng</td>
                          <td className="px-3 py-2 text-table tabular-nums font-semibold text-text-1 text-right">{m.qty.toLocaleString()}</td>
                          <td className="px-3 py-2 text-caption text-text-3">carton</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Status timeline */}
                <div className="py-4 border-b border-surface-3">
                  <div className="text-table-header uppercase text-text-3 tracking-wide mb-3">Trạng thái</div>
                  <ol className="space-y-3">
                    {statusSteps.map((s, i) => (
                      <li key={s.key} className="flex items-start gap-3">
                        <div className={cn("mt-0.5 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                          s.done ? "bg-success text-success-foreground" : "bg-surface-3 text-text-3"
                        )}>{s.done ? "✓" : i + 1}</div>
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <span className={cn("text-table", s.done ? "text-text-1 font-medium" : "text-text-3")}>{s.label}</span>
                          <span className="text-caption text-text-3 tabular-nums">{s.at}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Reason */}
                <div className="py-4">
                  <div className="text-table-header uppercase text-text-3 tracking-wide mb-2">Lý do TO</div>
                  <p className="text-table text-text-2 leading-relaxed">{m.reason}</p>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

    </AppLayout>
  );
}

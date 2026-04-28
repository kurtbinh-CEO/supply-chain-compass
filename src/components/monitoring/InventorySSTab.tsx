import { useState } from "react";
import { cn } from "@/lib/utils";
import { PackageSearch } from "lucide-react";
import { ViewPivotToggle, usePivotMode, WorstCnCell, CnGapBadge, LcnbBadge } from "@/components/ViewPivotToggle";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogicLink } from "@/components/LogicLink";
import { LogicTooltip } from "@/components/LogicTooltip";
import { DemandToOrderBridge, buildFullBridgeSteps } from "@/components/DemandToOrderBridge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useSafetyStock } from "@/components/SafetyStockContext";
import { SkuDetailSheet } from "@/components/SkuDetailSheet";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { StatusChip } from "@/components/StatusChip";

/* ═══ DATA ═══ */
const invTrendBase = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const dateStr = `${String(day).padStart(2, "0")}/05`;
  return {
    date: dateStr,
    "CN-BD": { available: 1200 + Math.round(Math.sin(i / 4) * 200), reserved: 300 + Math.round(Math.cos(i / 3) * 80), ss: 2900 },
    "CN-ĐN": { available: 3500 + Math.round(Math.cos(i / 5) * 300), reserved: 400 + Math.round(Math.sin(i / 4) * 100), ss: 2400 },
    "CN-HN": { available: 2300 + Math.round(Math.sin(i / 6) * 200), reserved: 350 + Math.round(Math.cos(i / 5) * 60), ss: 2100 },
    "CN-CT": { available: 1900 + Math.round(Math.cos(i / 4) * 150), reserved: 250 + Math.round(Math.sin(i / 3) * 50), ss: 1500 },
  };
});

function getInvTrend(filter: string) {
  return invTrendBase.map((d) => {
    if (filter === "all") {
      const cns = ["CN-BD", "CN-ĐN", "CN-HN", "CN-CT"] as const;
      return {
        date: d.date,
        available: cns.reduce((a, c) => a + d[c].available, 0),
        reserved: cns.reduce((a, c) => a + d[c].reserved, 0),
        ss: cns.reduce((a, c) => a + d[c].ss, 0),
      };
    }
    const cn = d[filter as keyof typeof d] as { available: number; reserved: number; ss: number };
    return { date: d.date, available: cn.available, reserved: cn.reserved, ss: cn.ss };
  });
}

interface CnInvRow {
  cn: string; ton: number; available: number; ssTarget: number; ssActual: number; ssGap: number;
  hstk: number; replenish: number; status: string; turnover: number;
  skus: SkuRow[];
}

interface SkuRow {
  item: string; variant: string; demand: number; ton: number; pipeline: number; pipelineSource: string;
  ssTarget: number; ssGap: number; netReq: number; moq: number; moqNm: string; order: number; status: string;
  fcPhased: number; cnAdj: number; po: number; overlap: number; onHand: number;
  zVal: number; sigma: number; lt: number; rpoNum: string;
}

const baseCnData: CnInvRow[] = [
  {
    cn: "CN-BD", ton: 2100, available: 1350, ssTarget: 2900, ssActual: 2100, ssGap: -800, hstk: 5.2, replenish: 1993, status: "THIẾU SS", turnover: 4.8,
    skus: [
      { item: "GA-300", variant: "A4", demand: 617, ton: 120, pipeline: 557, pipelineSource: "RPO-TKO-W15 ETA 17/05 (trễ 4d)", ssTarget: 900, ssGap: -780, netReq: 840, moq: 1000, moqNm: "Mikado", order: 1000, status: "RPO draft", fcPhased: 524, cnAdj: 44, po: 200, overlap: 151, onHand: 120, zVal: 1.65, sigma: 28.5, lt: 14, rpoNum: "RPO-MKD-2605-W17-002" },
      { item: "GA-300", variant: "B2", demand: 178, ton: 380, pipeline: 0, pipelineSource: "—", ssTarget: 700, ssGap: -320, netReq: 498, moq: 500, moqNm: "Mikado", order: 500, status: "RPO draft", fcPhased: 150, cnAdj: 18, po: 30, overlap: 20, onHand: 380, zVal: 1.65, sigma: 22.1, lt: 12, rpoNum: "RPO-MKD-2605-W17-003" },
      { item: "GA-400", variant: "A4", demand: 347, ton: 800, pipeline: 0, pipelineSource: "—", ssTarget: 600, ssGap: 200, netReq: 147, moq: 500, moqNm: "Đồng Tâm", order: 500, status: "Pending", fcPhased: 300, cnAdj: 27, po: 40, overlap: 20, onHand: 800, zVal: 1.65, sigma: 18.3, lt: 14, rpoNum: "RPO-DT-2605-W17-001" },
      { item: "GA-600", variant: "A4", demand: 881, ton: 2100, pipeline: 0, pipelineSource: "—", ssTarget: 1000, ssGap: 1100, netReq: 0, moq: 0, moqNm: "—", order: 0, status: "Đủ hàng ✅", fcPhased: 750, cnAdj: 81, po: 100, overlap: 50, onHand: 2100, zVal: 1.65, sigma: 32.0, lt: 10, rpoNum: "—" },
      { item: "GA-300", variant: "C1", demand: 120, ton: 320, pipeline: 0, pipelineSource: "—", ssTarget: 150, ssGap: 170, netReq: 0, moq: 0, moqNm: "—", order: 0, status: "Đủ hàng ✅", fcPhased: 100, cnAdj: 10, po: 15, overlap: 5, onHand: 320, zVal: 1.65, sigma: 8.5, lt: 14, rpoNum: "—" },
      { item: "GA-600", variant: "B2", demand: 200, ton: 650, pipeline: 0, pipelineSource: "—", ssTarget: 500, ssGap: 150, netReq: 0, moq: 0, moqNm: "—", order: 0, status: "Đủ hàng ✅", fcPhased: 170, cnAdj: 15, po: 25, overlap: 10, onHand: 650, zVal: 1.65, sigma: 20.0, lt: 10, rpoNum: "—" },
    ],
  },
  { cn: "CN-ĐN", ton: 4500, available: 3800, ssTarget: 2400, ssActual: 3800, ssGap: 1400, hstk: 14, replenish: 200, status: "THỪA", turnover: 2.1, skus: [] },
  { cn: "CN-HN", ton: 3200, available: 2500, ssTarget: 2100, ssActual: 2500, ssGap: 400, hstk: 9, replenish: 800, status: "OK", turnover: 3.5, skus: [] },
  { cn: "CN-CT", ton: 2800, available: 2100, ssTarget: 1500, ssActual: 2100, ssGap: 600, hstk: 11, replenish: 150, status: "OK", turnover: 2.8, skus: [] },
];

/* ═══ HELPERS ═══ */
function hstkColor(d: number) { return d < 5 ? "text-danger" : d < 10 ? "text-warning" : "text-success"; }
function hstkBg(d: number) { return d < 5 ? "bg-danger" : d < 10 ? "bg-warning" : "bg-success"; }
function statusVariant(s: string): "danger" | "info" | "success" | "warning" {
  if (s === "THIẾU SS") return "danger";
  if (s === "THỪA") return "info";
  if (s === "OK" || s === "Đủ hàng ✅") return "success";
  return "warning";
}

interface Props { scale: number }

/* ═══ SKU drill (CN-first) — SmartTable compact ═══ */
interface SkuDrillRow extends SkuRow { _rowId: string; _cn: string }
function CnSkuDrill({
  rows, cn, onSku, onBridge, expandedBridge,
}: { rows: SkuDrillRow[]; cn: string; onSku: (k: string) => void; onBridge: (k: string | null) => void; expandedBridge: string | null }) {
  const cols: SmartTableColumn<SkuDrillRow>[] = [
    {
      key: "sku", label: "SKU", width: 180, hideable: false, priority: "high",
      accessor: (r) => `${r.item} ${r.variant}`,
      render: (r) => (
        <button
          type="button"
          data-testid={`ss-sku-${r.item}-${r.variant}`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onSku(`${r.item} ${r.variant}`); }}
          className="font-mono text-primary hover:underline text-table-sm"
        >
          {r.item} {r.variant}
        </button>
      ),
    },
    { key: "ton", label: "Tồn", numeric: true, align: "right", width: 90, sortable: true, render: (r) => <span className="tabular-nums text-text-2">{r.ton.toLocaleString()}</span> },
    { key: "pipeline", label: "Pipeline", numeric: true, align: "right", width: 90, sortable: true, render: (r) => <span className="tabular-nums text-text-3">{r.pipeline > 0 ? r.pipeline.toLocaleString() : "—"}</span> },
    { key: "ssTarget", label: "SS target", numeric: true, align: "right", width: 100, sortable: true, render: (r) => <span className="tabular-nums text-text-3">{r.ssTarget.toLocaleString()}</span> },
    { key: "demand", label: "Demand", numeric: true, align: "right", width: 100, sortable: true, render: (r) => <span className="tabular-nums text-text-3">{r.demand.toLocaleString()}</span> },
    {
      key: "ssGap", label: "SS gap", numeric: true, align: "right", width: 100, sortable: true,
      render: (r) => <span className={cn("tabular-nums font-medium", r.ssGap < 0 ? "text-danger" : "text-success")}>{r.ssGap >= 0 ? "+" : ""}{r.ssGap.toLocaleString()}</span>,
    },
    { key: "netReq", label: "Net req", numeric: true, align: "right", width: 100, sortable: true, render: (r) => <span className="tabular-nums text-text-3">{r.netReq > 0 ? r.netReq.toLocaleString() : "—"}</span> },
    { key: "order", label: "Order", numeric: true, align: "right", width: 100, sortable: true, render: (r) => <span className="tabular-nums font-bold text-text-1">{r.order > 0 ? r.order.toLocaleString() : "—"}</span> },
    {
      key: "bridge", label: "Bridge", align: "center", width: 90,
      render: (r) => r.order > 0 ? (
        <button
          onClick={(e) => { e.stopPropagation(); const k = `${r._cn}-${r.item}-${r.variant}`; onBridge(expandedBridge === k ? null : k); }}
          className="text-primary text-table-sm font-medium hover:underline"
        >
          {expandedBridge === `${r._cn}-${r.item}-${r.variant}` ? "Ẩn" : "Xem"}
        </button>
      ) : <span className="text-text-3">—</span>,
    },
  ];
  return (
    <div className="px-3 py-2 bg-surface-1/40 space-y-2">
      <SmartTable<SkuDrillRow>
        screenId={`monitoring-inv-${cn}-skus`}
        columns={cols}
        data={rows}
        defaultDensity="compact"
        getRowId={(r) => r._rowId}
        rowSeverity={(r) => (r.ssGap < 0 ? "shortage" : "ok")}
      />
      {expandedBridge && rows.find(r => `${r._cn}-${r.item}-${r.variant}` === expandedBridge) && (() => {
        const sk = rows.find(r => `${r._cn}-${r.item}-${r.variant}` === expandedBridge)!;
        return (
          <div className="px-2 py-3 bg-surface-0 rounded-card border border-surface-3">
            <DemandToOrderBridge
              item={sk.item} variant={sk.variant} cn={cn}
              steps={buildFullBridgeSteps({
                demand: sk.demand, fcPhased: sk.fcPhased, cnAdj: sk.cnAdj, po: sk.po, overlap: sk.overlap,
                onHand: sk.onHand, pipeline: sk.pipeline, pipelineSource: sk.pipelineSource,
                ssTarget: sk.ssTarget, zVal: sk.zVal, sigma: sk.sigma, lt: sk.lt,
                moq: sk.moq, moqNm: sk.moqNm, finalOrder: sk.order, rpoNum: sk.rpoNum,
              })}
              footer={{
                demandQty: sk.demand, orderQty: sk.order,
                reasons: [
                  { label: `+${sk.ssTarget} SS buffer`, value: `dự phòng forecast sai` },
                  sk.pipeline > 0 ? { label: `−${sk.pipeline} pipeline`, value: `hàng đang về` } : null,
                  sk.moq > 0 ? { label: `MOQ round ${sk.moqNm}`, value: `min ${sk.moq.toLocaleString()}/container` } : null,
                ].filter(Boolean) as { label: string; value: string }[]
              }}
            />
          </div>
        );
      })()}
    </div>
  );
}

/* ═══ CN drill (SKU-first) — SmartTable compact ═══ */
interface CnBreakRow {
  cn: string; ton: number; available: number; ssTarget: number; ssActual: number; ssGap: number;
  hstk: number; replenish: number; status: string;
}
function SkuCnDrill({ rows, parentKey }: { rows: CnBreakRow[]; parentKey: string }) {
  const cols: SmartTableColumn<CnBreakRow>[] = [
    { key: "cn", label: "CN", width: 120, hideable: false, priority: "high", render: (r) => <span className="text-table-sm font-medium text-text-1">↳ {r.cn}</span> },
    { key: "ton", label: "Tồn", numeric: true, align: "right", width: 100, sortable: true, render: (r) => <span className="tabular-nums text-text-2">{r.ton.toLocaleString()}</span> },
    { key: "ssTarget", label: "SS target", numeric: true, align: "right", width: 100, sortable: true, render: (r) => <span className="tabular-nums text-text-3">{r.ssTarget.toLocaleString()}</span> },
    {
      key: "ssGap", label: "SS gap", numeric: true, align: "right", width: 100, sortable: true,
      render: (r) => <span className={cn("tabular-nums font-medium", r.ssGap < 0 ? "text-danger" : "text-success")}>{r.ssGap >= 0 ? "+" : ""}{r.ssGap.toLocaleString()}</span>,
    },
    { key: "hstk", label: "HSTK", numeric: true, align: "right", width: 80, sortable: true, render: (r) => <span className={cn("text-table-sm tabular-nums", hstkColor(r.hstk))}>{r.hstk}d</span> },
    { key: "replenish", label: "Replenish", numeric: true, align: "right", width: 110, sortable: true, render: (r) => <span className="tabular-nums text-text-3">{r.replenish.toLocaleString()} m²</span> },
    { key: "status", label: "Status", align: "center", width: 110, render: (r) => <StatusChip status={statusVariant(r.status)} label={r.status} /> },
  ];
  return (
    <div className="px-3 py-2 bg-surface-1/40">
      <SmartTable<CnBreakRow>
        screenId={`monitoring-inv-sku-${parentKey}-cn`}
        columns={cols}
        data={rows}
        defaultDensity="compact"
        getRowId={(r) => r.cn}
        rowSeverity={(r) => (r.ssGap < 0 ? "shortage" : r.ssGap > 200 ? "watch" : "ok")}
      />
    </div>
  );
}

export function InventorySSTab({ scale: s }: Props) {
  const navigate = useNavigate();
  const { ssSkuData, applySsChange } = useSafetyStock();
  const ssBdSkus = ssSkuData.filter(e => e.cn === "CN-BD");
  const [pivotMode, setPivotMode] = usePivotMode("monitoring-inv");
  const [invChartFilter, setInvChartFilter] = useState("all");
  const [expandedBridge, setExpandedBridge] = useState<string | null>(null);
  const [simOpen, setSimOpen] = useState(false);
  const [simSku, setSimSku] = useState<typeof ssSkuData[0] | null>(null);
  const [simZ, setSimZ] = useState(1.65);
  const [skuSheet, setSkuSheet] = useState<string | null>(null);

  const cnData = baseCnData.map((r) => ({
    ...r,
    ton: Math.round(r.ton * s), available: Math.round(r.available * s),
    ssTarget: Math.round(r.ssTarget * s), ssActual: Math.round(r.ssActual * s),
    ssGap: Math.round(r.ssGap * s), replenish: Math.round(r.replenish * s),
    skus: r.skus.map((sk) => ({
      ...sk,
      demand: Math.round(sk.demand * s), ton: Math.round(sk.ton * s),
      pipeline: Math.round(sk.pipeline * s), ssTarget: Math.round(sk.ssTarget * s),
      ssGap: Math.round(sk.ssGap * s), netReq: Math.round(sk.netReq * s),
      moq: Math.round(sk.moq * s), order: Math.round(sk.order * s),
      onHand: Math.round(sk.onHand * s), fcPhased: Math.round(sk.fcPhased * s),
      cnAdj: Math.round(sk.cnAdj * s), po: Math.round(sk.po * s), overlap: Math.round(sk.overlap * s),
    })),
  }));

  const totalTon = cnData.reduce((a, r) => a + r.ton, 0);
  const totalAvail = cnData.reduce((a, r) => a + r.available, 0);
  const totalSsTarget = cnData.reduce((a, r) => a + r.ssTarget, 0);
  const totalSsGap = cnData.reduce((a, r) => a + r.ssGap, 0);
  const cnBelowSs = cnData.filter((r) => r.ssGap < 0).length;

  /* ═══ CN-first columns ═══ */
  const cnCols: SmartTableColumn<CnInvRow>[] = [
    { key: "cn", label: "CN", width: 100, hideable: false, priority: "high", render: (r) => <span className="font-medium text-text-1">{r.cn}</span> },
    { key: "ton", label: "Tồn", numeric: true, align: "right", width: 100, sortable: true, render: (r) => <span className="tabular-nums text-text-1">{r.ton.toLocaleString()}</span> },
    { key: "available", label: "Available", numeric: true, align: "right", width: 110, sortable: true, render: (r) => <span className="tabular-nums text-text-2">{r.available.toLocaleString()}</span> },
    { key: "ssTarget", label: "SS target", numeric: true, align: "right", width: 100, sortable: true, render: (r) => <span className="tabular-nums text-text-3">{r.ssTarget.toLocaleString()}</span> },
    { key: "ssActual", label: "SS actual", numeric: true, align: "right", width: 100, sortable: true, priority: "low", render: (r) => <span className="tabular-nums text-text-2">{r.ssActual.toLocaleString()}</span> },
    {
      key: "ssGap", label: "SS gap", numeric: true, align: "right", width: 130, sortable: true, hideable: false, priority: "high",
      render: (r) => (
        <span className={cn("tabular-nums font-medium", r.ssGap < 0 ? "text-danger" : "text-success")}>
          {r.ssGap >= 0 ? "+" : ""}{r.ssGap.toLocaleString()} {r.ssGap < 0 ? "🔴" : "🟢"}
        </span>
      ),
    },
    {
      key: "hstk", label: "HSTK", numeric: true, align: "left", width: 130, sortable: true, accessor: (r) => r.hstk,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-14 h-2 rounded-full bg-surface-3 overflow-hidden">
            <div className={cn("h-full rounded-full", hstkBg(r.hstk))} style={{ width: `${Math.min((r.hstk / 20) * 100, 100)}%` }} />
          </div>
          <span className={cn("text-table-sm font-medium tabular-nums", hstkColor(r.hstk))}>{r.hstk}d</span>
        </div>
      ),
    },
    {
      key: "turnover", label: "Turnover", numeric: true, align: "right", width: 100, sortable: true, priority: "medium",
      render: (r) => <span className={cn("text-table-sm font-medium tabular-nums", r.turnover >= 6 ? "text-success" : r.turnover >= 3 ? "text-text-1" : "text-warning")}>{r.turnover}×</span>,
    },
    { key: "replenish", label: "Replenish need", numeric: true, align: "right", width: 130, sortable: true, render: (r) => <span className="tabular-nums text-text-1">{r.replenish.toLocaleString()} m²</span> },
    {
      key: "status", label: "Status", align: "center", width: 110, hideable: false, priority: "high",
      filter: "enum",
      filterOptions: [
        { value: "THIẾU SS", label: "🔴 Thiếu SS" },
        { value: "THỪA", label: "🔵 Thừa" },
        { value: "OK", label: "🟢 OK" },
      ],
      accessor: (r) => r.status,
      render: (r) => <StatusChip status={statusVariant(r.status)} label={r.status} />,
    },
  ];

  /* ═══ SKU-first pivot data ═══ */
  interface InvSkuPivot {
    item: string; variant: string; key: string;
    totalTon: number; totalAvail: number; totalSsTarget: number; totalSsGap: number;
    worstCn: string; worstHstk: number; cnGapCount: number; lcnb: string | null;
    cnBreakdown: CnBreakRow[];
  }
  const skuMap = new Map<string, InvSkuPivot>();
  cnData.forEach(r => {
    if (r.skus.length > 0) {
      r.skus.forEach(sk => {
        const key = `${sk.item}|${sk.variant}`;
        if (!skuMap.has(key)) {
          skuMap.set(key, { item: sk.item, variant: sk.variant, key, totalTon: 0, totalAvail: 0, totalSsTarget: 0, totalSsGap: 0, worstCn: "", worstHstk: Infinity, cnGapCount: 0, lcnb: null, cnBreakdown: [] });
        }
        const p = skuMap.get(key)!;
        p.totalTon += sk.ton; p.totalAvail += sk.ton;
        p.totalSsTarget += sk.ssTarget; p.totalSsGap += sk.ssGap;
        const hstk = sk.demand > 0 ? (sk.ton / (sk.demand / 30)) : 30;
        if (hstk < p.worstHstk) { p.worstHstk = +hstk.toFixed(1); p.worstCn = r.cn; }
        if (sk.ssGap < 0) p.cnGapCount++;
        p.cnBreakdown.push({ cn: r.cn, ton: sk.ton, available: sk.ton, ssTarget: sk.ssTarget, ssActual: sk.ton, ssGap: sk.ssGap, hstk: +hstk.toFixed(1), replenish: sk.netReq, status: sk.ssGap < 0 ? "THIẾU SS" : sk.ssGap > 200 ? "THỪA" : "OK" });
      });
    }
  });
  skuMap.forEach(p => {
    const excess = p.cnBreakdown.filter(c => c.ssGap > 0);
    const short = p.cnBreakdown.filter(c => c.ssGap < 0);
    if (excess.length > 0 && short.length > 0) {
      p.lcnb = `${excess[0].cn}→${short[0].cn} ${Math.min(excess[0].ssGap, Math.abs(short[0].ssGap))}m²`;
    }
  });
  const skuRows = Array.from(skuMap.values()).sort((a, b) => Math.abs(b.totalSsGap) - Math.abs(a.totalSsGap));

  const skuCols: SmartTableColumn<InvSkuPivot>[] = [
    { key: "item", label: "Item", width: 120, hideable: false, priority: "high", sortable: true, render: (r) => <span className="font-medium text-text-1">{r.item}</span> },
    { key: "variant", label: "Variant", width: 100, sortable: true, render: (r) => <span className="text-text-2">{r.variant}</span> },
    { key: "totalTon", label: "Tồn total", numeric: true, align: "right", width: 110, sortable: true, render: (r) => <span className="tabular-nums text-text-1">{r.totalTon.toLocaleString()}</span> },
    { key: "totalSsTarget", label: "SS target", numeric: true, align: "right", width: 110, sortable: true, render: (r) => <span className="tabular-nums text-text-3">{r.totalSsTarget.toLocaleString()}</span> },
    {
      key: "totalSsGap", label: "SS gap", numeric: true, align: "right", width: 130, sortable: true, hideable: false, priority: "high",
      render: (r) => (
        <span className={cn("tabular-nums font-medium", r.totalSsGap < 0 ? "text-danger" : "text-success")}>
          {r.totalSsGap >= 0 ? "+" : ""}{r.totalSsGap.toLocaleString()} {r.totalSsGap < 0 ? "🔴" : "🟢"}
        </span>
      ),
    },
    { key: "worstCn", label: "Worst CN", width: 140, render: (r) => <WorstCnCell cnName={r.worstCn} hstk={r.worstHstk} /> },
    { key: "cnGapCount", label: "# CN gap", align: "center", width: 100, sortable: true, accessor: (r) => r.cnGapCount, render: (r) => <CnGapBadge count={r.cnGapCount} /> },
    { key: "lcnb", label: "LCNB", width: 160, render: (r) => r.lcnb ? <LcnbBadge text={r.lcnb} /> : <span className="text-text-3">—</span> },
  ];

  /* ═══ SS Management columns ═══ */
  type SsRow = typeof ssBdSkus[number];
  const ssCols: SmartTableColumn<SsRow>[] = [
    { key: "item", label: "Item", width: 110, hideable: false, sortable: true, render: (r) => <span className="font-medium text-text-1">{r.item}</span> },
    { key: "variant", label: "Variant", width: 90, sortable: true, render: (r) => <span className="text-text-2">{r.variant}</span> },
    { key: "ssCurrent", label: "SS hiện", numeric: true, align: "right", width: 100, sortable: true, render: (r) => <span className="tabular-nums text-text-1">{r.ssCurrent.toLocaleString()}</span> },
    {
      key: "formula", label: "Formula", width: 160, priority: "low",
      render: (r) => <span className="text-text-3 font-mono text-[11px]">z({r.z})×σ({r.sigma})×√{r.lt}</span>,
    },
    {
      key: "ssProposed", label: "SS đề xuất", numeric: true, align: "right", width: 140, sortable: true, hideable: false,
      render: (r) => (
        <span className="tabular-nums font-bold text-text-1">
          {r.ssProposed.toLocaleString()}
          {r.delta !== 0 && (
            <span className={cn("ml-1 text-caption font-medium", r.delta > 0 ? "text-warning" : "text-success")}>
              ({r.delta > 0 ? "+" : ""}{Math.round(r.delta / r.ssCurrent * 100)}%)
            </span>
          )}
        </span>
      ),
    },
    {
      key: "delta", label: "Δ", numeric: true, align: "right", width: 80, sortable: true,
      render: (r) => <span className={cn("tabular-nums font-medium", r.delta > 0 ? "text-warning" : r.delta < 0 ? "text-success" : "text-text-3")}>{r.delta > 0 ? "+" : ""}{r.delta}</span>,
    },
    { key: "wcImpact", label: "WC impact", numeric: true, align: "right", width: 110, render: (r) => <span className="tabular-nums text-text-2">{r.wcImpact}</span> },
    {
      key: "action", label: "Hành động", align: "right", width: 180, hideable: false,
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          {r.delta !== 0 && (
            <Button size="sm" variant="default" className="text-caption h-7 bg-text-1 text-surface-0 hover:bg-text-2"
              onClick={(e) => {
                e.stopPropagation();
                applySsChange("CN-BD", r.item, r.variant, r.z, "Planner", "Manual apply from Monitoring", "monitoring");
                toast.success("SS cập nhật (đồng bộ DRP ↔ Monitoring)", { description: `SS ${r.item} ${r.variant}: ${r.ssCurrent}→${r.ssProposed}` });
              }}>
              Áp dụng
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-caption h-7"
            onClick={(e) => { e.stopPropagation(); setSimSku(r); setSimZ(r.z); setSimOpen(true); }}>
            Mô phỏng
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ SECTION A: Bức tranh tồn kho ═══ */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-body font-semibold text-text-1">Bức tranh tồn kho</h3>
          <Select value={invChartFilter} onValueChange={setInvChartFilter}>
            <SelectTrigger className="w-36 h-8 text-table-sm bg-surface-0 border-surface-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả CN</SelectItem>
              <SelectItem value="CN-BD">CN-BD</SelectItem>
              <SelectItem value="CN-ĐN">CN-ĐN</SelectItem>
              <SelectItem value="CN-HN">CN-HN</SelectItem>
              <SelectItem value="CN-CT">CN-CT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-5">
          <div className="flex-1 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getInvTrend(invChartFilter)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-text-3)" }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-text-3)" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => `${value.toLocaleString()} m²`} />
                <Area type="monotone" dataKey="available" name="Available" stackId="1" stroke="var(--color-success-text)" fill="var(--color-success-text)" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="reserved" name="Reserved + Committed" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.12} strokeWidth={1.5} />
                <Area type="monotone" dataKey="ss" name="SS Target" stroke="var(--color-danger-text)" fill="none" strokeWidth={1.5} strokeDasharray="6 3" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-2 text-[10px] text-text-3">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[var(--color-success-text)] rounded" /> Available</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-text-3 rounded" /> Reserved</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ borderTop: "1.5px dashed var(--color-danger-text)" }} /> SS Target</span>
            </div>
          </div>
          <div className="w-48 flex flex-col gap-2 shrink-0">
            {[
              { label: "Tổng tồn", value: `${totalTon.toLocaleString()} m²`, color: "text-text-1" },
              { label: "Available", value: `${totalAvail.toLocaleString()}`, color: "text-success" },
              { label: "SS target", value: `${totalSsTarget.toLocaleString()}`, color: "text-text-2" },
              { label: "SS gap", value: `${totalSsGap >= 0 ? "+" : ""}${totalSsGap.toLocaleString()} ${cnBelowSs > 0 ? "🔴" : "🟢"}`, color: totalSsGap < 0 ? "text-danger" : "text-success", sub: cnBelowSs > 0 ? `${cnBelowSs} CN dưới SS` : "Tất cả đủ SS" },
            ].map((k) => (
              <div key={k.label} className="rounded-lg border border-surface-3 bg-surface-0 px-3 py-2">
                <div className="text-[10px] uppercase text-text-3">{k.label}</div>
                <div className={cn("font-mono font-bold tabular-nums text-[15px]", k.color)}>{k.value}</div>
                {k.sub && <div className="text-[10px] text-text-3">{k.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ SECTION B: Pivot table ═══ */}
      <ViewPivotToggle value={pivotMode} onChange={setPivotMode} />

      {pivotMode === "sku" ? (
        <SmartTable<InvSkuPivot>
          screenId="monitoring-inv-sku-first"
          title="Tồn kho & SS per SKU → per CN"
          exportFilename="inventory-ss-sku"
          columns={skuCols}
          data={skuRows}
          defaultDensity="compact"
          getRowId={(r) => r.key}
          rowSeverity={(r) => (r.totalSsGap < 0 ? "shortage" : "ok")}
          autoExpandWhen={(r) => r.totalSsGap < 0}
          drillDown={(r) => <SkuCnDrill rows={r.cnBreakdown} parentKey={r.key} />}
          emptyState={{
            icon: <PackageSearch />,
            title: "Không có SKU phù hợp",
            description: "Chưa có dữ liệu pivot SKU-first hoặc bộ lọc đang ẩn toàn bộ.",
          }}
        />
      ) : (
        <SmartTable<CnInvRow>
          screenId="monitoring-inv-cn-first"
          title="Tồn kho & SS per CN → per SKU"
          exportFilename="inventory-ss-cn"
          columns={cnCols}
          data={cnData}
          defaultDensity="compact"
          getRowId={(r) => r.cn}
          rowSeverity={(r) => (r.ssGap < 0 ? "shortage" : r.ssGap > 1000 ? "watch" : "ok")}
          autoExpandWhen={(r) => r.ssGap < 0 && r.skus.length > 0}
          drillDown={(r) => r.skus.length > 0 ? (
            <CnSkuDrill
              rows={r.skus.map((sk) => ({ ...sk, _rowId: `${r.cn}-${sk.item}-${sk.variant}`, _cn: r.cn }))}
              cn={r.cn}
              onSku={(k) => setSkuSheet(k)}
              onBridge={setExpandedBridge}
              expandedBridge={expandedBridge}
            />
          ) : null}
          emptyState={{
            icon: <PackageSearch />,
            title: "Không có CN nào",
            description: "Bộ lọc Status đang ẩn toàn bộ CN. Xoá lọc để xem lại.",
          }}
        />
      )}

      {/* ═══ SECTION C: SS Management ═══ */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display text-body font-semibold text-text-1">SS Management</h3>
          <div className="flex items-center gap-2">
            <LogicLink tab="ss" node={0} tooltip="Công thức SS" />
            <span className="text-caption text-text-3">z=1.65 (95%)</span>
          </div>
        </div>
        <SmartTable<SsRow>
          screenId="monitoring-inv-ss-mgmt"
          exportFilename="ss-management"
          columns={ssCols}
          data={ssBdSkus}
          defaultDensity="compact"
          getRowId={(r) => `${r.item}-${r.variant}`}
          rowSeverity={(r) => (r.delta > 0 ? "watch" : r.delta < 0 ? "ok" : "ok")}
          emptyState={{
            icon: <PackageSearch />,
            title: "Không có SKU SS nào tại CN-BD",
            description: "Cấu hình SS hiện chưa có SKU CN-BD nào để hiển thị.",
          }}
        />
        <div className="rounded-card bg-surface-1/30 border border-surface-3 px-5 py-3 space-y-1.5">
          <p className="text-table-sm text-text-2">
            Tổng SS: <span className="font-bold text-text-1">{totalSsTarget.toLocaleString()}m²</span> = <span className="font-bold text-text-1">1.646M₫</span> WC.
            {" "}Nếu FC accuracy cải thiện 25%→15% → SS giảm 42% → tiết kiệm <span className="text-success font-bold">691M₫</span>.
          </p>
          <button onClick={() => navigate("/logic?tab=ss&node=0")} className="text-caption text-info font-medium hover:underline">
            Xem logic chi tiết tại /logic tab 4 Safety Stock →
          </button>
        </div>
      </div>

      {/* ═══ Simulation Modal ═══ */}
      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent className="bg-surface-2 border-surface-3 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-text-1">Mô phỏng SS</DialogTitle>
            <DialogDescription className="text-text-2 text-table">
              {simSku ? `${simSku.item} ${simSku.variant}` : ""}
            </DialogDescription>
          </DialogHeader>
          {simSku && (
            <div className="space-y-4">
              <div>
                <label className="text-table-sm font-medium text-text-2 mb-2 block">
                  z-score (Mức phục vụ): <span className="font-bold text-primary">{simZ.toFixed(2)}</span>
                  {" "}({Math.round((1 - 1 / Math.pow(10, simZ * 0.4343)) * 100) > 99 ? ">99" : simZ <= 1.28 ? "90" : simZ <= 1.65 ? "95" : simZ <= 2.05 ? "98" : "99"}%)
                </label>
                <Slider
                  min={100} max={260} step={5}
                  value={[Math.round(simZ * 100)]}
                  onValueChange={(v) => setSimZ(v[0] / 100)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-surface-3 bg-surface-0 p-3 text-center">
                  <div className="text-[10px] uppercase text-text-3">Before</div>
                  <div className="font-mono font-bold text-[18px] text-text-1">{simSku.ssCurrent.toLocaleString()}</div>
                  <div className="text-caption text-text-3">z={simSku.z}</div>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
                  <div className="text-[10px] uppercase text-primary">After</div>
                  <div className="font-mono font-bold text-[18px] text-primary">
                    {Math.round(simSku.ssCurrent * (simZ / simSku.z)).toLocaleString()}
                  </div>
                  <div className="text-caption text-text-3">z={simZ.toFixed(2)}</div>
                </div>
              </div>
              <div className="space-y-1.5 text-table-sm">
                <div className="flex justify-between text-text-2">
                  <span>WC impact</span>
                  {(() => {
                    const newSs = Math.round(simSku.ssCurrent * (simZ / simSku.z));
                    const delta = newSs - simSku.ssCurrent;
                    return <span className={cn("font-medium", delta > 0 ? "text-danger" : "text-success")}>{delta > 0 ? "+" : ""}{Math.round(delta * 18.5 / 1000)}M₫</span>;
                  })()}
                </div>
                <div className="flex justify-between text-text-2">
                  <span>Stockout risk</span>
                  <span className={cn("font-medium", simZ >= 1.65 ? "text-success" : "text-warning")}>{simZ >= 2.05 ? "~1%" : simZ >= 1.65 ? "~5%" : simZ >= 1.28 ? "~10%" : ">10%"}</span>
                </div>
              </div>
              <Button className="w-full bg-gradient-primary text-primary-foreground"
                onClick={() => {
                  applySsChange("CN-BD", simSku.item, simSku.variant, simZ, "Planner", `Simulation z=${simZ.toFixed(2)}`, "monitoring");
                  toast.success("SS cập nhật (đồng bộ DRP ↔ Monitoring)", { description: `z=${simZ.toFixed(2)} → SS ${Math.round(simSku.ssCurrent * (simZ / simSku.z)).toLocaleString()}` });
                  setSimOpen(false);
                }}>
                Áp dụng → Workspace duyệt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <SkuDetailSheet open={skuSheet !== null} onClose={() => setSkuSheet(null)} sku={skuSheet} />
    </div>
  );
}

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { ChevronRight, ChevronDown, ChevronLeft, Filter, Download, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { DemandSku } from "./demandData";

interface Props {
  skus: DemandSku[];
  tenant: string;
}

// ── Data Constants ──
const months = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];
const CURRENT = 4; // T5 index

const baseAOP =   [4500,4200,4500,5000,5200,5100,5000,5500,4800,5200,3800,3500];
const baseDemand= [4200,3800,4100,7280,7650,7280,6620,5500,4800,5200,3800,3500];
const demandType: ("actual"|"consensus"|"sop"|"aop")[] = 
  ["actual","actual","actual","actual","consensus","sop","sop","aop","aop","aop","aop","aop"];
const confidence = [100,100,100,100,85,70,60,45,40,40,35,35];

const tenantScale: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.72, "Mondelez": 1.35 };

function getScaledData(tenant: string) {
  const s = tenantScale[tenant] || 1;
  const aop = baseAOP.map(v => Math.round(v * s));
  const demand = baseDemand.map(v => Math.round(v * s));
  const gap = demand.map((d, i) => i <= CURRENT + 2 ? d - aop[i] : null);
  const ytdDemand = demand.slice(0, CURRENT + 1).reduce((a, b) => a + b, 0);
  const fullYear = demand.reduce((a, b) => a + b, 0);
  const aopTotal = Math.round(60000 * s);
  const ytdActual = demand.slice(0, CURRENT).reduce((a, b) => a + b, 0) + demand[CURRENT];
  return { aop, demand, gap, confidence, aopTotal, ytdDemand, ytdActual, fullYear };
}

// SKU data for Level 2
const l2Skus = [
  { item: "GA-300", variant: "A4", fc: [1150,1200,1100], b2b: [540,480,420], po: [255,180,120], overlap: [-75,-75,-60] },
  { item: "GA-300", variant: "B2", fc: [380,360,340],   b2b: [130,110,100], po: [50,40,30],    overlap: [-20,-15,-10] },
  { item: "GA-300", variant: "C1", fc: [320,310,290],   b2b: [95,85,75],    po: [40,35,25],    overlap: [-15,-10,-10] },
  { item: "GA-400", variant: "A4", fc: [770,750,720],   b2b: [255,240,220], po: [75,65,55],    overlap: [-50,-45,-40] },
  { item: "GA-400", variant: "D5", fc: [190,180,170],   b2b: [30,25,20],    po: [15,12,10],    overlap: [-5,-5,-5] },
  { item: "GA-600", variant: "A4", fc: [1550,1500,1440], b2b: [850,800,740], po: [490,450,400], overlap: [-220,-200,-180] },
  { item: "GA-600", variant: "B2", fc: [440,420,400],   b2b: [300,280,260], po: [175,160,140], overlap: [-65,-60,-55] },
];

// Weekly data for Level 3
const weekWeights = [0.28, 0.25, 0.24, 0.23];
const weekLabels = ["W16","W17","W18","W19"];

// ── Color helpers ──
function monthZone(i: number): "past"|"current"|"sop"|"aop" {
  if (i < CURRENT) return "past";
  if (i === CURRENT) return "current";
  if (i <= CURRENT + 2) return "sop";
  return "aop";
}

const zoneBg: Record<string, string> = {
  past: "bg-surface-1/50", current: "bg-info-bg", sop: "bg-success-bg", aop: "bg-warning-bg",
};
const zoneText: Record<string, string> = {
  past: "text-text-3", current: "text-info font-medium", sop: "text-success", aop: "text-warning italic",
};
const zoneBar: Record<string, string> = {
  past: "#94a3b8", current: "#2563EB", sop: "#059669", aop: "#d97706",
};

// ── Pie location data ──
const pieData = [
  { name: "BD", value: 33, fill: "#2563EB" },
  { name: "HN", value: 27, fill: "#0891b2" },
  { name: "DN", value: 24, fill: "#7c3aed" },
  { name: "CT", value: 16, fill: "#059669" },
];

// ── Override modal ──
function OverrideModal({ sku, cell, value, onClose, onSave }: {
  sku: string; cell: string; value: number;
  onClose: () => void;
  onSave: (newVal: number, reason: string, note: string) => void;
}) {
  const [newVal, setNewVal] = useState(value);
  const [reason, setReason] = useState("Market Intelligence");
  const [note, setNote] = useState("");
  const reasons = ["Market Intelligence", "Customer Feedback", "Seasonal Adjustment", "Promo Impact", "Manual Override"];
  return (
    <>
      <div className="fixed inset-0 bg-text-1/30 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 p-6 space-y-4 animate-fade-in">
        <h3 className="font-display text-section-header text-text-1">Override: {sku}</h3>
        <p className="text-table-sm text-text-3">Cell: {cell} — Current: {value.toLocaleString()}</p>
        <div>
          <label className="text-table-header uppercase text-text-3 mb-1 block">New Quantity (m²)</label>
          <input type="number" value={newVal} onChange={e => setNewVal(Number(e.target.value))}
            className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary tabular-nums" />
        </div>
        <div>
          <label className="text-table-header uppercase text-text-3 mb-1 block">Reason</label>
          <select value={reason} onChange={e => setReason(e.target.value)}
            className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary">
            {reasons.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-table-header uppercase text-text-3 mb-1 block">Note</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2}
            className="w-full rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Hủy</Button>
          <Button className="flex-1 bg-gradient-primary text-white" onClick={() => onSave(newVal, reason, note)}>Lưu Override</Button>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════
export function DemandSummaryTab({ skus, tenant }: Props) {
  const [level, setLevel] = useState<1|2|3>(1);
  const [selectedMonth, setSelectedMonth] = useState(CURRENT); // index in months[]
  const [expandedRow, setExpandedRow] = useState<number|null>(null);
  const [overrideModal, setOverrideModal] = useState<{sku:string;cell:string;value:number;rowIdx:number;colIdx:number;type:"fc"|"b2b"}|null>(null);
  const [overrides, setOverrides] = useState<Record<string, {value:number;reason:string;note:string}>>({}); // key: "ri-ci-type"
  const [l3Month, setL3Month] = useState(CURRENT);

  const d = useMemo(() => getScaledData(tenant), [tenant]);
  const s = tenantScale[tenant] || 1;

  // Breadcrumb path
  const breadcrumb = level === 1 ? ["12 tháng rolling"]
    : level === 2 ? ["12 tháng", `${months[selectedMonth]} S&OP`]
    : ["12 tháng", `${months[selectedMonth]} S&OP`, `Tuần ${weekLabels[0]}-${weekLabels[3]}`];

  const handleMonthClick = (i: number) => {
    const zone = monthZone(i);
    if (zone === "aop") {
      toast.info("AOP estimate", { description: "Chưa có S&OP detail. Sẽ update khi tháng đến gần." });
      return;
    }
    if (zone === "past") {
      toast.info(`${months[i]}: Actual data`, { description: "Đây là dữ liệu thực tế đã đóng sổ." });
      return;
    }
    setSelectedMonth(i);
    setLevel(2);
    setExpandedRow(null);
  };

  const goLevel = (l: 1|2|3) => { setLevel(l); setExpandedRow(null); };

  // ── LEVEL 1: 12 months rolling ──
  const renderLevel1 = () => {
    const ytdPct = Math.round((d.ytdActual / d.aopTotal) * 100);
    return (
      <div className="space-y-5">
        {/* Summary header */}
        <div className="rounded-card border border-surface-3 bg-surface-2 px-5 py-4">
          <div className="flex items-center gap-6 text-table">
            <span className="text-text-1 font-semibold">AOP 2026: <span className="tabular-nums">{d.aopTotal.toLocaleString()} m²</span></span>
            <span className="text-text-2">YTD Actual: <span className="tabular-nums font-medium text-text-1">{d.ytdActual.toLocaleString()} m²</span> <span className="text-text-3">({ytdPct}%)</span></span>
            <span className="text-text-2">Remaining: <span className="tabular-nums font-medium text-warning">{(d.aopTotal - d.ytdActual).toLocaleString()} m²</span></span>
          </div>

          {/* Progress bar - 12 segments */}
          <div className="flex mt-3 h-5 rounded-sm overflow-hidden gap-[1px]">
            {d.demand.map((val, i) => {
              const pct = (val / d.fullYear) * 100;
              const zone = monthZone(i);
              return (
                <div
                  key={i}
                  onClick={() => handleMonthClick(i)}
                  className="relative group cursor-pointer transition-opacity hover:opacity-80"
                  style={{ width: `${pct}%`, background: zoneBar[zone] }}
                  title={`${months[i]}: ${val.toLocaleString()} m²`}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-white/80 opacity-0 group-hover:opacity-100">
                    {months[i]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-5 mt-2">
            {[
              { color: "#94a3b8", label: "Actual" },
              { color: "#2563EB", label: "S&OP consensus" },
              { color: "#059669", label: "S&OP forecast" },
              { color: "#d97706", label: "AOP phased" },
            ].map(l => (
              <span key={l.label} className="flex items-center gap-1.5 text-caption text-text-3">
                <span className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        {/* 12-month table + donut */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          <div className="xl:col-span-3 rounded-card border border-surface-3 bg-surface-2 overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3">
                  <th className="sticky left-0 bg-surface-2 z-10 px-3 py-2 text-left text-table-header uppercase text-text-3 min-w-[100px]">m²</th>
                  {months.map((m, i) => (
                    <th key={m}
                      onClick={() => handleMonthClick(i)}
                      className={cn("px-2 py-2 text-center text-table-header uppercase min-w-[70px] cursor-pointer transition-colors",
                        zoneBg[monthZone(i)], zoneText[monthZone(i)]
                      )}
                    >
                      {m}{i === CURRENT && " ★"}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center text-table-header uppercase text-text-3 bg-surface-1/50 min-w-[70px]">YTD</th>
                  <th className="px-2 py-2 text-center text-table-header uppercase text-text-3 bg-surface-1/50 min-w-[80px]">Full Year</th>
                </tr>
              </thead>
              <tbody>
                {/* AOP target */}
                <tr className="border-b border-surface-3/50">
                  <td className="sticky left-0 bg-surface-2 z-10 px-3 py-2.5 font-medium text-text-2">AOP target</td>
                  {d.aop.map((v, i) => (
                    <td key={i} className={cn("px-2 py-2.5 text-center tabular-nums", zoneText[monthZone(i)])}>
                      {v.toLocaleString()}
                    </td>
                  ))}
                  <td className="px-2 py-2.5 text-center tabular-nums font-medium text-text-1 bg-surface-1/30">
                    {d.aop.slice(0, CURRENT + 1).reduce((a, b) => a + b, 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums font-medium text-text-1 bg-surface-1/30">
                    {d.aop.reduce((a, b) => a + b, 0).toLocaleString()}
                  </td>
                </tr>
                {/* Demand */}
                <tr className="border-b border-surface-3/50 bg-primary/3">
                  <td className="sticky left-0 bg-surface-2 z-10 px-3 py-2.5 font-semibold text-text-1">Demand</td>
                  {d.demand.map((v, i) => {
                    const type = demandType[i];
                    const label = type === "actual" ? "actual" : type === "consensus" ? "consensus" : type === "sop" ? "S&OP" : "AOP";
                    return (
                      <td key={i} className={cn("px-2 py-2.5 text-center tabular-nums", zoneText[monthZone(i)], i === CURRENT && "font-bold")}>
                        <div>{v.toLocaleString()}</div>
                        <div className="text-[9px] opacity-70">{label}</div>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2.5 text-center tabular-nums font-bold text-primary bg-surface-1/30">
                    {d.ytdDemand.toLocaleString()}
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums font-bold text-primary bg-surface-1/30">
                    {d.fullYear.toLocaleString()}
                  </td>
                </tr>
                {/* vs AOP gap */}
                <tr className="border-b border-surface-3/50">
                  <td className="sticky left-0 bg-surface-2 z-10 px-3 py-2.5 font-medium text-text-2">vs AOP</td>
                  {d.gap.map((v, i) => (
                    <td key={i} className={cn("px-2 py-2.5 text-center tabular-nums font-medium",
                      v === null ? "text-text-3" : v > 0 ? "text-success" : v < 0 ? "text-danger" : "text-text-3"
                    )}>
                      {v === null ? "—" : `${v > 0 ? "+" : ""}${v.toLocaleString()}`}
                    </td>
                  ))}
                  <td className="px-2 py-2.5 text-center tabular-nums font-medium text-danger bg-surface-1/30">
                    {(() => {
                      const ytdGap = d.demand.slice(0, CURRENT + 1).reduce((a, b) => a + b, 0) - d.aop.slice(0, CURRENT + 1).reduce((a, b) => a + b, 0);
                      return `${ytdGap > 0 ? "+" : ""}${ytdGap.toLocaleString()}`;
                    })()}
                  </td>
                  <td className="px-2 py-2.5 text-center tabular-nums font-medium text-success bg-surface-1/30">
                    {(() => {
                      const fyGap = d.fullYear - d.aop.reduce((a, b) => a + b, 0);
                      return `${fyGap > 0 ? "+" : ""}${fyGap.toLocaleString()}`;
                    })()}
                  </td>
                </tr>
                {/* Confidence */}
                <tr className="border-b border-surface-3/50">
                  <td className="sticky left-0 bg-surface-2 z-10 px-3 py-2.5 font-medium text-text-2">Confidence</td>
                  {confidence.map((c, i) => (
                    <td key={i} className={cn("px-2 py-2.5 text-center tabular-nums",
                      c >= 80 ? "text-success" : c >= 50 ? "text-warning" : "text-text-3"
                    )}>
                      {c}%
                    </td>
                  ))}
                  <td className="px-2 py-2.5 bg-surface-1/30" />
                  <td className="px-2 py-2.5 bg-surface-1/30" />
                </tr>
                {/* Source row */}
                <tr>
                  <td className="sticky left-0 bg-surface-2 z-10 px-3 py-2.5 font-medium text-text-3 text-caption">Source</td>
                  {demandType.map((t, i) => (
                    <td key={i} className="px-2 py-2.5 text-center text-[9px] text-text-3 capitalize">{t}</td>
                  ))}
                  <td className="px-2 py-2.5 bg-surface-1/30" />
                  <td className="px-2 py-2.5 bg-surface-1/30" />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Donut: YTD per Location */}
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
            <h3 className="font-display text-section-header text-text-1 mb-3">YTD per Location</h3>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={pieData} innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={2} cx="50%" cy="50%">
                  {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e0e9ff", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {pieData.map(p => (
                <div key={p.name} className="flex items-center justify-between text-table">
                  <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />{p.name}</span>
                  <span className="font-medium text-text-1">{p.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── LEVEL 2: 3-month S&OP detail ──
  const renderLevel2 = () => {
    const sopMonths = [CURRENT, CURRENT + 1, CURRENT + 2]; // T5, T6, T7
    const selIdx = sopMonths.indexOf(selectedMonth);
    const mi = selIdx >= 0 ? selIdx : 0;

    const scaledSkus = l2Skus.map(sk => ({
      ...sk,
      fc: sk.fc.map(v => Math.round(v * s)),
      b2b: sk.b2b.map(v => Math.round(v * s)),
      po: sk.po.map(v => Math.round(v * s)),
      overlap: sk.overlap.map(v => Math.round(v * s)),
    }));

    const monthTotals = sopMonths.map((_, mi) =>
      scaledSkus.reduce((sum, sk) => sum + sk.fc[mi] + sk.b2b[mi] + sk.po[mi] + sk.overlap[mi], 0)
    );

    // Waterfall for selected month
    const waterfallData = [
      { name: "FC", value: scaledSkus.reduce((s, sk) => s + sk.fc[mi], 0), fill: "#2563EB" },
      { name: "B2B", value: scaledSkus.reduce((s, sk) => s + sk.b2b[mi], 0), fill: "#0891b2" },
      { name: "PO", value: scaledSkus.reduce((s, sk) => s + sk.po[mi], 0), fill: "#7c3aed" },
      { name: "Overlap", value: Math.abs(scaledSkus.reduce((s, sk) => s + sk.overlap[mi], 0)), fill: "#ef4444" },
    ];

    return (
      <div className="space-y-5">
        {/* Month selector cards */}
        <div className="flex gap-3">
          {sopMonths.map((mIdx, ci) => (
            <button
              key={mIdx}
              onClick={() => setSelectedMonth(mIdx)}
              className={cn("flex-1 rounded-card border p-4 text-left transition-all",
                selectedMonth === mIdx ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-surface-3 bg-surface-2 hover:border-primary/30"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("font-display text-section-header", selectedMonth === mIdx ? "text-primary" : "text-text-1")}>
                  {months[mIdx]}{mIdx === CURRENT && " ★"}
                </span>
                {mIdx === CURRENT && <span className="text-caption bg-primary text-primary-foreground rounded-full px-2 py-0.5">Current</span>}
              </div>
              <span className="text-kpi tabular-nums text-text-1 mt-1 block">{monthTotals[ci].toLocaleString()} m²</span>
            </button>
          ))}
        </div>

        {/* Charts + Table */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          {/* Waterfall */}
          <div className="xl:col-span-2 rounded-card border border-surface-3 bg-surface-2 p-5">
            <h3 className="font-display text-section-header text-text-1 mb-3">Waterfall — {months[selectedMonth]}</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={waterfallData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e9ff" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#94a3b8" }} width={55} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e0e9ff", fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {waterfallData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Donut per location */}
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
            <h3 className="font-display text-section-header text-text-1 mb-3">{months[selectedMonth]} per Location</h3>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={pieData} innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={2} cx="50%" cy="50%">
                  {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e0e9ff", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {pieData.map(p => (
                <div key={p.name} className="flex items-center justify-between text-table-sm">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />{p.name}</span>
                  <span className="font-medium text-text-1">{p.value}%</span>
                </div>
              ))}
            </div>
          </div>
          {/* Action */}
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-section-header text-text-1 mb-2">Actions</h3>
              <button
                onClick={() => { setL3Month(selectedMonth); goLevel(3); }}
                className="w-full rounded-button bg-gradient-primary text-primary-foreground py-2 text-table-sm font-medium mb-2"
              >
                Xem tuần {months[selectedMonth]} →
              </button>
              <button className="w-full rounded-button border border-surface-3 py-2 text-table-sm text-text-2 hover:border-primary/30 transition-colors">
                <Download className="h-3.5 w-3.5 inline mr-1" /> Export
              </button>
            </div>
            <p className="text-caption text-text-3 mt-3 italic">
              TOTAL: {monthTotals[mi].toLocaleString()} m² = FC + B2B − Overlap
            </p>
          </div>
        </div>

        {/* SKU Table */}
        <div className="rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-3 border-b border-surface-3 flex items-center justify-between">
            <h3 className="font-display text-section-header text-text-1">SKU Detail — 3 tháng S&OP</h3>
            <div className="flex gap-2">
              <button className="rounded-button border border-surface-3 bg-surface-0 px-3 py-1 text-table-sm text-text-2"><Filter className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3">
                  <th className="w-6" />
                  <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">Item</th>
                  <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">Variant</th>
                  {sopMonths.map(mIdx => (
                    <>
                      <th key={`fc-${mIdx}`} className={cn("px-2 py-2 text-center text-table-header uppercase", mIdx === selectedMonth ? "text-primary bg-primary/5" : "text-text-3")}>
                        {months[mIdx]} FC
                      </th>
                      <th key={`b2b-${mIdx}`} className={cn("px-2 py-2 text-center text-table-header uppercase", mIdx === selectedMonth ? "text-primary bg-primary/5" : "text-text-3")}>B2B</th>
                      <th key={`po-${mIdx}`} className={cn("px-2 py-2 text-center text-table-header uppercase", mIdx === selectedMonth ? "text-primary bg-primary/5" : "text-text-3")}>PO</th>
                      <th key={`tot-${mIdx}`} className={cn("px-2 py-2 text-center text-table-header uppercase font-semibold border-r border-surface-3", mIdx === selectedMonth ? "text-primary bg-primary/5" : "text-text-3")}>Total</th>
                    </>
                  ))}
                  <th className="px-2 py-2 text-center text-table-header uppercase text-text-3">Trend</th>
                </tr>
              </thead>
              <tbody>
                {scaledSkus.map((sk, ri) => {
                  const isExp = expandedRow === ri;
                  return (
                    <>
                      <tr key={ri} onClick={() => setExpandedRow(isExp ? null : ri)}
                        className={cn("border-b border-surface-3/50 cursor-pointer transition-colors hover:bg-primary/5", isExp && "bg-primary/5")}
                      >
                        <td className="px-1 py-2 text-center">
                          {isExp ? <ChevronDown className="h-3.5 w-3.5 text-primary mx-auto" /> : <ChevronRight className="h-3.5 w-3.5 text-text-3 mx-auto" />}
                        </td>
                        <td className="px-3 py-2 font-medium text-text-1">{sk.item}</td>
                        <td className="px-3 py-2 text-text-2">{sk.variant}</td>
                        {sopMonths.map((mIdx, ci) => {
                          const total = sk.fc[ci] + sk.b2b[ci] + sk.po[ci] + sk.overlap[ci];
                          const isSel = mIdx === selectedMonth;
                          return (
                            <>
                              {(["fc","b2b"] as const).map(type => {
                                const oKey = `${ri}-${ci}-${type}`;
                                const ov = overrides[oKey];
                                const origVal = type === "fc" ? sk.fc[ci] : sk.b2b[ci];
                                const displayVal = ov ? ov.value : origVal;
                                return (
                                  <td key={`${type}-${ri}-${ci}`}
                                    onClick={(e) => { e.stopPropagation(); setOverrideModal({ sku: `${sk.item} ${sk.variant}`, cell: `${months[mIdx]} ${type.toUpperCase()}`, value: displayVal, rowIdx: ri, colIdx: ci, type }); }}
                                    className={cn("px-2 py-2 text-center tabular-nums cursor-pointer hover:ring-1 hover:ring-warning/50 rounded-sm transition-all",
                                      isSel ? "font-medium text-text-1" : "text-text-3",
                                      ov && "bg-warning/10 ring-1 ring-warning/30"
                                    )}
                                    title={ov ? `Override: ${ov.reason} — "${ov.note}"` : `Click to override ${type.toUpperCase()}`}
                                  >
                                    {displayVal.toLocaleString()}
                                    {ov && <span className="block text-[8px] text-warning font-medium">overridden</span>}
                                  </td>
                                );
                              })}
                              <td key={`po-${ri}-${ci}`} className={cn("px-2 py-2 text-center tabular-nums", isSel ? "text-text-1" : "text-text-3")}>{sk.po[ci].toLocaleString()}</td>
                              <td key={`tot-${ri}-${ci}`}
                                className={cn("px-2 py-2 text-center tabular-nums font-bold border-r border-surface-3", isSel ? "text-primary" : "text-text-2")}
                                title={`= FC + B2B − Overlap(${Math.abs(sk.overlap[ci])})`}
                              >
                                {(() => {
                                  const fcVal = overrides[`${ri}-${ci}-fc`]?.value ?? sk.fc[ci];
                                  const b2bVal = overrides[`${ri}-${ci}-b2b`]?.value ?? sk.b2b[ci];
                                  return (fcVal + b2bVal + sk.po[ci] + sk.overlap[ci]).toLocaleString();
                                })()}
                              </td>
                            </>
                          );
                        })}
                        <td className="px-2 py-2 text-center">
                          {sk.fc[0] > sk.fc[2] ? <TrendingDown className="h-3.5 w-3.5 text-danger mx-auto" /> :
                           sk.fc[0] < sk.fc[2] ? <TrendingUp className="h-3.5 w-3.5 text-success mx-auto" /> :
                           <Minus className="h-3.5 w-3.5 text-text-3 mx-auto" />}
                        </td>
                      </tr>
                      {/* Expanded: source + location (reuse L1 pattern) */}
                      {isExp && (
                        <tr key={`exp-${ri}`}>
                          <td colSpan={100} className="bg-surface-0 border-b border-surface-3">
                            <div className="px-6 py-3 grid grid-cols-2 gap-4">
                              <div className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-1.5">
                                <h4 className="text-table-header uppercase text-text-3">🔗 Source Traceable</h4>
                                <div className="text-table space-y-1">
                                  <div className="flex justify-between"><span className="text-text-3">FC Model</span><span className="font-mono text-text-1">XGBoost-V4</span></div>
                                  <div className="flex justify-between"><span className="text-text-3">MAPE</span><span className="text-text-1">12%</span></div>
                                  <div className="flex justify-between"><span className="text-text-3">Overlap</span><span className="text-danger">{sk.overlap[mi]}</span></div>
                                </div>
                              </div>
                              <div className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-1.5">
                                <h4 className="text-table-header uppercase text-text-3">🏭 Per Location</h4>
                                {pieData.map(p => (
                                  <div key={p.name} className="flex items-center gap-2">
                                    <span className="text-table text-text-2 w-8">{p.name}</span>
                                    <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
                                      <div className="h-full rounded-full" style={{ width: `${p.value}%`, background: p.fill }} />
                                    </div>
                                    <span className="text-table-sm tabular-nums text-text-1 w-8 text-right">{p.value}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {/* Total row */}
                <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                  <td />
                  <td className="px-3 py-2 text-text-1" colSpan={2}>TỔNG</td>
                  {sopMonths.map((mIdx, ci) => {
                    const totFC = scaledSkus.reduce((s, sk) => s + sk.fc[ci], 0);
                    const totB2B = scaledSkus.reduce((s, sk) => s + sk.b2b[ci], 0);
                    const totPO = scaledSkus.reduce((s, sk) => s + sk.po[ci], 0);
                    const totAll = scaledSkus.reduce((s, sk) => s + sk.fc[ci] + sk.b2b[ci] + sk.po[ci] + sk.overlap[ci], 0);
                    return (
                      <>
                        <td key={`tfc-${ci}`} className="px-2 py-2 text-center tabular-nums text-text-1">{totFC.toLocaleString()}</td>
                        <td key={`tb-${ci}`} className="px-2 py-2 text-center tabular-nums text-text-1">{totB2B.toLocaleString()}</td>
                        <td key={`tp-${ci}`} className="px-2 py-2 text-center tabular-nums text-text-1">{totPO.toLocaleString()}</td>
                        <td key={`tt-${ci}`} className="px-2 py-2 text-center tabular-nums text-primary border-r border-surface-3">{totAll.toLocaleString()}</td>
                      </>
                    );
                  })}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ── LEVEL 3: Weekly breakdown ──
  const renderLevel3 = () => {
    const scaledSkus3 = l2Skus.map(sk => {
      const mi = [CURRENT, CURRENT+1, CURRENT+2].indexOf(l3Month);
      const idx = mi >= 0 ? mi : 0;
      const total = Math.round((sk.fc[idx] + sk.b2b[idx] + sk.po[idx] + sk.overlap[idx]) * s);
      const ssTarget = Math.round(total * 0.45);
      const weeks = weekWeights.map(w => Math.round(total * w));
      const weekSum = weeks.reduce((a, b) => a + b, 0);
      const sopVal = d.demand[l3Month];
      return {
        item: sk.item, variant: sk.variant,
        ssTarget, ssGap: Math.round(ssTarget - total * 0.5),
        weeks, weekSum,
        sopVal: Math.round(sopVal / l2Skus.length),
        vsSop: +(((weekSum / (sopVal / l2Skus.length)) - 1) * 100).toFixed(1),
      };
    });

    const totalWeeks = weekWeights.map((_, wi) => scaledSkus3.reduce((s, sk) => s + sk.weeks[wi], 0));
    const grandTotal = totalWeeks.reduce((a, b) => a + b, 0);
    const sopTotal = d.demand[l3Month];

    return (
      <div className="space-y-5">
        {/* Month selector */}
        <div className="flex items-center gap-3">
          <label className="text-table-sm text-text-2">Tháng:</label>
          <select value={l3Month} onChange={e => setL3Month(Number(e.target.value))}
            className="h-8 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-1 focus:ring-primary">
            {[CURRENT, CURRENT+1, CURRENT+2].map(i => (
              <option key={i} value={i}>Tháng {i + 1}</option>
            ))}
          </select>
          <span className="text-caption text-text-3 ml-2">
            Method ③ Historical 24M. Weights: {weekWeights.map(w => Math.round(w * 100)).join("/")}%.
          </span>
        </div>

        {/* Weekly table */}
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3">
                <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">Item</th>
                <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">Variant</th>
                <th className="px-3 py-2 text-center text-table-header uppercase text-text-3">SS target</th>
                <th className="px-3 py-2 text-center text-table-header uppercase text-text-3">SS gap</th>
                {weekLabels.map((w, i) => (
                  <th key={w} className="px-3 py-2 text-center text-table-header uppercase text-primary bg-primary/5">
                    {w} <span className="text-text-3">({Math.round(weekWeights[i] * 100)}%)</span>
                  </th>
                ))}
                <th className="px-3 py-2 text-center text-table-header uppercase text-text-1 bg-surface-1/50">Total {months[l3Month]}</th>
                <th className="px-3 py-2 text-center text-table-header uppercase text-text-3">vs S&OP</th>
              </tr>
            </thead>
            <tbody>
              {scaledSkus3.map((sk, i) => (
                <tr key={i} className="border-b border-surface-3/50 hover:bg-primary/5 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-text-1">{sk.item}</td>
                  <td className="px-3 py-2.5 text-text-2">{sk.variant}</td>
                  <td className="px-3 py-2.5 text-center tabular-nums text-text-1">{sk.ssTarget.toLocaleString()}</td>
                  <td className={cn("px-3 py-2.5 text-center tabular-nums font-medium", sk.ssGap < 0 ? "text-danger" : "text-success")}>
                    {sk.ssGap.toLocaleString()} {sk.ssGap < 0 && "🔴"}
                  </td>
                  {sk.weeks.map((w, wi) => (
                    <td key={wi}
                      className="px-3 py-2.5 text-center tabular-nums text-text-1 bg-primary/3 cursor-help"
                      title={`Top-down ${Math.round(w * 0.92)} + CN adj +${Math.round(w * 0.08)} (Approved) + PO ${Math.round(w * 0.35)} = ${w}`}
                    >
                      {w.toLocaleString()}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-center tabular-nums font-bold text-primary bg-surface-1/30">
                    {sk.weekSum.toLocaleString()}
                  </td>
                  <td className={cn("px-3 py-2.5 text-center tabular-nums font-medium",
                    Math.abs(sk.vsSop) > 5 ? "text-warning" : "text-success"
                  )}>
                    {sk.vsSop > 0 ? "+" : ""}{sk.vsSop}% {Math.abs(sk.vsSop) > 5 && "⚠"}
                  </td>
                </tr>
              ))}
              {/* Total */}
              <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                <td className="px-3 py-2 text-text-1" colSpan={4}>TỔNG</td>
                {totalWeeks.map((w, i) => (
                  <td key={i} className="px-3 py-2 text-center tabular-nums text-text-1">{w.toLocaleString()}</td>
                ))}
                <td className="px-3 py-2 text-center tabular-nums text-primary">{grandTotal.toLocaleString()}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        {/* Reconciliation footer */}
        <div className="rounded-card border border-surface-3 bg-surface-2 px-5 py-3 flex items-center justify-between">
          <span className="text-table text-text-2">
            <strong>Reconciliation:</strong> Σ({weekLabels.join("-")}) = <span className="tabular-nums font-bold text-text-1">{grandTotal.toLocaleString()}</span> vs S&OP{" "}
            <span className="tabular-nums font-bold text-primary">{sopTotal.toLocaleString()}</span>
          </span>
          <span className={cn("text-table-sm font-medium rounded-full px-3 py-1",
            Math.abs(grandTotal - sopTotal) / sopTotal < 0.02 ? "bg-success-bg text-success" : "bg-warning-bg text-warning"
          )}>
            {Math.abs(grandTotal - sopTotal) / sopTotal < 0.02 ? "✅ Balanced" : "⚠ Delta > 2%"}
          </span>
        </div>
      </div>
    );
  };

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════
  return (
    <div className="space-y-4">
      {/* Navigation bar */}
      <div className="flex items-center justify-between">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-table-sm">
          {level > 1 && (
            <button onClick={() => goLevel((level - 1) as 1|2)} className="p-1 hover:bg-surface-3 rounded-button transition-colors">
              <ChevronLeft className="h-4 w-4 text-text-3" />
            </button>
          )}
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-1.5">
              {i > 0 && <ChevronRight className="h-3 w-3 text-text-3" />}
              <span className={i === breadcrumb.length - 1 ? "text-text-1 font-medium" : "text-primary cursor-pointer hover:underline"}
                onClick={() => i < breadcrumb.length - 1 && goLevel((i + 1) as 1|2)}
              >{b}</span>
            </span>
          ))}
        </div>

        {/* Level toggle */}
        <div className="flex items-center gap-1 rounded-full border border-surface-3 bg-surface-0 p-0.5">
          {([
            { l: 1 as const, label: "12 tháng rolling" },
            { l: 2 as const, label: "3 tháng S&OP" },
            { l: 3 as const, label: "Tuần" },
          ]).map(t => (
            <button
              key={t.l}
              onClick={() => goLevel(t.l)}
              className={cn("rounded-full px-3 py-1 text-table-sm font-medium transition-colors",
                level === t.l ? "bg-gradient-primary text-primary-foreground" : "text-text-2 hover:text-text-1"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {level === 1 && renderLevel1()}
      {level === 2 && renderLevel2()}
      {level === 3 && renderLevel3()}

      {/* Override modal */}
      {overrideModal && (
        <OverrideModal
          sku={overrideModal.sku}
          cell={overrideModal.cell}
          value={overrideModal.value}
          onClose={() => setOverrideModal(null)}
          onSave={(newVal, reason, note) => {
            toast.success("Override applied", { description: `${overrideModal.sku} ${overrideModal.cell}: → ${newVal.toLocaleString()} (${reason})` });
            setOverrideModal(null);
          }}
        />
      )}
    </div>
  );
}

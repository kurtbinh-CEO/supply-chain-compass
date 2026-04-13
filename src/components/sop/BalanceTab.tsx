import { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChevronRight, ChevronDown, AlertTriangle, CheckCircle, Cpu } from "lucide-react";

interface Props { tenant: string; consensusVolume: number }

const tenantScale: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.75, "Mondelez": 1.2 };

interface LocRow {
  cn: string; demand: number; stock: number; pipeline: number; ssTarget: number;
  skus: { item: string; variant: string; demand: number; stock: number; pipeline: number; pipelineSource: string; pipelineEta: string; ss: number; nmAvail: number; nmName: string; nmStatus: string; source: string }[];
}

const baseLocations: LocRow[] = [
  { cn: "CN-BD", demand: 2550, stock: 450, pipeline: 557, ssTarget: 900,
    skus: [
      { item: "GA-300", variant: "A4", demand: 1870, stock: 120, pipeline: 557, pipelineSource: "Toko", pipelineEta: "17/05", ss: 900, nmAvail: 1500, nmName: "Mikado", nmStatus: "✅", source: "Auto-match" },
      { item: "GA-300", variant: "B2", demand: 540, stock: 80, pipeline: 0, pipelineSource: "", pipelineEta: "", ss: 700, nmAvail: 800, nmName: "Phú Mỹ", nmStatus: "⚠", source: "Partial" },
    ]},
  { cn: "CN-ĐN", demand: 1800, stock: 1200, pipeline: 400, ssTarget: 800,
    skus: [
      { item: "GA-400", variant: "A4", demand: 1050, stock: 700, pipeline: 250, pipelineSource: "Đồng Tâm", pipelineEta: "16/05", ss: 500, nmAvail: 0, nmName: "", nmStatus: "", source: "Covered" },
      { item: "GA-600", variant: "A4", demand: 750, stock: 500, pipeline: 150, pipelineSource: "Vigracera", pipelineEta: "21/05", ss: 300, nmAvail: 0, nmName: "", nmStatus: "", source: "Covered" },
    ]},
  { cn: "CN-HN", demand: 2100, stock: 800, pipeline: 500, ssTarget: 700,
    skus: [
      { item: "GA-300", variant: "C1", demand: 1130, stock: 400, pipeline: 300, pipelineSource: "Mikado", pipelineEta: "18/05", ss: 400, nmAvail: 0, nmName: "", nmStatus: "", source: "Covered" },
      { item: "GA-600", variant: "B2", demand: 970, stock: 400, pipeline: 200, pipelineSource: "Toko", pipelineEta: "22/05", ss: 300, nmAvail: 0, nmName: "", nmStatus: "", source: "Covered" },
    ]},
  { cn: "CN-CT", demand: 1200, stock: 750, pipeline: 300, ssTarget: 500,
    skus: [
      { item: "GA-400", variant: "D5", demand: 600, stock: 400, pipeline: 150, pipelineSource: "Đồng Tâm", pipelineEta: "19/05", ss: 250, nmAvail: 0, nmName: "", nmStatus: "", source: "Covered" },
      { item: "GA-600", variant: "A4", demand: 600, stock: 350, pipeline: 150, pipelineSource: "Vigracera", pipelineEta: "20/05", ss: 250, nmAvail: 0, nmName: "", nmStatus: "", source: "Covered" },
    ]},
];

export function BalanceTab({ tenant, consensusVolume }: Props) {
  const s = tenantScale[tenant] || 1;
  const navigate = useNavigate();
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const locs = baseLocations.map(l => ({
    ...l,
    demand: Math.round(l.demand * s), stock: Math.round(l.stock * s),
    pipeline: Math.round(l.pipeline * s), ssTarget: Math.round(l.ssTarget * s),
    skus: l.skus.map(sk => ({
      ...sk, demand: Math.round(sk.demand * s), stock: Math.round(sk.stock * s),
      pipeline: Math.round(sk.pipeline * s), ss: Math.round(sk.ss * s),
      nmAvail: Math.round(sk.nmAvail * s),
    })),
  }));

  const totalDemand = locs.reduce((a, l) => a + l.demand, 0);
  const totalStock = locs.reduce((a, l) => a + l.stock, 0);
  const totalPipeline = locs.reduce((a, l) => a + l.pipeline, 0);
  const totalSS = locs.reduce((a, l) => a + l.ssTarget, 0);
  const netReq = Math.max(0, totalDemand - totalStock - totalPipeline);
  const fcToCommit = Math.round(18500 * s);
  const ssBuffer = Math.round(1200 * s);

  // Waterfall data
  const waterfallData = [
    { name: "Demand", value: totalDemand, fill: "#2563EB" },
    { name: "−Stock", value: totalStock, fill: "#059669" },
    { name: "−Pipeline", value: totalPipeline, fill: "#0891b2" },
    { name: "= Net", value: netReq, fill: "#d97706" },
    { name: "+SS buffer", value: ssBuffer, fill: "#7c3aed" },
    { name: "= FC min", value: netReq + ssBuffer, fill: "#ef4444" },
  ];

  // KPI cards
  const kpis = [
    { label: "Demand consensus", value: `${totalDemand.toLocaleString()} m²`, bg: "bg-info-bg", text: "text-info" },
    { label: "Stock + Pipeline", value: `${(totalStock + totalPipeline).toLocaleString()} m²`, sub: `(${Math.round((totalStock + totalPipeline) / totalDemand * 100)}%)`, bg: "bg-success-bg", text: "text-success" },
    { label: "Net requirement", value: `${netReq.toLocaleString()} m²`, bg: "bg-warning-bg", text: "text-warning" },
    { label: "FC to commit", value: `${fcToCommit.toLocaleString()} m²`, sub: "(5 NMs)", bg: "bg-danger-bg", text: "text-danger" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-screen-title text-text-1">Demand vs Supply — Tháng 5</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-info-bg text-info text-table-sm font-medium px-3 py-0.5 mt-1">
            Day 5 — Supply Review
          </span>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={cn("rounded-card border border-surface-3 p-4", k.bg)}>
            <div className="text-caption text-text-3 uppercase mb-1">{k.label}</div>
            <div className={cn("font-display text-kpi tabular-nums", k.text)}>{k.value}</div>
            {k.sub && <div className="text-table-sm text-text-3 mt-0.5">{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* Waterfall + location summary */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Waterfall */}
        <div className="xl:col-span-1 rounded-card border border-surface-3 bg-surface-2 p-5">
          <h3 className="font-display text-section-header text-text-1 mb-3">Waterfall</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={waterfallData} layout="vertical" margin={{ left: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e9ff" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#94a3b8" }} width={65} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e0e9ff", fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {waterfallData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Location table */}
        <div className="xl:col-span-2 rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-3 border-b border-surface-3">
            <h3 className="font-display text-section-header text-text-1">Per Location — Tháng 5</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  <th className="w-6" />
                  {["CN", "Demand", "Stock", "Pipeline", "SS target", "SS gap", "Net req", "Cover days", "Status"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locs.map((loc, i) => {
                  const ssGap = (loc.stock + loc.pipeline) - loc.demand + (loc.stock - loc.ssTarget);
                  const ssGapSimple = loc.stock - loc.ssTarget;
                  const netR = Math.max(0, loc.demand - loc.stock - loc.pipeline);
                  const coverDays = loc.demand > 0 ? +(loc.stock / (loc.demand / 30)).toFixed(1) : 0;
                  const isCritical = coverDays < 7;
                  const isExp = expandedRow === i;
                  return (
                    <>
                      <tr key={i} onClick={() => setExpandedRow(isExp ? null : i)}
                        className={cn("border-b border-surface-3/50 cursor-pointer transition-colors hover:bg-primary/5", isExp && "bg-primary/5")}
                      >
                        <td className="px-1 py-2 text-center">
                          {isExp ? <ChevronDown className="h-3.5 w-3.5 text-primary mx-auto" /> : <ChevronRight className="h-3.5 w-3.5 text-text-3 mx-auto" />}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-text-1">{loc.cn}</td>
                        <td className="px-3 py-2.5 tabular-nums text-text-1 font-medium">{loc.demand.toLocaleString()}</td>
                        <td className="px-3 py-2.5 tabular-nums text-text-1">{loc.stock.toLocaleString()}</td>
                        <td className="px-3 py-2.5 tabular-nums text-text-2">{loc.pipeline.toLocaleString()}</td>
                        <td className="px-3 py-2.5 tabular-nums text-text-1">{loc.ssTarget.toLocaleString()}</td>
                        <td className={cn("px-3 py-2.5 tabular-nums font-medium", ssGapSimple < 0 ? "text-danger" : "text-success")}>
                          {ssGapSimple > 0 ? "+" : ""}{ssGapSimple.toLocaleString()} {ssGapSimple < 0 ? "🔴" : "🟢"}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums font-medium text-text-1">{netR.toLocaleString()}</td>
                        <td className={cn("px-3 py-2.5 tabular-nums font-medium", isCritical ? "text-danger" : "text-success")}>
                          {coverDays}d {isCritical ? "🔴" : "🟢"}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-caption font-bold",
                            isCritical ? "bg-danger-bg text-danger" : "bg-success-bg text-success"
                          )}>
                            {isCritical ? "CRITICAL" : "OK"}
                          </span>
                        </td>
                      </tr>
                      {isExp && (
                        <tr key={`exp-${i}`}>
                          <td colSpan={10} className="bg-surface-0 border-b border-surface-3 p-0">
                            <div className="px-8 py-3">
                              <table className="w-full text-table-sm">
                                <thead>
                                  <tr className="border-b border-surface-3/50">
                                    {["Item", "Variant", "Demand", "Stock", "Pipeline (ETA)", "SS", "SS gap", "Net req", "NM available", "Source"].map(h => (
                                      <th key={h} className="px-3 py-1.5 text-left text-table-header uppercase text-text-3">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {loc.skus.map((sk, si) => {
                                    const skGap = sk.stock - sk.ss;
                                    const skNet = Math.max(0, sk.demand - sk.stock - sk.pipeline);
                                    return (
                                      <tr key={si} className="border-b border-surface-3/30 hover:bg-surface-1/30">
                                        <td className="px-3 py-2 font-medium text-text-1">{sk.item}</td>
                                        <td className="px-3 py-2 text-text-2">{sk.variant}</td>
                                        <td className="px-3 py-2 tabular-nums text-text-1">{sk.demand.toLocaleString()}</td>
                                        <td className="px-3 py-2 tabular-nums text-text-1">{sk.stock.toLocaleString()}</td>
                                        <td className="px-3 py-2 tabular-nums text-text-2">
                                          {sk.pipeline > 0 ? `${sk.pipeline.toLocaleString()} (${sk.pipelineSource} ${sk.pipelineEta})` : "0"}
                                        </td>
                                        <td className="px-3 py-2 tabular-nums text-text-1">{sk.ss.toLocaleString()}</td>
                                        <td className={cn("px-3 py-2 tabular-nums font-medium", skGap < 0 ? "text-danger" : "text-success")}>
                                          {skGap > 0 ? "+" : ""}{skGap.toLocaleString()} {skGap < 0 ? "🔴" : "🟢"}
                                        </td>
                                        <td className="px-3 py-2 tabular-nums font-medium text-text-1">{skNet.toLocaleString()}</td>
                                        <td className="px-3 py-2 tabular-nums">
                                          {sk.nmAvail > 0 ? (
                                            <span className="text-text-1">{sk.nmName} {sk.nmAvail.toLocaleString()} {sk.nmStatus}</span>
                                          ) : "—"}
                                        </td>
                                        <td className="px-3 py-2">
                                          {sk.source === "Covered" ? (
                                            <span className="text-success text-caption font-medium">Covered</span>
                                          ) : (
                                            <button onClick={(e) => { e.stopPropagation(); navigate("/hub"); }}
                                              className="text-primary text-caption font-medium hover:underline">{sk.source}</button>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {/* Total */}
                <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                  <td />
                  <td className="px-3 py-2.5 text-text-1">TOTAL</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{totalDemand.toLocaleString()}</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{totalStock.toLocaleString()}</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{totalPipeline.toLocaleString()}</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{totalSS.toLocaleString()}</td>
                  <td className={cn("px-3 py-2.5 tabular-nums font-medium", (totalStock - totalSS) >= 0 ? "text-success" : "text-danger")}>
                    {totalStock - totalSS > 0 ? "+" : ""}{(totalStock - totalSS).toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{netReq.toLocaleString()}</td>
                  <td />
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-5 py-2 border-t border-surface-3 text-caption text-text-3 italic">
            Net requirement = Demand − (Stock + Pipeline). Nếu &lt; 0 thì = 0. Cover days = Stock ÷ (Demand ÷ 30).
          </div>
        </div>
      </div>

      {/* Alert cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-card border border-danger/30 bg-danger-bg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-danger" />
            <h4 className="font-display text-body font-semibold text-danger">CN-BD cover 2,5 ngày</h4>
          </div>
          <p className="text-table text-text-2 mb-3">
            Cover &lt; 7d target. Net requirement {Math.round(1993 * s).toLocaleString()}m² — cần FC commit ASAP.
          </p>
          <button onClick={() => navigate("/hub")}
            className="rounded-button bg-danger text-primary-foreground px-3 py-1.5 text-caption font-medium">
            Đi Hub →
          </button>
        </div>

        <div className="rounded-card border border-success/30 bg-success-bg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-success" />
            <h4 className="font-display text-body font-semibold text-success">CN-ĐN excess stock</h4>
          </div>
          <p className="text-table text-text-2 mb-3">
            Excess {Math.round(400 * s).toLocaleString()}m² above SS. Khả năng lateral transfer cho CN-BD.
          </p>
          <button className="rounded-button border border-success text-success px-3 py-1.5 text-caption font-medium hover:bg-success hover:text-primary-foreground transition-colors">
            Xem LCNB →
          </button>
        </div>

        {/* AI Trust Block */}
        <div className="rounded-card bg-text-1 text-primary-foreground p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="h-5 w-5 text-primary" />
            <span className="text-table-header uppercase text-text-3">AI SUGGESTION</span>
            <span className="ml-auto bg-primary text-primary-foreground text-caption font-bold px-2 py-0.5 rounded">82% confidence</span>
          </div>
          <p className="text-table text-text-3 mt-2">
            FC commit Mikado {Math.round(5500 * s).toLocaleString()} (GA-300+GA-600). Toko capacity limited → giảm share 32%→25%.
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => navigate("/hub")}
              className="rounded-button bg-primary text-primary-foreground px-3 py-1.5 text-caption font-medium">
              Apply → Hub
            </button>
            <button className="rounded-button border border-surface-2/30 text-text-3 px-3 py-1.5 text-caption font-medium">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

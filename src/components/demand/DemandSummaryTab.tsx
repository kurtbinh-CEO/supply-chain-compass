import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/StatusChip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { ChevronRight, ChevronDown, Filter, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { DemandSku } from "./demandData";

interface Props {
  skus: DemandSku[];
  tenant: string;
}

// Override modal
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
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 p-6 space-y-4">
        <h3 className="font-display text-section-header text-text-1">Override: {sku}</h3>
        <p className="text-table-sm text-text-3">Cell: {cell} — Current: {value.toLocaleString()}</p>
        <div>
          <label className="text-table-header uppercase text-text-3 mb-1 block">New Quantity</label>
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

export function DemandSummaryTab({ skus, tenant }: Props) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { val: number; reason: string }>>({});
  const [overrideModal, setOverrideModal] = useState<{ idx: number; cell: string; value: number } | null>(null);
  const [phasingMethod, setPhasingMethod] = useState<Record<number, string>>({});

  const data = useMemo(() => skus.map((s, i) => {
    const key = `${s.item}-${s.variant}`;
    const fcO = overrides[`${key}-fc`];
    const b2bO = overrides[`${key}-b2b`];
    const poO = overrides[`${key}-po`];
    return {
      ...s,
      fc: fcO ? fcO.val : s.fc,
      b2bWt: b2bO ? b2bO.val : s.b2bWt,
      po: poO ? poO.val : s.po,
      total: (fcO ? fcO.val : s.fc) + (b2bO ? b2bO.val : s.b2bWt) + (poO ? poO.val : s.po) + s.overlap,
      fcOverride: !!fcO,
      b2bOverride: !!b2bO,
      poOverride: !!poO,
    };
  }), [skus, overrides]);

  const agg = useMemo(() => ({
    fc: data.reduce((s, d) => s + d.fc, 0),
    b2b: data.reduce((s, d) => s + d.b2bWt, 0),
    po: data.reduce((s, d) => s + d.po, 0),
    overlap: data.reduce((s, d) => s + d.overlap, 0),
    total: data.reduce((s, d) => s + d.total, 0),
    avgDelta: +(data.reduce((s, d) => s + d.deltaLm, 0) / data.length).toFixed(1),
  }), [data]);

  // Waterfall data
  const waterfallData = [
    { name: "FC", value: agg.fc, fill: "#2563EB" },
    { name: "B2B wt", value: agg.b2b, fill: "#0891b2" },
    { name: "PO", value: agg.po, fill: "#7c3aed" },
    { name: "Overlap", value: agg.overlap, fill: "#ef4444" },
  ];

  // Pie data
  const pieData = [
    { name: "BD", value: 33, fill: "#2563EB" },
    { name: "HN", value: 27, fill: "#0891b2" },
    { name: "DN", value: 24, fill: "#7c3aed" },
    { name: "CT", value: 16, fill: "#059669" },
  ];

  const handleOverrideSave = (newVal: number, reason: string, note: string) => {
    if (!overrideModal) return;
    const s = data[overrideModal.idx];
    const key = `${s.item}-${s.variant}-${overrideModal.cell}`;
    setOverrides(prev => ({ ...prev, [key]: { val: newVal, reason } }));
    toast.success("Override applied", {
      description: `${s.item} ${s.variant} — ${overrideModal.cell.toUpperCase()}: ${overrideModal.value.toLocaleString()} → ${newVal.toLocaleString()} (${reason})`,
    });
    setOverrideModal(null);
  };

  const TrendIcon = ({ t }: { t: string }) => {
    if (t === "up") return <TrendingUp className="h-3.5 w-3.5 text-success" />;
    if (t === "down") return <TrendingDown className="h-3.5 w-3.5 text-danger" />;
    return <Minus className="h-3.5 w-3.5 text-text-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 rounded-card border border-surface-3 bg-surface-2 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-section-header text-text-1">Cơ cấu Demand (Waterfall)</h2>
            <span className="text-table-sm font-medium text-primary bg-info-bg rounded-full px-3 py-0.5">TOTAL: {agg.total.toLocaleString()}</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={waterfallData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e9ff" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#94a3b8" }} width={60} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e0e9ff", fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {waterfallData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-6 mt-3 text-table tabular-nums">
            {waterfallData.map(w => (
              <div key={w.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: w.fill }} />
                <span className="text-text-2">{w.name}</span>
                <span className="font-medium text-text-1">{w.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
          <h2 className="font-display text-section-header text-text-1 mb-3">Location Distribution</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={2} cx="50%" cy="50%">
                {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#e0e9ff", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1 mt-2">
            {pieData.map(p => (
              <div key={p.name} className="flex items-center justify-between text-table">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />{p.name}</span>
                <span className="font-medium text-text-1">{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SKU Detail Table */}
      <div className="rounded-card border border-surface-3 bg-surface-2">
        <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
          <h2 className="font-display text-section-header text-text-1">Bảng tổng hợp SKU chi tiết</h2>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-1 rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3 transition-colors">
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button className="inline-flex items-center gap-1 rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3 transition-colors">
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-3">
              <th className="w-8" />
              {["Item", "Variant", "FC", "B2B Wt", "PO", "Overlap", "Total", "ΔLM", "Trend"].map(h => (
                <th key={h} className="text-left text-table-header uppercase text-text-3 px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => {
              const isExpanded = expandedRow === i;
              const method = phasingMethod[i] || "M→W (Method: Hist 24M)";
              return (
                <>
                  <tr
                    key={`row-${i}`}
                    onClick={() => setExpandedRow(isExpanded ? null : i)}
                    className={cn(
                      "border-b border-surface-3/50 cursor-pointer transition-colors",
                      isExpanded ? "bg-primary/5" : i % 2 === 0 ? "bg-surface-0" : "bg-surface-2",
                      "hover:bg-primary/8"
                    )}
                  >
                    <td className="px-2 py-3 text-center">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-primary mx-auto" />
                        : <ChevronRight className="h-4 w-4 text-text-3 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-table font-medium text-text-1">{row.item}</td>
                    <td className="px-4 py-3 text-table text-text-2">{row.variant}</td>
                    <td className={cn("px-4 py-3 text-table tabular-nums text-text-1", row.fcOverride && "border-l-2 border-warning")}
                      title={`Source: ${row.source.fc}`}>
                      {row.fc.toLocaleString()}
                      <button onClick={e => { e.stopPropagation(); setOverrideModal({ idx: i, cell: "fc", value: row.fc }); }}
                        className="ml-1 text-text-3 hover:text-primary text-[10px]">[Override]</button>
                    </td>
                    <td className={cn("px-4 py-3 text-table tabular-nums text-text-1", row.b2bOverride && "border-l-2 border-warning")}>
                      {row.b2bWt.toLocaleString()}
                      <button onClick={e => { e.stopPropagation(); setOverrideModal({ idx: i, cell: "b2b", value: row.b2bWt }); }}
                        className="ml-1 text-text-3 hover:text-primary text-[10px]">[Override]</button>
                    </td>
                    <td className={cn("px-4 py-3 text-table tabular-nums text-text-1", row.poOverride && "border-l-2 border-warning")}>
                      {row.po.toLocaleString()}
                      <button onClick={e => { e.stopPropagation(); setOverrideModal({ idx: i, cell: "po", value: row.po }); }}
                        className="ml-1 text-text-3 hover:text-primary text-[10px]">[Override]</button>
                    </td>
                    <td className="px-4 py-3 text-table tabular-nums text-danger">{row.overlap.toLocaleString()}</td>
                    <td className="px-4 py-3 text-table tabular-nums font-bold text-primary">{row.total.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <StatusChip
                        status={row.deltaLm > 0 ? "success" : row.deltaLm < 0 ? "danger" : "info"}
                        label={`${row.deltaLm > 0 ? "+" : ""}${row.deltaLm}%`}
                      />
                    </td>
                    <td className="px-4 py-3"><TrendIcon t={row.trend} /></td>
                  </tr>

                  {/* L1+L2+L3 Expanded */}
                  {isExpanded && (
                    <tr key={`exp-${i}`}>
                      <td colSpan={10} className="bg-surface-0 border-b border-surface-3">
                        <div className="px-6 py-4 grid grid-cols-3 gap-4">
                          {/* L1: Source Traceable */}
                          <div className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-2">
                            <h4 className="text-table-header uppercase text-text-3 flex items-center gap-1.5">
                              🔗 Source Traceable
                            </h4>
                            <div className="space-y-1.5 text-table">
                              <div className="flex justify-between"><span className="text-text-3">FC Model</span><span className="font-mono text-text-1">{row.source.fc}</span></div>
                              <div className="flex justify-between"><span className="text-text-3">MAPE | Freshness</span><span className="text-text-1">12% | 98.4%</span></div>
                              <div className="flex justify-between"><span className="text-text-3">B2B Deals</span><span className="text-primary cursor-pointer hover:underline">View {row.source.b2b}</span></div>
                              <div className="flex justify-between"><span className="text-text-3">PO Status</span><span className="text-text-1">{row.source.po}</span></div>
                            </div>
                          </div>

                          {/* L2: Phasing */}
                          <div className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="text-table-header uppercase text-text-3">📊 Phasing {method.split("(")[0]}</h4>
                              <select
                                value={method}
                                onChange={e => setPhasingMethod(prev => ({ ...prev, [i]: e.target.value }))}
                                className="h-7 rounded-button border border-surface-3 bg-surface-0 px-2 text-[10px] text-text-1 focus:outline-none focus:ring-1 focus:ring-primary"
                                onClick={e => e.stopPropagation()}
                              >
                                <option>M→W (Method: Hist 24M)</option>
                                <option>M→W (Method: Even Split)</option>
                                <option>M→W (Method: Front-loaded)</option>
                              </select>
                            </div>
                            <div className="flex gap-2">
                              {row.phases.map(p => (
                                <div key={p.week} className="flex-1 text-center">
                                  <p className="text-[10px] text-text-3">{p.weight}%</p>
                                  <div className="h-12 bg-primary/10 rounded-sm flex items-end justify-center">
                                    <div className="w-full bg-primary/30 rounded-sm" style={{ height: `${p.weight * 1.8}px` }} />
                                  </div>
                                  <p className="text-[10px] text-text-3 mt-0.5">{p.week}</p>
                                </div>
                              ))}
                            </div>
                            <p className="text-[10px] text-text-3 italic">Σ check: {row.phases.reduce((s, p) => s + p.weight, 0)}% ✓</p>
                          </div>

                          {/* L3: Weekly Node Split */}
                          <div className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-2">
                            <h4 className="text-table-header uppercase text-text-3">🏭 Weekly Node Split</h4>
                            <div className="space-y-2">
                              {row.cnSplits.map(c => (
                                <div key={c.cn} className="flex items-center gap-2">
                                  <span className="text-table text-text-2 w-12">{c.cn}</span>
                                  <div className="flex-1 h-2.5 bg-surface-3 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full" style={{ width: `${c.share}%` }} />
                                  </div>
                                  <span className="text-table-sm tabular-nums text-text-1 w-10 text-right">{c.share}%</span>
                                </div>
                              ))}
                            </div>
                            <p className="text-[10px] text-text-3 italic">* Real-time split based on inventory health</p>
                            <p className="text-[10px] text-primary cursor-pointer hover:underline">→ View in /monitoring</p>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}

            {/* Aggregate row */}
            <tr className="bg-surface-1 border-t-2 border-primary/20">
              <td className="px-2 py-3" />
              <td colSpan={2} className="px-4 py-3 text-table font-bold text-text-1 uppercase">Total Aggregate</td>
              <td className="px-4 py-3 text-table font-bold tabular-nums text-text-1">{agg.fc.toLocaleString()}</td>
              <td className="px-4 py-3 text-table font-bold tabular-nums text-text-1">{agg.b2b.toLocaleString()}</td>
              <td className="px-4 py-3 text-table font-bold tabular-nums text-text-1">{agg.po.toLocaleString()}</td>
              <td className="px-4 py-3 text-table font-bold tabular-nums text-danger">{agg.overlap.toLocaleString()}</td>
              <td className="px-4 py-3 text-table font-bold tabular-nums text-primary">{agg.total.toLocaleString()}</td>
              <td className="px-4 py-3">
                <StatusChip status={agg.avgDelta > 0 ? "success" : "danger"} label={`Avg: +${agg.avgDelta}%`} />
              </td>
              <td className="px-4 py-3"><TrendingUp className="h-3.5 w-3.5 text-primary" /></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom insight cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-card border border-surface-3 bg-surface-2 p-4 flex gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h4 className="font-display text-table font-bold text-text-1">Cơ hội Tối ưu</h4>
            <p className="text-table-sm text-text-2 mt-1">Overlap 450 units được phát hiện từ dữ liệu B2B Deals và PO hiện tại. Cần rà soát lại để tránh tồn kho ảo.</p>
          </div>
        </div>
        <div className="rounded-card border-2 border-danger bg-danger-bg p-4 flex gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-display text-table font-bold text-danger">Cảnh báo Freshness</h4>
            <p className="text-table-sm text-text-2 mt-1">SKU GA-300 B2 có mức tăng trưởng âm liên tục 3 kỳ. Đề xuất điều chỉnh Forecast Model sang XGBoost-V5.</p>
          </div>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-2 p-4 flex gap-3">
          <span className="text-2xl">📈</span>
          <div>
            <h4 className="font-display text-table font-bold text-text-1">Xu hướng thị trường</h4>
            <p className="text-table-sm text-text-2 mt-1">Nhu cầu tại khu vực Bình Dương (BD) tăng 12% so với tháng trước nhờ chiến dịch B2B Pipeline mới.</p>
          </div>
        </div>
      </div>

      {overrideModal && (
        <OverrideModal
          sku={`${data[overrideModal.idx].item} ${data[overrideModal.idx].variant}`}
          cell={overrideModal.cell}
          value={overrideModal.value}
          onClose={() => setOverrideModal(null)}
          onSave={handleOverrideSave}
        />
      )}
    </div>
  );
}

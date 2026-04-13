import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantContext";
import { ChevronRight, ChevronDown, Lock, TrendingUp, TrendingDown, Minus, Download } from "lucide-react";
import { StatusChip } from "@/components/StatusChip";
import { useNavigate } from "react-router-dom";

// ── Data ──
const tenantScale: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.72, "Mondelez": 1.35 };

interface FunnelStep {
  label: string; value: number; desc: string; pct: string;
  bg: string; text: string; border: string;
}

function getFunnel(s: number): FunnelStep[] {
  return [
    { label: "S&OP consensus", value: Math.round(7650 * s), desc: "kế hoạch", pct: "100%", bg: "bg-info-bg", text: "text-info", border: "border-info/20" },
    { label: "FC committed", value: Math.round(18500 * s), desc: "hứa 5 NM", pct: "242% coverage", bg: "bg-success-bg", text: "text-success", border: "border-success/20" },
    { label: "NM confirmed", value: Math.round(16200 * s), desc: "NM đồng ý", pct: "88% honoring", bg: "bg-success-bg/60", text: "text-success", border: "border-success/10" },
    { label: "PO released", value: Math.round(12400 * s), desc: "PO chính thức", pct: "77% released", bg: "bg-warning-bg", text: "text-warning", border: "border-warning/20" },
    { label: "Actual delivered", value: Math.round(3890 * s), desc: "thực nhận", pct: "31% (in progress)", bg: "bg-danger-bg", text: "text-danger", border: "border-danger/20" },
  ];
}

interface NMRow {
  nm: string; tier: string; fcCommitted: number; nmConfirmed: number;
  poReleased: number; delivered: number; grade: string;
  trend: "stable" | "better" | "worse";
  skus: { item: string; variant: string; fcCommitted: number; nmConfirmed: number; po: string; poQty: number; delivered: number; eta: string; state: string }[];
}

const baseNMs: NMRow[] = [
  { nm: "Mikado", tier: "Hard M+1", fcCommitted: 5500, nmConfirmed: 5060, poReleased: 3800, delivered: 1850, grade: "A", trend: "stable",
    skus: [
      { item: "GA-300", variant: "A4", fcCommitted: 2500, nmConfirmed: 2300, po: "PO-0847", poQty: 1200, delivered: 800, eta: "15/05", state: "SHIPPED" },
      { item: "GA-300", variant: "A4", fcCommitted: 0, nmConfirmed: 0, po: "PO-0901", poQty: 600, delivered: 0, eta: "20/05", state: "PRODUCTION" },
      { item: "GA-600", variant: "A4", fcCommitted: 3000, nmConfirmed: 2760, po: "PO-0915", poQty: 2200, delivered: 1050, eta: "18/05", state: "SHIPPED" },
    ]},
  { nm: "Toko", tier: "Hard M+1", fcCommitted: 6000, nmConfirmed: 4080, poReleased: 4100, delivered: 500, grade: "C", trend: "worse",
    skus: [
      { item: "GA-400", variant: "A4", fcCommitted: 3500, nmConfirmed: 2380, po: "PO-0822", poQty: 2500, delivered: 300, eta: "22/05", state: "PRODUCTION" },
      { item: "GA-400", variant: "D5", fcCommitted: 2500, nmConfirmed: 1700, po: "PO-0860", poQty: 1600, delivered: 200, eta: "25/05", state: "QUEUED" },
    ]},
  { nm: "Phú Mỹ", tier: "Firm M+2", fcCommitted: 3000, nmConfirmed: 1350, poReleased: 2500, delivered: 640, grade: "D", trend: "worse",
    skus: [
      { item: "GA-300", variant: "B2", fcCommitted: 1500, nmConfirmed: 675, po: "PO-0870", poQty: 1200, delivered: 340, eta: "19/05", state: "SHIPPED" },
      { item: "GA-600", variant: "B2", fcCommitted: 1500, nmConfirmed: 675, po: "PO-0890", poQty: 1300, delivered: 300, eta: "23/05", state: "PRODUCTION" },
    ]},
  { nm: "Đồng Tâm", tier: "Hard M+1", fcCommitted: 2500, nmConfirmed: 2250, poReleased: 1200, delivered: 600, grade: "A", trend: "better",
    skus: [
      { item: "GA-300", variant: "C1", fcCommitted: 1200, nmConfirmed: 1080, po: "PO-0835", poQty: 600, delivered: 350, eta: "16/05", state: "SHIPPED" },
      { item: "GA-400", variant: "A4", fcCommitted: 1300, nmConfirmed: 1170, po: "PO-0855", poQty: 600, delivered: 250, eta: "20/05", state: "PRODUCTION" },
    ]},
  { nm: "Vigracera", tier: "Soft M+3", fcCommitted: 1500, nmConfirmed: 1460, poReleased: 800, delivered: 300, grade: "B", trend: "stable",
    skus: [
      { item: "GA-600", variant: "A4", fcCommitted: 900, nmConfirmed: 876, po: "PO-0910", poQty: 500, delivered: 200, eta: "21/05", state: "SHIPPED" },
      { item: "GA-300", variant: "A4", fcCommitted: 600, nmConfirmed: 584, po: "PO-0920", poQty: 300, delivered: 100, eta: "24/05", state: "PRODUCTION" },
    ]},
];

// Rolling 6-month history per NM
const rollingHistory: Record<string, { commit: number; deliver: number }[]> = {
  "Mikado":   [{ commit: 4200, deliver: 3870 }, { commit: 4500, deliver: 4100 }, { commit: 4600, deliver: 4280 }, { commit: 4800, deliver: 4400 }, { commit: 5200, deliver: 4810 }, { commit: 5500, deliver: 0 }],
  "Toko":     [{ commit: 5000, deliver: 3750 }, { commit: 5200, deliver: 3640 }, { commit: 5500, deliver: 3850 }, { commit: 5500, deliver: 3850 }, { commit: 5800, deliver: 3770 }, { commit: 6000, deliver: 0 }],
  "Phú Mỹ":  [{ commit: 2500, deliver: 1625 }, { commit: 2800, deliver: 1680 }, { commit: 2700, deliver: 1350 }, { commit: 2900, deliver: 1305 }, { commit: 3100, deliver: 1395 }, { commit: 3000, deliver: 0 }],
  "Đồng Tâm": [{ commit: 2000, deliver: 1700 }, { commit: 2100, deliver: 1890 }, { commit: 2200, deliver: 1980 }, { commit: 2300, deliver: 2070 }, { commit: 2400, deliver: 2160 }, { commit: 2500, deliver: 0 }],
  "Vigracera": [{ commit: 1200, deliver: 1020 }, { commit: 1300, deliver: 1105 }, { commit: 1300, deliver: 1118 }, { commit: 1400, deliver: 1204 }, { commit: 1400, deliver: 1218 }, { commit: 1500, deliver: 0 }],
};
const rollingMonths = ["T12", "T1", "T2", "T3", "T4", "T5"];

const gradeBg: Record<string, string> = { A: "bg-success-bg text-success", B: "bg-info-bg text-info", C: "bg-warning-bg text-warning", D: "bg-danger-bg text-danger" };
const stateColor: Record<string, "success" | "info" | "warning"> = { SHIPPED: "success", PRODUCTION: "info", QUEUED: "warning" };

const periods = [
  { value: 5, label: "Tháng 5 (current)" },
  { value: 4, label: "Tháng 4 (closed)" },
  { value: 3, label: "Tháng 3 (closed)" },
];

export function ReconciliationTab() {
  const { tenant } = useTenant();
  const s = tenantScale[tenant] || 1;
  const navigate = useNavigate();
  const [period, setPeriod] = useState(5);
  const [expandedNM, setExpandedNM] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"current" | "rolling">("current");

  const isClosed = period < 5;
  const funnel = getFunnel(s);
  const nms = baseNMs.map(nm => ({
    ...nm,
    fcCommitted: Math.round(nm.fcCommitted * s),
    nmConfirmed: Math.round(nm.nmConfirmed * s),
    poReleased: Math.round(nm.poReleased * s),
    delivered: Math.round(nm.delivered * s),
    skus: nm.skus.map(sk => ({
      ...sk,
      fcCommitted: Math.round(sk.fcCommitted * s),
      nmConfirmed: Math.round(sk.nmConfirmed * s),
      poQty: Math.round(sk.poQty * s),
      delivered: Math.round(sk.delivered * s),
    })),
  }));

  const totals = {
    fcCommitted: nms.reduce((a, n) => a + n.fcCommitted, 0),
    nmConfirmed: nms.reduce((a, n) => a + n.nmConfirmed, 0),
    poReleased: nms.reduce((a, n) => a + n.poReleased, 0),
    delivered: nms.reduce((a, n) => a + n.delivered, 0),
  };

  const trendIcon = (t: string) =>
    t === "better" ? <TrendingUp className="h-3.5 w-3.5 text-success inline" /> :
    t === "worse" ? <TrendingDown className="h-3.5 w-3.5 text-danger inline" /> :
    <Minus className="h-3.5 w-3.5 text-text-3 inline" />;

  const trendLabel = (t: string) =>
    t === "better" ? "↗better" : t === "worse" ? "↘worse" : "→stable";

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Period selector + view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select value={period} onChange={e => { setPeriod(Number(e.target.value)); setExpandedNM(null); }}
            className="h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-1 focus:ring-primary">
            {periods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {isClosed && (
            <span className="flex items-center gap-1.5 text-caption text-text-3">
              <Lock className="h-3 w-3" /> Đã khóa {period === 4 ? "30/04" : "31/03"} 23:59. Không sửa được.
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-full border border-surface-3 bg-surface-0 p-0.5">
          {(["current", "rolling"] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className={cn("rounded-full px-3 py-1 text-table-sm font-medium transition-colors",
                viewMode === m ? "bg-gradient-primary text-primary-foreground" : "text-text-2 hover:text-text-1"
              )}>
              {m === "current" ? "Tháng hiện tại" : "Rolling 6 tháng"}
            </button>
          ))}
        </div>
      </div>

      {/* FUNNEL */}
      <div className={cn("flex items-stretch gap-0", isClosed && "opacity-70")}>
        {funnel.map((step, i) => (
          <div key={step.label} className="flex items-stretch flex-1">
            <div className={cn("flex-1 rounded-card border p-3 text-center", step.bg, step.border)}>
              <div className="text-caption text-text-3 uppercase mb-1">{step.label}</div>
              <div className={cn("text-kpi tabular-nums font-bold", step.text)}>{step.value.toLocaleString()} m²</div>
              <div className="text-caption text-text-3 mt-0.5">{step.desc}</div>
              <div className={cn("text-table-sm font-medium mt-1", step.text)}>{step.pct}</div>
            </div>
            {i < funnel.length - 1 && (
              <div className="flex items-center px-1">
                <ChevronRight className="h-5 w-5 text-text-3" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* MAIN TABLE or ROLLING VIEW */}
      {viewMode === "current" ? (
        <div className={cn("rounded-card border border-surface-3 bg-surface-2", isClosed && "opacity-80")}>
          <div className="px-5 py-3 border-b border-surface-3 flex items-center justify-between">
            <h3 className="font-display text-section-header text-text-1">
              Per NM — Tháng {period}
              {isClosed && <Lock className="h-3.5 w-3.5 text-text-3 inline ml-2" />}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  <th className="w-6" />
                  {["NM", "Tier", "FC committed", "NM confirmed", "Honoring%", "PO released", "Released%", "Delivered", "Delivery%", "Gap", "Grade", "Trend 3M"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nms.map((nm, i) => {
                  const honoring = nm.nmConfirmed / nm.fcCommitted;
                  const released = nm.poReleased / nm.nmConfirmed;
                  const delivery = nm.delivered / nm.poReleased;
                  const gap = nm.delivered - nm.fcCommitted;
                  const isExp = expandedNM === i;
                  return (
                    <>
                      <tr key={i} onClick={() => setExpandedNM(isExp ? null : i)}
                        className={cn("border-b border-surface-3/50 cursor-pointer transition-colors hover:bg-primary/5", isExp && "bg-primary/5",
                          isClosed && "bg-surface-1/30"
                        )}>
                        <td className="px-1 py-2 text-center">
                          {isExp ? <ChevronDown className="h-3.5 w-3.5 text-primary mx-auto" /> : <ChevronRight className="h-3.5 w-3.5 text-text-3 mx-auto" />}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-text-1">{nm.nm}</td>
                        <td className="px-3 py-2.5 text-text-2">{nm.tier}</td>
                        <td className="px-3 py-2.5 tabular-nums text-text-1">{nm.fcCommitted.toLocaleString()}</td>
                        <td className="px-3 py-2.5 tabular-nums text-text-1">{nm.nmConfirmed.toLocaleString()}</td>
                        <td className={cn("px-3 py-2.5 tabular-nums font-medium", honoring < 0.8 ? "text-danger" : "text-success")}>
                          {Math.round(honoring * 100)}% {honoring < 0.8 ? "🔴" : "🟢"}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-text-1">{nm.poReleased.toLocaleString()}</td>
                        <td className={cn("px-3 py-2.5 tabular-nums font-medium", released > 1 ? "text-warning" : "text-text-1")}>
                          {Math.round(released * 100)}%
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-text-1">{nm.delivered.toLocaleString()}</td>
                        <td className="px-3 py-2.5 tabular-nums text-text-2">{Math.round(delivery * 100)}%</td>
                        <td className="px-3 py-2.5 tabular-nums font-medium text-danger">{gap < 0 ? "" : "+"}{gap.toLocaleString()}</td>
                        <td className="px-3 py-2.5">
                          <span className={cn("inline-flex items-center justify-center h-6 w-6 rounded-full text-caption font-bold", gradeBg[nm.grade])}>
                            {nm.grade}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-table-sm">
                          {trendIcon(nm.trend)} <span className="ml-1 text-text-2">{trendLabel(nm.trend)}</span>
                        </td>
                      </tr>
                      {isExp && (
                        <tr key={`exp-${i}`}>
                          <td colSpan={13} className="bg-surface-0 border-b border-surface-3 p-0">
                            <div className="px-8 py-3">
                              <table className="w-full text-table-sm">
                                <thead>
                                  <tr className="border-b border-surface-3/50">
                                    {["Item", "Variant", "FC committed", "NM confirmed", "PO#", "PO qty", "Delivered", "ETA", "State"].map(h => (
                                      <th key={h} className="px-3 py-1.5 text-left text-table-header uppercase text-text-3">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {nm.skus.map((sk, si) => (
                                    <tr key={si} className="border-b border-surface-3/30 hover:bg-surface-1/30 transition-colors">
                                      <td className="px-3 py-2 font-medium text-text-1">{sk.item}</td>
                                      <td className="px-3 py-2 text-text-2">{sk.variant}</td>
                                      <td className="px-3 py-2 tabular-nums text-text-1">{sk.fcCommitted > 0 ? sk.fcCommitted.toLocaleString() : "—"}</td>
                                      <td className="px-3 py-2 tabular-nums text-text-1">{sk.nmConfirmed > 0 ? sk.nmConfirmed.toLocaleString() : "—"}</td>
                                      <td className="px-3 py-2">
                                        <button onClick={(e) => { e.stopPropagation(); navigate("/orders"); }}
                                          className="text-primary hover:underline font-medium">{sk.po}</button>
                                      </td>
                                      <td className="px-3 py-2 tabular-nums text-text-1">{sk.poQty.toLocaleString()}</td>
                                      <td className="px-3 py-2 tabular-nums text-text-1">{sk.delivered.toLocaleString()}</td>
                                      <td className="px-3 py-2 tabular-nums text-text-2">{sk.eta}</td>
                                      <td className="px-3 py-2">
                                        <StatusChip status={stateColor[sk.state] || "info"} label={`● ${sk.state}`} />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
                {/* TOTAL */}
                <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                  <td />
                  <td className="px-3 py-2.5 text-text-1">TOTAL</td>
                  <td />
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{totals.fcCommitted.toLocaleString()}</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{totals.nmConfirmed.toLocaleString()}</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{Math.round(totals.nmConfirmed / totals.fcCommitted * 100)}%</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{totals.poReleased.toLocaleString()}</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{Math.round(totals.poReleased / totals.nmConfirmed * 100)}%</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{totals.delivered.toLocaleString()}</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{Math.round(totals.delivered / totals.poReleased * 100)}%</td>
                  <td className="px-3 py-2.5 tabular-nums text-danger">{(totals.delivered - totals.fcCommitted).toLocaleString()}</td>
                  <td />
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ROLLING 6-MONTH VIEW */
        <div className="rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-3 border-b border-surface-3">
            <h3 className="font-display text-section-header text-text-1">Rolling 6 tháng — Commit → Deliver</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  <th className="px-3 py-2 text-left text-table-header uppercase text-text-3 min-w-[90px]">NM</th>
                  {rollingMonths.map((m, i) => (
                    <th key={m} className={cn("px-3 py-2 text-center text-table-header uppercase min-w-[120px]",
                      i < 5 ? "text-text-3 bg-surface-1/30" : "text-primary bg-primary/5"
                    )}>
                      {m} {i === 5 && "★"}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center text-table-header uppercase text-text-3">Avg</th>
                  <th className="px-3 py-2 text-center text-table-header uppercase text-text-3">Trend</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(rollingHistory).map(([nm, months]) => {
                  const closed = months.slice(0, 5);
                  const avgPct = Math.round(closed.reduce((a, m) => a + (m.deliver / m.commit), 0) / closed.length * 100);
                  const nmData = baseNMs.find(n => n.nm === nm);
                  return (
                    <tr key={nm} className="border-b border-surface-3/50 hover:bg-primary/5 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-text-1">{nm}</td>
                      {months.map((m, i) => {
                        const sc = Math.round(m.commit * s);
                        const sd = Math.round(m.deliver * s);
                        const pct = m.deliver > 0 ? Math.round(m.deliver / m.commit * 100) : null;
                        const isCurrent = i === 5;
                        const isLocked = i < 5;
                        return (
                          <td key={i} className={cn("px-3 py-2.5 text-center tabular-nums",
                            isLocked && "bg-surface-1/20 text-text-3",
                            isCurrent && "bg-primary/3 text-text-1 font-medium"
                          )}>
                            <div className="text-[11px]">
                              {sc.toLocaleString()}→{isCurrent ? "?" : sd.toLocaleString()}
                            </div>
                            {pct !== null && !isCurrent && (
                              <div className={cn("text-[10px] font-medium", pct >= 85 ? "text-success" : pct >= 70 ? "text-warning" : "text-danger")}>
                                ({pct}%)
                              </div>
                            )}
                            {isCurrent && <div className="text-[10px] text-text-3">(in progress)</div>}
                            {isLocked && <Lock className="h-2.5 w-2.5 text-text-3 mx-auto mt-0.5 inline" />}
                          </td>
                        );
                      })}
                      <td className={cn("px-3 py-2.5 text-center tabular-nums font-medium",
                        avgPct >= 85 ? "text-success" : avgPct >= 70 ? "text-warning" : "text-danger"
                      )}>{avgPct}%</td>
                      <td className="px-3 py-2.5 text-center">
                        {nmData && trendIcon(nmData.trend)}
                        <span className="ml-1 text-text-2 text-[11px]">{nmData && trendLabel(nmData.trend)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="rounded-card border border-surface-3 bg-surface-2 px-5 py-3 flex items-center justify-between">
        <span className="text-table text-text-2">
          <strong>Tháng {period}</strong> — Day 16/30. Delivered <span className="font-bold text-text-1">31%</span> of released (in progress).
          Forecast cuối tháng: <span className="font-medium text-success">~85%</span> dựa trên pipeline + ETA.
        </span>
        <div className="flex gap-2">
          <button className="rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-2 hover:border-primary/30 transition-colors flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export đối chiếu PDF
          </button>
          <button className="rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-2 hover:border-primary/30 transition-colors flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export Excel
          </button>
        </div>
      </div>
    </div>
  );
}

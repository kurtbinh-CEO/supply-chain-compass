import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, AlertTriangle, TrendingDown, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ClickableNumber } from "@/components/ClickableNumber";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from "recharts";

type NmRiskTier = "low" | "med" | "high";

interface NmCard {
  id: string;
  name: string;
  confirmed: number;
  honoring: number; // %
  risk: NmRiskTier;
  note: string;
}

interface CommitmentRow {
  nm: string;
  sku: string;
  prev: number;
  curr: number;
  reason?: string;
}

interface ChangeLog {
  time: string;
  who: string;
  change: string;
  source: string;
}

interface Props {
  scale: number;
  totals: { sopLocked: number; nmConfirmed: number; released: number; ssHub: number; available: number };
}

export function HubOverviewTab({ scale, totals }: Props) {
  const navigate = useNavigate();
  const [compareOpen, setCompareOpen] = useState(true);
  const [hoveredSku, setHoveredSku] = useState<string>("GA-300");

  const nmCards: NmCard[] = useMemo(() => [
    { id: "mikado",   name: "Mikado",   confirmed: Math.round(2400 * scale), honoring: 98, risk: "low",  note: "On-time 12/12. Stable." },
    { id: "toko",     name: "Toko",     confirmed: Math.round(1500 * scale), honoring: 72, risk: "high", note: "Counter 80%. Avg −26%." },
    { id: "anpha",    name: "An Pha",   confirmed: Math.round(1300 * scale), honoring: 91, risk: "med",  note: "LT +2d gần đây." },
    { id: "vinakraft",name: "Vinakraft",confirmed: Math.round(1100 * scale), honoring: 95, risk: "low",  note: "Capacity dư." },
    { id: "saigonpaper",name:"SG Paper", confirmed: Math.round(900 * scale),  honoring: 84, risk: "med",  note: "Honoring giảm 2 tháng." },
  ], [scale]);

  const compareRows: CommitmentRow[] = [
    { nm: "Toko",     sku: "GA-600", prev: 6500, curr: 4080, reason: "Counter 80%" },
    { nm: "Mikado",   sku: "GA-300", prev: 12000,curr: 12500 },
    { nm: "An Pha",   sku: "GA-450", prev: 8200, curr: 7900 },
    { nm: "Vinakraft",sku: "GA-300", prev: 6800, curr: 7200 },
    { nm: "SG Paper", sku: "GA-600", prev: 8600, curr: 11100,reason: "Cover Toko shortage" },
  ];
  const totalPrev = compareRows.reduce((s, r) => s + r.prev, 0);
  const totalCurr = compareRows.reduce((s, r) => s + r.curr, 0);
  const totalDelta = ((totalCurr - totalPrev) / totalPrev) * 100;

  const skuBases = ["GA-300", "GA-450", "GA-600"];
  const timelineEvents: Record<string, Record<number, string>> = {
    "GA-300": { 3: "+2,000 m² Mikado confirm", 12: "−1,400 Toko counter", 22: "+800 Vinakraft top-up" },
    "GA-450": { 5: "+1,200 An Pha confirm", 18: "−600 BPO released" },
    "GA-600": { 7: "−2,420 Toko counter", 14: "+2,500 SG Paper cover" },
  };
  const timeline = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    const seriesData: Record<string, number[]> = {};
    skuBases.forEach((s, idx) => {
      const start = (4000 + idx * 1500) * scale;
      let cur = start;
      seriesData[s] = days.map(d => {
        const evt = timelineEvents[s]?.[d];
        if (evt) {
          const m = evt.match(/[+−-](\d[\d,]*)/);
          if (m) {
            const val = parseInt(m[1].replace(/,/g, ""), 10) * (evt.includes("−") || evt.includes("-") ? -1 : 1);
            cur += val * scale;
          }
        }
        return Math.round(cur);
      });
    });
    return days.map(d => ({
      day: `D${d}`,
      dayNum: d,
      ...Object.fromEntries(skuBases.map(s => [s, seriesData[s][d - 1]])),
      event: timelineEvents[hoveredSku]?.[d],
    }));
  }, [scale, hoveredSku]);

  const changeLog: ChangeLog[] = [
    { time: "12/05 14:30", who: "DRP Bot",  change: "Released 1,200 m² GA-300 → CN-BD", source: "drp" },
    { time: "12/05 11:15", who: "Toko",     change: "Đề xuất khác GA-600: 6.500 → 4.080 (−37%)", source: "nm" },
    { time: "12/05 09:42", who: "Mikado",   change: "Confirm GA-300: +2,000 m²", source: "nm" },
    { time: "11/05 16:20", who: "Lan (PM)", change: "Adjust SS Hub: 380 → 420 m²", source: "manual" },
    { time: "11/05 08:00", who: "System",   change: "S&OP v3 Lock T5: 7,650 m²", source: "sop" },
  ];

  const ssAlert = totals.available < totals.ssHub;

  return (
    <div className="space-y-6">
      <section className="rounded-card border border-surface-3 bg-surface-1 p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-display text-section-header text-text-1">Hub ảo — Available</h2>
            <p className="text-caption text-text-3 mt-1">Công thức: <span className="font-mono">SOP locked + SS Hub − Released</span></p>
          </div>
          <ClickableNumber
            value={`${totals.available.toLocaleString()} m²`}
            label="Hub Available"
            color={cn("font-display text-hero", ssAlert ? "text-danger" : "text-success")}
            breakdown={[
              { label: "SOP locked",   value: `${totals.sopLocked.toLocaleString()} m²`, color: "text-text-1" },
              { label: "+ SS Hub",     value: `${totals.ssHub.toLocaleString()} m²`,    color: "text-text-2" },
              { label: "− Released",   value: `${totals.released.toLocaleString()} m²`, color: "text-info" },
              { label: "= Available",  value: `${totals.available.toLocaleString()} m²`,color: ssAlert ? "text-danger" : "text-success" },
            ]}
            note="Số m² còn có thể release từ Hub mà không vi phạm SS"
          />
        </div>

        {ssAlert && (
          <div className="mb-4 flex items-start gap-2 rounded-button border border-danger/30 bg-danger-bg/30 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
            <div className="text-table-sm">
              <span className="font-semibold text-danger">Hub dưới SS!</span>{" "}
              <span className="text-text-2">
                Available {totals.available.toLocaleString()} &lt; SS Hub {totals.ssHub.toLocaleString()} m². Cần escalate hoặc top-up từ NM.
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {nmCards.map(nm => (
            <button
              key={nm.id}
              onClick={() => navigate(`/gap-scenario?nm=${nm.id}`)}
              className="text-left rounded-card border border-surface-3 bg-surface-0 p-3 hover:border-primary/50 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-display text-table font-semibold text-text-1">{nm.name}</span>
                <RiskBadge tier={nm.risk} />
              </div>
              <div className="text-section-header font-display text-text-1 tabular-nums">
                {nm.confirmed.toLocaleString()}
                <span className="text-caption text-text-3 font-sans ml-1">m²</span>
              </div>
              <div className="text-caption text-text-3 mt-0.5">Honoring: <span className={cn("font-medium", nm.honoring >= 95 ? "text-success" : nm.honoring >= 85 ? "text-warning" : "text-danger")}>{nm.honoring}%</span></div>
              <div className="text-caption text-text-3 mt-1 line-clamp-2">{nm.note}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-card border border-surface-3 bg-surface-1">
        <button
          onClick={() => setCompareOpen(o => !o)}
          className="w-full px-5 py-3 flex items-center justify-between border-b border-surface-3"
        >
          <div className="flex items-center gap-2">
            <h2 className="font-display text-section-header text-text-1">Cam kết NM — T5 vs T4</h2>
            <span className={cn("text-table-sm tabular-nums font-medium", totalDelta >= 0 ? "text-success" : "text-danger")}>
              {totalDelta >= 0 ? "+" : ""}{totalDelta.toFixed(1)}%
            </span>
          </div>
          {compareOpen ? <ChevronUp className="h-4 w-4 text-text-3" /> : <ChevronDown className="h-4 w-4 text-text-3" />}
        </button>

        {compareOpen && (
          <div className="px-5 py-4">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="text-left text-caption uppercase text-text-3 tracking-wider border-b border-surface-3">
                  <th className="py-2 font-medium">NM</th>
                  <th className="py-2 font-medium">SKU</th>
                  <th className="py-2 font-medium text-right">T4 (m²)</th>
                  <th className="py-2 font-medium text-right">T5 (m²)</th>
                  <th className="py-2 font-medium text-right">Δ%</th>
                  <th className="py-2 font-medium">Lý do</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((r, i) => {
                  const delta = ((r.curr - r.prev) / r.prev) * 100;
                  const big = Math.abs(delta) >= 30;
                  return (
                    <tr key={i} className="border-b border-surface-3/40 hover:bg-surface-2/40">
                      <td className="py-2 text-text-1 font-medium">{r.nm}</td>
                      <td className="py-2 text-text-2 font-mono">{r.sku}</td>
                      <td className="py-2 text-right text-text-2 tabular-nums">{r.prev.toLocaleString()}</td>
                      <td className="py-2 text-right text-text-1 tabular-nums">{r.curr.toLocaleString()}</td>
                      <td className={cn("py-2 text-right tabular-nums font-medium", delta >= 0 ? "text-success" : "text-danger")}>
                        <span className="inline-flex items-center gap-1">
                          {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {delta >= 0 ? "+" : ""}{delta.toFixed(1)}%
                          {big && delta < 0 && <span className="ml-1">🔴</span>}
                        </span>
                      </td>
                      <td className="py-2 text-text-3 text-caption">{r.reason || "—"}</td>
                    </tr>
                  );
                })}
                <tr className="font-semibold bg-surface-2/40">
                  <td className="py-2 text-text-1" colSpan={2}>Tổng</td>
                  <td className="py-2 text-right text-text-1 tabular-nums">{totalPrev.toLocaleString()}</td>
                  <td className="py-2 text-right text-text-1 tabular-nums">{totalCurr.toLocaleString()}</td>
                  <td className={cn("py-2 text-right tabular-nums", totalDelta >= 0 ? "text-success" : "text-danger")}>
                    {totalDelta >= 0 ? "+" : ""}{totalDelta.toFixed(1)}%
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-card border border-surface-3 bg-surface-1 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-section-header text-text-1">Hub Stock Timeline — 30 ngày</h2>
            <p className="text-caption text-text-3 mt-0.5">Step-line theo SKU base · hover điểm để xem sự kiện</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 p-0.5">
            {skuBases.map(s => (
              <button
                key={s}
                onClick={() => setHoveredSku(s)}
                className={cn(
                  "px-2.5 py-1 text-caption font-medium rounded transition-colors",
                  hoveredSku === s ? "bg-primary text-primary-foreground" : "text-text-2 hover:text-text-1"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--surface-3))" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--text-3))" }} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--text-3))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--surface-2))",
                  border: "1px solid hsl(var(--surface-3))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v.toLocaleString()} m²`, hoveredSku]}
                labelFormatter={(label, payload) => {
                  const ev = payload?.[0]?.payload?.event;
                  return ev ? `${label} — ${ev}` : label;
                }}
              />
              <ReferenceLine y={totals.ssHub} stroke="hsl(var(--danger))" strokeDasharray="4 4" label={{ value: "SS Hub", fill: "hsl(var(--danger))", fontSize: 10, position: "right" }} />
              <Line type="stepAfter" dataKey={hoveredSku} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--primary))" }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-card border border-surface-3 bg-surface-1">
        <div className="px-5 py-3 border-b border-surface-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-text-3" />
          <h2 className="font-display text-section-header text-text-1">Change Log — Hub Stock</h2>
          <span className="text-caption text-text-3">entityType="hub_stock"</span>
        </div>
        <table className="w-full text-table-sm">
          <thead>
            <tr className="text-left text-caption uppercase text-text-3 tracking-wider border-b border-surface-3">
              <th className="px-5 py-2 font-medium">Thời gian</th>
              <th className="px-5 py-2 font-medium">Người / Nguồn</th>
              <th className="px-5 py-2 font-medium">Thay đổi</th>
              <th className="px-5 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {changeLog.map((log, i) => (
              <tr key={i} className="border-b border-surface-3/40 last:border-0 hover:bg-surface-2/40">
                <td className="px-5 py-2 text-text-2 font-mono tabular-nums">{log.time}</td>
                <td className="px-5 py-2 text-text-1">{log.who}</td>
                <td className="px-5 py-2 text-text-2">{log.change}</td>
                <td className="px-5 py-2">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-caption uppercase tracking-wider bg-surface-3 text-text-2">{log.source}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function RiskBadge({ tier }: { tier: NmRiskTier }) {
  const map = {
    low:  { label: "Low",  cls: "bg-success-bg text-success border-success/30",  emoji: "🟢" },
    med:  { label: "Med",  cls: "bg-warning-bg text-warning border-warning/30",  emoji: "🟡" },
    high: { label: "High", cls: "bg-danger-bg  text-danger  border-danger/30",   emoji: "🔴" },
  } as const;
  const v = map[tier];
  return (
    <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-caption font-medium", v.cls)}>
      <span>{v.emoji}</span>{v.label}
    </span>
  );
}

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft } from "lucide-react";

interface Props { scale: number }

interface ReconNm {
  nm: string;
  months: { label: string; committed: number; delivered: number; closed: boolean }[];
  skus: { item: string; variant: string; committed: number; confirmed: number; po: string; poQty: number; delivered: number; eta: string; state: string }[];
}

const baseRecon: ReconNm[] = [
  { nm: "Mikado",
    months: [
      { label: "Th3", committed: 4800, delivered: 4400, closed: true },
      { label: "Th4", committed: 5200, delivered: 4810, closed: true },
      { label: "Th5", committed: 5500, delivered: 1850, closed: false },
    ],
    skus: [
      { item: "GA-300", variant: "A4", committed: 2500, confirmed: 2300, po: "PO-0847", poQty: 1200, delivered: 800, eta: "15/05", state: "SHIPPED" },
      { item: "GA-600", variant: "A4", committed: 3000, confirmed: 2760, po: "PO-0915", poQty: 2200, delivered: 1050, eta: "18/05", state: "SHIPPED" },
    ] },
  { nm: "Toko",
    months: [
      { label: "Th3", committed: 5500, delivered: 3850, closed: true },
      { label: "Th4", committed: 5800, delivered: 3770, closed: true },
      { label: "Th5", committed: 6000, delivered: 500, closed: false },
    ],
    skus: [
      { item: "GA-300", variant: "A4", committed: 2000, confirmed: 1500, po: "PO-0860", poQty: 1000, delivered: 300, eta: "20/05", state: "PRODUCTION" },
      { item: "GA-600", variant: "A4", committed: 2000, confirmed: 1200, po: "PO-0872", poQty: 800, delivered: 200, eta: "22/05", state: "PRODUCTION" },
    ] },
  { nm: "Phú Mỹ",
    months: [
      { label: "Th3", committed: 2800, delivered: 1400, closed: true },
      { label: "Th4", committed: 3000, delivered: 1500, closed: true },
      { label: "Th5", committed: 3000, delivered: 640, closed: false },
    ],
    skus: [
      { item: "GA-300", variant: "B2", committed: 1500, confirmed: 650, po: "PO-0880", poQty: 500, delivered: 340, eta: "19/05", state: "SHIPPED" },
      { item: "GA-600", variant: "B2", committed: 1500, confirmed: 700, po: "PO-0895", poQty: 400, delivered: 300, eta: "23/05", state: "QUEUED" },
    ] },
  { nm: "Đồng Tâm",
    months: [
      { label: "Th3", committed: 2200, delivered: 2000, closed: true },
      { label: "Th4", committed: 2500, delivered: 2250, closed: true },
      { label: "Th5", committed: 2500, delivered: 600, closed: false },
    ],
    skus: [
      { item: "GA-400", variant: "A4", committed: 1300, confirmed: 1200, po: "PO-0850", poQty: 900, delivered: 400, eta: "16/05", state: "SHIPPED" },
      { item: "GA-400", variant: "D5", committed: 1200, confirmed: 1050, po: "PO-0865", poQty: 700, delivered: 200, eta: "21/05", state: "PRODUCTION" },
    ] },
  { nm: "Vigracera",
    months: [
      { label: "Th3", committed: 1400, delivered: 1300, closed: true },
      { label: "Th4", committed: 1500, delivered: 1350, closed: true },
      { label: "Th5", committed: 1500, delivered: 300, closed: false },
    ],
    skus: [
      { item: "GA-600", variant: "A4", committed: 800, confirmed: 780, po: "PO-0870", poQty: 500, delivered: 200, eta: "17/05", state: "SHIPPED" },
      { item: "GA-600", variant: "B2", committed: 700, confirmed: 680, po: "PO-0890", poQty: 400, delivered: 100, eta: "24/05", state: "QUEUED" },
    ] },
];

function getTrend(months: { committed: number; delivered: number; closed: boolean }[]): string {
  const closed = months.filter(m => m.closed);
  if (closed.length < 2) return "→stable";
  const pcts = closed.map(m => m.committed > 0 ? (m.delivered / m.committed) * 100 : 0);
  const last = pcts[pcts.length - 1];
  const prev = pcts[pcts.length - 2];
  if (last - prev > 3) return "↗better";
  if (prev - last > 3) return "↘worse";
  return "→stable";
}

function getAvgHonoring(months: { committed: number; delivered: number; closed: boolean }[]): number {
  const closed = months.filter(m => m.closed);
  if (closed.length === 0) return 0;
  const total = closed.reduce((a, m) => a + (m.committed > 0 ? (m.delivered / m.committed) * 100 : 0), 0);
  return Math.round(total / closed.length);
}

export function ReconciliationTab({ scale }: Props) {
  const [drillNm, setDrillNm] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("Tháng 5 (đang chạy)");

  const recon = baseRecon.map(r => ({
    ...r,
    months: r.months.map(m => ({
      ...m,
      committed: Math.round(m.committed * scale),
      delivered: Math.round(m.delivered * scale),
    })),
    skus: r.skus.map(s => ({
      ...s,
      committed: Math.round(s.committed * scale),
      confirmed: Math.round(s.confirmed * scale),
      poQty: Math.round(s.poQty * scale),
      delivered: Math.round(s.delivered * scale),
    })),
  }));

  if (drillNm !== null) {
    const nm = recon[drillNm];
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2 text-table-sm">
          <button onClick={() => setDrillNm(null)} className="text-primary font-medium hover:underline flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Đối chiếu
          </button>
          <span className="text-text-3">/</span>
          <span className="text-text-1 font-medium">{nm.nm}</span>
        </div>

        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["Item", "Variant", "Committed", "Confirmed", "PO#", "PO qty", "Delivered", "ETA", "State"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nm.skus.map((sk, si) => (
                  <tr key={si} className={cn("border-b border-surface-3/50 hover:bg-primary/5", si % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                    <td className="px-4 py-2.5 font-medium text-text-1">{sk.item}</td>
                    <td className="px-4 py-2.5 text-text-2">{sk.variant}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-1">{sk.committed.toLocaleString()}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-1">{sk.confirmed.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-primary font-mono text-[11px]">{sk.po}</span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-text-1">{sk.poQty.toLocaleString()}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-1 font-medium">{sk.delivered.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-text-2 font-mono text-[11px]">{sk.eta}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-bold",
                        sk.state === "SHIPPED" ? "bg-success-bg text-success" :
                        sk.state === "PRODUCTION" ? "bg-warning-bg text-warning" :
                        "bg-info-bg text-info"
                      )}>
                        ● {sk.state}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <select
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          className="rounded-button border border-surface-3 bg-surface-0 text-table-sm text-text-1 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option>Tháng 5 (đang chạy)</option>
          <option>Tháng 4 (closed)</option>
          <option>Tháng 3 (closed)</option>
        </select>
        <div className="flex-1" />
        <button className="rounded-button border border-surface-3 text-table-sm text-text-2 px-3 py-2 hover:bg-surface-2">Export PDF</button>
        <button className="rounded-button border border-surface-3 text-table-sm text-text-2 px-3 py-2 hover:bg-surface-2">Export Excel</button>
      </div>

      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                <th className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">NM</th>
                {recon[0]?.months.map((m, mi) => (
                  <th key={mi} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">
                    {m.label} {m.closed && "🔒"}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">Avg honoring</th>
                <th className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">Trend</th>
                <th className="px-4 py-2.5 text-left text-table-header uppercase text-text-3" />
              </tr>
            </thead>
            <tbody>
              {recon.map((nm, i) => {
                const avg = getAvgHonoring(nm.months);
                const trend = getTrend(nm.months);
                const avgColor = avg >= 80 ? "text-success" : avg >= 60 ? "text-warning" : "text-danger";
                const trendColor = trend.includes("better") ? "text-success" : trend.includes("worse") ? "text-danger" : "text-text-2";

                return (
                  <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                    <td className="px-4 py-2.5 font-medium text-text-1">{nm.nm}</td>
                    {nm.months.map((m, mi) => {
                      const pct = m.committed > 0 ? Math.round((m.delivered / m.committed) * 100) : 0;
                      return (
                        <td key={mi} className={cn("px-4 py-2.5 tabular-nums", m.closed ? "bg-surface-1/60 text-text-2" : "text-text-1")}>
                          <span className="text-text-1">{m.committed.toLocaleString()}</span>
                          <span className="text-text-3">→</span>
                          <span className={cn("font-medium", m.closed ? "" : "text-primary")}>{m.delivered.toLocaleString()}</span>
                          <span className={cn("ml-1 text-[11px]", m.closed ? (pct >= 80 ? "text-success" : "text-danger") : "text-info")}>
                            ({m.closed ? `${pct}%` : "đang giao"})
                          </span>
                        </td>
                      );
                    })}
                    <td className={cn("px-4 py-2.5 tabular-nums font-bold", avgColor)}>{avg}%</td>
                    <td className={cn("px-4 py-2.5 font-medium", trendColor)}>{trend}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => setDrillNm(i)} className="text-primary text-table-sm font-medium hover:underline flex items-center gap-0.5">
                        Detail <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-table-sm text-text-3 italic">
        Tháng closed: số lock vĩnh viễn, không sửa được. Honoring% feed → /monitoring closed-loop.
      </div>
    </div>
  );
}

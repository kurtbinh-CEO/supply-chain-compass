import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronDown, Info } from "lucide-react";
import { ClickableNumber } from "@/components/ClickableNumber";
import { toast } from "sonner";
import { ViewPivotToggle, usePivotMode, CnGapBadge } from "@/components/ViewPivotToggle";

interface Props {
  tenant: string;
  b2bPerCn: Record<string, number>;
}

type View = "12m" | "3m" | "week";

const tenantScale: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.72, "Mondelez": 1.35 };

const baseCnData = [
  { cn: "CN-BD", fc: 1600, b2b: 680, po: 345, vsLm: 14, stock: 210 },
  { cn: "CN-ĐN", fc: 1150, b2b: 420, po: 280, vsLm: 7, stock: 840 },
  { cn: "CN-HN", fc: 1350, b2b: 520, po: 310, vsLm: -4, stock: 630 },
  { cn: "CN-CT", fc: 700, b2b: 380, po: 165, vsLm: -4, stock: 440 },
];

const skuPerCn: Record<string, { item: string; variant: string; fc: number; b2b: number; po: number; vsLm: number; source: string; mape: number }[]> = {
  "CN-BD": [
    { item: "GA-300", variant: "A4", fc: 580, b2b: 340, po: 155, vsLm: 8, source: "Holt-Winters", mape: 18.4 },
    { item: "GA-300", variant: "B2", fc: 120, b2b: 40, po: 20, vsLm: -3, source: "XGBoost", mape: 12.1 },
    { item: "GA-600", variant: "A4", fc: 620, b2b: 220, po: 130, vsLm: 15, source: "XGBoost", mape: 14.2 },
    { item: "GA-600", variant: "B2", fc: 280, b2b: 80, po: 40, vsLm: 22, source: "Holt-Winters", mape: 16.8 },
  ],
  "CN-ĐN": [
    { item: "GA-300", variant: "A4", fc: 420, b2b: 180, po: 110, vsLm: 5, source: "XGBoost", mape: 11.2 },
    { item: "GA-600", variant: "A4", fc: 480, b2b: 160, po: 120, vsLm: 9, source: "XGBoost", mape: 13.5 },
    { item: "GA-400", variant: "A4", fc: 250, b2b: 80, po: 50, vsLm: 4, source: "Holt-Winters", mape: 19.0 },
  ],
  "CN-HN": [
    { item: "GA-300", variant: "A4", fc: 500, b2b: 220, po: 130, vsLm: -2, source: "XGBoost", mape: 10.8 },
    { item: "GA-300", variant: "C1", fc: 280, b2b: 95, po: 55, vsLm: -6, source: "Holt-Winters", mape: 20.1 },
    { item: "GA-600", variant: "A4", fc: 380, b2b: 150, po: 90, vsLm: -3, source: "XGBoost", mape: 15.0 },
    { item: "GA-400", variant: "D5", fc: 190, b2b: 55, po: 35, vsLm: -8, source: "Holt-Winters", mape: 22.3 },
  ],
  "CN-CT": [
    { item: "GA-300", variant: "A4", fc: 300, b2b: 180, po: 75, vsLm: -2, source: "XGBoost", mape: 14.5 },
    { item: "GA-400", variant: "A4", fc: 250, b2b: 130, po: 55, vsLm: -5, source: "Holt-Winters", mape: 17.2 },
    { item: "GA-600", variant: "B2", fc: 150, b2b: 70, po: 35, vsLm: -7, source: "XGBoost", mape: 13.8 },
  ],
};

const months12 = ["T1","T2","T3","T4","T5","T6","T7","T8","T9","T10","T11","T12"];
const base12m = [4200,3800,4100,7280,7650,7280,6620,5500,4800,5200,3800,3500];
const weekLabels = ["W16","W17","W18","W19"];
const weekWeights = [0.28, 0.25, 0.24, 0.23];

// Override modal
function OverrideModal({ sku, value, onClose, onSave }: {
  sku: string; value: number; onClose: () => void;
  onSave: (v: number, reason: string) => void;
}) {
  const [newVal, setNewVal] = useState(value);
  const [reason, setReason] = useState("");
  return (
    <>
      <div className="fixed inset-0 bg-text-1/30 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 p-6 space-y-4 animate-fade-in">
        <h3 className="font-display text-section-header text-text-1">Override: {sku}</h3>
        <p className="text-table-sm text-text-3">Current: {value.toLocaleString()} m²</p>
        <div>
          <label className="text-table-header uppercase text-text-3 mb-1 block">New Quantity (m²)</label>
          <input type="number" value={newVal} onChange={e => setNewVal(Number(e.target.value))}
            className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary tabular-nums" />
        </div>
        <div>
          <label className="text-table-header uppercase text-text-3 mb-1 block">Reason</label>
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Lý do điều chỉnh..."
            className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 rounded-button border border-surface-3 py-2 text-table text-text-2 hover:bg-surface-3">Hủy</button>
          <button onClick={() => { onSave(newVal, reason); toast.success(`Override ${sku}: ${newVal.toLocaleString()} m²`); }}
            className="flex-1 rounded-button bg-gradient-primary text-white py-2 text-table font-medium">Lưu</button>
        </div>
      </div>
    </>
  );
}

export function DemandTotalTab({ tenant, b2bPerCn }: Props) {
  const [view, setView] = useState<View>("12m");
  const [expandedCns, setExpandedCns] = useState<Set<string>>(new Set());
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(new Set());
  const [overrideModal, setOverrideModal] = useState<{ sku: string; value: number } | null>(null);
  const [pivotMode, setPivotMode] = usePivotMode("demand");

  const s = tenantScale[tenant] || 1;

  const toggleCn = (cnKey: string) => {
    setExpandedCns(prev => {
      const next = new Set(prev);
      if (next.has(cnKey)) { next.delete(cnKey); } else { next.add(cnKey); }
      return next;
    });
  };

  const toggleSku = (skuKey: string) => {
    setExpandedSkus(prev => {
      const next = new Set(prev);
      if (next.has(skuKey)) { next.delete(skuKey); } else { next.add(skuKey); }
      return next;
    });
  };

  const cnData = useMemo(() => baseCnData.map(c => {
    const fc = Math.round(c.fc * s);
    const b2b = b2bPerCn[c.cn.replace("CN-", "")] || Math.round(c.b2b * s);
    const po = Math.round(c.po * s);
    const total = fc + b2b + po;
    const stock = Math.round(c.stock * s);
    const cover = total > 0 ? Math.round((stock / (total / 30)) * 10) / 10 : 0;
    return { ...c, fc, b2b, po, total, stock, cover };
  }), [s, b2bPerCn]);

  const totals = useMemo(() => ({
    fc: cnData.reduce((a, c) => a + c.fc, 0),
    b2b: cnData.reduce((a, c) => a + c.b2b, 0),
    po: cnData.reduce((a, c) => a + c.po, 0),
    total: cnData.reduce((a, c) => a + c.total, 0),
    vsLm: 4,
    cover: 8.5,
  }), [cnData]);

  // SKU-first aggregation
  const skuAggregated = useMemo(() => {
    const skuMap: Record<string, { item: string; variant: string; totalFc: number; totalB2b: number; totalPo: number; totalDemand: number;
      cnDetails: { cn: string; fc: number; b2b: number; po: number; total: number; vsLm: number; mape: number; source: string }[];
    }> = {};
    Object.entries(skuPerCn).forEach(([cnKey, skus]) => {
      skus.forEach(sk => {
        const key = `${sk.item}-${sk.variant}`;
        const fc = Math.round(sk.fc * s);
        const b2b = Math.round(sk.b2b * s);
        const po = Math.round(sk.po * s);
        if (!skuMap[key]) {
          skuMap[key] = { item: sk.item, variant: sk.variant, totalFc: 0, totalB2b: 0, totalPo: 0, totalDemand: 0, cnDetails: [] };
        }
        skuMap[key].totalFc += fc;
        skuMap[key].totalB2b += b2b;
        skuMap[key].totalPo += po;
        skuMap[key].totalDemand += fc + b2b + po;
        skuMap[key].cnDetails.push({ cn: cnKey, fc, b2b, po, total: fc + b2b + po, vsLm: sk.vsLm, mape: sk.mape, source: sk.source });
      });
    });
    return Object.values(skuMap).sort((a, b) => b.totalDemand - a.totalDemand);
  }, [s]);

  // ── 12-month view ──
  const render12m = () => {
    const data12 = base12m.map(v => Math.round(v * s));
    return (
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-x-auto">
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3">
              <th className="sticky left-0 bg-surface-2 z-10 px-3 py-2 text-left text-table-header uppercase text-text-3 min-w-[80px]">CN</th>
              {months12.map((m, i) => (
                <th key={m} className={cn("px-2 py-2 text-center text-table-header uppercase min-w-[65px]",
                  i === 4 ? "text-primary bg-primary/5 font-bold" : i < 4 ? "text-text-3" : "text-text-3 italic"
                )}>{m}</th>
              ))}
              <th className="px-2 py-2 text-center text-table-header uppercase text-text-1 bg-surface-1/50 min-w-[70px]">Full Year</th>
            </tr>
          </thead>
          <tbody>
            {cnData.map((c, i) => (
              <tr key={c.cn} className={cn("border-b border-surface-3/50", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                <td className="sticky left-0 bg-inherit z-10 px-3 py-2.5 font-medium text-text-1">{c.cn}</td>
                {data12.map((v, mi) => {
                  const cnShare = c.total / totals.total;
                  const val = Math.round(v * cnShare);
                  const isPast = mi < 4;
                  const isCurrent = mi === 4;
                  const fcPart = Math.round(val * 0.63);
                  const b2bPart = Math.round(val * 0.29);
                  const poPart = Math.round(val * 0.14);
                  const overlap = val - fcPart - b2bPart - poPart;
                  return (
                    <td key={mi} className={cn("px-2 py-2.5 text-center tabular-nums",
                      isCurrent ? "font-bold text-primary bg-primary/5" : isPast ? "text-text-2" : "text-text-3 italic"
                    )}>
                      <ClickableNumber
                        value={val}
                        label={`${c.cn} ${months12[mi]}`}
                        color={isCurrent ? "font-bold text-primary" : isPast ? "text-text-2" : "text-text-3 italic"}
                        breakdown={[
                          { label: "FC", value: fcPart },
                          { label: "B2B", value: b2bPart },
                          { label: "PO", value: poPart },
                          ...(overlap !== 0 ? [{ label: "Overlap", value: overlap, color: "text-danger" as const }] : []),
                        ]}
                        note={isPast ? `Actual từ Bravo. Locked ${months12[mi]}.` : `S&OP forecast, confidence 70%`}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-2.5 text-center tabular-nums font-bold text-text-1 bg-surface-1/30">
                  {Math.round(data12.reduce((a, b) => a + b, 0) * (c.total / totals.total)).toLocaleString()}
                </td>
              </tr>
            ))}
            <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
              <td className="sticky left-0 bg-surface-1 z-10 px-3 py-2.5 text-text-1">TOTAL</td>
              {data12.map((v, i) => (
                <td key={i} className={cn("px-2 py-2.5 text-center tabular-nums",
                  i === 4 ? "text-primary" : "text-text-1"
                )}>{v.toLocaleString()}</td>
              ))}
              <td className="px-2 py-2.5 text-center tabular-nums text-primary bg-surface-1/30">
                {data12.reduce((a, b) => a + b, 0).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // ── 3-month view ──
  const render3m = () => {
    const m3 = ["Th5", "Th6", "Th7"];
    const m3Scale = [1, 0.95, 0.87];
    return (
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-x-auto">
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3">
              <th className="sticky left-0 bg-surface-2 z-10 px-3 py-2 text-left text-table-header uppercase text-text-3 min-w-[80px]">CN</th>
              {m3.map((m, mi) => (
                <React.Fragment key={m}>
                  <th className={cn("px-2 py-2 text-center text-table-header uppercase", mi === 0 ? "text-primary bg-primary/5" : "text-text-3")}>{m} FC</th>
                  <th className={cn("px-2 py-2 text-center text-table-header uppercase", mi === 0 ? "text-primary bg-primary/5" : "text-text-3")}>{m} B2B</th>
                  <th className={cn("px-2 py-2 text-center text-table-header uppercase", mi === 0 ? "text-primary bg-primary/5" : "text-text-3")}>{m} PO</th>
                  <th className={cn("px-2 py-2 text-center text-table-header uppercase font-semibold border-r border-surface-3", mi === 0 ? "text-primary bg-primary/5" : "text-text-3")}>{m} Total</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {cnData.map((c, i) => (
              <tr key={c.cn} className={cn("border-b border-surface-3/50", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                <td className="sticky left-0 bg-inherit z-10 px-3 py-2.5 font-medium text-text-1">{c.cn}</td>
                {m3Scale.map((sc, mi) => {
                  const fc = Math.round(c.fc * sc);
                  const b2b = Math.round(c.b2b * sc);
                  const po = Math.round(c.po * sc);
                  const isCur = mi === 0;
                  return (
                    <React.Fragment key={mi}>
                      <td className={cn("px-2 py-2.5 text-center tabular-nums", isCur ? "text-text-1" : "text-text-3")}>{fc.toLocaleString()}</td>
                      <td className={cn("px-2 py-2.5 text-center tabular-nums", isCur ? "text-text-1" : "text-text-3")}>{b2b.toLocaleString()}</td>
                      <td className={cn("px-2 py-2.5 text-center tabular-nums", isCur ? "text-text-1" : "text-text-3")}>{po.toLocaleString()}</td>
                      <td className={cn("px-2 py-2.5 text-center tabular-nums font-bold border-r border-surface-3", isCur ? "text-primary" : "text-text-2")}>{(fc+b2b+po).toLocaleString()}</td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
              <td className="sticky left-0 bg-surface-1 z-10 px-3 py-2.5 text-text-1">TOTAL</td>
              {m3Scale.map((sc, mi) => {
                const fc = Math.round(totals.fc * sc);
                const b2b = Math.round(totals.b2b * sc);
                const po = Math.round(totals.po * sc);
                return (
                  <React.Fragment key={mi}>
                    <td className="px-2 py-2.5 text-center tabular-nums text-text-1">{fc.toLocaleString()}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-text-1">{b2b.toLocaleString()}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-text-1">{po.toLocaleString()}</td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-primary border-r border-surface-3">{(fc+b2b+po).toLocaleString()}</td>
                  </React.Fragment>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  // ── Weekly view ──
  const renderWeek = () => (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-x-auto">
      <table className="w-full text-table-sm">
        <thead>
          <tr className="border-b border-surface-3">
            <th className="sticky left-0 bg-surface-2 z-10 px-3 py-2 text-left text-table-header uppercase text-text-3 min-w-[80px]">CN</th>
            {weekLabels.map((w, i) => (
              <th key={w} className="px-2 py-2 text-center text-table-header uppercase text-primary bg-primary/5">
                {w} <span className="text-text-3">({Math.round(weekWeights[i]*100)}%)</span>
              </th>
            ))}
            <th className="px-2 py-2 text-center text-table-header uppercase text-text-1 bg-surface-1/50">SS gap</th>
            <th className="px-2 py-2 text-center text-table-header uppercase text-text-1 bg-surface-1/50">vs S&OP</th>
          </tr>
        </thead>
        <tbody>
          {cnData.map((c, i) => {
            const weeks = weekWeights.map(w => Math.round(c.total * w));
            const ssGap = Math.round(c.stock - c.total * 0.45);
            return (
              <tr key={c.cn} className={cn("border-b border-surface-3/50", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                <td className="sticky left-0 bg-inherit z-10 px-3 py-2.5 font-medium text-text-1">{c.cn}</td>
                {weeks.map((w, wi) => (
                  <td key={wi} className="px-2 py-2.5 text-center tabular-nums text-text-1">{w.toLocaleString()}</td>
                ))}
                <td className={cn("px-2 py-2.5 text-center tabular-nums font-medium", ssGap < 0 ? "text-danger" : "text-success")}>
                  {ssGap > 0 ? "+" : ""}{ssGap.toLocaleString()}
                </td>
                <td className="px-2 py-2.5 text-center tabular-nums text-text-2">OK</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── CN-first view with inline expandable SKU rows ──
  const renderCnTable = () => (
    <div className="rounded-card border border-surface-3 bg-surface-2">
      <table className="w-full text-table-sm">
        <thead>
          <tr className="border-b border-surface-3">
            <th className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 w-[40px]"></th>
            <th className="px-2 py-2.5 text-left text-table-header uppercase text-text-3">CN</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">FC (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">B2B (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">PO (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-1 font-semibold">Total (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">vs LM</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">Cover</th>
          </tr>
        </thead>
        <tbody>
          {cnData.map((c, i) => {
            const isExpanded = expandedCns.has(c.cn);
            const skus = (skuPerCn[c.cn] || []).map(sk => {
              const fc = Math.round(sk.fc * s);
              const b2b = Math.round(sk.b2b * s);
              const po = Math.round(sk.po * s);
              return { ...sk, fc, b2b, po, total: fc + b2b + po };
            });
            return (
              <>
                {/* CN parent row */}
                <tr
                  key={c.cn}
                  onClick={() => toggleCn(c.cn)}
                  className={cn(
                    "border-b border-surface-3/50 cursor-pointer transition-colors hover:bg-primary/5",
                    isExpanded ? "bg-primary/[0.03]" : i % 2 === 0 ? "bg-surface-0" : "bg-surface-2"
                  )}
                >
                  <td className="px-3 py-3 text-center">
                    <div className={cn("transition-transform duration-200 inline-block", isExpanded && "rotate-90")}>
                      <ChevronRight className="h-4 w-4 text-text-3" />
                    </div>
                  </td>
                  <td className="px-2 py-3 font-bold text-text-1">{c.cn}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-text-1">{c.fc.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-text-1">{c.b2b.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-text-2">{c.po.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center tabular-nums font-bold text-primary">{c.total.toLocaleString()}</td>
                  <td className={cn("px-3 py-3 text-center tabular-nums font-medium",
                    c.vsLm > 0 ? "text-success" : c.vsLm < 0 ? "text-danger" : "text-text-3"
                  )}>
                    {c.vsLm > 0 ? "+" : ""}{c.vsLm}%
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={cn("inline-flex items-center gap-1 tabular-nums font-medium",
                      c.cover < 5 ? "text-danger" : c.cover < 10 ? "text-warning" : "text-success"
                    )}>
                      {c.cover}d {c.cover < 5 ? "🔴" : c.cover < 10 ? "🟡" : "🟢"}
                    </span>
                  </td>
                </tr>

                {/* Expanded SKU child rows */}
                {isExpanded && skus.map((sk, si) => (
                  <tr
                    key={`${c.cn}-${sk.item}-${sk.variant}`}
                    className="border-b border-surface-3/30 bg-primary/[0.02] hover:bg-primary/[0.06] transition-colors animate-fade-in"
                  >
                    <td className="px-3 py-2" />
                    <td className="px-2 py-2 pl-6">
                      <span className="font-mono text-text-2 text-table-sm">{sk.item}</span>
                      <span className="ml-1.5 text-text-3 text-table-sm">{sk.variant}</span>
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums text-text-2 text-table-sm">
                      <span className="cursor-help group relative">
                        {sk.fc.toLocaleString()}
                        <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-text-1 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20">
                          {sk.source}, MAPE {sk.mape}%
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums text-text-2 text-table-sm">{sk.b2b.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center tabular-nums text-text-3 text-table-sm">{sk.po.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center tabular-nums font-semibold text-primary/80 text-table-sm">{sk.total.toLocaleString()}</td>
                    <td className={cn("px-3 py-2 text-center tabular-nums text-table-sm",
                      sk.vsLm > 0 ? "text-success" : sk.vsLm < 0 ? "text-danger" : "text-text-3"
                    )}>
                      {sk.vsLm > 0 ? "+" : ""}{sk.vsLm}%
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={(e) => { e.stopPropagation(); setOverrideModal({ sku: `${sk.item} ${sk.variant}`, value: sk.total }); }}
                        className="text-[11px] text-primary hover:underline font-medium">Override</button>
                    </td>
                  </tr>
                ))}
              </>
            );
          })}
          <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
            <td />
            <td className="px-2 py-3 text-text-1">TOTAL</td>
            <td className="px-3 py-3 text-center tabular-nums text-text-1">{totals.fc.toLocaleString()}</td>
            <td className="px-3 py-3 text-center tabular-nums text-text-1">{totals.b2b.toLocaleString()}</td>
            <td className="px-3 py-3 text-center tabular-nums text-text-1">{totals.po.toLocaleString()}</td>
            <td className="px-3 py-3 text-center tabular-nums text-primary">{totals.total.toLocaleString()}</td>
            <td className="px-3 py-3 text-center tabular-nums text-success">+{totals.vsLm}%</td>
            <td className="px-3 py-3 text-center tabular-nums text-text-1">{totals.cover}d</td>
          </tr>
        </tbody>
      </table>
    </div>
  );

  // ── SKU-first view with inline expandable CN rows ──
  const renderSkuTable = () => (
    <div className="rounded-card border border-surface-3 bg-surface-2">
      <table className="w-full text-table-sm">
        <thead>
          <tr className="border-b border-surface-3">
            <th className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 w-[40px]"></th>
            <th className="px-2 py-2.5 text-left text-table-header uppercase text-text-3">Item</th>
            <th className="px-2 py-2.5 text-left text-table-header uppercase text-text-3">Variant</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">FC (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">B2B (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">PO (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-1 font-semibold">Total (m²)</th>
            <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3"># CN</th>
          </tr>
        </thead>
        <tbody>
          {skuAggregated.map((sk, i) => {
            const skuKey = `${sk.item}-${sk.variant}`;
            const isExpanded = expandedSkus.has(skuKey);
            return (
              <>
                {/* SKU parent row */}
                <tr
                  key={skuKey}
                  onClick={() => toggleSku(skuKey)}
                  className={cn(
                    "border-b border-surface-3/50 cursor-pointer transition-colors hover:bg-primary/5",
                    isExpanded ? "bg-primary/[0.03]" : i % 2 === 0 ? "bg-surface-0" : "bg-surface-2"
                  )}
                >
                  <td className="px-3 py-3 text-center">
                    <div className={cn("transition-transform duration-200 inline-block", isExpanded && "rotate-90")}>
                      <ChevronRight className="h-4 w-4 text-text-3" />
                    </div>
                  </td>
                  <td className="px-2 py-3 font-medium text-text-1 font-mono">{sk.item}</td>
                  <td className="px-2 py-3 text-text-2">{sk.variant}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-text-1">{sk.totalFc.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-text-1">{sk.totalB2b.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center tabular-nums text-text-2">{sk.totalPo.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center tabular-nums font-bold text-primary">{sk.totalDemand.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center">
                    <CnGapBadge count={sk.cnDetails.length} />
                  </td>
                </tr>

                {/* Expanded CN child rows */}
                {isExpanded && sk.cnDetails.map((c, ci) => (
                  <tr
                    key={`${skuKey}-${c.cn}`}
                    className="border-b border-surface-3/30 bg-primary/[0.02] hover:bg-primary/[0.06] transition-colors animate-fade-in"
                  >
                    <td className="px-3 py-2" />
                    <td className="px-2 py-2 pl-6 text-text-2 text-table-sm" colSpan={2}>{c.cn}</td>
                    <td className="px-3 py-2 text-center tabular-nums text-text-2 text-table-sm">
                      <span className="cursor-help group relative">
                        {c.fc.toLocaleString()}
                        <span className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-text-1 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20">
                          {c.source}, MAPE {c.mape}%
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums text-text-2 text-table-sm">{c.b2b.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center tabular-nums text-text-3 text-table-sm">{c.po.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center tabular-nums font-semibold text-primary/80 text-table-sm">{c.total.toLocaleString()}</td>
                    <td className={cn("px-3 py-2 text-center tabular-nums text-table-sm",
                      c.vsLm > 0 ? "text-success" : c.vsLm < 0 ? "text-danger" : "text-text-3"
                    )}>
                      {c.vsLm > 0 ? "+" : ""}{c.vsLm}%
                    </td>
                  </tr>
                ))}
              </>
            );
          })}
          <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
            <td />
            <td className="px-2 py-3 text-text-1" colSpan={2}>TOTAL</td>
            <td className="px-3 py-3 text-center tabular-nums">{skuAggregated.reduce((a, s) => a + s.totalFc, 0).toLocaleString()}</td>
            <td className="px-3 py-3 text-center tabular-nums">{skuAggregated.reduce((a, s) => a + s.totalB2b, 0).toLocaleString()}</td>
            <td className="px-3 py-3 text-center tabular-nums">{skuAggregated.reduce((a, s) => a + s.totalPo, 0).toLocaleString()}</td>
            <td className="px-3 py-3 text-center tabular-nums text-primary">{skuAggregated.reduce((a, s) => a + s.totalDemand, 0).toLocaleString()}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* View toggle + Pivot toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-display text-screen-title text-text-1">Demand tổng</h2>
          <ViewPivotToggle value={pivotMode} onChange={(m) => { setPivotMode(m); setExpandedCns(new Set()); setExpandedSkus(new Set()); }} />
        </div>
        <div className="inline-flex rounded-button border border-surface-3 overflow-hidden">
          {([["12m","12 tháng"],["3m","3 tháng"],["week","Tuần"]] as [View,string][]).map(([k,l]) => (
            <button key={k} onClick={() => setView(k)}
              className={cn("px-4 py-2 text-table-sm transition-colors",
                view === k ? "bg-primary text-white" : "bg-surface-2 text-text-2 hover:bg-surface-3"
              )}>{l}</button>
          ))}
        </div>
      </div>

      {/* Main table — CN-first or SKU-first, both with inline expand */}
      {pivotMode === "sku" ? renderSkuTable() : renderCnTable()}

      {/* View-specific table below (only in CN mode) */}
      {pivotMode !== "sku" && (
        <>
          {view === "12m" && render12m()}
          {view === "3m" && render3m()}
          {view === "week" && renderWeek()}
        </>
      )}

      {overrideModal && (
        <OverrideModal
          sku={overrideModal.sku}
          value={overrideModal.value}
          onClose={() => setOverrideModal(null)}
          onSave={() => setOverrideModal(null)}
        />
      )}
    </div>
  );
}

import React, { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, AlertTriangle, HelpCircle, Star, Send, RotateCcw, Zap } from "lucide-react";
import { toast } from "sonner";
import { generatePONumber, getNmCode, poNumClasses, getPoTypeBadge } from "@/lib/po-numbers";

interface Props { scale: number }

/* ─── Types ─── */
type Objective = "hybrid" | "lt" | "cost";
type Urgency = "CRITICAL" | "MEDIUM" | "LOW" | "OK";

interface SkuReq {
  item: string; variant: string; netReq: number; ssBuffer: number; fcMin: number;
  urgency: Urgency; urgencyLabel: string; eligibleNms: string[];
}

interface NmRank {
  nm: string; atp: number; lt: number; costPerM2: number; reliability: number;
  honoring: number; dataFresh: string; dataFreshStatus: "green" | "amber" | "red";
  score: number; offline?: boolean;
}

interface Allocation { nm: string; qty: number; role: "Primary" | "Backup" | "Single source" | "" }

interface MoqRow { nm: string; allocated: number; moq: number; afterRound: number; surplus: number; cost: string; container: string }

/* ─── Data ─── */
const baseSkus: SkuReq[] = [
  { item: "GA-300", variant: "A4", netReq: 840, ssBuffer: 900, fcMin: 1740, urgency: "CRITICAL", urgencyLabel: "HSTK 1,2d BD", eligibleNms: ["Mikado", "Toko", "Đồng Tâm", "Vigracera"] },
  { item: "GA-300", variant: "B2", netReq: 498, ssBuffer: 700, fcMin: 1198, urgency: "MEDIUM", urgencyLabel: "", eligibleNms: ["Mikado", "Đồng Tâm", "Vigracera"] },
  { item: "GA-300", variant: "C1", netReq: 220, ssBuffer: 150, fcMin: 370, urgency: "LOW", urgencyLabel: "", eligibleNms: ["Mikado", "Toko", "Đồng Tâm", "Vigracera"] },
  { item: "GA-400", variant: "A4", netReq: 147, ssBuffer: 600, fcMin: 747, urgency: "LOW", urgencyLabel: "", eligibleNms: ["Mikado", "Toko", "Đồng Tâm", "Vigracera", "Phú Mỹ"] },
  { item: "GA-400", variant: "D5", netReq: 80, ssBuffer: 200, fcMin: 280, urgency: "LOW", urgencyLabel: "", eligibleNms: ["Mikado", "Đồng Tâm", "Vigracera"] },
  { item: "GA-600", variant: "A4", netReq: 0, ssBuffer: 1000, fcMin: 0, urgency: "OK", urgencyLabel: "ĐỦ HÀNG", eligibleNms: [] },
  { item: "GA-600", variant: "B2", netReq: 0, ssBuffer: 500, fcMin: 0, urgency: "OK", urgencyLabel: "ĐỦ HÀNG", eligibleNms: [] },
];

// Raw NM data (without pre-computed score — score is computed per objective)
type NmRaw = Omit<NmRank, "score">;

const baseNmRaws: Record<string, NmRaw[]> = {
  "GA-300|A4": [
    { nm: "Mikado", atp: 1500, lt: 14, costPerM2: 185000, reliability: 92, honoring: 92, dataFresh: "32m", dataFreshStatus: "green" },
    { nm: "Đồng Tâm", atp: 450, lt: 7, costPerM2: 170000, reliability: 90, honoring: 90, dataFresh: "4h", dataFreshStatus: "amber" },
    { nm: "Vigracera", atp: 455, lt: 10, costPerM2: 175000, reliability: 88, honoring: 88, dataFresh: "2h", dataFreshStatus: "green" },
    { nm: "Toko", atp: 960, lt: 14, costPerM2: 180000, reliability: 68, honoring: 68, dataFresh: "18h", dataFreshStatus: "red" },
    { nm: "Phú Mỹ", atp: 0, lt: 18, costPerM2: 160000, reliability: 45, honoring: 45, dataFresh: "3d", dataFreshStatus: "red", offline: true },
  ],
};

const OBJECTIVE_WEIGHTS: Record<Objective, [number, number, number]> = {
  hybrid: [0.5, 0.3, 0.2],
  lt: [0.8, 0.1, 0.1],
  cost: [0.1, 0.8, 0.1],
};

function computeScores(raws: NmRaw[], objective: Objective): NmRank[] {
  const [w1, w2, w3] = OBJECTIVE_WEIGHTS[objective];
  const maxLt = Math.max(...raws.map(r => r.lt));
  const maxCost = Math.max(...raws.map(r => r.costPerM2));

  const scored = raws.map(r => {
    if (r.offline) return { ...r, score: Math.round(r.reliability * w3 * 100 / 100) };
    const ltScore = 1 - r.lt / maxLt;
    const costScore = 1 - r.costPerM2 / maxCost;
    const relScore = r.reliability / 100;
    const raw = (w1 * ltScore + w2 * costScore + w3 * relScore) * 100;
    return { ...r, score: Math.round(raw) };
  });

  return scored.sort((a, b) => {
    if (a.offline && !b.offline) return 1;
    if (!a.offline && b.offline) return -1;
    return b.score - a.score;
  });
}

function getRanking(item: string, variant: string, eligibleNms: string[], objective: Objective): NmRank[] {
  const key = `${item}|${variant}`;
  const raws: NmRaw[] = baseNmRaws[key] || eligibleNms.map((nm, i) => ({
    nm, atp: 300 + i * 200, lt: 7 + i * 3, costPerM2: 170000 + i * 5000,
    reliability: 92 - i * 4, honoring: 92 - i * 4,
    dataFresh: i < 2 ? "1h" : "6h", dataFreshStatus: (i < 2 ? "green" : "amber") as "green" | "amber",
  }));
  return computeScores(raws, objective);
}

const defaultAllocations: Record<string, Allocation[]> = {
  "GA-300|A4": [{ nm: "Mikado", qty: 700, role: "Primary" }, { nm: "Đồng Tâm", qty: 140, role: "Backup" }],
  "GA-300|B2": [{ nm: "Đồng Tâm", qty: 310, role: "Primary" }, { nm: "Vigracera", qty: 188, role: "Backup" }],
  "GA-300|C1": [{ nm: "Mikado", qty: 220, role: "Single source" }],
  "GA-400|A4": [{ nm: "Mikado", qty: 147, role: "Single source" }],
  "GA-400|D5": [{ nm: "Vigracera", qty: 80, role: "Single source" }],
};

const STEPS = [
  { num: 1, label: "Cần gì?", desc: "Net Requirement" },
  { num: 2, label: "NM nào có?", desc: "Source Ranking" },
  { num: 3, label: "Phân bổ", desc: "Allocation" },
  { num: 4, label: "MOQ + Gửi", desc: "Confirm & BPO" },
];

const OBJECTIVE_LABELS: Record<Objective, string> = {
  hybrid: "Weighted Hybrid",
  lt: "Shortest Lead Time",
  cost: "Lowest Cost",
};

const WEIGHT_INFO: Record<Objective, string> = {
  hybrid: "W1=50% (LT) + W2=30% (cost) + W3=20% (reliability)",
  lt: "W1=80% + W2=10% + W3=10%",
  cost: "W1=10% + W2=80% + W3=10%",
};

function urgencyBadge(u: Urgency) {
  switch (u) {
    case "CRITICAL": return { bg: "bg-danger-bg", text: "text-danger", icon: "🔴" };
    case "MEDIUM": return { bg: "bg-warning-bg", text: "text-warning", icon: "🟡" };
    case "LOW": return { bg: "bg-surface-1", text: "text-text-2", icon: "" };
    case "OK": return { bg: "bg-success-bg", text: "text-success", icon: "✅" };
  }
}

/* ═══ STEP HEADER ═══ */
function StepperBar({ active, completed, onStep }: { active: number; completed: Set<number>; onStep: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
      {STEPS.map((step, i) => {
        const isActive = step.num === active;
        const isDone = completed.has(step.num);
        const isFuture = !isActive && !isDone;
        return (
          <React.Fragment key={step.num}>
            {i > 0 && <ChevronRight className="h-4 w-4 text-text-3 shrink-0" />}
            <button
              onClick={() => onStep(step.num)}
              className={cn(
                "flex items-center gap-2.5 rounded-card px-4 py-3 border transition-all min-w-[180px] text-left",
                isActive && "bg-info-bg border-info shadow-sm",
                isDone && "bg-success-bg/50 border-success/30",
                isFuture && "bg-surface-1 border-surface-3 opacity-60"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-table-sm font-bold shrink-0",
                isActive && "bg-info text-white",
                isDone && "bg-success text-white",
                isFuture && "bg-surface-3 text-text-3"
              )}>
                {isDone ? <Check className="h-4 w-4" /> : step.num}
              </div>
              <div>
                <div className={cn("text-table-sm font-semibold", isActive ? "text-info" : isDone ? "text-success" : "text-text-3")}>{step.label}</div>
                <div className="text-caption text-text-3">{step.desc}</div>
              </div>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ═══ STEP 1 ═══ */
function Step1({ skus, onSelectSku, onAutoAll }: {
  skus: SkuReq[];
  onSelectSku: (item: string, variant: string) => void;
  onAutoAll: () => void;
}) {
  const [showSufficient, setShowSufficient] = useState(false);
  const needSourcing = skus.filter(s => s.urgency !== "OK");
  const sufficient = skus.filter(s => s.urgency === "OK");
  const totalNetReq = needSourcing.reduce((a, s) => a + s.netReq, 0);
  const totalSs = needSourcing.reduce((a, s) => a + s.ssBuffer, 0);
  const totalFcMin = needSourcing.reduce((a, s) => a + s.fcMin, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-table text-text-2">Auto-pull từ S&OP Lock. <span className="text-text-3">Read-only.</span></p>
        <button onClick={onAutoAll} className="inline-flex items-center gap-1.5 rounded-button bg-gradient-primary text-primary-foreground px-4 py-2 text-table-sm font-medium hover:opacity-90">
          <Zap className="h-3.5 w-3.5" /> Auto-allocate tất cả
        </button>
      </div>

      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                {["Item", "Variant", "Net req (m²)", "SS buffer", "FC Min", "Urgency", "# NM eligible", ""].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {needSourcing.map((sk) => {
                const ub = urgencyBadge(sk.urgency);
                return (
                  <tr key={`${sk.item}-${sk.variant}`} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                    <td className="px-4 py-2.5 font-medium text-text-1">{sk.item}</td>
                    <td className="px-4 py-2.5 text-text-2">{sk.variant}</td>
                    <td className="px-4 py-2.5 tabular-nums font-medium text-text-1">{sk.netReq.toLocaleString()}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-2">{sk.ssBuffer.toLocaleString()}</td>
                    <td className="px-4 py-2.5 tabular-nums font-medium text-text-1">{sk.fcMin.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium", ub.bg, ub.text)}>
                        {ub.icon} {sk.urgency}{sk.urgencyLabel ? ` (${sk.urgencyLabel})` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-2">{sk.eligibleNms.length} NM</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => onSelectSku(sk.item, sk.variant)} className="inline-flex items-center gap-1 text-primary text-table-sm font-medium hover:underline">
                        Chọn NM <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                <td className="px-4 py-2.5 text-text-1">TOTAL</td>
                <td />
                <td className="px-4 py-2.5 tabular-nums text-text-1">{totalNetReq.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-text-1">{totalSs.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-text-1">{totalFcMin.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-text-2">{needSourcing.length} SKU cần sourcing</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {sufficient.length > 0 && (
        <button onClick={() => setShowSufficient(!showSufficient)} className="text-table-sm text-text-3 hover:text-text-2">
          {showSufficient ? "▾" : "▸"} {sufficient.length} SKU đủ hàng
        </button>
      )}
      {showSufficient && (
        <div className="rounded-card border border-surface-3 bg-surface-1/30 overflow-hidden">
          <table className="w-full text-table-sm">
            <tbody>
              {sufficient.map(sk => (
                <tr key={`${sk.item}-${sk.variant}`} className="border-b border-surface-3/30 text-text-3">
                  <td className="px-4 py-2">{sk.item}</td>
                  <td className="px-4 py-2">{sk.variant}</td>
                  <td className="px-4 py-2">0</td>
                  <td className="px-4 py-2">{sk.ssBuffer.toLocaleString()}</td>
                  <td className="px-4 py-2">0</td>
                  <td className="px-4 py-2"><span className="text-success">✅ ĐỦ HÀNG</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══ STEP 2 ═══ */
function Step2({ sku, rankings, objective, onObjective, onSelect, onAutoSelect, showFormula, setShowFormula }: {
  sku: SkuReq;
  rankings: NmRank[];
  objective: Objective;
  onObjective: (o: Objective) => void;
  onSelect: (nms: { nm: string; role: string }[]) => void;
  onAutoSelect: () => void;
  showFormula: boolean;
  setShowFormula: (b: boolean) => void;
}) {
  const [selected, setSelected] = useState<{ nm: string; role: string }[]>([]);

  const toggleNm = (nm: string, role: string) => {
    setSelected(prev => {
      const exists = prev.find(s => s.nm === nm);
      if (exists) return prev.filter(s => s.nm !== nm);
      return [...prev, { nm, role }];
    });
  };

  const scoreColor = (s: number) => s >= 80 ? "text-success" : s >= 60 ? "text-warning" : "text-danger";
  const scoreBarColor = (s: number) => s >= 80 ? "bg-success" : s >= 60 ? "bg-warning" : "bg-danger";
  const relColor = (r: number) => r >= 80 ? "text-success" : r >= 60 ? "text-warning" : "text-danger";
  const relGrade = (r: number) => r >= 90 ? "A" : r >= 80 ? "B" : r >= 70 ? "C" : "D";

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-display text-body font-semibold text-text-1">
          {sku.item} {sku.variant} — Cần {sku.netReq.toLocaleString()}m². Chọn NM.
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={objective}
            onChange={(e) => onObjective(e.target.value as Objective)}
            className="rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-1 outline-none"
          >
            <option value="hybrid">Weighted Hybrid</option>
            <option value="lt">Shortest Lead Time</option>
            <option value="cost">Lowest Cost</option>
          </select>
          <button onClick={() => setShowFormula(!showFormula)} className="text-info hover:text-primary">
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showFormula && (
        <div className="rounded-card border border-info/30 bg-info-bg/30 px-4 py-3 text-table-sm text-text-2 space-y-1">
          <p className="font-mono text-caption">Score = W1 × (1−LT/max_LT) + W2 × (1−cost/max_cost) + W3 × reliability</p>
          <p className="font-medium text-info">{OBJECTIVE_LABELS[objective]}: {WEIGHT_INFO[objective]}</p>
          <p className="text-caption text-text-3">Config: /config → Planning → source_ranking_weights</p>
        </div>
      )}

      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                {["Rank", "NM", "ATP (m²)", "LT", "Cost/m²", "Reliability", "Honoring%", "Data fresh", "Score", "Action"].map((h, i) => (
                  <th key={i} className="px-3 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rankings.map((nm, i) => {
                const isTop = i === 0 && !nm.offline;
                const isLowRel = nm.reliability < 70;
                const isSelected = selected.some(s => s.nm === nm.nm);
                return (
                  <tr key={nm.nm} className={cn(
                    "border-b border-surface-3/50 transition-colors",
                    nm.offline && "opacity-40",
                    isTop && !isSelected && "bg-success/5",
                    isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                    !nm.offline && !isTop && !isSelected && "hover:bg-surface-1/30"
                  )}>
                    <td className="px-3 py-2.5 text-text-2">
                      {isTop && <Star className="h-3.5 w-3.5 text-warning inline mr-0.5" />}
                      {nm.offline ? "—" : i + 1}
                      {isLowRel && !nm.offline && <span className="ml-1 text-warning">⚠</span>}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-text-1">{nm.nm}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-1">{nm.offline ? "—" : nm.atp.toLocaleString()}</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-2">{nm.lt}d</td>
                    <td className="px-3 py-2.5 tabular-nums text-text-2">{(nm.costPerM2 / 1000).toFixed(0)}K</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("font-medium", relColor(nm.reliability))}>
                        {nm.reliability}% {relGrade(nm.reliability)} {nm.reliability >= 80 ? "🟢" : nm.reliability >= 70 ? "" : "🔴"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-text-2">{nm.honoring}%</td>
                    <td className="px-3 py-2.5">
                      <span className={cn("text-caption", nm.dataFreshStatus === "green" ? "text-success" : nm.dataFreshStatus === "amber" ? "text-warning" : "text-danger")}>
                        {nm.dataFreshStatus === "green" ? "🟢" : nm.dataFreshStatus === "amber" ? "🟡" : "🔴"} {nm.dataFresh}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-bold tabular-nums", scoreColor(nm.score))}>{nm.score}</span>
                        <div className="w-16 h-1.5 bg-surface-3 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full", scoreBarColor(nm.score))} style={{ width: `${nm.score}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {nm.offline ? (
                        <span className="text-text-3 text-caption">Offline</span>
                      ) : (
                        <button
                          onClick={() => toggleNm(nm.nm, isTop ? "Primary" : "Backup")}
                          className={cn(
                            "rounded-button px-2.5 py-1 text-caption font-medium transition-all",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : isLowRel
                              ? "border border-warning text-warning hover:bg-warning/10"
                              : "border border-primary text-primary hover:bg-primary/10"
                          )}
                        >
                          {isSelected ? "✓ Selected" : isLowRel ? "Chọn (risk ⚠)" : isTop ? "Chọn primary" : "Chọn"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rankings.some(r => r.reliability < 70 && !r.offline) && (
          <div className="px-4 py-2 bg-warning-bg/30 border-t border-warning/20 text-caption text-warning flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3" /> Low reliability. ATP có thể không chính xác.
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onAutoSelect}
          className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-2 hover:text-text-1 hover:border-primary/30"
        >
          <Star className="h-3.5 w-3.5 text-warning" /> Auto-select ★
        </button>
        {selected.length > 0 && (
          <button
            onClick={() => onSelect(selected)}
            className="inline-flex items-center gap-1.5 rounded-button bg-gradient-primary text-primary-foreground px-4 py-1.5 text-table-sm font-medium"
          >
            Tiếp → Bước 3 <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ═══ STEP 3 ═══ */
function Step3({ skus, allocations, onUpdate, onConfirm }: {
  skus: SkuReq[];
  allocations: Record<string, Allocation[]>;
  onUpdate: (key: string, allocs: Allocation[]) => void;
  onConfirm: () => void;
}) {
  const needSourcing = skus.filter(s => s.urgency !== "OK");

  // NM summary
  const nmTotals: Record<string, Record<string, number>> = {};
  let grandTotal = 0;
  for (const sk of needSourcing) {
    const key = `${sk.item}|${sk.variant}`;
    const allocs = allocations[key] || [];
    for (const a of allocs) {
      if (!nmTotals[a.nm]) nmTotals[a.nm] = {};
      nmTotals[a.nm][key] = a.qty;
      grandTotal += a.qty;
    }
  }

  const handleQtyChange = (skuKey: string, nmName: string, val: number) => {
    const current = allocations[skuKey] || [];
    const updated = current.map(a => a.nm === nmName ? { ...a, qty: val } : a);
    onUpdate(skuKey, updated);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Section A: Per SKU allocation */}
      <div className="space-y-4">
        <h3 className="font-display text-body font-semibold text-text-1">Phân bổ per SKU</h3>
        {needSourcing.map(sk => {
          const key = `${sk.item}|${sk.variant}`;
          const allocs = allocations[key] || [];
          const total = allocs.reduce((a, al) => a + al.qty, 0);
          const isOver = total > sk.netReq;
          const isUnder = total < sk.netReq;
          const isOk = total === sk.netReq;

          return (
            <div key={key} className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-1">{sk.item} {sk.variant} <span className="text-text-3">(cần {sk.netReq.toLocaleString()}m²)</span></span>
                <span className={cn("text-table-sm font-medium", isOk ? "text-success" : isOver ? "text-danger" : "text-warning")}>
                  Total: {total.toLocaleString()}/{sk.netReq.toLocaleString()} {isOk ? "✅" : isOver ? "❌ Over" : `⚠ -${(sk.netReq - total).toLocaleString()}`}
                </span>
              </div>
              {allocs.map((al) => {
                const pct = sk.netReq > 0 ? Math.round((al.qty / sk.netReq) * 100) : 0;
                return (
                  <div key={al.nm} className="flex items-center gap-3">
                    <span className="w-20 text-table-sm text-text-2 truncate">{al.nm}</span>
                    <input
                      type="number"
                      value={al.qty}
                      onChange={(e) => handleQtyChange(key, al.nm, parseInt(e.target.value) || 0)}
                      className="w-20 rounded border border-surface-3 bg-surface-0 px-2 py-1 text-table-sm tabular-nums text-text-1 outline-none focus:border-primary"
                    />
                    <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <span className="text-caption text-text-3 w-10 text-right">{pct}%</span>
                    <span className="text-caption text-text-3 w-24">{al.role}</span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Section B: NM Summary */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="px-4 py-2.5 bg-surface-1/50 border-b border-surface-3">
          <span className="text-table-sm font-medium text-text-1">Tổng hợp per NM</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/30">
                <th className="px-4 py-2 text-left text-table-header uppercase text-text-3">NM</th>
                {needSourcing.map(sk => (
                  <th key={`${sk.item}-${sk.variant}`} className="px-3 py-2 text-center text-table-header uppercase text-text-3">{sk.item} {sk.variant}</th>
                ))}
                <th className="px-4 py-2 text-right text-table-header uppercase text-text-3">Total</th>
                <th className="px-3 py-2 text-right text-table-header uppercase text-text-3">%</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(nmTotals).map(([nm, skuMap]) => {
                const nmTotal = Object.values(skuMap).reduce((a, v) => a + v, 0);
                return (
                  <tr key={nm} className="border-b border-surface-3/50 hover:bg-surface-1/20">
                    <td className="px-4 py-2 font-medium text-text-1">{nm}</td>
                    {needSourcing.map(sk => {
                      const key = `${sk.item}|${sk.variant}`;
                      return (
                        <td key={key} className="px-3 py-2 text-center tabular-nums text-text-2">{skuMap[key] ? skuMap[key].toLocaleString() : "—"}</td>
                      );
                    })}
                    <td className="px-4 py-2 text-right tabular-nums font-medium text-text-1">{nmTotal.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-2">{grandTotal > 0 ? Math.round((nmTotal / grandTotal) * 100) : 0}%</td>
                  </tr>
                );
              })}
              <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                <td className="px-4 py-2 text-text-1">TOTAL</td>
                {needSourcing.map(sk => {
                  const key = `${sk.item}|${sk.variant}`;
                  const colTotal = Object.values(nmTotals).reduce((a, m) => a + (m[key] || 0), 0);
                  return <td key={key} className="px-3 py-2 text-center tabular-nums text-text-1">{colTotal.toLocaleString()}</td>;
                })}
                <td className="px-4 py-2 text-right tabular-nums text-text-1">{grandTotal.toLocaleString()}</td>
                <td className="px-3 py-2 text-right text-text-1">100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={onConfirm} className="inline-flex items-center gap-1.5 rounded-button bg-gradient-primary text-primary-foreground px-5 py-2 text-table-sm font-medium">
          Xác nhận phân bổ → Bước 4 <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ═══ STEP 4 ═══ */
function Step4({ allocations, scale, onCreateBpo }: {
  allocations: Record<string, Allocation[]>;
  scale: number;
  onCreateBpo: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  // Aggregate per NM
  const nmAgg: Record<string, number> = {};
  for (const allocs of Object.values(allocations)) {
    for (const a of allocs) {
      nmAgg[a.nm] = (nmAgg[a.nm] || 0) + a.qty;
    }
  }

  const moqData: MoqRow[] = [
    { nm: "Mikado", allocated: nmAgg["Mikado"] || 1067, moq: 1000, afterRound: 2000, surplus: 933, cost: "370M", container: "1,2 cont → 2 cont" },
    { nm: "Đồng Tâm", allocated: nmAgg["Đồng Tâm"] || 450, moq: 500, afterRound: 500, surplus: 50, cost: "85M", container: "0,3 cont → LTL" },
    { nm: "Vigracera", allocated: nmAgg["Vigracera"] || 268, moq: 500, afterRound: 500, surplus: 232, cost: "87,5M", container: "0,3 cont → LTL" },
  ].filter(r => r.allocated > 0);

  const totalAllocated = moqData.reduce((a, r) => a + r.allocated, 0);
  const totalAfterRound = moqData.reduce((a, r) => a + r.afterRound, 0);
  const totalSurplus = moqData.reduce((a, r) => a + r.surplus, 0);

  const bpos = moqData.map(r => ({
    id: `BPO-${getNmCode(r.nm)}-2605`,
    nm: r.nm,
    qty: r.afterRound,
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      <h3 className="font-display text-body font-semibold text-text-1">MOQ Round & Confirm</h3>

      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                {["NM", "Allocated", "MOQ", "Sau round", "Surplus", "Cost", "Container"].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {moqData.map(r => (
                <tr key={r.nm} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                  <td className="px-4 py-2.5 font-medium text-text-1">{r.nm}</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-2">{r.allocated.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-3">{r.moq.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums font-medium text-text-1">{r.afterRound.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-warning font-medium">+{r.surplus.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-2">{r.cost}₫</td>
                  <td className="px-4 py-2.5 text-text-3 text-caption">{r.container}</td>
                </tr>
              ))}
              <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                <td className="px-4 py-2.5 text-text-1">TOTAL</td>
                <td className="px-4 py-2.5 tabular-nums text-text-1">{totalAllocated.toLocaleString()}</td>
                <td />
                <td className="px-4 py-2.5 tabular-nums text-text-1">{totalAfterRound.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-warning">+{totalSurplus.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-text-1">542,5M₫</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-surface-3 bg-surface-1/20">
          <p className="text-caption text-text-3">
            Surplus {totalSurplus.toLocaleString()}m² = MOQ overhead. Tồn hub → trừ net req tháng sau. Cost 542,5M₫ = working capital cần chuẩn bị.
          </p>
        </div>
      </div>

      <button
        onClick={() => setShowConfirm(true)}
        className="w-full rounded-button bg-gradient-primary text-primary-foreground px-6 py-3 text-body font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
      >
        <Send className="h-4 w-4" /> Xác nhận & Tạo BPO
      </button>

      {showConfirm && (
        <>
          <div className="fixed inset-0 bg-text-1/30 z-50" onClick={() => setShowConfirm(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-card border border-surface-3 bg-surface-2 p-6 shadow-xl space-y-4">
            <h3 className="font-display text-body font-semibold text-text-1">Tạo {bpos.length} BPO</h3>
            <div className="space-y-2">
              {bpos.map(b => (
                <div key={b.id} className="flex items-center justify-between text-table-sm">
                  <span className={cn("font-mono text-caption", getPoTypeBadge("BPO").text)}>{b.id}</span>
                  <span className="text-text-2">{b.nm} — {b.qty.toLocaleString()}m²</span>
                </div>
              ))}
            </div>
            <div className="border-t border-surface-3 pt-3">
              <p className="text-table-sm text-text-2">Tổng: {totalAfterRound.toLocaleString()}m² | 542,5M₫</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} className="rounded-button border border-surface-3 px-4 py-1.5 text-table-sm text-text-2 hover:bg-surface-3">Sửa lại</button>
              <button
                onClick={() => { setShowConfirm(false); onCreateBpo(); }}
                className="rounded-button bg-gradient-primary text-primary-foreground px-4 py-1.5 text-table-sm font-medium"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══ MAIN COMPONENT ═══ */
export function SourcingWorkbench({ scale }: Props) {
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [objective, setObjective] = useState<Objective>("hybrid");
  const [selectedSku, setSelectedSku] = useState<{ item: string; variant: string } | null>(null);
  const [allocations, setAllocations] = useState<Record<string, Allocation[]>>({ ...defaultAllocations });
  const [showFormula, setShowFormula] = useState(false);
  const [bpoCreated, setBpoCreated] = useState(false);

  const skus = useMemo(() => baseSkus.map(s => ({
    ...s,
    netReq: Math.round(s.netReq * scale),
    ssBuffer: Math.round(s.ssBuffer * scale),
    fcMin: Math.round(s.fcMin * scale),
  })), [scale]);

  const currentSku = selectedSku ? skus.find(s => s.item === selectedSku.item && s.variant === selectedSku.variant) : null;
  const currentRankings = useMemo(() => selectedSku ? getRanking(selectedSku.item, selectedSku.variant, currentSku?.eligibleNms || [], objective) : [], [selectedSku, currentSku, objective]);

  // Auto-recalculate allocations when objective changes
  const handleObjectiveChange = (newObj: Objective) => {
    setObjective(newObj);
    // Recompute allocations for all sourcing SKUs based on new rankings
    const needSourcing = skus.filter(s => s.urgency !== "OK");
    const newAllocations: Record<string, Allocation[]> = {};
    for (const sk of needSourcing) {
      const key = `${sk.item}|${sk.variant}`;
      const rankings = getRanking(sk.item, sk.variant, sk.eligibleNms, newObj);
      const available = rankings.filter(r => !r.offline);
      if (available.length === 0) continue;
      if (available.length === 1 || sk.netReq <= available[0].atp) {
        newAllocations[key] = [{ nm: available[0].nm, qty: sk.netReq, role: "Single source" }];
      } else {
        const primaryQty = Math.round(sk.netReq * 0.7);
        const backupQty = sk.netReq - primaryQty;
        newAllocations[key] = [
          { nm: available[0].nm, qty: primaryQty, role: "Primary" },
          { nm: available[1].nm, qty: backupQty, role: "Backup" },
        ];
      }
    }
    setAllocations(newAllocations);
    toast.info(`Ranking re-sorted theo ${OBJECTIVE_LABELS[newObj]}`, { description: "Bước 2 & 3 đã tự động recalculate." });
  };

  const completeStep = (n: number) => setCompletedSteps(prev => new Set(prev).add(n));

  const handleSelectSku = (item: string, variant: string) => {
    setSelectedSku({ item, variant });
    completeStep(1);
    setActiveStep(2);
  };

  const handleAutoAll = () => {
    completeStep(1);
    completeStep(2);
    setActiveStep(3);
    toast.success("Auto-allocation hoàn tất", { description: `5 SKU đã phân bổ theo ${OBJECTIVE_LABELS[objective]}` });
  };

  const handleNmSelect = (nms: { nm: string; role: string }[]) => {
    if (selectedSku) {
      const key = `${selectedSku.item}|${selectedSku.variant}`;
      const sk = skus.find(s => s.item === selectedSku.item && s.variant === selectedSku.variant);
      if (sk && nms.length === 1) {
        setAllocations(prev => ({ ...prev, [key]: [{ nm: nms[0].nm, qty: sk.netReq, role: "Single source" }] }));
      } else if (sk && nms.length > 1) {
        const primaryQty = Math.round(sk.netReq * 0.7);
        const backupQty = sk.netReq - primaryQty;
        setAllocations(prev => ({
          ...prev,
          [key]: [
            { nm: nms[0].nm, qty: primaryQty, role: "Primary" },
            { nm: nms[1].nm, qty: backupQty, role: "Backup" },
          ],
        }));
      }
    }
    completeStep(2);
    setActiveStep(3);
  };

  const handleAutoSelect = () => {
    if (selectedSku) {
      const key = `${selectedSku.item}|${selectedSku.variant}`;
      const sk = skus.find(s => s.item === selectedSku.item && s.variant === selectedSku.variant);
      const rankings = getRanking(selectedSku.item, selectedSku.variant, sk?.eligibleNms || [], objective);
      const topNm = rankings.find(r => !r.offline);
      if (topNm && sk) {
        setAllocations(prev => ({ ...prev, [key]: [{ nm: topNm.nm, qty: sk.netReq, role: "Single source" }] }));
      }
    }
    completeStep(2);
    setActiveStep(3);
    toast.success("Auto-select ★ hoàn tất");
  };

  const handleAllocConfirm = () => {
    completeStep(3);
    setActiveStep(4);
  };

  const handleCreateBpo = () => {
    completeStep(4);
    setBpoCreated(true);
    toast.success("3 BPO đã tạo và gửi NM", { description: "BPO-MKD-2605, BPO-DTM-2605, BPO-VGR-2605" });
  };

  if (bpoCreated) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="rounded-card border border-success/30 bg-success-bg/50 px-5 py-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-success" />
          <div>
            <p className="text-body font-semibold text-success">✅ BPO đã tạo</p>
            <p className="text-table-sm text-text-2 mt-0.5">3 Blanket PO đã gửi NM. Theo dõi tại tab "Đối chiếu".</p>
          </div>
        </div>
        <StepperBar active={4} completed={new Set([1, 2, 3, 4])} onStep={() => {}} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <StepperBar active={activeStep} completed={completedSteps} onStep={setActiveStep} />

      {activeStep === 1 && (
        <Step1 skus={skus} onSelectSku={handleSelectSku} onAutoAll={handleAutoAll} />
      )}
      {activeStep === 2 && currentSku && (
        <Step2
          sku={currentSku}
          rankings={currentRankings}
          objective={objective}
          onObjective={setObjective}
          onSelect={handleNmSelect}
          onAutoSelect={handleAutoSelect}
          showFormula={showFormula}
          setShowFormula={setShowFormula}
        />
      )}
      {activeStep === 2 && !currentSku && (
        <div className="text-center py-8 text-text-3">
          <p>Chọn SKU từ Bước 1 trước.</p>
          <button onClick={() => setActiveStep(1)} className="text-primary text-table-sm mt-2 hover:underline">← Quay lại Bước 1</button>
        </div>
      )}
      {activeStep === 3 && (
        <Step3
          skus={skus}
          allocations={allocations}
          onUpdate={(key, allocs) => setAllocations(prev => ({ ...prev, [key]: allocs }))}
          onConfirm={handleAllocConfirm}
        />
      )}
      {activeStep === 4 && (
        <Step4 allocations={allocations} scale={scale} onCreateBpo={handleCreateBpo} />
      )}
    </div>
  );
}

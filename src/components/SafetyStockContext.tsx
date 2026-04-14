import { createContext, useContext, useState, useCallback, ReactNode } from "react";

/* ═══ TYPES ═══ */
export interface SsSkuEntry {
  cn: string;
  item: string;
  variant: string;
  ssCurrent: number;
  z: number;
  sigma: number;
  lt: number;
  ssProposed: number;
  delta: number;
  wcImpact: string;
}

export interface SsChangeLogEntry {
  time: string;
  who: string;
  change: string;
  reason: string;
  source: "drp" | "monitoring";
}

export interface SsCnSummary {
  cn: string;
  ssTotal: number;
  adequate: number;
  breaches: number;
  wc: string;
  rec: string;
}

/* ═══ BASE DATA ═══ */
const baseSsSkuData: SsSkuEntry[] = [
  { cn: "CN-BD", item: "GA-300", variant: "A4", ssCurrent: 900, z: 1.65, sigma: 28.5, lt: 14, ssProposed: 1035, delta: 135, wcImpact: "+25M₫" },
  { cn: "CN-BD", item: "GA-300", variant: "B2", ssCurrent: 700, z: 1.65, sigma: 22.1, lt: 12, ssProposed: 700, delta: 0, wcImpact: "0" },
  { cn: "CN-BD", item: "GA-400", variant: "A4", ssCurrent: 600, z: 1.65, sigma: 18.3, lt: 14, ssProposed: 600, delta: 0, wcImpact: "0" },
  { cn: "CN-BD", item: "GA-600", variant: "A4", ssCurrent: 1000, z: 1.65, sigma: 32.0, lt: 10, ssProposed: 950, delta: -50, wcImpact: "−9M₫" },
];

const baseSsCnData: SsCnSummary[] = [
  { cn: "CN-BD", ssTotal: 2900, adequate: 72, breaches: 12, wc: "389M₫", rec: "↑ Tăng SS 15% → +58M₫" },
  { cn: "CN-ĐN", ssTotal: 2400, adequate: 146, breaches: 0, wc: "650M₫", rec: "↓ Giảm SS 10% → −65M₫" },
  { cn: "CN-HN", ssTotal: 2100, adequate: 105, breaches: 2, wc: "407M₫", rec: "→ Giữ" },
  { cn: "CN-CT", ssTotal: 1500, adequate: 107, breaches: 1, wc: "296M₫", rec: "→ Giữ" },
];

const baseChangeLog: SsChangeLogEntry[] = [
  { time: "12/05 14:30", who: "Thúy", change: "SS GA-300 A4 CN-BD: 900→1.035", reason: "Stockout 2x tháng qua", source: "drp" },
  { time: "10/05 09:15", who: "System", change: "LCNB threshold: 60%→70%", reason: "Auto-adjust from closed-loop", source: "monitoring" },
];

/* ═══ CONTEXT ═══ */
interface SafetyStockContextType {
  ssSkuData: SsSkuEntry[];
  ssCnData: SsCnSummary[];
  changeLog: SsChangeLogEntry[];
  /** Apply an SS override: updates ssProposed, delta, wcImpact for a given cn+item+variant */
  applySsChange: (cn: string, item: string, variant: string, newZ: number, who: string, reason: string, source: "drp" | "monitoring") => void;
  /** Get SKU data filtered by CN */
  getSkusByCn: (cn: string) => SsSkuEntry[];
}

const SafetyStockContext = createContext<SafetyStockContextType | null>(null);

export function SafetyStockProvider({ children }: { children: ReactNode }) {
  const [ssSkuData, setSsSkuData] = useState<SsSkuEntry[]>(baseSsSkuData);
  const [changeLog, setChangeLog] = useState<SsChangeLogEntry[]>(baseChangeLog);

  const applySsChange = useCallback((cn: string, item: string, variant: string, newZ: number, who: string, reason: string, source: "drp" | "monitoring") => {
    setSsSkuData(prev => prev.map(entry => {
      if (entry.cn === cn && entry.item === item && entry.variant === variant) {
        const newSs = Math.round(newZ * entry.sigma * Math.sqrt(entry.lt));
        const delta = newSs - entry.ssCurrent;
        const wcImpact = delta === 0 ? "0" : `${delta > 0 ? "+" : ""}${Math.round(delta * 18.5 / 1000)}M₫`;
        return { ...entry, z: newZ, ssProposed: newSs, delta, wcImpact };
      }
      return entry;
    }));

    const matchEntry = ssSkuData.find(e => e.cn === cn && e.item === item && e.variant === variant);
    if (matchEntry) {
      const newSs = Math.round(newZ * matchEntry.sigma * Math.sqrt(matchEntry.lt));
      const now = new Date();
      const timeStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      setChangeLog(prev => [{
        time: timeStr,
        who,
        change: `SS ${item} ${variant} ${cn}: ${matchEntry.ssCurrent}→${newSs.toLocaleString()}`,
        reason,
        source,
      }, ...prev]);
    }
  }, [ssSkuData]);

  const getSkusByCn = useCallback((cn: string) => {
    return ssSkuData.filter(e => e.cn === cn);
  }, [ssSkuData]);

  return (
    <SafetyStockContext.Provider value={{ ssSkuData, ssCnData: baseSsCnData, changeLog, applySsChange, getSkusByCn }}>
      {children}
    </SafetyStockContext.Provider>
  );
}

export function useSafetyStock() {
  const ctx = useContext(SafetyStockContext);
  if (!ctx) throw new Error("useSafetyStock must be used within SafetyStockProvider");
  return ctx;
}

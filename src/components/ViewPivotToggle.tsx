import { useState, useEffect } from "react";
import { Building2, Package } from "lucide-react";
import { cn } from "@/lib/utils";

export type PivotMode = "cn" | "sku";

interface ViewPivotToggleProps {
  value: PivotMode;
  onChange: (mode: PivotMode) => void;
  className?: string;
  /** Nhãn tuỳ biến cho cụm "đối tượng đầu" — vd "Nhà máy" thay cho "Chi nhánh" */
  cnLabel?: string;
  /** Nhãn tuỳ biến cho cụm SKU — vd "Mã hàng" */
  skuLabel?: string;
}

export function ViewPivotToggle({ value, onChange, className, cnLabel = "Chi nhánh", skuLabel = "SKU" }: ViewPivotToggleProps) {
  return (
    <div className={cn("inline-flex rounded-lg border border-surface-3 bg-surface-0 p-0.5", className)}>
      <button
        onClick={() => onChange("cn")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-caption font-medium transition-colors whitespace-nowrap",
          value === "cn"
            ? "bg-info text-primary-foreground shadow-sm"
            : "text-text-3 hover:text-text-1"
        )}
      >
        <Building2 className="h-3.5 w-3.5" />
        {cnLabel} → {skuLabel}
      </button>
      <button
        onClick={() => onChange("sku")}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-caption font-medium transition-colors whitespace-nowrap",
          value === "sku"
            ? "bg-info text-primary-foreground shadow-sm"
            : "text-text-3 hover:text-text-1"
        )}
      >
        <Package className="h-3.5 w-3.5" />
        {skuLabel} → {cnLabel}
      </button>
    </div>
  );
}

/* Alias xuất theo spec M20 — cùng API, hỗ trợ ergonomy:
   <PivotToggle mode={mode} onChange={setMode} cnLabel="Nhà máy" skuLabel="Mã hàng" /> */
export interface PivotToggleProps {
  mode: PivotMode;
  onChange: (m: PivotMode) => void;
  cnLabel?: string;
  skuLabel?: string;
  className?: string;
}
export function PivotToggle({ mode, onChange, cnLabel, skuLabel, className }: PivotToggleProps) {
  return <ViewPivotToggle value={mode} onChange={onChange} cnLabel={cnLabel} skuLabel={skuLabel} className={className} />;
}

/** Hook that persists pivot mode per screen in sessionStorage */
export function usePivotMode(screenKey: string): [PivotMode, (m: PivotMode) => void] {
  const storageKey = `pivot_${screenKey}`;
  const [mode, setMode] = useState<PivotMode>(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      return (stored === "sku" ? "sku" : "cn") as PivotMode;
    } catch {
      return "cn";
    }
  });

  useEffect(() => {
    try { sessionStorage.setItem(storageKey, mode); } catch {}
  }, [mode, storageKey]);

  return [mode, setMode];
}

/* ═══ INSIGHT HELPERS for SKU-first view ═══ */

export interface SkuPivotRow {
  item: string;
  variant: string;
  totalDemand: number;
  totalStock: number;
  fillPct: number;
  totalGap: number;
  worstCn: string;
  worstHstk: number;
  cnGapCount: number;
  lcnbOpportunity: string | null;
  cnBreakdown: CnBreakdownRow[];
}

export interface CnBreakdownRow {
  cn: string;
  demand: number;
  stock: number;
  ss: number;
  gap: number;
  hstk: number;
  source: string;
  status: string;
}

/** Badge for "Worst CN" column */
export function WorstCnBadge({ cn, hstk }: { cn: string; hstk: number }) {
  const color = hstk < 5 ? "text-danger" : hstk < 10 ? "text-warning" : "text-text-3";
  return (
    <span className={cn + " text-table-sm font-medium"}>
      {/* can't use cn as both variable and util — using inline */}
    </span>
  );
}

/** Render worst CN cell */
export function WorstCnCell({ cnName, hstk }: { cnName: string; hstk: number }) {
  const color = hstk < 5 ? "text-danger" : hstk < 10 ? "text-warning" : "text-text-3";
  return (
    <span className={`${color} text-table-sm font-medium`}>
      {cnName} {hstk.toFixed(1)}d {hstk < 5 ? "🔴" : hstk < 10 ? "🟡" : ""}
    </span>
  );
}

/** Render CN gap count badge */
export function CnGapBadge({ count }: { count: number }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-caption font-medium ${count <= 1 ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>
      {count} CN {count > 2 ? "🔴" : ""}
    </span>
  );
}

/** Render LCNB opportunity badge */
export function LcnbBadge({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-info-bg text-info px-2 py-0.5 text-caption font-medium">
      LCNB ✓ {text}
    </span>
  );
}

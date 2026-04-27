/**
 * TimeRangeFilter — bộ lọc thời gian dùng chung cho mọi screen operational.
 *
 * Modes:
 *   - daily   : Hôm nay | Hôm qua | 7 ngày | 30 ngày
 *   - weekly  : Tuần này | Tuần trước | 2 tuần trước | 4 tuần trước
 *   - monthly : Tháng này | Tháng trước | Quý này | 6 tháng
 *
 * Persist preference vào localStorage theo screenId.
 * Khi value !== "current" → screen vào read-only mode (banner vàng + disable inputs).
 */
import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronDown, Check, ArrowRight, GitCompare, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type TimeRangeMode = "daily" | "weekly" | "monthly";

export type TimeRangePreset =
  // daily
  | "today" | "yesterday" | "last_7_days" | "last_30_days"
  // weekly
  | "this_week" | "last_week" | "last_2_weeks" | "last_4_weeks"
  // monthly
  | "this_month" | "last_month" | "this_quarter" | "last_6_months"
  // generic
  | "custom";

export interface TimeRange {
  type: "preset" | "custom";
  preset?: TimeRangePreset;
  customFrom?: string;
  customTo?: string;
  /** Computed display label (vi-VN). */
  label: string;
  /** True nếu range = current period (không read-only). */
  isCurrent: boolean;
}

interface PresetDef {
  key: TimeRangePreset;
  label: string;
  isCurrent?: boolean;
}

const PRESETS: Record<TimeRangeMode, PresetDef[]> = {
  daily: [
    { key: "today",        label: "Hôm nay",     isCurrent: true },
    { key: "yesterday",    label: "Hôm qua" },
    { key: "last_7_days",  label: "7 ngày qua" },
    { key: "last_30_days", label: "30 ngày qua" },
  ],
  weekly: [
    { key: "this_week",     label: "Tuần này (W20)", isCurrent: true },
    { key: "last_week",     label: "Tuần trước (W19)" },
    { key: "last_2_weeks",  label: "2 tuần trước (W18)" },
    { key: "last_4_weeks",  label: "4 tuần gần nhất" },
  ],
  monthly: [
    { key: "this_month",     label: "Tháng này (T5)", isCurrent: true },
    { key: "last_month",     label: "Tháng trước (T4)" },
    { key: "this_quarter",   label: "Quý này (Q2)" },
    { key: "last_6_months",  label: "6 tháng gần nhất" },
  ],
};

export function defaultTimeRange(mode: TimeRangeMode): TimeRange {
  const p = PRESETS[mode][0];
  return { type: "preset", preset: p.key, label: p.label, isCurrent: true };
}

function presetLabel(mode: TimeRangeMode, key: TimeRangePreset): string {
  return PRESETS[mode].find((p) => p.key === key)?.label ?? key;
}

function fmtDateVi(iso?: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function loadPersisted(screenId: string, mode: TimeRangeMode): TimeRange {
  try {
    const raw = localStorage.getItem(`scp.timerange.${screenId}`);
    if (!raw) return defaultTimeRange(mode);
    const parsed = JSON.parse(raw) as TimeRange;
    if (parsed && parsed.label) return parsed;
  } catch {/* ignore */}
  return defaultTimeRange(mode);
}

export function useTimeRange(screenId: string, mode: TimeRangeMode) {
  const [range, setRange] = useState<TimeRange>(() => loadPersisted(screenId, mode));
  useEffect(() => {
    try { localStorage.setItem(`scp.timerange.${screenId}`, JSON.stringify(range)); } catch {/* */}
  }, [screenId, range]);
  return [range, setRange] as const;
}

interface Props {
  mode: TimeRangeMode;
  value: TimeRange;
  onChange: (range: TimeRange) => void;
  screenId: string;
  className?: string;
}

export function TimeRangeFilter({ mode, value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(value.customFrom ?? "");
  const [customTo, setCustomTo] = useState(value.customTo ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const presets = PRESETS[mode];
  const selectedLabel =
    value.type === "custom"
      ? `${fmtDateVi(value.customFrom)} – ${fmtDateVi(value.customTo)}`
      : presetLabel(mode, value.preset ?? presets[0].key);

  const pickPreset = (p: PresetDef) => {
    onChange({
      type: "preset",
      preset: p.key,
      label: p.label,
      isCurrent: !!p.isCurrent,
    });
    setOpen(false);
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    onChange({
      type: "custom",
      customFrom,
      customTo,
      label: `${fmtDateVi(customFrom)} – ${fmtDateVi(customTo)}`,
      isCurrent: false,
    });
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-2 rounded-button border px-3 py-1.5 text-table-sm font-medium transition-colors",
          value.isCurrent
            ? "border-surface-3 bg-surface-2 text-text-1 hover:bg-surface-1"
            : "border-warning/40 bg-warning-bg text-warning-foreground hover:bg-warning/15"
        )}
      >
        <Calendar className="h-3.5 w-3.5 opacity-70" />
        <span className="font-semibold">{selectedLabel}</span>
        {!value.isCurrent && (
          <span className="text-caption opacity-70">· lịch sử</span>
        )}
        <ChevronDown className={cn("h-3.5 w-3.5 opacity-70 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-[300px] rounded-card border border-surface-3 bg-surface-2 shadow-lg z-50 animate-fade-in overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-3">
            <div className="text-caption font-semibold uppercase text-text-3 tracking-wide">Nhanh</div>
          </div>
          <div className="py-1">
            {presets.map((p) => {
              const selected = value.type === "preset" && value.preset === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => pickPreset(p)}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-table-sm hover:bg-surface-3 transition-colors",
                    selected ? "text-primary font-medium" : "text-text-2"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("inline-block h-2 w-2 rounded-full", selected ? "bg-primary" : "bg-surface-3 border border-text-3/30")} />
                    {p.label}
                  </span>
                  {p.isCurrent && <span className="text-caption text-success">● hiện tại</span>}
                </button>
              );
            })}
          </div>

          <div className="px-3 py-2 border-t border-surface-3">
            <div className="text-caption font-semibold uppercase text-text-3 tracking-wide">Tùy chỉnh</div>
          </div>
          <div className="px-3 pb-3 space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-caption text-text-3 w-12">Từ</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="flex-1 rounded-button border border-surface-3 bg-surface-0 px-2 py-1 text-table-sm text-text-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-caption text-text-3 w-12">Đến</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="flex-1 rounded-button border border-surface-3 bg-surface-0 px-2 py-1 text-table-sm text-text-1"
              />
            </div>
            <button
              onClick={applyCustom}
              disabled={!customFrom || !customTo}
              className="w-full rounded-button bg-primary text-primary-foreground px-3 py-1.5 text-table-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="inline h-3.5 w-3.5 mr-1" />
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HistoryBanner — banner vàng khi xem dữ liệu quá khứ
   ───────────────────────────────────────────────────────────── */

interface HistoryBannerProps {
  range: TimeRange;
  onReset: () => void;
  resetLabel?: string;
  /** Override mô tả entity ("DRP", "Tồn kho", ...). */
  entity?: string;
  className?: string;
}

export function HistoryBanner({ range, onReset, resetLabel = "Quay về hiện tại", entity, className }: HistoryBannerProps) {
  if (range.isCurrent) return null;
  return (
    <div
      className={cn(
        "sticky top-0 z-30 -mx-1 mb-3 flex items-center justify-between gap-3 rounded-button border border-warning/40 bg-warning-bg px-3 py-2 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 text-table-sm text-warning-foreground">
        <span className="text-base leading-none">⏳</span>
        <span>
          Đang xem {entity ? `${entity} ` : "dữ liệu "}
          <strong>{range.label}</strong>. Chỉ xem — không chỉnh sửa được.
        </span>
      </div>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1 rounded-button bg-surface-0 border border-warning/40 px-2.5 py-1 text-caption font-medium text-warning hover:bg-warning/10 transition-colors"
      >
        {resetLabel}
        <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

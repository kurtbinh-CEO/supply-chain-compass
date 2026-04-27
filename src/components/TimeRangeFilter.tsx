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

/* ─────────────────────────────────────────────────────────────
   Timezone-safe date helpers.
   Quy ước: tất cả ISO date string ở dạng "YYYY-MM-DD" và LUÔN
   được hiểu theo múi giờ LOCAL của người dùng (không phải UTC).
   Tránh dùng new Date(iso).toISOString() vì sẽ lệch ngày khi
   user ở UTC+7 (VN) lúc đêm khuya hoặc UTC- vào sáng sớm.
   ───────────────────────────────────────────────────────────── */

/** Format Date → "YYYY-MM-DD" theo giờ LOCAL. */
function toLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse "YYYY-MM-DD" → Date tại 12:00 LOCAL (tránh DST cấn 00:00). */
function parseLocalIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
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

/* ─────────────────────────────────────────────────────────────
   Draft custom range — giữ giá trị Từ/Đến user đang gõ ngay cả khi
   chưa bấm Áp dụng / đóng popover / reload trang. Persist theo screenId
   nên mỗi screen có draft riêng.
   ───────────────────────────────────────────────────────────── */
interface CustomDraft { customFrom: string; customTo: string }

function draftKey(screenId: string) {
  return `scp.timerange.draft.${screenId}`;
}

function loadDraft(screenId: string): CustomDraft {
  try {
    const raw = localStorage.getItem(draftKey(screenId));
    if (!raw) return { customFrom: "", customTo: "" };
    const parsed = JSON.parse(raw) as CustomDraft;
    return {
      customFrom: typeof parsed.customFrom === "string" ? parsed.customFrom : "",
      customTo:   typeof parsed.customTo   === "string" ? parsed.customTo   : "",
    };
  } catch {
    return { customFrom: "", customTo: "" };
  }
}

function saveDraft(screenId: string, draft: CustomDraft) {
  try { localStorage.setItem(draftKey(screenId), JSON.stringify(draft)); } catch {/* */}
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

/** Số tháng tối đa được phép xem ngược về quá khứ (retention policy). */
const RETENTION_MONTHS = 24;

function todayIso(): string {
  // Dùng giờ LOCAL — KHÔNG dùng toISOString() vì sẽ lệch sang UTC.
  return toLocalIso(new Date());
}

function retentionFloorIso(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - RETENTION_MONTHS);
  return toLocalIso(d);
}

function diffDays(fromIso: string, toIso: string): number {
  // Parse cả 2 cùng giờ noon LOCAL → khoảng cách luôn là bội số 24h
  // ngay cả khi qua đợt chuyển DST.
  const a = parseLocalIso(fromIso).getTime();
  const b = parseLocalIso(toIso).getTime();
  return Math.round((b - a) / 86400000);
}

/** Cộng N ngày vào ISO date theo giờ LOCAL. */
function addDaysIso(iso: string, days: number): string {
  const d = parseLocalIso(iso);
  d.setDate(d.getDate() + days);
  return toLocalIso(d);
}

export const MAX_RANGE_DAYS = 366;

/** Validate custom range. Trả về error message (vi) hoặc null nếu hợp lệ.
 *  Mọi thông báo đều kèm ngày giới hạn cụ thể để user biết cần sửa thành gì. */
function validateCustomRange(from: string, to: string): string | null {
  const today = todayIso();
  const floor = retentionFloorIso();
  const todayVi = fmtDateVi(today);
  const floorVi = fmtDateVi(floor);

  if (!from && !to) {
    return `Vui lòng chọn ngày bắt đầu và kết thúc (cho phép từ ${floorVi} đến ${todayVi}).`;
  }
  if (!from) return `Vui lòng chọn ngày bắt đầu (Từ) — sớm nhất ${floorVi}.`;
  if (!to)   return `Vui lòng chọn ngày kết thúc (Đến) — muộn nhất ${todayVi}.`;

  if (from > to) {
    return `Ngày "Từ" (${fmtDateVi(from)}) phải ≤ ngày "Đến" (${fmtDateVi(to)}). Hãy đổi "Từ" về ${fmtDateVi(to)} hoặc sớm hơn.`;
  }
  if (to > today) {
    return `Ngày "Đến" (${fmtDateVi(to)}) vượt quá hôm nay. Tối đa cho phép là ${todayVi}.`;
  }
  if (from < floor) {
    return `Hệ thống chỉ lưu dữ liệu ${RETENTION_MONTHS} tháng gần nhất (từ ${floorVi}). Ngày "Từ" (${fmtDateVi(from)}) quá xa — hãy chọn ≥ ${floorVi}.`;
  }
  if (diffDays(from, to) > MAX_RANGE_DAYS) {
    const maxTo = addDaysIso(from, MAX_RANGE_DAYS);
    return `Khoảng quá dài (${diffDays(from, to) + 1} ngày, tối đa ${MAX_RANGE_DAYS + 1} ngày). Với "Từ" = ${fmtDateVi(from)}, "Đến" muộn nhất là ${fmtDateVi(maxTo)}.`;
  }
  return null;
}

export function TimeRangeFilter({ mode, value, onChange, screenId, className }: Props) {
  const [open, setOpen] = useState(false);
  // Init: ưu tiên giá trị đã apply (value.customFrom/To), fallback về draft đã persist theo screenId.
  const [customFrom, setCustomFrom] = useState(() => {
    if (value.customFrom) return value.customFrom;
    return loadDraft(screenId).customFrom;
  });
  const [customTo, setCustomTo] = useState(() => {
    if (value.customTo) return value.customTo;
    return loadDraft(screenId).customTo;
  });
  const [customError, setCustomError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Khi đổi screenId (vd: re-mount với screen khác) → load lại draft tương ứng.
  useEffect(() => {
    const draft = loadDraft(screenId);
    setCustomFrom(value.customFrom ?? draft.customFrom);
    setCustomTo(value.customTo ?? draft.customTo);
    setTouched(false);
    setCustomError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenId]);

  // Sync khi value bên ngoài đổi sang custom với cặp ngày khác (vd: reset hoặc set programmatic).
  useEffect(() => {
    if (value.type === "custom" && value.customFrom && value.customTo) {
      setCustomFrom(value.customFrom);
      setCustomTo(value.customTo);
    }
  }, [value.type, value.customFrom, value.customTo]);

  // Persist draft theo screenId mỗi khi user gõ — không cần đợi Áp dụng.
  useEffect(() => {
    saveDraft(screenId, { customFrom, customTo });
  }, [screenId, customFrom, customTo]);

  // Live re-validate khi user sửa input (chỉ sau khi đã touch).
  useEffect(() => {
    if (!touched) return;
    setCustomError(validateCustomRange(customFrom, customTo));
  }, [customFrom, customTo, touched]);

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
    setTouched(true);
    const err = validateCustomRange(customFrom, customTo);
    if (err) {
      setCustomError(err);
      return;
    }
    setCustomError(null);
    onChange({
      type: "custom",
      customFrom,
      customTo,
      label: `${fmtDateVi(customFrom)} – ${fmtDateVi(customTo)}`,
      isCurrent: false,
    });
    setOpen(false);
  };

  /** Quick-fill: điền nhanh "N ngày gần nhất" → Đến = hôm nay, Từ = hôm nay − (N−1). */
  const quickFillLastDays = (days: number) => {
    const today = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (days - 1));
    const fromIso = toLocalIso(from);
    const toIso = toLocalIso(today);
    setCustomFrom(fromIso);
    setCustomTo(toIso);
    setTouched(true);
    // Vẫn chạy validation — retention/khoảng tối đa được tôn trọng.
    setCustomError(validateCustomRange(fromIso, toIso));
  };

  const QUICK_FILLS = [
    { days: 7,  label: "7 ngày" },
    { days: 30, label: "30 ngày" },
    { days: 90, label: "90 ngày" },
  ];

  const todayMax = todayIso();
  const floorMin = retentionFloorIso();

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
        <div className="absolute right-0 top-full mt-1.5 w-[320px] rounded-card border border-surface-3 bg-surface-2 shadow-lg z-50 animate-fade-in overflow-hidden">
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

          <div className="px-3 py-2 border-t border-surface-3 flex items-center justify-between">
            <div className="text-caption font-semibold uppercase text-text-3 tracking-wide">Tùy chỉnh</div>
            <div className="text-caption text-text-3">
              Lưu trữ: {RETENTION_MONTHS} tháng
            </div>
          </div>
          <div className="px-3 pt-1 pb-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-caption text-text-3">Gần nhất:</span>
            {QUICK_FILLS.map((q) => {
              const active =
                !!customFrom &&
                customTo === todayIso() &&
                diffDays(customFrom, customTo) === q.days - 1;
              return (
                <button
                  key={q.days}
                  type="button"
                  onClick={() => quickFillLastDays(q.days)}
                  className={cn(
                    "rounded-button border px-2 py-0.5 text-caption font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-surface-3 bg-surface-0 text-text-2 hover:bg-surface-3"
                  )}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
          <div className="px-3 pb-3 space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-caption text-text-3 w-12">Từ</label>
              <input
                type="date"
                value={customFrom}
                min={floorMin}
                max={todayMax}
                onChange={(e) => { setCustomFrom(e.target.value); setTouched(true); }}
                className={cn(
                  "flex-1 rounded-button border bg-surface-0 px-2 py-1 text-table-sm text-text-1",
                  customError ? "border-danger/60" : "border-surface-3"
                )}
                aria-invalid={!!customError}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-caption text-text-3 w-12">Đến</label>
              <input
                type="date"
                value={customTo}
                min={floorMin}
                max={todayMax}
                onChange={(e) => { setCustomTo(e.target.value); setTouched(true); }}
                className={cn(
                  "flex-1 rounded-button border bg-surface-0 px-2 py-1 text-table-sm text-text-1",
                  customError ? "border-danger/60" : "border-surface-3"
                )}
                aria-invalid={!!customError}
              />
            </div>

            {customError && (
              <div
                role="alert"
                className="flex items-start gap-1.5 rounded-button border border-danger/40 bg-danger-bg px-2 py-1.5 text-caption text-danger"
              >
                <span aria-hidden className="leading-none">⚠️</span>
                <span>{customError}</span>
              </div>
            )}
            {!customError && touched && customFrom && customTo && (
              <div className="text-caption text-text-3 px-1">
                Phạm vi: <strong className="text-text-2">{diffDays(customFrom, customTo) + 1} ngày</strong>
              </div>
            )}

            <button
              onClick={applyCustom}
              className="w-full rounded-button bg-primary text-primary-foreground px-3 py-1.5 text-table-sm font-medium hover:bg-primary/90 transition-colors"
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

/* ─────────────────────────────────────────────────────────────
   Compare metric — số liệu so sánh giữa 2 period
   ───────────────────────────────────────────────────────────── */

export interface CompareMetric {
  key: string;
  label: string;
  /** Giá trị period đã chọn (history). */
  past: number | string;
  /** Giá trị period hiện tại. */
  current: number | string;
  unit?: string;
  /** "up" có lợi (vd: doanh thu) hay "down" có lợi (vd: trễ hạn). */
  betterDirection?: "up" | "down" | "neutral";
  /** Format hiển thị; nếu không truyền → toLocaleString("vi-VN"). */
  format?: (v: number | string) => string;
  /** Mô tả ngắn dưới số (vd: "200m² bán ra"). */
  note?: string;
}

interface HistoryBannerProps {
  range: TimeRange;
  onReset: () => void;
  resetLabel?: string;
  /** Override mô tả entity ("DRP", "Tồn kho", ...). */
  entity?: string;
  className?: string;
  /** Khi truyền vào → render nút "So sánh với hiện tại" mở dialog delta. */
  compareMetrics?: CompareMetric[];
  /** Nhãn period hiện tại để hiển thị trong dialog. Mặc định "Hiện tại". */
  currentLabel?: string;
}

function fmtNum(v: number | string, fmt?: (v: number | string) => string): string {
  if (fmt) return fmt(v);
  if (typeof v === "number") return v.toLocaleString("vi-VN");
  return v;
}

function computeDelta(past: number | string, current: number | string) {
  const p = typeof past === "number" ? past : parseFloat(String(past).replace(/[^\d.-]/g, ""));
  const c = typeof current === "number" ? current : parseFloat(String(current).replace(/[^\d.-]/g, ""));
  if (Number.isNaN(p) || Number.isNaN(c) || p === 0) {
    return { absDelta: null as number | null, pctDelta: null as number | null, direction: "flat" as const };
  }
  const abs = c - p;
  const pct = (abs / Math.abs(p)) * 100;
  return {
    absDelta: abs,
    pctDelta: pct,
    direction: abs > 0 ? ("up" as const) : abs < 0 ? ("down" as const) : ("flat" as const),
  };
}

function deltaTone(direction: "up" | "down" | "flat", betterDirection?: "up" | "down" | "neutral") {
  if (direction === "flat" || betterDirection === "neutral" || !betterDirection) return "text-text-2";
  const isGood = (direction === "up" && betterDirection === "up") || (direction === "down" && betterDirection === "down");
  return isGood ? "text-success" : "text-danger";
}

function CompareDialog({
  open, onClose, range, currentLabel, metrics, entity,
}: {
  open: boolean;
  onClose: () => void;
  range: TimeRange;
  currentLabel: string;
  metrics: CompareMetric[];
  entity?: string;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-text-1/40 z-[100]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[min(720px,92vw)] max-h-[85vh] overflow-y-auto rounded-card bg-surface-0 border border-surface-3 shadow-xl animate-fade-in">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-3 sticky top-0 bg-surface-0 z-10">
          <div>
            <h3 className="font-display text-section-header text-text-1">
              So sánh {entity ?? "dữ liệu"}
            </h3>
            <p className="text-caption text-text-3 mt-0.5">
              <span className="text-warning font-medium">{range.label}</span>
              <ArrowRight className="inline h-3 w-3 mx-1.5" />
              <span className="text-success font-medium">{currentLabel}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-button hover:bg-surface-2 text-text-3 hover:text-text-1 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-1 text-table-sm">
            <div className="text-caption font-semibold uppercase text-text-3 pb-2 border-b border-surface-3">Chỉ số</div>
            <div className="text-caption font-semibold uppercase text-text-3 pb-2 border-b border-surface-3 text-right">{range.label}</div>
            <div className="text-caption font-semibold uppercase text-text-3 pb-2 border-b border-surface-3 text-right">{currentLabel}</div>
            <div className="text-caption font-semibold uppercase text-text-3 pb-2 border-b border-surface-3 text-right">Chênh lệch</div>

            {metrics.map((m) => {
              const d = computeDelta(m.past, m.current);
              const tone = deltaTone(d.direction, m.betterDirection);
              const Icon = d.direction === "up" ? TrendingUp : d.direction === "down" ? TrendingDown : Minus;
              return (
                <div key={m.key} className="contents">
                  <div className="py-2.5 border-b border-surface-3/60">
                    <div className="font-medium text-text-1">{m.label}</div>
                    {m.note && <div className="text-caption text-text-3 mt-0.5">{m.note}</div>}
                  </div>
                  <div className="py-2.5 border-b border-surface-3/60 text-right tabular-nums text-text-2">
                    {fmtNum(m.past, m.format)}{m.unit ? ` ${m.unit}` : ""}
                  </div>
                  <div className="py-2.5 border-b border-surface-3/60 text-right tabular-nums font-semibold text-text-1">
                    {fmtNum(m.current, m.format)}{m.unit ? ` ${m.unit}` : ""}
                  </div>
                  <div className={cn("py-2.5 border-b border-surface-3/60 text-right tabular-nums font-semibold", tone)}>
                    {d.absDelta === null ? (
                      <span className="text-text-3">—</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 justify-end">
                        <Icon className="h-3.5 w-3.5" />
                        <span>
                          {d.absDelta > 0 ? "+" : ""}
                          {Math.abs(d.absDelta) >= 100
                            ? Math.round(d.absDelta).toLocaleString("vi-VN")
                            : d.absDelta.toFixed(1)}
                          {m.unit ? ` ${m.unit}` : ""}
                        </span>
                        {d.pctDelta !== null && (
                          <span className="text-caption opacity-80">({d.pctDelta > 0 ? "+" : ""}{d.pctDelta.toFixed(1)}%)</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-button bg-info-bg border border-info/30 px-3 py-2 text-caption text-info">
            💡 So sánh chỉ mang tính tham khảo. Dữ liệu lịch sử dựa trên snapshot lưu lại — production sẽ đồng bộ với Bravo.
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-surface-3 bg-surface-1">
          <button
            onClick={onClose}
            className="rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-2 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </>
  );
}

export function HistoryBanner({
  range, onReset, resetLabel = "Quay về hiện tại", entity, className,
  compareMetrics, currentLabel = "Hiện tại",
}: HistoryBannerProps) {
  const [compareOpen, setCompareOpen] = useState(false);
  if (range.isCurrent) return null;

  const hasCompare = !!compareMetrics && compareMetrics.length > 0;

  return (
    <>
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
        <div className="flex items-center gap-2">
          {hasCompare && (
            <button
              onClick={() => setCompareOpen(true)}
              className="inline-flex items-center gap-1 rounded-button bg-primary text-primary-foreground px-2.5 py-1 text-caption font-medium hover:bg-primary/90 transition-colors"
            >
              <GitCompare className="h-3 w-3" />
              So sánh với hiện tại
            </button>
          )}
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 rounded-button bg-surface-0 border border-warning/40 px-2.5 py-1 text-caption font-medium text-warning hover:bg-warning/10 transition-colors"
          >
            {resetLabel}
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {hasCompare && (
        <CompareDialog
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          range={range}
          currentLabel={currentLabel}
          metrics={compareMetrics!}
          entity={entity}
        />
      )}
    </>
  );
}


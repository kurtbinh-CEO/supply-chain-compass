/**
 * SummaryCards — thẻ tóm tắt nhỏ phía trên bảng dữ liệu.
 * Mục tiêu: farmer mở bảng → liếc 3-5 thẻ → BIẾT NGAY tình hình
 * → mới đọc bảng chi tiết bên dưới.
 *
 * Tính năng:
 *   • 3-5 thẻ flex ngang (responsive: 4-5 desktop / 3 tablet / 2×2 mobile)
 *   • Border-left 3px theo severity 🟢 ok / 🟡 warn / 🔴 critical
 *   • Trend arrow ↑↓→ xanh/đỏ/xám
 *   • Critical pulse 1 lần khi mount
 *   • Click thẻ → filter bảng / drill-down (callback)
 *   • [⚙ Tùy chỉnh] dropdown — ẩn/hiện thẻ, persist localStorage
 *
 * Mọi text tiếng Việt.
 */
import { useEffect, useMemo, useState } from "react";
import { Settings2, RotateCcw, Info, ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type SummarySeverity = "ok" | "warn" | "critical";
export type SummaryTrendDirection = "up" | "down" | "flat";
export type SummaryTrendColor = "green" | "red" | "gray";

export interface SummaryCardTrend {
  delta: string;            // "+3% vs T4" | "↓0,3d" | "→"
  direction: SummaryTrendDirection;
  color: SummaryTrendColor;
}

export interface SummaryCard {
  /** Khoá ổn định để persist customize */
  key: string;
  /** Tiêu đề ngắn — vd "Tồn tổng" */
  label: string;
  /** Số/giá trị chính — đã format sẵn */
  value: string | number;
  /** Đơn vị — vd "m²" "ngày" "CN" */
  unit?: string;
  /** Trend phía dưới */
  trend?: SummaryCardTrend;
  /** Mức độ — quyết định border-left + màu value */
  severity?: SummarySeverity;
  /** Tooltip giải thích (hover icon ⓘ) */
  tooltip?: string;
  /** Click → filter / drill-down */
  onClick?: () => void;
  /** Mặc định ẩn — user có thể tick lại để hiện */
  defaultHidden?: boolean;
}

export interface SummaryCardsProps {
  cards: SummaryCard[];
  /** Bật [⚙ Tùy chỉnh thẻ] dropdown */
  editable?: boolean;
  /** ID duy nhất để persist user preference */
  screenId: string;
  className?: string;
}

const STORAGE_PREFIX = "scp-summary-";

function loadHidden(screenId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${screenId}-cards`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveHidden(screenId: string, hidden: Set<string>) {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${screenId}-cards`, JSON.stringify([...hidden]));
  } catch {
    /* ignore */
  }
}

const SEVERITY_BORDER: Record<SummarySeverity, string> = {
  ok: "border-l-success",
  warn: "border-l-warning",
  critical: "border-l-danger",
};

const SEVERITY_VALUE_COLOR: Record<SummarySeverity, string> = {
  ok: "text-text-1",
  warn: "text-warning",
  critical: "text-danger",
};

const SEVERITY_DOT: Record<SummarySeverity, string> = {
  ok: "bg-success",
  warn: "bg-warning",
  critical: "bg-danger",
};

const TREND_COLOR: Record<SummaryTrendColor, string> = {
  green: "text-success",
  red: "text-danger",
  gray: "text-text-3",
};

function TrendArrow({ direction, color }: { direction: SummaryTrendDirection; color: SummaryTrendColor }) {
  const cls = cn("h-3 w-3 inline shrink-0", TREND_COLOR[color]);
  if (direction === "up") return <ArrowUp className={cls} />;
  if (direction === "down") return <ArrowDown className={cls} />;
  return <ArrowRight className={cls} />;
}

export function SummaryCards({ cards, editable = true, screenId, className }: SummaryCardsProps) {
  const [hidden, setHidden] = useState<Set<string>>(() => {
    const stored = loadHidden(screenId);
    if (stored.size > 0) return stored;
    // Use defaultHidden flags as initial state (only on first mount with no stored prefs)
    const def = new Set<string>();
    cards.forEach((c) => { if (c.defaultHidden) def.add(c.key); });
    return def;
  });
  const [pulsedOnce, setPulsedOnce] = useState(false);

  useEffect(() => {
    // Trigger pulse once on initial mount only
    const id = setTimeout(() => setPulsedOnce(true), 1200);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    saveHidden(screenId, hidden);
  }, [hidden, screenId]);

  const visibleCards = useMemo(() => cards.filter((c) => !hidden.has(c.key)), [cards, hidden]);

  const toggle = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const reset = () => {
    const def = new Set<string>();
    cards.forEach((c) => { if (c.defaultHidden) def.add(c.key); });
    setHidden(def);
  };

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "grid gap-2.5",
          // Mobile: 2 cols, Tablet: 3 cols, Desktop: 4-5 cols
          "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
          editable && "pr-10"
        )}
      >
        {visibleCards.map((card) => {
          const sev = card.severity ?? "ok";
          const isCritical = sev === "critical";
          const clickable = !!card.onClick;
          return (
            <button
              key={card.key}
              onClick={card.onClick}
              disabled={!clickable}
              className={cn(
                "group relative rounded-card border border-surface-3 bg-surface-0 px-3 py-2.5 text-left",
                "border-l-[3px]", SEVERITY_BORDER[sev],
                "transition-all min-h-[78px] flex flex-col justify-between",
                clickable
                  ? "cursor-pointer hover:border-primary/40 hover:shadow-sm hover:-translate-y-0.5"
                  : "cursor-default"
              )}
              title={clickable ? "Click để lọc" : undefined}
            >
              {/* Label row */}
              <div className="flex items-start justify-between gap-1.5">
                <span className="text-[10px] uppercase tracking-wide text-text-3 font-medium leading-tight">
                  {card.label}
                </span>
                {card.tooltip && (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="text-text-3 hover:text-text-2 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Info className="h-3 w-3" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-table-sm">
                        {card.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

              {/* Value row */}
              <div className="flex items-baseline gap-1 mt-1">
                <span
                  className={cn(
                    "font-mono font-bold tabular-nums text-[20px] leading-none",
                    SEVERITY_VALUE_COLOR[sev],
                    isCritical && !pulsedOnce && "animate-fade-in"
                  )}
                  style={isCritical && !pulsedOnce ? { animationIterationCount: 1 } : undefined}
                >
                  {card.value}
                </span>
                {card.unit && (
                  <span className="text-caption text-text-3 font-medium">{card.unit}</span>
                )}
              </div>

              {/* Trend row */}
              <div className="flex items-center gap-1 mt-1.5 min-h-[14px]">
                {card.trend ? (
                  <>
                    <TrendArrow direction={card.trend.direction} color={card.trend.color} />
                    <span className={cn("text-[11px] font-medium", TREND_COLOR[card.trend.color])}>
                      {card.trend.delta}
                    </span>
                  </>
                ) : (
                  <span className={cn("h-1.5 w-1.5 rounded-full", SEVERITY_DOT[sev])} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Customize button */}
      {editable && (
        <div className="absolute top-0 right-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-text-3 hover:text-text-1"
                title="Tùy chỉnh thẻ"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Tùy chỉnh thẻ tóm tắt</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {cards.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.key}
                  checked={!hidden.has(c.key)}
                  onCheckedChange={() => toggle(c.key)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {c.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={reset}>
                <RotateCcw className="h-3.5 w-3.5 mr-2" />
                Mặc định
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

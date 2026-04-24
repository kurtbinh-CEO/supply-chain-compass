/**
 * SkeletonLoaders — preset skeleton cho các pattern phổ biến.
 *
 * Dùng thay cho "Loading..." text trống.
 * Hiển thị shimmer animation theo cấu trúc UI thật → giảm cảm giác chờ.
 */
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* ═══ TABLE skeleton ═══════════════════════════════════════════ */
export function TableSkeleton({
  rows = 6,
  columns = 5,
  showHeader = true,
  className,
}: {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card border border-surface-3 bg-surface-0 overflow-hidden", className)}>
      {showHeader && (
        <div className="flex gap-3 border-b border-surface-3 bg-surface-1 p-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className={cn("h-4", i === 0 ? "w-24" : "flex-1")} />
          ))}
        </div>
      )}
      <div className="divide-y divide-surface-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3 p-3 items-center">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn(
                  c === 0 ? "h-4 w-24" : "h-4 flex-1",
                  // Vary widths cho realistic look
                  c === columns - 1 && "max-w-[80px]",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══ SUMMARY CARDS skeleton ═══════════════════════════════════ */
export function SummaryCardsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-3 mb-4 overflow-x-auto pb-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-1 min-w-[140px] rounded-card border-l-[3px] border-l-surface-3 border border-surface-3 bg-surface-1 p-3">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-7 w-16 mb-1" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

/* ═══ DASHBOARD skeleton — cards + chart ═══════════════════════ */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <SummaryCardsSkeleton count={4} />
      <div className="grid md:grid-cols-2 gap-4">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </div>
  );
}

/* ═══ CHART skeleton ═══════════════════════════════════════════ */
export function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div className="rounded-card border border-surface-3 bg-surface-0 p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="relative" style={{ height }}>
        {/* Y-axis */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between py-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-2 w-6" />
          ))}
        </div>
        {/* Bars */}
        <div className="ml-10 h-full flex items-end gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-t"
              style={{ height: `${30 + ((i * 23) % 60)}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══ FORM skeleton ═══════════════════════════════════════════ */
export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-24 mb-1.5" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
}

/* ═══ LIST skeleton — generic list of items ═══════════════════ */
export function ListSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="rounded-card border border-surface-3 bg-surface-1 p-3 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

/* ═══ DETAIL PANEL skeleton — for slide-in drawer ═════════════ */
export function DetailPanelSkeleton() {
  return (
    <div className="space-y-4 p-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-3/4" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div>
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <div>
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-full mb-1" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

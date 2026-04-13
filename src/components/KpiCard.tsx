import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  unit?: string;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function KpiCard({ title, value, unit, trend, className }: KpiCardProps) {
  return (
    <div className={cn("rounded-card border border-surface-3 bg-surface-1 p-5", className)}>
      <p className="text-table-sm uppercase tracking-wider text-text-3 mb-2">{title}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-kpi text-text-1">{value}</span>
        {unit && <span className="text-table text-text-2">{unit}</span>}
      </div>
      {trend && (
        <p className={cn("mt-1.5 text-table-sm font-medium", trend.positive ? "text-success" : "text-danger")}>
          {trend.positive ? "↑" : "↓"} {trend.value}
        </p>
      )}
    </div>
  );
}

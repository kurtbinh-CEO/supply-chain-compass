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
    <div className={cn("rounded-card border border-border bg-card p-5", className)}>
      <p className="text-table-sm uppercase tracking-wider text-tertiary mb-2">{title}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-kpi text-foreground">{value}</span>
        {unit && <span className="text-table text-muted-foreground">{unit}</span>}
      </div>
      {trend && (
        <p className={cn("mt-1.5 text-table-sm font-medium", trend.positive ? "text-success" : "text-danger")}>
          {trend.positive ? "↑" : "↓"} {trend.value}
        </p>
      )}
    </div>
  );
}

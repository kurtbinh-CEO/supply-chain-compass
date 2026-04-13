import { ganttData } from "./supplyData";
import { cn } from "@/lib/utils";

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  production:  { bg: "bg-primary",     text: "text-primary-foreground", label: "SX" },
  setup:       { bg: "bg-warning-bg",  text: "text-warning",           label: "Setup" },
  idle:        { bg: "bg-surface-1",   text: "text-text-3",            label: "Idle" },
  maintenance: { bg: "bg-danger-bg",   text: "text-danger",            label: "BD" },
};

export function GanttSXTab() {
  const weeks = ganttData[0].weeks.map((w) => w.week);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Legend */}
      <div className="flex items-center gap-4">
        {Object.entries(statusColors).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5 text-table-sm">
            <span className={cn("h-3 w-8 rounded-sm", val.bg)} />
            <span className="text-text-2 capitalize">{key}</span>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        {/* CSS Grid Gantt */}
        <div className="grid" style={{ gridTemplateColumns: `180px repeat(${weeks.length}, 1fr)` }}>
          {/* Header row */}
          <div className="px-4 py-3 bg-surface-1/50 border-b border-r border-surface-3 text-table-header uppercase text-text-3">
            NM × ITEM
          </div>
          {weeks.map((w) => (
            <div key={w} className="px-3 py-3 bg-surface-1/50 border-b border-r border-surface-3 text-table-header uppercase text-text-3 text-center last:border-r-0">
              {w}
            </div>
          ))}

          {/* Data rows */}
          {ganttData.map((row, ri) => (
            <>
              <div
                key={`label-${ri}`}
                className={cn("px-4 py-3 border-b border-r border-surface-3 flex flex-col justify-center", ri === ganttData.length - 1 && "border-b-0")}
              >
                <span className="text-table font-medium text-text-1">{row.nm}</span>
                <span className="text-caption text-text-3">{row.item}</span>
              </div>
              {row.weeks.map((w, wi) => {
                const c = statusColors[w.status];
                return (
                  <div
                    key={`${ri}-${wi}`}
                    className={cn(
                      "px-2 py-3 border-b border-r border-surface-3 flex items-center justify-center",
                      wi === weeks.length - 1 && "border-r-0",
                      ri === ganttData.length - 1 && "border-b-0"
                    )}
                  >
                    <span className={cn("rounded-sm px-3 py-1.5 text-caption font-medium w-full text-center", c.bg, c.text)}>
                      {c.label}
                    </span>
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Utilization Rate", value: "72%", sub: "Avg across all NM", color: "text-primary" },
          { label: "Maintenance Windows", value: "3", sub: "Planned this cycle", color: "text-warning" },
          { label: "Idle Capacity", value: "18%", sub: "Available for spot orders", color: "text-success" },
        ].map((k) => (
          <div key={k.label} className="rounded-card border border-surface-3 bg-surface-2 p-4">
            <span className="text-table-sm text-text-3">{k.label}</span>
            <div className={cn("text-kpi tabular-nums", k.color)}>{k.value}</div>
            <span className="text-caption text-text-3">{k.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

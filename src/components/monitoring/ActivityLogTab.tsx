import { useState } from "react";
import { useActivityLog, LogEntry, LogEventType } from "@/components/ActivityLogContext";
import { cn } from "@/lib/utils";
import { Clock, GitBranch, Database, Shield, Cpu, Search, Download } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nContext";

function useTypeConfig() {
  const { t } = useI18n();
  return {
    workflow: { icon: GitBranch, color: "text-primary", label: t("log.workflow"), bg: "bg-primary/10" },
    data: { icon: Database, color: "text-info", label: t("log.data"), bg: "bg-info/10" },
    approval: { icon: Shield, color: "text-success", label: t("log.approval"), bg: "bg-success/10" },
    system: { icon: Cpu, color: "text-warning", label: t("log.system"), bg: "bg-warning/10" },
  } as Record<LogEventType, { icon: React.ElementType; color: string; label: string; bg: string }>;
}

function useFormatTime() {
  const { t } = useI18n();
  return (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60_000) return t("log.justNow");
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)} ${t("log.minutesAgo")}`;
    const d = new Date(ts);
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    if (diff < 86400_000) return `${hours}:${mins} · ${t("log.today")}`;
    return `${hours}:${mins} · ${d.toLocaleDateString("vi-VN")}`;
  };
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function ActivityLogTab() {
  const { entries } = useActivityLog();
  const { t } = useI18n();
  const typeConfig = useTypeConfig();
  const formatTime = useFormatTime();
  const [filter, setFilter] = useState<LogEventType | "all">("all");
  const [search, setSearch] = useState("");

  const filtered = entries
    .filter(e => filter === "all" || e.type === filter)
    .filter(e => !search || e.message.toLowerCase().includes(search.toLowerCase()) || e.user.toLowerCase().includes(search.toLowerCase()));

  const grouped = filtered.reduce<Record<string, LogEntry[]>>((acc, entry) => {
    const key = formatDate(entry.timestamp);
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const stats = {
    total: entries.length,
    workflow: entries.filter(e => e.type === "workflow").length,
    data: entries.filter(e => e.type === "data").length,
    approval: entries.filter(e => e.type === "approval").length,
    system: entries.filter(e => e.type === "system").length,
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: t("log.totalEvents"), value: stats.total, color: "text-text-1", bg: "bg-surface-2" },
          { label: t("log.workflow"), value: stats.workflow, color: "text-primary", bg: "bg-primary/5" },
          { label: t("log.data"), value: stats.data, color: "text-info", bg: "bg-info/5" },
          { label: t("log.approval"), value: stats.approval, color: "text-success", bg: "bg-success/5" },
          { label: t("log.system"), value: stats.system, color: "text-warning", bg: "bg-warning/5" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-card border border-surface-3 p-4", s.bg)}>
            <p className="text-caption uppercase tracking-wider text-text-3">{s.label}</p>
            <p className={cn("font-display text-kpi mt-1", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {(["all", "workflow", "data", "approval", "system"] as const).map((tp) => (
            <button
              key={tp}
              onClick={() => setFilter(tp)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-table-sm font-medium transition-colors",
                filter === tp
                  ? tp === "all" ? "bg-text-1 text-surface-0" : `${typeConfig[tp].bg} ${typeConfig[tp].color}`
                  : "text-text-3 hover:text-text-2 hover:bg-surface-3"
              )}
            >
              {tp === "all" ? t("log.all") : typeConfig[tp].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("log.search")}
              className="h-8 pl-8 pr-3 rounded-button border border-surface-3 bg-surface-0 text-table-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary w-56"
            />
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-2 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3 transition-colors">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        {Object.keys(grouped).length === 0 ? (
          <p className="text-table text-text-3 text-center py-12">{t("log.noEvents")}</p>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="px-5 py-2 bg-surface-1 border-b border-surface-3">
                <span className="text-caption font-semibold text-text-3 uppercase tracking-wider">{date}</span>
                <span className="text-caption text-text-3 ml-2">· {items.length} {t("log.events")}</span>
              </div>
              <div className="divide-y divide-surface-3/50">
                {items.map(entry => {
                  const config = typeConfig[entry.type];
                  const Icon = config.icon;
                  return (
                    <div key={entry.id} className="flex items-start gap-3 px-5 py-3 hover:bg-surface-1/30 transition-colors">
                      <div className={cn("flex items-center justify-center h-7 w-7 rounded-full shrink-0 mt-0.5", config.bg)}>
                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-table text-text-1">{entry.message}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-caption text-text-3">{entry.user}</span>
                          <span className="text-caption text-text-3">·</span>
                          <span className={cn("text-caption font-medium", config.color)}>{config.label}</span>
                          <span className="text-caption text-text-3">·</span>
                          <span className="text-caption text-text-3">{entry.route}</span>
                        </div>
                      </div>
                      <span className="text-caption text-text-3 flex items-center gap-1 shrink-0 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

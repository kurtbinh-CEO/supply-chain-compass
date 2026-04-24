import { Download, FileText, ChevronRight, Clock, GitBranch, Database, Shield, Cpu, FileSpreadsheet, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useActivityLog, LogEntry, LogEventType } from "@/components/ActivityLogContext";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/I18nContext";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
}

function ExportDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm font-medium text-text-2 hover:border-primary/30 hover:text-text-1 transition-all hover:shadow-sm"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Xuất</span>
        <ChevronDown className={cn("h-3 w-3 text-text-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-card border border-surface-3 bg-surface-2 shadow-lg py-1 z-50 animate-fade-in">
          <button
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-table-sm text-text-2 hover:bg-surface-3 hover:text-text-1 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-success" />
            <div className="text-left">
              <div className="font-medium">Excel (.xlsx)</div>
              <div className="text-caption text-text-3">Dữ liệu chi tiết</div>
            </div>
          </button>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-table-sm text-text-2 hover:bg-surface-3 hover:text-text-1 transition-colors"
          >
            <FileText className="h-4 w-4 text-danger" />
            <div className="text-left">
              <div className="font-medium">PDF (.pdf)</div>
              <div className="text-caption text-text-3">Báo cáo tổng hợp</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export function ScreenHeader({ title, subtitle, actions, badges }: ScreenHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="font-display text-screen-title text-text-1 leading-tight">{title}</h1>
          {subtitle && <p className="text-table text-text-2 mt-0.5">{subtitle}</p>}
        </div>
        {badges && <div className="flex items-center gap-2 ml-1">{badges}</div>}
      </div>
      <div className="flex items-center gap-2">
        <ExportDropdown />
        {actions}
      </div>
    </div>
  );
}

function useTypeConfig() {
  const { t } = useI18n();
  return {
    workflow: { icon: GitBranch, color: "text-primary", label: t("log.workflow") },
    data: { icon: Database, color: "text-info", label: t("log.data") },
    approval: { icon: Shield, color: "text-success", label: t("log.approval") },
    system: { icon: Cpu, color: "text-warning", label: t("log.system") },
  } as Record<LogEventType, { icon: React.ElementType; color: string; label: string }>;
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

function LogEntryCard({ entry }: { entry: LogEntry }) {
  const typeConfig = useTypeConfig();
  const formatTime = useFormatTime();
  const config = typeConfig[entry.type];
  const Icon = config.icon;
  return (
    <div className="rounded-button border border-surface-3 bg-surface-0 p-3 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3 w-3", config.color)} />
          <span className={cn("text-caption font-semibold uppercase", config.color)}>{config.label}</span>
        </div>
        <span className="text-caption text-text-3 flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" />
          {formatTime(entry.timestamp)}
        </span>
      </div>
      <p className="text-table text-text-1">{entry.message}</p>
      <p className="text-caption text-text-3">{entry.user}</p>
    </div>
  );
}

interface ScreenFooterProps {
  actionCount: number;
}

export function ScreenFooter({ actionCount }: ScreenFooterProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<LogEventType | "all">("all");
  const location = useLocation();
  const { getEntriesForRoute, entries: allEntries } = useActivityLog();
  const { t } = useI18n();
  const typeConfig = useTypeConfig();

  const routeEntries = getEntriesForRoute(location.pathname);
  const displayEntries = routeEntries.length > 0 ? routeEntries : allEntries.slice(0, 5);
  const filtered = filter === "all" ? displayEntries : displayEntries.filter(e => e.type === filter);

  return (
    <>
      <div className="mt-6 flex items-center justify-between rounded-card border border-surface-3 bg-surface-1 px-5 py-3">
        <span className="text-table text-text-2">
          <span className="font-medium text-text-1">{actionCount} actions</span> · {t("action.details")}
        </span>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-table-sm text-primary font-medium hover:underline"
        >
          {t("log.viewAuditLog")} ({routeEntries.length})
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 bg-text-1/30 z-50" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-[480px] bg-surface-2 border-l border-surface-3 z-50 rounded-l-panel animate-slide-in-right shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3 shrink-0">
              <div>
                <h2 className="font-display text-section-header text-text-1">{t("log.activityLog")}</h2>
                <p className="text-caption text-text-3 mt-0.5">{routeEntries.length} {t("log.eventsOnPage")}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-text-3 hover:text-text-1 transition-colors p-1.5 rounded-button hover:bg-surface-3">✕</button>
            </div>

            <div className="flex items-center gap-1.5 px-6 py-3 border-b border-surface-3 shrink-0">
              {(["all", "workflow", "data", "approval", "system"] as const).map((tp) => (
                <button
                  key={tp}
                  onClick={() => setFilter(tp)}
                  className={cn(
                    "rounded-full px-3 py-1 text-caption font-medium transition-colors",
                    filter === tp
                      ? "bg-primary/10 text-primary"
                      : "text-text-3 hover:text-text-2 hover:bg-surface-3"
                  )}
                >
                  {tp === "all" ? t("log.all") : typeConfig[tp].label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {filtered.length === 0 ? (
                <p className="text-table text-text-3 text-center py-8">{t("log.noEvents")}</p>
              ) : (
                filtered.map(entry => <LogEntryCard key={entry.id} entry={entry} />)
              )}
            </div>

            <div className="px-6 py-3 border-t border-surface-3 shrink-0">
              <button className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-2 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3 transition-colors">
                <Download className="h-3.5 w-3.5" />
                Xuất CSV
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

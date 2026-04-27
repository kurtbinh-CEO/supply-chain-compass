import { Download, ChevronRight, Clock, GitBranch, Database, Shield, Cpu } from "lucide-react";
import { useState } from "react";
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

// Note: Per-table SmartTable provides its own export. The screen-level
// "Xuất" dropdown was removed to avoid duplication and tighten the header.


/**
 * ScreenHeader — chuẩn hoá header mọi page.
 *
 * Layout rules (không đổi theo breakpoint):
 *   - 2 cột: [title block] ⟷ [actions]. `min-w-0` ở cột trái để ellipsis hoạt động.
 *   - Title: 1 dòng, `truncate`, font-display, line-height cố định.
 *   - Subtitle: 1 dòng, `truncate`, body font, color text-2.
 *   - Badges: cùng dòng title, không wrap, shrink-0.
 *   - Actions: `flex-nowrap`, `shrink-0`, mọi control bên trong nên dùng `h-8`.
 *   - `gap-x-4` giữa 2 cột; `gap-y-2` chỉ kích hoạt khi thực sự xuống dòng (rất hiếm).
 *
 * Nguyên tắc: KHÔNG bao giờ wrap. Nếu title/tenant dài → ellipsis + native title tooltip.
 */
export function ScreenHeader({ title, subtitle, actions, badges }: ScreenHeaderProps) {
  return (
    <header className="mb-6 flex items-center justify-between gap-x-4 gap-y-2 flex-wrap">
      {/* Title block — co lại được, ellipsis */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="min-w-0">
          <h1
            className="font-display text-screen-title font-semibold leading-[1.15] text-text-1 truncate"
            title={title}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-table text-text-2 leading-snug truncate mt-0.5"
              title={subtitle}
            >
              {subtitle}
            </p>
          )}
        </div>
        {badges && (
          <div className="flex items-center gap-2 shrink-0 flex-nowrap [&>*]:h-8 [&>*]:whitespace-nowrap [&>*]:inline-flex [&>*]:items-center">
            {badges}
          </div>
        )}
      </div>

      {/* Actions — không bao giờ wrap, mọi control cao 32px */}
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-nowrap [&>*]:h-8 [&>*]:whitespace-nowrap">
          {actions}
        </div>
      )}
    </header>
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

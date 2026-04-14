import { Download, FileText, ChevronRight, Clock, GitBranch, Database, Shield, Cpu } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useActivityLog, LogEntry, LogEventType } from "@/components/ActivityLogContext";
import { cn } from "@/lib/utils";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, actions }: ScreenHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="font-display text-screen-title text-text-1">{title}</h1>
        {subtitle && <p className="text-table text-text-2 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-2 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3 transition-colors">
          <Download className="h-3.5 w-3.5" />
          Excel
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-2 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3 transition-colors">
          <FileText className="h-3.5 w-3.5" />
          PDF
        </button>
        {actions}
      </div>
    </div>
  );
}

const typeConfig: Record<LogEventType, { icon: React.ElementType; color: string; label: string }> = {
  workflow: { icon: GitBranch, color: "text-primary", label: "Workflow" },
  data: { icon: Database, color: "text-info", label: "Dữ liệu" },
  approval: { icon: Shield, color: "text-success", label: "Phê duyệt" },
  system: { icon: Cpu, color: "text-warning", label: "Hệ thống" },
};

function formatTime(ts: number) {
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "Vừa xong";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} phút trước`;
  const d = new Date(ts);
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  if (diff < 86400_000) return `${hours}:${mins} · Hôm nay`;
  return `${hours}:${mins} · ${d.toLocaleDateString("vi-VN")}`;
}

function LogEntryCard({ entry }: { entry: LogEntry }) {
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

  const routeEntries = getEntriesForRoute(location.pathname);
  const displayEntries = routeEntries.length > 0 ? routeEntries : allEntries.slice(0, 5);
  const filtered = filter === "all" ? displayEntries : displayEntries.filter(e => e.type === filter);

  return (
    <>
      <div className="mt-6 flex items-center justify-between rounded-card border border-surface-3 bg-surface-1 px-5 py-3">
        <span className="text-table text-text-2">
          <span className="font-medium text-text-1">{actionCount} actions</span> · Chi tiết
        </span>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-table-sm text-primary font-medium hover:underline"
        >
          Xem audit log ({routeEntries.length})
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Audit slide-in panel */}
      {open && (
        <>
          <div className="fixed inset-0 bg-text-1/30 z-50" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-[480px] bg-surface-2 border-l border-surface-3 z-50 rounded-l-panel animate-slide-in-right shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3 shrink-0">
              <div>
                <h2 className="font-display text-section-header text-text-1">Activity Log</h2>
                <p className="text-caption text-text-3 mt-0.5">{routeEntries.length} sự kiện trên trang này</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-text-3 hover:text-text-1 transition-colors p-1.5 rounded-button hover:bg-surface-3">✕</button>
            </div>

            {/* Type filter */}
            <div className="flex items-center gap-1.5 px-6 py-3 border-b border-surface-3 shrink-0">
              {(["all", "workflow", "data", "approval", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={cn(
                    "rounded-full px-3 py-1 text-caption font-medium transition-colors",
                    filter === t
                      ? "bg-primary/10 text-primary"
                      : "text-text-3 hover:text-text-2 hover:bg-surface-3"
                  )}
                >
                  {t === "all" ? "Tất cả" : typeConfig[t].label}
                </button>
              ))}
            </div>

            {/* Log entries */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {filtered.length === 0 ? (
                <p className="text-table text-text-3 text-center py-8">Chưa có sự kiện nào</p>
              ) : (
                filtered.map(entry => <LogEntryCard key={entry.id} entry={entry} />)
              )}
            </div>

            <div className="px-6 py-3 border-t border-surface-3 shrink-0">
              <button className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-2 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3 transition-colors">
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

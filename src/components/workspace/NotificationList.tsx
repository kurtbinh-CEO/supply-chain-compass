import { useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { StatusChip } from "@/components/StatusChip";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "unread" | "critical";

export function NotificationList() {
  const { notifications, markNotificationRead, unreadCount, criticalCount } = useWorkspace();
  const [filter, setFilter] = useState<FilterTab>("all");
  const navigate = useNavigate();

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "critical") return n.typeColor === "danger";
    return true;
  });

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "Tất cả" },
    { key: "unread", label: "Chưa đọc", count: unreadCount },
    { key: "critical", label: "Nghiêm trọng", count: criticalCount },
  ];

  const handleClick = (id: string, url: string) => {
    markNotificationRead(id);
    navigate(url);
  };

  return (
    <div className="rounded-card border border-surface-3 bg-surface-2">
      <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
        <h2 className="font-display text-section-header text-text-1">Thông báo</h2>
        <div className="flex items-center gap-1 rounded-full border border-surface-3 bg-surface-0 p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "rounded-full px-3 py-1 text-table-sm font-medium transition-colors",
                filter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-text-2 hover:text-text-1"
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-surface-3/50">
        {filtered.map((n) => (
          <div
            key={n.id}
            onClick={() => handleClick(n.id, n.url)}
            className={cn(
              "flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-surface-3 transition-colors",
              !n.read && "bg-info-bg/30"
            )}
          >
            <span className={cn("h-2 w-2 rounded-full shrink-0", !n.read ? "bg-primary" : "bg-surface-3")} />
            <StatusChip status={n.typeColor} label={n.type} className="shrink-0" />
            <p className={cn("flex-1 text-table", !n.read ? "text-text-1 font-medium" : "text-text-2")}>{n.message}</p>
            <span className="text-table-sm text-text-3 shrink-0">{n.timeAgo}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-5 py-8 text-center text-table text-text-3">Không có thông báo</div>
        )}
      </div>
    </div>
  );
}

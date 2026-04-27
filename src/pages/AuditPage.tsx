import { useMemo, useState } from "react";
import { ScreenHeader } from "@/components/ScreenShell";
import { AppLayout } from "@/components/AppLayout";
import { useActivityLog, LogEntry, LogEventType } from "@/components/ActivityLogContext";
import { Search, Filter, Calendar, User2, MapPin, Download, Clock, GitBranch, Database, Shield, Cpu, FileText, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/EmptyState";

/**
 * M22 — Central Audit Trail
 *
 * Aggregate view of ALL system events across screens. Mở rộng từ ActivityLogTab
 * (chỉ ở /monitoring) thành một trang riêng /audit với:
 *  - Filter theo route (màn hình), user, type, time range, search
 *  - Group by route khi cần điều tra theo screen
 *  - Critical events highlight (force-release, delete, role change…)
 */

const TYPE_META: Record<LogEventType, { icon: any; color: string; bg: string; label: string }> = {
  workflow: { icon: GitBranch, color: "text-primary",  bg: "bg-primary/10",  label: "Quy trình" },
  data:     { icon: Database,  color: "text-info",     bg: "bg-info/10",     label: "Dữ liệu" },
  approval: { icon: Shield,    color: "text-success",  bg: "bg-success/10",  label: "Phê duyệt" },
  system:   { icon: Cpu,       color: "text-warning",  bg: "bg-warning/10",  label: "Hệ thống" },
};

const ROUTE_LABELS: Record<string, string> = {
  "/demand": "Rà soát nhu cầu",
  "/demand-weekly": "Nhu cầu tuần",
  "/sop": "S&OP Consensus",
  "/hub": "Hub & Cam kết",
  "/drp": "DRP",
  "/orders": "Đơn hàng",
  "/inventory": "Tồn kho",
  "/supply": "Tồn kho NM",
  "/monitoring": "Giám sát",
  "/master-data": "Dữ liệu gốc",
  "/config": "Tham số hệ thống",
  "/cn-portal": "CN Portal",
  "/executive": "Tổng quan lãnh đạo",
};

const CRITICAL_KEYWORDS = ["force", "xóa", "delete", "lock", "unlock", "release", "phê duyệt", "duyệt", "role", "phân quyền"];

function isCritical(entry: LogEntry) {
  const text = (entry.message + " " + (entry.detail || "")).toLowerCase();
  return CRITICAL_KEYWORDS.some(k => text.includes(k));
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

type DateRange = "today" | "7d" | "30d" | "all";

const DATE_RANGE_MS: Record<DateRange, number> = {
  today: 86_400_000,
  "7d": 7 * 86_400_000,
  "30d": 30 * 86_400_000,
  all: Number.MAX_SAFE_INTEGER,
};

export default function AuditPage() {
  const { entries } = useActivityLog();

  const [typeFilter, setTypeFilter] = useState<LogEventType | "all">("all");
  const [routeFilter, setRouteFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("7d");
  const [search, setSearch] = useState("");
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [groupBy, setGroupBy] = useState<"date" | "route" | "user">("date");

  const allRoutes = useMemo(() => Array.from(new Set(entries.map(e => e.route))).sort(), [entries]);
  const allUsers  = useMemo(() => Array.from(new Set(entries.map(e => e.user))).sort(), [entries]);

  const filtered = useMemo(() => {
    const cutoff = Date.now() - DATE_RANGE_MS[dateRange];
    return entries
      .filter(e => e.timestamp >= cutoff)
      .filter(e => typeFilter === "all" || e.type === typeFilter)
      .filter(e => routeFilter === "all" || e.route === routeFilter)
      .filter(e => userFilter === "all" || e.user === userFilter)
      .filter(e => !criticalOnly || isCritical(e))
      .filter(e => !search ||
        e.message.toLowerCase().includes(search.toLowerCase()) ||
        e.user.toLowerCase().includes(search.toLowerCase()) ||
        e.route.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [entries, dateRange, typeFilter, routeFilter, userFilter, search, criticalOnly]);

  const stats = useMemo(() => ({
    total: filtered.length,
    critical: filtered.filter(isCritical).length,
    users: new Set(filtered.map(e => e.user)).size,
    routes: new Set(filtered.map(e => e.route)).size,
  }), [filtered]);

  const grouped = useMemo(() => {
    const map: Record<string, LogEntry[]> = {};
    filtered.forEach(e => {
      let key = "";
      if (groupBy === "date") key = formatDate(e.timestamp);
      else if (groupBy === "route") key = ROUTE_LABELS[e.route] || e.route;
      else key = e.user;
      (map[key] ||= []).push(e);
    });
    return map;
  }, [filtered, groupBy]);

  const handleExport = () => {
    const rows = [
      ["Thời gian", "Loại", "Màn hình", "Người dùng", "Hành động", "Critical"],
      ...filtered.map(e => [
        new Date(e.timestamp).toISOString(),
        TYPE_META[e.type].label,
        ROUTE_LABELS[e.route] || e.route,
        e.user,
        e.message.replace(/"/g, '""'),
        isCritical(e) ? "Có" : "",
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <ScreenHeader
        title="Audit Trail"
        subtitle="Lịch sử thao tác toàn hệ thống — ai đã làm gì, khi nào, ở đâu"
        actions={
          <button
            onClick={handleExport}
            className="inline-flex h-8 items-center gap-1.5 rounded-button border border-surface-3 bg-surface-2 px-3 text-table-sm font-medium text-text-1 hover:bg-surface-3 transition-colors whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            Xuất CSV
          </button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="rounded-card border border-surface-3 bg-surface-2 p-4">
          <p className="text-caption uppercase tracking-wider text-text-3">Tổng sự kiện</p>
          <p className="font-display text-kpi mt-1 text-text-1">{stats.total}</p>
        </div>
        <div className="rounded-card border border-danger/20 bg-danger/5 p-4">
          <p className="text-caption uppercase tracking-wider text-text-3 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Critical
          </p>
          <p className={cn("font-display text-kpi mt-1", stats.critical > 0 ? "text-danger" : "text-text-1")}>
            {stats.critical}
          </p>
        </div>
        <div className="rounded-card border border-surface-3 bg-info/5 p-4">
          <p className="text-caption uppercase tracking-wider text-text-3">Người dùng</p>
          <p className="font-display text-kpi mt-1 text-info">{stats.users}</p>
        </div>
        <div className="rounded-card border border-surface-3 bg-primary/5 p-4">
          <p className="text-caption uppercase tracking-wider text-text-3">Màn hình</p>
          <p className="font-display text-kpi mt-1 text-primary">{stats.routes}</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-4 mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo nội dung, người dùng, màn hình..."
              className="w-full h-9 pl-9 pr-3 rounded-button border border-surface-3 bg-surface-0 text-table-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as DateRange)}
            className="h-9 px-3 rounded-button border border-surface-3 bg-surface-0 text-table-sm"
          >
            <option value="today">Hôm nay</option>
            <option value="7d">7 ngày qua</option>
            <option value="30d">30 ngày qua</option>
            <option value="all">Tất cả</option>
          </select>

          <select
            value={routeFilter}
            onChange={e => setRouteFilter(e.target.value)}
            className="h-9 px-3 rounded-button border border-surface-3 bg-surface-0 text-table-sm"
          >
            <option value="all">Tất cả màn hình</option>
            {allRoutes.map(r => <option key={r} value={r}>{ROUTE_LABELS[r] || r}</option>)}
          </select>

          <select
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="h-9 px-3 rounded-button border border-surface-3 bg-surface-0 text-table-sm"
          >
            <option value="all">Tất cả user</option>
            {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
          </select>

          <label className="inline-flex items-center gap-2 px-3 h-9 rounded-button border border-surface-3 bg-surface-0 text-table-sm cursor-pointer hover:bg-surface-3">
            <input
              type="checkbox"
              checked={criticalOnly}
              onChange={e => setCriticalOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-danger"
            />
            <AlertTriangle className="h-3 w-3 text-danger" />
            Critical
          </label>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-caption text-text-3 mr-1">Loại:</span>
            {(["all", "workflow", "data", "approval", "system"] as const).map(tp => (
              <button
                key={tp}
                onClick={() => setTypeFilter(tp)}
                className={cn(
                  "rounded-full px-3 py-1 text-table-sm font-medium transition-colors",
                  typeFilter === tp
                    ? tp === "all" ? "bg-text-1 text-surface-0" : `${TYPE_META[tp].bg} ${TYPE_META[tp].color}`
                    : "text-text-3 hover:text-text-2 hover:bg-surface-3"
                )}
              >
                {tp === "all" ? "Tất cả" : TYPE_META[tp].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-caption text-text-3 mr-1">Nhóm theo:</span>
            {([
              { v: "date" as const, label: "Ngày", icon: Calendar },
              { v: "route" as const, label: "Màn hình", icon: MapPin },
              { v: "user" as const, label: "Người dùng", icon: User2 },
            ]).map(opt => (
              <button
                key={opt.v}
                onClick={() => setGroupBy(opt.v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-table-sm font-medium transition-colors",
                  groupBy === opt.v ? "bg-primary/10 text-primary" : "text-text-3 hover:text-text-2 hover:bg-surface-3"
                )}
              >
                <opt.icon className="h-3 w-3" />
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        {Object.keys(grouped).length === 0 ? (
          <div className="p-8">
            <EmptyState
              preset="filtered-out"
              title="Không có sự kiện nào khớp"
              description="Thử mở rộng khoảng thời gian hoặc xóa bột lọc"
              action={{
                label: "Xóa bộ lọc",
                onClick: () => {
                  setTypeFilter("all"); setRouteFilter("all"); setUserFilter("all");
                  setSearch(""); setCriticalOnly(false); setDateRange("all");
                },
              }}
            />
          </div>
        ) : (
          Object.entries(grouped).map(([groupKey, items]) => (
            <div key={groupKey}>
              <div className="px-5 py-2 bg-surface-1 border-b border-surface-3 sticky top-0 z-10">
                <span className="text-caption font-semibold text-text-3 uppercase tracking-wider">{groupKey}</span>
                <span className="text-caption text-text-3 ml-2">· {items.length} sự kiện</span>
              </div>
              <div className="divide-y divide-surface-3/50">
                {items.map(entry => {
                  const meta = TYPE_META[entry.type];
                  const Icon = meta.icon;
                  const critical = isCritical(entry);
                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-start gap-3 px-5 py-3 transition-colors",
                        critical ? "bg-danger/5 hover:bg-danger/10" : "hover:bg-surface-1/30"
                      )}
                    >
                      <div className={cn("flex items-center justify-center h-7 w-7 rounded-full shrink-0 mt-0.5", meta.bg)}>
                        <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-table text-text-1 font-medium">{entry.message}</p>
                          {critical && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger uppercase">
                              <AlertTriangle className="h-2.5 w-2.5" /> Critical
                            </span>
                          )}
                        </div>
                        {entry.detail && (
                          <p className="text-caption text-text-3 mt-0.5">{entry.detail}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-caption text-text-3">
                            <User2 className="h-2.5 w-2.5" /> {entry.user}
                          </span>
                          <span className="text-caption text-text-3">·</span>
                          <span className={cn("text-caption font-medium", meta.color)}>{meta.label}</span>
                          <span className="text-caption text-text-3">·</span>
                          <span className="inline-flex items-center gap-1 text-caption text-text-3">
                            <MapPin className="h-2.5 w-2.5" />
                            {ROUTE_LABELS[entry.route] || entry.route}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 text-caption text-text-3">
                          <Clock className="h-2.5 w-2.5" />
                          {formatTime(entry.timestamp)}
                        </span>
                        <p className="text-caption text-text-3 mt-0.5">{formatDate(entry.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-caption text-text-3 mt-3 text-center">
        Hiển thị {filtered.length} / {entries.length} sự kiện · Audit trail bao gồm các thao tác trên DRP, S&OP, đơn hàng, cấu hình & dữ liệu gốc.
      </p>
    </AppLayout>
  );
}

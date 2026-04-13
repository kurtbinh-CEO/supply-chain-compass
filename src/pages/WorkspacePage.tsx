import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useWorkflow } from "@/components/WorkflowContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Play, ChevronDown, X } from "lucide-react";

type ItemType = "approve" | "exception" | "notify";
type Priority = "danger" | "warning" | "info";

interface ActionItem {
  id: string;
  type: ItemType;
  priority: Priority;
  description: string;
  time: string;
  navigateTo?: string;
  actionLabel?: string;
}

const initialItems: ActionItem[] = [
  { id: "1", type: "approve", priority: "danger", description: "Force-release Toko stale 28h — 3 cấp", time: "15m" },
  { id: "2", type: "exception", priority: "danger", description: "SHORTAGE GA-300 CN-BD 345m² · Risk 120M₫", time: "23:02", navigateTo: "/drp", actionLabel: "Xử lý" },
  { id: "3", type: "approve", priority: "warning", description: "CN Adjust CN-BD +12,5% GA-300 A4", time: "45m" },
  { id: "4", type: "exception", priority: "warning", description: "PO_OVERDUE Toko 557m² 8 ngày · Risk 85M₫", time: "2h", navigateTo: "/orders", actionLabel: "Xử lý" },
  { id: "5", type: "approve", priority: "warning", description: "PO Release PO-BD-W16 Mikado 1.200m²", time: "30m" },
  { id: "6", type: "notify", priority: "info", description: "Phú Mỹ chưa cập nhật tồn kho 3 ngày", time: "1d", actionLabel: "Nhắc NM" },
  { id: "7", type: "notify", priority: "info", description: "FC drift MAPE 18,4% tăng 3 tuần", time: "6h", navigateTo: "/monitoring", actionLabel: "Xem" },
  { id: "8", type: "approve", priority: "info", description: "SS Change GA-300 A4: 900→1.350. WC +83M₫", time: "5m" },
];

const typeBadge: Record<ItemType, { label: string; cls: string }> = {
  approve: { label: "Duyệt", cls: "bg-primary/10 text-primary" },
  exception: { label: "Exception", cls: "bg-danger-bg text-danger" },
  notify: { label: "Thông báo", cls: "bg-info-bg text-info" },
};

const dotColor: Record<Priority, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
};

type FilterKey = "all" | "approve" | "exception" | "notify";

export default function WorkspacePage() {
  const navigate = useNavigate();
  const { startWorkflow } = useWorkflow();
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [showAll, setShowAll] = useState(false);

  const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);
  const visible = showAll ? filtered : filtered.slice(0, 5);

  const approveCount = items.filter((i) => i.type === "approve").length;
  const excCount = items.filter((i) => i.type === "exception").length;
  const notifyCount = items.filter((i) => i.type === "notify").length;

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleApprove = (item: ActionItem) => {
    toast.success(`Đã duyệt: ${item.description.slice(0, 40)}…`);
    removeItem(item.id);
  };

  const handleReject = (item: ActionItem) => {
    toast.error(`Đã từ chối: ${item.description.slice(0, 40)}…`);
    removeItem(item.id);
  };

  const handleAction = (item: ActionItem) => {
    if (item.type === "notify" && item.actionLabel === "Nhắc NM") {
      toast.success("Đã nhắc NM");
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, description: i.description + " — Đã nhắc", priority: "info" as Priority } : i));
      return;
    }
    if (item.navigateTo) navigate(item.navigateTo);
  };

  const handleStartWorkflow = (type: "daily" | "monthly") => {
    startWorkflow(type);
    navigate(type === "daily" ? "/supply" : "/demand");
  };

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "Tất cả", count: items.length },
    { key: "approve", label: "Cần duyệt", count: approveCount },
    { key: "exception", label: "Exceptions", count: excCount },
    { key: "notify", label: "Thông báo", count: notifyCount },
  ];

  const kpis = [
    { label: "Demand", value: "7.650 m²", to: "/demand" },
    { label: "Exceptions", value: String(excCount), to: "#" },
    { label: "HSTK", value: "8,5d", to: "/monitoring" },
    { label: "FC Accuracy", value: "82%", to: "/monitoring" },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="font-display text-screen-title text-text-1">Workspace</h1>
        {items.length > 0 && (
          <span className="rounded-full bg-danger text-primary-foreground text-caption font-bold px-2 py-0.5 min-w-[22px] text-center">
            {items.length}
          </span>
        )}
      </div>

      <div className="space-y-6">
        {/* ─── SECTION 1: Cần làm ─── */}
        <div className="rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-3.5 border-b border-surface-3 flex items-center justify-between">
            <h2 className="font-display text-body font-semibold text-text-1">Cần làm</h2>
            {/* Filter tabs */}
            <div className="flex items-center gap-1">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setFilter(f.key); setShowAll(false); }}
                  className={cn(
                    "rounded-full px-3 py-1 text-caption font-medium transition-colors",
                    filter === f.key ? "bg-primary/10 text-primary" : "text-text-3 hover:text-text-1"
                  )}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-surface-3/50">
            {visible.map((item) => (
              <div key={item.id} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-1/30 transition-colors">
                {/* Dot */}
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", dotColor[item.priority])} />
                {/* Type badge */}
                <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium shrink-0", typeBadge[item.type].cls)}>
                  {typeBadge[item.type].label}
                </span>
                {/* Description */}
                <span className="flex-1 text-table text-text-1 truncate">{item.description}</span>
                {/* Time */}
                <span className="text-caption text-text-3 shrink-0">{item.time}</span>
                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.type === "approve" && (
                    <>
                      <button onClick={() => handleApprove(item)} className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium">Duyệt</button>
                      <button onClick={() => handleReject(item)} className="rounded-button border border-surface-3 text-text-2 px-2.5 py-1 text-caption font-medium hover:text-danger hover:border-danger">Từ chối</button>
                    </>
                  )}
                  {item.type === "exception" && (
                    <button onClick={() => handleAction(item)} className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium">
                      {item.actionLabel} →
                    </button>
                  )}
                  {item.type === "notify" && (
                    <button onClick={() => handleAction(item)} className="rounded-button border border-surface-3 text-text-2 px-2.5 py-1 text-caption font-medium hover:text-text-1">
                      {item.actionLabel} {item.navigateTo ? "→" : ""}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filtered.length > 5 && !showAll && (
            <button onClick={() => setShowAll(true)} className="w-full px-5 py-2.5 text-center text-table-sm text-primary font-medium hover:bg-surface-1/30 border-t border-surface-3 flex items-center justify-center gap-1">
              Xem tất cả {filtered.length} <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}

          {items.length === 0 && (
            <div className="px-5 py-8 text-center text-text-3">
              ✅ Không có việc cần làm. Hệ thống đang chạy tốt.
            </div>
          )}
        </div>

        {/* ─── SECTION 2: Bắt đầu ─── */}
        <div className="space-y-4">
          {/* 2 CTA cards */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleStartWorkflow("daily")}
              className="rounded-card bg-gradient-primary text-primary-foreground p-5 text-left hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center gap-2 mb-1">
                <Play className="h-5 w-5" />
                <span className="font-display text-body font-semibold">Vận hành ngày</span>
              </div>
              <p className="text-table-sm opacity-80">NM Supply → Demand → DRP & Orders</p>
            </button>
            <button
              onClick={() => handleStartWorkflow("monthly")}
              className="rounded-card bg-success text-primary-foreground p-5 text-left hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center gap-2 mb-1">
                <Play className="h-5 w-5" />
                <span className="font-display text-body font-semibold">Kế hoạch tháng</span>
              </div>
              <p className="text-table-sm opacity-80">Demand Review → S&OP → Hub</p>
            </button>
          </div>

          {/* 4 KPI mini cards */}
          <div className="grid grid-cols-4 gap-3">
            {kpis.map((k) => (
              <button
                key={k.label}
                onClick={() => k.to !== "#" && navigate(k.to)}
                className="rounded-card border border-surface-3 bg-surface-2 p-3 text-left hover:bg-surface-1/50 transition-colors"
              >
                <div className="text-caption text-text-3 uppercase mb-0.5">{k.label}</div>
                <div className="font-display text-section-header tabular-nums text-text-1">{k.value}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

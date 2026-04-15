import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenFooter } from "@/components/ScreenShell";
import { useWorkflow } from "@/components/WorkflowContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Play, ChevronDown, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Package, Activity } from "lucide-react";
import { LogicTooltip } from "@/components/LogicTooltip";
import { VoiceInput } from "@/components/VoiceInput";
import { ClickableNumber } from "@/components/ClickableNumber";
import { LogicLink } from "@/components/LogicLink";

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
  { id: "3", type: "approve", priority: "warning", description: "CN Adjust CN-BD +12,5% GA-300 A4", time: "45m", navigateTo: "/cn-portal" },
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
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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
    if (rejectingId === item.id && rejectReason.trim()) {
      toast.error(`Đã từ chối: ${item.description.slice(0, 40)}… — "${rejectReason}"`);
      removeItem(item.id);
      setRejectingId(null);
      setRejectReason("");
    } else {
      setRejectingId(item.id);
    }
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

  /* ═══ KPI card configs ═══ */
  const kpiCards = [
    {
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Demand",
      accentClass: "text-primary",
      bgClass: "bg-primary/5 border-primary/20",
      iconBgClass: "bg-primary/10",
      trend: { value: "+4,2%", direction: "up" as const },
      sub: "vs tháng trước",
      logicTab: "monthly" as const,
      logicNode: 0,
      logicTooltip: "Logic xác định Demand",
      clickable: {
        value: "7.650 m²",
        breakdown: [
          { label: "FC Statistical", value: 4800, pct: "63%" },
          { label: "B2B Weighted", value: 2200, pct: "29%" },
          { label: "PO Confirmed", value: 1100, pct: "14%" },
          { label: "Overlap", value: -450, pct: "-6%", color: "text-danger" },
        ],
        links: [{ label: "→ /demand tab 1", to: "/demand" }],
      },
    },
    {
      icon: <AlertTriangle className="h-5 w-5" />,
      label: "Exceptions",
      accentClass: "text-danger",
      bgClass: "bg-danger/5 border-danger/20",
      iconBgClass: "bg-danger/10",
      trend: { value: "+1", direction: "up" as const },
      sub: "hôm nay",
      clickable: {
        value: String(excCount),
        breakdown: [
          { label: "SHORTAGE CN-BD", value: "345m²" },
          { label: "PO_OVERDUE Toko", value: "8 ngày" },
          { label: "FC_DRIFT", value: "18,4%" },
        ],
        links: [
          { label: "→ /drp", to: "/drp" },
          { label: "→ /orders", to: "/orders" },
          { label: "→ /monitoring", to: "/monitoring" },
        ],
      },
    },
    {
      icon: <Package className="h-5 w-5" />,
      label: "HSTK",
      accentClass: "text-warning",
      bgClass: "bg-warning/5 border-warning/20",
      iconBgClass: "bg-warning/10",
      trend: { value: "−0,3d", direction: "down" as const },
      sub: "vs tuần trước",
      logicTab: "ss" as const,
      logicNode: 0,
      logicTooltip: "Logic Safety Stock",
      clickable: {
        value: "8,5d",
        breakdown: [
          { label: "CN-BD", value: "5,2d 🔴" },
          { label: "CN-ĐN", value: "14d" },
          { label: "CN-HN", value: "9d" },
          { label: "CN-CT", value: "11d" },
          { label: "Avg", value: "8,5d", color: "text-primary" },
        ],
        formula: "HSTK = Available ÷ daily_demand",
        links: [{ label: "→ /monitoring tab 2", to: "/monitoring" }],
      },
    },
    {
      icon: <Activity className="h-5 w-5" />,
      label: "FC Accuracy",
      accentClass: "text-success",
      bgClass: "bg-success/5 border-success/20",
      iconBgClass: "bg-success/10",
      trend: { value: "+2%", direction: "up" as const },
      sub: "vs tháng trước",
      logicTab: "forecast" as const,
      logicNode: 2,
      logicTooltip: "MAPE là gì?",
      clickable: {
        value: "82%",
        breakdown: [
          { label: "CN-BD MAPE", value: "12%" },
          { label: "CN-ĐN MAPE", value: "22%" },
          { label: "CN-HN MAPE", value: "31% 🔴" },
          { label: "CN-CT MAPE", value: "15%" },
          { label: "Avg accuracy", value: "82%", color: "text-primary" },
        ],
        links: [{ label: "→ /monitoring tab 3", to: "/monitoring" }],
      },
    },
  ];

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <h1 className="font-display text-screen-title text-text-1">Workspace</h1>
        {items.length > 0 && (
          <span className="rounded-full bg-danger text-primary-foreground text-caption font-bold px-2 py-0.5 min-w-[22px] text-center">
            {items.length}
          </span>
        )}
      </div>

      <div className="space-y-5">
        {/* ─── KPI HERO CARDS ─── */}
        <div className="grid grid-cols-4 gap-4" data-tour="workspace-kpi">
          {kpiCards.map((kpi) => (
            <div
              key={kpi.label}
              className={cn(
                "relative rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 group",
                kpi.bgClass
              )}
            >
              {/* Icon + Label row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn("rounded-lg p-1.5", kpi.iconBgClass, kpi.accentClass)}>
                    {kpi.icon}
                  </div>
                  <span className="text-table font-medium text-text-2 flex items-center gap-1">
                    {kpi.label}
                    {kpi.logicTab && <LogicLink tab={kpi.logicTab} node={kpi.logicNode!} tooltip={kpi.logicTooltip!} />}
                  </span>
                </div>
              </div>

              {/* Hero Number */}
              <div className="mb-2">
                <ClickableNumber
                  value={kpi.clickable.value}
                  label={kpi.label}
                  color={cn("font-display text-[26px] leading-none font-bold", kpi.accentClass)}
                  breakdown={kpi.clickable.breakdown}
                  formula={(kpi.clickable as any).formula}
                  links={kpi.clickable.links}
                />
              </div>

              {/* Trend + Sub */}
              <div className="flex items-center gap-1.5">
                {kpi.trend.direction === "up" ? (
                  <TrendingUp className={cn("h-3.5 w-3.5", kpi.label === "Exceptions" ? "text-danger" : "text-success")} />
                ) : (
                  <TrendingDown className={cn("h-3.5 w-3.5", kpi.label === "HSTK" ? "text-warning" : "text-danger")} />
                )}
                <span className={cn(
                  "text-caption font-semibold tabular-nums",
                  kpi.label === "Exceptions" && kpi.trend.direction === "up" ? "text-danger" :
                  kpi.trend.direction === "up" ? "text-success" : "text-warning"
                )}>
                  {kpi.trend.value}
                </span>
                <span className="text-caption text-text-3">{kpi.sub}</span>
              </div>

              {/* Subtle sparkline decoration */}
              <div className="absolute bottom-0 right-0 w-24 h-10 opacity-[0.07] overflow-hidden rounded-br-xl pointer-events-none">
                <svg viewBox="0 0 100 40" className={kpi.accentClass} fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={
                    kpi.label === "Demand" ? "M0,30 Q20,10 40,20 T80,15 L100,10" :
                    kpi.label === "Exceptions" ? "M0,35 Q25,30 45,20 T85,10 L100,5" :
                    kpi.label === "HSTK" ? "M0,15 Q20,25 50,20 T90,30 L100,28" :
                    "M0,30 Q30,15 50,20 T80,12 L100,8"
                  } />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* ─── SECTION 1: Cần làm ─── */}
        <div className="rounded-card border border-surface-3 bg-surface-2" data-tour="workspace-actions">
          <div className="px-5 py-3.5 border-b border-surface-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-body font-semibold text-text-1">Cần làm</h2>
              <LogicTooltip
                title="Priority Sort Rule"
                content={"Sắp xếp theo:\n 1. Severity: 🔴 Critical → 🟡 Warning → 🔵 Info\n 2. Cùng severity: theo thời gian (cũ nhất trước)\n 3. Cùng severity + thời gian: theo risk ₫ (cao nhất trước)\n Config tại /config → Notifications."}
              />
            </div>
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
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", dotColor[item.priority])} />
                <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium shrink-0", typeBadge[item.type].cls)}>
                  {typeBadge[item.type].label}
                </span>
                <span className="flex-1 text-table text-text-1 truncate">{item.description}</span>
                <span className="text-caption text-text-3 shrink-0">{item.time}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.type === "approve" && (
                    <>
                      <button onClick={() => handleApprove(item)} className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium">Duyệt</button>
                      <button onClick={() => handleReject(item)} className="rounded-button border border-surface-3 text-text-2 px-2.5 py-1 text-caption font-medium hover:text-danger hover:border-danger">Từ chối</button>
                      {rejectingId === item.id && (
                        <div className="flex items-center gap-1 ml-1">
                          <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleReject(item); }}
                            placeholder="Lý do..." autoFocus
                            className="w-28 h-6 rounded border border-surface-3 bg-surface-0 px-2 text-caption text-text-1 focus:outline-none focus:ring-1 focus:ring-primary" />
                          <VoiceInput onTranscript={(t) => setRejectReason((p) => p + t)} />
                        </div>
                      )}
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
      </div>
      <ScreenFooter actionCount={12} />
    </AppLayout>
  );
}

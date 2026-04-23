import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import {
  Package, Handshake, TrendingUp, Truck, FileText, ShieldCheck,
  Download, FileSpreadsheet, ChevronDown, ChevronUp, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
 *  Reports — 6 category cards. Each card shows an icon, VN title, one metric
 *  preview, and an inline "Xem →" expansion that reveals a small detail block
 *  (sample rows + Excel/PDF export buttons that fire toasts).
 * ──────────────────────────────────────────────────────────────────────────── */

interface ReportRow { label: string; value: string; }

interface Category {
  key: string;
  icon: typeof Package;
  title: string;
  subtitle: string;
  metric: { label: string; value: string; trend?: string; trendColor?: "success" | "warning" | "danger" };
  rows: ReportRow[];
  accent: "primary" | "success" | "warning" | "info" | "danger";
}

const CATEGORIES: Category[] = [
  {
    key: "inventory-ss",
    icon: Package,
    title: "Tồn kho & SS",
    subtitle: "Mức tồn kho, safety stock và DOH theo CN",
    metric: { label: "DOH bình quân", value: "21 ngày", trend: "−2 vs T-1", trendColor: "warning" },
    rows: [
      { label: "Tổng SKU theo dõi", value: "184" },
      { label: "SKU dưới SS", value: "12 (6.5%)" },
      { label: "Giá trị tồn kho", value: "₫48.2 tỷ" },
      { label: "DOH cao nhất", value: "CN-HCM · 38 ngày" },
    ],
    accent: "info",
  },
  {
    key: "nm-commitment",
    icon: Handshake,
    title: "Cam kết NM",
    subtitle: "Tỷ lệ honor commitment và counter-rate theo Nhà Máy",
    metric: { label: "Honor rate (T-1)", value: "92.4%", trend: "+1.8pp", trendColor: "success" },
    rows: [
      { label: "Tổng NM active", value: "23" },
      { label: "Counter rate >30%", value: "4 NM" },
      { label: "Trễ commitment", value: "2 NM (Toko, MK)" },
      { label: "Volume cam kết T", value: "84,200 m²" },
    ],
    accent: "success",
  },
  {
    key: "fc-mape",
    icon: TrendingUp,
    title: "Dự báo & MAPE",
    subtitle: "Forecast accuracy, FVA và best model per CN",
    metric: { label: "MAPE WAPE", value: "11.3%", trend: "−0.4pp vs T-1", trendColor: "success" },
    rows: [
      { label: "FVA dương", value: "16/19 CN (84%)" },
      { label: "Best model · AI", value: "13 CN" },
      { label: "Best model · HW", value: "6 CN" },
      { label: "Outlier MAPE >25%", value: "CN-CT, CN-VL" },
    ],
    accent: "primary",
  },
  {
    key: "transport",
    icon: Truck,
    title: "Vận tải",
    subtitle: "Lead time, on-time delivery và chi phí logistics",
    metric: { label: "On-time", value: "94.7%", trend: "+0.6pp", trendColor: "success" },
    rows: [
      { label: "Tổng chuyến T-1", value: "412" },
      { label: "Trễ >24h", value: "8 chuyến (1.9%)" },
      { label: "Chi phí TB / m²", value: "₫3,420" },
      { label: "Lane cao chi phí", value: "Long An → CT" },
    ],
    accent: "info",
  },
  {
    key: "po-lifecycle",
    icon: FileText,
    title: "PO Lifecycle",
    subtitle: "Vòng đời PO/TO từ draft → received với SLA tracking",
    metric: { label: "Lead time TB", value: "5.2 ngày", trend: "+0.3 vs target", trendColor: "warning" },
    rows: [
      { label: "PO active", value: "67" },
      { label: "Confirmed → Shipped", value: "TB 2.1 ngày" },
      { label: "Overdue (>ETA)", value: "5 PO" },
      { label: "POD chưa upload", value: "3 PO" },
    ],
    accent: "warning",
  },
  {
    key: "cn-trust",
    icon: ShieldCheck,
    title: "CN Trust",
    subtitle: "Trust score Chi Nhánh: data quality, override rate, response",
    metric: { label: "Trust score TB", value: "87.5/100", trend: "+1.2 vs T-1", trendColor: "success" },
    rows: [
      { label: "CN ≥ 90 điểm", value: "11/19 CN" },
      { label: "CN cảnh báo (<70)", value: "2 CN (CT, VL)" },
      { label: "Override rate cao", value: "CN-ĐL · 18%" },
      { label: "Response time TB", value: "3.4 giờ" },
    ],
    accent: "success",
  },
];

const ACCENT_CLASSES: Record<Category["accent"], { iconBg: string; iconColor: string; ring: string }> = {
  primary: { iconBg: "bg-primary/10", iconColor: "text-primary", ring: "hover:border-primary/40" },
  success: { iconBg: "bg-success/10", iconColor: "text-success", ring: "hover:border-success/40" },
  warning: { iconBg: "bg-warning/10", iconColor: "text-warning", ring: "hover:border-warning/40" },
  info: { iconBg: "bg-info/10", iconColor: "text-info", ring: "hover:border-info/40" },
  danger: { iconBg: "bg-danger/10", iconColor: "text-danger", ring: "hover:border-danger/40" },
};

const TREND_CLASSES: Record<NonNullable<Category["metric"]["trendColor"]>, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export default function ReportsPage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const handleExport = (cat: Category, format: "excel" | "pdf") => {
    const label = format === "excel" ? "Excel" : "PDF";
    toast.success(`Đang xuất ${label}: ${cat.title}`, {
      description: "File sẽ tải về sau ~3 giây (demo).",
    });
  };

  return (
    <AppLayout>
      <ScreenHeader
        title="Reports"
        subtitle="6 nhóm báo cáo — tồn kho, cam kết, dự báo, vận tải, PO, trust score"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {CATEGORIES.map(cat => {
          const isOpen = expanded.has(cat.key);
          const Icon = cat.icon;
          const accent = ACCENT_CLASSES[cat.accent];
          return (
            <div
              key={cat.key}
              className={cn(
                "rounded-card border border-surface-3 bg-surface-2 transition-all",
                accent.ring,
                isOpen && "ring-1 ring-primary/20",
              )}
            >
              {/* Card head */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn("h-10 w-10 rounded-button flex items-center justify-center shrink-0", accent.iconBg)}>
                    <Icon className={cn("h-5 w-5", accent.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-table font-semibold text-text-1 leading-tight">{cat.title}</h3>
                    <p className="text-caption text-text-3 mt-0.5 line-clamp-2">{cat.subtitle}</p>
                  </div>
                </div>

                {/* Metric preview */}
                <div className="mt-4 flex items-baseline justify-between gap-2 border-t border-surface-3 pt-3">
                  <div className="min-w-0">
                    <p className="text-caption uppercase tracking-wide text-text-3">{cat.metric.label}</p>
                    <p className="text-h3 font-bold text-text-1 mt-0.5 leading-none">{cat.metric.value}</p>
                  </div>
                  {cat.metric.trend && (
                    <span className={cn("text-table-sm font-medium", TREND_CLASSES[cat.metric.trendColor ?? "success"])}>
                      {cat.metric.trend}
                    </span>
                  )}
                </div>

                {/* Expand toggle */}
                <button
                  onClick={() => toggle(cat.key)}
                  className="mt-3 inline-flex items-center gap-1 text-table-sm font-medium text-primary hover:underline"
                >
                  {isOpen ? <>Thu gọn <ChevronUp className="h-3.5 w-3.5" /></> : <>Xem <ArrowRight className="h-3.5 w-3.5" /></>}
                </button>
              </div>

              {/* Inline expanded panel */}
              {isOpen && (
                <div className="border-t border-surface-3 bg-surface-1 px-4 py-3 animate-fade-in">
                  <ul className="space-y-1.5 mb-3">
                    {cat.rows.map((r, i) => (
                      <li key={i} className="flex items-center justify-between text-table-sm">
                        <span className="text-text-3">{r.label}</span>
                        <span className="font-medium text-text-1">{r.value}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 pt-2 border-t border-surface-3">
                    <button
                      onClick={() => handleExport(cat, "excel")}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-button border border-surface-3 bg-surface-2 text-table-sm font-medium text-text-2 hover:bg-surface-3 transition-colors"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
                      Excel
                    </button>
                    <button
                      onClick={() => handleExport(cat, "pdf")}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 rounded-button bg-gradient-primary text-primary-foreground text-table-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ScreenFooter actionCount={CATEGORIES.length * 2} />
    </AppLayout>
  );
}

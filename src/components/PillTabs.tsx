/**
 * PillTabs — chuẩn hoá kiểu tab "Pattern A" toàn app.
 *
 * Khi nào dùng:
 *  • 2-5 section cùng cấp, farmer chọn 1 để xem nội dung tương ứng.
 *  • KHÔNG dùng cho luồng tuần tự (đó là StepFlow), KHÔNG dùng cho pivot 2 chiều
 *    (đó là PivotToggle / ViewPivotToggle).
 *
 * Visual:
 *  • Pill rounded, active = filled primary với shadow nhẹ.
 *  • Inactive = surface-2 hover surface-3.
 *  • Hỗ trợ icon, badge số (12 CN), subBadge cảnh báo (1 thiếu).
 *
 * Áp dụng (theo UX-CONSISTENCY):
 *  • DRP Bước 3 (Phân bổ / Đóng container)
 *  • Gap & Kịch bản (Theo dõi / Mô phỏng)
 *  • Monitoring (7 tab chi tiết)
 *  • Executive drill (CN / SKU / NM / Xu hướng)
 *  • SOP (nếu giữ 2 tab)
 *
 * Mọi text ngoài mặc định = tiếng Việt.
 */
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PillTabSubColor = "danger" | "warning" | "success" | "info";

export interface PillTab {
  key: string;
  label: string;
  icon?: LucideIcon;
  /** Badge phụ kề label, vd "12 CN", "5 NM" — luôn hiện. */
  badge?: string | number;
  /** SubBadge cảnh báo, vd "1 thiếu", "2 fill thấp" — chỉ hiện khi có. */
  subBadge?: string | number;
  /** Màu subBadge — mặc định warning. */
  subColor?: PillTabSubColor;
  /** Tooltip hover title gốc. */
  title?: string;
}

interface Props {
  tabs: PillTab[];
  active: string;
  onChange: (key: string) => void;
  /** Cho phép wrap xuống dòng khi hết chỗ (mặc định true). */
  wrap?: boolean;
  /** Size: 'md' (default) hoặc 'sm' (cho Sheet drill). */
  size?: "md" | "sm";
  className?: string;
}

const SUB_COLOR: Record<PillTabSubColor, string> = {
  danger:  "bg-danger/15 text-danger",
  warning: "bg-warning/15 text-warning",
  success: "bg-success/15 text-success",
  info:    "bg-info/15 text-info",
};

const SUB_COLOR_ACTIVE: Record<PillTabSubColor, string> = {
  // Khi tab active (nền primary), subBadge dùng overlay trắng cho contrast.
  danger:  "bg-primary-foreground/20 text-primary-foreground",
  warning: "bg-primary-foreground/20 text-primary-foreground",
  success: "bg-primary-foreground/20 text-primary-foreground",
  info:    "bg-primary-foreground/20 text-primary-foreground",
};

export function PillTabs({
  tabs,
  active,
  onChange,
  wrap = true,
  size = "md",
  className,
}: Props) {
  const sizeCls = size === "sm"
    ? "px-3 py-1.5 text-table-sm"
    : "px-4 py-2 text-table";
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-2",
        wrap && "flex-wrap",
        !wrap && "overflow-x-auto",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const Icon = tab.icon;
        const subColor = tab.subColor ?? "warning";
        return (
          <button
            key={tab.key}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            title={tab.title}
            className={cn(
              "inline-flex items-center gap-2 rounded-full font-medium transition-all whitespace-nowrap",
              sizeCls,
              isActive
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : "bg-surface-2 text-text-2 hover:bg-surface-3 hover:text-text-1 border border-surface-3",
            )}
          >
            {Icon && <Icon className={iconSize} />}
            <span>{tab.label}</span>
            {tab.badge != null && tab.badge !== "" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  isActive ? "bg-primary-foreground/20" : "bg-surface-3 text-text-2",
                )}
              >
                {tab.badge}
              </span>
            )}
            {tab.subBadge != null && tab.subBadge !== "" && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                  isActive ? SUB_COLOR_ACTIVE[subColor] : SUB_COLOR[subColor],
                )}
              >
                {tab.subBadge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default PillTabs;

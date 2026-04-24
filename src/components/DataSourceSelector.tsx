/**
 * DataSourceSelector — dialog chuẩn 3 options cho MỌI điểm nhập dữ liệu.
 *
 * NGUYÊN TẮC: Mỗi nơi nhập dữ liệu vào hệ thống PHẢI dùng component này.
 * Không hardcode card riêng — đảm bảo UX nhất quán giữa FC, Tồn kho, B2B,
 * Cam kết NM, Bảng giá, Cước vận chuyển, etc.
 *
 * Tham khảo style: dialog "Nhập FC tháng" (DemandPage).
 */
import type { ReactNode } from "react";
import { ArrowRight, Settings2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface DataSource {
  /** Stable key, used by `onSelect`. */
  key: string;
  /** Lucide icon (or any node) — rendered 20px. */
  icon: ReactNode;
  /** Card title in Vietnamese. */
  title: string;
  /** 1–2 line description. */
  description: string;
  /** Optional badge: "Khuyến nghị", "Sắp có", "Beta", "Đang hoạt động", "Dự phòng"… */
  badge?: string;
  /** Visual color for the badge. */
  badgeColor?: "green" | "amber" | "gray" | "info" | "red";
  /** Disabled (e.g. "Sắp có" connectors) — opacity 50, no click. */
  disabled?: boolean;
  /** Show a "⚙ Cấu hình" button next to the row when true. */
  configurable?: boolean;
  /** Route used by the "⚙ Cấu hình" button. */
  configRoute?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  sources: DataSource[];
  onSelect: (sourceKey: string) => void;
}

const BADGE_TONE: Record<NonNullable<DataSource["badgeColor"]>, string> = {
  green: "bg-success-bg text-success border-success/30",
  amber: "bg-warning-bg text-warning border-warning/40",
  gray:  "bg-surface-1 text-text-3 border-surface-3",
  info:  "bg-info-bg text-info border-info/30",
  red:   "bg-danger-bg text-danger border-danger/30",
};

export function DataSourceSelector({
  open, onClose, title, description, sources, onSelect,
}: Props) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3">
          <DialogTitle className="font-display text-section-header text-text-1">
            {title}
          </DialogTitle>
          <DialogDescription className="text-table text-text-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-3">
          {sources.map((source) => {
            const tone = BADGE_TONE[source.badgeColor ?? "gray"];
            const clickable = !source.disabled;
            return (
              <div
                key={source.key}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : -1}
                onClick={() => clickable && onSelect(source.key)}
                onKeyDown={(e) => {
                  if (clickable && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelect(source.key);
                  }
                }}
                className={cn(
                  "group flex items-stretch gap-3 rounded-card border p-3 transition-all",
                  source.disabled
                    ? "border-surface-3 bg-surface-1/50 opacity-60 cursor-not-allowed"
                    : "border-surface-3 bg-surface-1 hover:border-primary hover:bg-primary/5 hover:shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40",
                )}
              >
                {/* Icon column */}
                <div className={cn(
                  "shrink-0 h-10 w-10 rounded-button flex items-center justify-center",
                  source.disabled
                    ? "bg-surface-2 text-text-3"
                    : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors",
                )}>
                  <div className="[&>svg]:h-5 [&>svg]:w-5">{source.icon}</div>
                </div>

                {/* Text column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-display font-semibold text-text-1 text-table truncate">
                      {source.title}
                    </span>
                    {source.badge && (
                      <span className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap",
                        tone,
                      )}>
                        {source.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-table-sm text-text-2 leading-snug">
                    {source.description}
                  </p>
                </div>

                {/* Action column */}
                <div className="shrink-0 flex items-center gap-1.5 self-center">
                  {source.configurable && source.configRoute && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                        navigate(source.configRoute!);
                      }}
                      className="h-8 px-2 rounded-button border border-surface-3 bg-surface-2 text-text-2 text-[11px] font-medium inline-flex items-center gap-1 hover:bg-surface-1 hover:text-text-1 transition-colors"
                      title="Cấu hình kết nối"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                      Cấu hình
                    </button>
                  )}
                  {!source.disabled && (
                    <span className="h-8 w-8 rounded-button bg-surface-2 text-text-3 group-hover:bg-primary group-hover:text-primary-foreground flex items-center justify-center transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3 border-t border-surface-3 bg-surface-1/60">
          <p className="text-caption text-text-3 leading-snug">
            💡 Mỗi lần chọn 1 nguồn = 1 entry mới trong nhật ký nhập liệu. Bạn có thể đổi nguồn bất kỳ lúc nào.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * EmptyState — placeholder cho bảng/list rỗng.
 *
 * Thay vì "No data" trống, hiển thị:
 *   • Icon biểu cảm
 *   • Tiêu đề + mô tả lý do
 *   • CTA (Call-to-action) — nút hành động chính
 *   • Liên kết phụ tới docs/scenarios
 *
 * Có 4 preset:
 *   • "no-data"        — chưa có data nào (fresh state)
 *   • "filtered-out"   — filter loại hết (gợi ý đổi filter)
 *   • "search-empty"   — tìm không thấy
 *   • "error"          — load lỗi (gợi ý thử lại)
 */
import { ReactNode } from "react";
import { Inbox, FilterX, SearchX, AlertCircle, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStatePreset = "no-data" | "filtered-out" | "search-empty" | "error";

interface Props {
  preset?: EmptyStatePreset;
  /** Override icon */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** Nút chính */
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  /** Liên kết phụ */
  secondary?: {
    label: string;
    onClick: () => void;
  };
  /** Nhỏ gọn (cho dùng inside table) */
  compact?: boolean;
  className?: string;
}

const PRESET_META: Record<EmptyStatePreset, { icon: ReactNode; tone: string }> = {
  "no-data":      { icon: <Inbox className="h-12 w-12" />,      tone: "text-text-3" },
  "filtered-out": { icon: <FilterX className="h-12 w-12" />,    tone: "text-warning" },
  "search-empty": { icon: <SearchX className="h-12 w-12" />,    tone: "text-info" },
  "error":        { icon: <AlertCircle className="h-12 w-12" />, tone: "text-danger" },
};

export function EmptyState({
  preset = "no-data",
  icon,
  title,
  description,
  action,
  secondary,
  compact = false,
  className,
}: Props) {
  const meta = PRESET_META[preset];
  const finalIcon = icon ?? meta.icon;

  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center",
      compact ? "py-8 px-4" : "py-16 px-6",
      className,
    )}>
      <div className={cn(
        "mb-3 flex items-center justify-center rounded-full",
        compact ? "h-12 w-12" : "h-16 w-16",
        "bg-surface-2",
        meta.tone,
      )}>
        <div className={cn(compact && "[&_svg]:h-8 [&_svg]:w-8")}>{finalIcon}</div>
      </div>

      <h3 className={cn(
        "font-display font-semibold text-text-1",
        compact ? "text-table-base" : "text-section-header",
      )}>
        {title}
      </h3>

      {description && (
        <p className={cn(
          "mt-1 text-text-3 max-w-md",
          compact ? "text-caption" : "text-table-sm",
        )}>
          {description}
        </p>
      )}

      {(action || secondary) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {action && (
            <Button onClick={action.onClick} size={compact ? "sm" : "default"}>
              {action.icon ?? <Plus className="h-4 w-4 mr-1" />}
              {action.label}
            </Button>
          )}
          {secondary && (
            <Button variant="ghost" size={compact ? "sm" : "default"} onClick={secondary.onClick}>
              {secondary.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Preset builders ─────────────────────────────────────────────
   Tiện hơn khi dùng tại nhiều chỗ — text + icon đã chuẩn tiếng Việt.
   ─────────────────────────────────────────────────────────────── */

export function NoDataEmpty({ entityName, onAdd, onImport }: {
  entityName: string;
  onAdd?: () => void;
  onImport?: () => void;
}) {
  return (
    <EmptyState
      preset="no-data"
      title={`Chưa có ${entityName} nào`}
      description={`Thêm ${entityName.toLowerCase()} đầu tiên hoặc nhập từ Excel/API để bắt đầu.`}
      action={onAdd ? { label: `+ Thêm ${entityName}`, onClick: onAdd } : undefined}
      secondary={onImport ? { label: "📥 Nhập từ Excel", onClick: onImport } : undefined}
    />
  );
}

export function FilterEmpty({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState
      preset="filtered-out"
      title="Không có dòng nào khớp filter"
      description="Thử bỏ bớt filter hoặc chọn 'Xem tất cả' để xem toàn bộ data."
      action={{ label: "Xoá filter", onClick: onClear, icon: <RotateCcw className="h-4 w-4 mr-1" /> }}
    />
  );
}

export function SearchEmpty({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <EmptyState
      preset="search-empty"
      title={`Không tìm thấy "${query}"`}
      description="Thử từ khoá khác, hoặc kiểm tra chính tả."
      action={{ label: "Xoá tìm kiếm", onClick: onClear, icon: <RotateCcw className="h-4 w-4 mr-1" /> }}
    />
  );
}

export function ErrorEmpty({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  return (
    <EmptyState
      preset="error"
      title="Không tải được dữ liệu"
      description={message ?? "Có lỗi khi kết nối backend. Thử lại sau ít phút."}
      action={onRetry ? { label: "Thử lại", onClick: onRetry, icon: <RotateCcw className="h-4 w-4 mr-1" /> } : undefined}
    />
  );
}

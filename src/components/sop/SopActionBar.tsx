/**
 * SopActionBar — Hành động cuối table (gộp "Cân đối & Khóa" thay tab riêng).
 *
 * Theo SOP-REDESIGN: 3 nhóm action gọn — Giải trình · Cân đối · Khóa.
 * Không trùng số liệu với cards trên (chỉ ngữ cảnh + CTA).
 */
import { useState } from "react";
import { Lock, AlertCircle, Send, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  totalV3: number;
  totalAop: number;
  unresolvedVariance: number;
  totalCn: number;
  currentDay: number;
  lockDay?: number;
  autoLockDay?: number;
  locked: boolean;
  onLock: () => void;
  /** Slot tuỳ chọn cho phần cân đối chi tiết (BalanceLockTab cũ) */
  detailSlot?: React.ReactNode;
}

export function SopActionBar({
  totalV3,
  totalAop,
  unresolvedVariance,
  totalCn,
  currentDay,
  lockDay = 7,
  autoLockDay = 10,
  locked,
  onLock,
  detailSlot,
}: Props) {
  const [showDetail, setShowDetail] = useState(false);

  const variancePct = totalAop > 0 ? Math.round(((totalV3 - totalAop) / totalAop) * 100) : 0;
  const explainedCount = Math.max(0, totalCn - unresolvedVariance);
  const daysToLock = Math.max(0, lockDay - currentDay);
  const canLock = unresolvedVariance === 0 && !locked;

  return (
    <section className="mt-6 rounded-card border border-surface-3 bg-surface-1/40 overflow-hidden">
      <header className="px-5 py-3 border-b border-surface-3 bg-surface-1/60">
        <h2 className="text-headline-3 font-semibold text-text-1">Hành động</h2>
      </header>

      <div className="divide-y divide-surface-3">
        {/* Hàng 1 — Giải trình */}
        <div className="px-5 py-4 flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <div className="flex items-center gap-2 text-table-sm text-text-2">
              <span className="font-medium text-text-1">Giải trình:</span>
              <span className={cn(
                "tabular-nums font-semibold",
                unresolvedVariance > 0 ? "text-danger" : "text-success",
              )}>
                {explainedCount}/{totalCn} CN
              </span>
              <span>{unresolvedVariance > 0 ? "🔴" : "✅"}</span>
            </div>
            {unresolvedVariance > 0 && (
              <p className="text-caption text-text-3 mt-0.5">
                Còn {unresolvedVariance} CN chênh lệch &gt;10% chưa giải trình.
              </p>
            )}
          </div>
          <button
            disabled={unresolvedVariance === 0}
            onClick={() => toast.success(`Đã gửi yêu cầu giải trình cho ${unresolvedVariance} CN`, {
              description: "Notification qua Zalo + email — phản hồi trong 24h.",
            })}
            className="rounded-button border border-surface-3 bg-surface-0 px-3.5 py-2 text-table-sm font-medium text-text-1 inline-flex items-center gap-1.5 hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Gửi yêu cầu giải trình {unresolvedVariance > 0 && `cho ${unresolvedVariance} CN`}
          </button>
        </div>

        {/* Hàng 2 — Cân đối */}
        <div className="px-5 py-4 flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <div className="text-table-sm text-text-2">
              <span className="font-medium text-text-1">Cân đối:</span>{" "}
              v3 <span className="tabular-nums font-semibold text-text-1">{totalV3.toLocaleString("vi-VN")}</span>{" "}
              vs AOP <span className="tabular-nums font-semibold text-text-1">{totalAop.toLocaleString("vi-VN")}</span>{" "}
              <span className={cn(
                "tabular-nums font-semibold",
                Math.abs(variancePct) > 10 ? "text-danger" : "text-text-2",
              )}>
                ({variancePct >= 0 ? "+" : ""}{variancePct}%)
              </span>
            </div>
            <p className="text-caption text-text-3 mt-0.5">
              Đề xuất phân bổ AOP theo CN dựa trên trọng số lịch sử + commitment NM.
            </p>
          </div>
          <button
            onClick={() => {
              setShowDetail((v) => !v);
              if (!showDetail) toast.info("Mở Cân đối chi tiết — Demand → Supply Bridge");
            }}
            className="rounded-button border border-surface-3 bg-surface-0 px-3.5 py-2 text-table-sm font-medium text-text-1 inline-flex items-center gap-1.5 hover:border-primary hover:text-primary transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {showDetail ? "Ẩn cân đối chi tiết" : "Đề xuất cân đối"}
            {showDetail ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Hàng 3 — Khóa */}
        <div className="px-5 py-4 flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-[260px]">
            <div className="text-table-sm text-text-2">
              <span className="font-medium text-text-1">Khóa:</span>{" "}
              Ngày {currentDay}/30 · Khóa ngày {lockDay} · Còn{" "}
              <span className={cn(
                "tabular-nums font-semibold",
                daysToLock <= 2 ? "text-warning" : "text-text-1",
              )}>
                {daysToLock} ngày
              </span>
            </div>
            <p className="text-caption text-warning mt-0.5 inline-flex items-start gap-1">
              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
              <span>
                Tự khóa: Nếu chưa khóa trước ngày {autoLockDay}, hệ thống sẽ tự khóa dùng FC gốc (v0)
                thay vì consensus (v3).
              </span>
            </p>
          </div>
          <button
            disabled={!canLock}
            onClick={onLock}
            className={cn(
              "rounded-button px-4 py-2 text-table-sm font-semibold inline-flex items-center gap-1.5 transition-colors",
              locked
                ? "bg-success-bg text-success cursor-default"
                : canLock
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  : "bg-surface-2 text-text-3 cursor-not-allowed",
            )}
            title={
              locked
                ? "Đã khóa"
                : canLock
                  ? "Khóa S&OP v3 — chuyển sang giai đoạn cam kết NM"
                  : `Cần giải trình ${unresolvedVariance} CN trước khi khóa`
            }
          >
            <Lock className="h-3.5 w-3.5" />
            {locked ? "Đã khóa S&OP v3" : "Khóa S&OP v3"}
          </button>
        </div>

        {/* Cân đối chi tiết — collapsible (BalanceLockTab cũ) */}
        {showDetail && detailSlot && (
          <div className="border-t border-surface-3 bg-surface-0 p-5">
            {detailSlot}
          </div>
        )}
      </div>
    </section>
  );
}

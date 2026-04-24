/**
 * DrpCalcSummaryLine — 1-line tóm tắt 10 bước tính toán DRP cho Bước 3.
 *
 * Thay 11 ô zigzag / 10 boxes. Farmer KHÔNG cần biết 10 bước; chỉ cần xem dòng
 * tóm tắt "Nhu cầu 31.632 → Trừ tồn → ... → NM 4/5 PASS". Click bất kỳ token →
 * popup chi tiết bước đó (tận dụng StepDetail cũ qua callback).
 *
 * Mọi text tiếng Việt.
 */
import { cn } from "@/lib/utils";

export interface CalcToken {
  /** ID step để map sang StepDetail */
  stepId: number;
  /** Ngắn — vd "Nhu cầu 31.632" hoặc "→ LCNB 555" */
  label: string;
  /** Severity nhẹ để màu hint */
  severity?: "ok" | "warn" | "danger";
}

interface Props {
  tokens: CalcToken[];
  onClickToken: (stepId: number) => void;
  className?: string;
}

export function DrpCalcSummaryLine({ tokens, onClickToken, className }: Props) {
  return (
    <div
      className={cn(
        "rounded border border-surface-3 bg-surface-1/60 px-3 py-2 text-caption leading-relaxed",
        className
      )}
    >
      <div className="text-text-3 mb-1 text-[10px] uppercase tracking-wider font-semibold">
        10 bước tính toán (nhấn để xem chi tiết)
      </div>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-text-2">
        {tokens.map((t, i) => (
          <button
            key={`${t.stepId}-${i}`}
            type="button"
            onClick={() => onClickToken(t.stepId)}
            className={cn(
              "rounded px-1.5 py-0.5 text-table-sm tabular-nums hover:bg-primary/10 hover:text-primary transition-colors",
              t.severity === "ok" && "text-success",
              t.severity === "warn" && "text-warning",
              t.severity === "danger" && "text-danger",
              !t.severity && "text-text-1"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default DrpCalcSummaryLine;

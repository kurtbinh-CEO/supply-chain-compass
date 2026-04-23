import { useNavigate } from "react-router-dom";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NEXT_STEPS, useNextStep, type NextStepKey } from "@/components/NextStepContext";

/* ─────────────────────────────────────────────────────────────────────────────
 *  NextStepBanner — green confirmation strip with a CTA to the next screen.
 *  Only renders when the corresponding key is marked done AND not dismissed.
 *
 *  Usage:
 *    const { markDone } = useNextStep();
 *    // After the screen's key action succeeds:
 *    markDone("sop.locked");
 *    // In JSX, just before <ScreenFooter />:
 *    <NextStepBanner step="sop.locked" />
 * ──────────────────────────────────────────────────────────────────────────── */

interface Props {
  step: NextStepKey;
  /** Optional override of the route to navigate to. */
  routeOverride?: string;
  className?: string;
}

export function NextStepBanner({ step, routeOverride, className }: Props) {
  const { isDone, dismiss } = useNextStep();
  const navigate = useNavigate();
  if (!isDone(step)) return null;

  const cfg = NEXT_STEPS[step];
  const icon = cfg.icon ?? "✅";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "mt-6 rounded-card border border-success/40 bg-gradient-to-r from-success/10 via-success/5 to-transparent",
        "px-5 py-3.5 flex items-center gap-4 animate-fade-in shadow-sm shadow-success/10",
        className,
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success/15 text-lg shrink-0">
        <span aria-hidden>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-table font-semibold text-success leading-tight">
          {cfg.label}
          <span className="text-text-2 font-normal"> → {cfg.ctaLabel}</span>
        </p>
        {cfg.hint && <p className="text-caption text-text-3 mt-0.5">{cfg.hint}</p>}
      </div>
      <button
        onClick={() => navigate(routeOverride ?? cfg.ctaRoute)}
        className="inline-flex items-center gap-1.5 rounded-button bg-success text-white px-4 py-2 text-table-sm font-semibold hover:bg-success/90 shadow-sm shadow-success/20 transition-colors shrink-0"
      >
        {cfg.ctaLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => dismiss(step)}
        className="text-text-3 hover:text-text-1 transition-colors p-1.5 rounded-button hover:bg-surface-3 shrink-0"
        aria-label="Đóng"
        title="Đóng"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

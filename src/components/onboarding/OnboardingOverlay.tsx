import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useOnboarding } from "./OnboardingContext";
import { X, ChevronLeft, ChevronRight, Check, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * M23 — OnboardingOverlay
 *
 * Render spotlight + tooltip cho bước hiện tại của activeTour.
 * Dùng portal vào body để overlay luôn trên top.
 */

interface Rect { top: number; left: number; width: number; height: number }

const PADDING = 8;

export function OnboardingOverlay() {
  const { activeTour, currentStep, nextStep, prevStep, finishTour, skipTour } = useOnboarding();
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: string } | null>(null);

  const step = activeTour?.steps[currentStep];

  // Recompute rect on step change, scroll, resize
  useLayoutEffect(() => {
    if (!step) {
      setRect(null);
      setTooltipPos(null);
      return;
    }

    let raf = 0;
    const update = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.target}"]`);
      if (!el) {
        setRect(null);
        setTooltipPos(null);
        return;
      }
      // scroll into view (smooth) — chỉ một lần khi step đổi
      const r = el.getBoundingClientRect();
      const newRect = {
        top: r.top - PADDING,
        left: r.left - PADDING,
        width: r.width + PADDING * 2,
        height: r.height + PADDING * 2,
      };
      setRect(newRect);

      // Compute tooltip placement
      const tooltipW = 340;
      const tooltipH = 180;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const margin = 14;

      let placement = step.placement || "auto";
      let top = 0, left = 0;

      const fitsBelow = newRect.top + newRect.height + margin + tooltipH < vh;
      const fitsRight = newRect.left + newRect.width + margin + tooltipW < vw;
      const fitsAbove = newRect.top - margin - tooltipH > 0;

      if (placement === "auto") {
        placement = fitsBelow ? "bottom" : fitsAbove ? "top" : fitsRight ? "right" : "left";
      }

      switch (placement) {
        case "bottom":
          top = newRect.top + newRect.height + margin;
          left = Math.min(Math.max(newRect.left + newRect.width / 2 - tooltipW / 2, 16), vw - tooltipW - 16);
          break;
        case "top":
          top = newRect.top - margin - tooltipH;
          left = Math.min(Math.max(newRect.left + newRect.width / 2 - tooltipW / 2, 16), vw - tooltipW - 16);
          break;
        case "right":
          top = Math.min(Math.max(newRect.top + newRect.height / 2 - tooltipH / 2, 16), vh - tooltipH - 16);
          left = newRect.left + newRect.width + margin;
          break;
        case "left":
          top = Math.min(Math.max(newRect.top + newRect.height / 2 - tooltipH / 2, 16), vh - tooltipH - 16);
          left = newRect.left - margin - tooltipW;
          break;
      }
      setTooltipPos({ top, left, placement });
    };

    update();

    // Scroll target into view first time
    const el = document.querySelector<HTMLElement>(`[data-tour-id="${step.target}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });

    const onChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onChange, true);
    window.addEventListener("resize", onChange);
    return () => {
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
      cancelAnimationFrame(raf);
    };
  }, [step?.target, currentStep]);

  // Keyboard nav
  useEffect(() => {
    if (!activeTour) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipTour();
      else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (currentStep === activeTour.steps.length - 1) finishTour();
        else nextStep();
      } else if (e.key === "ArrowLeft") prevStep();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTour, currentStep, nextStep, prevStep, finishTour, skipTour]);

  if (!activeTour || !step) return null;

  const isLast = currentStep === activeTour.steps.length - 1;
  const total = activeTour.steps.length;

  return createPortal(
    <div className="fixed inset-0 z-[9999] pointer-events-none" aria-live="polite">
      {/* Backdrop with spotlight cutout */}
      {rect ? (
        <svg
          className="fixed inset-0 w-full h-full pointer-events-auto"
          onClick={skipTour}
        >
          <defs>
            <mask id="onboarding-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx="10"
                ry="10"
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(15,23,42,0.65)" mask="url(#onboarding-mask)" />
          {/* Animated ring around target */}
          <rect
            x={rect.left}
            y={rect.top}
            width={rect.width}
            height={rect.height}
            rx="10"
            ry="10"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            className="animate-pulse"
          />
        </svg>
      ) : (
        // Target không tìm thấy — vẫn hiển thị tooltip ở giữa với backdrop mờ
        <div className="fixed inset-0 bg-surface-1/70 pointer-events-auto" onClick={skipTour} />
      )}

      {/* Tooltip card */}
      <div
        className="fixed pointer-events-auto rounded-card border border-primary/30 bg-surface-2 shadow-2xl p-4 w-[340px] animate-fade-in"
        style={
          tooltipPos
            ? { top: tooltipPos.top, left: tooltipPos.left }
            : { top: "50%", left: "50%", transform: "translate(-50%,-50%)" }
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary">
              <GraduationCap className="h-3.5 w-3.5" />
            </div>
            <span className="text-caption font-semibold uppercase tracking-wider text-primary">
              {activeTour.name}
            </span>
          </div>
          <button
            onClick={skipTour}
            className="rounded-full p-1 text-text-3 hover:text-text-1 hover:bg-surface-3 transition-colors"
            aria-label="Đóng"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <h3 className="font-display text-section-header text-text-1 mb-1">{step.title}</h3>
        <p className="text-table-sm text-text-2 leading-relaxed">{step.description}</p>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mt-4 mb-3">
          {activeTour.steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === currentStep ? "w-6 bg-primary" : i < currentStep ? "w-1.5 bg-primary/50" : "w-1.5 bg-surface-3"
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={skipTour}
            className="text-caption text-text-3 hover:text-text-1 transition-colors"
          >
            Bỏ qua hướng dẫn
          </button>
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="inline-flex items-center gap-1 rounded-button border border-surface-3 px-2.5 py-1.5 text-caption text-text-2 hover:bg-surface-3 transition-colors"
              >
                <ChevronLeft className="h-3 w-3" />
                Trước
              </button>
            )}
            {isLast ? (
              <button
                onClick={finishTour}
                className="inline-flex items-center gap-1 rounded-button bg-primary px-3 py-1.5 text-caption font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Check className="h-3 w-3" />
                Hoàn tất ({currentStep + 1}/{total})
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="inline-flex items-center gap-1 rounded-button bg-primary px-3 py-1.5 text-caption font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Tiếp ({currentStep + 1}/{total})
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

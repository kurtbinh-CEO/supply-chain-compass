import { useWalkthrough } from "./WalkthroughContext";
import { X, BookOpen, ArrowLeft, ChevronLeft, ChevronRight, Eye, SkipForward } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface SpotlightRect {
  top: number; left: number; width: number; height: number;
}

export function WalkthroughOverlay() {
  const { active, currentHighlight, dismiss, nextHighlight, prevHighlight, hasNextFlowStep, nextFlowStep, flowSteps, flowIndex } = useWalkthrough();
  const navigate = useNavigate();
  const [spotRect, setSpotRect] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; arrowSide: "top" | "bottom" } | null>(null);
  const rafRef = useRef<number>(0);

  const hasHighlights = active?.highlights && active.highlights.length > 0;
  const currentHL = hasHighlights ? active!.highlights![currentHighlight] : null;
  const totalSteps = hasHighlights ? active!.highlights!.length : 0;

  const findAndPosition = useCallback(() => {
    if (!currentHL) { setSpotRect(null); setTooltipPos(null); return; }
    const el = document.querySelector(`[data-tour="${currentHL.selector}"]`) as HTMLElement | null;
    if (!el) { setSpotRect(null); setTooltipPos(null); return; }

    const rect = el.getBoundingClientRect();
    const pad = 8;
    const sr = {
      top: rect.top - pad, left: rect.left - pad,
      width: rect.width + pad * 2, height: rect.height + pad * 2,
    };
    setSpotRect(sr);

    // Tooltip positioning
    const tooltipW = 320;
    const tooltipH = 120;
    let tLeft = sr.left + sr.width / 2 - tooltipW / 2;
    tLeft = Math.max(12, Math.min(tLeft, window.innerWidth - tooltipW - 12));

    if (sr.top > tooltipH + 24) {
      setTooltipPos({ top: sr.top - tooltipH - 16, left: tLeft, arrowSide: "bottom" });
    } else {
      setTooltipPos({ top: sr.top + sr.height + 16, left: tLeft, arrowSide: "top" });
    }

    // Scroll into view
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentHL]);

  useEffect(() => {
    if (!active) return;
    // Delay to let page render
    const timer = setTimeout(findAndPosition, 400);
    const handleScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(findAndPosition);
    };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [active, currentHighlight, findAndPosition]);

  if (!active) return null;

  // No highlights mode — show simple panel
  if (!hasHighlights) {
    return (
      <>
        <div className="fixed inset-0 bg-black/20 z-[90] animate-fade-in" onClick={dismiss} />
        <div className="fixed top-16 right-6 z-[91] w-[400px] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-card border border-primary/30 bg-surface-0 shadow-xl animate-fade-in">
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-3 bg-primary/5">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="font-display text-table font-semibold text-primary">Hướng dẫn</span>
              <span className="rounded-sm bg-primary/10 text-primary text-caption font-medium px-1.5 py-0.5">{active.badge}</span>
            </div>
            <button onClick={dismiss} className="p-1 rounded-md hover:bg-surface-3 transition-colors">
              <X className="h-4 w-4 text-text-3" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-4">
            <h3 className="font-display text-body font-semibold text-text-1 mb-1">{active.route} — {active.title}</h3>
            <div className="rounded-md bg-[#00714d]/5 p-3">
              <h4 className="text-table-sm font-semibold text-[#00714d] mb-1">📋 LÀM GÌ</h4>
              <p className="text-table-sm text-text-2 whitespace-pre-wrap leading-relaxed">{active.what}</p>
            </div>
            <div className="rounded-md bg-[#b45309]/5 p-3">
              <h4 className="text-table-sm font-semibold text-[#b45309] mb-1">🔧 CÁCH LÀM</h4>
              <p className="text-table-sm text-text-2 whitespace-pre-wrap leading-relaxed">{active.how}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 border-t border-surface-3">
            <button onClick={() => { dismiss(); navigate("/guide"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-table-sm font-medium text-text-2 hover:bg-surface-3 transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Guide
            </button>
            <div className="flex-1" />
            <button onClick={dismiss}
              className="px-3 py-1.5 rounded-button bg-primary text-primary-foreground text-table-sm font-medium hover:bg-primary/90 transition-colors">
              Đã hiểu ✓
            </button>
          </div>
        </div>
      </>
    );
  }

  // Highlight mode — spotlight + tooltip sequence
  return (
    <>
      {/* Spotlight overlay with cutout */}
      <svg className="fixed inset-0 z-[90] pointer-events-none" style={{ width: "100vw", height: "100vh" }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {spotRect && (
              <rect
                x={spotRect.left} y={spotRect.top}
                width={spotRect.width} height={spotRect.height}
                rx={8} fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.45)" mask="url(#tour-mask)" />
      </svg>

      {/* Click catcher — clicking outside dismisses */}
      <div className="fixed inset-0 z-[91]" onClick={dismiss} />

      {/* Pulse ring around highlighted element */}
      {spotRect && (
        <div
          className="fixed z-[92] pointer-events-none rounded-lg"
          style={{
            top: spotRect.top, left: spotRect.left,
            width: spotRect.width, height: spotRect.height,
          }}
        >
          {/* Outer pulse ring */}
          <div className="absolute inset-0 rounded-lg border-2 border-primary animate-[tour-pulse_2s_ease-in-out_infinite]" />
          {/* Inner glow ring */}
          <div className="absolute -inset-1 rounded-lg border border-primary/40 animate-[tour-pulse_2s_ease-in-out_infinite_0.3s]" />
          {/* Subtle fill glow */}
          <div className="absolute inset-0 rounded-lg bg-primary/5" />
        </div>
      )}

      {/* Tooltip */}
      {tooltipPos && currentHL && (
        <div
          className="fixed z-[93] animate-scale-in"
          style={{ top: tooltipPos.top, left: tooltipPos.left, width: 320 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow */}
          {tooltipPos.arrowSide === "bottom" && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-surface-0 border-r border-b border-primary/30" />
          )}
          {tooltipPos.arrowSide === "top" && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-surface-0 border-l border-t border-primary/30" />
          )}

          <div className="rounded-xl border border-primary/30 bg-surface-0 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-b border-surface-3">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span className="text-table font-semibold text-primary">{active.title}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-caption text-text-3 font-mono">{currentHighlight + 1}/{totalSteps}</span>
                <button onClick={dismiss} className="p-0.5 rounded hover:bg-surface-3 transition-colors">
                  <X className="h-3.5 w-3.5 text-text-3" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 py-3">
              <h4 className="text-table font-semibold text-text-1 mb-1">{currentHL.label}</h4>
              <p className="text-table-sm text-text-2 leading-relaxed">{currentHL.description}</p>
            </div>

            {/* Progress dots + nav */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-surface-3 bg-surface-1/30">
              <button
                onClick={prevHighlight}
                disabled={currentHighlight === 0}
                className={cn("flex items-center gap-1 px-2 py-1 rounded-button text-caption font-medium transition-colors",
                  currentHighlight === 0 ? "text-text-3 cursor-not-allowed" : "text-text-2 hover:bg-surface-3"
                )}
              >
                <ChevronLeft className="h-3 w-3" /> Trước
              </button>

              {/* Dots */}
              <div className="flex items-center gap-1.5">
                {active.highlights!.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { /* goToHighlight via context would be cleaner but we use nextHighlight/prevHighlight */ }}
                    className={cn("h-1.5 rounded-full transition-all",
                      i === currentHighlight ? "w-4 bg-primary" : "w-1.5 bg-surface-3"
                    )}
                  />
                ))}
              </div>

              {currentHighlight < totalSteps - 1 ? (
                <button
                  onClick={nextHighlight}
                  className="flex items-center gap-1 px-2 py-1 rounded-button bg-primary text-primary-foreground text-caption font-medium hover:bg-primary/90 transition-colors"
                >
                  Tiếp <ChevronRight className="h-3 w-3" />
                </button>
              ) : hasNextFlowStep ? (
                <button
                  onClick={() => {
                    const next = nextFlowStep();
                    if (next) {
                      const navRoute = next.route.split(" ")[0];
                      navigate(navRoute);
                    }
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-button bg-[#00714d] text-white text-caption font-medium hover:bg-[#00714d]/90 transition-colors"
                >
                  <SkipForward className="h-3 w-3" />
                  Bước tiếp ({flowSteps[flowIndex + 1]?.title})
                </button>
              ) : (
                <button
                  onClick={dismiss}
                  className="flex items-center gap-1 px-2 py-1 rounded-button bg-primary text-primary-foreground text-caption font-medium hover:bg-primary/90 transition-colors"
                >
                  Hoàn tất ✓
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Back to guide + flow progress */}
      <div className="fixed bottom-6 right-6 z-[94] flex items-center gap-2">
        {flowSteps.length > 1 && (
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-0 border border-surface-3 shadow-lg">
            {flowSteps.map((s, i) => (
              <div
                key={i}
                className={cn("h-2 rounded-full transition-all",
                  i === flowIndex ? "w-5 bg-primary" : i < flowIndex ? "w-2 bg-primary/40" : "w-2 bg-surface-3"
                )}
                title={s.title}
              />
            ))}
            <span className="text-caption text-text-3 ml-1.5 font-mono">{flowIndex + 1}/{flowSteps.length}</span>
          </div>
        )}
        <button
          onClick={() => { dismiss(); navigate("/guide"); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-0 border border-surface-3 shadow-lg text-table-sm font-medium text-text-2 hover:text-text-1 hover:shadow-xl transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Guide
        </button>
      </div>
    </>
  );
}

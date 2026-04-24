/**
 * WorkflowFooter — "Bước tiếp" navigation cuối mỗi screen.
 *
 * Hiện CHỈ khi WorkflowBar đang active (workflowType !== null) và
 * route hiện tại nằm trong workflow. Click "Bước trước" / "Bước tiếp" →
 * navigate + cập nhật currentStep trong WorkflowContext.
 *
 * Đặt trước <ScreenFooter /> ở mỗi page.
 */
import { useWorkflow } from "@/components/WorkflowContext";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function WorkflowFooter() {
  const {
    workflowType, isBarVisible, steps, currentStepIndex,
    completedSteps, goToStep, nextStep,
  } = useWorkflow();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isBarVisible || steps.length === 0) return null;

  // Chỉ hiện nếu route hiện tại match step nào đó
  const onWorkflowRoute = steps.some((s) => s.routes.includes(location.pathname));
  if (!onWorkflowRoute) return null;

  const isDaily = workflowType === "daily";
  const accentClass = isDaily ? "text-primary" : "text-info";
  const accentBg    = isDaily ? "bg-primary"   : "bg-info";

  const prev = currentStepIndex > 0 ? steps[currentStepIndex - 1] : null;
  const next = currentStepIndex < steps.length - 1 ? steps[currentStepIndex + 1] : null;
  const isLast = currentStepIndex === steps.length - 1;
  const currentDone = completedSteps.includes(currentStepIndex);

  const handlePrev = () => {
    if (!prev) return;
    if (goToStep(currentStepIndex - 1)) {
      navigate(prev.routes[0]);
    }
  };

  const handleNext = () => {
    // Mark current done + advance
    nextStep();
    if (next) navigate(next.routes[0]);
  };

  return (
    <div
      className={cn(
        "mt-6 flex items-center justify-between gap-4 rounded-card border border-surface-3 px-5 py-3",
        currentDone ? "bg-success/5" : "bg-surface-1",
      )}
    >
      {/* Prev */}
      <div className="flex-1 min-w-0">
        {prev ? (
          <button
            onClick={handlePrev}
            className="inline-flex items-center gap-2 text-table-sm text-text-2 hover:text-text-1 transition-colors group"
          >
            <ChevronLeft className="h-4 w-4 text-text-3 group-hover:-translate-x-0.5 transition-transform" />
            <span className="text-text-3">Bước trước:</span>
            <span className="font-medium truncate">{prev.label}</span>
          </button>
        ) : (
          <span className="text-table-sm text-text-3">Bước đầu tiên</span>
        )}
      </div>

      {/* Status pill */}
      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
        <span className={cn("h-1.5 w-1.5 rounded-full", accentBg)} />
        <span className="text-caption text-text-3 tabular-nums">
          {currentStepIndex + 1}/{steps.length}
        </span>
      </div>

      {/* Next */}
      <div className="flex-1 min-w-0 flex justify-end">
        <button
          onClick={handleNext}
          className={cn(
            "inline-flex items-center gap-2 rounded-button px-4 py-1.5 text-table-sm font-semibold transition-all group",
            isLast
              ? "bg-success text-white hover:bg-success/90 shadow-sm"
              : isDaily
                ? "bg-primary text-white hover:bg-primary/90 shadow-sm"
                : "bg-info text-white hover:bg-info/90 shadow-sm",
          )}
        >
          {isLast ? (
            <>
              <span>Hoàn tất phiên</span>
              <Check className="h-4 w-4" />
            </>
          ) : (
            <>
              <span className="opacity-80">Bước tiếp:</span>
              <span className="truncate max-w-[160px]">{next?.label}</span>
              <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default WorkflowFooter;

import { useWorkflow } from "@/components/WorkflowContext";
import { useNavigate } from "react-router-dom";
import { X, ChevronRight, Check } from "lucide-react";

export function WorkflowBar() {
  const { isBarVisible, steps, currentStepIndex, completed, nextStep, closeWorkflow, goToStep } = useWorkflow();
  const navigate = useNavigate();

  if (!isBarVisible) return null;

  const handleNext = () => {
    nextStep();
    const nextIdx = currentStepIndex + 1;
    if (nextIdx < steps.length) {
      navigate(steps[nextIdx].routes[0]);
    }
  };

  const handleStepClick = (index: number) => {
    goToStep(index);
    navigate(steps[index].routes[0]);
  };

  if (completed) {
    return (
      <div className="h-12 bg-success-bg border-b border-surface-3 flex items-center justify-between px-6 animate-slide-down">
        <div className="flex items-center gap-2 text-success text-body font-medium">
          <Check className="h-4 w-4" />
          <span>Hoàn tất · {steps.length}/{steps.length}</span>
        </div>
        <button onClick={closeWorkflow} className="text-success hover:opacity-70 transition-opacity">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-12 bg-surface-2 border-b border-surface-3 flex items-center gap-3 px-6 animate-slide-down">
      {/* Step chips */}
      <div className="flex items-center gap-1.5">
        {steps.map((step, i) => (
          <button
            key={i}
            onClick={() => handleStepClick(i)}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-medium transition-colors ${
              step.status === "done"
                ? "bg-success-bg text-success"
                : step.status === "active"
                ? "bg-primary text-primary-foreground"
                : "bg-transparent border border-surface-3 text-text-3"
            }`}
          >
            {step.status === "done" ? (
              <Check className="h-3 w-3" />
            ) : step.status === "active" ? (
              <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full border border-text-3" />
            )}
            <span className="hidden lg:inline">{step.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Progress text */}
      <span className="text-table-sm text-text-2">
        Bước {currentStepIndex + 1}/{steps.length} · {steps[currentStepIndex]?.label}
      </span>

      {/* Next button */}
      <button
        onClick={handleNext}
        className="inline-flex items-center gap-1 bg-gradient-primary text-primary-foreground rounded-button px-3 py-1.5 text-table-sm font-medium hover:opacity-90 transition-opacity"
      >
        {currentStepIndex < steps.length - 1 ? "Tiếp" : "Hoàn tất"}
        <ChevronRight className="h-3 w-3" />
      </button>

      {/* Close */}
      <button onClick={closeWorkflow} className="text-text-3 hover:text-text-1 transition-colors p-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

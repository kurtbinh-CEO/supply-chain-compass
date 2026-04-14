import { useWorkflow } from "@/components/WorkflowContext";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";

export function WorkflowLeaveDialog() {
  const { showLeaveConfirm, pendingNavigation, confirmLeave, cancelLeave, workflowType, currentStepIndex, steps, completedSteps } = useWorkflow();
  const navigate = useNavigate();

  if (!showLeaveConfirm) return null;

  const isDaily = workflowType === "daily";
  const remaining = steps.length - completedSteps.length;

  const handleConfirm = () => {
    confirmLeave();
    if (pendingNavigation) {
      navigate(pendingNavigation);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-text-1/40 z-50 animate-fade-in" onClick={cancelLeave} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[440px] rounded-card bg-surface-2 border border-surface-3 shadow-xl animate-scale-in">
        <div className="p-6 space-y-4">
          {/* Icon */}
          <div className={`flex items-center justify-center h-12 w-12 rounded-full ${isDaily ? "bg-primary/10" : "bg-info/10"}`}>
            <AlertTriangle className={`h-6 w-6 ${isDaily ? "text-primary" : "text-info"}`} />
          </div>

          {/* Title */}
          <div>
            <h3 className="font-display text-section-header text-text-1">Rời khỏi phiên làm việc?</h3>
            <p className="text-table text-text-2 mt-1">
              Bạn đang ở bước <strong>{currentStepIndex + 1}/{steps.length}</strong> của workflow{" "}
              <span className={`font-semibold ${isDaily ? "text-primary" : "text-info"}`}>
                {isDaily ? "Vận hành ngày" : "Kế hoạch tháng"}
              </span>.
              Còn <strong>{remaining} bước</strong> chưa hoàn tất.
            </p>
          </div>

          {/* Current progress */}
          <div className="flex items-center gap-1.5">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step.status === "done"
                    ? "bg-success"
                    : step.status === "active"
                      ? (isDaily ? "bg-primary" : "bg-info")
                      : "bg-surface-3"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={cancelLeave}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-button px-4 py-2.5 text-table font-semibold transition-colors ${
                isDaily
                  ? "bg-primary text-white hover:bg-primary/90"
                  : "bg-info text-white hover:bg-info/90"
              }`}
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại workflow
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-button border border-surface-3 bg-surface-2 px-4 py-2.5 text-table font-medium text-text-2 hover:bg-surface-3 transition-colors"
            >
              Rời đi
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-caption text-text-3 text-center">
            Workflow sẽ vẫn hoạt động. Bạn có thể quay lại từ sidebar.
          </p>
        </div>
      </div>
    </>
  );
}

import { useWorkflow } from "@/components/WorkflowContext";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nContext";

export function WorkflowLeaveDialog() {
  const { showLeaveConfirm, pendingNavigation, confirmLeave, cancelLeave, workflowType, currentStepIndex, steps, completedSteps } = useWorkflow();
  const navigate = useNavigate();
  const { t } = useI18n();

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
          <div className={`flex items-center justify-center h-12 w-12 rounded-full ${isDaily ? "bg-primary/10" : "bg-info/10"}`}>
            <AlertTriangle className={`h-6 w-6 ${isDaily ? "text-primary" : "text-info"}`} />
          </div>

          <div>
            <h3 className="font-display text-section-header text-text-1">{t("wf.leaveTitle")}</h3>
            <p className="text-table text-text-2 mt-1">
              {t("wf.leaveDesc")} <strong>{currentStepIndex + 1}/{steps.length}</strong> {t("wf.leaveOf")}{" "}
              <span className={`font-semibold ${isDaily ? "text-primary" : "text-info"}`}>
                {isDaily ? t("wf.dailyOps") : t("wf.monthlyPlan")}
              </span>.
              {" "}<strong>{remaining}</strong> {t("wf.leaveRemaining")}
            </p>
          </div>

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
              {t("wf.backToWorkflow")}
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-button border border-surface-3 bg-surface-2 px-4 py-2.5 text-table font-medium text-text-2 hover:bg-surface-3 transition-colors"
            >
              {t("wf.leave")}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <p className="text-caption text-text-3 text-center">
            {t("wf.leaveNote")}
          </p>
        </div>
      </div>
    </>
  );
}

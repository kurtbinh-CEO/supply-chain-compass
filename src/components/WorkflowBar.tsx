import { useWorkflow } from "@/components/WorkflowContext";
import { useNavigate } from "react-router-dom";
import { X, ChevronRight, Check, Lock, Clock, Zap, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useI18n } from "@/components/i18n/I18nContext";

function SessionTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startTime]);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return (
    <span className="inline-flex items-center gap-1 text-caption text-text-3 tabular-nums">
      <Clock className="h-3 w-3" />
      {m}:{String(s).padStart(2, "0")}
    </span>
  );
}

export function WorkflowBar() {
  const {
    workflowType, isBarVisible, steps, currentStepIndex, completed, completedSteps,
    sessionStartTime, nextStep, closeWorkflow, goToStep, isStepUnlocked,
  } = useWorkflow();
  const navigate = useNavigate();
  const { t } = useI18n();

  if (!isBarVisible) return null;

  const isDaily = workflowType === "daily";
  const accentColor = isDaily ? "primary" : "info";
  const progress = completed ? 100 : ((completedSteps.length) / steps.length) * 100;

  const handleNext = () => {
    nextStep();
    const nextIdx = currentStepIndex + 1;
    if (nextIdx < steps.length) {
      navigate(steps[nextIdx].routes[0]);
    }
  };

  const handleStepClick = (index: number) => {
    if (!isStepUnlocked(index) && !completedSteps.includes(index)) return;
    const ok = goToStep(index);
    if (ok) navigate(steps[index].routes[0]);
  };

  if (completed) {
    return (
      <div className="relative overflow-hidden border-b border-surface-3">
        <div className="absolute inset-0 bg-gradient-to-r from-success/5 to-success/10" />
        <div className="relative flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-success text-white">
              <Check className="h-4 w-4" />
            </div>
            <div>
              <p className="text-table font-semibold text-success">{t("wf.sessionComplete")}</p>
              <p className="text-caption text-text-3">{steps.length}/{steps.length} · {t("wf.allDone")}</p>
            </div>
          </div>
          <button onClick={closeWorkflow} className="text-text-3 hover:text-text-1 transition-colors p-1.5 rounded-button hover:bg-surface-3">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-b border-surface-3 bg-surface-1">
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-surface-3">
        <div
          className={cn("h-full transition-all duration-500 ease-out", isDaily ? "bg-primary" : "bg-info")}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-4 px-6 py-2.5">
        <div className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1 text-caption font-semibold shrink-0",
          isDaily ? "bg-primary/10 text-primary" : "bg-info/10 text-info"
        )}>
          {isDaily ? <Zap className="h-3 w-3" /> : <CalendarDays className="h-3 w-3" />}
          {isDaily ? t("wf.dailyOps") : t("wf.monthlyPlan")}
        </div>

        <div className="flex items-center gap-0.5 flex-1">
          {steps.map((step, i) => {
            const isDone = step.status === "done";
            const isActive = step.status === "active";
            const isLocked = step.status === "locked";

            return (
              <div key={i} className="flex items-center">
                {i > 0 && (
                  <div className={cn(
                    "w-8 h-[2px] mx-0.5 transition-colors",
                    isDone || (isActive && completedSteps.includes(i - 1)) ? (isDaily ? "bg-primary" : "bg-info") : "bg-surface-3"
                  )} />
                )}
                <button
                  onClick={() => handleStepClick(i)}
                  disabled={isLocked}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-3 py-1.5 text-table-sm font-medium transition-all relative",
                    isDone && "text-success hover:bg-success/5",
                    isActive && (isDaily
                      ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                      : "bg-info/10 text-info ring-1 ring-info/20"),
                    !isDone && !isActive && !isLocked && "text-text-3 hover:text-text-2 hover:bg-surface-3",
                    isLocked && "text-text-3/50 cursor-not-allowed opacity-60",
                  )}
                >
                  <span className={cn(
                    "flex items-center justify-center h-5 w-5 rounded-full text-caption font-bold shrink-0 transition-all",
                    isDone && "bg-success text-white",
                    isActive && (isDaily ? "bg-primary text-white" : "bg-info text-white"),
                    !isDone && !isActive && !isLocked && "border border-surface-3 text-text-3",
                    isLocked && "border border-surface-3/50 text-text-3/50",
                  )}>
                    {isDone ? <Check className="h-3 w-3" /> : isLocked ? <Lock className="h-2.5 w-2.5" /> : i + 1}
                  </span>
                  <span className="hidden xl:inline whitespace-nowrap">{step.label}</span>
                  {isLocked && (
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-text-1 text-surface-0 text-caption px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {t("wf.completeBefore").replace("{n}", String(i))}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {sessionStartTime && <SessionTimer startTime={sessionStartTime} />}
          <span className="text-caption text-text-3">{completedSteps.length}/{steps.length}</span>
          <button
            onClick={handleNext}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-button px-4 py-1.5 text-table-sm font-semibold transition-all",
              isDaily
                ? "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20"
                : "bg-info text-white hover:bg-info/90 shadow-sm shadow-info/20"
            )}
          >
            {currentStepIndex < steps.length - 1 ? (
              <>{t("wf.completeStep")} <ChevronRight className="h-3 w-3" /></>
            ) : (
              <>{t("wf.completeSession")} <Check className="h-3 w-3" /></>
            )}
          </button>
          <button onClick={closeWorkflow} className="text-text-3 hover:text-text-1 transition-colors p-1.5 rounded-button hover:bg-surface-3">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

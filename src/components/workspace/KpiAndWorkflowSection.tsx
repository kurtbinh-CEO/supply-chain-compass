import { useEffect, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { useWorkflow } from "@/components/WorkflowContext";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, CalendarDays, Check, Clock, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardKpis {
  demand: string;
  exceptions: string;
  hstk: string;
  forecastAccuracy: string;
}

function useDashboardKpis() {
  const [kpis, setKpis] = useState<DashboardKpis>({
    demand: "7.650m²",
    exceptions: "3",
    hstk: "12d",
    forecastAccuracy: "82%",
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setKpis((prev) => ({ ...prev }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return kpis;
}

function ActiveWorkflowProgress({ isDaily }: { isDaily: boolean }) {
  const { steps, currentStepIndex, completedSteps, sessionStartTime } = useWorkflow();
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!sessionStartTime) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStartTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [sessionStartTime]);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full animate-pulse", isDaily ? "bg-primary" : "bg-info")} />
          <span className={cn("text-table-sm font-semibold", isDaily ? "text-primary" : "text-info")}>
            Phiên đang chạy
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-caption text-text-3 tabular-nums">
          <Clock className="h-3 w-3" />
          {m}:{String(s).padStart(2, "0")}
        </span>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((step, i) => {
          const isDone = completedSteps.includes(i);
          const isActive = i === currentStepIndex;
          return (
            <button
              key={i}
              onClick={() => {
                if (isDone || isActive) navigate(step.routes[0]);
              }}
              className={cn(
                "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                isDone && "bg-success/5 hover:bg-success/10",
                isActive && (isDaily ? "bg-primary/10 ring-1 ring-primary/20" : "bg-info/10 ring-1 ring-info/20"),
                !isDone && !isActive && "opacity-50 cursor-not-allowed",
              )}
            >
              <span className={cn(
                "flex items-center justify-center h-6 w-6 rounded-full text-caption font-bold shrink-0",
                isDone && "bg-success text-white",
                isActive && (isDaily ? "bg-primary text-white" : "bg-info text-white"),
                !isDone && !isActive && "border border-surface-3 text-text-3",
              )}>
                {isDone ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-table font-medium", isDone ? "text-success" : isActive ? "text-text-1" : "text-text-3")}>
                  {step.label}
                </p>
                <p className="text-caption text-text-3">{step.description}</p>
              </div>
              {isActive && (
                <ArrowRight className={cn("h-4 w-4 shrink-0", isDaily ? "text-primary" : "text-info")} />
              )}
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1.5">
        {steps.map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              completedSteps.includes(i) ? "bg-success" : i === currentStepIndex ? (isDaily ? "bg-primary" : "bg-info") : "bg-surface-3",
            )}
          />
        ))}
      </div>

      <button
        onClick={() => navigate(steps[currentStepIndex].routes[0])}
        className={cn(
          "w-full inline-flex items-center justify-center gap-2 rounded-button py-2.5 text-table font-semibold transition-all",
          isDaily
            ? "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20"
            : "bg-info text-white hover:bg-info/90 shadow-sm shadow-info/20",
        )}
      >
        Tiếp tục bước {currentStepIndex + 1}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function KpiAndWorkflowSection() {
  const kpis = useDashboardKpis();
  const { workflowType, startWorkflow } = useWorkflow();
  const navigate = useNavigate();

  const handleStartDaily = () => {
    startWorkflow("daily");
    navigate("/supply");
  };

  const handleStartMonthly = () => {
    startWorkflow("monthly");
    navigate("/demand");
  };

  const isDailyActive = workflowType === "daily";
  const isMonthlyActive = workflowType === "monthly";

  return (
    <div className="space-y-4">
      {/* KPI Summary */}
      <h2 className="font-display text-section-header text-text-1">Tóm tắt hiệu năng</h2>
      <div className="grid grid-cols-4 gap-4">
        <KpiCard title="Demand" value={kpis.demand} />
        <KpiCard title="Exceptions" value={kpis.exceptions} className="[&_.font-display]:text-danger" />
        <KpiCard title="HSTK (DIO)" value={kpis.hstk} />
        <KpiCard title="Forecast Accuracy" value={kpis.forecastAccuracy} className="[&_.font-display]:text-warning" />
      </div>

      {/* Workflow CTA */}
      <div className="grid grid-cols-2 gap-4">
        {/* Daily */}
        <div className={cn(
          "rounded-card overflow-hidden transition-all",
          isDailyActive ? "border border-primary/30 bg-surface-2" : "bg-surface-2 border border-surface-3",
        )}>
          {isDailyActive ? (
            <div className="p-5">
              <ActiveWorkflowProgress isDaily={true} />
            </div>
          ) : (
            <div
              className="p-5 cursor-pointer hover:bg-surface-1 transition-colors group"
              onClick={handleStartDaily}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-table-sm font-semibold text-text-3 uppercase tracking-wider">Hàng ngày</p>
                  <p className="font-display text-section-header text-text-1">Vận hành ngày</p>
                </div>
              </div>
              <p className="text-table text-text-2 mb-4">
                NM Supply → Demand & Adjust → DRP & Orders
              </p>
              <div className="flex items-center gap-2 text-table text-text-3 mb-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg text-danger text-caption font-medium px-2 py-0.5">
                  12 đầu việc
                </span>
                <span className="text-caption">·</span>
                <span className="text-caption">~25 phút</span>
              </div>
              <button className="w-full inline-flex items-center justify-center gap-2 rounded-button bg-primary text-white py-2.5 text-table font-semibold hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20 group-hover:shadow-md group-hover:shadow-primary/30">
                <Play className="h-4 w-4" />
                Bắt đầu phiên
              </button>
            </div>
          )}
        </div>

        {/* Monthly */}
        <div className={cn(
          "rounded-card overflow-hidden transition-all",
          isMonthlyActive ? "border border-info/30 bg-surface-2" : "bg-surface-2 border border-surface-3",
        )}>
          {isMonthlyActive ? (
            <div className="p-5">
              <ActiveWorkflowProgress isDaily={false} />
            </div>
          ) : (
            <div
              className="p-5 cursor-pointer hover:bg-surface-1 transition-colors group"
              onClick={handleStartMonthly}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-info/10">
                  <CalendarDays className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-table-sm font-semibold text-text-3 uppercase tracking-wider">Hàng tháng</p>
                  <p className="font-display text-section-header text-text-1">Kế hoạch tháng</p>
                </div>
              </div>
              <p className="text-table text-text-2 mb-4">
                Demand Review → S&OP Consensus → Hub & Commitment
              </p>
              <div className="flex items-center gap-2 text-table text-text-3 mb-4">
                <span className="inline-flex items-center gap-1 rounded-full bg-info-bg text-info text-caption font-medium px-2 py-0.5">
                  Chu kỳ T5
                </span>
                <span className="text-caption">·</span>
                <span className="text-caption">~45 phút</span>
              </div>
              <button className="w-full inline-flex items-center justify-center gap-2 rounded-button bg-info text-white py-2.5 text-table font-semibold hover:bg-info/90 transition-colors shadow-sm shadow-info/20 group-hover:shadow-md group-hover:shadow-info/30">
                <Play className="h-4 w-4" />
                Khởi động chu kỳ
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

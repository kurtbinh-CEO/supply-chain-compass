import { useEffect, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { useWorkflow } from "@/components/WorkflowContext";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Rocket, Play } from "lucide-react";
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
      // Simulated auto-refresh — in real app, would fetch from API
      setKpis((prev) => ({ ...prev }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return kpis;
}

export function KpiAndWorkflowSection() {
  const kpis = useDashboardKpis();
  const { workflowType, currentStepIndex, steps, startWorkflow } = useWorkflow();
  const navigate = useNavigate();

  const handleStartDaily = () => {
    startWorkflow("daily");
    navigate("/supply");
  };

  const handleStartMonthly = () => {
    startWorkflow("monthly");
    navigate("/demand");
  };

  const handleContinue = () => {
    if (steps[currentStepIndex]) {
      navigate(steps[currentStepIndex].routes[0]);
    }
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
        <div
          className={cn(
            "rounded-card p-6 cursor-pointer transition-all",
            isDailyActive
              ? "border-2 border-primary bg-surface-2"
              : "bg-gradient-primary text-primary-foreground"
          )}
          onClick={isDailyActive ? handleContinue : handleStartDaily}
        >
          {isDailyActive ? (
            <div className="space-y-2">
              <span className="text-table-sm font-semibold text-primary">Workflow hàng ngày</span>
              <p className="font-display text-section-header text-text-1 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                Đang chạy — Bước {currentStepIndex + 1}/{steps.length}
              </p>
              <p className="text-table text-text-2">{steps[currentStepIndex]?.label}</p>
              <button className="inline-flex items-center gap-1.5 mt-2 rounded-button bg-gradient-primary text-primary-foreground px-4 py-2 text-table font-medium">
                Tiếp tục <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-table-sm font-semibold opacity-80">Workflow hàng ngày</span>
              <p className="font-display text-screen-title">Bắt đầu vận hành ngày</p>
              <p className="text-table opacity-80">Xử lý 12 đầu việc tồn đọng và cập nhật báo cáo buổi sáng.</p>
              <button className="inline-flex items-center gap-1.5 mt-2 rounded-button border border-white/30 bg-white/10 px-4 py-2 text-table font-medium hover:bg-white/20 transition-colors">
                Tiếp tục <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Monthly */}
        <div
          className={cn(
            "rounded-card p-6 cursor-pointer transition-all",
            isMonthlyActive
              ? "border-2 border-info bg-surface-2"
              : "bg-info text-primary-foreground"
          )}
          onClick={isMonthlyActive ? handleContinue : handleStartMonthly}
        >
          {isMonthlyActive ? (
            <div className="space-y-2">
              <span className="text-table-sm font-semibold text-info">Workflow chiến lược</span>
              <p className="font-display text-section-header text-text-1 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-info animate-pulse" />
                Đang chạy — Bước {currentStepIndex + 1}/{steps.length}
              </p>
              <p className="text-table text-text-2">{steps[currentStepIndex]?.label}</p>
              <button className="inline-flex items-center gap-1.5 mt-2 rounded-button bg-info text-primary-foreground px-4 py-2 text-table font-medium">
                Tiếp tục <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-table-sm font-semibold opacity-80">Workflow chiến lược</span>
              <p className="font-display text-screen-title">Bắt đầu kế hoạch tháng</p>
              <p className="text-table opacity-80">Khởi tạo quy trình S&OP và Consensus Forecast cho chu kỳ mới.</p>
              <button className="inline-flex items-center gap-1.5 mt-2 rounded-button border border-white/30 bg-white/10 px-4 py-2 text-table font-medium hover:bg-white/20 transition-colors">
                Khởi động <Rocket className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

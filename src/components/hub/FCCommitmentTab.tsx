import { useState } from "react";
import { useTenant } from "@/components/TenantContext";
import { getCommitments, kpiCards } from "./hubData";
import { StatusChip } from "@/components/StatusChip";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CheckCircle, AlertTriangle, Clock, Package, FileText } from "lucide-react";

const statusMap: Record<string, "success" | "danger" | "warning" | "info"> = {
  Confirmed: "success",
  Rejected: "danger",
  "In Review": "info",
  Pending: "warning",
};

const workflowSteps = [
  { label: "Draft FC", done: true },
  { label: "Allocation", done: true },
  { label: "FC Commitment", active: true },
  { label: "Gap Monitor", done: false },
  { label: "Final Confirmation", done: false },
];

export function FCCommitmentTab() {
  const { tenant } = useTenant();
  const commitments = getCommitments(tenant);
  const navigate = useNavigate();
  const [reminded, setReminded] = useState<Set<string>>(new Set());

  const handleRemind = (id: string, name: string) => {
    setReminded((p) => new Set(p).add(id));
    toast.success(`Đã gửi nhắc nhở tới ${name}`, { description: "Thông báo email + in-app đã được gửi." });
  };

  const handleEscalate = (name: string) => {
    toast.info(`Escalating ${name} → Workspace`, { description: "Chuyển đến approval queue." });
    navigate("/workspace");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-screen-title text-text-1">FC Commitment Workflow</h2>
          <p className="text-table text-text-2">Reviewing supplier capacity commitments for the upcoming production cycle.</p>
        </div>
        <button className="rounded-button bg-gradient-primary text-primary-foreground px-4 py-2 text-table-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4" /> Finalize Commitments
        </button>
      </div>

      {/* Timeline */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
        <div className="flex items-center justify-between">
          {workflowSteps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <div className="flex flex-col items-center gap-1">
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center border-2",
                  step.done ? "bg-success-bg border-success text-success" :
                  step.active ? "bg-gradient-primary border-primary text-primary-foreground" :
                  "bg-surface-1 border-surface-3 text-text-3"
                )}>
                  {step.done ? <CheckCircle className="h-5 w-5" /> :
                   step.active ? <Package className="h-5 w-5" /> :
                   <span className="h-2 w-2 rounded-full bg-surface-3" />}
                </div>
                <span className={cn("text-caption", step.active ? "text-primary font-semibold" : step.done ? "text-success" : "text-text-3")}>{step.label}</span>
              </div>
              {i < workflowSteps.length - 1 && (
                <div className={cn("h-0.5 w-10 lg:w-16", step.done ? "bg-success" : "bg-surface-3")} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main grid: Table + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Commitment Table */}
        <div className="lg:col-span-2 rounded-card border border-surface-3 bg-surface-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
            <h3 className="font-display text-section-header text-text-1">NM × 3 Tiers Commitment</h3>
            <div className="flex gap-3 text-table-sm">
              <span className="text-primary cursor-pointer hover:underline">Export CSV</span>
              <span className="text-primary cursor-pointer hover:underline">View All Nodes</span>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                {["FACTORY NODE (NM)", "TIER STATUS", "M+1 COMMIT", "M+2 COMMIT", "STATUS", ""].map((h) => (
                  <th key={h} className="px-5 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commitments.map((c) => (
                <tr key={c.id} className="border-b border-surface-3/50 hover:bg-surface-1/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="text-table font-medium text-text-1">{c.factory}</div>
                    <div className="text-caption text-text-3">{c.code}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center rounded px-2 py-0.5 text-caption font-bold text-primary bg-info-bg border border-primary/20">
                      TIER {c.tier}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-table tabular-nums text-text-1">{c.m1Commit.toLocaleString()} units</td>
                  <td className="px-5 py-3 text-table tabular-nums text-text-2">
                    {c.m2Commit ? `${c.m2Commit.toLocaleString()} units` : "Pending..."}
                  </td>
                  <td className="px-5 py-3">
                    <StatusChip status={statusMap[c.status]} label={c.status} />
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {(c.status === "Rejected" || c.status === "Pending") && (
                        <>
                          <button
                            onClick={() => handleRemind(c.id, c.factory)}
                            disabled={reminded.has(c.id)}
                            className={cn("rounded-button border px-3 py-1 text-caption font-medium transition-colors",
                              reminded.has(c.id) ? "border-surface-3 text-text-3 cursor-not-allowed" : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            )}
                          >
                            {reminded.has(c.id) ? "Đã nhắc" : "Nhắc"}
                          </button>
                          <button
                            onClick={() => handleEscalate(c.factory)}
                            className="rounded-button border border-danger text-danger px-3 py-1 text-caption font-medium hover:bg-danger hover:text-primary-foreground transition-colors"
                          >
                            Escalate
                          </button>
                        </>
                      )}
                      {c.status === "Rejected" && (
                        <button className="rounded-button bg-danger text-primary-foreground px-3 py-1 text-caption font-medium">
                          Tìm NM thay thế
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Alert sidebar */}
        <div className="space-y-4">
          {commitments.filter((c) => c.alertType).map((c) => (
            <div key={c.id} className={cn("rounded-card border p-4",
              c.alertType === "rejected" ? "border-danger/30 bg-danger-bg" : "border-warning/30 bg-warning-bg"
            )}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className={cn("h-5 w-5", c.alertType === "rejected" ? "text-danger" : "text-warning")} />
                <h4 className={cn("font-display text-body font-semibold", c.alertType === "rejected" ? "text-danger" : "text-warning")}>
                  {c.alertType === "rejected" ? "✕ Rejected — capacity thiếu" : `⚠ Overdue 3d`}
                </h4>
              </div>
              <p className="text-table text-text-2 mb-3">{c.alertMsg}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRemind(c.id, c.factory)}
                  className={cn("rounded-button px-3 py-1.5 text-caption font-medium",
                    c.alertType === "rejected" ? "bg-danger text-primary-foreground" : "bg-warning text-primary-foreground"
                  )}
                >
                  {c.alertType === "rejected" ? "Tìm NM thay thế" : "Nhắc"}
                </button>
                <button
                  onClick={() => handleEscalate(c.factory)}
                  className="rounded-button border border-surface-3 bg-surface-2 text-text-1 px-3 py-1.5 text-caption font-medium hover:border-primary/40 transition-colors"
                >
                  {c.alertType === "rejected" ? "Chi tiết lỗi" : "Escalate"}
                </button>
              </div>
            </div>
          ))}

          {/* System Anomaly */}
          <div className="rounded-card bg-text-1 text-primary-foreground p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-table-header uppercase text-text-3">SYSTEM ANOMALY</span>
              <span className="bg-danger text-primary-foreground text-caption font-bold px-2 py-0.5 rounded">CRITICAL</span>
            </div>
            <div className="text-kpi font-bold mb-1">0/5 <span className="text-body font-normal text-text-3">commit completed</span></div>
            <p className="text-table text-text-3 mb-4">No commitments have been secured for the T5 electronics sub-category. Immediate curation required.</p>
            <div className="space-y-2">
              {["Initiate Renegotiation", "Find New NM (Global Search)"].map((a) => (
                <button key={a} className="w-full flex items-center justify-between rounded-button bg-surface-2/10 border border-surface-2/20 px-4 py-2.5 text-table-sm text-primary-foreground hover:bg-surface-2/20 transition-colors">
                  {a} <span>›</span>
                </button>
              ))}
              <button className="w-full flex items-center justify-between rounded-button bg-danger/80 px-4 py-2.5 text-table-sm text-primary-foreground font-medium">
                Escalate to Regional Director <span>!</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {kpiCards.map((k) => (
          <div key={k.label} className={cn("rounded-card border border-surface-3 p-5", `bg-${k.color}-bg`)}>
            <div className="flex items-center gap-2 mb-1">
              {k.color === "success" ? <CheckCircle className="h-5 w-5 text-success" /> :
               k.color === "warning" ? <AlertTriangle className="h-5 w-5 text-warning" /> :
               <Clock className="h-5 w-5 text-info" />}
              <span className="text-table-sm text-text-2">{k.label}</span>
            </div>
            <div className={cn("text-kpi tabular-nums", `text-${k.color}`)}>{k.value}</div>
            <span className={cn("text-caption", `text-${k.color}`)}>{k.delta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

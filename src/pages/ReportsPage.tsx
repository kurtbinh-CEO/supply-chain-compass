import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { FileText, Download, Clock, ChevronDown, ChevronUp, Plus, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";

interface ReportDef {
  name: string;
  frequency: string;
  lastGen: string;
  actions: { label: string; icon: "pdf" | "excel" }[];
  auto: boolean;
}

const reports: ReportDef[] = [
  { name: "Demand summary per NM", frequency: "Monthly Day 1", lastGen: "01/05 08:00", actions: [{ label: "Tạo PDF", icon: "pdf" }, { label: "Tạo Excel", icon: "excel" }], auto: false },
  { name: "S&OP consensus + FVA", frequency: "Monthly Day 7", lastGen: "07/05 14:32", actions: [{ label: "Tạo PDF", icon: "pdf" }], auto: false },
  { name: "Commitment gap", frequency: "Monthly Day 20,25,28", lastGen: "20/04", actions: [{ label: "Tạo PDF", icon: "pdf" }], auto: false },
  { name: "DRP netting summary", frequency: "Nightly auto", lastGen: "13/05 23:15", actions: [{ label: "Tải Excel", icon: "excel" }], auto: true },
  { name: "Allocation per CN", frequency: "Nightly auto", lastGen: "13/05 23:20", actions: [{ label: "Tải Excel", icon: "excel" }], auto: true },
  { name: "PO release summary", frequency: "Daily digest", lastGen: "13/05 08:00", actions: [{ label: "Tải PDF", icon: "pdf" }], auto: true },
  { name: "NM performance", frequency: "Weekly", lastGen: "10/05", actions: [{ label: "Tạo PDF", icon: "pdf" }], auto: false },
];

const schedules = [
  { report: "DRP netting", freq: "Nightly 23:30", recipients: "SC Manager, Planner", channel: "Email + Drive", active: true },
  { report: "PO digest", freq: "Daily 08:00", recipients: "Buyer, SC Manager", channel: "Email", active: true },
];

export default function ReportsPage() {
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <AppLayout>
      <ScreenHeader
        title="Reports"
        subtitle="Báo cáo tổng hợp và phân tích"
        actions={
          <button
            onClick={() => setShowSchedule(!showSchedule)}
            className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-2 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3 transition-colors"
          >
            <Calendar className="h-3.5 w-3.5" />
            Lên lịch tự động
            {showSchedule ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        }
      />

      {/* Report cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {reports.map((r, i) => (
          <div key={i} className="rounded-card border border-surface-3 bg-surface-2 p-4 flex flex-col justify-between gap-3">
            <div>
              <h3 className="text-table font-medium text-text-1">{r.name}</h3>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-table-sm text-text-3 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {r.frequency}
                </span>
                <span className="text-table-sm text-text-3">Lần cuối: {r.lastGen}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {r.actions.map((a, j) => (
                <button
                  key={j}
                  onClick={() => toast.success(`${a.label} — ${r.name}`)}
                  className={`h-8 px-3 rounded-button text-table-sm font-medium flex items-center gap-1.5 transition-opacity hover:opacity-90 ${
                    a.icon === "pdf"
                      ? "bg-gradient-primary text-primary-foreground"
                      : "border border-surface-3 bg-surface-2 text-text-2 hover:bg-surface-1"
                  }`}
                >
                  {a.icon === "pdf" ? <FileText className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Schedule section */}
      {showSchedule && (
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-surface-1 border-b border-surface-3">
            <h3 className="text-table font-medium text-text-1">Lịch tự động</h3>
            <button
              onClick={() => toast("Thêm schedule (demo)")}
              className="h-7 px-2.5 rounded-button bg-gradient-primary text-primary-foreground text-caption font-medium flex items-center gap-1 hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3 w-3" /> Thêm schedule
            </button>
          </div>
          <table className="w-full text-table">
            <thead>
              <tr className="bg-surface-1">
                <th className="text-left px-4 py-2 text-table-header uppercase text-text-3">Report</th>
                <th className="text-left px-4 py-2 text-table-header uppercase text-text-3">Tần suất</th>
                <th className="text-left px-4 py-2 text-table-header uppercase text-text-3">Gửi cho</th>
                <th className="text-left px-4 py-2 text-table-header uppercase text-text-3">Channel</th>
                <th className="text-left px-4 py-2 text-table-header uppercase text-text-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s, i) => (
                <tr key={i} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
                  <td className="px-4 py-2.5 font-medium text-text-1">{s.report}</td>
                  <td className="px-4 py-2.5 text-text-2">{s.freq}</td>
                  <td className="px-4 py-2.5 text-text-2">{s.recipients}</td>
                  <td className="px-4 py-2.5 text-text-2 flex items-center gap-1"><Mail className="h-3 w-3 text-text-3" /> {s.channel}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-caption font-medium px-1.5 py-0.5 rounded-sm bg-success-bg text-success">✅ Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}

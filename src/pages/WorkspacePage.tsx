import { PlaceholderPage } from "@/components/PlaceholderPage";
import { useWorkflow } from "@/components/WorkflowContext";
import { Button } from "@/components/ui/button";

export default function WorkspacePage() {
  const { startWorkflow } = useWorkflow();
  return (
    <PlaceholderPage title="Workspace" subtitle="Phê duyệt và theo dõi quy trình">
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-card border border-surface-3 bg-surface-2 p-6 space-y-4">
          <h2 className="font-display text-section-header text-text-1">Quy trình hàng ngày</h2>
          <p className="text-table text-text-2">4 bước: NM Sync → Demand → DRP → Orders</p>
          <Button onClick={() => startWorkflow("daily")}>▶ Bắt đầu quy trình ngày</Button>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-2 p-6 space-y-4">
          <h2 className="font-display text-section-header text-text-1">Quy trình hàng tháng</h2>
          <p className="text-table text-text-2">3 bước: Demand Review → S&OP → Hub</p>
          <Button onClick={() => startWorkflow("monthly")}>▶ Bắt đầu quy trình tháng</Button>
        </div>
      </div>
      <div className="mt-4 rounded-card border border-surface-3 bg-surface-2 p-5">
        <h2 className="font-display text-section-header text-text-1 mb-3">Chờ phê duyệt</h2>
        <div className="space-y-2">
          {["Điều chỉnh dự báo GT-6060 tháng 5", "PO #1247 — NCC Minh Phát", "Allocation CN Miền Tây — tuần 16"].map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-button border border-surface-3 bg-surface-0 px-4 py-2.5">
              <span className="text-table text-text-1">{item}</span>
              <div className="flex gap-2">
                <button className="rounded-button bg-gradient-primary text-primary-foreground px-3 py-1 text-table-sm font-medium">Duyệt</button>
                <button className="rounded-button border border-surface-3 text-text-2 px-3 py-1 text-table-sm">Từ chối</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PlaceholderPage>
  );
}

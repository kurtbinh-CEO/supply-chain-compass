import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { ApprovalTable } from "@/components/workspace/ApprovalTable";
import { ExceptionsSection } from "@/components/workspace/ExceptionsSection";
import { NotificationList } from "@/components/workspace/NotificationList";
import { KpiAndWorkflowSection } from "@/components/workspace/KpiAndWorkflowSection";

export default function WorkspacePage() {
  return (
    <AppLayout>
      <ScreenHeader title="Nơi làm việc" subtitle="Phê duyệt, ngoại lệ và theo dõi quy trình" />

      <div className="space-y-6">
        {/* Section 1: Approval Table */}
        <ApprovalTable />

        {/* Section 2: Exceptions + AI Trust Block */}
        <ExceptionsSection />

        {/* Section 3: Notifications */}
        <NotificationList />

        {/* Section 4: KPI + Workflow CTA */}
        <KpiAndWorkflowSection />
      </div>

      <ScreenFooter actionCount={18} />
    </AppLayout>
  );
}

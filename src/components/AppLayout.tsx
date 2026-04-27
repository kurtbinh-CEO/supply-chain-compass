import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { WorkflowBar } from "@/components/WorkflowBar";
import { WorkflowFooter } from "@/components/WorkflowFooter";
import { WorkflowLeaveDialog } from "@/components/WorkflowLeaveDialog";
import { useSidebarState } from "@/components/SidebarContext";
import { WalkthroughOverlay } from "@/components/WalkthroughOverlay";

function LayoutInner({ children }: { children: React.ReactNode }) {
  // Margin trái khớp với width sidebar hiện tại (collapsed/compact/normal).
  // Lấy trực tiếp từ context — không hard-code 260/280px nữa.
  const { width } = useSidebarState();
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <div className="transition-[margin] duration-200" style={{ marginLeft: width }}>
        <TopBar />
        <WorkflowBar />
        <main className="p-6">
          {children}
          {/* M1 — Footer "Bước trước / Bước tiếp" cho daily/monthly workflow */}
          <WorkflowFooter />
        </main>
      </div>
      <WorkflowLeaveDialog />
      <WalkthroughOverlay />
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return <LayoutInner>{children}</LayoutInner>;
}

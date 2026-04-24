import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { WorkflowBar } from "@/components/WorkflowBar";
import { WorkflowFooter } from "@/components/WorkflowFooter";
import { WorkflowLeaveDialog } from "@/components/WorkflowLeaveDialog";
import { useSidebarState } from "@/components/SidebarContext";
import { WalkthroughOverlay } from "@/components/WalkthroughOverlay";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarState();
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <div className={`transition-all duration-200 ${collapsed ? "ml-16" : "ml-[260px]"}`}>
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

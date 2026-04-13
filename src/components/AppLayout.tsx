import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { WorkflowBar } from "@/components/WorkflowBar";
import { SidebarProvider, useSidebarState } from "@/components/SidebarContext";
import { WorkflowProvider } from "@/components/WorkflowContext";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarState();
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <div className={`transition-all duration-200 ${collapsed ? "ml-16" : "ml-[260px]"}`}>
        <TopBar />
        <WorkflowBar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <WorkflowProvider>
        <LayoutInner>{children}</LayoutInner>
      </WorkflowProvider>
    </SidebarProvider>
  );
}

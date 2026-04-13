import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { SidebarProvider, useSidebarState } from "@/components/SidebarContext";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarState();
  return (
    <div className="min-h-screen">
      <AppSidebar />
      <div className={`transition-all duration-200 ${collapsed ? "ml-16" : "ml-[260px]"}`}>
        <TopBar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}

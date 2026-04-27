import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";
import { WorkflowBar } from "@/components/WorkflowBar";
import { WorkflowFooter } from "@/components/WorkflowFooter";
import { WorkflowLeaveDialog } from "@/components/WorkflowLeaveDialog";
import { useSidebarState } from "@/components/SidebarContext";
import { WalkthroughOverlay } from "@/components/WalkthroughOverlay";
import { cn } from "@/lib/utils";

function LayoutInner({ children }: { children: React.ReactNode }) {
  // Margin trái khớp width sidebar; cộng thêm offset cho style inset/floating
  // (vì sidebar dịch vào trong 8/12px, content cũng phải dịch theo cùng giá trị).
  const { width, sidebarStyle, layoutDensity } = useSidebarState();
  const styleOffset = sidebarStyle === "inset" ? 8 : sidebarStyle === "floating" ? 12 : 0;
  const marginLeft = width + styleOffset * 2;

  // Layout density quyết định padding & max-width của <main>.
  const mainClasses = cn(
    layoutDensity === "compact" && "p-4",
    layoutDensity === "default" && "p-6",
    layoutDensity === "full" && "p-6",
  );

  return (
    <div className="min-h-screen">
      <AppSidebar />
      <div className="transition-[margin] duration-200" style={{ marginLeft }}>
        <TopBar />
        <WorkflowBar />
        <main className={mainClasses}>
          {layoutDensity === "full" ? (
            // full → bỏ giới hạn max-width, dùng toàn bộ chiều ngang còn lại.
            <div className="w-full">{children}</div>
          ) : (
            children
          )}
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

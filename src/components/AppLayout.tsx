import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppSidebar />
      {/* Content area offset by sidebar width — handled by ml */}
      <div className="ml-[260px] transition-all duration-200">
        <TopBar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

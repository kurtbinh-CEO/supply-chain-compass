import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/SidebarContext";
import { WorkflowProvider } from "@/components/WorkflowContext";
import { WorkspaceProvider } from "@/components/WorkspaceContext";
import { TenantProvider } from "@/components/TenantContext";
import { RbacProvider } from "@/components/RbacContext";
import { SafetyStockProvider } from "@/components/SafetyStockContext";
import { ThemeProvider } from "@/components/ThemeContext";
import { I18nProvider } from "@/components/i18n/I18nContext";
import { ActivityLogProvider } from "@/components/ActivityLogContext";
import { WalkthroughProvider } from "@/components/WalkthroughContext";
import { AuthProvider, useAuth } from "@/components/AuthContext";
import { ZoomProvider } from "@/components/ZoomControls";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import { NextStepProvider } from "@/components/NextStepContext";
import { useEffect, useCallback } from "react";
import { dispatchExpandAll } from "@/hooks/useExpandableRows";
import { useIdleNudge } from "@/hooks/useIdleNudge";
import { useWorkspace } from "@/components/WorkspaceContext";
import AuthPage from "./pages/AuthPage";
import Index from "./pages/Index";
import DesignTest from "./pages/DesignTest";
import WorkspacePage from "./pages/WorkspacePage";
import MonitoringPage from "./pages/MonitoringPage";
import DemandPage from "./pages/DemandPage";
import SopPage from "./pages/SopPage";
import HubPage from "./pages/HubPage";
import GapScenarioPage from "./pages/GapScenarioPage";
// M2 — /inventory page (đã đổi tên SupplyPage → InventoryPage)
import InventoryPage from "./pages/InventoryPage";
import DemandWeeklyPage from "./pages/DemandWeeklyPage";
import DrpPage from "./pages/DrpPage";
import OrdersPage from "./pages/OrdersPage";
import SyncPage from "./pages/SyncPage";
// M1 — /allocation, /supplier-portal, /transport đã gộp vào module khác
import MasterDataPage from "./pages/MasterDataPage";
import ReportsPage from "./pages/ReportsPage";
import ConfigPage from "./pages/ConfigPage";
import LogicPage from "./pages/LogicPage";
import GuidePage from "./pages/GuidePage";
import NotFound from "./pages/NotFound";
import CnPortalPage from "./pages/CnPortalPage";
import ProfilePage from "./pages/ProfilePage";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { session, loading } = useAuth();

  /* P19 — global ⌘E / Ctrl+E shortcut: toggle expand/collapse ALL rows on the
     active page. Tables that opt-in via useExpandableRows will react. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "e") {
        // Don't interfere with form/text inputs.
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || t?.isContentEditable) return;
        e.preventDefault();
        dispatchExpandAll();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-table-sm text-text-3">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <TenantProvider>
      <RbacProvider>
      <WorkspaceProvider>
      <ActivityLogProvider>
      <WorkflowProvider>
      <SafetyStockProvider>
      <WalkthroughProvider>
      <NextStepProvider>
      <CommandPaletteProvider>
        <IdleNudgeMount />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/monitoring" element={<MonitoringPage />} />
          <Route path="/demand" element={<DemandPage />} />
          <Route path="/sop" element={<SopPage />} />
          <Route path="/hub" element={<HubPage />} />
          <Route path="/gap-scenario" element={<GapScenarioPage />} />
          {/* M2 — /inventory là route chính cho tồn kho NM+CN (2 tabs) */}
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/supply" element={<Navigate to="/inventory" replace />} />
          <Route path="/demand-weekly" element={<DemandWeeklyPage />} />
          <Route path="/drp" element={<DrpPage />} />
          <Route path="/allocation" element={<Navigate to="/drp" replace />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/sync" element={<SyncPage />} />
          <Route path="/transport" element={<Navigate to="/orders?tab=packing" replace />} />
          <Route path="/supplier-portal" element={<Navigate to="/hub" replace />} />
          <Route path="/master-data" element={<MasterDataPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/cn-portal" element={<CnPortalPage />} />
          <Route path="/logic" element={<LogicPage />} />
          <Route path="/guide" element={<GuidePage />} />
          <Route path="/design-test" element={<DesignTest />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </CommandPaletteProvider>
      </NextStepProvider>
      </WalkthroughProvider>
      </SafetyStockProvider>
      </WorkflowProvider>
      </ActivityLogProvider>
      </WorkspaceProvider>
      </RbacProvider>
      </TenantProvider>
    </SidebarProvider>
  );
}

/** Mounts the global 5-min idle nudge — needs to live inside WorkspaceProvider. */
function IdleNudgeMount() {
  const { pendingCount, exceptions } = useWorkspace();
  const getPendingCount = useCallback(() => pendingCount + exceptions.length, [pendingCount, exceptions.length]);
  useIdleNudge({ getPendingCount });
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <I18nProvider>
    <ZoomProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ZoomProvider>
    </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

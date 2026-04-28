import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/SidebarContext";
import { WorkflowProvider } from "@/components/WorkflowContext";
import { WorkspaceProvider } from "@/components/WorkspaceContext";
import { TenantProvider } from "@/components/TenantContext";
import { RbacProvider } from "@/components/RbacContext";
import { RouteGuard } from "@/components/RouteGuard";
import { SafetyStockProvider } from "@/components/SafetyStockContext";
import { ThemeProvider } from "@/components/ThemeContext";
import { I18nProvider } from "@/components/i18n/I18nContext";
import { ActivityLogProvider } from "@/components/ActivityLogContext";
import { WalkthroughProvider } from "@/components/WalkthroughContext";
import { AuthProvider, useAuth } from "@/components/AuthContext";
import { ZoomProvider } from "@/components/ZoomControls";
import { FarmerModeProvider } from "@/components/FarmerModeContext";
import { CommandPaletteProvider } from "@/components/CommandPalette";
import { NextStepProvider } from "@/components/NextStepContext";
import { OnboardingProvider, useOnboarding } from "@/components/onboarding/OnboardingContext";
import { OnboardingOverlay } from "@/components/onboarding/OnboardingOverlay";
import { getTourForRoute } from "@/components/onboarding/tours";
import { PlanningPeriodProvider } from "@/components/PlanningPeriodContext";
import { useEffect, useCallback, lazy, Suspense } from "react";
import { dispatchExpandAll } from "@/hooks/useExpandableRows";
import { useIdleNudge } from "@/hooks/useIdleNudge";
import { useWorkspace } from "@/components/WorkspaceContext";

// Eager: auth & landing (cần ngay khi load)
import AuthPage from "./pages/AuthPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import WorkspacePage from "./pages/WorkspacePage";

// Lazy: tất cả page nặng — code-split mỗi route thành chunk riêng
const DesignTest = lazy(() => import("./pages/DesignTest"));
const MonitoringPage = lazy(() => import("./pages/MonitoringPage"));
const DemandPage = lazy(() => import("./pages/DemandPage"));
const SopPage = lazy(() => import("./pages/SopPage"));
const HubPage = lazy(() => import("./pages/HubPage"));
const GapScenarioPage = lazy(() => import("./pages/GapScenarioPage"));
const DemoScenariosPage = lazy(() => import("./pages/DemoScenariosPage"));
const ComparePage = lazy(() => import("./pages/ComparePage"));
const InventoryPage = lazy(() => import("./pages/InventoryPage"));
const DemandWeeklyPage = lazy(() => import("./pages/DemandWeeklyPage"));
const DrpPage = lazy(() => import("./pages/DrpPage"));
const DrpPreflightAuditPage = lazy(() => import("./pages/DrpPreflightAuditPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const SyncPage = lazy(() => import("./pages/SyncPage"));
const MasterDataPage = lazy(() => import("./pages/MasterDataPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const ConfigPage = lazy(() => import("./pages/ConfigPage"));
const LogicPage = lazy(() => import("./pages/LogicPage"));
const GuidePage = lazy(() => import("./pages/GuidePage"));
const CnPortalPage = lazy(() => import("./pages/CnPortalPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const ExecutivePage = lazy(() => import("./pages/ExecutivePage"));
const AuditPage = lazy(() => import("./pages/AuditPage"));
const AppearancePage = lazy(() => import("./pages/AppearancePage"));
const QaKpiPage = lazy(() => import("./pages/QaKpiPage"));

const PageFallback = () => (
  <div className="min-h-screen bg-surface-0 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span className="text-table-sm text-text-3">Đang tải trang...</span>
    </div>
  </div>
);

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
      <PlanningPeriodProvider>
      <CommandPaletteProvider>
      <OnboardingProvider>
        <IdleNudgeMount />
        <OnboardingOverlay />
        <OnboardingAutoStart />
        <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<RouteGuard><Index /></RouteGuard>} />
          <Route path="/workspace" element={<RouteGuard><WorkspacePage /></RouteGuard>} />
          <Route path="/monitoring" element={<RouteGuard><MonitoringPage /></RouteGuard>} />
          <Route path="/demand" element={<RouteGuard><DemandPage /></RouteGuard>} />
          <Route path="/sop" element={<RouteGuard><SopPage /></RouteGuard>} />
          <Route path="/hub" element={<RouteGuard><HubPage /></RouteGuard>} />
          <Route path="/gap-scenario" element={<RouteGuard><GapScenarioPage /></RouteGuard>} />
          <Route path="/scenarios" element={<RouteGuard><DemoScenariosPage /></RouteGuard>} />
          <Route path="/compare" element={<RouteGuard><ComparePage /></RouteGuard>} />
          {/* M2 — /inventory là route chính cho tồn kho NM+CN (2 tabs) */}
          <Route path="/inventory" element={<RouteGuard><InventoryPage /></RouteGuard>} />
          <Route path="/supply" element={<Navigate to="/inventory" replace />} />
          <Route path="/demand-weekly" element={<RouteGuard><DemandWeeklyPage /></RouteGuard>} />
          <Route path="/drp" element={<RouteGuard><DrpPage /></RouteGuard>} />
          <Route path="/drp/preflight-audit" element={<RouteGuard><DrpPreflightAuditPage /></RouteGuard>} />
          <Route path="/allocation" element={<Navigate to="/drp" replace />} />
          <Route path="/orders" element={<RouteGuard><OrdersPage /></RouteGuard>} />
          <Route path="/sync" element={<RouteGuard><SyncPage /></RouteGuard>} />
          <Route path="/transport" element={<Navigate to="/orders?tab=packing" replace />} />
          <Route path="/supplier-portal" element={<Navigate to="/hub" replace />} />
          <Route path="/master-data" element={<RouteGuard><MasterDataPage /></RouteGuard>} />
          <Route path="/reports" element={<RouteGuard><ReportsPage /></RouteGuard>} />
          <Route path="/config" element={<RouteGuard><ConfigPage /></RouteGuard>} />
          <Route path="/cn-portal" element={<RouteGuard><CnPortalPage /></RouteGuard>} />
          <Route path="/logic" element={<RouteGuard><LogicPage /></RouteGuard>} />
          <Route path="/guide" element={<RouteGuard><GuidePage /></RouteGuard>} />
          <Route path="/profile" element={<RouteGuard><ProfilePage /></RouteGuard>} />
          <Route path="/executive" element={<RouteGuard><ExecutivePage /></RouteGuard>} />
          <Route path="/audit" element={<RouteGuard><AuditPage /></RouteGuard>} />
          <Route path="/appearance" element={<RouteGuard><AppearancePage /></RouteGuard>} />
          {/* Dev-only routes — chỉ truy cập được khi không phải production build */}
          {import.meta.env.DEV && (
            <>
              <Route path="/design-test" element={<RouteGuard><DesignTest /></RouteGuard>} />
              <Route path="/qa/kpi" element={<RouteGuard><QaKpiPage /></RouteGuard>} />
            </>
          )}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </OnboardingProvider>
      </CommandPaletteProvider>
      </PlanningPeriodProvider>
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

/** Tự động khởi động onboarding tour cho route hiện tại nếu user chưa xem. */
function OnboardingAutoStart() {
  const location = useLocation();
  const { isTourCompleted, startTour, activeTour } = useOnboarding();

  useEffect(() => {
    const tour = getTourForRoute(location.pathname);
    if (!tour) return;
    if (activeTour) return;
    if (isTourCompleted(tour.id)) return;
    try {
      const enabled = localStorage.getItem("scp:onboarding:enabled");
      if (enabled === "false") return;
    } catch {}
    const timer = setTimeout(() => startTour(tour), 800);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <I18nProvider>
    <ZoomProvider>
    <FarmerModeProvider>
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
    </FarmerModeProvider>
    </ZoomProvider>
    </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

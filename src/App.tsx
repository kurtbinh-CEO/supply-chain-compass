import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/SidebarContext";
import { WorkflowProvider } from "@/components/WorkflowContext";
import { WorkspaceProvider } from "@/components/WorkspaceContext";
import { TenantProvider } from "@/components/TenantContext";
import { RbacProvider } from "@/components/RbacContext";
import { SafetyStockProvider } from "@/components/SafetyStockContext";
import Index from "./pages/Index";
import DesignTest from "./pages/DesignTest";
import WorkspacePage from "./pages/WorkspacePage";
import MonitoringPage from "./pages/MonitoringPage";
import DemandPage from "./pages/DemandPage";
import SopPage from "./pages/SopPage";
import HubPage from "./pages/HubPage";
import SupplyPage from "./pages/SupplyPage";
import DemandWeeklyPage from "./pages/DemandWeeklyPage";
import DrpPage from "./pages/DrpPage";
import AllocationPage from "./pages/AllocationPage";
import OrdersPage from "./pages/OrdersPage";
import SupplierPortalPage from "./pages/SupplierPortalPage";
import MasterDataPage from "./pages/MasterDataPage";
import ReportsPage from "./pages/ReportsPage";
import ConfigPage from "./pages/ConfigPage";
import LogicPage from "./pages/LogicPage";
import NotFound from "./pages/NotFound";
import CnPortalPage from "./pages/CnPortalPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <TenantProvider>
          <RbacProvider>
          <WorkspaceProvider>
          <WorkflowProvider>
          <SafetyStockProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/workspace" element={<WorkspacePage />} />
              <Route path="/monitoring" element={<MonitoringPage />} />
              <Route path="/demand" element={<DemandPage />} />
              <Route path="/sop" element={<SopPage />} />
              <Route path="/hub" element={<HubPage />} />
              <Route path="/supply" element={<SupplyPage />} />
              <Route path="/demand-weekly" element={<DemandWeeklyPage />} />
              <Route path="/drp" element={<DrpPage />} />
              <Route path="/allocation" element={<AllocationPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/supplier-portal" element={<SupplierPortalPage />} />
              <Route path="/master-data" element={<MasterDataPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/config" element={<ConfigPage />} />
              <Route path="/cn-portal" element={<CnPortalPage />} />
              <Route path="/logic" element={<LogicPage />} />
              <Route path="/design-test" element={<DesignTest />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SafetyStockProvider>
          </WorkflowProvider>
          </WorkspaceProvider>
          </RbacProvider>
          </TenantProvider>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

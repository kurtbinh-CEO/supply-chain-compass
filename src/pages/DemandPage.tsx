import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { cn } from "@/lib/utils";
import { DemandSummaryTab } from "@/components/demand/DemandSummaryTab";
import { FcHierarchyTab } from "@/components/demand/FcHierarchyTab";
import { B2BPipelineTab } from "@/components/demand/B2BPipelineTab";
import { tenantDemandData, tenantB2BData } from "@/components/demand/demandData";
import { useTenant } from "@/components/TenantContext";

const tabs = [
  { key: "summary", label: "Demand Summary" },
  { key: "hierarchy", label: "FC Hierarchy" },
  { key: "b2b", label: "B2B Pipeline" },
];

export default function DemandPage() {
  const [activeTab, setActiveTab] = useState("summary");
  const { tenant } = useTenant();

  const skus = tenantDemandData[tenant] || tenantDemandData["UNIS Group"];
  const deals = tenantB2BData[tenant] || tenantB2BData["UNIS Group"];

  return (
    <AppLayout>
      <ScreenHeader title="Demand Review" subtitle="Tổng hợp Demand / Chi tiết kế hoạch" />

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-surface-3 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-5 py-3 text-body font-medium transition-colors relative",
              activeTab === tab.key
                ? "text-primary"
                : "text-text-2 hover:text-text-1"
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "summary" && <DemandSummaryTab skus={skus} tenant={tenant} />}
      {activeTab === "hierarchy" && <FcHierarchyTab />}
      {activeTab === "b2b" && <B2BPipelineTab deals={deals} />}

      <ScreenFooter actionCount={18} />
    </AppLayout>
  );
}

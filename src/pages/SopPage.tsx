import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantContext";
import { tenantSopData } from "@/components/sop/sopData";
import { NhapDemandTab } from "@/components/sop/NhapDemandTab";
import { PhasingTab } from "@/components/sop/PhasingTab";
import { ComparisonTab } from "@/components/sop/ComparisonTab";
import { StatusTab, FvaTab } from "@/components/sop/StatusFvaTab";

const tabs = [
  { key: "nhap", label: "Nhập demand" },
  { key: "phasing", label: "Phasing M→W" },
  { key: "compare", label: "So sánh" },
  { key: "status", label: "Trạng thái" },
  { key: "fva", label: "FVA" },
];

export default function SopPage() {
  const [activeTab, setActiveTab] = useState("nhap");
  const { tenant } = useTenant();
  const data = tenantSopData[tenant] || tenantSopData["UNIS Group"];

  return (
    <AppLayout>
      <ScreenHeader title="S&OP Consensus" subtitle="Digital Curator — Consensus Planning" />

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

        <div className="flex-1" />
        <button className="rounded-button bg-gradient-primary text-white px-4 py-2 text-table-sm font-medium mr-1">
          📋 Pre-meeting report
        </button>
      </div>

      {activeTab === "nhap" && <NhapDemandTab skus={data.skus} aop={data.aop} />}
      {activeTab === "phasing" && <PhasingTab rows={data.phasingRows} totalVolume={data.versions[3]?.value || 7650} />}
      {activeTab === "compare" && <ComparisonTab versions={data.versions} variants={data.variants} />}
      {activeTab === "status" && <StatusTab decisionLog={data.decisionLog} />}
      {activeTab === "fva" && <FvaTab fvaNodes={data.fvaNodes} />}

      <ScreenFooter actionCount={12} />
    </AppLayout>
  );
}

import { useState } from "react";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { AppLayout } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantContext";
import { SourcingWorkbench } from "@/components/hub/SourcingWorkbench";
import { ReconciliationTab } from "@/components/hub/ReconciliationTab";

const tabs = [
  { key: "sourcing", label: "Sourcing Workbench" },
  { key: "recon", label: "Đối chiếu" },
];

export default function HubPage() {
  const [activeTab, setActiveTab] = useState("sourcing");
  const [objective, setObjective] = useState("hybrid");
  const { tenant } = useTenant();
  const scale = tenant === "TTC Agris" ? 0.75 : tenant === "Mondelez" ? 1.2 : 1;

  return (
    <AppLayout>
      <ScreenHeader
        title="Hub & Sourcing — Tháng 5"
        subtitle="S&OP locked: 7.650m² · Day 8/30"
        actions={
          activeTab === "sourcing" ? (
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-1 outline-none"
            >
              <option value="hybrid">Weighted Hybrid</option>
              <option value="lt">Shortest LT</option>
              <option value="cost">Lowest Cost</option>
            </select>
          ) : undefined
        }
      />

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-surface-3 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-5 py-3 text-table font-medium transition-colors relative whitespace-nowrap",
              activeTab === tab.key ? "text-primary" : "text-text-2 hover:text-text-1"
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t" />
            )}
          </button>
        ))}
      </div>

      {activeTab === "sourcing" && <SourcingWorkbench scale={scale} />}
      {activeTab === "recon" && <ReconciliationTab scale={scale} />}
      <ScreenFooter actionCount={9} />
    </AppLayout>
  );
}

import { useState } from "react";
import { ScreenShell } from "@/components/ScreenShell";
import { HubStockTab } from "@/components/hub/HubStockTab";
import { FCCommitmentTab } from "@/components/hub/FCCommitmentTab";
import { GapMonitorTab } from "@/components/hub/GapMonitorTab";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "hub-stock", label: "Hub Stock (mỗi ngày)" },
  { key: "fc-commitment", label: "FC Commitment (Day 8-10)" },
  { key: "gap-monitor", label: "Gap Monitor (Day 20+)" },
];

export default function HubPage() {
  const [activeTab, setActiveTab] = useState("hub-stock");

  return (
    <ScreenShell title="Hub & Commitment" subtitle="Kế hoạch tháng — Cam kết nhà máy & phân bổ hub">
      {/* Context bar */}
      <div className="flex items-center gap-4 mb-6 rounded-card border border-surface-3 bg-surface-2 px-5 py-3">
        <div>
          <span className="text-table-header uppercase text-text-3">CONTEXT</span>
          <div className="text-body font-semibold text-text-1">Monthly T5 — Day 16/30</div>
        </div>
        <div className="flex-1 mx-4">
          <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: "53%" }} />
          </div>
        </div>
        <span className="text-table-sm tabular-nums text-text-2">53%</span>

        {/* Tab pills */}
        <div className="flex items-center gap-1 ml-4 rounded-full border border-surface-3 bg-surface-0 p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-table-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "bg-gradient-primary text-primary-foreground"
                  : "text-text-2 hover:text-text-1"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "hub-stock" && <HubStockTab />}
      {activeTab === "fc-commitment" && <FCCommitmentTab />}
      {activeTab === "gap-monitor" && <GapMonitorTab />}
    </ScreenShell>
  );
}

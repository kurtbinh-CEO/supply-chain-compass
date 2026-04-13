import { useState } from "react";
import { ScreenHeader } from "@/components/ScreenShell";
import { NMInventoryTab } from "@/components/supply/NMInventoryTab";
import { GanttSXTab } from "@/components/supply/GanttSXTab";
import { PipelineTab } from "@/components/supply/PipelineTab";
import { cn } from "@/lib/utils";

const tabs = [
  { key: "inventory", label: "Tồn kho NM" },
  { key: "gantt", label: "Gantt SX" },
  { key: "pipeline", label: "Pipeline" },
];

export default function SupplyPage() {
  const [activeTab, setActiveTab] = useState("inventory");

  return (
    <div className="p-6">
      <ScreenHeader title="NM Supply Sync" subtitle="Vận hành ngày — Đồng bộ tồn kho và năng lực nhà máy" />

      {/* Tab pills */}
      <div className="flex items-center gap-1 mb-6 rounded-full border border-surface-3 bg-surface-0 p-0.5 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-table-sm font-medium transition-colors whitespace-nowrap",
              activeTab === tab.key
                ? "bg-gradient-primary text-primary-foreground"
                : "text-text-2 hover:text-text-1"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "inventory" && <NMInventoryTab />}
      {activeTab === "gantt" && <GanttSXTab />}
      {activeTab === "pipeline" && <PipelineTab />}
    </div>
  );
}

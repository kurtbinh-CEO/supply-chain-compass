import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantContext";
import { NmOrderTab } from "@/components/hub/NmOrderTab";
import { ReconciliationTab } from "@/components/hub/ReconciliationTab";

const tabs = [
  { key: "order", label: "Đặt hàng NM" },
  { key: "recon", label: "Đối chiếu" },
];

export default function HubPage() {
  const [activeTab, setActiveTab] = useState("order");
  const { tenant } = useTenant();
  const scale = tenant === "TTC Agris" ? 0.75 : tenant === "Mondelez" ? 1.2 : 1;

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="font-display text-screen-title text-text-1">Hub & Commitment — Tháng 5</h1>
          <p className="text-table text-text-2">Cam kết nhà máy & theo dõi giao hàng</p>
        </div>
      </div>

      {/* Status strip */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success text-table-sm font-medium px-3 py-1">
          ✅ S&OP locked: {Math.round(7650 * scale).toLocaleString()} m²
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-info-bg text-info text-table-sm font-medium px-3 py-1">
          Day 8/30
        </span>
      </div>

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

      {activeTab === "order" && <NmOrderTab scale={scale} />}
      {activeTab === "recon" && <ReconciliationTab scale={scale} />}
    </AppLayout>
  );
}

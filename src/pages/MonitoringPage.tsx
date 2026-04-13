import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { cn } from "@/lib/utils";
import { HstkTab } from "@/components/monitoring/HstkTab";
import { FcAccuracyTab } from "@/components/monitoring/FcAccuracyTab";
import { SafetyStockTab } from "@/components/monitoring/SafetyStockTab";
import { AuditFeedbackTab } from "@/components/monitoring/AuditFeedbackTab";

const tabs = [
  { key: "hstk", label: "HSTK & Tồn kho" },
  { key: "fc", label: "FC Accuracy" },
  { key: "ss", label: "Safety Stock" },
  { key: "audit", label: "Đánh giá & Phản hồi" },
];

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState("hstk");

  return (
    <AppLayout>
      <ScreenHeader title="Monitoring" subtitle="Giám sát chuỗi cung ứng theo thời gian thực" />

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

      {activeTab === "hstk" && <HstkTab />}
      {activeTab === "fc" && <FcAccuracyTab />}
      {activeTab === "ss" && <SafetyStockTab />}
      {activeTab === "audit" && <AuditFeedbackTab />}

      <ScreenFooter actionCount={24} />
    </AppLayout>
  );
}

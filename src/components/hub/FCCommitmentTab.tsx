import { useState } from "react";
import { cn } from "@/lib/utils";
import { FCCommitmentContent } from "./FCCommitmentContent";
import { ReconciliationTab } from "./ReconciliationTab";

const subTabs = [
  { key: "send-confirm", label: "Gửi & Xác nhận" },
  { key: "reconciliation", label: "★ Sổ đối chiếu" },
];

export function FCCommitmentTab() {
  const [activeSubTab, setActiveSubTab] = useState("send-confirm");

  return (
    <div className="space-y-4">
      {/* Secondary tabs */}
      <div className="flex items-center gap-0 border-b border-surface-3">
        {subTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={cn(
              "px-4 py-2 text-table-sm font-medium transition-colors relative",
              activeSubTab === tab.key
                ? "text-primary"
                : "text-text-3 hover:text-text-1"
            )}
          >
            {tab.label}
            {activeSubTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t" />
            )}
          </button>
        ))}
      </div>

      {activeSubTab === "send-confirm" && <FCCommitmentContent />}
      {activeSubTab === "reconciliation" && <ReconciliationTab />}
    </div>
  );
}

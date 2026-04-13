import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantContext";
import { tenantSopData } from "@/components/sop/sopData";
import { NhapDemandTab } from "@/components/sop/NhapDemandTab";
import { ComparisonTab } from "@/components/sop/ComparisonTab";
import { PhasingTab } from "@/components/sop/PhasingTab";
import { BalanceTab } from "@/components/sop/BalanceTab";
import { AopFinanceTab } from "@/components/sop/AopFinanceTab";
import { LockLogTab } from "@/components/sop/LockLogTab";

const tabs = [
  { key: "nhap", label: "① Nhập demand" },
  { key: "compare", label: "② So sánh versions" },
  { key: "phasing", label: "③ Phasing M→W" },
  { key: "balance", label: "④ Cân đối" },
  { key: "aop", label: "⑤ AOP & Tài chính" },
  { key: "lock", label: "⑥ Lock & Log" },
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
              "px-4 py-3 text-table-sm font-medium transition-colors relative whitespace-nowrap",
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
      {activeTab === "compare" && <ComparisonTab versions={data.versions} variants={data.variants} />}
      {activeTab === "phasing" && <PhasingTab rows={data.phasingRows} totalVolume={data.versions[3]?.value || 7650} />}
      {activeTab === "balance" && <BalanceTab tenant={tenant} consensusVolume={data.versions[3]?.value || 7650} />}
      {activeTab === "aop" && <AopFinanceTab tenant={tenant} />}
      {activeTab === "lock" && <LockLogTab decisionLog={data.decisionLog} fvaNodes={data.fvaNodes} />}

      <ScreenFooter actionCount={12} />
    </AppLayout>
  );
}

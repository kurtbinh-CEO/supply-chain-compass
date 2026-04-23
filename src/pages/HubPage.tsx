import { useState } from "react";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { AppLayout } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantContext";
import { SourcingWorkbench } from "@/components/hub/SourcingWorkbench";
import { ReconciliationTab } from "@/components/hub/ReconciliationTab";
import { ClickableNumber } from "@/components/ClickableNumber";
import { HubOverviewTab } from "@/components/hub/HubOverviewTab";

type Objective = "hybrid" | "lt" | "cost";

// Hub-level mock totals (m²) — derived from S&OP locked + NM commitments
function getHubTotals(scale: number) {
  const sopLocked = Math.round(7650 * scale);
  const nmConfirmed = Math.round(7200 * scale); // ~94% honoring
  const released = Math.round(5400 * scale);    // ~75% of confirmed
  const ssHub = Math.round(420 * scale);        // safety stock at hub
  const available = sopLocked + ssHub - released; // formula: SOP + SS − released
  return { sopLocked, nmConfirmed, released, ssHub, available };
}


const tabs = [
  { key: "overview", label: "Hub ảo Overview" },
  { key: "sourcing", label: "Sourcing Workbench" },
  { key: "recon", label: "Đối chiếu" },
];

export default function HubPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [objective, setObjective] = useState<Objective>("hybrid");
  const { tenant } = useTenant();
  const scale = tenant === "TTC Agris" ? 0.75 : tenant === "Mondelez" ? 1.2 : 1;
  const totals = getHubTotals(scale);

  return (
    <AppLayout>
      <ScreenHeader
        title="Hub & Sourcing — Tháng 5"
        subtitle="S&OP locked: 7.650m² · Day 8/30"
        actions={
          activeTab === "sourcing" ? (
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value as Objective)}
              className="rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm text-text-1 outline-none"
            >
              <option value="hybrid">Weighted Hybrid</option>
              <option value="lt">Shortest LT</option>
              <option value="cost">Lowest Cost</option>
            </select>
          ) : undefined
        }
      />

      {/* Hub KPI strip — clickable totals */}
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-surface-3 bg-surface-1 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-caption uppercase text-text-3 tracking-wider">Hub Available</span>
          <ClickableNumber
            value={`${totals.available.toLocaleString()} m²`}
            label="Hub Available"
            color={cn("font-display text-section-header", totals.available < 0 ? "text-danger" : "text-success")}
            formula={`Available = SOP locked + SS Hub − Released\n= ${totals.sopLocked.toLocaleString()} + ${totals.ssHub.toLocaleString()} − ${totals.released.toLocaleString()}\n= ${totals.available.toLocaleString()} m²`}
            note="Available = số m² còn có thể release từ Hub mà không vi phạm SS"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-caption uppercase text-text-3 tracking-wider">Σ NM Confirmed</span>
          <ClickableNumber
            value={`${totals.nmConfirmed.toLocaleString()} m²`}
            label="Σ NM đã confirm"
            color="text-text-1 font-display text-section-header"
            formula={`Σ NM Confirmed = Σ commit_response.committedM2 (status=confirmed)\nHonoring = ${((totals.nmConfirmed / totals.sopLocked) * 100).toFixed(1)}% vs SOP locked`}
            note="Cam kết của các NM cho tháng — so với SOP locked để tính honoring"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-caption uppercase text-text-3 tracking-wider">Σ Released</span>
          <ClickableNumber
            value={`${totals.released.toLocaleString()} m²`}
            label="Σ Released (BPO + RPO)"
            color="text-info font-display text-section-header"
            formula={`Σ Released = Σ purchase_orders.quantity (status ∈ {confirmed, shipped, received})\n= ${totals.released.toLocaleString()} m²`}
            note="Số m² đã release thành PO (drp_runs.released_qty)"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-caption uppercase text-text-3 tracking-wider">SS Hub</span>
          <ClickableNumber
            value={`${totals.ssHub.toLocaleString()} m²`}
            label="Safety Stock Hub"
            color="text-text-2 font-display text-section-header"
            formula={`SS Hub = z × σ_LT × √(LT_hub_days/7)\nz=1.65 (service 95%)\nLT trung bình NM = 14 ngày`}
            note="Buffer Hub bù sai số FC + lead-time NM"
          />
        </div>
      </div>

      <div data-tour="hub-tabs" className="flex items-center gap-0 border-b border-surface-3 mb-6">
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

      <div data-tour="hub-overview">
        {activeTab === "overview" && <HubOverviewTab scale={scale} totals={totals} />}
      </div>
      <div data-tour="hub-sourcing">
        {activeTab === "sourcing" && (
          <SourcingWorkbench
            scale={scale}
            objective={objective}
            onObjectiveChange={setObjective}
          />
        )}
      </div>
      <div data-tour="hub-recon">
        {activeTab === "recon" && <ReconciliationTab scale={scale} />}
      </div>
      <ScreenFooter actionCount={9} />
    </AppLayout>
  );
}

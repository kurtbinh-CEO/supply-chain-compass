import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { cn } from "@/lib/utils";
import { DemandTotalTab } from "@/components/demand/DemandTotalTab";
import { B2BInputTab } from "@/components/demand/B2BInputTab";
import { useTenant } from "@/components/TenantContext";
import { useDemandForecasts } from "@/hooks/useDemandForecasts";
import { Loader2, Database } from "lucide-react";

const tabs = [
  { key: "total", label: "Demand tổng" },
  { key: "b2b", label: "B2B nhập liệu" },
];

export default function DemandPage() {
  const [activeTab, setActiveTab] = useState("total");
  const { tenant } = useTenant();
  const { cnSummaries, loading: forecastLoading } = useDemandForecasts();

  // B2B deals state lives here so Tab1 can read aggregated B2B per CN
  const [b2bDeals, setB2bDeals] = useState(() => getInitialDeals(tenant));

  // Re-seed deals when tenant changes
  const [prevTenant, setPrevTenant] = useState(tenant);
  if (tenant !== prevTenant) {
    setPrevTenant(tenant);
    setB2bDeals(getInitialDeals(tenant));
  }

  // Aggregate B2B weighted qty per CN for current month (Th5)
  const b2bPerCn: Record<string, number> = {};
  b2bDeals.forEach(d => {
    if (d.deliveryMonths.includes("Th5")) {
      d.cnList.forEach(cn => {
        b2bPerCn[cn] = (b2bPerCn[cn] || 0) + Math.round(d.qty * (d.probability / 100) / d.cnList.length);
      });
    }
  });

  return (
    <AppLayout>
      {/* Header */}
      <div data-tour="demand-header">
        <ScreenHeader
          title="Demand Review — Tháng 5"
          subtitle=""
          badges={
            <>
              <span className="rounded-full bg-info-bg text-info px-3 py-1 text-table-sm font-medium">AOP 2026: 60.000 m²</span>
              <span className="rounded-full bg-success-bg text-success px-3 py-1 text-table-sm font-medium">YTD: 19.380 (32%)</span>
            </>
          }
        />
      </div>

      {/* DB Forecast Summary */}
      {cnSummaries.length > 0 && (
        <div className="mb-4 rounded-card border border-primary/20 bg-primary/5 p-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-primary" />
            <span className="text-table-sm font-medium text-text-1">Database Forecasts</span>
            {forecastLoading && <Loader2 className="h-3 w-3 animate-spin text-text-3" />}
          </div>
          <div className="flex flex-wrap gap-3">
            {cnSummaries.map((cs) => (
              <div key={cs.cn} className="rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-caption">
                <span className="font-medium text-text-1">{cs.cn}</span>
                <span className="text-text-3 ml-1">({cs.skus.length} SKU · {cs.fc.toLocaleString()}m²)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div data-tour="demand-tabs" className="flex items-center gap-0 border-b border-surface-3 mb-6">
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

      <div data-tour="demand-total-table">{activeTab === "total" && <DemandTotalTab tenant={tenant} b2bPerCn={b2bPerCn} cnSummaries={cnSummaries} />}</div>
      <div data-tour="demand-b2b-table">{activeTab === "b2b" && <B2BInputTab deals={b2bDeals} setDeals={setB2bDeals} tenant={tenant} />}</div>
      <ScreenFooter actionCount={8} />
    </AppLayout>
  );
}

// ── Initial B2B deals per tenant ──
export interface B2BDealInput {
  id: string;
  customer: string;
  project: string;
  cnList: string[];
  skuMain: string;
  qty: number;
  probability: number;
  deliveryMonths: string[];
  poStatus: string | null; // null = chưa, "PO 8.500" = có
}

function getInitialDeals(tenant: string): B2BDealInput[] {
  const s = tenant === "TTC Agris" ? 0.7 : tenant === "Mondelez" ? 1.3 : 1;
  return [
    { id: "B2B-001", customer: "Vingroup", project: "Grand Park Ph.3", cnList: ["BD","HN"], skuMain: "GA-600 A4", qty: Math.round(12000*s), probability: 85, deliveryMonths: ["Th5","Th6"], poStatus: `PO ${Math.round(8500*s).toLocaleString()}` },
    { id: "B2B-002", customer: "Novaland", project: "Aqua City", cnList: ["BD"], skuMain: "GA-300 A4", qty: Math.round(5000*s), probability: 70, deliveryMonths: ["Th6","Th7"], poStatus: null },
    { id: "B2B-003", customer: "Hưng Thịnh", project: "Moonlight", cnList: ["ĐN"], skuMain: "GA-600 B2", qty: Math.round(3000*s), probability: 90, deliveryMonths: ["Th5"], poStatus: `PO ${Math.round(2700*s).toLocaleString()}` },
    { id: "B2B-004", customer: "Phú Đông", project: "SkyOne", cnList: ["CT"], skuMain: "GA-400 A4", qty: Math.round(2000*s), probability: 45, deliveryMonths: ["Th6","Th7"], poStatus: null },
    { id: "B2B-005", customer: "Khang Điền", project: "Lovera Vista", cnList: ["HN"], skuMain: "GA-300 C1", qty: Math.round(1500*s), probability: 65, deliveryMonths: ["Th5","Th6"], poStatus: null },
  ];
}

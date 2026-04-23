import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { cn } from "@/lib/utils";
import { DemandTotalTab } from "@/components/demand/DemandTotalTab";
import { B2BInputTab } from "@/components/demand/B2BInputTab";
import { useTenant } from "@/components/TenantContext";
import { useDemandForecasts } from "@/hooks/useDemandForecasts";
import { Loader2 } from "lucide-react";
import { B2B_DEALS, B2B_STAGE_PROB, DEMAND_FC, type B2bStage, type B2bDeal } from "@/data/unis-enterprise-dataset";
import { ClickableNumber } from "@/components/ClickableNumber";

const tabs = [
  { key: "total", label: "Demand tổng" },
  { key: "b2b", label: "B2B nhập liệu" },
];

const TENANT_SCALE: Record<string, number> = {
  "UNIS Group": 1,
  "TTC Agris": 0.7,
  "Mondelez": 1.35,
};

export default function DemandPage() {
  const [activeTab, setActiveTab] = useState("total");
  const { tenant } = useTenant();
  const { cnSummaries, loading: forecastLoading } = useDemandForecasts();

  const scale = TENANT_SCALE[tenant] ?? 1;

  // Seed B2B deals from dataset, scaled per tenant
  const [b2bDeals, setB2bDeals] = useState<B2bDeal[]>(() =>
    B2B_DEALS.map((d) => ({ ...d, qtyM2: Math.round(d.qtyM2 * scale) })),
  );

  // Re-seed deals when tenant changes
  const [prevTenant, setPrevTenant] = useState(tenant);
  if (tenant !== prevTenant) {
    setPrevTenant(tenant);
    setB2bDeals(B2B_DEALS.map((d) => ({ ...d, qtyM2: Math.round(d.qtyM2 * scale) })));
  }

  // Aggregate B2B weighted qty per CN for current month (probability-weighted)
  const b2bPerCn = useMemo(() => {
    const out: Record<string, number> = {};
    b2bDeals.forEach((d) => {
      if (d.stage === "Đã ký" || d.stage === "Cam kết" || d.stage === "Đàm phán" ||
          d.stage === "Báo giá" || d.stage === "Tiếp xúc" || d.stage === "Tiềm năng") {
        const weighted = Math.round(d.qtyM2 * B2B_STAGE_PROB[d.stage]);
        out[d.cnCode] = (out[d.cnCode] ?? 0) + weighted;
      }
    });
    return out;
  }, [b2bDeals]);

  // Σ FC totals from dataset (scaled per tenant)
  const fcTotals = useMemo(() => {
    const total = Math.round(DEMAND_FC.reduce((s, r) => s + r.fcM2, 0) * scale);
    const perSku: Record<string, number> = {};
    DEMAND_FC.forEach((r) => {
      perSku[r.skuBaseCode] = (perSku[r.skuBaseCode] ?? 0) + Math.round(r.fcM2 * scale);
    });
    const totalB2bWeighted = Object.values(b2bPerCn).reduce((s, v) => s + v, 0);
    return { total, perSku, totalB2bWeighted };
  }, [scale, b2bPerCn]);

  const topSkuRows = useMemo(
    () =>
      Object.entries(fcTotals.perSku)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([sku, qty]) => ({
          label: sku,
          value: `${qty.toLocaleString()} m²`,
          pct: `${((qty / fcTotals.total) * 100).toFixed(1)}%`,
        })),
    [fcTotals],
  );

  return (
    <AppLayout>
      {/* Header */}
      <div data-tour="demand-header">
        <ScreenHeader
          title="Demand Review — Tháng 5"
          subtitle=""
          badges={
            <>
              <span className="rounded-full bg-info-bg text-info px-3 py-1 text-table-sm font-medium">AOP 2026: 560.000 m²</span>
              <span className="rounded-full bg-success-bg text-success px-3 py-1 text-table-sm font-medium">YTD: 187.600 (34%)</span>
            </>
          }
        />
      </div>

      {forecastLoading && (
        <div className="flex items-center gap-2 text-text-3 text-table-sm mb-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu forecast...
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
                : "text-text-2 hover:text-text-1",
            )}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t" />
            )}
          </button>
        ))}
      </div>

      <div data-tour="demand-total-table">
        {activeTab === "total" && (
          <DemandTotalTab tenant={tenant} b2bPerCn={b2bPerCn} cnSummaries={cnSummaries} />
        )}
      </div>
      <div data-tour="demand-b2b-table">
        {activeTab === "b2b" && (
          <B2BInputTab deals={b2bDeals} setDeals={setB2bDeals} tenant={tenant} />
        )}
      </div>
      <ScreenFooter actionCount={8} />
    </AppLayout>
  );
}

// Re-export the deal type for convenience (legacy callers)
export type { B2bDeal as B2BDealInput } from "@/data/unis-enterprise-dataset";

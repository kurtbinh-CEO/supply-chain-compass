import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { cn } from "@/lib/utils";
import { DemandTotalTab } from "@/components/demand/DemandTotalTab";
import { B2BInputTab } from "@/components/demand/B2BInputTab";
import { FcVsActualTab } from "@/components/demand/FcVsActualTab";
import { useTenant } from "@/components/TenantContext";
import { useDemandForecasts } from "@/hooks/useDemandForecasts";
import { Loader2, Inbox, Zap, FileSpreadsheet, Database, PenLine } from "lucide-react";
import { B2B_DEALS, B2B_STAGE_PROB, DEMAND_FC, AOP_PLAN, getFcActualYtd, type B2bStage, type B2bDeal } from "@/data/unis-enterprise-dataset";
import { ClickableNumber } from "@/components/ClickableNumber";
import { NextStepBanner } from "@/components/NextStepBanner";
import { useNextStep } from "@/components/NextStepContext";
import { DataSourceSelector, type DataSource } from "@/components/DataSourceSelector";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const tabs = [
  { key: "total", label: "Demand tổng" },
  { key: "b2b", label: "B2B nhập liệu" },
  { key: "fc-actual", label: "FC vs Actual" },
];

const TENANT_SCALE: Record<string, number> = {
  "UNIS Group": 1,
  "TTC Agris": 0.7,
  "Mondelez": 1.35,
};

const FC_SOURCES: DataSource[] = [
  {
    key: "api_sync",
    icon: <Zap />,
    title: "Tích hợp DSS / SAP",
    description: "Đồng bộ trực tiếp từ DSS / SAP. Cần thiết lập connector.",
    badge: "Sắp có",
    badgeColor: "gray",
    disabled: true,
    configurable: true,
    configRoute: "/config?tab=integration",
  },
  {
    key: "excel_upload",
    icon: <FileSpreadsheet />,
    title: "Upload Excel",
    description: "Upload file .xlsx theo template. Wizard 5 bước: tải template → validate → áp dụng.",
    badge: "Khuyến nghị",
    badgeColor: "green",
  },
  {
    key: "generate",
    icon: <Database />,
    title: "Tự sinh Baseline",
    description: "Sinh FC bằng Holt-Winters từ history 12 tháng. Dùng khi không có file Excel.",
  },
];

const B2B_SOURCES: DataSource[] = [
  {
    key: "api_sync",
    icon: <Zap />,
    title: "Tích hợp CRM",
    description: "Đồng bộ deals từ HubSpot / Salesforce. Cần thiết lập connector.",
    badge: "Sắp có",
    badgeColor: "gray",
    disabled: true,
    configurable: true,
    configRoute: "/config?tab=integration",
  },
  {
    key: "excel_upload",
    icon: <FileSpreadsheet />,
    title: "Upload Excel",
    description: "Upload danh sách deals theo template. Cột: Khách hàng, SKU, Qty, Xác suất, Giai đoạn.",
    badge: "Khuyến nghị",
    badgeColor: "green",
  },
  {
    key: "manual_input",
    icon: <PenLine />,
    title: "Nhập tay từng deal",
    description: "Dùng nút [+ Thêm deal] để nhập từng deal. Phù hợp khi ít deals mới.",
  },
];

export default function DemandPage() {
  const [activeTab, setActiveTab] = useState("total");
  const { tenant } = useTenant();
  const { cnSummaries, loading: forecastLoading } = useDemandForecasts();
  const { markDone } = useNextStep();
  const [importerOpen, setImporterOpen] = useState(false);

  const handleSourceSelect = (key: string) => {
    setImporterOpen(false);
    const labels: Record<string, string> = {
      api_sync: "Tích hợp tự động (sắp có)",
      excel_upload: "Upload Excel — mở wizard 5 bước",
      generate: "Tự sinh Baseline Holt-Winters",
      manual_input: "Nhập tay",
    };
    toast.success(labels[key] ?? key, {
      description: activeTab === "b2b"
        ? "Áp dụng cho B2B Pipeline."
        : "Áp dụng cho FC tháng.",
    });
  };

  // Mark "FC nhập xong" once forecasts are loaded with data — banner appears so the user can move to /sop.
  useEffect(() => {
    if (!forecastLoading && cnSummaries.length > 0) {
      const t = window.setTimeout(() => markDone("demand.fc-imported"), 800);
      return () => window.clearTimeout(t);
    }
  }, [forecastLoading, cnSummaries.length, markDone]);

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
              <span className="rounded-full bg-info-bg text-info px-3 py-1 text-table-sm font-medium">
                AOP {AOP_PLAN.year}: {AOP_PLAN.totalTarget.toLocaleString("vi-VN")} m²
              </span>
              <span className="rounded-full bg-success-bg text-success px-3 py-1 text-table-sm font-medium">
                YTD: {getFcActualYtd(AOP_PLAN.year).toLocaleString("vi-VN")} ({((getFcActualYtd(AOP_PLAN.year) / AOP_PLAN.totalTarget) * 100).toFixed(1)}%)
              </span>
            </>
          }
          actions={
            <Button size="sm" onClick={() => setImporterOpen(true)} className="h-8 gap-1.5">
              <Inbox className="h-3.5 w-3.5" />
              {activeTab === "b2b" ? "Nhập B2B" : "Nhập FC"}
            </Button>
          }
        />
      </div>

      <DataSourceSelector
        open={importerOpen}
        onClose={() => setImporterOpen(false)}
        title={activeTab === "b2b" ? "Nhập B2B Pipeline" : "Nhập FC tháng"}
        description="Chọn nguồn nhập dữ liệu. Mỗi lần tạo 1 entry trong nhật ký."
        sources={activeTab === "b2b" ? B2B_SOURCES : FC_SOURCES}
        onSelect={handleSourceSelect}
      />



      {forecastLoading && (
        <div className="flex items-center gap-2 text-text-3 text-table-sm mb-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu forecast...
        </div>
      )}

      {/* KPI strip — clickable Σ FC + per-SKU + B2B weighted */}
      <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-surface-3 bg-surface-1 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-caption uppercase text-text-3 tracking-wider">Tổng FC tháng</span>
          <ClickableNumber
            value={`${fcTotals.total.toLocaleString()} m²`}
            label="Tổng FC"
            color="text-text-1 font-display text-section-header"
            breakdown={topSkuRows}
            formula={`Σ FC = ΣΣ DEMAND_FC.fcM2 × tenantScale (${scale})\n= ${fcTotals.total.toLocaleString()} m²`}
            note="Tổng FC bottom-up từ DEMAND_FC dataset, có scale theo tenant"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-caption uppercase text-text-3 tracking-wider">B2B weighted</span>
          <ClickableNumber
            value={`${fcTotals.totalB2bWeighted.toLocaleString()} m²`}
            label="Σ B2B weighted (xác suất)"
            color="text-info font-display text-section-header"
            formula={`Σ (deal.qty × stage_prob)\nstage prob: Đã ký 100% · Cam kết 90% · Đàm phán 70% · Báo giá 50% · Tiếp xúc 30% · Tiềm năng 10%`}
            note="B2B weighted = pipeline có xác suất, nhập riêng vào v3 consensus"
          />
        </div>
        {topSkuRows[0] && (
          <div className="flex flex-col">
            <span className="text-caption uppercase text-text-3 tracking-wider">Top SKU</span>
            <ClickableNumber
              value={topSkuRows[0].label}
              label={`${topSkuRows[0].label}: ${topSkuRows[0].value}`}
              color="text-text-2 font-display text-section-header"
              breakdown={topSkuRows}
              note="Top SKU theo Σ FC trong tháng"
            />
          </div>
        )}
      </div>

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
      {activeTab === "fc-actual" && <FcVsActualTab />}
      <NextStepBanner step="demand.fc-imported" />
      <ScreenFooter actionCount={8} />
    </AppLayout>
  );
}

// Re-export the deal type for convenience (legacy callers)
export type { B2bDeal as B2BDealInput } from "@/data/unis-enterprise-dataset";

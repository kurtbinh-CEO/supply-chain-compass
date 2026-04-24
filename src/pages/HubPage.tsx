/**
 * Hub & Cam kết NM (M6 rewrite)
 *
 * 3 tabs:
 *   1. Cam kết NM   — UNIS Planner gõ cam kết + upload evidence
 *   2. Hub ảo       — Available recalc theo confirmed (giữ HubOverviewTab)
 *   3. Đối chiếu    — Reconciliation (giữ nguyên)
 *
 * XÓA: Sourcing Workbench (4-step), tab cũ "Đặt hàng NM"
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SummaryCards } from "@/components/SummaryCards";
import { VersionHistoryButton } from "@/components/VersionHistoryButton";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { AppLayout } from "@/components/AppLayout";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantContext";
import { CommitmentTab } from "@/components/hub/CommitmentTab";
import { ReconciliationTab } from "@/components/hub/ReconciliationTab";
import { ClickableNumber } from "@/components/ClickableNumber";
import { HubOverviewTab } from "@/components/hub/HubOverviewTab";
import { BookingNettingTab } from "@/components/hub/BookingNettingTab";
import { ChangeLogPanel } from "@/components/ChangeLogPanel";
import { NextStepBanner } from "@/components/NextStepBanner";
import { useNextStep } from "@/components/NextStepContext";
import { usePlanningPeriod } from "@/components/PlanningPeriodContext";
import { PlanningPeriodSelector } from "@/components/PlanningPeriodSelector";
import { DataSourceSelector, type DataSource } from "@/components/DataSourceSelector";
import { Button } from "@/components/ui/button";
import { Inbox, Zap, FileSpreadsheet, PenLine } from "lucide-react";
import { toast } from "sonner";

// Hub-level mock totals (m²) — derived from S&OP locked + NM commitments
function getHubTotals(scale: number, nmConfirmedOverride?: number) {
  const sopLocked = Math.round(7650 * scale);
  const nmConfirmed = nmConfirmedOverride ?? Math.round(7200 * scale); // ~94% honoring
  const released = Math.round(5400 * scale);    // ~75% of confirmed
  const ssHub = Math.round(420 * scale);        // safety stock at hub
  // M6: Available formula = Σ(NM confirmed) − Σ(PO released) − SS Hub
  const available = nmConfirmed - released - ssHub;
  return { sopLocked, nmConfirmed, released, ssHub, available };
}

const tabs = [
  { key: "booking",    label: "Booking" },
  { key: "commitment", label: "Cam kết NM" },
  { key: "overview",   label: "Hub ảo" },
  { key: "recon",      label: "Đối chiếu" },
];

const COMMITMENT_SOURCES: DataSource[] = [
  {
    key: "api_sync",
    icon: <Zap />,
    title: "NM xác nhận trực tuyến",
    description: "Gửi link cho NM xác nhận cam kết online. NM click → confirm từng SKU.",
    badge: "Sắp có",
    badgeColor: "gray",
    disabled: true,
    configurable: true,
    configRoute: "/config?tab=integration",
  },
  {
    key: "excel_upload",
    icon: <FileSpreadsheet />,
    title: "Upload Excel cam kết",
    description: "Upload file cam kết NM theo template. Cột: NM, SKU, Qty cam kết, Tier.",
    badge: "Dự phòng",
    badgeColor: "amber",
  },
  {
    key: "manual_input",
    icon: <PenLine />,
    title: "Gõ tay (gọi NM)",
    description: "Planner gọi điện/Zalo NM → nhập cam kết trực tiếp vào bảng. Upload ảnh minh chứng.",
    badge: "Khuyến nghị",
    badgeColor: "green",
  },
];

export default function HubPage() {
  const [activeTab, setActiveTab] = useState("commitment");
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { markDone } = useNextStep();
  const { current: planCycle, isReadOnly: planLocked } = usePlanningPeriod();
  const scale = tenant === "TTC Agris" ? 0.75 : tenant === "Mondelez" ? 1.2 : 1;
  const [importerOpen, setImporterOpen] = useState(false);

  // M6: Hub Available recalculates when Planner edits commitments
  const [confirmedM2, setConfirmedM2] = useState<number | undefined>(undefined);
  const totals = getHubTotals(scale, confirmedM2);

  // After 1.5s on the page, mark "hub.reviewed" — banner points to /gap-scenario.
  useEffect(() => {
    const t = window.setTimeout(() => markDone("hub.reviewed"), 1500);
    return () => window.clearTimeout(t);
  }, [markDone]);

  const handleSourceSelect = (key: string) => {
    setImporterOpen(false);
    const labels: Record<string, string> = {
      api_sync: "Gửi link cho NM (sắp có)",
      excel_upload: "Upload Excel cam kết — wizard 5 bước",
      manual_input: "Gõ tay trực tiếp vào bảng",
    };
    toast.success(labels[key] ?? key, {
      description: "Áp dụng cho cam kết NM tháng này.",
    });
  };

  return (
    <AppLayout>
      <ScreenHeader
        title="Hub & Cam kết NM"
        subtitle={planLocked ? `Chế độ chỉ xem — ${planCycle.label} đã khóa` : `S&OP locked v${planCycle.version} · Planner gõ cam kết NM trực tiếp`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <PlanningPeriodSelector />
            <VersionHistoryButton entityType="BOOKING" entityId="COMMIT-T5" />
          </div>
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
            formula={`Available = Σ NM Confirmed − Σ Released − SS Hub\n= ${totals.nmConfirmed.toLocaleString()} − ${totals.released.toLocaleString()} − ${totals.ssHub.toLocaleString()}\n= ${totals.available.toLocaleString()} m²`}
            note="Available = số m² còn có thể release từ Hub mà không vi phạm SS"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-caption uppercase text-text-3 tracking-wider">Σ NM Confirmed</span>
          <ClickableNumber
            value={`${totals.nmConfirmed.toLocaleString()} m²`}
            label="Σ NM đã confirm"
            color="text-text-1 font-display text-section-header"
            formula={`Σ NM Confirmed = Σ commitments.committed (status ∈ {confirmed, counter})\nHonoring = ${((totals.nmConfirmed / totals.sopLocked) * 100).toFixed(1)}% vs SOP locked`}
            note="Cam kết của các NM (Planner gõ ở tab 1) — so với SOP locked để tính honoring"
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

      {/* M20-PATCH — Summary thẻ tóm tắt cam kết NM */}
      <div className="mb-5">
        <SummaryCards
          screenId="hub"
          editable
          cards={[
            {
              key: "committed",
              label: "Đã cam kết",
              value: "15/25",
              unit: "SKU",
              trend: { delta: "60% hoàn thành", direction: "up", color: "green" },
              severity: "warn",
              tooltip: "SKU đã có cam kết từ NM (confirmed/counter)",
            },
            {
              key: "waiting",
              label: "Chờ phản hồi",
              value: 5,
              unit: "SKU",
              trend: { delta: "3 NM", direction: "flat", color: "gray" },
              severity: "warn",
              onClick: () => {
                setActiveTab("commitment");
                toast.info("Lọc trạng thái: Chờ NM phản hồi");
              },
            },
            {
              key: "not_contacted",
              label: "Chưa gọi",
              value: 5,
              unit: "SKU",
              trend: { delta: "2 NM", direction: "up", color: "red" },
              severity: "critical",
              onClick: () => {
                setActiveTab("commitment");
                toast.warning("Lọc trạng thái: Chưa liên hệ NM");
              },
            },
            {
              key: "gap",
              label: "Gap",
              value: "1.200",
              unit: "m²",
              trend: { delta: "↓ vs T4", direction: "down", color: "green" },
              severity: "warn",
              onClick: () => navigate("/gap-scenario"),
            },
          ]}
        />
      </div>

      <div data-tour="hub-tabs" className="flex items-center justify-between border-b border-surface-3 mb-6">
        <div className="flex items-center gap-0">
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
        {activeTab === "commitment" && (
          <Button size="sm" onClick={() => setImporterOpen(true)} className="h-8 gap-1.5 mb-1.5">
            <Inbox className="h-3.5 w-3.5" />
            Nhập cam kết
          </Button>
        )}
      </div>

      <DataSourceSelector
        open={importerOpen}
        onClose={() => setImporterOpen(false)}
        title="Nhập cam kết NM"
        description="Chọn cách nhập cam kết. Phương án Khuyến nghị: Planner gọi NM rồi gõ tay."
        sources={COMMITMENT_SOURCES}
        onSelect={handleSourceSelect}
      />

      <div data-tour="hub-booking">
        {activeTab === "booking" && (
          <BookingNettingTab
            cycleLabel={planCycle.label}
            sopVersion={planCycle.version}
            scale={scale}
            autoRanAt={typeof window !== "undefined" ? window.sessionStorage.getItem("scp-booking-autoran") : null}
          />
        )}
      </div>
      <div data-tour="hub-commitment">
        {activeTab === "commitment" && (
          <CommitmentTab scale={scale} onTotalsChange={setConfirmedM2} />
        )}
      </div>
      <div data-tour="hub-overview">
        {activeTab === "overview" && <HubOverviewTab scale={scale} totals={totals} />}
      </div>
      <div data-tour="hub-recon">
        {activeTab === "recon" && <ReconciliationTab scale={scale} />}
      </div>
      {activeTab !== "commitment" && (
        <div className="mt-6">
          <ChangeLogPanel entityType="hub_stock" maxItems={6} />
        </div>
      )}
      <NextStepBanner step="hub.reviewed" />
      <ScreenFooter actionCount={9} />
    </AppLayout>
  );
}

/**
 * Hub & Cam kết NM (HUB-REDESIGN)
 *
 * 3-step flow thay 4 tabs + 13 cards:
 *   ① Booking      — auto sau S&OP lock
 *   ② Cam kết NM   — Planner gọi NM, gõ cam kết
 *   ③ PO & Theo dõi — burn-down
 */
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { AppLayout } from "@/components/AppLayout";
import { useTenant } from "@/components/TenantContext";
import { VersionHistoryButton } from "@/components/VersionHistoryButton";
import { PlanningPeriodSelector } from "@/components/PlanningPeriodSelector";
import { usePlanningPeriod } from "@/components/PlanningPeriodContext";
import { useNextStep } from "@/components/NextStepContext";
import { NextStepBanner } from "@/components/NextStepBanner";
import { HubStepIndicator, type HubStepKey, type HubStep } from "@/components/hub/HubStepIndicator";
import { Step1Booking } from "@/components/hub/Step1Booking";
import { Step2Commitment } from "@/components/hub/Step2Commitment";
import { Step3Tracking } from "@/components/hub/Step3Tracking";

export default function HubPage() {
  const { tenant } = useTenant();
  const { current: planCycle } = usePlanningPeriod();
  const { markDone } = useNextStep();
  const [params, setParams] = useSearchParams();
  const scale = tenant === "TTC Agris" ? 0.75 : tenant === "Mondelez" ? 1.2 : 1;

  // Hub Available recalc when commitment changes
  const [confirmedM2, setConfirmedM2] = useState<number>(7200);
  const released = Math.round(5400 * scale);
  const ssHub = Math.round(420 * scale);
  const hubAvailable = confirmedM2 - released - ssHub;

  const initialStep = (params.get("step") as HubStepKey) || "commitment";
  const [activeStep, setActiveStep] = useState<HubStepKey>(initialStep);

  useEffect(() => {
    const t = window.setTimeout(() => markDone("hub.reviewed"), 1500);
    return () => window.clearTimeout(t);
  }, [markDone]);

  const setStep = (s: HubStepKey) => {
    setActiveStep(s);
    setParams(prev => {
      const next = new URLSearchParams(prev);
      next.set("step", s);
      return next;
    }, { replace: true });
  };

  const steps: HubStep[] = useMemo(() => {
    const bookingNeeded = 48_300;
    return [
      { key: "booking", index: 1, title: "Booking",
        summary: `✅ ${Math.round(bookingNeeded * scale).toLocaleString()} m²`,
        status: "done" },
      { key: "commitment", index: 2, title: "Cam kết NM",
        summary: activeStep === "commitment" ? "● Đang làm" : "13/25 SKU",
        status: activeStep === "tracking" ? "done" : activeStep === "commitment" ? "active" : "pending" },
      { key: "tracking", index: 3, title: "PO & Theo dõi",
        summary: `7.800 / ${Math.round(12_700 * scale).toLocaleString()}`,
        status: activeStep === "tracking" ? "active" : "pending" },
    ];
  }, [activeStep, scale]);

  return (
    <AppLayout>
      <ScreenHeader
        title="Hub & Cam kết NM"
        subtitle={`S&OP locked v${planCycle.version} · Planner gõ cam kết trực tiếp`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <PlanningPeriodSelector />
            <VersionHistoryButton entityType="BOOKING" entityId="COMMIT-T5" />
          </div>
        }
      />

      <div className="space-y-4">
        <HubStepIndicator steps={steps} active={activeStep} onSelect={setStep} />

        {activeStep === "booking" && (
          <Step1Booking
            scale={scale}
            sopLocked={true}
            sopVersion={planCycle.version}
            onNext={() => setStep("commitment")}
          />
        )}
        {activeStep === "commitment" && (
          <Step2Commitment
            scale={scale}
            onPrev={() => setStep("booking")}
            onNext={() => setStep("tracking")}
            onTotalsChange={setConfirmedM2}
            hubAvailable={hubAvailable}
          />
        )}
        {activeStep === "tracking" && (
          <Step3Tracking
            scale={scale}
            onPrev={() => setStep("commitment")}
          />
        )}
      </div>

      <NextStepBanner step="hub.reviewed" />
      <ScreenFooter actionCount={3} />
    </AppLayout>
  );
}

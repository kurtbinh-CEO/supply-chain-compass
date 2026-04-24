import { useState, useCallback, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantContext";
import { ConsensusTab } from "@/components/sop/ConsensusTab";
import { BalanceLockTab } from "@/components/sop/BalanceLockTab";
import { SopDeadlineStepper } from "@/components/sop/SopDeadlineStepper";
import { FileText, Loader2, PackageOpen } from "lucide-react";
import { LogicLink } from "@/components/LogicLink";
import { usePlanningPeriod } from "@/components/PlanningPeriodContext";
import { PlanningPeriodSelector } from "@/components/PlanningPeriodSelector";
import { AvatarBar, AutoSaveIndicator, useCellPresence } from "@/components/CellPresence";
import { useVersionConflict, VersionConflictDialog } from "@/components/VersionConflict";
import { PreLockDialog } from "@/components/BatchLockBanner";
import { useSopConsensus } from "@/hooks/useSopConsensus";
import { BRANCHES, DEMAND_FC, SKU_BASES, SKU_VARIANTS, AOP_PLAN, getAopMonth } from "@/data/unis-enterprise-dataset";
import { ClickableNumber } from "@/components/ClickableNumber";
import { ChangeLogPanel } from "@/components/ChangeLogPanel";
import { NextStepBanner } from "@/components/NextStepBanner";
import { useNextStep } from "@/components/NextStepContext";
import { VersionComparePanel } from "@/components/sop/VersionComparePanel";

const tabs = [
  { key: "consensus", label: "Consensus" },
  { key: "balance", label: "Cân đối & Lock" },
];

export interface ConsensusRow {
  cn: string;
  v0: number;
  v1: number;
  v2: number;
  v3: number;
  aop: number;
  fvaBest: string;
  skus: SkuRow[];
}

export interface SkuRow {
  item: string;
  variant: string;
  v0: number;
  v1: number;
  v2: number;
  v3: number;
  aop: number;
  note: string;
}

/* ─── Build 12-CN consensus from enterprise dataset ─────────────────────── */
function buildEnterpriseConsensus(): ConsensusRow[] {
  // Top 4 SKU bases by FC volume to keep tables readable
  const topBases = [...SKU_BASES]
    .map((b) => ({
      base: b,
      total: DEMAND_FC.filter((r) => r.skuBaseCode === b.code).reduce((a, r) => a + r.fcM2, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)
    .map((x) => x.base);

  const fvaModels = ["v2 CN Input", "v0 Statistical", "v1 Sales", "v3 Consensus"];

  // AOP tháng 5 phân bổ theo trọng số nhóm SKU + tỷ lệ FC theo CN.
  // Thay cho hardcode `baseFc * 0.92` — đọc từ AOP_PLAN (M17).
  const aopMay = getAopMonth(5);
  const totalFcMay = DEMAND_FC.reduce((s, r) => s + r.fcM2, 0) || 1;

  return BRANCHES.map((cn, cnIdx) => {
    const skus: SkuRow[] = topBases.flatMap((base) => {
      const variants = SKU_VARIANTS.filter((v) => v.baseCode === base.code).slice(0, 1);
      const fcRow = DEMAND_FC.find((r) => r.skuBaseCode === base.code && r.cnCode === cn.code);
      const baseFc = fcRow?.fcM2 ?? 0;
      // Trọng số nhóm SKU từ AOP_PLAN ("GA-300" / "GA-400" / "GA-600" / "Khác")
      const groupKey = AOP_PLAN.skuGroupWeights[base.code] != null ? base.code : "Khác";
      const groupWeight = (AOP_PLAN.skuGroupWeights[groupKey] ?? 0) / 100;
      const cnSkuShare = totalFcMay > 0 ? baseFc / totalFcMay : 0;
      // AOP cho ô (CN × SKU) = AOP tháng × trọng số nhóm × tỷ lệ FC của CN trong tổng FC
      const aop = Math.round(aopMay * groupWeight * cnSkuShare * (totalFcMay / Math.max(1, baseFc * 12)));
      return variants.map((vt) => {
        const v0 = Math.round(baseFc * 0.95);
        const v1 = Math.round(baseFc * 1.05);
        const v2 = Math.round(baseFc * 1.02);
        const v3 = baseFc;
        return {
          item: base.code,
          variant: vt.variantTag,
          v0,
          v1,
          v2,
          v3,
          aop: aop > 0 ? aop : Math.round(baseFc * 0.92),  // fallback nếu data trống
          note: "",
        };
      });
    });

    // Top-down v0 deliberately differs slightly from Σ(SKU v0) for some CNs to
    // demonstrate the >10% top-down/bottom-up variance row highlight.
    const sumV0 = skus.reduce((a, s) => a + s.v0, 0);
    const sumV1 = skus.reduce((a, s) => a + s.v1, 0);
    const sumV2 = skus.reduce((a, s) => a + s.v2, 0);
    const sumV3 = skus.reduce((a, s) => a + s.v3, 0);
    const sumAop = skus.reduce((a, s) => a + s.aop, 0);
    // Inject 2 deliberate variance cases for the demo (CN-HCM +14%, CN-NA -12%)
    const topDownV0 =
      cn.code === "CN-HCM"
        ? Math.round(sumV0 * 0.86)
        : cn.code === "CN-NA"
          ? Math.round(sumV0 * 1.14)
          : sumV0;

    return {
      cn: cn.code,
      v0: topDownV0,
      v1: sumV1,
      v2: sumV2,
      v3: sumV3,
      aop: sumAop,
      fvaBest: fvaModels[cnIdx % fvaModels.length],
      skus,
    };
  });
}

export default function SopPage() {
  const [activeTab, setActiveTab] = useState("consensus");
  const { tenant } = useTenant();
  const { markDone } = useNextStep();
  const { current: planCycle, isReadOnly: planLocked } = usePlanningPeriod();

  const [locked, setLocked] = useState(false);
  const [showPreLock, setShowPreLock] = useState(false);

  // Mark "S&OP locked" → trigger banner pointing to /supply.
  const lockAndMark = useCallback(() => {
    setLocked(true);
    markDone("sop.locked");
  }, [markDone]);

  // Mock current S&OP day-of-cycle (Day 5/30 — Cân đối phase)
  const [currentDay] = useState(5);

  const cellPresence = useCellPresence("sop-consensus", { id: "u-me", name: "Bạn", role: "Planner", color: "bg-primary text-primary-foreground" });
  const { conflict, triggerConflict, clearConflict } = useVersionConflict();

  // DB data
  const { data: dbData, loading } = useSopConsensus();

  // Enterprise dataset fallback (12 CN)
  const enterpriseData = useMemo(() => buildEnterpriseConsensus(), []);

  // Use DB if it has 12 rows, otherwise fall back to enterprise dataset (12 CN)
  const seedData: ConsensusRow[] = dbData.length >= 12 ? dbData : enterpriseData;

  // Make consensus data stateful for local edits
  const [consensusData, setConsensusData] = useState<ConsensusRow[]>(enterpriseData);
  const [prevSeed, setPrevSeed] = useState<ConsensusRow[]>(enterpriseData);
  if (seedData !== prevSeed && seedData.length > 0) {
    setPrevSeed(seedData);
    setConsensusData(seedData);
  }

  // Variance explanations for top-down vs bottom-up >±10%
  const [varianceExplanations, setVarianceExplanations] = useState<Record<string, string>>({});

  const handleUpdateV3 = useCallback((cnIdx: number, skuIdx: number | null, value: number) => {
    setConsensusData(prev => {
      const next = prev.map((r, i) => {
        if (i !== cnIdx) return r;
        if (skuIdx === null) {
          return { ...r, v3: value };
        }
        const newSkus = r.skus.map((s, si) => si === skuIdx ? { ...s, v3: value } : s);
        const newTotal = newSkus.reduce((a, s) => a + s.v3, 0);
        return { ...r, v3: newTotal, skus: newSkus };
      });
      return next;
    });
  }, []);

  const handleUpdateNote = useCallback((cnIdx: number, skuIdx: number, note: string) => {
    setConsensusData(prev => prev.map((r, i) => {
      if (i !== cnIdx) return r;
      return { ...r, skus: r.skus.map((s, si) => si === skuIdx ? { ...s, note } : s) };
    }));
  }, []);

  const handleUpdateVariance = useCallback((cnCode: string, text: string) => {
    setVarianceExplanations((prev) => ({ ...prev, [cnCode]: text }));
  }, []);

  const totalAop = consensusData.reduce((a, r) => a + r.aop, 0);
  const totalV3 = consensusData.reduce((a, r) => a + r.v3, 0);

  // Compute unresolved variance: |Σ(SKU v3) − v0_topdown| / v0_topdown > 10%
  // and explanation < 6 chars
  const unresolvedVariance = useMemo(() => {
    return consensusData.filter((r) => {
      if (r.v0 <= 0) return false;
      const bottomUp = r.skus.reduce((a, s) => a + s.v3, 0);
      const variancePct = Math.abs(bottomUp - r.v0) / r.v0;
      if (variancePct <= 0.1) return false;
      return (varianceExplanations[r.cn] ?? "").trim().length < 6;
    }).length;
  }, [consensusData, varianceExplanations]);

  return (
    <AppLayout>
      <ScreenHeader
        title="S&OP Consensus — Tháng 5"
        subtitle="Digital Curator — Consensus Planning"
        actions={
          <>
            <LogicLink tab="monthly" node={1} tooltip="Logic S&OP Consensus → Lock" />
            <button className="rounded-button bg-gradient-primary text-white px-4 py-2 text-table-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" /> Pre-meeting report
            </button>
          </>
        }
      />

      {/* Deadline stepper */}
      <SopDeadlineStepper currentDay={currentDay} locked={locked} />

      {/* Status strip */}
      <div data-tour="sop-status" className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-info-bg text-info text-table-sm font-medium px-3 py-1">
          Day {currentDay}/30
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg text-warning text-table-sm font-medium px-3 py-1">
          🔒 Lock Day 7 — còn {Math.max(0, 7 - currentDay)} ngày
        </span>
        {locked && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success text-table-sm font-medium px-3 py-1">
            ✅ Locked
          </span>
        )}
        <div className="flex-1" />
        <AvatarBar users={cellPresence.onlineUsers} />
      </div>

      {/* KPI strip — clickable totals */}
      {consensusData.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-surface-3 bg-surface-1 px-4 py-3">
          <div className="flex flex-col">
            <span className="text-caption uppercase text-text-3 tracking-wider">Σ v3 Consensus</span>
            <ClickableNumber
              value={`${totalV3.toLocaleString()} m²`}
              label="Σ v3 Consensus"
              color="text-text-1 font-display text-section-header"
              breakdown={consensusData.slice(0, 6).map((r) => ({
                label: r.cn,
                value: `${r.v3.toLocaleString()} m²`,
              }))}
              formula={`Σ v3 = ${consensusData.map((r) => r.v3.toLocaleString()).slice(0, 4).join(" + ")}${consensusData.length > 4 ? " + ..." : ""} = ${totalV3.toLocaleString()} m²`}
              note="v3 = phiên bản consensus cuối, sẽ lock Day 7"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-caption uppercase text-text-3 tracking-wider">Σ AOP</span>
            <ClickableNumber
              value={`${totalAop.toLocaleString()} m²`}
              label="Σ AOP cả năm chia"
              color="text-text-2 font-display text-section-header"
              note="AOP = Annual Operating Plan, baseline so sánh"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-caption uppercase text-text-3 tracking-wider">Variance v3 vs AOP</span>
            <ClickableNumber
              value={`${totalAop > 0 ? (((totalV3 - totalAop) / totalAop) * 100).toFixed(1) : "0"}%`}
              label="Δ v3 vs AOP"
              color={cn(
                "font-display text-section-header",
                totalV3 > totalAop ? "text-warning" : "text-success",
              )}
              formula={`(Σ v3 − Σ AOP) / Σ AOP\n= (${totalV3.toLocaleString()} − ${totalAop.toLocaleString()}) / ${totalAop.toLocaleString()}\n= ${totalAop > 0 ? (((totalV3 - totalAop) / totalAop) * 100).toFixed(1) : "0"}%`}
              note={
                totalV3 > totalAop
                  ? `Demand consensus cao hơn AOP ${((totalV3 - totalAop) / 1000).toFixed(1)}k m² vì sales tự tin Q2`
                  : "Demand consensus thấp hơn AOP — cần kiểm tra B2B pipeline"
              }
            />
          </div>
          {unresolvedVariance > 0 && (
            <div className="ml-auto rounded-button bg-danger-bg/50 border border-danger/20 px-3 py-1.5 text-table-sm text-danger">
              ⚠ {unresolvedVariance} CN có variance &gt;10% chưa giải trình vì top-down ≠ Σ(SKU bottom-up)
            </div>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-surface-3 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-5 py-3 text-table font-medium transition-colors relative whitespace-nowrap",
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

      {/* Loading */}
      {loading && consensusData.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!loading && consensusData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <PackageOpen className="h-16 w-16 text-text-3 mb-4" />
          <h3 className="text-heading-3 font-semibold text-text-1 mb-2">Chưa có dữ liệu S&OP</h3>
          <p className="text-body text-text-3 max-w-md">
            Chưa có dữ liệu consensus cho kỳ này. Hãy tạo forecast trước khi bắt đầu S&OP.
          </p>
        </div>
      )}

      {/* Content */}
      {consensusData.length > 0 && (
        <>
          <div data-tour="sop-consensus">
            {activeTab === "consensus" && (
              <>
                <ConsensusTab
                  data={consensusData}
                  totalAop={totalAop}
                  totalV3={totalV3}
                  locked={locked}
                  onUpdateV3={handleUpdateV3}
                  onUpdateNote={handleUpdateNote}
                  varianceExplanations={varianceExplanations}
                  onUpdateVariance={handleUpdateVariance}
                />
                <VersionComparePanel />
              </>
            )}
          </div>
          <div data-tour="sop-balance">
            {activeTab === "balance" && (
              <BalanceLockTab
                data={consensusData}
                totalV3={totalV3}
                totalAop={totalAop}
                locked={locked}
                unresolvedVariance={unresolvedVariance}
                onLock={() => {
                  if (cellPresence.onlineUsers.length > 1) {
                    setShowPreLock(true);
                  } else {
                    lockAndMark();
                  }
                }}
                tenant={tenant}
              />
            )}
          </div>
        </>
      )}

      {/* Concurrency: Pre-Lock Dialog */}
      {showPreLock && (
        <PreLockDialog
          editors={[
            { name: "Planner C", cell: "HN×GA-400", duration: "2m" },
            { name: "Sales N", cell: "CT×GA-600", duration: "45s" },
          ]}
          onNotifyWait={() => { import("sonner").then(m => m.toast.info("Đã gửi thông báo tới editors. Chờ 5 phút...")); }}
          onForceLock={() => { lockAndMark(); setShowPreLock(false); import("sonner").then(m => m.toast.warning("S&OP đã locked. Unsaved data → Drafts.")); }}
          onClose={() => setShowPreLock(false)}
        />
      )}

      {/* Concurrency: Version Conflict */}
      {conflict && (
        <VersionConflictDialog
          conflict={conflict}
          onReload={() => { clearConflict(); }}
          onForceUpdate={() => { clearConflict(); import("sonner").then(m => m.toast.success("Đã ghi đè. Audit logged.")); }}
          onClose={clearConflict}
        />
      )}

      <AutoSaveIndicator lastSaved={cellPresence.lastSaved} offline={cellPresence.offline} />
      <div className="mt-6">
        <ChangeLogPanel entityType="sop_consensus" maxItems={6} />
      </div>
      <NextStepBanner step="sop.locked" />
      <ScreenFooter actionCount={5} />
    </AppLayout>
  );
}

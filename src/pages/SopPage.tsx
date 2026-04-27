/**
 * SopPage — Đồng thuận S&OP (3-layer redesign).
 *
 * LỚP 1 — Header 1 dòng (title + plan period + actions).
 * LỚP 2 — Tiến trình + 4 Summary Cards (mỗi số chỉ hiện 1 lần).
 * LỚP 3 — Pivot toggle + Table + Drill-down (ConsensusTab).
 * SAU TABLE — SopActionBar gộp giải trình / cân đối / khóa.
 *
 * XÓA: subtitle "Digital Curator", status strip Day/Lock, KPI strip Σ v3/AOP/Variance,
 * warning banner trùng, tab bar Consensus/Balance, 5 cards trùng trong tab.
 * Mọi text tiếng Việt.
 */
import { useState, useCallback, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { useTenant } from "@/components/TenantContext";
import { ConsensusTab } from "@/components/sop/ConsensusTab";
import { BalanceLockTab } from "@/components/sop/BalanceLockTab";
import { SopActionBar } from "@/components/sop/SopActionBar";
import { Loader2, PackageOpen, FileDown, ChevronDown } from "lucide-react";
import { LogicLink } from "@/components/LogicLink";
import { usePlanningPeriod } from "@/components/PlanningPeriodContext";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PlanningPeriodSelector } from "@/components/PlanningPeriodSelector";
import { useCellPresence } from "@/components/CellPresence";
import { useVersionConflict, VersionConflictDialog } from "@/components/VersionConflict";
import { PreLockDialog } from "@/components/BatchLockBanner";
import { useSopConsensus } from "@/hooks/useSopConsensus";
import { BRANCHES, DEMAND_FC, SKU_BASES, SKU_VARIANTS, AOP_PLAN, getAopMonth } from "@/data/unis-enterprise-dataset";
import { ChangeLogPanel } from "@/components/ChangeLogPanel";
import { NextStepBanner } from "@/components/NextStepBanner";
import { useNextStep } from "@/components/NextStepContext";
import { VersionComparePanel } from "@/components/sop/VersionComparePanel";
import { VersionHistoryButton } from "@/components/VersionHistoryButton";
import { SummaryCards } from "@/components/SummaryCards";
import { TimeRangeFilter, HistoryBanner, useTimeRange, defaultTimeRange } from "@/components/TimeRangeFilter";
import { sopCompare } from "@/lib/compare-metrics";
import { AutoSaveIndicator } from "@/components/CellPresence";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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
  const topBases = [...SKU_BASES]
    .map((b) => ({
      base: b,
      total: DEMAND_FC.filter((r) => r.skuBaseCode === b.code).reduce((a, r) => a + r.fcM2, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)
    .map((x) => x.base);

  const fvaModels = ["v2 CN nhập", "v0 Thống kê", "v1 Kinh doanh", "v3 Đồng thuận"];

  const aopMay = getAopMonth(5);
  const totalFcMay = DEMAND_FC.reduce((s, r) => s + r.fcM2, 0) || 1;

  return BRANCHES.map((cn, cnIdx) => {
    const skus: SkuRow[] = topBases.flatMap((base) => {
      const variants = SKU_VARIANTS.filter((v) => v.baseCode === base.code).slice(0, 1);
      const fcRow = DEMAND_FC.find((r) => r.skuBaseCode === base.code && r.cnCode === cn.code);
      const baseFc = fcRow?.fcM2 ?? 0;
      const groupKey = AOP_PLAN.skuGroupWeights[base.code] != null ? base.code : "Khác";
      const groupWeight = (AOP_PLAN.skuGroupWeights[groupKey] ?? 0) / 100;
      const cnSkuShare = totalFcMay > 0 ? baseFc / totalFcMay : 0;
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
          aop: aop > 0 ? aop : Math.round(baseFc * 0.92),
          note: "",
        };
      });
    });

    const sumV0 = skus.reduce((a, s) => a + s.v0, 0);
    const sumV1 = skus.reduce((a, s) => a + s.v1, 0);
    const sumV2 = skus.reduce((a, s) => a + s.v2, 0);
    const sumV3 = skus.reduce((a, s) => a + s.v3, 0);
    const sumAop = skus.reduce((a, s) => a + s.aop, 0);
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
  const { tenant } = useTenant();
  const { markDone } = useNextStep();
  const {
    current: planCycle,
    isReadOnly: planLocked,
    markStepCompleted,
  } = usePlanningPeriod();
  const [timeRange, setTimeRange] = useTimeRange("sop", "monthly");
  const { setSopLock, addNotification } = useWorkspace();

  const [locked, setLocked] = useState(false);
  const [showPreLock, setShowPreLock] = useState(false);
  const [lockBlockedDialog, setLockBlockedDialog] = useState<{ count: number } | null>(null);

  // Mock current S&OP day-of-cycle (Ngày 5/30 — Cân đối phase)
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

  // Variance chưa giải trình: |Σ(SKU v3) − v0_topdown| / v0_topdown > 10% & explanation < 6 chars
  const unresolvedVariance = useMemo(() => {
    return consensusData.filter((r) => {
      if (r.v0 <= 0) return false;
      const bottomUp = r.skus.reduce((a, s) => a + s.v3, 0);
      const variancePct = Math.abs(bottomUp - r.v0) / r.v0;
      if (variancePct <= 0.1) return false;
      return (varianceExplanations[r.cn] ?? "").trim().length < 6;
    }).length;
  }, [consensusData, varianceExplanations]);

  // Trigger chain khi khóa (đã pass tất cả check)
  const lockAndMark = useCallback(() => {
    setLocked(true);
    markDone("sop.locked");
    // 1. Cập nhật state machine kỳ kế hoạch
    markStepCompleted("sop");
    // 2. Cập nhật badge sidebar / Workspace
    setSopLock({ locked: true, lockedAt: Date.now() });
    // 3. Notification cho Workspace inbox
    addNotification({
      id: `NTF-SOP-LOCK-${Date.now()}`,
      type: "SOP_LOCKED",
      typeColor: "info",
      message: `S&OP ${planCycle.label} đã khoá. 5 NM cần cam kết Net Booking — mở Hub để bắt đầu.`,
      timeAgo: "vừa xong",
      read: false,
      url: "/hub?tab=booking",
    });

    import("sonner").then(m => {
      m.toast.success("✅ S&OP T5/2026 đã được khóa", {
        description: `${consensusData.length} CN · v3 = ${totalV3.toLocaleString("vi-VN")} m². Chuyển sang giai đoạn cam kết NM.`,
        duration: 5000,
      });

      const totalBooking = Math.round(totalV3 * 0.78);
      const nmCount = 5;
      setTimeout(() => {
        m.toast.info(`📦 Đã tạo Booking T5 v1: ${totalBooking.toLocaleString("vi-VN")} m² từ ${nmCount} NM`, {
          description: "Net Booking = FC 3M − Hub − Pipeline đã sẵn sàng tại Hub & Cam kết",
          duration: 6000,
          action: { label: "Mở Hub →", onClick: () => { window.location.href = "/hub?tab=booking"; } },
        });
      }, 800);

      setTimeout(() => {
        m.toast.warning(`🔔 ${nmCount} NM cần cam kết Net Booking`, {
          description: "Mikado, Tân Việt, Hà Anh, Phương Nam, An Lộc — pre-fill qty per SKU",
          duration: 8000,
          action: { label: "Mở Cam kết NM →", onClick: () => { window.location.href = "/hub?tab=commit"; } },
        });
      }, 1600);
    });
  }, [markDone, markStepCompleted, setSopLock, addNotification, planCycle.label, consensusData.length, totalV3]);

  /** Gate trước khi gọi lockAndMark — chặn nếu còn variance chưa giải trình. */
  const attemptLock = useCallback(() => {
    if (unresolvedVariance > 0) {
      setLockBlockedDialog({ count: unresolvedVariance });
      return;
    }
    if (cellPresence.onlineUsers.length > 1) {
      setShowPreLock(true);
    } else {
      lockAndMark();
    }
  }, [unresolvedVariance, cellPresence.onlineUsers.length, lockAndMark]);

  // CN cần xem = số CN có |Δ vs AOP| > 10%
  const cnNeedReview = useMemo(() => {
    return consensusData.filter((r) => {
      if (r.aop <= 0) return false;
      return Math.abs(r.v3 - r.aop) / r.aop > 0.1;
    }).length;
  }, [consensusData]);

  const variancePct = totalAop > 0 ? Math.round(((totalV3 - totalAop) / totalAop) * 100) : 0;
  const varianceAbs = totalV3 - totalAop;

  // Tiến trình S&OP — 4 phase
  const phaseLabel = currentDay <= 4
    ? "Nhập liệu"
    : currentDay < 7
      ? "Cân đối"
      : currentDay < 10
        ? "Khóa"
        : "Tự khóa";
  const daysToLock = Math.max(0, 7 - currentDay);

  // ───────────────────────────── render ─────────────────────────────
  return (
    <AppLayout>
      {/* LỚP 1 — Header 1 dòng */}
      <ScreenHeader
        title="Đồng thuận S&OP"
        subtitle={planLocked ? `Chế độ chỉ xem — ${planCycle.label} đã khóa` : undefined}
        actions={
          <>
            <TimeRangeFilter
              mode="monthly"
              value={timeRange}
              onChange={setTimeRange}
              screenId="sop"
            />
            <PlanningPeriodSelector />
            <VersionHistoryButton entityType="SOP" entityId="SOP-T5" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={planLocked}
                  className="inline-flex h-8 items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 px-3 text-table-sm font-medium text-text-1 hover:border-primary hover:text-primary disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  <FileDown className="h-3.5 w-3.5" /> Xuất <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => toast.success("Đã tạo Báo cáo trước họp (PDF)")}>
                  📄 Báo cáo trước họp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.success("Đã xuất Excel S&OP v3")}>
                  📊 Xuất Excel S&OP v3
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast.success("Đã copy snapshot consensus")}>
                  📋 Copy snapshot
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <LogicLink tab="monthly" node={1} tooltip="Logic S&OP Đồng thuận → Khóa" />
          </>
        }
      />

      <HistoryBanner
        range={timeRange}
        onReset={() => setTimeRange(defaultTimeRange("monthly"))}
        entity="S&OP"
        resetLabel="Quay về tháng này"
        currentLabel="Tháng này (T5)"
        compareMetrics={sopCompare(timeRange)}
      />

      {/* LỚP 2 — Tiến trình (1 dòng nhỏ) + 4 Summary Cards */}
      {consensusData.length > 0 && (
        <>
          <div className="mb-3 flex items-center gap-2 text-caption text-text-3 flex-wrap">
            <span className="font-semibold uppercase tracking-wider">Tiến trình S&OP:</span>
            <span className={phaseLabel === "Nhập liệu" ? "text-success font-medium" : "text-success"}>
              Nhập liệu ✅
            </span>
            <span className="text-text-3">→</span>
            <span className={phaseLabel === "Cân đối" ? "text-primary font-semibold" : "text-text-3"}>
              {phaseLabel === "Cân đối" ? "● " : ""}Cân đối
            </span>
            <span className="text-text-3">→</span>
            <span className={phaseLabel === "Khóa" ? "text-warning font-semibold" : "text-text-3"}>
              Khóa (ngày 5–7)
            </span>
            <span className="text-text-3">→</span>
            <span className={phaseLabel === "Tự khóa" ? "text-danger font-semibold" : "text-text-3"}>
              Tự khóa (ngày 10)
            </span>
            <span className="mx-2 text-text-3">·</span>
            <span className="text-text-2 font-medium">
              Ngày {currentDay}/30 · Khóa trong {daysToLock} ngày
            </span>
          </div>

          <div className="mb-5">
            <SummaryCards
              screenId="sop"
              editable
              cards={[
                {
                  key: "consensus",
                  label: "Đồng thuận",
                  value: totalV3.toLocaleString("vi-VN"),
                  unit: "m²",
                  trend: { delta: locked ? "v3 đã khóa" : "v3 đang chốt", direction: "flat", color: locked ? "green" : "gray" },
                  severity: "ok",
                  tooltip: "Tổng demand consensus phiên v3 — chốt ngày 7",
                },
                {
                  key: "vs_aop",
                  label: "So AOP",
                  value: `${variancePct >= 0 ? "+" : ""}${variancePct}%`,
                  unit: "",
                  trend: {
                    delta: `${varianceAbs >= 0 ? "+" : ""}${varianceAbs.toLocaleString("vi-VN")} m² ${varianceAbs >= 0 ? "vượt" : "thiếu"}`,
                    direction: varianceAbs >= 0 ? "up" : "down",
                    color: Math.abs(variancePct) > 10 ? "red" : "green",
                  },
                  severity: Math.abs(variancePct) > 10 ? "warn" : "ok",
                  tooltip: "Chênh lệch giữa v3 đồng thuận và AOP baseline",
                },
                {
                  key: "need_review",
                  label: "CN cần xem",
                  value: cnNeedReview,
                  unit: "CN",
                  trend: {
                    delta: cnNeedReview > 0 ? "|Δ vs AOP| > 10%" : "Trong biên",
                    direction: "flat",
                    color: cnNeedReview > 0 ? "red" : "green",
                  },
                  severity: cnNeedReview > 0 ? "warn" : "ok",
                  onClick: () => toast.info("Lọc CN có |Δ vs AOP| > ±10%", {
                    description: "Cuộn xuống bảng — các CN này có viền đỏ.",
                  }),
                },
                {
                  key: "explained",
                  label: "Đã giải trình",
                  value: `${Math.max(0, consensusData.length - unresolvedVariance)}/${consensusData.length}`,
                  unit: "CN",
                  trend: {
                    delta: unresolvedVariance > 0 ? "🔴 chưa đủ" : "✅ hoàn tất",
                    direction: "flat",
                    color: unresolvedVariance > 0 ? "red" : "green",
                  },
                  severity: unresolvedVariance > 0 ? "warn" : "ok",
                  tooltip: "Số CN đã ghi giải trình cho variance > ±10%",
                },
              ]}
            />
          </div>
        </>
      )}

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

      {/* LỚP 3 — Pivot toggle + Table + Drill-down */}
      {consensusData.length > 0 && (
        <>
          <div data-tour="sop-consensus">
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
          </div>

          {/* Action bar — gộp Cân đối & Khóa thay tab riêng */}
          <SopActionBar
            totalV3={totalV3}
            totalAop={totalAop}
            unresolvedVariance={unresolvedVariance}
            totalCn={consensusData.length}
            currentDay={currentDay}
            locked={locked}
            onLock={() => {
              if (cellPresence.onlineUsers.length > 1) {
                setShowPreLock(true);
              } else {
                lockAndMark();
              }
            }}
            detailSlot={
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
            }
          />
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
          onForceLock={() => { lockAndMark(); setShowPreLock(false); import("sonner").then(m => m.toast.warning("S&OP đã khóa. Unsaved data → Drafts.")); }}
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

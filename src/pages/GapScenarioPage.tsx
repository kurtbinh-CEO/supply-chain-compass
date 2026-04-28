import { useMemo, useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { NextStepBanner } from "@/components/NextStepBanner";
import { useNextStep } from "@/components/NextStepContext";
import { usePlanningPeriod } from "@/components/PlanningPeriodContext";
import { PlanningPeriodSelector } from "@/components/PlanningPeriodSelector";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Settings2,
  ShieldAlert,
} from "lucide-react";
import {
  COMMITMENT_GAPS,
  FACTORIES,
  NM_COMMITMENTS,
  HONORING_BY_NM,
  CONFIG_KEYS,
  getEffectivePrice,
  type CommitmentGapRow,
  type Factory,
  type GapStatus,
  type NmId,
} from "@/data/unis-enterprise-dataset";
import { Button } from "@/components/ui/button";
import { TermTooltip } from "@/components/TermTooltip";
import { ClickableNumber } from "@/components/ClickableNumber";
import { useNavigate } from "react-router-dom";
import { SummaryCards } from "@/components/SummaryCards";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import {
  PRICE_TIERS,
  RELEASED_BY_NM,
  WEEKLY_BURN_BY_NM,
  SKU_RELEASED_BY_NM,
  getTierStatus,
  type TierStatus,
} from "@/data/price-tiers";

// Map mỗi NM → SKU base chính (dùng để tra giá thực)
const NM_TOP_SKU: Record<NmId, string> = {
  MIKADO:    "GA-300",
  TOKO:      "GA-600",
  DONGTAM:   "GT-300",
  VIGRACERA: "GA-300",
  PHUMY:     "PK-001",
};

/* ─────────────────────────────────────────────────────────────────────────── */
/* Helpers                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

const fmtM2 = (n: number) => `${n.toLocaleString("vi-VN")} m²`;
const fmtVnd = (n: number) =>
  n >= 1_000_000_000
    ? `${(n / 1_000_000_000).toFixed(2)} tỷ₫`
    : n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M₫`
    : `${n.toLocaleString("vi-VN")}₫`;

const STATUS_META: Record<
  GapStatus,
  { label: string; tone: string; dot: string; icon: typeof CheckCircle2 }
> = {
  on_track: {
    label: "Đúng tiến độ",
    tone: "bg-success-bg text-success border-success/30",
    dot: "bg-success",
    icon: CheckCircle2,
  },
  watch: {
    label: "Theo dõi",
    tone: "bg-warning-bg text-warning border-warning/30",
    dot: "bg-warning",
    icon: Clock,
  },
  critical: {
    label: "Nguy hiểm",
    tone: "bg-danger-bg text-danger border-danger/30",
    dot: "bg-danger",
    icon: AlertTriangle,
  },
};

const CURRENT_DAY = 8;
const TOTAL_DAYS = 30;
const ESCALATION_STEPS = [
  { day: 20, label: "SC Manager", rule: "gap > 15%" },
  { day: 25, label: "CEO", rule: "gap > 10%" },
  { day: 28, label: "Auto kịch bản", rule: "system fallback" },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/* Data: enriched rows (joined with factory)                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

interface GapRow extends CommitmentGapRow {
  nm: Factory;
  gapM2: number;
  daysLeft: number;
  velocity: "Tăng" | "Ổn định" | "Giảm";
  stale: boolean;
  relationshipPct: number;
  releasedM2: number;       // đã kéo (PO released + delivered + completed)
  remainingM2: number;      // cam kết − đã kéo
  pulledPct: number;        // đã kéo / cam kết × 100
  tier: TierStatus | null;  // tier hiện tại + risk + uplift
}

function buildRows(): GapRow[] {
  // hand-tuned data freshness + relationship factors per NM
  const meta: Record<
    string,
    { stale: boolean; relationship: number; velocity: GapRow["velocity"] }
  > = {
    MIKADO: { stale: false, relationship: 92, velocity: "Ổn định" },
    TOKO: { stale: false, relationship: 84, velocity: "Tăng" },
    DONGTAM: { stale: false, relationship: 95, velocity: "Ổn định" },
    VIGRACERA: { stale: false, relationship: 78, velocity: "Ổn định" },
    PHUMY: { stale: true, relationship: 62, velocity: "Giảm" },
  };

  return COMMITMENT_GAPS.map((g) => {
    const nm = FACTORIES.find((f) => f.id === g.nmId)!;
    const m = meta[g.nmId] ?? {
      stale: false,
      relationship: 80,
      velocity: "Ổn định" as const,
    };
    const releasedM2 = RELEASED_BY_NM[g.nmId] ?? 0;
    const remainingM2 = Math.max(0, g.totalCommittedM2 - releasedM2);
    const pulledPct = g.totalCommittedM2 > 0
      ? Math.round((releasedM2 / g.totalCommittedM2) * 100)
      : 0;
    return {
      ...g,
      nm,
      gapM2: g.totalRequestedM2 - g.totalCommittedM2,
      daysLeft: TOTAL_DAYS - CURRENT_DAY,
      velocity: m.velocity,
      stale: m.stale,
      relationshipPct: m.relationship,
      releasedM2,
      remainingM2,
      pulledPct,
      tier: getTierStatus(g.nmId, releasedM2),
    };
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Scenario engine                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

interface ScenarioPriceInfo {
  basePrice: number;       // giá gốc /m² (theo break)
  totalPrice: number;      // giá gốc + phụ phí /m²
  breakLabel: string;
  surchargeText: string | null;  // "Phụ phí năng lượng 3% (5.640₫)" hoặc null
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  priceListId: string | null;
}

interface Scenario {
  key: "A" | "B" | "C" | "D" | "E";
  title: string;
  subtitle: string;
  cost: number;
  costFormula: string;
  risk: string;
  pros: string[];
  cons: string[];
  recommended: boolean;
  needsCeoApproval?: boolean;
  priceInfo?: ScenarioPriceInfo;       // common to A/B/D
  aiRationale?: string;                // M9: AI explanation
}

function buildScenarios(row: GapRow): Scenario[] {
  const skuBase = NM_TOP_SKU[row.nm.id];
  const gapQty = row.gapM2;
  const committed = row.totalCommittedM2;

  // Lấy giá thực từ bảng giá hiệu lực
  const eff = getEffectivePrice(row.nm.id, skuBase, gapQty);
  const basePrice = eff?.pricePerM2 ?? row.nm.priceTier1;
  const totalPrice = eff?.totalPerM2 ?? row.nm.priceTier1;
  const surchargeAmount = totalPrice - basePrice;

  // Tìm break tiếp theo (cao hơn) cho kịch bản B
  const nextBreakPrice = eff
    ? eff.allBreaks.find((b) => b.fromQty > eff.matchedBreak.fromQty)?.pricePerM2 ?? Math.round(basePrice * 1.15)
    : row.nm.priceTier2;

  // Config keys (M9): negotiation cost + hybrid split %
  const negoPerM2 = (CONFIG_KEYS.find((c) => c.key === "scenario.negotiation_cost_per_m2")?.defaultValue as number) ?? 9500;
  const hybridPct = ((CONFIG_KEYS.find((c) => c.key === "scenario.hybrid_split_pct")?.defaultValue as number) ?? 50) / 100;

  // Format phụ phí text (cho card display)
  const surchargeText = eff && eff.surcharges.length > 0
    ? eff.surcharges
        .map((s) => {
          const amt = s.calcMethod === "percent"
            ? Math.round((basePrice * s.rate) / 100)
            : s.rate;
          return `Phụ phí ${s.type.toLowerCase()} ${s.calcMethod === "percent" ? `${s.rate}%` : `${s.rate.toLocaleString("vi-VN")}₫`} (${amt.toLocaleString("vi-VN")}₫)`;
        })
        .join(" + ")
    : null;

  const priceInfo: ScenarioPriceInfo = {
    basePrice,
    totalPrice,
    breakLabel: eff?.breakLabel ?? "Giá ước tính",
    surchargeText,
    expiryDate: eff?.expiryDate ?? null,
    daysUntilExpiry: eff?.daysUntilExpiry ?? null,
    priceListId: eff?.priceListId ?? null,
  };

  // ─── Chi phí từng kịch bản ─────────────────────────────────────
  const costA = gapQty * totalPrice;                                  // dùng totalPrice (gồm phụ phí)
  const costB = committed * (nextBreakPrice - basePrice);             // chênh giữa break hiện tại & break tiếp
  const costC = Math.max(5_000_000, Math.round(gapQty * negoPerM2));  // negotiation overhead theo config
  const costD = Math.round(costA * hybridPct + costC * (1 - hybridPct));

  // ─── AI rule nâng cấp (3 yếu tố thay 1) ────────────────────────
  // Quan hệ tổng = honoring × 0.6 + ontime × 0.4
  const honoring = HONORING_BY_NM.find((h) => h.nmId === row.nm.id);
  const relationship = honoring
    ? Math.round(honoring.honoringPct * 0.6 + honoring.ontimePct * 0.4)
    : row.relationshipPct;
  // Counter rate proxy: NM nào không có cam kết Hard → coi như hay counter
  const counterRate = row.gapPct >= 15 ? 0.6 : 0.2;
  const recommendC = relationship >= 75 && !row.stale && counterRate < 0.5;

  const aiRationale = recommendC
    ? `✨ AI khuyến nghị C vì NM ${row.nm.name} quan hệ ${relationship}% (honoring ${honoring?.honoringPct ?? "—"}% + ontime ${honoring?.ontimePct ?? "—"}%), ít counter (${Math.round(counterRate * 100)}%).`
    : `✨ AI khuyến nghị D vì NM ${row.nm.name} cần phương án dự phòng (quan hệ ${relationship}%${row.stale ? ", dữ liệu cũ" : ""}, counter ${Math.round(counterRate * 100)}%).`;

  const formulaA = surchargeText
    ? `${gapQty.toLocaleString("vi-VN")} × ${totalPrice.toLocaleString("vi-VN")}₫ (gốc ${basePrice.toLocaleString("vi-VN")} + phụ phí ${surchargeAmount.toLocaleString("vi-VN")})`
    : `${gapQty.toLocaleString("vi-VN")} × ${totalPrice.toLocaleString("vi-VN")}₫`;

  return [
    {
      key: "A",
      title: "Mua hết phần thiếu",
      subtitle: `Đặt PO bù toàn bộ gap với ${eff?.breakLabel ?? "giá ước tính"}`,
      cost: costA,
      costFormula: formulaA,
      risk: "Rủi ro tồn đọng nếu nhu cầu thực tế giảm",
      pros: ["Đơn giản, nhanh chốt", "Đảm bảo cam kết DRP"],
      cons: ["Tốn vốn lớn", "Rủi ro slow-mover"],
      recommended: false,
      priceInfo,
      aiRationale,
    },
    {
      key: "B",
      title: "Chấp nhận giá break cao hơn",
      subtitle: `Áp giá break tiếp theo cho toàn bộ committed`,
      cost: costB,
      costFormula: `${committed.toLocaleString("vi-VN")} × (${nextBreakPrice.toLocaleString("vi-VN")} − ${basePrice.toLocaleString("vi-VN")})₫`,
      risk: "Tăng giá vốn cả lô, ảnh hưởng margin",
      pros: ["Giữ được sản lượng", "Không cần đàm phán mới"],
      cons: ["Áp ngược toàn bộ committed", "Mất lợi thế giá break thấp"],
      recommended: false,
      priceInfo,
      aiRationale,
    },
    {
      key: "C",
      title: "Đàm phán chuyển kỳ",
      subtitle: `Dời gap sang tháng kế, giữ ${eff?.breakLabel ?? "giá hiện tại"}`,
      cost: costC,
      costFormula: `Gap ${gapQty.toLocaleString("vi-VN")} × ${negoPerM2.toLocaleString("vi-VN")}₫ (config scenario.negotiation_cost_per_m2)`,
      risk: "NM phải đồng ý — phụ thuộc relationship",
      pros: ["Tiết kiệm vốn nhất", "Giữ giá thỏa thuận"],
      cons: ["Cần NM chấp thuận", "Có thể trễ DRP tuần"],
      recommended: recommendC,
      priceInfo,
      aiRationale,
    },
    {
      key: "D",
      title: `Kết hợp ${Math.round(hybridPct * 100)} / ${Math.round((1 - hybridPct) * 100)}`,
      subtitle: `${Math.round(hybridPct * 100)}% mua bù, ${Math.round((1 - hybridPct) * 100)}% đàm phán dời`,
      cost: costD,
      costFormula: `${Math.round(hybridPct * 100)}% × A + ${Math.round((1 - hybridPct) * 100)}% × C (config scenario.hybrid_split_pct)`,
      risk: "Phức tạp logistics, cần 2 luồng phê duyệt",
      pros: ["Cân bằng rủi ro", "Linh hoạt theo NM"],
      cons: ["Quản lý 2 lệnh song song"],
      recommended: !recommendC,
      priceInfo,
      aiRationale,
    },
  ];
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Tab 1 — Tracking table                                                      */
/* ─────────────────────────────────────────────────────────────────────────── */

function TrackingTab({
  rows,
  onSelect,
}: {
  rows: GapRow[];
  onSelect: (row: GapRow) => void;
}) {
  const progressPct = (CURRENT_DAY / TOTAL_DAYS) * 100;

  return (
    <div className="space-y-6">
      {/* Day stepper */}
      <div className="rounded-card border border-surface-3 bg-surface-1 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-display text-h3 font-semibold text-text-1">
              Ngày {CURRENT_DAY}/{TOTAL_DAYS}
            </p>
            <p className="text-table-sm text-text-3">
              Còn {TOTAL_DAYS - CURRENT_DAY} ngày tới cutoff cam kết tháng 5/2026
            </p>
          </div>
          <div className="flex items-center gap-2 text-table-sm">
            <span className="rounded-full bg-info-bg px-2.5 py-1 text-primary font-medium">
              Đang trong cửa sổ thương lượng
            </span>
          </div>
        </div>

        {/* Stepper bar */}
        <div className="relative h-2 rounded-full bg-surface-3 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-primary rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Escalation markers */}
        <div className="relative h-12 mt-2">
          {ESCALATION_STEPS.map((s) => {
            const left = (s.day / TOTAL_DAYS) * 100;
            const passed = CURRENT_DAY >= s.day;
            return (
              <div
                key={s.day}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${left}%` }}
              >
                <div
                  className={cn(
                    "h-3 w-3 rounded-full border-2",
                    passed
                      ? "bg-danger border-danger"
                      : "bg-surface-0 border-text-3"
                  )}
                />
                <span className="text-caption text-text-3 mt-1 whitespace-nowrap">
                  D{s.day} · {s.label}
                </span>
                <span className="text-[10px] text-text-3 italic">{s.rule}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gap table — SmartTable + drill-down per NM × SKU gap */}
      <GapTrackingTable rows={rows} onSelect={onSelect} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Gap tracking table — SmartTable wrapper                                     */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * BurnDownBar — bar 2 lớp:
 *  · nền = committed
 *  · fill = released (% kéo)
 *  · marker dọc = ngưỡng tier 1 (giữ giá ưu đãi)
 */
function BurnDownBar({
  committed,
  released,
  tierThreshold,
}: {
  committed: number;
  released: number;
  tierThreshold?: number;
}) {
  if (committed <= 0) return null;
  const pct = Math.min(100, (released / committed) * 100);
  const fillColor = pct >= 80 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-danger";
  const tierLeft = tierThreshold && tierThreshold > 0
    ? Math.min(100, (tierThreshold / committed) * 100)
    : null;
  const tierReached = tierThreshold ? released >= tierThreshold : true;
  return (
    <div className="relative mt-1 h-1.5 w-full rounded-full bg-surface-3 overflow-visible">
      <div
        className={cn("h-full rounded-full transition-all", fillColor)}
        style={{ width: `${pct}%` }}
      />
      {tierLeft != null && (
        <div
          className={cn(
            "absolute -top-0.5 h-2.5 w-px",
            tierReached ? "bg-success" : "bg-text-2"
          )}
          style={{ left: `${tierLeft}%` }}
          title={`Ngưỡng Tier 1: ${tierThreshold!.toLocaleString("vi-VN")} m²`}
        />
      )}
    </div>
  );
}

function GapTrackingTable({
  rows,
  onSelect,
}: {
  rows: GapRow[];
  onSelect: (row: GapRow) => void;
}) {
  const columns: SmartTableColumn<GapRow>[] = [
    {
      key: "nm",
      label: "Nhà máy",
      width: 220,
      sortable: true,
      filter: "text",
      accessor: (r) => r.nm.name,
      render: (r) => {
        const meta = STATUS_META[r.status];
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
              <span className="font-medium text-text-1">{r.nm.name}</span>
              {r.stale && (
                <span className="text-caption rounded-full bg-danger-bg text-danger px-2 py-0.5 border border-danger/30">
                  Dữ liệu cũ
                </span>
              )}
            </div>
            <p className="text-caption text-text-3 mt-0.5">
              {r.nm.code} · {r.nm.region}
            </p>
          </div>
        );
      },
    },
    {
      key: "requested",
      label: "Đã yêu cầu",
      width: 110,
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r.totalRequestedM2,
      render: (r) => fmtM2(r.totalRequestedM2),
    },
    {
      key: "committed",
      label: "Đã cam kết",
      width: 110,
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r.totalCommittedM2,
      render: (r) => fmtM2(r.totalCommittedM2),
    },
    {
      key: "released",
      label: "Đã kéo (PO)",
      width: 150,
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r.releasedM2,
      render: (r) => (
        <div>
          <div className="tabular-nums font-medium text-text-1">{fmtM2(r.releasedM2)}</div>
          <BurnDownBar
            committed={r.totalCommittedM2}
            released={r.releasedM2}
            tierThreshold={r.tier?.schedule.tier1Threshold}
          />
        </div>
      ),
    },
    {
      key: "remaining",
      label: "Còn lại",
      width: 100,
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r.remainingM2,
      render: (r) => (
        <span className={cn("tabular-nums font-medium", r.remainingM2 > 0 ? "text-warning" : "text-success")}>
          {fmtM2(r.remainingM2)}
        </span>
      ),
    },
    {
      key: "pulledPct",
      label: "% Kéo",
      width: 80,
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r.pulledPct,
      render: (r) => {
        const color = r.pulledPct >= 80 ? "text-success" : r.pulledPct >= 50 ? "text-warning" : "text-danger";
        return <span className={cn("tabular-nums font-semibold", color)}>{r.pulledPct}%</span>;
      },
    },
    {
      key: "tier",
      label: "Tier hiện tại",
      width: 100,
      align: "center",
      accessor: (r) => r.tier?.current ?? "—",
      render: (r) => {
        if (!r.tier) return <span className="text-text-3">—</span>;
        const t = r.tier.current;
        const cls = t === "tier1"
          ? "bg-success-bg text-success border-success/30"
          : t === "tier2"
          ? "bg-warning-bg text-warning border-warning/30"
          : "bg-danger-bg text-danger border-danger/30";
        return (
          <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 border text-caption font-semibold uppercase", cls)}>
            {t === "tier1" ? "Tier 1" : t === "tier2" ? "Tier 2" : "Tier 3"}
          </span>
        );
      },
    },
    {
      key: "tierRisk",
      label: "Rủi ro tier",
      width: 240,
      render: (r) => {
        if (!r.tier) return <span className="text-text-3">—</span>;
        const t = r.tier.current;
        if (t === "tier1") {
          return <span className="text-table-sm text-success">Đã đạt Tier 1 ✅</span>;
        }
        const cls = t === "tier3" ? "text-danger" : "text-warning";
        return (
          <div>
            <p className={cn("text-table-sm font-medium", cls)}>{r.tier.message}</p>
            {r.tier.upliftIfDrop > 0 && (
              <p className="text-caption text-danger mt-0.5">
                Uplift nếu giữ {t === "tier2" ? "Tier 2" : "Tier 3"}: {fmtVnd(r.tier.upliftIfDrop)}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "gap",
      label: "Cảnh báo",
      width: 130,
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r.gapPct,
      render: (r) => {
        const meta = STATUS_META[r.status];
        const Icon = meta.icon;
        return (
          <div>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 border text-table-sm font-semibold", meta.tone)}>
              <Icon className="h-3 w-3" />
              {r.gapPct}%
            </span>
            <p className="text-caption text-text-3 mt-1">Δ {fmtM2(r.gapM2)}</p>
          </div>
        );
      },
    },
    {
      key: "velocity",
      label: "Tốc độ",
      width: 90,
      align: "center",
      filter: "enum",
      filterOptions: [
        { value: "Tăng", label: "Tăng" },
        { value: "Ổn định", label: "Ổn định" },
        { value: "Giảm", label: "Giảm" },
      ],
      accessor: (r) => r.velocity,
      render: (r) => (
        <span className={cn("text-table-sm",
          r.velocity === "Tăng" ? "text-danger" : r.velocity === "Giảm" ? "text-success" : "text-text-2")}>
          {r.velocity === "Tăng" ? "↑ " : r.velocity === "Giảm" ? "↓ " : "→ "}{r.velocity}
        </span>
      ),
    },
    {
      key: "daysLeft",
      label: "Ngày còn",
      width: 80,
      align: "center",
      numeric: true,
      sortable: true,
      accessor: (r) => r.daysLeft,
      render: (r) => `${r.daysLeft} ngày`,
    },
    {
      key: "note",
      label: "Cảnh báo",
      width: 220,
      filter: "text",
      accessor: (r) => r.note ?? "",
      render: (r) => <span className="text-text-2">{r.note}</span>,
      priority: "low",
    },
    {
      key: "action",
      label: "",
      width: 110,
      align: "right",
      render: (r) => (
        <Button
          size="sm"
          variant={r.status === "critical" ? "default" : "outline"}
          onClick={(e) => { e.stopPropagation(); onSelect(r); }}
        >
          Mô phỏng
        </Button>
      ),
    },
  ];

  return (
    <SmartTable<GapRow>
      screenId="gap-tracking"
      title="Khoảng cách cam kết theo NM"
      columns={columns}
      data={rows}
      defaultDensity="normal"
      getRowId={(r) => r.nmId}
      rowSeverity={(r) => r.status === "critical" ? "shortage" : r.status === "watch" ? "watch" : "ok"}
      autoExpandWhen={(r) => r.status === "critical"}
      drillDown={(r) => <GapNmSkuDrill row={r} />}
      exportFilename="gap-tracking"
    />
  );
}

/**
 * Drill-down per NM — hiện gap chi tiết per SKU base trong commitment.
 * Tận dụng `commitments` field nếu có; fallback ra 1 dòng tổng.
 */
function GapNmSkuDrill({ row }: { row: GapRow }) {
  const tier = row.tier;
  const skuRows = SKU_RELEASED_BY_NM[row.nmId] ?? [];
  const weekly = WEEKLY_BURN_BY_NM[row.nmId] ?? [];

  type SkuLine = {
    sku: string;
    committed: number;
    released: number;
    remaining: number;
    pct: number;
    lastPo: string;
  };
  const skuLines: SkuLine[] = skuRows.map((s) => ({
    sku: s.sku,
    committed: s.committed,
    released: s.released,
    remaining: Math.max(0, s.committed - s.released),
    pct: s.committed > 0 ? Math.round((s.released / s.committed) * 100) : 0,
    lastPo: s.lastPo,
  }));

  // Pace + ETA tier 1 (mock): trung bình 4 tuần đã hoàn tất
  const doneWeeks = weekly.filter((w) => w.status === "done");
  const pace = doneWeeks.length > 0
    ? Math.round(doneWeeks.reduce((a, w) => a + w.pulled, 0) / doneWeeks.length)
    : 0;
  const weeksToTier1 = tier && tier.toNextTier > 0 && pace > 0
    ? Math.ceil(tier.toNextTier / pace)
    : 0;

  const childCols: SmartTableColumn<SkuLine>[] = [
    { key: "sku", label: "Mã hàng", width: 110, render: (r) => <span className="font-mono text-text-1">{r.sku}</span> },
    { key: "committed", label: "Cam kết", width: 100, numeric: true, align: "right", render: (r) => fmtM2(r.committed) },
    { key: "released", label: "Đã kéo", width: 100, numeric: true, align: "right",
      render: (r) => <span className="tabular-nums font-medium text-text-1">{fmtM2(r.released)}</span>,
    },
    { key: "remaining", label: "Còn lại", width: 100, numeric: true, align: "right",
      render: (r) => (
        <span className={cn("tabular-nums font-medium", r.remaining > 0 ? "text-warning" : "text-success")}>
          {fmtM2(r.remaining)}
        </span>
      ),
    },
    { key: "pct", label: "% Kéo", width: 80, numeric: true, align: "right",
      render: (r) => {
        const c = r.pct >= 80 ? "text-success" : r.pct >= 50 ? "text-warning" : "text-danger";
        return <span className={cn("tabular-nums font-semibold", c)}>{r.pct}%</span>;
      },
    },
    { key: "lastPo", label: "PO gần nhất", width: 180, render: (r) => <span className="text-table-sm text-text-2">{r.lastPo}</span> },
  ];

  const totalCommitted = skuLines.reduce((a, s) => a + s.committed, 0);
  const totalReleased = skuLines.reduce((a, s) => a + s.released, 0);
  const totalRemaining = skuLines.reduce((a, s) => a + s.remaining, 0);
  const totalPct = totalCommitted > 0 ? Math.round((totalReleased / totalCommitted) * 100) : 0;

  return (
    <div className="px-4 py-3 bg-surface-1/40 space-y-4">
      {/* TIER PRICING block */}
      {tier && (
        <div className="rounded-card border border-surface-3 bg-surface-0 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-display text-table font-semibold text-text-1">
              {row.nm.name} — Burn-down chi tiết
            </h4>
            <span className="text-caption text-text-3">{tier.schedule.period}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-table-sm">
            <div className={cn("rounded-button border p-2.5",
              tier.current === "tier1" ? "border-success/40 bg-success-bg" : "border-surface-3 bg-surface-1")}>
              <p className="text-caption text-text-3 uppercase">Tier 1 ≥ {tier.schedule.tier1Threshold.toLocaleString("vi-VN")} m²</p>
              <p className="font-display text-h3 font-semibold text-text-1 tabular-nums">{tier.schedule.tier1Price.toLocaleString("vi-VN")}₫/m²</p>
              <p className="text-caption text-success font-medium">Giá ưu đãi</p>
            </div>
            <div className={cn("rounded-button border p-2.5",
              tier.current === "tier2" ? "border-warning/40 bg-warning-bg" : "border-surface-3 bg-surface-1")}>
              <p className="text-caption text-text-3 uppercase">Tier 2 ≥ {tier.schedule.tier2Threshold.toLocaleString("vi-VN")} m²</p>
              <p className="font-display text-h3 font-semibold text-text-1 tabular-nums">{tier.schedule.tier2Price.toLocaleString("vi-VN")}₫/m²</p>
              <p className="text-caption text-warning font-medium">+{Math.round(((tier.schedule.tier2Price - tier.schedule.tier1Price) / tier.schedule.tier1Price) * 100)}%</p>
            </div>
            <div className={cn("rounded-button border p-2.5",
              tier.current === "tier3" ? "border-danger/40 bg-danger-bg" : "border-surface-3 bg-surface-1")}>
              <p className="text-caption text-text-3 uppercase">Tier 3 (mặc định)</p>
              <p className="font-display text-h3 font-semibold text-text-1 tabular-nums">{tier.schedule.tier3Price.toLocaleString("vi-VN")}₫/m²</p>
              <p className="text-caption text-danger font-medium">+{Math.round(((tier.schedule.tier3Price - tier.schedule.tier1Price) / tier.schedule.tier1Price) * 100)}%</p>
            </div>
          </div>
          <p className="text-table-sm text-text-2 mt-2">
            Hiện tại: <strong className="text-text-1">{fmtM2(row.releasedM2)}</strong> →{" "}
            <strong className={cn(
              tier.current === "tier1" ? "text-success" : tier.current === "tier2" ? "text-warning" : "text-danger"
            )}>
              {tier.current === "tier1" ? "Tier 1 ✅" : tier.current === "tier2" ? "Tier 2" : "Tier 3"}
            </strong>{" "}
            — {tier.message}
            {tier.upliftIfDrop > 0 && (
              <span className="text-danger font-medium"> · Uplift retroactive: {fmtVnd(tier.upliftIfDrop)}</span>
            )}
          </p>
        </div>
      )}

      {/* PER SKU table */}
      {skuLines.length > 0 && (
        <SmartTable<SkuLine>
          screenId={`gap-tracking-${row.nmId}-skus`}
          columns={childCols}
          data={skuLines}
          defaultDensity="compact"
          getRowId={(r) => r.sku}
          summaryRow={{
            sku: <span className="font-bold text-text-1">TỔNG</span>,
            committed: fmtM2(totalCommitted),
            released: <span className="font-bold tabular-nums">{fmtM2(totalReleased)}</span>,
            remaining: fmtM2(totalRemaining),
            pct: <span className="font-bold tabular-nums">{totalPct}%</span>,
          }}
        />
      )}

      {/* WEEKLY burn-down */}
      {weekly.length > 0 && (
        <div className="rounded-card border border-surface-3 bg-surface-0 p-4">
          <h4 className="font-display text-table font-semibold text-text-1 mb-2">
            Burn-down theo tuần
          </h4>
          <div className="flex flex-wrap items-end gap-3">
            {weekly.map((w) => {
              const icon = w.status === "done" ? "✅" : w.status === "shipping" ? "🚛" : "📝";
              const color = w.status === "done" ? "text-success" : w.status === "shipping" ? "text-info" : "text-text-3";
              return (
                <div key={w.week} className="flex flex-col items-center min-w-[64px]">
                  <span className={cn("text-table-sm font-semibold tabular-nums", color)}>
                    {w.pulled.toLocaleString("vi-VN")}
                  </span>
                  <span className="text-caption text-text-3">{w.week} {icon}</span>
                </div>
              );
            })}
          </div>
          {pace > 0 && (
            <p className="text-caption text-text-2 mt-2">
              Pace TB: <strong className="text-text-1">{pace.toLocaleString("vi-VN")} m²/tuần</strong>
              {weeksToTier1 > 0 && tier && (
                <> · Đạt Tier 1 sau ~<strong className="text-text-1">{weeksToTier1} tuần</strong> (cần thêm {fmtM2(tier.toNextTier)})</>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Tab 2 — Scenario simulator                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

function ScenarioCard({
  scenario,
  onChoose,
}: {
  scenario: Scenario;
  onChoose: (s: Scenario) => void;
}) {
  return (
    <div
      className={cn(
        "relative rounded-card border bg-surface-0 p-5 flex flex-col gap-3 transition-shadow hover:shadow-sm",
        scenario.recommended
          ? "border-primary/50 ring-1 ring-primary/20"
          : "border-surface-3"
      )}
    >
      {scenario.recommended && (
        <span className="absolute -top-2 left-4 inline-flex items-center gap-1 rounded-full bg-gradient-primary px-2.5 py-0.5 text-caption font-semibold text-primary-foreground shadow-sm">
          <Sparkles className="h-3 w-3" /> AI khuyến nghị
        </span>
      )}

      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-h3 font-semibold text-text-1">
            {scenario.key}. {scenario.title}
          </h3>
          {scenario.needsCeoApproval && (
            <span className="text-caption text-warning font-medium">
              Cần CEO duyệt
            </span>
          )}
        </div>
        <p className="text-table-sm text-text-3 mt-0.5">{scenario.subtitle}</p>
      </div>

      {/* Cảnh báo bảng giá sắp hết hạn */}
      {scenario.priceInfo?.daysUntilExpiry != null && scenario.priceInfo.daysUntilExpiry < 30 && (
        <div className="rounded-button bg-warning-bg/60 border border-warning/30 px-3 py-2 text-caption text-warning flex items-start gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
          <span>
            Bảng giá hết hạn trong <strong>{scenario.priceInfo.daysUntilExpiry} ngày</strong>
            {" "}({scenario.priceInfo.expiryDate}). Giá có thể thay đổi sau đó.
          </span>
        </div>
      )}

      <div className="rounded-button bg-surface-2 px-3 py-2.5">
        <p className="text-caption text-text-3 uppercase tracking-wider">
          Chi phí ước tính
        </p>
        <ClickableNumber
          value={fmtVnd(scenario.cost)}
          label={`Kịch bản ${scenario.key} — Chi phí ước tính`}
          color="font-display text-h2 font-bold text-text-1 mt-0.5 tabular-nums"
          breakdown={[
            { label: "Công thức", value: scenario.costFormula },
            ...(scenario.priceInfo?.surchargeText ? [{ label: "Phụ phí", value: scenario.priceInfo.surchargeText }] : []),
          ]}
          note={scenario.aiRationale ?? scenario.costFormula}
        />
        <p className="text-caption text-text-3 mt-0.5">{scenario.costFormula}</p>
        {/* Phụ phí breakdown */}
        {scenario.priceInfo?.surchargeText && (scenario.key === "A" || scenario.key === "D") && (
          <p className="text-caption text-info mt-1.5 leading-relaxed">
            💡 Giá gốc: <span className="tabular-nums">{scenario.priceInfo.basePrice.toLocaleString("vi-VN")}₫</span>
            {" + "}{scenario.priceInfo.surchargeText} = <strong className="tabular-nums">{scenario.priceInfo.totalPrice.toLocaleString("vi-VN")}₫/m²</strong>
          </p>
        )}
      </div>

      {/* AI rationale (M9 — explanation tiếng Việt) */}
      {scenario.recommended && scenario.aiRationale && (
        <div className="rounded-button bg-primary/5 border border-primary/20 px-3 py-2 text-caption text-text-1 leading-relaxed">
          {scenario.aiRationale}
        </div>
      )}

      <div className="space-y-2">
        <div>
          <p className="text-caption font-semibold text-success uppercase tracking-wider mb-1">
            Lợi ích
          </p>
          <ul className="text-table-sm text-text-2 space-y-0.5">
            {scenario.pros.map((p) => (
              <li key={p}>• {p}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-caption font-semibold text-danger uppercase tracking-wider mb-1">
            Rủi ro
          </p>
          <ul className="text-table-sm text-text-2 space-y-0.5">
            {scenario.cons.map((c) => (
              <li key={c}>• {c}</li>
            ))}
          </ul>
        </div>
      </div>

      <Button
        className="mt-auto"
        variant={scenario.recommended ? "default" : "outline"}
        onClick={() => onChoose(scenario)}
      >
        Chọn kịch bản {scenario.key}
      </Button>
    </div>
  );
}

function CustomScenarioForm({
  row,
  onSubmit,
}: {
  row: GapRow;
  onSubmit: (qty: number, cost: number) => void;
}) {
  const [qty, setQty] = useState<number>(Math.round(row.gapM2 * 0.5));
  const [cost, setCost] = useState<number>(
    Math.round(row.gapM2 * 0.5 * row.nm.priceTier1)
  );

  return (
    <div className="rounded-card border border-dashed border-surface-3 bg-surface-1 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Settings2 className="h-4 w-4 text-text-3" />
        <h3 className="font-display text-h3 font-semibold text-text-1">
          E. Kịch bản tùy chỉnh
        </h3>
        <span className="text-caption text-warning font-medium ml-auto">
          Cần CEO duyệt
        </span>
      </div>
      <p className="text-table-sm text-text-3 mb-4">
        Tự nhập sản lượng và chi phí dự kiến nếu 4 phương án trên không phù hợp.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-caption text-text-3 uppercase tracking-wider">
            Sản lượng (m²)
          </span>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table tabular-nums outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-caption text-text-3 uppercase tracking-wider">
            Chi phí (₫)
          </span>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
            className="rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table tabular-nums outline-none focus:border-primary"
          />
        </label>
      </div>
      <div className="flex items-center justify-between mt-4">
        <span className="text-table-sm text-text-3">
          Đơn giá ngầm:{" "}
          <span className="text-text-1 font-medium">
            {qty > 0 ? Math.round(cost / qty).toLocaleString("vi-VN") : 0}₫/m²
          </span>
        </span>
        <Button onClick={() => onSubmit(qty, cost)}>Gửi CEO duyệt</Button>
      </div>
    </div>
  );
}

function ScenarioTab({
  selected,
  onPick,
}: {
  selected: GapRow | null;
  onPick: (row: GapRow) => void;
}) {
  const rows = useMemo(() => buildRows(), []);

  if (!selected) {
    return (
      <div className="rounded-card border border-dashed border-surface-3 bg-surface-1 p-10 text-center">
        <AlertTriangle className="h-8 w-8 text-text-3 mx-auto mb-3" />
        <p className="font-display text-h3 text-text-1 mb-1">
          Chọn nhà máy để mô phỏng
        </p>
        <p className="text-table-sm text-text-3 mb-5">
          Click vào một NM bên dưới để xem 4 kịch bản xử lý gap.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {rows.map((r) => (
            <button
              key={r.nmId}
              onClick={() => onPick(r)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-table-sm transition-colors",
                STATUS_META[r.status].tone,
                "hover:opacity-80"
              )}
            >
              {r.nm.name} · {r.gapPct}%
            </button>
          ))}
        </div>
      </div>
    );
  }

  const scenarios = buildScenarios(selected);
  const meta = STATUS_META[selected.status];

  const handleChoose = (s: Scenario) => {
    toast.success(`Đã chọn kịch bản ${s.key}: ${s.title}`, {
      description: `${selected.nm.name} · Chi phí ${fmtVnd(
        s.cost
      )} · Đã gửi vào hàng đợi phê duyệt.`,
    });
  };

  const handleCustomSubmit = (qty: number, cost: number) => {
    toast.success("Đã gửi kịch bản tùy chỉnh", {
      description: `${selected.nm.name} · ${qty.toLocaleString(
        "vi-VN"
      )} m² · ${fmtVnd(cost)} — chờ CEO phê duyệt.`,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header summary */}
      <div className="rounded-card border border-surface-3 bg-surface-1 p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
              <h3 className="font-display text-h2 font-semibold text-text-1">
                {selected.nm.name}
              </h3>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-caption font-semibold border",
                  meta.tone
                )}
              >
                {meta.label}
              </span>
            </div>
            <p className="text-table-sm text-text-3 mt-1">
              Yêu cầu {fmtM2(selected.totalRequestedM2)} · Cam kết{" "}
              {fmtM2(selected.totalCommittedM2)} · Gap{" "}
              <span className="font-semibold text-text-1">
                {fmtM2(selected.gapM2)} ({selected.gapPct}%)
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-button bg-surface-2 px-3 py-2 text-center">
              <p className="text-caption text-text-3 uppercase">Quan hệ NM</p>
              <p className="font-display text-h3 text-text-1 tabular-nums">
                {selected.relationshipPct}%
              </p>
            </div>
            <button
              onClick={() => onPick(null as unknown as GapRow)}
              className="text-caption text-text-3 hover:text-text-1 underline-offset-2 hover:underline"
            >
              Đổi NM
            </button>
          </div>
        </div>

        {selected.stale && (
          <div className="mt-4 flex items-start gap-2 rounded-button border border-danger/30 bg-danger-bg px-3 py-2.5 text-danger">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-table-sm">
              <span className="font-semibold">NM chưa cập nhật dữ liệu</span> —
              các kịch bản dưới đây có thể không chính xác. Yêu cầu NM sync
              trước khi chốt phương án.
            </p>
          </div>
        )}
      </div>

      {/* 4 scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {scenarios.map((s) => (
          <ScenarioCard key={s.key} scenario={s} onChoose={handleChoose} />
        ))}
      </div>

      {/* E custom */}
      <CustomScenarioForm row={selected} onSubmit={handleCustomSubmit} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Page                                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

const TABS = [
  { key: "tracking", label: "Theo dõi khoảng cách" },
  { key: "scenario", label: "Mô phỏng kịch bản" },
] as const;

export default function GapScenarioPage() {
  const rows = useMemo(() => buildRows(), []);
  const [activeTab, setActiveTab] =
    useState<(typeof TABS)[number]["key"]>("tracking");
  const [selected, setSelected] = useState<GapRow | null>(
    rows.find((r) => r.nmId === "TOKO") ?? null
  );
  const navigate = useNavigate();
  const { current: planCycle, isReadOnly: planLocked } = usePlanningPeriod();

  const totalGap = rows.reduce((s, r) => s + r.gapM2, 0);
  const totalRequested = rows.reduce((s, r) => s + r.totalRequestedM2, 0);
  const overallGapPct =
    totalRequested === 0
      ? 0
      : Math.round((totalGap / totalRequested) * 1000) / 10;
  const totalCommitted = rows.reduce((s, r) => s + r.totalCommittedM2, 0);
  const totalReleased = rows.reduce((s, r) => s + r.releasedM2, 0);
  const totalRemaining = rows.reduce((s, r) => s + r.remainingM2, 0);
  const burnedPct = totalCommitted > 0 ? Math.round((totalReleased / totalCommitted) * 100) : 0;
  const tierAtRiskRows = rows.filter((r) => r.tier && r.tier.current !== "tier1");
  const totalUplift = tierAtRiskRows.reduce((s, r) => s + (r.tier?.upliftIfDrop ?? 0), 0);

  return (
    <AppLayout>
      <ScreenHeader
        title="Gap & Kịch bản"
        subtitle={planLocked
          ? `Chế độ chỉ xem — ${planCycle.label} đã khóa`
          : `Tổng gap ${fmtM2(totalGap)} (${overallGapPct}% so với cam kết)`}
        actions={
          <>
            <PlanningPeriodSelector />
            <span className="inline-flex h-8 items-center gap-1.5 rounded-button border border-danger/30 bg-danger-bg px-3 text-table-sm font-medium text-danger whitespace-nowrap">
              <AlertTriangle className="h-3.5 w-3.5" />
              {rows.filter((r) => r.status === "critical").length} NM nguy hiểm
            </span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-button border border-warning/30 bg-warning-bg px-3 text-table-sm font-medium text-warning whitespace-nowrap">
              <Clock className="h-3.5 w-3.5" />
              {rows.filter((r) => r.status === "watch").length} cần theo dõi
            </span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-button border border-success/30 bg-success-bg px-3 text-table-sm font-medium text-success whitespace-nowrap">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {rows.filter((r) => r.status === "on_track").length} đúng tiến độ
            </span>
          </>
        }
      />

      {/* M20-PATCH — Summary thẻ tóm tắt Gap & Kịch bản */}
      <div className="mb-5">
        <SummaryCards
          screenId="gap"
          editable
          cards={[
            {
              key: "burned",
              label: "Tổng đã kéo",
              value: `${(totalReleased / 1000).toFixed(1)}/${(totalCommitted / 1000).toFixed(1)}k`,
              unit: "m²",
              trend: {
                delta: `${burnedPct}% burned`,
                direction: burnedPct >= 70 ? "up" : "flat",
                color: burnedPct >= 70 ? "green" : burnedPct >= 50 ? "gray" : "red",
              },
              severity: burnedPct >= 70 ? "ok" : burnedPct >= 50 ? "warn" : "critical",
              tooltip: "Đã release PO / Tổng cam kết NM",
              onClick: () => setActiveTab("tracking"),
            },
            {
              key: "remaining",
              label: "Còn lại cần kéo",
              value: totalRemaining.toLocaleString("vi-VN"),
              unit: "m²",
              trend: {
                delta: `${rows.filter((r) => r.remainingM2 > 0).length} NM còn`,
                direction: "down",
                color: "gray",
              },
              severity: totalRemaining > 0 ? "warn" : "ok",
            },
            {
              key: "tier_risk",
              label: "Rủi ro tier",
              value: tierAtRiskRows.length,
              unit: "NM",
              trend: {
                delta: tierAtRiskRows.length > 0
                  ? tierAtRiskRows.map((r) => r.nm.name).slice(0, 2).join(" + ")
                  : "Tất cả Tier 1 ✅",
                direction: tierAtRiskRows.length > 0 ? "down" : "flat",
                color: tierAtRiskRows.length > 0 ? "red" : "green",
              },
              severity: tierAtRiskRows.length >= 2 ? "critical" : tierAtRiskRows.length === 1 ? "warn" : "ok",
              tooltip: "Số NM đang ở Tier 2/3 — sẽ chịu phụ phí retroactive nếu không kéo đủ",
              onClick: () => setActiveTab("tracking"),
            },
            {
              key: "uplift",
              label: "Uplift dự kiến",
              value: totalUplift > 0 ? fmtVnd(totalUplift).replace("₫", "").trim() : "0",
              unit: "₫",
              trend: {
                delta: totalUplift > 0 ? "🔴 retroactive" : "—",
                direction: "down",
                color: totalUplift > 0 ? "red" : "gray",
              },
              severity: totalUplift > 50_000_000 ? "critical" : totalUplift > 0 ? "warn" : "ok",
              tooltip: "Phụ phí retroactive nếu các NM ở Tier 2/3 không kéo đủ ngưỡng Tier 1",
            },
          ]}
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-surface-3 mb-6">
        {TABS.map((tab) => (
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

      {activeTab === "tracking" && (
        <TrackingTab
          rows={rows}
          onSelect={(r) => {
            setSelected(r);
            setActiveTab("scenario");
          }}
        />
      )}
      {activeTab === "scenario" && (
        <ScenarioTab selected={selected} onPick={setSelected} />
      )}

      <ScreenFooter actionCount={NM_COMMITMENTS.length} />
    </AppLayout>
  );
}

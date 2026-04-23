import { useMemo, useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { NextStepBanner } from "@/components/NextStepBanner";
import { useNextStep } from "@/components/NextStepContext";
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
  getEffectivePrice,
  type CommitmentGapRow,
  type Factory,
  type GapStatus,
  type NmId,
} from "@/data/unis-enterprise-dataset";
import { Button } from "@/components/ui/button";
import { TermTooltip } from "@/components/TermTooltip";

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
    return {
      ...g,
      nm,
      gapM2: g.totalRequestedM2 - g.totalCommittedM2,
      daysLeft: TOTAL_DAYS - CURRENT_DAY,
      velocity: m.velocity,
      stale: m.stale,
      relationshipPct: m.relationship,
    };
  });
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Scenario engine                                                             */
/* ─────────────────────────────────────────────────────────────────────────── */

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
}

function buildScenarios(row: GapRow): Scenario[] {
  const tier1 = row.nm.priceTier1;
  const tier2 = row.nm.priceTier2;
  const gapQty = row.gapM2;
  const committed = row.totalCommittedM2;

  const costA = gapQty * tier1;
  const costB = committed * (tier2 - tier1);
  const costC = Math.max(5_000_000, Math.round(gapQty * 9_500)); // negotiation overhead
  const costD = Math.round(costA * 0.5 + costC * 0.5);

  const recommendC = row.relationshipPct >= 80 && !row.stale;

  return [
    {
      key: "A",
      title: "Mua hết phần thiếu",
      subtitle: "Đặt PO bù toàn bộ gap với giá tier-1",
      cost: costA,
      costFormula: `${gapQty.toLocaleString("vi-VN")} × ${tier1.toLocaleString(
        "vi-VN"
      )}₫`,
      risk: "Rủi ro tồn đọng nếu nhu cầu thực tế giảm",
      pros: ["Đơn giản, nhanh chốt", "Đảm bảo cam kết DRP"],
      cons: ["Tốn vốn lớn", "Rủi ro slow-mover"],
      recommended: false,
    },
    {
      key: "B",
      title: "Chấp nhận giá cao",
      subtitle: "Áp tier-2 cho toàn bộ committed (retroactive)",
      cost: costB,
      costFormula: `${committed.toLocaleString(
        "vi-VN"
      )} × (${tier2.toLocaleString("vi-VN")} − ${tier1.toLocaleString(
        "vi-VN"
      )})₫`,
      risk: "Tăng giá vốn cả lô, ảnh hưởng margin",
      pros: ["Giữ được sản lượng", "Không cần đàm phán mới"],
      cons: ["Áp ngược toàn bộ committed", "Mất lợi thế giá tier-1"],
      recommended: false,
    },
    {
      key: "C",
      title: "Đàm phán chuyển kỳ",
      subtitle: "Dời gap sang tháng kế, giữ giá tier-1",
      cost: costC,
      costFormula: "Chi phí xử lý + bù pipeline (~10M₫)",
      risk: "NM phải đồng ý — phụ thuộc relationship",
      pros: ["Tiết kiệm vốn nhất", "Giữ giá thỏa thuận"],
      cons: ["Cần NM chấp thuận", "Có thể trễ DRP tuần"],
      recommended: recommendC,
    },
    {
      key: "D",
      title: "Kết hợp 50 / 50",
      subtitle: "Nửa mua bù, nửa đàm phán dời",
      cost: costD,
      costFormula: `50% × A + 50% × C`,
      risk: "Phức tạp logistics, cần 2 luồng phê duyệt",
      pros: ["Cân bằng rủi ro", "Linh hoạt theo NM"],
      cons: ["Quản lý 2 lệnh song song"],
      recommended: !recommendC,
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

      {/* Gap table */}
      <div className="rounded-card border border-surface-3 bg-surface-0 overflow-hidden">
        <table className="w-full text-table-sm">
          <thead className="bg-surface-2 text-text-3 text-caption uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Nhà máy</th>
              <th className="text-right px-4 py-3 font-semibold">Đã yêu cầu</th>
              <th className="text-right px-4 py-3 font-semibold">Đã cam kết</th>
              <th className="text-right px-4 py-3 font-semibold">
                Khoảng cách
              </th>
              <th className="text-center px-4 py-3 font-semibold">Tốc độ</th>
              <th className="text-center px-4 py-3 font-semibold">Ngày còn</th>
              <th className="text-left px-4 py-3 font-semibold">Cảnh báo</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const meta = STATUS_META[r.status];
              const Icon = meta.icon;
              return (
                <tr
                  key={r.nmId}
                  className="border-t border-surface-3 hover:bg-surface-1 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                      <span className="font-medium text-text-1">
                        {r.nm.name}
                      </span>
                      {r.stale && (
                        <span className="text-caption rounded-full bg-danger-bg text-danger px-2 py-0.5 border border-danger/30">
                          Dữ liệu cũ
                        </span>
                      )}
                    </div>
                    <p className="text-caption text-text-3 mt-0.5">
                      {r.nm.code} · {r.nm.region}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-1">
                    {fmtM2(r.totalRequestedM2)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-1">
                    {fmtM2(r.totalCommittedM2)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 border text-table-sm font-semibold",
                        meta.tone
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {r.gapPct}%
                    </span>
                    <p className="text-caption text-text-3 mt-1">
                      Δ {fmtM2(r.gapM2)}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        "text-table-sm",
                        r.velocity === "Tăng"
                          ? "text-danger"
                          : r.velocity === "Giảm"
                          ? "text-success"
                          : "text-text-2"
                      )}
                    >
                      {r.velocity === "Tăng" ? "↑ " : r.velocity === "Giảm" ? "↓ " : "→ "}
                      {r.velocity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-text-2">
                    {r.daysLeft} ngày
                  </td>
                  <td className="px-4 py-3 text-text-2">{r.note}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant={r.status === "critical" ? "default" : "outline"}
                      onClick={() => onSelect(r)}
                    >
                      Mô phỏng
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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

      <div className="rounded-button bg-surface-2 px-3 py-2.5">
        <p className="text-caption text-text-3 uppercase tracking-wider">
          Chi phí ước tính
        </p>
        <p className="font-display text-h2 font-bold text-text-1 mt-0.5 tabular-nums">
          {fmtVnd(scenario.cost)}
        </p>
        <p className="text-caption text-text-3 mt-0.5">{scenario.costFormula}</p>
      </div>

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

  const totalGap = rows.reduce((s, r) => s + r.gapM2, 0);
  const totalRequested = rows.reduce((s, r) => s + r.totalRequestedM2, 0);
  const overallGapPct =
    totalRequested === 0
      ? 0
      : Math.round((totalGap / totalRequested) * 1000) / 10;

  return (
    <AppLayout>
      <ScreenHeader
        title="Khoảng cách & Kịch bản"
        subtitle={`Tổng gap ${fmtM2(totalGap)} (${overallGapPct}% so với cam kết) · Ngày ${CURRENT_DAY}/${TOTAL_DAYS}`}
        actions={
          <div className="flex items-center gap-2 text-table-sm">
            <span className="rounded-full bg-danger-bg text-danger px-2.5 py-1 border border-danger/30 inline-flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {rows.filter((r) => r.status === "critical").length} NM nguy hiểm
            </span>
            <span className="rounded-full bg-warning-bg text-warning px-2.5 py-1 border border-warning/30 inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {rows.filter((r) => r.status === "watch").length} cần theo dõi
            </span>
            <span className="rounded-full bg-success-bg text-success px-2.5 py-1 border border-success/30 inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {rows.filter((r) => r.status === "on_track").length} đúng tiến độ
            </span>
          </div>
        }
      />

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

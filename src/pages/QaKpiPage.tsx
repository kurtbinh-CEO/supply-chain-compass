/**
 * QA Page — KpiCard / HeroCard worst-case rendering
 *
 * Route: /qa/kpi
 *
 * Renders matrices of edge cases (very long titles, 10+ digit values,
 * long units, multi-line hints, mixed trends) so we can visually verify:
 *   - value never wraps
 *   - unit truncates with ellipsis
 *   - title shrinks / clamps to 2 lines past the `xl` cutoff
 *   - hint truncates on a single line
 *   - layout heights stay aligned across cards
 *
 * Toggle Farmer mode in the TopBar and resize the viewport (≤ 480px) to
 * stress-test mobile heuristics. Cutoffs live in src/lib/kpi-thresholds.ts.
 */
import { ShieldAlert, Repeat, ShieldCheck, Truck, LineChart, AlertTriangle, Zap } from "lucide-react";
import { KpiCard } from "@/components/KpiCard";
import { HeroCard } from "@/components/monitoring/MonitoringHeroCards";
import { StatusChip } from "@/components/StatusChip";
import { TenantDropdown, FreshnessIndicator } from "@/components/TopBar";
import { kpiTrend } from "@/lib/kpi-format";
import { KPI_THRESHOLDS } from "@/lib/kpi-thresholds";
import { useFarmerMode } from "@/components/FarmerModeContext";
import { useState } from "react";

const noop = () => {};

/** Local mock TenantDropdown harness — independent state per scenario. */
function TenantHarness({ initial, all }: { initial: string; all: readonly string[] }) {
  const [t, setT] = useState(initial);
  return <TenantDropdown tenant={t} setTenant={setT as never} tenants={all} />;
}

const SHORT_TITLE = "Doanh thu";
const MED_TITLE   = "Doanh thu rủi ro tuần này";                            // ~26
const LONG_TITLE  = "Doanh thu rủi ro do trễ giao hàng nhà máy Phú Mỹ";     // ~50

const SHORT_HINT  = "vs tuần trước";
const MED_HINT    = "Còn 2 PO chờ phát hành W18";                           // ~30
const LONG_HINT   = "MAPE tăng 3 tuần liên tiếp — cần review lại baseline forecast"; // ~62

const LONG_UNIT   = "triệu đồng / tháng";  // 18 chars

export default function QaKpiPage() {
  const { enabled: farmer, toggle } = useFarmerMode();

  return (
    <div className="min-h-screen bg-surface-0 p-4 sm:p-6 space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-2xl font-bold text-text-1">QA · KpiCard / HeroCard</h1>
        <p className="text-table-sm text-text-2 max-w-prose">
          Stress-test ellipsis &amp; auto-shrink. Resize viewport ≤ 480px to verify mobile heuristics.
          Cutoffs live in <code className="font-mono text-caption">src/lib/kpi-thresholds.ts</code>.
        </p>
        <div className="flex flex-wrap gap-2 items-center text-caption text-text-3">
          <button
            onClick={toggle}
            className="rounded-md border border-surface-3 bg-surface-1 px-3 py-1.5 text-table-sm font-medium text-text-1 hover:bg-surface-2"
          >
            Farmer mode: <span className={farmer ? "text-success" : "text-text-3"}>{farmer ? "ON" : "OFF"}</span>
          </button>
          <span>·</span>
          <span>title cutoffs lg/xl: {KPI_THRESHOLDS.title.lg}/{KPI_THRESHOLDS.title.xl}</span>
          <span>·</span>
          <span>value: {KPI_THRESHOLDS.value.lg}/{KPI_THRESHOLDS.value.xl}</span>
          <span>·</span>
          <span>unit: {KPI_THRESHOLDS.unit.lg}/{KPI_THRESHOLDS.unit.xl}</span>
          <span>·</span>
          <span>hint: {KPI_THRESHOLDS.hint.lg}/{KPI_THRESHOLDS.hint.xl}</span>
        </div>
      </header>

      {/* ─── KpiCard matrix ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-text-1">KpiCard — edge cases</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Baseline */}
          <KpiCard
            title={SHORT_TITLE} valueNum={1_200_000_000} valueUnit="vnd"
            tone="primary" icon={Zap} hint={SHORT_HINT}
            trend={kpiTrend(8, "pct", { higherIsBetter: true, vs: "tuần trước" })}
          />

          {/* Long title — should clamp 2 lines */}
          <KpiCard
            title={LONG_TITLE} valueNum={3_170_000_000} valueUnit="vnd"
            tone="danger" icon={ShieldAlert} hint={MED_HINT}
            trend={kpiTrend(12, "pct", { higherIsBetter: false, vs: "tuần trước" })}
          />

          {/* Huge value — should shrink, never wrap */}
          <KpiCard
            title={MED_TITLE} value="1.234.567,89" unit="₫"
            tone="warning" icon={AlertTriangle} hint={SHORT_HINT}
          />

          {/* Long unit — truncates, value stays put */}
          <KpiCard
            title="Tiết kiệm vốn lưu động" value="340" unit={LONG_UNIT}
            tone="success" icon={Repeat} hint="Đã đạt target Q2"
            trend={kpiTrend(15, "pct", { higherIsBetter: true })}
          />

          {/* Long hint — truncates 1 line, with trend */}
          <KpiCard
            title="Độ chính xác dự báo" valueNum={18} valueUnit="pct"
            tone="info" icon={LineChart} hint={LONG_HINT}
            trend={kpiTrend(3, "pct", { higherIsBetter: false, vs: "tuần trước" })}
          />

          {/* Everything maxed */}
          <KpiCard
            title={LONG_TITLE} value="9.876.543.210" unit={LONG_UNIT}
            tone="danger" icon={ShieldAlert} hint={LONG_HINT}
            trend={kpiTrend(120, "pct", { higherIsBetter: false, vs: "kế hoạch tháng" })}
          />

          {/* No icon, no trend */}
          <KpiCard
            title="Số NM theo dõi" valueNum={5} valueUnit="qty" qtyLabel="nhà máy"
            tone="neutral"
          />

          {/* Negative trend, percent value */}
          <KpiCard
            title="Mức phục vụ" valueNum={95.5} valueUnit="pct"
            tone="success" icon={ShieldCheck}
            trend={kpiTrend(-2.1, "pct", { higherIsBetter: true, vs: "tháng trước" })}
            hint="Target ≥ 95%"
          />

          {/* Empty state — no hint, no trend */}
          <KpiCard
            title="Đơn vị mới" valueNum={0} valueUnit="qty" qtyLabel="đơn"
            tone="neutral" icon={Truck}
          />
        </div>
      </section>

      {/* ─── HeroCard matrix ────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-text-1">HeroCard — edge cases</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <HeroCard
            onClick={noop} icon={<ShieldAlert className="h-4 w-4" />} tone="danger"
            label="Rủi ro NM"
            valueNum={5} valueUnit="qty" qtyLabel="nhà máy"
            sub="1 rủi ro cao"
          />
          <HeroCard
            onClick={noop} icon={<Repeat className="h-4 w-4" />} tone="primary"
            label="ROI Bánh đà tháng này quý 2"  /* long label */
            valueNum={9_876_543_210} valueUnit="vnd"  /* huge value */
            sub={MED_HINT}
          />
          <HeroCard
            onClick={noop} icon={<ShieldCheck className="h-4 w-4" />} tone="warning"
            label="Tồn kho an toàn"
            value="1.234,5" unit={LONG_UNIT}  /* long unit */
            sub={LONG_HINT}                     /* long sub */
          />
          <HeroCard
            onClick={noop} icon={<Truck className="h-4 w-4" />} tone="warning"
            label="Tiến độ phát hành PO toàn quốc"
            valueNum={72} valueUnit="pct"
            sub="Pace chậm nhẹ"
            trend={{ value: "-5", direction: "down", isGood: false, vs: "kế hoạch" }}
          />
          <HeroCard
            onClick={noop} icon={<LineChart className="h-4 w-4" />} tone="info"
            label="Độ chính xác dự báo MAPE"
            valueNum={18.7} valueUnit="pct"
            sub="MAPE — tăng 3 tuần liên tiếp"
            trend={{ value: "+3", direction: "up", isGood: false, vs: "tuần trước" }}
          />
        </div>
      </section>

      {/* ─── StatusChip matrix ──────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-text-1">StatusChip — edge cases</h2>
        <div className="flex flex-wrap gap-2 max-w-md border border-dashed border-surface-3 p-3 rounded-card">
          <StatusChip status="success" label="OK" />
          <StatusChip status="info" label="Đang xử lý" />
          <StatusChip status="warning" label="Trễ giao hàng nhẹ" />
          <StatusChip status="danger" label="Đã quá hạn 3 ngày làm việc" />
          <StatusChip status="warning" label="Mondelez Vietnam Ltd. — chi nhánh HCM kho 3" />
          <StatusChip status="info" label="Chờ duyệt từ Giám đốc Chuỗi cung ứng tháng 4 quý 2 năm 2026" />
        </div>
        <p className="text-caption text-text-3">
          Container 28rem — chips truncate, never overflow. Hover for full label.
        </p>
      </section>

      {/* ─── Header stress (under 480px) ────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-text-1">Header — TenantDropdown + FreshnessIndicator @ 480px</h2>
        <p className="text-caption text-text-3 max-w-prose">
          Each frame caps at <code className="font-mono">375px</code> / <code className="font-mono">414px</code> /
          <code className="font-mono">480px</code> to mimic real mobile widths. Tenant pill must truncate
          long names and show full text on hover; FreshnessIndicator stays visible (its label hides &lt; md).
          Tap chips and confirm dropdowns open within the frame.
        </p>

        {[375, 414, 480].map((w) => (
          <div key={w} className="space-y-1.5">
            <div className="text-caption font-mono text-text-3">viewport ≈ {w}px</div>
            <div
              style={{ width: w }}
              className="border border-dashed border-surface-3 rounded-card overflow-hidden bg-surface-2/40"
            >
              {/* Mini TopBar slice — same layout primitives as real header */}
              <div className="flex h-14 items-center px-4 gap-2.5 min-w-0">
                <TenantHarness
                  initial="Mondelez Vietnam Ltd. — HCM"
                  all={["UNIS", "TTC AgriS Group", "Mondelez Vietnam Ltd. — HCM"]}
                />
                <FreshnessIndicator />
                <div className="h-6 w-px bg-surface-3 shrink-0 mx-0.5" />
                <nav className="flex items-center gap-1.5 text-table-sm min-w-0 overflow-hidden">
                  <span className="text-text-3 font-medium shrink-0">SCP</span>
                  <span className="text-text-1 font-semibold truncate">Bảng điều khiển vận hành</span>
                </nav>
                <div className="flex-1" />
                <button className="shrink-0 h-8 w-8 rounded-lg border border-surface-3 bg-surface-0" aria-label="search" />
              </div>
            </div>
          </div>
        ))}

        <details className="text-caption text-text-3">
          <summary className="cursor-pointer text-text-2 font-medium">Verification checklist</summary>
          <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
            <li>Tenant pill truncates with ellipsis (no horizontal scroll on the frame).</li>
            <li>Hovering the tenant pill reveals full name via native tooltip.</li>
            <li>FreshnessIndicator dot + (md+) label stay aligned, never wrap.</li>
            <li>Breadcrumb truncates after the pills, search button stays right-aligned.</li>
            <li>Clicking the tenant pill opens the dropdown without overflowing the frame.</li>
          </ul>
        </details>
      </section>
    </div>
  );
}

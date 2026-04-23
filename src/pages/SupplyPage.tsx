import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Bell, Lock, AlertTriangle, CheckCircle2, Clock, ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { NMSupplyView } from "@/components/supply/NMSupplyView";
import { NmCommitmentResponses } from "@/components/supply/NmCommitmentResponses";
import { ClickableNumber } from "@/components/ClickableNumber";
import { LogicTooltip } from "@/components/LogicTooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTenant } from "@/components/TenantContext";
import {
  FACTORIES,
  NM_COMMITMENTS,
  NM_INVENTORY,
  type NmId,
} from "@/data/unis-enterprise-dataset";

type FreshnessTone = "ok" | "watch" | "block";

interface FreshnessRow {
  nmId: NmId;
  name: string;
  hours: number;
  tone: FreshnessTone;
  icon: string;
  impact: string;
  blocked: boolean;
}

/** Derive freshness leaderboard from NM_INVENTORY updatedAt timestamps. */
function buildFreshness(): FreshnessRow[] {
  const NOW = new Date("2026-05-13T10:00:00+07:00").getTime();

  return FACTORIES.map((nm) => {
    const rows = NM_INVENTORY.filter((r) => r.nmId === nm.id);
    const latest = rows.reduce((max, r) => {
      const t = new Date(r.updatedAt).getTime();
      return t > max ? t : max;
    }, 0);
    const hours = latest === 0 ? 96 : Math.max(1, Math.round((NOW - latest) / 3600000));

    let tone: FreshnessTone = "ok";
    let icon = "✅";
    if (hours >= 48) {
      tone = "block";
      icon = "🔴";
    } else if (hours >= 24) {
      tone = "watch";
      icon = "⚠️";
    }

    // Build impact line for blocked NMs
    const commits = NM_COMMITMENTS.filter((c) => c.nmId === nm.id);
    const skus = [...new Set(commits.map((c) => c.skuBaseCode))];
    const totalGap = commits.reduce((s, c) => s + (c.requestedM2 - c.committedM2), 0);

    let impact = `Cập nhật ${hours}h trước · ${rows.length} SKU`;
    if (tone === "block") {
      impact = `${nm.name}: ${hours}h → PO CHẶN → ~${totalGap.toLocaleString()}m² ${skus[0] ?? ""} chưa cam kết`;
    } else if (tone === "watch") {
      impact = `${nm.name}: ${hours}h → cảnh báo · honoring ${nm.honoringPct}%`;
    }

    return {
      nmId: nm.id,
      name: nm.name,
      hours,
      tone,
      icon,
      impact,
      blocked: tone === "block",
    };
  }).sort((a, b) => a.hours - b.hours);
}

const TONE_STYLES: Record<FreshnessTone, { bar: string; text: string; bg: string; border: string }> = {
  ok: {
    bar: "bg-success",
    text: "text-success",
    bg: "bg-success-bg",
    border: "border-success/30",
  },
  watch: {
    bar: "bg-warning",
    text: "text-warning",
    bg: "bg-warning-bg",
    border: "border-warning/30",
  },
  block: {
    bar: "bg-danger",
    text: "text-danger",
    bg: "bg-danger-bg",
    border: "border-danger/40",
  },
};

/* ─────────────────────────── Freshness Leaderboard ─────────────────────────── */

function NmFreshnessLeaderboard() {
  const rows = useMemo(buildFreshness, []);
  const maxHours = Math.max(...rows.map((r) => r.hours), 24);
  const blocked = rows.filter((r) => r.blocked);

  const handleRemind = (name: string) => {
    toast.success("Đã gửi nhắc nhở", {
      description: `Đã ping ${name} qua Zalo + email — yêu cầu cập nhật tồn trong 4h`,
    });
  };

  return (
    <section className="rounded-card border border-surface-3 bg-surface-1 p-4 mb-5" data-tour="nm-freshness">
      <header className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-section-header font-semibold text-text-1">Độ tươi tồn NM</h3>
          <LogicTooltip
            title="Độ tươi tồn NM"
            content="Số giờ từ lần cập nhật tồn gần nhất.\n✅ < 24h: ổn\n⚠️ 24-48h: cảnh báo\n🔴 > 48h: CHẶN PO — không thể release vì dữ liệu không tin được."
          >
            <span className="text-caption text-text-3 cursor-help">ⓘ Vì sao quan trọng?</span>
          </LogicTooltip>
        </div>
        {blocked.length > 0 && (
          <div className="inline-flex items-center gap-1.5 rounded-button bg-danger-bg text-danger text-table-sm font-medium px-3 py-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            {blocked.length} NM CHẶN PO
          </div>
        )}
      </header>

      <ol className="space-y-2.5">
        {rows.map((r, idx) => {
          const styles = TONE_STYLES[r.tone];
          const widthPct = Math.min(100, (r.hours / maxHours) * 100);
          return (
            <li
              key={r.nmId}
              data-severity={r.blocked ? "shortage" : r.tone === "watch" ? "watch" : "ok"}
              className={cn(
                "rounded-md border px-3 py-2 flex items-center gap-3",
                styles.border,
                r.blocked ? styles.bg : "bg-surface-1",
              )}
            >
              <span className="text-table-sm tabular-nums text-text-3 w-5">{idx + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-table font-semibold text-text-1">{r.name}</span>
                    <span className={cn("text-table-sm font-medium", styles.text)}>
                      {r.icon} {r.hours}h
                    </span>
                  </div>
                  <span className="text-caption text-text-2 truncate max-w-[420px] hidden sm:inline">{r.impact}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", styles.bar)}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <div className="text-caption text-text-2 mt-1 sm:hidden">{r.impact}</div>
              </div>
              <Button
                variant={r.blocked ? "destructive" : "outline"}
                size="sm"
                onClick={() => handleRemind(r.name)}
                className="shrink-0"
              >
                <Bell className="h-3.5 w-3.5" />
                Nhắc NM
              </Button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ─────────────────────────── Tab 1: Booking Netting ─────────────────────────── */

interface BookingRow {
  nmId: NmId;
  name: string;
  honoringPct: number;
  requested: number;
  committed: number;
  expectedActual: number; // committed × honoring
  grade: "A" | "B" | "C" | "D";
  warning: string | null;
}

function gradeFromHonoring(p: number): "A" | "B" | "C" | "D" {
  if (p >= 95) return "A";
  if (p >= 85) return "B";
  if (p >= 70) return "C";
  return "D";
}

const GRADE_COLORS: Record<string, string> = {
  A: "bg-success-bg text-success border-success/30",
  B: "bg-info-bg text-info border-info/30",
  C: "bg-warning-bg text-warning border-warning/30",
  D: "bg-danger-bg text-danger border-danger/40",
};

function BookingNettingTab() {
  const { tenant } = useTenant();
  const scale = tenant === "TTC Agris" ? 0.75 : tenant === "Mondelez" ? 1.2 : 1;

  const rows: BookingRow[] = useMemo(() => {
    return FACTORIES.map((nm) => {
      const commits = NM_COMMITMENTS.filter((c) => c.nmId === nm.id);
      const requested = Math.round(commits.reduce((s, c) => s + c.requestedM2, 0) * scale);
      const committed = Math.round(commits.reduce((s, c) => s + c.committedM2, 0) * scale);
      const honoringPct = nm.honoringPct;
      const expectedActual = Math.round((committed * honoringPct) / 100);
      const grade = gradeFromHonoring(honoringPct);
      const lossM2 = committed - expectedActual;
      const warning =
        grade === "D" || grade === "C"
          ? `⚠️ ${nm.name} ${committed.toLocaleString()}m² → thực nhận ~${expectedActual.toLocaleString()}m² (${honoringPct}%) vì honoring lịch sử thấp`
          : null;
      return { nmId: nm.id, name: nm.name, honoringPct, requested, committed, expectedActual, grade, warning };
    });
  }, [scale]);

  const totals = useMemo(() => {
    const reqAll = rows.reduce((s, r) => s + r.requested, 0);
    const comAll = rows.reduce((s, r) => s + r.committed, 0);
    const expAll = rows.reduce((s, r) => s + r.expectedActual, 0);
    return { reqAll, comAll, expAll };
  }, [rows]);

  return (
    <div className="space-y-4">
      {/* Totals strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-surface-3 bg-surface-1 px-4 py-3">
        <div className="flex flex-col">
          <span className="text-caption uppercase text-text-3 tracking-wider">Σ Requested</span>
          <ClickableNumber
            value={`${totals.reqAll.toLocaleString()} m²`}
            label="Σ Hub yêu cầu"
            color="text-text-1 font-display text-section-header"
            breakdown={rows.map((r) => ({ label: r.name, value: `${r.requested.toLocaleString()} m²` }))}
            note="Tổng số m² Hub gửi xuống cho 5 NM trong tháng"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-caption uppercase text-text-3 tracking-wider">Σ Committed</span>
          <ClickableNumber
            value={`${totals.comAll.toLocaleString()} m²`}
            label="Σ NM cam kết"
            color="text-info font-display text-section-header"
            formula={`Σ Committed = ${totals.comAll.toLocaleString()} m²\nHonoring trung bình = ${((totals.comAll / Math.max(1, totals.reqAll)) * 100).toFixed(1)}% vs Requested`}
            note="Tổng cam kết từ NM — tier Hard/Firm/Soft/Counter"
          />
        </div>
        <div className="flex flex-col">
          <span className="text-caption uppercase text-text-3 tracking-wider">Σ Expected Actual</span>
          <ClickableNumber
            value={`${totals.expAll.toLocaleString()} m²`}
            label="Σ thực nhận dự kiến"
            color={cn(
              "font-display text-section-header",
              totals.expAll < totals.comAll * 0.85 ? "text-warning" : "text-success",
            )}
            formula={`Σ Expected = Σ (Committed × Honoring%)\n= ${totals.expAll.toLocaleString()} m²\nLoss = Σ Committed − Σ Expected = ${(totals.comAll - totals.expAll).toLocaleString()} m²`}
            note="Adjust theo honoring lịch sử của từng NM — đây là số cần dùng cho DRP netting"
          />
        </div>
      </div>

      {/* Booking netting table */}
      <div className="rounded-card border border-surface-3 bg-surface-1 overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between">
          <h4 className="text-table font-semibold text-text-1">Booking Netting per NM</h4>
          <LogicTooltip
            title="Single-source NM"
            content="Mỗi SKU chỉ thuộc về 1 NM duy nhất (single-source). Khoá 🔒 thể hiện ràng buộc này."
          >
            <span className="inline-flex items-center gap-1 text-caption text-text-3 cursor-help">
              <Lock className="h-3 w-3" /> Single-source NM
            </span>
          </LogicTooltip>
        </div>

        <table className="w-full text-table">
          <thead className="bg-surface-2 text-caption uppercase text-text-3">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">NM 🔒</th>
              <th className="text-left px-4 py-2.5 font-medium">Grade</th>
              <th className="text-right px-4 py-2.5 font-medium">Honoring</th>
              <th className="text-right px-4 py-2.5 font-medium">Requested</th>
              <th className="text-right px-4 py-2.5 font-medium">Committed</th>
              <th className="text-right px-4 py-2.5 font-medium">Expected Actual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const severity =
                r.grade === "D" ? "shortage" : r.grade === "C" ? "watch" : "ok";
              return (
                <>
                  <tr
                    key={r.nmId}
                    data-severity={severity}
                    className="border-t border-surface-3 hover:bg-surface-2/50"
                  >
                    <td className="px-4 py-2.5 font-medium text-text-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-text-3" />
                        {r.name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "inline-flex items-center justify-center w-7 h-6 rounded-full border text-table-sm font-bold",
                          GRADE_COLORS[r.grade],
                        )}
                      >
                        {r.grade}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-2">{r.honoringPct}%</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-1">
                      <ClickableNumber
                        value={r.requested.toLocaleString()}
                        label={`${r.name} requested`}
                        color="text-text-1 font-medium"
                        note="Số Hub gửi cho NM theo S&OP locked"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-text-1">
                      <ClickableNumber
                        value={r.committed.toLocaleString()}
                        label={`${r.name} committed`}
                        color="text-info font-medium"
                        formula={`Committed = Σ NM_COMMITMENTS.committedM2 (${r.nmId})\n= ${r.committed.toLocaleString()} m²`}
                        note={`Tổng cam kết NM tier Hard/Firm/Soft/Counter`}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <ClickableNumber
                        value={r.expectedActual.toLocaleString()}
                        label={`${r.name} expected actual`}
                        color={cn(
                          "font-semibold",
                          r.grade === "D" ? "text-danger" : r.grade === "C" ? "text-warning" : "text-success",
                        )}
                        formula={`Expected = Committed × Honoring%\n= ${r.committed.toLocaleString()} × ${r.honoringPct}%\n= ${r.expectedActual.toLocaleString()} m²`}
                        note={`Loss dự kiến = ${(r.committed - r.expectedActual).toLocaleString()} m² do honoring ${r.honoringPct}%`}
                      />
                    </td>
                  </tr>
                  {r.warning && (
                    <tr key={`${r.nmId}-warn`} className="border-t border-surface-3/50">
                      <td colSpan={6} className="px-4 py-2 bg-warning-bg/40">
                        <div className="flex items-start gap-2 text-table-sm">
                          <ShieldAlert className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                          <span className="text-text-1">{r.warning}</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────── Tab 2: NM Responses ─────────────────────────── */

function NmResponsesTab() {
  const [selected, setSelected] = useState<NmId>("MIKADO");
  const isStale = selected === "PHUMY";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-table-sm text-text-3">Chọn NM:</span>
        {FACTORIES.map((nm) => (
          <button
            key={nm.id}
            onClick={() => setSelected(nm.id)}
            className={cn(
              "px-3 py-1.5 rounded-button text-table-sm font-medium border transition-colors",
              selected === nm.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-surface-1 text-text-2 border-surface-3 hover:bg-surface-2",
            )}
          >
            {nm.name}
          </button>
        ))}
      </div>
      <NmCommitmentResponses nmId={selected} isStale={isStale} />
    </div>
  );
}

/* ─────────────────────────── Page ─────────────────────────── */

export default function SupplyPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"booking" | "responses" | "inventory">("booking");

  const tabs: Array<{ id: typeof activeTab; label: string; icon: typeof CheckCircle2 }> = [
    { id: "booking", label: "Tính toán đặt hàng", icon: Clock },
    { id: "responses", label: "Phản hồi NM", icon: CheckCircle2 },
    { id: "inventory", label: "Tồn NM", icon: ShieldAlert },
  ];

  return (
    <AppLayout>
      <ScreenHeader
        title="NM Supply"
        subtitle="Booking netting · Phản hồi cam kết · Tồn kho nhà máy"
      />

      <NmFreshnessLeaderboard />

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-surface-3 mb-5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 text-table font-medium border-b-2 transition-colors -mb-px",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-text-2 hover:text-text-1",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "booking" && <BookingNettingTab />}
      {activeTab === "responses" && <NmResponsesTab />}
      {activeTab === "inventory" && <NMSupplyView />}

      {/* Next-step bridge */}
      <div className="mt-6 rounded-card border border-info/30 bg-info-bg/40 px-4 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 text-table text-text-1">
          <span className="font-medium">Bước tiếp:</span>
          <span className="text-text-2">Booking xong → Cam kết NM tại Hub</span>
        </div>
        <Button onClick={() => navigate("/hub")} variant="default" size="sm">
          Đi tới Hub
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScreenFooter actionCount={6} />
    </AppLayout>
  );
}

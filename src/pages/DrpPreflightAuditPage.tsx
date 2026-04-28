/**
 * DrpPreflightAuditPage — /drp/preflight-audit
 *
 * Hiển thị TOÀN BỘ điều kiện preflight với lý do pass/block, ngưỡng, bằng chứng,
 * quy tắc business và link xử lý — để vận hành đối chiếu nhanh trước khi bấm
 * [▶ Chạy DRP] tại /drp Bước 1.
 *
 * Dùng chung evaluator ở src/lib/drp-preflight.ts với DrpPage để đảm bảo kết
 * quả khớp 1:1.
 *
 * Mọi text tiếng Việt.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2, AlertTriangle, AlertOctagon, ArrowRight, ArrowLeft,
  Play, ShieldCheck, Lock as LockIcon, Info, ListChecks, ScrollText,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { useTenant } from "@/components/TenantContext";
import { usePlanningPeriod } from "@/components/PlanningPeriodContext";
import { useWorkspace } from "@/components/WorkspaceContext";
import { cn } from "@/lib/utils";
import {
  computePreflightAudit,
  summarizePreflight,
  levelLabelVi,
  type PreflightAuditRow,
} from "@/lib/drp-preflight";
import type { PreflightLevel } from "@/components/drp/DrpPreflight";

function levelIcon(l: PreflightLevel) {
  if (l === "ok") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (l === "warn") return <AlertTriangle className="h-4 w-4 text-warning" />;
  return <AlertOctagon className="h-4 w-4 text-danger" />;
}

function levelChipClass(l: PreflightLevel) {
  if (l === "ok") return "bg-success-bg text-success border-success/30";
  if (l === "warn") return "bg-warning-bg text-warning border-warning/40";
  return "bg-danger-bg text-danger border-danger/40";
}

function rowAccent(l: PreflightLevel) {
  if (l === "ok") return "border-l-success";
  if (l === "warn") return "border-l-warning";
  return "border-l-danger";
}

export default function DrpPreflightAuditPage() {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { current: planCycle } = usePlanningPeriod();
  const { sopLock } = useWorkspace();

  const rows = useMemo<PreflightAuditRow[]>(
    () =>
      computePreflightAudit({
        tenant,
        planCycle,
        sopLockedFromWorkspace: sopLock.locked,
      }),
    [tenant, planCycle, sopLock.locked],
  );

  const summary = useMemo(() => summarizePreflight(rows), [rows]);

  const headerActions = (
    <>
      <button
        onClick={() => navigate("/drp")}
        className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-2 px-3 text-table-sm text-text-2 hover:text-text-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Về DRP
      </button>
      <button
        onClick={() => navigate("/drp")}
        disabled={!summary.canRun}
        title={summary.canRun ? "" : "Cần xử lý mục bị chặn trước khi chạy"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-button px-3 text-table-sm font-semibold",
          summary.canRun
            ? "bg-success text-primary-foreground hover:opacity-90"
            : "bg-surface-3 text-text-3 cursor-not-allowed",
        )}
      >
        <Play className="h-3.5 w-3.5" /> Đi tới Chạy DRP
      </button>
    </>
  );

  return (
    <AppLayout>
      <ScreenHeader
        title="DRP Preflight Audit"
        subtitle={`Đối chiếu 6 điều kiện trước khi chạy DRP — Kỳ ${planCycle.label}`}
        actions={headerActions}
      />

      {/* Summary banner */}
      <section
        className={cn(
          "rounded-card border p-4 mb-4 flex items-start gap-3",
          summary.canRun && summary.warn === 0 &&
            "border-success/40 bg-success-bg/40",
          summary.canRun && summary.warn > 0 &&
            "border-warning/40 bg-warning-bg/40",
          !summary.canRun && "border-danger/40 bg-danger-bg/40",
        )}
      >
        {summary.canRun && summary.warn === 0 && (
          <ShieldCheck className="h-6 w-6 text-success shrink-0 mt-0.5" />
        )}
        {summary.canRun && summary.warn > 0 && (
          <AlertTriangle className="h-6 w-6 text-warning shrink-0 mt-0.5" />
        )}
        {!summary.canRun && (
          <AlertOctagon className="h-6 w-6 text-danger shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-h3 font-display font-semibold text-text-1">
            {summary.canRun && summary.warn === 0 && "Tất cả điều kiện đã sẵn sàng"}
            {summary.canRun && summary.warn > 0 &&
              `Có thể chạy với ${summary.warn} cảnh báo`}
            {!summary.canRun &&
              `Không thể chạy DRP — ${summary.block} điều kiện bị chặn`}
          </div>
          <div className="text-table-sm text-text-2 mt-1">
            {summary.ok}/{summary.total} sẵn sàng
            {summary.warn > 0 && ` · ${summary.warn} cảnh báo`}
            {summary.block > 0 && ` · ${summary.block} bị chặn`}
          </div>
          {!summary.canRun && summary.blockReasons.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-table-sm text-danger">
              {summary.blockReasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span aria-hidden>•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Quick KPI strip */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiBox
          icon={<ListChecks className="h-4 w-4" />}
          label="Tổng điều kiện"
          value={String(summary.total)}
          tone="text-text-1"
        />
        <KpiBox
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Sẵn sàng"
          value={String(summary.ok)}
          tone="text-success"
        />
        <KpiBox
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Cảnh báo"
          value={String(summary.warn)}
          tone="text-warning"
        />
        <KpiBox
          icon={<AlertOctagon className="h-4 w-4" />}
          label="Bị chặn"
          value={String(summary.block)}
          tone="text-danger"
        />
      </section>

      {/* Detail cards per condition */}
      <section className="space-y-3">
        {rows.map((r, idx) => (
          <article
            key={r.key}
            className={cn(
              "rounded-card border border-surface-3 bg-surface-1 border-l-4 p-4",
              rowAccent(r.level),
            )}
          >
            {/* Header */}
            <header className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-2 min-w-0">
                <div className="text-caption text-text-3 font-mono shrink-0 mt-1">
                  #{idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-table font-semibold text-text-1 truncate">
                    {r.label}
                  </div>
                  <div className="text-table-sm text-text-2 mt-0.5">{r.result}</div>
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-caption font-semibold shrink-0",
                  levelChipClass(r.level),
                )}
              >
                {levelIcon(r.level)}
                {levelLabelVi(r.level)}
              </span>
            </header>

            {/* Body grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-table-sm">
              <DetailBlock
                icon={<Info className="h-3.5 w-3.5" />}
                title="Ngưỡng"
                body={r.thresholdText}
              />
              <DetailBlock
                icon={<ScrollText className="h-3.5 w-3.5" />}
                title="Quy tắc"
                body={r.ruleText}
              />
              <DetailBlock
                icon={<ListChecks className="h-3.5 w-3.5" />}
                title="Bằng chứng dữ liệu"
                body={
                  <ul className="space-y-0.5 list-disc pl-4 marker:text-text-3">
                    {r.evidence.map((e, i) => (
                      <li key={i} className="text-text-2">
                        {e}
                      </li>
                    ))}
                  </ul>
                }
              />
              <DetailBlock
                icon={<LockIcon className="h-3.5 w-3.5" />}
                title="Tác động khi không đạt"
                body={
                  r.blocksRun
                    ? "🔴 Chặn nút [Chạy DRP] — phải xử lý trước khi tiếp tục."
                    : r.level === "warn"
                      ? "⚠️ Vẫn chạy được nhưng kết quả có sai số — cân nhắc xử lý."
                      : "✅ Không cản trở DRP."
                }
              />
            </div>

            {/* Detail line + fix link */}
            {(r.detail || r.fixHref) && (
              <footer className="mt-3 pt-3 border-t border-surface-3 flex items-start justify-between gap-3 flex-wrap">
                {r.detail ? (
                  <div className="text-table-sm text-text-2 flex-1 min-w-0">
                    {r.detail}
                  </div>
                ) : <div />}
                {r.fixHref && r.level !== "ok" && (
                  <button
                    onClick={() => navigate(r.fixHref!)}
                    className={cn(
                      "inline-flex items-center gap-1 text-table-sm font-medium hover:underline shrink-0",
                      r.level === "block" ? "text-danger" : "text-warning",
                    )}
                  >
                    {r.fixLabel ?? "Xử lý"} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </footer>
            )}
          </article>
        ))}
      </section>

      {/* Footer note */}
      <p className="mt-5 text-caption text-text-3">
        Trang này dùng chung evaluator với /drp Bước 1 — kết quả luôn khớp
        nút [▶ Chạy DRP]. Cập nhật theo dữ liệu mới nhất khi bạn quay lại trang.
      </p>
    </AppLayout>
  );
}

function KpiBox({
  icon, label, value, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-card border border-surface-3 bg-surface-1 p-3">
      <div className="flex items-center gap-1.5 text-caption text-text-3">
        <span className={tone}>{icon}</span>
        {label}
      </div>
      <div className={cn("mt-1 text-h2 font-display font-semibold", tone)}>
        {value}
      </div>
    </div>
  );
}

function DetailBlock({
  icon, title, body,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded border border-surface-3 bg-surface-0 p-2.5">
      <div className="flex items-center gap-1.5 text-caption font-semibold text-text-3 uppercase tracking-wide">
        {icon} {title}
      </div>
      <div className="mt-1 text-table-sm text-text-1">{body}</div>
    </div>
  );
}

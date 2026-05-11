/**
 * CnPoApprovalTab — CN Portal tab for approving/rejecting TO Plans.
 * Scope: CN_MANAGER sees only their dest_cn; SC/CEO/Director see selectedCn.
 */
import { useState } from "react";
import { Check, X as XIcon, AlertTriangle, Clock, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePoApprovals, type PoApprovalRow } from "@/hooks/usePoApprovals";
import { useSkuUomConversion } from "@/hooks/useSkuUomConversion";

interface Props {
  /** CN code restricting the view. null = all CNs visible (SC/CEO with no scope). */
  cnScope: string | null;
  /** Whether the current user can approve. */
  canApprove: boolean;
}

const STATUS_TONE: Record<string, string> = {
  DRAFT: "bg-surface-2 text-text-2",
  SUBMITTED: "bg-info-bg text-info",
  APPROVED: "bg-success-bg text-success",
  IN_EXECUTION: "bg-warning-bg text-warning",
  FULFILLED: "bg-success-bg text-success",
  PARTIALLY_FULFILLED: "bg-warning-bg text-warning",
  CANCELLED: "bg-danger-bg text-danger",
};

export function CnPoApprovalTab({ cnScope, canApprove }: Props) {
  const { rows, loading, refresh, approve, reject, summary } = usePoApprovals(cnScope);
  const { fmtDual } = useSkuUomConversion();
  const [busyId, setBusyId] = useState<string | null>(null);

  const handle = async (row: PoApprovalRow, action: "approve" | "reject") => {
    setBusyId(row.id);
    try {
      if (action === "approve") {
        await approve(row.id);
        toast.success(`Đã duyệt ${row.to_code}`);
      } else {
        await reject(row.id);
        toast.success(`Đã từ chối ${row.to_code}`);
      }
    } catch (e: any) {
      toast.error("Cập nhật thất bại", { description: e.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ═══ Dashboard cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DashCard
          icon={<Clock className="h-4 w-4" />}
          label="Chờ duyệt"
          value={summary.pending.length}
          tone={summary.pending.length > 0 ? "warning" : "ok"}
        />
        <DashCard
          icon={<Check className="h-4 w-4" />}
          label="Đã duyệt hôm nay"
          value={summary.approvedToday.length}
          tone="success"
        />
        <DashCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Quá hạn (>24h)"
          value={summary.overdue.length}
          tone={summary.overdue.length > 0 ? "danger" : "ok"}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-table-sm text-text-3">
          {cnScope
            ? <>Phạm vi: <span className="font-mono text-text-1">{cnScope}</span> · {rows.length} TO Plan</>
            : <>Tất cả CN · {rows.length} TO Plan</>}
        </p>
        <Button size="sm" variant="outline" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />Làm mới
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-1/50 sticky top-0 z-10">
              <tr className="border-b border-surface-3">
                {["Mã TO", "Nguồn", "CN đích", "SKU", "SL (cả 2 UOM)", "Ngày xuất", "Trạng thái", "Hành động"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-text-3">Đang tải...</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-12 text-center text-text-3">
                  Không có TO Plan nào trong phạm vi này. Chạy DRP để tạo TO Plan ở trạng thái NHÁP.
                </td></tr>
              )}
              {rows.map(r => {
                const isPending = ["DRAFT", "SUBMITTED"].includes(r.status);
                const ageMs = Date.now() - new Date(r.created_at).getTime();
                const overdue = isPending && ageMs > 24 * 3_600_000;
                return (
                  <tr key={r.id} className={cn(
                    "border-b border-surface-3/50 hover:bg-surface-1/30 transition-colors",
                    overdue && "bg-danger-bg/10",
                  )}>
                    <td className="px-3 py-2 text-table font-mono text-text-1">{r.to_code}</td>
                    <td className="px-3 py-2 text-table font-mono text-text-2">{r.source_nm ?? "—"}</td>
                    <td className="px-3 py-2 text-table font-mono text-text-1">{r.dest_cn}</td>
                    <td className="px-3 py-2 text-table font-mono text-text-2">{r.sku_code}</td>
                    <td className="px-3 py-2 text-table font-mono tabular-nums text-text-1">{fmtDual(r.sku_code, r.planned_qty)}</td>
                    <td className="px-3 py-2 text-table text-text-2">{r.dispatch_date ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-table-sm font-medium", STATUS_TONE[r.status])}>
                        {r.status}
                      </span>
                      {overdue && <span className="ml-1.5 text-caption text-danger font-semibold">⚠ Quá hạn</span>}
                    </td>
                    <td className="px-3 py-2">
                      {canApprove && isPending ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" disabled={busyId === r.id} onClick={() => handle(r, "approve")}>
                            <Check className="h-3.5 w-3.5 mr-1" />Duyệt
                          </Button>
                          <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => handle(r, "reject")}>
                            <XIcon className="h-3.5 w-3.5 mr-1" />Từ chối
                          </Button>
                        </div>
                      ) : (
                        <span className="text-caption text-text-3">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DashCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "ok" | "warning" | "danger" | "success" }) {
  const toneClass = {
    ok: "border-surface-3 bg-surface-2 text-text-2",
    warning: "border-warning/30 bg-warning-bg text-warning",
    danger: "border-danger/30 bg-danger-bg text-danger",
    success: "border-success/30 bg-success-bg text-success",
  }[tone];
  return (
    <div className={cn("rounded-card border px-4 py-3 flex items-center justify-between", toneClass)}>
      <div>
        <p className="text-caption uppercase tracking-wide opacity-80">{label}</p>
        <p className="text-h2 font-display font-bold tabular-nums mt-0.5">{value}</p>
      </div>
      <div className="opacity-70">{icon}</div>
    </div>
  );
}

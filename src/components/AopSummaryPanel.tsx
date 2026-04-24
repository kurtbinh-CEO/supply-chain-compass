/**
 * AopSummaryPanel — preview AOP plan + button to open AopPlanDialog.
 *
 * Dùng làm entry point ở ConfigPage tab "Kế hoạch năm (AOP)" và MasterDataPage
 * tab "Kế hoạch năm". Click [Chỉnh sửa] → mở AopPlanDialog (đã có sẵn).
 */
import { useState } from "react";
import { Calendar, Lock, Unlock, Pencil, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AopPlanDialog } from "@/components/AopPlanDialog";
import {
  AOP_PLAN, AOP_MONTH_LABELS, getAopMonth, getAopYtd,
  type AopPlan,
} from "@/data/unis-enterprise-dataset";
import { cn } from "@/lib/utils";

export function AopSummaryPanel() {
  const [plan, setPlan] = useState<AopPlan>(AOP_PLAN);
  const [open, setOpen] = useState(false);
  const ytd = getAopYtd(new Date().getMonth() + 1, plan);
  const ytdPct = (ytd / plan.totalTarget) * 100;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="rounded-card border border-surface-3 bg-surface-1 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-button bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-section-header text-text-1">
                Kế hoạch năm (AOP) — {plan.year}
              </div>
              <div className="text-table-sm text-text-2 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Nhập bởi: <strong className="text-text-1">{plan.lockedBy}</strong></span>
                <span>·</span>
                <span>{plan.updatedAt}</span>
                <span>·</span>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption",
                  plan.locked
                    ? "bg-success-bg text-success"
                    : "bg-warning-bg text-warning",
                )}>
                  {plan.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                  {plan.locked ? "Đã khóa" : "Đang chỉnh sửa"}
                </span>
              </div>
            </div>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Chỉnh sửa
          </Button>
        </div>

        {/* KPI strip */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-button bg-surface-2 px-3 py-2.5">
            <div className="text-caption text-text-3">Tổng mục tiêu</div>
            <div className="font-display text-kpi-md tabular-nums text-text-1 mt-0.5">
              {plan.totalTarget.toLocaleString("vi-VN")} m²
            </div>
          </div>
          <div className="rounded-button bg-surface-2 px-3 py-2.5">
            <div className="text-caption text-text-3">YTD thực tế</div>
            <div className="font-display text-kpi-md tabular-nums text-text-1 mt-0.5">
              {ytd.toLocaleString("vi-VN")} m²
            </div>
            <div className="text-caption text-text-3 mt-0.5">{ytdPct.toFixed(1)}% AOP</div>
          </div>
          <div className="rounded-button bg-surface-2 px-3 py-2.5">
            <div className="text-caption text-text-3">Tháng peak</div>
            <div className="font-display text-kpi-md tabular-nums text-text-1 mt-0.5 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-success" />
              T{plan.monthlyWeights.indexOf(Math.max(...plan.monthlyWeights)) + 1}
            </div>
            <div className="text-caption text-text-3 mt-0.5">
              {Math.max(...plan.monthlyWeights)}% phân bổ
            </div>
          </div>
        </div>
      </div>

      {/* Monthly bars */}
      <div className="rounded-card border border-surface-3 bg-surface-1 p-5">
        <div className="font-display font-semibold text-table text-text-1 mb-3">
          Phân bổ theo tháng
        </div>
        <div className="space-y-2">
          {plan.monthlyWeights.map((w, idx) => {
            const month = idx + 1;
            const m2 = getAopMonth(month, plan);
            const max = Math.max(...plan.monthlyWeights);
            const widthPct = (w / max) * 100;
            return (
              <div key={month} className="flex items-center gap-3 text-table-sm">
                <span className="w-8 text-text-3 font-mono shrink-0">{AOP_MONTH_LABELS[idx]}</span>
                <div className="flex-1 h-6 bg-surface-2 rounded relative overflow-hidden">
                  <div
                    className="h-full bg-primary/60 transition-all"
                    style={{ width: `${widthPct}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-2 text-caption text-text-1 font-medium tabular-nums">
                    {m2.toLocaleString("vi-VN")} m²
                  </div>
                </div>
                <span className="w-12 text-right tabular-nums text-text-2 shrink-0">{w}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SKU group + Region split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-card border border-surface-3 bg-surface-1 p-5">
          <div className="font-display font-semibold text-table text-text-1 mb-3">
            Nhóm hàng
          </div>
          <div className="space-y-2">
            {Object.entries(plan.skuGroupWeights).map(([key, w]) => (
              <div key={key} className="flex items-center justify-between text-table-sm">
                <span className="text-text-2">{key}</span>
                <span className="font-mono tabular-nums text-text-1">
                  {Math.round((plan.totalTarget * w) / 100).toLocaleString("vi-VN")} m² ({w}%)
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-1 p-5">
          <div className="font-display font-semibold text-table text-text-1 mb-3">
            Vùng
          </div>
          <div className="space-y-2">
            {Object.entries(plan.regionWeights).map(([key, w]) => (
              <div key={key} className="flex items-center justify-between text-table-sm">
                <span className="text-text-2">{key}</span>
                <span className="font-mono tabular-nums text-text-1">
                  {Math.round((plan.totalTarget * w) / 100).toLocaleString("vi-VN")} m² ({w}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AopPlanDialog
        open={open}
        onClose={() => setOpen(false)}
        plan={plan}
        onSave={(next) => setPlan(next)}
      />
    </div>
  );
}

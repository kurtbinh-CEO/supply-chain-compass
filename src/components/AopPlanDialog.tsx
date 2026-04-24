/**
 * AopPlanDialog — M17 GAP1
 *
 * Edit toàn bộ AOP plan trong 1 dialog. 4 phần:
 *   1. Tổng AOP (year + totalTarget + source)
 *   2. Phân bổ tháng (12 rows × monthlyWeights%) — tổng phải = 100
 *   3. Phân bổ nhóm hàng (skuGroupWeights) — tổng phải = 100
 *   4. Phân bổ vùng (regionWeights) — tổng phải = 100
 *
 * Validation inline cho mỗi bảng. Có nút Khóa/Mở khóa (chỉ SC_MANAGER).
 * Khi locked → tất cả input disabled. Save → toast + onSave(plan).
 *
 * Lưu ý: lưu state in-memory (mock). Sau này thay bằng persist Cloud nếu cần.
 */
import { useEffect, useMemo, useState } from "react";
import { Lock, Unlock, Upload, History, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChangeLogPanel } from "@/components/ChangeLogPanel";
import { useRbac } from "@/components/RbacContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AOP_MONTH_LABELS, AOP_MONTH_NOTES,
  type AopPlan,
} from "@/data/unis-enterprise-dataset";

interface Props {
  open: boolean;
  onClose: () => void;
  plan: AopPlan;
  onSave: (next: AopPlan) => void;
}

const SUM_TARGET = 100;
const EPS = 0.01; // tolerance for sum=100

function fmtM2(n: number): string {
  return n.toLocaleString("vi-VN");
}
function sum(arr: number[]): number {
  return arr.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0);
}
function isHundred(n: number): boolean {
  return Math.abs(n - SUM_TARGET) < EPS;
}

export function AopPlanDialog({ open, onClose, plan, onSave }: Props) {
  const { user } = useRbac();
  const isSC = user.role === "SC_MANAGER";

  const [draft, setDraft] = useState<AopPlan>(plan);
  const [skuKeys, setSkuKeys] = useState<string[]>([]);
  const [regionKeys, setRegionKeys] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // reset draft each time dialog opens
  useEffect(() => {
    if (open) {
      setDraft(plan);
      setSkuKeys(Object.keys(plan.skuGroupWeights));
      setRegionKeys(Object.keys(plan.regionWeights));
      setShowHistory(false);
    }
  }, [open, plan]);

  const editable = !draft.locked;

  const monthSum = useMemo(() => sum(draft.monthlyWeights), [draft.monthlyWeights]);
  const skuSum = useMemo(() => sum(skuKeys.map((k) => draft.skuGroupWeights[k] ?? 0)), [draft.skuGroupWeights, skuKeys]);
  const regionSum = useMemo(() => sum(regionKeys.map((k) => draft.regionWeights[k] ?? 0)), [draft.regionWeights, regionKeys]);

  const allValid = isHundred(monthSum) && isHundred(skuSum) && isHundred(regionSum) && draft.totalTarget > 0;

  const setMonthly = (idx: number, v: number) => {
    setDraft((d) => {
      const next = [...d.monthlyWeights];
      next[idx] = v;
      return { ...d, monthlyWeights: next };
    });
  };
  const setSku = (key: string, v: number) => {
    setDraft((d) => ({ ...d, skuGroupWeights: { ...d.skuGroupWeights, [key]: v } }));
  };
  const setRegion = (key: string, v: number) => {
    setDraft((d) => ({ ...d, regionWeights: { ...d.regionWeights, [key]: v } }));
  };

  const handleSave = () => {
    if (!allValid) {
      toast.error("Tổng trọng số phải = 100% ở cả 3 bảng");
      return;
    }
    const next: AopPlan = {
      ...draft,
      updatedAt: new Date().toLocaleDateString("vi-VN"),
    };
    onSave(next);
    toast.success("Đã lưu kế hoạch năm (AOP)");
    onClose();
  };

  const handleToggleLock = () => {
    if (!isSC) {
      toast.error("Chỉ SC Manager / CEO được khóa AOP");
      return;
    }
    setDraft((d) => ({
      ...d,
      locked: !d.locked,
      lockedBy: d.locked ? d.lockedBy : user.name,
    }));
    toast.message(draft.locked ? "Đã mở khóa AOP" : "Đã khóa AOP");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[860px] max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-surface-3">
          <DialogTitle className="font-display text-section-header text-text-1 flex items-center gap-2">
            Kế hoạch năm (AOP) — {draft.year}
            {draft.locked ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success-bg text-success border border-success/30 px-2 py-0.5 text-caption font-medium">
                <Lock className="h-3 w-3" /> Khóa
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg text-warning border border-warning/30 px-2 py-0.5 text-caption font-medium">
                <Unlock className="h-3 w-3" /> Đang chỉnh sửa
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-table text-text-2">
            Nhập bởi: <span className="font-medium text-text-1">{draft.lockedBy}</span> · {draft.updatedAt}
            {" · "}
            <span className="text-text-3">Single-source-of-truth cho SOP, DRP, Demand Review, Executive.</span>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          {/* ── PHẦN 1: Tổng AOP ── */}
          <section>
            <h3 className="font-display font-semibold text-text-1 text-table mb-2">
              1. Tổng AOP
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-table-sm text-text-2 mb-1 block">Năm</Label>
                <Input
                  type="number"
                  value={draft.year}
                  disabled={!editable}
                  onChange={(e) => setDraft((d) => ({ ...d, year: Number(e.target.value) || d.year }))}
                  className="h-9 tabular-nums"
                />
              </div>
              <div>
                <Label className="text-table-sm text-text-2 mb-1 block">Tổng mục tiêu (m²)</Label>
                <Input
                  type="number"
                  value={draft.totalTarget}
                  disabled={!editable}
                  onChange={(e) => setDraft((d) => ({ ...d, totalTarget: Number(e.target.value) || 0 }))}
                  className="h-9 tabular-nums font-display font-semibold"
                />
              </div>
              <div>
                <Label className="text-table-sm text-text-2 mb-1 block">Nguồn</Label>
                <Input
                  value={draft.source}
                  disabled={!editable}
                  onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}
                  className="h-9"
                />
              </div>
            </div>
          </section>

          {/* ── PHẦN 2: Phân bổ tháng ── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-text-1 text-table">
                2. Phân bổ theo tháng
              </h3>
              <SumBadge value={monthSum} />
            </div>
            <div className="rounded-card border border-surface-3 overflow-hidden">
              <table className="w-full text-table">
                <thead className="bg-surface-1">
                  <tr>
                    <th className="text-left px-3 py-2 text-table-header uppercase text-text-3 w-16">Tháng</th>
                    <th className="text-left px-3 py-2 text-table-header uppercase text-text-3 w-32">Trọng số (%)</th>
                    <th className="text-right px-3 py-2 text-table-header uppercase text-text-3">Phân bổ (m²)</th>
                    <th className="text-left px-3 py-2 text-table-header uppercase text-text-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {AOP_MONTH_LABELS.map((label, i) => {
                    const w = draft.monthlyWeights[i] ?? 0;
                    const allocated = Math.round((draft.totalTarget * w) / 100);
                    return (
                      <tr key={label} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
                        <td className="px-3 py-1.5 font-medium text-text-1">{label}</td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            value={w}
                            disabled={!editable}
                            onChange={(e) => setMonthly(i, Number(e.target.value) || 0)}
                            className="h-7 w-20 tabular-nums text-table-sm"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-text-1">
                          {fmtM2(allocated)}
                        </td>
                        <td className="px-3 py-1.5 text-text-3 text-table-sm">
                          {AOP_MONTH_NOTES[i + 1] ?? ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-surface-1">
                  <tr>
                    <td className="px-3 py-2 font-display font-semibold text-text-1">TỔNG</td>
                    <td className={cn(
                      "px-3 py-2 font-display font-semibold tabular-nums",
                      isHundred(monthSum) ? "text-success" : "text-danger",
                    )}>
                      {monthSum.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right font-display font-semibold tabular-nums text-text-1">
                      {fmtM2(Math.round((draft.totalTarget * monthSum) / 100))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* ── PHẦN 3: Phân bổ nhóm hàng ── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-text-1 text-table">
                3. Phân bổ theo nhóm hàng
              </h3>
              <SumBadge value={skuSum} />
            </div>
            <div className="rounded-card border border-surface-3 overflow-hidden">
              <table className="w-full text-table">
                <thead className="bg-surface-1">
                  <tr>
                    <th className="text-left px-3 py-2 text-table-header uppercase text-text-3">Nhóm hàng</th>
                    <th className="text-left px-3 py-2 text-table-header uppercase text-text-3 w-32">Trọng số (%)</th>
                    <th className="text-right px-3 py-2 text-table-header uppercase text-text-3">Phân bổ (m²)</th>
                  </tr>
                </thead>
                <tbody>
                  {skuKeys.map((key, i) => {
                    const w = draft.skuGroupWeights[key] ?? 0;
                    const allocated = Math.round((draft.totalTarget * w) / 100);
                    return (
                      <tr key={key} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
                        <td className="px-3 py-1.5 font-medium text-text-1">{key}</td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            value={w}
                            disabled={!editable}
                            onChange={(e) => setSku(key, Number(e.target.value) || 0)}
                            className="h-7 w-20 tabular-nums text-table-sm"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums text-text-1">
                          {fmtM2(allocated)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-surface-1">
                  <tr>
                    <td className="px-3 py-2 font-display font-semibold text-text-1">TỔNG</td>
                    <td className={cn(
                      "px-3 py-2 font-display font-semibold tabular-nums",
                      isHundred(skuSum) ? "text-success" : "text-danger",
                    )}>
                      {skuSum.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right font-display font-semibold tabular-nums text-text-1">
                      {fmtM2(Math.round((draft.totalTarget * skuSum) / 100))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* ── PHẦN 4: Phân bổ vùng ── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-text-1 text-table">
                4. Phân bổ theo vùng
              </h3>
              <SumBadge value={regionSum} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {regionKeys.map((key) => {
                const w = draft.regionWeights[key] ?? 0;
                const allocated = Math.round((draft.totalTarget * w) / 100);
                return (
                  <div key={key} className="rounded-card border border-surface-3 bg-surface-1 p-3">
                    <Label className="text-table-sm text-text-2 mb-1 block">{key}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={w}
                        disabled={!editable}
                        onChange={(e) => setRegion(key, Number(e.target.value) || 0)}
                        className="h-8 w-20 tabular-nums"
                      />
                      <span className="text-text-3 text-table-sm">%</span>
                    </div>
                    <div className="mt-1 text-caption text-text-3">
                      = {fmtM2(allocated)} m²
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Validation summary ── */}
          {!allValid && (
            <div className="flex items-start gap-2 rounded-card border border-danger/30 bg-danger-bg/40 px-3 py-2 text-table-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Tổng trọng số phải = 100% ở cả 3 bảng (tháng, nhóm hàng, vùng) trước khi lưu.
              </span>
            </div>
          )}

          {/* ── Lịch sử thay đổi ── */}
          <div>
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="inline-flex items-center gap-1.5 text-table-sm text-text-2 hover:text-text-1"
            >
              <History className="h-3.5 w-3.5" />
              {showHistory ? "Ẩn lịch sử thay đổi" : "Lịch sử thay đổi"}
            </button>
            {showHistory && (
              <div className="mt-3">
                <ChangeLogPanel entityType="aop_plan" entityId={`AOP-${draft.year}`} maxItems={5} defaultOpen />
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="px-6 py-3 border-t border-surface-3 bg-surface-1/60 flex flex-row sm:justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => toast.info("Upload Excel AOP — sắp có")}
              disabled={!editable}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={handleToggleLock}
              disabled={!isSC}
              title={!isSC ? "Chỉ SC Manager được khóa" : ""}
            >
              {draft.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {draft.locked ? "Mở khóa" : "Khóa AOP"}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" className="h-8" onClick={onClose}>
              Hủy
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleSave}
              disabled={!editable || !allValid}
            >
              <Save className="h-3.5 w-3.5" />
              Lưu kế hoạch
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SumBadge({ value }: { value: number }) {
  const ok = isHundred(value);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-medium tabular-nums",
      ok
        ? "bg-success-bg text-success border-success/30"
        : "bg-danger-bg text-danger border-danger/30",
    )}>
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      Σ = {value.toFixed(1)}%
    </span>
  );
}

/**
 * PhasingDialog (M19 — GAP 1)
 *
 * Phân bổ FC tháng → 4 tuần. 4 phương pháp:
 *   - even        : 25% / tuần
 *   - 4_4_5       : 30.8% / 30.8% / 38.4% (W18-19 nhỏ, W20-21 peak)
 *   - custom      : user gõ trọng số
 *   - historical  : AI tính theo cùng kỳ năm trước (mock dataset)
 *
 * Drill-down: click tuần → hiện top SKU phasing cho tuần đó.
 *
 * Trigger từ DemandWeeklyPage header (badge "Phân bổ FC tuần").
 */
import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DEMAND_FC, SKU_BASES, getAopMonth } from "@/data/unis-enterprise-dataset";

type Method = "even" | "4_4_5" | "custom" | "historical";

const METHOD_LABEL: Record<Method, string> = {
  even: "Đều (25%/tuần)",
  "4_4_5": "4-4-5 (peak giữa)",
  custom: "Tùy chỉnh",
  historical: "Theo lịch sử",
};

const PRESET_WEIGHTS: Record<Exclude<Method, "custom">, number[]> = {
  even: [25, 25, 25, 25],
  "4_4_5": [23, 25, 26, 26],   // ≈ 4:4:5 normalized to 100
  historical: [22, 24, 28, 26], // mock from "same period last year"
};

const WEEK_LABELS = ["W18", "W19", "W20", "W21"];
const WEEK_NOTES = ["Đầu tháng", "", "Peak giữa tháng", ""];

export interface PhasingDialogProps {
  open: boolean;
  onClose: () => void;
  /** Tổng FC tháng (m²) đã scale theo tenant — tổng để chia. */
  monthlyFcM2: number;
  /** Label kỳ ("Tháng 5/2026") */
  cycleLabel: string;
}

export function PhasingDialog({ open, onClose, monthlyFcM2, cycleLabel }: PhasingDialogProps) {
  const [method, setMethod] = useState<Method>("even");
  const [customWeights, setCustomWeights] = useState<number[]>([25, 25, 25, 25]);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(null);

  const weights = useMemo<number[]>(() => {
    if (method === "custom") return customWeights;
    return PRESET_WEIGHTS[method];
  }, [method, customWeights]);

  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const weeklyValues = weights.map((w) =>
    Math.round((w / Math.max(1, totalWeight)) * monthlyFcM2),
  );

  const handleWeightChange = (idx: number, raw: string) => {
    if (method !== "custom") setMethod("custom");
    const next = [...customWeights];
    next[idx] = Math.max(0, Math.min(100, Number(raw) || 0));
    setCustomWeights(next);
  };

  const handleApply = () => {
    if (Math.abs(totalWeight - 100) > 0.5) {
      toast.error(`Tổng trọng số phải = 100% (hiện ${totalWeight}%)`);
      return;
    }
    toast.success(`Đã áp dụng phasing W18-W21`, {
      description: `${METHOD_LABEL[method]} · v1 active · ${weeklyValues.reduce((a, b) => a + b, 0).toLocaleString()} m²`,
    });
    onClose();
  };

  // Top 4 SKU FC drill-down
  const topSkus = useMemo(() => {
    return SKU_BASES.slice(0, 4).map((b) => {
      const monthFc = DEMAND_FC
        .filter((r) => r.skuBaseCode === b.code)
        .reduce((s, r) => s + r.fcM2, 0);
      return { code: b.code, monthFc };
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[680px] bg-surface-2 border-surface-3">
        <DialogHeader>
          <DialogTitle className="font-display text-text-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Phân bổ FC tuần — {cycleLabel}
          </DialogTitle>
          <DialogDescription className="text-text-3">
            FC tháng <span className="font-semibold text-text-1 tabular-nums">{monthlyFcM2.toLocaleString()} m²</span> → 4 tuần.
            DRP daily sẽ dùng FC tuần (không chia ÷4 tự động).
          </DialogDescription>
        </DialogHeader>

        {/* Method selector */}
        <div className="flex items-center gap-3">
          <label className="text-table-sm text-text-2 font-medium">Phương pháp:</label>
          <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
            <SelectTrigger className="w-[260px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(METHOD_LABEL) as Method[]).map((m) => (
                <SelectItem key={m} value={m}>{METHOD_LABEL[m]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-auto text-caption text-text-3">
            v1 · <span className="text-success font-medium">Active</span>
          </span>
        </div>

        {/* Weekly table */}
        <div className="rounded-card border border-surface-3 overflow-hidden">
          <table className="w-full text-table">
            <thead className="bg-surface-1 text-text-3 text-table-header uppercase">
              <tr>
                <th className="w-8 px-2 py-2"></th>
                <th className="text-left px-3 py-2 font-medium">Tuần</th>
                <th className="text-right px-3 py-2 font-medium">Trọng số (%)</th>
                <th className="text-right px-3 py-2 font-medium">FC tuần (m²)</th>
                <th className="text-left px-3 py-2 font-medium">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {WEEK_LABELS.map((wk, i) => {
                const isOpen = expandedWeek === i;
                return (
                  <>
                    <tr
                      key={wk}
                      className={cn(
                        "border-t border-surface-3 cursor-pointer hover:bg-surface-1/40",
                        isOpen && "bg-primary/5",
                      )}
                      onClick={() => setExpandedWeek(isOpen ? null : i)}
                    >
                      <td className="px-2 py-2 text-text-3">
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </td>
                      <td className="px-3 py-2 font-medium text-text-1">{wk}</td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          value={weights[i]}
                          onChange={(e) => handleWeightChange(i, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-7 w-16 text-right tabular-nums inline-block"
                        />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold text-text-1">
                        {weeklyValues[i].toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-caption text-text-3">{WEEK_NOTES[i]}</td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-surface-1/40">
                        <td colSpan={5} className="px-6 py-3">
                          <div className="text-caption text-text-3 mb-2">
                            Phasing per SKU — {wk} ({weights[i]}% × FC tháng)
                          </div>
                          <div className="space-y-1">
                            {topSkus.map((sk) => {
                              const wkFc = Math.round(sk.monthFc * (weights[i] / Math.max(1, totalWeight)));
                              return (
                                <div key={sk.code} className="flex items-center justify-between text-caption">
                                  <span className="font-mono text-text-2">{sk.code}</span>
                                  <span className="text-text-3 tabular-nums">
                                    {sk.monthFc.toLocaleString()} m² × {weights[i]}% = <span className="text-text-1 font-semibold">{wkFc.toLocaleString()} m²</span>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
            <tfoot className="bg-surface-1 border-t border-surface-3">
              <tr>
                <td></td>
                <td className="px-3 py-2 font-semibold text-text-1">TỔNG</td>
                <td className={cn(
                  "px-3 py-2 text-right tabular-nums font-semibold",
                  Math.abs(totalWeight - 100) > 0.5 ? "text-danger" : "text-success",
                )}>
                  {totalWeight}%
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-text-1">
                  {weeklyValues.reduce((a, b) => a + b, 0).toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-caption text-text-3">
          Sau khi áp dụng → DRP bước 1 "Nhu cầu gộp" sẽ dùng FC tuần này thay vì tự chia FC tháng ÷4.
        </p>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button onClick={handleApply}>Áp dụng phasing</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

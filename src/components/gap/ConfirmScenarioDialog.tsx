/**
 * ConfirmScenarioDialog — preview tác động downstream trước khi xác nhận
 * chọn kịch bản A/B/C/D cho 1 NM gap.
 *
 * 5 vùng:
 *   1) Header: NM + scenario + cost + subtitle
 *   2) Tác động: list DownstreamAction (icon + title + desc + link badge)
 *   3) Timeline: hôm nay → ngày 30 (auto fallback)
 *   4) Gap before/after + Tier impact
 *   5) Footer: [Xác nhận] [Quay lại]
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Calendar, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ScenarioImpact, DownstreamAction } from "@/data/scenario-resolutions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scenarioKey: "A" | "B" | "C" | "D" | "E";
  scenarioTitle: string;
  scenarioSubtitle: string;
  nmName: string;
  gapM2: number;
  gapPctBefore: number;
  cost: number;
  impact: ScenarioImpact;
  onConfirm: () => void;
}

const fmtM2 = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} m²`;
const fmtVnd = (n: number) =>
  n >= 1_000_000_000
    ? `${(n / 1_000_000_000).toFixed(2)} tỷ₫`
    : n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M₫`
    : `${n.toLocaleString("vi-VN")}₫`;

function ActionItem({ a }: { a: DownstreamAction }) {
  return (
    <div className="rounded-button border border-surface-3 bg-surface-1 p-3 flex gap-3">
      <span className="text-h3 leading-none mt-0.5">{a.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-text-1 text-table-sm">{a.title}</p>
          {a.badge && (
            <Badge variant="outline" className="text-[10px] uppercase">
              {a.badge}
            </Badge>
          )}
        </div>
        <p className="text-caption text-text-3 mt-0.5 leading-relaxed">{a.description}</p>
        {a.link && (
          <p className="text-caption text-primary mt-1 inline-flex items-center gap-1">
            → Xem trong <strong>{a.link.label}</strong>
            <ArrowRight className="h-3 w-3" />
          </p>
        )}
      </div>
    </div>
  );
}

export function ConfirmScenarioDialog({
  open,
  onOpenChange,
  scenarioKey,
  scenarioTitle,
  scenarioSubtitle,
  nmName,
  gapM2,
  gapPctBefore,
  cost,
  impact,
  onConfirm,
}: Props) {
  const tierLabel = (t: ScenarioImpact["tierAfter"]) =>
    t === "tier1" ? "Tier 1 ✅" : t === "tier2" ? "Tier 2 🟡" : t === "tier3" ? "Tier 3 🔴" : "Chờ đàm phán";
  const tierColor = (t: ScenarioImpact["tierAfter"]) =>
    t === "tier1" ? "text-success"
    : t === "tier2" ? "text-warning"
    : t === "tier3" ? "text-danger"
    : "text-text-2";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Xác nhận kịch bản {scenarioKey}: {scenarioTitle} cho {nmName}
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block">
              Khoảng cách: <strong>{fmtM2(gapM2)}</strong> ({gapPctBefore}%) ·{" "}
              Chi phí ước tính: <strong className="text-text-1">{fmtVnd(cost)}</strong>
            </span>
            <span className="italic">"{scenarioSubtitle}"</span>
          </DialogDescription>
        </DialogHeader>

        {/* Section: Tác động sau khi chọn */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="h-px flex-1 bg-surface-3" />
            <p className="text-caption font-semibold text-text-3 uppercase tracking-wider">
              Tác động sau khi chọn
            </p>
            <span className="h-px flex-1 bg-surface-3" />
          </div>
          <div className="space-y-2">
            {impact.actions.map((a, i) => (
              <ActionItem key={i} a={a} />
            ))}
          </div>
        </div>

        {/* Gap & Tier comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-button border border-surface-3 bg-surface-1 p-3">
            <p className="text-caption text-text-3 uppercase">Khoảng cách</p>
            <p className="text-table mt-1">
              <span className="text-text-3">Trước:</span>{" "}
              <strong className="text-text-1 tabular-nums">{fmtM2(gapM2)}</strong>{" "}
              ({gapPctBefore}%)
            </p>
            <p className="text-table mt-0.5">
              <span className="text-text-3">Sau:</span>{" "}
              <strong className={cn("tabular-nums",
                impact.gapAfterM2 === 0 ? "text-success" : "text-warning")}>
                {fmtM2(impact.gapAfterM2)}
              </strong>{" "}
              ({impact.gapAfterPct}%)
            </p>
          </div>
          <div className="rounded-button border border-surface-3 bg-surface-1 p-3">
            <p className="text-caption text-text-3 uppercase">Tier giá</p>
            <p className={cn("text-table mt-1 font-semibold", tierColor(impact.tierAfter))}>
              {tierLabel(impact.tierAfter)}
            </p>
            {impact.tierAfter === "pending" && (
              <p className="text-caption text-text-3 mt-0.5">
                Tier 1 nếu đàm phán OK · Tier 2 nếu fail
              </p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-button border border-surface-3 bg-surface-1 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-3.5 w-3.5 text-text-3" />
            <p className="text-caption font-semibold text-text-3 uppercase tracking-wider">
              Tiến độ
            </p>
          </div>
          <ul className="space-y-1 text-table-sm text-text-2">
            <li className="flex gap-2">
              <span className="text-success">●</span>
              <span><strong className="text-text-1">Hôm nay:</strong> Tạo lệnh + giao việc cho người phụ trách</span>
            </li>
            <li className="flex gap-2">
              <span className="text-info">○</span>
              <span><strong className="text-text-1">3 ngày:</strong> Theo dõi {nmName} phản hồi</span>
            </li>
            <li className="flex gap-2">
              <span className="text-warning">○</span>
              <span><strong className="text-text-1">5 ngày:</strong> Hạn cuối đàm phán</span>
            </li>
            <li className="flex gap-2">
              <Clock className="h-3 w-3 text-danger mt-0.5" />
              <span><strong className="text-text-1">Ngày 30:</strong> Nếu chưa giải quyết → tự động chuyển Kịch bản B</span>
            </li>
          </ul>
        </div>

        {scenarioKey === "B" && (
          <div className="rounded-button border border-danger/30 bg-danger-bg/60 px-3 py-2 text-danger flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-table-sm">
              <strong>Cảnh báo:</strong> Kịch bản B sẽ áp giá Tier cao hơn cho TOÀN BỘ
              sản lượng đã mua. Hành động này không thể hoàn tác sau khi xác nhận.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Quay lại chọn khác
          </Button>
          <Button onClick={onConfirm}>
            Xác nhận chọn {scenarioKey} ✓
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

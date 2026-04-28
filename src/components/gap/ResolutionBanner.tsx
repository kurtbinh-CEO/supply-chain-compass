/**
 * ResolutionBanner — banner xanh hiện trên Gap page sau khi NM đã chọn kịch bản.
 * Show: scenario chọn + planner + actions pending + gap before/after + tier.
 *
 * Cho phép user "Thay đổi kịch bản" (clear + reopen scenario tab).
 */

import type { ChosenScenario } from "@/data/scenario-resolutions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  resolution: ChosenScenario;
  onChange: () => void;
  onDetail: () => void;
}

const fmtM2 = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} m²`;
const fmtDate = (ts: number) => {
  const d = new Date(ts);
  return d.toLocaleDateString("vi-VN");
};

export function ResolutionBanner({ resolution, onChange, onDetail }: Props) {
  const r = resolution;
  return (
    <div className="rounded-card border border-success/30 bg-success-bg/40 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-display text-h3 font-semibold text-text-1">
              {r.nmName} — Kịch bản {r.scenarioKey} đã chọn
            </p>
            <Badge variant="outline" className="text-caption">
              {fmtDate(r.chosenAt)} · {r.chosenBy}
            </Badge>
            <Badge className="bg-warning text-warning-foreground text-caption">
              Đang giải quyết
            </Badge>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {r.poTopupId && (
              <Link
                to={`/orders?focus=${encodeURIComponent(r.poTopupId)}&from=gap&nm=${encodeURIComponent(r.nmId)}`}
                className="rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table-sm hover:border-primary/50 transition-colors flex items-center gap-2"
                title={`Mở Đơn hàng và xem ${r.poTopupId}`}
              >
                <span>📦</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-1 truncate">
                    PO bổ sung {r.poTopupQty != null ? fmtM2(r.poTopupQty) : ""}
                  </p>
                  <p className="text-caption text-text-3">{r.poTopupId} · NHÁP</p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-text-3" />
              </Link>
            )}
            {r.negotiateTaskId && (
              <Link
                to={`/workspace?focus=${encodeURIComponent(r.negotiateTaskId)}&from=gap&nm=${encodeURIComponent(r.nmId)}`}
                className="rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table-sm hover:border-primary/50 transition-colors flex items-center gap-2"
                title={`Mở Việc cần làm và xem ${r.negotiateTaskId}`}
              >
                <span>📞</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-1 truncate">
                    Đàm phán {r.negotiateQty != null ? fmtM2(r.negotiateQty) : ""}
                  </p>
                  <p className="text-caption text-text-3">
                    {r.negotiateTaskId} · 5 ngày
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-text-3" />
              </Link>
            )}
            {r.tierImpact && (
              <div className="rounded-button border border-warning/30 bg-warning-bg/60 px-3 py-2 text-table-sm">
                <span>💰 </span>
                <strong className="text-warning">
                  Tier {r.tierImpact.from === "tier1" ? 1 : r.tierImpact.from === "tier2" ? 2 : 3}
                  {" → "}Tier {r.tierImpact.to === "tier1" ? 1 : r.tierImpact.to === "tier2" ? 2 : 3}
                </strong>
                {r.tierImpact.upliftAmount > 0 && (
                  <span className="text-text-3"> · uplift {(r.tierImpact.upliftAmount / 1_000_000).toFixed(1)}M₫</span>
                )}
              </div>
            )}
          </div>

          <p className="text-caption text-text-2 mt-2">
            Khoảng cách trước: <strong className="text-text-1">{fmtM2(r.gapM2)}</strong> ({r.gapPctBefore}%)
            {" → "}sau: <strong className={cn(
              r.gapPctAfter === 0 ? "text-success" : "text-warning"
            )}>{fmtM2(r.scenarioKey === "D" ? Math.round(r.gapM2 * 0.5) : r.scenarioKey === "A" || r.scenarioKey === "B" ? 0 : r.gapM2)}</strong> ({r.gapPctAfter}%)
            {" · "}Hạn: <strong className="text-text-1">{fmtDate(r.resolveDeadline)}</strong>
          </p>
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          <Button size="sm" variant="outline" onClick={onChange}>
            Thay đổi kịch bản
          </Button>
          <Button size="sm" variant="ghost" onClick={onDetail}>
            Xem chi tiết →
          </Button>
        </div>
      </div>
    </div>
  );
}

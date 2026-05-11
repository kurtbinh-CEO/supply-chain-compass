/**
 * DrpResultsPanel — Layer 1 (12 CN cards) + Layer 2 (SKU breakdown) lấy từ
 * plan_run_results. Có dropdown chọn plan run.
 *
 * KHÔNG động vào Layer 3 / ContainerPlanning — chỉ là panel "live DB" bổ sung
 * phía trên block tổng hợp seed cũ.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Database, ChevronRight, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useDrpResults, type CnSummary, type SkuBreakdown } from "@/hooks/useDrpResults";
import { cn } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  ON_HAND: "Tồn kho",
  PIPELINE: "Đang về (NM)",
  HUB_PO: "Hub pool",
  LCNB: "LCNB",
  INTERNAL_TO: "Substitution",
  GAP: "Thiếu",
};

const SOURCE_COLORS: Record<string, string> = {
  ON_HAND: "bg-success/15 text-success",
  PIPELINE: "bg-info/15 text-info",
  HUB_PO: "bg-primary/15 text-primary",
  LCNB: "bg-warning/15 text-warning",
  INTERNAL_TO: "bg-accent/15 text-accent",
  GAP: "bg-destructive/15 text-destructive",
};

const fmt = (n: number) => Math.round(n).toLocaleString("vi-VN");

function fillTone(rate: number) {
  if (rate >= 0.95) return { color: "text-success", bg: "bg-success/10 border-success/30" };
  if (rate >= 0.8) return { color: "text-warning", bg: "bg-warning/10 border-warning/30" };
  return { color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" };
}

function CnCard({ s, onClick, active }: { s: CnSummary; onClick: () => void; active: boolean }) {
  const tone = fillTone(s.fillRate);
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-card border p-3 text-left transition-all hover:shadow-md",
        tone.bg,
        active && "ring-2 ring-primary",
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-table-sm font-semibold">{s.cn_code}</span>
        {s.shortageCount > 0 ? (
          <AlertTriangle className="w-4 h-4 text-destructive" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-success" />
        )}
      </div>
      <div className={cn("text-h3 font-bold tabular-nums", tone.color)}>
        {(s.fillRate * 100).toFixed(0)}%
      </div>
      <div className="text-caption text-muted-foreground space-y-0.5 mt-1">
        <div>Demand: <b className="text-text-1">{fmt(s.demand)}</b></div>
        <div>Allocated: <b className="text-text-1">{fmt(s.allocated)}</b></div>
        {s.gap > 0 && <div>Gap: <b className="text-destructive">{fmt(s.gap)}</b></div>}
        <div>{s.skuCount} SKU · {s.shortageCount} thiếu</div>
      </div>
    </button>
  );
}

function SkuRow({ b }: { b: SkuBreakdown }) {
  const tone = fillTone(b.fillRate);
  const sources = Object.entries(b.bySource).filter(([k, v]) => k !== "GAP" && v > 0);
  return (
    <div className="rounded-card border bg-surface-2 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono font-semibold">{b.sku_base}</span>
        <span className={cn("text-table-sm font-semibold tabular-nums", tone.color)}>
          {(b.fillRate * 100).toFixed(0)}% · {fmt(b.allocated)}/{fmt(b.demand)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.map(([src, qty]) => (
          <Badge key={src} variant="outline" className={cn("font-normal", SOURCE_COLORS[src])}>
            {SOURCE_LABELS[src] ?? src}: {fmt(qty)}
          </Badge>
        ))}
        {b.gap > 0 && (
          <Badge variant="outline" className={SOURCE_COLORS.GAP}>
            Gap: {fmt(b.gap)}
          </Badge>
        )}
      </div>
    </div>
  );
}

export function DrpResultsPanel() {
  const { planRuns, runId, setRunId, layer1, layer2, loading } = useDrpResults();
  const [selectedCn, setSelectedCn] = useState<string | null>(null);
  const breakdown = selectedCn ? layer2(selectedCn) : [];

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 gap-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Kết quả DRP từ database
          {loading && <span className="text-caption text-muted-foreground font-normal">(đang tải…)</span>}
        </CardTitle>
        <div className="flex items-center gap-2 min-w-[280px]">
          <span className="text-caption text-muted-foreground shrink-0">Plan run:</span>
          <Select value={runId} onValueChange={setRunId}>
            <SelectTrigger className="h-8"><SelectValue placeholder="Chọn run…" /></SelectTrigger>
            <SelectContent>
              {planRuns.length === 0 && <SelectItem value="__none" disabled>Chưa có run nào</SelectItem>}
              {planRuns.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  {r.run_name} · {r.fill_rate != null ? `${(r.fill_rate * 100).toFixed(0)}%` : "—"} · {r.lifecycle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Layer 1 — 12 CN cards */}
        {layer1.length === 0 ? (
          <div className="text-center text-muted-foreground py-6 text-table-sm">
            Không có kết quả. Chạy "DRP Engine" phía trên để tạo dữ liệu.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {layer1.map(s => (
              <CnCard
                key={s.cn_code}
                s={s}
                active={selectedCn === s.cn_code}
                onClick={() => setSelectedCn(prev => prev === s.cn_code ? null : s.cn_code)}
              />
            ))}
          </div>
        )}

        {/* Layer 2 — SKU breakdown */}
        {selectedCn && (
          <div className="rounded-card border bg-surface-1 p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-table-sm font-semibold flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-primary" />
                Chi tiết SKU — <span className="font-mono">{selectedCn}</span>
                <span className="text-muted-foreground font-normal">({breakdown.length} SKU)</span>
              </h3>
              <button
                onClick={() => setSelectedCn(null)}
                className="text-muted-foreground hover:text-text-1"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {breakdown.map(b => <SkuRow key={b.sku_base} b={b} />)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

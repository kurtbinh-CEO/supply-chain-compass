import { cn } from "@/lib/utils";
import { Package, Truck, Factory, ArrowLeftRight, Repeat, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface AllocSources {
  onHand: number;
  pipeline: number;
  hubPo: number;
  lcnbIn: number;
  internalTransfer: number;
}

const SOURCE_META = [
  { key: "onHand" as const, label: "Tồn hiện có", short: "OH", color: "bg-success/80", textColor: "text-success", Icon: Package, desc: "Tồn kho có sẵn tại CN", formula: "Số lượng đang nằm trong kho CN, sẵn sàng phân bổ ngay (không cần vận chuyển)." },
  { key: "pipeline" as const, label: "Đang về", short: "PL", color: "bg-info/80", textColor: "text-info", Icon: Truck, desc: "RPO/PO đang về (Hub đã đặt trước)", formula: "PO/RPO Hub đã phát trước đó, đang trên đường về CN. Tính theo ETA ≤ kỳ DRP." },
  { key: "hubPo" as const, label: "Hub PO", short: "Hub", color: "bg-primary/80", textColor: "text-primary", Icon: Factory, desc: "PO mới sourcing từ Hub (NM ngoài)", formula: "PO mới Hub sourcing trong DRP run này từ NM bên ngoài (Mikado, Toko, …). LT = NM lead-time." },
  { key: "lcnbIn" as const, label: "LCNB", short: "LCNB", color: "bg-warning/80", textColor: "text-warning", Icon: ArrowLeftRight, desc: "Lateral nhận từ CN khác (LCNB)", formula: "Lateral transfer NHẬN từ CN có excess (gap < 0). Tiết kiệm cost vs PO mới, LT ~ 1 ngày." },
  { key: "internalTransfer" as const, label: "Internal TO", short: "TO", color: "bg-accent", textColor: "text-accent-foreground", Icon: Repeat, desc: "Luân chuyển nội bộ giữa kho cùng CN", formula: "Transfer Order nội bộ giữa các kho cùng một CN (DC ↔ kho vệ tinh). Số âm = chuyển đi sang CN khác." },
];

interface SourceChipProps {
  meta: typeof SOURCE_META[number];
  qty: number;
  totalAllocated: number;
  size?: "sm" | "md";
}

function SourceChip({ meta, qty, totalAllocated, size = "md" }: SourceChipProps) {
  const pct = totalAllocated > 0 ? Math.round((qty / totalAllocated) * 100) : 0;
  const sizeCls = size === "sm"
    ? "gap-0.5 rounded px-1 py-0.5 text-[10px]"
    : "gap-1 rounded-full px-2 py-0.5 text-[11px]";
  const iconCls = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center font-medium border bg-surface-1 cursor-help", sizeCls, meta.textColor)}>
          <meta.Icon className={iconCls} />
          {size === "sm" ? `${meta.short} ${qty.toLocaleString()}` : `${meta.label}: ${qty.toLocaleString()}`}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 space-y-2 bg-surface-0 border-surface-3">
        <div className="flex items-center gap-1.5">
          <meta.Icon className={cn("h-3.5 w-3.5", meta.textColor)} />
          <strong className="text-text-1">{meta.label}</strong>
          <span className="ml-auto text-caption text-text-3">{meta.short}</span>
        </div>
        <p className="text-caption text-text-2 leading-snug">{meta.formula}</p>
        <div className="rounded border border-surface-3 bg-surface-1/60 p-2 font-mono text-[11px] text-text-2 space-y-0.5">
          <div>Đóng góp: <span className="text-text-1 font-semibold">{qty.toLocaleString()}</span></div>
          {totalAllocated > 0 && (
            <div>= {qty.toLocaleString()} / {totalAllocated.toLocaleString()} allocated → <span className={cn("font-semibold", meta.textColor)}>{pct}%</span></div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function GivingTransferChip({ qty, size = "md" }: { qty: number; size?: "sm" | "md" }) {
  const sizeCls = size === "sm"
    ? "gap-0.5 rounded px-1 py-0.5 text-[10px]"
    : "gap-1 rounded-full px-2 py-0.5 text-[11px]";
  const iconCls = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center font-medium border border-warning/30 bg-warning-bg text-warning cursor-help", sizeCls)}>
          <ArrowLeftRight className={iconCls} />
          {size === "sm" ? `−${qty.toLocaleString()}` : `Chuyển đi: −${qty.toLocaleString()}`}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 space-y-2 bg-surface-0 border-surface-3">
        <div className="flex items-center gap-1.5">
          <ArrowLeftRight className="h-3.5 w-3.5 text-warning" />
          <strong className="text-text-1">Chuyển đi (LCNB out / TO out)</strong>
        </div>
        <p className="text-caption text-text-2 leading-snug">
          CN này có excess và đang gửi <strong className="text-warning">{qty.toLocaleString()}</strong> sang CN khác hoặc kho khác. Số này KHÔNG cộng vào allocated của CN này.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

function MissingChip({ gap, size = "md" }: { gap: number; size?: "sm" | "md" }) {
  const sizeCls = size === "sm"
    ? "gap-0.5 rounded px-1 py-0.5 text-[10px]"
    : "gap-1 rounded-full px-2 py-0.5 text-[11px]";
  const iconCls = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center font-medium border border-danger/30 bg-danger-bg text-danger cursor-help", sizeCls)}>
          <AlertTriangle className={iconCls} />
          {size === "sm" ? `Gap ${gap.toLocaleString()}` : `Thiếu: ${gap.toLocaleString()}`}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 space-y-2 bg-surface-0 border-surface-3">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-danger" />
          <strong className="text-text-1">Phần demand chưa cover</strong>
        </div>
        <p className="text-caption text-text-2 leading-snug">
          Demand − Allocated = <span className="font-mono text-danger font-semibold">{gap.toLocaleString()}</span>. Cần xử lý qua Hub PO mới hoặc LCNB từ CN khác (xem nút "Xử lý" cột Action).
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

interface Props {
  sources: AllocSources;
  compact?: boolean;
  demand?: number;
  allocated?: number;
}

export function AllocSourceBar({ sources, compact = false, demand, allocated }: Props) {
  const entries = SOURCE_META.map(m => ({ ...m, qty: sources[m.key] }));
  const positive = entries.filter(e => e.qty > 0);
  const totalPos = positive.reduce((s, e) => s + e.qty, 0);
  const givingTransfer = sources.internalTransfer < 0 ? Math.abs(sources.internalTransfer) : 0;
  const gap = demand != null && allocated != null ? Math.max(0, demand - allocated) : 0;

  if (totalPos === 0 && givingTransfer === 0 && gap === 0) {
    return <span className="text-text-3 text-caption">—</span>;
  }

  if (compact) {
    return (
      <TooltipProvider delayDuration={150}>
        <div className="flex flex-col gap-1 min-w-[140px]">
          <div className="flex h-2 w-full rounded-full overflow-hidden bg-surface-3">
            {positive.map((e) => (
              <div
                key={e.key}
                className={cn("h-full", e.color)}
                style={{ width: `${(e.qty / totalPos) * 100}%` }}
                title={`${e.label}: ${e.qty.toLocaleString()}`}
              />
            ))}
            {gap > 0 && totalPos > 0 && (
              <div
                className="h-full bg-danger/30 border-l border-danger"
                style={{ width: `${(gap / (totalPos + gap)) * 100}%` }}
                title={`Thiếu: ${gap.toLocaleString()}`}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {positive.map((e) => (
              <SourceChip key={e.key} meta={e} qty={e.qty} totalAllocated={totalPos} size="sm" />
            ))}
            {givingTransfer > 0 && <GivingTransferChip qty={givingTransfer} size="sm" />}
            {gap > 0 && <MissingChip gap={gap} size="sm" />}
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap gap-1.5">
        {positive.map((e) => (
          <SourceChip key={e.key} meta={e} qty={e.qty} totalAllocated={totalPos} size="md" />
        ))}
        {givingTransfer > 0 && <GivingTransferChip qty={givingTransfer} size="md" />}
        {gap > 0 && <MissingChip gap={gap} size="md" />}
      </div>
    </TooltipProvider>
  );
}

interface SkuRow {
  item: string;
  variant: string;
  demand: number;
  allocated: number;
  fillPct: number;
  status: string;
  sources: AllocSources;
}

export function ExpandedSkuBreakdown({ title, skus }: { title: string; skus: SkuRow[] }) {
  if (skus.length === 0) {
    return (
      <div className="rounded-lg border border-surface-3 bg-surface-0 p-4 text-caption text-text-3 italic">
        Không có chi tiết SKU
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-surface-3 bg-surface-0 overflow-hidden">
      <div className="px-4 py-2 border-b border-surface-3 flex items-center justify-between">
        <span className="text-caption uppercase font-medium text-text-3">{title}</span>
        <span className="text-caption text-text-3">{skus.length} SKU</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-1/40 border-b border-surface-3/50">
              {["Item", "Variant", "Demand", "Allocated", "Fill%", "Status", "Nguồn phân bổ"].map((h, i) => (
                <th key={i} className="px-3 py-2 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {skus.map((sk, i) => (
              <tr key={i} className="border-b border-surface-3/30 last:border-b-0">
                <td className="px-3 py-2 text-table font-medium text-text-1">{sk.item}</td>
                <td className="px-3 py-2 text-table text-text-2">{sk.variant}</td>
                <td className="px-3 py-2 text-table tabular-nums text-text-1">{sk.demand.toLocaleString()}</td>
                <td className="px-3 py-2 text-table tabular-nums text-text-2">{sk.allocated.toLocaleString()}</td>
                <td className={cn("px-3 py-2 text-table tabular-nums font-medium",
                  sk.fillPct >= 100 ? "text-success" : sk.fillPct >= 80 ? "text-warning" : "text-danger")}>{sk.fillPct}%</td>
                <td className="px-3 py-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium",
                    sk.status === "OK" ? "bg-success-bg text-success" : sk.status === "SHORTAGE" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"
                  )}>{sk.status === "OK" ? "ĐẠT" : sk.status === "SHORTAGE" ? "THIẾU HÀNG" : "THEO DÕI"}</span>
                </td>
                <td className="px-3 py-2"><AllocSourceBar sources={sk.sources} demand={sk.demand} allocated={sk.allocated} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface CnRow {
  cn: string;
  demand: number;
  allocated: number;
  fillPct: number;
  gap: number;
  status: string;
  sources: AllocSources;
}

export function ExpandedCnBreakdown({ title, cnRows }: { title: string; cnRows: CnRow[] }) {
  return (
    <div className="rounded-lg border border-surface-3 bg-surface-0 overflow-hidden">
      <div className="px-4 py-2 border-b border-surface-3 flex items-center justify-between">
        <span className="text-caption uppercase font-medium text-text-3">{title}</span>
        <span className="text-caption text-text-3">{cnRows.length} CN</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-1/40 border-b border-surface-3/50">
              {["CN", "Nhu cầu", "Phân bổ", "Lấp đầy %", "Thiếu", "Trạng thái", "Nguồn phân bổ"].map((h, i) => (
                <th key={i} className="px-3 py-2 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cnRows.map((cr, i) => (
              <tr key={i} className="border-b border-surface-3/30 last:border-b-0">
                <td className="px-3 py-2 text-table font-medium text-text-1">{cr.cn}</td>
                <td className="px-3 py-2 text-table tabular-nums text-text-1">{cr.demand.toLocaleString()}</td>
                <td className="px-3 py-2 text-table tabular-nums text-text-2">{cr.allocated.toLocaleString()}</td>
                <td className={cn("px-3 py-2 text-table tabular-nums font-medium",
                  cr.fillPct >= 100 ? "text-success" : cr.fillPct >= 80 ? "text-warning" : "text-danger")}>{cr.fillPct}%</td>
                <td className="px-3 py-2 text-table tabular-nums">
                  {cr.gap > 0 ? <span className="text-danger">{cr.gap.toLocaleString()}</span>
                    : cr.gap < 0 ? <span className="text-success">{cr.gap.toLocaleString()}</span>
                    : <span className="text-text-3">0</span>}
                </td>
                <td className="px-3 py-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium",
                    cr.status === "OK" ? "bg-success-bg text-success" : cr.status === "SHORTAGE" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"
                  )}>{cr.status === "OK" ? "ĐẠT" : cr.status === "SHORTAGE" ? "THIẾU HÀNG" : "THEO DÕI"}</span>
                </td>
                <td className="px-3 py-2"><AllocSourceBar sources={cr.sources} demand={cr.demand} allocated={cr.allocated} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AllocSourceLegend() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap items-center gap-2 text-caption text-text-3">
        <span className="font-medium text-text-2">Nguồn phân bổ:</span>
        {SOURCE_META.map((m) => (
          <Tooltip key={m.key}>
            <TooltipTrigger asChild>
              <span className={cn("inline-flex items-center gap-1 cursor-help", m.textColor)}>
                <m.Icon className="h-3 w-3" /> {m.label}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs p-2.5 bg-surface-0 border-surface-3">
              <div className="flex items-center gap-1.5 mb-1">
                <m.Icon className={cn("h-3.5 w-3.5", m.textColor)} />
                <strong className="text-text-1">{m.label}</strong>
              </div>
              <p className="text-caption text-text-2 leading-snug">{m.formula}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

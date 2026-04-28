import { cn } from "@/lib/utils";
import { Package, Truck, Factory, ArrowLeftRight, Repeat, AlertTriangle, Shield } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface AllocSources {
  // Committed sources — sum vào allocated
  onHand: number;            // available (đã trừ SS + reserved)
  pipeline: number;
  hubPo: number;             // = nmAllocation từ DrpPage (alias)
  lcnbIn: number;
  internalTransfer: number;
  // SS info — KHÔNG cộng vào allocated, hiển thị tham khảo
  ssReserved?: number;
  reservedHard?: number;
  quarantine?: number;
}

export interface SuggestedAction {
  label: string;             // "A. Chuyển ngang", "B. PO mới", "C. LCNB 100%"
  source: string;            // "CN-BD excess 3.408m²"
  qty: number;
  cost: string;              // "5,8M₫"
  time: string;              // "2 ngày"
  savingVsB?: string;        // "−48M₫"
  recommended?: boolean;
}

const SOURCE_META = [
  { key: "onHand" as const, label: "Tồn hiện có", short: "OH", color: "bg-success/80", textColor: "text-success", Icon: Package, desc: "Tồn kho có sẵn tại CN", formula: "Số lượng đang nằm trong kho CN, sẵn sàng phân bổ ngay (không cần vận chuyển)." },
  { key: "pipeline" as const, label: "Đang về", short: "PL", color: "bg-info/80", textColor: "text-info", Icon: Truck, desc: "RPO/PO đang về (Hub đã đặt trước)", formula: "PO/RPO Hub đã phát trước đó, đang trên đường về CN. Tính theo ETA ≤ kỳ DRP." },
  { key: "hubPo" as const, label: "NM commit", short: "NM", color: "bg-primary/80", textColor: "text-primary", Icon: Factory, desc: "PO/Hub committed từ NM (Mikado, Toko, …)", formula: "Phần NM đã cam kết và đã được khoá vào allocated trong DRP run này." },
  { key: "lcnbIn" as const, label: "LCNB", short: "LCNB", color: "bg-warning/80", textColor: "text-warning", Icon: ArrowLeftRight, desc: "Lateral nhận từ CN khác (LCNB)", formula: "Lateral transfer NHẬN từ CN có excess (gap < 0). Tiết kiệm cost vs PO mới, LT ~ 1 ngày." },
  { key: "internalTransfer" as const, label: "Internal TO", short: "TO", color: "bg-accent", textColor: "text-accent-foreground", Icon: Repeat, desc: "Luân chuyển nội bộ giữa kho cùng CN", formula: "Transfer Order nội bộ giữa các kho cùng một CN (DC ↔ kho vệ tinh). Số âm = chuyển đi sang CN khác." },
];

interface SourceChipProps {
  meta: typeof SOURCE_META[number];
  qty: number;
  totalAllocated: number;
  size?: "sm" | "md";
  dim?: boolean;
}

function SourceChip({ meta, qty, totalAllocated, size = "md", dim = false }: SourceChipProps) {
  const pct = totalAllocated > 0 ? Math.round((qty / totalAllocated) * 100) : 0;
  const sizeCls = size === "sm"
    ? "gap-0.5 rounded px-1 py-0.5 text-[10px]"
    : "gap-1 rounded-full px-2 py-0.5 text-[11px]";
  const iconCls = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(
          "inline-flex items-center font-medium border bg-surface-1 cursor-help",
          sizeCls,
          meta.textColor,
          dim && "opacity-40 border-dashed",
        )}>
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

function SsInfoChip({ sources, size = "md" }: { sources: AllocSources; size?: "sm" | "md" }) {
  const ss = sources.ssReserved ?? 0;
  const hard = sources.reservedHard ?? 0;
  const qa = sources.quarantine ?? 0;
  const total = ss + hard + qa;
  if (total <= 0) return null;
  const sizeCls = size === "sm"
    ? "gap-0.5 rounded px-1 py-0.5 text-[10px]"
    : "gap-1 rounded-full px-2 py-0.5 text-[11px]";
  const iconCls = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(
          "inline-flex items-center font-medium border border-dashed border-text-3/40 bg-surface-2/40 text-text-3 cursor-help",
          sizeCls,
        )}>
          <Shield className={iconCls} />
          {size === "sm" ? `SS ${ss.toLocaleString()}` : `SS giữ: ${ss.toLocaleString()}`}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 space-y-2 bg-surface-0 border-surface-3">
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-text-3" />
          <strong className="text-text-1">Tồn kho an toàn (info only)</strong>
        </div>
        <p className="text-caption text-text-2 leading-snug">
          Số này <strong>KHÔNG</strong> cộng vào allocated. Chỉ thông tin tham khảo về phần inventory đang bị giữ.
        </p>
        <div className="rounded border border-surface-3 bg-surface-1/60 p-2 font-mono text-[11px] text-text-2 space-y-0.5">
          {ss > 0 && <div>SS reserved: <span className="text-text-1">{ss.toLocaleString()}</span></div>}
          {hard > 0 && <div>Hard reserved: <span className="text-text-1">{hard.toLocaleString()}</span></div>}
          {qa > 0 && <div>Quarantine: <span className="text-text-1">{qa.toLocaleString()}</span></div>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function SuggestedChip({ a, size = "md" }: { a: SuggestedAction; size?: "sm" | "md" }) {
  const sizeCls = size === "sm"
    ? "gap-0.5 rounded px-1 py-0.5 text-[10px]"
    : "gap-1 rounded-full px-2 py-0.5 text-[11px]";
  const iconCls = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(
          "inline-flex items-center font-medium border border-dashed border-warning/40 bg-warning/10 text-warning cursor-help",
          sizeCls,
          a.recommended && "ring-1 ring-warning",
        )}>
          <ArrowLeftRight className={iconCls} />
          <span>{a.label}: {a.qty.toLocaleString()}</span>
          {a.recommended && <span className="text-[9px]">⭐</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs p-3 space-y-1 bg-surface-0 border-surface-3">
        <div className="font-medium text-text-1">{a.label}{a.recommended && <span className="ml-1 text-warning">⭐ recommended</span>}</div>
        <div className="text-caption text-text-2">Nguồn: {a.source}</div>
        <div className="text-caption text-text-2">Cost: {a.cost} · LT: {a.time}</div>
        {a.savingVsB && <div className="text-caption text-success">vs baseline: {a.savingVsB}</div>}
      </TooltipContent>
    </Tooltip>
  );
}

interface Props {
  sources: AllocSources;
  compact?: boolean;
  demand?: number;
  allocated?: number;
  showZero?: boolean;
  suggestedActions?: SuggestedAction[];
}

export function AllocSourceBar({ sources, compact = false, demand, allocated, showZero = false, suggestedActions }: Props) {
  const entries = SOURCE_META.map(m => ({ ...m, qty: sources[m.key] }));
  const positive = showZero ? entries : entries.filter(e => e.qty > 0);
  const totalPos = entries.filter(e => e.qty > 0).reduce((s, e) => s + e.qty, 0);
  const givingTransfer = sources.internalTransfer < 0 ? Math.abs(sources.internalTransfer) : 0;
  const gap = demand != null && allocated != null ? Math.max(0, demand - allocated) : 0;

  // Invariant check (dev mode)
  if (process.env.NODE_ENV === 'development' && allocated !== undefined) {
    if (Math.abs(allocated - totalPos) > 0.01) {
      // eslint-disable-next-line no-console
      console.warn(
        `[AllocSourceBar] MISMATCH: allocated=${allocated} ≠ sum(committed)=${totalPos}`,
        { sources, demand, allocated }
      );
    }
  }

  const hasSuggested = suggestedActions && suggestedActions.length > 0;

  if (totalPos === 0 && givingTransfer === 0 && gap === 0 && !hasSuggested && !showZero) {
    return <span className="text-text-3 text-caption">—</span>;
  }

  const committedRow = (size: "sm" | "md") => (
    <div className="flex flex-wrap gap-1.5">
      {positive.map((e) => (
        <SourceChip key={e.key} meta={e} qty={e.qty} totalAllocated={totalPos} size={size} dim={e.qty === 0} />
      ))}
      {givingTransfer > 0 && <GivingTransferChip qty={givingTransfer} size={size} />}
      {gap > 0 && <MissingChip gap={gap} size={size} />}
      <SsInfoChip sources={sources} size={size} />
    </div>
  );

  const suggestedBlock = hasSuggested ? (
    <div className="mt-2 pt-2 border-t border-warning/30 border-dashed">
      <div className="text-[10px] uppercase tracking-wider text-warning/90 font-medium mb-1">
        Gợi ý hành động (chưa commit)
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestedActions!.map((a, i) => (
          <SuggestedChip key={i} a={a} size={compact ? "sm" : "md"} />
        ))}
      </div>
    </div>
  ) : null;

  if (compact) {
    return (
      <TooltipProvider delayDuration={150}>
        <div className="flex flex-col gap-1 min-w-[140px]">
          {totalPos > 0 && (
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-surface-3">
              {entries.filter(e => e.qty > 0).map((e) => (
                <div
                  key={e.key}
                  className={cn("h-full", e.color)}
                  style={{ width: `${(e.qty / totalPos) * 100}%` }}
                  title={`${e.label}: ${e.qty.toLocaleString()}`}
                />
              ))}
              {gap > 0 && (
                <div
                  className="h-full bg-danger/30 border-l border-danger"
                  style={{ width: `${(gap / (totalPos + gap)) * 100}%` }}
                  title={`Thiếu: ${gap.toLocaleString()}`}
                />
              )}
            </div>
          )}
          {committedRow("sm")}
          {suggestedBlock}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div>
        {committedRow("md")}
        {suggestedBlock}
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
  suggestedActions?: SuggestedAction[];
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
                <td className="px-3 py-2"><AllocSourceBar sources={sk.sources} demand={sk.demand} allocated={sk.allocated} suggestedActions={sk.suggestedActions} /></td>
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
  suggestedActions?: SuggestedAction[];
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
                <td className="px-3 py-2"><AllocSourceBar sources={cr.sources} demand={cr.demand} allocated={cr.allocated} suggestedActions={cr.suggestedActions} /></td>
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

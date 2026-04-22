import { cn } from "@/lib/utils";
import { Package, Truck, Factory, ArrowLeftRight, Repeat } from "lucide-react";

export interface AllocSources {
  onHand: number;
  pipeline: number;
  hubPo: number;
  lcnbIn: number;
  internalTransfer: number;
}

const SOURCE_META = [
  { key: "onHand" as const, label: "On-hand", short: "OH", color: "bg-success/80", textColor: "text-success", Icon: Package, desc: "Tồn kho có sẵn tại CN" },
  { key: "pipeline" as const, label: "Pipeline", short: "PL", color: "bg-info/80", textColor: "text-info", Icon: Truck, desc: "RPO/PO đang về (Hub đã đặt trước)" },
  { key: "hubPo" as const, label: "Hub PO", short: "Hub", color: "bg-primary/80", textColor: "text-primary", Icon: Factory, desc: "PO mới sourcing từ Hub (NM ngoài)" },
  { key: "lcnbIn" as const, label: "LCNB", short: "LCNB", color: "bg-warning/80", textColor: "text-warning", Icon: ArrowLeftRight, desc: "Lateral nhận từ CN khác (LCNB)" },
  { key: "internalTransfer" as const, label: "Internal TO", short: "TO", color: "bg-accent", textColor: "text-accent-foreground", Icon: Repeat, desc: "Luân chuyển nội bộ giữa kho cùng CN" },
];

interface Props {
  sources: AllocSources;
  compact?: boolean;
}

export function AllocSourceBar({ sources, compact = false }: Props) {
  const entries = SOURCE_META.map(m => ({ ...m, qty: sources[m.key] }));
  const positive = entries.filter(e => e.qty > 0);
  const totalPos = positive.reduce((s, e) => s + e.qty, 0);
  const givingTransfer = sources.internalTransfer < 0 ? Math.abs(sources.internalTransfer) : 0;

  if (totalPos === 0 && givingTransfer === 0) {
    return <span className="text-text-3 text-caption">—</span>;
  }

  if (compact) {
    return (
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
        </div>
        <div className="flex flex-wrap gap-1">
          {positive.map((e) => (
            <span
              key={e.key}
              className={cn("inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium border bg-surface-1", e.textColor)}
              title={e.desc}
            >
              <e.Icon className="h-2.5 w-2.5" />
              {e.short} {e.qty.toLocaleString()}
            </span>
          ))}
          {givingTransfer > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium border border-warning/30 bg-warning-bg text-warning"
              title="Chuyển đi (lateral / internal transfer ra)"
            >
              <ArrowLeftRight className="h-2.5 w-2.5" />
              −{givingTransfer.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {positive.map((e) => (
        <span
          key={e.key}
          className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border bg-surface-1", e.textColor)}
          title={e.desc}
        >
          <e.Icon className="h-3 w-3" />
          {e.label}: {e.qty.toLocaleString()}
        </span>
      ))}
      {givingTransfer > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border border-warning/30 bg-warning-bg text-warning">
          <ArrowLeftRight className="h-3 w-3" />
          Chuyển đi: −{givingTransfer.toLocaleString()}
        </span>
      )}
    </div>
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
                  )}>{sk.status}</span>
                </td>
                <td className="px-3 py-2"><AllocSourceBar sources={sk.sources} /></td>
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
              {["CN", "Demand", "Allocated", "Fill%", "Gap", "Status", "Nguồn phân bổ"].map((h, i) => (
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
                  )}>{cr.status}</span>
                </td>
                <td className="px-3 py-2"><AllocSourceBar sources={cr.sources} /></td>
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
    <div className="flex flex-wrap items-center gap-2 text-caption text-text-3">
      <span className="font-medium text-text-2">Nguồn phân bổ:</span>
      {SOURCE_META.map((m) => (
        <span key={m.key} className={cn("inline-flex items-center gap-1", m.textColor)}>
          <m.Icon className="h-3 w-3" /> {m.label}
        </span>
      ))}
    </div>
  );
}

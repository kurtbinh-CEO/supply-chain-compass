import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Building2, FileText, ClipboardCheck, PackageCheck, Truck, Warehouse, ChevronRight,
  FileSpreadsheet, FileText as FileCsv,
} from "lucide-react";
import { getPoTypeBadge, poNumClasses } from "@/lib/po-numbers";
import { exportToCsv, exportToXlsx, type ExportColumn } from "@/lib/export-utils";
import { toast } from "sonner";

export interface BpoFlowRpo {
  rpo: string;
  status: string; // draft|submitted|confirmed|shipped|received|cancelled
  item: string;
  qty: number;
  asn: string | null;
  shipDate: string;
  eta: string;
  actual: number;
}

export interface BpoFlowData {
  nm: string;
  bpo: string;
  bpoTotal: number;     // Created (all non-cancelled)
  approved: number;     // past submitted gate
  released: number;     // RPO issued
  shipped: number;      // ASN issued
  delivered: number;    // received
  cancelled?: number;
  remaining: number;
  completionPct: number;
  rpos: BpoFlowRpo[];
}

const stageLabels: Record<string, string> = {
  draft: "Draft", submitted: "Submitted", confirmed: "Confirmed",
  shipped: "Shipped", received: "Received", cancelled: "Cancelled",
};

type StageKey = "created" | "approved" | "released" | "shipped" | "received";

const stageDefs: { key: StageKey; label: string; icon: typeof FileText; tone: string }[] = [
  { key: "created",  label: "Created",  icon: FileText,       tone: "text-text-2" },
  { key: "approved", label: "Approved", icon: ClipboardCheck, tone: "text-primary" },
  { key: "released", label: "Released", icon: PackageCheck,   tone: "text-primary" },
  { key: "shipped",  label: "Shipped",  icon: Truck,          tone: "text-info" },
  { key: "received", label: "Received", icon: Warehouse,      tone: "text-success" },
];

export function BpoFlowCard({ data }: { data: BpoFlowData }) {
  const [expandedStage, setExpandedStage] = useState<StageKey | null>(null);

  // Qty per stage — each line counted at every stage it has REACHED.
  // Sourced directly from aggregated PO statuses (not approximations).
  const reachedQty: Record<StageKey, number> = {
    created:  data.bpoTotal,
    approved: data.approved,
    released: data.released,
    shipped:  data.shipped,
    received: data.delivered,
  };

  // Drop-off between consecutive stages (qty stuck at the previous stage)
  const stageOrderArr: StageKey[] = ["created", "approved", "released", "shipped", "received"];
  const dropOff: Record<StageKey, number> = {
    created: 0,
    approved: reachedQty.created  - reachedQty.approved,
    released: reachedQty.approved - reachedQty.released,
    shipped:  reachedQty.released - reachedQty.shipped,
    received: reachedQty.shipped  - reachedQty.received,
  };

  // Filter children by stage — show lines whose furthest reached stage matches
  const childrenForStage = (s: StageKey): BpoFlowRpo[] => {
    if (s === "created")  return data.rpos;
    if (s === "approved") return data.rpos.filter((r) => ["submitted", "confirmed", "shipped", "received"].includes(r.status));
    if (s === "released") return data.rpos.filter((r) => ["confirmed", "shipped", "received"].includes(r.status));
    if (s === "shipped")  return data.rpos.filter((r) => ["shipped", "received"].includes(r.status));
    if (s === "received") return data.rpos.filter((r) => r.status === "received");
    return [];
  };

  const maxQty = data.bpoTotal || 1;

  return (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-3 flex items-center justify-between bg-surface-1/30">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-button bg-surface-0 border border-surface-3 p-2">
            <Building2 className="h-4 w-4 text-text-2" />
          </div>
          <div className="min-w-0">
            <p className="text-table font-semibold text-text-1">{data.nm}</p>
            <p className={cn("text-caption text-text-3", poNumClasses)}>
              {data.bpo} · {data.rpos.length} RPO · BPO {data.bpoTotal.toLocaleString()} m²
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-table-sm tabular-nums shrink-0">
          <div className="text-right">
            <p className="text-caption text-text-3 uppercase">Còn lại</p>
            <p className={cn("font-semibold", data.remaining > 0 ? "text-warning" : "text-success")}>
              {data.remaining.toLocaleString()}
            </p>
          </div>
          <div className="text-right w-14">
            <p className="text-caption text-text-3 uppercase">Done</p>
            <p className="font-semibold text-text-1">{data.completionPct}%</p>
          </div>
        </div>
      </div>

      {/* Stage funnel */}
      <div className="px-4 pt-5 pb-3">
        <div className="relative flex items-stretch gap-1">
          {stageDefs.map((s, i) => {
            const Icon = s.icon;
            const qty = reachedQty[s.key];
            const pct = (qty / maxQty) * 100;
            const isActive = qty > 0;
            const isOpen = expandedStage === s.key;

            // Funnel height: shrink as qty drops
            const blockHeight = 28 + (pct / 100) * 32; // 28..60px

            return (
              <button
                key={s.key}
                onClick={() => setExpandedStage(isOpen ? null : s.key)}
                disabled={!isActive}
                className={cn(
                  "relative flex-1 group flex flex-col items-center pt-1 pb-2 rounded-button transition-all",
                  isActive ? "hover:bg-surface-1/60 cursor-pointer" : "opacity-40 cursor-not-allowed",
                  isOpen && "bg-surface-1"
                )}
              >
                {/* Connector line */}
                {i < stageDefs.length - 1 && (
                  <div className="absolute top-[14px] left-1/2 w-full h-0.5 bg-surface-3 -z-0" />
                )}
                {/* Icon circle */}
                <div className={cn(
                  "relative z-10 h-7 w-7 rounded-full flex items-center justify-center border-2 transition-all",
                  isActive
                    ? s.key === "received" ? "bg-success border-success text-success-foreground"
                      : s.key === "shipped" ? "bg-info border-info text-info-foreground"
                      : "bg-surface-0 border-primary text-primary"
                    : "bg-surface-1 border-surface-3 text-text-3",
                  isOpen && "ring-2 ring-primary/40 ring-offset-2 ring-offset-surface-2"
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>

                {/* Label */}
                <p className={cn(
                  "mt-2 text-caption uppercase tracking-wide font-medium",
                  isActive ? "text-text-2" : "text-text-3"
                )}>
                  {s.label}
                </p>

                {/* Qty funnel block */}
                <div className="mt-2 w-full px-1.5 flex flex-col items-center gap-1">
                  <div
                    className={cn(
                      "w-full rounded-sm transition-all",
                      s.key === "received" ? "bg-success/80"
                        : s.key === "shipped" ? "bg-info/70"
                        : s.key === "released" ? "bg-primary/60"
                        : s.key === "approved" ? "bg-primary/40"
                        : "bg-surface-3"
                    )}
                    style={{ height: `${blockHeight}px`, opacity: isActive ? 1 : 0.3 }}
                  />
                  <p className={cn("text-table-sm tabular-nums font-semibold", isActive ? "text-text-1" : "text-text-3")}>
                    {qty.toLocaleString()}
                  </p>
                  <p className="text-caption tabular-nums text-text-3">
                    {Math.round(pct)}%
                  </p>
                  {/* Drop-off from previous stage */}
                  {i > 0 && dropOff[s.key] > 0 && (
                    <p className="text-caption tabular-nums text-warning font-medium" title={`Còn lại ở ${stageDefs[i - 1].label}, chưa chuyển sang ${s.label}`}>
                      −{dropOff[s.key].toLocaleString()}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Waterfall summary line */}
        <div className="mt-3 pt-3 border-t border-surface-3/50 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-3">
          <span>Waterfall:</span>
          {stageDefs.map((s, i) => (
            <span key={s.key} className="flex items-center gap-1">
              <span className={cn(
                "tabular-nums font-medium",
                reachedQty[s.key] > 0 ? "text-text-2" : "text-text-3"
              )}>
                {reachedQty[s.key].toLocaleString()}
              </span>
              {i < stageDefs.length - 1 && (
                <>
                  {dropOff[stageOrderArr[i + 1]] > 0 && (
                    <span className="text-warning tabular-nums">
                      (−{dropOff[stageOrderArr[i + 1]].toLocaleString()})
                    </span>
                  )}
                  <ChevronRight className="h-3 w-3 text-text-3" />
                </>
              )}
            </span>
          ))}
          <span className="ml-auto">
            {data.cancelled && data.cancelled > 0 && (
              <span className="mr-3">Hủy: <span className="text-danger tabular-nums font-medium">{data.cancelled.toLocaleString()}</span></span>
            )}
            Chưa nhận: <span className="text-warning tabular-nums font-medium">{(data.bpoTotal - data.delivered).toLocaleString()}</span>
          </span>
        </div>
      </div>

      {/* Drill-down children */}
      {expandedStage && (
        <div className="border-t border-surface-3 bg-surface-1/40 animate-fade-in">
          <div className="px-4 py-2 border-b border-surface-3/50 flex items-center justify-between">
            <p className="text-caption text-text-2 uppercase tracking-wide">
              Stage <span className="text-text-1 font-semibold">{stageDefs.find((s) => s.key === expandedStage)?.label}</span> · {childrenForStage(expandedStage).length} record
            </p>
            <button
              onClick={() => setExpandedStage(null)}
              className="text-caption text-text-3 hover:text-text-1"
            >
              Đóng
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3/50 bg-surface-2/50">
                  {["RPO#", "Item", "Qty", "ASN#", "Ship date", "ETA", "Actual", "Status"].map((h) => (
                    <th key={h} className="px-3 py-1.5 text-left text-table-header uppercase text-text-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {childrenForStage(expandedStage).map((r) => {
                  const rpoBadge = getPoTypeBadge("RPO");
                  const asnBadge = getPoTypeBadge("ASN");
                  const stColor =
                    r.status === "received" ? "bg-success-bg text-success" :
                    r.status === "shipped" ? "bg-info-bg text-info" :
                    r.status === "confirmed" ? "bg-primary/10 text-primary" :
                    "bg-warning-bg text-warning";
                  return (
                    <tr key={r.rpo} className="border-b border-surface-3/30 hover:bg-surface-2/50">
                      <td className={cn("px-3 py-1.5", poNumClasses, rpoBadge.text)}>{r.rpo}</td>
                      <td className="px-3 py-1.5 text-table text-text-1">{r.item}</td>
                      <td className="px-3 py-1.5 text-table tabular-nums text-text-1">{r.qty.toLocaleString()}</td>
                      <td className="px-3 py-1.5">
                        {r.asn ? (
                          <span className={cn("rounded-sm px-1.5 py-0.5", poNumClasses, asnBadge.bg, asnBadge.text)}>{r.asn}</span>
                        ) : <span className="text-text-3">—</span>}
                      </td>
                      <td className={cn("px-3 py-1.5 text-text-2", poNumClasses)}>{r.shipDate}</td>
                      <td className={cn("px-3 py-1.5 text-text-2", poNumClasses)}>{r.eta}</td>
                      <td className="px-3 py-1.5 text-table tabular-nums font-medium text-text-1">
                        {r.actual > 0 ? r.actual.toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", stColor)}>
                          {stageLabels[r.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {childrenForStage(expandedStage).length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-4 text-center text-text-3 text-caption">Chưa có record nào ở stage này.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

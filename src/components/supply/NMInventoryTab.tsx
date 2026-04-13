import { useState } from "react";
import { useTenant } from "@/components/TenantContext";
import { getNMRows, Freshness } from "./supplyData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowUpDown, RefreshCw, AlertTriangle, Sparkles } from "lucide-react";

const freshnessConfig: Record<Freshness, { label: string; dot: string; bg: string; text: string; trust: string }> = {
  green:   { label: "API < 1h",    dot: "bg-success",  bg: "bg-success-bg", text: "text-success", trust: "High Trust" },
  yellow:  { label: "File < 8h",   dot: "bg-warning",  bg: "bg-warning-bg", text: "text-warning", trust: "Medium Trust" },
  red:     { label: "Manual < 24h", dot: "bg-danger",   bg: "bg-danger-bg",  text: "text-danger",  trust: "Low Trust" },
  blocked: { label: "STALE > 24h", dot: "bg-danger",   bg: "bg-danger-bg",  text: "text-danger",  trust: "BLOCKED" },
};

function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  const c = freshnessConfig[freshness];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-table-sm font-medium", c.bg, c.text)}>
      {freshness === "blocked" ? <span className="text-danger">✕</span> : <span className={cn("h-[6px] w-[6px] rounded-full", c.dot)} />}
      {c.label}
    </span>
  );
}

type SortKey = "nm" | "onHand" | "committed" | "atp" | "freshness";

export function NMInventoryTab() {
  const { tenant } = useTenant();
  const rows = getNMRows(tenant);
  const [sortKey, setSortKey] = useState<SortKey>("nm");
  const [sortAsc, setSortAsc] = useState(true);
  const [requested, setRequested] = useState<Set<string>>(new Set());

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const sorted = [...rows].sort((a, b) => {
    let va: any = a[sortKey], vb: any = b[sortKey];
    if (va === null) va = -Infinity;
    if (vb === null) vb = -Infinity;
    if (typeof va === "string") return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortAsc ? va - vb : vb - va;
  });

  const handleRequest = (id: string, nm: string) => {
    setRequested((p) => new Set(p).add(id));
    toast.success(`Đã gửi yêu cầu cập nhật tới ${nm}`, { description: "Email + notification đã được gửi đến nhà máy." });
  };

  const staleCount = rows.filter((r) => r.stale).length;
  const inTransitCount = 12;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Status bar */}
      <div className="flex items-center gap-4 text-table-sm">
        <span className="rounded-full border border-surface-3 bg-surface-2 px-3 py-1 font-medium text-text-1">{rows.length} NM</span>
        {staleCount > 0 && (
          <span className="flex items-center gap-1 text-danger font-medium">
            <AlertTriangle className="h-3.5 w-3.5" /> {rows.filter(r => r.freshness === "yellow").length > 0 ? `${rows.find(r=>r.stale)?.nm} stale ${rows.find(r=>r.stale)?.lastSync}` : `${staleCount} stale`}
          </span>
        )}
        <span className="flex items-center gap-1 text-text-2">📦 {inTransitCount} in-transit</span>
        <div className="flex-1" />
        <span className="text-text-3">Last sync 14:32</span>
        <button className="rounded-button bg-gradient-primary text-primary-foreground px-3 py-1.5 text-table-sm font-medium flex items-center gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Force Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table */}
        <div className="lg:col-span-2 rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3">
            <h3 className="font-display text-section-header text-text-1">Tồn kho Nhà Máy (NM)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {[
                    { key: "nm" as SortKey, label: "NM" },
                    { key: "nm" as SortKey, label: "ITEM" },
                    { key: "nm" as SortKey, label: "VARIANT" },
                    { key: "onHand" as SortKey, label: "ON-HAND" },
                    { key: "committed" as SortKey, label: "COMMITTED" },
                    { key: "nm" as SortKey, label: "UNIS SHARE" },
                    { key: "atp" as SortKey, label: "ATP UNIS" },
                    { key: "freshness" as SortKey, label: "FRESHNESS" },
                    { key: "nm" as SortKey, label: "" },
                  ].map((col, i) => (
                    <th
                      key={i}
                      onClick={() => ["nm", "onHand", "committed", "atp", "freshness"].includes(col.key) && col.label ? handleSort(col.key) : undefined}
                      className={cn("px-4 py-2.5 text-left text-table-header uppercase text-text-3", col.label && "cursor-pointer hover:text-text-1")}
                    >
                      <span className="flex items-center gap-1">
                        {col.label}
                        {col.label && sortKey === col.key && <ArrowUpDown className="h-3 w-3" />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-surface-3/50 transition-colors",
                      r.stale ? "bg-danger-bg/40 opacity-60" : "hover:bg-surface-1/30"
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className={cn("text-table font-medium", r.stale ? "text-text-3" : "text-primary")}>{r.nm}</span>
                    </td>
                    <td className="px-4 py-3 text-table text-text-2">{r.item}</td>
                    <td className="px-4 py-3 text-table text-text-2">{r.variant}</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-1">
                      {r.onHand !== null ? r.onHand.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-2">
                      {r.committed > 0 ? r.committed.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-1">
                      {r.share > 0 ? (
                        <div>
                          <span className="text-text-3">{Math.round(r.share * 100)}%</span>
                          <br />
                          <span className="font-semibold">= {r.atp !== null && r.onHand !== null ? Math.round((r.onHand - r.committed) * r.share).toLocaleString() : "—"}</span>
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-table tabular-nums font-semibold text-primary">
                      {r.atp !== null ? r.atp.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3"><FreshnessBadge freshness={r.freshness} /></td>
                    <td className="px-4 py-3">
                      {r.stale && (
                        <button
                          onClick={() => handleRequest(r.id, r.nm)}
                          disabled={requested.has(r.id)}
                          className={cn(
                            "rounded-button px-3 py-1 text-caption font-medium whitespace-nowrap transition-colors",
                            requested.has(r.id)
                              ? "border border-surface-3 text-text-3 cursor-not-allowed"
                              : "bg-gradient-primary text-primary-foreground hover:opacity-90"
                          )}
                        >
                          {requested.has(r.id) ? "Đã gửi" : "Yêu cầu NM cập nhật"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Curator Insight */}
          <div className="rounded-card bg-text-1 text-primary-foreground p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-warning" />
              <h4 className="font-display text-body font-semibold">Curator Insight</h4>
            </div>
            <p className="text-table">
              <strong>Critical Alert:</strong> Phú Mỹ has not reported inventory for &gt;24h. ATP UNIS calculations for GA-300 are currently under-estimating network availability by ~22%.
            </p>
            <button className="mt-4 w-full rounded-button border border-surface-2/30 py-2 text-table-sm font-medium hover:bg-surface-2/10 transition-colors">
              Request File Upload
            </button>
          </div>

          {/* Formula */}
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
            <span className="text-table-header uppercase text-text-3">FORMULA DEFINITION</span>
            <div className="mt-2 rounded-lg bg-warning-bg p-3 text-body font-mono text-text-1">
              ATP = (on_hand – committed) × share%
            </div>
            <p className="mt-2 text-caption text-text-3 italic">
              *UNIS share is dynamically calculated based on historical sales performance and regional tiering.
            </p>
          </div>

          {/* Legend */}
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
            <span className="text-table-header uppercase text-text-3">INTEGRITY LEGEND</span>
            <div className="mt-3 space-y-2.5">
              {(["green", "yellow", "red", "blocked"] as Freshness[]).map((f) => {
                const c = freshnessConfig[f];
                return (
                  <div key={f} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full", c.dot)} />
                      {f === "blocked" ? <span className="text-danger font-bold text-table-sm">✕</span> : null}
                      <span className="text-table text-text-1">{c.label}</span>
                    </div>
                    <span className={cn("text-table-sm font-medium", f === "blocked" ? "text-danger" : c.text)}>{c.trust}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

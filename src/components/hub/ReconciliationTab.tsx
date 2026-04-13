import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { getPoTypeBadge, poNumClasses } from "@/lib/po-numbers";

interface Props { scale: number }

interface BpoRecon {
  bpo: string;
  nm: string;
  committed: number;
  released: number;
  releasedRpos: number;
  delivered: number;
  deliveredAsns: number;
  state: "closed" | "active";
  rpos: RpoRecon[];
}

interface RpoRecon {
  rpo: string;
  item: string;
  qty: number;
  asn: string;
  shipDate: string;
  eta: string;
  actual: number;
  status: string;
}

const baseBpoRecon: BpoRecon[] = [
  {
    bpo: "BPO-MKD-2605", nm: "Mikado", committed: 5500, released: 5060, releasedRpos: 8, delivered: 4800, deliveredAsns: 6, state: "closed",
    rpos: [
      { rpo: "RPO-MKD-2605-W16-001", item: "GA-300 A4", qty: 1200, asn: "ASN-MKD-2605-001", shipDate: "10/05", eta: "17/05", actual: 800, status: "SHIPPED" },
      { rpo: "RPO-MKD-2605-W16-002", item: "GA-600 A4", qty: 800, asn: "—", shipDate: "—", eta: "20/05", actual: 0, status: "IN_PRODUCTION" },
      { rpo: "RPO-MKD-2605-W17-001", item: "GA-300 A4", qty: 500, asn: "ASN-MKD-2605-002", shipDate: "15/05", eta: "22/05", actual: 500, status: "RECEIVED" },
    ],
  },
  {
    bpo: "BPO-TKO-2605", nm: "Toko", committed: 6000, released: 4080, releasedRpos: 5, delivered: 3100, deliveredAsns: 3, state: "closed",
    rpos: [
      { rpo: "RPO-TKO-2605-W16-001", item: "GA-300 A4", qty: 557, asn: "ASN-TKO-2605-001", shipDate: "12/05", eta: "19/05", actual: 500, status: "SHIPPED" },
      { rpo: "RPO-TKO-2605-W16-002", item: "GA-600 A4", qty: 643, asn: "—", shipDate: "—", eta: "22/05", actual: 0, status: "IN_PRODUCTION" },
    ],
  },
  {
    bpo: "BPO-PMY-2605", nm: "Phú Mỹ", committed: 3000, released: 1350, releasedRpos: 3, delivered: 640, deliveredAsns: 1, state: "active",
    rpos: [
      { rpo: "RPO-PMY-2605-W16-001", item: "GA-300 B2", qty: 500, asn: "ASN-PMY-2605-001", shipDate: "11/05", eta: "19/05", actual: 340, status: "SHIPPED" },
    ],
  },
  {
    bpo: "BPO-DTM-2605", nm: "Đồng Tâm", committed: 2500, released: 2250, releasedRpos: 4, delivered: 2000, deliveredAsns: 3, state: "active",
    rpos: [
      { rpo: "RPO-DTM-2605-W16-001", item: "GA-400 A4", qty: 900, asn: "ASN-DTM-2605-001", shipDate: "09/05", eta: "16/05", actual: 900, status: "RECEIVED" },
    ],
  },
  {
    bpo: "BPO-VGR-2605", nm: "Vigracera", committed: 1500, released: 1460, releasedRpos: 3, delivered: 1300, deliveredAsns: 2, state: "active",
    rpos: [
      { rpo: "RPO-VGR-2605-W16-001", item: "GA-600 A4", qty: 500, asn: "ASN-VGR-2605-001", shipDate: "10/05", eta: "17/05", actual: 500, status: "RECEIVED" },
    ],
  },
];

export function ReconciliationTab({ scale }: Props) {
  const [drillBpo, setDrillBpo] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("Tháng 5 (đang chạy)");

  const recon = baseBpoRecon.map(r => ({
    ...r,
    committed: Math.round(r.committed * scale),
    released: Math.round(r.released * scale),
    delivered: Math.round(r.delivered * scale),
    rpos: r.rpos.map(rp => ({ ...rp, qty: Math.round(rp.qty * scale), actual: Math.round(rp.actual * scale) })),
  }));

  const activeBpo = drillBpo ? recon.find(r => r.bpo === drillBpo) : null;

  if (activeBpo) {
    const honoringPct = activeBpo.committed > 0 ? Math.round((activeBpo.delivered / activeBpo.committed) * 100) : 0;

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2 text-table-sm">
          <button onClick={() => setDrillBpo(null)} className="text-primary font-medium hover:underline flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Đối chiếu
          </button>
          <span className="text-text-3">/</span>
          <span className={cn("rounded-sm px-1.5 py-0.5 text-caption font-medium", getPoTypeBadge("BPO").bg, getPoTypeBadge("BPO").text, poNumClasses)}>
            {activeBpo.bpo}
          </span>
          <span className="text-text-1 font-medium">{activeBpo.nm}</span>
        </div>

        {/* BPO summary */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Committed", value: activeBpo.committed.toLocaleString(), color: "text-text-1" },
            { label: "Released", value: `${activeBpo.released.toLocaleString()} (${activeBpo.releasedRpos} RPOs)`, color: "text-info" },
            { label: "Delivered", value: `${activeBpo.delivered.toLocaleString()} (${activeBpo.deliveredAsns} ASNs)`, color: "text-success" },
            { label: "Honoring%", value: `${honoringPct}%`, color: honoringPct >= 80 ? "text-success" : "text-danger" },
          ].map(k => (
            <div key={k.label} className="rounded-card border border-surface-3 bg-surface-1 p-3">
              <div className="text-caption text-text-3 uppercase">{k.label}</div>
              <div className={cn("font-display text-section-header tabular-nums mt-1", k.color)}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* RPO → ASN table */}
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                {["RPO#", "Item", "Qty", "ASN#", "Ship date", "ETA", "Actual", "Status"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeBpo.rpos.map((rpo, i) => {
                const rpoBadge = getPoTypeBadge("RPO");
                const asnBadge = getPoTypeBadge("ASN");
                const statusColor = rpo.status === "RECEIVED" ? "bg-success-bg text-success" :
                  rpo.status === "SHIPPED" ? "bg-info-bg text-info" : "bg-warning-bg text-warning";
                return (
                  <tr key={i} className={cn("border-b border-surface-3/50", i % 2 === 0 ? "bg-surface-2" : "bg-surface-0")}>
                    <td className={cn("px-4 py-2.5", poNumClasses, rpoBadge.text)}>{rpo.rpo}</td>
                    <td className="px-4 py-2.5 text-text-1">{rpo.item}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-1">{rpo.qty.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      {rpo.asn !== "—" ? (
                        <span className={cn("rounded-sm px-1.5 py-0.5", poNumClasses, asnBadge.bg, asnBadge.text)}>{rpo.asn}</span>
                      ) : <span className="text-text-3">—</span>}
                    </td>
                    <td className={cn("px-4 py-2.5 text-text-2", poNumClasses)}>{rpo.shipDate}</td>
                    <td className={cn("px-4 py-2.5 text-text-2", poNumClasses)}>{rpo.eta}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-1 font-medium">
                      {rpo.actual > 0 ? rpo.actual.toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium", statusColor)}>
                        ● {rpo.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <select
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value)}
          className="rounded-button border border-surface-3 bg-surface-0 text-table-sm text-text-1 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option>Tháng 5 (đang chạy)</option>
          <option>Tháng 4 (closed)</option>
          <option>Tháng 3 (closed)</option>
        </select>
        <div className="flex-1" />
        <button className="rounded-button border border-surface-3 text-table-sm text-text-2 px-3 py-2 hover:bg-surface-2">Export PDF</button>
        <button className="rounded-button border border-surface-3 text-table-sm text-text-2 px-3 py-2 hover:bg-surface-2">Export Excel</button>
      </div>

      {/* BPO-level reconciliation */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                {["BPO#", "NM", "Committed", "Released (RPOs)", "Delivered (ASNs)", "Honoring%", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recon.map((r, i) => {
                const honoringPct = r.committed > 0 ? Math.round((r.delivered / r.committed) * 100) : 0;
                const bpoBadge = getPoTypeBadge("BPO");
                return (
                  <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-primary/5 cursor-pointer", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}
                    onClick={() => setDrillBpo(r.bpo)}>
                    <td className="px-4 py-2.5">
                      <span className={cn("rounded-sm px-1.5 py-0.5", poNumClasses, bpoBadge.bg, bpoBadge.text)}>{r.bpo}</span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-text-1">{r.nm}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-1">{r.committed.toLocaleString()}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-2">{r.released.toLocaleString()} ({r.releasedRpos} RPOs)</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-2">{r.delivered.toLocaleString()} ({r.deliveredAsns} ASNs)</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("tabular-nums font-bold", honoringPct >= 80 ? "text-success" : honoringPct >= 60 ? "text-warning" : "text-danger")}>
                        {honoringPct}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium",
                        r.state === "closed" ? "bg-surface-1 text-text-3" : "bg-info-bg text-info")}>
                        {r.state === "closed" ? "🔒 Closed" : "● Active"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-3"><ChevronRight className="h-3.5 w-3.5" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-table-sm text-text-3 italic">
        Tháng closed: số lock vĩnh viễn. Honoring% = Delivered / Committed. Feed → /monitoring closed-loop.
      </div>
    </div>
  );
}

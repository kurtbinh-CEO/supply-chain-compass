import { useTenant } from "@/components/TenantContext";
import { getShipments, Shipment } from "./supplyData";
import { StatusChip } from "@/components/StatusChip";
import { cn } from "@/lib/utils";
import { Truck, Package, MapPin, Clock } from "lucide-react";

const statusMap: Record<Shipment["status"], { chip: "success" | "info" | "danger" | "warning"; label: string }> = {
  "arrived":    { chip: "success", label: "Arrived" },
  "in-transit": { chip: "info",    label: "In Transit" },
  "delayed":    { chip: "danger",  label: "Delayed" },
  "pending":    { chip: "warning", label: "Pending" },
};

export function PipelineTab() {
  const { tenant } = useTenant();
  const shipments = getShipments(tenant);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Summary */}
      <div className="flex items-center gap-4 text-table-sm">
        <span className="rounded-full border border-surface-3 bg-surface-2 px-3 py-1 font-medium text-text-1">
          {shipments.length} shipments
        </span>
        <span className="text-info">{shipments.filter((s) => s.status === "in-transit").length} in-transit</span>
        <span className="text-success">{shipments.filter((s) => s.status === "arrived").length} arrived</span>
        <span className="text-danger">{shipments.filter((s) => s.status === "delayed").length} delayed</span>
      </div>

      {/* Card list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {shipments.map((sh) => {
          const st = statusMap[sh.status];
          return (
            <div
              key={sh.id}
              className={cn(
                "rounded-card border bg-surface-2 p-5 transition-all hover:shadow-md",
                sh.status === "delayed" ? "border-danger/30" : "border-surface-3"
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center",
                    sh.status === "in-transit" ? "bg-info-bg text-info" :
                    sh.status === "arrived" ? "bg-success-bg text-success" :
                    sh.status === "delayed" ? "bg-danger-bg text-danger" :
                    "bg-warning-bg text-warning"
                  )}>
                    <Truck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-table font-medium text-text-1">{sh.from}</span>
                    <span className="text-text-3 mx-1.5">→</span>
                    <span className="text-table font-medium text-text-1">{sh.to}</span>
                  </div>
                </div>
                <StatusChip status={st.chip} label={st.label} />
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-1.5 text-table-sm text-text-2">
                  <Package className="h-3.5 w-3.5 text-text-3" />
                  <span>{sh.item} · {sh.qty.toLocaleString()} units</span>
                </div>
                <div className="flex items-center gap-1.5 text-table-sm text-text-2">
                  <Clock className="h-3.5 w-3.5 text-text-3" />
                  <span>ETA: <strong className={sh.status === "delayed" ? "text-danger" : "text-text-1"}>{sh.eta}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-table-sm text-text-2">
                  <MapPin className="h-3.5 w-3.5 text-text-3" />
                  <span>{sh.carrier}</span>
                </div>
                <div className="text-table-sm text-text-3 font-mono">{sh.trackingId}</div>
              </div>

              {/* Progress bar for in-transit */}
              {sh.status === "in-transit" && (
                <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                  <div className="h-full rounded-full bg-info" style={{ width: "60%" }} />
                </div>
              )}
              {sh.status === "delayed" && (
                <div className="mt-2 text-caption text-danger flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                  Delay estimated 2 days. Weather disruption on route.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

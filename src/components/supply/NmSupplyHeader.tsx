import { useState } from "react";
import { RefreshCw, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Bravo sync status header. Static content reflects last successful nightly sync
 * + the next scheduled run; manual sync button simulates a 1.2s round-trip.
 */
export function NmSupplyHeader() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast.success("Đồng bộ Bravo hoàn tất", {
        description: "Đã refresh tồn kho 5 NM · 12 mã hàng cập nhật.",
      });
    }, 1200);
  };

  return (
    <div className="rounded-card border border-surface-3 bg-surface-1/50 px-4 py-2.5 flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3 text-table-sm flex-wrap">
        <div className="flex items-center gap-1.5 text-text-2">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <span>
            Đồng bộ Bravo: <span className="font-semibold text-text-1">22:00 hôm qua</span>
          </span>
        </div>
        <span className="text-text-3">·</span>
        <div className="flex items-center gap-1.5 text-text-2">
          <Clock className="h-4 w-4 text-text-3" />
          <span>
            Tiếp theo: <span className="font-semibold text-text-1">06:00 sáng mai</span>
          </span>
        </div>
      </div>
      <button
        onClick={handleSync}
        disabled={syncing}
        className={cn(
          "rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm font-medium text-text-1 hover:bg-surface-2 flex items-center gap-1.5 transition-colors",
          syncing && "opacity-60 cursor-not-allowed"
        )}
      >
        {syncing ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang đồng bộ…
          </>
        ) : (
          <>
            <RefreshCw className="h-3.5 w-3.5" /> Đồng bộ ngay
          </>
        )}
      </button>
    </div>
  );
}

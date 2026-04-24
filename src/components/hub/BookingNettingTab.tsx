/**
 * BookingNettingTab (M19 — GAP 2)
 *
 * Hiện process Booking Netting sau S&OP lock, trước NM cam kết.
 *
 * Formula:   Net Booking = FC 3M − Hub Available − Pipeline
 *
 * Click "FC 3M" → popup phân tích T5/T6/T7.
 * Sau booking → CommitmentTab pre-fill Net Booking qty per NM × SKU.
 */
import { useState } from "react";
import { Play, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BookingRow {
  nm: string;
  fc3m: number;
  hubAvail: number;
  pipeline: number;
  fcMonths: { t5: number; t6: number; t7: number };
}

const SEED_BOOKING: BookingRow[] = [
  { nm: "Mikado",    fc3m: 18_500, hubAvail: 2_400, pipeline: 1_200, fcMonths: { t5: 6_500, t6: 5_900, t7: 6_100 } },
  { nm: "Toko",      fc3m: 12_200, hubAvail: 1_800, pipeline:   600, fcMonths: { t5: 4_100, t6: 4_000, t7: 4_100 } },
  { nm: "Đồng Tâm",  fc3m: 15_800, hubAvail: 3_200, pipeline:   800, fcMonths: { t5: 5_300, t6: 5_200, t7: 5_300 } },
  { nm: "Vigracera", fc3m:  8_400, hubAvail: 1_200, pipeline:   400, fcMonths: { t5: 2_800, t6: 2_800, t7: 2_800 } },
  { nm: "Phú Mỹ",    fc3m:  6_000, hubAvail:   800, pipeline:   200, fcMonths: { t5: 2_000, t6: 2_000, t7: 2_000 } },
];

export function BookingNettingTab({
  cycleLabel,
  sopVersion,
  scale = 1,
  autoRanAt,
}: {
  cycleLabel: string;
  sopVersion: number;
  scale?: number;
  /** ISO ts when auto-run was triggered (for display). */
  autoRanAt?: string | null;
}) {
  const [hasRun, setHasRun] = useState<boolean>(!!autoRanAt);
  const [running, setRunning] = useState(false);
  const [version, setVersion] = useState(1);

  const rows = SEED_BOOKING.map((r) => ({
    ...r,
    fc3m: Math.round(r.fc3m * scale),
    hubAvail: Math.round(r.hubAvail * scale),
    pipeline: Math.round(r.pipeline * scale),
    fcMonths: {
      t5: Math.round(r.fcMonths.t5 * scale),
      t6: Math.round(r.fcMonths.t6 * scale),
      t7: Math.round(r.fcMonths.t7 * scale),
    },
    netBooking: Math.max(0, Math.round((r.fc3m - r.hubAvail - r.pipeline) * scale)),
  }));

  const totals = rows.reduce(
    (acc, r) => ({
      fc3m: acc.fc3m + r.fc3m,
      hubAvail: acc.hubAvail + r.hubAvail,
      pipeline: acc.pipeline + r.pipeline,
      netBooking: acc.netBooking + r.netBooking,
    }),
    { fc3m: 0, hubAvail: 0, pipeline: 0, netBooking: 0 },
  );

  const handleRun = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setHasRun(true);
      setVersion((v) => v + 1);
      toast.success(`Booking ${cycleLabel.replace("Tháng ", "T")} v${version + 1}`, {
        description: `Cần ${totals.netBooking.toLocaleString()} m² từ ${rows.length} NM. Pre-fill Cam kết NM.`,
      });
    }, 800);
  };

  if (!hasRun) {
    return (
      <div className="rounded-card border border-surface-3 bg-surface-2 p-8 text-center">
        <p className="text-table text-text-2 mb-4">
          Chưa chạy Booking Netting cho <span className="font-semibold text-text-1">{cycleLabel}</span>.
          <br />
          Nguồn: S&OP locked v{sopVersion}.
        </p>
        <Button onClick={handleRun} disabled={running}>
          {running ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Đang chạy..." : "Chạy Booking Netting"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-bg text-success px-2.5 py-0.5 text-caption font-semibold">
            ● Booking {cycleLabel.replace("Tháng ", "T")} v{version} · Active
          </span>
          <span className="text-caption text-text-3">
            Linked S&OP v{sopVersion}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={handleRun} disabled={running}>
          <RefreshCw className={cn("h-3.5 w-3.5", running && "animate-spin")} />
          Chạy lại
        </Button>
      </div>

      <div className="rounded-card border border-surface-3 overflow-hidden bg-surface-2">
        <table className="w-full text-table">
          <thead className="bg-surface-1 text-table-header uppercase text-text-3">
            <tr>
              <th className="text-left px-3 py-2 font-medium">NM</th>
              <th className="text-right px-3 py-2 font-medium">FC 3M</th>
              <th className="text-right px-3 py-2 font-medium">Hub còn</th>
              <th className="text-right px-3 py-2 font-medium">Pipeline</th>
              <th className="text-right px-3 py-2 font-medium">Net Booking</th>
              <th className="text-left px-3 py-2 font-medium">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.nm} className={cn(i % 2 === 0 ? "bg-surface-2" : "bg-surface-0")}>
                <td className="px-3 py-2 font-medium text-text-1">{r.nm}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-text-1 hover:text-primary inline-flex items-center gap-1 underline-offset-2 hover:underline">
                        {r.fc3m.toLocaleString()}
                        <Info className="h-3 w-3 text-text-3" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 text-table-sm" align="end">
                      <div className="font-semibold text-text-1 mb-2">FC 3M — {r.nm}</div>
                      <div className="space-y-1">
                        <div className="flex justify-between"><span className="text-text-3">T5</span><span className="tabular-nums">{r.fcMonths.t5.toLocaleString()} m²</span></div>
                        <div className="flex justify-between"><span className="text-text-3">T6</span><span className="tabular-nums">{r.fcMonths.t6.toLocaleString()} m²</span></div>
                        <div className="flex justify-between"><span className="text-text-3">T7</span><span className="tabular-nums">{r.fcMonths.t7.toLocaleString()} m²</span></div>
                        <div className="flex justify-between border-t border-surface-3 pt-1 mt-1 font-semibold">
                          <span>Tổng</span><span className="tabular-nums">{r.fc3m.toLocaleString()} m²</span>
                        </div>
                      </div>
                      <div className="text-caption text-text-3 mt-2 pt-2 border-t border-surface-3">
                        Per S&OP v{sopVersion}
                      </div>
                    </PopoverContent>
                  </Popover>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-text-2">{r.hubAvail.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums text-text-2">{r.pipeline.toLocaleString()}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold text-warning">
                  {r.netBooking.toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center rounded-full bg-warning-bg text-warning px-2 py-0.5 text-caption font-medium">
                    Cần cam kết
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-surface-1 border-t border-surface-3">
            <tr className="font-semibold">
              <td className="px-3 py-2 text-text-1">TỔNG</td>
              <td className="px-3 py-2 text-right tabular-nums">{totals.fc3m.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums">{totals.hubAvail.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums">{totals.pipeline.toLocaleString()}</td>
              <td className="px-3 py-2 text-right tabular-nums text-warning">{totals.netBooking.toLocaleString()}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="rounded-card border border-info/30 bg-info-bg/40 p-3 text-caption text-text-2">
        <span className="font-semibold text-info">Công thức:</span>{" "}
        Net Booking = FC 3M − Hub Available − Pipeline.
        Click ô <span className="font-mono text-text-1">FC 3M</span> để xem phân tích T5/T6/T7.
        <br />
        <span className="text-text-3">
          Sau Booking → tab "Cam kết NM" pre-fill Net Booking qty cho mỗi NM × SKU.
        </span>
      </div>
    </div>
  );
}

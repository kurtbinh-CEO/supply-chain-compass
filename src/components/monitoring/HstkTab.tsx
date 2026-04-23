import { useState } from "react";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowUpDown, Cloud, RefreshCw } from "lucide-react";

// Heatmap data
const nodes = ["CN Mikado", "CN Toko", "CN PhúMỹ", "CN ĐôngAnh"];
const skus = ["SKU-001", "SKU-012", "SKU-045", "SKU-089", "SKU-112", "SKU-156", "SKU-201"];
const heatmapData: number[][] = [
  [12, 15, 8, 22, 3, 11, 19],
  [7, 2, 14, 9, 10, 13, 4],
  [1, 4, 2, 6, 0, 8, 12],
  [30, 28, 25, 32, 21, 24, 26],
];

function getCellColor(days: number) {
  if (days < 5) return "bg-danger text-white";
  if (days < 10) return "bg-warning text-white";
  return "bg-success text-white";
}

// Inventory data
interface InvRow {
  id: string;
  name: string;
  sku: string;
  onHand: number;
  reserved: number;
  committed: number;
  inTransit: number;
  available: number;
  ssGap: number;
  ssGapDelta: number;
  hstk: string;
  aging: "Healthy" | "Warning" | "Critical";
  synced: boolean;
}

const inventoryData: InvRow[] = [
  { id: "1", name: "Tile Ceramic 60×60", sku: "M-2045-WH-G", onHand: 1240, reserved: 200, committed: 450, inTransit: 800, available: 1390, ssGap: 1200, ssGapDelta: 190, hstk: "11.5d", aging: "Healthy", synced: true },
  { id: "2", name: "Polished Granite Black", sku: "G-8812-BK-P", onHand: 420, reserved: 50, committed: 310, inTransit: 0, available: 60, ssGap: 500, ssGapDelta: -440, hstk: "1.2d", aging: "Critical", synced: false },
  { id: "3", name: "Wood Plank Ash 20×120", sku: "W-5501-AS-M", onHand: 2100, reserved: 120, committed: 400, inTransit: 1200, available: 2780, ssGap: 1800, ssGapDelta: 980, hstk: "18.2d", aging: "Healthy", synced: true },
  { id: "4", name: "Marble Statuario 80×80", sku: "M-9902-ST-G", onHand: 155, reserved: 10, committed: 80, inTransit: 0, available: 65, ssGap: 80, ssGapDelta: -15, hstk: "7.4d", aging: "Warning", synced: true },
  { id: "5", name: "Cement Grey Matt", sku: "C-4801-GY-M", onHand: 3400, reserved: 1200, committed: 800, inTransit: 0, available: 1400, ssGap: 1200, ssGapDelta: 200, hstk: "10.1d", aging: "Healthy", synced: true },
];

type SortKey = keyof InvRow;

export function HstkTab() {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [correctionRow, setCorrectionRow] = useState<InvRow | null>(null);
  const [newQty, setNewQty] = useState("");
  const [reason, setReason] = useState("");

  const sorted = [...inventoryData].sort((a, b) => {
    const va = a[sortKey], vb = b[sortKey];
    if (typeof va === "number" && typeof vb === "number") return sortAsc ? va - vb : vb - va;
    return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleSubmitCorrection = () => {
    setCorrectionRow(null);
    setNewQty("");
    setReason("");
  };

  const SortHeader = ({ label, field, align = "left" }: { label: string; field: SortKey; align?: string }) => (
    <th
      className={cn("text-table-header uppercase text-text-3 px-4 py-3 cursor-pointer hover:text-text-1 select-none", align === "right" ? "text-right" : "text-left")}
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("h-3 w-3", sortKey === field ? "text-primary" : "text-text-3")} />
      </span>
    </th>
  );

  return (
    <div className="space-y-6">
      {/* Heatmap */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-section-header text-text-1">Inventory Health Heatmap</h2>
          <div className="flex items-center gap-4 text-table-sm">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-danger" /> Critical (&lt;5d)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-warning" /> Warning (&lt;10d)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-success" /> Optimal (≥10d)</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `140px repeat(${skus.length}, 1fr)` }}>
            {/* Header row */}
            <div />
            {skus.map((s) => (
              <div key={s} className="text-center text-table-header uppercase text-text-3 py-2">{s}</div>
            ))}
            {/* Data rows */}
            {nodes.map((node, ri) => (
              <>
                <div key={node} className="flex items-center text-table font-medium text-text-1 pr-3">{node}</div>
                {heatmapData[ri].map((val, ci) => (
                  <div
                    key={`${ri}-${ci}`}
                    className={cn("rounded-md flex items-center justify-center py-3 text-table font-semibold", getCellColor(val))}
                  >
                    {val}d
                  </div>
                ))}
              </>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-card border border-surface-3 bg-surface-2">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
          <h2 className="font-display text-section-header text-text-1">Inventory Detailed View</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Filter</Button>
            <Button variant="outline" size="sm">Export CSV</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3">
                <SortHeader label="Item & Variant" field="name" />
                <SortHeader label="On-Hand" field="onHand" align="right" />
                <SortHeader label="Reserved" field="reserved" align="right" />
                <SortHeader label="Committed" field="committed" align="right" />
                <SortHeader label="In-Transit" field="inTransit" align="right" />
                <SortHeader label="Available" field="available" align="right" />
                <SortHeader label="SS / Gap" field="ssGapDelta" align="right" />
                <SortHeader label="HSTK" field="hstk" align="right" />
                <SortHeader label="Aging" field="aging" />
                <th className="text-table-header uppercase text-text-3 px-4 py-3 text-center">Sync</th>
                <th className="text-table-header uppercase text-text-3 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => {
                // Rule 13 — row severity from aging + HSTK staleness
                const hstkDays = parseFloat(row.hstk);
                const severity: "shortage" | "watch" | "stale" | "ok" =
                  row.aging === "Critical"
                    ? "shortage"
                    : row.aging === "Warning"
                      ? "watch"
                      : !isNaN(hstkDays) && hstkDays > 15
                        ? "stale"
                        : "ok";
                return (
                  <tr
                    key={row.id}
                    data-severity={severity}
                    data-keyboard-row={`hstk-${row.id}`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && row.aging !== "Healthy") {
                        e.preventDefault();
                        setCorrectionRow(row);
                      }
                    }}
                    className={cn(
                      "border-b border-surface-3/50 hover:bg-surface-3 transition-colors outline-none",
                      i % 2 === 0 ? "bg-surface-0" : "bg-surface-2",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <span className="text-table font-medium text-text-1 block">{row.name}</span>
                        <span className="text-caption text-text-3 font-mono">{row.sku}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-table text-text-1 text-right tabular-nums font-medium">{row.onHand.toLocaleString()}</td>
                    <td className="px-4 py-3 text-table text-text-2 text-right tabular-nums">{row.reserved.toLocaleString()}</td>
                    <td className="px-4 py-3 text-table text-text-2 text-right tabular-nums">{row.committed.toLocaleString()}</td>
                    <td className={cn("px-4 py-3 text-table text-right tabular-nums font-medium", row.inTransit > 0 ? "text-primary" : "text-text-2")}>
                      {row.inTransit.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-table text-text-1 text-right tabular-nums font-bold">{row.available.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="tabular-nums">
                        <span className="text-table text-text-1">{row.ssGap.toLocaleString()}</span>
                        <span className={cn("text-table-sm font-medium block", row.ssGapDelta >= 0 ? "text-success" : "text-danger")}>
                          {row.ssGapDelta >= 0 ? "+" : ""}{row.ssGapDelta.toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-table text-text-1 text-right tabular-nums">{row.hstk}</td>
                    <td className="px-4 py-3">
                      <StatusChip
                        status={row.aging === "Critical" ? "danger" : row.aging === "Warning" ? "warning" : "success"}
                        label={row.aging}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.synced ? (
                        <Cloud className="h-4 w-4 text-success mx-auto" />
                      ) : (
                        <RefreshCw className="h-4 w-4 text-warning mx-auto animate-spin" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.aging !== "Healthy" && (
                        <Button size="sm" variant="default" className="text-caption bg-text-1 text-surface-0 hover:bg-text-2" onClick={() => setCorrectionRow(row)}>
                          Planning correction
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-surface-3 flex items-center justify-between text-table-sm text-text-3">
          <span>Showing 1-5 of 156 items across 4 nodes</span>
          <div className="flex gap-1">
            {["←", "1", "2", "3", "→"].map((p) => (
              <button key={p} className={cn("h-7 w-7 rounded-md text-table-sm font-medium", p === "1" ? "bg-primary text-primary-foreground" : "hover:bg-surface-3 text-text-2")}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Planning Correction Modal */}
      <Dialog open={!!correctionRow} onOpenChange={() => setCorrectionRow(null)}>
        <DialogContent className="bg-surface-2 border-surface-3">
          <DialogHeader>
            <DialogTitle className="font-display text-text-1">Planning Correction</DialogTitle>
            <DialogDescription className="text-text-2 text-table">
              Điều chỉnh số lượng cho {correctionRow?.name}
            </DialogDescription>
          </DialogHeader>
          {correctionRow && (
            <div className="space-y-4">
              <div className="rounded-md bg-surface-0 border border-surface-3 p-3 flex justify-between text-table">
                <span className="text-text-2">Hiện tại: <strong className="text-text-1">{correctionRow.available.toLocaleString()}</strong></span>
                <StatusChip status={correctionRow.aging === "Critical" ? "danger" : "warning"} label={correctionRow.aging} />
              </div>
              <div>
                <label className="text-table-sm font-medium text-text-2 mb-1.5 block">Số lượng mới</label>
                <input
                  type="number"
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  placeholder="Nhập số lượng..."
                  className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-table-sm font-medium text-text-2 mb-1.5 block">Lý do</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập lý do điều chỉnh..."
                  rows={3}
                  className="w-full rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCorrectionRow(null)}>Hủy</Button>
            <Button className="bg-gradient-primary text-primary-foreground" onClick={handleSubmitCorrection}>Gửi điều chỉnh</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

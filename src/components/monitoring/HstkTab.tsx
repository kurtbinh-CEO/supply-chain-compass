import { useState } from "react";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Cloud, RefreshCw, PackageSearch } from "lucide-react";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";

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

export function HstkTab() {
  const [correctionRow, setCorrectionRow] = useState<InvRow | null>(null);
  const [newQty, setNewQty] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmitCorrection = () => {
    setCorrectionRow(null);
    setNewQty("");
    setReason("");
  };

  const columns: SmartTableColumn<InvRow>[] = [
    {
      key: "name", label: "Item & Variant", sortable: true, hideable: false, priority: "high",
      filter: "text", width: 220, accessor: (r) => `${r.name} ${r.sku}`,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-table font-medium text-text-1">{r.name}</span>
          <span className="text-caption text-text-3 font-mono">{r.sku}</span>
        </div>
      ),
    },
    {
      key: "onHand", label: "On-Hand", sortable: true, hideable: true, priority: "high",
      numeric: true, align: "right", width: 110,
      render: (r) => <span className="tabular-nums font-medium text-text-1">{r.onHand.toLocaleString()}</span>,
    },
    {
      key: "reserved", label: "Reserved", sortable: true, hideable: true, priority: "low",
      numeric: true, align: "right", width: 110,
      render: (r) => <span className="tabular-nums text-text-2">{r.reserved.toLocaleString()}</span>,
    },
    {
      key: "committed", label: "Committed", sortable: true, hideable: true, priority: "medium",
      numeric: true, align: "right", width: 110,
      render: (r) => <span className="tabular-nums text-text-2">{r.committed.toLocaleString()}</span>,
    },
    {
      key: "inTransit", label: "In-Transit", sortable: true, hideable: true, priority: "medium",
      numeric: true, align: "right", width: 110,
      render: (r) => (
        <span className={cn("tabular-nums font-medium", r.inTransit > 0 ? "text-primary" : "text-text-2")}>
          {r.inTransit.toLocaleString()}
        </span>
      ),
    },
    {
      key: "available", label: "Available", sortable: true, hideable: false, priority: "high",
      numeric: true, align: "right", width: 110,
      render: (r) => <span className="tabular-nums font-bold text-text-1">{r.available.toLocaleString()}</span>,
    },
    {
      key: "ssGapDelta", label: "SS / Gap", sortable: true, hideable: true, priority: "high",
      numeric: true, align: "right", width: 130,
      render: (r) => (
        <div className="tabular-nums">
          <span className="text-table text-text-1">{r.ssGap.toLocaleString()}</span>
          <span className={cn("text-table-sm font-medium block", r.ssGapDelta >= 0 ? "text-success" : "text-danger")}>
            {r.ssGapDelta >= 0 ? "+" : ""}{r.ssGapDelta.toLocaleString()}
          </span>
        </div>
      ),
    },
    {
      key: "hstk", label: "HSTK", sortable: true, hideable: true, priority: "medium",
      numeric: true, align: "right", width: 90, accessor: (r) => parseFloat(r.hstk),
      render: (r) => <span className="tabular-nums text-text-1">{r.hstk}</span>,
    },
    {
      key: "aging", label: "Aging", sortable: true, hideable: false, priority: "high",
      align: "center", width: 110, accessor: (r) => r.aging,
      filter: "enum",
      filterOptions: [
        { value: "Critical", label: "🔴 Critical" },
        { value: "Warning",  label: "🟡 Warning" },
        { value: "Healthy",  label: "🟢 Healthy" },
      ],
      render: (r) => (
        <StatusChip
          status={r.aging === "Critical" ? "danger" : r.aging === "Warning" ? "warning" : "success"}
          label={r.aging}
        />
      ),
    },
    {
      key: "synced", label: "Sync", sortable: true, hideable: true, priority: "low",
      align: "center", width: 70, accessor: (r) => (r.synced ? 1 : 0),
      render: (r) => r.synced
        ? <Cloud className="h-4 w-4 text-success mx-auto" />
        : <RefreshCw className="h-4 w-4 text-warning mx-auto animate-spin" />,
    },
    {
      key: "action", label: "Hành động", sortable: false, hideable: false, priority: "high",
      align: "center", width: 160,
      render: (r) => r.aging !== "Healthy" ? (
        <Button
          size="sm"
          variant="default"
          className="text-caption bg-text-1 text-surface-0 hover:bg-text-2 h-7"
          onClick={(e) => { e.stopPropagation(); setCorrectionRow(r); }}
        >
          Planning correction
        </Button>
      ) : <span className="text-caption text-text-3">—</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Heatmap */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="font-display text-section-header text-text-1">Inventory Health Heatmap</h2>
          <div className="flex items-center gap-4 text-table-sm">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-danger" /> Critical (&lt;5d)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-warning" /> Warning (&lt;10d)</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-success" /> Optimal (≥10d)</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `140px repeat(${skus.length}, 1fr)` }}>
            <div />
            {skus.map((s) => (
              <div key={s} className="text-center text-table-header uppercase text-text-3 py-2">{s}</div>
            ))}
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

      {/* Inventory Table — SmartTable */}
      <SmartTable<InvRow>
        screenId="monitoring-hstk-inventory"
        title="Chi tiết tồn kho"
        exportFilename="hstk-inventory-detail"
        columns={columns}
        data={inventoryData}
        defaultDensity="compact"
        getRowId={(r) => r.id}
        rowSeverity={(r) => {
          const hstkDays = parseFloat(r.hstk);
          if (r.aging === "Critical") return "shortage";
          if (r.aging === "Warning")  return "watch";
          if (!isNaN(hstkDays) && hstkDays > 15) return "stale";
          return "ok";
        }}
        emptyState={{
          icon: <PackageSearch />,
          title: "Không có item phù hợp",
          description: "Bộ lọc Aging hoặc tìm kiếm hiện đang ẩn toàn bộ items. Xoá lọc để xem lại 156 items trên 4 nodes.",
        }}
      />

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

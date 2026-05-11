/**
 * InventoryBucketsCard — Hiển thị 5 cột phân rã tồn kho từ DB inventory.
 *
 * Công thức (locked decision):
 *   Available = Physical (quantity) − Reserved (hard) − Quarantine − Soft-Reserved
 *
 * Không động vào: compare, time-range, change-log của InventoryPage cũ.
 */
import { useMemo, useState } from "react";
import { Loader2, Layers, Info } from "lucide-react";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { SummaryCards, type SummaryCard } from "@/components/SummaryCards";
import { useInventoryData, type InventoryBucketRow } from "@/hooks/useInventoryData";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const fmt = (n: number) => n.toLocaleString("vi-VN");

const FORMULA =
  "Available = Physical (quantity) − Reserved (hard) − Quarantine − Soft-Reserved";

export function InventoryBucketsCard() {
  const { bucketRows, bucketTotals, loading } = useInventoryData();
  const [showAll, setShowAll] = useState(false);

  const columns: SmartTableColumn<InventoryBucketRow>[] = useMemo(
    () => [
      {
        key: "warehouse_code",
        label: "Kho",
        sortable: true,
        filter: "text",
        width: 110,
        priority: "high",
        render: (r) => (
          <span className="font-mono text-table-sm text-text-1">{r.warehouse_code}</span>
        ),
      },
      {
        key: "sku",
        label: "SKU",
        sortable: true,
        filter: "text",
        width: 160,
        priority: "high",
        render: (r) => <span className="text-table-sm text-text-1">{r.sku}</span>,
      },
      {
        key: "quantity",
        label: "Physical",
        numeric: true,
        align: "right",
        sortable: true,
        width: 110,
        priority: "high",
        render: (r) => (
          <span className="tabular-nums text-text-2">{fmt(r.quantity)}</span>
        ),
      },
      {
        key: "reserved_hard",
        label: "Reserved",
        numeric: true,
        align: "right",
        sortable: true,
        width: 110,
        priority: "medium",
        render: (r) => (
          <span className="tabular-nums text-warning">{fmt(r.reserved_hard)}</span>
        ),
      },
      {
        key: "quarantine",
        label: "Quarantine",
        numeric: true,
        align: "right",
        sortable: true,
        width: 110,
        priority: "medium",
        render: (r) => (
          <span className="tabular-nums text-danger">{fmt(r.quarantine)}</span>
        ),
      },
      {
        key: "soft_reserved",
        label: "Soft-Reserved",
        numeric: true,
        align: "right",
        sortable: true,
        width: 130,
        priority: "medium",
        render: (r) => (
          <span className="tabular-nums text-info">{fmt(r.soft_reserved)}</span>
        ),
      },
      {
        key: "available",
        label: "Available",
        numeric: true,
        align: "right",
        sortable: true,
        width: 120,
        priority: "high",
        render: (r) => (
          <span
            className={
              r.available <= 0
                ? "tabular-nums font-bold text-danger"
                : "tabular-nums font-bold text-success"
            }
          >
            {fmt(r.available)}
          </span>
        ),
      },
    ],
    [],
  );

  const cards: SummaryCard[] = [
    {
      key: "physical",
      label: "Physical",
      value: fmt(bucketTotals.quantity),
      unit: "u",
      severity: "ok",
      tooltip: "Tổng tồn vật lý (quantity) — chưa trừ reserved.",
    },
    {
      key: "reserved",
      label: "Reserved (hard)",
      value: fmt(bucketTotals.reserved_hard),
      unit: "u",
      severity: bucketTotals.reserved_hard > 0 ? "warn" : "ok",
      tooltip: "Đã giữ chỗ chắc chắn cho đơn đã xác nhận.",
    },
    {
      key: "quarantine",
      label: "Quarantine",
      value: fmt(bucketTotals.quarantine),
      unit: "u",
      severity: bucketTotals.quarantine > 0 ? "critical" : "ok",
      tooltip: "Hàng đang cách ly / chờ QC — không dùng được.",
    },
    {
      key: "soft",
      label: "Soft-Reserved",
      value: fmt(bucketTotals.soft_reserved),
      unit: "u",
      severity: "ok",
      tooltip: "Giữ mềm cho dự báo / kế hoạch — có thể giải phóng.",
    },
    {
      key: "available",
      label: "Available",
      value: fmt(bucketTotals.available),
      unit: "u",
      severity: bucketTotals.available <= 0 ? "critical" : "ok",
      tooltip: FORMULA,
    },
  ];

  const visibleRows = showAll ? bucketRows : bucketRows.slice(0, 20);

  return (
    <section className="space-y-3 mb-6 rounded-card border border-surface-3 bg-surface-1 p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-info" />
          <h2 className="font-display font-semibold text-text-1">
            Inventory buckets (DB live)
          </h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center text-text-3 hover:text-info"
                  aria-label="Công thức Available"
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <div className="space-y-1">
                  <div className="font-semibold">Công thức Available</div>
                  <div className="font-mono text-caption">{FORMULA}</div>
                  <div className="text-caption text-text-3">
                    Cập nhật realtime từ bảng <code>inventory</code>.
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {loading && (
          <span className="inline-flex items-center gap-1 text-table-sm text-text-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải…
          </span>
        )}
      </header>

      <SummaryCards screenId="inv-buckets" cards={cards} />

      <SmartTable<InventoryBucketRow>
        screenId="inventory-buckets"
        title="Phân rã tồn kho theo bucket"
        exportFilename="inventory-buckets"
        columns={columns}
        data={visibleRows}
        defaultDensity="compact"
        getRowId={(r) => r.id}
        rowSeverity={(r) =>
          r.available <= 0 ? "shortage" : r.available < r.safety_stock ? "watch" : "ok"
        }
        summaryRow={{
          warehouse_code: <span className="font-semibold">Σ Tổng</span>,
          quantity: (
            <span className="tabular-nums font-semibold">{fmt(bucketTotals.quantity)}</span>
          ),
          reserved_hard: (
            <span className="tabular-nums font-semibold text-warning">
              {fmt(bucketTotals.reserved_hard)}
            </span>
          ),
          quarantine: (
            <span className="tabular-nums font-semibold text-danger">
              {fmt(bucketTotals.quarantine)}
            </span>
          ),
          soft_reserved: (
            <span className="tabular-nums font-semibold text-info">
              {fmt(bucketTotals.soft_reserved)}
            </span>
          ),
          available: (
            <span
              className={
                bucketTotals.available <= 0
                  ? "tabular-nums font-bold text-danger"
                  : "tabular-nums font-bold text-success"
              }
            >
              {fmt(bucketTotals.available)}
            </span>
          ),
        }}
        emptyState={{
          icon: <Layers />,
          title: "Chưa có dữ liệu inventory trong DB",
          description:
            "Tải lên hoặc đồng bộ Bravo để thấy 5 bucket: Physical · Reserved · Quarantine · Soft-Reserved · Available.",
        }}
      />

      {bucketRows.length > 20 && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="text-table-sm text-info hover:underline"
          >
            {showAll ? "Thu gọn" : `Xem tất cả ${bucketRows.length} dòng`}
          </button>
        </div>
      )}
    </section>
  );
}

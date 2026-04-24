import { useMemo, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TO_DRAFT, BRANCHES, SKU_BASES, type ToDraftRow } from "@/data/unis-enterprise-dataset";
import { PoLifecycleStepper, stageFromStatus } from "./PoLifecycleStepper";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";

const STATUS_META: Record<ToDraftRow["status"], { label: string; tone: string }> = {
  draft:     { label: "NHÁP",         tone: "bg-surface-2 text-text-2 border-surface-3" },
  confirmed: { label: "ĐÃ XÁC NHẬN", tone: "bg-info-bg text-primary border-primary/30" },
  shipped:   { label: "ĐÃ GỬI",      tone: "bg-warning-bg text-warning border-warning/30" },
  received:  { label: "ĐÃ NHẬN",     tone: "bg-success-bg text-success border-success/30" },
};

const fmt = (n: number) => `${n.toLocaleString("vi-VN")} m²`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

function cnName(code: string): string {
  return BRANCHES.find((b) => b.code === code)?.name ?? code;
}

/** Pseudo variant suffix for display (TO_DRAFT only stores SKU base). */
function variantTail(toNumber: string): string {
  const tails = ["A4", "B2", "C1", "D5", "N1"];
  let h = 0;
  for (let i = 0; i < toNumber.length; i++) h = (h * 31 + toNumber.charCodeAt(i)) >>> 0;
  return tails[h % tails.length];
}

export function TransferOrdersTab() {
  const [statusFilter, setStatusFilter] = useState<"all" | ToDraftRow["status"]>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: TO_DRAFT.length, draft: 0, confirmed: 0, shipped: 0, received: 0 };
    TO_DRAFT.forEach((r) => { c[r.status]++; });
    return c;
  }, []);

  const rows = useMemo(
    () => (statusFilter === "all" ? TO_DRAFT : TO_DRAFT.filter((r) => r.status === statusFilter)),
    [statusFilter]
  );

  const totalQty = rows.reduce((s, r) => s + r.qtyM2, 0);

  const columns: SmartTableColumn<ToDraftRow>[] = [
    {
      key: "toNumber", label: "Số TO", sortable: true, hideable: false, priority: "high",
      filter: "text", width: 180,
      render: (r) => <span className="font-mono text-text-1">{r.toNumber}</span>,
    },
    {
      key: "fromCn", label: "CN nguồn", sortable: true, hideable: true, priority: "high",
      width: 160, accessor: (r) => cnName(r.fromCn),
      filter: "text",
      render: (r) => (
        <span className="text-text-2">
          {cnName(r.fromCn)} <span className="text-text-3">({r.fromCn})</span>
        </span>
      ),
    },
    {
      key: "toCn", label: "CN đích", sortable: true, hideable: true, priority: "high",
      width: 160, accessor: (r) => cnName(r.toCn),
      filter: "text",
      render: (r) => (
        <span className="text-text-2">
          {cnName(r.toCn)} <span className="text-text-3">({r.toCn})</span>
        </span>
      ),
    },
    {
      key: "skuBaseCode", label: "Mã hàng + đuôi", sortable: true, hideable: true, priority: "medium",
      filter: "text", width: 170,
      render: (r) => (
        <span>
          <span className="font-mono text-text-1">{r.skuBaseCode}</span>
          <span className="text-text-3"> · {variantTail(r.toNumber)}</span>
        </span>
      ),
    },
    {
      key: "qtyM2", label: "Số lượng", sortable: true, hideable: false, priority: "high",
      numeric: true, align: "right", width: 130,
      render: (r) => <span className="tabular-nums text-text-1">{fmt(r.qtyM2)}</span>,
    },
    {
      key: "status", label: "Trạng thái", sortable: true, hideable: false, priority: "high",
      align: "center", width: 140, accessor: (r) => r.status,
      filter: "enum",
      filterOptions: [
        { value: "draft", label: "Nháp" },
        { value: "confirmed", label: "Đã xác nhận" },
        { value: "shipped", label: "Đã gửi" },
        { value: "received", label: "Đã nhận" },
      ],
      render: (r) => {
        const meta = STATUS_META[r.status];
        return (
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-semibold", meta.tone)}>
            {meta.label}
          </span>
        );
      },
    },
    {
      key: "distanceKm", label: "Khoảng cách", sortable: true, hideable: true, priority: "low",
      numeric: true, align: "center", width: 120,
      render: (r) => <span className="text-text-2 tabular-nums">{r.distanceKm} km</span>,
    },
    {
      key: "expectedDate", label: "ETA", sortable: true, hideable: true, priority: "medium",
      align: "center", width: 100, accessor: (r) => r.expectedDate,
      render: (r) => <span className="text-text-2">{fmtDate(r.expectedDate)}</span>,
    },
  ];

  return (
    <div className="animate-fade-in space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-text-2" />
          <p className="text-table-sm font-semibold text-text-1">Chuyển ngang giữa CN (LCNB)</p>
          <span className="text-caption text-text-3 ml-1">{rows.length} TO · {fmt(totalQty)}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["all", "draft", "confirmed", "shipped", "received"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={cn(
                "rounded-full px-3 py-1 text-caption font-medium transition-colors border",
                statusFilter === k
                  ? "bg-gradient-primary text-primary-foreground border-transparent"
                  : "bg-surface-1 text-text-2 border-surface-3 hover:text-text-1"
              )}
            >
              {k === "all" ? "Tất cả" : STATUS_META[k].label} ({counts[k] ?? 0})
            </button>
          ))}
        </div>
      </div>

      <SmartTable<ToDraftRow>
        screenId="orders-transfer-list"
        title="Danh sách lệnh điều chuyển (TO)"
        exportFilename="lenh-dieu-chuyen-to"
        columns={columns}
        data={rows}
        defaultDensity="normal"
        getRowId={(r) => r.toNumber}
        rowSeverity={(r) =>
          r.status === "received" ? "ok" :
          r.status === "shipped" ? "watch" :
          r.status === "draft" ? "overdue" : undefined
        }
        emptyState={{
          title: "Không có TO nào",
          description: "Không có lệnh điều chuyển nào ở trạng thái này.",
        }}
        drillDown={(r) => {
          const base = SKU_BASES.find((b) => b.code === r.skuBaseCode);
          return (
            <div className="space-y-3 px-2 py-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-table-sm">
                <div>
                  <p className="text-caption text-text-3 uppercase tracking-wider">Sản phẩm</p>
                  <p className="text-text-1 font-medium">{base?.name ?? r.skuBaseCode}</p>
                </div>
                <div>
                  <p className="text-caption text-text-3 uppercase tracking-wider">LT vận chuyển</p>
                  <p className="text-text-1 font-medium">{r.ltDays} ngày</p>
                </div>
                <div>
                  <p className="text-caption text-text-3 uppercase tracking-wider">Loại điều chuyển</p>
                  <p className="text-text-1 font-medium">LCNB · L0 (ưu tiên)</p>
                </div>
                <div>
                  <p className="text-caption text-text-3 uppercase tracking-wider">Ngày dự kiến nhận</p>
                  <p className="text-text-1 font-medium">{fmtDate(r.expectedDate)}</p>
                </div>
              </div>
              <div>
                <p className="text-caption text-text-3 uppercase tracking-wider mb-2">Vòng đời TO</p>
                <PoLifecycleStepper currentStage={stageFromStatus(r.status)} />
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  ArrowRight,
  Truck,
  AlertTriangle,
  Search,
  PlusCircle,
  Bell,
  CheckCircle2,
  Sparkles,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/WorkspaceContext";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import {
  TO_DRAFT,
  DRP_RESULTS,
  BRANCHES,
  SKU_BASES,
  type ToDraftRow,
  type DrpResultRow,
} from "@/data/unis-enterprise-dataset";

type ExceptionRow = DrpResultRow & {
  allocated: number;
  required: number;
  shortage: number;
  fillPct: number;
};

const fmt = (n: number) => `${n.toLocaleString("vi-VN")} m²`;
const cnName = (code: string) => BRANCHES.find((b) => b.code === code)?.name ?? code;
const skuLabel = (code: string) => {
  const b = SKU_BASES.find((s) => s.code === code);
  return b ? `${b.code}` : code;
};

/* ───── LCNB Opportunity Card ───── */
function LcnbCard({
  to,
  confirmed,
  onConfirm,
}: {
  to: ToDraftRow;
  confirmed: boolean;
  onConfirm: () => void;
}) {
  const savings = Math.round(to.qtyM2 * 0.045); // ~4.5%/m² estimated saving vs new PO (mock)
  return (
    <div
      className={cn(
        "rounded-card border p-4 space-y-3 transition-all",
        confirmed
          ? "border-success/40 bg-success/5"
          : "border-surface-3 bg-surface-1 hover:border-primary/40 hover:shadow-sm",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-table-sm text-text-1">{to.toNumber}</p>
          <p className="text-caption text-text-3 mt-0.5 flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {to.distanceKm} km · LT {to.ltDays} ngày
          </p>
        </div>
        {confirmed ? (
          <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-caption font-bold text-success inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> CONFIRMED
          </span>
        ) : (
          <span className="rounded-full border border-primary/30 bg-info-bg px-2 py-0.5 text-caption font-bold text-primary inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> OPPORTUNITY
          </span>
        )}
      </div>

      <div className="rounded-button bg-surface-2 p-3 flex items-center justify-between">
        <div className="text-center">
          <p className="text-caption text-text-3 uppercase tracking-wider">Từ</p>
          <p className="text-table font-semibold text-text-1 mt-0.5">{cnName(to.fromCn)}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-text-3" />
        <div className="text-center">
          <p className="text-caption text-text-3 uppercase tracking-wider">Đến</p>
          <p className="text-table font-semibold text-text-1 mt-0.5">{cnName(to.toCn)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-table-sm">
        <div>
          <p className="text-caption text-text-3">Variant</p>
          <p className="font-mono text-text-1 mt-0.5">{skuLabel(to.skuBaseCode)}</p>
        </div>
        <div className="text-right">
          <p className="text-caption text-text-3">Số lượng</p>
          <p className="font-mono font-semibold text-text-1 mt-0.5">{fmt(to.qtyM2)}</p>
        </div>
      </div>

      <div className="rounded-button bg-success/5 border border-success/20 px-2.5 py-1.5 text-caption text-success flex items-center justify-between">
        <span>💡 Tiết kiệm ước tính</span>
        <span className="font-mono font-semibold">~{savings.toLocaleString()}M₫</span>
      </div>

      <Button
        size="sm"
        onClick={onConfirm}
        disabled={confirmed}
        className="w-full"
        variant={confirmed ? "secondary" : "default"}
      >
        {confirmed ? "Đã xác nhận" : "Xác nhận LCNB"}
      </Button>
    </div>
  );
}

/* ───── Exception row action menu ───── */
function ExceptionActions({ row }: { row: DrpResultRow }) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => toast.success(`Đang tìm LCNB cho ${row.skuBaseCode} @ ${cnName(row.cnCode)}`, { description: "Quét tồn kho các CN lân cận..." })}
        className="rounded-button border border-surface-3 bg-surface-0 px-2 py-1 text-caption font-medium text-primary hover:bg-info-bg transition-colors inline-flex items-center gap-1"
        title="Tìm LCNB"
      >
        <Search className="h-3 w-3" /> Tìm LCNB
      </button>
      <button
        onClick={() => toast.success(`Đã tạo PO mới cho ${row.skuBaseCode}`, { description: `Qty ${fmt(row.netReqM2)} → chờ duyệt SC Manager.` })}
        className="rounded-button border border-surface-3 bg-surface-0 px-2 py-1 text-caption font-medium text-text-1 hover:bg-surface-2 transition-colors inline-flex items-center gap-1"
        title="Tạo PO"
      >
        <PlusCircle className="h-3 w-3" /> Tạo PO
      </button>
      <button
        onClick={() => toast(`Đã escalate lên SC Manager`, { description: `${row.skuBaseCode} @ ${cnName(row.cnCode)} — thiếu ${fmt(row.netReqM2)}` })}
        className="rounded-button border border-warning/30 bg-warning/10 px-2 py-1 text-caption font-medium text-warning hover:bg-warning/20 transition-colors inline-flex items-center gap-1"
        title="Escalate"
      >
        <Bell className="h-3 w-3" /> Escalate
      </button>
    </div>
  );
}

export default function AllocationPage() {
  const navigate = useNavigate();
  const { addNotification } = useWorkspace();
  const [confirmedTos, setConfirmedTos] = useState<Set<string>>(new Set());

  // LCNB Opportunities = TO_DRAFT in draft/confirmed status (still actionable)
  const opportunities = useMemo(
    () => TO_DRAFT.filter((t) => t.status === "draft" || t.status === "confirmed"),
    [],
  );

  // Exceptions = DRP results not OK (fill < 100%)
  const exceptions = useMemo(
    () =>
      DRP_RESULTS
        .filter((d) => d.status !== "OK" && d.netReqM2 > 0)
        .map((d) => {
          const allocated = Math.max(0, d.onHandM2 + d.inTransitM2 - d.ssM2);
          const required = d.fcM2;
          const shortage = Math.max(0, d.netReqM2);
          const fillPct = required > 0 ? Math.round((allocated / required) * 100) : 100;
          return { ...d, allocated, required, shortage, fillPct };
        })
        .sort((a, b) => b.shortage - a.shortage),
    [],
  );

  const handleConfirmTo = (to: ToDraftRow) => {
    setConfirmedTos((prev) => new Set(prev).add(to.toNumber));
    toast.success(`Đã confirm ${to.toNumber}`, {
      description: `${cnName(to.fromCn)} → ${cnName(to.toCn)} · ${fmt(to.qtyM2)} ${to.skuBaseCode}`,
    });
    addNotification({
      id: `NTF-LCNB-${Date.now()}`,
      type: "TO_SOURCE",
      typeColor: "success",
      message: `LCNB confirmed: ${to.toNumber} · ${cnName(to.fromCn)} → ${cnName(to.toCn)} · ${fmt(to.qtyM2)} ${to.skuBaseCode}`,
      timeAgo: "vừa xong",
      read: false,
      url: "/allocation",
    });
  };

  const exceptionColumns: SmartTableColumn<ExceptionRow>[] = [
    {
      key: "cnCode", label: "CN", sortable: true, hideable: false, priority: "high",
      filter: "text", width: 140, accessor: (r) => cnName(r.cnCode),
      render: (r) => <span className="font-medium text-text-1">{cnName(r.cnCode)}</span>,
    },
    {
      key: "skuBaseCode", label: "SKU", sortable: true, hideable: false, priority: "high",
      filter: "text", width: 130,
      render: (r) => <span className="font-mono text-text-1">{r.skuBaseCode}</span>,
    },
    {
      key: "netReqM2", label: "Net Req", sortable: true, hideable: true, priority: "medium",
      numeric: true, align: "right", width: 130,
      render: (r) => <span className="font-mono text-text-1">{fmt(r.netReqM2)}</span>,
    },
    {
      key: "allocated", label: "Allocated", sortable: true, hideable: true, priority: "medium",
      numeric: true, align: "right", width: 130,
      render: (r) => <span className="font-mono text-text-2">{fmt(r.allocated)}</span>,
    },
    {
      key: "shortage", label: "Shortage", sortable: true, hideable: false, priority: "high",
      numeric: true, align: "right", width: 130, accessor: (r) => r.shortage,
      render: (r) => {
        const isShortage = r.status === "SHORTAGE";
        return (
          <span className={cn("font-mono font-semibold", isShortage ? "text-danger" : "text-warning")}>
            −{fmt(r.shortage)}
          </span>
        );
      },
    },
    {
      key: "fillPct", label: "Fill %", sortable: true, hideable: false, priority: "high",
      align: "center", numeric: true, width: 100, accessor: (r) => r.fillPct,
      render: (r) => (
        <span className={cn(
          "rounded-full px-2 py-0.5 text-caption font-bold",
          r.fillPct >= 80 ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger",
        )}>
          {r.fillPct}%
        </span>
      ),
    },
    {
      key: "status", label: "Trạng thái", sortable: true, hideable: true, priority: "medium",
      width: 130, accessor: (r) => r.status,
      filter: "enum",
      filterOptions: [
        { value: "SHORTAGE", label: "Thiếu hàng" },
        { value: "PARTIAL", label: "Một phần" },
        { value: "WATCH", label: "Theo dõi" },
      ],
      render: (r) => <span className="text-text-2">{r.status}</span>,
    },
    {
      key: "actions", label: "Hành động", sortable: false, hideable: false,
      align: "left", width: 300,
      render: (r) => <ExceptionActions row={r} />,
    },
  ];

  return (
    <div className="p-8 max-w-screen-2xl mx-auto">
      <Link
        to="/drp"
        className="inline-flex items-center gap-1 text-table-sm text-text-3 hover:text-primary transition-colors mb-3"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Quay lại DRP
      </Link>

      <ScreenHeader
        title="Phân bổ"
        subtitle={`F2-B4 · 6-layer LCNB first · ${opportunities.length} cơ hội · ${exceptions.length} ngoại lệ`}
      />

      {/* SECTION 1: LCNB Opportunities */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-section-header text-text-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              LCNB Opportunities
            </h2>
            <p className="text-caption text-text-3 mt-0.5">
              Liên Chi Nhánh Bridging — chuyển nội bộ trước khi đặt PO mới
            </p>
          </div>
          <span className="text-caption text-text-3">
            {confirmedTos.size}/{opportunities.length} đã xác nhận
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {opportunities.map((to) => (
            <LcnbCard
              key={to.toNumber}
              to={to}
              confirmed={confirmedTos.has(to.toNumber)}
              onConfirm={() => handleConfirmTo(to)}
            />
          ))}
        </div>
      </section>

      {/* SECTION 2: Exceptions */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-section-header text-text-1 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Exceptions — Fill &lt; 100%
            </h2>
            <p className="text-caption text-text-3 mt-0.5">
              CN×SKU không đủ tồn kho/transit để cover demand
            </p>
          </div>
        </div>

        <SmartTable<ExceptionRow>
          screenId="allocation-exceptions"
          title="Ngoại lệ phân bổ — Fill < 100%"
          exportFilename="ngoai-le-phan-bo"
          columns={exceptionColumns}
          data={exceptions}
          defaultDensity="compact"
          getRowId={(r) => `${r.cnCode}-${r.skuBaseCode}`}
          rowSeverity={(r) => r.status === "SHORTAGE" ? "shortage" : "watch"}
          emptyState={{
            title: "Không có ngoại lệ",
            description: "🎉 Tất cả CN × SKU đều đủ tồn kho.",
          }}
        />
      </section>

      {/* Bước tiếp */}
      <button
        onClick={() => navigate("/transport")}
        className="mt-6 w-full rounded-card border border-primary/30 bg-primary/5 px-5 py-3 flex items-center justify-between hover:bg-primary/10 transition-colors group"
      >
        <div className="text-left">
          <div className="text-caption text-text-3 uppercase tracking-wider">Bước tiếp</div>
          <div className="text-table font-semibold text-text-1 mt-0.5 flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-primary" />
            Phân bổ xong → Đóng hàng & lập tuyến container
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-primary font-medium text-table-sm">
          Mở Transport <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

      <ScreenFooter actionCount={opportunities.length + exceptions.length} />
    </div>
  );
}

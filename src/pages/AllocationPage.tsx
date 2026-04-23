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
import {
  TO_DRAFT,
  DRP_RESULTS,
  BRANCHES,
  SKU_BASES,
  type ToDraftRow,
  type DrpResultRow,
} from "@/data/unis-enterprise-dataset";

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
        {confirmed ? "Đã xác nhận" : "Confirm LCNB"}
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

        <div className="rounded-card border border-surface-3 bg-surface-1 overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-2/50 border-b border-surface-3">
              <tr className="text-table-sm text-text-3 text-left">
                <th className="px-4 py-2.5 font-medium">CN</th>
                <th className="px-4 py-2.5 font-medium">SKU</th>
                <th className="px-4 py-2.5 font-medium text-right">Net Req</th>
                <th className="px-4 py-2.5 font-medium text-right">Allocated</th>
                <th className="px-4 py-2.5 font-medium text-right">Shortage</th>
                <th className="px-4 py-2.5 font-medium text-center">Fill%</th>
                <th className="px-4 py-2.5 font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {exceptions.map((row) => {
                const isShortage = row.status === "SHORTAGE";
                return (
                  <tr
                    key={`${row.cnCode}-${row.skuBaseCode}`}
                    className={cn(
                      "border-b border-surface-3 transition-colors hover:bg-surface-2/30",
                      isShortage && "bg-danger/5",
                    )}
                    data-severity={isShortage ? "shortage" : "watch"}
                  >
                    <td className="px-4 py-3 text-table-sm text-text-1 font-medium">{cnName(row.cnCode)}</td>
                    <td className="px-4 py-3 text-table-sm font-mono text-text-1">{row.skuBaseCode}</td>
                    <td className="px-4 py-3 text-table-sm font-mono text-right text-text-1">{fmt(row.netReqM2)}</td>
                    <td className="px-4 py-3 text-table-sm font-mono text-right text-text-2">{fmt(row.allocated)}</td>
                    <td className={cn("px-4 py-3 text-table-sm font-mono text-right font-semibold", isShortage ? "text-danger" : "text-warning")}>
                      −{fmt(row.shortage)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-caption font-bold",
                        row.fillPct >= 80 ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger",
                      )}>
                        {row.fillPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3"><ExceptionActions row={row} /></td>
                  </tr>
                );
              })}
              {exceptions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-table-sm text-text-3">
                    🎉 Không có ngoại lệ — tất cả CN×SKU đều đủ tồn kho.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

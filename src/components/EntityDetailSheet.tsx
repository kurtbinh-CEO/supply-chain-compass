/**
 * EntityDetailSheet — Popup chi tiết 1 thực thể (Chi nhánh CN hoặc Nhà máy NM).
 *
 * Khi user click mã CN / GA / NM trong các bảng pivot tồn kho, hiện chi tiết
 * NGAY TẠI CHỖ. KHÔNG navigate sang DRP / Supply nữa.
 * Cross-link sang DRP/Supply/Hub chỉ khi user click EXPLICIT [Xem ... →].
 *
 * Mọi text tiếng Việt.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, X, Building2, Factory, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BRANCHES } from "@/data/unis-enterprise-dataset";

export type EntityKind = "cn" | "nm";

interface Props {
  open: boolean;
  onClose: () => void;
  entity: { kind: EntityKind; code: string } | null;
}

interface SkuLine {
  sku: string;
  variant: string;
  onHand: number;
  hstk: number;
  status: "danger" | "warn" | "ok";
}

function buildSkuLines(seed: number, count = 8): SkuLine[] {
  const skus = ["GA-600", "GA-800", "GA-450", "GA-300", "GA-1000", "GA-200", "GA-550", "GA-700"];
  const variants = ["W18", "W22", "W25", "W30"];
  return Array.from({ length: count }, (_, i) => {
    const onHand = ((seed + i * 53) % 900) + 80;
    const hstk = +(((seed + i * 19) % 140) / 10 + 1).toFixed(1);
    const status: SkuLine["status"] = hstk < 3 ? "danger" : hstk < 7 ? "warn" : "ok";
    return {
      sku: skus[i % skus.length],
      variant: variants[(seed + i) % variants.length],
      onHand,
      hstk,
      status,
    };
  }).sort((a, b) => a.hstk - b.hstk);
}

const STATUS_BADGE: Record<SkuLine["status"], { label: string; cls: string }> = {
  danger: { label: "🔴 Nguy hiểm", cls: "bg-danger-bg text-danger" },
  warn:   { label: "🟡 Thấp",      cls: "bg-warning-bg text-warning" },
  ok:     { label: "🟢 Đủ",         cls: "bg-success-bg text-success" },
};

export function EntityDetailSheet({ open, onClose, entity }: Props) {
  const navigate = useNavigate();

  const seed = useMemo(
    () => (entity ? Array.from(entity.code).reduce((a, c) => a + c.charCodeAt(0), 0) : 0),
    [entity],
  );
  const lines = useMemo(() => (entity ? buildSkuLines(seed) : []), [entity, seed]);

  const totals = useMemo(() => {
    const total = lines.reduce((a, r) => a + r.onHand, 0);
    const avgHstk = lines.length ? lines.reduce((a, r) => a + r.hstk, 0) / lines.length : 0;
    const danger = lines.filter((r) => r.status === "danger").length;
    return { total, avgHstk, danger };
  }, [lines]);

  // KHÔNG early-return — luôn render <Sheet> để Radix có thể chạy exit-animation
  // mà không bị unmount đột ngột (nguyên nhân gây "Rendered fewer hooks than expected").
  const isCn = entity?.kind === "cn";
  const branchMeta = isCn && entity ? BRANCHES.find((b) => b.code === entity.code) : undefined;
  const title = entity
    ? (isCn ? `${branchMeta?.name ?? entity.code} (${entity.code})` : `Nhà máy ${entity.code}`)
    : "";
  const subtitle = isCn ? "Chi nhánh — tồn kho theo SKU" : "Nhà máy — sản lượng & cam kết";
  const Icon = isCn ? Building2 : Factory;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[clamp(420px,42vw,560px)] sm:max-w-[560px] p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-surface-3 bg-surface-1/60">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                isCn ? "bg-info-bg text-info" : "bg-warning-bg text-warning",
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <SheetTitle className="text-headline-3 font-semibold text-text-1 truncate">{title}</SheetTitle>
                <p className="text-table-sm text-text-3 mt-0.5">{subtitle}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-text-3 hover:text-text-1 shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-2 px-5 py-3 border-b border-surface-3">
            <div>
              <div className="text-caption text-text-3 uppercase">{isCn ? "Tồn tổng" : "Sản lượng"}</div>
              <div className="text-headline-3 font-semibold tabular-nums text-text-1 mt-0.5">
                {totals.total.toLocaleString("vi-VN")} <span className="text-table-sm text-text-3">m²</span>
              </div>
            </div>
            <div>
              <div className="text-caption text-text-3 uppercase">AVG HSTK</div>
              <div className={cn(
                "text-headline-3 font-semibold tabular-nums mt-0.5",
                totals.avgHstk < 3 ? "text-danger" : totals.avgHstk < 7 ? "text-warning" : "text-success",
              )}>
                {totals.avgHstk.toFixed(1)}d
              </div>
            </div>
            <div>
              <div className="text-caption text-text-3 uppercase">SKU thiếu</div>
              <div className={cn(
                "text-headline-3 font-semibold tabular-nums mt-0.5",
                totals.danger > 0 ? "text-danger" : "text-success",
              )}>
                {totals.danger}
              </div>
            </div>
          </div>

          {/* SKU lines */}
          <div className="px-5 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-text-3" />
              <h4 className="text-table-sm font-semibold text-text-2 uppercase">
                {isCn ? "SKU tại chi nhánh" : "SKU đang sản xuất"}
              </h4>
            </div>
            <div className="rounded-lg border border-surface-3 overflow-hidden">
              <table className="w-full text-table-sm">
                <thead className="bg-surface-1/60">
                  <tr>
                    <th className="px-3 py-2 text-left text-caption uppercase text-text-3">SKU</th>
                    <th className="px-3 py-2 text-right text-caption uppercase text-text-3">Tồn (m²)</th>
                    <th className="px-3 py-2 text-right text-caption uppercase text-text-3">HSTK</th>
                    <th className="px-3 py-2 text-right text-caption uppercase text-text-3">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((r, i) => (
                    <tr key={i} className="border-t border-surface-3/60">
                      <td className="px-3 py-2 font-mono text-text-1">{r.sku} <span className="text-text-3">{r.variant}</span></td>
                      <td className="px-3 py-2 text-right tabular-nums text-text-1">{r.onHand.toLocaleString("vi-VN")}</td>
                      <td className={cn(
                        "px-3 py-2 text-right tabular-nums font-medium",
                        r.hstk < 3 ? "text-danger" : r.hstk < 7 ? "text-warning" : "text-success",
                      )}>{r.hstk.toFixed(1)}d</td>
                      <td className="px-3 py-2 text-right">
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_BADGE[r.status].cls)}>
                          {STATUS_BADGE[r.status].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Explicit cross-links */}
        <div className="border-t border-surface-3 bg-surface-1/40 px-5 py-3 space-y-1.5">
          <p className="text-caption text-text-3 uppercase mb-1">Mở chi tiết ở trang khác</p>
          {isCn ? (
            <>
              <button
                className="w-full flex items-center justify-between rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-table-sm text-text-1 hover:border-primary hover:text-primary transition-colors"
                onClick={() => { onClose(); navigate(`/drp?cn=${encodeURIComponent(entity.code)}`); }}
              >
                <span>Xem DRP cho {entity.code}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                className="w-full flex items-center justify-between rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-table-sm text-text-1 hover:border-primary hover:text-primary transition-colors"
                onClick={() => { onClose(); navigate(`/demand-weekly?cn=${encodeURIComponent(entity.code)}`); }}
              >
                <span>Xem Demand tuần</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                className="w-full flex items-center justify-between rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-table-sm text-text-1 hover:border-primary hover:text-primary transition-colors"
                onClick={() => { onClose(); navigate(`/supply?nm=${encodeURIComponent(entity.code)}`); }}
              >
                <span>Xem NM Supply cho {entity.code}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                className="w-full flex items-center justify-between rounded-md border border-surface-3 bg-surface-0 px-3 py-2 text-table-sm text-text-1 hover:border-primary hover:text-primary transition-colors"
                onClick={() => { onClose(); navigate(`/hub?nm=${encodeURIComponent(entity.code)}`); }}
              >
                <span>Xem Hub & Cam kết</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default EntityDetailSheet;

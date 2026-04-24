/**
 * SkuDetailSheet — Popup chi tiết 1 SKU tại tất cả CN (và NM sản xuất).
 *
 * Mục đích: Khi user click mã SKU trong các bảng tồn kho/pivot, hiện chi tiết
 * NGAY TẠI CHỖ thay vì navigate sang DRP (vô duyên — user đang xem tồn kho).
 * Cross-link sang DRP/Hub/Demand chỉ khi user click EXPLICIT link "[Xem ... →]".
 *
 * Mọi text tiếng Việt.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, X, Building2, Factory } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BRANCHES } from "@/data/unis-enterprise-dataset";

interface BranchSkuRow {
  cn: string;
  cnName?: string;
  onHand: number;
  hstk: number;       // ngày
  ssTarget: number;
  status: "danger" | "warn" | "ok";
}

interface FactoryRow {
  nm: string;
  qty: number;
  capacity?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  sku: string | null;
  /** Optional override: nếu cấp sẽ dùng thay cho data tổng hợp mặc định */
  branches?: BranchSkuRow[];
  factories?: FactoryRow[];
}

/* Build deterministic mock data per SKU bằng hash đơn giản — không chạm dataset */
function buildBranchData(sku: string): BranchSkuRow[] {
  const seed = Array.from(sku).reduce((a, c) => a + c.charCodeAt(0), 0);
  return BRANCHES.map((b, i) => {
    const base = ((seed + i * 37) % 700) + 60;
    const ss = Math.round(((seed + i * 17) % 350) + 150);
    const hstk = +(((seed + i * 23) % 130) / 10 + 1).toFixed(1);
    const status: BranchSkuRow["status"] = hstk < 3 ? "danger" : hstk < 7 ? "warn" : "ok";
    return { cn: b.code, cnName: b.name, onHand: base, hstk, ssTarget: ss, status };
  });
}

function buildFactoryData(sku: string): FactoryRow[] {
  const seed = Array.from(sku).reduce((a, c) => a + c.charCodeAt(0), 0);
  return [
    { nm: "Toko",      qty: 1500 + (seed % 800), capacity: 14000 },
    { nm: "Mikado",    qty:  600 + (seed % 500), capacity: 10000 },
    { nm: "Đồng Tâm",  qty:  400 + (seed % 400), capacity:  8000 },
  ];
}

export function SkuDetailSheet({ open, onClose, sku, branches, factories }: Props) {
  const branchRows = useMemo(() => {
    if (!sku) return [];
    return (branches ?? buildBranchData(sku)).slice().sort((a, b) => a.hstk - b.hstk);
  }, [sku, branches]);

  const factoryRows = useMemo(() => {
    if (!sku) return [];
    return factories ?? buildFactoryData(sku);
  }, [sku, factories]);

  const totals = useMemo(() => {
    const total = branchRows.reduce((a, r) => a + r.onHand, 0);
    const avgHstk = branchRows.length
      ? branchRows.reduce((a, r) => a + r.hstk, 0) / branchRows.length
      : 0;
    const danger = branchRows.filter((r) => r.status === "danger").length;
    return { total, avgHstk, danger };
  }, [branchRows]);

  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[560px] p-0 flex flex-col"
      >
        <SheetHeader className="px-5 py-4 border-b border-surface-3 bg-surface-1/60">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-h3 font-display text-text-1 leading-tight">
                {sku ?? "—"} <span className="text-text-3 font-normal">— Tình hình tại {branchRows.length} chi nhánh</span>
              </SheetTitle>
              <div className="mt-1.5 text-table-sm text-text-2">
                Tổng tồn <span className="font-semibold text-text-1 tabular-nums">{totals.total.toLocaleString("vi-VN")}</span> m²
                <span className="text-text-3 mx-1.5">·</span>
                HSTK TB <span className="font-semibold text-text-1 tabular-nums">{totals.avgHstk.toFixed(1)}d</span>
                <span className="text-text-3 mx-1.5">·</span>
                <span className={cn(totals.danger > 0 ? "text-danger font-semibold" : "text-success")}>
                  {totals.danger} CN nguy hiểm
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-3 hover:text-text-1 p-1 rounded hover:bg-surface-3"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-5 py-4 space-y-5">
          {/* Per-CN table */}
          <section>
            <div className="text-table-sm font-semibold text-text-1 mb-2 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-text-3" /> Theo chi nhánh
            </div>
            <div className="rounded-card border border-surface-3 bg-surface-0 overflow-hidden">
              <table className="w-full text-table-sm">
                <thead className="bg-surface-1 border-b border-surface-3">
                  <tr className="text-text-3 text-caption uppercase">
                    <th className="text-left px-3 py-2 font-semibold">CN</th>
                    <th className="text-right px-2 py-2 font-semibold">Tồn</th>
                    <th className="text-right px-2 py-2 font-semibold">HSTK</th>
                    <th className="text-right px-2 py-2 font-semibold">SS</th>
                    <th className="text-right px-2 py-2 font-semibold">So SS</th>
                    <th className="text-left px-3 py-2 font-semibold">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {branchRows.map((r) => {
                    const pct = r.ssTarget > 0
                      ? Math.round(((r.onHand - r.ssTarget) / r.ssTarget) * 100)
                      : 0;
                    const isUp = pct > 0;
                    return (
                      <tr
                        key={r.cn}
                        className={cn(
                          "border-t border-surface-3/60 transition-colors hover:bg-surface-1/40",
                          r.status === "danger" && "bg-danger-bg/15",
                          r.status === "warn" && "bg-warning-bg/10"
                        )}
                      >
                        <td className="px-3 py-1.5 font-medium text-text-1">{r.cn}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{r.onHand.toLocaleString("vi-VN")}</td>
                        <td className={cn(
                          "px-2 py-1.5 text-right tabular-nums font-medium",
                          r.status === "danger" && "text-danger",
                          r.status === "warn" && "text-warning",
                          r.status === "ok" && "text-success"
                        )}>
                          {r.hstk.toFixed(1)}d
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-text-2">{r.ssTarget.toLocaleString("vi-VN")}</td>
                        <td className={cn(
                          "px-2 py-1.5 text-right tabular-nums text-[11px] font-medium",
                          isUp ? "text-info" : "text-danger"
                        )}>
                          {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{pct}%
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                            r.status === "danger" && "bg-danger-bg text-danger",
                            r.status === "warn" && "bg-warning-bg text-warning",
                            r.status === "ok" && "bg-success-bg text-success"
                          )}>
                            {r.status === "danger" && "🔴 Nguy hiểm"}
                            {r.status === "warn" && "🟡 Thấp"}
                            {r.status === "ok" && "🟢 Đủ"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Factories */}
          <section>
            <div className="text-table-sm font-semibold text-text-1 mb-2 flex items-center gap-1.5">
              <Factory className="h-3.5 w-3.5 text-text-3" /> NM sản xuất {sku}
            </div>
            <div className="space-y-1.5">
              {factoryRows.map((f) => (
                <div
                  key={f.nm}
                  className="flex items-center justify-between rounded border border-surface-3 bg-surface-1/40 px-3 py-2 text-table-sm"
                >
                  <span className="font-medium text-text-1">{f.nm}</span>
                  <span className="tabular-nums text-text-2">
                    {f.qty.toLocaleString("vi-VN")} m²
                    {f.capacity && (
                      <span className="text-text-3"> / capacity {f.capacity.toLocaleString("vi-VN")}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Explicit cross-links */}
          <section>
            <div className="text-table-sm font-semibold text-text-1 mb-2">Liên kết</div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => { onClose(); navigate(`/drp?sku=${encodeURIComponent(sku ?? "")}`); }}
                className="flex items-center justify-between rounded-button border border-surface-3 bg-surface-1 hover:bg-info-bg px-3 py-2 text-table-sm text-info hover:text-info transition-colors"
              >
                <span>Xem DRP {sku}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { onClose(); navigate(`/hub?sku=${encodeURIComponent(sku ?? "")}`); }}
                className="flex items-center justify-between rounded-button border border-surface-3 bg-surface-1 hover:bg-info-bg px-3 py-2 text-table-sm text-info hover:text-info transition-colors"
              >
                <span>Xem cam kết NM</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { onClose(); navigate(`/demand-weekly?sku=${encodeURIComponent(sku ?? "")}`); }}
                className="flex items-center justify-between rounded-button border border-surface-3 bg-surface-1 hover:bg-info-bg px-3 py-2 text-table-sm text-info hover:text-info transition-colors"
              >
                <span>Xem nhu cầu tuần</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default SkuDetailSheet;

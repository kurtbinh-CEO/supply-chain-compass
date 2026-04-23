import { useMemo, useState } from "react";
import { ArrowLeftRight, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TO_DRAFT, BRANCHES, SKU_BASES, type ToDraftRow } from "@/data/unis-enterprise-dataset";
import { PoLifecycleStepper, stageFromStatus } from "./PoLifecycleStepper";

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
  const [expanded, setExpanded] = useState<string | null>(null);

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

      <div className="rounded-card border border-surface-3 bg-surface-0 overflow-hidden">
        <table className="w-full text-table-sm">
          <thead className="bg-surface-2 text-text-3 text-caption uppercase tracking-wider">
            <tr>
              <th className="w-8" />
              <th className="text-left px-3 py-2 font-semibold">Số TO</th>
              <th className="text-left px-3 py-2 font-semibold">CN nguồn</th>
              <th className="text-left px-3 py-2 font-semibold">CN đích</th>
              <th className="text-left px-3 py-2 font-semibold">Mã hàng + đuôi</th>
              <th className="text-right px-3 py-2 font-semibold">Số lượng</th>
              <th className="text-center px-3 py-2 font-semibold">Trạng thái</th>
              <th className="text-center px-3 py-2 font-semibold">Khoảng cách</th>
              <th className="text-center px-3 py-2 font-semibold">ETA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const meta = STATUS_META[r.status];
              const isOpen = expanded === r.toNumber;
              const tail = variantTail(r.toNumber);
              const base = SKU_BASES.find((b) => b.code === r.skuBaseCode);
              return (
                <>
                  <tr
                    key={r.toNumber}
                    className="border-t border-surface-3 hover:bg-surface-1 cursor-pointer transition-colors"
                    onClick={() => setExpanded(isOpen ? null : r.toNumber)}
                  >
                    <td className="px-2 py-2 text-center text-text-3">
                      {isOpen ? <ChevronDown className="h-3.5 w-3.5 inline" /> : <ChevronRight className="h-3.5 w-3.5 inline" />}
                    </td>
                    <td className="px-3 py-2 font-mono text-text-1">{r.toNumber}</td>
                    <td className="px-3 py-2 text-text-2">{cnName(r.fromCn)} <span className="text-text-3">({r.fromCn})</span></td>
                    <td className="px-3 py-2 text-text-2">{cnName(r.toCn)} <span className="text-text-3">({r.toCn})</span></td>
                    <td className="px-3 py-2">
                      <span className="font-mono text-text-1">{r.skuBaseCode}</span>
                      <span className="text-text-3"> · {tail}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-text-1">{fmt(r.qtyM2)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-semibold", meta.tone)}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-text-2 tabular-nums">{r.distanceKm} km</td>
                    <td className="px-3 py-2 text-center text-text-2">{fmtDate(r.expectedDate)}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-surface-1 border-t border-surface-3">
                      <td />
                      <td colSpan={8} className="px-4 py-4">
                        <div className="space-y-3">
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
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-text-3">Không có TO nào ở trạng thái này.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

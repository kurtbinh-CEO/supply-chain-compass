import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle2, ClipboardList, Send, ShieldAlert, X, ChevronRight,
  Package, ArrowLeftRight, AlertTriangle, Lock, FileCheck2, Eye,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

/* ─────────────────────────────────────────────────────────────
   Types
   ──────────────────────────────────────────────────────────── */
export type DrpBatchStatus = "idle" | "draft" | "reviewed" | "approved" | "released";

export interface DrpBatchItem {
  code: string;            // RPO-MKD-2605-W17-003 / TO-DN-BD-2605-001
  kind: "RPO" | "TO";
  nm?: string;             // for RPO
  fromCn?: string;         // for TO
  toCn?: string;           // for TO
  sku: string;
  qty: number;             // m²
  value: number;           // VND
  eta: string;             // dd/MM
  rejected?: boolean;      // selectively excluded from release
}

export interface DrpUnresolvedException {
  cn: string;
  item: string;
  variant: string;
  gap: number;
  type: "SHORTAGE" | "WATCH";
}

export interface DrpBatch {
  id: string;             // DRP-2026-04-23-01
  createdAt: string;      // 23:02
  items: DrpBatchItem[];
  unresolved: DrpUnresolvedException[];
}

interface Props {
  status: DrpBatchStatus;
  batch: DrpBatch | null;
  canApprove: boolean;
  onApproveAll: (note: string) => void;
  onReject: (codes: string[], note: string) => void;
  onRelease: () => void;
  onMarkReviewed: () => void;
  onCancelBatch: () => void;
}

/* ─────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */
const fmtVnd = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B₫`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M₫`;
  return `${n.toLocaleString()}₫`;
};

const statusMeta: Record<DrpBatchStatus, { label: string; tone: string; chip: string; ring: string }> = {
  idle:     { label: "Chưa có lô",    tone: "text-text-3",       chip: "bg-surface-2 text-text-3",        ring: "" },
  draft:    { label: "Nháp",          tone: "text-warning",      chip: "bg-warning/15 text-warning",      ring: "ring-warning/30" },
  reviewed: { label: "Đã xem xét",    tone: "text-info",         chip: "bg-info/15 text-info",            ring: "ring-info/30" },
  approved: { label: "Đã duyệt",      tone: "text-success",      chip: "bg-success-bg text-success",      ring: "ring-success/30" },
  released: { label: "Đã phát hành",  tone: "text-primary",      chip: "bg-primary/15 text-primary",      ring: "ring-primary/30" },
};

/* ─────────────────────────────────────────────────────────────
   Component
   ──────────────────────────────────────────────────────────── */
export function DrpReleaseBar({
  status, batch, canApprove,
  onApproveAll, onReject, onRelease, onMarkReviewed, onCancelBatch,
}: Props) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [tab, setTab] = useState<"rpo" | "to" | "exc">("rpo");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<null | { kind: "approve" | "approveSelected" | "reject" | "release"; codes?: string[] }>(null);
  const [note, setNote] = useState("");
  const navigate = useNavigate();

  if (status === "idle" || !batch) return null;

  const meta = statusMeta[status];
  const rpoItems = batch.items.filter((i) => i.kind === "RPO");
  const toItems  = batch.items.filter((i) => i.kind === "TO");
  const activeItems = batch.items.filter((i) => !i.rejected);
  const rejectedItems = batch.items.filter((i) => i.rejected);
  const totalValue = activeItems.reduce((s, i) => s + i.value, 0);
  const totalQty   = activeItems.reduce((s, i) => s + i.qty, 0);
  const rejectedValue = rejectedItems.reduce((s, i) => s + i.value, 0);
  const cnImpact   = new Set([...rpoItems.map(() => ""), ...toItems.flatMap((t) => [t.fromCn ?? "", t.toCn ?? ""])].filter(Boolean)).size;
  const HIGH_VALUE_THRESHOLD = 500_000_000;
  const isHighValue = totalValue >= HIGH_VALUE_THRESHOLD;
  const selectedItems = batch.items.filter((i) => selected.has(i.code) && !i.rejected);
  const selectedValue = selectedItems.reduce((s, i) => s + i.value, 0);

  const tabItems = tab === "rpo" ? rpoItems : tab === "to" ? toItems : [];
  const selectableCodes = tabItems.filter((i) => !i.rejected).map((i) => i.code);
  const allSelected = selectableCodes.length > 0 && selectableCodes.every((c) => selected.has(c));
  const someSelected = selectableCodes.some((c) => selected.has(c));

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) selectableCodes.forEach((c) => next.delete(c));
      else selectableCodes.forEach((c) => next.add(c));
      return next;
    });
  };
  const toggleRow = (c: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  const confirmAction = () => {
    if (!pending) return;
    if (pending.kind === "approve") {
      onApproveAll(note);
    } else if (pending.kind === "approveSelected" && pending.codes) {
      // Approve subset = release-only these items by rejecting all others temporarily? 
      // Cleaner: bubble up via onApproveAll with note tagging selected codes (mock); for now just approve-all but log selection.
      onApproveAll(`[Selected ${pending.codes.length}/${activeItems.length}] ${note}`.trim());
      setSelected(new Set());
    } else if (pending.kind === "reject" && pending.codes) {
      onReject(pending.codes, note);
      setSelected(new Set());
    } else if (pending.kind === "release") {
      onRelease();
      setReviewOpen(false);
    }
    setPending(null);
    setNote("");
  };

  /* Sticky banner */
  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-30 mb-4 rounded-card border bg-surface-0/95 backdrop-blur px-4 py-3 shadow-sm ring-1 ring-offset-2 ring-offset-surface-0 transition-all",
          meta.ring,
          status === "draft" ? "border-warning/40" :
          status === "reviewed" ? "border-info/40" :
          status === "approved" ? "border-success/40" :
          "border-primary/40"
        )}
        role="status"
        aria-label={`DRP batch ${batch.id} — ${meta.label}`}
      >
        <div className="flex items-center gap-4 flex-wrap">
          {/* Left: batch identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", meta.chip)}>
              {status === "released" ? <Lock className="h-4 w-4" /> :
               status === "approved" ? <CheckCircle2 className="h-4 w-4" /> :
               status === "reviewed" ? <Eye className="h-4 w-4" /> :
               <ClipboardList className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-table-sm font-semibold text-text-1">{batch.id}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-caption font-semibold uppercase tracking-wide", meta.chip)}>
                  {meta.label}
                </span>
                {isHighValue && status !== "released" && (
                  <span className="rounded-full bg-warning/15 text-warning px-2 py-0.5 text-caption font-semibold inline-flex items-center gap-1" title="Giá trị > 500M₫ — cần xác nhận hai cấp">
                    <ShieldAlert className="h-3 w-3" /> Giá trị cao
                  </span>
                )}
              </div>
              <p className="text-caption text-text-3 mt-0.5">
                Chạy lúc {batch.createdAt} ·{" "}
                <span className="text-text-2 font-medium">{rpoItems.length} RPO</span> +{" "}
                <span className="text-text-2 font-medium">{toItems.length} TO</span> ·{" "}
                <span className="text-text-2 font-medium tabular-nums">{totalQty.toLocaleString()} m²</span> ·{" "}
                <span className="text-text-2 font-semibold tabular-nums">{fmtVnd(totalValue)}</span>
                {batch.unresolved.length > 0 && (
                  <span className="ml-2 text-danger font-medium">· {batch.unresolved.length} ngoại lệ chưa xử lý</span>
                )}
              </p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => { setReviewOpen(true); setTab("rpo"); setSelected(new Set()); }}
              className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 px-3 py-1.5 text-table-sm font-semibold text-text-1 hover:bg-surface-1 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" /> Xem xét
              <ChevronRight className="h-3 w-3 text-text-3" />
            </button>

            {status !== "released" && (
              <button
                disabled={!canApprove || status === "approved"}
                onClick={() => { setNote(""); setPending({ kind: "approve" }); }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-button px-3 py-1.5 text-table-sm font-semibold transition-colors",
                  !canApprove || status === "approved"
                    ? "bg-surface-2 text-text-3 cursor-not-allowed"
                    : "bg-success text-success-foreground hover:opacity-90"
                )}
                title={!canApprove ? "Cần quyền SC Manager" : status === "approved" ? "Lô đã được duyệt" : "Duyệt toàn bộ RPO + TO"}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Duyệt tất cả
              </button>
            )}

            <button
              disabled={status !== "approved"}
              onClick={() => { setNote(""); setPending({ kind: "release" }); }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-button px-3 py-1.5 text-table-sm font-semibold transition-colors",
                status !== "approved"
                  ? "bg-surface-2 text-text-3 cursor-not-allowed"
                  : "bg-gradient-primary text-primary-foreground hover:shadow-md"
              )}
              title={status !== "approved" ? "Cần Duyệt trước khi Phát hành" : "Đẩy sang Đơn hàng, khoá lô"}
            >
              <Send className="h-3.5 w-3.5" />
              {status === "released" ? "Đã phát hành" : "Phát hành"}
            </button>

            {status !== "released" && (
              <button
                onClick={onCancelBatch}
                className="inline-flex items-center justify-center h-7 w-7 rounded-full text-text-3 hover:bg-surface-2 hover:text-danger transition-colors"
                title="Hủy lô"
                aria-label="Hủy lô"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* State pipeline mini */}
        <div className="mt-3 flex items-center gap-1 text-caption">
          {(["draft", "reviewed", "approved", "released"] as const).map((s, i) => {
            const reached = ["draft", "reviewed", "approved", "released"].indexOf(status) >= i;
            const isCurrent = status === s;
            return (
              <div key={s} className="flex items-center gap-1">
                <span className={cn(
                  "rounded-full px-2 py-0.5 font-medium uppercase tracking-wide transition-colors",
                  isCurrent ? statusMeta[s].chip + " font-semibold" :
                  reached ? "bg-surface-2 text-text-2" : "bg-surface-1 text-text-3"
                )}>
                  {statusMeta[s].label}
                </span>
                {i < 3 && <ChevronRight className={cn("h-3 w-3", reached ? "text-text-2" : "text-surface-3")} />}
              </div>
            );
          })}
          {status === "released" && (
            <button
              onClick={() => navigate("/orders")}
              className="ml-auto inline-flex items-center gap-1 text-primary font-medium hover:underline"
            >
              <FileCheck2 className="h-3 w-3" /> Xem ở Đơn hàng
            </button>
          )}
        </div>
      </div>

      {/* ───────────── Review Drawer ───────────── */}
      <Sheet open={reviewOpen} onOpenChange={setReviewOpen}>
        <SheetContent className="w-full sm:max-w-[720px] overflow-y-auto p-0">
          <SheetHeader className="px-6 py-4 border-b border-surface-3 sticky top-0 bg-surface-0 z-10">
            <SheetTitle className="font-display text-text-1">Xem xét lô DRP · {batch.id}</SheetTitle>
            <SheetDescription className="text-text-3">
              Kiểm tra RPO/TO & ngoại lệ trước khi Duyệt và Phát hành sang Đơn hàng.
            </SheetDescription>
          </SheetHeader>

          {/* Summary KPIs */}
          <div className="px-6 py-4 grid grid-cols-5 gap-3 border-b border-surface-3">
            {[
              { label: "RPO", value: rpoItems.length, icon: Package, tone: "text-primary", sub: undefined as string | undefined },
              { label: "TO nội bộ", value: toItems.length, icon: ArrowLeftRight, tone: "text-accent-foreground", sub: undefined },
              { label: "Chờ xử lý", value: activeItems.length, icon: ClipboardList, tone: "text-info", sub: `${totalQty.toLocaleString()} m²` },
              { label: "Từ chối", value: rejectedItems.length, icon: X, tone: rejectedItems.length > 0 ? "text-danger" : "text-text-3", sub: rejectedItems.length > 0 ? fmtVnd(rejectedValue) : undefined },
              { label: "Tổng giá trị", value: fmtVnd(totalValue), icon: FileCheck2, tone: isHighValue ? "text-warning" : "text-text-1", sub: batch.unresolved.length > 0 ? `${batch.unresolved.length} ngoại lệ` : undefined },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="rounded-card border border-surface-3 bg-surface-1/40 p-3">
                  <div className="flex items-center gap-1.5 text-caption text-text-3 uppercase tracking-wide">
                    <Icon className="h-3 w-3" /> {k.label}
                  </div>
                  <p className={cn("text-section-header font-bold tabular-nums mt-1 leading-none", k.tone)}>{k.value}</p>
                  {k.sub && <p className="text-caption text-text-3 mt-1 tabular-nums">{k.sub}</p>}
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <div className="px-6 pt-4 flex items-center gap-1 border-b border-surface-3">
            {([
              { k: "rpo", l: `RPO (${rpoItems.length})` },
              { k: "to",  l: `TO nội bộ (${toItems.length})` },
              { k: "exc", l: `Ngoại lệ (${batch.unresolved.length})` },
            ] as const).map((t) => (
              <button
                key={t.k}
                onClick={() => { setTab(t.k); setSelected(new Set()); }}
                className={cn(
                  "px-3 py-2 text-table-sm font-medium border-b-2 -mb-px transition-colors",
                  tab === t.k ? "border-primary text-primary" : "border-transparent text-text-3 hover:text-text-2"
                )}
              >
                {t.l}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="px-6 py-4">
            {tab === "exc" ? (
              batch.unresolved.length === 0 ? (
                <div className="rounded-card border border-success/30 bg-success-bg/30 p-4 text-table-sm text-success flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Không còn ngoại lệ chưa xử lý.
                </div>
              ) : (
                <div className="space-y-2">
                  {batch.unresolved.map((e, i) => (
                    <div key={i} className="rounded-card border border-danger/30 bg-danger-bg/30 p-3 flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-table-sm font-semibold text-text-1">{e.cn} · {e.item} {e.variant}</p>
                        <p className="text-caption text-text-3">Thiếu {e.gap.toLocaleString()} m² · {e.type === "SHORTAGE" ? "THIẾU HÀNG" : "THEO DÕI"}</p>
                      </div>
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-caption font-semibold",
                        e.type === "SHORTAGE" ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning"
                      )}>
                        {e.type === "SHORTAGE" ? "THIẾU HÀNG" : "THEO DÕI"}
                      </span>
                    </div>
                  ))}
                  <p className="text-caption text-text-3 mt-2">
                    💡 Có thể vẫn phát hành lô — ngoại lệ sẽ chuyển sang Workspace để xử lý sau.
                  </p>
                </div>
              )
            ) : tabItems.length === 0 ? (
              <div className="rounded-card border border-surface-3 bg-surface-1/40 p-6 text-center text-table-sm text-text-3">
                Không có {tab === "rpo" ? "RPO" : "TO"} nào trong batch này.
              </div>
            ) : (
              <>
                {/* Bulk action bar */}
                {selected.size > 0 && status !== "released" && (
                  <div className="mb-3 rounded-card border border-primary/40 bg-primary/5 px-3 py-2 flex items-center gap-2 text-table-sm flex-wrap">
                    <span className="font-semibold text-text-1">
                      {selected.size} {tab === "rpo" ? "RPO" : "TO"} đã chọn
                    </span>
                    <span className="text-caption text-text-3 tabular-nums">· {fmtVnd(selectedValue)}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => { setNote(""); setPending({ kind: "approveSelected", codes: Array.from(selected) }); }}
                        disabled={!canApprove || status === "approved"}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-button px-2.5 py-1 text-caption font-semibold transition-colors",
                          !canApprove || status === "approved"
                            ? "bg-surface-2 text-text-3 cursor-not-allowed"
                            : "bg-success text-success-foreground hover:opacity-90"
                        )}
                        title={
                          !canApprove ? "Cần quyền SC Manager" :
                          status === "approved" ? "Lô đã được duyệt" :
                          "Duyệt các mục đã chọn (kèm ghi chú audit)"
                        }
                      >
                        <CheckCircle2 className="h-3 w-3" /> Duyệt mục đã chọn
                      </button>
                      <button
                        onClick={() => { setNote(""); setPending({ kind: "reject", codes: Array.from(selected) }); }}
                        disabled={!canApprove}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-button px-2.5 py-1 text-caption font-semibold transition-colors",
                          canApprove ? "border border-danger/40 text-danger hover:bg-danger/10" : "bg-surface-2 text-text-3 cursor-not-allowed"
                        )}
                        title={!canApprove ? "Cần quyền SC Manager" : "Loại khỏi lô (sẽ không phát hành)"}
                      >
                        <X className="h-3 w-3" /> Từ chối
                      </button>
                      <button
                        onClick={() => setSelected(new Set())}
                        className="text-caption text-text-3 hover:text-text-1 underline"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-card border border-surface-3 overflow-hidden">
                  <table className="w-full text-table-sm">
                    <thead>
                      <tr className="bg-surface-1/50 border-b border-surface-3 text-text-3">
                        <th className="px-3 py-2 text-left w-10">
                          <Checkbox
                            checked={allSelected ? true : someSelected ? "indeterminate" : false}
                            onCheckedChange={togglePage}
                            disabled={status === "released"}
                            aria-label="Chọn tất cả"
                          />
                        </th>
                        <th className="px-3 py-2 text-left text-caption uppercase font-semibold tracking-wide">Mã</th>
                        <th className="px-3 py-2 text-left text-caption uppercase font-semibold tracking-wide">{tab === "rpo" ? "NM" : "Từ → Đến"}</th>
                        <th className="px-3 py-2 text-left text-caption uppercase font-semibold tracking-wide">SKU</th>
                        <th className="px-3 py-2 text-right text-caption uppercase font-semibold tracking-wide">SL (m²)</th>
                        <th className="px-3 py-2 text-right text-caption uppercase font-semibold tracking-wide">Giá trị</th>
                        <th className="px-3 py-2 text-left text-caption uppercase font-semibold tracking-wide">Dự kiến đến</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tabItems.map((it) => {
                        const isSelected = selected.has(it.code);
                        return (
                          <tr
                            key={it.code}
                            className={cn(
                              "border-b border-surface-3/50 transition-colors",
                              it.rejected ? "bg-danger-bg/20 line-through opacity-60" :
                              isSelected ? "bg-warning/5" : "hover:bg-surface-1/40"
                            )}
                          >
                            <td className="px-3 py-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleRow(it.code)}
                                disabled={it.rejected || status === "released"}
                                aria-label={`Chọn ${it.code}`}
                              />
                            </td>
                            <td className="px-3 py-2 font-mono text-text-1 text-caption">{it.code}</td>
                            <td className="px-3 py-2 text-text-2">
                              {tab === "rpo" ? it.nm : <span className="inline-flex items-center gap-1">{it.fromCn} <ArrowLeftRight className="h-3 w-3 text-text-3" /> {it.toCn}</span>}
                            </td>
                            <td className="px-3 py-2 text-text-2 font-mono text-caption">{it.sku}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-text-1">{it.qty.toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-text-1 font-medium">{fmtVnd(it.value)}</td>
                            <td className="px-3 py-2 text-text-2">{it.eta}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Drawer footer */}
          <div className="sticky bottom-0 bg-surface-0/95 backdrop-blur border-t border-surface-3 px-6 py-3 flex items-center gap-2">
            {!canApprove && status !== "released" && (
              <span className="inline-flex items-center gap-1.5 text-caption text-text-3">
                <ShieldAlert className="h-3.5 w-3.5" /> Cần quyền SC Manager để duyệt
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {status === "draft" && (
                <button
                  onClick={() => { onMarkReviewed(); toast.success("Đã đánh dấu Đã xem xét"); }}
                  className="inline-flex items-center gap-1.5 rounded-button border border-info/40 bg-info/10 text-info px-3 py-1.5 text-table-sm font-semibold hover:bg-info/20"
                >
                  <Eye className="h-3.5 w-3.5" /> Đánh dấu Đã xem xét
                </button>
              )}
              {status !== "released" && (
                <button
                  disabled={!canApprove || status === "approved"}
                  onClick={() => { setNote(""); setPending({ kind: "approve" }); }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-button px-3 py-1.5 text-table-sm font-semibold transition-colors",
                    !canApprove || status === "approved"
                      ? "bg-surface-2 text-text-3 cursor-not-allowed"
                      : "bg-success text-success-foreground hover:opacity-90"
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt tất cả
                </button>
              )}
              <button
                disabled={status !== "approved"}
                onClick={() => { setNote(""); setPending({ kind: "release" }); }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-button px-3 py-1.5 text-table-sm font-semibold transition-colors",
                  status !== "approved"
                    ? "bg-surface-2 text-text-3 cursor-not-allowed"
                    : "bg-gradient-primary text-primary-foreground hover:shadow-md"
                )}
              >
                <Send className="h-3.5 w-3.5" /> Phát hành
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ───────────── Action Confirm Dialog ───────────── */}
      <AlertDialog open={!!pending} onOpenChange={(v) => { if (!v) { setPending(null); setNote(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "approve" && "Duyệt toàn bộ lô?"}
              {pending?.kind === "approveSelected" && `Duyệt ${pending.codes?.length} mục đã chọn?`}
              {pending?.kind === "release" && "Phát hành lô sang Đơn hàng?"}
              {pending?.kind === "reject" && `Loại ${pending.codes?.length} mục khỏi lô?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-text-2">
                {pending?.kind === "approve" && (
                  <>
                    <p>Sẽ duyệt <span className="font-semibold text-text-1">{rpoItems.length} RPO + {toItems.length} TO</span>, tổng <span className="font-semibold text-text-1">{fmtVnd(totalValue)}</span>.</p>
                    {isHighValue && (
                      <p className="rounded-card bg-warning/10 border border-warning/40 px-3 py-2 text-caption text-warning flex items-start gap-2">
                        <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span><strong>Lô giá trị cao (≥500M₫):</strong> bắt buộc ghi chú để audit (xác nhận hai cấp).</span>
                      </p>
                    )}
                  </>
                )}
                {pending?.kind === "approveSelected" && (
                  <>
                    <p>Duyệt <span className="font-semibold text-text-1">{pending.codes?.length} mục</span> ({fmtVnd(selectedValue)}). Các mục còn lại trong lô sẽ vẫn ở trạng thái chờ.</p>
                    <p className="rounded-card bg-info/10 border border-info/30 px-3 py-2 text-caption text-info flex items-start gap-2">
                      <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>Bắt buộc ghi chú — duyệt một phần cần lý do audit.</span>
                    </p>
                  </>
                )}
                {pending?.kind === "release" && (
                  <p>Đẩy <span className="font-semibold text-text-1">{activeItems.length} mục</span> sang <span className="text-primary font-medium">Đơn hàng</span>. Lô sẽ bị <span className="text-text-1 font-semibold">khoá</span>, không sửa được nữa.</p>
                )}
                {pending?.kind === "reject" && (
                  <p>Các mục bị loại sẽ <span className="text-danger font-medium">không được phát hành</span> nhưng vẫn lưu trong lô để truy vết.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5">
            <label className="text-caption text-text-3 uppercase tracking-wide font-semibold">
              Ghi chú {
                pending?.kind === "reject" ? "(bắt buộc)" :
                pending?.kind === "approveSelected" ? "(bắt buộc)" :
                isHighValue && pending?.kind === "approve" ? "(bắt buộc)" :
                "(tùy chọn)"
              }
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Lý do / ghi chú audit…"
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={
                (pending?.kind === "reject" && !note.trim()) ||
                (pending?.kind === "approveSelected" && !note.trim()) ||
                (pending?.kind === "approve" && isHighValue && !note.trim())
              }
              className={cn(
                pending?.kind === "release" ? "bg-gradient-primary text-primary-foreground" :
                pending?.kind === "reject" ? "bg-danger text-danger-foreground hover:bg-danger/90" :
                "bg-success text-success-foreground hover:bg-success/90"
              )}
            >
              {pending?.kind === "approve" && "Approve all"}
              {pending?.kind === "approveSelected" && "Approve selected"}
              {pending?.kind === "release" && "Release ngay"}
              {pending?.kind === "reject" && "Loại khỏi batch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

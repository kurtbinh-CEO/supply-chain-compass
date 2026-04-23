import { useMemo, useState } from "react";
import { CheckCircle2, ArrowLeftRight, XCircle, Clock, Sparkles, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  NM_COMMITMENTS,
  SKU_BASES,
  type NmId,
  type CommitmentTier,
} from "@/data/unis-enterprise-dataset";

/** Local UI status derived from {tier} + small randomized seed for "Đã gửi" timing. */
type ResponseStatus = "confirmed" | "counter" | "pending" | "rejected";

const TIER_LABEL: Record<CommitmentTier, string> = {
  Hard: "Hard",
  Firm: "Firm",
  Soft: "Soft",
  Counter: "Counter",
};

const STATUS_META: Record<ResponseStatus, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  confirmed: { label: "Đã xác nhận",   tone: "bg-success-bg text-success border-success/30",   icon: CheckCircle2 },
  counter:   { label: "Đề xuất khác",  tone: "bg-warning-bg text-warning border-warning/30",   icon: ArrowLeftRight },
  pending:   { label: "Đang chờ NM",   tone: "bg-info-bg text-primary border-primary/30",      icon: Clock },
  rejected:  { label: "Đã từ chối",    tone: "bg-danger-bg text-danger border-danger/30",      icon: XCircle },
};

const REJECT_REASONS = [
  "Hết năng lực",
  "Thiếu nguyên liệu",
  "Lịch SX không khớp",
  "Khác",
] as const;

function deriveStatus(tier: CommitmentTier): ResponseStatus {
  if (tier === "Hard") return "confirmed";
  if (tier === "Counter") return "counter";
  return "pending"; // Firm + Soft default to pending until SC manager acts
}

/** Days since "request sent" — derive a stable pseudo value per row. */
function sentDaysAgo(skuCode: string): number {
  let h = 0;
  for (let i = 0; i < skuCode.length; i++) h = (h * 31 + skuCode.charCodeAt(i)) >>> 0;
  return (h % 3) + 1; // 1–3 days
}

const fmt = (n: number) => `${n.toLocaleString("vi-VN")} m²`;

interface CounterFormState {
  open: boolean;
  rowKey: string | null;
  qty: string;
  reason: typeof REJECT_REASONS[number];
}

export function NmCommitmentResponses({
  nmId,
  isStale,
}: {
  nmId: NmId;
  isStale: boolean;
}) {
  const rows = useMemo(() => NM_COMMITMENTS.filter((c) => c.nmId === nmId), [nmId]);

  // Local overrides keyed by `${nmId}:${sku}` to simulate post-action UI state.
  const [overrides, setOverrides] = useState<Record<string, ResponseStatus>>({});
  const [form, setForm] = useState<CounterFormState>({
    open: false,
    rowKey: null,
    qty: "",
    reason: "Hết năng lực",
  });

  const statusFor = (sku: string, tier: CommitmentTier): ResponseStatus =>
    overrides[`${nmId}:${sku}`] ?? deriveStatus(tier);

  const counts = useMemo(() => {
    const c = { sent: rows.length, confirmed: 0, pending: 0, counter: 0, rejected: 0 };
    rows.forEach((r) => {
      const s = statusFor(r.skuBaseCode, r.tier);
      if (s === "confirmed") c.confirmed++;
      else if (s === "pending") c.pending++;
      else if (s === "counter") c.counter++;
      else c.rejected++;
    });
    return c;
  }, [rows, overrides]);

  const setStatus = (sku: string, status: ResponseStatus) =>
    setOverrides((s) => ({ ...s, [`${nmId}:${sku}`]: status }));

  const handleConfirm = (sku: string) => {
    setStatus(sku, "confirmed");
    toast.success(`Đã ghi nhận xác nhận từ NM`, { description: `${sku} — chuyển sang Hard.` });
  };

  const handleReject = (sku: string) => {
    setStatus(sku, "rejected");
    toast(`Đã ghi nhận từ chối`, { description: `${sku} — sẽ chuyển sang kịch bản thay thế.` });
  };

  const openCounter = (sku: string, currentQty: number) => {
    setForm({ open: true, rowKey: sku, qty: String(currentQty), reason: "Hết năng lực" });
  };

  const submitCounter = () => {
    if (!form.rowKey) return;
    const qty = parseInt(form.qty, 10);
    if (isNaN(qty) || qty < 0) {
      toast.error("Số lượng không hợp lệ");
      return;
    }
    setStatus(form.rowKey, "counter");
    toast.success(`Đã gửi đề xuất khác`, {
      description: `${form.rowKey} → ${fmt(qty)} (${form.reason})`,
    });
    setForm({ open: false, rowKey: null, qty: "", reason: "Hết năng lực" });
  };

  return (
    <div className="rounded-card border border-surface-3 bg-surface-1/50 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-table-sm font-semibold text-text-1">Phản hồi cam kết từ NM</p>
        </div>
        <div className="flex items-center gap-1.5 text-caption">
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-text-2">
            Đã gửi <span className="font-semibold text-text-1">{counts.sent}</span>
          </span>
          <span className="rounded-full bg-success-bg text-success px-2 py-0.5 font-medium">
            Xác nhận <span className="font-semibold">{counts.confirmed}</span>
          </span>
          <span className="rounded-full bg-warning-bg text-warning px-2 py-0.5 font-medium">
            Counter <span className="font-semibold">{counts.counter}</span>
          </span>
          <span className="rounded-full bg-info-bg text-primary px-2 py-0.5 font-medium">
            Chờ <span className="font-semibold">{counts.pending}</span>
          </span>
          {counts.rejected > 0 && (
            <span className="rounded-full bg-danger-bg text-danger px-2 py-0.5 font-medium">
              Từ chối <span className="font-semibold">{counts.rejected}</span>
            </span>
          )}
        </div>
      </div>

      {isStale && (
        <div className="rounded-button border border-danger/40 bg-danger-bg px-3 py-2 text-caption text-danger flex items-start gap-2">
          <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Dữ liệu NM <span className="font-semibold">quá cũ (≥ 72h)</span> — phản hồi cam kết bị
            khóa cho đến khi NM đồng bộ lại.
          </span>
        </div>
      )}

      <div className="rounded-card border border-surface-3 bg-surface-0 overflow-hidden">
        <table className="w-full text-table-sm">
          <thead className="bg-surface-2 text-text-3 text-caption uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-2 font-semibold">Mã hàng</th>
              <th className="text-right px-3 py-2 font-semibold">Yêu cầu</th>
              <th className="text-right px-3 py-2 font-semibold">Cam kết</th>
              <th className="text-center px-3 py-2 font-semibold">Tier</th>
              <th className="text-center px-3 py-2 font-semibold">Trạng thái</th>
              <th className="text-center px-3 py-2 font-semibold">SLA phản hồi</th>
              <th className="text-right px-3 py-2 font-semibold">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const status = statusFor(r.skuBaseCode, r.tier);
              const meta = STATUS_META[status];
              const Icon = meta.icon;
              const base = SKU_BASES.find((b) => b.code === r.skuBaseCode);
              const days = sentDaysAgo(r.skuBaseCode);
              const slaPct = Math.min(100, Math.round((days / 3) * 100));
              const slaColor =
                days >= 3 ? "bg-danger" : days >= 2 ? "bg-warning" : "bg-success";
              const isPending = status === "pending";
              const disabled = isStale;

              return (
                <tr key={r.skuBaseCode} className="border-t border-surface-3">
                  <td className="px-3 py-2">
                    <span className="font-mono text-text-1">{r.skuBaseCode}</span>
                    {base?.name && (
                      <span className="text-text-3 text-caption block truncate max-w-[180px]">
                        {base.name}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-2">
                    {fmt(r.requestedM2)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-1 font-medium">
                    {fmt(r.committedM2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center rounded-full border border-surface-3 bg-surface-1 px-2 py-0.5 text-caption text-text-2">
                      {TIER_LABEL[r.tier]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-semibold",
                        meta.tone
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {isPending ? (
                      <div className="space-y-1 min-w-[120px]">
                        <p className="text-caption text-text-3 text-center">
                          Chờ phản hồi: <span className="font-semibold text-text-2">{days}/3</span>{" "}
                          ngày
                        </p>
                        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className={cn("h-full transition-all", slaColor)}
                            style={{ width: `${slaPct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-caption text-text-3 text-center">—</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {isPending ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          disabled={disabled}
                          onClick={() => handleConfirm(r.skuBaseCode)}
                          className={cn(
                            "rounded-button px-2 py-1 text-caption font-medium border transition-colors flex items-center gap-1",
                            disabled
                              ? "opacity-40 cursor-not-allowed border-surface-3 text-text-3"
                              : "border-success/40 text-success hover:bg-success-bg"
                          )}
                          title="Xác nhận đầy đủ"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Xác nhận
                        </button>
                        <button
                          disabled={disabled}
                          onClick={() => openCounter(r.skuBaseCode, r.committedM2)}
                          className={cn(
                            "rounded-button px-2 py-1 text-caption font-medium border transition-colors flex items-center gap-1",
                            disabled
                              ? "opacity-40 cursor-not-allowed border-surface-3 text-text-3"
                              : "border-warning/40 text-warning hover:bg-warning-bg"
                          )}
                          title="Đề xuất số lượng khác"
                        >
                          <ArrowLeftRight className="h-3 w-3" /> Đề xuất
                        </button>
                        <button
                          disabled={disabled}
                          onClick={() => handleReject(r.skuBaseCode)}
                          className={cn(
                            "rounded-button px-2 py-1 text-caption font-medium border transition-colors flex items-center gap-1",
                            disabled
                              ? "opacity-40 cursor-not-allowed border-surface-3 text-text-3"
                              : "border-danger/40 text-danger hover:bg-danger-bg"
                          )}
                          title="Từ chối toàn bộ"
                        >
                          <XCircle className="h-3 w-3" /> Từ chối
                        </button>
                      </div>
                    ) : (
                      <div className="text-right">
                        <span className="text-caption text-text-3">
                          Hiệu lực đến {new Date(r.validUntil).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-caption text-text-3">
                  Chưa có cam kết nào cho NM này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {form.open && form.rowKey && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setForm((s) => ({ ...s, open: false }))}
        >
          <div
            className="rounded-card border border-surface-3 bg-surface-0 w-full max-w-sm p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-warning" />
              <p className="text-body font-semibold text-text-1">Đề xuất số lượng khác</p>
            </div>
            <p className="text-caption text-text-3">
              Mã hàng <span className="font-mono text-text-1">{form.rowKey}</span> — gửi đề xuất
              ngược về SC Manager để đối chiếu.
            </p>
            <div className="space-y-2">
              <label className="text-caption text-text-2">Số lượng tối đa NM có thể cam kết (m²)</label>
              <input
                type="number"
                min={0}
                value={form.qty}
                onChange={(e) => setForm((s) => ({ ...s, qty: e.target.value }))}
                className="w-full rounded-button border border-surface-3 bg-surface-1 px-3 py-1.5 text-table-sm tabular-nums text-text-1 outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <label className="text-caption text-text-2">Lý do</label>
              <select
                value={form.reason}
                onChange={(e) =>
                  setForm((s) => ({ ...s, reason: e.target.value as typeof REJECT_REASONS[number] }))
                }
                className="w-full rounded-button border border-surface-3 bg-surface-1 px-3 py-1.5 text-table-sm text-text-1 outline-none focus:border-primary"
              >
                {REJECT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setForm((s) => ({ ...s, open: false }))}
                className="rounded-button border border-surface-3 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-1"
              >
                Huỷ
              </button>
              <button
                onClick={submitCounter}
                className="rounded-button bg-gradient-primary text-primary-foreground px-3 py-1.5 text-table-sm font-medium"
              >
                Gửi đề xuất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

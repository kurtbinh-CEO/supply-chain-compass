/**
 * OrdersEdgeBanners — 4 banners cho P3 edge cases trên OrdersPage drillDown.
 *
 *  Edge 3 — SplitShipmentBanner:    PO totalQty > capacity 1 chuyến → chia chuyến.
 *  Edge 4 — PartialDeliveryBanner:  Có ≥1 line giao thiếu (qtyDelivered < qty).
 *  Edge 5 — DamageClaimBanner:      Có ≥1 line ghi nhận hư hỏng tại stage giao.
 *  Edge 6 — HoldShipCountdown:      PO container fill < ngưỡng → đếm ngược hold.
 *
 * Tất cả pure-presentational, dùng tokens semantic. Mọi text tiếng Việt.
 */
import { useMemo, useState } from "react";
import {
  AlertTriangle, Truck, PackageMinus, Camera, Clock, Send, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { PoLifecycleRow } from "@/lib/po-lifecycle-data";
import type { PoGroup } from "@/lib/po-group-builder";

/* ════════════════════════════════════════════════════════════
   Constants — capacity & hold thresholds (đồng bộ ConfigPage)
   ════════════════════════════════════════════════════════════ */
const CAPACITY_M2: Record<string, { label: string; m2: number }> = {
  "40ft":      { label: "Container 40ft", m2: 1200 },
  "20ft":      { label: "Container 20ft", m2: 600  },
  "truck_15t": { label: "Xe tải 15T",     m2: 500  },
  "truck_10t": { label: "Xe tải 10T",     m2: 350  },
};
const HOLD_FILL_THRESHOLD_PCT = 70;
const HOLD_MAX_DAYS = 3;

/* ════════════════════════════════════════════════════════════
   EDGE 3 — Split shipment banner
   ════════════════════════════════════════════════════════════ */
export function SplitShipmentBanner({ group }: { group: PoGroup }) {
  const containerType = group.containerFill?.type ?? "40ft";
  const cap = CAPACITY_M2[containerType] ?? CAPACITY_M2["40ft"];
  const total = group.totalQty;
  if (total <= cap.m2) return null;

  const numTrips = Math.ceil(total / cap.m2);
  // Phân bổ qty mỗi chuyến: chuyến đầu đầy, chuyến cuối còn lại
  const trips: { idx: number; qty: number; vehicle: string; status: string }[] = [];
  let remaining = total;
  for (let i = 1; i <= numTrips; i++) {
    const q = Math.min(remaining, cap.m2);
    remaining -= q;
    // Chuyến nhỏ cuối có thể downgrade phương tiện
    const vehicle = q < cap.m2 * 0.6 ? smallerVehicle(containerType) : containerType;
    trips.push({
      idx: i,
      qty: q,
      vehicle: CAPACITY_M2[vehicle]?.label ?? vehicle,
      status: i === 1 ? "ĐẶT XE" : i === 2 ? "NHÁP" : "CHỜ XẾP",
    });
  }

  return (
    <div className="rounded-md border border-warning/40 bg-warning-bg/40 px-3 py-2.5 space-y-2">
      <div className="flex items-start gap-2 text-table-sm text-warning">
        <Truck className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <b>{total.toLocaleString("vi-VN")}m²</b> vượt capacity{" "}
          <b>{cap.m2.toLocaleString("vi-VN")}m²/{containerType}</b> → cần{" "}
          <b>{numTrips} chuyến</b>. PO status = trạng thái thấp nhất trong các chuyến.
        </div>
      </div>
      <div className="rounded-md border border-warning/30 bg-surface-0 overflow-hidden">
        <table className="w-full text-table-sm">
          <thead className="bg-surface-1 text-text-3 text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-1.5 w-20">Chuyến</th>
              <th className="text-right px-3 py-1.5 w-28">Số lượng</th>
              <th className="text-left px-3 py-1.5">Xe</th>
              <th className="text-left px-3 py-1.5 w-28">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((t) => (
              <tr key={t.idx} className="border-t border-surface-3/60">
                <td className="px-3 py-1.5 font-mono text-text-1">#{t.idx}</td>
                <td className="px-3 py-1.5 text-right tabular-nums text-text-1">
                  {t.qty.toLocaleString("vi-VN")} m²
                </td>
                <td className="px-3 py-1.5 text-text-2">{t.vehicle}</td>
                <td className="px-3 py-1.5">
                  <span className="inline-flex items-center rounded-sm bg-info-bg text-info border border-info/30 px-1.5 py-0.5 text-[10px] font-semibold">
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function smallerVehicle(t: string): string {
  if (t === "40ft") return "20ft";
  if (t === "20ft") return "truck_15t";
  if (t === "truck_15t") return "truck_10t";
  return t;
}

/* ════════════════════════════════════════════════════════════
   EDGE 4 — Partial delivery banner + create-backorder dialog
   ════════════════════════════════════════════════════════════ */
export function PartialDeliveryBanner({ group }: { group: PoGroup }) {
  const partials = useMemo(
    () => group.lines.filter((l) => l.qtyDelivered != null && l.qtyDelivered < l.qty),
    [group],
  );
  const [open, setOpen] = useState(false);
  if (partials.length === 0) return null;

  const totalGap = partials.reduce((s, l) => s + (l.qty - (l.qtyDelivered ?? 0)), 0);

  return (
    <>
      <div className="rounded-md border border-warning/40 bg-warning-bg/40 px-3 py-2.5 space-y-2">
        <div className="flex items-start gap-2 text-table-sm text-warning">
          <PackageMinus className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            NM giao thiếu <b>{totalGap.toLocaleString("vi-VN")}m²</b> trên {partials.length} mã hàng.
            Chọn xử lý:
          </div>
        </div>
        <div className="space-y-1">
          {partials.map((l) => (
            <div key={l.id} className="flex items-center gap-2 text-table-sm bg-surface-0 rounded-sm px-2 py-1 border border-surface-3/60">
              <span className="font-mono text-text-1 truncate flex-1">{l.skuLabel}</span>
              <span className="tabular-nums text-text-3">
                {(l.qtyDelivered ?? 0).toLocaleString("vi-VN")} / {l.qty.toLocaleString("vi-VN")} m²
              </span>
              <span className="tabular-nums text-warning font-semibold">
                thiếu {(l.qty - (l.qtyDelivered ?? 0)).toLocaleString("vi-VN")} m²
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-table-sm"
            onClick={() => toast.success("Đã chấp nhận thiếu", {
              description: `${group.poNumber} đóng partial · cờ "THIẾU ${totalGap}m²"`,
            })}
          >
            Chấp nhận thiếu
          </Button>
          <Button
            size="sm"
            className="h-7 text-table-sm bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => setOpen(true)}
          >
            <Send className="h-3 w-3 mr-1" /> Tạo PO bổ sung
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo PO bổ sung (backorder)</DialogTitle>
            <DialogDescription>
              Tự động phát PO mới cùng NM/CN/SKU với số lượng còn thiếu. PO mới sẽ được liên kết
              với <b className="font-mono">{group.poNumber}</b>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-table-sm">
            <div className="flex justify-between"><span className="text-text-3">Mã backorder</span>
              <span className="font-mono text-text-1">{group.poNumber}-B</span></div>
            <div className="flex justify-between"><span className="text-text-3">NM</span>
              <span className="text-text-1">{group.fromName}</span></div>
            <div className="flex justify-between"><span className="text-text-3">CN</span>
              <span className="text-text-1">{group.toName}</span></div>
            <div className="flex justify-between"><span className="text-text-3">Tổng số lượng</span>
              <span className="tabular-nums text-text-1 font-semibold">{totalGap.toLocaleString("vi-VN")} m²</span></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Đóng</Button>
            <Button
              onClick={() => {
                setOpen(false);
                toast.success(`Đã tạo PO bổ sung ${group.poNumber}-B`, {
                  description: `${totalGap.toLocaleString("vi-VN")}m² · liên kết ${group.poNumber}`,
                });
              }}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" /> Tạo PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   EDGE 5 — Damage claim panel (CN check "Có hư hỏng")
   ════════════════════════════════════════════════════════════ */
export function DamageClaimPanel({ row, onClaim }: {
  row: PoLifecycleRow;
  onClaim?: (gap: number, note: string, photos: number) => void;
}) {
  const [photos, setPhotos] = useState(0);
  const [note, setNote] = useState("");
  const [gap, setGap] = useState<string>("");

  const gapNum = Number(gap);
  const valid = photos >= 3 && note.trim().length > 0 && gapNum > 0 && !Number.isNaN(gapNum);

  return (
    <div className="rounded-md border border-danger/40 bg-danger-bg/40 px-3 py-3 space-y-2.5">
      <div className="flex items-start gap-2 text-table-sm text-danger">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          CN ghi nhận <b>hư hỏng</b> tại {row.poNumber} ({row.skuLabel}).
          Bắt buộc minh chứng để khởi tạo claim record.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <div className="md:col-span-1">
          <Label className="text-caption">Ảnh hư hỏng (≥ 3) *</Label>
          <button
            type="button"
            onClick={() => setPhotos((p) => p + 1)}
            className={cn(
              "mt-1 w-full h-9 rounded-md border-2 border-dashed inline-flex items-center justify-center gap-1.5 text-table-sm transition-colors",
              photos >= 3
                ? "border-success/40 bg-success-bg/40 text-success"
                : "border-danger/40 bg-surface-0 text-danger hover:bg-danger-bg/30",
            )}
          >
            <Camera className="h-3.5 w-3.5" />
            <span className="tabular-nums">{photos} ảnh</span>
            {photos >= 3 ? <span>✓</span> : <span>(thêm)</span>}
          </button>
        </div>
        <div className="md:col-span-1">
          <Label className="text-caption">Số lượng hư hỏng (m²) *</Label>
          <Input
            type="number" value={gap}
            onChange={(e) => setGap(e.target.value)}
            placeholder="vd 120"
            className="mt-1 h-9 text-table-sm tabular-nums text-right font-mono"
          />
        </div>
        <div className="md:col-span-1">
          <Label className="text-caption">Mô tả *</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tình trạng, nguyên nhân nghi ngờ…"
            rows={2}
            className="mt-1 text-table-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm" variant="outline" className="h-7 text-table-sm"
          disabled={!valid}
          onClick={() => {
            onClaim?.(gapNum, note, photos);
            toast.success(`Đã tạo claim cho ${row.poNumber}`, {
              description: `${gapNum}m² hư hỏng · ${photos} ảnh · cảnh báo SC Manager + NM`,
            });
            setPhotos(0); setNote(""); setGap("");
          }}
        >
          Tạo claim record
        </Button>
        <Button
          size="sm" className="h-7 text-table-sm bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={!valid}
          onClick={() => {
            toast.success(`Đã tạo PO thay thế cho ${row.poNumber}`, {
              description: `${gapNum}m² · liên kết claim · gửi NM ${row.fromName}`,
            });
          }}
        >
          <Send className="h-3.5 w-3.5 mr-1" /> Tạo PO thay thế
        </Button>
        {!valid && (
          <span className="text-table-sm text-danger inline-flex items-center gap-1">
            <X className="h-3 w-3" /> Cần ≥3 ảnh, mô tả, và số lượng hư hỏng
          </span>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   EDGE 6 — Hold/ship countdown banner
   ════════════════════════════════════════════════════════════ */
export function HoldShipCountdown({ group }: { group: PoGroup }) {
  // Chỉ apply khi PO đã đặt xe (nm_confirmed) hoặc trước khi pickup, có fill thấp.
  if (group.stage !== "nm_confirmed" && group.stage !== "approved" && group.stage !== "sent_nm") return null;
  const fill = group.containerFill?.pct ?? 100;
  if (fill >= HOLD_FILL_THRESHOLD_PCT) return null;

  // Mock: số ngày đã giữ = từ leader.hoursInStage
  const hours = group.leader?.hoursInStage ?? 0;
  const daysHeld = Math.min(HOLD_MAX_DAYS, Math.floor(hours / 24));
  const daysLeft = Math.max(0, HOLD_MAX_DAYS - daysHeld);

  // ETA ngày hết hạn
  const expire = new Date();
  expire.setDate(expire.getDate() + daysLeft);
  const expireText = `${String(expire.getDate()).padStart(2, "0")}/${String(expire.getMonth() + 1).padStart(2, "0")}`;

  // Gợi ý gom: mock theo PO khác cùng NM trong group.
  const suggestQty = Math.round(((HOLD_FILL_THRESHOLD_PCT - fill) / 100) * 1200);
  const newPct = Math.min(100, fill + Math.round((suggestQty / 1200) * 100));

  const expired = daysLeft === 0;

  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2.5 space-y-2",
        expired
          ? "border-success/40 bg-success-bg/40"
          : "border-info/30 bg-info-bg/40",
      )}
    >
      <div className={cn("flex items-start gap-2 text-table-sm", expired ? "text-success" : "text-info")}>
        <Clock className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="flex-1">
          {expired ? (
            <>
              ✅ <b>Sẵn sàng xuất</b> — đã hết hạn giữ {HOLD_MAX_DAYS} ngày. Xuất ngay để tránh trễ
              kế hoạch.
            </>
          ) : (
            <>
              ⏳ <b>Đang giữ chuyến</b> · Fill <b className="tabular-nums">{fill}%</b> &lt;{" "}
              {HOLD_FILL_THRESHOLD_PCT}% · Còn <b className="tabular-nums">{daysLeft}</b> ngày
              (hết <b>{expireText}</b>)
            </>
          )}
        </div>
      </div>

      {/* Progress bar countdown */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-text-3">
          <span>Tiến độ giữ</span>
          <span className="tabular-nums">{daysHeld}/{HOLD_MAX_DAYS} ngày</span>
        </div>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              expired ? "bg-success" : daysLeft <= 1 ? "bg-warning" : "bg-info",
            )}
            style={{ width: `${(daysHeld / HOLD_MAX_DAYS) * 100}%` }}
          />
        </div>
      </div>

      {!expired && suggestQty > 0 && (
        <div className="rounded-sm bg-surface-0 border border-surface-3 px-2.5 py-1.5 text-table-sm">
          <span className="text-text-3">Gợi ý gom:</span>{" "}
          <b className="font-mono text-text-1">{group.poNumber.replace(/W\d+/, "W21")}</b> cùng NM{" "}
          <b className="text-text-1">{group.fromName}</b> → gom thêm{" "}
          <b className="tabular-nums text-text-1">{suggestQty.toLocaleString("vi-VN")}m²</b> →
          fill <b className="tabular-nums text-success">{newPct}%</b>
        </div>
      )}
    </div>
  );
}

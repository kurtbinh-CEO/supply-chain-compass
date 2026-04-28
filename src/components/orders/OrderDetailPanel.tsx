/**
 * OrderDetailPanel — Side Panel phải khi click vào 1 PO/TO row.
 * 5 sections: Header (sticky) · Lifecycle Timeline · Chi tiết hàng hoá ·
 * Cam kết & Tracking · Minh chứng & Nhật ký.
 *
 * (Sẽ được implement đầy đủ ở Phase 2.)
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { X, Send, CheckCircle2, Truck, Package, Flag, ClipboardCheck, Camera, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  STAGE_META, STAGE_ORDER, STAGE_SLA_HOURS,
  type LifecycleStage, type PoLifecycleRow, type PoEvidence,
} from "@/lib/po-lifecycle-data";
import { type PoGroup } from "@/lib/po-group-builder";

interface Props {
  group: PoGroup;
  onAction: (line: PoLifecycleRow) => void;
  onCancel: (line: PoLifecycleRow) => void;
  onClose: () => void;
}

const NEXT_ACTION: Record<LifecycleStage, { label: string; icon: typeof Send } | null> = {
  approved:     { label: "Gửi NM",            icon: Send },
  sent_nm:      { label: "NM xác nhận",       icon: CheckCircle2 },
  nm_confirmed: { label: "Đặt xe",            icon: Truck },
  pickup:       { label: "Xe đã lấy hàng",    icon: Package },
  in_transit:   { label: "Xe đã đến CN",      icon: Flag },
  delivering:   { label: "Kiểm đếm & POD",    icon: ClipboardCheck },
  completed:    null,
  cancelled:    null,
};

const NEXT_ACTION_TONE: Record<LifecycleStage, string> = {
  approved:     "bg-info text-info-foreground hover:bg-info/90",
  sent_nm:      "bg-purple-600 text-white hover:bg-purple-700",
  nm_confirmed: "bg-warning text-warning-foreground hover:bg-warning/90",
  pickup:       "bg-amber-500 text-white hover:bg-amber-600",
  in_transit:   "bg-info text-info-foreground hover:bg-info/90",
  delivering:   "bg-success text-success-foreground hover:bg-success/90",
  completed:    "",
  cancelled:    "",
};

function unitPrice(skuLabel: string) {
  if (skuLabel.startsWith("GA-600")) return 185_000;
  if (skuLabel.startsWith("GA-300")) return 145_000;
  return 160_000;
}

function EvidenceThumb({ ev }: { ev: PoEvidence }) {
  return (
    <div className="flex flex-col items-center w-14" title={ev.label}>
      <div className="h-14 w-14 rounded border border-surface-3 bg-surface-1 overflow-hidden flex items-center justify-center">
        {ev.url ? (
          // eslint-disable-next-line jsx-a11y/img-redundant-alt
          <img src={ev.url} alt={ev.label} className="h-full w-full object-cover" />
        ) : ev.kind === "doc" ? (
          <FileText className="h-6 w-6 text-danger" />
        ) : ev.kind === "signature" ? (
          <span className="text-text-3 text-xs">✍</span>
        ) : (
          <ImageIcon className="h-6 w-6 text-text-3" />
        )}
      </div>
      <div className="mt-0.5 w-full truncate text-[10px] text-text-3 text-center">{ev.label}</div>
    </div>
  );
}

export function OrderDetailPanel({ group, onAction, onCancel, onClose }: Props) {
  const navigate = useNavigate();
  const leader = group.leader;
  const stage = group.stage;
  const next = NEXT_ACTION[stage];
  const Icon = next?.icon;

  const totalValue = group.lines.reduce((s, l) => s + l.qty * unitPrice(l.skuLabel), 0);

  // Cam kết gốc (mock)
  const commitment = useMemo(() => {
    const skuBase = (group.lines[0]?.skuLabel ?? "GA-600").split(" ")[0];
    const nmName = group.kind === "RPO" ? group.fromName : "—";
    const committed = Math.max(group.totalQty * 5, 4200);
    const releasedPct = Math.min(100, Math.round((group.totalQty / committed) * 100));
    return { skuBase, nmName, committed, releasedPct };
  }, [group]);

  // Gộp evidence từ tất cả lines (dedupe theo label)
  const allEvidence = useMemo(() => {
    const seen = new Set<string>();
    const out: PoEvidence[] = [];
    group.lines.forEach((l) => l.evidence.forEach((e) => {
      if (!seen.has(e.label)) { seen.add(e.label); out.push(e); }
    }));
    return out;
  }, [group]);

  // Map timeline events theo stage để lookup nhanh
  const eventsByStage = useMemo(() => {
    const m = new Map<LifecycleStage, typeof leader.timeline[number]>();
    leader.timeline.forEach((e) => { m.set(e.stage, e); });
    return m;
  }, [leader.timeline]);

  return (
    <div className="flex flex-col h-full">
      {/* ── SECTION 1: HEADER (sticky) ── */}
      <div className="sticky top-0 z-10 border-b border-surface-3 bg-surface-0 p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-h3 font-bold text-text-1 truncate">{group.poNumber}</div>
            <div className="text-table-sm text-text-2 truncate">
              {group.fromName} → {group.toName} · {group.kind} · {group.totalQty.toLocaleString()} m² · {group.lines.length} SKU
            </div>
            <div className="text-[11px] text-text-3 mt-0.5">
              Tạo {leader.timeline[0]?.ts ?? "—"} · {(leader.timeline[0]?.note ?? "").slice(0, 60)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-button p-1.5 hover:bg-surface-2 text-text-2"
            title="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <div className="text-caption uppercase text-text-3 font-semibold">Trạng thái hiện tại</div>
          <Badge variant="outline" className={cn("text-table mt-1 px-3 py-1 font-bold", STAGE_META[stage].tone)}>
            {STAGE_META[stage].label}
          </Badge>
          {leader.hoursInStage > 0 && (
            <div className="text-[11px] text-text-3 mt-1">
              {leader.hoursInStage}h trong trạng thái này
            </div>
          )}
        </div>

        {next && Icon && (
          <Button
            onClick={() => onAction(leader)}
            className={cn("w-full min-h-11 font-semibold", NEXT_ACTION_TONE[stage])}
          >
            <Icon className="h-4 w-4 mr-1.5" /> {next.label}
          </Button>
        )}
        {(stage === "approved" || stage === "sent_nm" || stage === "nm_confirmed") && (
          <button
            onClick={() => onCancel(leader)}
            className="w-full text-[11px] text-text-3 hover:text-danger underline"
          >
            ✕ Hủy đơn
          </button>
        )}
      </div>

      {/* ── SECTION 2: LIFECYCLE TIMELINE ── */}
      <div className="p-4 border-b border-surface-3">
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
          Tiến trình đơn hàng
        </div>
        <div className="space-y-2">
          {STAGE_ORDER.map((s, i) => {
            const rank = STAGE_ORDER.indexOf(stage);
            const myRank = i;
            const isCurrent = s === stage;
            const reached = myRank < rank;
            const ev = eventsByStage.get(s);

            return (
              <div key={s} className="flex gap-2">
                <div className="flex flex-col items-center">
                  <span className={cn(
                    "h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] shrink-0",
                    reached && "bg-success border-success text-white",
                    isCurrent && "bg-primary border-primary text-white animate-pulse",
                    !isCurrent && !reached && "border-surface-3 bg-surface-1 text-text-3",
                  )}>
                    {reached ? "✓" : isCurrent ? "●" : ""}
                  </span>
                  {i < STAGE_ORDER.length - 1 && (
                    <span className={cn(
                      "w-0.5 flex-1 mt-0.5",
                      reached ? "bg-success/40" : "bg-surface-3",
                    )} style={{ minHeight: 24 }} />
                  )}
                </div>
                <div className="flex-1 pb-3">
                  <div className={cn(
                    "text-table-sm font-medium",
                    reached && "text-success",
                    isCurrent && "text-primary",
                    !isCurrent && !reached && "text-text-3",
                  )}>
                    {STAGE_META[s].label}
                    {ev && <span className="ml-2 text-text-3 font-normal text-[11px]">· {ev.ts} · {ev.actor}</span>}
                    {isCurrent && !ev && (
                      <span className="ml-2 text-warning font-normal text-[11px]">
                        ⏱ SLA {STAGE_SLA_HOURS[s]}h
                      </span>
                    )}
                  </div>
                  {ev?.note && (
                    <div className="text-[11px] text-text-2 mt-0.5 italic">"{ev.note}"</div>
                  )}
                  {ev?.evidence && ev.evidence.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {ev.evidence.map((e, idx) => <EvidenceThumb key={idx} ev={e} />)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION 3: CHI TIẾT HÀNG HOÁ ── */}
      <div className="p-4 border-b border-surface-3">
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
          Chi tiết hàng hoá
        </div>
        <table className="w-full text-table-sm">
          <thead className="text-[10px] uppercase text-text-3 border-b border-surface-3">
            <tr>
              <th className="text-left py-1 font-semibold">Mã hàng</th>
              <th className="text-right py-1 font-semibold">SL</th>
              <th className="text-right py-1 font-semibold">Đơn giá</th>
              <th className="text-right py-1 font-semibold">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {group.lines.map((l) => (
              <tr key={l.id} className="border-b border-surface-3/50">
                <td className="py-1.5 font-mono text-text-1">{l.skuLabel}</td>
                <td className="py-1.5 text-right tabular-nums">{l.qty.toLocaleString()} m²</td>
                <td className="py-1.5 text-right tabular-nums text-text-2 text-[11px]">
                  {unitPrice(l.skuLabel).toLocaleString()} ₫
                </td>
                <td className="py-1.5 text-right tabular-nums font-medium">
                  {(l.qty * unitPrice(l.skuLabel) / 1e6).toFixed(1)}tr
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-surface-3">
            <tr className="font-semibold">
              <td className="py-1.5 text-text-1">Tổng</td>
              <td className="py-1.5 text-right tabular-nums text-text-1">{group.totalQty.toLocaleString()} m²</td>
              <td className="py-1.5"></td>
              <td className="py-1.5 text-right tabular-nums text-text-1">{(totalValue / 1e6).toFixed(1)}tr</td>
            </tr>
          </tfoot>
        </table>

        {leader.carrierName && (
          <div className="mt-3 rounded border border-surface-3 bg-surface-1 p-2 text-[11px] text-text-2">
            Container: <span className="font-mono text-text-1">{group.containerFill.type}</span> ·
            Fill <span className="font-semibold">{group.containerFill.pct}%</span> ·
            NVT: <span className="text-text-1">{leader.carrierName}</span>
            {leader.vehiclePlate && <> · Xe <span className="font-mono">{leader.vehiclePlate}</span></>}
          </div>
        )}
      </div>

      {/* ── SECTION 4: CAM KẾT & TRACKING ── */}
      {group.kind === "RPO" && commitment.nmName !== "—" && (
        <div className="p-4 border-b border-surface-3">
          <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
            Cam kết gốc
          </div>
          <div className="text-table-sm space-y-1">
            <div>
              <span className="text-text-3">{commitment.nmName}:</span>{" "}
              <span className="text-text-1 font-semibold tabular-nums">{commitment.committed.toLocaleString()} m²</span>{" "}
              <span className="text-text-3">cam kết</span>
            </div>
            <div className="text-[11px] text-text-2">
              Đã release: <b className="text-text-1">{group.totalQty.toLocaleString()}/{commitment.committed.toLocaleString()} m²</b>
              {" ("}<b className="text-primary">{commitment.releasedPct}%</b>{")"}
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${commitment.releasedPct}%` }} />
            </div>
            <button
              type="button"
              onClick={() =>
                navigate(`/hub?step=commitment&nm=${encodeURIComponent(commitment.nmName)}&sku=${encodeURIComponent(commitment.skuBase)}`)
              }
              className="text-[11px] text-primary hover:underline"
            >
              Xem cam kết gốc →
            </button>
          </div>
        </div>
      )}

      {/* ── SECTION 5: MINH CHỨNG & NHẬT KÝ ── */}
      <div className="p-4">
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
          Minh chứng
        </div>
        {allEvidence.length === 0 ? (
          <div className="text-[11px] text-text-3 italic mb-3">
            Chưa có minh chứng nào. Sẽ được thêm khi chuyển trạng thái.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-3">
            {allEvidence.map((e, i) => <EvidenceThumb key={i} ev={e} />)}
          </div>
        )}

        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
          Nhật ký thay đổi
        </div>
        <div className="space-y-1 text-[11px] text-text-2">
          {leader.timeline.map((e, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-text-3 tabular-nums w-16 shrink-0">{e.ts}</span>
              <span className="text-text-1 flex-1">
                <b>{e.actor}</b>
                {e.note && <> — {e.note}</>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

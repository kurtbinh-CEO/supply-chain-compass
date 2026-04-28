/**
 * OrderDetailPanel — Side Panel phải khi click vào 1 PO/TO row.
 *
 * SPLIT focus theo ORDERS-MULTIDROP:
 *   - Table drill-down = DATA (drops + SKU lines + giá)
 *   - Side panel = ACTION (chỉnh trạng thái, comment, upload, history)
 *
 * Sections:
 *   1. Header sticky — PO ID + tóm tắt drops + status badge + primary action
 *   2. Tiến trình — shared steps (approved→pickup) + per-drop steps (in_transit→completed)
 *   3. Minh chứng + Nhật ký thay đổi (sort newest first)
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Send, CheckCircle2, Truck, Package, Flag, ClipboardCheck, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  STAGE_META, STAGE_ORDER, STAGE_SLA_HOURS,
  type LifecycleStage, type PoLifecycleRow, type PoEvidence,
} from "@/lib/po-lifecycle-data";
import { type PoGroup, type DropPoint } from "@/lib/po-group-builder";

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

/** Steps "shared" cho cả group (xảy ra 1 lần dù multi-drop). */
const SHARED_STAGES: LifecycleStage[] = ["approved", "sent_nm", "nm_confirmed", "pickup"];
/** Steps "split" — mỗi drop có 1 timeline riêng. */
const PER_DROP_STAGES: LifecycleStage[] = ["in_transit", "delivering", "completed"];

function EvidenceThumb({ ev, onOpen }: { ev: PoEvidence; onOpen?: (ev: PoEvidence) => void }) {
  const clickable = !!ev.url && !!onOpen;
  return (
    <button
      type="button"
      onClick={clickable ? () => onOpen!(ev) : undefined}
      disabled={!clickable}
      className={cn("flex flex-col items-center w-14 group", clickable && "cursor-zoom-in")}
      title={clickable ? `${ev.label} — bấm để xem` : ev.label}
    >
      <div className="h-14 w-14 rounded border border-surface-3 bg-surface-1 overflow-hidden flex items-center justify-center group-hover:border-primary transition-colors">
        {ev.url ? (
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
    </button>
  );
}

/** Render 1 step trong timeline (shared hoặc per-drop). */
function TimelineStep({
  stage, currentStage, ev, slaHours, onOpenEv,
}: {
  stage: LifecycleStage;
  currentStage: LifecycleStage;
  ev?: PoLifecycleRow["timeline"][number];
  slaHours: number;
  onOpenEv: (e: PoEvidence) => void;
}) {
  const rank = STAGE_ORDER.indexOf(currentStage);
  const myRank = STAGE_ORDER.indexOf(stage);
  const isCurrent = stage === currentStage;
  const reached = myRank < rank;

  return (
    <div className="flex gap-2">
      <div className="flex flex-col items-center">
        <span className={cn(
          "h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] shrink-0",
          reached && "bg-success border-success text-white",
          isCurrent && "bg-primary border-primary text-white animate-pulse",
          !isCurrent && !reached && "border-surface-3 bg-surface-1 text-text-3",
        )}>
          {reached ? "✓" : isCurrent ? "●" : ""}
        </span>
        <span className={cn("w-0.5 flex-1 mt-0.5", reached ? "bg-success/40" : "bg-surface-3")} style={{ minHeight: 16 }} />
      </div>
      <div className="flex-1 pb-2">
        <div className={cn(
          "text-table-sm font-medium",
          reached && "text-success",
          isCurrent && "text-primary",
          !isCurrent && !reached && "text-text-3",
        )}>
          {STAGE_META[stage].label}
          {ev && <span className="ml-2 text-text-3 font-normal text-[11px]">· {ev.ts} · {ev.actor}</span>}
          {isCurrent && !ev && (
            <span className="ml-2 text-warning font-normal text-[11px]">⏱ SLA {slaHours}h</span>
          )}
        </div>
        {ev?.note && (
          <div className="text-[11px] text-text-2 mt-0.5 italic">"{ev.note}"</div>
        )}
        {ev?.evidence && ev.evidence.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ev.evidence.map((e, idx) => <EvidenceThumb key={idx} ev={e} onOpen={onOpenEv} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export function OrderDetailPanel({ group, onAction, onCancel, onClose }: Props) {
  const navigate = useNavigate();
  const leader = group.leader;
  const stage = group.stage;
  const next = NEXT_ACTION[stage];
  const Icon = next?.icon;
  const [lightbox, setLightbox] = useState<PoEvidence | null>(null);

  // Shared timeline — lấy từ leader (events có stage ∈ SHARED_STAGES)
  const sharedEvents = useMemo(() => {
    const m = new Map<LifecycleStage, typeof leader.timeline[number]>();
    leader.timeline.forEach((e) => { if (SHARED_STAGES.includes(e.stage)) m.set(e.stage, e); });
    return m;
  }, [leader.timeline]);

  // Per-drop events — mỗi drop tự có timeline (lấy từ line đầu của drop)
  const perDropEvents = useMemo(() => {
    return group.drops.map((d) => {
      const dropLeader = d.lines[0];
      const m = new Map<LifecycleStage, typeof dropLeader.timeline[number]>();
      dropLeader.timeline.forEach((e) => { if (PER_DROP_STAGES.includes(e.stage)) m.set(e.stage, e); });
      return { drop: d, events: m, leader: dropLeader };
    });
  }, [group.drops]);

  // Gộp evidence từ tất cả lines (dedupe theo label)
  const allEvidence = useMemo(() => {
    const seen = new Set<string>();
    const out: PoEvidence[] = [];
    group.lines.forEach((l) => l.evidence.forEach((e) => {
      if (!seen.has(e.label)) { seen.add(e.label); out.push(e); }
    }));
    return out;
  }, [group]);

  // Full change log (sort newest first, dedupe)
  const fullChangeLog = useMemo(() => {
    const parseTs = (ts: string): number => {
      const m = ts.match(/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
      if (!m) return 0;
      const [, d, mo, h, mi] = m;
      return new Date(new Date().getFullYear(), +mo - 1, +d, +h, +mi).getTime();
    };
    const multi = group.lines.length > 1;
    const all: Array<typeof leader.timeline[number] & { lineLabel?: string; dropCn?: string }> = [];
    group.lines.forEach((l) => {
      l.timeline.forEach((e) => {
        all.push({
          ...e,
          lineLabel: multi ? l.skuLabel : undefined,
          dropCn: group.isConsolidated ? l.toName : undefined,
        });
      });
    });
    const dedup = new Map<string, typeof all[number]>();
    all.forEach((e) => {
      const key = `${e.ts}|${e.actor}|${e.stage}|${e.note ?? ""}|${e.dropCn ?? ""}`;
      const prev = dedup.get(key);
      if (!prev) { dedup.set(key, e); return; }
      const seen = new Set((prev.evidence ?? []).map((x) => x.label));
      const merged = [...(prev.evidence ?? [])];
      (e.evidence ?? []).forEach((x) => { if (!seen.has(x.label)) merged.push(x); });
      dedup.set(key, { ...prev, evidence: merged });
    });
    return Array.from(dedup.values()).sort((a, b) => parseTs(b.ts) - parseTs(a.ts));
  }, [group.lines, group.isConsolidated]);

  return (
    <div className="flex flex-col h-full">
      {/* ── SECTION 1: HEADER (sticky) ── */}
      <div className="sticky top-0 z-10 border-b border-surface-3 bg-surface-0 p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="font-mono text-h3 font-bold text-text-1 truncate">{group.poNumber}</div>
            <div className="text-table-sm text-text-2 truncate">
              {group.fromName} → {group.isConsolidated ? `${group.drops.length} điểm giao` : group.drops[0]?.cn ?? group.toName}
              {" · "}{group.kind} · {group.totalQty.toLocaleString()} m²
            </div>
            {group.isConsolidated && (
              <div className="text-[11px] text-warning mt-0.5 inline-flex items-center gap-1">
                🔗 Ghép tuyến: {group.drops.map(d => d.cn).join(" → ")}
                {group.savingAmount && (
                  <span className="text-success font-semibold">
                    · tiết kiệm {(group.savingAmount / 1e6).toFixed(1)}M₫
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} className="rounded-button p-2 hover:bg-surface-2 text-text-2 h-11 w-11 flex items-center justify-center shrink-0" title="Đóng">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <div className="text-caption uppercase text-text-3 font-semibold">Trạng thái hiện tại</div>
          <Badge variant="outline" className={cn("text-table mt-1 px-3 py-1 font-bold", STAGE_META[stage].tone)}>
            {STAGE_META[stage].label}
          </Badge>
          {leader.hoursInStage > 0 && (
            <div className="text-[11px] text-text-3 mt-1">{leader.hoursInStage}h trong trạng thái này</div>
          )}
        </div>

        {next && Icon && (
          <Button onClick={() => onAction(leader)} className={cn("w-full min-h-11 font-semibold", NEXT_ACTION_TONE[stage])}>
            <Icon className="h-4 w-4 mr-1.5" /> {next.label}
            {group.isConsolidated && PER_DROP_STAGES.includes(stage) && (
              <span className="text-[10px] opacity-80 ml-1">(per drop)</span>
            )}
          </Button>
        )}
        {(stage === "approved" || stage === "sent_nm" || stage === "nm_confirmed") && (
          <button onClick={() => onCancel(leader)} className="w-full text-[11px] text-text-3 hover:text-danger underline">
            ✕ Hủy đơn
          </button>
        )}
      </div>

      {/* ── SECTION 2: TIẾN TRÌNH ── */}
      <div className="p-4 border-b border-surface-3">
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
          Tiến trình giao hàng
        </div>

        {/* Shared steps */}
        <div className="space-y-0">
          {!group.isConsolidated ? (
            // Single-drop: render flat (tất cả 7 stages)
            STAGE_ORDER.map((s) => {
              const ev = leader.timeline.find(e => e.stage === s);
              return (
                <TimelineStep
                  key={s}
                  stage={s}
                  currentStage={stage}
                  ev={ev}
                  slaHours={STAGE_SLA_HOURS[s]}
                  onOpenEv={setLightbox}
                />
              );
            })
          ) : (
            <>
              {/* Multi-drop: shared stages */}
              <div className="text-[10px] uppercase tracking-wide text-text-3 mb-1.5 font-semibold">
                Bước chung (1 xe)
              </div>
              {SHARED_STAGES.map((s) => (
                <TimelineStep
                  key={s}
                  stage={s}
                  currentStage={stage}
                  ev={sharedEvents.get(s)}
                  slaHours={STAGE_SLA_HOURS[s]}
                  onOpenEv={setLightbox}
                />
              ))}

              {/* Per-drop sections */}
              {perDropEvents.map(({ drop, events, leader: dl }) => (
                <div key={drop.cn} className="mt-3 pt-3 border-t border-dashed border-surface-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[11px] uppercase tracking-wide text-text-2 font-bold">
                      Drop {drop.dropOrder}: {drop.cn}
                      <span className="ml-1.5 text-text-3 font-normal normal-case">
                        ({drop.qty.toLocaleString()}m² · ETA {drop.eta ?? "—"})
                      </span>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px]", STAGE_META[drop.stage].tone)}>
                      {STAGE_META[drop.stage].short}
                    </Badge>
                  </div>
                  {PER_DROP_STAGES.map((s) => (
                    <TimelineStep
                      key={s}
                      stage={s}
                      currentStage={drop.stage}
                      ev={events.get(s)}
                      slaHours={STAGE_SLA_HOURS[s]}
                      onOpenEv={setLightbox}
                    />
                  ))}
                  {/* Per-drop action button */}
                  {NEXT_ACTION[drop.stage] && PER_DROP_STAGES.includes(drop.stage) && (
                    <Button
                      size="sm"
                      onClick={() => onAction(dl)}
                      className={cn("mt-1 h-8 text-[11px] gap-1", NEXT_ACTION_TONE[drop.stage])}
                    >
                      {(() => { const I = NEXT_ACTION[drop.stage]!.icon; return <I className="h-3.5 w-3.5" />; })()}
                      {NEXT_ACTION[drop.stage]!.label} — {drop.cn}
                    </Button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── SECTION 3: CAM KẾT GỐC (RPO only) ── */}
      {group.kind === "RPO" && (() => {
        const skuBase = (group.lines[0]?.skuLabel ?? "GA-600").split(" ")[0];
        const committed = Math.max(group.totalQty * 5, 4200);
        const releasedPct = Math.min(100, Math.round((group.totalQty / committed) * 100));
        return (
          <div className="p-4 border-b border-surface-3">
            <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">Cam kết gốc</div>
            <div className="text-table-sm space-y-1">
              <div>
                <span className="text-text-3">{group.fromName}:</span>{" "}
                <span className="text-text-1 font-semibold tabular-nums">{committed.toLocaleString()} m²</span>{" "}
                <span className="text-text-3">cam kết</span>
              </div>
              <div className="text-[11px] text-text-2">
                Đã release: <b className="text-text-1">{group.totalQty.toLocaleString()}/{committed.toLocaleString()} m²</b>
                {" ("}<b className="text-primary">{releasedPct}%</b>{")"}
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${releasedPct}%` }} />
              </div>
              <button
                type="button"
                onClick={() => navigate(`/hub?step=commitment&nm=${encodeURIComponent(group.fromName)}&sku=${encodeURIComponent(skuBase)}`)}
                className="text-[11px] text-primary hover:underline"
              >
                Xem cam kết gốc →
              </button>
            </div>
          </div>
        );
      })()}

      {/* ── SECTION 4: MINH CHỨNG + NHẬT KÝ ── */}
      <div className="p-4">
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
          Minh chứng <span className="text-text-3 font-normal">({allEvidence.length})</span>
        </div>
        {allEvidence.length === 0 ? (
          <div className="text-[11px] text-text-3 italic mb-3">Chưa có minh chứng nào.</div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-3">
            {allEvidence.map((e, i) => <EvidenceThumb key={i} ev={e} onOpen={setLightbox} />)}
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <div className="text-caption uppercase tracking-wide text-text-3 font-semibold">
            Nhật ký thay đổi <span className="text-text-3 font-normal">({fullChangeLog.length})</span>
          </div>
          <div className="text-[10px] text-text-3">Mới nhất trước</div>
        </div>
        <div className="space-y-2.5">
          {fullChangeLog.length === 0 ? (
            <div className="text-[11px] text-text-3 italic">Chưa có chuyển trạng thái nào.</div>
          ) : fullChangeLog.map((e, i) => (
            <div key={i} className="flex gap-2 pb-2 border-b border-surface-3/40 last:border-b-0 last:pb-0">
              <span className="text-[10px] text-text-3 tabular-nums w-14 shrink-0 pt-0.5">{e.ts}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 font-semibold", STAGE_META[e.stage].tone)}>
                    {STAGE_META[e.stage].short}
                  </Badge>
                  <span className="text-[11px] text-text-1 font-semibold">{e.actor}</span>
                  {e.dropCn && (
                    <span className="text-[10px] font-mono text-warning">· {e.dropCn}</span>
                  )}
                  {e.lineLabel && !e.dropCn && (
                    <span className="text-[10px] font-mono text-text-3">· {e.lineLabel}</span>
                  )}
                </div>
                {e.note && (
                  <div className="text-[11px] text-text-2 mt-0.5 italic">"{e.note}"</div>
                )}
                {e.evidence && e.evidence.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {e.evidence.map((ev, idx) => <EvidenceThumb key={idx} ev={ev} onOpen={setLightbox} />)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── LIGHTBOX ── */}
      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="max-w-3xl p-2 bg-black/95 border-0">
          {lightbox?.url && (
            <div className="flex flex-col items-center gap-2">
              <img src={lightbox.url} alt={lightbox.label} className="max-h-[80vh] w-auto object-contain rounded" />
              <div className="text-table-sm text-white/90 text-center">{lightbox.label}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

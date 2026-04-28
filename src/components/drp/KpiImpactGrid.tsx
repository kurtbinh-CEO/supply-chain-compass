/* ═══════════════════════════════════════════════════════════════════════════
   §  KpiImpactGrid — 4 KPI live cho preview chỉnh container.
   §  Hiển thị Fill% / Tổng km / Cước / Chênh cước (VND).
   §  Mỗi card flash ring khi value đổi (theo thao tác user).
   §  Read-only ngoài reorderMode (chỉ hiện baseline). Trong reorderMode hiện
   §  cả "Sau khi sửa" + delta + mũi tên ↑↓.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Gauge, Route, Wallet, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  // Baseline (gốc)
  baseFillPct: number;
  baseKm: number;
  baseFreightVnd: number;
  // Sau khi sửa (có thể bằng base nếu chưa dirty)
  newFillPct: number;
  newKm: number;
  newFreightVnd: number;

  /** Có ở chế độ reorder/edit không (hiện cả delta + label "Sau khi sửa"). */
  editing: boolean;
  /** Đã thay đổi so với baseline chưa. */
  dirty: boolean;
}

function fmtKm(v: number) {
  return v.toLocaleString("vi-VN") + " km";
}
function fmtFreight(v: number) {
  if (Math.abs(v) >= 1_000_000)
    return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M₫";
  if (Math.abs(v) >= 1_000) return Math.round(v / 1000) + "K₫";
  return v + "₫";
}
function fmtDeltaVnd(v: number) {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  const abs = Math.abs(v);
  if (abs >= 1_000_000)
    return sign + (abs / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M₫";
  if (abs >= 1_000) return sign + Math.round(abs / 1000) + "K₫";
  return sign + abs + "₫";
}
function fmtDeltaPct(v: number) {
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return sign + Math.abs(v).toFixed(1) + "%";
}

type Tone = "ok" | "warn" | "danger" | "info" | "neutral";
const TONE: Record<Tone, { border: string; bg: string; icon: string; valueText: string }> = {
  ok:      { border: "border-success/40", bg: "bg-success-bg/40",  icon: "text-success", valueText: "text-text-1" },
  warn:    { border: "border-warning/40", bg: "bg-warning-bg/40",  icon: "text-warning", valueText: "text-text-1" },
  danger:  { border: "border-danger/40",  bg: "bg-danger-bg/40",   icon: "text-danger",  valueText: "text-text-1" },
  info:    { border: "border-info/40",    bg: "bg-info-bg/40",     icon: "text-info",    valueText: "text-text-1" },
  neutral: { border: "border-surface-3",  bg: "bg-surface-2",      icon: "text-text-3",  valueText: "text-text-1" },
};

interface CardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  base?: string;          // hiện baseline khi dirty
  delta?: { text: string; tone: "warn" | "ok" | "neutral"; arrow?: "up" | "down" };
  tone: Tone;
  /** Bump để trigger flash. Truyền value mới hoặc timestamp. */
  flashKey: string | number;
}

function KpiCard({ icon, label, value, base, delta, tone, flashKey }: CardProps) {
  const t = TONE[tone];
  const [flash, setFlash] = useState(false);
  const firstRef = useRef(true);

  useEffect(() => {
    if (firstRef.current) { firstRef.current = false; return; }
    setFlash(true);
    const id = window.setTimeout(() => setFlash(false), 700);
    return () => window.clearTimeout(id);
  }, [flashKey]);

  return (
    <div
      className={cn(
        "rounded-card border p-2.5 flex flex-col gap-1 transition-all min-w-0",
        t.border, t.bg,
        flash && "ring-2 ring-primary/60 ring-offset-1 ring-offset-surface-1 scale-[1.02]",
      )}
      style={{ transitionDuration: flash ? "120ms" : "300ms" }}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide font-medium text-text-3">
        <span className={t.icon}>{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className={cn("text-lg font-semibold tabular-nums leading-tight truncate", t.valueText)}>
        {value}
      </div>
      <div className="flex items-center justify-between gap-1 min-h-[14px]">
        {base ? (
          <span className="text-[10px] text-text-3 tabular-nums truncate">
            Gốc: {base}
          </span>
        ) : <span />}
        {delta && (
          <span className={cn(
            "inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums shrink-0",
            delta.tone === "warn" && "text-warning",
            delta.tone === "ok" && "text-success",
            delta.tone === "neutral" && "text-text-3",
          )}>
            {delta.arrow === "up" && <ArrowUp className="h-2.5 w-2.5" />}
            {delta.arrow === "down" && <ArrowDown className="h-2.5 w-2.5" />}
            {delta.text}
          </span>
        )}
      </div>
    </div>
  );
}

export function KpiImpactGrid({
  baseFillPct, baseKm, baseFreightVnd,
  newFillPct, newKm, newFreightVnd,
  editing, dirty,
}: Props) {
  const deltaKm = newKm - baseKm;
  const deltaFreight = newFreightVnd - baseFreightVnd;
  const deltaFillPct = newFillPct - baseFillPct;

  // Tone cho Fill: ≥85 ok / 70-84 warn / <70 danger
  const fillTone: Tone = newFillPct >= 85 ? "ok" : newFillPct >= 70 ? "warn" : "danger";
  // Km tăng → warn; giảm/= → ok
  const kmTone: Tone = !dirty ? "neutral" : deltaKm > 0 ? "warn" : deltaKm < 0 ? "ok" : "neutral";
  // Cước tăng → warn; giảm → ok
  const freightTone: Tone = !dirty ? "neutral" : deltaFreight > 0 ? "warn" : deltaFreight < 0 ? "ok" : "neutral";
  // Chênh cước (delta) — luôn info nếu = 0, warn nếu tăng, ok nếu giảm
  const diffTone: Tone = deltaFreight > 0 ? "warn" : deltaFreight < 0 ? "ok" : "info";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      <KpiCard
        icon={<Gauge className="h-3 w-3" />}
        label="Lấp đầy"
        value={`${newFillPct}%`}
        base={dirty && deltaFillPct !== 0 ? `${baseFillPct}%` : undefined}
        delta={editing && dirty && deltaFillPct !== 0 ? {
          text: fmtDeltaPct(deltaFillPct),
          tone: deltaFillPct >= 0 ? "ok" : "warn",
          arrow: deltaFillPct > 0 ? "up" : "down",
        } : undefined}
        tone={fillTone}
        flashKey={newFillPct}
      />
      <KpiCard
        icon={<Route className="h-3 w-3" />}
        label="Tổng km"
        value={fmtKm(newKm)}
        base={dirty ? fmtKm(baseKm) : undefined}
        delta={editing && dirty ? {
          text: `${deltaKm > 0 ? "+" : deltaKm < 0 ? "−" : ""}${Math.abs(deltaKm)}km`,
          tone: deltaKm > 0 ? "warn" : deltaKm < 0 ? "ok" : "neutral",
          arrow: deltaKm > 0 ? "up" : deltaKm < 0 ? "down" : undefined,
        } : undefined}
        tone={kmTone}
        flashKey={newKm}
      />
      <KpiCard
        icon={<Wallet className="h-3 w-3" />}
        label="Cước"
        value={fmtFreight(newFreightVnd)}
        base={dirty ? fmtFreight(baseFreightVnd) : undefined}
        delta={editing && dirty ? {
          text: fmtDeltaVnd(deltaFreight),
          tone: deltaFreight > 0 ? "warn" : deltaFreight < 0 ? "ok" : "neutral",
          arrow: deltaFreight > 0 ? "up" : deltaFreight < 0 ? "down" : undefined,
        } : undefined}
        tone={freightTone}
        flashKey={newFreightVnd}
      />
      <KpiCard
        icon={<TrendingDown className="h-3 w-3" />}
        label="Chênh cước"
        value={dirty ? fmtDeltaVnd(deltaFreight) : "0₫"}
        delta={editing ? {
          text: dirty
            ? deltaFreight > 0 ? "Tăng" : deltaFreight < 0 ? "Tiết kiệm" : "Không đổi"
            : "Chưa sửa",
          tone: deltaFreight > 0 ? "warn" : deltaFreight < 0 ? "ok" : "neutral",
        } : undefined}
        tone={diffTone}
        flashKey={deltaFreight}
      />
    </div>
  );
}

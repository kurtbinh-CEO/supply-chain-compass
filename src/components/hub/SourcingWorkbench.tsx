import React, { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, AlertTriangle, HelpCircle, Send, Zap, Lock } from "lucide-react";
import { toast } from "sonner";
import { generatePONumber, getNmCode, poNumClasses, getPoTypeBadge } from "@/lib/po-numbers";
import {
  SKU_BASES,
  FACTORIES,
  NM_INVENTORY,
  NM_COMMITMENTS,
  getSkuNm,
} from "@/data/unis-enterprise-dataset";

interface Props { scale: number; objective?: Objective; onObjectiveChange?: (o: Objective) => void }

/* ─── Types ─── */
type Objective = "hybrid" | "lt" | "cost";
type Urgency = "CRITICAL" | "MEDIUM" | "LOW" | "OK";

/** SKU BASE-level requirement (variant aggregated) */
interface SkuReq {
  item: string;            // SKU base code (e.g. "GA-300")
  netReq: number;          // net requirement at base level (m²)
  ssBuffer: number;        // SS Hub at base level
  fcMin: number;
  urgency: Urgency;
  urgencyLabel: string;
  nmName: string;          // SINGLE source (rule #1)
}

/** Single-NM capability snapshot per SKU base */
interface NmCapability {
  nm: string;
  atp: number;             // Available-to-promise (m²) — onHand + inProduction
  lt: number;              // lead-time days
  costPerM2: number;
  reliability: number;     // 0-100 honoring %
  honoring: number;
  dataFresh: string;       // human label e.g. "32m", "3d"
  dataFreshStatus: "green" | "amber" | "red";
  moq: number;
  capacity: number;
  isStale: boolean;        // staleness === "stale"
}

/* ─── Base SKU requirements (BASE level — no per-variant rows) ─── */
const baseSkus: SkuReq[] = [
  { item: "GA-300", netReq: 1558, ssBuffer: 1750, fcMin: 3308, urgency: "CRITICAL", urgencyLabel: "HSTK 1,2d BD", nmName: getSkuNm("GA-300") || "Mikado" },
  { item: "GA-400", netReq: 227,  ssBuffer: 800,  fcMin: 1027, urgency: "MEDIUM",   urgencyLabel: "HSTK 4d",      nmName: getSkuNm("GA-400") || "Mikado" },
  { item: "GN-600", netReq: 480,  ssBuffer: 600,  fcMin: 1080, urgency: "MEDIUM",   urgencyLabel: "",             nmName: getSkuNm("GN-600") || "Mikado" },
  { item: "GA-600", netReq: 0,    ssBuffer: 1500, fcMin: 0,    urgency: "OK",       urgencyLabel: "ĐỦ HÀNG",      nmName: getSkuNm("GA-600") || "Toko"   },
  { item: "GT-300", netReq: 620,  ssBuffer: 900,  fcMin: 1520, urgency: "MEDIUM",   urgencyLabel: "",             nmName: getSkuNm("GT-300") || "Đồng Tâm" },
  { item: "GM-300", netReq: 340,  ssBuffer: 500,  fcMin: 840,  urgency: "LOW",      urgencyLabel: "",             nmName: getSkuNm("GM-300") || "Vigracera" },
  { item: "PK-001", netReq: 950,  ssBuffer: 600,  fcMin: 1550, urgency: "CRITICAL", urgencyLabel: "NM stale 3d",  nmName: getSkuNm("PK-001") || "Phú Mỹ" },
];

/** Build NM capability snapshot for any SKU base from SSOT data. */
function getNmCapability(skuBaseCode: string): NmCapability | null {
  const base = SKU_BASES.find((b) => b.code === skuBaseCode);
  if (!base) return null;
  const factory = FACTORIES.find((f) => f.id === base.nmId);
  if (!factory) return null;
  const inv = NM_INVENTORY.find((r) => r.nmId === base.nmId && r.skuBaseCode === skuBaseCode);
  const com = NM_COMMITMENTS.find((c) => c.nmId === base.nmId && c.skuBaseCode === skuBaseCode);

  const atp = (inv?.onHandM2 ?? 0) + (inv?.inProductionM2 ?? 0);
  const isStale = inv?.staleness === "stale";
  const dataFresh = inv?.staleness === "fresh" ? "< 1h" : inv?.staleness === "1d" ? "18h" : "3d";
  const dataFreshStatus: NmCapability["dataFreshStatus"] =
    inv?.staleness === "fresh" ? "green" : inv?.staleness === "1d" ? "amber" : "red";

  return {
    nm: factory.name,
    atp,
    lt: factory.ltDays,
    costPerM2: base.unitPrice,
    reliability: factory.honoringPct,
    honoring: factory.honoringPct,
    dataFresh,
    dataFreshStatus,
    moq: factory.moqM2,
    capacity: factory.capacityM2Month,
    isStale,
  };
}

const STEPS = [
  { num: 1, label: "Cần gì?",         desc: "Net Requirement" },
  { num: 2, label: "NM & năng lực",   desc: "Single Source" },
  { num: 3, label: "Phân bổ & MOQ",   desc: "Booking + MOQ" },
  { num: 4, label: "Xác nhận & Gửi",  desc: "Confirm & BPO" },
];

const OBJECTIVE_LABELS: Record<Objective, string> = {
  hybrid: "Cân bằng",
  lt:     "Ưu tiên LT",
  cost:   "Ưu tiên chi phí",
};

function urgencyBadge(u: Urgency) {
  switch (u) {
    case "CRITICAL": return { bg: "bg-danger-bg",  text: "text-danger",  icon: "🔴" };
    case "MEDIUM":   return { bg: "bg-warning-bg", text: "text-warning", icon: "🟡" };
    case "LOW":      return { bg: "bg-surface-1",  text: "text-text-2",  icon: "" };
    case "OK":       return { bg: "bg-success-bg", text: "text-success", icon: "✅" };
  }
}

/* ═══ STEPPER BAR ═══ */
function StepperBar({ active, completed, onStep }: { active: number; completed: Set<number>; onStep: (n: number) => void }) {
  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
      {STEPS.map((step, i) => {
        const isActive = step.num === active;
        const isDone = completed.has(step.num);
        const isFuture = !isActive && !isDone;
        return (
          <React.Fragment key={step.num}>
            {i > 0 && <ChevronRight className="h-4 w-4 text-text-3 shrink-0" />}
            <button
              onClick={() => onStep(step.num)}
              className={cn(
                "flex items-center gap-2.5 rounded-card px-4 py-3 border transition-all min-w-[180px] text-left",
                isActive && "bg-info-bg border-info shadow-sm",
                isDone && "bg-success-bg/50 border-success/30",
                isFuture && "bg-surface-1 border-surface-3 opacity-60",
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-table-sm font-bold shrink-0",
                isActive && "bg-info text-white",
                isDone && "bg-success text-white",
                isFuture && "bg-surface-3 text-text-3",
              )}>
                {isDone ? <Check className="h-4 w-4" /> : step.num}
              </div>
              <div>
                <div className={cn("text-table-sm font-semibold", isActive ? "text-info" : isDone ? "text-success" : "text-text-3")}>{step.label}</div>
                <div className="text-caption text-text-3">{step.desc}</div>
              </div>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ═══ STEP 1 — Net Requirement (BASE level) ═══ */
function Step1({ skus, onSelectSku, onAutoAll }: {
  skus: SkuReq[];
  onSelectSku: (item: string) => void;
  onAutoAll: () => void;
}) {
  const [showSufficient, setShowSufficient] = useState(false);
  const needSourcing = skus.filter((s) => s.urgency !== "OK");
  const sufficient = skus.filter((s) => s.urgency === "OK");
  const totalNetReq = needSourcing.reduce((a, s) => a + s.netReq, 0);
  const totalSs = needSourcing.reduce((a, s) => a + s.ssBuffer, 0);
  const totalFcMin = needSourcing.reduce((a, s) => a + s.fcMin, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-table text-text-2">
          Auto-pull từ S&OP Lock (mức <span className="font-medium text-text-1">mã gốc</span>).{" "}
          <span className="text-text-3">Read-only.</span>
        </p>
        <button onClick={onAutoAll} className="inline-flex items-center gap-1.5 rounded-button bg-gradient-primary text-primary-foreground px-4 py-2 text-table-sm font-medium hover:opacity-90">
          <Zap className="h-3.5 w-3.5" /> Tự động phân bổ tất cả
        </button>
      </div>

      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                {["Mã gốc", "Nhu cầu ròng (m²)", "SS Hub", "FC tối thiểu", "Mức độ", "Nhà máy (duy nhất)", ""].map((h, i) => (
                  <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {needSourcing.map((sk) => {
                const ub = urgencyBadge(sk.urgency);
                return (
                  <tr key={sk.item} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                    <td className="px-4 py-2.5 font-medium text-text-1">{sk.item}</td>
                    <td className="px-4 py-2.5 tabular-nums font-medium text-text-1">{sk.netReq.toLocaleString()}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-2">{sk.ssBuffer.toLocaleString()}</td>
                    <td className="px-4 py-2.5 tabular-nums font-medium text-text-1">{sk.fcMin.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium", ub.bg, ub.text)}>
                        {ub.icon} {sk.urgency}{sk.urgencyLabel ? ` (${sk.urgencyLabel})` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1 text-text-1 font-medium">
                        <Lock className="h-3 w-3 text-text-3" /> {sk.nmName}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => onSelectSku(sk.item)} className="inline-flex items-center gap-1 text-primary text-table-sm font-medium hover:underline">
                        Xem năng lực <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                <td className="px-4 py-2.5 text-text-1">TỔNG</td>
                <td className="px-4 py-2.5 tabular-nums text-text-1">{totalNetReq.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-text-1">{totalSs.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-text-1">{totalFcMin.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-text-2">{needSourcing.length} mã gốc cần đặt</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {sufficient.length > 0 && (
        <button onClick={() => setShowSufficient(!showSufficient)} className="text-table-sm text-text-3 hover:text-text-2">
          {showSufficient ? "▾" : "▸"} {sufficient.length} mã gốc đủ hàng
        </button>
      )}
      {showSufficient && (
        <div className="rounded-card border border-surface-3 bg-surface-1/30 overflow-hidden">
          <table className="w-full text-table-sm">
            <tbody>
              {sufficient.map((sk) => (
                <tr key={sk.item} className="border-b border-surface-3/30 text-text-3">
                  <td className="px-4 py-2">{sk.item}</td>
                  <td className="px-4 py-2">0</td>
                  <td className="px-4 py-2">{sk.ssBuffer.toLocaleString()}</td>
                  <td className="px-4 py-2">0</td>
                  <td className="px-4 py-2"><span className="text-success">✅ ĐỦ HÀNG</span></td>
                  <td className="px-4 py-2">{sk.nmName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══ STEP 2 — Single-source NM capability ═══ */
function Step2({ sku, capability, onConfirm }: {
  sku: SkuReq;
  capability: NmCapability | null;
  onConfirm: () => void;
}) {
  if (!capability) {
    return (
      <div className="rounded-card border border-danger/30 bg-danger-bg/30 p-4 text-danger text-table-sm">
        Không tìm thấy nhà máy nguồn cho {sku.item}. Kiểm tra Master Data.
      </div>
    );
  }

  const relColor = (r: number) => r >= 80 ? "text-success" : r >= 60 ? "text-warning" : "text-danger";
  const relGrade = (r: number) => r >= 90 ? "A" : r >= 80 ? "B" : r >= 70 ? "C" : "D";
  const atpOk = capability.atp >= sku.netReq;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-display text-body font-semibold text-text-1">
          {sku.item} — Cần {sku.netReq.toLocaleString()} m². Nhà máy nguồn duy nhất:{" "}
          <span className="text-primary">{capability.nm}</span>
        </h3>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-info-bg px-3 py-1 text-caption font-medium text-info">
          <Lock className="h-3 w-3" /> Single-source (1 mã gốc = 1 NM)
        </span>
      </div>

      {/* Stale data banner */}
      {capability.isStale && (
        <div className="rounded-card border border-danger/40 bg-danger-bg/40 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-table-sm font-semibold text-danger">
              Dữ liệu NM cũ — cần cập nhật trước khi đặt hàng
            </p>
            <p className="text-caption text-text-2 mt-1">
              Tồn kho {capability.nm} đã không cập nhật {capability.dataFresh}. Liên hệ NM hoặc chuyển sang Cổng nhà máy để yêu cầu sync.
            </p>
          </div>
        </div>
      )}

      {/* NM capability card */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-3 bg-surface-1/40 flex items-center justify-between">
          <span className="font-display text-body font-semibold text-text-1">{capability.nm}</span>
          <span className={cn(
            "inline-flex items-center gap-1 text-caption font-medium",
            capability.dataFreshStatus === "green" ? "text-success" : capability.dataFreshStatus === "amber" ? "text-warning" : "text-danger",
          )}>
            {capability.dataFreshStatus === "green" ? "🟢" : capability.dataFreshStatus === "amber" ? "🟡" : "🔴"} Dữ liệu: {capability.dataFresh}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-surface-3">
          <Metric label="ATP (m²)" value={capability.atp.toLocaleString()} status={atpOk ? "ok" : "warn"} />
          <Metric label="Lead-time" value={`${capability.lt} ngày`} />
          <Metric label="Cost/m²" value={`${(capability.costPerM2 / 1000).toFixed(0)}K₫`} />
          <Metric label="Honoring" value={`${capability.honoring}% ${relGrade(capability.honoring)}`} valueClass={relColor(capability.honoring)} />
          <Metric label="MOQ (m²)" value={capability.moq.toLocaleString()} />
          <Metric label="Capacity tháng" value={`${(capability.capacity / 1000).toFixed(0)}K m²`} />
          <Metric label="Reliability" value={`${capability.reliability}%`} valueClass={relColor(capability.reliability)} />
          <Metric label="Mã NM" value={getNmCode(capability.nm)} valueClass="font-mono text-info" />
        </div>
        <div className="px-5 py-3 bg-info-bg/20 border-t border-surface-3 text-caption text-text-2 flex items-center gap-1.5">
          <HelpCircle className="h-3 w-3 text-info shrink-0" />
          Phase 1: Single-source — không cho chọn NM khác. Multi-NM sẽ mở ở Phase 2 cho mã gốc thuộc nhóm fungible.
        </div>
      </div>

      {/* ATP shortfall warning */}
      {!atpOk && (
        <div className="rounded-card border border-warning/30 bg-warning-bg/30 px-4 py-2.5 flex items-center gap-2 text-table-sm text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          ATP {capability.atp.toLocaleString()} m² &lt; nhu cầu {sku.netReq.toLocaleString()} m². Cần chờ NM sản xuất bổ sung.
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onConfirm}
          disabled={capability.isStale}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-button px-5 py-2 text-table-sm font-medium",
            capability.isStale
              ? "bg-surface-3 text-text-3 cursor-not-allowed"
              : "bg-gradient-primary text-primary-foreground hover:opacity-90",
          )}
        >
          {capability.isStale ? "Đang chờ cập nhật dữ liệu" : "Tiếp → Phân bổ & MOQ"} <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function Metric({ label, value, status, valueClass }: { label: string; value: string; status?: "ok" | "warn"; valueClass?: string }) {
  return (
    <div className="bg-surface-2 px-4 py-3">
      <div className="text-caption uppercase text-text-3 tracking-wide">{label}</div>
      <div className={cn(
        "mt-1 font-display text-body font-semibold tabular-nums",
        status === "ok" && "text-success",
        status === "warn" && "text-warning",
        !status && !valueClass && "text-text-1",
        valueClass,
      )}>
        {value}
      </div>
    </div>
  );
}

/* ═══ STEP 3 — Booking allocation + MOQ (per SKU base × NM) ═══ */
interface Booking {
  item: string;
  nm: string;
  hubAvailable: number;
  pipeline: number;
  fc3M: number;
  ssHub: number;
  delta: number;        // ssHub - (hubAvailable + pipeline - fc3M); if positive => need booking
  bookingQty: number;   // user-editable; default = max(0, delta) rounded up to MOQ
  moq: number;
  afterRound: number;
  surplus: number;
}

function buildDefaultBookings(skus: SkuReq[]): Record<string, Booking> {
  const result: Record<string, Booking> = {};
  for (const sk of skus.filter((s) => s.urgency !== "OK")) {
    const cap = getNmCapability(sk.item);
    if (!cap) continue;
    // Demo numbers — derived from the SKU req profile
    const hubAvailable = Math.round(sk.ssBuffer * 0.45);
    const pipeline = Math.round(sk.netReq * 0.20);
    const fc3M = Math.round(sk.fcMin * 1.6);
    const ssHub = sk.ssBuffer;
    const projection = hubAvailable + pipeline - fc3M;
    const delta = ssHub - projection;
    const bookingQty = Math.max(0, delta);
    const afterRound = bookingQty < cap.moq && bookingQty > 0 ? cap.moq : bookingQty;
    const surplus = afterRound - bookingQty;
    result[sk.item] = {
      item: sk.item,
      nm: cap.nm,
      hubAvailable,
      pipeline,
      fc3M,
      ssHub,
      delta,
      bookingQty,
      moq: cap.moq,
      afterRound,
      surplus,
    };
  }
  return result;
}

function Step3({ skus, bookings, onUpdate, onConfirm }: {
  skus: SkuReq[];
  bookings: Record<string, Booking>;
  onUpdate: (item: string, qty: number) => void;
  onConfirm: () => void;
}) {
  const needSourcing = skus.filter((s) => s.urgency !== "OK");
  const grandBooking = needSourcing.reduce((a, sk) => a + (bookings[sk.item]?.bookingQty || 0), 0);
  const grandRounded = needSourcing.reduce((a, sk) => a + (bookings[sk.item]?.afterRound || 0), 0);
  const grandSurplus = grandRounded - grandBooking;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-card border border-info/30 bg-info-bg/30 px-4 py-3 text-table-sm text-text-2">
        <p className="font-medium text-info mb-1">Công thức booking (mức mã gốc):</p>
        <p className="font-mono text-caption">
          Δ = SS_Hub − (Hub_available + Pipeline − FC_3M)
        </p>
        <p className="text-caption text-text-3 mt-0.5">
          Nếu Δ &gt; 0 → cần đặt; sau đó round-up theo MOQ NM.
        </p>
      </div>

      {/* Per-SKU base booking cards */}
      <div className="space-y-3">
        {needSourcing.map((sk) => {
          const b = bookings[sk.item];
          if (!b) return null;
          const moqTriggered = b.bookingQty > 0 && b.bookingQty < b.moq;
          const projection = b.hubAvailable + b.pipeline - b.fc3M;

          return (
            <div key={sk.item} className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-display text-body font-semibold text-text-1">{sk.item}</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-1 px-2 py-0.5 text-caption text-text-2">
                    <Lock className="h-3 w-3" /> {b.nm} · Duy nhất
                  </span>
                </div>
                <span className="text-caption text-text-3">SS Hub mục tiêu: {b.ssHub.toLocaleString()} m²</span>
              </div>

              {/* Formula breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-table-sm">
                <FormulaCell label="Hub có" value={b.hubAvailable} />
                <FormulaCell label="+ Pipeline" value={b.pipeline} />
                <FormulaCell label="− FC 3T" value={-b.fc3M} negative />
                <FormulaCell label="= Dự báo cuối" value={projection} highlight />
                <FormulaCell label={`Δ vs SS Hub`} value={b.delta} status={b.delta > 0 ? "warn" : "ok"} />
              </div>

              {/* Booking qty + MOQ */}
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-table-sm text-text-2">Booking (m²):</label>
                <input
                  type="number"
                  value={b.bookingQty}
                  onChange={(e) => onUpdate(sk.item, parseInt(e.target.value) || 0)}
                  className="w-28 rounded border border-surface-3 bg-surface-0 px-2 py-1 text-table-sm tabular-nums text-text-1 outline-none focus:border-primary"
                />
                <span className="text-table-sm text-text-3">MOQ {b.nm}: {b.moq.toLocaleString()}</span>
                {moqTriggered && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2.5 py-0.5 text-caption font-medium text-warning">
                    <AlertTriangle className="h-3 w-3" /> Booking &lt; MOQ → round-up {b.afterRound.toLocaleString()} (+{b.surplus.toLocaleString()})
                  </span>
                )}
                {b.bookingQty >= b.moq && b.bookingQty > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2.5 py-0.5 text-caption font-medium text-success">
                    ✓ ≥ MOQ
                  </span>
                )}
                {b.bookingQty === 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-1 px-2.5 py-0.5 text-caption text-text-3">
                    Không cần booking (Δ ≤ 0)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-NM rollup summary */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="px-4 py-2.5 bg-surface-1/50 border-b border-surface-3">
          <span className="text-table-sm font-medium text-text-1">Tổng hợp per NM</span>
        </div>
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1/30">
              {["Nhà máy", "# mã gốc", "Booking (m²)", "Sau MOQ", "Surplus"].map((h, i) => (
                <th key={i} className="px-4 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(new Set(Object.values(bookings).map((b) => b.nm))).map((nm) => {
              const list = Object.values(bookings).filter((b) => b.nm === nm);
              const book = list.reduce((a, b) => a + b.bookingQty, 0);
              const round = list.reduce((a, b) => a + b.afterRound, 0);
              const surp = round - book;
              return (
                <tr key={nm} className="border-b border-surface-3/50 hover:bg-surface-1/20">
                  <td className="px-4 py-2 font-medium text-text-1">{nm}</td>
                  <td className="px-4 py-2 text-text-2">{list.length}</td>
                  <td className="px-4 py-2 tabular-nums text-text-1">{book.toLocaleString()}</td>
                  <td className="px-4 py-2 tabular-nums text-text-1">{round.toLocaleString()}</td>
                  <td className="px-4 py-2 tabular-nums text-warning">{surp > 0 ? `+${surp.toLocaleString()}` : "—"}</td>
                </tr>
              );
            })}
            <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
              <td className="px-4 py-2 text-text-1">TỔNG</td>
              <td className="px-4 py-2 text-text-2">{Object.keys(bookings).length}</td>
              <td className="px-4 py-2 tabular-nums text-text-1">{grandBooking.toLocaleString()}</td>
              <td className="px-4 py-2 tabular-nums text-text-1">{grandRounded.toLocaleString()}</td>
              <td className="px-4 py-2 tabular-nums text-warning">{grandSurplus > 0 ? `+${grandSurplus.toLocaleString()}` : "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button onClick={onConfirm} className="inline-flex items-center gap-1.5 rounded-button bg-gradient-primary text-primary-foreground px-5 py-2 text-table-sm font-medium">
          Xác nhận cam kết → Bước 4 <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function FormulaCell({ label, value, negative, highlight, status }: { label: string; value: number; negative?: boolean; highlight?: boolean; status?: "ok" | "warn" }) {
  return (
    <div className={cn(
      "rounded border px-3 py-2",
      highlight ? "border-primary/30 bg-primary/5" : "border-surface-3 bg-surface-1/30",
    )}>
      <div className="text-caption text-text-3">{label}</div>
      <div className={cn(
        "tabular-nums font-semibold",
        negative && "text-danger",
        status === "warn" && "text-warning",
        status === "ok" && "text-success",
        !negative && !status && "text-text-1",
      )}>
        {value > 0 ? value.toLocaleString() : value < 0 ? value.toLocaleString() : "0"}
      </div>
    </div>
  );
}

/* ═══ STEP 4 — Confirm & Create BPO ═══ */
function Step4({ bookings, onCreateBpo }: {
  bookings: Record<string, Booking>;
  onCreateBpo: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  // Aggregate per NM
  const nmAgg: Record<string, { qty: number; cost: number; items: string[] }> = {};
  for (const b of Object.values(bookings)) {
    if (b.afterRound <= 0) continue;
    const base = SKU_BASES.find((s) => s.code === b.item);
    const cost = (base?.unitPrice || 0) * b.afterRound;
    if (!nmAgg[b.nm]) nmAgg[b.nm] = { qty: 0, cost: 0, items: [] };
    nmAgg[b.nm].qty += b.afterRound;
    nmAgg[b.nm].cost += cost;
    nmAgg[b.nm].items.push(b.item);
  }

  const totalQty = Object.values(nmAgg).reduce((a, n) => a + n.qty, 0);
  const totalCost = Object.values(nmAgg).reduce((a, n) => a + n.cost, 0);

  const bpos = Object.entries(nmAgg).map(([nm, agg]) => ({
    id: `BPO-${getNmCode(nm)}-2605`,
    nm,
    qty: agg.qty,
    cost: agg.cost,
    items: agg.items,
  }));

  const fmtVnd = (n: number) => `${(n / 1_000_000).toFixed(1)}M₫`;

  return (
    <div className="space-y-5 animate-fade-in">
      <h3 className="font-display text-body font-semibold text-text-1">Xác nhận cam kết & tạo BPO</h3>

      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1/50">
              {["Nhà máy", "Mã gốc", "Tổng (m²)", "Chi phí", "BPO ID"].map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bpos.map((b) => (
              <tr key={b.id} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                <td className="px-4 py-2.5 font-medium text-text-1">{b.nm}</td>
                <td className="px-4 py-2.5 text-text-2">{b.items.join(", ")}</td>
                <td className="px-4 py-2.5 tabular-nums font-medium text-text-1">{b.qty.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-text-2">{fmtVnd(b.cost)}</td>
                <td className={cn("px-4 py-2.5 font-mono text-caption", getPoTypeBadge("BPO").text)}>{b.id}</td>
              </tr>
            ))}
            <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
              <td className="px-4 py-2.5 text-text-1">TỔNG</td>
              <td className="px-4 py-2.5 text-text-2">{bpos.length} BPO</td>
              <td className="px-4 py-2.5 tabular-nums text-text-1">{totalQty.toLocaleString()}</td>
              <td className="px-4 py-2.5 tabular-nums text-text-1">{fmtVnd(totalCost)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <button
        onClick={() => setShowConfirm(true)}
        disabled={bpos.length === 0}
        className={cn(
          "w-full rounded-button px-6 py-3 text-body font-semibold flex items-center justify-center gap-2 transition-opacity",
          bpos.length === 0
            ? "bg-surface-3 text-text-3 cursor-not-allowed"
            : "bg-gradient-primary text-primary-foreground hover:opacity-90",
        )}
      >
        <Send className="h-4 w-4" /> Xác nhận cam kết & gửi {bpos.length} BPO
      </button>

      {showConfirm && (
        <>
          <div className="fixed inset-0 bg-text-1/30 z-50" onClick={() => setShowConfirm(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-card border border-surface-3 bg-surface-2 p-6 shadow-xl space-y-4">
            <h3 className="font-display text-body font-semibold text-text-1">Tạo {bpos.length} BPO</h3>
            <div className="space-y-2">
              {bpos.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-table-sm">
                  <span className={cn("font-mono text-caption", getPoTypeBadge("BPO").text)}>{b.id}</span>
                  <span className="text-text-2">{b.nm} — {b.qty.toLocaleString()} m²</span>
                </div>
              ))}
            </div>
            <div className="border-t border-surface-3 pt-3">
              <p className="text-table-sm text-text-2">Tổng: {totalQty.toLocaleString()} m² | {fmtVnd(totalCost)}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowConfirm(false)} className="rounded-button border border-surface-3 px-4 py-1.5 text-table-sm text-text-2 hover:bg-surface-3">Sửa lại</button>
              <button
                onClick={() => { setShowConfirm(false); onCreateBpo(); }}
                className="rounded-button bg-gradient-primary text-primary-foreground px-4 py-1.5 text-table-sm font-medium"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══ MAIN COMPONENT ═══ */
export function SourcingWorkbench({ scale, objective: externalObjective, onObjectiveChange: externalOnChange }: Props) {
  const [activeStep, setActiveStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [internalObjective, setInternalObjective] = useState<Objective>("hybrid");
  const objective = externalObjective ?? internalObjective;
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [bpoCreated, setBpoCreated] = useState(false);

  const skus = useMemo(() => baseSkus.map((s) => ({
    ...s,
    netReq: Math.round(s.netReq * scale),
    ssBuffer: Math.round(s.ssBuffer * scale),
    fcMin: Math.round(s.fcMin * scale),
  })), [scale]);

  const [bookings, setBookings] = useState<Record<string, Booking>>(() => buildDefaultBookings(skus));

  // Rebuild bookings if scale changes
  useEffect(() => {
    setBookings(buildDefaultBookings(skus));
  }, [skus]);

  const currentSku = selectedSku ? skus.find((s) => s.item === selectedSku) || null : null;
  const currentCapability = useMemo(
    () => (selectedSku ? getNmCapability(selectedSku) : null),
    [selectedSku],
  );

  // Re-toast on objective change (kept for header dropdown UX continuity)
  const prevObjectiveRef = useRef(objective);
  useEffect(() => {
    if (objective !== prevObjectiveRef.current) {
      prevObjectiveRef.current = objective;
      toast.info(`Mục tiêu xếp hạng: ${OBJECTIVE_LABELS[objective]}`, {
        description: "Phase 1 single-source — không thay đổi NM, chỉ ảnh hưởng prioritization.",
      });
    }
  }, [objective]);

  const completeStep = (n: number) => setCompletedSteps((prev) => new Set(prev).add(n));

  const handleSelectSku = (item: string) => {
    setSelectedSku(item);
    completeStep(1);
    setActiveStep(2);
  };

  const handleAutoAll = () => {
    completeStep(1);
    completeStep(2);
    setActiveStep(3);
    toast.success("Tự động phân bổ hoàn tất", {
      description: `${Object.keys(bookings).length} mã gốc → NM nguồn duy nhất`,
    });
  };

  const handleStep2Confirm = () => {
    completeStep(2);
    setActiveStep(3);
  };

  const handleBookingUpdate = (item: string, qty: number) => {
    setBookings((prev) => {
      const b = prev[item];
      if (!b) return prev;
      const afterRound = qty > 0 && qty < b.moq ? b.moq : qty;
      return {
        ...prev,
        [item]: { ...b, bookingQty: qty, afterRound, surplus: afterRound - qty },
      };
    });
  };

  const handleAllocConfirm = () => {
    completeStep(3);
    setActiveStep(4);
  };

  const handleCreateBpo = () => {
    completeStep(4);
    setBpoCreated(true);
    const count = Object.values(bookings).filter((b) => b.afterRound > 0).length;
    toast.success(`BPO đã tạo cho ${new Set(Object.values(bookings).filter((b) => b.afterRound > 0).map((b) => b.nm)).size} NM`, {
      description: `${count} mã gốc · Theo dõi tại tab "Đối chiếu"`,
    });
  };

  if (bpoCreated) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="rounded-card border border-success/30 bg-success-bg/50 px-5 py-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-success" />
          <div>
            <p className="text-body font-semibold text-success">✅ BPO đã tạo & gửi NM</p>
            <p className="text-table-sm text-text-2 mt-0.5">Theo dõi tiến độ honoring tại tab "Đối chiếu".</p>
          </div>
        </div>
        <StepperBar active={4} completed={new Set([1, 2, 3, 4])} onStep={() => {}} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <StepperBar active={activeStep} completed={completedSteps} onStep={setActiveStep} />

      {activeStep === 1 && (
        <Step1 skus={skus} onSelectSku={handleSelectSku} onAutoAll={handleAutoAll} />
      )}
      {activeStep === 2 && currentSku && (
        <Step2 sku={currentSku} capability={currentCapability} onConfirm={handleStep2Confirm} />
      )}
      {activeStep === 2 && !currentSku && (
        <div className="text-center py-8 text-text-3">
          <p>Chọn mã gốc từ Bước 1 trước.</p>
          <button onClick={() => setActiveStep(1)} className="text-primary text-table-sm mt-2 hover:underline">← Quay lại Bước 1</button>
        </div>
      )}
      {activeStep === 3 && (
        <Step3 skus={skus} bookings={bookings} onUpdate={handleBookingUpdate} onConfirm={handleAllocConfirm} />
      )}
      {activeStep === 4 && (
        <Step4 bookings={bookings} onCreateBpo={handleCreateBpo} />
      )}
    </div>
  );
}

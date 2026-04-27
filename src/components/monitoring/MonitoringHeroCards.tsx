/**
 * MonitoringHeroCards — M15
 *
 * 5 interactive KPI cards rendered ABOVE the Monitoring tabs. Each card
 * exposes a quick metric; clicking opens a right Sheet with drill-down
 * (per-NM, per-CN, per-SKU breakdowns + sparklines + cross-screen links).
 *
 * Pure presentation — receives no props, owns its own dialog state.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ShieldAlert, Repeat, ShieldCheck, Truck, LineChart as LineIcon } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatKpiValue, type KpiTrend, type KpiUnit } from "@/lib/kpi-format";
import { useFarmerMode } from "@/components/FarmerModeContext";

type CardKey = "nm-risk" | "roi" | "ss-alert" | "bpo-pace" | "fc-accuracy";

/* ─── Mock drill-down datasets ─────────────────────────────────────────── */
const NM_SCORECARD = [
  { nm: "Mikado",    total: 92, honor: 96, ontime: 96, quality: 98, response: 90, price: 85, status: "success" as const, trend: [88,89,90,91,92,93,92,93,92,92,93,92] },
  { nm: "Đồng Tâm",  total: 88, honor: 92, ontime: 94, quality: 92, response: 88, price: 80, status: "success" as const, trend: [85,86,87,88,87,88,88,89,88,88,89,88] },
  { nm: "Vigracera", total: 86, honor: 90, ontime: 88, quality: 90, response: 85, price: 82, status: "success" as const, trend: [83,84,85,86,86,87,86,86,87,86,86,86] },
  { nm: "Toko",      total: 70, honor: 78, ontime: 72, quality: 80, response: 60, price: 75, status: "warning" as const, trend: [76,75,74,73,72,72,71,70,70,71,70,70] },
  { nm: "Phú Mỹ",    total: 48, honor: 45, ontime: 60, quality: 70, response: 35, price: 75, status: "danger"  as const, trend: [55,53,52,50,49,48,47,48,47,48,48,48] },
];

const SS_PENDING = [
  { sku: "GA-300 A4", from: 900, to: 1350, wcImpact: "+83 triệu ₫", reason: "Mùa cao điểm + nhà thầu mới Q2" },
  { sku: "GA-600 A4", from: 500, to: 650,  wcImpact: "+45 triệu ₫", reason: "Demand actual cao hơn FC 18%" },
];

const BPO_PER_NM = [
  { nm: "Mikado",    pct: 85, status: "success" as const, note: "Đúng pace W17" },
  { nm: "Đồng Tâm",  pct: 78, status: "success" as const, note: "Còn 2 PO chờ phát hành" },
  { nm: "Vigracera", pct: 72, status: "warning" as const, note: "Chậm nhẹ — kiểm tra" },
  { nm: "Toko",      pct: 60, status: "warning" as const, note: "Cần đẩy 4 PO trước W18" },
  { nm: "Phú Mỹ",    pct: 30, status: "danger"  as const, note: "🔴 Chưa đáp ứng — escalate" },
];

const BPO_BURN = [
  { week: "W14", target: 20, actual: 18 },
  { week: "W15", target: 40, actual: 35 },
  { week: "W16", target: 60, actual: 52 },
  { week: "W17", target: 80, actual: 72 },
  { week: "W18", target: 100, actual: null },
];

const FC_PER_CN = [
  { cn: "CN-BD",  mape: 28, status: "danger"  as const },
  { cn: "CN-NA",  mape: 22, status: "warning" as const },
  { cn: "CN-CT",  mape: 18, status: "warning" as const },
  { cn: "CN-DN",  mape: 14, status: "success" as const },
  { cn: "CN-HCM", mape: 13, status: "success" as const },
  { cn: "CN-HN",  mape: 12, status: "success" as const },
];

const FC_PER_SKU = [
  { sku: "GA-600", mape: 25, status: "danger"  as const, trend: "↗ tăng 3 tuần" },
  { sku: "GA-300", mape: 22, status: "warning" as const, trend: "→ ổn định" },
  { sku: "PK-001", mape: 16, status: "warning" as const, trend: "↘ giảm" },
  { sku: "GA-400", mape: 8,  status: "success" as const, trend: "→ ổn định" },
];

/* ─── Component ───────────────────────────────────────────────────────── */
export function MonitoringHeroCards({ onTabChange }: { onTabChange?: (key: string) => void }) {
  const [open, setOpen] = useState<CardKey | null>(null);
  const navigate = useNavigate();
  const { enabled: farmer } = useFarmerMode();

  const close = () => setOpen(null);
  const goto = (path: string) => { close(); navigate(path); };
  const goTab = (key: string) => { close(); onTabChange?.(key); };

  return (
    <>
      <div className={cn(
        "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 mb-4 sm:mb-5",
        farmer ? "gap-4 sm:gap-2.5" : "gap-3 sm:gap-2.5",
      )}>
        <HeroCard
          onClick={() => setOpen("nm-risk")}
          icon={<ShieldAlert className="h-4 w-4" />}
          tone="danger"
          label="Rủi ro NM"
          valueNum={5} valueUnit="qty" qtyLabel="nhà máy"
          sub="1 rủi ro cao"
        />
        <HeroCard
          onClick={() => setOpen("roi")}
          icon={<Repeat className="h-4 w-4" />}
          tone="primary"
          label="ROI Bánh đà"
          valueNum={340_000_000} valueUnit="vnd"
          sub="Tiết kiệm tháng này"
        />
        <HeroCard
          onClick={() => setOpen("ss-alert")}
          icon={<ShieldCheck className="h-4 w-4" />}
          tone="warning"
          label="Tồn kho an toàn"
          valueNum={2} valueUnit="qty" qtyLabel="thay đổi"
          sub="Vốn +128 triệu ₫"
        />
        <HeroCard
          onClick={() => setOpen("bpo-pace")}
          icon={<Truck className="h-4 w-4" />}
          tone="warning"
          label="Tiến độ đặt hàng"
          valueNum={72} valueUnit="pct"
          sub="Pace chậm nhẹ"
        />
        <HeroCard
          onClick={() => setOpen("fc-accuracy")}
          icon={<LineIcon className="h-4 w-4" />}
          tone="info"
          label="Độ chính xác dự báo"
          valueNum={18} valueUnit="pct"
          sub="MAPE — tăng 3 tuần"
          trend={{ value: "+3", direction: "up", isGood: false, vs: "tuần trước" }}
        />
      </div>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl overflow-y-auto">
          {open === "nm-risk"     && <NmRiskSheet     goto={goto} goTab={goTab} />}
          {open === "roi"         && <RoiSheet        goto={goto} />}
          {open === "ss-alert"    && <SsAlertSheet    goto={goto} goTab={goTab} />}
          {open === "bpo-pace"    && <BpoPaceSheet    goto={goto} goTab={goTab} />}
          {open === "fc-accuracy" && <FcAccuracySheet goto={goto} goTab={goTab} />}
        </SheetContent>
      </Sheet>
    </>
  );
}

/* ─── Card primitive ──────────────────────────────────────────────────── */
/**
 * HeroCard — KPI clickable cho farmer/ops.
 *
 * Truyền value theo 1 trong 2 cách (chuẩn hoá với KpiCard):
 *  - RAW:     value="340" unit="triệu ₫"
 *  - NUMERIC: valueNum={340_000_000} valueUnit="vnd"   ← preferred
 *
 * Trend optional: KpiTrend object — render arrow + màu theo `isGood`.
 */
function HeroCard({
  onClick, icon, tone, label,
  value, unit,
  valueNum, valueUnit, qtyLabel,
  sub, trend,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  tone: "danger" | "warning" | "primary" | "info";
  label: string;
  value?: string;
  unit?: string;
  valueNum?: number;
  valueUnit?: KpiUnit;
  qtyLabel?: string;
  sub: string;
  trend?: KpiTrend;
}) {
  const stripClasses: Record<typeof tone, string> = {
    danger:  "border-l-danger",
    warning: "border-l-warning",
    primary: "border-l-primary",
    info:    "border-l-info",
  };
  const chipClasses: Record<typeof tone, string> = {
    danger:  "bg-danger/10  text-danger",
    warning: "bg-warning/10 text-warning",
    primary: "bg-primary/10 text-primary",
    info:    "bg-info/10    text-info",
  };

  // Resolve value/unit
  let renderValue = value ?? "";
  let renderUnit = unit;
  if (valueNum !== undefined && valueUnit) {
    const [v, u] = formatKpiValue(valueNum, valueUnit, qtyLabel);
    renderValue = v;
    renderUnit = renderUnit ?? u;
  }

  const { enabled: farmer } = useFarmerMode();

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-card border border-surface-3 border-l-[4px] sm:border-l-[3px] bg-surface-1",
        // Farmer ON (mobile): padding rộng hơn
        farmer ? "p-4 sm:p-3" : "p-3.5 sm:p-3",
        "text-left transition-all hover:shadow-sm hover:-translate-y-px",
        "focus:outline-none focus:ring-2 focus:ring-primary/40",
        stripClasses[tone],
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center gap-2", farmer ? "mb-2.5 sm:mb-1.5" : "mb-2 sm:mb-1.5")}>
        <div className={cn("shrink-0 rounded-md", farmer ? "p-2 sm:p-1" : "p-1.5 sm:p-1", chipClasses[tone])}>
          {icon}
        </div>
        <span className={cn(
          "font-semibold sm:font-medium text-text-2 truncate",
          farmer ? "text-body sm:text-table-sm" : "text-table sm:text-table-sm",
        )}>{label}</span>
        <ChevronRight className={cn(
          "ml-auto text-text-3/40 group-hover:text-text-3 transition-colors",
          farmer ? "h-5 w-5 sm:h-3.5 sm:w-3.5" : "h-4 w-4 sm:h-3.5 sm:w-3.5",
        )} />
      </div>
      {/* Value */}
      <div className="flex items-baseline gap-1.5">
        <span className={cn(
          "font-display leading-none font-bold text-text-1 tabular-nums",
          farmer ? "text-[34px] sm:text-[24px]" : "text-[28px] sm:text-[24px]",
        )}>
          {renderValue}
        </span>
        {renderUnit && (
          <span className={cn(
            "text-text-3",
            farmer ? "text-table sm:text-caption font-medium" : "text-table-sm sm:text-caption",
          )}>{renderUnit}</span>
        )}
      </div>
      {/* Trend (optional) + Sub */}
      <div className={cn("flex items-center gap-1.5 flex-wrap", farmer ? "mt-1.5" : "mt-1")}>
        {trend && (
          <span className={cn(
            "inline-flex items-center gap-0.5 font-semibold tabular-nums",
            farmer ? "text-table-sm sm:text-caption" : "text-caption",
            trend.isGood ? "text-success" : "text-danger",
          )}>
            {trend.direction === "up"   && <TrendingUp   className={cn(farmer ? "h-3.5 w-3.5 sm:h-3 sm:w-3" : "h-3 w-3")} />}
            {trend.direction === "down" && <TrendingDown className={cn(farmer ? "h-3.5 w-3.5 sm:h-3 sm:w-3" : "h-3 w-3")} />}
            {trend.direction === "flat" && <Minus        className={cn(farmer ? "h-3.5 w-3.5 sm:h-3 sm:w-3" : "h-3 w-3")} />}
            {trend.value}
            {trend.vs && <span className="ml-0.5 font-normal text-text-3">vs {trend.vs}</span>}
          </span>
        )}
        <span className={cn(
          "text-text-3 truncate",
          farmer ? "text-table sm:text-caption" : "text-table-sm sm:text-caption",
        )}>{sub}</span>
      </div>
    </button>
  );
}

/* ─── Sheets ──────────────────────────────────────────────────────────── */
function NmRiskSheet({ goto, goTab }: { goto: (p: string) => void; goTab: (k: string) => void }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Rủi ro Nhà máy · 5 NM theo dõi</SheetTitle>
        <SheetDescription>Scorecard 5 yếu tố — Đáp ứng, Đúng hẹn, Chất lượng, Phản hồi, Giá</SheetDescription>
      </SheetHeader>
      <div className="space-y-3 mt-4">
        <div className="rounded-card border border-surface-3 overflow-hidden">
          <table className="w-full text-table-sm">
            <thead className="bg-surface-1">
              <tr>
                <th className="text-left px-3 py-2 text-table-header uppercase text-text-3">NM</th>
                <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Tổng</th>
                <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Đáp ứng</th>
                <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Đúng hẹn</th>
                <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">CL</th>
                <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Phản hồi</th>
                <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Giá</th>
                <th className="text-center px-2 py-2 text-table-header uppercase text-text-3">12W</th>
              </tr>
            </thead>
            <tbody>
              {NM_SCORECARD.map(n => (
                <tr key={n.nm} className="border-t border-surface-3/50">
                  <td className="px-3 py-2 font-medium text-text-1">{n.nm}</td>
                  <td className={cn("text-right tabular-nums px-2 py-2 font-bold",
                    n.status === "danger" && "text-danger",
                    n.status === "warning" && "text-warning",
                    n.status === "success" && "text-success")}>{n.total}</td>
                  <td className="text-right tabular-nums px-2 py-2 text-text-2">{n.honor}%</td>
                  <td className="text-right tabular-nums px-2 py-2 text-text-2">{n.ontime}%</td>
                  <td className="text-right tabular-nums px-2 py-2 text-text-2">{n.quality}%</td>
                  <td className="text-right tabular-nums px-2 py-2 text-text-2">{n.response}%</td>
                  <td className="text-right tabular-nums px-2 py-2 text-text-2">{n.price}%</td>
                  <td className="px-2 py-2"><MiniSpark values={n.trend} status={n.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-card border border-warning/30 bg-warning-bg/40 p-3 text-table-sm text-text-1">
          ⚠️ <span className="font-medium">Phú Mỹ</span> dưới target 6 tháng liên tiếp → cân nhắc giảm phân bổ.
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => goto("/gap-scenario")}>Xem Gap Scenario →</Button>
          <Button size="sm" variant="outline" onClick={() => goTab("nm-risk")}>Mở chi tiết NM Risk →</Button>
        </div>
      </div>
    </>
  );
}

function RoiSheet({ goto }: { goto: (p: string) => void }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>ROI Bánh đà · MAPE → SS → WC</SheetTitle>
        <SheetDescription>Cải thiện dự báo kéo theo giảm tồn an toàn và vốn lưu động</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 mt-4">
        <div className="rounded-card border border-surface-3 bg-surface-0 p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <ChainNode label="MAPE" value="14%" delta="↓ 8%" tone="success" />
            <ChainArrow />
            <ChainNode label="SS" value="−15%" delta="giảm 480 m²" tone="success" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <ChainNode label="" value="" delta="" tone="muted" />
            <ChainArrow />
            <ChainNode label="WC" value="−340 triệu ₫" delta="tiết kiệm" tone="success" />
          </div>
        </div>

        <div className="rounded-card border border-info/30 bg-info-bg/40 p-3 text-table-sm text-text-1">
          💡 Nếu MAPE giảm thêm 4% → dự kiến WC tiết kiệm thêm 180 triệu ₫.
        </div>

        <Button size="sm" className="w-full" onClick={() => goto("/workspace")}>
          Xem các thay đổi SS đang chờ duyệt →
        </Button>
      </div>
    </>
  );
}

function SsAlertSheet({ goto, goTab }: { goto: (p: string) => void; goTab: (k: string) => void }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Tồn kho an toàn · 2 thay đổi chờ duyệt</SheetTitle>
        <SheetDescription>Vốn lưu động ảnh hưởng tổng cộng +128 triệu ₫</SheetDescription>
      </SheetHeader>
      <div className="space-y-2 mt-4">
        {SS_PENDING.map(s => (
          <div key={s.sku} className="rounded-card border border-surface-3 bg-surface-0 p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-table font-semibold text-text-1">{s.sku}</span>
              <span className="text-caption text-warning font-medium">⏳ chờ duyệt</span>
            </div>
            <div className="text-table-sm text-text-2">
              SS <span className="tabular-nums font-medium text-text-1">{s.from}</span>
              {" → "}
              <span className="tabular-nums font-medium text-text-1">{s.to}</span>
              <span className="ml-2 text-warning">({s.wcImpact})</span>
            </div>
            <div className="text-caption text-text-3">{s.reason}</div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" onClick={() => goto("/workspace")}>Duyệt tại Workspace →</Button>
          <Button size="sm" variant="outline" onClick={() => goTab("inv")}>Mở chi tiết Tồn kho →</Button>
        </div>
      </div>
    </>
  );
}

function BpoPaceSheet({ goto, goTab }: { goto: (p: string) => void; goTab: (k: string) => void }) {
  const max = Math.max(...BPO_BURN.map(b => b.target));
  return (
    <>
      <SheetHeader>
        <SheetTitle>Tiến độ đặt hàng · 72% phát hành</SheetTitle>
        <SheetDescription>BPO burn-down — actual vs target theo tuần</SheetDescription>
      </SheetHeader>

      <section className="mt-4">
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
          Burn-down 5 tuần
        </div>
        <div className="grid grid-cols-5 gap-2">
          {BPO_BURN.map(b => (
            <div key={b.week} className="text-center">
              <div className="relative h-24 bg-surface-2 rounded">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-primary/30 rounded-b"
                  style={{ height: `${(b.target / max) * 100}%` }}
                />
                {b.actual !== null && (
                  <div
                    className="absolute bottom-0 left-1 right-1 bg-primary rounded-b"
                    style={{ height: `${(b.actual / max) * 100}%` }}
                  />
                )}
              </div>
              <div className="text-caption text-text-3 mt-1">{b.week}</div>
              <div className="text-caption font-medium text-text-1 tabular-nums">
                {b.actual ?? "—"}/{b.target}%
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
          Theo NM
        </div>
        <div className="space-y-1.5">
          {BPO_PER_NM.map(n => (
            <div key={n.nm} className="grid grid-cols-[100px_1fr_60px] items-center gap-3 px-2 py-1.5 rounded-card hover:bg-surface-2">
              <span className="font-medium text-table-sm text-text-1">{n.nm}</span>
              <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    n.status === "danger" && "bg-danger",
                    n.status === "warning" && "bg-warning",
                    n.status === "success" && "bg-success",
                  )}
                  style={{ width: `${n.pct}%` }}
                />
              </div>
              <span className={cn(
                "text-right tabular-nums text-table-sm font-bold",
                n.status === "danger" && "text-danger",
                n.status === "warning" && "text-warning",
                n.status === "success" && "text-success",
              )}>{n.pct}%</span>
              <div className="col-span-3 text-caption text-text-3 -mt-1 pl-[112px]">{n.note}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-card border border-warning/30 bg-warning-bg/40 p-3 text-table-sm text-text-1 mt-4">
        ⚠️ <span className="font-medium">Phú Mỹ</span> pace chậm. Đến ngày 25 chưa cải thiện → escalate?
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <Button size="sm" onClick={() => goto("/hub")}>Nhắc Phú Mỹ →</Button>
        <Button size="sm" variant="outline" onClick={() => goTab("perf")}>Mở chi tiết Tiến độ →</Button>
      </div>
    </>
  );
}

function FcAccuracySheet({ goto, goTab }: { goto: (p: string) => void; goTab: (k: string) => void }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Độ chính xác dự báo · MAPE 18%</SheetTitle>
        <SheetDescription>Phân bổ theo CN và theo SKU — xu hướng tăng 3 tuần</SheetDescription>
      </SheetHeader>

      <section className="mt-4">
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">Theo CN</div>
        <div className="space-y-1.5">
          {FC_PER_CN.map(c => (
            <div key={c.cn} className="grid grid-cols-[80px_1fr_60px] items-center gap-3 px-2 py-1.5 rounded-card hover:bg-surface-2">
              <span className="font-mono text-table-sm font-semibold text-text-1">{c.cn}</span>
              <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full",
                    c.status === "danger" && "bg-danger",
                    c.status === "warning" && "bg-warning",
                    c.status === "success" && "bg-success",
                  )}
                  style={{ width: `${Math.min(100, c.mape * 3)}%` }}
                />
              </div>
              <span className={cn(
                "text-right tabular-nums text-table-sm font-bold",
                c.status === "danger" && "text-danger",
                c.status === "warning" && "text-warning",
                c.status === "success" && "text-success",
              )}>{c.mape}%</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">Theo SKU</div>
        <div className="space-y-1">
          {FC_PER_SKU.map(s => (
            <div key={s.sku} className="flex items-center justify-between px-2 py-1.5 rounded-card hover:bg-surface-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-table-sm font-semibold text-text-1">{s.sku}</span>
                <span className="text-caption text-text-3">{s.trend}</span>
              </div>
              <span className={cn(
                "tabular-nums text-table-sm font-bold",
                s.status === "danger" && "text-danger",
                s.status === "warning" && "text-warning",
                s.status === "success" && "text-success",
              )}>MAPE {s.mape}%</span>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-card border border-warning/30 bg-warning-bg/40 p-3 text-table-sm text-text-1 mt-4">
        ⚠️ <span className="font-medium">GA-600</span> MAPE tăng 3 tuần liên tiếp → cân nhắc review FC method.
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <Button size="sm" onClick={() => goto("/demand")}>Xem Dự báo →</Button>
        <Button size="sm" variant="outline" onClick={() => goto("/sop")}>Điều chỉnh tại S&OP →</Button>
        <Button size="sm" variant="outline" onClick={() => goTab("perf")}>Chi tiết Hiệu suất →</Button>
      </div>
    </>
  );
}

/* ─── Mini bits ───────────────────────────────────────────────────────── */
function ChainNode({ label, value, delta, tone }: {
  label: string; value: string; delta: string; tone: "success" | "warning" | "danger" | "muted";
}) {
  if (!label && !value) return <div />;
  return (
    <div>
      <div className="text-caption uppercase tracking-wide text-text-3 font-semibold">{label}</div>
      <div className={cn(
        "font-display text-h3 font-bold tabular-nums",
        tone === "success" && "text-success",
        tone === "warning" && "text-warning",
        tone === "danger" && "text-danger",
        tone === "muted" && "text-text-2",
      )}>{value}</div>
      <div className="text-caption text-text-3">{delta}</div>
    </div>
  );
}

function ChainArrow() {
  return (
    <div className="flex items-center justify-center text-text-3">
      <ChevronRight className="h-6 w-6" />
    </div>
  );
}

function MiniSpark({ values, status }: {
  values: number[];
  status: "success" | "warning" | "danger";
}) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 60, h = 18;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const stroke =
    status === "danger" ? "hsl(var(--danger))" :
    status === "warning" ? "hsl(var(--warning))" :
    "hsl(var(--success))";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-[60px] h-[18px] inline-block">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

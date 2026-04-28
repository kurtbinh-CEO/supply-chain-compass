/* ═══════════════════════════════════════════════════════════════════════════
   §  RouteMapPreview — Connected flow đơn giản (ngang, dễ scan).
   §  Hiển thị: NM → CN1 → CN2 → ... với km mỗi chặng.
   §  2 hàng so sánh GỐC vs MỚI khi reorderMode bật.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import {
  Factory, MapPin, ArrowRight, Route,
  TrendingDown, TrendingUp, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLocation, legDistances, routeTotalKm } from "@/data/vn-locations";

interface Props {
  factoryCode: string;
  baselineCnCodes: string[];
  currentCnCodes: string[];
  showProjected?: boolean;
}

interface FlowRowProps {
  badge: string;
  badgeTone: "neutral" | "primary";
  title: string;
  factoryCode: string;
  cnCodes: string[];
  legs: number[];
  totalKm: number;
  variant: "current" | "projected";
}

function FlowRow({
  badge, badgeTone, title, factoryCode, cnCodes, legs, totalKm, variant,
}: FlowRowProps) {
  const isProjected = variant === "projected";
  const factory = getLocation(factoryCode);

  return (
    <div
      className={cn(
        "rounded-card border bg-surface-1 p-3",
        isProjected
          ? "border-primary/40 bg-primary/[0.04]"
          : "border-surface-3",
      )}
    >
      {/* ── Header row ── */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "inline-flex items-center justify-center text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded",
              badgeTone === "primary"
                ? "bg-primary text-primary-foreground"
                : "bg-text-2/15 text-text-2",
            )}
          >
            {badge}
          </span>
          <span className="text-[12px] font-semibold text-text-1 truncate">
            {title}
          </span>
        </div>
        <div className="inline-flex items-baseline gap-1 tabular-nums shrink-0">
          <Route className={cn("h-3 w-3 self-center", isProjected ? "text-primary" : "text-text-3")} />
          <span className={cn(
            "text-[14px] font-bold leading-none",
            isProjected ? "text-primary" : "text-text-1",
          )}>
            {totalKm.toLocaleString("vi-VN")}
          </span>
          <span className="text-[10px] text-text-3 font-medium">km</span>
        </div>
      </div>

      {/* ── Connected flow ── */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* Factory node */}
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-warning/10 border border-warning/30">
          <div className="h-5 w-5 rounded bg-warning flex items-center justify-center shrink-0">
            <Factory className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="text-[9px] uppercase tracking-wide text-warning font-semibold leading-none">NM</div>
            <div className="text-[11px] font-mono font-bold text-text-1 leading-tight">
              {factory?.code.replace(/^NM-/, "") ?? "—"}
            </div>
          </div>
        </div>

        {/* CN drops */}
        {cnCodes.map((code, i) => {
          const loc = getLocation(code);
          const km = legs[i] ?? 0;
          return (
            <div key={`${code}-${i}`} className="inline-flex items-center gap-1">
              {/* Connector with km */}
              <div className="inline-flex items-center gap-1 px-1">
                <div className={cn(
                  "h-px w-3",
                  isProjected ? "bg-primary" : "bg-text-3 border-t border-dashed",
                )} />
                <span className="text-[10px] font-mono font-semibold text-text-2 tabular-nums whitespace-nowrap">
                  {km}km
                </span>
                <ArrowRight className={cn(
                  "h-3 w-3",
                  isProjected ? "text-primary" : "text-text-3",
                )} />
              </div>

              {/* CN node */}
              <div className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border",
                isProjected
                  ? "bg-primary/10 border-primary/40"
                  : "bg-surface-2 border-surface-3",
              )}>
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0",
                  isProjected ? "bg-primary" : "bg-text-2",
                )}>
                  {i + 1}
                </div>
                <div className="leading-tight">
                  <div className={cn(
                    "text-[9px] uppercase tracking-wide font-semibold leading-none",
                    isProjected ? "text-primary" : "text-text-3",
                  )}>
                    Drop {i + 1}
                  </div>
                  <div className="text-[11px] font-mono font-bold text-text-1 leading-tight">
                    {loc?.code.replace(/^CN-/, "") ?? code}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RouteMapPreview({
  factoryCode,
  baselineCnCodes,
  currentCnCodes,
  showProjected = true,
}: Props) {
  const baselineLegs = useMemo(
    () => legDistances([factoryCode, ...baselineCnCodes]),
    [factoryCode, baselineCnCodes],
  );
  const currentLegs = useMemo(
    () => legDistances([factoryCode, ...currentCnCodes]),
    [factoryCode, currentCnCodes],
  );
  const baselineTotal = useMemo(
    () => routeTotalKm([factoryCode, ...baselineCnCodes]),
    [factoryCode, baselineCnCodes],
  );
  const currentTotal = useMemo(
    () => routeTotalKm([factoryCode, ...currentCnCodes]),
    [factoryCode, currentCnCodes],
  );

  const delta = currentTotal - baselineTotal;
  const dirty = baselineCnCodes.join("|") !== currentCnCodes.join("|");
  const deltaPct = baselineTotal > 0 ? Math.round((delta / baselineTotal) * 100) : 0;

  if (!getLocation(factoryCode)) {
    return (
      <div className="rounded-card border border-dashed border-surface-3 bg-surface-2/40 p-3 text-caption text-text-3 flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5" />
        Không có dữ liệu lộ trình.
      </div>
    );
  }

  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <div className="space-y-2">
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[12px] font-semibold text-text-2 inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          Lộ trình giao hàng
        </div>

        {showProjected && dirty && (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums border",
              delta > 0
                ? "text-warning bg-warning-bg border-warning/30"
                : delta < 0
                ? "text-success bg-success-bg border-success/30"
                : "text-text-2 bg-surface-2 border-surface-3",
            )}
          >
            <DeltaIcon className="h-3 w-3" />
            <span>{delta > 0 ? "+" : ""}{delta} km</span>
            {baselineTotal > 0 && (
              <span className="opacity-70">({delta > 0 ? "+" : ""}{deltaPct}%)</span>
            )}
          </div>
        )}
      </div>

      {/* ── Flow rows ── */}
      <div className="space-y-2">
        <FlowRow
          badge="GỐC"
          badgeTone="neutral"
          title="Thứ tự gốc"
          factoryCode={factoryCode}
          cnCodes={baselineCnCodes}
          legs={baselineLegs}
          totalKm={baselineTotal}
          variant="current"
        />
        {showProjected && (
          <FlowRow
            badge="MỚI"
            badgeTone="primary"
            title={dirty ? "Thứ tự sau khi sửa" : "Sau khi sửa (chưa đổi)"}
            factoryCode={factoryCode}
            cnCodes={currentCnCodes}
            legs={currentLegs}
            totalKm={currentTotal}
            variant="projected"
          />
        )}
      </div>

      <p className="text-[10px] text-text-3 italic">
        * Khoảng cách ước tính theo đường chim bay. Chỉ minh hoạ.
      </p>
    </div>
  );
}

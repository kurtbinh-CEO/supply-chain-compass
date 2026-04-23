import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TermTooltip } from "@/components/TermTooltip";
import { BRANCHES, TRUST_BY_CN } from "@/data/unis-enterprise-dataset";

interface CnTrustView {
  cnCode: string;
  cnName: string;
  trustPct: number;
  trend: "up" | "down" | "flat";
  weeklySpark: number[];
}

/* Demo overrides so the "STAR moments" land on specific CNs.
 * - CN-BD 82% (mid)
 * - CN-HCM 90% (high)
 * - CN-PK 58% (low — đỏ, the "CN-ĐL" demo case)
 */
const DEMO_OVERRIDES: Record<string, number> = {
  "CN-BD": 82,
  "CN-HCM": 90,
  "CN-PK": 58,
};

function buildView(): CnTrustView[] {
  return BRANCHES.map((cn) => {
    const raw = TRUST_BY_CN.find((t) => t.cnCode === cn.code)!;
    const finalTrust = DEMO_OVERRIDES[cn.code] ?? raw.trustPct;
    // Synthesize 12-week sparkline anchored at finalTrust with slight drift
    const seed = cn.code.charCodeAt(3) + cn.code.charCodeAt(4);
    const drift = raw.trend === "up" ? 1.1 : raw.trend === "down" ? -1.0 : 0;
    const weeklySpark = Array.from({ length: 12 }, (_, i) => {
      const noise = ((seed * (i + 1)) % 7) - 3;
      const ramp = drift * (i - 11);
      return Math.max(40, Math.min(99, finalTrust + ramp + noise));
    });
    return {
      cnCode: cn.code,
      cnName: cn.name,
      trustPct: finalTrust,
      trend: raw.trend,
      weeklySpark,
    };
  });
}

function trustColor(t: number) {
  if (t < 60) return { text: "text-danger", bg: "bg-danger-bg/40", border: "border-danger/30", spark: "var(--color-danger-text)" };
  if (t < 75) return { text: "text-warning", bg: "bg-warning-bg/40", border: "border-warning/30", spark: "var(--color-warning-text)" };
  return { text: "text-success", bg: "bg-success-bg/40", border: "border-success/30", spark: "var(--color-success-text)" };
}

function TrendIcon({ trend }: { trend: "up" | "down" | "flat" }) {
  if (trend === "up") return <TrendingUp className="h-3 w-3 text-success" />;
  if (trend === "down") return <TrendingDown className="h-3 w-3 text-danger" />;
  return <Minus className="h-3 w-3 text-text-3" />;
}

function MiniSpark({ data, color }: { data: number[]; color: string }) {
  const w = 80;
  const h = 22;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface Props {
  /** Optional: external onClick when user inspects a CN. */
  onSelectCn?: (cnCode: string) => void;
}

export function TrustScoreCnPanel({ onSelectCn }: Props) {
  const data = buildView().sort((a, b) => a.trustPct - b.trustPct);
  const lowCount = data.filter((d) => d.trustPct < 60).length;
  const highCount = data.filter((d) => d.trustPct >= 85).length;

  return (
    <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-display text-section-header text-text-1 flex items-center gap-2">
            <TermTooltip term="TrustScore">
              <span className="text-text-1">Trust Score per CN</span>
            </TermTooltip>
            <span className="text-table-sm text-text-3 font-normal">— 12 CN · trend 12 tuần</span>
          </h3>
        </div>
        <div className="flex items-center gap-2 text-table-sm">
          {lowCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg text-danger font-medium px-2.5 py-0.5">
              {lowCount} CN &lt; 60% 🔴
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-success-bg text-success font-medium px-2.5 py-0.5">
            {highCount} CN ≥ 85%
          </span>
        </div>
      </div>

      {/* Grid of 12 CN trust cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.map((row) => {
          const c = trustColor(row.trustPct);
          return (
            <button
              key={row.cnCode}
              onClick={() => onSelectCn?.(row.cnCode)}
              className={cn(
                "rounded-card border p-3 text-left transition-all hover:shadow-md hover:scale-[1.01]",
                c.bg,
                c.border,
              )}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <div className="text-table-sm font-semibold text-text-1">{row.cnCode}</div>
                  <div className="text-caption text-text-3 truncate max-w-[120px]">{row.cnName}</div>
                </div>
                <span className={cn("font-display text-[22px] font-bold tabular-nums leading-none", c.text)}>
                  {row.trustPct}
                  <span className="text-table-sm">%</span>
                </span>
              </div>
              <div className="flex items-end justify-between gap-2">
                <MiniSpark data={row.weeklySpark} color={c.spark} />
                <div className="flex items-center gap-1 text-caption text-text-2">
                  <TrendIcon trend={row.trend} />
                  <span className="capitalize">{row.trend}</span>
                </div>
              </div>
              {row.trustPct < 60 && (
                <div className="mt-2 text-caption text-danger font-medium">
                  Biên điều chỉnh ±15%
                </div>
              )}
              {row.trustPct >= 85 && (
                <div className="mt-2 text-caption text-success font-medium">
                  Tự duyệt ✅
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-caption text-text-3 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-danger-bg border border-danger/30" /> &lt; 60% (đỏ)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-warning-bg border border-warning/30" /> 60–74%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-success-bg border border-success/30" /> ≥ 75%
        </span>
      </div>
    </div>
  );
}

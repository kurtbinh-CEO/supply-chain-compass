/* ═══════════════════════════════════════════════════════════════════════════
   §  RouteMapPreview — Bản đồ so sánh lộ trình HIỆN TẠI vs SAU SỬA.
   §  Polished: viewBox rộng hơn, header chip rõ ràng, node tách khỏi label,
   §  arrow marker, soft shadow, legend, delta chip nổi bật.
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import {
  Factory, MapPin, ArrowRight, Route, TrendingDown, TrendingUp, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getLocation, legDistances, routeTotalKm,
  type VnLocation,
} from "@/data/vn-locations";

interface Props {
  factoryCode: string;
  baselineCnCodes: string[];
  currentCnCodes: string[];
  showProjected?: boolean;
}

/* — viewBox lớn hơn để typography & spacing đỡ chật — */
const PAD_X = 32;
const PAD_Y = 28;
const W = 480;
const H = 280;

interface Pt { x: number; y: number; loc: VnLocation; }

function projectAll(codes: string[], factoryCode: string): Pt[] {
  const seq: VnLocation[] = [];
  const f = getLocation(factoryCode);
  if (f) seq.push(f);
  codes.forEach((c) => { const l = getLocation(c); if (l) seq.push(l); });
  if (seq.length === 0) return [];

  const lats = seq.map((p) => p.lat);
  const lngs = seq.map((p) => p.lng);
  let minLat = Math.min(...lats), maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  if (maxLat - minLat < 0.05) { minLat -= 0.5; maxLat += 0.5; }
  if (maxLng - minLng < 0.05) { minLng -= 0.5; maxLng += 0.5; }

  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;

  return seq.map((loc) => ({
    loc,
    x: PAD_X + ((loc.lng - minLng) / (maxLng - minLng)) * innerW,
    y: PAD_Y + (1 - (loc.lat - minLat) / (maxLat - minLat)) * innerH,
  }));
}

interface PanelProps {
  title: string;
  badge: string;
  badgeTone: "neutral" | "primary";
  pts: Pt[];
  legs: number[];
  totalKm: number;
  variant: "current" | "projected";
}

function MapPanel({ title, badge, badgeTone, pts, legs, totalKm, variant }: PanelProps) {
  const isProjected = variant === "projected";
  const uid = `${variant}-${pts.length}`;

  // Path nối các điểm
  const pathD = pts.length >= 2
    ? "M " + pts.map((p) => `${p.x},${p.y}`).join(" L ")
    : "";

  // Nhãn km giữa từng cặp điểm — lệch khỏi đường để dễ đọc
  const legLabels = pts.slice(0, -1).map((p, i) => {
    const next = pts[i + 1];
    const mx = (p.x + next.x) / 2;
    const my = (p.y + next.y) / 2;
    return { x: mx, y: my, km: legs[i] ?? 0, key: `${p.loc.code}-${next.loc.code}` };
  });

  return (
    <div
      className={cn(
        "rounded-card border bg-surface-1 overflow-hidden flex flex-col",
        isProjected
          ? "border-primary/40 shadow-[0_4px_20px_-12px_hsl(var(--primary)/0.4)]"
          : "border-surface-3",
      )}
    >
      {/* ── Header ── */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-3 py-2 border-b",
          isProjected
            ? "bg-primary/[0.06] border-primary/20"
            : "bg-surface-2/60 border-surface-3",
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "inline-flex items-center justify-center text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded",
              badgeTone === "primary"
                ? "bg-primary text-primary-foreground"
                : "bg-text-2/15 text-text-2",
            )}
          >
            {badge}
          </span>
          <span className="text-[12px] font-semibold text-text-1 truncate">{title}</span>
        </div>
        <div className="flex items-baseline gap-1 tabular-nums shrink-0">
          <Route className={cn("h-3 w-3", isProjected ? "text-primary" : "text-text-3")} />
          <span
            className={cn(
              "text-[15px] font-bold leading-none",
              isProjected ? "text-primary" : "text-text-1",
            )}
          >
            {totalKm.toLocaleString("vi-VN")}
          </span>
          <span className="text-[10px] text-text-3 font-medium">km</span>
        </div>
      </div>

      {/* ── SVG Map ── */}
      <div className="relative bg-gradient-to-br from-surface-2/30 to-surface-2/60">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block"
          role="img"
          aria-label={`Bản đồ ${title}`}
        >
          <defs>
            {/* lưới nền mờ */}
            <pattern id={`grid-${uid}`} width="24" height="24" patternUnits="userSpaceOnUse">
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="hsl(var(--surface-3))"
                strokeWidth="0.5"
                opacity="0.5"
              />
            </pattern>
            {/* arrow head cho hướng đi */}
            <marker
              id={`arrow-${uid}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                fill={isProjected ? "hsl(var(--primary))" : "hsl(var(--text-3))"}
              />
            </marker>
            {/* soft shadow cho node */}
            <filter id={`shadow-${uid}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodOpacity="0.18" />
            </filter>
          </defs>

          <rect x="0" y="0" width={W} height={H} fill={`url(#grid-${uid})`} />

          {/* tuyến đường — vẽ shadow trước, đường chính sau */}
          {pathD && (
            <>
              <path
                d={pathD}
                fill="none"
                stroke={isProjected ? "hsl(var(--primary))" : "hsl(var(--text-2))"}
                strokeOpacity="0.15"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={pathD}
                fill="none"
                stroke={isProjected ? "hsl(var(--primary))" : "hsl(var(--text-2))"}
                strokeWidth={isProjected ? 2.2 : 1.8}
                strokeDasharray={isProjected ? "0" : "5 4"}
                strokeLinecap="round"
                strokeLinejoin="round"
                markerEnd={`url(#arrow-${uid})`}
              />
            </>
          )}

          {/* nhãn km mỗi chặng */}
          {legLabels.map((l) => (
            <g key={l.key}>
              <rect
                x={l.x - 18} y={l.y - 8}
                width="36" height="16" rx="8"
                fill="hsl(var(--surface-1))"
                stroke={isProjected ? "hsl(var(--primary) / 0.4)" : "hsl(var(--surface-3))"}
                strokeWidth="1"
                filter={`url(#shadow-${uid})`}
              />
              <text
                x={l.x} y={l.y + 3.5}
                textAnchor="middle"
                fontSize="10"
                fill="hsl(var(--text-1))"
                fontWeight="600"
                style={{ fontFamily: "var(--font-mono, ui-monospace)" }}
              >
                {l.km}km
              </text>
            </g>
          ))}

          {/* nodes */}
          {pts.map((p, i) => {
            const isFactory = i === 0;
            const labelText = p.loc.code.replace(/^(NM|CN)-/, "");
            const labelY = p.y + 26;
            return (
              <g key={`${p.loc.code}-${i}`}>
                {isFactory ? (
                  <>
                    {/* ring */}
                    <circle
                      cx={p.x} cy={p.y} r="13"
                      fill="hsl(var(--warning) / 0.15)"
                    />
                    <rect
                      x={p.x - 9} y={p.y - 9}
                      width="18" height="18" rx="3"
                      fill="hsl(var(--warning))"
                      stroke="hsl(var(--surface-1))"
                      strokeWidth="2"
                      filter={`url(#shadow-${uid})`}
                    />
                    <text
                      x={p.x} y={p.y + 3.5}
                      textAnchor="middle"
                      fontSize="9"
                      fill="white"
                      fontWeight="800"
                      letterSpacing="0.5"
                    >NM</text>
                  </>
                ) : (
                  <>
                    <circle
                      cx={p.x} cy={p.y} r="13"
                      fill={isProjected ? "hsl(var(--primary) / 0.15)" : "hsl(var(--text-2) / 0.12)"}
                    />
                    <circle
                      cx={p.x} cy={p.y} r="9"
                      fill={isProjected ? "hsl(var(--primary))" : "hsl(var(--text-2))"}
                      stroke="hsl(var(--surface-1))"
                      strokeWidth="2"
                      filter={`url(#shadow-${uid})`}
                    />
                    <text
                      x={p.x} y={p.y + 3.5}
                      textAnchor="middle"
                      fontSize="10"
                      fill={isProjected ? "hsl(var(--primary-foreground))" : "white"}
                      fontWeight="800"
                    >{i}</text>
                  </>
                )}
                {/* label tách hẳn khỏi node + nền pill nhỏ để dễ đọc */}
                <g>
                  <rect
                    x={p.x - labelText.length * 3.2 - 4}
                    y={labelY - 8}
                    width={labelText.length * 6.4 + 8}
                    height="13"
                    rx="3"
                    fill="hsl(var(--surface-1))"
                    fillOpacity="0.92"
                  />
                  <text
                    x={p.x} y={labelY + 1}
                    textAnchor="middle"
                    fontSize="10"
                    fill="hsl(var(--text-1))"
                    fontWeight="700"
                    style={{ fontFamily: "var(--font-mono, ui-monospace)" }}
                  >{labelText}</text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* ── Sequence chip dưới ── */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-t border-surface-3 bg-surface-2/30 text-[11px]">
        <span className="inline-flex items-center gap-1 font-mono font-bold text-warning">
          <Factory className="h-3 w-3" />
          {pts[0]?.loc.code.replace(/^NM-/, "") ?? "—"}
        </span>
        {pts.slice(1).map((p, i) => (
          <span key={`${p.loc.code}-${i}`} className="inline-flex items-center gap-1 text-text-2">
            <ArrowRight className="h-3 w-3 text-text-3" />
            <span className={cn(
              "font-mono font-bold",
              isProjected ? "text-primary" : "text-text-1",
            )}>
              {p.loc.code.replace(/^CN-/, "")}
            </span>
            <span className="text-text-3 tabular-nums">·{legs[i]}km</span>
          </span>
        ))}
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
  const allCodes = useMemo(
    () => Array.from(new Set([...baselineCnCodes, ...currentCnCodes])),
    [baselineCnCodes, currentCnCodes],
  );

  // Toạ độ chung để 2 panel cùng tỉ lệ
  const sharedXY = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    projectAll(allCodes, factoryCode).forEach((p) => m.set(p.loc.code, { x: p.x, y: p.y }));
    return m;
  }, [allCodes, factoryCode]);

  const buildPts = (codes: string[]): Pt[] => {
    const out: Pt[] = [];
    const f = getLocation(factoryCode);
    if (f) {
      const xy = sharedXY.get(f.code);
      if (xy) out.push({ ...xy, loc: f });
    }
    codes.forEach((c) => {
      const l = getLocation(c);
      const xy = l && sharedXY.get(c);
      if (l && xy) out.push({ ...xy, loc: l });
    });
    return out;
  };

  const baselineFinal = useMemo(() => buildPts(baselineCnCodes), [baselineCnCodes, sharedXY]);
  const currentFinal = useMemo(() => buildPts(currentCnCodes), [currentCnCodes, sharedXY]);

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

  if (baselineFinal.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-surface-3 bg-surface-2/40 p-4 text-caption text-text-3 flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Không có dữ liệu toạ độ để vẽ bản đồ.
      </div>
    );
  }

  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  return (
    <div className="space-y-3">
      {/* ── Header chính ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
            <MapPin className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <div className="text-[13px] font-semibold text-text-1 leading-tight">
              Bản đồ lộ trình
            </div>
            {showProjected && (
              <div className="text-[10px] text-text-3 leading-tight">
                So sánh thứ tự giao hàng
              </div>
            )}
          </div>
        </div>

        {showProjected && dirty && (
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tabular-nums border",
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
            <span className="opacity-60 font-normal">vs gốc</span>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-3 flex-wrap text-[10px] text-text-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-warning" />
          Nhà máy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-text-2" />
          CN (gốc)
        </span>
        {showProjected && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary" />
            CN (sau sửa)
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 ml-auto">
          <span className="inline-block w-4 h-0 border-t-[2px] border-dashed border-text-2" />
          Gốc
        </span>
        {showProjected && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-4 h-0 border-t-[2px] border-primary" />
            Mới
          </span>
        )}
      </div>

      {/* ── Panels ── */}
      <div className={cn(
        "grid gap-3",
        showProjected ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1",
      )}>
        <MapPanel
          title="Thứ tự gốc"
          badge="GỐC"
          badgeTone="neutral"
          pts={baselineFinal}
          legs={baselineLegs}
          totalKm={baselineTotal}
          variant="current"
        />
        {showProjected && (
          <MapPanel
            title={dirty ? "Thứ tự sau khi sửa" : "Sau khi sửa (chưa đổi)"}
            badge="MỚI"
            badgeTone="primary"
            pts={currentFinal}
            legs={currentLegs}
            totalKm={currentTotal}
            variant="projected"
          />
        )}
      </div>

      <p className="text-[10px] text-text-3 px-0.5 italic">
        * Khoảng cách ước tính theo đường chim bay (Haversine). Chỉ minh hoạ — km thực tế phụ thuộc tuyến đường bộ.
      </p>
    </div>
  );
}

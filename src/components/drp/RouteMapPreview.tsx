/* ═══════════════════════════════════════════════════════════════════════════
   §  RouteMapPreview — mini bản đồ SVG so sánh lộ trình HIỆN TẠI vs SAU SỬA.
   §  - Vẽ 2 panel cạnh nhau (md+) hoặc xếp chồng (mobile).
   §  - Node đặt theo lat/lng chuẩn hoá vào khung SVG.
   §  - Đường nối theo thứ tự drop, gắn nhãn km từng chặng.
   §  - Chỉ minh hoạ; km tính bằng Haversine (xấp xỉ đường chim bay).
   ═══════════════════════════════════════════════════════════════════════════ */
import { useMemo } from "react";
import { Factory, MapPin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  VN_LOCATIONS, getLocation, legDistances, routeTotalKm,
  type VnLocation,
} from "@/data/vn-locations";

interface Props {
  factoryCode: string;
  /** Thứ tự gốc (tối ưu) – dùng cho panel "Hiện tại". */
  baselineCnCodes: string[];
  /** Thứ tự đang chỉnh – dùng cho panel "Sau khi sửa". */
  currentCnCodes: string[];
  /** Có hiển thị panel "Sau khi sửa" không (chỉ khi reorderMode bật). */
  showProjected?: boolean;
}

const PAD = 16;
const W = 280;
const H = 180;

interface Pt { x: number; y: number; loc: VnLocation; }

function project(codes: string[], factoryCode: string): Pt[] {
  const all: VnLocation[] = [];
  const f = getLocation(factoryCode);
  if (f) all.push(f);
  codes.forEach((c) => { const l = getLocation(c); if (l) all.push(l); });
  if (all.length === 0) return [];

  // Bounding box dùng CHUNG cho toàn bộ điểm (factory + tất cả CN trong cả 2 route)
  // → 2 panel có cùng tỉ lệ, dễ so sánh.
  const lats = all.map((p) => p.lat);
  const lngs = all.map((p) => p.lng);
  let minLat = Math.min(...lats), maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  // tránh chia 0 khi chỉ có 1 điểm
  if (maxLat - minLat < 0.05) { minLat -= 0.5; maxLat += 0.5; }
  if (maxLng - minLng < 0.05) { minLng -= 0.5; maxLng += 0.5; }

  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;

  const seq: VnLocation[] = [];
  if (f) seq.push(f);
  codes.forEach((c) => { const l = getLocation(c); if (l) seq.push(l); });

  return seq.map((loc) => {
    const x = PAD + ((loc.lng - minLng) / (maxLng - minLng)) * innerW;
    // lat lớn ở Bắc → vẽ y nhỏ (lên trên)
    const y = PAD + (1 - (loc.lat - minLat) / (maxLat - minLat)) * innerH;
    return { x, y, loc };
  });
}

interface PanelProps {
  title: string;
  subtitle?: string;
  pts: Pt[];
  legs: number[];
  totalKm: number;
  variant: "current" | "projected";
}

function MapPanel({ title, subtitle, pts, legs, totalKm, variant }: PanelProps) {
  const accent =
    variant === "current"
      ? { stroke: "hsl(var(--text-3))", node: "hsl(var(--text-2))" }
      : { stroke: "hsl(var(--primary))", node: "hsl(var(--primary))" };

  // Path nối các điểm
  const pathD = pts.length >= 2
    ? "M " + pts.map((p) => `${p.x},${p.y}`).join(" L ")
    : "";

  // Nhãn km giữa từng cặp điểm
  const legLabels = pts.slice(0, -1).map((p, i) => {
    const next = pts[i + 1];
    const mx = (p.x + next.x) / 2;
    const my = (p.y + next.y) / 2;
    return { x: mx, y: my, km: legs[i] ?? 0, key: `${p.loc.code}-${next.loc.code}` };
  });

  return (
    <div className={cn(
      "rounded-card border bg-surface-1 p-2 flex flex-col gap-1.5 min-w-0",
      variant === "projected"
        ? "border-primary/40 bg-primary/5"
        : "border-surface-3",
    )}>
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold text-text-1 truncate">{title}</div>
          {subtitle && <div className="text-[10px] text-text-3 truncate">{subtitle}</div>}
        </div>
        <div className="text-right tabular-nums shrink-0">
          <div className="text-[10px] text-text-3 uppercase leading-none">Tổng km</div>
          <div className={cn(
            "text-sm font-semibold leading-tight",
            variant === "projected" ? "text-primary" : "text-text-1",
          )}>{totalKm.toLocaleString("vi-VN")} km</div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto rounded bg-surface-2/40"
        role="img"
        aria-label={`Bản đồ ${title}`}
      >
        {/* nền lưới mờ */}
        <defs>
          <pattern id={`grid-${variant}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="hsl(var(--surface-3))" strokeWidth="0.5" opacity="0.4" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={W} height={H} fill={`url(#grid-${variant})`} />

        {/* tuyến đường */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={accent.stroke}
            strokeWidth={variant === "projected" ? 2 : 1.5}
            strokeDasharray={variant === "projected" ? "0" : "4 3"}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* nhãn km mỗi chặng */}
        {legLabels.map((l) => (
          <g key={l.key}>
            <rect
              x={l.x - 14} y={l.y - 7}
              width="28" height="12" rx="3"
              fill="hsl(var(--surface-1))"
              stroke="hsl(var(--surface-3))"
              strokeWidth="0.5"
            />
            <text
              x={l.x} y={l.y + 2}
              textAnchor="middle"
              fontSize="9"
              fill="hsl(var(--text-2))"
              fontWeight="600"
            >{l.km}km</text>
          </g>
        ))}

        {/* nodes */}
        {pts.map((p, i) => {
          const isFactory = i === 0;
          return (
            <g key={`${p.loc.code}-${i}`}>
              {isFactory ? (
                <>
                  <rect
                    x={p.x - 7} y={p.y - 7}
                    width="14" height="14" rx="2"
                    fill="hsl(var(--warning))"
                    stroke="hsl(var(--surface-1))"
                    strokeWidth="1.5"
                  />
                  <text
                    x={p.x} y={p.y + 3}
                    textAnchor="middle"
                    fontSize="8"
                    fill="hsl(var(--warning-foreground, 0 0% 100%))"
                    fontWeight="700"
                  >NM</text>
                </>
              ) : (
                <>
                  <circle
                    cx={p.x} cy={p.y} r="7"
                    fill={accent.node}
                    stroke="hsl(var(--surface-1))"
                    strokeWidth="1.5"
                  />
                  <text
                    x={p.x} y={p.y + 3}
                    textAnchor="middle"
                    fontSize="8"
                    fill="hsl(var(--primary-foreground))"
                    fontWeight="700"
                  >{i}</text>
                </>
              )}
              <text
                x={p.x} y={p.y + (isFactory ? 18 : 19)}
                textAnchor="middle"
                fontSize="9"
                fill="hsl(var(--text-1))"
                fontWeight="600"
              >{p.loc.code.replace(/^(NM|CN)-/, "")}</text>
            </g>
          );
        })}
      </svg>

      {/* sequence chip dòng dưới */}
      <div className="flex flex-wrap items-center gap-0.5 px-1 text-[10px] text-text-2">
        <Factory className="h-2.5 w-2.5 text-warning shrink-0" />
        <span className="font-mono font-semibold">{pts[0]?.loc.code.replace(/^NM-/, "") ?? "—"}</span>
        {pts.slice(1).map((p, i) => (
          <span key={`${p.loc.code}-${i}`} className="inline-flex items-center gap-0.5">
            <ArrowRight className="h-2.5 w-2.5 text-text-3" />
            <span className="font-mono font-semibold">{p.loc.code.replace(/^CN-/, "")}</span>
            <span className="text-text-3">({legs[i]}km)</span>
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
  // Đảm bảo cả 2 panel cùng bounding box → tính toán chung
  const allCodes = useMemo(
    () => Array.from(new Set([...baselineCnCodes, ...currentCnCodes])),
    [baselineCnCodes, currentCnCodes],
  );

  const baselinePts = useMemo(
    () => project(baselineCnCodes, factoryCode),
    [baselineCnCodes, factoryCode],
  );
  const currentPts = useMemo(
    () => project(currentCnCodes, factoryCode),
    [currentCnCodes, factoryCode],
  );

  // chuẩn hoá theo CHUNG bbox: project cả union → lấy scale, rồi áp lại từng route
  const unionPts = useMemo(
    () => project(allCodes, factoryCode),
    [allCodes, factoryCode],
  );
  // Map code → toạ độ chuẩn hoá theo bbox chung
  const sharedXY = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    unionPts.forEach((p) => m.set(p.loc.code, { x: p.x, y: p.y }));
    return m;
  }, [unionPts]);

  // Re-map từng panel để dùng toạ độ chung
  const remap = (pts: Pt[]): Pt[] =>
    pts.map((p) => ({ ...p, ...(sharedXY.get(p.loc.code) ?? { x: p.x, y: p.y }) }));

  const baselineFinal = remap(baselinePts);
  const currentFinal = remap(currentPts);

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

  if (baselineFinal.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-surface-3 bg-surface-2/40 p-3 text-caption text-text-3 flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5" />
        Không có dữ liệu toạ độ để vẽ bản đồ.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-caption text-text-3 font-medium flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          Bản đồ lộ trình {showProjected ? "— so sánh thứ tự giao" : ""}
        </div>
        {showProjected && dirty && (
          <span className={cn(
            "text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full",
            delta > 0
              ? "text-warning bg-warning-bg border border-warning/30"
              : "text-success bg-success-bg border border-success/30",
          )}>
            {delta > 0 ? "+" : ""}{delta} km so với gốc
          </span>
        )}
      </div>

      <div className={cn(
        "grid gap-2",
        showProjected ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1",
      )}>
        <MapPanel
          title="Hiện tại (thứ tự gốc)"
          subtitle="Lộ trình tối ưu hệ thống đề xuất"
          pts={baselineFinal}
          legs={baselineLegs}
          totalKm={baselineTotal}
          variant="current"
        />
        {showProjected && (
          <MapPanel
            title={dirty ? "Sau khi sửa" : "Sau khi sửa (chưa thay đổi)"}
            subtitle={dirty ? "Thứ tự bạn vừa kéo-thả" : "Kéo-thả ở bảng dưới để xem khác biệt"}
            pts={currentFinal}
            legs={currentLegs}
            totalKm={currentTotal}
            variant="projected"
          />
        )}
      </div>

      <p className="text-[10px] text-text-3 px-1">
        * Khoảng cách ước tính theo đường chim bay (Haversine). Chỉ minh hoạ — km thực tế phụ thuộc tuyến đường bộ.
      </p>
    </div>
  );
}

/**
 * kpi-format — chuẩn hoá hiển thị số liệu cho KpiCard / HeroCard.
 *
 * Mục tiêu: mọi KPI hiển thị cho farmer đều theo CÙNG quy tắc:
 *   - Số: vi-VN locale (dấu thập phân `,`, ngăn cách nghìn `.`)
 *   - Auto compact với số lớn (>= 1.000): `12.450 → 12,5K`, `3.170.000.000 → 3,17 tỷ`
 *   - Trend: object với { value, direction, isGood } — không tự encode `↑/↓` vào string
 *
 * Dùng `formatKpiValue` cho value chính, `formatKpiDelta` cho trend label.
 * Dùng `kpiTrend(...)` để build object trend chuẩn cho cả KpiCard và HeroCard.
 */

export type KpiUnit =
  | "vnd"      // tự rút gọn theo bậc (triệu/tỷ)
  | "vnd-bn"   // tỷ ₫
  | "vnd-mn"   // triệu ₫
  | "qty"      // đơn vị đếm (cái, m², ngày…) — caller tự truyền unit text
  | "pct"      // %
  | "raw";     // hiển thị nguyên — không format

export type TrendDirection = "up" | "down" | "flat";

export interface KpiTrend {
  /** Hiển thị trên badge — đã format (vd: "+12%", "−240 triệu ₫") */
  value: string;
  /** Hướng thay đổi — quyết định icon ↑/↓/— */
  direction: TrendDirection;
  /** Tăng/giảm này là tốt hay xấu cho metric này (quyết định màu success/danger) */
  isGood: boolean;
  /** Optional sub label (vd: "vs T4", "vs tuần trước") */
  vs?: string;
}

const VI = "vi-VN";

/**
 * Format giá trị KPI chính theo unit.
 * Trả về tuple [value, unit] để KpiCard/HeroCard render riêng phần unit nhỏ.
 *
 * Ví dụ:
 *   formatKpiValue(3170000000, "vnd")    → ["3,17", "tỷ ₫"]
 *   formatKpiValue(507000000,  "vnd")    → ["507", "triệu ₫"]
 *   formatKpiValue(94.2, "pct")          → ["94,2", "%"]
 *   formatKpiValue(14, "qty", "vấn đề")  → ["14", "vấn đề"]
 */
export function formatKpiValue(
  raw: number,
  unit: KpiUnit,
  qtyLabel?: string,
): [value: string, unit: string] {
  if (unit === "raw") return [String(raw), qtyLabel ?? ""];

  if (unit === "pct") {
    return [raw.toLocaleString(VI, { maximumFractionDigits: 1 }), "%"];
  }

  if (unit === "vnd-bn") {
    return [(raw / 1e9).toLocaleString(VI, { maximumFractionDigits: 2 }), "tỷ ₫"];
  }
  if (unit === "vnd-mn") {
    return [(raw / 1e6).toLocaleString(VI, { maximumFractionDigits: 0 }), "triệu ₫"];
  }
  if (unit === "vnd") {
    if (Math.abs(raw) >= 1e9) {
      return [(raw / 1e9).toLocaleString(VI, { maximumFractionDigits: 2 }), "tỷ ₫"];
    }
    if (Math.abs(raw) >= 1e6) {
      return [(raw / 1e6).toLocaleString(VI, { maximumFractionDigits: 0 }), "triệu ₫"];
    }
    return [raw.toLocaleString(VI), "₫"];
  }

  // qty — số nguyên, có separator nghìn
  return [raw.toLocaleString(VI, { maximumFractionDigits: 0 }), qtyLabel ?? ""];
}

/**
 * Format delta cho trend badge.
 *  - pct  → `+12%` / `−12%`
 *  - vnd  → `+58 triệu ₫`
 *  - qty  → `+3 vấn đề`
 *
 * `signed` mặc định true để badge luôn có dấu rõ ràng cho farmer.
 */
export function formatKpiDelta(
  raw: number,
  unit: KpiUnit,
  qtyLabel?: string,
): string {
  const [v, u] = formatKpiValue(Math.abs(raw), unit, qtyLabel);
  const sign = raw > 0 ? "+" : raw < 0 ? "−" : "";
  return u ? `${sign}${v} ${u}`.trim() : `${sign}${v}`;
}

/**
 * Build object KpiTrend chuẩn — dùng cho cả KpiCard và HeroCard.
 *
 *   kpiTrend(-12, "pct", { higherIsBetter: false, vs: "tuần trước" })
 *     → { value: "−12%", direction: "down", isGood: true, vs: "tuần trước" }
 *
 * Lưu ý semantic:
 *  - `higherIsBetter` = true cho metric tích cực (fill rate, savings, accuracy).
 *  - `higherIsBetter` = false cho metric tiêu cực (exceptions, MAPE, working capital).
 */
export function kpiTrend(
  raw: number,
  unit: KpiUnit,
  opts: { higherIsBetter: boolean; vs?: string; qtyLabel?: string } = { higherIsBetter: true },
): KpiTrend {
  const direction: TrendDirection = raw > 0 ? "up" : raw < 0 ? "down" : "flat";
  const isGood =
    direction === "flat"
      ? true
      : opts.higherIsBetter
        ? direction === "up"
        : direction === "down";
  return {
    value: formatKpiDelta(raw, unit, opts.qtyLabel),
    direction,
    isGood,
    vs: opts.vs,
  };
}

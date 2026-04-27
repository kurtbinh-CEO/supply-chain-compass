/**
 * compare-metrics — sinh mock CompareMetric per screen × per range.
 *
 * Production: lấy từ DB snapshot. Demo: deterministic mock dựa trên preset
 * để khi farmer chọn "Tuần trước" thấy số khác với "2 tuần trước".
 */
import type { CompareMetric, TimeRange } from "@/components/TimeRangeFilter";

/** Hệ số scale theo preset — số càng cũ càng khác hiện tại. */
function pastFactor(range: TimeRange): number {
  if (range.type === "custom") return 0.85;
  switch (range.preset) {
    case "yesterday":     return 0.97;
    case "last_7_days":   return 0.92;
    case "last_30_days":  return 0.85;
    case "last_week":     return 0.94;
    case "last_2_weeks":  return 0.88;
    case "last_4_weeks":  return 0.82;
    case "last_month":    return 0.90;
    case "this_quarter":  return 0.95;
    case "last_6_months": return 0.78;
    default:              return 0.95;
  }
}

/* ─────────────── Orders (weekly) ─────────────── */
export function ordersCompare(range: TimeRange): CompareMetric[] {
  const f = pastFactor(range);
  const currentTotal = 22;
  const currentDone = 18;
  const currentOverdue = 1;
  const currentTransit = 3;
  return [
    {
      key: "total", label: "Tổng đơn (PO + TO)", unit: "đơn",
      past: Math.round(currentTotal * f),
      current: currentTotal,
      betterDirection: "up",
      note: "Số đơn hàng được tạo trong kỳ",
    },
    {
      key: "done", label: "Đã hoàn tất", unit: "đơn",
      past: Math.round(currentDone * f * 0.95),
      current: currentDone,
      betterDirection: "up",
    },
    {
      key: "overdue", label: "Trễ hạn", unit: "đơn",
      past: Math.round(currentOverdue / f) + 1,
      current: currentOverdue,
      betterDirection: "down",
      note: "Vượt SLA — càng ít càng tốt",
    },
    {
      key: "transit", label: "Đang vận chuyển", unit: "xe",
      past: Math.max(0, Math.round(currentTransit * f * 1.2)),
      current: currentTransit,
      betterDirection: "neutral",
    },
    {
      key: "fillRate", label: "Container fill trung bình", unit: "%",
      past: +(82 * f / 0.94).toFixed(1),
      current: 88,
      betterDirection: "up",
    },
  ];
}

/* ─────────────── DRP (weekly) ─────────────── */
export function drpCompare(range: TimeRange): CompareMetric[] {
  const f = pastFactor(range);
  return [
    {
      key: "fillRate", label: "Tỷ lệ lấp đầy", unit: "%",
      past: +(75 + (94 - 75) * f).toFixed(1),
      current: 94.2,
      betterDirection: "up",
      note: "Demand được đáp ứng",
    },
    {
      key: "rpoCount", label: "RPO release", unit: "PO",
      past: Math.round(28 * f),
      current: 32,
      betterDirection: "up",
    },
    {
      key: "lcnbCount", label: "TO chuyển ngang", unit: "lệnh",
      past: Math.round(8 * f * 1.1),
      current: 6,
      betterDirection: "down",
      note: "Càng ít càng tốt — ưu tiên Hub",
    },
    {
      key: "shortage", label: "CN thiếu hàng", unit: "CN",
      past: Math.round(4 / f),
      current: 2,
      betterDirection: "down",
    },
    {
      key: "totalQty", label: "Tổng phân bổ", unit: "m²",
      past: Math.round(11_200 * f),
      current: 12_700,
      betterDirection: "up",
    },
  ];
}

/* ─────────────── Inventory (daily) ─────────────── */
export function inventoryCompare(range: TimeRange): CompareMetric[] {
  const f = pastFactor(range);
  return [
    {
      key: "totalOnHand", label: "Tổng tồn kho 12 CN", unit: "m²",
      past: Math.round(48_500 * (2 - f)),
      current: 42_300,
      betterDirection: "neutral",
      note: "Càng cao càng tăng vốn lưu động",
    },
    {
      key: "available", label: "Khả dụng (Available)", unit: "m²",
      past: Math.round(35_200 * (2 - f) * 0.92),
      current: 31_800,
      betterDirection: "neutral",
    },
    {
      key: "underSs", label: "SKU dưới SS", unit: "SKU",
      past: Math.round(8 / f),
      current: 5,
      betterDirection: "down",
      note: "Càng ít càng tốt",
    },
    {
      key: "blockedCn", label: "CN block DRP (HSTK<2d)", unit: "CN",
      past: Math.round(3 / f),
      current: 1,
      betterDirection: "down",
    },
    {
      key: "hstk", label: "HSTK trung bình", unit: "ngày",
      past: +(8.5 * (2 - f) * 0.95).toFixed(1),
      current: 7.8,
      betterDirection: "neutral",
    },
  ];
}

/* ─────────────── Demand-weekly (weekly) ─────────────── */
export function demandWeeklyCompare(range: TimeRange): CompareMetric[] {
  const f = pastFactor(range);
  return [
    {
      key: "totalFc", label: "FC tuần tổng", unit: "m²",
      past: Math.round(13_500 * f),
      current: 14_800,
      betterDirection: "neutral",
    },
    {
      key: "adjustments", label: "Số CN điều chỉnh", unit: "CN",
      past: Math.round(7 * f),
      current: 9,
      betterDirection: "neutral",
    },
    {
      key: "autoApproved", label: "Auto-approve (trust ≥ 85%)", unit: "CN",
      past: Math.round(4 * f),
      current: 5,
      betterDirection: "up",
    },
    {
      key: "rejected", label: "Bị từ chối (vượt biên)", unit: "CN",
      past: Math.round(2 / f),
      current: 1,
      betterDirection: "down",
    },
    {
      key: "fcAccuracy", label: "FC accuracy (vs actual)", unit: "%",
      past: +(78 * f / 0.94).toFixed(1),
      current: 86.5,
      betterDirection: "up",
      note: "Càng cao càng đáng tin",
    },
  ];
}

/* ─────────────── Hub & Cam kết (monthly) ─────────────── */
export function hubCompare(range: TimeRange): CompareMetric[] {
  const f = pastFactor(range);
  return [
    {
      key: "committed", label: "Tổng cam kết NM", unit: "m²",
      past: Math.round(8_880 * f),
      current: 8_880,
      betterDirection: "up",
    },
    {
      key: "released", label: "Đã release qua RPO", unit: "m²",
      past: Math.round(5_400 * f * 1.1),
      current: 5_400,
      betterDirection: "neutral",
    },
    {
      key: "available", label: "Hub còn lại", unit: "m²",
      past: Math.round(3_060 * f * 0.85),
      current: 3_060,
      betterDirection: "neutral",
    },
    {
      key: "skuLocked", label: "SKU đã khóa cam kết",
      past: Math.round(20 * f),
      current: 13,
      betterDirection: "up",
      note: "Mục tiêu ≥ 80% (20/25)",
    },
    {
      key: "honoringPct", label: "Honoring NM trung bình", unit: "%",
      past: +(72 * f / 0.9).toFixed(1),
      current: 84,
      betterDirection: "up",
    },
  ];
}

/* ─────────────── S&OP (monthly) ─────────────── */
export function sopCompare(range: TimeRange): CompareMetric[] {
  const f = pastFactor(range);
  return [
    {
      key: "consensusV3", label: "Consensus v3 tổng", unit: "m²",
      past: Math.round(48_300 * f),
      current: 48_300,
      betterDirection: "neutral",
    },
    {
      key: "vsAop", label: "Lệch vs AOP", unit: "%",
      past: +(8.5 / f).toFixed(1),
      current: 4.2,
      betterDirection: "down",
    },
    {
      key: "exceptions", label: "Ngoại lệ chưa giải trình",
      past: Math.round(12 / f),
      current: 5,
      betterDirection: "down",
    },
    {
      key: "fvaBest", label: "Số CN dùng FVA best",
      past: Math.round(8 * f),
      current: 11,
      betterDirection: "up",
      note: "Càng nhiều CN dùng best model càng chính xác",
    },
  ];
}

/* ─────────────── Monitoring (monthly) ─────────────── */
export function monitoringCompare(range: TimeRange): CompareMetric[] {
  const f = pastFactor(range);
  return [
    {
      key: "fillRate", label: "Fill rate", unit: "%",
      past: +(88 + (94 - 88) * f).toFixed(1),
      current: 94.2,
      betterDirection: "up",
    },
    {
      key: "doi", label: "Days of Inventory", unit: "ngày",
      past: +(42 / f).toFixed(1),
      current: 38,
      betterDirection: "down",
    },
    {
      key: "wc", label: "Vốn lưu động", unit: "tỷ ₫",
      past: +(1.5 * (2 - f) * 0.85).toFixed(2),
      current: 1.2,
      betterDirection: "down",
    },
    {
      key: "fcAcc", label: "Forecast accuracy", unit: "%",
      past: +(78 * f / 0.92).toFixed(1),
      current: 86.5,
      betterDirection: "up",
    },
    {
      key: "otd", label: "On-time Delivery", unit: "%",
      past: +(82 * f / 0.9).toFixed(1),
      current: 91,
      betterDirection: "up",
    },
    {
      key: "nmRisk", label: "NM rủi ro cao",
      past: Math.round(4 / f),
      current: 2,
      betterDirection: "down",
      note: "NM có honoring < 70%",
    },
  ];
}

/* ─────────────── Executive (monthly) ─────────────── */
export function executiveCompare(range: TimeRange): CompareMetric[] {
  const f = pastFactor(range);
  return [
    {
      key: "fill", label: "Tỷ lệ lấp đầy", unit: "%",
      past: +(88 + (94 - 88) * f).toFixed(1),
      current: 94.2,
      betterDirection: "up",
    },
    {
      key: "doi", label: "Days of Inventory", unit: "ngày",
      past: +(42 / f).toFixed(1),
      current: 38,
      betterDirection: "down",
    },
    {
      key: "wc", label: "Vốn lưu động", unit: "tỷ ₫",
      past: +(1.5 * (2 - f) * 0.85).toFixed(2),
      current: 1.2,
      betterDirection: "down",
    },
    {
      key: "fc", label: "Forecast accuracy", unit: "%",
      past: +(78 * f / 0.92).toFixed(1),
      current: 86.5,
      betterDirection: "up",
    },
    {
      key: "otd", label: "On-time Delivery", unit: "%",
      past: +(82 * f / 0.9).toFixed(1),
      current: 91,
      betterDirection: "up",
    },
    {
      key: "supplier", label: "Supplier fill rate", unit: "%",
      past: +(75 * f / 0.9).toFixed(1),
      current: 84,
      betterDirection: "up",
    },
  ];
}

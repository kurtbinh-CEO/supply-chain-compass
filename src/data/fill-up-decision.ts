/* ════════════════════════════════════════════════════════════════════════════
   §  FILL-UP DECISION TREE (TRANSPORT-LOGIC §③)
   §  Container fill < 100% → ROUND-UP, CONSOLIDATION, HOLD, hay SHIP AS-IS?
   ════════════════════════════════════════════════════════════════════════════ */

import { getTransportConfig } from "./transport-config";

export type FillUpStrategy =
  | "consolidation"      // Ghép thêm CN
  | "consolidation_plus_round_up" // Ghép + round up
  | "round_up"           // Thêm hàng cùng SKU đến MOQ
  | "hold"               // Giữ chờ gom tuần tới
  | "ship_as_is"         // Xuất ngay dù fill thấp
  | "ok";                // Fill đã ≥ 80%, không cần fill thêm

export interface FillUpInput {
  fillPct: number;
  hasEligibleConsolidation: boolean;     // có CN cùng NM, cùng hướng, detour OK?
  fillAfterConsolidationPct?: number;    // fill nếu ghép xong
  gapToMoqPct: number;                   // % gap tới MOQ
  hasNextWeekPo: boolean;                // có PO tuần W+1 cùng NM?
  cnHstkDays: number;                    // CN destination còn HSTK bao nhiêu ngày
  holdDaysSoFar: number;                 // đã hold bao lâu
}

export interface FillUpDecision {
  strategy: FillUpStrategy;
  primaryAction: string;       // VN: "Ghép CN-DN (+900m²) → fill 85%"
  reason: string;              // VN: "Ghép CN = free fill, không tốn vốn"
  altActions: { strategy: FillUpStrategy; label: string }[];
  warning?: string;
}

/**
 * Decision tree theo PRD §11.8A:
 * 1. Có CN ghép được → CONSOLIDATION (ưu tiên free fill)
 * 2. Ghép xong vẫn < 80% → CONSOLIDATION + ROUND-UP hybrid
 * 3. Không ghép được + gap < 15% → ROUND-UP
 * 4. Không ghép được + gap ≥ 15% + có PO tuần sau → HOLD
 * 5. Không ghép được + không PO tuần sau → SHIP AS-IS
 * 6. CN urgent (HSTK < safe) → SHIP AS-IS bắt buộc
 * 7. Fill ≥ 80% → OK
 */
export function decideFillUp(input: FillUpInput): FillUpDecision {
  const cfg = getTransportConfig();

  // Trường hợp đã đủ
  if (input.fillPct >= 80) {
    return {
      strategy: "ok",
      primaryAction: "Fill ≥ 80% — không cần xử lý thêm",
      reason: "Container đã đủ hiệu quả, có thể xuất ngay",
      altActions: [],
    };
  }

  // CN urgent — không cho hold
  const isUrgent = input.cnHstkDays < cfg.hold_safe_hstk_days;

  // Có thể ghép?
  if (input.hasEligibleConsolidation) {
    const fillAfter = input.fillAfterConsolidationPct ?? input.fillPct;
    if (fillAfter >= 80) {
      return {
        strategy: "consolidation",
        primaryAction: `Ghép thêm CN → fill ~${fillAfter}%`,
        reason: "Ghép CN = free fill, tận dụng PO sẵn có, không tốn vốn thêm",
        altActions: [
          { strategy: "round_up", label: "Round-up thêm hàng SKU phổ biến" },
        ],
      };
    }
    // hybrid
    return {
      strategy: "consolidation_plus_round_up",
      primaryAction: `Ghép CN → ~${fillAfter}% rồi round-up đến 80%+`,
      reason: "Ghép xong vẫn thấp — kết hợp round-up để đạt MOQ + fill cao",
      altActions: [
        { strategy: "consolidation", label: "Chỉ ghép CN, chấp nhận fill thấp" },
      ],
    };
  }

  // Không ghép được — check round-up
  if (input.gapToMoqPct <= cfg.round_up_max_gap_pct_of_moq) {
    return {
      strategy: "round_up",
      primaryAction: `Round-up SKU phổ biến (gap ${input.gapToMoqPct.toFixed(0)}% ≤ ${cfg.round_up_max_gap_pct_of_moq}%)`,
      reason: `Gap nhỏ — bổ sung SKU bán chạy tại CN đích để đạt MOQ`,
      altActions: [
        { strategy: "ship_as_is", label: "Xuất ngay dù fill thấp" },
      ],
    };
  }

  // Gap lớn — check hold
  if (isUrgent) {
    return {
      strategy: "ship_as_is",
      primaryAction: "Xuất ngay (CN urgent — HSTK thấp)",
      reason: `CN còn HSTK ${input.cnHstkDays}d < ngưỡng an toàn ${cfg.hold_safe_hstk_days}d`,
      altActions: [],
      warning: `Fill ${input.fillPct}% — cước/m² cao hơn ~30% so với fill 80%+`,
    };
  }

  if (input.hasNextWeekPo && input.holdDaysSoFar < cfg.hold_max_days
      && input.fillPct >= cfg.hold_min_fill_pct) {
    return {
      strategy: "hold",
      primaryAction: `Giữ chờ ${cfg.hold_max_days - input.holdDaysSoFar}d gom PO tuần sau`,
      reason: `CN còn ${input.cnHstkDays}d HSTK an toàn — chờ gom hiệu quả hơn`,
      altActions: [
        { strategy: "ship_as_is", label: "Xuất ngay không chờ" },
      ],
    };
  }

  return {
    strategy: "ship_as_is",
    primaryAction: "Xuất ngay (không có PO tuần sau / hết hạn hold)",
    reason: "Không còn lựa chọn fill thêm — xuất tránh trễ giao",
    altActions: [],
    warning: `Fill ${input.fillPct}% — cước/m² cao hơn ~30%`,
  };
}

export const STRATEGY_LABELS: Record<FillUpStrategy, string> = {
  consolidation: "Ghép tuyến",
  consolidation_plus_round_up: "Ghép + Round-up",
  round_up: "Round-up",
  hold: "Giữ chờ",
  ship_as_is: "Xuất ngay (fill thấp)",
  ok: "OK — không cần xử lý",
};

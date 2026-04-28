/* ════════════════════════════════════════════════════════════════════════════
   §  MANUAL EDIT THRESHOLDS (TRANSPORT-LOGIC §④)
   §  Helpers validate khi farmer chỉnh qty trong container
   ════════════════════════════════════════════════════════════════════════════ */

import { getTransportConfig } from "./transport-config";
import { skuWeight, VEHICLE_MAX_WEIGHT_KG } from "./container-plans";

export type EditSeverity = "ok" | "warn" | "block" | "require_reason";

export interface QtyEditValidation {
  severity: EditSeverity;
  message: string;
  newWeightKg?: number;
  weightSeverity?: "ok" | "warn" | "block";
  weightMessage?: string;
}

export interface QtyEditInput {
  originalQty: number;
  newQty: number;
  sku: string;
  // Container context
  containerCurrentWeightKg: number;       // tổng trọng lượng container TRƯỚC sửa (đã trừ original line)
  containerCapacityM2: number;
  containerCurrentFillM2: number;          // tổng fill TRƯỚC sửa (đã trừ original)
  // NM context
  nmAvailableQty: number;                  // qty NM còn có thể cấp
  // SKU context
  skuMoq: number;
}

/** Validate khi farmer sửa qty của 1 PO line trong container */
export function validateQtyEdit(input: QtyEditInput): QtyEditValidation {
  const cfg = getTransportConfig();
  const { originalQty, newQty, sku, nmAvailableQty } = input;

  if (newQty < 0) {
    return { severity: "block", message: "Số lượng không thể âm" };
  }

  // Recalc weight
  const lineWeight = newQty * skuWeight(sku);
  const newTotalWeight = input.containerCurrentWeightKg + lineWeight;
  const weightPct = (newTotalWeight / VEHICLE_MAX_WEIGHT_KG) * 100;
  let weightSeverity: "ok" | "warn" | "block" = "ok";
  let weightMessage = "";
  if (newTotalWeight > VEHICLE_MAX_WEIGHT_KG) {
    weightSeverity = "block";
    weightMessage = `${(newTotalWeight / 1000).toFixed(1)}T > 28T — không thể lưu`;
  } else if (weightPct >= 95) {
    weightSeverity = "warn";
    weightMessage = `${(newTotalWeight / 1000).toFixed(1)}T (${weightPct.toFixed(0)}% tải) ⚠️`;
  }

  // Block weight overflow first
  if (weightSeverity === "block") {
    return {
      severity: "block",
      message: weightMessage,
      newWeightKg: newTotalWeight,
      weightSeverity,
      weightMessage,
    };
  }

  // Tăng?
  if (newQty > originalQty) {
    const increasePct = ((newQty - originalQty) / originalQty) * 100;
    const maxAllowedQty = Math.min(
      nmAvailableQty,
      originalQty * (1 + cfg.edit_max_increase_pct / 100),
    );
    if (newQty > maxAllowedQty) {
      const reason =
        newQty > nmAvailableQty
          ? `NM chỉ còn ${nmAvailableQty.toLocaleString("vi-VN")}m² — không đủ`
          : `Tăng > ${cfg.edit_max_increase_pct}% so với DRP — phải tạo PO mới`;
      return { severity: "block", message: `❌ ${reason}`, newWeightKg: newTotalWeight, weightSeverity, weightMessage };
    }
    if (increasePct > cfg.edit_warn_increase_pct - 100) {
      return {
        severity: "warn",
        message: `Tăng ${increasePct.toFixed(0)}% so với DRP — SC Manager cần duyệt`,
        newWeightKg: newTotalWeight, weightSeverity, weightMessage,
      };
    }
  }

  // Giảm?
  if (newQty < originalQty) {
    const decreasePct = ((originalQty - newQty) / originalQty) * 100;
    if (newQty === 0) {
      return {
        severity: "warn",
        message: "Gỡ PO khỏi container — chuyển sang 'Chưa xếp'",
        newWeightKg: newTotalWeight, weightSeverity, weightMessage,
      };
    }
    if (decreasePct > cfg.edit_require_reason_decrease_pct) {
      return {
        severity: "require_reason",
        message: `Giảm ${decreasePct.toFixed(0)}% — bắt buộc nhập lý do (CN giảm nhu cầu / NM capacity / Giá thay đổi)`,
        newWeightKg: newTotalWeight, weightSeverity, weightMessage,
      };
    }
    if (decreasePct > cfg.edit_warn_decrease_pct) {
      return {
        severity: "warn",
        message: `Giảm ${decreasePct.toFixed(0)}% — ảnh hưởng commitment NM`,
        newWeightKg: newTotalWeight, weightSeverity, weightMessage,
      };
    }
  }

  return {
    severity: weightSeverity === "warn" ? "warn" : "ok",
    message: weightSeverity === "warn" ? weightMessage : "OK",
    newWeightKg: newTotalWeight, weightSeverity, weightMessage,
  };
}

export interface AddPoValidation {
  ok: boolean;
  blockReason?: string;
  warnReason?: string;
}

/** Validate khi farmer thêm 1 PO mới vào container */
export function validateAddPo(input: {
  containerNmId: string;
  poNmId: string;
  containerCurrentDrops: number;
  newQty: number;
  newSku: string;
  containerCurrentWeightKg: number;
  remainingCapacityM2: number;
}): AddPoValidation {
  const cfg = getTransportConfig();

  // Check 1: cùng NM
  if (input.containerNmId !== input.poNmId) {
    return {
      ok: true,
      warnReason: "Khác NM nguồn — xe phải dừng 2 nơi lấy hàng (cước có thể tăng)",
    };
  }

  // Check 4: max drops
  if (input.containerCurrentDrops >= cfg.consolidation_max_drops) {
    return {
      ok: false,
      blockReason: `Đã đạt ${cfg.consolidation_max_drops} điểm giao tối đa — tạo container mới`,
    };
  }

  // Check 3: capacity (volume)
  if (input.newQty > input.remainingCapacityM2) {
    return {
      ok: false,
      blockReason: `Không vừa: cần ${input.newQty}m² nhưng còn ${input.remainingCapacityM2}m² — bớt hàng hoặc đổi xe lớn`,
    };
  }

  // Check 3: weight
  const newWeight = input.containerCurrentWeightKg + input.newQty * skuWeight(input.newSku);
  if (newWeight > VEHICLE_MAX_WEIGHT_KG) {
    return {
      ok: false,
      blockReason: `Vượt 28T (${(newWeight / 1000).toFixed(1)}T) — bớt hàng hoặc đổi xe lớn`,
    };
  }

  return { ok: true };
}

/** Lý do giảm — dropdown options */
export const DECREASE_REASONS: { value: string; label: string }[] = [
  { value: "cn_demand_decrease", label: "CN giảm nhu cầu" },
  { value: "nm_capacity_issue", label: "NM gặp vấn đề capacity" },
  { value: "price_change", label: "Giá thay đổi" },
  { value: "other", label: "Khác (ghi chú riêng)" },
];

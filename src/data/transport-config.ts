/* ════════════════════════════════════════════════════════════════════════════
   §  TRANSPORT CONFIG — defaults + localStorage overrides
   §  Tham số cho 4 ma trận logic: route constraint, drop eligibility,
   §  fill-up decision tree, manual edit thresholds.
   §  ConfigPage > Tab "Vận tải" hiển thị + cho phép override runtime.
   ════════════════════════════════════════════════════════════════════════════ */

const LS_KEY = "smartlog.transport_config.v1";

/** Tất cả threshold/config có thể tinh chỉnh */
export interface TransportConfig {
  // Manual edit thresholds (per PO line)
  edit_max_increase_pct: number;          // 150 = max tăng 150% original
  edit_warn_increase_pct: number;         // 120 = cảnh báo > 120%
  edit_warn_decrease_pct: number;         // 30  = cảnh báo giảm > 30%
  edit_require_reason_decrease_pct: number; // 30 = bắt buộc lý do
  edit_min_container_fill_warn_pct: number; // 30 = container gần rỗng
  edit_low_fill_after_change_pct: number; // 40 = warn nếu xe lớn fill thấp

  // Consolidation
  consolidation_max_drops: number;                    // 3
  consolidation_max_detour_km_inter_region: number;   // 50
  consolidation_max_detour_km_intra_region: number;   // 30

  // Round-up
  round_up_max_gap_pct_of_moq: number;     // 15
  round_up_preferred_sku_source: "best_selling_at_dest" | "lowest_doi" | "manual";

  // Hold
  hold_min_fill_pct: number;     // 60
  hold_max_days: number;         // 2
  hold_safe_hstk_days: number;   // 7 (chỉ hold khi CN còn hàng > N ngày)
}

export const TRANSPORT_DEFAULTS: TransportConfig = {
  edit_max_increase_pct: 150,
  edit_warn_increase_pct: 120,
  edit_warn_decrease_pct: 30,
  edit_require_reason_decrease_pct: 30,
  edit_min_container_fill_warn_pct: 30,
  edit_low_fill_after_change_pct: 40,
  consolidation_max_drops: 3,
  consolidation_max_detour_km_inter_region: 50,
  consolidation_max_detour_km_intra_region: 30,
  round_up_max_gap_pct_of_moq: 15,
  round_up_preferred_sku_source: "best_selling_at_dest",
  hold_min_fill_pct: 60,
  hold_max_days: 2,
  hold_safe_hstk_days: 7,
};

export interface TransportConfigKeyMeta {
  key: keyof TransportConfig;
  label: string;
  description: string;
  unit?: string;
  inputType: "number" | "select";
  options?: { value: string; label: string }[];
  group: "edit" | "consolidation" | "round_up" | "hold";
}

export const TRANSPORT_CONFIG_KEYS: TransportConfigKeyMeta[] = [
  // edit
  { key: "edit_max_increase_pct", label: "Giới hạn tăng tối đa", description: "Vượt giới hạn này → chặn cứng, bắt buộc tạo PO mới", unit: "%", inputType: "number", group: "edit" },
  { key: "edit_warn_increase_pct", label: "Cảnh báo tăng", description: "Vượt ngưỡng → cảnh báo vàng, SC Manager duyệt", unit: "%", inputType: "number", group: "edit" },
  { key: "edit_warn_decrease_pct", label: "Cảnh báo giảm", description: "Giảm vượt ngưỡng → cảnh báo ảnh hưởng commitment NM", unit: "%", inputType: "number", group: "edit" },
  { key: "edit_require_reason_decrease_pct", label: "Bắt buộc lý do khi giảm", description: "Giảm vượt ngưỡng → bắt buộc chọn lý do", unit: "%", inputType: "number", group: "edit" },
  { key: "edit_min_container_fill_warn_pct", label: "Container gần rỗng", description: "Fill dưới ngưỡng → gợi ý xóa container", unit: "%", inputType: "number", group: "edit" },
  { key: "edit_low_fill_after_change_pct", label: "Xe quá lớn (fill thấp)", description: "Sau đổi xe lớn, fill dưới ngưỡng → cảnh báo", unit: "%", inputType: "number", group: "edit" },
  // consolidation
  { key: "consolidation_max_drops", label: "Số drop tối đa / chuyến", description: "Quá ngưỡng → bắt buộc tạo container mới", unit: "drop", inputType: "number", group: "consolidation" },
  { key: "consolidation_max_detour_km_inter_region", label: "Detour tối đa liên vùng", description: "Vượt → không cho ghép tuyến (MB↔MN)", unit: "km", inputType: "number", group: "consolidation" },
  { key: "consolidation_max_detour_km_intra_region", label: "Detour tối đa nội vùng", description: "Vượt → không cho ghép tuyến trong vùng", unit: "km", inputType: "number", group: "consolidation" },
  // round_up
  { key: "round_up_max_gap_pct_of_moq", label: "Round-up khi gap MOQ ≤", description: "Khoảng cách tới MOQ ≤ ngưỡng → đề xuất round-up", unit: "%", inputType: "number", group: "round_up" },
  { key: "round_up_preferred_sku_source", label: "Nguồn chọn SKU round-up", description: "Quy tắc chọn SKU bổ sung khi round-up", inputType: "select", group: "round_up",
    options: [
      { value: "best_selling_at_dest", label: "SKU bán chạy tại CN đích" },
      { value: "lowest_doi", label: "SKU thiếu nhất (DOI thấp)" },
      { value: "manual", label: "Farmer chọn tay" },
    ] },
  // hold
  { key: "hold_min_fill_pct", label: "Fill tối thiểu để hold", description: "Dưới ngưỡng → mới đề xuất giữ chờ gom thêm", unit: "%", inputType: "number", group: "hold" },
  { key: "hold_max_days", label: "Số ngày hold tối đa", description: "Quá hạn → auto xuất dù fill thấp", unit: "ngày", inputType: "number", group: "hold" },
  { key: "hold_safe_hstk_days", label: "HSTK an toàn để hold", description: "CN có HSTK > ngưỡng → mới được hold (urgent thì không)", unit: "ngày", inputType: "number", group: "hold" },
];

/* ── Storage ── */
export function loadTransportOverrides(): Partial<TransportConfig> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveTransportOverrides(overrides: Partial<TransportConfig>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent("transport-config-changed"));
  } catch {
    /* ignore */
  }
}

export function getTransportConfig(): TransportConfig {
  return { ...TRANSPORT_DEFAULTS, ...loadTransportOverrides() };
}

export function setTransportValue<K extends keyof TransportConfig>(
  key: K,
  value: TransportConfig[K],
): void {
  const overrides = loadTransportOverrides();
  if (value === TRANSPORT_DEFAULTS[key]) {
    delete overrides[key];
  } else {
    (overrides as Record<string, unknown>)[key as string] = value;
  }
  saveTransportOverrides(overrides);
}

export function resetTransportKey(key: keyof TransportConfig): void {
  const overrides = loadTransportOverrides();
  delete overrides[key];
  saveTransportOverrides(overrides);
}

export function resetAllTransportConfig(): void {
  saveTransportOverrides({});
}

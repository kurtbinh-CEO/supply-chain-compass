/**
 * DEMO SCENARIOS — bộ tình huống edge case cho phép team test workflow
 *
 * Mỗi scenario mô tả: trigger, kỳ vọng UI hiển thị, escalation path.
 * Dùng để onboard người mới + viết e2e test.
 */

export type ScenarioId =
  | "severe_shortage"
  | "nm_rejection"
  | "cascade_failure"
  | "near_stockout"
  | "honoring_drop"
  | "lcnb_overflow"
  | "container_full_hold"
  | "carrier_no_show";

export interface DemoScenario {
  id: ScenarioId;
  title: string;
  severity: "critical" | "warn" | "info";
  trigger: string;
  affected: string[];           // CN codes / SKU codes / NM ids
  expectedUi: string[];         // Bullet points: nơi nào hiện badge/toast/banner
  escalation: string[];         // Bước xử lý theo SOP
  testNote?: string;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "severe_shortage",
    title: "Thiếu hàng nghiêm trọng — fill rate <50% tại CN-HCM",
    severity: "critical",
    trigger: "Demand FC đột biến +35% sau khi B2B chốt deal lớn, tồn kho không kịp",
    affected: ["CN-HCM", "GA-300", "GA-600"],
    expectedUi: [
      "DRP Results card 'CN thiếu hàng' = 6 (đỏ pulse)",
      "DRP recommendation: '🔴 NGUY CẤP — fill < 50%. Cần PO khẩn + LCNB + TO chéo CN'",
      "Workspace 'Cần làm' xuất hiện task: 'Đặt PO khẩn cho HCM (GA-300)'",
      "Leadership Dashboard banner đỏ: '2 CN nguy cấp'",
    ],
    escalation: [
      "1. Xin LCNB từ NM Mikado (lead time 0 ngày, premium +20%)",
      "2. TO chéo từ CN-BD và CN-LA (nếu surplus)",
      "3. Báo SC Manager phê duyệt PO khẩn vượt MOQ",
      "4. Thông báo CN HCM về timeline dự kiến nhận hàng",
    ],
    testNote: "Mở /drp, chọn step 5, lọc 'CN thiếu hàng' → xem CN-HCM",
  },
  {
    id: "nm_rejection",
    title: "Nhà máy từ chối cam kết — Mikado giảm 40% honoring",
    severity: "critical",
    trigger: "Mikado báo bảo trì máy 2 tuần, honoring T5 giảm từ 95% xuống 55%",
    affected: ["NM-MIKADO", "CN-HCM", "GA-600", "CN-CT"],
    expectedUi: [
      "Hub Commitment card 'NM đề xuất khác' = 2 SKU (vàng)",
      "DRP recommendation: '❌ NM từ chối/giảm cam kết. Tìm NM thay thế'",
      "S&OP Consensus: NM column highlight đỏ + tooltip 'Honoring 55% < target 80%'",
      "MasterData → Nhà máy: row Mikado có badge ⚠️ 'Cảnh báo'",
    ],
    escalation: [
      "1. Hub: thương lượng với NM thay thế (Tân Việt, Hà Anh)",
      "2. S&OP: rà lại consensus v3, có thể giảm v3 cho SKU bị ảnh hưởng",
      "3. Báo Sales/B2B Team: có thể trễ giao 5-7 ngày",
      "4. Cập nhật honoring_pct trong master_factories",
    ],
  },
  {
    id: "cascade_failure",
    title: "Cascade — HCM thiếu kéo theo AG, LA cũng thiếu (TO chéo bị chặn)",
    severity: "critical",
    trigger: "CN-HCM thiếu GA-300 nặng → TO chéo từ AG sang HCM → AG cũng tụt fill",
    affected: ["CN-HCM", "CN-AG", "CN-LA", "GA-300"],
    expectedUi: [
      "DRP step 6 (TO sourcing): hiển thị warning 'CN-AG dưới SS sau khi cấp TO'",
      "Exception list bước 9: '3 CN cascade — cần re-balance toàn vùng'",
      "Logic Center → Vận hành ngày: link đến SOP cascade resolution",
    ],
    escalation: [
      "1. SC Manager review toàn vùng — không cấp TO 1-1, dùng pro-rata",
      "2. Đặt PO khẩn từ Mikado + Tân Việt cùng lúc",
      "3. Tạm hoãn ship cho CN priority thấp (tier 2)",
    ],
  },
  {
    id: "near_stockout",
    title: "Cận stockout — HSTK < 3 ngày tại CN-LA",
    severity: "critical",
    trigger: "Tồn kho CN-LA SKU GT-300 chỉ còn 2.1 ngày bán",
    affected: ["CN-LA", "GT-300"],
    expectedUi: [
      "Inventory page: row GT-300 highlight đỏ 🔴 + cột HSTK = '2.1d'",
      "PivotChildTable: row sort lên đầu (HSTK ASC default)",
      "DRP recommendation: '⚠️ HSTK < 3 ngày. Đặt TO khẩn từ CN-HCM hoặc air-freight'",
    ],
    escalation: [
      "1. TO khẩn từ CN gần nhất có surplus",
      "2. Nếu TO lead time > HSTK → air freight (chi phí gấp 3x)",
      "3. Báo CN tạm ngừng nhận đơn mới SKU đó 24h",
    ],
  },
  {
    id: "honoring_drop",
    title: "Drop honoring — NM Tân Việt giảm dần 3 tháng liên tiếp",
    severity: "warn",
    trigger: "NM Tân Việt honoring_pct: 92% → 85% → 78% trong 3 tháng",
    affected: ["NM-TANVIET"],
    expectedUi: [
      "MasterData → Nhà máy: trend column hiện ↓ đỏ",
      "S&OP grid: NM Tân Việt highlight với reliability score giảm",
      "Leadership Dashboard: KPI 'NM honoring trung bình' giảm",
    ],
    escalation: [
      "1. Họp với NM, hỏi nguyên nhân (capacity? quality?)",
      "2. Giảm allocation Tân Việt 20%, dồn sang Mikado",
      "3. Tăng safety stock cho SKU phụ thuộc Tân Việt",
    ],
  },
  {
    id: "lcnb_overflow",
    title: "LCNB vượt budget — yêu cầu LCNB 8 lần trong tháng",
    severity: "warn",
    trigger: "Premium LCNB tích lũy = 180tr ₫ (budget tháng = 100tr)",
    affected: ["NM-MIKADO", "CN-HCM", "CN-BD"],
    expectedUi: [
      "Config: 'Ngân sách LCNB' progress bar đỏ 180%",
      "Leadership Dashboard: KPI 'Cost overrun' đỏ",
    ],
    escalation: [
      "1. Review FC accuracy — tại sao thiếu nhiều?",
      "2. Tăng safety stock formula (z-factor 1.65 → 2.0)",
      "3. Đàm phán LCNB premium giảm còn 15% (từ 20%)",
    ],
  },
  {
    id: "container_full_hold",
    title: "Container chưa đầy — HOLD không ship",
    severity: "info",
    trigger: "TO từ NM Mikado → CN-NA, fill chỉ 53% (< ngưỡng 70%)",
    affected: ["NM-MIKADO", "CN-NA"],
    expectedUi: [
      "DRP step 9: warning 'fill 53% < ngưỡng 70% → GIỮ LẠI 3 ngày'",
      "Suggestion: 'Top-up từ CN-VL +18m² để đạt 72%' (chấp nhận click)",
    ],
    escalation: [
      "1. Tự động hold tối đa 3 ngày",
      "2. Trong 3 ngày: top-up từ CN gần nếu có surplus",
      "3. Nếu sau 3 ngày vẫn chưa đầy → ship anyway, log overhead",
    ],
  },
  {
    id: "carrier_no_show",
    title: "Nhà xe no-show — không đến lấy hàng đúng giờ",
    severity: "warn",
    trigger: "Nhà xe Á Đông xác nhận pickup 8h, đến 11h vẫn chưa có",
    affected: ["CARRIER-ADONG"],
    expectedUi: [
      "Orders page: row stage='nm_confirmed' overdue đỏ + badge 'Trễ SLA 3h'",
      "Summary card 'Trễ hạn SLA' = 1 (đỏ pulse)",
      "Notification: '🔔 Đặt xe ADONG quá hạn — escalate manager'",
    ],
    escalation: [
      "1. Gọi tài xế trực tiếp",
      "2. Nếu không liên lạc được → đặt xe backup (carrier khác)",
      "3. Cập nhật reliability_score nhà xe",
    ],
  },
];

export function getScenarioById(id: ScenarioId): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id);
}

export function getCriticalScenarios(): DemoScenario[] {
  return DEMO_SCENARIOS.filter((s) => s.severity === "critical");
}

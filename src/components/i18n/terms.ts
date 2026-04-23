/**
 * ════════════════════════════════════════════════════════════════════════════
 * GLOSSARY — Thuật ngữ chuyên ngành SCP/DRP
 * ════════════════════════════════════════════════════════════════════════════
 * Mọi tooltip ❓ trong UI đều lookup từ object này (single source of truth).
 * Key dùng dạng PascalCase rút gọn để TermTooltip dễ nhớ.
 * ════════════════════════════════════════════════════════════════════════════
 */

export interface TermEntry {
  vi: string;
  en: string;
  tooltip_vi: string;
  tooltip_en: string;
}

export const TERMS: Record<string, TermEntry> = {
  SS: {
    vi: "Tồn kho an toàn",
    en: "Safety Stock",
    tooltip_vi: "Lượng hàng dự phòng tối thiểu để hấp thụ sai số dự báo và biến động lead-time. Công thức: SS = z × σ_fc_error × √LT.",
    tooltip_en: "Minimum buffer stock to absorb forecast error and lead-time variability. Formula: SS = z × σ_fc_error × √LT.",
  },
  SsHub: {
    vi: "SS Hub",
    en: "Hub Safety Stock",
    tooltip_vi: "Tồn an toàn gộp ở Hub ảo, dùng để đệm sai số chung của toàn mạng (cấp 2).",
    tooltip_en: "Aggregated safety stock at the virtual Hub, buffering network-wide forecast error (tier 2).",
  },
  SsCn: {
    vi: "SS CN",
    en: "Branch Safety Stock",
    tooltip_vi: "Tồn an toàn riêng từng chi nhánh, tính theo z_factor và biến động cục bộ (cấp 1).",
    tooltip_en: "Branch-level safety stock, derived from local z_factor and demand variability (tier 1).",
  },
  LCNB: {
    vi: "LCNB",
    en: "LCNB (Lateral Branch Transfer)",
    tooltip_vi: "Luân chuyển nội bộ giữa các CN. Quy trình: scan CN chuyển ngang TRƯỚC, sau đó mới đến Hub pool.",
    tooltip_en: "Lateral branch transfer between CN warehouses. Order: scan donor CN FIRST, then Hub pool.",
  },
  HubAo: {
    vi: "Hub ảo",
    en: "Virtual Hub",
    tooltip_vi: "Pool tồn kho ảo gộp toàn mạng, dùng để đặt PO mới khi LCNB không đủ.",
    tooltip_en: "Virtual network-wide inventory pool, used to issue new POs when lateral transfer is insufficient.",
  },
  HSTK: {
    vi: "HSTK (Ngày tồn kho)",
    en: "DOH (Days On Hand)",
    tooltip_vi: "Ngày tồn kho: số ngày bán được với lượng tồn hiện tại theo ADU. HSTK = OnHand ÷ ADU.",
    tooltip_en: "Days On Hand: how many days current stock will last at average daily usage. DOH = OnHand ÷ ADU.",
  },
  ADU: {
    vi: "ADU (Tiêu thụ ngày trung bình)",
    en: "ADU (Average Daily Usage)",
    tooltip_vi: "Tiêu thụ trung bình mỗi ngày, tính theo cùng kỳ năm trước (same_period_ly), không dùng rolling 90d.",
    tooltip_en: "Average daily usage, computed from same period last year (same_period_ly), not rolling 90d.",
  },
  MAPE: {
    vi: "MAPE (Sai số dự báo)",
    en: "MAPE (Mean Absolute % Error)",
    tooltip_vi: "Phần trăm sai số tuyệt đối trung bình của dự báo. Càng thấp càng tốt; mục tiêu UNIS ≤ 12%.",
    tooltip_en: "Mean absolute percentage error of the forecast. Lower is better; UNIS target ≤ 12%.",
  },
  FVA: {
    vi: "FVA (Giá trị tăng thêm của FC)",
    en: "FVA (Forecast Value Add)",
    tooltip_vi: "Mức cải thiện sai số so với mô hình benchmark (Holt-Winters). FVA dương = FC tốt hơn baseline.",
    tooltip_en: "Improvement in error vs the benchmark model (Holt-Winters). Positive FVA = forecast beats baseline.",
  },
  ZFactor: {
    vi: "Hệ số z (Mức dịch vụ)",
    en: "z-factor (Service Level)",
    tooltip_vi: "Hệ số phân phối chuẩn ứng với mức dịch vụ mong muốn. z=1.65 → 95%; z=1.96 → 97.5%.",
    tooltip_en: "Standard-normal coefficient for the target service level. z=1.65 → 95%; z=1.96 → 97.5%.",
  },
  CamKetCung: {
    vi: "Cam kết Cứng",
    en: "Hard Commitment",
    tooltip_vi: "NM cam kết 100%, không thể thay đổi. Đã lock số lượng và lead-time, sẵn sàng release PO.",
    tooltip_en: "Factory commits 100%, immutable. Quantity and lead-time locked, PO ready to release.",
  },
  CamKetChac: {
    vi: "Cam kết Chắc",
    en: "Firm Commitment",
    tooltip_vi: "NM cam kết khả năng cao (≥90%), có thể điều chỉnh nhỏ trong cửa sổ thoả thuận.",
    tooltip_en: "Factory commits with high confidence (≥90%), small tweaks allowed within the agreed window.",
  },
  CamKetMem: {
    vi: "Cam kết Mềm",
    en: "Soft Commitment",
    tooltip_vi: "NM tạm thời chấp nhận, cần xác nhận lại trước cutoff. Rủi ro cao nếu không escalate kịp.",
    tooltip_en: "Factory tentatively accepts, must re-confirm before cutoff. High risk if not escalated in time.",
  },
  NhuCauRong: {
    vi: "Nhu cầu ròng",
    en: "Net Requirement",
    tooltip_vi: "Lượng cần đặt thêm sau khi trừ tồn và đang về. Net = max(0, FC + SS − OnHand − InTransit).",
    tooltip_en: "Quantity to order after deducting on-hand and in-transit. Net = max(0, FC + SS − OnHand − InTransit).",
  },
  PO: {
    vi: "PO (Đơn đặt hàng)",
    en: "PO (Purchase Order)",
    tooltip_vi: "Đơn đặt hàng từ NM về CN. Trạng thái: draft → confirmed → shipped → received.",
    tooltip_en: "Purchase order from a factory to a branch. Lifecycle: draft → confirmed → shipped → received.",
  },
  TO: {
    vi: "TO (Lệnh điều chuyển)",
    en: "TO (Transfer Order)",
    tooltip_vi: "Lệnh điều chuyển nội bộ CN→CN (LCNB). Không phát sinh PO mới với NM.",
    tooltip_en: "Internal transfer order between branches (LCNB). Does not create a new factory PO.",
  },
  HoldOrShip: {
    vi: "Hold-or-Ship",
    en: "Hold-or-Ship",
    tooltip_vi: "Quyết định container: SHIP nếu fill ≥ 60%, HOLD chờ gom thêm nếu thấp hơn.",
    tooltip_en: "Container decision: SHIP if fill ≥ 60%, HOLD to consolidate otherwise.",
  },
  TopUp: {
    vi: "Top-up",
    en: "Top-up",
    tooltip_vi: "Đề xuất bổ sung hàng để tăng fill container lên ≥85%, tận dụng cước vận chuyển.",
    tooltip_en: "Add-on proposal to push container fill to ≥85% and amortize freight cost.",
  },
  MaGoc: {
    vi: "Mã gốc (SKU base)",
    en: "SKU base code",
    tooltip_vi: "Mã sản phẩm gốc, ví dụ GA-300. Netting DRP thực hiện ở cấp này (1 mã gốc = 1 NM duy nhất).",
    tooltip_en: "Base product code, e.g. GA-300. DRP netting happens at this level (1 base = 1 single-source factory).",
  },
  DuoiMau: {
    vi: "Đuôi màu (Variant)",
    en: "Color variant",
    tooltip_vi: "Biến thể màu/hoa văn của mã gốc, ví dụ GA-300-A4. Chỉ dùng cho phân bổ, không dùng để netting.",
    tooltip_en: "Color/pattern variant of a base SKU, e.g. GA-300-A4. Used for allocation only, never for netting.",
  },
  Cutoff: {
    vi: "Cutoff (Hạn chốt)",
    en: "Cutoff",
    tooltip_vi: "Thời điểm khoá dữ liệu trong ngày. Sau cutoff, FC/PO/TO không còn nhận thay đổi không-khẩn-cấp.",
    tooltip_en: "Daily data lock time. After cutoff, FC/PO/TO no longer accept non-urgent changes.",
  },
  Tolerance: {
    vi: "Biên điều chỉnh",
    en: "Adjustment Tolerance",
    tooltip_vi: "Biên giới hạn |delta| khi CN điều chỉnh nhu cầu. Mặc định ±30%; trust < 60% giảm còn ±15%; trust > 85% tự duyệt.",
    tooltip_en: "Limit on |delta| for branch demand adjustments. Default ±30%; trust < 60% drops to ±15%; trust > 85% auto-approves.",
  },
  Sync: {
    vi: "Sync (Đồng bộ)",
    en: "Sync",
    tooltip_vi: "Cập nhật tồn từ NM về hệ thống. SLA 24h; quá 48h sẽ bị đánh dấu Stale.",
    tooltip_en: "Inventory push from factory to system. SLA 24h; flagged Stale if > 48h.",
  },
  Stale: {
    vi: "Stale (Dữ liệu cũ)",
    en: "Stale",
    tooltip_vi: "Dữ liệu chưa cập nhật trong > 48h. Không dùng để chạy DRP cho đến khi sync lại.",
    tooltip_en: "Data not refreshed for > 48h. Excluded from DRP runs until re-synced.",
  },
  TrustScore: {
    vi: "Trust Score (Điểm tin cậy CN)",
    en: "Trust Score",
    tooltip_vi: "Điểm tin cậy của CN dựa trên độ chính xác FC, kỷ luật cập nhật và tỷ lệ nhận hàng đúng hẹn.",
    tooltip_en: "Branch trust score based on FC accuracy, update discipline and on-time receiving rate.",
  },
  HonoringRate: {
    vi: "Honoring Rate (Tỷ lệ giữ cam kết)",
    en: "Honoring Rate",
    tooltip_vi: "% đơn NM giao đúng số lượng và đúng hẹn so với cam kết ban đầu. Mục tiêu ≥ 90%.",
    tooltip_en: "% of factory orders delivered in full and on time vs initial commitment. Target ≥ 90%.",
  },
  FillRate: {
    vi: "Fill Rate (Tỷ lệ đáp ứng)",
    en: "Fill Rate",
    tooltip_vi: "% nhu cầu thực tế được đáp ứng từ tồn kho ngay. Mục tiêu UNIS ≥ 95%.",
    tooltip_en: "% of actual demand fulfilled from on-hand stock immediately. UNIS target ≥ 95%.",
  },
  SeasonalSigma: {
    vi: "σ theo mùa",
    en: "Seasonal σ",
    tooltip_vi: "Độ lệch chuẩn của sai số FC tính theo cùng kỳ năm trước (same_period_ly), phản ánh tính mùa vụ.",
    tooltip_en: "Standard deviation of FC error computed over same period last year, capturing seasonality.",
  },
  AuditNote: {
    vi: "Ghi chú audit",
    en: "Audit Note",
    tooltip_vi: "Ghi chú bắt buộc khi Approve/Release/Reject. Lưu cùng actor + thời gian phục vụ truy vết.",
    tooltip_en: "Mandatory note on Approve/Release/Reject. Stored with actor + timestamp for traceability.",
  },
  MOQ: {
    vi: "MOQ",
    en: "MOQ (Min Order Qty)",
    tooltip_vi: "Sản lượng đặt hàng tối thiểu. Mỗi mức MOQ tương ứng một mức giá khác (giá lẻ, sỉ, container, hợp đồng năm).",
    tooltip_en: "Minimum Order Quantity. Each MOQ tier maps to a different price level (retail, wholesale, container, annual contract).",
  },
  Break: {
    vi: "Break (Mức MOQ)",
    en: "Price Break",
    tooltip_vi: "Ngưỡng sản lượng tại đó giá đổi sang mức kế tiếp. VD: ≥1.000m² → giá sỉ, ≥5.000m² → giá container.",
    tooltip_en: "Quantity threshold where price drops to next tier. E.g. ≥1,000m² → wholesale, ≥5,000m² → container.",
  },
  Tier: {
    vi: "Tier (Bậc giá)",
    en: "Price Tier",
    tooltip_vi: "Bậc giá tương ứng MOQ — tier 1 = giá lẻ, tier cao hơn = chiết khấu sản lượng.",
    tooltip_en: "Price tier mapped to MOQ — tier 1 = retail, higher tiers = volume discount.",
  },
  Phu_phi: {
    vi: "Phụ phí",
    en: "Surcharge",
    tooltip_vi: "Khoản cộng thêm vào giá gốc (năng lượng, vận chuyển, tỷ giá, nguyên liệu). Có thể bật/tắt độc lập, không ảnh hưởng giá gốc.",
    tooltip_en: "Add-on cost on top of base price (energy, freight, FX, raw material). Toggleable independently without changing base price.",
  },
  Hieu_luc: {
    vi: "Hiệu lực",
    en: "Effective period",
    tooltip_vi: "Khoảng thời gian bảng giá có hiệu lực (từ ngày → đến ngày). Sau ngày hết hạn cần phiên bản mới hoặc gia hạn.",
    tooltip_en: "Date range during which the price list is valid. After expiry, a new version or renewal is required.",
  },
};

export type TermKey = keyof typeof TERMS;

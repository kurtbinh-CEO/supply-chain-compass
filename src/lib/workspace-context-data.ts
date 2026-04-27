/**
 * Workspace inline-context data — M14 (P5 enriched)
 *
 * Each item ID in the WorkspacePage list (approvals / exceptions / notifications)
 * has an associated rich-context block shown when the row is expanded. This file
 * is the single source of truth for that context — the WorkspacePage simply
 * looks up `WORKSPACE_CONTEXTS[item.id]` and renders it.
 *
 * Per type, the expand follows a common pattern:
 *   1) Tình hình hiện tại (rows)              ← what's the current state?
 *   2) Lịch sử / Timeline (bullets)            ← past behaviour to judge trust
 *   3) Tác động / Trade-off (bullets or rows)  ← what happens if approve / reject
 *   4) AI gợi ý (banner)                       ← recommendation w/ reasoning
 *   5) Action buttons (3-tier where relevant)
 *
 * Pure UI/presentation data — no business logic.
 */

export interface ContextActionButton {
  label: string;
  /** Visual variant — primary = green/blue solid, secondary = outline, danger = red outline */
  variant: "primary" | "secondary" | "danger";
  /** Optional icon emoji prefix (kept simple; UI doesn't import lucide here). */
  icon?: string;
}

export interface ContextRow {
  label: string;
  value: string;
  /** Optional severity tone for the value (colors only the value text). */
  tone?: "danger" | "warning" | "success" | "info" | "muted";
}

/** A single labelled section inside the inline expand. */
export interface ContextSection {
  /** Heading shown ABOVE the section (uppercase). Omit for the lead summary block. */
  heading?: string;
  /** Free-form paragraph text. */
  paragraph?: string;
  /** Key/value rows. */
  rows?: ContextRow[];
  /** Bullet list (e.g., 3-week history). */
  bullets?: string[];
}

export interface WorkspaceItemContext {
  /** Short subtitle under the row description (e.g. "Anh Minh (CN Manager BD) · Trust 65%"). */
  submitter?: string;
  /** Lead summary paragraph shown at the top of the expand. */
  lead?: string;
  /** Reason / why this approval was raised. */
  reason?: string;
  /** Labelled context sections. */
  sections: ContextSection[];
  /** AI suggestion banner (optional). */
  aiSuggestion?: string;
  /** Action buttons at the bottom — replace the row's collapsed buttons when expanded. */
  actions: ContextActionButton[];
}

/**
 * Map keyed by ActionItem.id from WorkspacePage.tsx.
 *
 * Keep IDs in sync with `initialItems` in WorkspacePage.tsx. If an item lacks a
 * context entry, the row simply won't show an expand affordance.
 */
export const WORKSPACE_CONTEXTS: Record<string, WorkspaceItemContext> = {
  /* ═══════════════════════════════════════════════════════════════════════
     1. FORCE_RELEASE — Toko stale 28h (approve / danger)
       NM freshness · Liên hệ history · Risk impact nếu force · Impact nếu chờ
     ═══════════════════════════════════════════════════════════════════════ */
  "1": {
    submitter: "Hệ thống · Workflow chặn · Yêu cầu phát hành cưỡng chế",
    lead: "NM Toko dữ liệu cũ 28h — phát hành DRP cưỡng chế 3 cấp?",
    reason:
      "Quá ngưỡng SLA freshness 24h. Chị Thúy (NM Toko) đã được liên hệ Zalo 22/04 nhưng chưa phản hồi. Cần phê duyệt nhiều cấp để DRP chạy với data cũ.",
    sections: [
      {
        heading: "Tình hình NM (freshness)",
        rows: [
          { label: "NM Toko stale", value: "28h (SLA 24h, ngưỡng cứng 48h)", tone: "danger" },
          { label: "Lần sync gần nhất", value: "13/05 09:30 (28h trước)", tone: "muted" },
          { label: "Honoring 90 ngày", value: "78%", tone: "warning" },
          { label: "Tier yêu cầu", value: "Tier 1 — SC Manager", tone: "warning" },
        ],
      },
      {
        heading: "Lịch sử liên hệ",
        bullets: [
          "13/05 10:15 — Email tự động (đã mở, chưa phản hồi)",
          "13/05 14:30 — Zalo bot (đã đọc)",
          "14/05 08:00 — Chị Thúy (UNIS) gọi 0903 555 222 (không bắt máy)",
          "14/05 11:20 — Zalo lần 2 (chưa đọc)",
        ],
      },
      {
        heading: "Tác động NẾU phát hành cưỡng chế",
        bullets: [
          "DRP chạy trên tồn ước tính → sai số ±15% trong batch tới",
          "Booking xe đã đặt vẫn chạy đúng kế hoạch",
          "Audit log ghi nhận force-release để truy vết (actor + tier + lý do)",
        ],
      },
      {
        heading: "Tác động NẾU chờ thêm 24h",
        rows: [
          { label: "CN-BD HSTK", value: "1,5 ngày — sắp hết hàng GA-300 A4", tone: "danger" },
          { label: "Risk doanh thu", value: "~120 triệu ₫ / ngày", tone: "danger" },
          { label: "Booking xe đã đặt", value: "3 chuyến (huỷ phát sinh phí ~5 triệu)", tone: "warning" },
        ],
      },
    ],
    aiSuggestion:
      "Force-release Tier 1 (SC Manager) + ghi log đặc biệt. Risk hết hàng (120 triệu/ngày) > Risk dữ liệu sai 15%. Nếu stale > 72h ở lần tới → escalate Director.",
    actions: [
      { label: "Phát hành cưỡng chế (Tier 1)", variant: "primary", icon: "🛡️" },
      { label: "Gửi lên Director", variant: "secondary", icon: "⬆️" },
      { label: "Gọi NM thêm lần nữa", variant: "secondary", icon: "📞" },
      { label: "Chờ thêm 24h", variant: "danger", icon: "⏸️" },
    ],
  },

  /* ═══════════════════════════════════════════════════════════════════════
     2. EXCEPTION_SHORTAGE — GA-300 CN-BD (exception / danger)
       Tồn + demand + đang về + 3 gợi ý action (LCNB / PO khẩn / chờ)
     ═══════════════════════════════════════════════════════════════════════ */
  "2": {
    lead: "GA-300 A4 tại CN-BD sắp hết tồn — chỉ còn 1,5 ngày bán.",
    reason:
      "NM Toko trễ PO 7 ngày kết hợp CN-BD demand +32% (nhà thầu mới Q2 đẩy đơn ngoài kế hoạch).",
    sections: [
      {
        heading: "Tình hình tồn kho & nhu cầu",
        rows: [
          { label: "Tồn hiện tại", value: "120 m² (HSTK 1,5d) 🔴", tone: "danger" },
          { label: "Safety Stock", value: "900 m²", tone: "muted" },
          { label: "Nhu cầu tuần (FC)", value: "1.560 m²", tone: "muted" },
          { label: "Đang về (PO-W17-Toko-002)", value: "400 m² · ETA 18/05", tone: "info" },
          { label: "Thiếu cuối tuần", value: "1.040 m² · risk 120 triệu ₫", tone: "danger" },
          { label: "Service level dự kiến", value: "62% (mục tiêu ≥95%)", tone: "danger" },
        ],
      },
      {
        heading: "3 gợi ý hành động",
        bullets: [
          "1️⃣ ↔ LCNB 200 m² từ CN-HCM (excess 480 m², 1 ngày, 3,2 triệu ₫) — fix ngay 50% gap",
          "2️⃣ 📦 PO khẩn NM Mikado 1.000 m² (LT 14 ngày, 188 triệu, capacity sẵn 18.000 m²) — bổ sung W18",
          "3️⃣ 📞 Gọi NM Toko nhắc PO trễ 7 ngày — kéo ETA về 16/05 thay vì 18/05",
        ],
      },
      {
        heading: "Phương án kết hợp đề xuất",
        rows: [
          { label: "1 + 3", value: "Fix 60% gap · ROI 6,7×", tone: "success" },
          { label: "1 + 2", value: "Fix 100% gap · cost 191 triệu", tone: "warning" },
          { label: "Chỉ 3", value: "Fix 25% gap · phụ thuộc NM phản hồi", tone: "danger" },
        ],
      },
    ],
    aiSuggestion:
      "Chấp nhận gợi ý 1 + 3. ROI 6,7× — cao nhất trong 3 phương án. Reversible trước khi xe rời CN-HCM (window 3h).",
    actions: [
      { label: "Chấp nhận 1 + 3", variant: "primary", icon: "✅" },
      { label: "Mở DRP để tùy chỉnh", variant: "secondary", icon: "→" },
      { label: "Tạo PO khẩn (gợi ý 2)", variant: "secondary", icon: "📦" },
      { label: "Bỏ qua", variant: "danger", icon: "✕" },
    ],
  },

  /* ═══════════════════════════════════════════════════════════════════════
     3. CN_ADJUST — CN-BD +12,5% GA-300 A4 (approve / warning)
       Tồn kho · FC trước/sau · Đang về · Lịch sử adjust 3 tuần · AI trust
     ═══════════════════════════════════════════════════════════════════════ */
  "3": {
    submitter: "Anh Minh (CN Manager BD) · Trust 65% · Trong biên ±30%",
    lead: "CN-BD yêu cầu tăng GA-300 A4: 564 → 635 m² (+12,5%) cho tuần W21.",
    reason:
      "Nhà thầu mới Q2 — dự án khu đô thị 50.000 m² đã ký hợp đồng tuần trước, kéo demand +12,5% so với baseline.",
    sections: [
      {
        heading: "Tình hình tồn kho",
        rows: [
          { label: "Tồn hiện tại CN-BD", value: "120 m² (HSTK 1,5d)", tone: "danger" },
          { label: "FC tuần hiện tại", value: "564 m²", tone: "muted" },
          { label: "Sau adjust (+12,5%)", value: "635 m² (+71 m²)", tone: "warning" },
          { label: "Đang về (PO-W17-Toko-002)", value: "400 m² · ETA 18/05", tone: "info" },
          { label: "Tổng cung sau adjust", value: "520 m² · vẫn thiếu 115 m²", tone: "warning" },
        ],
      },
      {
        heading: "Lịch sử điều chỉnh (3 tuần)",
        bullets: [
          "T19: +8% → thực tế +6%  ✅ (sai 2%)",
          "T18: +15% → thực tế +5% ⚠️ (sai 10%)",
          "T17: −3% → thực tế −4%  ✅ (sai 1%)",
          "Accuracy 3 tuần: 67% (trung bình ngành 75%)",
        ],
      },
      {
        heading: "Quy tắc duyệt (CONFIG)",
        rows: [
          { label: "Biên dung sai", value: "±30% (auto-route nếu vượt)", tone: "muted" },
          { label: "Trust threshold", value: "≥85% → tự duyệt", tone: "muted" },
          { label: "Trust hiện tại", value: "65% — cần SC Manager duyệt", tone: "warning" },
        ],
      },
    ],
    aiSuggestion:
      "Trust 65%, biên ±30% cho phép → duyệt nhưng đặt theo dõi. Lưu ý T18 đã sai 10% theo hướng over-forecast, nên cân nhắc cắt còn +8% để giảm rủi ro tồn dư.",
    actions: [
      { label: "Duyệt +12,5%", variant: "primary", icon: "✅" },
      { label: "Cắt còn +8% (AI)", variant: "secondary", icon: "✂️" },
      { label: "Từ chối + lý do", variant: "danger", icon: "❌" },
    ],
  },

  /* ═══════════════════════════════════════════════════════════════════════
     4. PO_OVERDUE — Toko 557m² 8 ngày (exception / warning)
       Timeline · NM contact 3 lần · Carrier status
     ═══════════════════════════════════════════════════════════════════════ */
  "4": {
    lead: "PO Toko 557 m² đã quá hạn 8 ngày — risk doanh thu 85 triệu ₫.",
    reason:
      "PO-W17-Toko-002 cam kết giao 06/05, đến nay 14/05 chưa có thông tin xuất kho NM. NM ngừng phản hồi từ 09/05.",
    sections: [
      {
        heading: "Timeline PO-W17-Toko-002",
        bullets: [
          "22/04 — Phát hành PO 557 m² GA-300 A4 (UNIS gửi NM Toko)",
          "23/04 — NM xác nhận qua Zalo, hứa giao 06/05",
          "06/05 — ETA gốc, NM báo trễ 2-3 ngày (nguyên liệu chưa về)",
          "09/05 — NM ngừng phản hồi (Zalo + email)",
          "12/05 — Chị Thúy gọi 0903 555 222 lần 1 — không bắt máy",
          "13/05 — Gọi lần 2 + Zalo lần 3 — không phản hồi",
          "14/05 (hôm nay) — Trễ 8 ngày, risk leo thang",
        ],
      },
      {
        heading: "Tình hình NM Toko",
        rows: [
          { label: "Honoring 30 ngày", value: "78%", tone: "warning" },
          { label: "Honoring 90 ngày", value: "82%", tone: "warning" },
          { label: "Liên hệ chính", value: "Anh Hùng — 0903 555 222", tone: "muted" },
          { label: "PO khác đang chạy", value: "2 PO · 1.450 m²", tone: "info" },
          { label: "Lần phản hồi gần nhất", value: "06/05 (8 ngày trước)", tone: "danger" },
        ],
      },
      {
        heading: "Tình trạng vận chuyển (carrier)",
        rows: [
          { label: "NVT đã đặt", value: "Vinatrans · xe 51C-12345", tone: "muted" },
          { label: "Trạng thái xe", value: "Chờ pickup tại NM Toko (8 ngày)", tone: "warning" },
          { label: "Chi phí phát sinh", value: "Phí chờ ~2,4 triệu ₫", tone: "warning" },
          { label: "NM Mikado backup", value: "Capacity 18.000 m² · sẵn nhận PO mới", tone: "success" },
        ],
      },
    ],
    aiSuggestion:
      "Gọi NM Toko lần cuối với deadline 24h. Nếu không phản hồi → chuyển sang NM Mikado (capacity dư, honoring 96%). Chuẩn bị claim phí chờ Vinatrans.",
    actions: [
      { label: "Gọi NM Toko ngay", variant: "primary", icon: "📞" },
      { label: "Đổi sang NM Mikado", variant: "secondary", icon: "🔄" },
      { label: "Tạo claim Vinatrans", variant: "secondary", icon: "📄" },
      { label: "Hủy PO + claim", variant: "danger", icon: "❌" },
    ],
  },

  /* ═══════════════════════════════════════════════════════════════════════
     5. PO_RELEASE — PO-BD-W16 Mikado (approve / warning)
       Container fill% · NM capacity · Cước · ETA · NM honoring%
     ═══════════════════════════════════════════════════════════════════════ */
  "5": {
    submitter: "Hệ thống · Auto-suggest từ DRP batch W20",
    lead: "PO-BD-W16 Mikado 1.200 m² GA-300 A4 — sẵn sàng phát hành.",
    reason:
      "DRP đã phân bổ 1.200 m² cho CN-BD trong batch W20. Container đầy (97%), bảng giá còn hiệu lực, NM Mikado có capacity dư.",
    sections: [
      {
        heading: "Tình trạng PO & vận chuyển",
        rows: [
          { label: "Container", value: "40ft · fill 97% (1.200/1.236 m²)", tone: "success" },
          { label: "NVT", value: "Vinatrans (cước nội bộ)", tone: "muted" },
          { label: "Cước vận chuyển", value: "14,2 triệu ₫ (đã thoả thuận)", tone: "muted" },
          { label: "ETA dự kiến", value: "17/05 (LT 6 ngày)", tone: "info" },
          { label: "Pickup window", value: "15-16/05", tone: "muted" },
        ],
      },
      {
        heading: "Tình trạng NM Mikado",
        rows: [
          { label: "Capacity sẵn tháng này", value: "18.000 m²", tone: "success" },
          { label: "Honoring 90 ngày", value: "96%", tone: "success" },
          { label: "Honoring 30 ngày", value: "98%", tone: "success" },
          { label: "Bảng giá hiệu lực", value: "Đến 30/06/2026 (45 ngày)", tone: "muted" },
          { label: "Đơn giá", value: "188.000 ₫/m² (giảm 2% so với T4)", tone: "success" },
        ],
      },
      {
        heading: "Cam kết gốc",
        bullets: [
          "Cam kết tháng T5 với NM Mikado: 4.200 m²",
          "Đã release: PO-BD-W14 (1.000 m²) + PO-BD-W15 (800 m²) = 1.800 m²",
          "Release lần này (#3): 1.200 m² → tổng 3.000/4.200 m² (71%)",
        ],
      },
    ],
    aiSuggestion:
      "Tất cả điều kiện đạt — phát hành ngay để kịp tuần W17. Container fill cao (97%), NM honoring tốt (96%), bảng giá còn hiệu lực.",
    actions: [
      { label: "Duyệt + Gửi NM", variant: "primary", icon: "✅" },
      { label: "Cắt giảm 10%", variant: "secondary", icon: "✂️" },
      { label: "Từ chối", variant: "danger", icon: "❌" },
    ],
  },

  /* ═══════════════════════════════════════════════════════════════════════
     6. NOTIFY — Phú Mỹ chưa cập nhật tồn kho 3 ngày (notify / info)
     ═══════════════════════════════════════════════════════════════════════ */
  "6": {
    lead: "NM Phú Mỹ chưa cập nhật báo cáo tồn kho 3 ngày — quá ngưỡng SLA 48h.",
    sections: [
      {
        heading: "Tình trạng",
        rows: [
          { label: "Lần sync gần nhất", value: "11/05 17:30 (3 ngày trước)", tone: "warning" },
          { label: "Liên hệ chính", value: "Chị Lan — 0908 333 111", tone: "muted" },
          { label: "Honoring 90 ngày", value: "88%", tone: "muted" },
          { label: "Tác động", value: "DRP dùng số liệu ước tính — sai số 8-12%", tone: "warning" },
        ],
      },
      {
        heading: "Lịch sử nhắc",
        bullets: [
          "12/05 09:00 — Email tự động (chưa mở)",
          "13/05 10:30 — Zalo bot (đã đọc, không phản hồi)",
          "14/05 08:15 — Chị Lan (UNIS) gọi điện — bận họp, sẽ gọi lại",
        ],
      },
    ],
    actions: [
      { label: "Nhắc NM (Zalo + email)", variant: "primary", icon: "📞" },
      { label: "Tắt nhắc 24h", variant: "secondary", icon: "⏸️" },
    ],
  },

  /* ═══════════════════════════════════════════════════════════════════════
     7. NOTIFY — FC drift MAPE 18,4% tăng 3 tuần (notify / info)
     ═══════════════════════════════════════════════════════════════════════ */
  "7": {
    lead: "MAPE tổng đã tăng từ 11% → 18,4% trong 3 tuần — vượt ngưỡng theo dõi 15%.",
    sections: [
      {
        heading: "Xu hướng MAPE",
        bullets: [
          "T17: 11,2% (ngưỡng tốt)",
          "T18: 14,8% (cảnh báo nhẹ)",
          "T19: 18,4% (vượt ngưỡng) 🔴",
          "Trend: tăng 7,2 điểm trong 3 tuần",
        ],
      },
      {
        heading: "Mã hàng ảnh hưởng",
        rows: [
          { label: "GA-300 A4 CN-HN", value: "MAPE 31%", tone: "danger" },
          { label: "GA-600 CN-CT", value: "MAPE 22%", tone: "warning" },
          { label: "PK-001 CN-BD", value: "MAPE 19%", tone: "warning" },
        ],
      },
      {
        heading: "Tác động xuôi dòng",
        bullets: [
          "Safety Stock đề xuất tăng 15% cho 3 SKU trên",
          "Risk dự báo sai mùa cao điểm T6 — cần review S&OP",
          "Vốn lưu động ước tăng +120 triệu ₫ nếu nâng SS",
        ],
      },
    ],
    actions: [
      { label: "Xem chi tiết FC", variant: "primary", icon: "📊" },
      { label: "Điều chỉnh tại S&OP", variant: "secondary", icon: "🔧" },
    ],
  },

  /* ═══════════════════════════════════════════════════════════════════════
     8. SS_CHANGE — GA-300 A4 900→1.350 (approve / info)
       SS formula result · MAPE trend · WC impact · AI đề xuất
     ═══════════════════════════════════════════════════════════════════════ */
  "8": {
    submitter: "Anh Thắng (SC Manager) · Trust 92%",
    lead: "GA-300 A4: SS 900 → 1.350 m² (+50%). Service Level 95% → 98%.",
    reason: "Dự phòng mùa cao điểm T6-T7 + nhà thầu mới Q2 đẩy demand +12,5%.",
    sections: [
      {
        heading: "Công thức Safety Stock",
        bullets: [
          "SS = Z × √(LT × σ_d² + d̄² × σ_LT²)",
          "Z (Service Level 98%) = 2,054",
          "LT trung bình = 14 ngày · σ_LT = 2,5 ngày",
          "d̄ (demand/ngày) = 80 m² · σ_d = 18 m²",
          "→ SS lý thuyết ≈ 1.348 m² (làm tròn 1.350)",
        ],
      },
      {
        heading: "Tác động vốn lưu động (WC)",
        rows: [
          { label: "SS hiện tại (900 m²)", value: "165 triệu ₫", tone: "muted" },
          { label: "SS mới (1.350 m²)", value: "248 triệu ₫", tone: "warning" },
          { label: "Tăng vốn lưu động", value: "+83 triệu ₫ (+2,6% tổng WC)", tone: "warning" },
          { label: "Service Level", value: "95% → 98%", tone: "success" },
          { label: "Risk hết hàng", value: "Giảm từ 5% → 2%", tone: "success" },
        ],
      },
      {
        heading: "Xu hướng MAPE (mâu thuẫn dữ liệu)",
        bullets: [
          "T17: 22% · T18: 18% · T19: 14% (giảm dần)",
          "MAPE giảm → σ_d thực tế giảm → SS LÝ RA NÊN GIẢM, không phải tăng",
          "Đề xuất 1.350 dùng σ_d cũ → có thể over-stock 250 m²",
        ],
      },
    ],
    aiSuggestion:
      "MAPE 3 tuần qua giảm → σ_d thực tế nhỏ hơn giả định. SS hợp lý là 1.100 m² (Service Level 97%, vốn lưu động +35 triệu thay vì +83 triệu). Cân nhắc duyệt 1.100 thay vì 1.350.",
    actions: [
      { label: "Duyệt 1.350 (đề xuất gốc)", variant: "primary", icon: "✅" },
      { label: "Đề xuất 1.100 (AI)", variant: "secondary", icon: "↩️" },
      { label: "Giữ 900 (từ chối)", variant: "danger", icon: "❌" },
    ],
  },
};

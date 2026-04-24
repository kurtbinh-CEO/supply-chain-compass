/**
 * Workspace inline-context data — M14
 *
 * Each item ID in the WorkspacePage list (approvals / exceptions / notifications)
 * has an associated rich-context block shown when the row is expanded. This file
 * is the single source of truth for that context — the WorkspacePage simply
 * looks up `WORKSPACE_CONTEXTS[item.id]` and renders it.
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
  /* ─── 1. Phát hành khẩn — Toko stale 28h (approve / danger) ─── */
  "1": {
    submitter: "Hệ thống · Workflow chặn",
    lead: "Toko dữ liệu cũ 28h — phát hành khẩn 3 cấp?",
    reason: "Quá ngưỡng SLA freshness 24h. Chị Thúy đã liên hệ Zalo ngày 22/04 nhưng chưa có phản hồi.",
    sections: [
      {
        heading: "Tình trạng",
        rows: [
          { label: "NM Toko freshness", value: "28h (SLA 24h)", tone: "danger" },
          { label: "Liên hệ gần nhất", value: "Zalo 22/04 · Chị Thúy", tone: "muted" },
          { label: "Cấp độ phát hành", value: "3 cấp (khẩn cấp)", tone: "warning" },
        ],
      },
      {
        heading: "Tác động nếu phát hành khẩn",
        bullets: [
          "DRP chạy trên dữ liệu cũ → rủi ro sai 15% trong batch tới",
          "Booking xe đã đặt vẫn chạy đúng kế hoạch",
          "Audit log ghi nhận force-release để truy vết",
        ],
      },
      {
        heading: "Tác động nếu chờ thêm",
        bullets: [
          "CN-BD HSTK 1,5 ngày → có thể hết hàng GA-300 A4",
          "Risk doanh thu ước tính: 120 triệu ₫ / ngày",
        ],
      },
    ],
    aiSuggestion: "Force-release 3 cấp + ghi log đặc biệt. Risk hết hàng > Risk dữ liệu sai.",
    actions: [
      { label: "Phát hành khẩn 3 cấp", variant: "primary", icon: "✅" },
      { label: "Gọi NM trước", variant: "secondary", icon: "📞" },
      { label: "Chờ thêm 24h", variant: "danger", icon: "⏸️" },
    ],
  },

  /* ─── 2. SHORTAGE GA-300 CN-BD (exception / danger) ─── */
  "2": {
    lead: "GA-300 A4 tại CN-BD sắp hết tồn — chỉ còn 1,5 ngày bán.",
    reason: "NM Toko trễ PO 7 ngày kết hợp CN-BD demand +32% (nhà thầu mới Q2).",
    sections: [
      {
        heading: "Tình trạng",
        rows: [
          { label: "Tồn hiện tại", value: "120 m² (HSTK 1,5d)", tone: "danger" },
          { label: "Nhu cầu tuần", value: "1.560 m²", tone: "muted" },
          { label: "Đang về (PO)", value: "400 m² · ETA 18/05", tone: "info" },
          { label: "Thiếu", value: "1.040 m² · risk 120 triệu ₫", tone: "danger" },
        ],
      },
      {
        heading: "Gợi ý hành động",
        bullets: [
          "1. ↔ Lateral 200 m² từ CN-HCM (1 ngày · 3,2 triệu) — fix ngay",
          "2. 📦 PO khẩn NM Mikado 1.000 m² (14 ngày · 188 triệu) — bổ sung tuần W18",
          "3. 📞 Gọi NM Toko nhắc PO trễ 7 ngày — kéo ETA về sớm",
        ],
      },
    ],
    aiSuggestion: "Chấp nhận gợi ý 1 + 3. ROI 6,7×. Reversible trước khi xe rời CN-HCM.",
    actions: [
      { label: "Chấp nhận 1 + 3", variant: "primary", icon: "✅" },
      { label: "Mở DRP để tùy chỉnh", variant: "secondary", icon: "→" },
      { label: "Bỏ qua", variant: "danger", icon: "✕" },
    ],
  },

  /* ─── 3. CN điều chỉnh CN-BD +12,5% GA-300 A4 (approve / warning) ─── */
  "3": {
    submitter: "Anh Minh (CN Manager BD) · Trust 65%",
    lead: "CN-BD yêu cầu tăng GA-300 A4: 564 → 635 (+12,5%).",
    reason: "Nhà thầu mới Q2 — dự án 50.000 m² đã ký hợp đồng tuần trước.",
    sections: [
      {
        heading: "Tình trạng",
        rows: [
          { label: "Tồn CN-BD", value: "120 m² (HSTK 1,5d)", tone: "danger" },
          { label: "FC tuần hiện tại", value: "564 m²", tone: "muted" },
          { label: "FC sau điều chỉnh", value: "635 m² (+12,5%)", tone: "warning" },
          { label: "Đang về (PO)", value: "400 m²", tone: "info" },
        ],
      },
      {
        heading: "Lịch sử điều chỉnh (3 tuần)",
        bullets: [
          "T19: +8% → thực tế +6% ✅ (sai 2%)",
          "T18: +15% → thực tế +5% ⚠️ (sai 10%)",
          "T17: −3% → thực tế −4% ✅ (sai 1%)",
          "Accuracy 3 tuần: 67%",
        ],
      },
    ],
    aiSuggestion: "Trust 65%, biên ±30% cho phép → duyệt nhưng đặt theo dõi (T18 đã sai 10%).",
    actions: [
      { label: "Duyệt +12,5%", variant: "primary", icon: "✅" },
      { label: "Cắt còn +8%", variant: "secondary", icon: "✂️" },
      { label: "Từ chối + lý do", variant: "danger", icon: "❌" },
    ],
  },

  /* ─── 4. PO_OVERDUE Toko 557m² 8 ngày (exception / warning) ─── */
  "4": {
    lead: "PO Toko 557 m² đã quá hạn 8 ngày — risk 85 triệu ₫.",
    reason: "PO-W17-Toko-002 cam kết giao 06/05, đến nay chưa có thông tin xuất kho NM.",
    sections: [
      {
        heading: "Lịch sử PO",
        bullets: [
          "PO phát hành 22/04 — Toko xác nhận qua Zalo 23/04",
          "ETA gốc 06/05 → trễ 8 ngày (hôm nay)",
          "NM ngừng phản hồi từ 09/05 (3 lần Zalo, 1 cuộc gọi không bắt máy)",
        ],
      },
      {
        heading: "Tình trạng NM Toko",
        rows: [
          { label: "Honoring 30 ngày", value: "78%", tone: "warning" },
          { label: "Liên hệ chính", value: "Anh Hùng — 0903 555 222", tone: "muted" },
          { label: "PO khác đang chạy", value: "2 PO · 1.450 m²", tone: "info" },
        ],
      },
    ],
    aiSuggestion: "Gọi NM lần cuối + chuẩn bị phương án backup NM Mikado (capacity sẵn).",
    actions: [
      { label: "Gọi NM Toko ngay", variant: "primary", icon: "📞" },
      { label: "Đổi sang NM Mikado", variant: "secondary", icon: "🔄" },
      { label: "Hủy PO + claim", variant: "danger", icon: "❌" },
    ],
  },

  /* ─── 5. PO Release PO-BD-W16 Mikado (approve / warning) ─── */
  "5": {
    submitter: "Hệ thống · Auto-suggest từ DRP",
    lead: "PO-BD-W16 Mikado 1.200 m² GA-300 A4 — sẵn sàng phát hành.",
    sections: [
      {
        heading: "Tình trạng PO",
        rows: [
          { label: "Container", value: "40ft · fill 97%", tone: "success" },
          { label: "Cước vận chuyển", value: "Vinatrans 14,2 triệu ₫", tone: "muted" },
          { label: "ETA dự kiến", value: "17/05 (6 ngày)", tone: "info" },
        ],
      },
      {
        heading: "Tình trạng NM Mikado",
        rows: [
          { label: "Capacity sẵn", value: "18.000 m²", tone: "success" },
          { label: "Honoring 90 ngày", value: "96%", tone: "success" },
          { label: "Bảng giá hiệu lực", value: "Đến 30/06/2026", tone: "muted" },
        ],
      },
    ],
    aiSuggestion: "Tất cả điều kiện đạt — phát hành ngay để kịp tuần W17.",
    actions: [
      { label: "Duyệt + Gửi NM", variant: "primary", icon: "✅" },
      { label: "Từ chối", variant: "danger", icon: "❌" },
    ],
  },

  /* ─── 6. Phú Mỹ chưa cập nhật tồn kho 3 ngày (notify / info) ─── */
  "6": {
    lead: "NM Phú Mỹ chưa cập nhật báo cáo tồn kho 3 ngày — quá ngưỡng SLA 48h.",
    sections: [
      {
        heading: "Tình trạng",
        rows: [
          { label: "Lần sync gần nhất", value: "11/05 17:30 (3 ngày trước)", tone: "warning" },
          { label: "Liên hệ chính", value: "Chị Lan — 0908 333 111", tone: "muted" },
          { label: "Tác động", value: "DRP dùng số liệu ước tính — sai số 8-12%", tone: "warning" },
        ],
      },
      {
        heading: "Lịch sử nhắc",
        bullets: [
          "12/05: Email tự động (chưa mở)",
          "13/05: Zalo bot (đã đọc, không phản hồi)",
        ],
      },
    ],
    actions: [
      { label: "Nhắc NM (Zalo + email)", variant: "primary", icon: "📞" },
      { label: "Tắt nhắc 24h", variant: "secondary", icon: "⏸️" },
    ],
  },

  /* ─── 7. FC drift MAPE 18,4% tăng 3 tuần (notify / info) ─── */
  "7": {
    lead: "MAPE tổng đã tăng từ 11% → 18,4% trong 3 tuần — vượt ngưỡng theo dõi 15%.",
    sections: [
      {
        heading: "Xu hướng MAPE",
        bullets: [
          "T17: 11,2% (ngưỡng tốt)",
          "T18: 14,8% (cảnh báo nhẹ)",
          "T19: 18,4% (vượt ngưỡng) 🔴",
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
        ],
      },
    ],
    actions: [
      { label: "Xem chi tiết FC", variant: "primary", icon: "📊" },
      { label: "Điều chỉnh tại S&OP", variant: "secondary", icon: "🔧" },
    ],
  },

  /* ─── 8. SS Change GA-300 A4 900→1.350 (approve / info) ─── */
  "8": {
    submitter: "Anh Thắng (SC Manager) · Trust 92%",
    lead: "GA-300 A4: SS 900 → 1.350 (+50%). Service Level 95% → 98%.",
    reason: "Dự phòng mùa cao điểm T6-T7 + nhà thầu mới Q2 đẩy demand.",
    sections: [
      {
        heading: "Tình trạng",
        rows: [
          { label: "Vốn lưu động", value: "+83 triệu ₫ (+2,6%)", tone: "warning" },
          { label: "Service Level", value: "95% → 98%", tone: "success" },
          { label: "Risk hết hàng", value: "Giảm từ 5% → 2%", tone: "success" },
        ],
      },
      {
        heading: "Mâu thuẫn dữ liệu",
        bullets: [
          "MAPE 3 tuần qua: 22% → 18% → 14% (giảm dần)",
          "MAPE giảm → SS LÝ RA NÊN GIẢM, không phải tăng",
          "Đề xuất hiện tại có thể over-stock 250 m²",
        ],
      },
    ],
    aiSuggestion: "MAPE giảm → SS đề xuất hợp lý là 1.100 m² (Service Level 97%). Cân nhắc duyệt 1.100 thay vì 1.350.",
    actions: [
      { label: "Duyệt 1.350 (đề xuất gốc)", variant: "primary", icon: "✅" },
      { label: "Đề xuất 1.100 (AI)", variant: "secondary", icon: "↩️" },
      { label: "Giữ 900 (từ chối)", variant: "danger", icon: "❌" },
    ],
  },
};

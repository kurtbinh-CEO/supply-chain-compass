---
name: Hub & Cam kết NM
description: 3-tab Hub page (M6) — Cam kết NM (Planner edits) → Hub ảo → Đối chiếu
type: feature
---
The Hub page (/hub) is restructured (M6) into 3 tabs:

1. **Cam kết NM** — UNIS Planner workflow (no NM portal). Editable SmartTable with 5 NM × 5 SKU = 25 rows. Columns: NM, Mã hàng, FC gửi NM (m²), **Cam kết NM [INPUT ✏️]** (Planner types), Δ (auto, green if ≥ FC, red if <), **Tier** badge (auto by month: M+1 HARD ±5% red / M+2 FIRM ±15% orange / M+3 SOFT ±30% gray), Nguồn dropdown (Gọi/Zalo/Email/Gặp), Ngày liên hệ (date picker), **Minh chứng [📎]** (upload modal: Camera or File picker, accepts image/* + .pdf, lightbox gallery), Trạng thái (🔴 Chưa gọi / 🟡 Chờ NM / 🟢 Đã xác nhận / ⚠️ NM counter), Hành động (per-status: [Gọi 📞] | disabled [Chờ NM ⏳] | [Xác nhận ✓]).
   - Status auto-derives from input: committed > 0 + has contact → confirmed; if committed < FC×0.97 → counter; contact set without committed → waiting.
   - Header has progress bar `15/25 SKU đã xác nhận (60%)`. When ≥ 80%, [🔒 Khóa cam kết tháng] button activates.
   - Batch action: [Xác nhận tất cả đã liên hệ] locks all rows with evidence.
   - Filter chips by status with counts.

2. **Hub ảo** — Reuses HubOverviewTab. Hub Available formula updated to `Σ NM Confirmed − Σ Released − SS Hub`. Auto-recalculates when Planner changes commitments via `onTotalsChange` callback.

3. **Đối chiếu** — Unchanged ReconciliationTab.

**Removed**: 4-step Sourcing Workbench (Cần gì → NM nào có → Phân bổ → MOQ+BPO), old "Đặt hàng NM" tab.

Version chip: `Commitment T5 v6 · Active`. Header title: `Hub & Cam kết NM — Tháng 5/2026`.

Evidence files stored as `EvidenceFile[]` per row (mock: object URLs). Phone numbers in tooltip on [Gọi] button (e.g., "Gọi Mikado: 0221 382 1234").

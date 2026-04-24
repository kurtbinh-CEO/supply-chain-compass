---
name: DRP allocation
description: 3-layer disclosure with LCNB-first allocation engine on /drp and /allocation
type: feature
---
The DRP screen (/drp) uses a 3-layer progressive disclosure system:

1. **Layer 1** — Network summary (12 CN totals).
2. **Layer 2** — Per-CN cards with 6-source allocation breakdown (`AllocSourceBar`).
3. **Layer 3** — Per-SKU exception detail (gap, suggestion, cost-comparison options A/B/C).

The 11-step `FlowStepper` (KẾ HOẠCH → PHÂN BỔ → THỰC THI) is sticky at top with badges per step. **DrpPage 3-layer expand-tree is NOT migrated to SmartTable** — multi-level CN→SKU inline expansion + per-step `StepDetail` sheet is too custom.

**`DrpReleaseBar`** (sticky banner at top of /drp when batch exists): pipeline `draft → reviewed → approved → released`. The "Xem xét" drawer items table migrated to **SmartTable** (Lô E):
- `screenId="drp-batch-items-rpo"` and `drp-batch-items-to`: separate persistence per tab. Columns: select checkbox, Mã (mono), NM (RPO) / Từ→Đến (TO), SKU (text filter), SL m², Giá trị (VND), Dự kiến đến.
- Bulk action bar above table holds the select-all `Checkbox` + "Duyệt mục đã chọn / Từ chối / Bỏ chọn" buttons.
- `summaryRow` shows TỔNG (active items) + total qty + total value (VND).
- `rowSeverity`: `"stale"` for rejected items (line-through), `"watch"` for selected.
- `onRowClick` toggles selection (skipped when rejected or released).
- Drawer also has Exceptions tab (flat cards, not a table) and footer with Approve/Release.

**Allocation page** (/allocation): LCNB Opportunities (TO_DRAFT cards) + Exceptions SmartTable (`screenId="allocation-exceptions"`, already SmartTable).

**`AllocSourceBar`** chips visualize 6-source allocation (OnHand / Pipeline / HubPO / LCNB / Internal TO / Gap). Helper components `ExpandedSkuBreakdown` / `ExpandedCnBreakdown` are exported but currently unused — kept for future drilldowns.

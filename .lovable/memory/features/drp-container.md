---
name: DRP container
description: DRP Bước 3 has 2 sub-tabs (Phân bổ + Đóng container) with bidirectional cross-link
type: feature
---
DRP Step 3 results split into 2 sub-tabs (`resultsTab` state in `DrpPage.tsx`):

- **Tab 1 "Phân bổ" (default)**: existing pills + toolbar + per-CN allocation table.
  - Each CN row has `id="alloc-row-{cn}"` for cross-link scroll target.
  - New **CONTAINER column** (between Nguồn and Hành động) shows clickable badges per container that includes this CN. Badge format: `TP-001 40ft 85% [GHÉP] [⚠ if low fill]`. Click → switch to Container tab + flash highlight TP-001.
  - colSpan in expansion row = 8 (was 7).

- **Tab 2 "Đóng container"**: `<ContainerPlanningSection />` (`src/components/drp/ContainerPlanningSection.tsx`).
  - SmartTable (`screenId="drp-container-list"`, `defaultDensity="compact"`) with 9 cols: ID, Loại xe, NM, Tuyến, Lấp đầy, CN/PO, Cước, Trạng thái, Hành động.
  - **CN/PO column**: badges per drop point (e.g. `CN-BD`, `CN-DN`); click → switch to Phân bổ tab + flash highlight CN row.
  - DrillDown shows: AI suggestion (gom_them/xuat_ngay/tach_xe), route visual + km, full drop-point table with SKU lines + ETA + Gỡ button, freight/saving line + linked PO list.
  - `autoExpandWhen` = fill < 70% so low-fill containers reveal the suggestion immediately.
  - 4 mini-summary chips above table: Tổng chuyến / Ghép tuyến / Fill TB / Tiết kiệm.
  - Footer CTA: `Duyệt & Chuyển Đơn hàng →` navigates to `/orders?tab=approval`.
  - Edit dialog (Dialog) opens via "Sửa" button on draft/ready/hold rows — placeholder for vehicle change + drop removal.

Cross-link helper `crossLink(target, id)`:
1. setResultsTab(target)
2. setCrossHighlight(id) (passed as `highlightId` prop to ContainerPlanningSection)
3. After 150ms, scroll `#{prefix}{id}` into view + add temp ring/bg classes for 1.6s

Mock data in `src/data/container-plans.ts` — 12 ContainerPlan rows (8 active, 4 in_transit/delivered) with multi-drop routes, savings, and `ContainerStatus` enum: draft/ready/hold/in_transit/delivered.

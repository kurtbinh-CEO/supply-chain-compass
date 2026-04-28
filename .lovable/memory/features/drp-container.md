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
  - DrillDown shows: AI suggestion (gom_them/xuat_ngay/tach_xe), route visual + km, `<DropPointsEditor>` (drag-and-drop reorder + live km/cước recalc), freight/saving line + linked PO list.
  - `autoExpandWhen` = fill < 70% so low-fill containers reveal the suggestion immediately.
  - 4 mini-summary chips above table: Tổng chuyến / Ghép tuyến / Fill TB / Tiết kiệm.
  - Footer CTA: `Duyệt & Chuyển Đơn hàng →` navigates to `/orders?tab=approval`.
  - Edit preview opens via "Sửa" button on draft/ready/hold rows → `<ContainerEditPreview>` (`src/components/drp/ContainerEditPreview.tsx`): full workspace with side-by-side **Hiện tại / Sau khi sửa** PreviewCards (loại xe · fill% · tổng km · cước + delta chips), vehicle picker (4 cars: Xe5T/Xe10T/20ft/40ft, each with capacity + cost/km), drag-and-drop drop reorder + ↑↓ + X (gỡ), and a "Đã gỡ — gắn lại" chip row. Live recalc model: `km = base × (0.4 + 0.6 × dropRatio) × (1 + dev × 0.25)`, `freight = km × vehicle.costPerKm`. Save button is disabled when `overflow > 0` and shows the total cước delta as a chip.

**DropPointsEditor** (in `ContainerPlanningSection.tsx`):
- Toggle button "🔀 Sắp xếp lại thứ tự giao" enables HTML5 drag-and-drop on rows (only for ≥2 drops AND status draft/ready/hold).
- Reorder mode: rows show grip handle + ↑/↓ buttons (alternative to drag); SKU column hidden to give space; CN cell becomes plain text.
- Live impact bar appears above table — updates instantly on every reorder showing dynamic route (`NM → CN1 → CN2 → ...`), new total km, new freight, and ±delta vs original (warning color when worse, info when same/better).
- `recalcRoute()` formula: `kmFactor = 1 + permutationDeviation × 0.25`. Deviation = sum of |new_idx − orig_idx| / max_possible. Original order is treated as the optimal baseline.
- Buttons: Hoàn tác (reset to original), Lưu thứ tự (toast confirmation with delta).

Cross-link helper `crossLink(target, id)`:
1. setResultsTab(target)
2. setCrossHighlight(id) (passed as `highlightId` prop to ContainerPlanningSection)
3. After 150ms, scroll `#{prefix}{id}` into view + add temp ring/bg classes for 1.6s

Mock data in `src/data/container-plans.ts` — 12 ContainerPlan rows (8 active, 4 in_transit/delivered) with multi-drop routes, savings, and `ContainerStatus` enum: draft/ready/hold/in_transit/delivered.

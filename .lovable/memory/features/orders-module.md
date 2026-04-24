---
name: Orders module
description: Orders module — 3 tabs (Duyệt PO/TO · Vận chuyển · Theo dõi) all migrated to SmartTable with drillDown lineage, action cells, and stage pipeline header
type: feature
---
The Orders module (`/orders`) was redesigned (M5) inspired by Oracle/SAP/Blue Yonder/Coupa patterns and **fully migrated to SmartTable** (Lô B refactor).

**Header pipeline rail**: 1-line `FlowSummary` showing 4 clickable stage chips (chờ duyệt → chờ nhà xe → đang giao → đã nhận) that jump to the relevant tab.

**Tab 1 — Duyệt PO/TO** (`ApprovalTab`): Combines PO drafts (`status=draft|submitted`) and TO drafts into one unified `ApprovalRow` union (`type: "po" | "to"`). Renders via `SmartTable<ApprovalRow>` with:
- Columns: PO/TO #, Loại (enum filter RPO/BPO/TO), Tuyến, Mã hàng, Số lượng, Container, Trạng thái (enum), Hành động.
- Action cell renders Send/Duyệt button (stops propagation, calls `sendPo`/`sendTo` to mutate `setOverrides`/`setToOverrides`).
- `drillDown` renders `PoLineage` for PO rows or `ToLineage` for TO rows.
- Toolbar above with "Duyệt tất cả" button. Mock fallback when DB empty.
- `screenId="orders-approval"` for localStorage persistence.

**Tab 2 — Vận chuyển** (`TransportTab`): Combines `TRANSPORT_PLANS` and approved `TO_DRAFT` into `TransportRowT[]`. Filter chips (Tất cả / PO / TO / Chờ nhà xe / Đang chuyển) above SmartTable.
- Columns include Chuyến, Loại, Tuyến, Số lượng (with container/fill subtext), Nhà xe, Ngày dự kiến, Trạng thái (enum: wait/hold/ready/moving), Hành động.
- Action cell delegated to `TransportActionCell` which handles 4 states: carrier picker dropdown (wait), Xuất ngay/Chờ gom (hold), Khởi hành (ready), "Đang chạy" label (moving). All buttons stop propagation.
- `screenId="orders-transport"`.

**Tab 3 — Theo dõi** (`TrackingTab`): Combines confirmed/shipped/received POs and TOs into `TrackingRowT[]`. Pure SmartTable with `drillDown` rendering `ShipmentTimeline` (full vertical 6-stage timeline with carrier/driver bar and tel: link).
- Columns: PO/TO # (with KindBadge inline), Tuyến, Nhà xe, Tài xế·SĐT (priority="low" hidden on mobile), ETA, Trạng thái (enum filter).
- Mock fallback (3 example shipments) when DB+overrides empty.
- `screenId="orders-tracking"`.

**Status overrides**: `overrides` (PO) and `toOverrides` (TO) maps for approval simulation without DB writes. `effective(po)`/`effectiveTo(t)` derive current state. `carrierAssign` map for transport carrier assignment.

**SmartTable benefits inherited by all 3 tabs**: density toggle, fullscreen (⌘⇧F), column hide, sort/filter persistence per `screenId`, CSV/PDF export, row severity highlighting (watch/overdue/ok).

**Mock data**: `PO_DRAFT`, `TRANSPORT_PLANS`, `CARRIERS`, `CN_REGION`, `TO_DRAFT` from `unis-enterprise-dataset.ts`. Tenant scaling via `tenantScales` map.

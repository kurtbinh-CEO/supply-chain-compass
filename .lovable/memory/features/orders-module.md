---
name: Orders module
description: Orders module — 3 tabs (PO Approval queue · BPO Burn-down with Compact/E2E Flow toggle · Shipment Tracking) with stage pipeline header and shipment drawer
type: feature
---
The Orders module (/orders) was redesigned inspired by Oracle/SAP/Blue Yonder/Coupa patterns.

**Header pipeline rail**: 5 stages (Draft → Submitted → Confirmed → Shipped → Received) shown as cards with arrows; pulses warning chip when approval queue > 0.

**Tab 1 — PO Approval**: Top "Cần duyệt ngay" queue (warning-themed) with checkboxes for bulk approve/reject. Per-row Submit/Confirm buttons. Bulk and single actions both open AlertDialog with note (note required for reject). Approval gated by RBAC `canApprove` (SC Manager only). Below: full PO reference table.

**Tab 2 — BPO Burn-down**: Toggle between two views (state `burndownView`):
- **Compact** (default): Per-NM rows with stacked progress bar (Delivered green / In-transit info / Released primary / Remaining gray) + waterfall numbers. Click row to inline-expand RPO/ASN children table.
- **E2E Flow**: One `BpoFlowCard` per BPO showing 5-stage horizontal funnel (Created → Approved → Released → Shipped → Received). Stage qty calculated from actual PO statuses — each line counts at every stage it has REACHED: Created=draft+submitted+confirmed+shipped+received (excl. cancelled), Approved=submitted+confirmed+shipped+received, Released=confirmed+shipped+received, Shipped=shipped+received, Received=received. Each stage shows qty + %, plus drop-off (−N) vs previous stage in warning color. Waterfall summary line shows `qty (−drop) → qty …` with cancelled and unreceived totals at right. Click any stage to drill-down inline RPO/ASN table filtered to lines that reached that stage. Component lives at `src/components/orders/BpoFlowCard.tsx`.

**Tab 3 — Shipment Tracking**: Filter chips (Tất cả / Đang vận chuyển / Quá ETA / Đã nhận). Inline summary row shows ASN, RPO, NM→CN route, driver+SDT, vehicle+carrier, SKU+qty, ETA chip with countdown (etaTone: danger if overdue, warning ≤12h), and 5-segment mini timeline. Click row → 520px right Sheet drawer with: ETA banner, route, driver/vehicle/carrier cards (clickable phone links), full vertical timeline (Picked → Loaded → In-transit → At gate → Received), POD attachment.

**Status overrides**: `statusOverrides` Record<po_number, status> for approval simulation without DB writes. `effectiveStatus(po)` derives current state.

**Mock shipment data**: `src/lib/shipment-data.ts` — `getShipmentDetail(asn, rpo, status, ...)` returns deterministic carrier/driver/vehicle by hash of ASN. Helpers `etaTone` and `etaLabel` for countdown styling.

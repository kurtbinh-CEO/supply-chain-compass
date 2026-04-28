---
name: Orders multi-drop (ghép tuyến)
description: 1 PO có thể ghép tuyến giao 2-3 CN — drops derived từ lines theo `toName`; table drill-down 2 cấp (drops→SKU); side panel split timeline shared+per-drop
type: feature
---
**Multi-drop concept (ORDERS-MULTIDROP)**: 1 xe ghép tuyến giao nhiều CN để tiết kiệm cước. Drops = lines của cùng `poNumber` group by `toName`.

**Data**: `PoGroup.drops: DropPoint[]` trong `src/lib/po-group-builder.ts`. `DropPoint = { cn, dropOrder, qty, eta, stage, lines }`. `isConsolidated = drops.length > 1`. `savingAmount` mock từ số drops + qty.

**Mock multi-drop seeds** trong `SEED_PO_LIFECYCLE`: PO-BD-W20-002 (2 drops Đồng Tâm→BD+DN, nm_confirmed), PO-HCM-W20-002 (2 drops Vigracera→HCM+BD, in_transit), PO-HN-W20-002 (3 drops Mikado→HN+HP+NA).

**TABLE = data**: parent SmartTable thêm cột "Điểm giao" (badge "N CN 🔗" cho multi). Drill-down chevron mở `GroupDrillDown` 2-cấp:
- Cấp 1: bảng Drop Points (#, CN, qty, ETA, status, SKU count)
- Cấp 2 (per drop ▸): bảng SKU (mã hàng, SL, đơn giá, thành tiền)
- Header: tuyến đầy đủ + container + savings badge nếu ghép

**SIDE PANEL = action**: `OrderDetailPanel` split timeline:
- `SHARED_STAGES = [approved, sent_nm, nm_confirmed, pickup]` — 1 timeline chung
- `PER_DROP_STAGES = [in_transit, delivering, completed]` — mỗi drop 1 timeline riêng + per-drop action button
- Single-drop fallback: render flat 7 stages (không split)
- Header subtitle: "→ N điểm giao" + ghép tuyến banner nếu multi
- Section "Chi tiết hàng hoá" (table SKU) BỎ KHỎI panel — đã có ở table drill-down

**Filters**: thêm pill "1 CN" / "2+ CN" (warning tone) + summary card thứ 5 "Ghép tuyến" hiển thị tổng tiết kiệm.

**Files**: `src/lib/po-group-builder.ts`, `src/lib/po-lifecycle-data.ts` (seeds), `src/pages/OrdersPage.tsx` (table+pills+cards+drilldown), `src/components/orders/OrderDetailPanel.tsx` (timeline split).

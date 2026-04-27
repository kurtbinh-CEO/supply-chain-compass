---
name: Orders module
description: Orders page (/orders) — 2-tier PO group table (parent NM×CN×Tuần → SKU children), single SmartTable drill-down chevron, status pills only (no extra "Tiến trình" line)
type: feature
---
The Orders page (/orders) was redesigned (ORDERS-FINAL-FIX) into a single-table 2-tier hierarchy:

**Parent rows = `PoGroup`** built by `src/lib/po-group-builder.ts` — gộp các `PoLifecycleRow` theo `poNumber` (NM × CN × Tuần). Group stage = stage SỚM NHẤT chưa hoàn thành. Container fill ước tính (40ft = 1.800m², 20ft = 900m²).

**Child rows = SKU lines** in compact `SmartTable<PoLifecycleRow>` shown via parent's `drillDown` (`GroupDrillDown`). Cột child: Mã hàng · Số lượng · Đơn giá · Thành tiền (mock từ skuLabel) · Trạng thái · nút "Cập nhật" per line.

**Một chevron duy nhất**: chỉ dùng SmartTable's built-in drillDown chevron — **không có** custom expand column và không có manual `expanded` state. Bỏ luôn `LifecycleFlowMini` ("Tiến trình:" inline) vì pills đã filter đủ.

**Action cascade**: khi user bấm nút action ở parent (operates on `group.leader`), `advance()` cập nhật TẤT CẢ lines cùng stage trong group qua `leaderSiblingIds(group)`.

**Pill counts dựa trên GROUPS** (không phải lines). Header phụ hiện "Tổng X đơn (Y dòng chi tiết)".

**Drill-down child** include: SKU pricing table → tổng + lifecycle inline dots (✅/●/○) → 2-cột Vận chuyển + Minh chứng (gộp evidence từ all lines) → Lịch sử timeline của leader.

**Files**:
- `src/lib/po-group-builder.ts` — `buildPoGroups`, `groupOverdue`, `groupNearSla`, `leaderSiblingIds`
- `src/lib/po-lifecycle-data.ts` — seed `SEED_PO_LIFECYCLE` (15+ rows; 2 PO numbers chia sẻ qua nhiều SKU lines để demo multi-SKU group)
- `src/pages/OrdersPage.tsx` — main page; `GroupDrillDown` component

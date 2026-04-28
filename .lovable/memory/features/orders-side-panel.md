---
name: Orders side panel
description: OrdersPage row-click opens 480px right Sheet (OrderDetailPanel); split-intent — chevron toggles inline drill-down, body row opens panel
type: feature
---
**Split-intent pattern** (ORDERS-SPLIT-INTENT) áp dụng trên `/orders` để tách 2 ý định người dùng:

- **Click chevron `▸/▾`** (cột đầu, w-7) → toggle inline drill-down (drops → SKU table). Chỉ "xem thêm dữ liệu", không mở panel.
- **Click body row** (bất kỳ cell nào ngoài chevron) → mở `OrderDetailPanel` 480px (timeline + actions). Không expand inline.
- **Visual cue active**: row đang mở panel có `bg-primary/5` + border-left 2px primary (`shadow-[inset_2px_0_0_0_hsl(var(--primary))]`).
- **Visual cue expanded**: row đang expand có `bg-muted/30` + chevron primary color.

**SmartTable props mới**:
- `splitIntent?: boolean` (default `true`) — tự động enable khi cả `drillDown` và `onRowClick` cùng có.
- `activeRowId?: string | null` — highlight row đang được "active" (vd: row đang mở panel).

Implementation: trong `SmartTable.tsx`, chevron `<td>` có `onClick={e => { e.stopPropagation(); handleExpand(); }}` khi splitIntent active, row click chỉ gọi `onRowClick`. Khi `splitIntent=false` (default cho legacy tables không truyền `onRowClick`), giữ nguyên hành vi cũ (row click toggle expand).

OrdersPage truyền `activeRowId={panelGroup?.groupId ?? null}` + hint inline phía trên bảng giải thích quy ước.

All transitions use TransitionShell with required comment + files.

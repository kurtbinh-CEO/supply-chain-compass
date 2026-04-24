---
name: SmartTable empty states
description: Standard pattern for SmartTable emptyState — lucide icon + title + description + optional action
type: design
---
All SmartTable instances use rich `emptyState` (NOT plain `emptyMessage` string):

```tsx
emptyState={{
  icon: <LucideIcon />,        // domain-relevant: Inbox, Shield, Truck, Receipt, History, Search, Plus...
  title: "Chưa có X nào",      // VI, sentence-case, no period
  description: "Why empty + how to populate it.", // 1 sentence, actionable context
  action?: { label, onClick },  // only when there's a clear next action (clear filters, add new, switch tab, navigate)
}}
```

**Action heuristic**:
- Filtered-empty (data exists but filters hide it) → "Xoá bộ lọc" reset action.
- True-empty + user can create → "Thêm X mới" CTA opening modal.
- Tab/grouping with siblings → switch to sibling tab if it has data (e.g. DRP RPO ↔ TO).
- Otherwise → no action, description carries the guidance.

**Coverage**: All SmartTable instances polished to this pattern: Allocation, Orders (3), Inventory (2), TransferOrders, DrpReleaseBar (2 tabs), Master/PriceLists (2), Demand/B2BInput, Demand/FcVsActual (2), Hub/Overview (2), Monitoring/AuditFeedback (3), Monitoring/FcAccuracy, Monitoring/SafetyStock (2), DemandWeekly (2).

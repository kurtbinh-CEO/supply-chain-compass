---
name: SmartTable migration progress
description: Migration trạng thái 7 views sang SmartTable + drillDown compact pattern
type: feature
---

Mục tiêu: mọi bảng data dùng `<SmartTable>` + `drillDown` compact (defaultDensity="compact"). Bỏ raw `<table>` và custom expand state.

## Done
- ✅ GapScenarioPage — tracking table → SmartTable + drillDown per NM × SKU gap (`gap-tracking` + `gap-tracking-{nmId}-skus`).
- ✅ SOP BalanceLockTab — 2 bảng pivot (CN-first / SKU-first) → `BalanceCnTable` + `BalanceSkuTable` với drillDown compact. Sub-components ở cuối file. State `expandedCns/expandedSkuKeys/expandedSku/bridgeSku` đã xoá. Alert button "Xem SKU" đổi thành hint text.

## Pending (đợt sau)
- ⏳ SOP ConsensusTab (CRITICAL) — bỏ hẳn HÀNH TRÌNH VERSION, giữ textarea giải trình variance trong drillDown. CN-first + SKU-first đều phải SmartTable + autoExpandWhen |Δ|>10%.
- ⏳ DrpPage (6 raw tables + 4 custom expand)
- ⏳ MonitoringPage (6 raw tables + 6 custom expand)
- ⏳ MasterDataPage (7 tabs)
- ⏳ DemandPage / DemandTotalTab (5 raw tables — pivot 3-level)

## Convention
- Parent: `defaultDensity="compact"`, `getRowId`, `rowSeverity`, `autoExpandWhen` cho exception rows, `summaryRow` cho TỔNG.
- Child (drillDown): wrap trong `<div className="px-3 py-2 bg-surface-1/40">`, SmartTable compact với `screenId` dạng `${parent}-${rowId}-${child}`.
- AOP Reconciliation + Decision Log trong BalanceLockTab vẫn là raw table (3-5 row tĩnh, không drill, không filter cần thiết) — pragmatic giữ raw.

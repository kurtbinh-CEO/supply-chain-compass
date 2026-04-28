---
name: SmartTable migration progress
description: Migration trạng thái 7 views sang SmartTable + drillDown compact pattern
type: feature
---

Mục tiêu: mọi bảng data dùng `<SmartTable>` + `drillDown` compact (defaultDensity="compact"). Bỏ raw `<table>` và custom expand state.

## Done
- ✅ GapScenarioPage — tracking table → SmartTable + drillDown per NM × SKU gap.
- ✅ SOP BalanceLockTab — `BalanceCnTable` + `BalanceSkuTable` với drillDown compact.
- ✅ SOP ConsensusTab — `ConsensusCnTable` + `ConsensusSkuTable` với drillDown. Bỏ HÀNH TRÌNH VERSION. Variance textarea trong drillDown CN-first khi `_isVariance`. autoExpandWhen `|Δ| > 10%`.
- ✅ DemandTotalTab — pivot 3-level (CN→SKU→Variant) + SKU-first đều dùng SmartTable nested drillDown. Bỏ 4 expand state sets. Variant breakdown (L3) là `DemandVariantTable` shared cho cả 2 pivot. Timeline tables (12m/3m/week) giữ raw vì là pivot matrix sticky-CN không phù hợp SmartTable.
- ✅ InventorySSTab — 3 raw tables (CN-first, SKU-first, SS Mgmt) → SmartTable. CN-first dùng `CnSkuDrill` (SKU L2 + DemandToOrderBridge L3), SKU-first dùng `SkuCnDrill`. autoExpandWhen `ssGap < 0`. Bỏ `expandedCns/expandedSkuPivot`. Chart Section A giữ nguyên.
- ✅ MonitoringPage (3/6 list tables) — `conflict-log` (drillDown chi tiết, autoExpand highlight), `recurring-exceptions`, `closed-loop`. Heatmap-hstk + fc-mape + nm-performance giữ raw vì là pivot matrix.
- ✅ MasterDataPage (4/7 list tabs) — Items, Factories (rowSeverity by reliability), Branches, Containers. Giữ raw 2 LT matrix (NM↔CN, CN↔CN) + Distance matrix vì sticky-column pivot. PriceLists/Carriers tabs đã là sub-component riêng.

## Pending (đợt sau)
- ⏳ DrpPage (6 raw tables + 4 custom expand)

## Convention
- Parent: `defaultDensity="compact"`, `getRowId`, `rowSeverity`, `autoExpandWhen` cho exception, `summaryRow` cho TỔNG.
- Child (drillDown): wrap `<div className="px-3 py-2 bg-surface-1/40">`, SmartTable compact, `screenId` dạng `${parent}-${rowId}-${child}`.
- Editable cells cần `e.stopPropagation()` để click không trigger expand toggle.
- Pivot matrix sticky-column (1 row × N month columns) giữ raw — SmartTable không phù hợp matrix layout.
- AOP Reconciliation + Decision Log trong BalanceLockTab vẫn raw (3-5 row tĩnh).

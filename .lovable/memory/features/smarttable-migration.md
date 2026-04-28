---
name: SmartTable migration progress
description: Migration trạng thái 7 views sang SmartTable + drillDown compact pattern
type: feature
---

Mục tiêu: mọi bảng data dùng `<SmartTable>` + `drillDown` compact (defaultDensity="compact"). Bỏ raw `<table>` và custom expand state.

## Done (đợt CRITICAL)
- ✅ GapScenarioPage — tracking table → SmartTable + drillDown per NM × SKU gap.
- ✅ SOP BalanceLockTab — `BalanceCnTable` + `BalanceSkuTable` với drillDown compact. AOP Reconciliation + Decision Log vẫn raw (3-5 dòng tĩnh).
- ✅ SOP ConsensusTab — `ConsensusCnTable` + `ConsensusSkuTable` với drillDown. **Bỏ HÀNH TRÌNH VERSION** (v0→v1→v2→v3) — đã có trong cột. Variance textarea giải trình nằm trong drillDown CN-first khi `_isVariance`. autoExpandWhen `|Δ top-down vs Σ(SKU v3)| > 10%`. SKU-first autoExpand `|Δ vs AOP| > 10%`.

## Pending (đợt sau)
- ⏳ DrpPage (6 raw tables + 4 custom expand)
- ⏳ MonitoringPage (6 raw tables + 6 custom expand)
- ⏳ MasterDataPage (7 tabs)
- ⏳ DemandPage / DemandTotalTab (5 raw tables — pivot 3-level)

## Convention
- Parent: `defaultDensity="compact"`, `getRowId`, `rowSeverity`, `autoExpandWhen` cho exception rows, `summaryRow` cho TỔNG.
- Child (drillDown): wrap trong `<div className="px-3 py-2 bg-surface-1/40">`, SmartTable compact với `screenId` dạng `${parent}-${rowId}-${child}`.
- Editable cells (EditableCell, NoteCell) cần `e.stopPropagation()` để click không trigger expand toggle.
- AOP Reconciliation + Decision Log trong BalanceLockTab vẫn là raw table (3-5 row tĩnh) — pragmatic giữ raw.

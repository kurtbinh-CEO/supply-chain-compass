---
name: M17 data inputs
description: AOP plan dialog (DemandPage badge), KPI Targets editor (Config tab), datasets for AOP/KPI/Carriers/Transport/FC actual
type: feature
---
# M17 — Data input gaps

Phase 1 (datasets + xóa hardcode) — DONE:
- `AOP_PLAN`, `getAopMonth`, `getAopSkuGroup`, `getAopYtd`
- `TRANSPORT_RATES` (9 routes × 4 vehicle kinds)
- `FC_ACTUAL` (T1-T4 2026), `getFcActualYtd`
- `KPI_TARGETS` (8 KPIs), `getKpiTarget`
- SopPage AOP formula = `getAopMonth(5) × groupWeight × cnSkuShare`
- DemandPage badges đọc `AOP_PLAN.totalTarget` + `getFcActualYtd()`

Phase 2 — UI editors (DONE):
- **AopPlanDialog** (`src/components/AopPlanDialog.tsx`):
  - 4 sections: tổng / tháng / nhóm hàng / vùng
  - Validation: Σ = 100% inline cho mỗi bảng
  - Lock/Unlock chỉ SC_MANAGER
  - Mở từ DemandPage badge "AOP 2026: 560.000 m²" (clickable, hover icon)
- **KpiTargetsTab** (`src/components/config/KpiTargetsTab.tsx`):
  - Tab "Mục tiêu KPI" trong ConfigPage (vị trí thứ 2 sau "Tích hợp")
  - Edit `target` + `warningThreshold` per KPI
  - Lock/Unlock + Save/Reset/History
  - Wire vào ExecutivePage qua `kpiTargetLabel()` helper — Tier 1 cards và Sheet header đọc từ `getKpiTarget()`
- ExecutivePage map: `fill→fill_rate`, `doi→days_of_inventory`, `wc→working_capital`, `fc→forecast_accuracy`, `otd→on_time_delivery`, `supplier→supplier_fill_rate`

Còn lại Phase 3:
- GAP 2/3: Tab "Nhà xe" trong MasterData + drill-down TRANSPORT_RATES
- GAP 4: DataSourceSelector "Nhập thực tế" cho FC_ACTUAL
- Master Data CRUD universal pattern

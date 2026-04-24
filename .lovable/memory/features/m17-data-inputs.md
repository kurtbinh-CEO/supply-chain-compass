---
name: M17 data inputs
description: AOP plan dialog (DemandPage badge), KPI Targets editor (Config tab), Carriers tab + transport rates drill-down, datasets for AOP/KPI/Carriers/Transport/FC actual
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
- **AopPlanDialog** (`src/components/AopPlanDialog.tsx`) — 4 sections, validation Σ=100%, lock SC_MANAGER
- **KpiTargetsTab** (`src/components/config/KpiTargetsTab.tsx`) — Tab "Mục tiêu KPI" trong ConfigPage
- ExecutivePage Tier 1 cards + Sheet header đọc target qua `getKpiTarget()`

Phase 3a — Carriers + transport rates (DONE):
- **CarriersTab** (`src/components/master/CarriersTab.tsx`):
  - Tab "Nhà xe" trong MasterDataPage (vị trí 6, sau "Tuyến")
  - Cột: Mã NVT · Tên · Loại · Vùng · Liên hệ · SLA · Trạng thái · Ghi chú
  - Click row → expand drill-down: bảng cước per route × `RateVehicleKind` (truck_10t/15t/20ft/40ft) + 4 phụ phí editable + actions [Sửa cước][Upload Excel][Bảng cước mới]
  - Toolbar: search + [Thêm nhà xe][Nhập Excel] (toast demo)
- Dataset `Carrier` đã có `code`, `contactName`, `status` — không cần thêm

Còn lại Phase 3:
- GAP 4: DataSourceSelector "Nhập thực tế" cho FC_ACTUAL ở DemandPage + FcAccuracyTab
- GAP 5: Master Data CRUD universal pattern (Add/Edit/Delete/Import/Export per tab)
- Wire FC_ACTUAL vào MAPE thực ở FcVsActualTab

---
name: M17 data inputs
description: AOP plan dialog, KPI Targets editor, Carriers tab + transport rates, FC Actual import wired to MAPE — all 5 critical data inputs covered
type: feature
---
# M17 — Data input gaps

Phase 1 (datasets + xóa hardcode) — DONE:
- `AOP_PLAN`, `getAopMonth`, `getAopSkuGroup`, `getAopYtd`
- `TRANSPORT_RATES` (9 routes × 4 vehicle kinds)
- `FC_ACTUAL` (T1-T4 2026), `getFcActualYtd`, `getFcActualByMonth`, `getFcActualMonthsClosed`
- `KPI_TARGETS` (8 KPIs), `getKpiTarget`
- SopPage AOP formula, DemandPage badges đọc live data

Phase 2 — UI editors (DONE):
- **AopPlanDialog** mở từ DemandPage badge, 4 sections, validation Σ=100%, lock SC_MANAGER
- **KpiTargetsTab** trong ConfigPage, edit target + warningThreshold
- ExecutivePage Tier 1 cards đọc target qua `getKpiTarget()`

Phase 3a — Carriers + transport rates (DONE):
- **CarriersTab** (`src/components/master/CarriersTab.tsx`): tab "Nhà xe" trong MasterDataPage
- Click row → drill-down bảng cước per route × `RateVehicleKind` + 4 phụ phí editable

Phase 3b — FC Actual import + MAPE thật (DONE):
- DemandPage header: nút **"Nhập thực tế"** (variant outline) cạnh "Nhập FC", mở DataSourceSelector với `ACTUAL_SOURCES` (Bravo / Excel / Tay)
- FcAccuracyTab (Monitoring): nút **"Cập nhật thực tế"** cạnh chart header MAPE 12 tuần
- **FcVsActualTab** rewrite: T6/25–T12/25 mock historical, T1/26–T4/26 đọc REAL từ `FC_ACTUAL` qua `getFcActualByMonth()`, T5/26 = "đang chạy"
- MAPE/Bias/avgMape giờ tính từ FC_ACTUAL thật cho 4 tháng 2026
- Card "Mô hình dùng nhiều nhất" → "Nguồn thực tế" (`realCount/4` tháng + `FC_ACTUAL.length` dòng)
- Bảng tháng có cột "Nguồn" (Thực tế/Lịch sử) với enum filter

Phase 4 — Master Data CRUD universal (DONE):
- **`src/components/master/CrudPrimitives.tsx`**: 4 building blocks dùng chung
  - `CrudToolbar`: Search + [Thêm] + [Nhập] (DataSourceSelector 3 nguồn) + [Xuất] CSV
  - `EntityFormDialog`: form tự sinh từ `FormField[]` config — text/number/select/textarea, validation required, mode create/edit, readOnlyOnEdit cho code field
  - `DeleteConfirmDialog`: warning destructive với entityLabel + description impact
  - `RowActions`: icon ✏️🗑️ inline cuối row
  - `exportToCsv`: BOM UTF-8, escape quotes, auto-download
- Wired vào 4 tab: **Mã hàng** (ItemsTab), **NM** (SuppliersTab), **CN** (BranchesTab), **Container** (ContainersTab)
- Pattern đồng nhất: hover row → [✏️Sửa] [🗑️Xóa]; header có [+Thêm] [↑Nhập] [↓Xuất]
- CSV export tiếng Việt: cột name VN, BOM UTF-8 cho Excel mở đúng

Còn lại — out of scope:
- Wizard 5 bước upload Excel thực — đang dùng toast demo

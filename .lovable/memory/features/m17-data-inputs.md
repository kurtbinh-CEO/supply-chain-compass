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

Phase 5 — Excel Wizard 5 bước (DONE):
- **`src/components/master/ExcelImportWizard.tsx`**: dùng `xlsx@0.18.5`, 5 step (Upload → Preview → Mapping → Validate → Commit)
- Hỗ trợ `.xlsx/.xls/.csv`, drag-drop, multi-sheet, auto-suggest mapping (alias + normalize VI→EN)
- Validate: required, type number/select whitelist, duplicate `code` trong file
- Step 4 hiển thị tối đa 100 lỗi với row#/field/message; Step 5 confirm + chỉ commit dòng hợp lệ
- `CrudToolbar` thêm prop `excelImport={ entityName, fields: ImportField[], onCommit }`. Khi user chọn "Excel/CSV" trong DataSourceSelector → mở wizard thay vì gọi `onImport`
- Wired vào 4 tab Master Data: Mã hàng, NM, CN, Container — mỗi tab có `*_IMPORT_FIELDS` riêng với aliases tiếng Việt

Phase 6 — Persist Master Data vào Lovable Cloud (DONE):
- Migration tạo 4 bảng: `master_items`, `master_factories`, `master_branches`, `master_containers`
  - Mỗi bảng: id UUID, code (UNIQUE per tenant), updated_at trigger, RLS public read + auth write + admin delete
- **`src/hooks/useMasterData.ts`**: 5 hook/entity × 4 entity (list, create, update, delete, bulkInsert) dùng React Query, invalidate cache
- **Tất cả 4 tab Master Data** (Items/NM/CN/Container) đã wire full Cloud:
  - Merged view: cloud rows override hardcode dataset theo `code`, badge "Cloud" hiển thị inline với mã
  - Add/Edit/Delete/Bulk-import-Excel đều gọi mutation thật
  - Edit hardcoded row → tạo Cloud override (cùng `code`); Delete chỉ cho cloud rows (yêu cầu admin)
  - Footer hiển thị "X từ cloud + Y từ dataset mẫu"
  - Excel wizard onCommit gọi `bulkInsert*` thật → dòng hợp lệ vào DB ngay

Phase 7 — Audit log Master Data CRUD (DONE):
- Migration tạo `master_data_audit` (entity, entity_code, action, actor_id, actor_name, before_data, after_data, created_at) — RLS public read + auth insert, immutable (no UPDATE/DELETE)
- `useMasterData.ts` wrap mọi mutation (create/update/delete/bulkInsert × 4 entity) tự động ghi audit:
  - create/bulk_import: snapshot `after`
  - update: fetch snapshot `before` trước update, log cả `before`+`after`
  - delete: fetch snapshot `before` trước delete, log `before`
  - actor lấy từ `supabase.auth.getUser()` (display_name → full_name → email → "Khách")
- `useMasterAudit({ entity?, entity_code?, limit? })` hook query React Query
- **`MasterAuditPanel`** (`src/components/master/MasterAuditPanel.tsx`): slide-in 480px Sheet
  - Mode 1: header "Lịch sử" button → toàn bộ với tab filter (Tất cả / Hàng / NM / CN / Cont)
  - Mode 2: per-row history icon trong RowActions → filter theo entity+code
  - Diff viewer: action=update hiện list field changes (max 6) với strike-through old → new
  - action=delete hiện snapshot summary (3 fields đầu)
  - Relative time ("5 phút trước"), action icon + tone (create=success, update=info, delete=danger)
- `RowActions` thêm prop optional `onHistory` → icon History đầu tiên, gọi setHistoryCode(row.code)


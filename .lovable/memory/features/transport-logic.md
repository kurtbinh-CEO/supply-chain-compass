---
name: Transport logic
description: 4 transport ma trận (route-vehicle, drop eligibility, fill-up tree, edit thresholds) + ConfigPage Vận tải tab + wire vào ContainerPlanningSection drilldown
type: feature
---
4 ma trận logic vận tải (PR1 foundation + PR2 wiring):

**Datasets** (`src/data/`):
- `vehicle-types.ts` — VehicleType union (6 canonical + 4 legacy aliases) + VEHICLE_CATALOG
- `route-constraints.ts` — 11 routes, allowedVehicles per route, helpers `inferContainerRoute`/`regionOfNm`/`regionOfCn`
- `drop-eligibility.ts` — CN-pair matrix per NM (5 NMs) + `getCandidateDropCns` helper
- `fill-up-decision.ts` — `decideFillUp()` decision tree → consolidation/round-up/hold/ship-as-is/ok
- `edit-thresholds.ts` — `validateQtyEdit`/`validateAddPo` + DECREASE_REASONS
- `transport-config.ts` — TRANSPORT_DEFAULTS + localStorage overrides

**Config UI**: `ConfigPage > Tab "Vận tải"` (`TransportLogicPanel.tsx`) — 4 accordion view/edit thresholds.

**UI wiring** (PR2):
- **ContainerEditPreview**: Vehicle picker dùng `inferContainerRoute` → disable+tooltip xe không hợp lệ. Hiển thị tuyến + "Bắt buộc container" badge. Notes constraint inline.
- **PoLinesEditor (ContainerPlanningSection)**:
  - `validateQtyEdit` chạy mỗi khi farmer sửa qty → severity chip màu (warn/require_reason/block) + sub-row message.
  - block → toast.error + không update value. require_reason → Select dropdown DECREASE_REASONS.
  - "+ Thêm drop" Select: dùng `getCandidateDropCns` → 2 group "Có thể ghép" (eligible) / "Không ghép được" (disabled + reason tooltip).
- **RoundUpSuggestion (drill zone B)**: Refactor cứng → `decideFillUp()`. Hiện AI strategy badge, primaryAction, reason, warning, eligible CN preview. Buttons "Áp dụng" + altActions.

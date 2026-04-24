---
name: Demand review
description: Demand Review (/demand) with 2 tabs — Demand tổng + B2B nhập liệu
type: feature
---
Demand Review (/demand) is structured into two tabs: "Demand tổng" and "B2B nhập liệu".

**Demand tổng** utilizes a 3-level pivot (CN → SKU → variant) with version selector v0/v1/v2/v3. Pivot logic lives in `DemandTotalTab.tsx` and is **NOT migrated to SmartTable** — multi-level expand + version multipliers + override modal are tightly coupled.

**B2B nhập liệu** — Migrated to **SmartTable** (Lô D, `screenId="b2b-deals"`):
- 6-stage pipeline (Tiềm năng → Tiếp xúc → Báo giá → Đàm phán → Cam kết → Đã ký) with stage chip filters above the table.
- SmartTable columns: Mã Deal, Khách hàng, CN (enum filter), SKU gốc (enum filter), SL (m²), Giai đoạn (enum filter, color chip), Trọng số (auto = qtyM2 × stageProb), Dự kiến chốt, Phụ trách, Hành động (Pencil/Trash icons with stopPropagation).
- `summaryRow` shows TỔNG with filtered/total deals + total qty + total weighted.
- Cascade confirmation modal triggers when edit deal qty changes by >20% (rerun S&OP v3 → DRP → NM commitment).

**FC vs Actual** sub-view (within Demand) — Migrated to SmartTable (Lô D):
- `screenId="fc-vs-actual-monthly"`: 12-month series with `rowSeverity="watch"` when MAPE > 15%, enum filter on Model.
- `screenId="fc-vs-actual-cn-mape"`: Per-CN MAPE breakdown.

**FC source badge** indicates which model (XGBoost/Holt-Winters/HW+XGB) provided the canonical forecast.

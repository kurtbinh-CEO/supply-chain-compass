---
name: Management screens
description: System management consolidated into 3 areas — config, master data, monitoring
type: feature
---
System management is consolidated into three areas:

1. **Config** (`/config`) — RBAC, tenants, integrations
2. **Master Data** (`/master`) — SKU, NM, branches, **price lists** (`PriceListsTab`). Migrated to **SmartTable** (Lô D):
   - `screenId="master-price-lists"`: 5-NM list with `drillDown` containing per-SKU price breaks (MOQ tiers) + surcharges (Switch toggle). Auto-expands `PL-TKO-03` on mount. `rowSeverity="shortage"` for price lists expiring within 30 days.
   - `screenId="master-price-version-compare"`: Toko v2 vs v3 SKU comparison with `rowSeverity="watch"` on Δ ≥ 4%.
   - Enum filters on Status (Hiệu lực/Hết hạn/Nháp). Headers retain `TermTooltip` for "Hieu_luc", "MOQ", "Break", "Tier", "Phu_phi".
3. **Monitoring** (`/monitoring`) — system health, FC accuracy, audit (Lô A migrated)

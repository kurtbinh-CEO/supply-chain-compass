---
name: SmartTable column widths
description: Fixed column widths for SmartTable to prevent layout jank during sort/filter/expand
type: design
---

All SmartTable columns should declare an explicit `width` (number, in px) so the table layout stays stable when sorting, filtering, or expanding rows.

**Width convention (px):**
- Mono code (PO/TO/Deal id): 110–180 (longer for full PO numbers like `PO-LCNB-2025-0123`)
- SKU base / mono SKU: 120–140
- CN code (3 chars): 70–90
- CN name + code: 160–200
- Person/owner: 140
- Date (dd/mm/yy): 100–130
- Date with annotation (e.g. "còn 12d"): 160–180
- Numeric (m², qty, %): 100–140 (use `align: "right"`)
- Status / enum chip: 130–160 (use `align: "center"`)
- Action buttons: 60–100 (use `align: "center"`)
- Long text / notes / payment terms: 200–280 with `truncate`

**How to apply:** Always pair `numeric: true` with `align: "right"` and a width. Always pair status chips with `align: "center"`. Action columns use small fixed widths (60–100).

**Why:** Without widths, browser auto-layout reflows on every data change (sort, filter toggle, drilldown expand). Fixed widths keep the table grid stable and feel snappier.

---
name: Hub & Sourcing Workbench
description: 4-step sourcing flow (Net Req → NM Ranking → Allocation → MOQ+BPO) replacing old NM order tab
type: feature
---
Hub & Sourcing (/hub) tab 1 "Sourcing Workbench" is a 4-step horizontal stepper:
1. "Cần gì?" — Net requirement per SKU, auto-pulled from S&OP Lock (read-only). Urgency-sorted.
2. "NM nào có?" — Source ranking per SKU with objective selector (Hybrid/LT/Cost). Score formula with weights.
3. "Phân bổ" — Editable allocation matrix per SKU × NM with visual bars + NM summary table.
4. "MOQ + Gửi" — MOQ rounding, surplus calc, BPO creation with confirmation modal.

State: steps are navigable freely, editing step 2 recalculates step 3, objective change re-ranks step 2.
After BPO created: read-only with success badge. Tab 2 "Đối chiếu" unchanged.
Header: "Hub & Sourcing — Tháng 5", subtitle shows S&OP locked qty + day count.
Objective dropdown in header actions area.

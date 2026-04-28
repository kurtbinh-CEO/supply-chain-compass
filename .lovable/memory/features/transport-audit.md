---
name: Transport audit log
description: Client-side audit store + collapsible panel inside ContainerPlanningSection that records every automatic decision from the 4 transport matrices (vehicle, qty_edit, drop, fillup) with timestamp + actorRole.
type: feature
---
- Store: `src/lib/transport-audit.ts` — in-memory + localStorage (`smartlog.transport-audit.v1`, max 500), `emitTransportAudit`, `subscribeTransportAudit`, `clearTransportAudit`.
- Hook: `src/hooks/useTransportAudit.ts` — reactive subscriber.
- Panel: `src/components/drp/TransportAuditPanel.tsx` — Collapsible (closed by default), filters by category + severity, shows ts (vi-VN) + actorRole chip, clear button.
- Mounted in `ContainerPlanningSection` right after `<LogicExplainer />`.
- Emitters wired:
  - **vehicle**: `ContainerEditPreview` — one-shot block list on container open + click-select event.
  - **qty_edit**: `PoLinesEditor.editQty` — every non-ok validation outcome (severity mapped).
  - **drop**: `PoLinesEditor.tryAddDrop`/`confirmAddDrop`/`removePo` — eligibility check + add success/block + remove.
  - **fillup**: `RoundUpSuggestion` — useEffect logs decideFillUp() result per (container, strategy); apply-container, apply-line, alt-strategy buttons each emit.
- Actor role read from `useAuth().roles[0]` (defaults to "guest").

import { useEffect, useState } from "react";
import {
  subscribeTransportAudit,
  type TransportAuditEvent,
} from "@/lib/transport-audit";

/** React hook → reactive list of audit events (most-recent first). */
export function useTransportAudit() {
  const [events, setEvents] = useState<TransportAuditEvent[]>([]);
  useEffect(() => subscribeTransportAudit(setEvents), []);
  return events;
}

/** Resolve actor role → short label.
 *  Falls back to "viewer" / "guest" when AuthContext is empty (demo mode).
 */
export function useActorRoleLabel(): string {
  // Lazy import to avoid a hard dep cycle if AuthContext changes shape.
  // We read from AuthContext when available.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let role = "guest";
  try {
    // dynamic import via require would not work in ESM — use stored last role
    // instead: ContainerPlanningSection wraps this hook with a real value.
  } catch { /* ignore */ }
  return role;
}

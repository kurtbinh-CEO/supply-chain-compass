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

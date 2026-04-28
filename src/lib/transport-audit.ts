/* ════════════════════════════════════════════════════════════════════════════
   §  TRANSPORT AUDIT LOG (client-side store)
   §  Captures every automatic decision from the 4 transport matrices:
   §    1. vehicle      — vehicle picker disable / select
   §    2. qty_edit     — PO qty validation outcome (ok / warn / require_reason / block)
   §    3. drop         — drop add / remove / blocked
   §    4. fillup       — decideFillUp() outputs (apply / dismiss / alt)
   §  Persisted in localStorage so it survives reloads in demo.
   ════════════════════════════════════════════════════════════════════════════ */

export type TransportAuditCategory = "vehicle" | "qty_edit" | "drop" | "fillup";
export type TransportAuditSeverity = "info" | "warn" | "block" | "success";

export interface TransportAuditEvent {
  id: string;
  ts: number;                      // epoch ms
  category: TransportAuditCategory;
  severity: TransportAuditSeverity;
  /** Short title shown in panel row (VN). */
  title: string;
  /** Optional detail / rule text (VN). */
  detail?: string;
  /** Container/Plan id for cross-link. */
  containerId?: string;
  /** Active user role label captured at event-time (e.g. "sc_manager"). */
  actorRole: string;
  /** Free-form structured payload for debugging. */
  meta?: Record<string, unknown>;
}

const STORAGE_KEY = "smartlog.transport-audit.v1";
const MAX_EVENTS = 500;

let events: TransportAuditEvent[] = load();
const listeners = new Set<(events: TransportAuditEvent[]) => void>();

function load(): TransportAuditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_EVENTS) : [];
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch { /* quota/private-mode — ignore */ }
}

function notify() {
  for (const l of listeners) l(events);
}

/** Add a new audit event. Most-recent-first. */
export function emitTransportAudit(
  e: Omit<TransportAuditEvent, "id" | "ts"> & { ts?: number },
) {
  const ev: TransportAuditEvent = {
    id: `tae_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ts: e.ts ?? Date.now(),
    ...e,
  };
  events = [ev, ...events].slice(0, MAX_EVENTS);
  persist();
  notify();
  return ev;
}

export function getTransportAudit(): TransportAuditEvent[] {
  return events;
}

export function clearTransportAudit() {
  events = [];
  persist();
  notify();
}

/** Subscribe; returns unsubscribe. */
export function subscribeTransportAudit(fn: (events: TransportAuditEvent[]) => void) {
  listeners.add(fn);
  fn(events);
  return () => { listeners.delete(fn); };
}

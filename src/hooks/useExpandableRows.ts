import { useCallback, useEffect, useMemo, useState } from "react";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  useExpandableRows — shared helper for tables with expandable rows.          */
/*                                                                              */
/*  Rules (P19):                                                                */
/*  • Rows tagged severity="shortage" or "overdue" → default expanded=true      */
/*  • All other rows → default collapsed                                        */
/*  • ⌘E (Cmd/Ctrl+E) → global toggle expand/collapse ALL rows                  */
/*                                                                              */
/*  Usage:                                                                      */
/*    const rows = data.map(r => ({ key: r.id, severity: r.gap > 0 ? 'shortage'│
/*                                                              : 'ok' }));     */
/*    const { expanded, toggle, isOpen } = useExpandableRows(rows);             */
/* ─────────────────────────────────────────────────────────────────────────── */

export type RowSeverity = "shortage" | "overdue" | "watch" | "ok" | string | undefined;

export interface ExpandableRowDescriptor {
  key: string;
  severity?: RowSeverity;
}

const AUTO_OPEN_SEVERITIES = new Set<RowSeverity>(["shortage", "overdue"]);

/** Global ⌘E event channel — broadcast a single intent: "expandAll" | "collapseAll" | "toggle" */
const EXPAND_ALL_EVENT = "lov:expand-all-rows";
type ExpandAllDetail = { intent: "toggle" };

export function dispatchExpandAll() {
  window.dispatchEvent(new CustomEvent<ExpandAllDetail>(EXPAND_ALL_EVENT, { detail: { intent: "toggle" } }));
}

export function useExpandableRows(
  rows: ExpandableRowDescriptor[],
  options: { storageKey?: string } = {},
) {
  // Build the auto-expand seed from severity. Recomputed when row keys change.
  const seedKey = useMemo(() => rows.map((r) => `${r.key}:${r.severity ?? ""}`).join("|"), [rows]);

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    rows.forEach((r) => {
      if (AUTO_OPEN_SEVERITIES.has(r.severity)) initial.add(r.key);
    });
    if (options.storageKey && typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(options.storageKey);
        if (stored) {
          const arr = JSON.parse(stored) as string[];
          arr.forEach((k) => initial.add(k));
        }
      } catch {
        /* ignore */
      }
    }
    return initial;
  });

  // Re-seed when row severity composition changes (e.g., new data loaded).
  // We only ADD newly-severe keys; never auto-collapse a row the user already opened.
  useEffect(() => {
    setExpanded((prev) => {
      let changed = false;
      const next = new Set(prev);
      rows.forEach((r) => {
        if (AUTO_OPEN_SEVERITIES.has(r.severity) && !next.has(r.key)) {
          next.add(r.key);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedKey]);

  // Persist (optional)
  useEffect(() => {
    if (!options.storageKey || typeof window === "undefined") return;
    try {
      sessionStorage.setItem(options.storageKey, JSON.stringify([...expanded]));
    } catch {
      /* ignore */
    }
  }, [expanded, options.storageKey]);

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const isOpen = useCallback((key: string) => expanded.has(key), [expanded]);

  const expandAll = useCallback(() => {
    setExpanded(new Set(rows.map((r) => r.key)));
  }, [rows]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  // ⌘E global listener — toggles between "all open" and "all closed"
  useEffect(() => {
    const onEvt = () => {
      setExpanded((prev) => {
        const allKeys = rows.map((r) => r.key);
        // If everything is already open → collapse all; else → expand all.
        const allOpen = allKeys.length > 0 && allKeys.every((k) => prev.has(k));
        return allOpen ? new Set() : new Set(allKeys);
      });
    };
    window.addEventListener(EXPAND_ALL_EVENT, onEvt);
    return () => window.removeEventListener(EXPAND_ALL_EVENT, onEvt);
  }, [rows]);

  return { expanded, isOpen, toggle, expandAll, collapseAll, setExpanded };
}

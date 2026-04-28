import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

/* ─────────────────────────────────────────────────────────────────────────────
 *  useIdleNudge — fires a single toast.info after `idleMs` of no interaction
 *  on the current work screen. Resets on any user activity. Fires once per idle
 *  period (i.e., only re-fires after the user interacts again and goes idle).
 *
 *  Mounted once at the app shell. Skips non-work routes (auth, design test).
 * ──────────────────────────────────────────────────────────────────────────── */

const WORK_ROUTES = new Set<string>([
  "/workspace", "/demand", "/demand-weekly", "/sop", "/inventory", "/hub",
  "/gap-scenario", "/sync", "/cn-portal", "/drp",
  "/orders", "/monitoring",
]);

interface Options {
  /** Function returning the current pending count (e.g., pendingCount + exceptions). */
  getPendingCount: () => number;
  /** Idle threshold in ms (default 5 min). */
  idleMs?: number;
}

export function useIdleNudge({ getPendingCount, idleMs = 5 * 60 * 1000 }: Options) {
  const location = useLocation();
  const timerRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    const isWorkRoute = WORK_ROUTES.has(location.pathname);
    if (!isWorkRoute) return;

    const reset = () => {
      firedRef.current = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        if (firedRef.current) return;
        const n = getPendingCount();
        if (n <= 0) return;
        firedRef.current = true;
        toast.info(`💡 Có ${n} việc chờ xử lý`, {
          duration: 5000,
          description: "Mở Workspace để xem ưu tiên hôm nay.",
        });
      }, idleMs);
    };

    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [location.pathname, idleMs, getPendingCount]);
}

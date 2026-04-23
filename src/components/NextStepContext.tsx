import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
 *  NextStep system — "Bước tiếp theo" guidance after a key action on each
 *  workflow screen. Once the user completes the key action of a screen, a green
 *  banner appears with a CTA pointing to the next screen in the closed loop.
 *
 *  Steps are keyed per-route. Completion persists in sessionStorage so a soft
 *  navigation back to the page still shows the banner (until the chain ends or
 *  the user dismisses it).
 *
 *  Closed loop:
 *    /demand → /sop → /supply → /hub → /gap-scenario → /sync → /cn-portal →
 *    /drp → /allocation → /transport → /orders → /orders (track) →
 *    /monitoring → back to /demand (new cycle)
 * ──────────────────────────────────────────────────────────────────────────── */

export type NextStepKey =
  | "demand.fc-imported"
  | "sop.locked"
  | "supply.booking-done"
  | "hub.reviewed"
  | "gap.resolved"
  | "sync.fresh"
  | "cn-portal.adjusted"
  | "drp.viewed"
  | "allocation.done"
  | "transport.done"
  | "orders.confirmed"
  | "orders.received"
  | "monitoring.viewed";

export interface NextStepConfig {
  /** Vietnamese success label shown in the banner (icon prepended automatically). */
  label: string;
  /** Vietnamese CTA on the button (e.g., "Bước tiếp: S&OP"). */
  ctaLabel: string;
  /** Route to navigate to when the CTA is clicked. */
  ctaRoute: string;
  /** Optional Vietnamese subtitle / hint shown under the label. */
  hint?: string;
  /** Optional override icon (defaults to ✅). */
  icon?: string;
}

export const NEXT_STEPS: Record<NextStepKey, NextStepConfig> = {
  "demand.fc-imported": {
    label: "FC nhập xong",
    ctaLabel: "Bước tiếp: S&OP",
    ctaRoute: "/sop",
    hint: "Forecast đã sẵn sàng cho phiên consensus tháng tới.",
  },
  "sop.locked": {
    label: "S&OP khóa",
    ctaLabel: "Bước tiếp: Booking",
    ctaRoute: "/supply",
    hint: "Consensus v3 đã chốt — chuyển sang đặt commitment với Nhà Máy.",
  },
  "supply.booking-done": {
    label: "Booking xong",
    ctaLabel: "Cam kết NM",
    ctaRoute: "/hub",
    hint: "Đơn đặt đã gửi NM — theo dõi commitment & reconciliation.",
  },
  "hub.reviewed": {
    label: "Hub cập nhật",
    ctaLabel: "Kiểm tra Gap",
    ctaRoute: "/gap-scenario",
    hint: "Hub commitment đã review — kiểm tra GAP scenarios trước khi release.",
  },
  "gap.resolved": {
    label: "Flow 1 xong. Flow 2 tự động 23:00",
    ctaLabel: "Sang Sync",
    ctaRoute: "/sync",
    hint: "Hết tháng kế hoạch. Vận hành ngày sẽ pull data lúc 23:00.",
  },
  "sync.fresh": {
    label: "Data fresh",
    ctaLabel: "CN điều chỉnh",
    ctaRoute: "/cn-portal",
    hint: "Tất cả nguồn dữ liệu đã đồng bộ — Chi Nhánh có thể nhập điều chỉnh.",
  },
  "cn-portal.adjusted": {
    label: "CN adjust",
    ctaLabel: "Xem DRP",
    ctaRoute: "/drp",
    hint: "Điều chỉnh CN đã ghi nhận — chạy DRP để phân bổ lại.",
  },
  "drp.viewed": {
    label: "DRP xong",
    ctaLabel: "Phân bổ",
    ctaRoute: "/allocation",
    hint: "DRP layer 1 đã review — sang Allocation để phân bổ chi tiết.",
  },
  "allocation.done": {
    label: "Phân bổ xong",
    ctaLabel: "Đóng hàng",
    ctaRoute: "/transport",
    hint: "Allocation đã ký — chuyển sang đóng hàng & vận chuyển.",
  },
  "transport.done": {
    label: "Đóng hàng xong",
    ctaLabel: "Duyệt PO",
    ctaRoute: "/orders",
    hint: "Lô hàng đã đóng — duyệt PO để gửi NM.",
  },
  "orders.confirmed": {
    label: "PO gửi NM",
    ctaLabel: "Theo dõi",
    ctaRoute: "/orders",
    hint: "PO đã confirm — theo dõi tiến độ giao hàng ở tab PO.",
  },
  "orders.received": {
    label: "Hàng nhận",
    ctaLabel: "Phản hồi",
    ctaRoute: "/monitoring",
    hint: "Hàng đã nhận — kiểm tra accuracy & feedback ở Monitoring.",
  },
  "monitoring.viewed": {
    label: "Closed loop. Chu kỳ mới.",
    ctaLabel: "Bắt đầu chu kỳ mới",
    ctaRoute: "/demand",
    hint: "Đã đóng vòng lặp tháng — bắt đầu chu kỳ Demand mới.",
    icon: "🔄",
  },
};

interface NextStepCtx {
  completed: Set<NextStepKey>;
  isDone: (key: NextStepKey) => boolean;
  markDone: (key: NextStepKey) => void;
  dismiss: (key: NextStepKey) => void;
  reset: (key: NextStepKey) => void;
}

const Ctx = createContext<NextStepCtx | null>(null);
const STORAGE_KEY = "lov:nextstep:completed";
const DISMISS_KEY = "lov:nextstep:dismissed";

export function NextStepProvider({ children }: { children: ReactNode }) {
  const [completed, setCompleted] = useState<Set<NextStepKey>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw) as NextStepKey[]) : new Set();
    } catch { return new Set(); }
  });
  const [dismissed, setDismissed] = useState<Set<NextStepKey>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = sessionStorage.getItem(DISMISS_KEY);
      return raw ? new Set(JSON.parse(raw) as NextStepKey[]) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...completed])); } catch { /* ignore */ }
  }, [completed]);
  useEffect(() => {
    try { sessionStorage.setItem(DISMISS_KEY, JSON.stringify([...dismissed])); } catch { /* ignore */ }
  }, [dismissed]);

  const isDone = useCallback((key: NextStepKey) => completed.has(key) && !dismissed.has(key), [completed, dismissed]);
  const markDone = useCallback((key: NextStepKey) => {
    setCompleted(prev => prev.has(key) ? prev : new Set(prev).add(key));
    setDismissed(prev => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev); next.delete(key); return next;
    });
  }, []);
  const dismiss = useCallback((key: NextStepKey) => {
    setDismissed(prev => prev.has(key) ? prev : new Set(prev).add(key));
  }, []);
  const reset = useCallback((key: NextStepKey) => {
    setCompleted(prev => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev); next.delete(key); return next;
    });
    setDismissed(prev => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev); next.delete(key); return next;
    });
  }, []);

  const value = useMemo(() => ({ completed, isDone, markDone, dismiss, reset }), [completed, isDone, markDone, dismiss, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNextStep() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNextStep must be used inside <NextStepProvider>");
  return v;
}

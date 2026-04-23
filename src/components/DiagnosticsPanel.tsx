import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Network,
  Trash2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type ConsoleLevel = "error" | "warn" | "info";
interface ConsoleEntry {
  id: number;
  level: ConsoleLevel;
  message: string;
  time: number;
}
interface NetworkEntry {
  id: number;
  url: string;
  method: string;
  status: number;
  ok: boolean;
  durationMs: number;
  time: number;
  error?: string;
}

/* ─── Module-level ring buffers (so we capture BEFORE the panel mounts) ──── */
const MAX_LOGS = 50;
const consoleBuf: ConsoleEntry[] = [];
const networkBuf: NetworkEntry[] = [];
const listeners = new Set<() => void>();
let nextId = 1;
let installed = false;

function notify() {
  listeners.forEach((l) => l());
}

function pushConsole(level: ConsoleLevel, args: unknown[]) {
  const message = args
    .map((a) => {
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      if (typeof a === "object") {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(" ");
  consoleBuf.unshift({ id: nextId++, level, message, time: Date.now() });
  if (consoleBuf.length > MAX_LOGS) consoleBuf.pop();
  notify();
}

function pushNetwork(entry: Omit<NetworkEntry, "id">) {
  networkBuf.unshift({ id: nextId++, ...entry });
  if (networkBuf.length > MAX_LOGS) networkBuf.pop();
  notify();
}

function installInterceptors() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // ── console patch ──
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  console.error = (...args: unknown[]) => {
    pushConsole("error", args);
    origError(...args);
  };
  console.warn = (...args: unknown[]) => {
    pushConsole("warn", args);
    origWarn(...args);
  };

  // ── window error handlers ──
  window.addEventListener("error", (e) => {
    pushConsole("error", [e.message || "Uncaught error", e.filename, e.lineno]);
  });
  window.addEventListener("unhandledrejection", (e) => {
    pushConsole("error", ["Unhandled promise rejection:", e.reason]);
  });

  // ── fetch patch ──
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const start = performance.now();
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    try {
      const res = await origFetch(input, init);
      const durationMs = Math.round(performance.now() - start);
      pushNetwork({
        url,
        method,
        status: res.status,
        ok: res.ok,
        durationMs,
        time: Date.now(),
      });
      return res;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      pushNetwork({
        url,
        method,
        status: 0,
        ok: false,
        durationMs,
        time: Date.now(),
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };
}

// Install immediately on import.
installInterceptors();

/* ─── Hook for subscribing ───────────────────────────────────────────────── */
function useDiagnostics() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return { console: consoleBuf, network: networkBuf };
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function shortUrl(u: string): string {
  try {
    const parsed = new URL(u, window.location.origin);
    const host = parsed.hostname.replace(/^.*?\.([^.]+\.[^.]+)$/, "$1");
    const path = parsed.pathname.length > 50 ? "…" + parsed.pathname.slice(-48) : parsed.pathname;
    return `${host}${path}${parsed.search ? "?…" : ""}`;
  } catch {
    return u.length > 60 ? u.slice(0, 60) + "…" : u;
  }
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("vi-VN", { hour12: false });
}

/* ─── Component ──────────────────────────────────────────────────────────── */
interface Props {
  /** Page slug for context in copy/export. */
  scope?: string;
  /** Default open. */
  defaultOpen?: boolean;
}

export function DiagnosticsPanel({ scope = "page", defaultOpen = false }: Props) {
  const { console: consoleLogs, network: networkLogs } = useDiagnostics();
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<"console" | "network">("console");
  const [onlyErrors, setOnlyErrors] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const consoleErrors = consoleLogs.filter((l) => l.level === "error").length;
  const consoleWarns = consoleLogs.filter((l) => l.level === "warn").length;
  const networkFailures = networkLogs.filter((n) => !n.ok).length;
  const totalIssues = consoleErrors + networkFailures;

  const visibleConsole = onlyErrors ? consoleLogs.filter((l) => l.level === "error") : consoleLogs;
  const visibleNetwork = onlyErrors ? networkLogs.filter((n) => !n.ok) : networkLogs;

  const handleClear = () => {
    consoleBuf.length = 0;
    networkBuf.length = 0;
    notify();
  };

  const handleCopy = async () => {
    const lines = [
      `=== Diagnostics — scope: ${scope} — ${new Date().toISOString()} ===`,
      `URL: ${window.location.href}`,
      `User agent: ${navigator.userAgent}`,
      ``,
      `--- Console (${consoleLogs.length}) ---`,
      ...consoleLogs.map((l) => `[${fmtTime(l.time)}] ${l.level.toUpperCase()}: ${l.message}`),
      ``,
      `--- Network (${networkLogs.length}) ---`,
      ...networkLogs.map(
        (n) =>
          `[${fmtTime(n.time)}] ${n.method} ${n.status} (${n.durationMs}ms) ${n.url}${n.error ? ` — ${n.error}` : ""}`,
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      const { toast } = await import("sonner");
      toast.success("Đã copy diagnostics vào clipboard");
    } catch {
      const { toast } = await import("sonner");
      toast.error("Không thể copy. Hãy chọn thủ công.");
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-card border bg-surface-2 overflow-hidden transition-colors",
        totalIssues > 0 ? "border-danger/30" : "border-surface-3",
      )}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-1/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cn(
              "h-7 w-7 rounded-button flex items-center justify-center flex-shrink-0",
              totalIssues > 0 ? "bg-danger/10 text-danger" : "bg-success/10 text-success",
            )}
          >
            {totalIssues > 0 ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2 text-table-sm font-semibold text-text-1">
              Diagnostics
              <span className="text-caption font-normal text-text-3">/{scope}</span>
            </div>
            <div className="flex items-center gap-2 text-caption text-text-3 mt-0.5">
              {totalIssues === 0 ? (
                <span>Không có lỗi gần đây</span>
              ) : (
                <>
                  {consoleErrors > 0 && (
                    <span className="inline-flex items-center gap-1 text-danger">
                      <XCircle className="h-3 w-3" /> {consoleErrors} console error
                    </span>
                  )}
                  {networkFailures > 0 && (
                    <span className="inline-flex items-center gap-1 text-danger">
                      <Network className="h-3 w-3" /> {networkFailures} network fail
                    </span>
                  )}
                  {consoleWarns > 0 && (
                    <span className="inline-flex items-center gap-1 text-warning">
                      <AlertTriangle className="h-3 w-3" /> {consoleWarns} warn
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-text-3 flex-shrink-0">
          <Activity className="h-3.5 w-3.5" />
          <span className="text-caption">
            {consoleLogs.length + networkLogs.length} mục
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-surface-3 animate-fade-in">
          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-surface-1/30 border-b border-surface-3">
            <div className="flex items-center gap-1">
              {(["console", "network"] as const).map((t) => {
                const count = t === "console" ? consoleLogs.length : networkLogs.length;
                const errs = t === "console" ? consoleErrors : networkFailures;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-button text-table-sm font-medium transition-colors",
                      tab === t
                        ? "bg-surface-0 text-text-1 border border-surface-3"
                        : "text-text-3 hover:text-text-1",
                    )}
                  >
                    {t === "console" ? "Console" : "Network"}
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-caption tabular-nums",
                        errs > 0
                          ? "bg-danger/15 text-danger"
                          : "bg-surface-3 text-text-3",
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-1.5 text-caption text-text-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyErrors}
                  onChange={(e) => setOnlyErrors(e.target.checked)}
                  className="h-3 w-3 rounded accent-primary"
                />
                Chỉ lỗi
              </label>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-button text-caption text-text-2 hover:text-text-1 hover:bg-surface-3"
                title="Copy report"
              >
                <Copy className="h-3 w-3" /> Copy
              </button>
              <button
                onClick={handleClear}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-button text-caption text-text-2 hover:text-danger hover:bg-danger/10"
                title="Xoá log"
              >
                <Trash2 className="h-3 w-3" /> Xoá
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-72 overflow-y-auto">
            {tab === "console" ? (
              visibleConsole.length === 0 ? (
                <EmptyState
                  ok={consoleErrors === 0}
                  text={
                    consoleErrors === 0
                      ? "Console sạch — chưa có error/warning."
                      : "Bỏ tick 'Chỉ lỗi' để xem warning + info."
                  }
                />
              ) : (
                <ul className="divide-y divide-surface-3">
                  {visibleConsole.map((l) => (
                    <li
                      key={l.id}
                      className={cn(
                        "px-4 py-2 text-table-sm flex items-start gap-2",
                        l.level === "error" && "bg-danger-bg/40",
                        l.level === "warn" && "bg-warning-bg/40",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex-shrink-0 inline-flex h-5 w-12 items-center justify-center rounded text-[10px] font-bold uppercase",
                          l.level === "error" && "bg-danger/15 text-danger",
                          l.level === "warn" && "bg-warning/15 text-warning",
                          l.level === "info" && "bg-info/15 text-info",
                        )}
                      >
                        {l.level}
                      </span>
                      <span className="text-caption text-text-3 flex-shrink-0 tabular-nums w-20 mt-0.5">
                        {fmtTime(l.time)}
                      </span>
                      <span className="text-text-1 break-words font-mono text-[12px] leading-snug min-w-0">
                        {l.message}
                      </span>
                    </li>
                  ))}
                </ul>
              )
            ) : visibleNetwork.length === 0 ? (
              <EmptyState
                ok={networkFailures === 0}
                text={
                  networkFailures === 0
                    ? "Network sạch — chưa có request fail."
                    : "Bỏ tick 'Chỉ lỗi' để xem mọi request."
                }
              />
            ) : (
              <ul className="divide-y divide-surface-3">
                {visibleNetwork.map((n) => (
                  <li
                    key={n.id}
                    className={cn(
                      "px-4 py-2 text-table-sm flex items-start gap-2",
                      !n.ok && "bg-danger-bg/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex-shrink-0 inline-flex h-5 w-12 items-center justify-center rounded text-[10px] font-bold tabular-nums",
                        n.status === 0
                          ? "bg-danger/15 text-danger"
                          : n.status >= 500
                            ? "bg-danger/15 text-danger"
                            : n.status >= 400
                              ? "bg-warning/15 text-warning"
                              : "bg-success/15 text-success",
                      )}
                    >
                      {n.status || "ERR"}
                    </span>
                    <span className="text-caption text-text-3 flex-shrink-0 tabular-nums w-20 mt-0.5">
                      {fmtTime(n.time)}
                    </span>
                    <span className="text-caption font-mono text-text-3 flex-shrink-0 mt-0.5 w-12">
                      {n.method}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-text-1 font-mono text-[12px] leading-snug break-all"
                        title={n.url}
                      >
                        {shortUrl(n.url)}
                      </div>
                      {n.error && (
                        <div className="text-caption text-danger mt-0.5">{n.error}</div>
                      )}
                    </div>
                    <span className="text-caption text-text-3 flex-shrink-0 tabular-nums mt-0.5">
                      {n.durationMs}ms
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-4 py-2 bg-surface-1/20 border-t border-surface-3 text-caption text-text-3">
            Diagnostics chỉ chạy ở client • Buffer giữ {MAX_LOGS} mục gần nhất • Dùng "Copy" để gửi
            cho support
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="px-4 py-8 flex flex-col items-center text-center gap-2">
      {ok ? (
        <CheckCircle2 className="h-6 w-6 text-success/70" />
      ) : (
        <AlertCircle className="h-6 w-6 text-text-3" />
      )}
      <span className="text-table-sm text-text-3">{text}</span>
    </div>
  );
}

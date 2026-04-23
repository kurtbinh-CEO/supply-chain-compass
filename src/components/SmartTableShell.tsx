import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Maximize2,
  Minimize2,
  Filter,
  X,
  Search,
  Columns3,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  SmartTableShell — generic wrapper that adds these capabilities to ANY      */
/*  existing <table> markup, without rewriting its rows:                       */
/*    1. Column-resize handles (drag right edge of <th>)                       */
/*    2. Per-column filter row (text contains)                                 */
/*    3. Global search box                                                     */
/*    4. Fullscreen toggle (portal to <body> overlay)                          */
/*                                                                             */
/*  Usage:                                                                     */
/*    <SmartTableShell                                                          */
/*       title="SOP Consensus"                                                  */
/*       columns={["CN","v0","v1","v2","v3","AOP","FVA"]}                       */
/*       storageKey="sop-consensus">                                            */
/*       {(ctx) => <table className={ctx.tableClass}>...</table>}               */
/*    </SmartTableShell>                                                        */
/*                                                                             */
/*  The render-prop receives `ctx` with:                                        */
/*    - tableClass: classes to apply to <table>                                 */
/*    - columnWidths: number[] (px per column, in order)                        */
/*    - filters: string[]   (text per column)                                   */
/*    - globalSearch: string                                                    */
/*    - matchesRow(values:string[]) => boolean — convenience                    */
/* ─────────────────────────────────────────────────────────────────────────── */

export interface SmartTableContext {
  tableClass: string;
  columnWidths: number[];
  filters: string[];
  globalSearch: string;
  matchesRow: (values: (string | number | undefined | null)[]) => boolean;
  isFullscreen: boolean;
}

interface Props {
  title: string;
  columns: string[];
  /** Default px width per column. Defaults to 160. */
  defaultWidths?: number[];
  /** Persistent key for resize widths + filters in sessionStorage */
  storageKey?: string;
  /** Optional toolbar slot rendered between title and controls */
  toolbar?: React.ReactNode;
  className?: string;
  children: (ctx: SmartTableContext) => React.ReactNode;
}

export function SmartTableShell({
  title,
  columns,
  defaultWidths,
  storageKey,
  toolbar,
  className,
  children,
}: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [filters, setFilters] = useState<string[]>(() => columns.map(() => ""));
  const [widths, setWidths] = useState<number[]>(() => {
    if (storageKey) {
      try {
        const raw = sessionStorage.getItem(`smartTable:w:${storageKey}`);
        if (raw) {
          const parsed = JSON.parse(raw) as number[];
          if (Array.isArray(parsed) && parsed.length === columns.length) return parsed;
        }
      } catch {}
    }
    return columns.map((_, i) => defaultWidths?.[i] ?? 160);
  });

  // persist widths
  useEffect(() => {
    if (!storageKey) return;
    try {
      sessionStorage.setItem(`smartTable:w:${storageKey}`, JSON.stringify(widths));
    } catch {}
  }, [widths, storageKey]);

  // ESC closes fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  /* ── column resize ── */
  const dragRef = useRef<{ idx: number; startX: number; startW: number } | null>(null);

  const onResizeStart = (idx: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { idx, startX: e.clientX, startW: widths[idx] };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = ev.clientX - dragRef.current.startX;
      const next = Math.max(60, Math.min(700, dragRef.current.startW + delta));
      setWidths((prev) => {
        const arr = prev.slice();
        arr[dragRef.current!.idx] = next;
        return arr;
      });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
  };

  const resetWidths = () => setWidths(columns.map((_, i) => defaultWidths?.[i] ?? 160));

  const matchesRow = useMemo(
    () => (values: (string | number | undefined | null)[]) => {
      // global search
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase();
        const hay = values.map((v) => String(v ?? "").toLowerCase()).join(" │ ");
        if (!hay.includes(q)) return false;
      }
      // per-column filters
      for (let i = 0; i < filters.length; i++) {
        const f = filters[i].trim().toLowerCase();
        if (!f) continue;
        if (!String(values[i] ?? "").toLowerCase().includes(f)) return false;
      }
      return true;
    },
    [globalSearch, filters],
  );

  const ctx: SmartTableContext = {
    tableClass: "w-full text-table-sm",
    columnWidths: widths,
    filters,
    globalSearch,
    matchesRow,
    isFullscreen,
  };

  const activeFilters = filters.filter((f) => f.trim()).length + (globalSearch.trim() ? 1 : 0);

  const Header = (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-surface-3 bg-surface-1/40">
      <div className="flex items-center gap-3 min-w-0">
        <h3 className="font-display text-section-header text-text-1 truncate">{title}</h3>
        {toolbar}
      </div>
      <div className="flex items-center gap-2">
        {/* Global search */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-text-3 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            placeholder="Tìm…"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 w-44 rounded-button border border-surface-3 bg-surface-0 text-table-sm text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setFiltersOpen((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-button border px-2.5 py-1.5 text-table-sm font-medium transition-colors",
            filtersOpen || activeFilters > 0
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-surface-3 text-text-2 hover:text-text-1",
          )}
          title="Lọc theo cột"
        >
          <Filter className="h-3.5 w-3.5" />
          Lọc
          {activeFilters > 0 && (
            <span className="rounded-full bg-primary text-primary-foreground px-1.5 text-caption tabular-nums">
              {activeFilters}
            </span>
          )}
        </button>
        <button
          onClick={resetWidths}
          className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 px-2.5 py-1.5 text-table-sm text-text-2 hover:text-text-1"
          title="Reset độ rộng cột"
        >
          <Columns3 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setIsFullscreen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 px-2.5 py-1.5 text-table-sm text-text-2 hover:text-text-1"
          title={isFullscreen ? "Thu nhỏ (Esc)" : "Phóng to toàn màn hình"}
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );

  const FilterRow = filtersOpen && (
    <div className="flex gap-2 px-4 py-2 border-b border-surface-3 bg-surface-1/20 overflow-x-auto">
      {columns.map((col, i) => (
        <div key={i} className="shrink-0" style={{ width: widths[i] }}>
          <input
            placeholder={col || "—"}
            value={filters[i]}
            onChange={(e) => {
              const next = filters.slice();
              next[i] = e.target.value;
              setFilters(next);
            }}
            className="w-full px-2 py-1 rounded border border-surface-3 bg-surface-0 text-caption text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      ))}
      {activeFilters > 0 && (
        <button
          onClick={() => {
            setFilters(columns.map(() => ""));
            setGlobalSearch("");
          }}
          className="shrink-0 inline-flex items-center gap-1 text-caption text-text-3 hover:text-danger px-2"
        >
          <RotateCcw className="h-3 w-3" /> Xoá lọc
        </button>
      )}
    </div>
  );

  const ColGroup = (
    <colgroup>
      {widths.map((w, i) => (
        <col key={i} style={{ width: `${w}px` }} />
      ))}
    </colgroup>
  );

  // Resize handles overlay (positioned over the rendered <table>)
  const ResizeHandles = (
    <div className="pointer-events-none absolute inset-0">
      {/* Each handle anchored at right edge of column based on cumulative widths */}
      {widths.map((w, i) => {
        const left = widths.slice(0, i + 1).reduce((a, b) => a + b, 0);
        return (
          <div
            key={i}
            onMouseDown={onResizeStart(i)}
            className="pointer-events-auto absolute top-0 bottom-0 w-1.5 -ml-1 cursor-col-resize hover:bg-primary/40 transition-colors"
            style={{ left: `${left}px` }}
            title={`Kéo để chỉnh độ rộng cột ${columns[i]}`}
          />
        );
      })}
    </div>
  );

  const TableArea = (
    <div className={cn("relative", isFullscreen ? "flex-1 overflow-auto" : "overflow-x-auto")}>
      {/* Pass colgroup + resize via portal-style: we render colgroup as a <table> trick */}
      <div className="relative inline-block min-w-full align-top">
        {/* The actual user-supplied table renders here; we inject colgroup via a wrapper */}
        <SmartTableInjector colWidths={widths}>{children(ctx)}</SmartTableInjector>
        {ResizeHandles}
      </div>
    </div>
  );

  const Frame = (
    <div
      className={cn(
        "rounded-card border border-surface-3 bg-surface-2 overflow-hidden flex flex-col",
        className,
      )}
    >
      {Header}
      {FilterRow}
      {TableArea}
    </div>
  );

  if (!isFullscreen) return Frame;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col p-4 animate-fade-in">
      <div className="rounded-card border border-surface-3 bg-surface-2 shadow-2xl flex-1 flex flex-col overflow-hidden">
        {Header}
        {FilterRow}
        {TableArea}
      </div>
      <button
        onClick={() => setIsFullscreen(false)}
        className="absolute top-6 right-6 rounded-full bg-surface-2 border border-surface-3 p-2 hover:bg-surface-3"
        title="Đóng (Esc)"
      >
        <X className="h-4 w-4 text-text-1" />
      </button>
    </div>,
    document.body,
  );
}

/* Wraps user-supplied table and tries to inject a <colgroup> for width control.
   If the child already has a colgroup, we leave it alone. */
function SmartTableInjector({
  colWidths,
  children,
}: {
  colWidths: number[];
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const tables = root.querySelectorAll("table");
    tables.forEach((tbl) => {
      // Only first-level table (skip nested)
      if (tbl.parentElement?.closest("table")) return;
      let colgroup = tbl.querySelector(":scope > colgroup");
      if (!colgroup) {
        colgroup = document.createElement("colgroup");
        tbl.insertBefore(colgroup, tbl.firstChild);
      }
      // Sync col children
      const existing = colgroup.querySelectorAll("col");
      const need = colWidths.length;
      while (existing.length < need) {
        colgroup.appendChild(document.createElement("col"));
      }
      while (colgroup.children.length > need) {
        colgroup.removeChild(colgroup.lastChild!);
      }
      Array.from(colgroup.children).forEach((col, i) => {
        (col as HTMLElement).style.width = `${colWidths[i]}px`;
      });
      (tbl as HTMLElement).style.tableLayout = "fixed";
      (tbl as HTMLElement).style.minWidth = `${colWidths.reduce((a, b) => a + b, 0)}px`;
    });
  }, [colWidths, children]);

  return <div ref={ref}>{children}</div>;
}

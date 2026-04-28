/**
 * SmartTable — bảng dữ liệu reusable cho toàn app.
 *
 * Tính năng built-in:
 *  - Density toggle (Thu gọn / Bình thường / Mở rộng) — persist localStorage
 *  - Fullscreen toggle (⌘⇧F)
 *  - Column show/hide settings — persist localStorage
 *  - Sort (asc/desc/none) — numeric + locale VN
 *  - Per-column filter (text search hoặc enum checkbox)
 *  - Column resize (drag) — persist localStorage
 *  - Drill-down expand inline (auto-expand theo điều kiện)
 *  - Export CSV / PDF (window.print)
 *  - Footer summary row (sticky)
 *  - Responsive: ẩn columns priority="low" trên mobile
 *
 * Mọi label = tiếng Việt.
 */
import * as React from "react";
import {
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Search,
  Filter as FilterIcon,
  Settings2,
  Download,
  Maximize2,
  Minimize2,
  X,
  RotateCcw,
  Rows3,
  Rows2,
  Rows4,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

// ============================================================================
// Types
// ============================================================================

export type SmartTableDensity = "compact" | "normal" | "wide";
export type SmartTableAlign = "left" | "right" | "center";
export type SmartTablePriority = "high" | "medium" | "low";
export type SmartTableFilterType = "text" | "enum" | "none";

export interface SmartTableColumn<T = any> {
  key: string;
  label: string;
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  hideable?: boolean;
  align?: SmartTableAlign;
  priority?: SmartTablePriority;
  /** Loại filter cho cột — mặc định "none" */
  filter?: SmartTableFilterType;
  /** Options cho filter type "enum" */
  filterOptions?: { value: string; label: string }[];
  /** Hàm lấy giá trị raw để sort/filter/export */
  accessor?: (row: T) => string | number | null | undefined;
  /** Hàm render JSX cho cell */
  render?: (row: T) => React.ReactNode;
  /** Đánh dấu là cột số → dùng font mono, align right mặc định */
  numeric?: boolean;
}

export interface SmartTableEmptyState {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; route?: string; onClick?: () => void };
}

export interface SmartTableProps<T = any> {
  columns: SmartTableColumn<T>[];
  data: T[];
  defaultDensity?: SmartTableDensity;
  drillDown?: (row: T) => React.ReactNode | null;
  autoExpandWhen?: (row: T) => boolean;
  onRowClick?: (row: T) => void;
  /**
   * Guard chạy trước khi đóng (collapse) một row đang mở.
   * Trả `false` để chặn đóng (parent sẽ hiển thị confirm UI riêng).
   * Trả `true`/`undefined` để cho phép đóng như bình thường.
   */
  beforeCollapse?: (row: T) => boolean | undefined;
  emptyMessage?: string;
  /** Trạng thái loading — hiện shimmer rows */
  isLoading?: boolean;
  /** Empty state khi data.length === 0 && !isLoading */
  emptyState?: SmartTableEmptyState;
  /** ID duy nhất cho screen — dùng cho localStorage persist */
  screenId: string;
  /** Hàm tính severity cho row (gắn data-severity) */
  rowSeverity?: (row: T) => "shortage" | "watch" | "overdue" | "stale" | "ok" | undefined;
  /** Hàm tính ID stable cho row (cho expand state). Mặc định: index. */
  getRowId?: (row: T, index: number) => string;
  /** Dòng tổng cuối bảng */
  summaryRow?: Partial<Record<string, React.ReactNode>>;
  /** Tiêu đề bảng (hiện trên toolbar) */
  title?: string;
  /** Tên file export (không cần đuôi) */
  exportFilename?: string;
  className?: string;
}

// ============================================================================
// Density specs
// ============================================================================

const DENSITY_SPEC: Record<
  SmartTableDensity,
  { label: string; rowH: string; cellPad: string; fontSize: string; headerH: string }
> = {
  compact: {
    label: "Thu gọn",
    rowH: "h-7",
    cellPad: "px-1.5 py-1",
    fontSize: "text-[11px]",
    headerH: "h-7",
  },
  normal: {
    label: "Bình thường",
    rowH: "h-9",
    cellPad: "px-2 py-1.5",
    fontSize: "text-[12px]",
    headerH: "h-9",
  },
  wide: {
    label: "Mở rộng",
    rowH: "h-11",
    cellPad: "px-3 py-2",
    fontSize: "text-[13px]",
    headerH: "h-10",
  },
};

// ============================================================================
// LocalStorage helpers
// ============================================================================

const ls = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota errors */
    }
  },
  remove(key: string) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

// ============================================================================
// Mobile detection (lightweight, no extra hook to avoid coupling)
// ============================================================================

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}

// ============================================================================
// Sort + filter helpers
// ============================================================================

type SortDir = "asc" | "desc" | null;

interface SortState {
  key: string | null;
  dir: SortDir;
}

type FilterValue =
  | { kind: "text"; value: string }
  | { kind: "enum"; values: string[] };

type FilterMap = Record<string, FilterValue>;

function rawValue<T>(col: SmartTableColumn<T>, row: T): string | number | null | undefined {
  if (col.accessor) return col.accessor(row);
  // Fallback: read by key
  return (row as any)?.[col.key];
}

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined,
  numeric: boolean,
): number {
  if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
  if (b === null || b === undefined) return -1;
  if (numeric) {
    const an = typeof a === "number" ? a : parseFloat(String(a).replace(/[^\d.-]/g, ""));
    const bn = typeof b === "number" ? b : parseFloat(String(b).replace(/[^\d.-]/g, ""));
    if (Number.isNaN(an) || Number.isNaN(bn)) return String(a).localeCompare(String(b), "vi");
    return an - bn;
  }
  return String(a).localeCompare(String(b), "vi");
}

// ============================================================================
// Export helpers
// ============================================================================

function escapeCsv(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/["\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// ============================================================================
// Component
// ============================================================================

export function SmartTable<T = any>({
  columns,
  data,
  defaultDensity = "normal",
  drillDown,
  autoExpandWhen,
  onRowClick,
  emptyMessage = "Không có dữ liệu",
  isLoading = false,
  emptyState,
  screenId,
  rowSeverity,
  getRowId,
  summaryRow,
  title,
  exportFilename,
  className,
}: SmartTableProps<T>) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  // ----- Storage keys -----
  const kDensity = `scp-table-${screenId}-density`;
  const kColumns = `scp-table-${screenId}-columns`;
  const kWidths = `scp-table-${screenId}-widths`;
  const kSort = `scp-table-${screenId}-sort`;

  // ----- Density -----
  const [density, setDensity] = React.useState<SmartTableDensity>(() =>
    ls.get<SmartTableDensity>(kDensity, defaultDensity),
  );
  React.useEffect(() => {
    ls.set(kDensity, density);
  }, [density, kDensity]);
  const effDensity: SmartTableDensity = isMobile ? "compact" : density;
  const ds = DENSITY_SPEC[effDensity];

  // ----- Hidden columns (set of keys) -----
  const [hidden, setHidden] = React.useState<Set<string>>(() => {
    const arr = ls.get<string[]>(kColumns, []);
    return new Set(arr);
  });
  React.useEffect(() => {
    ls.set(kColumns, Array.from(hidden));
  }, [hidden, kColumns]);

  // ----- Column widths override -----
  const [widths, setWidths] = React.useState<Record<string, number>>(() =>
    ls.get<Record<string, number>>(kWidths, {}),
  );
  React.useEffect(() => {
    ls.set(kWidths, widths);
  }, [widths, kWidths]);

  // ----- Sort -----
  const [sort, setSort] = React.useState<SortState>(() =>
    ls.get<SortState>(kSort, { key: null, dir: null }),
  );
  React.useEffect(() => {
    ls.set(kSort, sort);
  }, [sort, kSort]);

  // ----- Filters -----
  const [filters, setFilters] = React.useState<FilterMap>({});
  const activeFilterCount = Object.values(filters).reduce((n, f) => {
    if (f.kind === "text" && f.value.trim()) return n + 1;
    if (f.kind === "enum" && f.values.length > 0) return n + 1;
    return n;
  }, 0);

  // ----- Fullscreen -----
  const [fullscreen, setFullscreen] = React.useState(false);
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) {
        setFullscreen(false);
        return;
      }
      // ⌘⇧F or Ctrl+Shift+F
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setFullscreen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fullscreen]);

  // ----- Expanded rows -----
  const rowIdOf = React.useCallback(
    (row: T, index: number) => (getRowId ? getRowId(row, index) : String(index)),
    [getRowId],
  );
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  // Auto-expand when condition met (run on data change)
  React.useEffect(() => {
    if (!drillDown || !autoExpandWhen) return;
    const next = new Set<string>();
    data.forEach((row, i) => {
      if (autoExpandWhen(row)) next.add(rowIdOf(row, i));
    });
    setExpanded((prev) => {
      // Merge: keep user-expanded rows
      const merged = new Set(prev);
      next.forEach((id) => merged.add(id));
      return merged;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, drillDown, autoExpandWhen]);

  // ----- Visible columns (after hide + mobile priority) -----
  const visibleColumns = React.useMemo(() => {
    return columns.filter((c) => {
      if (hidden.has(c.key)) return false;
      if (isMobile && c.priority === "low") return false;
      return true;
    });
  }, [columns, hidden, isMobile]);

  // ----- Filter + sort data -----
  const processedData = React.useMemo(() => {
    let rows = data;

    // Filter
    if (activeFilterCount > 0) {
      rows = rows.filter((row) => {
        for (const [key, f] of Object.entries(filters)) {
          const col = columns.find((c) => c.key === key);
          if (!col) continue;
          const v = rawValue(col, row);
          if (f.kind === "text") {
            if (!f.value.trim()) continue;
            const needle = f.value.trim().toLowerCase();
            const hay = v === null || v === undefined ? "" : String(v).toLowerCase();
            if (!hay.includes(needle)) return false;
          } else if (f.kind === "enum") {
            if (f.values.length === 0) continue;
            const sv = v === null || v === undefined ? "" : String(v);
            if (!f.values.includes(sv)) return false;
          }
        }
        return true;
      });
    }

    // Sort
    if (sort.key && sort.dir) {
      const col = columns.find((c) => c.key === sort.key);
      if (col) {
        const numeric = !!col.numeric;
        rows = [...rows].sort((a, b) => {
          const av = rawValue(col, a);
          const bv = rawValue(col, b);
          const c = compareValues(av, bv, numeric);
          return sort.dir === "asc" ? c : -c;
        });
      }
    }
    return rows;
  }, [data, columns, filters, sort, activeFilterCount]);

  // ----- Handlers -----
  const toggleSort = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortable) return;
    setSort((s) => {
      if (s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      if (s.dir === "desc") return { key: null, dir: null };
      return { key, dir: "asc" };
    });
  };

  const toggleHidden = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const resetColumns = () => setHidden(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setTextFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: { kind: "text", value } }));
  };
  const setEnumFilter = (key: string, value: string, checked: boolean) => {
    setFilters((prev) => {
      const cur = prev[key];
      const list = cur && cur.kind === "enum" ? [...cur.values] : [];
      const idx = list.indexOf(value);
      if (checked && idx < 0) list.push(value);
      if (!checked && idx >= 0) list.splice(idx, 1);
      return { ...prev, [key]: { kind: "enum", values: list } };
    });
  };
  const clearFilter = (key: string) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // ----- Column resize -----
  const onResizeStart = (key: string, startX: number, startW: number) => {
    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      const next = Math.max(60, startW + dx);
      setWidths((prev) => ({ ...prev, [key]: next }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
  };

  // ----- Export -----
  const filenameBase = exportFilename || screenId || "export";

  const exportCsv = () => {
    const cols = visibleColumns;
    const header = cols.map((c) => escapeCsv(c.label)).join(",");
    const lines = processedData.map((row) =>
      cols
        .map((c) => {
          const v = rawValue(c, row);
          return escapeCsv(v ?? "");
        })
        .join(","),
    );
    const csv = "\uFEFF" + [header, ...lines].join("\n"); // BOM cho Excel
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filenameBase}.csv`);
  };

  const exportPdf = () => {
    // Simple print-based PDF — user dùng "Save as PDF" trong dialog print
    window.print();
  };

  // ============================================================================
  // Render
  // ============================================================================

  const cols = visibleColumns;

  const tableBody = (
    <div
      className={cn(
        "rounded-md border border-border bg-card",
        fullscreen && "fixed inset-0 z-50 rounded-none border-0",
        className,
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {title && (
            <span className="truncate text-sm font-semibold text-foreground">{title}</span>
          )}
          <span className="text-[11px] text-muted-foreground">
            {processedData.length}/{data.length} dòng
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-4 px-1.5 text-[10px]">
                {activeFilterCount} lọc
              </Badge>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Density */}
          <div className="hidden items-center rounded-md border border-border sm:flex">
            <DensityBtn
              active={effDensity === "compact"}
              onClick={() => setDensity("compact")}
              icon={<Rows4 className="h-3.5 w-3.5" />}
              label="Thu gọn"
            />
            <DensityBtn
              active={effDensity === "normal"}
              onClick={() => setDensity("normal")}
              icon={<Rows3 className="h-3.5 w-3.5" />}
              label="Bình thường"
            />
            <DensityBtn
              active={effDensity === "wide"}
              onClick={() => setDensity("wide")}
              icon={<Rows2 className="h-3.5 w-3.5" />}
              label="Mở rộng"
            />
          </div>

          {/* Columns */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]">
                <Settings2 className="h-3.5 w-3.5" />
                Cột
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-[11px]">Hiện / ẩn cột</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns
                .filter((c) => c.hideable !== false)
                .map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={!hidden.has(c.key)}
                    onCheckedChange={() => toggleHidden(c.key)}
                    className="text-[12px]"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetColumns} className="gap-2 text-[12px]">
                <RotateCcw className="h-3.5 w-3.5" />
                Mặc định
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Export */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]">
                <Download className="h-3.5 w-3.5" />
                Xuất
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCsv} className="gap-2 text-[12px]">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Xuất CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportPdf} className="gap-2 text-[12px]">
                <FileText className="h-3.5 w-3.5" />
                Xuất PDF (in)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setFullscreen((v) => !v)}
            title={fullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình (⌘⇧F)"}
          >
            {fullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </Button>
          {fullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setFullscreen(false)}
              title="Đóng"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Table scroll wrapper */}
      <div
        className={cn(
          "relative overflow-auto",
          fullscreen ? "h-[calc(100vh-44px)]" : "max-h-[70vh]",
        )}
      >
        <table data-smart-table="true" className={cn("w-full border-collapse", ds.fontSize)}>
          <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            <tr className={ds.headerH}>
              {drillDown && <th className="w-7 border-b border-border" />}
              {cols.map((c) => {
                const w = widths[c.key] ?? c.width;
                const align = c.align ?? (c.numeric ? "right" : "left");
                const isSorted = sort.key === c.key;
                const f = filters[c.key];
                const hasFilter =
                  (f?.kind === "text" && f.value.trim()) ||
                  (f?.kind === "enum" && f.values.length > 0);
                return (
                  <th
                    key={c.key}
                    style={{ width: w, minWidth: c.minWidth ?? 60 }}
                    className={cn(
                      "relative border-b border-border text-[10px] font-semibold uppercase tracking-[0.3px] text-muted-foreground",
                      ds.cellPad,
                      align === "right" && "text-right",
                      align === "center" && "text-center",
                      align === "left" && "text-left",
                      hasFilter && "bg-primary/5",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        align === "right" && "justify-end",
                        align === "center" && "justify-center",
                      )}
                    >
                      {c.sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                        >
                          <span>{c.label}</span>
                          {isSorted && sort.dir === "asc" && (
                            <ArrowUp className="h-3 w-3" />
                          )}
                          {isSorted && sort.dir === "desc" && (
                            <ArrowDown className="h-3 w-3" />
                          )}
                          {!isSorted && (
                            <ArrowUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </button>
                      ) : (
                        <span>{c.label}</span>
                      )}

                      {c.filter && c.filter !== "none" && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className={cn(
                                "rounded p-0.5 hover:bg-accent",
                                hasFilter && "text-primary",
                              )}
                              title="Lọc"
                            >
                              {c.filter === "text" ? (
                                <Search className="h-3 w-3" />
                              ) : (
                                <FilterIcon className="h-3 w-3" />
                              )}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent
                            align="start"
                            className="w-56 space-y-2 p-3"
                          >
                            <div className="text-[11px] font-medium text-muted-foreground">
                              Lọc {c.label}
                            </div>
                            {c.filter === "text" ? (
                              <Input
                                value={f?.kind === "text" ? f.value : ""}
                                onChange={(e) => setTextFilter(c.key, e.target.value)}
                                placeholder="Tìm…"
                                className="h-7 text-[12px]"
                                autoFocus
                              />
                            ) : (
                              <div className="max-h-48 space-y-1 overflow-auto">
                                {(c.filterOptions ?? []).map((opt) => {
                                  const checked =
                                    f?.kind === "enum" && f.values.includes(opt.value);
                                  return (
                                    <label
                                      key={opt.value}
                                      className="flex cursor-pointer items-center gap-2 text-[12px]"
                                    >
                                      <Checkbox
                                        checked={!!checked}
                                        onCheckedChange={(v) =>
                                          setEnumFilter(c.key, opt.value, !!v)
                                        }
                                      />
                                      <span>{opt.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                            <div className="flex justify-end pt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[11px]"
                                onClick={() => clearFilter(c.key)}
                              >
                                Xoá lọc
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    {/* Resize handle */}
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const startW =
                          (e.currentTarget.parentElement as HTMLElement).offsetWidth;
                        onResizeStart(c.key, e.clientX, startW);
                      }}
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/40"
                    />
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {isLoading && (
              Array.from({ length: 5 }).map((_, rowIdx) => (
                <tr key={`shimmer-${rowIdx}`} className={cn("border-b border-border/60", ds.rowH)}>
                  {drillDown && <td className={cn("w-7", ds.cellPad)} />}
                  {cols.map((c, colIdx) => {
                    const widthPct = 40 + ((rowIdx * 7 + colIdx * 13) % 41); // 40-80%
                    return (
                      <td key={c.key} className={cn("align-middle", ds.cellPad)}>
                        <div
                          className="h-3.5 rounded-sm bg-gradient-to-r from-muted via-muted/40 to-muted animate-pulse"
                          style={{ width: `${widthPct}%`, backgroundSize: "200% 100%" }}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))
            )}

            {!isLoading && processedData.length === 0 && emptyState && (
              <tr>
                <td colSpan={cols.length + (drillDown ? 1 : 0)} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    {emptyState.icon && (
                      <div className="opacity-30 [&>svg]:h-12 [&>svg]:w-12">{emptyState.icon}</div>
                    )}
                    <p className="text-[15px] font-medium text-foreground">{emptyState.title}</p>
                    {emptyState.description && (
                      <p className="text-[13px] text-muted-foreground max-w-md">{emptyState.description}</p>
                    )}
                    {emptyState.action && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          if (emptyState.action?.onClick) emptyState.action.onClick();
                          else if (emptyState.action?.route && !emptyState.action.route.startsWith("#")) {
                            navigate(emptyState.action.route);
                          }
                        }}
                      >
                        {emptyState.action.label}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {!isLoading && processedData.length === 0 && !emptyState && (
              <tr>
                <td
                  colSpan={cols.length + (drillDown ? 1 : 0)}
                  className="p-8 text-center text-[12px] text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}

            {!isLoading && processedData.map((row, idx) => {
              const id = rowIdOf(row, idx);
              const isOpen = expanded.has(id);
              const sev = rowSeverity?.(row);
              const childContent = drillDown ? drillDown(row) : null;
              const canExpand = !!drillDown && childContent !== null;

              return (
                <React.Fragment key={id}>
                  <tr
                    data-severity={sev}
                    onClick={() => {
                      if (canExpand) toggleExpand(id);
                      onRowClick?.(row);
                    }}
                    className={cn(
                      "border-b border-border/60 transition-colors",
                      ds.rowH,
                      (canExpand || onRowClick) && "cursor-pointer hover:bg-muted/40",
                    )}
                  >
                    {drillDown && (
                      <td className={cn("w-7 align-middle", ds.cellPad)}>
                        {canExpand ? (
                          isOpen ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )
                        ) : null}
                      </td>
                    )}
                    {cols.map((c) => {
                      const align = c.align ?? (c.numeric ? "right" : "left");
                      const content = c.render ? c.render(row) : (rawValue(c, row) ?? "");
                      return (
                        <td
                          key={c.key}
                          className={cn(
                            "align-middle",
                            ds.cellPad,
                            align === "right" && "text-right",
                            align === "center" && "text-center",
                            c.numeric && "font-mono tabular-nums",
                          )}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                  {canExpand && isOpen && (
                    <tr className="bg-muted/30">
                      <td
                        colSpan={cols.length + 1}
                        className="border-b border-border/60 p-0"
                      >
                        <div className="ml-6 border-l-2 border-primary/30 py-2 pl-3 pr-2 text-[11px]">
                          <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                            <span>↳ Chi tiết</span>
                          </div>
                          {childContent}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>

          {summaryRow && (
            <tfoot className="sticky bottom-0 bg-muted/70 backdrop-blur">
              <tr className={cn("border-t border-border font-semibold", ds.rowH)}>
                {drillDown && <td className={ds.cellPad} />}
                {cols.map((c) => {
                  const align = c.align ?? (c.numeric ? "right" : "left");
                  return (
                    <td
                      key={c.key}
                      className={cn(
                        "align-middle",
                        ds.cellPad,
                        align === "right" && "text-right",
                        align === "center" && "text-center",
                        c.numeric && "font-mono tabular-nums",
                      )}
                    >
                      {summaryRow[c.key] ?? ""}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );

  return tableBody;
}

// ============================================================================
// Internal — density button
// ============================================================================

function DensityBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon}
    </button>
  );
}

export default SmartTable;

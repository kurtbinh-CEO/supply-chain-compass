/**
 * TableDownloadButton — dropdown xuất dữ liệu bảng (CSV / PDF) với preview modal.
 *
 * Flow: Click nút → menu chọn format + scope → modal preview (tiêu đề, phạm vi,
 * tên file, số dòng, 5–10 dòng đầu) → nút "Tải về" mới thực sự download.
 *
 * API giữ nguyên backward-compatible — xem JSDoc props.
 *
 * Quy ước cell:
 *   - data-export-skip hoặc class .no-export → bỏ qua khi xuất
 *   - data-export-value="..." → ghi đè giá trị hiển thị
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Format = "csv" | "xlsx" | "pdf";
type Scope = "filtered" | "all";

interface Props {
  tableRef?: React.RefObject<HTMLTableElement>;
  targetId?: string;
  filename?: string;
  className?: string;
  label?: string;
  size?: "xs" | "sm";
  formats?: Format[];
  scopeLabel?: string;
  getAllRowsCsv?: () => string;
  pdfTitle?: string;
}

function escapeCsv(v: string): string {
  const needs = /[",\n\r]/.test(v);
  const safe = v.replace(/"/g, '""');
  return needs ? `"${safe}"` : safe;
}

/** Convert table → matrix string[][] (đã loại no-export). */
function tableToMatrix(table: HTMLTableElement): string[][] {
  const out: string[][] = [];
  for (const tr of Array.from(table.rows)) {
    const cells: string[] = [];
    for (const td of Array.from(tr.cells)) {
      if (td.dataset.exportSkip != null || td.classList.contains("no-export")) continue;
      const raw = td.dataset.exportValue ?? td.innerText ?? td.textContent ?? "";
      cells.push(raw.replace(/\s+/g, " ").trim());
    }
    if (cells.length > 0) out.push(cells);
  }
  return out;
}

function matrixToCsv(m: string[][]): string {
  return "\uFEFF" + m.map((r) => r.map(escapeCsv).join(",")).join("\n");
}

/** Parse CSV string → matrix (cho preview "tất cả"). */
function csvToMatrix(csv: string): string[][] {
  const text = csv.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (c !== "\r") cell += c;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Convert "1.234,5" / "1,234.5" / "12%" → number nếu hợp lệ, ngược lại giữ string. */
function coerceCell(v: string): string | number {
  const s = v.trim();
  if (!s) return "";
  // Bỏ qua mã/SKU bắt đầu bằng 0 hoặc chứa ký tự đặc biệt → giữ chuỗi
  if (/^0\d/.test(s)) return v;
  const isPercent = s.endsWith("%");
  const core = (isPercent ? s.slice(0, -1) : s).replace(/\s/g, "");
  // Pattern: chỉ số, dấu phẩy/chấm/âm, có thể trong ngoặc (kế toán)
  const negParen = /^\((.+)\)$/.exec(core);
  const raw = negParen ? "-" + negParen[1] : core;
  if (!/^-?[\d.,]+$/.test(raw)) return v;
  // Heuristic locale: nếu có cả . và , → dấu cuối cùng là phần thập phân
  let normalized = raw;
  const lastDot = raw.lastIndexOf(".");
  const lastComma = raw.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastComma > lastDot) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (lastComma >= 0) {
    // chỉ có dấu phẩy → nếu phần sau dài 3 → ngăn cách hàng nghìn, ngược lại thập phân
    const after = raw.length - lastComma - 1;
    normalized = after === 3 ? raw.replace(/,/g, "") : raw.replace(",", ".");
  } else {
    normalized = raw.replace(/,/g, "");
  }
  const n = Number(normalized);
  if (!Number.isFinite(n)) return v;
  return isPercent ? n / 100 : n;
}

async function exportMatrixAsXlsx(matrix: string[][], baseName: string, sheetName: string) {
  const XLSX = await import("xlsx");
  const aoa = matrix.map((row, ri) =>
    ri === 0 ? row : row.map((c) => coerceCell(c)),
  );
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Auto-width đơn giản theo độ dài chuỗi của mỗi cột
  const colWidths = (matrix[0] ?? []).map((_, ci) => {
    const maxLen = matrix.reduce((m, r) => Math.max(m, String(r[ci] ?? "").length), 0);
    return { wch: Math.min(40, Math.max(8, maxLen + 2)) };
  });
  ws["!cols"] = colWidths;
  // Freeze header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 } as never;
  const wb = XLSX.utils.book_new();
  const safeSheet = sheetName.replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || "Sheet1";
  XLSX.utils.book_append_sheet(wb, ws, safeSheet);
  XLSX.writeFile(wb, `${baseName}.xlsx`);
}

function printMatrixAsPdf(matrix: string[][], title: string, scopeLabel?: string) {
  if (!matrix.length) return;
  const [head, ...body] = matrix;
  const thead = `<thead><tr>${head.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${body
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;

  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  *{box-sizing:border-box}
  body{font:12px/1.4 -apple-system,Segoe UI,Inter,sans-serif;color:#0f172a;margin:24px}
  h1{font-size:16px;margin:0 0 4px}
  .meta{font-size:11px;color:#64748b;margin-bottom:12px}
  table{border-collapse:collapse;width:100%;font-size:11px}
  th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:left;vertical-align:top}
  thead th{background:#f1f5f9;font-weight:600}
  tr{page-break-inside:avoid}
  @page{size:A4 landscape;margin:12mm}
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<div class="meta">${scopeLabel ? `Phạm vi: ${escapeHtml(scopeLabel)} · ` : ""}Xuất lúc ${new Date().toLocaleString("vi-VN")}</div>
<table>${thead}${tbody}</table>
</body></html>`);
  doc.close();

  const win = iframe.contentWindow!;
  const cleanup = () => setTimeout(() => iframe.remove(), 1000);
  win.onafterprint = cleanup;
  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(cleanup, 60000);
  }, 100);
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function TableDownloadButton({
  tableRef,
  targetId,
  filename = "export",
  className,
  label = "Xuất",
  size = "sm",
  formats = ["csv", "xlsx", "pdf"],
  scopeLabel,
  getAllRowsCsv,
  pdfTitle,
}: Props) {
  const storageKey = `tableDownload:lastChoice:${filename}`;
  const readLast = (): { fmt: Format; scope: Scope } | null => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      const v = JSON.parse(raw);
      if (
        (v.fmt === "csv" || v.fmt === "xlsx" || v.fmt === "pdf") &&
        (v.scope === "filtered" || v.scope === "all")
      ) {
        return v;
      }
    } catch {
      /* ignore */
    }
    return null;
  };
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState<{ fmt: Format; scope: Scope } | null>(null);
  const [lastChoice, setLastChoice] = useState<{ fmt: Format; scope: Scope } | null>(() =>
    typeof window === "undefined" ? null : readLast(),
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPreview(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

  const getTable = (): HTMLTableElement | null =>
    tableRef?.current ??
    (targetId ? (document.getElementById(targetId) as HTMLTableElement | null) : null);

  // Compute matrix cho preview
  const previewData = useMemo(() => {
    if (!preview) return null;
    if (preview.scope === "all" && getAllRowsCsv) {
      return csvToMatrix(getAllRowsCsv());
    }
    const t = getTable();
    return t ? tableToMatrix(t) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview]);

  const baseName = filename.replace(/\.(csv|pdf)$/i, "");
  const title = pdfTitle ?? baseName;

  const openPreview = (fmt: Format, scope: Scope) => {
    setMenuOpen(false);
    setPreview({ fmt, scope });
  };

  const confirmDownload = async () => {
    if (!preview || !previewData) return;
    const { fmt, scope } = preview;
    const suffix = scope === "all" ? "-all" : "";
    const fileName = `${baseName}${suffix}.${fmt}`;
    const rowCount = Math.max(0, previewData.length - 1);
    const scopeText = scope === "all" ? "Tất cả (bỏ filter)" : scopeLabel ?? "Đang lọc hiện tại";
    const descBase = `${fileName} · ${rowCount.toLocaleString("vi-VN")} dòng · Phạm vi: ${scopeText}`;

    try {
      if (fmt === "csv") {
        downloadBlob(
          new Blob([matrixToCsv(previewData)], { type: "text/csv;charset=utf-8;" }),
          fileName,
        );
        toast.success("Xuất CSV thành công", { description: descBase });
      } else if (fmt === "xlsx") {
        await exportMatrixAsXlsx(previewData, `${baseName}${suffix}`, title);
        toast.success("Xuất Excel thành công", { description: descBase });
      } else {
        printMatrixAsPdf(previewData, title + (scope === "all" ? " (tất cả)" : ""), scopeLabel);
        toast.success("Đã mở hộp thoại in PDF", { description: descBase });
      }
    } catch (err) {
      toast.error("Xuất file thất bại", {
        description: err instanceof Error ? err.message : String(err),
      });
      return;
    }

    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ fmt, scope }));
    } catch {
      /* ignore */
    }
    setLastChoice({ fmt, scope });
    setPreview(null);
  };

  const base =
    "inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 text-text-2 hover:bg-surface-3 hover:text-text-1 transition-colors whitespace-nowrap";
  const sizeCls =
    size === "xs" ? "h-7 px-2 text-caption font-medium" : "h-8 px-3 text-table-sm font-medium";
  const iconSz = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";

  const showCsv = formats.includes("csv");
  const showPdf = formats.includes("pdf");
  const showXlsx = formats.includes("xlsx");
  const showAllScope = !!getAllRowsCsv;

  const PREVIEW_ROWS = 8;
  const headRow = previewData?.[0] ?? [];
  const bodyRows = previewData?.slice(1) ?? [];
  const shownBody = bodyRows.slice(0, PREVIEW_ROWS);
  const totalRows = bodyRows.length;
  const totalCols = headRow.length;

  const fmtLabel = preview?.fmt === "pdf" ? "PDF" : preview?.fmt === "xlsx" ? "Excel" : "CSV";
  const scopeText =
    preview?.scope === "all"
      ? "Tất cả (bỏ filter)"
      : scopeLabel ?? "Đang lọc hiện tại";
  const fileLabel = preview
    ? `${baseName}${preview.scope === "all" ? "-all" : ""}.${preview.fmt}`
    : "";

  return (
    <>
      <div ref={wrapRef} className={cn("relative inline-flex", className)}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(base, sizeCls)}
          title="Tuỳ chọn xuất dữ liệu"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <Download className={iconSz} />
          {label}
          <ChevronDown className={iconSz} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[260px] rounded-card border border-surface-3 bg-surface-0 shadow-lg p-1.5 text-table-sm"
          >
            <div className="px-2 py-1.5 text-caption text-text-3 flex items-center gap-1.5">
              <Filter className="h-3 w-3" />
              <span className="truncate">
                Phạm vi:{" "}
                <span className="text-text-2 font-medium">
                  {scopeLabel ?? "đang lọc hiện tại"}
                </span>
              </span>
            </div>

            {lastChoice && (
              <>
                <div className="h-px bg-surface-3 my-1" />
                <button
                  type="button"
                  onClick={() => openPreview(lastChoice.fmt, lastChoice.scope)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-button bg-primary/5 hover:bg-primary/10 text-left border border-primary/20"
                  role="menuitem"
                  title="Lặp lại lựa chọn xuất gần nhất trên trang này"
                >
                  {lastChoice.fmt === "pdf" ? (
                    <FileText className="h-3.5 w-3.5 text-danger" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
                  )}
                  <span className="flex-1">
                    Lặp lại: {lastChoice.fmt.toUpperCase()} —{" "}
                    {lastChoice.scope === "all" ? "tất cả" : "đang lọc"}
                  </span>
                  <span className="text-caption text-primary font-medium">↵</span>
                </button>
              </>
            )}

            <div className="h-px bg-surface-3 my-1" />

            {showCsv && (
              <button
                type="button"
                onClick={() => openPreview("csv", "filtered")}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-button hover:bg-surface-2 text-left"
                role="menuitem"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
                <span className="flex-1">CSV — đang lọc</span>
                {lastChoice?.fmt === "csv" && lastChoice?.scope === "filtered" ? (
                  <span className="text-caption text-primary font-medium">● lần trước</span>
                ) : (
                  <span className="text-caption text-text-3">xem trước</span>
                )}
              </button>
            )}
            {showPdf && (
              <button
                type="button"
                onClick={() => openPreview("pdf", "filtered")}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-button hover:bg-surface-2 text-left"
                role="menuitem"
              >
                <FileText className="h-3.5 w-3.5 text-danger" />
                <span className="flex-1">PDF — đang lọc</span>
                {lastChoice?.fmt === "pdf" && lastChoice?.scope === "filtered" ? (
                  <span className="text-caption text-primary font-medium">● lần trước</span>
                ) : (
                  <span className="text-caption text-text-3">xem trước</span>
                )}
              </button>
            )}

            {showAllScope && (
              <>
                <div className="h-px bg-surface-3 my-1" />
                <div className="px-2 py-1 text-caption text-text-3 flex items-center gap-1.5">
                  <Layers className="h-3 w-3" />
                  Bỏ filter — toàn bộ dữ liệu
                </div>
                {showCsv && (
                  <button
                    type="button"
                    onClick={() => openPreview("csv", "all")}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-button hover:bg-surface-2 text-left"
                    role="menuitem"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
                    <span className="flex-1">CSV — tất cả</span>
                    {lastChoice?.fmt === "csv" && lastChoice?.scope === "all" ? (
                      <span className="text-caption text-primary font-medium">● lần trước</span>
                    ) : (
                      <span className="text-caption text-text-3">xem trước</span>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreview(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-preview-title"
            className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-card border border-surface-3 bg-surface-0 shadow-xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-surface-3">
              <div className="min-w-0 flex-1">
                <h2
                  id="export-preview-title"
                  className="text-table-md font-semibold text-text-1 truncate flex items-center gap-2"
                >
                  {preview.fmt === "pdf" ? (
                    <FileText className="h-4 w-4 text-danger shrink-0" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 text-success shrink-0" />
                  )}
                  Xem trước xuất {fmtLabel}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-text-3">
                  <span className="inline-flex items-center gap-1">
                    <Filter className="h-3 w-3" />
                    Phạm vi: <span className="text-text-2 font-medium">{scopeText}</span>
                  </span>
                  <span>·</span>
                  <span>
                    Tên file: <span className="text-text-2 font-mono">{fileLabel}</span>
                  </span>
                  <span>·</span>
                  <span>
                    {totalRows.toLocaleString("vi-VN")} dòng × {totalCols} cột
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-button text-text-3 hover:bg-surface-2 hover:text-text-1"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-4">
              {!previewData || previewData.length === 0 ? (
                <div className="text-center py-12 text-text-3 text-table-sm">
                  Không có dữ liệu để xuất.
                </div>
              ) : (
                <>
                  <div className="text-caption text-text-3 mb-2">
                    Hiển thị {Math.min(PREVIEW_ROWS, totalRows)} / {totalRows.toLocaleString("vi-VN")}{" "}
                    dòng đầu
                  </div>
                  <div className="overflow-auto rounded-card border border-surface-3">
                    <table className="w-full text-table-sm border-collapse">
                      <thead className="bg-surface-2 sticky top-0">
                        <tr>
                          {headRow.map((h, i) => (
                            <th
                              key={i}
                              className="text-left font-semibold text-text-1 px-2 py-1.5 border-b border-surface-3 whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {shownBody.map((r, ri) => (
                          <tr key={ri} className="hover:bg-surface-2/50">
                            {r.map((c, ci) => (
                              <td
                                key={ci}
                                className="px-2 py-1.5 border-b border-surface-3 text-text-2 whitespace-nowrap max-w-[240px] truncate"
                                title={c}
                              >
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalRows > PREVIEW_ROWS && (
                    <div className="mt-2 text-caption text-text-3">
                      … và {(totalRows - PREVIEW_ROWS).toLocaleString("vi-VN")} dòng khác sẽ có trong
                      file xuất.
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-surface-3 bg-surface-1/50">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="h-8 px-3 rounded-button border border-surface-3 bg-surface-0 text-text-2 hover:bg-surface-3 text-table-sm font-medium"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={confirmDownload}
                disabled={!previewData || previewData.length === 0}
                className="h-8 px-3 rounded-button bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-table-sm font-medium inline-flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                {preview.fmt === "pdf" ? "Mở hộp thoại in" : "Tải về"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TableDownloadButton;

/**
 * TableDownloadButton — dropdown xuất dữ liệu bảng (CSV / PDF) với tuỳ chọn phạm vi.
 *
 * Cách dùng cơ bản (giữ nguyên API cũ):
 *   const ref = useRef<HTMLTableElement>(null);
 *   <TableDownloadButton tableRef={ref} filename="conflict-log" />
 *   <table ref={ref}>...</table>
 *
 * API mở rộng:
 *   - format: "csv" | "pdf" | "both" (default: "both")
 *   - scopeLabel: nhãn mô tả filter hiện tại (vd: "Tuần 47 · CN HCM"); hiển thị trong menu
 *   - allowAllRows: nếu bảng đang bị filter ở tầng React (data prop), truyền hàm
 *       getAllRowsCsv?: () => string  để cho phép xuất "Tất cả (bỏ filter)".
 *     Mặc định không có → menu chỉ hiển thị "Đang lọc hiện tại".
 *
 * Quy ước cell:
 *   - data-export-skip hoặc class .no-export → bỏ qua khi xuất
 *   - data-export-value="..." → ghi đè giá trị hiển thị
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Filter, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

type Format = "csv" | "pdf";

interface Props {
  tableRef?: React.RefObject<HTMLTableElement>;
  targetId?: string;
  filename?: string;
  className?: string;
  label?: string;
  size?: "xs" | "sm";
  /** Định dạng cho phép — mặc định cả CSV và PDF */
  formats?: Format[];
  /** Nhãn mô tả phạm vi lọc hiện tại (vd: "Tuần 47 · CN HCM · Status=Open") */
  scopeLabel?: string;
  /** Nếu cung cấp → hiển thị tuỳ chọn "Tất cả (bỏ filter)"; trả về CSV string đã có BOM */
  getAllRowsCsv?: () => string;
  /** Tiêu đề khi xuất PDF (in trên đầu trang) */
  pdfTitle?: string;
}

function escapeCsv(v: string): string {
  const needs = /[",\n\r]/.test(v);
  const safe = v.replace(/"/g, '""');
  return needs ? `"${safe}"` : safe;
}

function tableToCsv(table: HTMLTableElement): string {
  const rows: string[] = [];
  for (const tr of Array.from(table.rows)) {
    const cells: string[] = [];
    for (const td of Array.from(tr.cells)) {
      if (td.dataset.exportSkip != null || td.classList.contains("no-export")) continue;
      const raw = td.dataset.exportValue ?? td.innerText ?? td.textContent ?? "";
      const clean = raw.replace(/\s+/g, " ").trim();
      cells.push(escapeCsv(clean));
    }
    if (cells.length > 0) rows.push(cells.join(","));
  }
  return "\uFEFF" + rows.join("\n");
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

function printTableAsPdf(table: HTMLTableElement, title: string, scopeLabel?: string) {
  // Clone bảng, bỏ các cell .no-export
  const clone = table.cloneNode(true) as HTMLTableElement;
  clone.querySelectorAll("[data-export-skip], .no-export").forEach((el) => el.remove());

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
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
<h1>${title}</h1>
<div class="meta">${scopeLabel ? `Phạm vi: ${scopeLabel} · ` : ""}Xuất lúc ${new Date().toLocaleString("vi-VN")}</div>
${clone.outerHTML}
</body></html>`);
  doc.close();

  const win = iframe.contentWindow!;
  const cleanup = () => setTimeout(() => iframe.remove(), 1000);
  win.onafterprint = cleanup;
  // chờ render
  setTimeout(() => {
    win.focus();
    win.print();
    // fallback cleanup nếu onafterprint không fire
    setTimeout(cleanup, 60000);
  }, 100);
}

export function TableDownloadButton({
  tableRef,
  targetId,
  filename = "export",
  className,
  label = "Xuất",
  size = "sm",
  formats = ["csv", "pdf"],
  scopeLabel,
  getAllRowsCsv,
  pdfTitle,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const getTable = (): HTMLTableElement | null =>
    tableRef?.current ??
    (targetId ? (document.getElementById(targetId) as HTMLTableElement | null) : null);

  const doExport = (fmt: Format, scope: "filtered" | "all") => {
    const table = getTable();
    if (!table) return;
    const baseName = filename.replace(/\.(csv|pdf)$/i, "");
    const suffix = scope === "all" ? "-all" : "";
    const title = pdfTitle ?? baseName;

    if (fmt === "csv") {
      const csv = scope === "all" && getAllRowsCsv ? getAllRowsCsv() : tableToCsv(table);
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${baseName}${suffix}.csv`);
    } else {
      // PDF chỉ in những gì đang render trên DOM (= filtered). Cảnh báo nếu user chọn "all" mà không có nguồn.
      printTableAsPdf(table, title + (scope === "all" ? " (tất cả)" : ""), scopeLabel);
    }
    setOpen(false);
  };

  const base =
    "inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 text-text-2 hover:bg-surface-3 hover:text-text-1 transition-colors whitespace-nowrap";
  const sizeCls =
    size === "xs" ? "h-7 px-2 text-caption font-medium" : "h-8 px-3 text-table-sm font-medium";
  const iconSz = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";

  const showCsv = formats.includes("csv");
  const showPdf = formats.includes("pdf");
  const showAllScope = !!getAllRowsCsv;

  return (
    <div ref={wrapRef} className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(base, sizeCls)}
        title="Tuỳ chọn xuất dữ liệu"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download className={iconSz} />
        {label}
        <ChevronDown className={iconSz} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[240px] rounded-card border border-surface-3 bg-surface-0 shadow-lg p-1.5 text-table-sm"
        >
          <div className="px-2 py-1.5 text-caption text-text-3 flex items-center gap-1.5">
            <Filter className="h-3 w-3" />
            <span className="truncate">
              Phạm vi: <span className="text-text-2 font-medium">{scopeLabel ?? "đang lọc hiện tại"}</span>
            </span>
          </div>
          <div className="h-px bg-surface-3 my-1" />

          {showCsv && (
            <button
              type="button"
              onClick={() => doExport("csv", "filtered")}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-button hover:bg-surface-2 text-left"
              role="menuitem"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
              <span className="flex-1">CSV — đang lọc</span>
              <span className="text-caption text-text-3">.csv</span>
            </button>
          )}
          {showPdf && (
            <button
              type="button"
              onClick={() => doExport("pdf", "filtered")}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-button hover:bg-surface-2 text-left"
              role="menuitem"
            >
              <FileText className="h-3.5 w-3.5 text-danger" />
              <span className="flex-1">PDF — đang lọc</span>
              <span className="text-caption text-text-3">.pdf</span>
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
                  onClick={() => doExport("csv", "all")}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-button hover:bg-surface-2 text-left"
                  role="menuitem"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-success" />
                  <span className="flex-1">CSV — tất cả</span>
                  <span className="text-caption text-text-3">.csv</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default TableDownloadButton;

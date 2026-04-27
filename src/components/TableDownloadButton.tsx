/**
 * TableDownloadButton — nút "Xuất CSV" cho mọi raw <table> trong app.
 *
 * Cách dùng:
 *   const ref = useRef<HTMLTableElement>(null);
 *   <TableDownloadButton tableRef={ref} filename="conflict-log" />
 *   <table ref={ref}>...</table>
 *
 * Hoặc dùng `targetId`:
 *   <TableDownloadButton targetId="my-table" filename="..." />
 *   <table id="my-table">...</table>
 *
 * Tự đọc <thead>/<tbody> → CSV (BOM UTF-8, escape ", newline).
 * Bỏ qua mọi cell có data-export-skip hoặc element có .no-export.
 */
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  tableRef?: React.RefObject<HTMLTableElement>;
  targetId?: string;
  filename?: string;
  className?: string;
  /** label hiển thị; mặc định "Xuất CSV" */
  label?: string;
  /** size hiển thị: "sm" cho toolbar, "xs" cho góc bảng */
  size?: "xs" | "sm";
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
      // Lấy text content + collapse whitespace; ưu tiên data-export-value nếu có
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

export function TableDownloadButton({
  tableRef,
  targetId,
  filename = "export",
  className,
  label = "Xuất CSV",
  size = "sm",
}: Props) {
  const handleClick = () => {
    const table =
      tableRef?.current ??
      (targetId ? (document.getElementById(targetId) as HTMLTableElement | null) : null);
    if (!table) return;
    const csv = tableToCsv(table);
    const fname = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), fname);
  };

  const base =
    "inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 text-text-2 hover:bg-surface-3 hover:text-text-1 transition-colors whitespace-nowrap";
  const sizeCls =
    size === "xs"
      ? "h-7 px-2 text-caption font-medium"
      : "h-8 px-3 text-table-sm font-medium";

  return (
    <button type="button" onClick={handleClick} className={cn(base, sizeCls, className)} title={`Tải ${filename}.csv`}>
      <Download className={size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </button>
  );
}

export default TableDownloadButton;

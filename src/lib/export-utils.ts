/* Generic CSV / XLSX export helpers for tabular data. */
import * as XLSX from "xlsx";

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
}

function buildAoa<T>(rows: T[], cols: ExportColumn<T>[]): (string | number)[][] {
  const header = cols.map((c) => c.header);
  const body = rows.map((r) =>
    cols.map((c) => {
      const v = c.accessor(r);
      if (v === null || v === undefined) return "";
      return v;
    })
  );
  return [header, ...body];
}

export function exportToCsv<T>(rows: T[], cols: ExportColumn<T>[], filename: string) {
  const aoa = buildAoa(rows, cols);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const csv = XLSX.utils.sheet_to_csv(ws);
  // BOM for Excel-friendly UTF-8 (Vietnamese diacritics)
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${safeFilename(filename)}.csv`);
}

export function exportToXlsx<T>(
  rows: T[],
  cols: ExportColumn<T>[],
  filename: string,
  sheetName = "Sheet1",
) {
  const aoa = buildAoa(rows, cols);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Auto column widths
  ws["!cols"] = cols.map((c, i) => {
    const headerLen = c.header.length;
    const maxBodyLen = rows.reduce((m, r) => {
      const v = c.accessor(r);
      const s = v === null || v === undefined ? "" : String(v);
      return Math.max(m, s.length);
    }, 0);
    return { wch: Math.min(40, Math.max(8, Math.max(headerLen, maxBodyLen) + 2)) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  triggerDownload(blob, `${safeFilename(filename)}.xlsx`);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

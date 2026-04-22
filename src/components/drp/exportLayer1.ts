import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { AllocSources } from "./AllocSourceBar";

export interface ExportRow {
  group: "CN" | "SKU";
  parentKey: string;          // e.g. "CN-BD" or "GA-300 A4"
  isParent: boolean;          // true for aggregate row, false for child row
  childKey?: string;          // SKU under CN, or CN under SKU
  demand: number;
  allocated: number;
  fillPct: number;
  gap: number;
  exceptions?: number;        // only for CN parent rows
  status?: string;
  sources: AllocSources;
}

const SOURCE_HEADERS = ["On-hand", "Pipeline", "Hub PO", "LCNB", "Internal TO"];

function srcRow(s: AllocSources) {
  return [s.onHand, s.pipeline, s.hubPo, s.lcnbIn, s.internalTransfer];
}

function buildHeaders(): string[] {
  return [
    "Cấp", "Pivot", "Khóa cha", "Khóa con",
    "Demand", "Allocated", "Fill %", "Gap", "Exceptions", "Status",
    ...SOURCE_HEADERS,
  ];
}

function rowToArray(r: ExportRow): (string | number)[] {
  return [
    r.isParent ? "Tổng" : "Chi tiết",
    r.group,
    r.parentKey,
    r.childKey ?? "",
    r.demand,
    r.allocated,
    r.fillPct,
    r.gap,
    r.exceptions ?? "",
    r.status ?? "",
    ...srcRow(r.sources),
  ];
}

function csvEscape(v: string | number): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCsv(rows: ExportRow[], filename: string) {
  const headers = buildHeaders();
  const lines = [headers.join(",")];
  rows.forEach(r => lines.push(rowToArray(r).map(csvEscape).join(",")));
  const csv = "\uFEFF" + lines.join("\n"); // BOM for Excel UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportPdf(
  rows: ExportRow[],
  filename: string,
  meta: { tenant: string; pivotMode: "cn" | "sku"; activeFilters: string[] }
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DRP Layer 1 — Allocation report", 40, 40);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110);
  const subtitle = [
    `Tenant: ${meta.tenant}`,
    `Pivot: ${meta.pivotMode === "cn" ? "CN-first" : "SKU-first"}`,
    `Lọc nguồn: ${meta.activeFilters.length ? meta.activeFilters.join(", ") : "Tất cả"}`,
    `Xuất: ${new Date().toLocaleString("vi-VN")}`,
  ].join("   •   ");
  doc.text(subtitle, 40, 56);

  autoTable(doc, {
    startY: 72,
    head: [buildHeaders()],
    body: rows.map(r => rowToArray(r).map(v => typeof v === "number" ? v.toLocaleString("vi-VN") : v)),
    styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak" },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 35 },
      2: { cellWidth: 75 },
      3: { cellWidth: 75 },
      4: { halign: "right", cellWidth: 55 },
      5: { halign: "right", cellWidth: 55 },
      6: { halign: "right", cellWidth: 40 },
      7: { halign: "right", cellWidth: 50 },
      8: { halign: "right", cellWidth: 55 },
      9: { cellWidth: 60 },
      10: { halign: "right" },
      11: { halign: "right" },
      12: { halign: "right" },
      13: { halign: "right" },
      14: { halign: "right" },
    },
    didParseCell: (data) => {
      // Highlight gap > 0 in red, parent rows bold
      const row = rows[data.row.index];
      if (!row) return;
      if (row.isParent && data.section === "body") {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [232, 238, 255];
      }
      if (data.column.index === 7 && row.gap > 0 && data.section === "body") {
        data.cell.styles.textColor = [220, 38, 38];
        data.cell.styles.fontStyle = "bold";
      }
      if (data.column.index === 6 && data.section === "body") {
        if (row.fillPct >= 100) data.cell.styles.textColor = [22, 163, 74];
        else if (row.fillPct >= 80) data.cell.styles.textColor = [202, 138, 4];
        else data.cell.styles.textColor = [220, 38, 38];
      }
    },
    margin: { left: 40, right: 40 },
  });

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Trang ${i}/${pageCount}`, pageWidth - 60, doc.internal.pageSize.getHeight() - 20);
  }

  doc.save(filename);
}

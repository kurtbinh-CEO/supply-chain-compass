/**
 * SectionTableHeader — header row chuẩn cho mọi section chứa raw <table>.
 *
 * Layout: [title (+ optional badge)] ⟷ [actions] [TableDownloadButton]
 *
 * Tự render `<TableDownloadButton tableRef={tableRef} filename={...} size="xs" />`
 * ở góc phải, đồng thời truyền `tableRef` xuống children qua render-prop.
 *
 * Cách dùng:
 *   <SectionTableHeader title="Top 5 exceptions" filename="top-exceptions">
 *     {(ref) => (
 *       <table ref={ref} className="w-full">...</table>
 *     )}
 *   </SectionTableHeader>
 *
 * Hoặc với title custom (h3/h4 sẵn có):
 *   <SectionTableHeader
 *     filename="heatmap-hstk"
 *     headerSlot={<h3>Heatmap HSTK</h3>}
 *   >
 *     {(ref) => <table ref={ref}>...</table>}
 *   </SectionTableHeader>
 */
import { useRef } from "react";
import { TableDownloadButton } from "./TableDownloadButton";
import { cn } from "@/lib/utils";

interface Props {
  filename: string;
  title?: React.ReactNode;
  /** override toàn bộ phần trái — nếu set sẽ thay thế cho `title` */
  headerSlot?: React.ReactNode;
  /** actions phụ bên trái nút Xuất */
  extraActions?: React.ReactNode;
  /** wrapper div className (mặc định mb-2) */
  className?: string;
  children: (tableRef: React.RefObject<HTMLTableElement>) => React.ReactNode;
}

export function SectionTableHeader({
  filename,
  title,
  headerSlot,
  extraActions,
  className,
  children,
}: Props) {
  const tableRef = useRef<HTMLTableElement>(null);
  return (
    <>
      <div className={cn("mb-2 flex items-center justify-between gap-2", className)}>
        <div className="min-w-0 flex-1">
          {headerSlot ?? (
            title && (
              <h4 className="text-table-sm font-medium text-text-2 truncate">{title}</h4>
            )
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {extraActions}
          <TableDownloadButton tableRef={tableRef} filename={filename} size="xs" />
        </div>
      </div>
      {children(tableRef)}
    </>
  );
}

export default SectionTableHeader;

/**
 * PivotChildTable — Child SmartTable compact dùng cho mọi pivot 2 chiều
 * (CN↔SKU, NM↔SKU). Thay thế text inline rối mắt bằng bảng có:
 *   • Density compact (11px, row 28px)
 *   • Auto sort HSTK ascending — nguy hiểm lên đầu
 *   • Auto highlight 🔴 < 3d / 🟡 < 7d (cấu hình được)
 *   • Cột "SO SS" delta tự tính (▼ -X% / ▲ +X%)
 *   • Click navigate giữa Inventory ↔ DRP qua callback
 *   • Footer summary tổng + AVG HSTK
 *
 * Mọi label tiếng Việt.
 */
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface PivotChildRow {
  /** ID của hàng — vd "GA-300 A4" hoặc "CN-BD" */
  key: string;
  /** Label hiển thị cột 1 — mã SKU hoặc mã CN/NM */
  label: string;
  /** Số lượng tồn (m²) */
  qty: number;
  /** HSTK (ngày) */
  hstk: number;
  /** SS target để tính SO SS — optional */
  ssTarget?: number;
  /** Status text override — nếu không cấp sẽ tự suy từ HSTK */
  statusOverride?: string;
  /** Loại nav khi click cột label: "sku" → /drp?sku=, "cn" → /drp?cn=, "nm" → /supply?nm= */
  navKind?: "sku" | "cn" | "nm";
  /** Param value để navigate — mặc định là `key` */
  navValue?: string;
}

export interface PivotChildTableProps {
  /** Danh sách hàng con */
  rows: PivotChildRow[];
  /** Tiêu đề cột 1 — vd "Mã hàng" (CN-first) hoặc "Chi nhánh" (SKU-first) */
  firstColLabel: string;
  /** screenId duy nhất để SmartTable persist density/columns */
  screenId: string;
  /** Đơn vị qty — mặc định "m²" */
  unit?: string;
  /** Ngưỡng cảnh báo HSTK — mặc định {danger:3, warn:7} */
  thresholds?: { danger: number; warn: number };
  /** Bật cột "SO SS" — mặc định true nếu mọi row có ssTarget */
  showSoSs?: boolean;
  /** className wrapper */
  className?: string;
}

function statusFromHstk(h: number, t: { danger: number; warn: number }) {
  if (h < t.danger) return { label: "Nguy hiểm", icon: "🔴", tone: "danger" as const };
  if (h < t.warn) return { label: "Thấp", icon: "🟡", tone: "warning" as const };
  return { label: "Đủ", icon: "🟢", tone: "success" as const };
}

export function PivotChildTable({
  rows,
  firstColLabel,
  screenId,
  unit = "m²",
  thresholds = { danger: 3, warn: 7 },
  showSoSs,
  className,
}: PivotChildTableProps) {
  const navigate = useNavigate();
  const hasSs = rows.length > 0 && rows.every((r) => typeof r.ssTarget === "number" && r.ssTarget! > 0);
  const showSs = showSoSs ?? hasSs;

  // Sort HSTK ascending — nguy hiểm trên đầu
  const sorted = [...rows].sort((a, b) => a.hstk - b.hstk);
  const totalQty = sorted.reduce((a, r) => a + r.qty, 0);
  const avgHstk = sorted.length ? sorted.reduce((a, r) => a + r.hstk, 0) / sorted.length : 0;

  const columns: SmartTableColumn<PivotChildRow>[] = [
    {
      key: "label",
      label: firstColLabel,
      sortable: true,
      accessor: (r) => r.label,
      render: (r) =>
        r.navKind ? (
          <button
            className="text-info hover:underline font-medium text-table-sm"
            onClick={(e) => {
              e.stopPropagation();
              const v = r.navValue ?? r.key;
              if (r.navKind === "sku") navigate(`/drp?sku=${encodeURIComponent(v)}`);
              else if (r.navKind === "cn") navigate(`/drp?cn=${encodeURIComponent(v)}`);
              else if (r.navKind === "nm") navigate(`/supply?nm=${encodeURIComponent(v)}`);
            }}
          >
            {r.label}
          </button>
        ) : (
          <span className="font-medium text-text-1">{r.label}</span>
        ),
    },
    {
      key: "qty",
      label: `Tồn (${unit})`,
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r.qty,
      render: (r) => <span className="tabular-nums">{r.qty.toLocaleString()}</span>,
    },
    {
      key: "hstk",
      label: "HSTK",
      numeric: true,
      sortable: true,
      align: "right",
      accessor: (r) => r.hstk,
      render: (r) => {
        const st = statusFromHstk(r.hstk, thresholds);
        const color = st.tone === "danger" ? "text-danger" : st.tone === "warning" ? "text-warning" : "text-text-2";
        return <span className={cn("tabular-nums font-medium", color)}>{r.hstk.toFixed(1)}d</span>;
      },
    },
    {
      key: "status",
      label: "Trạng thái",
      sortable: true,
      accessor: (r) => statusFromHstk(r.hstk, thresholds).label,
      render: (r) => {
        const st = statusFromHstk(r.hstk, thresholds);
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              st.tone === "danger" && "bg-danger-bg text-danger",
              st.tone === "warning" && "bg-warning-bg text-warning",
              st.tone === "success" && "bg-success-bg text-success"
            )}
          >
            <span>{st.icon}</span>
            {r.statusOverride ?? st.label}
          </span>
        );
      },
    },
    ...(showSs
      ? [
          {
            key: "soss",
            label: "So SS",
            numeric: true,
            align: "right" as const,
            accessor: (r: PivotChildRow) => {
              if (!r.ssTarget) return 0;
              return Math.round(((r.qty - r.ssTarget) / r.ssTarget) * 100);
            },
            render: (r: PivotChildRow) => {
              if (!r.ssTarget || r.ssTarget <= 0) return <span className="text-text-3">—</span>;
              const pct = Math.round(((r.qty - r.ssTarget) / r.ssTarget) * 100);
              if (pct >= -10 && pct <= 50) return <span className="text-text-3">—</span>;
              const isUp = pct > 0;
              return (
                <span
                  className={cn(
                    "tabular-nums text-[11px] font-medium inline-flex items-center gap-0.5",
                    isUp ? "text-info" : "text-danger"
                  )}
                >
                  {isUp ? "▲" : "▼"} {isUp ? "+" : ""}
                  {pct}%
                </span>
              );
            },
          } satisfies SmartTableColumn<PivotChildRow>,
        ]
      : []),
  ];

  return (
    <div className={cn("rounded-lg border border-surface-3 bg-surface-0 overflow-hidden", className)}>
      <SmartTable<PivotChildRow>
        screenId={screenId}
        columns={columns}
        data={sorted}
        defaultDensity="compact"
        rowSeverity={(r) => {
          const st = statusFromHstk(r.hstk, thresholds);
          if (st.tone === "danger") return "shortage";
          if (st.tone === "warning") return "watch";
          return "ok";
        }}
        getRowId={(r) => r.key}
        summaryRow={{
          label: <span className="text-text-3 font-medium">TỔNG</span>,
          qty: <span className="tabular-nums font-semibold">{totalQty.toLocaleString()}</span>,
          hstk: <span className="tabular-nums">{avgHstk.toFixed(1)}d</span>,
        }}
      />
    </div>
  );
}

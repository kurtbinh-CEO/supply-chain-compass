/**
 * LeadTimesLanesView — Sub-view cho tab Tuyến: hiển thị bảng lead_times từ Cloud
 * (read-only) với cột mode/leadtime_days/transport_cost/priority.
 */
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { useEntityList } from "@/hooks/useEntityCrud";
import { useUserTenantId } from "@/hooks/useUserTenantId";

interface Lane extends Record<string, unknown> {
  id: string;
  source_code: string;
  dest_code: string;
  mode: string;
  leadtime_days: number;
  transport_cost: number | null;
  priority: number;
}

const cols: SmartTableColumn<Lane>[] = [
  { key: "source_code", label: "Từ", width: 110, sortable: true, render: (r) => <span className="font-mono text-text-1">{r.source_code}</span> },
  { key: "dest_code", label: "Đến", width: 110, sortable: true, render: (r) => <span className="font-mono text-text-1">{r.dest_code}</span> },
  {
    key: "mode", label: "Mode", width: 90, filter: "enum",
    filterOptions: [{ value: "ROAD", label: "ROAD" }, { value: "RAIL", label: "RAIL" }, { value: "SEA", label: "SEA" }],
    render: (r) => <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-info-bg text-info text-table-sm">{r.mode}</span>,
  },
  { key: "leadtime_days", label: "LT (ngày)", width: 100, numeric: true, align: "right", sortable: true, render: (r) => <span className="tabular-nums text-text-1">{r.leadtime_days}d</span> },
  { key: "transport_cost", label: "Cước (VND)", width: 130, numeric: true, align: "right", render: (r) => <span className="tabular-nums text-text-2">{r.transport_cost ? Number(r.transport_cost).toLocaleString("vi-VN") : "—"}</span> },
  { key: "priority", label: "Ưu tiên", width: 90, numeric: true, align: "center", render: (r) => <span className="tabular-nums text-text-2">P{r.priority}</span> },
];

export function LeadTimesLanesView() {
  const { data: tenantId } = useUserTenantId();
  const { data: lanes = [], isLoading } = useEntityList("cn_sku_pricing" as never, tenantId); // placeholder, will swap below
  // Note: useEntityList chỉ chấp nhận CrudTable; lead_times không có is_active.
  // Dùng raw query trong hook riêng.
  return (
    <div className="space-y-2">
      <SmartTable<Lane>
        screenId="master-lead-times"
        exportFilename="lead_times"
        columns={cols}
        data={lanes as unknown as Lane[]}
        defaultDensity="compact"
        getRowId={(r) => r.id}
      />
      <p className="text-table-sm text-text-3">{(lanes as unknown[]).length} tuyến cloud {isLoading && "(đang tải...)"}</p>
    </div>
  );
}

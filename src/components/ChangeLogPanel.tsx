import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, ClipboardList, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChangeLogEntry {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  who: string;
  when: string;        // "12/05 10:15"
  reason?: string;
  isNew?: boolean;     // highlight as "new since last view"
  source?: "nm_counter" | "drp" | "manual" | "system" | "sop" | "fc";
  impact?: string;     // e.g. "Ảnh hưởng 8 PO draft"
}

interface Props {
  entityType: "hub_stock" | "sop_consensus" | "drp_run" | "nm_supply" | string;
  entityId?: string;
  maxItems?: number;
  /** Override default mock entries; if omitted, mock data based on entityType is used */
  entries?: ChangeLogEntry[];
  defaultOpen?: boolean;
}

const SOURCE_BADGE: Record<string, { cls: string; label: string }> = {
  nm_counter: { cls: "bg-warning-bg text-warning",   label: "NM_COUNTER" },
  drp:        { cls: "bg-info-bg text-info",          label: "DRP" },
  manual:     { cls: "bg-surface-3 text-text-2",      label: "MANUAL" },
  system:     { cls: "bg-surface-3 text-text-3",      label: "SYSTEM" },
  sop:        { cls: "bg-success-bg text-success",    label: "S&OP" },
  fc:         { cls: "bg-info-bg text-info",          label: "FC" },
};

function getMockEntries(entityType: string): ChangeLogEntry[] {
  const common: ChangeLogEntry[] = [
    {
      id: "c1", field: "Toko GA-600 commit", oldValue: "6,000 m²", newValue: "4,080 m²",
      who: "Toko", when: "12/05 10:15", reason: "Counter — capacity thiếu",
      isNew: true, source: "nm_counter", impact: "Ảnh hưởng 8 PO draft",
    },
    {
      id: "c2", field: "SS Hub", oldValue: "380 m²", newValue: "420 m²",
      who: "Lan (PM)", when: "11/05 16:20", reason: "Bù sai số FC tháng trước",
      isNew: true, source: "manual",
    },
    {
      id: "c3", field: "DRP batch DRP-2605-A", oldValue: "draft", newValue: "approved",
      who: "Minh (SC)", when: "11/05 09:00", reason: "Đủ điều kiện release",
      isNew: true, source: "drp",
    },
    {
      id: "c4", field: "S&OP v3 T5 lock", oldValue: "—", newValue: "7,650 m²",
      who: "System", when: "10/05 08:00", reason: "Auto-lock sau consensus",
      source: "sop",
    },
    {
      id: "c5", field: "Mikado GA-300 commit", oldValue: "—", newValue: "+2,000 m²",
      who: "Mikado", when: "09/05 14:42", reason: "Xác nhận",
      source: "nm_counter",
    },
  ];
  return common;
}

export function ChangeLogPanel({
  entityType,
  entityId,
  maxItems = 8,
  entries,
  defaultOpen = false,
}: Props) {
  const data = useMemo(
    () => (entries ?? getMockEntries(entityType)).slice(0, maxItems),
    [entries, entityType, maxItems],
  );
  const newCount = data.filter((e) => e.isNew).length;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-card border border-surface-3 bg-surface-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-3 flex items-center justify-between border-b border-surface-3 hover:bg-surface-2/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-text-3" />
          <h3 className="font-display text-section-header text-text-1">
            📋 Lịch sử ({data.length})
          </h3>
          {entityId && <span className="text-caption font-mono text-text-3">#{entityId}</span>}
          <span className="text-caption text-text-3">· {entityType}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-text-3" /> : <ChevronDown className="h-4 w-4 text-text-3" />}
      </button>

      {!open && newCount > 0 && (
        <button
          onClick={() => setOpen(true)}
          className="w-full px-5 py-2 flex items-center gap-2 bg-info-bg/30 border-b border-info/30 text-info text-table-sm font-medium hover:bg-info-bg/50 transition-colors"
        >
          <AlertCircle className="h-4 w-4" />
          {newCount} thay đổi mới — xem ↓
        </button>
      )}

      {open && (
        <table className="w-full text-table-sm">
          <thead>
            <tr className="text-left text-caption uppercase text-text-3 tracking-wider border-b border-surface-3">
              <th className="px-5 py-2 font-medium">Trường</th>
              <th className="px-5 py-2 font-medium">Cũ → Mới</th>
              <th className="px-5 py-2 font-medium">Ai</th>
              <th className="px-5 py-2 font-medium">Khi</th>
              <th className="px-5 py-2 font-medium">Lý do</th>
            </tr>
          </thead>
          <tbody>
            {data.map((e) => {
              const src = e.source ? SOURCE_BADGE[e.source] : null;
              return (
                <tr
                  key={e.id}
                  className={cn(
                    "border-b border-surface-3/40 last:border-0 hover:bg-surface-2/40",
                    e.isNew && "bg-info-bg/10",
                  )}
                >
                  <td className="px-5 py-2 text-text-1 font-medium">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {e.field}
                      {src && (
                        <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono", src.cls)}>
                          {src.label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-2 text-text-2 tabular-nums">
                    <span className="text-text-3">{e.oldValue}</span>
                    <span className="mx-1 text-text-3">→</span>
                    <span className="text-text-1 font-medium">{e.newValue}</span>
                  </td>
                  <td className="px-5 py-2 text-text-1">{e.who}</td>
                  <td className="px-5 py-2 text-text-2 font-mono tabular-nums">{e.when}</td>
                  <td className="px-5 py-2 text-text-3">
                    {e.reason || "—"}
                    {e.impact && (
                      <div className="text-caption text-warning mt-0.5">⚠️ {e.impact}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

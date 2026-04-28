/* ════════════════════════════════════════════════════════════════════════════
   §  TransportAuditPanel — collapsible audit log của 4 ma trận transport.
   §  Shows newest-first, with category filter, severity tone, ts + actorRole.
   ════════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, History, Truck, Pencil, MapPin,
  Sparkles, Trash2, Filter, Check, AlertTriangle, X, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useTransportAudit } from "@/hooks/useTransportAudit";
import { clearTransportAudit, type TransportAuditCategory, type TransportAuditEvent } from "@/lib/transport-audit";

const CATEGORY_META: Record<TransportAuditCategory, { label: string; icon: typeof Truck }> = {
  vehicle:  { label: "Loại xe (route-vehicle)", icon: Truck },
  qty_edit: { label: "Chỉnh PO qty (edit-thresholds)", icon: Pencil },
  drop:     { label: "Ghép drop (drop-eligibility)", icon: MapPin },
  fillup:   { label: "Fill-up decision", icon: Sparkles },
};

const SEV_TONE: Record<TransportAuditEvent["severity"], string> = {
  info:    "border-info/40 bg-info-bg/40 text-info",
  warn:    "border-warning/40 bg-warning-bg/40 text-warning",
  block:   "border-danger/40 bg-danger-bg/40 text-danger",
  success: "border-success/40 bg-success-bg/40 text-success",
};

const SEV_ICON = {
  info: Info, warn: AlertTriangle, block: X, success: Check,
} as const;

function fmtTs(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString("vi-VN", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export function TransportAuditPanel({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const events = useTransportAudit();
  const [open, setOpen] = useState(defaultOpen);
  const [catFilter, setCatFilter] = useState<TransportAuditCategory | "all">("all");
  const [sevFilter, setSevFilter] = useState<TransportAuditEvent["severity"] | "all">("all");

  const filtered = useMemo(() => events.filter((e) =>
    (catFilter === "all" || e.category === catFilter)
    && (sevFilter === "all" || e.severity === sevFilter),
  ), [events, catFilter, sevFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { vehicle: 0, qty_edit: 0, drop: 0, fillup: 0 };
    for (const e of events) c[e.category]++;
    return c;
  }, [events]);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button type="button"
          className="w-full flex items-center justify-between rounded-card border border-surface-3 bg-surface-1 hover:bg-surface-2 px-3 py-2 text-table-sm transition-colors"
        >
          <span className="flex items-center gap-2 text-text-1 font-semibold">
            <History className="h-4 w-4 text-primary" />
            Nhật ký logic vận tải
            <span className="text-text-3 font-normal">
              ({events.length} sự kiện · xe {counts.vehicle} · qty {counts.qty_edit} · drop {counts.drop} · fill-up {counts.fillup})
            </span>
          </span>
          {open ? <ChevronDown className="h-4 w-4 text-text-3" /> : <ChevronRight className="h-4 w-4 text-text-3" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-card border border-surface-3 bg-surface-1 p-3 space-y-2">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-text-3 inline-flex items-center gap-1">
              <Filter className="h-3 w-3" /> Lọc:
            </span>
            <Select value={catFilter} onValueChange={(v) => setCatFilter(v as typeof catFilter)}>
              <SelectTrigger className="h-7 text-[11px] w-[220px]">
                <SelectValue placeholder="Tất cả ma trận" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[11px]">Tất cả ma trận</SelectItem>
                {(Object.keys(CATEGORY_META) as TransportAuditCategory[]).map((k) => (
                  <SelectItem key={k} value={k} className="text-[11px]">
                    {CATEGORY_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sevFilter} onValueChange={(v) => setSevFilter(v as typeof sevFilter)}>
              <SelectTrigger className="h-7 text-[11px] w-[140px]">
                <SelectValue placeholder="Mức độ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[11px]">Tất cả mức độ</SelectItem>
                <SelectItem value="success" className="text-[11px]">✓ Thành công</SelectItem>
                <SelectItem value="info" className="text-[11px]">ℹ Thông tin</SelectItem>
                <SelectItem value="warn" className="text-[11px]">⚠ Cảnh báo</SelectItem>
                <SelectItem value="block" className="text-[11px]">✗ Chặn</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center gap-1">
              <span className="text-[11px] text-text-3">{filtered.length}/{events.length}</span>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-text-3"
                disabled={events.length === 0}
                onClick={() => clearTransportAudit()}>
                <Trash2 className="h-3 w-3 mr-1" /> Xoá nhật ký
              </Button>
            </div>
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="rounded-card border border-dashed border-surface-3 bg-surface-2/50 px-3 py-6 text-center text-table-sm text-text-3">
              {events.length === 0
                ? "Chưa có sự kiện nào — thao tác trên container sẽ xuất hiện ở đây."
                : "Không có sự kiện khớp bộ lọc."}
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto rounded-card border border-surface-3 divide-y divide-surface-3/60">
              {filtered.map((e) => {
                const CatIcon = CATEGORY_META[e.category].icon;
                const SevIcon = SEV_ICON[e.severity];
                return (
                  <div key={e.id} className="px-3 py-2 hover:bg-surface-2/60 transition-colors">
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        "shrink-0 mt-0.5 rounded-full border p-1",
                        SEV_TONE[e.severity],
                      )}>
                        <SevIcon className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-table-sm font-medium text-text-1 min-w-0">
                            <CatIcon className="h-3 w-3 text-text-3 shrink-0" />
                            <span className="truncate">{e.title}</span>
                            {e.containerId && (
                              <span className="font-mono text-[10px] text-primary shrink-0">{e.containerId}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-text-3 tabular-nums shrink-0">
                            <span className="rounded-full border border-surface-3 bg-surface-2 px-1.5 py-0.5 font-mono uppercase">
                              {e.actorRole}
                            </span>
                            <span>{fmtTs(e.ts)}</span>
                          </div>
                        </div>
                        {e.detail && (
                          <div className="mt-0.5 text-[11px] text-text-2 leading-snug">
                            {e.detail}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

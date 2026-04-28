/* ════════════════════════════════════════════════════════════════════════════
   §  TransportAuditPanel — collapsible audit log của 4 ma trận transport.
   §  Shows newest-first, with category filter, severity tone, ts + actorRole.
   ════════════════════════════════════════════════════════════════════════════ */
import { useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, History, Truck, Pencil, MapPin,
  Sparkles, Trash2, Filter, Check, AlertTriangle, X, Info,
  Copy, CheckCheck, Search, RotateCcw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [containerFilter, setContainerFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  // Distinct roles & containers from current event stream
  const roleOptions = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) if (e.actorRole) s.add(e.actorRole);
    return Array.from(s).sort();
  }, [events]);
  const containerOptions = useMemo(() => {
    const s = new Set<string>();
    for (const e of events) if (e.containerId) s.add(e.containerId);
    return Array.from(s).sort();
  }, [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((e) => {
      if (catFilter !== "all" && e.category !== catFilter) return false;
      if (sevFilter !== "all" && e.severity !== sevFilter) return false;
      if (roleFilter !== "all" && e.actorRole !== roleFilter) return false;
      if (containerFilter !== "all" && e.containerId !== containerFilter) return false;
      if (q) {
        const hay = [
          e.id, e.title, e.detail ?? "", e.actorRole ?? "",
          e.containerId ?? "", e.category, e.severity,
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [events, catFilter, sevFilter, roleFilter, containerFilter, query]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { vehicle: 0, qty_edit: 0, drop: 0, fillup: 0 };
    for (const e of events) c[e.category]++;
    return c;
  }, [events]);

  const hasActiveFilter =
    catFilter !== "all" || sevFilter !== "all"
    || roleFilter !== "all" || containerFilter !== "all"
    || query.trim() !== "";

  function resetFilters() {
    setCatFilter("all");
    setSevFilter("all");
    setRoleFilter("all");
    setContainerFilter("all");
    setQuery("");
  }

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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-3 pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề, chi tiết, container, event ID, vai trò…"
              className="h-8 pl-7 pr-7 text-[12px]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-text-3 hover:text-text-1 hover:bg-surface-2"
                aria-label="Xoá tìm kiếm"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-text-3 inline-flex items-center gap-1">
              <Filter className="h-3 w-3" /> Lọc:
            </span>
            <Select value={catFilter} onValueChange={(v) => setCatFilter(v as typeof catFilter)}>
              <SelectTrigger className="h-7 text-[11px] w-[200px]">
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
              <SelectTrigger className="h-7 text-[11px] w-[130px]">
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
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-7 text-[11px] w-[150px]">
                <SelectValue placeholder="Vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[11px]">Tất cả vai trò</SelectItem>
                {roleOptions.map((r) => (
                  <SelectItem key={r} value={r} className="text-[11px] font-mono">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={containerFilter} onValueChange={setContainerFilter}>
              <SelectTrigger className="h-7 text-[11px] w-[160px]">
                <SelectValue placeholder="Container" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-[11px]">Tất cả container</SelectItem>
                {containerOptions.map((c) => (
                  <SelectItem key={c} value={c} className="text-[11px] font-mono">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilter && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-text-3"
                onClick={resetFilters}>
                <RotateCcw className="h-3 w-3 mr-1" /> Đặt lại
              </Button>
            )}
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
              {filtered.map((e) => (
                <AuditRow key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AuditRow({ event: e }: { event: TransportAuditEvent }) {
  const CatIcon = CATEGORY_META[e.category].icon;
  const SevIcon = SEV_ICON[e.severity];
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => JSON.stringify(e, null, 2), [e]);
  const metaEntries = useMemo(
    () => (e.meta ? Object.entries(e.meta) : []),
    [e.meta],
  );
  const highlights = useMemo(() => extractHighlights(e.meta), [e.meta]);
  const highlightedKeys = useMemo(
    () => new Set(highlights.map((h) => h.key)),
    [highlights],
  );

  async function copyJson(ev: React.MouseEvent) {
    ev.stopPropagation();
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      toast({ title: "Đã sao chép", description: "JSON payload đã copy vào clipboard." });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Sao chép thất bại", description: "Trình duyệt không cho phép clipboard.", variant: "destructive" });
    }
  }

  return (
    <div className="hover:bg-surface-2/60 transition-colors">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-3 py-2"
      >
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
                {expanded
                  ? <ChevronDown className="h-3 w-3 text-text-3 shrink-0" />
                  : <ChevronRight className="h-3 w-3 text-text-3 shrink-0" />}
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
              <div className="mt-0.5 ml-[18px] text-[11px] text-text-2 leading-snug">
                {e.detail}
              </div>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pl-[34px] space-y-2 border-t border-surface-3/60 bg-surface-2/40">
          {/* Quick facts grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-2 text-[11px]">
            <Fact label="Ma trận" value={CATEGORY_META[e.category].label} />
            <Fact label="Mức độ" value={e.severity} mono />
            <Fact label="Vai trò" value={e.actorRole} mono />
            <Fact label="Container" value={e.containerId ?? "—"} mono />
            <Fact label="Thời gian" value={fmtTs(e.ts)} mono />
            <Fact label="Event ID" value={e.id} mono />
          </div>

          {/* Structured metadata */}
          {metaEntries.length > 0 && (
            <div className="rounded-card border border-surface-3 bg-surface-1">
              <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-text-3 border-b border-surface-3/60">
                Metadata chi tiết
              </div>
              <div className="divide-y divide-surface-3/40">
                {metaEntries.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[120px_1fr] gap-2 px-2 py-1 text-[11px]">
                    <span className="font-mono text-text-3">{k}</span>
                    <MetaValue value={v} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JSON payload */}
          <div className="rounded-card border border-surface-3 bg-surface-1">
            <div className="flex items-center justify-between px-2 py-1 border-b border-surface-3/60">
              <span className="text-[10px] uppercase tracking-wide text-text-3">JSON payload</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px]"
                onClick={copyJson}
              >
                {copied
                  ? <><CheckCheck className="h-3 w-3 mr-1 text-success" /> Đã copy</>
                  : <><Copy className="h-3 w-3 mr-1" /> Copy JSON</>}
              </Button>
            </div>
            <pre className="px-2 py-1 text-[10.5px] leading-snug font-mono text-text-2 overflow-x-auto max-h-[220px] whitespace-pre">
{json}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-text-3 shrink-0">{label}:</span>
      <span className={cn("truncate text-text-1", mono && "font-mono text-[10.5px]")}>{value}</span>
    </div>
  );
}

function MetaValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-text-3 italic">[]</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v, i) => (
          <span key={i} className="rounded-full border border-surface-3 bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-text-2">
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </span>
        ))}
      </div>
    );
  }
  if (value && typeof value === "object") {
    return (
      <pre className="font-mono text-[10.5px] text-text-2 whitespace-pre-wrap break-all">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  if (typeof value === "boolean") {
    return <span className={cn("font-mono", value ? "text-success" : "text-danger")}>{String(value)}</span>;
  }
  if (value === null || value === undefined) {
    return <span className="text-text-3 italic">—</span>;
  }
  return <span className="text-text-1 break-all">{String(value)}</span>;
}

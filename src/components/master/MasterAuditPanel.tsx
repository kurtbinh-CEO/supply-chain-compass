/**
 * MasterAuditPanel — slide-in panel hiển thị lịch sử CRUD Master Data.
 *
 * Dùng ở 2 mode:
 *   <MasterAuditPanel open onOpenChange ... />                      → toàn bộ (dùng cho header tab)
 *   <MasterAuditPanel ... entity="item" entityCode="GT-6060" />     → 1 row cụ thể
 *
 * Hiển thị diff before/after dạng row-by-row cho action 'update'.
 */
import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMasterAudit, type AuditEntry } from "@/hooks/useMasterData";
import { Loader2, History, Plus, Pencil, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type EntityFilter = "all" | "item" | "factory" | "branch" | "container";

const ENTITY_LABEL: Record<string, string> = {
  item: "Mã hàng",
  factory: "NM",
  branch: "CN",
  container: "Container",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xóa",
  bulk_import: "Nhập Excel",
};

const ACTION_ICON = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  bulk_import: Upload,
} as const;

const ACTION_TONE: Record<string, string> = {
  create: "text-success",
  update: "text-info",
  delete: "text-danger",
  bulk_import: "text-text-3",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entity?: "item" | "factory" | "branch" | "container";
  entityCode?: string;
  title?: string;
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return Number.isInteger(v) ? v.toString() : v.toFixed(2);
  if (typeof v === "boolean") return v ? "✓" : "✗";
  return String(v);
}

const HIDDEN_FIELDS = new Set([
  "id", "tenant", "created_at", "updated_at", "created_by",
]);

function diffFields(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  if (!before || !after) return [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const changes: { field: string; from: unknown; to: unknown }[] = [];
  keys.forEach((k) => {
    if (HIDDEN_FIELDS.has(k)) return;
    const a = before[k];
    const b = after[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) changes.push({ field: k, from: a, to: b });
  });
  return changes;
}

export function MasterAuditPanel({ open, onOpenChange, entity, entityCode, title }: Props) {
  const [filter, setFilter] = useState<EntityFilter>("all");

  const { data: entries = [], isLoading } = useMasterAudit({
    entity,
    entity_code: entityCode,
    limit: 200,
  });

  const filtered = useMemo(() => {
    if (entity || filter === "all") return entries;
    return entries.filter((e) => e.entity === filter);
  }, [entries, filter, entity]);

  const heading = title ?? (entityCode ? `Lịch sử: ${entityCode}` : "Lịch sử thay đổi Master Data");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-surface-3">
          <SheetTitle className="flex items-center gap-2 font-display text-section-header text-text-1">
            <History size={18} className="text-text-3" />
            {heading}
          </SheetTitle>
          <SheetDescription className="text-caption text-text-3">
            {filtered.length} thay đổi gần nhất • lưu vĩnh viễn trên Lovable Cloud
          </SheetDescription>
        </SheetHeader>

        {!entity && !entityCode && (
          <div className="px-5 pt-3">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as EntityFilter)}>
              <TabsList className="grid grid-cols-5 w-full h-8">
                <TabsTrigger value="all" className="text-caption">Tất cả</TabsTrigger>
                <TabsTrigger value="item" className="text-caption">Hàng</TabsTrigger>
                <TabsTrigger value="factory" className="text-caption">NM</TabsTrigger>
                <TabsTrigger value="branch" className="text-caption">CN</TabsTrigger>
                <TabsTrigger value="container" className="text-caption">Cont</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        <div className="flex-1 overflow-auto px-5 py-3 space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-text-3 text-caption">
              <Loader2 size={14} className="animate-spin mr-2" /> Đang tải...
            </div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 text-text-3 text-caption">
              <History size={28} className="mx-auto mb-2 opacity-40" />
              Chưa có thay đổi nào được ghi nhận.
            </div>
          )}
          {filtered.map((entry) => (
            <AuditCard key={entry.id} entry={entry} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function AuditCard({ entry }: { entry: AuditEntry }) {
  const Icon = ACTION_ICON[entry.action] ?? Pencil;
  const tone = ACTION_TONE[entry.action] ?? "text-text-2";
  const changes = entry.action === "update" ? diffFields(entry.before_data, entry.after_data) : [];

  return (
    <div className="rounded-lg border border-surface-3 bg-surface-1 px-3 py-2.5 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={14} className={cn("shrink-0", tone)} />
          <span className={cn("text-table-sm font-medium", tone)}>{ACTION_LABEL[entry.action] ?? entry.action}</span>
          <Badge variant="outline" className="text-caption px-1.5 py-0 h-4 font-normal">
            {ENTITY_LABEL[entry.entity] ?? entry.entity}
          </Badge>
          <span className="font-mono text-table-sm text-text-1 truncate">{entry.entity_code}</span>
        </div>
        <span className="text-caption text-text-3 shrink-0">{fmtRelative(entry.created_at)}</span>
      </div>
      <div className="text-caption text-text-3 pl-6">
        bởi <span className="text-text-2">{entry.actor_name ?? "—"}</span>
      </div>

      {entry.action === "update" && changes.length > 0 && (
        <div className="pl-6 pt-1 space-y-0.5 border-t border-surface-3 mt-1.5">
          {changes.slice(0, 6).map((c) => (
            <div key={c.field} className="text-caption flex items-baseline gap-1.5">
              <span className="text-text-3 min-w-[80px] shrink-0">{c.field}:</span>
              <span className="text-danger line-through truncate">{fmtVal(c.from)}</span>
              <span className="text-text-3">→</span>
              <span className="text-success font-medium truncate">{fmtVal(c.to)}</span>
            </div>
          ))}
          {changes.length > 6 && (
            <div className="text-caption text-text-3 italic">+{changes.length - 6} trường khác</div>
          )}
        </div>
      )}

      {entry.action === "delete" && entry.before_data && (
        <div className="pl-6 pt-1 text-caption text-text-3 italic border-t border-surface-3 mt-1.5">
          Snapshot: {Object.entries(entry.before_data)
            .filter(([k]) => !HIDDEN_FIELDS.has(k))
            .slice(0, 3)
            .map(([k, v]) => `${k}=${fmtVal(v)}`)
            .join(" • ")}
        </div>
      )}
    </div>
  );
}

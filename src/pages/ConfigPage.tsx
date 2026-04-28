import { useMemo, useRef, useState } from "react";
import {
  History,
  Lock,
  Unlock,
  Download,
  Upload,
  RotateCcw,
  Search,
  X,
  ChevronRight,
  CalendarRange,
  Boxes,
  Truck,
  Target,
  ShieldCheck,
  Settings2,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { TransportLogicPanel } from "@/components/config/TransportLogicPanel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  EXT_TABS,
  EXT_CONFIG_KEYS,
  type ExtConfigKey,
  type ExtConfigTab,
} from "@/data/extended-config-keys";

/* ──────────────────────────────────────────────────────────────────────
 * Runtime types
 * ────────────────────────────────────────────────────────────────────── */
type RuntimeRow = ExtConfigKey & { value: string };

const TAB_ICONS: Record<ExtConfigTab, React.ComponentType<{ className?: string }>> = {
  planning: CalendarRange,
  inventory: Boxes,
  transport: Truck,
  kpi: Target,
  approval: ShieldCheck,
  system: Settings2,
};

interface AuditEntry {
  id: string;
  key: string;
  oldValue: string;
  newValue: string;
  by: string;
  at: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h trước`;
  return `${Math.floor(h / 24)}d trước`;
}

/* ──────────────────────────────────────────────────────────────────────
 * Value editor — auto-save on blur (text/number) hoặc onChange (toggle/select)
 * ────────────────────────────────────────────────────────────────────── */
function ValueEditor({
  cfg,
  isDirty,
  locked,
  onCommit,
}: {
  cfg: RuntimeRow;
  isDirty: boolean;
  locked: boolean;
  onCommit: (v: string) => void;
}) {
  const [draft, setDraft] = useState(cfg.value);

  // Sync khi value bên ngoài đổi (vd reset)
  if (draft !== cfg.value && document.activeElement?.tagName !== "INPUT") {
    // best-effort: chỉ resync khi không đang focus
    setTimeout(() => setDraft(cfg.value), 0);
  }

  const ringClass = isDirty
    ? "ring-2 ring-warning/40 ring-offset-1 ring-offset-background"
    : "";

  if (cfg.inputType === "toggle") {
    const on = cfg.value === "true";
    return (
      <Switch
        checked={on}
        disabled={locked}
        onCheckedChange={(c) => onCommit(c ? "true" : "false")}
        aria-label={cfg.key}
      />
    );
  }

  if (cfg.inputType === "select" && cfg.options) {
    return (
      <Select
        value={cfg.value}
        onValueChange={(v) => onCommit(v)}
        disabled={locked}
      >
        <SelectTrigger className={cn("h-8 w-[220px] text-table-sm", ringClass)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {cfg.options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-table-sm">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (cfg.inputType === "number") {
    return (
      <div className={cn("inline-flex items-center gap-1.5 rounded-md", ringClass)}>
        <Input
          type="number"
          value={draft}
          disabled={locked}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            if (draft === cfg.value) return;
            if (draft !== "" && Number.isNaN(Number(draft))) {
              setDraft(cfg.value);
              toast.error("Giá trị phải là số");
              return;
            }
            onCommit(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setDraft(cfg.value);
          }}
          className="h-8 w-28 text-table-sm tabular-nums text-right font-mono"
        />
      </div>
    );
  }

  return (
    <Input
      value={draft}
      disabled={locked}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== cfg.value) onCommit(draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(cfg.value);
      }}
      className={cn("h-8 w-[220px] text-table-sm", ringClass)}
    />
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Page
 * ────────────────────────────────────────────────────────────────────── */
export default function ConfigPage() {
  const [rows, setRows] = useState<RuntimeRow[]>(() =>
    EXT_CONFIG_KEYS.map((k) => ({ ...k, value: String(k.defaultValue) })),
  );
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [search, setSearch] = useState("");
  const [auditOpen, setAuditOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [activeTab, setActiveTab] = useState<ExtConfigTab>(() => {
    if (typeof window === "undefined") return "planning";
    const p = new URLSearchParams(window.location.search).get("tab") as ExtConfigTab | null;
    return EXT_TABS.find((t) => t.v === p)?.v ?? "planning";
  });
  const fileRef = useRef<HTMLInputElement>(null);

  /* Dirty tracking */
  const dirtyKeys = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) if (r.value !== String(r.defaultValue)) s.add(r.key);
    return s;
  }, [rows]);

  /* Filter theo search & tab */
  const visibleByTab = useMemo(() => {
    const m: Record<ExtConfigTab, RuntimeRow[]> = {
      planning: [], inventory: [], transport: [], kpi: [], approval: [], system: [],
    };
    const q = search.trim().toLowerCase();
    for (const r of rows) {
      if (q) {
        const hay = `${r.key} ${r.label} ${r.description}`.toLowerCase();
        if (!hay.includes(q)) continue;
      }
      m[r.tab].push(r);
    }
    return m;
  }, [rows, search]);

  const dirtyByTab = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of EXT_TABS) {
      m[t.v] = (visibleByTab[t.v] ?? []).filter((r) => dirtyKeys.has(r.key)).length;
    }
    return m;
  }, [visibleByTab, dirtyKeys]);

  /* Mutations */
  const commitValue = (key: string, newValue: string) => {
    if (locked) {
      toast.error("Cấu hình đang khóa", { description: "Mở khóa để chỉnh sửa." });
      return;
    }
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key === key);
      if (idx < 0) return prev;
      const old = prev[idx].value;
      if (old === newValue) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], value: newValue };
      setAudit((a) =>
        [
          {
            id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            key, oldValue: old, newValue,
            by: "Bạn (SC Manager)",
            at: Date.now(),
          },
          ...a,
        ].slice(0, 100),
      );
      toast.success(`Đã lưu ${key}`, { description: `Giá trị mới: ${newValue}` });
      return next;
    });
  };

  const resetOne = (key: string) => {
    if (locked) {
      toast.error("Cấu hình đang khóa");
      return;
    }
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.key === key);
      if (idx < 0) return prev;
      const def = String(prev[idx].defaultValue);
      const old = prev[idx].value;
      if (old === def) {
        toast.info("Đã ở giá trị mặc định");
        return prev;
      }
      const next = [...prev];
      next[idx] = { ...next[idx], value: def };
      setAudit((a) =>
        [
          {
            id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            key, oldValue: old, newValue: def,
            by: "Bạn (SC Manager) — reset",
            at: Date.now(),
          },
          ...a,
        ].slice(0, 100),
      );
      toast.success(`Đã khôi phục mặc định ${key}`);
      return next;
    });
  };

  /* Import / Export */
  const exportConfig = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      tenant: rows.find((r) => r.key === "system.tenant_id")?.value ?? "UNIS",
      version: "P2-CONFIG-1.0",
      values: Object.fromEntries(rows.map((r) => [r.key, r.value])),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = url;
    a.download = `config-${payload.tenant}-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất cấu hình", {
      description: `${rows.length} khoá · file JSON`,
    });
  };

  const onImportFile = async (file: File) => {
    if (locked) {
      toast.error("Mở khóa trước khi nhập cấu hình");
      return;
    }
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const values = json?.values ?? json;
      if (!values || typeof values !== "object") throw new Error("Không có trường values");
      let applied = 0;
      let skipped = 0;
      setRows((prev) =>
        prev.map((r) => {
          if (Object.prototype.hasOwnProperty.call(values, r.key)) {
            const v = String(values[r.key]);
            if (v !== r.value) applied++;
            return { ...r, value: v };
          }
          skipped++;
          return r;
        }),
      );
      toast.success("Đã nhập cấu hình", {
        description: `${applied} khoá cập nhật · ${skipped} giữ nguyên`,
      });
    } catch (err) {
      toast.error("File cấu hình không hợp lệ", {
        description: err instanceof Error ? err.message : "JSON sai định dạng",
      });
    }
  };

  /* Build SmartTable cho 1 tab */
  const buildColumns = (): SmartTableColumn<RuntimeRow>[] => [
    {
      key: "key",
      label: "MÃ KEY",
      width: 280,
      sortable: true,
      filter: "text",
      accessor: (r) => r.key,
      render: (r) => (
        <code className="text-[11px] font-mono text-text-1 bg-surface-1 px-1.5 py-0.5 rounded-sm border border-surface-3/50 break-all">
          {r.key}
        </code>
      ),
    },
    {
      key: "label",
      label: "TÊN THAM SỐ",
      width: 240,
      sortable: true,
      filter: "text",
      accessor: (r) => r.label,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          <span className="text-table-sm font-medium text-text-1">{r.label}</span>
          {dirtyKeys.has(r.key) && (
            <span className="inline-flex items-center rounded-sm bg-warning-bg text-warning border border-warning/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              sửa
            </span>
          )}
        </div>
      ),
    },
    {
      key: "value",
      label: "GIÁ TRỊ",
      width: 260,
      align: "left",
      accessor: (r) => r.value,
      render: (r) => (
        <ValueEditor
          cfg={r}
          isDirty={dirtyKeys.has(r.key)}
          locked={locked}
          onCommit={(v) => commitValue(r.key, v)}
        />
      ),
    },
    {
      key: "unit",
      label: "ĐƠN VỊ",
      width: 90,
      align: "center",
      accessor: (r) => r.unit ?? "",
      render: (r) =>
        r.unit ? (
          <span className="text-table-sm text-text-2">{r.unit}</span>
        ) : (
          <span className="text-text-3">—</span>
        ),
    },
    {
      key: "description",
      label: "MÔ TẢ",
      minWidth: 220,
      accessor: (r) => r.description,
      render: (r) => (
        <span className="text-table-sm text-text-2">{r.description}</span>
      ),
    },
    {
      key: "default",
      label: "MẶC ĐỊNH",
      width: 140,
      align: "right",
      numeric: true,
      accessor: (r) => String(r.defaultValue),
      render: (r) => (
        <code className="text-[11px] font-mono text-text-3">
          {String(r.defaultValue)}
        </code>
      ),
    },
    {
      key: "actions",
      label: "",
      width: 60,
      align: "center",
      accessor: () => "",
      render: (r) =>
        dirtyKeys.has(r.key) ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-text-3 hover:text-text-1"
            onClick={() => resetOne(r.key)}
            title="Khôi phục mặc định"
            aria-label={`Khôi phục mặc định ${r.key}`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <span className="text-text-3/40">—</span>
        ),
    },
  ];

  const totalKeys = rows.length;
  const totalDirty = dirtyKeys.size;

  return (
    <AppLayout>
      <ScreenHeader
        title="Cấu hình hệ thống"
        subtitle={`${totalKeys} tham số · ${EXT_TABS.length} nhóm chức năng${
          totalDirty > 0 ? ` · ${totalDirty} đang chỉnh` : ""
        }${locked ? " · 🔒 Đã khóa" : ""}`}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 whitespace-nowrap"
              onClick={() => fileRef.current?.click()}
              disabled={locked}
            >
              <Upload className="h-3.5 w-3.5" />
              Nhập cấu hình
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportFile(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 whitespace-nowrap"
              onClick={exportConfig}
            >
              <Download className="h-3.5 w-3.5" />
              Xuất cấu hình
            </Button>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 gap-1.5 whitespace-nowrap",
                locked && "border-warning/40 bg-warning-bg text-warning hover:bg-warning-bg",
              )}
              onClick={() => {
                setLocked((l) => {
                  const next = !l;
                  toast.success(next ? "Đã khóa cấu hình" : "Đã mở khóa cấu hình", {
                    description: next
                      ? "Chỉ Admin mới mở khóa được."
                      : "Có thể chỉnh sửa lại các tham số.",
                  });
                  return next;
                });
              }}
            >
              {locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {locked ? "Mở khóa" : "Khóa cấu hình"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 whitespace-nowrap"
              onClick={() => setAuditOpen(true)}
            >
              <History className="h-3.5 w-3.5" />
              Nhật ký
              {audit.length > 0 && (
                <span className="ml-0.5 inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-surface-2 text-text-2 text-[10px] font-semibold px-1">
                  {audit.length}
                </span>
              )}
            </Button>
          </>
        }
      />

      {/* Search */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã key, tên hoặc mô tả (vd: planning.sop, fill rate, ETA)…"
            className="pl-9 pr-9 h-9 text-table-sm bg-surface-0"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full hover:bg-surface-2 flex items-center justify-center text-text-3 hover:text-text-1"
              aria-label="Xoá tìm kiếm"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {search && (
          <span className="text-caption text-text-3">
            Tìm thấy{" "}
            <span className="font-semibold text-text-1 tabular-nums">
              {Object.values(visibleByTab).reduce((a, r) => a + r.length, 0)}
            </span>{" "}
            tham số
          </span>
        )}
      </div>

      {/* 6 tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ExtConfigTab)}
        className="space-y-4"
      >
        <TabsList className="h-auto p-1 flex flex-wrap gap-1 bg-surface-1">
          {EXT_TABS.map((t) => {
            const Icon = TAB_ICONS[t.v];
            const cnt = visibleByTab[t.v]?.length ?? 0;
            const dirty = dirtyByTab[t.v] ?? 0;
            return (
              <TabsTrigger
                key={t.v}
                value={t.v}
                className="data-[state=active]:bg-surface-0 data-[state=active]:text-text-1 data-[state=active]:shadow-sm gap-1.5 px-3 py-1.5 text-table-sm"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
                <span className="text-caption text-text-3 tabular-nums">({cnt})</span>
                {dirty > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-warning text-warning-foreground text-[10px] font-bold px-1">
                    {dirty}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {EXT_TABS.map((t) => {
          const Icon = TAB_ICONS[t.v];
          const data = visibleByTab[t.v] ?? [];
          return (
            <TabsContent key={t.v} value={t.v} className="space-y-3 mt-0">
              <div className="flex items-start gap-3 px-1">
                <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-headline-3 font-display font-semibold text-text-1 leading-tight">
                    {t.label}
                  </h2>
                  <p className="text-table-sm text-text-3 mt-0.5">{t.caption}</p>
                </div>
              </div>

              {/* 4 ma trận logic vận tải — chỉ hiển thị tại tab Vận tải */}
              {t.v === "transport" && <TransportLogicPanel />}

              <SmartTable<RuntimeRow>
                screenId={`config-${t.v}`}
                columns={buildColumns()}
                data={data}
                defaultDensity="compact"
                exportFilename={`config-${t.v}`}
                emptyState={{
                  icon: <Search className="h-8 w-8 text-text-3/40" />,
                  title: "Không có tham số nào khớp",
                  description: "Thử bỏ filter hoặc đổi từ khoá tìm kiếm.",
                }}
              />
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Audit drawer */}
      <Sheet open={auditOpen} onOpenChange={setAuditOpen}>
        <SheetContent
          side="right"
          className="w-full sm:w-[clamp(420px,42vw,560px)] sm:max-w-[560px] p-0 flex flex-col"
        >
          <SheetHeader className="px-5 py-4 border-b border-surface-3 bg-surface-1/60">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <History className="h-4 w-4" />
              </div>
              <div>
                <SheetTitle className="text-headline-3 font-semibold text-text-1">
                  Nhật ký thay đổi cấu hình
                </SheetTitle>
                <p className="text-table-sm text-text-3 mt-0.5">
                  {audit.length} thay đổi gần nhất
                </p>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            {audit.length === 0 ? (
              <p className="text-table-sm text-text-3 text-center py-8">
                Chưa có thay đổi nào.
              </p>
            ) : (
              audit.map((a) => (
                <div
                  key={a.id}
                  className="rounded-md border border-surface-3 bg-surface-0 p-3 hover:border-surface-3/80 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <code className="text-[11px] font-mono text-text-1 bg-surface-1 px-1.5 py-0.5 rounded-sm border border-surface-3/50 truncate">
                      {a.key}
                    </code>
                    <span className="text-caption text-text-3 shrink-0 ml-auto">
                      {timeAgo(a.at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-table-sm tabular-nums">
                    <span className="text-text-3 line-through">{a.oldValue || "∅"}</span>
                    <ChevronRight className="h-3 w-3 text-text-3" />
                    <span className="text-success font-semibold">{a.newValue || "∅"}</span>
                  </div>
                  <p className="text-caption text-text-3 mt-1.5">bởi {a.by}</p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ScreenFooter actionCount={4} />
    </AppLayout>
  );
}

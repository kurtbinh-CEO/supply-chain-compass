import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ArrowRight, Clock, Box, Building2, Factory, FileText, Lock, RefreshCw, Play, Download,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Routes — 17 entries with VN labels                                          */
/* ─────────────────────────────────────────────────────────────────────────── */
const ROUTES: Array<{ path: string; label: string; group: string }> = [
  { path: "/workspace",       label: "Workspace",            group: "Workspace" },
  { path: "/monitoring",      label: "Giám sát",             group: "Giám sát" },
  { path: "/demand",          label: "Demand Review",        group: "Kế hoạch tháng" },
  { path: "/sop",             label: "S&OP Consensus",       group: "Kế hoạch tháng" },
  { path: "/hub",             label: "Hub & Sourcing",       group: "Kế hoạch tháng" },
  { path: "/gap-scenario",    label: "Gap & Kịch bản",       group: "Kế hoạch tháng" },
  { path: "/inventory",       label: "Tồn kho",              group: "Vận hành ngày" },
  { path: "/demand-weekly",   label: "Nhu cầu tuần",         group: "Vận hành ngày" },
  { path: "/drp",             label: "Kết quả DRP",          group: "Vận hành ngày" },
  { path: "/orders",          label: "Đơn hàng",             group: "Vận hành ngày" },
  { path: "/sync",            label: "Đồng bộ",              group: "Quản trị" },
  { path: "/cn-portal",       label: "CN Portal",            group: "Đối tác" },
  { path: "/cn-portal",       label: "Cổng chi nhánh",       group: "Đối tác" },
  { path: "/master-data",     label: "Master Data",          group: "Cấu hình" },
  { path: "/reports",         label: "Báo cáo",              group: "Cấu hình" },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Entity index — minimal mock for type-ahead                                  */
/* ─────────────────────────────────────────────────────────────────────────── */
type EntityKind = "PO" | "SKU" | "CN" | "NM";
const ENTITIES: Array<{ kind: EntityKind; id: string; label: string; to: string }> = [
  { kind: "SKU", id: "GA-300", label: "GA-300 — Bao gạo 25kg",   to: "/master-data?sku=GA-300" },
  { kind: "SKU", id: "GA-450", label: "GA-450 — Bao gạo 50kg",   to: "/master-data?sku=GA-450" },
  { kind: "SKU", id: "GA-600", label: "GA-600 — Bao đường",      to: "/master-data?sku=GA-600" },
  { kind: "SKU", id: "GA-800", label: "GA-800 — Bao bột",        to: "/master-data?sku=GA-800" },
  { kind: "CN",  id: "CN-BD",  label: "CN Bình Dương",           to: "/cn-portal?cn=CN-BD" },
  { kind: "CN",  id: "CN-HCM", label: "CN TP HCM",               to: "/cn-portal?cn=CN-HCM" },
  { kind: "CN",  id: "CN-HN",  label: "CN Hà Nội",               to: "/cn-portal?cn=CN-HN" },
  { kind: "NM",  id: "MIKADO", label: "Mikado",                  to: "/gap-scenario?nm=mikado" },
  { kind: "NM",  id: "TOKO",   label: "Toko",                    to: "/gap-scenario?nm=toko" },
  { kind: "NM",  id: "DONGTAM",label: "Đồng Tâm",                to: "/gap-scenario?nm=dongtam" },
  { kind: "PO",  id: "PO-TKO-2605-001", label: "PO Toko T5/26 #001", to: "/orders?po=PO-TKO-2605-001" },
  { kind: "PO",  id: "PO-MKD-2605-002", label: "PO Mikado T5/26 #002", to: "/orders?po=PO-MKD-2605-002" },
];

const ENTITY_ICON: Record<EntityKind, typeof Box> = {
  PO: FileText, SKU: Box, CN: Building2, NM: Factory,
};

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Context                                                                     */
/* ─────────────────────────────────────────────────────────────────────────── */
interface CommandPaletteCtx { open: () => void; close: () => void; isOpen: boolean; }
const Ctx = createContext<CommandPaletteCtx | null>(null);
export function useCommandPalette() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCommandPalette must be used inside CommandPaletteProvider");
  return v;
}

const RECENT_KEY = "cmd-palette-recent";

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Recent route paths (max 3)
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
  });
  const pushRecent = useCallback((path: string) => {
    setRecent((prev) => {
      const next = [path, ...prev.filter((p) => p !== path)].slice(0, 3);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Global keyboard shortcut: ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const recentRoutes = useMemo(
    () => recent.map((p) => ROUTES.find((r) => r.path === p)).filter(Boolean) as typeof ROUTES,
    [recent],
  );
  const otherRoutes = useMemo(
    () => ROUTES.filter((r) => !recent.includes(r.path)),
    [recent],
  );

  const go = (path: string) => {
    pushRecent(path);
    navigate(path);
    close();
  };

  const runQuickAction = (action: string) => {
    close();
    switch (action) {
      case "drp":     toast.success("Đang chạy DRP…", { description: "Batch sẽ xuất hiện ở /drp khi xong" }); navigate("/drp"); break;
      case "sync":    toast.success("Đang đồng bộ dữ liệu…"); navigate("/sync"); break;
      case "lock":    toast.success("Mở dialog Lock S&OP", { description: "Yêu cầu approver SC Manager" }); navigate("/sop"); break;
      case "export":  toast.success("Đang xuất báo cáo…"); navigate("/reports"); break;
    }
  };

  return (
    <Ctx.Provider value={{ open, close, isOpen }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-lg max-w-[640px]">
          <Command className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-caption [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-3">
            <CommandInput placeholder="Tìm trang, SKU, PO, NM, CN… hoặc gõ lệnh" />
            <CommandList className="max-h-[420px]">
              <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>

              {recentRoutes.length > 0 && (
                <>
                  <CommandGroup heading="Gần đây">
                    {recentRoutes.map((r) => (
                      <CommandItem key={`recent-${r.path}`} value={`recent ${r.label} ${r.path}`} onSelect={() => go(r.path)}>
                        <Clock className="mr-2 h-4 w-4 text-text-3" />
                        <span>{r.label}</span>
                        <span className="ml-auto text-caption font-mono text-text-3">{r.path}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              <CommandGroup heading="Điều hướng">
                {otherRoutes.map((r) => (
                  <CommandItem key={r.path} value={`${r.label} ${r.group} ${r.path}`} onSelect={() => go(r.path)}>
                    <ArrowRight className="mr-2 h-4 w-4 text-text-3" />
                    <span>{r.label}</span>
                    <span className="ml-2 text-caption text-text-3">· {r.group}</span>
                    <span className="ml-auto text-caption font-mono text-text-3">{r.path}</span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Tìm thực thể (PO / SKU / CN / NM)">
                {ENTITIES.map((e) => {
                  const Icon = ENTITY_ICON[e.kind];
                  return (
                    <CommandItem key={`${e.kind}-${e.id}`} value={`${e.kind} ${e.id} ${e.label}`} onSelect={() => go(e.to)}>
                      <Icon className="mr-2 h-4 w-4 text-text-3" />
                      <span className="font-mono text-text-1">{e.id}</span>
                      <span className="ml-2 text-text-2 truncate">{e.label}</span>
                      <span className="ml-auto text-caption px-1.5 py-0.5 rounded bg-surface-3 text-text-3">{e.kind}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Hành động nhanh">
                <CommandItem value="quick chạy drp run" onSelect={() => runQuickAction("drp")}>
                  <Play className="mr-2 h-4 w-4 text-primary" /> Chạy DRP
                </CommandItem>
                <CommandItem value="quick đồng bộ sync" onSelect={() => runQuickAction("sync")}>
                  <RefreshCw className="mr-2 h-4 w-4 text-info" /> Đồng bộ
                </CommandItem>
                <CommandItem value="quick khóa lock sop" onSelect={() => runQuickAction("lock")}>
                  <Lock className="mr-2 h-4 w-4 text-warning" /> Khóa S&OP
                </CommandItem>
                <CommandItem value="quick xuất export báo cáo report" onSelect={() => runQuickAction("export")}>
                  <Download className="mr-2 h-4 w-4 text-success" /> Xuất báo cáo
                </CommandItem>
              </CommandGroup>
            </CommandList>

            {/* Shortcut footer (10 shortcuts) */}
            <div className="border-t border-surface-3 px-3 py-2 grid grid-cols-2 md:grid-cols-5 gap-x-3 gap-y-1.5 bg-surface-1">
              {SHORTCUTS.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 text-caption text-text-3">
                  <kbd className={cn("rounded bg-surface-3 px-1.5 py-0.5 font-mono text-text-2 text-[10px]")}>{s.key}</kbd>
                  <span className="truncate">{s.label}</span>
                </div>
              ))}
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

const SHORTCUTS: Array<{ key: string; label: string }> = [
  { key: "⌘K",   label: "Mở palette" },
  { key: "⌘E",   label: "Mở rộng" },
  { key: "⌘⇧F",  label: "Toàn màn hình" },
  { key: "⌘S",   label: "Lưu" },
  { key: "⌘Z",   label: "Hoàn tác" },
  { key: "⌘⇧Z",  label: "Làm lại" },
  { key: "⌘/",   label: "Trợ giúp" },
  { key: "Esc",  label: "Đóng" },
  { key: "←→",  label: "Chuyển tab" },
  { key: "↑↓",  label: "Chọn dòng" },
];

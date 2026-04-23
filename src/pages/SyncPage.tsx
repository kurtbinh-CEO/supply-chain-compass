import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  Database,
  FileSpreadsheet,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useWorkspace } from "@/components/WorkspaceContext";
import { NmUploadPreviewDialog } from "@/components/supply/NmUploadPreviewDialog";
import { FACTORIES, type NmId } from "@/data/unis-enterprise-dataset";

type SyncStatus = "fresh" | "stale" | "blocked" | "ok";

interface SyncSource {
  id: string;
  name: string;
  icon: React.ElementType;
  lastSyncHours: number;
  records: number;
  status: SyncStatus;
  description: string;
}

interface HistoryRow {
  id: string;
  date: string;
  source: string;
  by: string;
  records: number;
  errors: number;
}

const initialSources: SyncSource[] = [
  { id: "bravo", name: "Bravo ERP", icon: Database, lastSyncHours: 1.2, records: 4820, status: "fresh", description: "Tồn kho + PO + master data" },
  { id: "nm", name: "NM Upload", icon: FileSpreadsheet, lastSyncHours: 26, records: 1240, status: "stale", description: "Excel commitment từ NM" },
  { id: "hub", name: "Hub ảo", icon: RefreshCw, lastSyncHours: 0.3, records: 312, status: "ok", description: "Recompute từ SOP+Released" },
];

const initialHistory: HistoryRow[] = [
  { id: "H-010", date: "23/04 08:00", source: "Bravo ERP", by: "System (cron)",  records: 4820, errors: 0 },
  { id: "H-009", date: "23/04 06:00", source: "Hub ảo",    by: "System (cron)",  records: 312,  errors: 0 },
  { id: "H-008", date: "22/04 16:30", source: "NM Upload", by: "Mikado",         records: 88,   errors: 2 },
  { id: "H-007", date: "22/04 11:15", source: "NM Upload", by: "Đồng Tâm",       records: 64,   errors: 0 },
  { id: "H-006", date: "22/04 08:00", source: "Bravo ERP", by: "System (cron)",  records: 4795, errors: 0 },
  { id: "H-005", date: "21/04 14:20", source: "NM Upload", by: "Toko",           records: 52,   errors: 1 },
  { id: "H-004", date: "21/04 08:00", source: "Bravo ERP", by: "System (cron)",  records: 4810, errors: 0 },
  { id: "H-003", date: "20/04 18:45", source: "NM Upload", by: "Phú Mỹ",         records: 41,   errors: 5 },
  { id: "H-002", date: "20/04 08:00", source: "Bravo ERP", by: "Anh Minh",       records: 4788, errors: 0 },
  { id: "H-001", date: "19/04 08:00", source: "Bravo ERP", by: "System (cron)",  records: 4774, errors: 0 },
];

const STATUS_META: Record<SyncStatus, { label: string; color: string; bg: string; icon: string; chipBg: string; chipText: string }> = {
  fresh:   { label: "FRESH",   color: "text-success", bg: "bg-success",  icon: "🟢", chipBg: "bg-success/10",  chipText: "text-success" },
  ok:      { label: "OK",      color: "text-success", bg: "bg-success",  icon: "🟢", chipBg: "bg-success/10",  chipText: "text-success" },
  stale:   { label: "STALE",   color: "text-warning", bg: "bg-warning",  icon: "🟡", chipBg: "bg-warning/10",  chipText: "text-warning" },
  blocked: { label: "BLOCKED", color: "text-danger",  bg: "bg-danger",   icon: "🔴", chipBg: "bg-danger/10",   chipText: "text-danger" },
};

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} phút`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${Math.floor(h)}h (${(h / 24).toFixed(1)} ngày)`;
}

function StatusCard({ source }: { source: SyncSource }) {
  const meta = STATUS_META[source.status];
  const Icon = source.icon;
  return (
    <div className="rounded-card border border-surface-3 bg-surface-1 p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className={cn("h-9 w-9 rounded-button flex items-center justify-center", meta.chipBg)}>
            <Icon className={cn("h-4 w-4", meta.color)} />
          </div>
          <div>
            <div className="text-table font-semibold text-text-1">{source.name}</div>
            <div className="text-caption text-text-3">{source.description}</div>
          </div>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-caption font-bold", meta.chipBg, meta.chipText)}>
          {meta.icon} {meta.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-3">
        <div>
          <div className="text-caption text-text-3 flex items-center gap-1"><Clock className="h-3 w-3" /> Sync cuối</div>
          <div className="text-table font-medium text-text-1 mt-0.5">{formatHours(source.lastSyncHours)} trước</div>
        </div>
        <div>
          <div className="text-caption text-text-3">Bản ghi</div>
          <div className="text-table font-medium text-text-1 mt-0.5 font-mono">{source.records.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

export default function SyncPage() {
  const navigate = useNavigate();
  const { addNotification } = useWorkspace();
  const [sources, setSources] = useState(initialSources);
  const [history, setHistory] = useState(initialHistory);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  const blocked = useMemo(() => sources.find((s) => s.lastSyncHours > 72), [sources]);
  const hasBlocked = !!blocked;

  // Trigger blocked notification once on mount if any source is blocked
  useMemo(() => {
    if (hasBlocked && blocked) {
      addNotification({
        id: `NTF-SYNC-${Date.now()}`,
        type: "DATA_STALE",
        typeColor: "danger",
        message: `URGENT: ${blocked.name} chưa sync ${formatHours(blocked.lastSyncHours)} → CHẶN PO chiều nay.`,
        timeAgo: "vừa xong",
        read: false,
        url: "/sync",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSyncNow = () => {
    if (syncing) return;
    setSyncing(true);
    setProgress(0);
    const t0 = Date.now();
    const tick = setInterval(() => {
      const elapsed = (Date.now() - t0) / 3000;
      if (elapsed >= 1) {
        clearInterval(tick);
        setProgress(100);
        setSyncing(false);
        // Refresh sources to fresh
        setSources((prev) =>
          prev.map((s) =>
            s.id === "bravo" ? { ...s, lastSyncHours: 0.05, status: "fresh" as SyncStatus, records: s.records + 12 } : s,
          ),
        );
        const newRow: HistoryRow = {
          id: `H-${Date.now()}`,
          date: new Date().toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
          source: "Bravo ERP",
          by: "Anh Minh (manual)",
          records: 4832,
          errors: 0,
        };
        setHistory((prev) => [newRow, ...prev].slice(0, 10));
        toast.success("Sync thành công", { description: "Bravo ERP: 4.832 bản ghi · 0 lỗi · 3.0s" });
      } else {
        setProgress(Math.min(elapsed * 100, 95));
      }
    }, 80);
  };

  const handleUploadConfirm = () => {
    setShowUpload(false);
    setSources((prev) =>
      prev.map((s) =>
        s.id === "nm" ? { ...s, lastSyncHours: 0.1, status: "fresh" as SyncStatus, records: s.records + 4 } : s,
      ),
    );
    const newRow: HistoryRow = {
      id: `H-${Date.now()}`,
      date: new Date().toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
      source: "NM Upload",
      by: "Mikado",
      records: 4,
      errors: 1,
    };
    setHistory((prev) => [newRow, ...prev].slice(0, 10));
    toast.success("Đã import NM commitment", { description: "3 dòng OK · 1 dòng lỗi (đã skip)" });
  };

  const uploadNm = FACTORIES[0];

  return (
    <div className="p-8 max-w-screen-2xl mx-auto">
      <ScreenHeader
        title="Đồng bộ dữ liệu"
        subtitle="F2-B1 · Bravo ERP + NM Upload + Hub ảo — sync trước cutoff CN 09:00"
      />

      {hasBlocked && blocked && (
        <div className="mb-5 rounded-card border-2 border-danger/40 bg-danger/10 p-4 flex items-start gap-3 animate-fade-in">
          <XCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-table font-semibold text-danger">
              ⛔ CHẶN: {blocked.name} đã {formatHours(blocked.lastSyncHours)} không sync
            </div>
            <div className="text-table-sm text-text-2 mt-1">
              Vượt ngưỡng 72h → DRP không được trigger, PO chiều nay bị chặn vì dữ liệu thiếu tin cậy.
              Liên hệ NM để upload ngay hoặc force-skip với phê duyệt SC Manager.
            </div>
          </div>
          <Button size="sm" variant="destructive" onClick={() => setShowUpload(true)}>
            Upload ngay
          </Button>
        </div>
      )}

      {/* SECTION 1: Sync Status */}
      <section className="mb-6">
        <h2 className="font-display text-section-header text-text-1 mb-3">Trạng thái đồng bộ</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sources.map((s) => <StatusCard key={s.id} source={s} />)}
        </div>
      </section>

      {/* SECTION 2: Actions */}
      <section className="mb-6 rounded-card border border-surface-3 bg-surface-1 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-section-header text-text-1">Hành động</h2>
            <p className="text-caption text-text-3 mt-0.5">Sync thủ công hoặc nhận file NM</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSyncNow} disabled={syncing} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
              {syncing ? "Đang sync..." : "Sync Now (Bravo)"}
            </Button>
            <Button variant="outline" onClick={() => setShowUpload(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Upload NM
            </Button>
          </div>
        </div>
        {syncing && (
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-caption text-text-3">
              <span>Pulling từ Bravo ERP...</span>
              <span className="font-mono">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </section>

      {/* SECTION 3: History */}
      <section className="rounded-card border border-surface-3 bg-surface-1 overflow-hidden">
        <div className="px-5 py-3 border-b border-surface-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-section-header text-text-1">Lịch sử đồng bộ</h2>
            <p className="text-caption text-text-3 mt-0.5">10 lần gần nhất</p>
          </div>
        </div>
        <table className="w-full">
          <thead className="bg-surface-2/50">
            <tr className="text-table-sm text-text-3 text-left">
              <th className="px-4 py-2 font-medium">Thời gian</th>
              <th className="px-4 py-2 font-medium">Nguồn</th>
              <th className="px-4 py-2 font-medium">Người thực hiện</th>
              <th className="px-4 py-2 font-medium text-right">Bản ghi</th>
              <th className="px-4 py-2 font-medium text-right">Lỗi</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-t border-surface-3 hover:bg-surface-2/30 transition-colors">
                <td className="px-4 py-2.5 text-table-sm text-text-2 font-mono">{row.date}</td>
                <td className="px-4 py-2.5 text-table-sm text-text-1 font-medium">{row.source}</td>
                <td className="px-4 py-2.5 text-table-sm text-text-2">{row.by}</td>
                <td className="px-4 py-2.5 text-table-sm text-text-1 font-mono text-right">{row.records.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-table-sm font-mono text-right">
                  {row.errors === 0 ? (
                    <span className="inline-flex items-center gap-1 text-success">
                      <CheckCircle2 className="h-3 w-3" /> 0
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-warning font-semibold">
                      <AlertTriangle className="h-3 w-3" /> {row.errors}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Bước tiếp */}
      <button
        onClick={() => navigate("/cn-portal")}
        className="mt-6 w-full rounded-card border border-primary/30 bg-primary/5 px-5 py-3 flex items-center justify-between hover:bg-primary/10 transition-colors group"
      >
        <div className="text-left">
          <div className="text-caption text-text-3 uppercase tracking-wider">Bước tiếp</div>
          <div className="text-table font-semibold text-text-1 mt-0.5">
            Data fresh → CN điều chỉnh ±30% trước cutoff 09:00
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-primary font-medium text-table-sm">
          Mở CN Portal <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

      <ScreenFooter actionCount={history.length + sources.length} />

      {showUpload && (
        <NmUploadPreviewDialog
          nmId={uploadNm.id as NmId}
          nmName={uploadNm.name}
          fileName="NM_Commitment_W17.xlsx"
          onClose={() => setShowUpload(false)}
          onConfirm={handleUploadConfirm}
        />
      )}
    </div>
  );
}

/**
 * Step 3 — PO & Theo dõi: burn-down per NM.
 * 4 summary cards + SmartTable per-NM with weekly PO drill-down.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Package, Truck, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { SummaryCards, type SummaryCard } from "@/components/SummaryCards";
import { toast } from "sonner";

interface WeeklyPo {
  poNumber: string;
  week: number;
  sku: string;
  qty: number;
  status: "completed" | "in_transit" | "draft";
  releaseDate: string;
}

interface NmTrackRow {
  nm: string;
  committed: number;
  released: number;
  remaining: number;
  pct: number;
  onTrack: "ok" | "slow" | "very_slow" | "done";
  pos: WeeklyPo[];
}

const SEED: NmTrackRow[] = [
  { nm: "Mikado", committed: 4200, released: 3000, remaining: 1200, pct: 71, onTrack: "ok", pos: [
    { poNumber: "PO-HN-W18-001", week: 18, sku: "GA-300", qty: 1200, status: "completed", releaseDate: "05/05" },
    { poNumber: "PO-HN-W19-001", week: 19, sku: "GA-300", qty: 1000, status: "in_transit", releaseDate: "12/05" },
    { poNumber: "PO-HN-W20-001", week: 20, sku: "GA-300", qty: 800, status: "draft", releaseDate: "19/05" },
  ]},
  { nm: "Toko", committed: 3000, released: 1200, remaining: 1800, pct: 40, onTrack: "slow", pos: [
    { poNumber: "PO-HN-W18-002", week: 18, sku: "GA-600", qty: 600, status: "completed", releaseDate: "05/05" },
    { poNumber: "PO-HN-W19-002", week: 19, sku: "GA-600", qty: 600, status: "in_transit", releaseDate: "12/05" },
  ]},
  { nm: "Đồng Tâm", committed: 2800, released: 2800, remaining: 0, pct: 100, onTrack: "done", pos: [
    { poNumber: "PO-HN-W18-003", week: 18, sku: "GA-450", qty: 1400, status: "completed", releaseDate: "05/05" },
    { poNumber: "PO-HN-W19-003", week: 19, sku: "GA-450", qty: 1400, status: "completed", releaseDate: "12/05" },
  ]},
  { nm: "Vigracera", committed: 1500, released: 600, remaining: 900, pct: 40, onTrack: "slow", pos: [
    { poNumber: "PO-HN-W18-004", week: 18, sku: "GA-450", qty: 600, status: "completed", releaseDate: "05/05" },
  ]},
  { nm: "Phú Mỹ", committed: 1200, released: 200, remaining: 1000, pct: 17, onTrack: "very_slow", pos: [
    { poNumber: "PO-HN-W18-005", week: 18, sku: "GA-300", qty: 200, status: "completed", releaseDate: "05/05" },
  ]},
];

interface Props {
  scale: number;
  onPrev: () => void;
}

export function Step3Tracking({ scale, onPrev }: Props) {
  const navigate = useNavigate();
  const rows = useMemo(() => SEED.map(r => ({
    ...r,
    committed: Math.round(r.committed * scale),
    released: Math.round(r.released * scale),
    remaining: Math.round(r.remaining * scale),
    pos: r.pos.map(p => ({ ...p, qty: Math.round(p.qty * scale) })),
  })), [scale]);

  const totals = useMemo(() => {
    const committed = rows.reduce((s, r) => s + r.committed, 0);
    const released = rows.reduce((s, r) => s + r.released, 0);
    const remaining = committed - released;
    const pct = committed > 0 ? Math.round((released / committed) * 100) : 0;
    const totalPos = rows.reduce((s, r) => s + r.pos.length, 0);
    return { committed, released, remaining, pct, totalPos, nmCount: rows.length };
  }, [rows]);

  const dayCurrent = 24, dayMonth = 30;
  const expectedPct = Math.round((dayCurrent / dayMonth) * 100);
  const progressTone: "ok" | "warn" | "critical" =
    totals.pct >= expectedPct ? "ok" : totals.pct >= expectedPct - 15 ? "warn" : "critical";

  const cards: SummaryCard[] = [
    {
      key: "committed", label: "Cam kết tổng", value: totals.committed.toLocaleString(), unit: "m²",
      trend: { delta: `${totals.nmCount} NM`, direction: "flat", color: "gray" },
      severity: "ok",
    },
    {
      key: "released", label: "Đã release", value: totals.released.toLocaleString(), unit: "m²",
      trend: { delta: `${totals.totalPos} PO`, direction: "up", color: "green" },
      severity: "ok",
    },
    {
      key: "remaining", label: "Còn lại", value: totals.remaining.toLocaleString(), unit: "m²",
      trend: { delta: "W21-22 cần", direction: "flat", color: "gray" },
      severity: "warn",
    },
    {
      key: "progress", label: "Tiến độ", value: `${totals.pct}%`, unit: "",
      trend: { delta: `Ngày ${dayCurrent}/${dayMonth}`, direction: "flat", color: progressTone === "ok" ? "green" : progressTone === "warn" ? "amber" : "red" },
      severity: progressTone,
      tooltip: `Mục tiêu ngày ${dayCurrent}: ~${expectedPct}%`,
    },
  ];

  const STATUS_MAP: Record<NmTrackRow["onTrack"], { label: string; cls: string }> = {
    done:      { label: "✅ Xong",          cls: "bg-success-bg text-success border-success/30" },
    ok:        { label: "🟢 Đúng tiến độ",  cls: "bg-success-bg text-success border-success/30" },
    slow:      { label: "🟡 Chậm",          cls: "bg-warning-bg text-warning border-warning/30" },
    very_slow: { label: "🔴 Rất chậm",      cls: "bg-danger-bg text-danger border-danger/30" },
  };

  const PO_STATUS: Record<WeeklyPo["status"], { label: string; icon: typeof FileText; cls: string }> = {
    completed:  { label: "Hoàn tất",   icon: CheckCircle2, cls: "text-success" },
    in_transit: { label: "Đang chở",   icon: Truck,        cls: "text-info" },
    draft:      { label: "Nháp",       icon: FileText,     cls: "text-text-3" },
  };

  const cols: SmartTableColumn<NmTrackRow>[] = [
    { key: "nm", label: "NM", sortable: true, width: 130, render: r => <span className="font-medium text-text-1">{r.nm}</span> },
    { key: "committed", label: "Cam kết", numeric: true, align: "right", sortable: true, width: 110,
      render: r => <span className="tabular-nums text-text-2">{r.committed.toLocaleString()}</span> },
    { key: "released", label: "Đã release", numeric: true, align: "right", sortable: true, width: 120,
      render: r => <span className="tabular-nums font-medium text-text-1">{r.released.toLocaleString()}</span> },
    { key: "remaining", label: "Còn lại", numeric: true, align: "right", sortable: true, width: 100,
      render: r => <span className={cn("tabular-nums font-medium", r.remaining > 0 ? "text-warning" : "text-success")}>{r.remaining.toLocaleString()}</span> },
    { key: "pct", label: "%", numeric: true, align: "right", sortable: true, width: 70,
      render: r => <span className="tabular-nums text-text-1">{r.pct}%</span> },
    { key: "bar", label: "Tiến độ", width: 140,
      render: r => (
        <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
          <div className={cn("h-full",
            r.onTrack === "done" || r.onTrack === "ok" ? "bg-success" :
            r.onTrack === "slow" ? "bg-warning" : "bg-danger"
          )} style={{ width: `${r.pct}%` }} />
        </div>
      ) },
    { key: "status", label: "Trạng thái", sortable: true, width: 150,
      render: r => <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-medium", STATUS_MAP[r.onTrack].cls)}>{STATUS_MAP[r.onTrack].label}</span> },
  ];

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="rounded-card border border-surface-3 bg-surface-1 p-4">
        <h2 className="font-display text-section-header text-text-1">
          Bước 3 — PO & Theo dõi: Cam kết đã release bao nhiêu?
        </h2>
        <p className="text-table-sm text-text-2 mt-1">
          Theo dõi tiến độ release PO từ cam kết tháng. DRP tự tạo PO hàng đêm.
        </p>
      </div>

      <SummaryCards cards={cards} screenId="hub-step3" editable />

      <SmartTable<NmTrackRow>
        screenId="hub-step3-tracking"
        title="Burn-down PO per NM"
        exportFilename="hub-po-tracking"
        columns={cols}
        data={rows}
        defaultDensity="compact"
        getRowId={r => r.nm}
        rowSeverity={r => r.onTrack === "very_slow" ? "shortage" : r.onTrack === "slow" ? "watch" : undefined}
        autoExpandWhen={r => r.onTrack === "very_slow"}
        drillDown={r => (
          <div className="bg-surface-1/40 px-4 py-3 space-y-3">
            <p className="text-caption uppercase tracking-wide text-text-3">
              {r.nm} — {r.pos.length} PO ({r.released.toLocaleString()} m²)
            </p>
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 text-text-3 text-caption uppercase">
                  <th className="text-left py-1.5 px-2">PO#</th>
                  <th className="text-center py-1.5 px-2">Tuần</th>
                  <th className="text-left py-1.5 px-2">Mã hàng</th>
                  <th className="text-right py-1.5 px-2">Số lượng</th>
                  <th className="text-left py-1.5 px-2">Trạng thái</th>
                  <th className="text-right py-1.5 px-2">Ngày release</th>
                </tr>
              </thead>
              <tbody>
                {r.pos.map(p => {
                  const meta = PO_STATUS[p.status];
                  const Icon = meta.icon;
                  return (
                    <tr key={p.poNumber} className="border-b border-surface-3/50">
                      <td className="py-1.5 px-2 font-mono text-text-2">{p.poNumber}</td>
                      <td className="py-1.5 px-2 text-center text-text-2">W{p.week}</td>
                      <td className="py-1.5 px-2 font-mono text-text-2">{p.sku}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums font-medium text-text-1">{p.qty.toLocaleString()}</td>
                      <td className="py-1.5 px-2">
                        <span className={cn("inline-flex items-center gap-1", meta.cls)}>
                          <Icon className="h-3 w-3" /> {meta.label}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-text-3">{p.releaseDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between text-caption text-text-3 border-t border-surface-3 pt-2">
              <span>
                Released: <span className="tabular-nums text-text-1 font-medium">{r.released.toLocaleString()}</span>/{r.committed.toLocaleString()} ({r.pct}%).
                Còn chưa đặt: <span className="tabular-nums text-warning font-medium">{r.remaining.toLocaleString()}</span> m².
              </span>
              {r.onTrack !== "done" && (
                <Button size="sm" variant="outline" onClick={() => toast.success(`📦 Tạo PO thủ công cho ${r.nm}`)}>
                  <Package className="h-3 w-3" /> Tạo PO thủ công
                </Button>
              )}
            </div>
          </div>
        )}
      />

      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onPrev} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Cam kết NM
        </Button>
        <Button onClick={() => navigate("/orders")} className="gap-1.5">
          Mở Đơn hàng <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

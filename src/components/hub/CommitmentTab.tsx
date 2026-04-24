/**
 * M6 — Cam kết NM (Hub & Sourcing tab 1)
 *
 * UNIS Planner workflow:
 *   1. Gọi/Zalo/Email từng NM để xác nhận cam kết tháng cho từng SKU
 *   2. Gõ trực tiếp số m² NM cam kết vào cột "Cam kết NM"
 *   3. Đính kèm minh chứng (screenshot Zalo, email, fax)
 *   4. Confirm row → lock + đếm vào Hub Available
 *
 * Tier badge auto theo tháng cam kết:
 *   M+1 = HARD ±5% (đỏ) — tháng tới, ít linh hoạt
 *   M+2 = FIRM ±15% (cam) — kế hoạch chắc, còn điều chỉnh
 *   M+3 = SOFT ±30% (xám) — định hướng, chưa cam kết cứng
 */
import { useMemo, useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Phone, Clock, CheckCircle2, AlertTriangle, Camera, Upload,
  X, Image as ImageIcon, Lock, Filter, Play, ArrowRight, EyeOff, Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from "react-router-dom";
import { PivotToggle, usePivotMode } from "@/components/ViewPivotToggle";
import { PivotChildTable, type PivotChildRow } from "@/components/PivotChildTable";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { SummaryCards, type SummaryCard } from "@/components/SummaryCards";
import {
  BPO_TRACKER, BPO_DEMO_DAY_OF_MONTH, BPO_DEMO_DAYS_IN_MONTH, BPO_EXPECTED_PCT,
} from "@/lib/bpo-tracker";

/** Extract SKU base code from "GA-300 A4" → "GA-300" */
function skuBase(sku: string): string {
  return sku.split(/\s+/)[0];
}

/** Released qty cho 1 NM + SKU base — tổng từ BPO_TRACKER mock */
function releasedFor(nmName: string, sku: string): number {
  const base = skuBase(sku);
  const match = BPO_TRACKER.find(t => t.nmName === nmName && t.skuBaseCode === base);
  return match?.releasedQty ?? 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
   §  Types
   ═══════════════════════════════════════════════════════════════════════════ */
type CommitStatus = "not_called" | "waiting" | "confirmed" | "counter";
type ContactMethod = "call" | "zalo" | "email" | "in_person";
type Tier = "HARD" | "FIRM" | "SOFT";

interface EvidenceFile {
  name: string;
  url: string;          // object URL (mock)
  type: string;
}

interface CommitRow {
  id: string;
  nmName: string;
  nmPhone: string;
  sku: string;
  fcSent: number;       // m² FC gửi NM
  committed: number;    // m² NM cam kết (Planner gõ)
  tier: Tier;
  contactMethod: ContactMethod | null;
  contactDate: string | null;  // ISO date
  evidence: EvidenceFile[];
  status: CommitStatus;
  locked: boolean;
}

/* ═══════════════════════════════════════════════════════════════════════════
   §  Mock data — 5 NM × 5 SKU = 25 rows
   ═══════════════════════════════════════════════════════════════════════════ */
const NM_LIST = [
  { name: "Mikado",    phone: "0221 382 1234" },
  { name: "Toko",      phone: "0274 365 5678" },
  { name: "An Pha",    phone: "0274 388 9012" },
  { name: "Vinakraft", phone: "0254 384 3456" },
  { name: "SG Paper",  phone: "0274 367 7890" },
];
const SKU_LIST = ["GA-300 A4", "GA-300 B2", "GA-450 A4", "GA-600 A4", "GM-300 A4"];

function buildMockRows(scale: number): CommitRow[] {
  const rows: CommitRow[] = [];
  let i = 0;
  NM_LIST.forEach((nm, ni) => {
    SKU_LIST.forEach((sku, si) => {
      const fc = Math.round((400 + ni * 80 + si * 40) * scale);
      // Distribution: 15 confirmed, 5 waiting, 5 not_called (5×5=25)
      // Pattern by index modulo 5
      const slot = (ni * SKU_LIST.length + si) % 5;
      let status: CommitStatus;
      let committed = 0;
      let evidence: EvidenceFile[] = [];
      let contactMethod: ContactMethod | null = null;
      let contactDate: string | null = null;
      let locked = false;

      if (slot < 3) {
        // confirmed (15 rows)
        status = "confirmed";
        committed = fc + Math.round((Math.random() - 0.3) * fc * 0.08);
        contactMethod = (["call", "zalo", "email"] as const)[(ni + si) % 3];
        contactDate = "2026-04-22";
        evidence = [{ name: `${nm.name}_zalo_${si + 1}.jpg`, url: "", type: "image/jpeg" }];
        locked = true;
        // Make 3 of these "counter" (NM commit < FC)
        if (ni === 1 && si < 2) {
          status = "counter";
          committed = Math.round(fc * 0.78);
          locked = false;
        }
      } else if (slot === 3) {
        // waiting (5 rows)
        status = "waiting";
        contactMethod = (["call", "zalo", "email"] as const)[ni % 3];
        contactDate = "2026-04-22";
      } else {
        // not_called (5 rows)
        status = "not_called";
      }

      // Tier — for this demo all rows are M+1 (Tháng 5/2026 = next month)
      // mix some M+2 / M+3 for variety
      const tier: Tier = si === 0 ? "HARD" : si === 4 ? "SOFT" : "FIRM";

      rows.push({
        id: `cm-${ni}-${si}`,
        nmName: nm.name,
        nmPhone: nm.phone,
        sku,
        fcSent: fc,
        committed,
        tier,
        contactMethod,
        contactDate,
        evidence,
        status,
        locked,
      });
      i++;
    });
  });
  return rows;
}

/* ═══════════════════════════════════════════════════════════════════════════
   §  Labels (Vietnamese)
   ═══════════════════════════════════════════════════════════════════════════ */
const STATUS_LABEL: Record<CommitStatus, string> = {
  not_called: "Chưa gọi",
  waiting:    "Chờ NM",
  confirmed:  "Đã xác nhận",
  counter:    "NM counter",
};
const STATUS_CLS: Record<CommitStatus, string> = {
  not_called: "bg-danger-bg text-danger border-danger/30",
  waiting:    "bg-warning-bg text-warning border-warning/30",
  confirmed:  "bg-success-bg text-success border-success/30",
  counter:    "bg-warning-bg text-warning border-warning/30",
};
const STATUS_DOT: Record<CommitStatus, string> = {
  not_called: "🔴",
  waiting:    "🟡",
  confirmed:  "🟢",
  counter:    "⚠️",
};
const METHOD_LABEL: Record<ContactMethod, string> = {
  call: "Gọi điện",
  zalo: "Zalo",
  email: "Email",
  in_person: "Gặp trực tiếp",
};
const TIER_META: Record<Tier, { label: string; cls: string; tol: string }> = {
  HARD: { label: "HARD ±5%",  cls: "bg-danger-bg text-danger border-danger/30",  tol: "Tháng tới (M+1) — biên 5%" },
  FIRM: { label: "FIRM ±15%", cls: "bg-warning-bg text-warning border-warning/30", tol: "M+2 — biên 15%" },
  SOFT: { label: "SOFT ±30%", cls: "bg-surface-3 text-text-2 border-surface-3", tol: "M+3 — biên 30%, định hướng" },
};

/* ═══════════════════════════════════════════════════════════════════════════
   §  Main
   ═══════════════════════════════════════════════════════════════════════════ */
export function CommitmentTab({ scale, onTotalsChange }: {
  scale: number;
  onTotalsChange?: (confirmedM2: number) => void;
}) {
  const [rows, setRows] = useState<CommitRow[]>(() => buildMockRows(scale));
  const [filterStatus, setFilterStatus] = useState<"all" | CommitStatus>("all");
  const [evidenceModal, setEvidenceModal] = useState<{ rowId: string; files: EvidenceFile[] } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null);
  const [pivot, setPivot] = usePivotMode("hub-commitment");
  const [monthLocked, setMonthLocked] = useState(false);
  const [columnPreset, setColumnPreset] = useState<"simple" | "full">("simple");
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  /* ── Deep-link from Orders: ?nm=Mikado&sku=GA-300 → highlight + scroll ── */
  useEffect(() => {
    const nm = searchParams.get("nm");
    const sku = searchParams.get("sku");
    if (!nm && !sku) return;
    // Map nm short id → name (NM-MKD/Mikado, hoặc dùng plain name)
    const nmName = nm
      ? (BPO_TRACKER.find(t => t.nmId === nm)?.nmName ?? nm)
      : null;
    const target = rows.find(r =>
      (!nmName || r.nmName === nmName) &&
      (!sku || skuBase(r.sku) === sku)
    );
    if (target) {
      // Show full preset so the released/% columns are visible after deep-link
      setColumnPreset("full");
      setHighlightId(target.id);
      // wait for layout, then scroll
      requestAnimationFrame(() => {
        const el = document.getElementById(`commit-row-${target.id}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      // Auto-clear highlight after 4s
      const t = window.setTimeout(() => setHighlightId(null), 4000);
      // Strip params so refresh doesn't re-trigger
      const next = new URLSearchParams(searchParams);
      next.delete("nm"); next.delete("sku");
      setSearchParams(next, { replace: true });
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Totals */
  const totals = useMemo(() => {
    const total = rows.length;
    const confirmedRows = rows.filter(r => r.status === "confirmed" || r.status === "counter");
    const confirmedCount = rows.filter(r => r.locked).length;
    const confirmedM2 = confirmedRows.reduce((s, r) => s + r.committed, 0);
    const fcM2 = rows.reduce((s, r) => s + r.fcSent, 0);
    const progress = total > 0 ? (confirmedCount / total) * 100 : 0;
    return { total, confirmedCount, confirmedM2, fcM2, progress };
  }, [rows]);

  /* Push to parent for Hub Available recalc */
  useMemo(() => {
    onTotalsChange?.(totals.confirmedM2);
  }, [totals.confirmedM2, onTotalsChange]);

  /* Filter */
  const filteredRows = useMemo(() =>
    filterStatus === "all" ? rows : rows.filter(r => r.status === filterStatus),
    [rows, filterStatus]
  );

  /* Mutations */
  const updateRow = (id: string, patch: Partial<CommitRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      // Auto status logic based on committed value
      if (patch.committed !== undefined) {
        if (next.committed > 0 && next.contactMethod) {
          next.status = next.committed < next.fcSent * 0.97 ? "counter" : "confirmed";
        }
      }
      if (patch.contactMethod !== undefined && next.committed === 0) {
        next.status = "waiting";
      }
      return next;
    }));
  };

  const confirmRow = (id: string) => {
    const row = rows.find(r => r.id === id);
    setRows(prev => prev.map(r => r.id === id ? { ...r, locked: true } : r));
    setConfirmDialog(null);
    if (!row) {
      toast.success("Đã xác nhận cam kết");
      return;
    }
    // Check if THIS confirm push tổng SKU đã lock vượt 80% → toast lớn
    const willLockedCount = rows.filter(r => r.locked).length + (row.locked ? 0 : 1);
    const newProgress = (willLockedCount / rows.length) * 100;
    const newConfirmedM2 =
      rows.filter(r => (r.status === "confirmed" || r.status === "counter") && r.id !== id)
          .reduce((s, r) => s + r.committed, 0) + row.committed;

    if (newProgress >= 80 && totals.progress < 80) {
      toast.success(
        `✅ ${Math.round(newProgress)}% cam kết hoàn tất! Hub Available: ${newConfirmedM2.toLocaleString()}m². DRP đêm nay sẽ tạo PO cho 12 CN.`,
        { duration: 7000 }
      );
    } else {
      toast.success(
        `✅ Cam kết ${row.nmName} ${row.sku} đã lưu. Hub Available tăng ${row.committed.toLocaleString()}m². DRP đêm nay sẽ tạo PO từ cam kết này.`,
        { duration: 6000 }
      );
    }
  };

  const batchConfirm = () => {
    let count = 0;
    let added = 0;
    setRows(prev => prev.map(r => {
      if (!r.locked && (r.status === "confirmed" || r.status === "counter") && r.evidence.length > 0) {
        count++;
        added += r.committed;
        return { ...r, locked: true };
      }
      return r;
    }));
    toast.success(
      `✅ Đã xác nhận ${count} cam kết. Hub Available tăng thêm ${added.toLocaleString()}m². DRP đêm nay sẽ release PO.`,
      { duration: 6000 }
    );
  };

  const lockMonth = () => {
    setMonthLocked(true);
    toast.success("🔒 Cam kết T5 đã khóa — chuyển sang Hub ảo. DRP đêm nay 23:00 sẽ tạo PO nháp.", {
      duration: 6000,
    });
  };

  const runDrpNow = () => {
    toast.loading("⚙️ Đang chạy DRP — phân bổ Hub Available cho 12 CN…", { id: "drp-run" });
    setTimeout(() => {
      toast.success("✅ DRP xong — đã tạo PO nháp. Mở Đơn hàng để duyệt.", { id: "drp-run", duration: 5000 });
      navigate("/orders");
    }, 1500);
  };

  /* Status counts for filter chips */
  const counts = useMemo(() => {
    const c = { all: rows.length, not_called: 0, waiting: 0, confirmed: 0, counter: 0 };
    rows.forEach(r => { c[r.status]++; });
    return c;
  }, [rows]);

  /* SKU-first pivot — aggregate commitment per SKU across NMs */
  interface SkuCommitRow {
    sku: string;
    totalFc: number;
    totalCommitted: number;
    nmCount: number;
    confirmedCount: number;
    nmBreakdown: PivotChildRow[];
  }
  const skuPivotRows: SkuCommitRow[] = useMemo(() => {
    const map = new Map<string, SkuCommitRow>();
    rows.forEach(r => {
      if (!map.has(r.sku)) {
        map.set(r.sku, { sku: r.sku, totalFc: 0, totalCommitted: 0, nmCount: 0, confirmedCount: 0, nmBreakdown: [] });
      }
      const p = map.get(r.sku)!;
      p.totalFc += r.fcSent;
      p.totalCommitted += r.committed;
      p.nmCount++;
      if (r.status === "confirmed" || r.status === "counter") p.confirmedCount++;
      // hstk synthesized = 14d if confirmed/locked, 5d if waiting, 1d if not_called
      const hstk = r.locked || r.status === "confirmed" ? 14 : r.status === "counter" ? 8 : r.status === "waiting" ? 5 : 1;
      const status =
        r.status === "confirmed" ? "Đã xác nhận" :
        r.status === "counter" ? "Counter" :
        r.status === "waiting" ? "Chờ NM" : "Chưa gọi";
      p.nmBreakdown.push({
        key: `${r.sku}-${r.id}`,
        label: r.nmName,
        qty: r.committed,
        hstk,
        ssTarget: r.fcSent,
        statusOverride: status,
        navKind: "nm",
        navValue: r.nmName,
      });
    });
    return Array.from(map.values()).sort((a, b) => (a.confirmedCount / Math.max(1, a.nmCount)) - (b.confirmedCount / Math.max(1, b.nmCount)));
  }, [rows]);

  const hubCards: SummaryCard[] = (() => {
    const notCalledCount = rows.filter(r => r.status === "not_called").length;
    const waitingCount = rows.filter(r => r.status === "waiting").length;
    const counterCount = rows.filter(r => r.status === "counter").length;
    const coverPct = totals.fcM2 > 0 ? Math.round((totals.confirmedM2 / totals.fcM2) * 100) : 0;
    return [
      {
        key: "progress", label: "Tiến độ cam kết", value: `${totals.confirmedCount}/${totals.total}`, unit: "SKU",
        severity: totals.progress >= 80 ? "ok" : totals.progress >= 50 ? "warn" : "critical",
        trend: { delta: `${totals.progress.toFixed(0)}%`, direction: "up", color: totals.progress >= 80 ? "green" : "gray" },
        tooltip: "Số SKU đã được NM xác nhận và lock — cần ≥ 80% trước Day 12",
      },
      {
        key: "cover", label: "Cover FC", value: `${coverPct}%`,
        severity: coverPct >= 95 ? "ok" : coverPct >= 80 ? "warn" : "critical",
        tooltip: `${totals.confirmedM2.toLocaleString()} m² / ${totals.fcM2.toLocaleString()} m² FC tháng`,
      },
      {
        key: "notcalled", label: "Chưa gọi NM", value: notCalledCount, unit: "SKU",
        severity: notCalledCount > 0 ? "critical" : "ok",
        tooltip: "Cần ưu tiên gọi/Zalo trong 24h",
        onClick: () => setFilterStatus("not_called"),
      },
      {
        key: "waiting", label: "Đang chờ NM", value: waitingCount, unit: "SKU",
        severity: waitingCount > 3 ? "warn" : "ok",
        tooltip: "Đã liên hệ — chờ NM phản hồi",
        onClick: () => setFilterStatus("waiting"),
      },
      {
        key: "counter", label: "NM đề xuất khác", value: counterCount, unit: "SKU",
        severity: counterCount > 0 ? "warn" : "ok",
        tooltip: "NM cam kết khác FC — cần thương lượng",
        onClick: () => setFilterStatus("counter"),
      },
    ];
  })();

  return (
    <div className="space-y-4">
      <SummaryCards cards={hubCards} screenId="hub-commit" editable />
      {/* ═══ HEADER ═══ */}
      <div className="rounded-card border border-surface-3 bg-surface-1 p-5 space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-display text-section-header text-text-1">Cam kết NM — Tháng 5/2026</h2>
            <p className="text-table-sm text-text-3 mt-0.5">
              S&OP locked v4 · Ngày 8/30 ·{" "}
              <span className="text-text-1 font-medium">{totals.confirmedCount}/{totals.total} SKU đã xác nhận</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-bg text-success border border-success/30 px-2.5 py-0.5 text-table-sm font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              Commitment T5 v6 · Active
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-table-sm text-text-2 font-medium">
              {totals.confirmedCount}/{totals.total} SKU đã xác nhận ({totals.progress.toFixed(0)}%)
            </span>
            <span className="text-caption text-text-3">
              Σ NM cam kết: <span className="font-semibold text-text-1 tabular-nums">{totals.confirmedM2.toLocaleString()} m²</span>
              <span className="mx-1.5">/</span>
              FC: <span className="tabular-nums">{totals.fcM2.toLocaleString()} m²</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
            <div className={cn("h-full transition-all duration-500",
              totals.progress >= 80 ? "bg-success" : totals.progress >= 50 ? "bg-info" : "bg-warning"
            )} style={{ width: `${totals.progress}%` }} />
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <button onClick={batchConfirm}
            className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 hover:border-primary/40 px-3 py-1.5 text-table-sm font-medium text-text-2 hover:text-text-1 transition-colors">
            <CheckCircle2 className="h-4 w-4" /> Xác nhận tất cả đã liên hệ
          </button>
          <button
            disabled={totals.progress < 80}
            onClick={lockMonth}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-button px-4 py-1.5 text-table-sm font-semibold transition-all",
              totals.progress >= 80
                ? "bg-gradient-primary text-primary-foreground shadow-sm hover:shadow-md"
                : "bg-surface-3 text-text-3 cursor-not-allowed"
            )}>
            <Lock className="h-4 w-4" /> Khóa cam kết tháng
          </button>
        </div>
      </div>

      {/* ═══ "SẴN SÀNG CHO DRP" — khi ≥80% nhưng chưa lock ═══ */}
      {totals.progress >= 80 && !monthLocked && (
        <div className="rounded-card border border-success/40 bg-success-bg p-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold text-table-sm">Sẵn sàng cho DRP ✅</div>
              <div className="text-caption text-text-2">
                Hub Available <span className="font-semibold text-text-1 tabular-nums">{totals.confirmedM2.toLocaleString()} m²</span>
                {" "}· DRP chạy 23:00 đêm nay
              </div>
            </div>
          </div>
          <button onClick={lockMonth}
            className="inline-flex items-center gap-1.5 rounded-button bg-gradient-primary text-primary-foreground px-3 py-1.5 text-table-sm font-semibold hover:shadow-md transition-shadow">
            <Lock className="h-4 w-4" /> Khóa & sẵn sàng DRP
          </button>
        </div>
      )}

      {/* ═══ NEXT-STEP BANNER — sau khi LOCK ═══ */}
      {monthLocked && (
        <div className="rounded-card border border-success/40 bg-gradient-to-br from-success-bg to-info-bg/40 p-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-success text-success-foreground flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-text-1">
                Cam kết T5 đã khóa · <span className="tabular-nums">{totals.confirmedM2.toLocaleString()} m²</span> Hub Available
              </div>
              <div className="mt-2 text-table-sm text-text-2 space-y-1">
                <div className="font-medium text-text-1">Bước tiếp:</div>
                <ol className="list-decimal pl-5 space-y-0.5">
                  <li>DRP chạy <span className="font-semibold text-text-1">23:00 đêm nay</span> → tạo PO nháp từ cam kết</li>
                  <li>Sáng mai mở <button onClick={() => navigate("/drp")} className="text-primary font-medium hover:underline">Kết quả DRP →</button> xem phân bổ</li>
                  <li>Duyệt PO trong <button onClick={() => navigate("/orders")} className="text-primary font-medium hover:underline">Đơn hàng →</button></li>
                </ol>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button onClick={runDrpNow}
                  className="inline-flex items-center gap-1.5 rounded-button bg-gradient-primary text-primary-foreground px-3 py-1.5 text-table-sm font-semibold hover:shadow-md transition-shadow">
                  <Play className="h-4 w-4" /> Chạy DRP ngay
                </button>
                <button onClick={() => navigate("/orders")}
                  className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 hover:border-primary/40 px-3 py-1.5 text-table-sm font-medium text-text-2">
                  Mở Đơn hàng <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PIVOT TOGGLE + COLUMN PRESET ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <PivotToggle mode={pivot} onChange={setPivot} cnLabel="Nhà máy" skuLabel="Mã hàng" />
        <div className="flex items-center gap-3">
          {pivot === "cn" && (
            <div className="inline-flex items-center rounded-button border border-surface-3 bg-surface-1 p-0.5 text-caption">
              <button
                onClick={() => setColumnPreset("simple")}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-0.5 transition-colors",
                  columnPreset === "simple"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-text-3 hover:text-text-1",
                )}
                title="Ẩn FC/Δ/Tier/Đã release/Còn lại/% — chỉ hiện cột cốt lõi"
              >
                <EyeOff className="h-3 w-3" /> Đơn giản
              </button>
              <button
                onClick={() => setColumnPreset("full")}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-0.5 transition-colors",
                  columnPreset === "full"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-text-3 hover:text-text-1",
                )}
                title="Hiện toàn bộ — bao gồm Đã release / Còn lại / %"
              >
                <Eye className="h-3 w-3" /> Đầy đủ
              </button>
            </div>
          )}
          <span className="text-caption text-text-3">
            {pivot === "cn" ? "Quản lý cam kết per NM × SKU" : "Tổng hợp cam kết per Mã hàng → từng NM"}
          </span>
        </div>
      </div>

      {pivot === "cn" ? (
        <>
          {/* ═══ FILTER CHIPS ═══ */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-text-3" />
            {([
              { key: "all", label: "Tất cả", icon: "" },
              { key: "not_called", label: "Chưa gọi", icon: "🔴" },
              { key: "waiting", label: "Chờ NM", icon: "🟡" },
              { key: "confirmed", label: "Đã xác nhận", icon: "🟢" },
              { key: "counter", label: "NM counter", icon: "⚠️" },
            ] as const).map(f => {
              const count = counts[f.key as keyof typeof counts];
              const active = filterStatus === f.key;
              return (
                <button key={f.key} onClick={() => setFilterStatus(f.key as typeof filterStatus)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-table-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-surface-3 bg-surface-2 text-text-2 hover:border-primary/40"
                  )}>
                  {f.icon && <span>{f.icon}</span>}
                  <span>{f.label}</span>
                  <span className="tabular-nums text-caption opacity-80">({count})</span>
                </button>
              );
            })}
          </div>

          {/* ═══ TABLE NM × SKU ═══ */}
          <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-1/60 border-b border-surface-3">
                    <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">NM</th>
                    <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">Mã hàng</th>
                    {columnPreset === "full" && (
                      <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3">FC gửi NM</th>
                    )}
                    <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3">Cam kết NM ✏️</th>
                    {columnPreset === "full" && (
                      <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3">Δ</th>
                    )}
                    {columnPreset === "full" && (
                      <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3 bg-info-bg/30" title="Tổng PO đã release tính đến hiện tại">Đã release</th>
                    )}
                    {columnPreset === "full" && (
                      <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3 bg-info-bg/30" title="Cam kết − Đã release">Còn lại</th>
                    )}
                    {columnPreset === "full" && (
                      <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3 bg-info-bg/30">% Release</th>
                    )}
                    {columnPreset === "full" && (
                      <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">Tier</th>
                    )}
                    <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3 hidden md:table-cell">Nguồn</th>
                    <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3 hidden lg:table-cell">Ngày liên hệ</th>
                    <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">Minh chứng</th>
                    <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">Trạng thái</th>
                    <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 && (
                    <tr><td colSpan={columnPreset === "full" ? 14 : 8} className="text-center py-8 text-text-3 text-table-sm">
                      Không có cam kết nào khớp bộ lọc.
                    </td></tr>
                  )}
                  {filteredRows.map(row => (
                    <CommitmentRow
                      key={row.id}
                      row={row}
                      preset={columnPreset}
                      highlight={highlightId === row.id}
                      onUpdate={(patch) => updateRow(row.id, patch)}
                      onOpenEvidence={() => setEvidenceModal({ rowId: row.id, files: row.evidence })}
                      onConfirm={() => setConfirmDialog(row.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ═══ SKU-FIRST PIVOT ═══ */
        <SmartTable<SkuCommitRow>
          screenId="hub-commitment-sku"
          title="Mã hàng → Nhà máy cam kết"
          exportFilename="hub-cam-ket-sku"
          columns={[
            { key: "sku", label: "Mã hàng", sortable: true, width: 140, render: (r) => <span className="font-medium text-text-1 text-table-sm">{r.sku}</span> },
            { key: "totalFc", label: "FC tổng (m²)", numeric: true, align: "right", sortable: true, width: 130, render: (r) => <span className="tabular-nums text-text-2">{r.totalFc.toLocaleString()}</span> },
            {
              key: "totalCommitted", label: "Cam kết (m²)", numeric: true, align: "right", sortable: true, width: 140,
              render: (r) => {
                const cov = r.totalFc > 0 ? Math.round((r.totalCommitted / r.totalFc) * 100) : 0;
                const color = cov >= 95 ? "text-success" : cov >= 70 ? "text-warning" : "text-danger";
                return (
                  <div className="flex flex-col items-end">
                    <span className={cn("tabular-nums font-medium", color)}>{r.totalCommitted.toLocaleString()}</span>
                    <span className="text-[10px] text-text-3">{cov}% FC</span>
                  </div>
                );
              },
            },
            {
              key: "confirmedCount", label: "Tiến độ NM", numeric: true, align: "right", sortable: true, width: 120,
              render: (r) => (
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                  r.confirmedCount === r.nmCount ? "bg-success-bg text-success" :
                  r.confirmedCount > 0 ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger"
                )}>
                  {r.confirmedCount}/{r.nmCount} NM
                </span>
              ),
            },
          ]}
          data={skuPivotRows}
          defaultDensity="compact"
          getRowId={(r) => r.sku}
          rowSeverity={(r) => {
            const cov = r.totalFc > 0 ? r.totalCommitted / r.totalFc : 0;
            if (cov < 0.7) return "shortage";
            if (cov < 0.95) return "watch";
            return "ok";
          }}
          autoExpandWhen={(r) => r.confirmedCount < r.nmCount}
          drillDown={(r) => (
            <PivotChildTable
              rows={r.nmBreakdown}
              firstColLabel="Nhà máy"
              screenId={`hub-commit-sku-child-${r.sku}`}
            />
          )}
        />
      )}

      {/* ═══ EVIDENCE UPLOAD MODAL ═══ */}
      {evidenceModal && (
        <EvidenceModal
          files={evidenceModal.files}
          onClose={() => setEvidenceModal(null)}
          onUpload={(newFiles) => {
            setRows(prev => prev.map(r =>
              r.id === evidenceModal.rowId
                ? { ...r, evidence: [...r.evidence, ...newFiles] }
                : r
            ));
            const updated = rows.find(r => r.id === evidenceModal.rowId);
            setEvidenceModal({ rowId: evidenceModal.rowId, files: [...(updated?.evidence || []), ...newFiles] });
          }}
          onRemove={(idx) => {
            setRows(prev => prev.map(r => {
              if (r.id !== evidenceModal.rowId) return r;
              const ev = r.evidence.filter((_, i) => i !== idx);
              return { ...r, evidence: ev };
            }));
            setEvidenceModal({
              rowId: evidenceModal.rowId,
              files: evidenceModal.files.filter((_, i) => i !== idx),
            });
          }}
        />
      )}

      {/* ═══ CONFIRM DIALOG ═══ */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setConfirmDialog(null)}>
          <div className="bg-surface-2 rounded-card border border-surface-3 max-w-md w-full p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-section-header text-text-1 mb-2">Xác nhận cam kết</h3>
            <p className="text-table-sm text-text-2 mb-4">
              Sau khi xác nhận, dòng này sẽ <strong>khóa</strong> và đếm vào Hub Available.
              Bạn có chắc số liệu khớp với phản hồi NM?
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDialog(null)}
                className="rounded-button border border-surface-3 px-3 py-1.5 text-table-sm text-text-2 hover:text-text-1">
                Hủy
              </button>
              <button onClick={() => confirmRow(confirmDialog)}
                className="rounded-button bg-gradient-primary text-primary-foreground px-4 py-1.5 text-table-sm font-semibold">
                Xác nhận & Khóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §  Row component
   ═══════════════════════════════════════════════════════════════════════════ */
function CommitmentRow({ row, onUpdate, onOpenEvidence, onConfirm }: {
  row: CommitRow;
  onUpdate: (patch: Partial<CommitRow>) => void;
  onOpenEvidence: () => void;
  onConfirm: () => void;
}) {
  const delta = row.committed - row.fcSent;
  const deltaPct = row.fcSent > 0 ? (delta / row.fcSent) * 100 : 0;
  const tierMeta = TIER_META[row.tier];
  const released = releasedFor(row.nmName, row.sku);
  const remaining = Math.max(0, row.committed - released);
  const releasePct = row.committed > 0 ? Math.round((released / row.committed) * 100) : 0;
  const expectedPct = Math.round(BPO_EXPECTED_PCT);
  const lateRelease = row.committed > 0 && releasePct < expectedPct && remaining > 0;

  return (
    <tr className={cn("border-b border-surface-3 transition-colors",
      row.locked ? "bg-success-bg/20" : "hover:bg-surface-1/40"
    )}>
      <td className="px-3 py-2 text-table-sm text-text-1 font-medium">{row.nmName}</td>
      <td className="px-3 py-2 text-table-sm text-text-2 font-mono">{row.sku}</td>
      <td className="px-3 py-2 text-right text-table-sm text-text-2 tabular-nums">{row.fcSent.toLocaleString()}</td>

      {/* COMMITTED INPUT */}
      <td className="px-3 py-2 text-right">
        <input
          type="number"
          disabled={row.locked}
          value={row.committed || ""}
          placeholder="—"
          onChange={(e) => onUpdate({ committed: Number(e.target.value) || 0 })}
          className={cn(
            "w-24 rounded border px-2 py-1 text-right text-table-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30",
            row.locked
              ? "border-transparent bg-transparent text-text-1 font-semibold cursor-not-allowed"
              : "border-surface-3 bg-surface-0 text-text-1"
          )}
        />
      </td>

      {/* DELTA */}
      <td className="px-3 py-2 text-right text-table-sm tabular-nums">
        {row.committed > 0 ? (
          <span className={cn("font-medium",
            delta >= 0 ? "text-success" : "text-danger"
          )}>
            {delta > 0 ? "+" : ""}{delta.toLocaleString()}
            <span className="text-caption text-text-3 ml-0.5">({deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(0)}%)</span>
          </span>
        ) : <span className="text-text-3">—</span>}
      </td>

      {/* ĐÃ RELEASE */}
      <td className="px-3 py-2 text-right text-table-sm tabular-nums bg-info-bg/10">
        {released > 0 ? (
          <span className="font-medium text-text-1">{released.toLocaleString()}</span>
        ) : <span className="text-text-3">—</span>}
      </td>

      {/* CÒN LẠI */}
      <td className="px-3 py-2 text-right text-table-sm tabular-nums bg-info-bg/10">
        {row.committed > 0 ? (
          remaining > 0 ? (
            <span className={cn("font-medium", lateRelease ? "text-danger" : "text-warning")}>
              {remaining.toLocaleString()}
            </span>
          ) : <span className="text-success font-medium">0</span>
        ) : <span className="text-text-3">—</span>}
      </td>

      {/* % RELEASE */}
      <td className="px-3 py-2 text-right text-table-sm tabular-nums bg-info-bg/10">
        {row.committed > 0 && released > 0 ? (
          <span
            title={lateRelease ? `Cần release nhanh — kỳ vọng ≥ ${expectedPct}% tại ngày ${BPO_DEMO_DAY_OF_MONTH}/${BPO_DEMO_DAYS_IN_MONTH}` : undefined}
            className={cn(
              "inline-flex items-center gap-1 font-semibold",
              lateRelease ? "text-danger" :
              releasePct >= expectedPct ? "text-success" : "text-warning",
            )}
          >
            {releasePct}%
            {lateRelease && <span title="Cần release nhanh">🔴</span>}
          </span>
        ) : <span className="text-text-3">—</span>}
      </td>

      {/* TIER */}
      <td className="px-3 py-2">
        <span title={tierMeta.tol}
          className={cn("inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wide", tierMeta.cls)}>
          {tierMeta.label}
        </span>
      </td>

      {/* CONTACT METHOD */}
      <td className="px-3 py-2 hidden md:table-cell">
        <select
          disabled={row.locked}
          value={row.contactMethod ?? ""}
          onChange={(e) => onUpdate({
            contactMethod: (e.target.value || null) as ContactMethod | null,
            contactDate: e.target.value && !row.contactDate ? new Date().toISOString().slice(0, 10) : row.contactDate,
          })}
          className={cn(
            "rounded border border-surface-3 bg-surface-0 px-1.5 py-0.5 text-caption text-text-1 focus:outline-none",
            row.locked && "cursor-not-allowed opacity-70"
          )}>
          <option value="">— Chọn —</option>
          <option value="call">Gọi điện</option>
          <option value="zalo">Zalo</option>
          <option value="email">Email</option>
          <option value="in_person">Gặp trực tiếp</option>
        </select>
      </td>

      {/* CONTACT DATE */}
      <td className="px-3 py-2 hidden lg:table-cell">
        <input
          type="date"
          disabled={row.locked}
          value={row.contactDate ?? ""}
          onChange={(e) => onUpdate({ contactDate: e.target.value || null })}
          className={cn(
            "rounded border border-surface-3 bg-surface-0 px-1.5 py-0.5 text-caption text-text-1 focus:outline-none",
            row.locked && "cursor-not-allowed opacity-70"
          )}
        />
      </td>

      {/* EVIDENCE */}
      <td className="px-3 py-2 text-center">
        <button onClick={onOpenEvidence}
          className={cn(
            "inline-flex items-center gap-1 rounded-button border px-2 py-0.5 text-caption font-medium transition-colors",
            row.evidence.length > 0
              ? "border-info/30 bg-info-bg text-info hover:bg-info-bg/70"
              : "border-surface-3 bg-surface-0 text-text-3 hover:text-text-1 hover:border-primary/40"
          )}>
          📎 {row.evidence.length > 0 ? `${row.evidence.length} ảnh` : "Đính kèm"}
        </button>
      </td>

      {/* STATUS */}
      <td className="px-3 py-2">
        <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_CLS[row.status])}>
          <span>{STATUS_DOT[row.status]}</span>
          {STATUS_LABEL[row.status]}
        </span>
      </td>

      {/* ACTION */}
      <td className="px-3 py-2 text-right">
        {row.locked ? (
          <span className="inline-flex items-center gap-1 text-caption text-success">
            <Lock className="h-3 w-3" /> Đã khóa
          </span>
        ) : row.status === "not_called" ? (
          <button
            title={`Gọi ${row.nmName}: ${row.nmPhone}`}
            onClick={() => {
              onUpdate({
                contactMethod: "call",
                contactDate: new Date().toISOString().slice(0, 10),
                status: "waiting",
              });
              toast.info(`📞 Gọi ${row.nmName}: ${row.nmPhone}`);
            }}
            className="inline-flex items-center gap-1 rounded-button bg-danger text-white px-2.5 py-1 text-caption font-semibold hover:bg-danger/90">
            <Phone className="h-3 w-3" /> Gọi
          </button>
        ) : row.status === "waiting" ? (
          <button
            disabled
            title={`Đã gọi ${row.contactDate ?? "—"}, chờ phản hồi`}
            className="inline-flex items-center gap-1 rounded-button border border-surface-3 bg-surface-0 px-2.5 py-1 text-caption text-text-3 cursor-not-allowed">
            <Clock className="h-3 w-3" /> Chờ NM
          </button>
        ) : (
          <button onClick={onConfirm}
            className="inline-flex items-center gap-1 rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-semibold">
            <CheckCircle2 className="h-3 w-3" /> Xác nhận
          </button>
        )}
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §  Evidence upload modal + lightbox
   ═══════════════════════════════════════════════════════════════════════════ */
function EvidenceModal({ files, onClose, onUpload, onRemove }: {
  files: EvidenceFile[];
  onClose: () => void;
  onUpload: (files: EvidenceFile[]) => void;
  onRemove: (idx: number) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: EvidenceFile[] = Array.from(fileList).map(f => ({
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type,
    }));
    onUpload(newFiles);
    toast.success(`Đã đính kèm ${newFiles.length} file`);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-surface-2 rounded-card border border-surface-3 max-w-2xl w-full p-5 shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-section-header text-text-1">Minh chứng cam kết NM</h3>
            <button onClick={onClose} className="text-text-3 hover:text-text-1">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-table-sm text-text-2 mb-4">
            Đính kèm ảnh phản hồi NM (screenshot Zalo, email, fax, ảnh chụp màn hình...)
          </p>

          {/* Upload buttons */}
          <div className="flex gap-2 mb-4">
            <button onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 hover:border-primary/40 px-3 py-2 text-table-sm font-medium text-text-1">
              <Camera className="h-4 w-4" /> Chụp ảnh
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 hover:border-primary/40 px-3 py-2 text-table-sm font-medium text-text-1">
              <Upload className="h-4 w-4" /> Chọn file
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf"
              className="hidden" onChange={(e) => handleFiles(e.target.files)} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
              className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>

          {/* Files grid */}
          {files.length === 0 ? (
            <div className="rounded border-2 border-dashed border-surface-3 p-6 text-center text-text-3 text-table-sm">
              Chưa có minh chứng nào
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {files.map((f, i) => (
                <div key={i} className="relative group rounded border border-surface-3 bg-surface-0 overflow-hidden">
                  <button onClick={() => setLightboxIdx(i)} className="block w-full aspect-square bg-surface-3/40 flex items-center justify-center">
                    {f.url && f.type.startsWith("image/") ? (
                      <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-text-3" />
                    )}
                  </button>
                  <div className="px-2 py-1 text-[10px] text-text-2 truncate">{f.name}</div>
                  <button onClick={() => onRemove(i)}
                    className="absolute top-1 right-1 h-5 w-5 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && files[lightboxIdx] && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxIdx(null)}>
          <button className="absolute top-4 right-4 text-white" onClick={() => setLightboxIdx(null)}>
            <X className="h-6 w-6" />
          </button>
          {files[lightboxIdx].url && files[lightboxIdx].type.startsWith("image/") ? (
            <img src={files[lightboxIdx].url} alt={files[lightboxIdx].name} className="max-w-full max-h-[90vh] object-contain" />
          ) : (
            <div className="bg-surface-2 rounded-card p-8 text-text-1">
              <ImageIcon className="h-16 w-16 mx-auto text-text-3 mb-3" />
              <div className="text-center">{files[lightboxIdx].name}</div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

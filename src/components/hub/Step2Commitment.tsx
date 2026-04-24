/**
 * Step 2 — Cam kết: Gọi NM, gõ cam kết, xác nhận.
 * NM parent → SKU child (2-tier SmartTable). 4 summary cards (1 set).
 * Status badges clickable.
 */
import { useMemo, useState, useRef, useEffect } from "react";
import { ArrowLeft, ArrowRight, Phone, Lock, CheckCircle2, Camera, Upload, X, Image as ImageIcon, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { SummaryCards, type SummaryCard } from "@/components/SummaryCards";

type CommitStatus = "not_called" | "waiting" | "confirmed" | "counter";
type ContactMethod = "call" | "zalo" | "email" | "in_person" | null;

interface EvidenceFile { name: string; url: string; type: string; }

interface SkuRow {
  id: string;
  nmName: string;
  nmPhone: string;
  sku: string;
  needed: number;          // from booking step 1
  committed: number;
  contactMethod: ContactMethod;
  contactDate: string | null;
  evidence: EvidenceFile[];
  status: CommitStatus;
  locked: boolean;
}

interface NmGroupRow {
  nm: string;
  phone: string;
  needed: number;
  committed: number;
  delta: number;
  skuCount: number;
  confirmedCount: number;
  status: "ok" | "waiting" | "not_called" | "partial";
  skus: SkuRow[];
}

const NM_LIST = [
  { name: "Mikado", phone: "0221 382 1234" },
  { name: "Toko", phone: "0274 365 5678" },
  { name: "Đồng Tâm", phone: "0274 388 9012" },
  { name: "Vigracera", phone: "0254 384 3456" },
  { name: "Phú Mỹ", phone: "0274 367 7890" },
];

const NM_SKUS: Record<string, { sku: string; needed: number }[]> = {
  Mikado:   [{ sku: "GA-300 A4", needed: 3000 }, { sku: "GA-300 B2", needed: 2500 }, { sku: "GA-450 A4", needed: 3200 }, { sku: "GA-600 A4", needed: 3000 }, { sku: "GM-300 A4", needed: 3200 }],
  Toko:     [{ sku: "GA-300 B2", needed: 3300 }, { sku: "GA-600 A4", needed: 3300 }, { sku: "GM-300 A4", needed: 3200 }],
  "Đồng Tâm": [{ sku: "GA-300 A4", needed: 2950 }, { sku: "GA-450 A4", needed: 2950 }, { sku: "GA-600 A4", needed: 2900 }, { sku: "GM-300 A4", needed: 3000 }],
  Vigracera:[{ sku: "GA-300 A4", needed: 1400 }, { sku: "GA-450 A4", needed: 1400 }, { sku: "GA-600 A4", needed: 1400 }, { sku: "GM-300 A4", needed: 1300 }, { sku: "GM-450 A4", needed: 1300 }],
  "Phú Mỹ": [{ sku: "GA-300 A4", needed: 1700 }, { sku: "GA-450 A4", needed: 1700 }, { sku: "GA-600 A4", needed: 1600 }],
};

function buildSkuRows(scale: number): SkuRow[] {
  const rows: SkuRow[] = [];
  let idx = 0;
  NM_LIST.forEach((nm, ni) => {
    const skus = NM_SKUS[nm.name] || [];
    skus.forEach((s, si) => {
      const need = Math.round(s.needed * scale);
      const slot = (ni * 5 + si) % 5;
      let status: CommitStatus = "not_called";
      let committed = 0;
      let evidence: EvidenceFile[] = [];
      let contactMethod: ContactMethod = null;
      let contactDate: string | null = null;
      let locked = false;

      // 13/25 confirmed, 5 waiting, 5 not_called, 2 counter (rough)
      if (ni === 0 && si < 3) {
        status = "confirmed";
        committed = Math.round(need * (0.13 + Math.random() * 0.04));
        contactMethod = (["call", "zalo", "email"] as const)[si % 3];
        contactDate = "2026-04-22";
        evidence = [{ name: `${nm.name}_${si}.jpg`, url: "", type: "image/jpeg" }];
        locked = true;
      } else if (ni === 0) {
        status = "waiting";
        contactMethod = "call";
        contactDate = "2026-04-22";
      } else if (ni === 2) {
        status = "confirmed";
        committed = Math.round(need * 0.4);
        contactMethod = "zalo";
        contactDate = "2026-04-22";
        evidence = [{ name: `dt_${si}.jpg`, url: "", type: "image/jpeg" }];
        locked = true;
      } else if (ni === 3 && si < 2) {
        status = "confirmed";
        committed = Math.round(need * 0.43);
        contactMethod = "email";
        contactDate = "2026-04-22";
        evidence = [{ name: `vg_${si}.jpg`, url: "", type: "image/jpeg" }];
        locked = true;
      } else if (ni === 3) {
        status = "waiting";
        contactMethod = "call";
        contactDate = "2026-04-22";
      }
      // Toko (ni=1) + Phú Mỹ (ni=4) → not_called

      rows.push({
        id: `cm-${ni}-${si}`,
        nmName: nm.name, nmPhone: nm.phone, sku: s.sku,
        needed: need, committed, contactMethod, contactDate, evidence, status, locked,
      });
      idx++;
    });
  });
  return rows;
}

interface Props {
  scale: number;
  onPrev: () => void;
  onNext: () => void;
  onTotalsChange?: (confirmedM2: number) => void;
  hubAvailable: number;
}

export function Step2Commitment({ scale, onPrev, onNext, onTotalsChange, hubAvailable }: Props) {
  const [rows, setRows] = useState<SkuRow[]>(() => buildSkuRows(scale));
  const [evidenceModal, setEvidenceModal] = useState<{ rowId: string; files: EvidenceFile[] } | null>(null);

  const groups: NmGroupRow[] = useMemo(() => {
    const map = new Map<string, NmGroupRow>();
    rows.forEach(r => {
      if (!map.has(r.nmName)) {
        map.set(r.nmName, {
          nm: r.nmName, phone: r.nmPhone,
          needed: 0, committed: 0, delta: 0, skuCount: 0, confirmedCount: 0,
          status: "not_called", skus: [],
        });
      }
      const g = map.get(r.nmName)!;
      g.needed += r.needed;
      if (r.status === "confirmed" || r.status === "counter") g.committed += r.committed;
      g.skuCount++;
      if (r.locked) g.confirmedCount++;
      g.skus.push(r);
    });
    return Array.from(map.values()).map(g => {
      g.delta = g.committed - g.needed;
      const allLocked = g.confirmedCount === g.skuCount;
      const hasContact = g.skus.some(s => s.contactMethod);
      g.status = allLocked ? "ok" : !hasContact ? "not_called" : g.confirmedCount > 0 ? "partial" : "waiting";
      return g;
    });
  }, [rows]);

  const totals = useMemo(() => {
    const total = rows.length;
    const confirmedCount = rows.filter(r => r.locked).length;
    const waitingCount = rows.filter(r => r.status === "waiting").length;
    const notCalledCount = rows.filter(r => r.status === "not_called").length;
    const confirmedM2 = rows.filter(r => r.status === "confirmed" || r.status === "counter").reduce((s, r) => s + r.committed, 0);
    const waitingNms = new Set(rows.filter(r => r.status === "waiting").map(r => r.nmName)).size;
    const notCalledNms = new Set(rows.filter(r => r.status === "not_called").map(r => r.nmName)).size;
    const progress = total > 0 ? (confirmedCount / total) * 100 : 0;
    return { total, confirmedCount, waitingCount, notCalledCount, confirmedM2, waitingNms, notCalledNms, progress };
  }, [rows]);

  // Push to parent for Hub Available recalc — guarded with effect
  useEffect(() => { onTotalsChange?.(totals.confirmedM2); }, [totals.confirmedM2, onTotalsChange]);

  const updateRow = (id: string, patch: Partial<SkuRow>) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      if (patch.committed !== undefined) {
        if (next.committed > 0 && next.contactMethod) {
          next.status = next.committed < next.needed * 0.97 ? "counter" : "confirmed";
        }
      }
      if (patch.contactMethod !== undefined && next.committed === 0 && next.contactMethod) {
        next.status = "waiting";
      }
      return next;
    }));
  };

  const confirmRow = (id: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, locked: true } : r));
    const r = rows.find(x => x.id === id);
    if (r) toast.success(`✅ Cam kết ${r.nmName} ${r.sku} đã lưu. Hub Available cập nhật.`);
  };

  const callNm = (nmName: string, phone: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setRows(prev => prev.map(r => r.nmName === nmName && r.status === "not_called"
      ? { ...r, contactMethod: "call", contactDate: today, status: "waiting" } : r));
    toast.info(`📞 Gọi ${nmName}: ${phone}`);
  };

  const lockMonth = () => {
    toast.success(`🔒 Cam kết T5 đã khóa. Hub Available: ${hubAvailable.toLocaleString()}m². DRP đêm nay sẽ dùng.`);
    setTimeout(onNext, 600);
  };

  const cards: SummaryCard[] = [
    {
      key: "confirmed", label: "Đã xác nhận",
      value: `${totals.confirmedCount}/${totals.total}`, unit: "SKU",
      trend: { delta: `${totals.progress.toFixed(0)}%`, direction: "up", color: totals.progress >= 80 ? "green" : "gray" },
      severity: totals.progress >= 80 ? "ok" : totals.progress >= 50 ? "warn" : "critical",
      tooltip: "SKU đã có cam kết NM và đã khóa",
    },
    {
      key: "waiting", label: "Chờ NM", value: totals.waitingCount, unit: "SKU",
      trend: { delta: `${totals.waitingNms} NM`, direction: "flat", color: "gray" },
      severity: "warn",
      tooltip: "Đã liên hệ — chờ NM phản hồi",
    },
    {
      key: "notcalled", label: "Chưa gọi", value: totals.notCalledCount, unit: "SKU",
      trend: { delta: `${totals.notCalledNms} NM`, direction: "up", color: "red" },
      severity: totals.notCalledCount > 0 ? "critical" : "ok",
      tooltip: "Cần ưu tiên gọi/Zalo trong 24h",
    },
    {
      key: "hub", label: "Hub còn", value: hubAvailable.toLocaleString(), unit: "m²",
      trend: { delta: "= CK − PO − SS", direction: "flat", color: "gray" },
      severity: hubAvailable < 0 ? "critical" : "ok",
      tooltip: "Hub Available = Cam kết NM − Đã release PO − Tồn an toàn Hub",
    },
  ];

  const cols: SmartTableColumn<NmGroupRow>[] = [
    { key: "nm", label: "NM", sortable: true, width: 130, render: r => <span className="font-medium text-text-1">{r.nm}</span> },
    { key: "needed", label: "Cần đặt", numeric: true, align: "right", sortable: true, width: 100,
      render: r => <span className="tabular-nums text-text-2">{r.needed.toLocaleString()}</span> },
    { key: "committed", label: "Đã cam kết", numeric: true, align: "right", sortable: true, width: 120,
      render: r => <span className="tabular-nums font-medium text-text-1">{r.committed.toLocaleString()}</span> },
    { key: "delta", label: "Chênh", numeric: true, align: "right", sortable: true, width: 110,
      render: r => <span className={cn("tabular-nums font-medium", r.delta >= 0 ? "text-success" : "text-danger")}>
        {r.delta >= 0 ? "+" : ""}{r.delta.toLocaleString()}
      </span> },
    { key: "progress", label: "Số SKU", numeric: true, align: "center", sortable: true, width: 100,
      render: r => <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium",
        r.confirmedCount === r.skuCount ? "bg-success-bg text-success" :
        r.confirmedCount > 0 ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger"
      )}>{r.confirmedCount}/{r.skuCount}</span> },
    { key: "status", label: "Trạng thái", sortable: true, width: 160,
      render: r => {
        const map = {
          ok: { label: "🟢 Hoàn tất", cls: "bg-success-bg text-success border-success/30" },
          partial: { label: "🟡 Đang làm", cls: "bg-warning-bg text-warning border-warning/30" },
          waiting: { label: "🟡 Chờ NM", cls: "bg-warning-bg text-warning border-warning/30" },
          not_called: { label: "🔴 Chưa gọi", cls: "bg-danger-bg text-danger border-danger/30" },
        }[r.status];
        return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-medium", map.cls)}>{map.label}</span>;
      } },
    { key: "action", label: "Hành động", align: "right", width: 140,
      render: r => r.status === "not_called"
        ? <button onClick={(e) => { e.stopPropagation(); callNm(r.nm, r.phone); }}
            className="inline-flex items-center gap-1 rounded-button bg-danger text-white px-2.5 py-1 text-caption font-semibold hover:bg-danger/90">
            <Phone className="h-3 w-3" /> Gọi tất cả
          </button>
        : r.status === "ok"
        ? <span className="inline-flex items-center gap-1 text-caption text-success"><Lock className="h-3 w-3" /> Đã khóa</span>
        : <span className="text-caption text-text-3">Mở để xem</span> },
  ];

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="rounded-card border border-surface-3 bg-surface-1 p-4">
        <h2 className="font-display text-section-header text-text-1">
          Bước 2 — Cam kết: Gọi NM, gõ cam kết, xác nhận
        </h2>
        <p className="text-table-sm text-text-2 mt-1">
          Liên hệ từng NM → nhập số cam kết → upload minh chứng → khóa.
        </p>
      </div>

      {/* 4 Summary cards */}
      <SummaryCards cards={cards} screenId="hub-step2" editable />

      {/* NM × SKU 2-tier table */}
      <SmartTable<NmGroupRow>
        screenId="hub-step2-commitment"
        title="Cam kết NM — gộp theo NM"
        exportFilename="hub-cam-ket-nm"
        columns={cols}
        data={groups}
        defaultDensity="compact"
        getRowId={r => r.nm}
        rowSeverity={r => r.status === "not_called" ? "shortage" : r.status === "waiting" ? "watch" : undefined}
        autoExpandWhen={r => r.status !== "ok"}
        drillDown={r => (
          <SkuChildTable
            skus={r.skus}
            onUpdate={updateRow}
            onConfirm={confirmRow}
            onOpenEvidence={(s) => setEvidenceModal({ rowId: s.id, files: s.evidence })}
          />
        )}
      />

      {/* Progress + Lock */}
      <div className="rounded-card border border-surface-3 bg-surface-1 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-table-sm text-text-2 font-medium">
            {totals.confirmedCount}/{totals.total} SKU xác nhận ({totals.progress.toFixed(0)}%)
          </span>
          <span className="text-caption text-text-3">≥80% để khóa cam kết tháng</span>
        </div>
        <div className="h-2 rounded-full bg-surface-3 overflow-hidden mb-3">
          <div className={cn("h-full transition-all duration-500",
            totals.progress >= 80 ? "bg-success" : totals.progress >= 50 ? "bg-info" : "bg-warning"
          )} style={{ width: `${totals.progress}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onPrev} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Booking
          </Button>
          <div className="flex items-center gap-2">
            <Button
              disabled={totals.progress < 80}
              onClick={lockMonth}
              className={cn("gap-1.5", totals.progress < 80 && "opacity-60 cursor-not-allowed")}
            >
              <Lock className="h-4 w-4" /> Khóa cam kết T5
            </Button>
            <Button variant="outline" onClick={onNext} className="gap-1.5">
              PO & Theo dõi <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Evidence modal */}
      {evidenceModal && (
        <EvidenceModal
          files={evidenceModal.files}
          onClose={() => setEvidenceModal(null)}
          onUpload={(newFiles) => {
            setRows(prev => prev.map(r => r.id === evidenceModal.rowId
              ? { ...r, evidence: [...r.evidence, ...newFiles] } : r));
            setEvidenceModal(prev => prev ? { ...prev, files: [...prev.files, ...newFiles] } : null);
          }}
          onRemove={(idx) => {
            setRows(prev => prev.map(r => r.id === evidenceModal.rowId
              ? { ...r, evidence: r.evidence.filter((_, i) => i !== idx) } : r));
            setEvidenceModal(prev => prev ? { ...prev, files: prev.files.filter((_, i) => i !== idx) } : null);
          }}
        />
      )}
    </div>
  );
}

/* ─── SKU child table ─── */
function SkuChildTable({ skus, onUpdate, onConfirm, onOpenEvidence }: {
  skus: SkuRow[];
  onUpdate: (id: string, patch: Partial<SkuRow>) => void;
  onConfirm: (id: string) => void;
  onOpenEvidence: (s: SkuRow) => void;
}) {
  return (
    <div className="bg-surface-1/40 px-4 py-3">
      <p className="text-caption uppercase tracking-wide text-text-3 mb-2">
        Phân rã theo Mã hàng — {skus[0]?.nmName}
      </p>
      <table className="w-full text-table-sm">
        <thead>
          <tr className="border-b border-surface-3 text-text-3 text-caption uppercase">
            <th className="text-left py-1.5 px-2">Mã hàng</th>
            <th className="text-right py-1.5 px-2">Cần</th>
            <th className="text-right py-1.5 px-2">Cam kết ✏️</th>
            <th className="text-left py-1.5 px-2">Nguồn</th>
            <th className="text-left py-1.5 px-2">Ngày</th>
            <th className="text-center py-1.5 px-2">📎</th>
            <th className="text-left py-1.5 px-2">Trạng thái</th>
            <th className="text-right py-1.5 px-2">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {skus.map(s => (
            <SkuChildRow key={s.id} s={s} onUpdate={onUpdate} onConfirm={onConfirm} onOpenEvidence={onOpenEvidence} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkuChildRow({ s, onUpdate, onConfirm, onOpenEvidence }: {
  s: SkuRow;
  onUpdate: (id: string, patch: Partial<SkuRow>) => void;
  onConfirm: (id: string) => void;
  onOpenEvidence: (s: SkuRow) => void;
}) {
  const STATUS_MAP: Record<CommitStatus, { label: string; cls: string }> = {
    not_called: { label: "🔴 Chưa gọi", cls: "bg-danger-bg text-danger border-danger/30" },
    waiting:    { label: "🟡 Chờ NM",   cls: "bg-warning-bg text-warning border-warning/30" },
    confirmed:  { label: "🟢 Đã xác nhận", cls: "bg-success-bg text-success border-success/30" },
    counter:    { label: "⚠️ NM đề xuất khác", cls: "bg-warning-bg text-warning border-warning/30" },
  };

  return (
    <tr className={cn("border-b border-surface-3/50", s.locked && "bg-success-bg/10")}>
      <td className="py-1.5 px-2 font-mono text-text-2">{s.sku}</td>
      <td className="py-1.5 px-2 text-right tabular-nums text-text-2">{s.needed.toLocaleString()}</td>
      <td className="py-1.5 px-2 text-right">
        <input type="number" disabled={s.locked} value={s.committed || ""} placeholder="—"
          onChange={e => onUpdate(s.id, { committed: Number(e.target.value) || 0 })}
          className={cn("w-20 rounded border px-1.5 py-0.5 text-right text-caption tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/30",
            s.locked ? "border-transparent bg-transparent text-text-1 font-semibold cursor-not-allowed"
                     : "border-surface-3 bg-surface-0 text-text-1")} />
      </td>
      <td className="py-1.5 px-2">
        <select disabled={s.locked} value={s.contactMethod ?? ""}
          onChange={e => onUpdate(s.id, {
            contactMethod: (e.target.value || null) as ContactMethod,
            contactDate: e.target.value && !s.contactDate ? new Date().toISOString().slice(0, 10) : s.contactDate,
          })}
          className={cn("rounded border border-surface-3 bg-surface-0 px-1 py-0.5 text-caption text-text-1 focus:outline-none",
            s.locked && "cursor-not-allowed opacity-70")}>
          <option value="">— Chọn —</option>
          <option value="call">Gọi</option>
          <option value="zalo">Zalo</option>
          <option value="email">Email</option>
          <option value="in_person">Gặp</option>
        </select>
      </td>
      <td className="py-1.5 px-2 text-caption text-text-2 font-mono">{s.contactDate ?? "—"}</td>
      <td className="py-1.5 px-2 text-center">
        <button onClick={() => onOpenEvidence(s)}
          className={cn("inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-caption font-medium",
            s.evidence.length > 0 ? "border-info/30 bg-info-bg text-info" : "border-surface-3 bg-surface-0 text-text-3")}>
          📎 {s.evidence.length || 0}
        </button>
      </td>
      <td className="py-1.5 px-2">
        <Popover>
          <PopoverTrigger asChild>
            <button className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-caption font-medium hover:opacity-80", STATUS_MAP[s.status].cls)}>
              {STATUS_MAP[s.status].label}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <p className="text-caption text-text-3 mb-2">Cập nhật trạng thái</p>
            <div className="flex flex-col gap-1">
              {s.status === "not_called" && (
                <Button size="sm" variant="outline" onClick={() => onUpdate(s.id, {
                  contactMethod: "call", contactDate: new Date().toISOString().slice(0, 10), status: "waiting",
                })}>📞 Đã gọi</Button>
              )}
              {s.status === "waiting" && (
                <>
                  <Button size="sm" onClick={() => onConfirm(s.id)}>✅ NM xác nhận</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Đã ghi nhận: gọi lại sau")}>📞 Gọi lại</Button>
                  <Button size="sm" variant="outline" onClick={() => onUpdate(s.id, { status: "counter" })}>❌ NM đề xuất khác</Button>
                </>
              )}
              {(s.status === "confirmed" || s.status === "counter") && !s.locked && (
                <>
                  <Button size="sm" variant="outline" onClick={() => onOpenEvidence(s)}>📷 Thêm ảnh</Button>
                  <Button size="sm" onClick={() => onConfirm(s.id)}><Lock className="h-3 w-3" /> Khóa</Button>
                </>
              )}
              {s.locked && (
                <>
                  <Button size="sm" variant="outline" onClick={() => onUpdate(s.id, { locked: false })}>🔓 Mở khóa</Button>
                  <Button size="sm" variant="outline" onClick={() => toast.success(`📦 Tạo PO ${s.sku}`)}>
                    <Package className="h-3 w-3" /> Tạo PO
                  </Button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </td>
      <td className="py-1.5 px-2 text-right">
        {s.locked ? (
          <span className="inline-flex items-center gap-1 text-caption text-success"><Lock className="h-3 w-3" /></span>
        ) : s.status === "confirmed" || s.status === "counter" ? (
          <button onClick={() => onConfirm(s.id)}
            className="inline-flex items-center gap-1 rounded bg-gradient-primary text-primary-foreground px-2 py-0.5 text-caption font-semibold">
            <CheckCircle2 className="h-3 w-3" /> Xác nhận
          </button>
        ) : <span className="text-caption text-text-3">—</span>}
      </td>
    </tr>
  );
}

/* ─── Evidence modal ─── */
function EvidenceModal({ files, onClose, onUpload, onRemove }: {
  files: EvidenceFile[];
  onClose: () => void;
  onUpload: (files: EvidenceFile[]) => void;
  onRemove: (idx: number) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const handle = (fl: FileList | null) => {
    if (!fl) return;
    const f: EvidenceFile[] = Array.from(fl).map(x => ({ name: x.name, url: URL.createObjectURL(x), type: x.type }));
    onUpload(f);
    toast.success(`Đã đính kèm ${f.length} file`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-2 rounded-card border border-surface-3 max-w-2xl w-full p-5 shadow-xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-section-header text-text-1">Minh chứng cam kết NM</h3>
          <button onClick={onClose} className="text-text-3 hover:text-text-1"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex gap-2 mb-4">
          <button onClick={() => cameraInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table-sm font-medium text-text-1">
            <Camera className="h-4 w-4" /> Chụp ảnh
          </button>
          <button onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table-sm font-medium text-text-1">
            <Upload className="h-4 w-4" /> Chọn file
          </button>
          <input ref={fileInput} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={e => handle(e.target.files)} />
          <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handle(e.target.files)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {files.length === 0 && <p className="col-span-3 text-text-3 text-table-sm py-6 text-center">Chưa có minh chứng nào.</p>}
          {files.map((f, i) => (
            <div key={i} className="relative rounded border border-surface-3 bg-surface-0 p-2">
              <ImageIcon className="h-12 w-12 text-text-3 mx-auto" />
              <p className="text-caption text-text-2 truncate mt-1">{f.name}</p>
              <button onClick={() => onRemove(i)} className="absolute top-1 right-1 rounded-full bg-danger text-white p-0.5">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

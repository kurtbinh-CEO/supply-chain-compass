import { useState } from "react";
import { cn } from "@/lib/utils";
import { RefreshCw, ChevronDown, ChevronUp, Check } from "lucide-react";
import { toast } from "sonner";

export interface NmRow {
  nm: string;
  onHand: number | null;
  atp: number | null;
  khsx: number | null;
  khsxEta: string;
  pipeline: number;
  freshness: string;
  freshnessMin: number; // minutes since last update
  lt: string;
  costM2: string;
  recommended?: boolean;
}

interface SkuNmPanelProps {
  item: string;
  variant: string;
  netReq: number;
  primaryNm: string;
  primaryAtp: number;
  scale: number;
  onSourceConfirm: (sources: { nm: string; qty: number }[]) => void;
}

const freshnessIcon = (min: number) => {
  if (min < 0) return { icon: "❌", label: "Offline", color: "text-text-3" };
  if (min <= 60) return { icon: "🟢", label: `${min}m`, color: "text-success" };
  if (min <= 480) return { icon: "🟡", label: `${Math.round(min / 60)}h`, color: "text-warning" };
  if (min <= 1440) return { icon: "🔴", label: `${Math.round(min / 60)}h stale`, color: "text-danger" };
  return { icon: "❌", label: `${Math.round(min / 60)}h offline`, color: "text-text-3" };
};

const baseNmData: Record<string, NmRow[]> = {
  "GA-300 A4": [
    { nm: "Mikado", onHand: 4200, atp: 1500, khsx: 2500, khsxEta: "18/05", pipeline: 0, freshness: "API", freshnessMin: 32, lt: "14d", costM2: "185K" },
    { nm: "Toko", onHand: 2800, atp: 960, khsx: 2000, khsxEta: "20/05", pipeline: 0, freshness: "Manual", freshnessMin: 1080, lt: "14d", costM2: "180K" },
    { nm: "Đồng Tâm", onHand: 1200, atp: 450, khsx: 1500, khsxEta: "21/05", pipeline: 0, freshness: "File", freshnessMin: 240, lt: "7d", costM2: "170K" },
    { nm: "Phú Mỹ", onHand: null, atp: null, khsx: null, khsxEta: "", pipeline: 0, freshness: "Offline", freshnessMin: -1, lt: "18d", costM2: "160K" },
    { nm: "Vigracera", onHand: 800, atp: 455, khsx: 1000, khsxEta: "22/05", pipeline: 0, freshness: "API", freshnessMin: 120, lt: "10d", costM2: "175K" },
  ],
  "GA-600 A4": [
    { nm: "Toko", onHand: 2800, atp: 960, khsx: 2000, khsxEta: "20/05", pipeline: 0, freshness: "Manual", freshnessMin: 1080, lt: "14d", costM2: "180K", recommended: false },
    { nm: "Mikado", onHand: 4200, atp: 2035, khsx: 2500, khsxEta: "18/05", pipeline: 0, freshness: "API", freshnessMin: 32, lt: "14d", costM2: "185K", recommended: true },
    { nm: "Đồng Tâm", onHand: 1200, atp: 450, khsx: 1500, khsxEta: "21/05", pipeline: 0, freshness: "File", freshnessMin: 240, lt: "7d", costM2: "170K" },
    { nm: "Phú Mỹ", onHand: null, atp: null, khsx: null, khsxEta: "", pipeline: 0, freshness: "Offline", freshnessMin: -1, lt: "18d", costM2: "160K" },
    { nm: "Vigracera", onHand: 800, atp: 455, khsx: 1000, khsxEta: "22/05", pipeline: 0, freshness: "API", freshnessMin: 120, lt: "10d", costM2: "175K" },
  ],
  "GA-600 B2": [
    { nm: "Đồng Tâm", onHand: 1200, atp: 450, khsx: 1500, khsxEta: "21/05", pipeline: 0, freshness: "File", freshnessMin: 240, lt: "7d", costM2: "170K" },
    { nm: "Toko", onHand: 1800, atp: 620, khsx: 1200, khsxEta: "19/05", pipeline: 0, freshness: "Manual", freshnessMin: 1080, lt: "14d", costM2: "180K" },
    { nm: "Mikado", onHand: 3200, atp: 1800, khsx: 2000, khsxEta: "18/05", pipeline: 0, freshness: "API", freshnessMin: 45, lt: "14d", costM2: "185K" },
    { nm: "Vigracera", onHand: 600, atp: 320, khsx: 800, khsxEta: "22/05", pipeline: 0, freshness: "API", freshnessMin: 90, lt: "10d", costM2: "175K" },
    { nm: "Phú Mỹ", onHand: null, atp: null, khsx: null, khsxEta: "", pipeline: 0, freshness: "Offline", freshnessMin: -1, lt: "18d", costM2: "160K" },
  ],
};

// Fallback for any other SKU
const defaultNmData: NmRow[] = [
  { nm: "Mikado", onHand: 3000, atp: 1200, khsx: 2000, khsxEta: "19/05", pipeline: 0, freshness: "API", freshnessMin: 40, lt: "14d", costM2: "185K" },
  { nm: "Toko", onHand: 2000, atp: 800, khsx: 1500, khsxEta: "20/05", pipeline: 0, freshness: "Manual", freshnessMin: 900, lt: "14d", costM2: "180K" },
  { nm: "Đồng Tâm", onHand: 1000, atp: 400, khsx: 1000, khsxEta: "21/05", pipeline: 0, freshness: "File", freshnessMin: 300, lt: "7d", costM2: "170K" },
  { nm: "Phú Mỹ", onHand: null, atp: null, khsx: null, khsxEta: "", pipeline: 0, freshness: "Offline", freshnessMin: -1, lt: "18d", costM2: "160K" },
  { nm: "Vigracera", onHand: 700, atp: 350, khsx: 800, khsxEta: "22/05", pipeline: 0, freshness: "API", freshnessMin: 100, lt: "10d", costM2: "175K" },
];

export function SkuNmPanel({ item, variant, netReq, primaryNm, primaryAtp, scale, onSourceConfirm }: SkuNmPanelProps) {
  const key = `${item} ${variant}`;
  const rawNms = baseNmData[key] || defaultNmData;
  const nms = rawNms.map(n => ({
    ...n,
    onHand: n.onHand !== null ? Math.round(n.onHand * scale) : null,
    atp: n.atp !== null ? Math.round(n.atp * scale) : null,
    khsx: n.khsx !== null ? Math.round(n.khsx * scale) : null,
  }));

  const [sources, setSources] = useState<{ nm: string; qty: number }[]>(() => {
    if (primaryAtp > 0) return [{ nm: primaryNm, qty: Math.min(primaryAtp, netReq) }];
    return [];
  });
  const [atpOverrides, setAtpOverrides] = useState<Record<string, { value: number; note: string }>>({});
  const [editingAtp, setEditingAtp] = useState<string | null>(null);
  const [atpInput, setAtpInput] = useState(0);
  const [atpNote, setAtpNote] = useState("");
  const [confirmModal, setConfirmModal] = useState<{ from: string; to: string; qty: number } | null>(null);

  const totalSourced = sources.reduce((a, s) => a + s.qty, 0);
  const gap = Math.max(0, netReq - totalSourced);
  const coveredPct = netReq > 0 ? Math.min(100, Math.round((totalSourced / netReq) * 100)) : 100;

  const getAtp = (nm: string, origAtp: number | null) => {
    if (atpOverrides[nm]) return atpOverrides[nm].value;
    return origAtp || 0;
  };

  const handleChoose = (nm: string) => {
    const nmData = nms.find(n => n.nm === nm);
    if (!nmData) return;
    const atp = getAtp(nm, nmData.atp);
    const needed = gap;
    if (needed <= 0) {
      toast.info("Gap đã = 0, không cần thêm NM");
      return;
    }
    const currentPrimary = sources.length > 0 ? sources[0].nm : "";
    setConfirmModal({ from: currentPrimary, to: nm, qty: Math.min(atp, needed) });
  };

  const confirmChoose = () => {
    if (!confirmModal) return;
    setSources(prev => {
      const existing = prev.find(s => s.nm === confirmModal.to);
      if (existing) {
        return prev.map(s => s.nm === confirmModal.to ? { ...s, qty: s.qty + confirmModal.qty } : s);
      }
      return [...prev, { nm: confirmModal.to, qty: confirmModal.qty }];
    });
    toast.success(`Thêm ${confirmModal.to}: ${confirmModal.qty.toLocaleString()} m²`);
    setConfirmModal(null);
  };

  const handleRefresh = () => {
    toast.info("Đang refresh ATP từ tất cả NM...", { duration: 1500 });
    setTimeout(() => toast.success("ATP đã cập nhật"), 1500);
  };

  const handleAtpOverride = (nm: string) => {
    setAtpOverrides(prev => ({ ...prev, [nm]: { value: atpInput, note: atpNote } }));
    toast.success(`Override ATP ${nm}: ${atpInput.toLocaleString()}`);
    setEditingAtp(null);
  };

  const handleConfirmPlan = () => {
    onSourceConfirm(sources);
    toast.success(`Xác nhận sourcing ${item} ${variant}: ${totalSourced.toLocaleString()} m² từ ${sources.length} NM`);
  };

  return (
    <div className="bg-surface-0 border-t border-b border-surface-3 px-6 py-4 space-y-4 animate-fade-in">
      {/* Panel header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-display text-table font-bold text-text-1">
            {item} {variant} — Cần <span className="text-primary">{netReq.toLocaleString()}</span> m²
            {totalSourced > 0 && <> · Có <span className="text-success">{totalSourced.toLocaleString()}</span></>}
            {gap > 0 && <> · Thiếu <span className="text-danger">{gap.toLocaleString()}</span></>}
          </h4>
        </div>
        <button onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-2 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3 transition-colors">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh tất cả NM
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 rounded-full bg-surface-3 overflow-hidden">
          <div className="h-full rounded-full bg-success transition-all" style={{ width: `${coveredPct}%` }} />
        </div>
        <span className={cn("text-table-sm font-bold tabular-nums", gap > 0 ? "text-danger" : "text-success")}>
          {coveredPct}% covered
        </span>
      </div>

      {/* NM table */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3 bg-surface-1/50">
              {["NM", "Tồn hiện có", "ATP (UNIS)", "KHSX (ETA)", "Đang về", "Độ tươi", "LT", "Giá/m²", "Hành động"].map(h => (
                <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nms.map((n, i) => {
              const f = freshnessIcon(n.freshnessMin);
              const isOffline = n.freshnessMin < 0;
              const isPrimary = sources.some(s => s.nm === n.nm);
              const atp = getAtp(n.nm, n.atp);
              const hasOverride = !!atpOverrides[n.nm];

              return (
                <tr key={n.nm} className={cn("border-b border-surface-3/50 transition-colors",
                  n.recommended ? "bg-success-bg/50" : isPrimary ? "bg-primary/5" : i % 2 === 0 ? "bg-surface-0" : "bg-surface-2",
                  isOffline && "opacity-60"
                )}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {isPrimary && <span className="text-primary">★</span>}
                      <span className={cn("font-medium", isPrimary ? "text-primary" : "text-text-1")}>{n.nm}</span>
                      {isPrimary && <span className="text-[10px] text-primary">(đang match)</span>}
                      {n.recommended && !isPrimary && <span className="text-[10px] text-success font-medium">★gợi ý</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-text-1">{n.onHand?.toLocaleString() ?? "—"}</td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {isOffline ? <span className="text-text-3">—</span> : (
                      <button onClick={() => { setEditingAtp(n.nm); setAtpInput(atp); setAtpNote(""); }}
                        className={cn("tabular-nums cursor-pointer hover:underline",
                          hasOverride ? "text-warning font-medium" : "text-text-1"
                        )}
                        title={hasOverride ? `Manual override: ${atpOverrides[n.nm].note}. API gốc: ${n.atp?.toLocaleString()}` : "Click để override"}>
                        {atp.toLocaleString()}
                        {hasOverride && <span className="ml-1 text-[10px]">✏</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-text-2">
                    {n.khsx ? `${n.khsx.toLocaleString()} (${n.khsxEta})` : "—"}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-text-2">{n.pipeline || 0}</td>
                  <td className="px-3 py-2.5">
                    <span className={cn("text-table-sm font-medium", f.color)}>
                      {f.icon} {f.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-text-2">{n.lt}</td>
                  <td className="px-3 py-2.5 tabular-nums text-text-2">{n.costM2}</td>
                  <td className="px-3 py-2.5">
                    {isOffline ? (
                      <span className="text-text-3 text-table-sm cursor-default" title="NM offline. Liên hệ trực tiếp.">Offline</span>
                    ) : isPrimary ? (
                      <span className="text-success text-table-sm font-medium">{sources.find(s => s.nm === n.nm)?.qty.toLocaleString()}</span>
                    ) : n.freshnessMin > 480 ? (
                      <button onClick={() => { toast.success(`Đã nhắc ${n.nm} cập nhật số`); }}
                        className="text-warning text-table-sm font-medium hover:underline">Nhắc update</button>
                    ) : gap > 0 ? (
                      <button onClick={() => handleChoose(n.nm)}
                        className="text-primary text-table-sm font-medium hover:underline">Chọn</button>
                    ) : (
                      <span className="text-text-3 text-table-sm">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sourcing summary */}
      {sources.length > 0 && (
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="px-4 py-2 border-b border-surface-3 bg-surface-1/50">
            <span className="text-table-header uppercase text-text-3">Kế hoạch sourcing {item} {variant}</span>
          </div>
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3">
                <th className="px-4 py-1.5 text-left text-table-header uppercase text-text-3">Source</th>
                <th className="px-3 py-1.5 text-center text-table-header uppercase text-text-3">Qty</th>
                <th className="px-3 py-1.5 text-center text-table-header uppercase text-text-3">%</th>
                <th className="px-3 py-1.5 text-left text-table-header uppercase text-text-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s, i) => (
                <tr key={s.nm} className="border-b border-surface-3/50">
                  <td className="px-4 py-2 text-text-1 font-medium">{s.nm} {i === 0 ? "(primary)" : "(supplement)"}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-text-1">{s.qty.toLocaleString()}</td>
                  <td className="px-3 py-2 text-center tabular-nums text-text-2">{netReq > 0 ? Math.round((s.qty / netReq) * 100) : 0}%</td>
                  <td className="px-3 py-2 text-text-3">{i === 0 ? "Existing match" : "★ Gợi ý"}</td>
                </tr>
              ))}
              <tr className="bg-surface-1 font-bold">
                <td className="px-4 py-2 text-text-1">TOTAL</td>
                <td className="px-3 py-2 text-center tabular-nums text-text-1">{totalSourced.toLocaleString()}</td>
                <td className="px-3 py-2 text-center tabular-nums text-text-1">{coveredPct}%</td>
                <td className="px-3 py-2">
                  <span className={cn("font-bold", gap > 0 ? "text-danger" : "text-success")}>
                    Gap = {gap > 0 ? gap.toLocaleString() : "0 ✅"}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-surface-3 flex justify-end">
            <button onClick={handleConfirmPlan}
              className="rounded-button bg-gradient-primary text-white px-5 py-2 text-table-sm font-medium flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> Xác nhận kế hoạch
            </button>
          </div>
        </div>
      )}

      {/* ATP override modal */}
      {editingAtp && (
        <>
          <div className="fixed inset-0 bg-text-1/20 z-50" onClick={() => setEditingAtp(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 p-5 space-y-3 animate-fade-in">
            <h4 className="font-display text-table font-bold text-text-1">Override ATP — {editingAtp}</h4>
            <p className="text-table-sm text-text-3">API gốc: {nms.find(n => n.nm === editingAtp)?.atp?.toLocaleString() ?? "—"}</p>
            <div>
              <label className="text-table-header uppercase text-text-3 mb-1 block">Số mới</label>
              <input type="number" value={atpInput} onChange={e => setAtpInput(Number(e.target.value))}
                className="w-full h-8 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 tabular-nums focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-table-header uppercase text-text-3 mb-1 block">Ghi chú</label>
              <input value={atpNote} onChange={e => setAtpNote(e.target.value)} placeholder="NM xác nhận qua điện thoại..."
                className="w-full h-8 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditingAtp(null)} className="flex-1 rounded-button border border-surface-3 py-1.5 text-table-sm text-text-2">Hủy</button>
              <button onClick={() => handleAtpOverride(editingAtp)} className="flex-1 rounded-button bg-gradient-primary text-white py-1.5 text-table-sm font-medium">Lưu</button>
            </div>
          </div>
        </>
      )}

      {/* Confirm choose modal */}
      {confirmModal && (
        <>
          <div className="fixed inset-0 bg-text-1/20 z-50" onClick={() => setConfirmModal(null)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 p-5 space-y-3 animate-fade-in">
            <h4 className="font-display text-table font-bold text-text-1">Thêm NM sourcing</h4>
            <p className="text-table text-text-2">
              Thêm <span className="font-bold text-text-1">{confirmModal.qty.toLocaleString()} m²</span> {item} {variant} từ <span className="font-bold text-primary">{confirmModal.to}</span>?
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setConfirmModal(null)} className="flex-1 rounded-button border border-surface-3 py-1.5 text-table-sm text-text-2">Hủy</button>
              <button onClick={confirmChoose} className="flex-1 rounded-button bg-gradient-primary text-white py-1.5 text-table-sm font-medium">Xác nhận</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, Upload, Pencil, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";
import {
  B2B_STAGE_PROB,
  BRANCHES,
  SKU_BASES,
  type B2bDeal,
  type B2bStage,
} from "@/data/unis-enterprise-dataset";

interface Props {
  deals: B2bDeal[];
  setDeals: (deals: B2bDeal[]) => void;
  tenant: string;
}

/* ── 6-stage pipeline (dataset-canonical) with explicit color tokens ── */
const STAGES: B2bStage[] = ["Tiềm năng", "Tiếp xúc", "Báo giá", "Đàm phán", "Cam kết", "Đã ký"];

const STAGE_STYLE: Record<B2bStage, { dot: string; chip: string; label: string }> = {
  "Tiềm năng": { dot: "bg-text-3",        chip: "bg-surface-3 text-text-2 border-surface-3", label: "Tiềm năng" },
  "Tiếp xúc":  { dot: "bg-info",          chip: "bg-info/10 text-info border-info/30",        label: "Tiếp xúc" },
  "Báo giá":   { dot: "bg-warning",       chip: "bg-warning/10 text-warning border-warning/30", label: "Báo giá" },
  "Đàm phán":  { dot: "bg-orange-500",    chip: "bg-orange-500/10 text-orange-500 border-orange-500/30", label: "Đàm phán" },
  "Cam kết":   { dot: "bg-success",       chip: "bg-success/10 text-success border-success/30", label: "Cam kết" },
  "Đã ký":     { dot: "bg-success",       chip: "bg-success text-success-foreground border-success", label: "Đã ký" },
};
const LOST_STYLE = { dot: "bg-danger", chip: "bg-danger/10 text-danger border-danger/30", label: "Mất" };

const cnOptions = BRANCHES.map((b) => b.code);
const skuOptions = SKU_BASES.map((s) => s.code);

const emptyDeal: Omit<B2bDeal, "id"> = {
  customer: "",
  cnCode: "CN-HCM",
  skuBaseCode: "GA-300",
  qtyM2: 0,
  stage: "Báo giá",
  expectedClose: new Date().toISOString().slice(0, 10),
  owner: "",
};

/* ────────────────────────────────────────────────────────────────────── */
/* Modal                                                                  */
/* ────────────────────────────────────────────────────────────────────── */
function DealModal({
  deal,
  onClose,
  onSave,
  title,
}: {
  deal: Omit<B2bDeal, "id">;
  onClose: () => void;
  onSave: (d: Omit<B2bDeal, "id">) => void;
  title: string;
}) {
  const [form, setForm] = useState(deal);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });

  return (
    <>
      <div className="fixed inset-0 bg-text-1/30 z-50" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-h-[80vh] overflow-y-auto bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 p-6 space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-section-header text-text-1">{title}</h3>
          <button onClick={onClose} className="text-text-3 hover:text-text-1"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-table-header uppercase text-text-3 mb-1 block">Khách hàng / Dự án</label>
            <input
              value={form.customer}
              onChange={(e) => set("customer", e.target.value)}
              placeholder="VD: Coteccons — Dự án A"
              className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-table-header uppercase text-text-3 mb-1 block">CN giao</label>
              <select value={form.cnCode} onChange={(e) => set("cnCode", e.target.value)}
                className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary">
                {cnOptions.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-table-header uppercase text-text-3 mb-1 block">SKU base</label>
              <select value={form.skuBaseCode} onChange={(e) => set("skuBaseCode", e.target.value)}
                className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary">
                {skuOptions.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-table-header uppercase text-text-3 mb-1 block">Qty (m²)</label>
              <input type="number" value={form.qtyM2} onChange={(e) => set("qtyM2", Number(e.target.value))}
                className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 tabular-nums focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-table-header uppercase text-text-3 mb-1 block">Stage</label>
              <select value={form.stage} onChange={(e) => set("stage", e.target.value as B2bStage)}
                className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary">
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {s} ({Math.round(B2B_STAGE_PROB[s] * 100)}%)
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-table-header uppercase text-text-3 mb-1 block">Ngày dự kiến chốt</label>
              <input type="date" value={form.expectedClose}
                onChange={(e) => set("expectedClose", e.target.value)}
                className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-table-header uppercase text-text-3 mb-1 block">Owner</label>
              <input value={form.owner} onChange={(e) => set("owner", e.target.value)}
                placeholder="Tên Sales..."
                className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-3">
          <button onClick={onClose} className="flex-1 rounded-button border border-surface-3 py-2.5 text-table text-text-2 hover:bg-surface-3">Hủy</button>
          <button onClick={() => onSave(form)} disabled={!form.customer || form.qtyM2 <= 0}
            className="flex-1 rounded-button bg-gradient-primary text-primary-foreground py-2.5 text-table font-medium disabled:opacity-50">Lưu</button>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/* Main                                                                   */
/* ────────────────────────────────────────────────────────────────────── */
interface PendingCascade {
  form: Omit<B2bDeal, "id">;
  editId: string;
  prev: B2bDeal;
  deltaPct: number;
}

export function B2BInputTab({ deals, setDeals }: Props) {
  const [modalDeal, setModalDeal] = useState<{ deal: Omit<B2bDeal, "id">; editId?: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<B2bStage | "all">("all");
  const [search, setSearch] = useState("");
  const [cascadeConfirm, setCascadeConfirm] = useState<PendingCascade | null>(null);

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (stageFilter !== "all" && d.stage !== stageFilter) return false;
      if (search.trim() && !d.customer.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [deals, stageFilter, search]);

  const totals = useMemo(() => {
    const totalQty = deals.reduce((a, d) => a + d.qtyM2, 0);
    const totalWeighted = deals.reduce((a, d) => a + Math.round(d.qtyM2 * B2B_STAGE_PROB[d.stage]), 0);
    const signed = deals.filter((d) => d.stage === "Đã ký").reduce((a, d) => a + d.qtyM2, 0);
    return { totalQty, totalWeighted, signed };
  }, [deals]);

  const stageCounts = useMemo(() => {
    const map: Record<string, number> = {};
    STAGES.forEach((s) => (map[s] = 0));
    deals.forEach((d) => (map[d.stage] = (map[d.stage] ?? 0) + 1));
    return map;
  }, [deals]);

  const applyEdit = (form: Omit<B2bDeal, "id">, editId: string) => {
    const updated = deals.map((d) => (d.id === editId ? { ...form, id: d.id } : d));
    setDeals(updated);
    toast.success(`Đã cập nhật deal ${form.customer}`);
  };

  const handleSave = (form: Omit<B2bDeal, "id">) => {
    if (modalDeal?.editId) {
      const prev = deals.find((d) => d.id === modalDeal.editId);
      if (prev && prev.qtyM2 > 0) {
        const deltaPct = ((form.qtyM2 - prev.qtyM2) / prev.qtyM2) * 100;
        if (Math.abs(deltaPct) > 20) {
          setCascadeConfirm({ form, editId: modalDeal.editId, prev, deltaPct: Math.round(deltaPct) });
          setModalDeal(null);
          return;
        }
      }
      applyEdit(form, modalDeal.editId);
    } else {
      const newId = `DEAL-${String(deals.length + 1).padStart(3, "0")}`;
      setDeals([...deals, { ...form, id: newId }]);
      toast.success(`Đã thêm deal ${form.customer}`);
    }
    setModalDeal(null);
  };

  const confirmCascade = () => {
    if (!cascadeConfirm) return;
    applyEdit(cascadeConfirm.form, cascadeConfirm.editId);
    toast.warning("Cascade đã trigger", {
      description: `${cascadeConfirm.form.customer}: S&OP v3 → DRP rerun → NM commitment refresh.`,
    });
    setCascadeConfirm(null);
  };

  const handleDelete = (id: string) => {
    const deal = deals.find((d) => d.id === id);
    setDeals(deals.filter((d) => d.id !== id));
    setDeleteConfirm(null);
    toast.success(`Đã xóa deal ${deal?.customer ?? id}`);
  };

  return (
    <div className="space-y-5">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="font-display text-screen-title text-text-1">B2B nhập liệu</h2>
          <span className="text-table text-text-2">
            <span className="font-semibold text-text-1 tabular-nums">{deals.length}</span> deals · Weighted:{" "}
            <span className="font-semibold text-text-1 tabular-nums">{totals.totalWeighted.toLocaleString()} m²</span> · Đã ký:{" "}
            <span className="font-semibold text-success tabular-nums">{totals.signed.toLocaleString()} m²</span>
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toast.info("Upload Excel: Drag & drop file .xlsx")}
            className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 px-4 py-2 text-table-sm text-text-2 hover:bg-surface-3 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" /> Upload Excel
          </button>
          <button
            onClick={() => setModalDeal({ deal: { ...emptyDeal } })}
            className="inline-flex items-center gap-1.5 rounded-button bg-gradient-primary text-primary-foreground px-4 py-2 text-table-sm font-medium"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm deal
          </button>
        </div>
      </div>

      {/* 6-stage pipeline chips with counts */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setStageFilter("all")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-table-sm font-medium transition-colors",
            stageFilter === "all"
              ? "border-primary bg-primary/10 text-primary"
              : "border-surface-3 bg-surface-1 text-text-2 hover:bg-surface-2",
          )}
        >
          Tất cả · {deals.length}
        </button>
        {STAGES.map((s) => {
          const style = STAGE_STYLE[s];
          const active = stageFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStageFilter(s)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-table-sm font-medium transition-colors",
                active ? style.chip : "border-surface-3 bg-surface-1 text-text-2 hover:bg-surface-2",
              )}
            >
              <span className={cn("h-2 w-2 rounded-full", style.dot)} />
              {style.label} · {Math.round(B2B_STAGE_PROB[s] * 100)}%
              <span className="ml-1 tabular-nums opacity-70">({stageCounts[s] ?? 0})</span>
            </button>
          );
        })}
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-table-sm font-medium opacity-70 cursor-default",
            LOST_STYLE.chip,
          )}
          title="Trạng thái Mất hiển thị nếu deal bị huỷ"
        >
          <span className={cn("h-2 w-2 rounded-full", LOST_STYLE.dot)} />
          {LOST_STYLE.label} · 0%
        </span>

        <div className="ml-auto relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-3" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm khách hàng..."
            className="h-9 w-56 rounded-button border border-surface-3 bg-surface-0 pl-8 pr-3 text-table-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Deals table — scrollable */}
      <div className="rounded-card border border-surface-3 bg-surface-2">
        <div className="max-h-[560px] overflow-y-auto">
          <table className="w-full text-table-sm">
            <thead className="sticky top-0 z-10 bg-surface-2">
              <tr className="border-b border-surface-3">
                <th className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">Deal ID</th>
                <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">Khách hàng</th>
                <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">CN</th>
                <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">SKU base</th>
                <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-3">Qty (m²)</th>
                <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">Stage</th>
                <th className="px-3 py-2.5 text-right text-table-header uppercase text-text-1 font-semibold">Weighted</th>
                <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">Dự kiến chốt</th>
                <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">Owner</th>
                <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-text-3 text-table-sm">
                    Không có deal phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
              {filtered.map((d, i) => {
                const style = STAGE_STYLE[d.stage];
                const weighted = Math.round(d.qtyM2 * B2B_STAGE_PROB[d.stage]);
                return (
                  <tr
                    key={d.id}
                    className={cn(
                      "border-b border-surface-3/50 hover:bg-primary/5 transition-colors",
                      i % 2 === 0 ? "bg-surface-0" : "bg-surface-2",
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-text-3 text-caption">{d.id}</td>
                    <td className="px-3 py-3 font-semibold text-text-1">{d.customer}</td>
                    <td className="px-3 py-3 text-center text-text-2">{d.cnCode}</td>
                    <td className="px-3 py-3 text-center font-mono text-text-1">{d.skuBaseCode}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium text-text-1">{d.qtyM2.toLocaleString()}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-caption font-semibold", style.chip)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
                        {style.label}
                        <span className="opacity-70">({Math.round(B2B_STAGE_PROB[d.stage] * 100)}%)</span>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-bold text-primary">{weighted.toLocaleString()}</td>
                    <td className="px-3 py-3 text-center text-text-2 tabular-nums">{d.expectedClose}</td>
                    <td className="px-3 py-3 text-text-2">{d.owner}</td>
                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() =>
                            setModalDeal({
                              deal: {
                                customer: d.customer,
                                cnCode: d.cnCode,
                                skuBaseCode: d.skuBaseCode,
                                qtyM2: d.qtyM2,
                                stage: d.stage,
                                expectedClose: d.expectedClose,
                                owner: d.owner,
                              },
                              editId: d.id,
                            })
                          }
                          className="text-primary hover:opacity-80 transition-colors"
                          title="Sửa"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(d.id)}
                          className="text-danger hover:opacity-80 transition-colors"
                          title="Xóa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-surface-1/90 backdrop-blur">
              <tr className="border-t border-surface-3">
                <td colSpan={4} className="px-4 py-2.5 text-table-sm font-semibold text-text-1">
                  TỔNG · {filtered.length}/{deals.length} deals
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums font-semibold text-text-1">
                  {filtered.reduce((a, d) => a + d.qtyM2, 0).toLocaleString()}
                </td>
                <td />
                <td className="px-3 py-2.5 text-right tabular-nums font-bold text-primary">
                  {filtered.reduce((a, d) => a + Math.round(d.qtyM2 * B2B_STAGE_PROB[d.stage]), 0).toLocaleString()}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Deal modal */}
      {modalDeal && (
        <DealModal
          deal={modalDeal.deal}
          title={modalDeal.editId ? "Sửa deal" : "Thêm deal mới"}
          onClose={() => setModalDeal(null)}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (() => {
        const d = deals.find((x) => x.id === deleteConfirm);
        return (
          <>
            <div className="fixed inset-0 bg-text-1/30 z-50" onClick={() => setDeleteConfirm(null)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 p-6 space-y-4 animate-fade-in">
              <h3 className="font-display text-section-header text-text-1">Xác nhận xóa</h3>
              <p className="text-table text-text-2">
                Xóa deal <span className="font-bold text-text-1">{d?.customer}</span>?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-button border border-surface-3 py-2 text-table text-text-2">
                  Hủy
                </button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 rounded-button bg-danger text-danger-foreground py-2 text-table font-medium">
                  Xóa
                </button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}

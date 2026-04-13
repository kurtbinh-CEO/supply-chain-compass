import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, Upload, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { B2BDealInput } from "@/pages/DemandPage";

interface Props {
  deals: B2BDealInput[];
  setDeals: (deals: B2BDealInput[]) => void;
  tenant: string;
}

const emptDeal: Omit<B2BDealInput, "id"> = {
  customer: "", project: "", cnList: ["BD"], skuMain: "GA-300 A4",
  qty: 0, probability: 70, deliveryMonths: ["Th5"], poStatus: null,
};

const cnOptions = ["BD", "ĐN", "HN", "CT"];
const skuOptions = ["GA-300 A4", "GA-300 B2", "GA-300 C1", "GA-400 A4", "GA-400 D5", "GA-600 A4", "GA-600 B2"];
const probOptions = [10, 25, 45, 65, 70, 85, 90, 100];
const monthOptions = ["Th5", "Th6", "Th7", "Th8", "Th9"];

function DealModal({ deal, onClose, onSave, title }: {
  deal: Omit<B2BDealInput, "id">; onClose: () => void;
  onSave: (d: Omit<B2BDealInput, "id">) => void; title: string;
}) {
  const [form, setForm] = useState(deal);
  const set = (k: keyof typeof form, v: any) => setForm({ ...form, [k]: v });

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
            <label className="text-table-header uppercase text-text-3 mb-1 block">Khách hàng</label>
            <input value={form.customer} onChange={e => set("customer", e.target.value)} placeholder="Nhập tên khách hàng..."
              className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-table-header uppercase text-text-3 mb-1 block">Dự án</label>
            <input value={form.project} onChange={e => set("project", e.target.value)} placeholder="Tên dự án..."
              className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-table-header uppercase text-text-3 mb-1 block">CN giao</label>
            <div className="flex gap-2 flex-wrap">
              {cnOptions.map(opt => (
                <button key={opt} onClick={() => {
                  const list = form.cnList.includes(opt) ? form.cnList.filter(c => c !== opt) : [...form.cnList, opt];
                  if (list.length > 0) set("cnList", list);
                }}
                  className={cn(
                    "px-3 py-1.5 rounded-button text-table-sm border transition-colors",
                    form.cnList.includes(opt) ? "border-primary bg-primary/10 text-primary" : "border-surface-3 text-text-2 hover:border-primary/30"
                  )}>{opt}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-table-header uppercase text-text-3 mb-1 block">SKU chính</label>
            <select value={form.skuMain} onChange={e => set("skuMain", e.target.value)}
              className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary">
              {skuOptions.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-table-header uppercase text-text-3 mb-1 block">Qty gốc (m²)</label>
              <input type="number" value={form.qty} onChange={e => set("qty", Number(e.target.value))}
                className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 tabular-nums focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-table-header uppercase text-text-3 mb-1 block">Xác suất %</label>
              <select value={form.probability} onChange={e => set("probability", Number(e.target.value))}
                className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary">
                {probOptions.map(p => <option key={p} value={p}>{p}%</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-table-header uppercase text-text-3 mb-1 block">Tháng giao</label>
            <div className="flex gap-2 flex-wrap">
              {monthOptions.map(m => (
                <button key={m} onClick={() => {
                  const list = form.deliveryMonths.includes(m) ? form.deliveryMonths.filter(x => x !== m) : [...form.deliveryMonths, m];
                  if (list.length > 0) set("deliveryMonths", list);
                }}
                  className={cn(
                    "px-3 py-1.5 rounded-button text-table-sm border transition-colors",
                    form.deliveryMonths.includes(m) ? "border-primary bg-primary/10 text-primary" : "border-surface-3 text-text-2 hover:border-primary/30"
                  )}>{m}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-3">
          <button onClick={onClose} className="flex-1 rounded-button border border-surface-3 py-2.5 text-table text-text-2 hover:bg-surface-3">Hủy</button>
          <button onClick={() => onSave(form)} disabled={!form.customer || !form.project || form.qty <= 0}
            className="flex-1 rounded-button bg-gradient-primary text-white py-2.5 text-table font-medium disabled:opacity-50">Lưu</button>
        </div>
      </div>
    </>
  );
}

export function B2BInputTab({ deals, setDeals, tenant }: Props) {
  const [modalDeal, setModalDeal] = useState<{ deal: Omit<B2BDealInput, "id">; editId?: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const totalWeighted = deals.reduce((a, d) => a + Math.round(d.qty * d.probability / 100), 0);
  const totalPo = deals.filter(d => d.poStatus).reduce((a, d) => {
    const match = d.poStatus?.match(/[\d,.]+/);
    return a + (match ? parseInt(match[0].replace(/,/g, "")) : 0);
  }, 0);

  const handleSave = (form: Omit<B2BDealInput, "id">) => {
    if (modalDeal?.editId) {
      const prev = deals.find(d => d.id === modalDeal.editId);
      const updated = deals.map(d => d.id === modalDeal.editId ? { ...form, id: d.id } : d);
      setDeals(updated);
      // Check >20% qty change
      if (prev && Math.abs(form.qty - prev.qty) / prev.qty > 0.2) {
        toast.warning(`B2B ${form.customer} thay đổi ${form.qty > prev.qty ? "+" : ""}${Math.round((form.qty - prev.qty) / prev.qty * 100)}%`);
      } else {
        toast.success(`Đã cập nhật deal ${form.customer}`);
      }
    } else {
      const newId = `B2B-${String(deals.length + 1).padStart(3, "0")}`;
      setDeals([...deals, { ...form, id: newId }]);
      toast.success(`Đã thêm deal ${form.customer} — ${form.project}`);
    }
    setModalDeal(null);
  };

  const handleDelete = (id: string) => {
    const deal = deals.find(d => d.id === id);
    setDeals(deals.filter(d => d.id !== id));
    setDeleteConfirm(null);
    toast.success(`Đã xóa deal ${deal?.customer} ${deal?.project}`);
  };

  return (
    <div className="space-y-5">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-display text-screen-title text-text-1">B2B nhập liệu</h2>
          <span className="text-table text-text-2">
            {deals.length} deals · Weighted: <span className="font-medium text-text-1 tabular-nums">{totalWeighted.toLocaleString()} m²</span> · PO confirmed: <span className="font-medium text-text-1 tabular-nums">{totalPo.toLocaleString()} m²</span>
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toast.info("Upload Excel: Drag & drop file .xlsx")}
            className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-0 px-4 py-2 text-table-sm text-text-2 hover:bg-surface-3 transition-colors">
            <Upload className="h-3.5 w-3.5" /> Upload Excel
          </button>
          <button onClick={() => setModalDeal({ deal: { ...emptDeal } })}
            className="inline-flex items-center gap-1.5 rounded-button bg-gradient-primary text-white px-4 py-2 text-table-sm font-medium">
            <Plus className="h-3.5 w-3.5" /> Thêm deal
          </button>
        </div>
      </div>

      {/* Deals table */}
      <div className="rounded-card border border-surface-3 bg-surface-2">
        <table className="w-full text-table-sm">
          <thead>
            <tr className="border-b border-surface-3">
              <th className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">Khách hàng</th>
              <th className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">Dự án</th>
              <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">CN</th>
              <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">SKU chính</th>
              <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">Qty gốc (m²)</th>
              <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">Xác suất</th>
              <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-1 font-semibold">Weighted</th>
              <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">Tháng giao</th>
              <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">PO status</th>
              <th className="px-3 py-2.5 text-center text-table-header uppercase text-text-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {deals.map((d, i) => {
              const weighted = Math.round(d.qty * d.probability / 100);
              return (
                <tr key={d.id} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors",
                  i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                  <td className="px-4 py-3 font-bold text-text-1">{d.customer}</td>
                  <td className="px-3 py-3 text-text-2">{d.project}</td>
                  <td className="px-3 py-3 text-center text-text-1">{d.cnList.join(", ")}</td>
                  <td className="px-3 py-3 text-center font-mono text-text-1">{d.skuMain}</td>
                  <td className="px-3 py-3 text-center tabular-nums font-medium text-text-1">{d.qty.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center tabular-nums font-medium text-text-1">{d.probability}%</td>
                  <td className="px-3 py-3 text-center tabular-nums font-bold text-primary">{weighted.toLocaleString()}</td>
                  <td className="px-3 py-3 text-center text-text-2">{d.deliveryMonths.join("-")}</td>
                  <td className="px-3 py-3 text-center">
                    {d.poStatus ? (
                      <span className="text-success font-medium">{d.poStatus} <span className="text-success">✅</span></span>
                    ) : (
                      <span className="text-text-3">Chưa</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setModalDeal({ deal: { customer: d.customer, project: d.project, cnList: d.cnList, skuMain: d.skuMain, qty: d.qty, probability: d.probability, deliveryMonths: d.deliveryMonths, poStatus: d.poStatus }, editId: d.id })}
                        className="text-primary hover:text-primary-dark transition-colors" title="Sửa">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setDeleteConfirm(d.id)}
                        className="text-danger hover:text-danger/80 transition-colors" title="Xóa">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
        const d = deals.find(x => x.id === deleteConfirm);
        return (
          <>
            <div className="fixed inset-0 bg-text-1/30 z-50" onClick={() => setDeleteConfirm(null)} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 p-6 space-y-4 animate-fade-in">
              <h3 className="font-display text-section-header text-text-1">Xác nhận xóa</h3>
              <p className="text-table text-text-2">Xóa deal <span className="font-bold text-text-1">{d?.customer} {d?.project}</span>?</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-button border border-surface-3 py-2 text-table text-text-2">Hủy</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 rounded-button bg-danger text-white py-2 text-table font-medium">Xóa</button>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}

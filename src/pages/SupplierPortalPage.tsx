import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";
import { Check, X, Upload, ChevronDown, ChevronUp, Truck } from "lucide-react";

/* ── Types ── */
interface OrderItem {
  id: string;
  type: "fc" | "po";
  label: string;
  item: string;
  variant: string;
  qty: number;
  tier?: string;
  deadline: string;
  status: "pending" | "confirmed" | "rejected";
}

interface StockRow {
  item: string;
  variant: string;
  qty: number;
  note: string;
}

interface ShipmentRow {
  po: string;
  item: string;
  qty: number;
  status: string;
  eta: string;
}

/* ── Demo data ── */
const initOrders: OrderItem[] = [
  { id: "1", type: "fc", label: "FC Th6", item: "GA-300", variant: "A4", qty: 2000, tier: "Hard ±5%", deadline: "11/05", status: "pending" },
  { id: "2", type: "fc", label: "FC Th7", item: "GA-300", variant: "A4", qty: 1800, tier: "Firm ±15%", deadline: "14/05", status: "pending" },
  { id: "3", type: "fc", label: "FC Th8", item: "GA-300", variant: "A4", qty: 2000, tier: "Soft ±30%", deadline: "18/05", status: "pending" },
  { id: "4", type: "po", label: "PO-0901", item: "GA-600", variant: "A4", qty: 1200, deadline: "13/05", status: "pending" },
  { id: "5", type: "po", label: "PO-0915", item: "GA-300", variant: "B2", qty: 450, deadline: "15/05", status: "pending" },
];

const initStock: StockRow[] = [
  { item: "GA-300", variant: "A4", qty: 2500, note: "" },
  { item: "GA-300", variant: "B2", qty: 1200, note: "Lô mới 15/05" },
  { item: "GA-600", variant: "A4", qty: 4200, note: "" },
];

const shipments: ShipmentRow[] = [
  { po: "PO-0847", item: "GA-300 A4", qty: 800, status: "Đã ship 10/05", eta: "ETA 12/05" },
  { po: "PO-0902", item: "GA-600 A4", qty: 643, status: "Đang sản xuất", eta: "ETA 20/05" },
];

const rejectReasons = ["Thiếu nguyên liệu", "Line bận", "Giá thay đổi", "Khác"];

export default function SupplierPortalPage() {
  const [orders, setOrders] = useState(initOrders);
  const [stock, setStock] = useState(initStock);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(rejectReasons[0]);
  const [rejectNote, setRejectNote] = useState("");

  const pending = orders.filter(o => o.status === "pending");

  const confirmOrder = (id: string) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: "confirmed" as const } : o));
    const o = orders.find(o => o.id === id);
    toast.success(`Đã xác nhận ${o?.label}`);
  };

  const submitReject = () => {
    if (!rejectId) return;
    setOrders(prev => prev.map(o => o.id === rejectId ? { ...o, status: "rejected" as const } : o));
    const o = orders.find(o => o.id === rejectId);
    toast(`Đã từ chối ${o?.label}: ${rejectReason}`);
    setRejectId(null);
    setRejectNote("");
  };

  const updateStock = (idx: number, val: number) => {
    setStock(prev => prev.map((s, i) => i === idx ? { ...s, qty: val } : s));
  };

  const saveStock = () => {
    toast.success(`Đã cập nhật ${stock.length} SKU.`);
  };

  return (
    <AppLayout>
      <div className="max-w-[640px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-screen-title text-text-1">Toko Ceramics</h1>
            <p className="text-table text-text-2">Cổng nhà cung cấp</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-button bg-warning-bg text-warning text-table-sm font-medium px-2.5 py-1">
            78%
          </span>
        </div>

        {/* SECTION 1: Xác nhận đơn hàng */}
        <section className="space-y-3">
          <h2 className="font-display text-section-header text-text-1">Xác nhận đơn hàng</h2>
          {pending.length === 0 && (
            <div className="rounded-card bg-success-bg text-success text-table p-4 text-center">✅ Không có đơn nào cần xác nhận</div>
          )}
          {pending.map(o => (
            <div key={o.id} className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-caption font-medium uppercase px-1.5 py-0.5 rounded-sm ${o.type === "fc" ? "bg-info-bg text-info" : "bg-surface-1 text-text-2"}`}>
                      {o.type === "fc" ? "FC" : "PO"}
                    </span>
                    <span className="text-table font-medium text-text-1">{o.label}</span>
                  </div>
                  <p className="text-table text-text-2 mt-1">{o.item} {o.variant}: {o.qty.toLocaleString()}m²
                    {o.tier && <span className="text-text-3 ml-1">({o.tier})</span>}
                  </p>
                </div>
                <span className="text-table-sm text-text-3">Hạn {o.deadline}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => confirmOrder(o.id)}
                  className="flex-1 h-12 rounded-button bg-gradient-primary text-primary-foreground font-medium text-table flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                >
                  <Check className="h-4 w-4" /> {o.type === "fc" ? "Confirm" : "Nhận PO"}
                </button>
                <button
                  onClick={() => setRejectId(o.id)}
                  className="flex-1 h-12 rounded-button border border-surface-3 bg-surface-2 text-text-2 font-medium text-table flex items-center justify-center gap-2 hover:bg-surface-1 transition-colors"
                >
                  <X className="h-4 w-4" /> Từ chối
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* Reject bottom sheet */}
        {rejectId && (
          <>
            <div className="fixed inset-0 bg-text-1/30 z-50" onClick={() => setRejectId(null)} />
            <div className="fixed inset-x-0 bottom-0 z-50 bg-surface-2 border-t border-surface-3 rounded-t-panel p-5 space-y-4 animate-slide-in-right" style={{ animation: "slide-up 0.3s ease-out" }}>
              <div className="w-12 h-1.5 rounded-full bg-surface-3 mx-auto" />
              <h3 className="font-display text-section-header text-text-1">Lý do từ chối</h3>
              <select
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full h-12 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1"
              >
                {rejectReasons.map(r => <option key={r}>{r}</option>)}
              </select>
              <textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="Ghi chú thêm..."
                className="w-full h-20 rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table text-text-1 resize-none"
              />
              <button
                onClick={submitReject}
                className="w-full h-12 rounded-button bg-danger text-primary-foreground font-medium text-table hover:opacity-90 transition-opacity"
              >
                Xác nhận từ chối
              </button>
            </div>
          </>
        )}

        {/* SECTION 2: Cập nhật tồn kho */}
        <section className="space-y-3">
          <h2 className="font-display text-section-header text-text-1">Cập nhật tồn kho</h2>
          <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
            <table className="w-full text-table">
              <thead>
                <tr className="bg-surface-1">
                  <th className="text-left px-4 py-2 text-table-header uppercase text-text-3">Item</th>
                  <th className="text-left px-4 py-2 text-table-header uppercase text-text-3">Variant</th>
                  <th className="text-right px-4 py-2 text-table-header uppercase text-text-3">Tồn kho</th>
                  <th className="text-left px-4 py-2 text-table-header uppercase text-text-3">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
                    <td className="px-4 py-2.5 font-medium text-text-1">{s.item}</td>
                    <td className="px-4 py-2.5 text-text-2">{s.variant}</td>
                    <td className="px-4 py-2.5 text-right">
                      <input
                        type="number"
                        value={s.qty}
                        onChange={e => updateStock(i, Number(e.target.value))}
                        className="w-24 h-10 rounded-button border border-surface-3 bg-surface-0 px-2 text-right text-table text-text-1 tabular-nums"
                      />
                    </td>
                    <td className="px-4 py-2.5 text-text-3 text-table-sm">{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-table-sm text-text-3">Cập nhật lần cuối: 12/05 16:00</p>
          <div className="flex gap-2">
            <button
              onClick={saveStock}
              className="flex-1 h-12 rounded-button bg-gradient-primary text-primary-foreground font-medium text-table hover:opacity-90 transition-opacity"
            >
              Lưu tồn kho
            </button>
            <button className="h-12 px-4 rounded-button border border-surface-3 bg-surface-2 text-text-2 text-table flex items-center gap-2 hover:bg-surface-1 transition-colors">
              <Upload className="h-4 w-4" /> Upload Excel
            </button>
          </div>
        </section>

        {/* SECTION 3: Đang giao */}
        <section className="space-y-3">
          <h2 className="font-display text-section-header text-text-1">Đang giao</h2>
          <div className="space-y-3">
            {shipments.map((s, i) => (
              <div key={i} className="rounded-card border border-surface-3 bg-surface-2 p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-button bg-info-bg flex items-center justify-center flex-shrink-0">
                  <Truck className="h-5 w-5 text-info" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-table font-medium text-text-1">{s.po}</span>
                    <span className="text-table-sm text-text-2">{s.item}</span>
                    <span className="text-table-sm text-text-3">{s.qty.toLocaleString()}m²</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-caption font-medium px-1.5 py-0.5 rounded-sm ${s.status.includes("ship") ? "bg-success-bg text-success" : "bg-warning-bg text-warning"}`}>
                      {s.status}
                    </span>
                    <span className="text-table-sm text-text-3">{s.eta}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

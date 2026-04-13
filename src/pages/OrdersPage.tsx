import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { useTenant } from "@/components/TenantContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, Send, CheckCircle, Truck, FileText, Upload, Clock } from "lucide-react";

const tenantScales: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.7, "Mondelez": 1.35 };

interface PoRow {
  type: "PO" | "TO"; poNum: string; nm: string; item: string; qty: number; status: string;
  vehicle?: string; fillPct?: number; shipHoldReason?: string;
}

interface StatusGroup {
  status: string; count: number; totalQty: number; totalVnd: string; action: string;
  pos: PoRow[];
}

interface NmTracking {
  nm: string; posActive: number; plan: number; delivered: number; gap: number; honoring: number; overdue: number;
}

const baseStatusGroups: StatusGroup[] = [
  {
    status: "Draft — chờ gửi", count: 4, totalQty: 3200, totalVnd: "1,2B", action: "Gửi ATP tất cả",
    pos: [
      { type: "PO", poNum: "PO-BD-W16", nm: "Mikado", item: "GA-300 A4", qty: 1200, status: "Draft" },
      { type: "PO", poNum: "PO-BD-W17", nm: "Toko", item: "GA-300 A4", qty: 800, status: "Draft" },
      { type: "PO", poNum: "PO-HN-W16", nm: "Vigracera", item: "GA-600 A4", qty: 700, status: "Draft" },
      { type: "TO", poNum: "TO-DN-BD", nm: "CN-ĐN", item: "GA-300 A4", qty: 500, status: "Draft" },
    ],
  },
  {
    status: "ATP Pass — chờ duyệt", count: 3, totalQty: 2400, totalVnd: "890M", action: "Gửi duyệt tất cả",
    pos: [
      { type: "PO", poNum: "PO-CT-W16", nm: "Đồng Tâm", item: "GA-600 B2", qty: 900, status: "ATP Pass" },
      { type: "PO", poNum: "PO-BD-W15", nm: "Mikado", item: "GA-600 A4", qty: 1000, status: "ATP Pass" },
      { type: "PO", poNum: "PO-DN-W16", nm: "Toko", item: "GA-300 A4", qty: 500, status: "ATP Pass" },
    ],
  },
  {
    status: "Approved — chờ post", count: 2, totalQty: 1500, totalVnd: "560M", action: "Post tất cả",
    pos: [
      { type: "PO", poNum: "PO-BD-W14", nm: "Mikado", item: "GA-300 A4", qty: 800, status: "Approved" },
      { type: "TO", poNum: "TO-HN-CT", nm: "CN-HN", item: "GA-400 A4", qty: 700, status: "Approved" },
    ],
  },
  {
    status: "Posted — chờ ship", count: 2, totalQty: 1200, totalVnd: "450M", action: "",
    pos: [
      { type: "PO", poNum: "PO-BD-W13", nm: "Toko", item: "GA-600 A4", qty: 600, status: "Posted" },
      { type: "PO", poNum: "PO-DN-W14", nm: "Đồng Tâm", item: "GA-300 A4", qty: 600, status: "Posted" },
    ],
  },
  {
    status: "Shipped — đang vận chuyển", count: 3, totalQty: 2100, totalVnd: "780M", action: "",
    pos: [
      { type: "PO", poNum: "PO-0901", nm: "Mikado", item: "GA-300 A4", qty: 800, status: "Shipped", vehicle: "Container 28T", fillPct: 72, shipHoldReason: "HSTK<3d → nên SHIP" },
      { type: "PO", poNum: "PO-0915", nm: "Toko", item: "GA-600 A4", qty: 700, status: "Shipped", vehicle: "Truck 10T", fillPct: 45, shipHoldReason: "HSTK 19d → có thể HOLD" },
      { type: "PO", poNum: "PO-0922", nm: "Đồng Tâm", item: "GA-600 B2", qty: 600, status: "Shipped", vehicle: "Truck 5T", fillPct: 90, shipHoldReason: "HSTK 5d → SHIP" },
    ],
  },
];

const baseNmTracking: NmTracking[] = [
  { nm: "Mikado", posActive: 5, plan: 4200, delivered: 3800, gap: 400, honoring: 91, overdue: 0 },
  { nm: "Toko", posActive: 4, plan: 3500, delivered: 2600, gap: 900, honoring: 74, overdue: 1 },
  { nm: "Đồng Tâm", posActive: 3, plan: 2100, delivered: 2100, gap: 0, honoring: 100, overdue: 0 },
  { nm: "Vigracera", posActive: 1, plan: 700, delivered: 0, gap: 700, honoring: 0, overdue: 0 },
  { nm: "Phú Mỹ", posActive: 0, plan: 0, delivered: 0, gap: 0, honoring: 0, overdue: 0 },
];

const tabs = [
  { key: "po", label: "Quản lý PO" },
  { key: "tracking", label: "Theo dõi & POD" },
];

export default function OrdersPage() {
  const { tenant } = useTenant();
  const s = tenantScales[tenant] || 1;
  const [activeTab, setActiveTab] = useState("po");
  const [drillStatus, setDrillStatus] = useState<string | null>(null);
  const [drillNm, setDrillNm] = useState<string | null>(null);

  const groups = baseStatusGroups.map((g) => ({
    ...g,
    totalQty: Math.round(g.totalQty * s),
    pos: g.pos.map((p) => ({ ...p, qty: Math.round(p.qty * s) })),
  }));

  const nmTracking = baseNmTracking.map((n) => ({
    ...n,
    plan: Math.round(n.plan * s), delivered: Math.round(n.delivered * s), gap: Math.round(n.gap * s),
  }));

  const totalPos = groups.reduce((a, g) => a + g.count, 0);
  const totalQty = groups.reduce((a, g) => a + g.totalQty, 0);
  const activeGroup = drillStatus ? groups.find((g) => g.status === drillStatus) : null;
  const activeNm = drillNm ? nmTracking.find((n) => n.nm === drillNm) : null;

  const handleAction = (action: string) => {
    toast.success(`${action}`, { description: "Đã thực hiện thành công." });
  };

  return (
    <AppLayout>
      <ScreenHeader title="Orders & Tracking" subtitle="Đơn hàng và theo dõi giao nhận" />

      {/* Tab pills */}
      <div className="flex items-center gap-1 mb-6 rounded-full border border-surface-3 bg-surface-0 p-0.5 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setDrillStatus(null); setDrillNm(null); }}
            className={cn(
              "rounded-full px-4 py-1.5 text-table-sm font-medium transition-colors whitespace-nowrap",
              activeTab === tab.key ? "bg-gradient-primary text-primary-foreground" : "text-text-2 hover:text-text-1"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "po" && (
        <div className="animate-fade-in">
          {!activeGroup ? (
            /* ─── Lớp 1: Per Status ─── */
            <div className="rounded-card border border-surface-3 bg-surface-2">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-3 bg-surface-1/50">
                      {["Status", "Số PO", "Tổng m²", "Tổng ₫", "Action", ""].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g) => (
                      <tr key={g.status} className="border-b border-surface-3/50 hover:bg-surface-1/30 cursor-pointer" onClick={() => setDrillStatus(g.status)}>
                        <td className="px-4 py-3 text-table font-medium text-text-1">{g.status}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-1">{g.count}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-2">{g.totalQty.toLocaleString()}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-2">{g.totalVnd}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {g.action && (
                            <button onClick={() => handleAction(g.action)} className="rounded-button bg-gradient-primary text-primary-foreground px-3 py-1 text-caption font-medium">
                              {g.action}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-3"><ChevronRight className="h-4 w-4" /></td>
                      </tr>
                    ))}
                    <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                      <td className="px-4 py-3 text-table text-text-1">TOTAL</td>
                      <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalPos}</td>
                      <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalQty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-table tabular-nums text-text-1">3,88B</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ─── Lớp 2: PO Table ─── */
            <div className="space-y-3">
              <button onClick={() => setDrillStatus(null)} className="text-table-sm text-primary hover:underline flex items-center gap-1">← Tổng</button>
              <p className="text-caption text-text-3">Tổng › <span className="text-text-1 font-medium">{activeGroup.status}</span> ({activeGroup.count} PO)</p>
              <div className="rounded-card border border-surface-3 bg-surface-2">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-3 bg-surface-1/50">
                        {["Type", "PO#", "NM", "Item", "Qty (m²)", "Status",
                          ...(activeGroup.status.includes("Shipped") ? ["Vehicle", "Fill%"] : []),
                          "Action"
                        ].map((h, i) => (
                          <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeGroup.pos.map((po) => (
                        <tr key={po.poNum} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                          <td className="px-4 py-3">
                            <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", po.type === "PO" ? "bg-primary/10 text-primary" : "bg-info-bg text-info")}>
                              {po.type} {po.type === "PO" ? "🟣" : "🔵"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-table font-medium text-text-1">{po.poNum}</td>
                          <td className="px-4 py-3 text-table text-text-2">{po.nm}</td>
                          <td className="px-4 py-3 text-table text-text-2">{po.item}</td>
                          <td className="px-4 py-3 text-table tabular-nums text-text-1">{po.qty.toLocaleString()}</td>
                          <td className="px-4 py-3 text-table text-text-2">{po.status}</td>
                          {activeGroup.status.includes("Shipped") && (
                            <>
                              <td className="px-4 py-3 text-table text-text-2">{po.vehicle || "—"}</td>
                              <td className="px-4 py-3 text-table tabular-nums text-text-2">{po.fillPct ? `${po.fillPct}%` : "—"}</td>
                            </>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex gap-1.5 items-center">
                              {po.status === "Draft" && (
                                <button onClick={() => handleAction(`Gửi ATP ${po.poNum}`)} className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium flex items-center gap-1">
                                  <Send className="h-3 w-3" /> Gửi ATP
                                </button>
                              )}
                              {po.status === "ATP Pass" && (
                                <button onClick={() => handleAction(`Gửi duyệt ${po.poNum}`)} className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium">Gửi duyệt</button>
                              )}
                              {po.status === "Approved" && (
                                <button onClick={() => handleAction(`Post ${po.poNum}`)} className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium">Post Bravo</button>
                              )}
                              {po.status === "Shipped" && (
                                <>
                                  <button onClick={() => handleAction(`SHIP ${po.poNum}`)} className="rounded-button bg-success/10 text-success px-2.5 py-1 text-caption font-medium">SHIP</button>
                                  <button onClick={() => handleAction(`HOLD ${po.poNum}`)} className="rounded-button bg-warning-bg text-warning px-2.5 py-1 text-caption font-medium">HOLD</button>
                                  {po.shipHoldReason && <span className="text-caption text-text-3 ml-1">{po.shipHoldReason}</span>}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "tracking" && (
        <div className="animate-fade-in">
          {!activeNm ? (
            /* ─── Lớp 1: Per NM ─── */
            <div className="rounded-card border border-surface-3 bg-surface-2">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-3 bg-surface-1/50">
                      {["NM", "POs active", "Plan (m²)", "Delivered", "Gap", "Honoring%", "Overdue", ""].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {nmTracking.map((n) => (
                      <tr key={n.nm} className="border-b border-surface-3/50 hover:bg-surface-1/30 cursor-pointer" onClick={() => n.posActive > 0 && setDrillNm(n.nm)}>
                        <td className="px-4 py-3 text-table font-medium text-text-1">{n.nm}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-1">{n.posActive}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-2">{n.plan.toLocaleString()}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-2">{n.delivered.toLocaleString()}</td>
                        <td className="px-4 py-3 text-table tabular-nums">
                          {n.gap > 0 ? <span className="text-danger font-medium">{n.gap.toLocaleString()}</span> : <span className="text-text-3">0</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("text-table font-medium", n.honoring >= 90 ? "text-success" : n.honoring >= 70 ? "text-warning" : "text-danger")}>{n.honoring}%</span>
                        </td>
                        <td className="px-4 py-3 text-table">
                          {n.overdue > 0 ? <span className="text-danger font-medium">{n.overdue}</span> : <span className="text-text-3">0</span>}
                        </td>
                        <td className="px-4 py-3 text-text-3">{n.posActive > 0 && <ChevronRight className="h-4 w-4" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setDrillNm(null)} className="text-table-sm text-primary hover:underline flex items-center gap-1">← Per NM</button>
              <p className="text-caption text-text-3">Per NM › <span className="text-text-1 font-medium">{activeNm.nm}</span> ({activeNm.posActive} POs, honoring {activeNm.honoring}%)</p>
              <div className="rounded-card border border-surface-3 bg-surface-2 p-6 text-center text-text-3">
                <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Chi tiết PO timeline & POD upload cho {activeNm.nm}</p>
                <button className="mt-3 rounded-button bg-gradient-primary text-primary-foreground px-4 py-2 text-table-sm font-medium flex items-center gap-2 mx-auto">
                  <Upload className="h-4 w-4" /> Upload POD
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

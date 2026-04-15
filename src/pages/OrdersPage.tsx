import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { useTenant } from "@/components/TenantContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronRight, Send, Upload, ShieldAlert, Loader2, PackageOpen } from "lucide-react";
import { getPoTypeBadge, poNumClasses } from "@/lib/po-numbers";
import { useNavigate } from "react-router-dom";
import { ClickableNumber } from "@/components/ClickableNumber";
import { LogicLink } from "@/components/LogicLink";
import { LogicTooltip, LogicExpand } from "@/components/LogicTooltip";
import { BatchLockBanner, useBatchLock } from "@/components/BatchLockBanner";
import { useVersionConflict, VersionConflictDialog } from "@/components/VersionConflict";
import { usePurchaseOrders, type PurchaseOrderRow } from "@/hooks/usePurchaseOrders";

type POType = "RPO" | "TO";

interface PoRow {
  type: POType;
  poNum: string;
  blanket: string;
  nm: string;
  item: string;
  qty: number;
  status: string;
  vehicle?: string;
  fillPct?: number;
  shipHoldReason?: string;
}

interface StatusGroup {
  status: string;
  count: number;
  totalQty: number;
  totalVnd: string;
  action: string;
  pos: PoRow[];
}

interface NmTracking {
  nm: string;
  bpo: string;
  bpoTotal: number;
  released: number;
  delivered: number;
  completionPct: number;
  rpos: RpoTracking[];
}

interface RpoTracking {
  rpo: string;
  item: string;
  qty: number;
  asn: string;
  shipDate: string;
  eta: string;
  actual: number;
  status: string;
}

const statusConfig: Record<string, { label: string; action: string }> = {
  draft: { label: "Draft — chờ gửi", action: "Gửi ATP tất cả" },
  submitted: { label: "Submitted — chờ xác nhận", action: "Xác nhận tất cả" },
  confirmed: { label: "Confirmed — đã xác nhận", action: "Post tất cả" },
  shipped: { label: "Shipped — đang vận chuyển", action: "" },
  received: { label: "Received — đã nhận", action: "" },
  cancelled: { label: "Cancelled — đã hủy", action: "" },
};

const supplierToNm: Record<string, string> = {
  "Mikado": "Mikado",
  "Toko": "Toko",
  "Đồng Tâm": "Đồng Tâm",
  "Vigracera": "Vigracera",
};

function dbRowToPoRow(r: PurchaseOrderRow): PoRow {
  return {
    type: r.po_number.startsWith("TO-") ? "TO" : "RPO",
    poNum: r.po_number,
    blanket: r.po_number.startsWith("TO-") ? "—" : `BPO-${r.supplier.substring(0, 3).toUpperCase()}`,
    nm: supplierToNm[r.supplier] || r.supplier,
    item: r.sku,
    qty: Number(r.quantity),
    status: r.status,
  };
}

function formatVndTotal(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return v.toLocaleString();
}

const tabs = [
  { key: "po", label: "Quản lý PO" },
  { key: "tracking", label: "Theo dõi & POD" },
];

export default function OrdersPage() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const { groups: dbGroups, allOrders, loading: poLoading } = usePurchaseOrders();

  const ordersBatch = useBatchLock(null);
  const { conflict: ordersConflict, clearConflict } = useVersionConflict();
  const [activeTab, setActiveTab] = useState("po");
  const [drillStatus, setDrillStatus] = useState<string | null>(null);
  const [drillNm, setDrillNm] = useState<string | null>(null);
  const [forceReleasePoNum, setForceReleasePoNum] = useState<string | null>(null);
  const [forceReleaseReason, setForceReleaseReason] = useState("");

  const groups: StatusGroup[] = useMemo(() => {
    return dbGroups.map((g) => {
      const cfg = statusConfig[g.status] || { label: g.status, action: "" };
      return {
        status: cfg.label,
        count: g.count,
        totalQty: g.totalQty,
        totalVnd: g.totalVnd,
        action: cfg.action,
        pos: g.orders.map(dbRowToPoRow),
      };
    });
  }, [dbGroups]);

  const nmTracking: NmTracking[] = useMemo(() => {
    const bySupplier: Record<string, PurchaseOrderRow[]> = {};
    allOrders.forEach((o) => {
      const nm = supplierToNm[o.supplier] || o.supplier;
      if (!bySupplier[nm]) bySupplier[nm] = [];
      bySupplier[nm].push(o);
    });

    return Object.entries(bySupplier).map(([nm, orders]) => {
      const bpoTotal = orders.reduce((s, o) => s + Number(o.quantity), 0);
      const delivered = orders.filter((o) => o.status === "received").reduce((s, o) => s + Number(o.quantity), 0);
      const shipped = orders.filter((o) => o.status === "shipped").reduce((s, o) => s + Number(o.quantity), 0);
      const released = delivered + shipped + orders.filter((o) => o.status === "confirmed").reduce((s, o) => s + Number(o.quantity), 0);
      const completionPct = bpoTotal > 0 ? Math.round((delivered / bpoTotal) * 100) : 0;

      const rpos: RpoTracking[] = orders.map((o) => ({
        rpo: o.po_number,
        item: o.sku,
        qty: Number(o.quantity),
        asn: o.status === "shipped" || o.status === "received" ? `ASN-${o.po_number.slice(-3)}` : "—",
        shipDate: o.status === "shipped" || o.status === "received"
          ? (o.expected_date ? new Date(o.expected_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "—")
          : "—",
        eta: o.expected_date ? new Date(o.expected_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "—",
        actual: o.status === "received" ? Number(o.quantity) : 0,
        status: o.status.toUpperCase(),
      }));

      return { nm, bpo: `BPO-${nm.substring(0, 3).toUpperCase()}`, bpoTotal, released, delivered, completionPct, rpos };
    });
  }, [allOrders]);

  const totalPos = groups.reduce((a, g) => a + g.count, 0);
  const totalQty = groups.reduce((a, g) => a + g.totalQty, 0);
  const totalVnd = useMemo(() => {
    const total = allOrders.reduce((s, o) => s + Number(o.quantity) * Number(o.unit_price), 0);
    return formatVndTotal(total);
  }, [allOrders]);

  const activeGroup = drillStatus ? groups.find((g) => g.status === drillStatus) : null;
  const activeNmData = drillNm ? nmTracking.find((n) => n.nm === drillNm) : null;

  const handleAction = (action: string) => {
    toast.success(action, { description: "Đã thực hiện thành công." });
  };

  const isEmpty = !poLoading && allOrders.length === 0;

  return (
    <AppLayout>
      {ordersBatch.batch && (
        <div className="mb-4">
          <BatchLockBanner
            batch={ordersBatch.batch}
            dismissed={ordersBatch.dismissed}
            onDismiss={ordersBatch.dismiss}
            showQueue={ordersBatch.showQueue}
            onToggleQueue={() => ordersBatch.setShowQueue(!ordersBatch.showQueue)}
            onProcessQueue={(id) => toast.success(`Xử lý queue ${id}`)}
            onCancelQueue={(id) => toast.info(`Hủy queue ${id}`)}
          />
        </div>
      )}

      {ordersConflict && (
        <VersionConflictDialog
          conflict={ordersConflict}
          onReload={clearConflict}
          onForceUpdate={() => { clearConflict(); toast.success("Đã ghi đè. Audit logged."); }}
          onClose={clearConflict}
        />
      )}

      <div className="flex items-center gap-2 mb-1">
        <ScreenHeader title="Orders & Tracking" subtitle="Đơn hàng và theo dõi giao nhận" />
        <LogicLink tab="daily" node={4} tooltip="Logic PO Release: BPO → RPO → ASN" />
      </div>

      <div className="flex items-center gap-1 mb-6 rounded-full border border-surface-3 bg-surface-0 p-0.5 w-fit" data-tour="orders-tabs">
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

      {poLoading && (
        <div className="flex items-center gap-2 text-text-3 text-table-sm mb-4">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải dữ liệu PO...
        </div>
      )}

      {isEmpty && (
        <div className="rounded-card border border-surface-3 bg-surface-2 py-16 flex flex-col items-center gap-4 animate-fade-in">
          <div className="rounded-full bg-surface-1 p-4">
            <PackageOpen className="h-10 w-10 text-text-3" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-body font-semibold text-text-1">Chưa có đơn hàng nào</p>
            <p className="text-table text-text-3 max-w-md">
              Tạo PO mới từ DRP hoặc Hub để bắt đầu theo dõi đơn hàng. Dữ liệu sẽ hiển thị theo trạng thái và NM.
            </p>
          </div>
          <button
            onClick={() => navigate("/hub")}
            className="rounded-button bg-gradient-primary text-primary-foreground px-5 py-2.5 text-table-sm font-medium mt-2"
          >
            Đi tới Hub & Commitment
          </button>
        </div>
      )}

      {activeTab === "po" && !isEmpty && (
        <div className="animate-fade-in">
          {!activeGroup ? (
            <div className="rounded-card border border-surface-3 bg-surface-2" data-tour="orders-status-table">
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
                        <td className="px-4 py-3 text-table font-medium text-text-1">
                          <ClickableNumber
                            value={g.status}
                            label={g.status.split("—")[0].trim()}
                            color="font-medium text-text-1"
                            breakdown={g.pos.map(p => ({
                              label: p.poNum,
                              value: `${p.qty.toLocaleString()}m² ${p.item}`,
                            }))}
                          />
                        </td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-1">
                          <ClickableNumber
                            value={`${g.count} PO, ${g.totalQty.toLocaleString()}m²`}
                            label={g.status.split("—")[0].trim()}
                            color="text-text-1"
                            breakdown={g.pos.map(p => ({
                              label: p.poNum,
                              value: `${p.qty.toLocaleString()}m²`,
                              detail: p.item,
                            }))}
                          />
                        </td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-2">{g.totalVnd}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {g.action && (
                            <button onClick={() => handleAction(g.action)} className="rounded-button bg-gradient-primary text-primary-foreground px-3 py-1 text-caption font-medium">{g.action}</button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-text-3"><ChevronRight className="h-4 w-4" /></td>
                      </tr>
                    ))}
                    <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                      <td className="px-4 py-3 text-table text-text-1">TOTAL</td>
                      <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalPos}</td>
                      <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalQty.toLocaleString()}</td>
                      <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalVnd}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setDrillStatus(null)} className="text-table-sm text-primary hover:underline flex items-center gap-1">← Tổng</button>
              <p className="text-caption text-text-3">Tổng › <span className="text-text-1 font-medium">{activeGroup.status}</span> ({activeGroup.count} PO)</p>
              <div className="rounded-card border border-surface-3 bg-surface-2">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-3 bg-surface-1/50">
                        {["Type", "PO#", "Blanket#", "NM", "Item", "Qty (m²)", "Status",
                          ...(activeGroup.status.includes("Shipped") ? ["Vehicle", "Fill%"] : []),
                          "Action"
                        ].map((h, i) => (
                          <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeGroup.pos.map((po) => {
                        const typeBadge = getPoTypeBadge(po.type);
                        const bpoBadge = getPoTypeBadge("BPO");
                        return (
                          <tr key={po.poNum} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                            <td className="px-4 py-3">
                              <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", typeBadge.bg, typeBadge.text)}>
                                {po.type}
                              </span>
                            </td>
                            <td className={cn("px-4 py-3", poNumClasses, typeBadge.text)}>{po.poNum}</td>
                            <td className="px-4 py-3">
                              {po.blanket !== "—" ? (
                                <button onClick={() => navigate("/hub")}
                                  className={cn("rounded-sm px-1.5 py-0.5 hover:opacity-80", poNumClasses, bpoBadge.bg, bpoBadge.text)}>
                                  {po.blanket}
                                </button>
                              ) : <span className="text-text-3">—</span>}
                            </td>
                            <td className="px-4 py-3 text-table text-text-2">{po.nm}</td>
                            <td className="px-4 py-3 text-table text-text-2">{po.item}</td>
                            <td className="px-4 py-3 text-table tabular-nums text-text-1">{po.qty.toLocaleString()}</td>
                            <td className="px-4 py-3 text-table text-text-2 capitalize">{po.status}</td>
                            {activeGroup.status.includes("Shipped") && (
                              <>
                                <td className="px-4 py-3 text-table text-text-2">{po.vehicle || "—"}</td>
                                <td className="px-4 py-3 text-table tabular-nums text-text-2">{po.fillPct ? `${po.fillPct}%` : "—"}</td>
                              </>
                            )}
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5 items-center">
                                {po.status === "draft" && (
                                  <button onClick={() => handleAction(`Gửi ATP ${po.poNum}`)} className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium flex items-center gap-1">
                                    <Send className="h-3 w-3" /> Gửi ATP
                                  </button>
                                )}
                                {po.status === "submitted" && <button onClick={() => handleAction(`Xác nhận ${po.poNum}`)} className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium">Xác nhận</button>}
                                {po.status === "confirmed" && <button onClick={() => handleAction(`Post ${po.poNum}`)} className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium">Post Bravo</button>}
                                {po.status === "shipped" && (
                                  <>
                                    <button onClick={() => handleAction(`SHIP ${po.poNum}`)} className="rounded-button bg-success/10 text-success px-2.5 py-1 text-caption font-medium">SHIP</button>
                                    <button onClick={() => handleAction(`HOLD ${po.poNum}`)} className="rounded-button bg-warning-bg text-warning px-2.5 py-1 text-caption font-medium">HOLD</button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "tracking" && !isEmpty && (
        <div className="animate-fade-in">
          {!activeNmData ? (
            <div className="rounded-card border border-surface-3 bg-surface-2">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-3 bg-surface-1/50">
                      {["NM", "BPO#", "BPO total", "Released", "Delivered", "BPO completion%",
                        { h: "On-time%", tooltip: true }, ""
                      ].map((col, i) => {
                        const h = typeof col === "string" ? col : col.h;
                        const hasTooltip = typeof col !== "string" && col.tooltip;
                        return (
                          <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">
                            <span className="inline-flex items-center gap-1">
                              {h}
                              {hasTooltip && <LogicTooltip title="On-time% SLA" content={`On-time = delivered ≤ ETA + grace period.\nGrace period: 2 ngày (config).\nETA 17/05 + grace 2d = deadline 19/05.\nDelivered 18/05 → ✅ On-time.\nDelivered 22/05 → 🔴 Late 3 ngày.\nOn-time% = (# PO on-time) / (# PO total) × 100\nConfig: /config → PO → on_time_grace_days = 2.`} />}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {nmTracking.map((n) => {
                      const bpoBadge = getPoTypeBadge("BPO");
                      return (
                        <tr key={n.nm} className="border-b border-surface-3/50 hover:bg-surface-1/30 cursor-pointer" onClick={() => setDrillNm(n.nm)}>
                          <td className="px-4 py-3 text-table font-medium text-text-1">{n.nm}</td>
                          <td className="px-4 py-3">
                            <span className={cn("rounded-sm px-1.5 py-0.5", poNumClasses, bpoBadge.bg, bpoBadge.text)}>{n.bpo}</span>
                          </td>
                          <td className="px-4 py-3 text-table tabular-nums text-text-2">{n.bpoTotal.toLocaleString()}</td>
                          <td className="px-4 py-3 text-table tabular-nums text-text-2">{n.released.toLocaleString()}</td>
                          <td className="px-4 py-3 text-table tabular-nums text-text-2">{n.delivered.toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-surface-1 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${n.completionPct}%` }} />
                              </div>
                              <ClickableNumber
                                value={`${n.completionPct}%`}
                                label={`Honoring ${n.nm}`}
                                color="text-table tabular-nums font-medium text-text-1"
                                formula={`Delivered ${n.delivered.toLocaleString()} ÷ BPO Total ${n.bpoTotal.toLocaleString()} = ${n.completionPct}%`}
                                breakdown={n.rpos.map(r => ({
                                  label: r.rpo,
                                  value: `plan ${r.qty.toLocaleString()}, actual ${r.actual.toLocaleString()}`,
                                  detail: r.actual < r.qty ? `gap ${(r.qty - r.actual).toLocaleString()}` : "✅",
                                }))}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-text-3"><ChevronRight className="h-4 w-4" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setDrillNm(null)} className="text-table-sm text-primary hover:underline flex items-center gap-1">← Per NM</button>
              <p className="text-caption text-text-3">Per NM › <span className="text-text-1 font-medium">{activeNmData.nm}</span>
                <span className={cn("ml-2 rounded-sm px-1.5 py-0.5", poNumClasses, getPoTypeBadge("BPO").bg, getPoTypeBadge("BPO").text)}>{activeNmData.bpo}</span>
              </p>

              <div className="rounded-card border border-surface-3 bg-surface-2">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-3 bg-surface-1/50">
                        {["RPO#", "Item", "Qty", "ASN#", "Ship date", "ETA", "Actual", "Status"].map((h, i) => (
                          <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeNmData.rpos.map((r, i) => {
                        const rpoBadge = getPoTypeBadge("RPO");
                        const asnBadge = getPoTypeBadge("ASN");
                        const statusColor = r.status === "RECEIVED" ? "bg-success-bg text-success" :
                          r.status === "SHIPPED" ? "bg-info-bg text-info" : "bg-warning-bg text-warning";
                        return (
                          <tr key={i} className={cn("border-b border-surface-3/50", i % 2 === 0 ? "bg-surface-2" : "bg-surface-0")}>
                            <td className={cn("px-4 py-3", poNumClasses, rpoBadge.text)}>{r.rpo}</td>
                            <td className="px-4 py-3 text-table text-text-1">{r.item}</td>
                            <td className="px-4 py-3 text-table tabular-nums text-text-1">{r.qty.toLocaleString()}</td>
                            <td className="px-4 py-3">
                              {r.asn !== "—" ? (
                                <span className={cn("rounded-sm px-1.5 py-0.5", poNumClasses, asnBadge.bg, asnBadge.text)}>{r.asn}</span>
                              ) : <span className="text-text-3">—</span>}
                            </td>
                            <td className={cn("px-4 py-3 text-text-2", poNumClasses)}>{r.shipDate}</td>
                            <td className={cn("px-4 py-3 text-text-2", poNumClasses)}>{r.eta}</td>
                            <td className="px-4 py-3 text-table tabular-nums font-medium text-text-1">{r.actual > 0 ? r.actual.toLocaleString() : "—"}</td>
                            <td className="px-4 py-3">
                              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium", statusColor)}>● {r.status}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <button className="mt-3 rounded-button bg-gradient-primary text-primary-foreground px-4 py-2 text-table-sm font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" /> Upload POD
              </button>
            </div>
          )}
        </div>
      )}

      {forceReleasePoNum && (
        <>
          <div className="fixed inset-0 bg-text-1/30 z-50" onClick={() => setForceReleasePoNum(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-surface-2 border border-surface-3 rounded-card shadow-xl w-[480px] p-6 space-y-4">
              <h3 className="font-display text-section-header text-text-1">Force-release bypass ATP</h3>
              <div className="rounded-card border border-warning/30 bg-warning-bg/30 p-4 space-y-2 text-table-sm text-text-2">
                <p className="font-medium text-warning">⚠ Force-release bypass ATP check. Cần duyệt 3 cấp:</p>
                <div className="space-y-1.5 pl-2">
                  <p>Cấp 1: SC Manager (Thúy) → <span className="text-warning">⏳ Chờ duyệt</span></p>
                  <p>Cấp 2: Director Operations → <span className="text-text-3">Chưa tới</span></p>
                  <p>Cấp 3: CEO (Kurt) → <span className="text-text-3">Chưa tới</span></p>
                </div>
                <p className="text-text-3 mt-2">Risk: NM có thể không đủ hàng → PO_OVERDUE.</p>
              </div>
              <div>
                <label className="text-caption text-text-3 uppercase">Lý do bắt buộc</label>
                <textarea value={forceReleaseReason} onChange={e => setForceReleaseReason(e.target.value)}
                  className="w-full h-20 mt-1 rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table text-text-1 resize-none" placeholder="Nhập lý do force-release..." />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setForceReleasePoNum(null); setForceReleaseReason(""); }} className="flex-1 h-10 rounded-button border border-surface-3 bg-surface-2 text-text-2 text-table font-medium hover:bg-surface-1">Hủy</button>
                <button onClick={() => { toast.success(`Force-release ${forceReleasePoNum} gửi duyệt 3 cấp`); setForceReleasePoNum(null); setForceReleaseReason(""); }}
                  className="flex-1 h-10 rounded-button bg-danger text-primary-foreground text-table font-medium hover:opacity-90">Gửi Force-release</button>
              </div>
            </div>
          </div>
        </>
      )}
      <ScreenFooter actionCount={10} />
    </AppLayout>
  );
}

import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { useTenant } from "@/components/TenantContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronRight, Send, Truck, Upload, ShieldAlert } from "lucide-react";
import { getPoTypeBadge, poNumClasses } from "@/lib/po-numbers";
import { useNavigate } from "react-router-dom";
import { ClickableNumber } from "@/components/ClickableNumber";
import { LogicLink } from "@/components/LogicLink";
import { LogicTooltip, LogicExpand } from "@/components/LogicTooltip";

const tenantScales: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.7, "Mondelez": 1.35 };

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

const baseStatusGroups: StatusGroup[] = [
  {
    status: "Draft — chờ gửi", count: 4, totalQty: 3200, totalVnd: "1,2B", action: "Gửi ATP tất cả",
    pos: [
      { type: "RPO", poNum: "RPO-MKD-2605-W17-001", blanket: "BPO-MKD-2605", nm: "Mikado", item: "GA-300 A4", qty: 1200, status: "Draft" },
      { type: "RPO", poNum: "RPO-TKO-2605-W17-001", blanket: "BPO-TKO-2605", nm: "Toko", item: "GA-300 A4", qty: 800, status: "Draft" },
      { type: "RPO", poNum: "RPO-VGR-2605-W16-001", blanket: "BPO-VGR-2605", nm: "Vigracera", item: "GA-600 A4", qty: 700, status: "Draft" },
      { type: "TO", poNum: "TO-DN-BD-2605-001", blanket: "—", nm: "CN-ĐN→BD", item: "GA-300 A4", qty: 500, status: "Draft" },
    ],
  },
  {
    status: "ATP Pass — chờ duyệt", count: 3, totalQty: 2400, totalVnd: "890M", action: "Gửi duyệt tất cả",
    pos: [
      { type: "RPO", poNum: "RPO-DTM-2605-W16-001", blanket: "BPO-DTM-2605", nm: "Đồng Tâm", item: "GA-600 B2", qty: 900, status: "ATP Pass" },
      { type: "RPO", poNum: "RPO-MKD-2605-W16-002", blanket: "BPO-MKD-2605", nm: "Mikado", item: "GA-600 A4", qty: 1000, status: "ATP Pass" },
      { type: "RPO", poNum: "RPO-TKO-2605-W16-002", blanket: "BPO-TKO-2605", nm: "Toko", item: "GA-300 A4", qty: 500, status: "ATP Pass" },
    ],
  },
  {
    status: "Approved — chờ post", count: 2, totalQty: 1500, totalVnd: "560M", action: "Post tất cả",
    pos: [
      { type: "RPO", poNum: "RPO-MKD-2605-W15-001", blanket: "BPO-MKD-2605", nm: "Mikado", item: "GA-300 A4", qty: 800, status: "Approved" },
      { type: "TO", poNum: "TO-HN-CT-2605-001", blanket: "—", nm: "CN-HN→CT", item: "GA-400 A4", qty: 700, status: "Approved" },
    ],
  },
  {
    status: "Posted — chờ ship", count: 2, totalQty: 1200, totalVnd: "450M", action: "",
    pos: [
      { type: "RPO", poNum: "RPO-TKO-2605-W15-001", blanket: "BPO-TKO-2605", nm: "Toko", item: "GA-600 A4", qty: 600, status: "Posted" },
      { type: "RPO", poNum: "RPO-DTM-2605-W15-001", blanket: "BPO-DTM-2605", nm: "Đồng Tâm", item: "GA-300 A4", qty: 600, status: "Posted" },
    ],
  },
  {
    status: "Shipped — đang vận chuyển", count: 3, totalQty: 2100, totalVnd: "780M", action: "",
    pos: [
      { type: "RPO", poNum: "RPO-MKD-2605-W16-001", blanket: "BPO-MKD-2605", nm: "Mikado", item: "GA-300 A4", qty: 800, status: "Shipped", vehicle: "Container 28T", fillPct: 72, shipHoldReason: "HSTK<3d → nên SHIP" },
      { type: "RPO", poNum: "RPO-TKO-2605-W16-001", blanket: "BPO-TKO-2605", nm: "Toko", item: "GA-600 A4", qty: 700, status: "Shipped", vehicle: "Truck 10T", fillPct: 45, shipHoldReason: "HSTK 19d → có thể HOLD" },
      { type: "RPO", poNum: "RPO-DTM-2605-W16-002", blanket: "BPO-DTM-2605", nm: "Đồng Tâm", item: "GA-600 B2", qty: 600, status: "Shipped", vehicle: "Truck 5T", fillPct: 90, shipHoldReason: "HSTK 5d → SHIP" },
    ],
  },
];

const baseNmTracking: NmTracking[] = [
  {
    nm: "Mikado", bpo: "BPO-MKD-2605", bpoTotal: 5500, released: 2500, delivered: 1050, completionPct: 19,
    rpos: [
      { rpo: "RPO-MKD-2605-W16-001", item: "GA-300 A4", qty: 1200, asn: "ASN-MKD-2605-001", shipDate: "10/05", eta: "17/05", actual: 800, status: "SHIPPED" },
      { rpo: "RPO-MKD-2605-W16-002", item: "GA-600 A4", qty: 800, asn: "—", shipDate: "—", eta: "20/05", actual: 0, status: "IN_PRODUCTION" },
    ],
  },
  {
    nm: "Toko", bpo: "BPO-TKO-2605", bpoTotal: 6000, released: 1200, delivered: 500, completionPct: 8,
    rpos: [
      { rpo: "RPO-TKO-2605-W16-001", item: "GA-300 A4", qty: 557, asn: "ASN-TKO-2605-001", shipDate: "12/05", eta: "19/05", actual: 500, status: "SHIPPED" },
    ],
  },
  {
    nm: "Đồng Tâm", bpo: "BPO-DTM-2605", bpoTotal: 2500, released: 900, delivered: 900, completionPct: 36,
    rpos: [
      { rpo: "RPO-DTM-2605-W16-001", item: "GA-400 A4", qty: 900, asn: "ASN-DTM-2605-001", shipDate: "09/05", eta: "16/05", actual: 900, status: "RECEIVED" },
    ],
  },
  {
    nm: "Vigracera", bpo: "BPO-VGR-2605", bpoTotal: 1500, released: 500, delivered: 500, completionPct: 33,
    rpos: [
      { rpo: "RPO-VGR-2605-W16-001", item: "GA-600 A4", qty: 500, asn: "ASN-VGR-2605-001", shipDate: "10/05", eta: "17/05", actual: 500, status: "RECEIVED" },
    ],
  },
];

const tabs = [
  { key: "po", label: "Quản lý PO" },
  { key: "tracking", label: "Theo dõi & POD" },
];

export default function OrdersPage() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const s = tenantScales[tenant] || 1;
  const [activeTab, setActiveTab] = useState("po");
  const [drillStatus, setDrillStatus] = useState<string | null>(null);
  const [drillNm, setDrillNm] = useState<string | null>(null);
  const [forceReleasePoNum, setForceReleasePoNum] = useState<string | null>(null);
  const [forceReleaseReason, setForceReleaseReason] = useState("");

  const groups = baseStatusGroups.map((g) => ({
    ...g,
    totalQty: Math.round(g.totalQty * s),
    pos: g.pos.map((p) => ({ ...p, qty: Math.round(p.qty * s) })),
  }));

  const nmTracking = baseNmTracking.map((n) => ({
    ...n,
    bpoTotal: Math.round(n.bpoTotal * s),
    released: Math.round(n.released * s),
    delivered: Math.round(n.delivered * s),
    rpos: n.rpos.map(r => ({ ...r, qty: Math.round(r.qty * s), actual: Math.round(r.actual * s) })),
  }));

  const totalPos = groups.reduce((a, g) => a + g.count, 0);
  const totalQty = groups.reduce((a, g) => a + g.totalQty, 0);
  const activeGroup = drillStatus ? groups.find((g) => g.status === drillStatus) : null;
  const activeNmData = drillNm ? nmTracking.find((n) => n.nm === drillNm) : null;

  const handleAction = (action: string) => {
    toast.success(action, { description: "Đã thực hiện thành công." });
  };

  return (
    <AppLayout>
      <div className="flex items-center gap-2 mb-1">
        <ScreenHeader title="Orders & Tracking" subtitle="Đơn hàng và theo dõi giao nhận" />
        <LogicLink tab="daily" node={4} tooltip="Logic PO Release: BPO → RPO → ASN" />
      </div>

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
                        <td className="px-4 py-3 text-table font-medium text-text-1">
                          <ClickableNumber
                            value={g.status}
                            label={g.status.split("—")[0].trim()}
                            color="font-medium text-text-1"
                            breakdown={g.pos.map(p => ({
                              label: p.poNum,
                              value: `${p.qty.toLocaleString()}m² ${p.item}`,
                            }))}
                            note={g.status.includes("ATP_FAIL") ? "NM chưa cập nhật tồn kho." : undefined}
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
                      <td className="px-4 py-3 text-table tabular-nums text-text-1">3,88B</td>
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
                        {["Type", "PO#", "Blanket#", "NM", "Item", "Qty (m²)", "Status", "ATP", "BPO check",
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
                            <td className="px-4 py-3 text-table text-text-2">{po.status}</td>
                            {/* ATP check */}
                            <td className="px-4 py-3">
                              {po.nm === "Toko" ? (
                                <LogicExpand label="ATP Fail 🔴" content={`ATP Check cho ${po.poNum} (${po.item}, ${po.qty.toLocaleString()}m²):\nNM: ${po.nm}\nNM on-hand: ??? (data stale 18h!)\n× share% UNIS: 32%\n= NM ATP raw: không tính được (stale)\n→ 🔴 FAIL: data stale > 24h threshold\nOptions:\n[Nhắc NM cập nhật] → NM update → re-check ATP\n[Force-release 3 cấp] → bypass ATP check`} title="ATP Check" />
                              ) : (
                                <LogicExpand label="ATP Pass ✅" content={`ATP Check cho ${po.poNum} (${po.item}, ${po.qty.toLocaleString()}m²):\nNM: ${po.nm}\nNM on-hand: 2.500\n× share% UNIS: 60%\n= NM ATP raw: 1.500\n× honoring factor: 92% (${po.nm} reliable)\n= Effective ATP: 1.380\nRPO qty: ${po.qty.toLocaleString()} ≤ 1.380 → ✅ PASS\nFormula: effective_ATP = on_hand × share% × honoring_rate\nData fresh: 32 phút ago.`} title="ATP Check" />
                              )}
                            </td>
                            {/* BPO quota check */}
                            <td className="px-4 py-3">
                              {po.blanket !== "—" ? (
                                po.nm === "Vigracera" ? (
                                  <LogicExpand label="⚠ OVER 200" content={`RPO ${po.qty.toLocaleString()} > BPO remaining 500. Over-commitment 200m².\nOptions:\n[Giảm RPO → 500] — fit BPO quota\n[Tăng BPO → +200] — cần NM confirm → gửi Workspace\n[Tạo anyway] — vượt BPO, ghi nhận over-commitment`} title="BPO Quota Check" />
                                ) : (
                                  <span className="text-caption text-success font-medium">✅ OK</span>
                                )
                              ) : <span className="text-text-3">—</span>}
                            </td>
                            {activeGroup.status.includes("Shipped") && (
                              <>
                                <td className="px-4 py-3 text-table text-text-2">{po.vehicle || "—"}</td>
                                <td className="px-4 py-3 text-table tabular-nums text-text-2">{po.fillPct ? `${po.fillPct}%` : "—"}</td>
                              </>
                            )}
                            <td className="px-4 py-3">
                              <div className="flex gap-1.5 items-center">
                                {po.status === "Draft" && (
                                  <>
                                    <button onClick={() => handleAction(`Gửi ATP ${po.poNum}`)} className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium flex items-center gap-1">
                                      <Send className="h-3 w-3" /> Gửi ATP
                                    </button>
                                    {po.nm === "Toko" && (
                                      <button onClick={() => setForceReleasePoNum(po.poNum)} className="rounded-button bg-danger-bg text-danger px-2.5 py-1 text-caption font-medium flex items-center gap-1">
                                        <ShieldAlert className="h-3 w-3" /> Force-release
                                      </button>
                                    )}
                                  </>
                                )}
                                {po.status === "ATP Pass" && <button onClick={() => handleAction(`Gửi duyệt ${po.poNum}`)} className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium">Gửi duyệt</button>}
                                {po.status === "Approved" && <button onClick={() => handleAction(`Post ${po.poNum}`)} className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium">Post Bravo</button>}
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

      {activeTab === "tracking" && (
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
                                formula={`Delivered ${n.delivered.toLocaleString()} ÷ Released ${n.released.toLocaleString()} = ${n.completionPct}%`}
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
      {/* Force-release modal */}
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
                <p className="text-text-3">History: 2 force-releases tháng này (Toko×2).</p>
                <p className="text-text-3 italic">Config: /config → PO → force_release_levels = 3.</p>
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

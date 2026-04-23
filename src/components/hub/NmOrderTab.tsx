import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft, CheckCircle, AlertTriangle, Package, Send } from "lucide-react";
import { ClickableNumber } from "@/components/ClickableNumber";
import { DemandToOrderBridge, buildMiniBridgeSteps } from "@/components/DemandToOrderBridge";
import { toast } from "sonner";
import { getNmCode, getPoTypeBadge, poNumClasses } from "@/lib/po-numbers";

interface Props { scale: number }

interface NmRow {
  nm: string;
  tier: string;
  sent: number;
  confirmed: number;
  skus: { item: string; variant: string; sent: number; confirmed: number; note: string }[];
}

/* ─── BPO types ─── */
interface BpoRow {
  bpo: string;
  nm: string;
  committed: number;
  confirmed: number;
  released: number;
  rpoCount: number;
  state: "DRAFT" | "SENT" | "CONFIRMED" | "ACTIVE" | "CLOSED";
  rpos: RpoRow[];
}

interface RpoRow {
  rpo: string;
  week: string;
  item: string;
  qty: number;
  status: string;
  eta: string;
}

/* ─── MOQ Data ─── */
interface MoqSku {
  item: string; variant: string; netReq: number; moq: number; order: number; surplus: number;
  poqOption: string; poqQty: number | null;
}

interface MoqNm {
  nm: string; netReqTotal: number; afterMoq: number; surplus: number; pctIncrease: number; surplusCost: string;
  skus: MoqSku[];
}

const baseMoqNms: MoqNm[] = [
  {
    nm: "Mikado", netReqTotal: 3100, afterMoq: 4000, surplus: 900, pctIncrease: 29, surplusCost: "166M₫",
    skus: [
      { item: "GA-300", variant: "A4", netReq: 800, moq: 1000, order: 1000, surplus: 200, poqOption: "Gộp W16+W17 = 1.500 → 1 container", poqQty: 1500 },
      { item: "GA-600", variant: "A4", netReq: 2251, moq: 1000, order: 3000, surplus: 749, poqOption: "Gộp W16-W18 = 3.200 → tiết kiệm 1 PO", poqQty: 3200 },
      { item: "GA-300", variant: "B2", netReq: 480, moq: 500, order: 500, surplus: 20, poqOption: "", poqQty: null },
    ],
  },
  {
    nm: "Toko", netReqTotal: 2800, afterMoq: 3000, surplus: 200, pctIncrease: 7, surplusCost: "36M₫",
    skus: [
      { item: "GA-300", variant: "A4", netReq: 1200, moq: 1000, order: 2000, surplus: 800, poqOption: "", poqQty: null },
      { item: "GA-600", variant: "A4", netReq: 1600, moq: 1000, order: 2000, surplus: 400, poqOption: "Gộp W16+W17 = 2.500", poqQty: 2500 },
    ],
  },
  {
    nm: "Phú Mỹ", netReqTotal: 1200, afterMoq: 1500, surplus: 300, pctIncrease: 25, surplusCost: "48M₫",
    skus: [
      { item: "GA-300", variant: "B2", netReq: 700, moq: 500, order: 1000, surplus: 300, poqOption: "", poqQty: null },
      { item: "GA-600", variant: "B2", netReq: 500, moq: 500, order: 500, surplus: 0, poqOption: "", poqQty: null },
    ],
  },
];

/* ─── MOQ Section Component ─── */
function MoqSection({ scale, onMoqLocked }: { scale: number; onMoqLocked: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const [drillNm, setDrillNm] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [allLocked, setAllLocked] = useState(false);
  const [bridgeKey, setBridgeKey] = useState<string | null>(null);

  const moqNms = baseMoqNms.map((n) => ({
    ...n,
    netReqTotal: Math.round(n.netReqTotal * scale),
    afterMoq: Math.round(n.afterMoq * scale),
    surplus: Math.round(n.surplus * scale),
    skus: n.skus.map((s) => ({
      ...s,
      netReq: Math.round(s.netReq * scale),
      moq: Math.round(s.moq * scale),
      order: Math.round(s.order * scale),
      surplus: Math.round(s.surplus * scale),
      poqQty: s.poqQty ? Math.round(s.poqQty * scale) : null,
    })),
  }));

  const totalNetReq = moqNms.reduce((a, n) => a + n.netReqTotal, 0);
  const totalAfterMoq = moqNms.reduce((a, n) => a + n.afterMoq, 0);
  const totalSurplus = moqNms.reduce((a, n) => a + n.surplus, 0);
  const totalPctIncrease = totalNetReq > 0 ? Math.round(((totalAfterMoq - totalNetReq) / totalNetReq) * 100) : 0;
  const itemsNeedRound = moqNms.reduce((a, n) => a + n.skus.filter((s) => s.surplus > 0).length, 0);
  const allOk = itemsNeedRound === 0;
  const activeNm = drillNm ? moqNms.find((n) => n.nm === drillNm) : null;

  const handleConfirmSku = (nm: string, item: string, variant: string, type: "moq" | "poq") => {
    const key = `${nm}-${item}-${variant}`;
    setConfirmed((p) => new Set(p).add(key));
    toast.success(`Đã chọn ${type === "poq" ? "POQ" : "MOQ"} cho ${item} ${variant}`);
  };

  const handleEditOrder = (key: string, current: number) => {
    setEditingCell(key);
    setEditVal(String(current));
  };

  const commitEdit = (key: string, moq: number) => {
    const v = parseInt(editVal);
    if (!isNaN(v) && v >= moq) {
      toast.success(`Đã cập nhật số đặt: ${v.toLocaleString()}`);
    } else if (!isNaN(v) && v < moq) {
      toast.error(`Số đặt phải ≥ MOQ (${moq.toLocaleString()})`);
    }
    setEditingCell(null);
  };

  const handleLockAll = () => {
    setAllLocked(true);
    onMoqLocked();
    toast.success("Đã xác nhận tất cả MOQ", { description: "Số sau MOQ round đã cập nhật vào bảng Đặt hàng NM." });
  };

  if (allLocked) {
    return (
      <div className="rounded-card border border-success/30 bg-success-bg/50 px-5 py-3 flex items-center gap-2">
        <CheckCircle className="h-4 w-4 text-success" />
        <span className="text-table font-medium text-success">MOQ đã xác nhận — Số đặt đã round theo MOQ NM.</span>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
      <button
        onClick={() => { setExpanded(!expanded); setDrillNm(null); }}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-1/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-text-2" />
          <span className="font-display text-body font-semibold text-text-1">Kiểm tra MOQ</span>
          {allOk ? (
            <span className="rounded-full bg-success-bg text-success text-caption font-medium px-2.5 py-0.5 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Tất cả OK
            </span>
          ) : (
            <span className="rounded-full bg-warning-bg text-warning text-caption font-medium px-2.5 py-0.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> {itemsNeedRound} items cần round
            </span>
          )}
        </div>
        <ChevronRight className={cn("h-4 w-4 text-text-3 transition-transform", expanded && "rotate-90")} />
      </button>

      {expanded && !allOk && (
        <div className="border-t border-surface-3">
          {!activeNm ? (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-table-sm">
                  <thead>
                    <tr className="border-b border-surface-3 bg-surface-1/50">
                      {["NM", "Net req gốc (m²)", "Sau MOQ round", "Surplus", "Tăng thêm", "Chi phí surplus", ""].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {moqNms.map((n) => (
                      <tr key={n.nm} className="border-b border-surface-3/50 hover:bg-surface-1/30 cursor-pointer" onClick={() => setDrillNm(n.nm)}>
                        <td className="px-4 py-2.5 font-medium text-text-1">{n.nm}</td>
                        <td className="px-4 py-2.5 tabular-nums text-text-2">{n.netReqTotal.toLocaleString()}</td>
                        <td className="px-4 py-2.5 tabular-nums font-medium text-text-1">
                          <ClickableNumber
                            value={n.afterMoq}
                            label={`Sau round ${n.nm}`}
                            color="text-text-1"
                            formula={`Net req ${n.netReqTotal.toLocaleString()} → MOQ round → ${n.afterMoq.toLocaleString()}\nSurplus +${n.surplus.toLocaleString()}`}
                          />
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-warning font-medium">+{n.surplus.toLocaleString()}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("tabular-nums font-medium", n.pctIncrease > 20 ? "text-warning" : "text-text-2")}>+{n.pctIncrease}%</span>
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-text-2">{n.surplusCost}</td>
                        <td className="px-4 py-2.5">
                          <span className="text-primary text-table-sm font-medium flex items-center gap-0.5">Xem chi tiết <ChevronRight className="h-3.5 w-3.5" /></span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                      <td className="px-4 py-2.5 text-text-1">TOTAL</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-1">{totalNetReq.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-1">{totalAfterMoq.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-warning font-medium">+{totalSurplus.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-1">+{totalPctIncrease}%</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-1">250M₫</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-surface-3 flex items-center justify-between">
                <p className="text-caption text-text-3">Tổng surplus: {totalSurplus.toLocaleString()} m² = 250M₫ working capital. Surplus sẽ tự trừ trong net req tháng sau.</p>
                <button onClick={handleLockAll} className="rounded-button bg-gradient-primary text-primary-foreground px-4 py-1.5 text-table-sm font-medium">Xác nhận tất cả MOQ</button>
              </div>
            </div>
          ) : (
            <div>
              <div className="px-5 py-3 border-b border-surface-3 flex items-center gap-2">
                <button onClick={() => setDrillNm(null)} className="text-primary text-table-sm font-medium hover:underline flex items-center gap-1">
                  <ChevronLeft className="h-3.5 w-3.5" /> MOQ
                </button>
                <span className="text-text-3 text-caption">/</span>
                <span className="text-text-1 text-table-sm font-medium">{activeNm.nm}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-table-sm">
                  <thead>
                    <tr className="border-b border-surface-3 bg-surface-1/50">
                      {["Item", "Variant", "Net req 4 CN", "MOQ NM", "Đặt", "Surplus", "POQ option", "Action"].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeNm.skus.map((sk) => {
                      const key = `${activeNm.nm}-${sk.item}-${sk.variant}`;
                      const isConfirmed = confirmed.has(key);
                      const isEditing = editingCell === key;
                      return (
                        <React.Fragment key={key}>
                          <tr className={cn("border-b border-surface-3/50", isConfirmed ? "bg-success/5" : "hover:bg-surface-1/30")}>
                            <td className="px-4 py-2.5 font-medium text-text-1">{sk.item}</td>
                            <td className="px-4 py-2.5 text-text-2">{sk.variant}</td>
                            <td className="px-4 py-2.5 tabular-nums text-text-2">{sk.netReq.toLocaleString()}</td>
                            <td className="px-4 py-2.5 tabular-nums text-text-3">{sk.moq.toLocaleString()}</td>
                            <td className="px-4 py-2.5">
                              {isEditing ? (
                                <input autoFocus type="number" value={editVal}
                                  onChange={(e) => setEditVal(e.target.value)}
                                  onBlur={() => commitEdit(key, sk.moq)}
                                  onKeyDown={(e) => e.key === "Enter" && commitEdit(key, sk.moq)}
                                  className="w-20 rounded border border-primary bg-surface-0 px-2 py-1 text-table-sm tabular-nums text-text-1 outline-none"
                                />
                              ) : (
                                <button onClick={() => handleEditOrder(key, sk.order)} className="tabular-nums font-medium text-primary hover:underline">{sk.order.toLocaleString()}</button>
                              )}
                            </td>
                            <td className="px-4 py-2.5 tabular-nums text-warning font-medium">{sk.surplus > 0 ? `+${sk.surplus.toLocaleString()}` : "0"}</td>
                            <td className="px-4 py-2.5 text-caption text-text-3 max-w-[220px]">{sk.poqOption || "—"}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                {isConfirmed ? (
                                  <span className="text-success text-caption font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Đã chọn</span>
                                ) : (
                                  <div className="flex gap-1.5">
                                    <button onClick={() => handleConfirmSku(activeNm.nm, sk.item, sk.variant, "moq")} className="rounded-button bg-gradient-primary text-primary-foreground px-2 py-1 text-caption font-medium">Chọn {sk.order.toLocaleString()}</button>
                                    {sk.poqQty && (
                                      <button onClick={() => handleConfirmSku(activeNm.nm, sk.item, sk.variant, "poq")} className="rounded-button border border-info text-info px-2 py-1 text-caption font-medium hover:bg-info/10">POQ {sk.poqQty.toLocaleString()}</button>
                                    )}
                                  </div>
                                )}
                                <button
                                  onClick={() => setBridgeKey(bridgeKey === key ? null : key)}
                                  className="text-info text-[10px] font-medium hover:underline"
                                >
                                  {bridgeKey === key ? "▴" : "▾"}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {bridgeKey === key && (
                            <tr>
                              <td colSpan={8} className="p-3 bg-surface-1/20 border-b border-surface-3/50">
                                <DemandToOrderBridge
                                  item={sk.item}
                                  variant={sk.variant}
                                  cn={`4 CN → ${activeNm.nm}`}
                                  steps={buildMiniBridgeSteps({
                                    netReq: sk.netReq,
                                    moq: sk.moq,
                                    moqNm: activeNm.nm,
                                    finalOrder: sk.order,
                                    rpoNum: `RPO-${getNmCode(activeNm.nm)}-2605-W17`,
                                  })}
                                  fromStep={0}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {activeNm.nm === "Mikado" && (
                <div className="px-5 py-3 border-t border-surface-3 bg-info-bg/30">
                  <p className="text-caption text-text-2">
                    <span className="font-medium text-info">📦 Container:</span> Mikado tổng {activeNm.afterMoq.toLocaleString()} m² ≈ 2,3 container (28T). Round lên 3 containers = {Math.round(activeNm.afterMoq * 1.05).toLocaleString()} m².
                  </p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => toast.success("Đã chọn 3 containers")} className="rounded-button bg-info/10 text-info px-3 py-1 text-caption font-medium hover:bg-info/20">Chọn 3 containers</button>
                    <button onClick={() => toast.info("Giữ nguyên LTL")} className="rounded-button border border-surface-3 px-3 py-1 text-caption font-medium text-text-3 hover:text-text-1">Giữ {activeNm.afterMoq.toLocaleString()} (LTL)</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {expanded && allOk && (
        <div className="border-t border-surface-3 px-5 py-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-success" />
          <span className="text-table text-success font-medium">MOQ OK — tất cả đơn hàng đã ≥ MOQ NM.</span>
        </div>
      )}
    </div>
  );
}

/* ─── Demo BPO data ─── */
const baseBpos: BpoRow[] = [
  {
    bpo: "BPO-MKD-2605", nm: "Mikado", committed: 5500, confirmed: 5060, released: 2500, rpoCount: 3, state: "ACTIVE",
    rpos: [
      { rpo: "RPO-MKD-2605-W16-001", week: "W16", item: "GA-300 A4", qty: 1200, status: "SHIPPED", eta: "17/05" },
      { rpo: "RPO-MKD-2605-W16-002", week: "W16", item: "GA-600 A4", qty: 800, status: "CONFIRMED", eta: "20/05" },
      { rpo: "RPO-MKD-2605-W17-001", week: "W17", item: "GA-300 A4", qty: 500, status: "DRAFT", eta: "—" },
    ],
  },
  {
    bpo: "BPO-TKO-2605", nm: "Toko", committed: 6000, confirmed: 4080, released: 1200, rpoCount: 2, state: "ACTIVE",
    rpos: [
      { rpo: "RPO-TKO-2605-W16-001", week: "W16", item: "GA-300 A4", qty: 557, status: "ATP_FAIL", eta: "—" },
      { rpo: "RPO-TKO-2605-W16-002", week: "W16", item: "GA-600 A4", qty: 643, status: "CONFIRMED", eta: "22/05" },
    ],
  },
  {
    bpo: "BPO-PMY-2605", nm: "Phú Mỹ", committed: 3000, confirmed: 1350, released: 500, rpoCount: 1, state: "SENT",
    rpos: [
      { rpo: "RPO-PMY-2605-W16-001", week: "W16", item: "GA-300 B2", qty: 500, status: "DRAFT", eta: "—" },
    ],
  },
  {
    bpo: "BPO-DTM-2605", nm: "Đồng Tâm", committed: 2500, confirmed: 2250, released: 900, rpoCount: 1, state: "ACTIVE",
    rpos: [
      { rpo: "RPO-DTM-2605-W16-001", week: "W16", item: "GA-400 A4", qty: 900, status: "APPROVED", eta: "18/05" },
    ],
  },
  {
    bpo: "BPO-VGR-2605", nm: "Vigracera", committed: 1500, confirmed: 1460, released: 0, rpoCount: 0, state: "CONFIRMED",
    rpos: [],
  },
];

/* ─── Main NmOrderTab ─── */

const baseNms: NmRow[] = [
  { nm: "Mikado", tier: "Hard M+1 · ±5%", sent: 5500, confirmed: 5060,
    skus: [
      { item: "GA-300", variant: "A4", sent: 2500, confirmed: 2300, note: "" },
      { item: "GA-600", variant: "A4", sent: 3000, confirmed: 2760, note: "" },
    ] },
  { nm: "Toko", tier: "Hard M+1 · ±5%", sent: 6000, confirmed: 4080,
    skus: [
      { item: "GA-300", variant: "A4", sent: 2000, confirmed: 1500, note: "Thiếu nguyên liệu" },
      { item: "GA-300", variant: "B2", sent: 1000, confirmed: 800, note: "" },
      { item: "GA-600", variant: "A4", sent: 2000, confirmed: 1200, note: "Line bận Q2" },
      { item: "GA-600", variant: "B2", sent: 1000, confirmed: 580, note: "" },
    ] },
  { nm: "Phú Mỹ", tier: "Firm M+2 · ±10%", sent: 3000, confirmed: 1350,
    skus: [
      { item: "GA-300", variant: "B2", sent: 1500, confirmed: 650, note: "Capacity limited" },
      { item: "GA-600", variant: "B2", sent: 1500, confirmed: 700, note: "Raw material delay" },
    ] },
  { nm: "Đồng Tâm", tier: "Hard M+1 · ±5%", sent: 2500, confirmed: 2250,
    skus: [
      { item: "GA-400", variant: "A4", sent: 1300, confirmed: 1200, note: "" },
      { item: "GA-400", variant: "D5", sent: 1200, confirmed: 1050, note: "" },
    ] },
  { nm: "Vigracera", tier: "Soft M+3 · ±15%", sent: 1500, confirmed: 1460,
    skus: [
      { item: "GA-600", variant: "A4", sent: 800, confirmed: 780, note: "" },
      { item: "GA-600", variant: "B2", sent: 700, confirmed: 680, note: "" },
    ] },
];

export function NmOrderTab({ scale }: Props) {
  const navigate = useNavigate();
  const [drillNm, setDrillNm] = useState<number | null>(null);
  const [drillBpo, setDrillBpo] = useState<string | null>(null);
  const [bposSent, setBposSent] = useState(false);
  const [moqLocked, setMoqLocked] = useState(false);

  const nms = baseNms.map(n => ({
    ...n,
    sent: Math.round(n.sent * scale),
    confirmed: Math.round(n.confirmed * scale),
    skus: n.skus.map(s => ({ ...s, sent: Math.round(s.sent * scale), confirmed: Math.round(s.confirmed * scale) })),
  }));

  const bpos = baseBpos.map(b => ({
    ...b,
    committed: Math.round(b.committed * scale),
    confirmed: Math.round(b.confirmed * scale),
    released: Math.round(b.released * scale),
    rpos: b.rpos.map(r => ({ ...r, qty: Math.round(r.qty * scale) })),
  }));

  const totalSent = nms.reduce((a, n) => a + n.sent, 0);
  const totalConfirmed = nms.reduce((a, n) => a + n.confirmed, 0);
  const totalUnconfirmed = totalSent - totalConfirmed;
  const sopDemand = Math.round(7650 * scale);

  const kpis = [
    { label: "S&OP demand", value: `${sopDemand.toLocaleString()} m²`, bg: "bg-info-bg", text: "text-info" },
    { label: "Đã gửi NM", value: totalSent.toLocaleString(), bg: "bg-success-bg", text: "text-success" },
    { label: "NM xác nhận", value: totalConfirmed.toLocaleString(), bg: "bg-success-bg", text: "text-success" },
    { label: "Chưa confirm", value: `${totalUnconfirmed.toLocaleString()} 🔴`, bg: "bg-danger-bg", text: "text-danger" },
  ];

  const handleSendBpos = () => {
    setBposSent(true);
    toast.success("Đã tạo và gửi BPO cho tất cả NM", {
      description: bpos.map(b => `${b.bpo}: ${b.committed.toLocaleString()}m²`).join(" · "),
    });
  };

  // ─── BPO Drill-down ───
  if (drillBpo) {
    const bpo = bpos.find(b => b.bpo === drillBpo);
    if (!bpo) return null;
    const releasedPct = bpo.confirmed > 0 ? Math.round((bpo.released / bpo.confirmed) * 100) : 0;
    const remaining = bpo.confirmed - bpo.released;

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2 text-table-sm">
          <button onClick={() => setDrillBpo(null)} className="text-primary font-medium hover:underline flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Per NM
          </button>
          <span className="text-text-3">/</span>
          <span className="text-text-1 font-medium">{bpo.nm}</span>
          <span className={cn("rounded-sm px-1.5 py-0.5 text-caption font-medium", getPoTypeBadge("BPO").bg, getPoTypeBadge("BPO").text, poNumClasses)}>
            {bpo.bpo}
          </span>
        </div>

        {/* Progress */}
        <div className="rounded-card border border-surface-3 bg-surface-2 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-table text-text-2">Released {bpo.released.toLocaleString()} / {bpo.confirmed.toLocaleString()}</span>
            <span className="text-table font-medium text-text-1">{releasedPct}%</span>
          </div>
          <div className="w-full h-2 bg-surface-1 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-primary rounded-full transition-all" style={{ width: `${releasedPct}%` }} />
          </div>
          <p className="text-caption text-text-3 mt-2">Còn lại: {remaining.toLocaleString()} m² quota cho RPO tuần tới</p>
        </div>

        {/* RPO list */}
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-1/50 border-b border-surface-3">
            <span className="text-table-sm font-medium text-text-1">Release POs thuộc Blanket này</span>
          </div>
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                {["RPO#", "Tuần", "SKU", "SL", "Trạng thái", "ETA", "Liên kết"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bpo.rpos.map((rpo, i) => {
                const badge = getPoTypeBadge("RPO");
                const statusColor = rpo.status === "SHIPPED" ? "bg-success-bg text-success" :
                  rpo.status === "CONFIRMED" || rpo.status === "APPROVED" ? "bg-info-bg text-info" :
                  rpo.status === "ATP_FAIL" ? "bg-danger-bg text-danger" : "bg-surface-1 text-text-2";
                const statusLabel =
                  rpo.status === "SHIPPED" ? "ĐÃ GỬI" :
                  rpo.status === "CONFIRMED" ? "ĐÃ XÁC NHẬN" :
                  rpo.status === "APPROVED" ? "ĐÃ DUYỆT" :
                  rpo.status === "DRAFT" ? "NHÁP" :
                  rpo.status === "RECEIVED" ? "ĐÃ NHẬN" :
                  rpo.status === "ATP_FAIL" ? "ATP LỖI" : rpo.status;
                return (
                  <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-surface-1/30", i % 2 === 0 ? "bg-surface-2" : "bg-surface-0")}>
                    <td className={cn("px-4 py-2.5", poNumClasses, badge.text)}>{rpo.rpo}</td>
                    <td className="px-4 py-2.5 text-text-2">{rpo.week}</td>
                    <td className="px-4 py-2.5 text-text-1">{rpo.item}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-1">{rpo.qty.toLocaleString()}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium", statusColor)}>● {statusLabel}</span>
                    </td>
                    <td className="px-4 py-2.5 text-text-3">{rpo.eta}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => navigate("/orders")} className="text-primary text-table-sm font-medium hover:underline">Xem →/orders</button>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                <td className="px-4 py-2.5 text-text-1">TOTAL released</td>
                <td />
                <td />
                <td className="px-4 py-2.5 tabular-nums text-text-1">{bpo.released.toLocaleString()}/{bpo.confirmed.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-text-1">{releasedPct}%</td>
                <td colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // ─── NM SKU Drill-down ───
  if (drillNm !== null) {
    const nm = nms[drillNm];
    const nmUnconf = nm.sent - nm.confirmed;
    const bpo = bpos.find(b => b.nm === nm.nm);
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2 text-table-sm">
          <button onClick={() => setDrillNm(null)} className="text-primary font-medium hover:underline flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Per NM
          </button>
          <span className="text-text-3">/</span>
          <span className="text-text-1 font-medium">{nm.nm} (gửi {nm.sent.toLocaleString()}, xác nhận {nm.confirmed.toLocaleString()})</span>
          {bpo && (
            <button onClick={() => { setDrillNm(null); setDrillBpo(bpo.bpo); }}
              className={cn("rounded-sm px-1.5 py-0.5 text-caption font-medium hover:opacity-80", getPoTypeBadge("BPO").bg, getPoTypeBadge("BPO").text, poNumClasses)}>
              {bpo.bpo}
            </button>
          )}
        </div>

        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["Item", "Variant", "Gửi", "NM xác nhận", "Chưa", "Ghi chú NM", "Action"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nm.skus.map((sk, si) => {
                  const unconf = sk.sent - sk.confirmed;
                  return (
                    <tr key={si} className={cn("border-b border-surface-3/50 hover:bg-primary/5", si % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                      <td className="px-4 py-2.5 font-medium text-text-1">{sk.item}</td>
                      <td className="px-4 py-2.5 text-text-2">{sk.variant}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-1">{sk.sent.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-1 font-medium">{sk.confirmed.toLocaleString()}</td>
                      <td className={cn("px-4 py-2.5 tabular-nums font-medium", unconf > 0 ? "text-danger" : "text-success")}>{unconf.toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-text-3 text-table-sm italic max-w-[200px]">{sk.note || "—"}</td>
                      <td className="px-4 py-2.5">
                        {unconf > 0 && sk.note && (
                          <button onClick={() => navigate("/supply")} className="text-primary text-table-sm font-medium hover:underline">Tìm NM khác</button>
                        )}
                        {unconf > 0 && !sk.note && (
                          <button onClick={() => toast.success(`Đã nhắc ${nm.nm} về ${sk.item} ${sk.variant}`)} className="text-warning text-table-sm font-medium hover:underline">Nhắc</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                  <td className="px-4 py-2.5 text-text-1">TOTAL</td>
                  <td />
                  <td className="px-4 py-2.5 tabular-nums text-text-1">{nm.sent.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-1">{nm.confirmed.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-danger font-medium">{nmUnconf.toLocaleString()}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ─── Layer 1: Per NM + BPO ───
  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        {/* S&OP demand */}
        <div className={cn("rounded-card border border-surface-3 p-4 bg-info-bg")}>
          <div className="text-caption text-text-3 uppercase mb-1">S&OP demand</div>
          <ClickableNumber
            value={`${sopDemand.toLocaleString()} m²`}
            label="S&OP demand"
            color="font-display text-kpi text-info"
            note={`Từ /sop tab 2 Lock 07/05.`}
            links={[{ label: "→ /sop", to: "/sop" }]}
          />
        </div>
        {/* Đã gửi NM */}
        <div className={cn("rounded-card border border-surface-3 p-4 bg-success-bg")}>
          <div className="text-caption text-text-3 uppercase mb-1">Đã gửi NM</div>
          <ClickableNumber
            value={totalSent.toLocaleString()}
            label="Đã gửi NM"
            color="font-display text-kpi text-success"
            breakdown={nms.map(n => ({ label: n.nm, value: n.sent, pct: `${Math.round(n.sent / totalSent * 100)}%` }))}
            formula={`FC Min 3.893 + MOQ round + share% coverage = ${totalSent.toLocaleString()}`}
          />
        </div>
        {/* NM xác nhận */}
        <div className={cn("rounded-card border border-surface-3 p-4 bg-success-bg")}>
          <div className="text-caption text-text-3 uppercase mb-1">NM xác nhận</div>
          <ClickableNumber
            value={totalConfirmed.toLocaleString()}
            label="NM xác nhận"
            color="font-display text-kpi text-success"
            breakdown={nms.map(n => {
              const pct = n.sent > 0 ? Math.round(n.confirmed / n.sent * 100) : 0;
              const icon = pct >= 80 ? "✅" : "🔴";
              return { label: n.nm, value: `${n.confirmed.toLocaleString()} (${pct}% ${icon})` };
            })}
          />
        </div>
        {/* Chưa confirm */}
        <div className={cn("rounded-card border border-surface-3 p-4 bg-danger-bg")}>
          <div className="text-caption text-text-3 uppercase mb-1">Chưa confirm</div>
          <ClickableNumber
            value={`${totalUnconfirmed.toLocaleString()} 🔴`}
            label="Chưa confirm"
            color="font-display text-kpi text-danger"
            breakdown={nms.map(n => ({ label: `${n.nm} chưa`, value: n.sent - n.confirmed }))}
            note="Toko + Phú Mỹ = 83% of gap. [Nhắc NM]"
          />
        </div>
      </div>

      {/* ★ MOQ SECTION */}
      <MoqSection scale={scale} onMoqLocked={() => setMoqLocked(true)} />

      {/* BPO generation button */}
      {moqLocked && !bposSent && (
        <div className="rounded-card border border-info/30 bg-info-bg/30 px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-table font-medium text-text-1">MOQ xác nhận xong — Tạo Blanket PO cho NM?</p>
            <p className="text-caption text-text-3 mt-0.5">System sẽ auto-generate BPO per NM: {bpos.map(b => b.bpo).join(", ")}</p>
          </div>
          <button onClick={handleSendBpos} className="rounded-button bg-gradient-primary text-primary-foreground px-4 py-2 text-table-sm font-medium flex items-center gap-2 hover:opacity-90">
            <Send className="h-4 w-4" /> Gửi NM & Tạo BPO
          </button>
        </div>
      )}

      {/* NM table with BPO column */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                {["NM", ...(bposSent ? ["BPO#"] : []), "Committed", "NM confirmed", ...(bposSent ? ["Released (RPOs)", "Còn lại"] : ["Chưa confirm"]), "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nms.map((nm, i) => {
                const bpo = bpos.find(b => b.nm === nm.nm);
                const pct = nm.sent > 0 ? Math.round((nm.confirmed / nm.sent) * 100) : 0;
                const unconf = nm.sent - nm.confirmed;
                const statusColor = pct >= 80 ? "text-success" : pct >= 60 ? "text-warning" : "text-danger";
                const statusIcon = pct >= 80 ? "✅" : pct >= 60 ? "⚠" : "🔴";
                const releasedPct = bpo && bpo.confirmed > 0 ? Math.round((bpo.released / bpo.confirmed) * 100) : 0;
                const remaining = bpo ? bpo.confirmed - bpo.released : 0;

                return (
                  <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-text-1">{nm.nm}</div>
                      <div className="text-[11px] text-text-3 mt-0.5">{nm.tier}</div>
                    </td>
                    {bposSent && bpo && (
                      <td className="px-4 py-2.5">
                        <button onClick={() => setDrillBpo(bpo.bpo)}
                          className={cn("rounded-sm px-1.5 py-0.5 text-caption font-medium hover:opacity-80", getPoTypeBadge("BPO").bg, getPoTypeBadge("BPO").text, poNumClasses)}>
                          {bpo.bpo}
                        </button>
                      </td>
                    )}
                    {bposSent && !bpo && <td className="px-4 py-2.5 text-text-3">—</td>}
                    <td className="px-4 py-2.5 tabular-nums text-text-1">{nm.sent.toLocaleString()}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-1 font-medium">{nm.confirmed.toLocaleString()}</td>
                    {bposSent ? (
                      <>
                        <td className="px-4 py-2.5 tabular-nums text-text-2">
                          {bpo ? `${Math.round(bpo.released * scale).toLocaleString()} (${bpo.rpoCount} RPOs)` : "—"}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-text-1">{bpo ? Math.round(remaining * scale).toLocaleString() : "—"}</td>
                      </>
                    ) : (
                      <td className={cn("px-4 py-2.5 tabular-nums font-medium", unconf > 0 ? "text-danger" : "text-success")}>{unconf.toLocaleString()}</td>
                    )}
                    <td className="px-4 py-2.5">
                      <span className={cn("font-medium", statusColor)}>
                        {statusIcon} {pct}%
                        {bposSent && bpo ? ` · ${releasedPct}% released` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => setDrillNm(i)} className="text-primary text-table-sm font-medium hover:underline flex items-center gap-0.5">
                          Detail <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                        {bposSent && bpo && (
                          <button onClick={() => setDrillBpo(bpo.bpo)} className="text-info text-table-sm font-medium hover:underline">BPO</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                <td className="px-4 py-2.5 text-text-1">TOTAL</td>
                {bposSent && <td />}
                <td className="px-4 py-2.5 tabular-nums text-text-1">{totalSent.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-text-1">{totalConfirmed.toLocaleString()}</td>
                {bposSent ? (
                  <>
                    <td className="px-4 py-2.5 tabular-nums text-text-2">
                      {bpos.reduce((a, b) => a + Math.round(b.released * scale), 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-text-1">
                      {bpos.reduce((a, b) => a + Math.round((b.confirmed - b.released) * scale), 0).toLocaleString()}
                    </td>
                  </>
                ) : (
                  <td className="px-4 py-2.5 tabular-nums text-danger font-medium">{totalUnconfirmed.toLocaleString()}</td>
                )}
                <td className="px-4 py-2.5 text-text-2 font-medium">{Math.round((totalConfirmed / totalSent) * 100)}%</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

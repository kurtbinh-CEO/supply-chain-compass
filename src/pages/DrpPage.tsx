import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { useTenant } from "@/components/TenantContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, AlertTriangle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const tenantScales: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.7, "Mondelez": 1.35 };

interface SkuException {
  item: string; variant: string; demand: number; allocated: number; gap: number;
  type: "SHORTAGE" | "WATCH"; suggestion: string;
}

interface LcnbOption {
  source: string; qty: number; costPerM2: string; time: string; saving: string;
}

interface SkuFull {
  item: string; variant: string; demand: number; allocated: number; fillPct: number; status: string;
}

interface CnRow {
  cn: string; demand: number; available: number; fillRate: number; gap: number; exceptions: number;
  exceptionList: SkuException[]; allSkus: SkuFull[];
  lcnbOptions: LcnbOption[];
}

const baseData: CnRow[] = [
  {
    cn: "CN-BD", demand: 2550, available: 1007, fillRate: 86, gap: 345, exceptions: 2,
    exceptionList: [
      { item: "GA-300", variant: "A4", demand: 617, allocated: 272, gap: 345, type: "SHORTAGE", suggestion: "LCNB: CN-ĐN thừa 220. Tiết kiệm 32M₫" },
      { item: "GA-400", variant: "A4", demand: 347, allocated: 297, gap: 50, type: "WATCH", suggestion: "ETA Mikado 17/05 sẽ cover" },
    ],
    allSkus: [
      { item: "GA-300", variant: "A4", demand: 617, allocated: 272, fillPct: 44, status: "SHORTAGE" },
      { item: "GA-300", variant: "B2", demand: 178, allocated: 178, fillPct: 100, status: "OK" },
      { item: "GA-400", variant: "A4", demand: 347, allocated: 297, fillPct: 86, status: "WATCH" },
      { item: "GA-600", variant: "A4", demand: 881, allocated: 881, fillPct: 100, status: "OK" },
      { item: "GA-600", variant: "B2", demand: 527, allocated: 527, fillPct: 100, status: "OK" },
    ],
    lcnbOptions: [
      { source: "CN-ĐN (lateral)", qty: 220, costPerM2: "40K", time: "1 ngày", saving: "−32M₫ (88%)" },
      { source: "Mikado (PO mới)", qty: 345, costPerM2: "185K", time: "14 ngày", saving: "baseline" },
      { source: "Đồng Tâm (PO mới)", qty: 345, costPerM2: "170K", time: "7 ngày", saving: "−5M₫" },
    ],
  },
  { cn: "CN-ĐN", demand: 1800, available: 1600, fillRate: 100, gap: 0, exceptions: 0, exceptionList: [], allSkus: [], lcnbOptions: [] },
  { cn: "CN-HN", demand: 2100, available: 1300, fillRate: 100, gap: 0, exceptions: 0, exceptionList: [], allSkus: [], lcnbOptions: [] },
  { cn: "CN-CT", demand: 1200, available: 1050, fillRate: 100, gap: 0, exceptions: 0, exceptionList: [], allSkus: [], lcnbOptions: [] },
];

export default function DrpPage() {
  const { tenant } = useTenant();
  const s = tenantScales[tenant] || 1;
  const navigate = useNavigate();
  const [drillCn, setDrillCn] = useState<string | null>(null);
  const [showAllSkus, setShowAllSkus] = useState(false);
  const [expandLcnb, setExpandLcnb] = useState<string | null>(null);

  const data = baseData.map((r) => ({
    ...r,
    demand: Math.round(r.demand * s), available: Math.round(r.available * s), gap: Math.round(r.gap * s),
    exceptionList: r.exceptionList.map((e) => ({ ...e, demand: Math.round(e.demand * s), allocated: Math.round(e.allocated * s), gap: Math.round(e.gap * s) })),
    allSkus: r.allSkus.map((sk) => ({ ...sk, demand: Math.round(sk.demand * s), allocated: Math.round(sk.allocated * s) })),
    lcnbOptions: r.lcnbOptions.map((o) => ({ ...o, qty: Math.round(o.qty * s) })),
  }));

  const totalDemand = data.reduce((a, r) => a + r.demand, 0);
  const totalAvail = data.reduce((a, r) => a + r.available, 0);
  const totalGap = data.reduce((a, r) => a + r.gap, 0);
  const totalExc = data.reduce((a, r) => a + r.exceptions, 0);
  const totalFill = totalDemand > 0 ? Math.round(((totalDemand - totalGap) / totalDemand) * 1000) / 10 : 100;
  const activeCn = drillCn ? data.find((r) => r.cn === drillCn) : null;

  return (
    <AppLayout>
      <ScreenHeader title="DRP & Phân bổ" subtitle="Distribution Requirements Planning + Allocation" />

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="rounded-full border border-surface-3 bg-surface-2 px-3 py-1 text-table-sm text-text-2">Chạy lúc 23:02 đêm qua</span>
        {totalExc > 0 && (
          <span className="flex items-center gap-1 rounded-full bg-danger-bg px-3 py-1 text-table-sm font-medium text-danger">
            <AlertTriangle className="h-3.5 w-3.5" /> {totalExc} exceptions
          </span>
        )}
      </div>

      {!activeCn ? (
        /* ─── Lớp 1: Per CN ─── */
        <div className="rounded-card border border-surface-3 bg-surface-2 animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["CN", "Demand", "Có sẵn (stock+pipe)", "Fill rate", "Gap", "Exceptions", ""].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.cn} className={cn("border-b border-surface-3/50 cursor-pointer hover:bg-surface-1/30", r.gap > 0 && "bg-danger-bg/20")} onClick={() => r.exceptions > 0 && setDrillCn(r.cn)}>
                    <td className="px-4 py-3 text-table font-medium text-text-1">{r.cn}</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-1">{r.demand.toLocaleString()}</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-2">{r.available.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 rounded-full bg-surface-3 overflow-hidden">
                          <div className={cn("h-full rounded-full", r.fillRate >= 100 ? "bg-success" : r.fillRate >= 90 ? "bg-warning" : "bg-danger")} style={{ width: `${Math.min(r.fillRate, 100)}%` }} />
                        </div>
                        <span className={cn("text-table-sm font-medium", r.fillRate >= 100 ? "text-success" : r.fillRate >= 90 ? "text-warning" : "text-danger")}>{r.fillRate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-table tabular-nums">
                      {r.gap > 0 ? <span className="text-danger font-medium">{r.gap.toLocaleString()}</span> : <span className="text-text-3">0</span>}
                    </td>
                    <td className="px-4 py-3 text-table">
                      {r.exceptions > 0 ? <span className="text-danger font-medium">{r.exceptions}</span> : <span className="text-text-3">0</span>}
                    </td>
                    <td className="px-4 py-3 text-text-3">{r.exceptions > 0 && <ChevronRight className="h-4 w-4" />}</td>
                  </tr>
                ))}
                <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                  <td className="px-4 py-3 text-table text-text-1">TOTAL</td>
                  <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalDemand.toLocaleString()}</td>
                  <td className="px-4 py-3 text-table tabular-nums text-text-2">{totalAvail.toLocaleString()}</td>
                  <td className="px-4 py-3 text-table-sm font-medium text-text-1">{totalFill}%</td>
                  <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalGap.toLocaleString()}</td>
                  <td className="px-4 py-3 text-table text-text-1">{totalExc}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── Lớp 2: Per SKU ─── */
        <div className="animate-fade-in space-y-4">
          <button onClick={() => { setDrillCn(null); setShowAllSkus(false); setExpandLcnb(null); }} className="text-table-sm text-primary hover:underline flex items-center gap-1">
            ← Per CN
          </button>
          <p className="text-caption text-text-3">Per CN › <span className="text-text-1 font-medium">{activeCn.cn}</span> (fill {activeCn.fillRate}%, gap {activeCn.gap.toLocaleString()})</p>

          {/* Section A: Exceptions */}
          <div className="rounded-card border border-surface-3 bg-surface-2">
            <div className="px-5 py-3 border-b border-surface-3">
              <h3 className="font-display text-body font-semibold text-text-1">Exceptions ({activeCn.exceptionList.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["Item", "Variant", "Demand", "Allocated", "Gap", "Loại", "Gợi ý", "Action"].map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCn.exceptionList.map((ex, i) => (
                    <>
                      <tr key={i} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                        <td className="px-4 py-3 text-table font-medium text-text-1">{ex.item}</td>
                        <td className="px-4 py-3 text-table text-text-2">{ex.variant}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-1">{ex.demand.toLocaleString()}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-2">{ex.allocated.toLocaleString()}</td>
                        <td className="px-4 py-3 text-table tabular-nums font-medium text-danger">{ex.gap.toLocaleString()} 🔴</td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium",
                            ex.type === "SHORTAGE" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"
                          )}>{ex.type}</span>
                        </td>
                        <td className="px-4 py-3 text-caption text-text-2 max-w-[200px]">{ex.suggestion}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {ex.type === "SHORTAGE" && (
                              <button
                                onClick={() => setExpandLcnb(expandLcnb === `${ex.item}-${ex.variant}` ? null : `${ex.item}-${ex.variant}`)}
                                className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium flex items-center gap-1"
                              >
                                Chuyển hàng {expandLcnb === `${ex.item}-${ex.variant}` ? "▴" : "▸"}
                              </button>
                            )}
                            <button
                              onClick={() => navigate("/orders")}
                              className="rounded-button border border-surface-3 px-2.5 py-1 text-caption font-medium text-text-2 hover:text-text-1 flex items-center gap-1"
                            >
                              Tạo PO <ArrowRight className="h-3 w-3" />
                            </button>
                            {ex.type === "WATCH" && (
                              <button onClick={() => toast.info("Đang chờ ETA cover")} className="rounded-button border border-surface-3 px-2.5 py-1 text-caption font-medium text-text-3">
                                Chờ
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* LCNB Panel */}
                      {expandLcnb === `${ex.item}-${ex.variant}` && activeCn.lcnbOptions.length > 0 && (
                        <tr key={`lcnb-${i}`}>
                          <td colSpan={8} className="p-0">
                            <div className="bg-surface-1/60 border-t border-surface-3 px-6 py-4">
                              <p className="text-caption text-text-3 mb-3 font-medium">Nguồn bổ sung cho {ex.item} {ex.variant} — thiếu {ex.gap.toLocaleString()} m²</p>
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-surface-3/50">
                                    {["Nguồn", "Qty", "Cost/m²", "Thời gian", "Tiết kiệm vs PO mới", ""].map((h, j) => (
                                      <th key={j} className="px-3 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {activeCn.lcnbOptions.map((opt, j) => (
                                    <tr key={j} className={cn("border-b border-surface-3/30", j === 0 && "bg-success/5")}>
                                      <td className="px-3 py-2.5 text-table text-text-1 font-medium">
                                        {j === 0 && "★ "}{opt.source}
                                      </td>
                                      <td className="px-3 py-2.5 text-table tabular-nums text-text-1">{opt.qty.toLocaleString()}</td>
                                      <td className="px-3 py-2.5 text-table text-text-2">{opt.costPerM2}</td>
                                      <td className="px-3 py-2.5 text-table text-text-2">{opt.time}</td>
                                      <td className="px-3 py-2.5 text-table text-text-2">{opt.saving}</td>
                                      <td className="px-3 py-2.5">
                                        <button
                                          onClick={() => {
                                            toast.success(`Đã chọn ${opt.source} ${opt.qty} m²`, { description: j === 0 ? "Transfer Order tạo → Workspace duyệt" : "PO draft tạo → /orders" });
                                            setExpandLcnb(null);
                                          }}
                                          className="rounded-button bg-gradient-primary text-primary-foreground px-2.5 py-1 text-caption font-medium"
                                        >
                                          Chọn
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section B: All SKU (collapsed) */}
          {activeCn.allSkus.length > 0 && (
            <div className="rounded-card border border-surface-3 bg-surface-2">
              <button
                onClick={() => setShowAllSkus(!showAllSkus)}
                className="w-full px-5 py-3 flex items-center justify-between hover:bg-surface-1/30"
              >
                <span className="text-table font-medium text-text-2">Xem tất cả SKU ({activeCn.allSkus.length})</span>
                {showAllSkus ? <ChevronDown className="h-4 w-4 text-text-3" /> : <ChevronRight className="h-4 w-4 text-text-3" />}
              </button>
              {showAllSkus && (
                <div className="border-t border-surface-3 overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-3 bg-surface-1/50">
                        {["Item", "Variant", "Demand", "Allocated", "Fill%", "Status"].map((h, i) => (
                          <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeCn.allSkus.map((sk, i) => (
                        <tr key={i} className="border-b border-surface-3/50">
                          <td className="px-4 py-2.5 text-table font-medium text-text-1">{sk.item}</td>
                          <td className="px-4 py-2.5 text-table text-text-2">{sk.variant}</td>
                          <td className="px-4 py-2.5 text-table tabular-nums text-text-1">{sk.demand.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-table tabular-nums text-text-2">{sk.allocated.toLocaleString()}</td>
                          <td className={cn("px-4 py-2.5 text-table tabular-nums font-medium", sk.fillPct >= 100 ? "text-success" : sk.fillPct >= 80 ? "text-warning" : "text-danger")}>{sk.fillPct}%</td>
                          <td className="px-4 py-2.5">
                            <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium",
                              sk.status === "OK" ? "bg-success-bg text-success" : sk.status === "SHORTAGE" ? "bg-danger-bg text-danger" : "bg-warning-bg text-warning"
                            )}>{sk.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

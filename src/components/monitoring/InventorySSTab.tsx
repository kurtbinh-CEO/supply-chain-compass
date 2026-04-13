import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft, ChevronDown, Info } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogicLink } from "@/components/LogicLink";
import { DemandToOrderBridge, buildFullBridgeSteps } from "@/components/DemandToOrderBridge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/* ═══ DATA ═══ */
const invTrendBase = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const dateStr = `${String(day).padStart(2, "0")}/05`;
  return {
    date: dateStr,
    "CN-BD": { available: 1200 + Math.round(Math.sin(i / 4) * 200), reserved: 300 + Math.round(Math.cos(i / 3) * 80), ss: 2900 },
    "CN-ĐN": { available: 3500 + Math.round(Math.cos(i / 5) * 300), reserved: 400 + Math.round(Math.sin(i / 4) * 100), ss: 2400 },
    "CN-HN": { available: 2300 + Math.round(Math.sin(i / 6) * 200), reserved: 350 + Math.round(Math.cos(i / 5) * 60), ss: 2100 },
    "CN-CT": { available: 1900 + Math.round(Math.cos(i / 4) * 150), reserved: 250 + Math.round(Math.sin(i / 3) * 50), ss: 1500 },
  };
});

function getInvTrend(filter: string) {
  return invTrendBase.map((d) => {
    if (filter === "all") {
      const cns = ["CN-BD", "CN-ĐN", "CN-HN", "CN-CT"] as const;
      return {
        date: d.date,
        available: cns.reduce((a, c) => a + d[c].available, 0),
        reserved: cns.reduce((a, c) => a + d[c].reserved, 0),
        ss: cns.reduce((a, c) => a + d[c].ss, 0),
      };
    }
    const cn = d[filter as keyof typeof d] as { available: number; reserved: number; ss: number };
    return { date: d.date, available: cn.available, reserved: cn.reserved, ss: cn.ss };
  });
}

interface CnInvRow {
  cn: string; ton: number; available: number; ssTarget: number; ssActual: number; ssGap: number;
  hstk: number; replenish: number; status: string;
  skus: SkuRow[];
}

interface SkuRow {
  item: string; variant: string; demand: number; ton: number; pipeline: number; pipelineSource: string;
  ssTarget: number; ssGap: number; netReq: number; moq: number; moqNm: string; order: number; status: string;
  // bridge data
  fcPhased: number; cnAdj: number; po: number; overlap: number; onHand: number;
  zVal: number; sigma: number; lt: number; rpoNum: string;
}

const baseCnData: CnInvRow[] = [
  {
    cn: "CN-BD", ton: 2100, available: 1350, ssTarget: 2900, ssActual: 2100, ssGap: -800, hstk: 5.2, replenish: 1993, status: "THIẾU SS",
    skus: [
      { item: "GA-300", variant: "A4", demand: 617, ton: 120, pipeline: 557, pipelineSource: "RPO-TKO-W15 ETA 17/05 (trễ 4d)", ssTarget: 900, ssGap: -780, netReq: 840, moq: 1000, moqNm: "Mikado", order: 1000, status: "RPO draft", fcPhased: 524, cnAdj: 44, po: 200, overlap: 151, onHand: 120, zVal: 1.65, sigma: 28.5, lt: 14, rpoNum: "RPO-MKD-2605-W17-002" },
      { item: "GA-300", variant: "B2", demand: 178, ton: 380, pipeline: 0, pipelineSource: "—", ssTarget: 700, ssGap: -320, netReq: 498, moq: 500, moqNm: "Mikado", order: 500, status: "RPO draft", fcPhased: 150, cnAdj: 18, po: 30, overlap: 20, onHand: 380, zVal: 1.65, sigma: 22.1, lt: 12, rpoNum: "RPO-MKD-2605-W17-003" },
      { item: "GA-400", variant: "A4", demand: 347, ton: 800, pipeline: 0, pipelineSource: "—", ssTarget: 600, ssGap: 200, netReq: 147, moq: 500, moqNm: "Đồng Tâm", order: 500, status: "Pending", fcPhased: 300, cnAdj: 27, po: 40, overlap: 20, onHand: 800, zVal: 1.65, sigma: 18.3, lt: 14, rpoNum: "RPO-DT-2605-W17-001" },
      { item: "GA-600", variant: "A4", demand: 881, ton: 2100, pipeline: 0, pipelineSource: "—", ssTarget: 1000, ssGap: 1100, netReq: 0, moq: 0, moqNm: "—", order: 0, status: "Đủ hàng ✅", fcPhased: 750, cnAdj: 81, po: 100, overlap: 50, onHand: 2100, zVal: 1.65, sigma: 32.0, lt: 10, rpoNum: "—" },
      { item: "GA-300", variant: "C1", demand: 120, ton: 320, pipeline: 0, pipelineSource: "—", ssTarget: 150, ssGap: 170, netReq: 0, moq: 0, moqNm: "—", order: 0, status: "Đủ hàng ✅", fcPhased: 100, cnAdj: 10, po: 15, overlap: 5, onHand: 320, zVal: 1.65, sigma: 8.5, lt: 14, rpoNum: "—" },
      { item: "GA-600", variant: "B2", demand: 200, ton: 650, pipeline: 0, pipelineSource: "—", ssTarget: 500, ssGap: 150, netReq: 0, moq: 0, moqNm: "—", order: 0, status: "Đủ hàng ✅", fcPhased: 170, cnAdj: 15, po: 25, overlap: 10, onHand: 650, zVal: 1.65, sigma: 20.0, lt: 10, rpoNum: "—" },
    ],
  },
  { cn: "CN-ĐN", ton: 4500, available: 3800, ssTarget: 2400, ssActual: 3800, ssGap: 1400, hstk: 14, replenish: 200, status: "THỪA", skus: [] },
  { cn: "CN-HN", ton: 3200, available: 2500, ssTarget: 2100, ssActual: 2500, ssGap: 400, hstk: 9, replenish: 800, status: "OK", skus: [] },
  { cn: "CN-CT", ton: 2800, available: 2100, ssTarget: 1500, ssActual: 2100, ssGap: 600, hstk: 11, replenish: 150, status: "OK", skus: [] },
];

interface SsSkuRow {
  item: string; variant: string; ssCurrent: number; z: number; sigma: number; lt: number;
  ssProposed: number; delta: number; wcImpact: string;
}

const ssBdSkus: SsSkuRow[] = [
  { item: "GA-300", variant: "A4", ssCurrent: 900, z: 1.65, sigma: 28.5, lt: 14, ssProposed: 1035, delta: 135, wcImpact: "+25M₫" },
  { item: "GA-300", variant: "B2", ssCurrent: 700, z: 1.65, sigma: 22.1, lt: 12, ssProposed: 700, delta: 0, wcImpact: "0" },
  { item: "GA-400", variant: "A4", ssCurrent: 600, z: 1.65, sigma: 18.3, lt: 14, ssProposed: 600, delta: 0, wcImpact: "0" },
  { item: "GA-600", variant: "A4", ssCurrent: 1000, z: 1.65, sigma: 32.0, lt: 10, ssProposed: 950, delta: -50, wcImpact: "−9M₫" },
];

/* ═══ HELPERS ═══ */
function hstkColor(d: number) { return d < 5 ? "text-danger" : d < 10 ? "text-warning" : "text-success"; }
function hstkBg(d: number) { return d < 5 ? "bg-danger" : d < 10 ? "bg-warning" : "bg-success"; }

interface Props { scale: number }

export function InventorySSTab({ scale: s }: Props) {
  const navigate = useNavigate();
  const [invChartFilter, setInvChartFilter] = useState("all");
  const [drillCn, setDrillCn] = useState<string | null>(null);
  const [expandedBridge, setExpandedBridge] = useState<string | null>(null);
  const [simOpen, setSimOpen] = useState(false);
  const [simSku, setSimSku] = useState<SsSkuRow | null>(null);
  const [simZ, setSimZ] = useState(1.65);

  const cnData = baseCnData.map((r) => ({
    ...r,
    ton: Math.round(r.ton * s), available: Math.round(r.available * s),
    ssTarget: Math.round(r.ssTarget * s), ssActual: Math.round(r.ssActual * s),
    ssGap: Math.round(r.ssGap * s), replenish: Math.round(r.replenish * s),
    skus: r.skus.map((sk) => ({
      ...sk,
      demand: Math.round(sk.demand * s), ton: Math.round(sk.ton * s),
      pipeline: Math.round(sk.pipeline * s), ssTarget: Math.round(sk.ssTarget * s),
      ssGap: Math.round(sk.ssGap * s), netReq: Math.round(sk.netReq * s),
      moq: Math.round(sk.moq * s), order: Math.round(sk.order * s),
      onHand: Math.round(sk.onHand * s), fcPhased: Math.round(sk.fcPhased * s),
      cnAdj: Math.round(sk.cnAdj * s), po: Math.round(sk.po * s), overlap: Math.round(sk.overlap * s),
    })),
  }));

  const totalTon = cnData.reduce((a, r) => a + r.ton, 0);
  const totalAvail = cnData.reduce((a, r) => a + r.available, 0);
  const totalSsTarget = cnData.reduce((a, r) => a + r.ssTarget, 0);
  const totalSsGap = cnData.reduce((a, r) => a + r.ssGap, 0);
  const cnBelowSs = cnData.filter((r) => r.ssGap < 0).length;
  const activeCn = drillCn ? cnData.find((r) => r.cn === drillCn) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ═══ SECTION A: Bức tranh tồn kho ═══ */}
      <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-body font-semibold text-text-1">Bức tranh tồn kho</h3>
          <Select value={invChartFilter} onValueChange={setInvChartFilter}>
            <SelectTrigger className="w-36 h-8 text-table-sm bg-surface-0 border-surface-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả CN</SelectItem>
              <SelectItem value="CN-BD">CN-BD</SelectItem>
              <SelectItem value="CN-ĐN">CN-ĐN</SelectItem>
              <SelectItem value="CN-HN">CN-HN</SelectItem>
              <SelectItem value="CN-CT">CN-CT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-5">
          {/* Chart */}
          <div className="flex-1 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getInvTrend(invChartFilter)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--color-text-3)" }} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: "var(--color-text-3)" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value: number) => `${value.toLocaleString()} m²`} />
                <Area type="monotone" dataKey="available" name="Available" stackId="1" stroke="#00714d" fill="#00714d" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="reserved" name="Reserved + Committed" stackId="1" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.12} strokeWidth={1.5} />
                <Area type="monotone" dataKey="ss" name="SS Target" stroke="#991b1b" fill="none" strokeWidth={1.5} strokeDasharray="6 3" />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-2 text-[10px] text-text-3">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#00714d] rounded" /> Available</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#94a3b8] rounded" /> Reserved</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded" style={{ borderTop: "1.5px dashed #991b1b" }} /> SS Target</span>
            </div>
          </div>
          {/* Mini KPIs */}
          <div className="w-48 flex flex-col gap-2 shrink-0">
            {[
              { label: "Tổng tồn", value: `${totalTon.toLocaleString()} m²`, color: "text-text-1" },
              { label: "Available", value: `${totalAvail.toLocaleString()}`, color: "text-success" },
              { label: "SS target", value: `${totalSsTarget.toLocaleString()}`, color: "text-text-2" },
              { label: "SS gap", value: `${totalSsGap >= 0 ? "+" : ""}${totalSsGap.toLocaleString()} ${cnBelowSs > 0 ? "🔴" : "🟢"}`, color: totalSsGap < 0 ? "text-danger" : "text-success", sub: cnBelowSs > 0 ? `${cnBelowSs} CN dưới SS` : "Tất cả đủ SS" },
            ].map((k) => (
              <div key={k.label} className="rounded-lg border border-surface-3 bg-surface-0 px-3 py-2">
                <div className="text-[10px] uppercase text-text-3">{k.label}</div>
                <div className={cn("font-mono font-bold tabular-nums text-[15px]", k.color)}>{k.value}</div>
                {k.sub && <div className="text-[10px] text-text-3">{k.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ SECTION B: 2-layer table ═══ */}
      {!activeCn ? (
        <div className="rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-3 border-b border-surface-3 flex items-center justify-between">
            <h3 className="font-display text-body font-semibold text-text-1">Tồn kho & SS per CN → per SKU</h3>
            <LogicLink tab="ss" node={0} tooltip="Công thức SS" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  <th className="w-10 px-3 py-2.5" />
                  {["CN", "Tồn", "Available", "SS target", "SS actual", "SS gap", "HSTK", "Replenish need", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cnData.map((r) => (
                  <tr key={r.cn}
                    className={cn("border-b border-surface-3/50 cursor-pointer hover:bg-surface-1/30 transition-colors", r.ssGap < 0 && "bg-danger-bg/20")}
                    onClick={() => r.skus.length > 0 && setDrillCn(r.cn)}
                  >
                    <td className="px-3 py-3 text-text-3">{r.skus.length > 0 && <ChevronRight className="h-4 w-4" />}</td>
                    <td className="px-3 py-3 text-table font-medium text-text-1">{r.cn}</td>
                    <td className="px-3 py-3 text-table tabular-nums text-text-1">{r.ton.toLocaleString()}</td>
                    <td className="px-3 py-3 text-table tabular-nums text-text-2">{r.available.toLocaleString()}</td>
                    <td className="px-3 py-3 text-table tabular-nums text-text-3">{r.ssTarget.toLocaleString()}</td>
                    <td className="px-3 py-3 text-table tabular-nums text-text-2">{r.ssActual.toLocaleString()}</td>
                    <td className="px-3 py-3 text-table tabular-nums">
                      <span className={cn("font-medium", r.ssGap < 0 ? "text-danger" : "text-success")}>
                        {r.ssGap >= 0 ? "+" : ""}{r.ssGap.toLocaleString()} {r.ssGap < 0 ? "🔴" : "🟢"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-2 rounded-full bg-surface-3 overflow-hidden">
                          <div className={cn("h-full rounded-full", hstkBg(r.hstk))} style={{ width: `${Math.min((r.hstk / 20) * 100, 100)}%` }} />
                        </div>
                        <span className={cn("text-table-sm font-medium tabular-nums", hstkColor(r.hstk))}>{r.hstk}d</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-table tabular-nums text-text-1">{r.replenish.toLocaleString()} m²</td>
                    <td className="px-3 py-3">
                      <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium",
                        r.status === "THIẾU SS" ? "bg-danger-bg text-danger" :
                        r.status === "THỪA" ? "bg-info-bg text-info" :
                        "bg-success-bg text-success"
                      )}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ═══ Lớp 2: per SKU + Bridge ═══ */
        <div className="space-y-3">
          <button onClick={() => { setDrillCn(null); setExpandedBridge(null); }} className="text-table-sm text-primary hover:underline flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Per CN
          </button>
          <p className="text-caption text-text-3">
            Per CN › <span className="text-text-1 font-medium">{activeCn.cn}</span>
            {" "}(SS gap <span className={cn("font-medium", activeCn.ssGap < 0 ? "text-danger" : "text-success")}>{activeCn.ssGap >= 0 ? "+" : ""}{activeCn.ssGap.toLocaleString()}</span>, HSTK {activeCn.hstk}d)
          </p>
          <div className="rounded-card border border-surface-3 bg-surface-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["Item", "Variant", "Demand", "Tồn", "Pipeline", "SS target", "SS gap", "Net req", "MOQ", "Order", "Status", ""].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCn.skus.map((sk) => {
                    const key = `${sk.item}-${sk.variant}`;
                    const bridgeOpen = expandedBridge === key;
                    return (
                      <>
                        <tr key={key} className={cn("border-b border-surface-3/50 hover:bg-surface-1/30", sk.ssGap < 0 && "bg-danger-bg/10")}>
                          <td className="px-3 py-2.5 text-table font-medium text-text-1">{sk.item}</td>
                          <td className="px-3 py-2.5 text-table text-text-2">{sk.variant}</td>
                          <td className="px-3 py-2.5 text-table tabular-nums text-text-1">{sk.demand.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-table tabular-nums text-text-1">{sk.ton.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-table tabular-nums text-text-2">{sk.pipeline > 0 ? sk.pipeline.toLocaleString() : "—"}</td>
                          <td className="px-3 py-2.5 text-table tabular-nums text-text-3">{sk.ssTarget.toLocaleString()}</td>
                          <td className="px-3 py-2.5 text-table tabular-nums">
                            <span className={cn("font-medium", sk.ssGap < 0 ? "text-danger" : "text-success")}>
                              {sk.ssGap >= 0 ? "+" : ""}{sk.ssGap.toLocaleString()} {sk.ssGap < 0 ? "🔴" : "🟢"}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-table tabular-nums text-text-1">{sk.netReq > 0 ? sk.netReq.toLocaleString() : "—"}</td>
                          <td className="px-3 py-2.5 text-table tabular-nums text-text-3">{sk.moq > 0 ? sk.moq.toLocaleString() : "—"}</td>
                          <td className="px-3 py-2.5 text-table tabular-nums font-bold text-text-1">{sk.order > 0 ? sk.order.toLocaleString() : "—"}</td>
                          <td className="px-3 py-2.5">
                            <span className={cn("text-caption font-medium",
                              sk.status.includes("draft") ? "text-warning" :
                              sk.status.includes("Pending") ? "text-info" :
                              sk.status.includes("✅") ? "text-success" : "text-text-2"
                            )}>{sk.status}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            {sk.order > 0 && (
                              <button
                                onClick={() => setExpandedBridge(bridgeOpen ? null : key)}
                                className="text-primary text-table-sm font-medium hover:underline flex items-center gap-0.5"
                              >
                                Bridge {bridgeOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                              </button>
                            )}
                          </td>
                        </tr>
                        {bridgeOpen && (
                          <tr key={`${key}-bridge`}>
                            <td colSpan={12} className="px-4 py-3 bg-surface-0">
                              <DemandToOrderBridge
                                item={sk.item}
                                variant={sk.variant}
                                cn={activeCn.cn}
                                steps={buildFullBridgeSteps({
                                  demand: sk.demand, fcPhased: sk.fcPhased, cnAdj: sk.cnAdj, po: sk.po, overlap: sk.overlap,
                                  onHand: sk.onHand, pipeline: sk.pipeline, pipelineSource: sk.pipelineSource,
                                  ssTarget: sk.ssTarget, zVal: sk.zVal, sigma: sk.sigma, lt: sk.lt,
                                  moq: sk.moq, moqNm: sk.moqNm, finalOrder: sk.order, rpoNum: sk.rpoNum,
                                })}
                                footer={{
                                  demandQty: sk.demand, orderQty: sk.order,
                                  reasons: [
                                    { label: `+${sk.ssTarget} SS buffer`, value: `dự phòng forecast sai` },
                                    sk.pipeline > 0 ? { label: `−${sk.pipeline} pipeline`, value: `hàng đang về` } : null,
                                    sk.moq > 0 ? { label: `MOQ round ${sk.moqNm}`, value: `min ${sk.moq.toLocaleString()}/container` } : null,
                                  ].filter(Boolean) as { label: string; value: string }[]
                                }}
                              />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Summary strip */}
            <div className="px-5 py-3 border-t border-surface-3 bg-surface-1/30 text-table-sm text-text-2">
              <span className="font-medium text-text-1">{activeCn.cn}:</span>
              {" "}{activeCn.skus.filter(sk => sk.order > 0).length}/{activeCn.skus.length} SKU cần đặt NM.
              {" "}Tổng order: <span className="font-bold text-text-1">{activeCn.skus.reduce((a, sk) => a + sk.order, 0).toLocaleString()}m²</span>.
              {" "}{activeCn.skus.filter(sk => sk.ssGap < 0).length > 0 && (
                <span className="text-danger font-medium">
                  {activeCn.skus.filter(sk => sk.ssGap < 0).length} SKU thiếu SS ({activeCn.skus.filter(sk => sk.ssGap < 0).map(sk => `${sk.item} ${sk.variant}`).join(", ")}).
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ SECTION C: SS Management ═══ */}
      <div className="rounded-card border border-surface-3 bg-surface-2">
        <div className="px-5 py-3 border-b border-surface-3 flex items-center justify-between">
          <h3 className="font-display text-body font-semibold text-text-1">SS Management</h3>
          <div className="flex items-center gap-2">
            <LogicLink tab="ss" node={0} tooltip="Công thức SS" />
            <span className="text-caption text-text-3">z=1.65 (95%)</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                {["Item", "Variant", "SS hiện", "Formula", "SS đề xuất", "Δ", "WC impact", ""].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ssBdSkus.map((r, i) => (
                <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-surface-1/30", r.delta !== 0 && (r.delta > 0 ? "bg-warning-bg/10" : "bg-success-bg/10"))}>
                  <td className="px-4 py-2.5 text-table font-medium text-text-1">{r.item}</td>
                  <td className="px-4 py-2.5 text-table text-text-2">{r.variant}</td>
                  <td className="px-4 py-2.5 text-table tabular-nums text-text-1">{r.ssCurrent.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-table text-text-3 font-mono text-[11px]">
                    z({r.z})×σ({r.sigma})×√{r.lt}
                  </td>
                  <td className="px-4 py-2.5 text-table tabular-nums font-bold text-text-1">
                    {r.ssProposed.toLocaleString()}
                    {r.delta !== 0 && (
                      <span className={cn("ml-1 text-caption font-medium", r.delta > 0 ? "text-warning" : "text-success")}>
                        ({r.delta > 0 ? "+" : ""}{Math.round(r.delta / r.ssCurrent * 100)}%)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-table tabular-nums">
                    <span className={cn("font-medium", r.delta > 0 ? "text-warning" : r.delta < 0 ? "text-success" : "text-text-3")}>
                      {r.delta > 0 ? "+" : ""}{r.delta}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-table tabular-nums text-text-2">{r.wcImpact}</td>
                  <td className="px-4 py-2.5 flex items-center gap-1.5">
                    {r.delta !== 0 && (
                      <Button size="sm" variant="default" className="text-caption h-7 bg-text-1 text-surface-0 hover:bg-text-2"
                        onClick={() => toast.success("Gửi Workspace duyệt", { description: `SS ${r.item} ${r.variant}: ${r.ssCurrent}→${r.ssProposed}` })}>
                        Áp dụng
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-caption h-7"
                      onClick={() => { setSimSku(r); setSimZ(r.z); setSimOpen(true); }}>
                      Mô phỏng
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="px-5 py-3 border-t border-surface-3 bg-surface-1/30 space-y-1.5">
          <p className="text-table-sm text-text-2">
            Tổng SS: <span className="font-bold text-text-1">{totalSsTarget.toLocaleString()}m²</span> = <span className="font-bold text-text-1">1.646M₫</span> WC.
            {" "}Nếu FC accuracy cải thiện 25%→15% → SS giảm 42% → tiết kiệm <span className="text-success font-bold">691M₫</span>.
          </p>
          <button onClick={() => navigate("/logic?tab=ss&node=0")} className="text-caption text-info font-medium hover:underline">
            Xem logic chi tiết tại /logic tab 4 Safety Stock →
          </button>
        </div>
      </div>

      {/* ═══ Simulation Modal ═══ */}
      <Dialog open={simOpen} onOpenChange={setSimOpen}>
        <DialogContent className="bg-surface-2 border-surface-3 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-text-1">Mô phỏng SS</DialogTitle>
            <DialogDescription className="text-text-2 text-table">
              {simSku ? `${simSku.item} ${simSku.variant}` : ""}
            </DialogDescription>
          </DialogHeader>
          {simSku && (
            <div className="space-y-4">
              <div>
                <label className="text-table-sm font-medium text-text-2 mb-2 block">
                  z-score (Service Level): <span className="font-bold text-primary">{simZ.toFixed(2)}</span>
                  {" "}({Math.round((1 - 1 / Math.pow(10, simZ * 0.4343)) * 100) > 99 ? ">99" : simZ <= 1.28 ? "90" : simZ <= 1.65 ? "95" : simZ <= 2.05 ? "98" : "99"}%)
                </label>
                <Slider
                  min={100} max={260} step={5}
                  value={[Math.round(simZ * 100)]}
                  onValueChange={(v) => setSimZ(v[0] / 100)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-surface-3 bg-surface-0 p-3 text-center">
                  <div className="text-[10px] uppercase text-text-3">Before</div>
                  <div className="font-mono font-bold text-[18px] text-text-1">{simSku.ssCurrent.toLocaleString()}</div>
                  <div className="text-caption text-text-3">z={simSku.z}</div>
                </div>
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
                  <div className="text-[10px] uppercase text-primary">After</div>
                  <div className="font-mono font-bold text-[18px] text-primary">
                    {Math.round(simSku.ssCurrent * (simZ / simSku.z)).toLocaleString()}
                  </div>
                  <div className="text-caption text-text-3">z={simZ.toFixed(2)}</div>
                </div>
              </div>
              <div className="space-y-1.5 text-table-sm">
                <div className="flex justify-between text-text-2">
                  <span>WC impact</span>
                  {(() => {
                    const newSs = Math.round(simSku.ssCurrent * (simZ / simSku.z));
                    const delta = newSs - simSku.ssCurrent;
                    return <span className={cn("font-medium", delta > 0 ? "text-danger" : "text-success")}>{delta > 0 ? "+" : ""}{Math.round(delta * 18.5 / 1000)}M₫</span>;
                  })()}
                </div>
                <div className="flex justify-between text-text-2">
                  <span>Stockout risk</span>
                  <span className={cn("font-medium", simZ >= 1.65 ? "text-success" : "text-warning")}>{simZ >= 2.05 ? "~1%" : simZ >= 1.65 ? "~5%" : simZ >= 1.28 ? "~10%" : ">10%"}</span>
                </div>
              </div>
              <Button className="w-full bg-gradient-primary text-primary-foreground"
                onClick={() => {
                  toast.success("Gửi Workspace duyệt", { description: `z=${simZ.toFixed(2)} → SS ${Math.round(simSku.ssCurrent * (simZ / simSku.z)).toLocaleString()}` });
                  setSimOpen(false);
                }}>
                Áp dụng → Workspace duyệt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

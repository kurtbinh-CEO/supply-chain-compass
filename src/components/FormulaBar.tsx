import { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

/* ═══ TYPES ═══ */
export interface FormulaBarProps {
  demand: number;
  stock: number;
  pipeline: number;
  ssBuffer: number;
  /** Optional detail data overrides — component uses defaults if not provided */
  demandDetail?: DemandDetail;
  stockDetail?: StockDetailRow[];
  pipelineDetail?: PipelineRow[];
  netPerCn?: NetPerCnRow[];
  ssParams?: SsParam[];
  fcMinNm?: FcMinNmRow[];
}

interface DemandDetail {
  rows: { source: string; qty: number; pct: number; detail: string; updated: string; link?: string }[];
}

interface StockDetailRow {
  cn: string; onHand: number; reserved: number; available: number; hstk: number; updated: string;
}

interface PipelineRow {
  rpo: string; nm: string; item: string; qty: number; shipDate: string; eta: string; status: string;
}

interface NetPerCnRow {
  cn: string; demand: number; stock: number; pipeline: number; net: number;
}

interface SsParam {
  param: string; value: string; source: string; link?: string;
}

interface FcMinNmRow {
  nm: string; fcMin: number; moq: number; afterRound: number; sharePct: number; committed: number;
}

/* ═══ DEFAULT DATA ═══ */
const defaultDemandDetail: DemandDetail = {
  rows: [
    { source: "FC Statistical", qty: 4800, pct: 63, detail: "HW, 24M history, MAPE 18,4%", updated: "10/05 auto" },
    { source: "B2B Weighted", qty: 2200, pct: 29, detail: "12 deals × prob%", updated: "12/05 Sales", link: "/demand" },
    { source: "PO Confirmed", qty: 1100, pct: 14, detail: "8 PO từ Bravo", updated: "13/05 14:32", link: "/orders" },
    { source: "Overlap", qty: -450, pct: -6, detail: "PO đã tính trong B2B → trừ", updated: "Auto" },
  ],
};

const defaultStockDetail: StockDetailRow[] = [
  { cn: "CN-BD", onHand: 2100, reserved: 750, available: 450, hstk: 5.2, updated: "14:32 WMS" },
  { cn: "CN-ĐN", onHand: 4500, reserved: 700, available: 1200, hstk: 14, updated: "14:32 WMS" },
  { cn: "CN-HN", onHand: 3200, reserved: 400, available: 800, hstk: 9, updated: "14:32 WMS" },
  { cn: "CN-CT", onHand: 2800, reserved: 50, available: 750, hstk: 11, updated: "14:32 WMS" },
];

const defaultPipelineDetail: PipelineRow[] = [
  { rpo: "RPO-MKD-W15-002", nm: "Mikado", item: "GA-600 A4", qty: 1200, shipDate: "08/05", eta: "17/05", status: "Shipped 🟢" },
  { rpo: "RPO-TKO-W15-001", nm: "Toko", item: "GA-300 A4", qty: 557, shipDate: "05/05", eta: "09/05 TRỄ 4d", status: "Late 🔴" },
];

const defaultNetPerCn: NetPerCnRow[] = [
  { cn: "CN-BD", demand: 2550, stock: 450, pipeline: 557, net: 1543 },
  { cn: "CN-ĐN", demand: 1800, stock: 1200, pipeline: 400, net: 200 },
  { cn: "CN-HN", demand: 2100, stock: 800, pipeline: 500, net: 800 },
  { cn: "CN-CT", demand: 1200, stock: 750, pipeline: 300, net: 150 },
];

const defaultSsParams: SsParam[] = [
  { param: "z (service level)", value: "1.65 (95%)", source: "/config", link: "/drp" },
  { param: "σ_fc_error", value: "28.5", source: "12W FC vs actual" },
  { param: "LT mean", value: "14 ngày", source: "/master-data", link: "/master-data" },
];

const defaultFcMinNm: FcMinNmRow[] = [
  { nm: "Mikado", fcMin: 2293, moq: 1000, afterRound: 3000, sharePct: 30, committed: 5500 },
  { nm: "Toko", fcMin: 1200, moq: 500, afterRound: 1500, sharePct: 32, committed: 6000 },
];

/* ═══ HELPERS ═══ */
function hstkColor(d: number) { return d < 5 ? "text-danger" : d < 10 ? "text-warning" : "text-success"; }

type CardKey = "demand" | "stock" | "pipeline" | "net" | "ss" | "fcmin";

export function FormulaBar({
  demand, stock, pipeline, ssBuffer,
  demandDetail = defaultDemandDetail,
  stockDetail = defaultStockDetail,
  pipelineDetail = defaultPipelineDetail,
  netPerCn = defaultNetPerCn,
  ssParams = defaultSsParams,
  fcMinNm = defaultFcMinNm,
}: FormulaBarProps) {
  const navigate = useNavigate();
  const net = Math.max(0, demand - stock - pipeline);
  const fcMin = net + ssBuffer;
  const [activeCard, setActiveCard] = useState<CardKey | null>(null);
  const [hasClicked, setHasClicked] = useState(false);

  const handleClick = (key: CardKey) => {
    setHasClicked(true);
    setActiveCard(activeCard === key ? null : key);
  };

  const cards: { key: CardKey; label: string; value: number; bg: string; text: string; prefix?: string }[] = [
    { key: "demand", label: "DEMAND", value: demand, bg: "bg-info-bg", text: "text-info" },
    { key: "stock", label: "STOCK", value: stock, bg: "bg-success-bg", text: "text-success", prefix: "−" },
    { key: "pipeline", label: "PIPELINE", value: pipeline, bg: "bg-success-bg", text: "text-success", prefix: "−" },
    { key: "net", label: "NET", value: net, bg: "bg-warning-bg", text: "text-warning", prefix: "=" },
    { key: "ss", label: "SS BUFFER", value: ssBuffer, bg: "bg-warning-bg", text: "text-warning", prefix: "+" },
    { key: "fcmin", label: "FC MIN", value: fcMin, bg: "bg-danger-bg", text: "text-danger", prefix: "=" },
  ];

  const totalDemand = demandDetail.rows.reduce((a, r) => a + r.qty, 0);

  return (
    <div className="space-y-0">
      {/* ── Cards row ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-wrap">
        {cards.map((c, i) => (
          <div key={c.key} className="flex items-center gap-1.5">
            {i > 0 && c.prefix && (
              <span className="text-text-3 font-bold text-lg flex-shrink-0">{c.prefix}</span>
            )}
            <button
              onClick={() => handleClick(c.key)}
              className={cn(
                "rounded-card border px-4 py-2.5 flex-shrink-0 min-w-[110px] text-left transition-all duration-100",
                c.bg,
                activeCard === c.key
                  ? "border-2 border-info shadow-[0_0_0_3px_rgba(37,99,235,0.15)] ring-0"
                  : "border-surface-3 hover:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
              )}
            >
              <div className="text-[8px] uppercase tracking-wider text-text-3 font-medium">{c.label}</div>
              <div className={cn("font-display text-[22px] font-medium tabular-nums leading-tight", c.text)}>
                {c.value.toLocaleString()}
              </div>
              {!hasClicked && (
                <div className="text-[7px] text-text-3 mt-0.5">click xem nguồn</div>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* ── Detail Panel ── */}
      {activeCard && (
        <div className="rounded-card border border-surface-3 bg-surface-2 mt-2 overflow-hidden animate-slide-in-left" style={{ animationDuration: "150ms" }}>
          {/* DEMAND */}
          {activeCard === "demand" && (
            <div className="p-4 space-y-3">
              <h4 className="font-display text-table font-semibold text-text-1">DEMAND {demand.toLocaleString()}</h4>
              {/* Stacked bar */}
              <div className="flex h-5 rounded-full overflow-hidden">
                {demandDetail.rows.filter(r => r.qty > 0).map((r) => (
                  <div key={r.source} className={cn("h-full flex items-center justify-center text-[9px] font-bold text-white",
                    r.source.includes("FC") ? "bg-primary" : r.source.includes("B2B") ? "bg-success" : "bg-info"
                  )} style={{ width: `${(r.qty / totalDemand) * 100}%` }}>
                    {r.pct}%
                  </div>
                ))}
              </div>
              <table className="w-full text-table-sm">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["Nguồn", "Qty (m²)", "%", "Chi tiết", "Cập nhật"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demandDetail.rows.map((r) => (
                    <tr key={r.source} className="border-b border-surface-3/50">
                      <td className="px-3 py-2 font-medium text-text-1">{r.source}</td>
                      <td className={cn("px-3 py-2 tabular-nums", r.qty < 0 ? "text-danger" : "text-text-1")}>{r.qty.toLocaleString()}</td>
                      <td className="px-3 py-2 tabular-nums text-text-2">{r.pct}%</td>
                      <td className="px-3 py-2 text-text-2">
                        {r.detail}
                        {r.link && (
                          <button onClick={() => navigate(r.link!)} className="ml-1 text-primary font-medium hover:underline">
                            [Xem →]
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 text-text-3">{r.updated}</td>
                    </tr>
                  ))}
                  <tr className="bg-surface-1/50 font-semibold">
                    <td className="px-3 py-2 text-text-1">TOTAL</td>
                    <td className="px-3 py-2 tabular-nums text-text-1">{demand.toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums text-text-1">100%</td>
                    <td className="px-3 py-2">
                      <button onClick={() => navigate("/demand")} className="text-primary font-medium hover:underline text-table-sm">
                        Per CN → /demand tab 1
                      </button>
                    </td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* STOCK */}
          {activeCard === "stock" && (
            <div className="p-4 space-y-3">
              <h4 className="font-display text-table font-semibold text-text-1">STOCK {stock.toLocaleString()}</h4>
              <table className="w-full text-table-sm">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["CN", "On-hand", "Reserved", "Available", "HSTK", "Cập nhật"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stockDetail.map((r) => (
                    <tr key={r.cn} className="border-b border-surface-3/50">
                      <td className="px-3 py-2 font-medium text-text-1">{r.cn}</td>
                      <td className="px-3 py-2 tabular-nums text-text-1">{r.onHand.toLocaleString()}</td>
                      <td className="px-3 py-2 tabular-nums text-text-2">{r.reserved.toLocaleString()}</td>
                      <td className="px-3 py-2 tabular-nums text-text-1 font-medium">{r.available.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <span className={cn("tabular-nums font-medium", hstkColor(r.hstk))}>
                          {r.hstk}d {r.hstk < 7 ? "🔴" : "🟢"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-text-3">{r.updated}</td>
                    </tr>
                  ))}
                  <tr className="bg-surface-1/50 font-semibold">
                    <td className="px-3 py-2 text-text-1">TOTAL</td>
                    <td className="px-3 py-2 tabular-nums text-text-1">{stockDetail.reduce((a, r) => a + r.onHand, 0).toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums text-text-1">{stockDetail.reduce((a, r) => a + r.reserved, 0).toLocaleString()}</td>
                    <td className="px-3 py-2 tabular-nums text-text-1">{stock.toLocaleString()}</td>
                    <td></td>
                    <td className="px-3 py-2">
                      <button onClick={() => navigate("/monitoring")} className="text-primary font-medium hover:underline text-table-sm">
                        → /monitoring tab 2
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="rounded bg-surface-0 border border-surface-3 p-3 font-mono text-[12px] text-text-2 leading-relaxed">
                Stock = Σ(on_hand − reserved) per CN = {stock.toLocaleString()}
              </div>
            </div>
          )}

          {/* PIPELINE */}
          {activeCard === "pipeline" && (
            <div className="p-4 space-y-3">
              <h4 className="font-display text-table font-semibold text-text-1">PIPELINE {pipeline.toLocaleString()}</h4>
              <table className="w-full text-table-sm">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["RPO#", "NM", "Item", "Qty", "Ship date", "ETA", "Status"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pipelineDetail.map((r) => (
                    <tr key={r.rpo} className="border-b border-surface-3/50">
                      <td className="px-3 py-2 font-mono text-[11px] text-primary">{r.rpo}</td>
                      <td className="px-3 py-2 font-medium text-text-1">{r.nm}</td>
                      <td className="px-3 py-2 text-text-2">{r.item}</td>
                      <td className="px-3 py-2 tabular-nums text-text-1">{r.qty.toLocaleString()}</td>
                      <td className="px-3 py-2 tabular-nums text-text-2">{r.shipDate}</td>
                      <td className="px-3 py-2 tabular-nums text-text-2">{r.eta}</td>
                      <td className="px-3 py-2 text-table-sm">{r.status}</td>
                    </tr>
                  ))}
                  <tr className="bg-surface-1/50 font-semibold">
                    <td className="px-3 py-2 text-text-1">TOTAL</td>
                    <td colSpan={2}></td>
                    <td className="px-3 py-2 tabular-nums text-text-1">{pipeline.toLocaleString()}</td>
                    <td colSpan={2}></td>
                    <td className="px-3 py-2">
                      <button onClick={() => navigate("/orders")} className="text-primary font-medium hover:underline text-table-sm">
                        → /orders tab 2
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="rounded bg-surface-0 border border-surface-3 p-3 font-mono text-[12px] text-text-2 leading-relaxed">
                Pipeline = Σ(RPO shipped, chưa received) = {pipeline.toLocaleString()}
              </div>
            </div>
          )}

          {/* NET */}
          {activeCard === "net" && (
            <div className="p-4 space-y-3">
              <h4 className="font-display text-table font-semibold text-text-1">NET {net.toLocaleString()}</h4>
              <div className="rounded bg-surface-0 border border-surface-3 p-4 font-mono text-[12px] text-text-2 leading-loose whitespace-pre">
{`Net = Demand − Stock − Pipeline
    = ${demand.toLocaleString()} − ${stock.toLocaleString()} − ${pipeline.toLocaleString()}
    = ${net.toLocaleString()} m²

Per CN:
${netPerCn.map(r => `  ${r.cn}: ${r.demand.toLocaleString()} − ${r.stock.toLocaleString()} − ${r.pipeline.toLocaleString()} = ${r.net.toLocaleString()}`).join("\n")}
  Total = ${net.toLocaleString()}`}
              </div>
            </div>
          )}

          {/* SS BUFFER */}
          {activeCard === "ss" && (
            <div className="p-4 space-y-3">
              <h4 className="font-display text-table font-semibold text-text-1">SS BUFFER {ssBuffer.toLocaleString()}</h4>
              <div className="rounded bg-surface-0 border border-surface-3 p-4 font-mono text-[12px] text-text-2 leading-loose whitespace-pre">
{`SS = z × σ_fc_error × √LT
   = 1.65 × 28.5 × √14
   = 1.65 × 28.5 × 3.74
   = 176 m²/SKU avg

Total SS buffer needed ≈ ${ssBuffer.toLocaleString()} m²`}
              </div>
              <table className="w-full text-table-sm">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["Param", "Value", "Nguồn", "Điều chỉnh"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ssParams.map((p) => (
                    <tr key={p.param} className="border-b border-surface-3/50">
                      <td className="px-3 py-2 font-mono text-[11px] text-text-1">{p.param}</td>
                      <td className="px-3 py-2 tabular-nums font-medium text-text-1">{p.value}</td>
                      <td className="px-3 py-2 text-text-2">{p.source}</td>
                      <td className="px-3 py-2">
                        {p.link && (
                          <button onClick={() => navigate(p.link!)} className="text-primary font-medium hover:underline text-table-sm">
                            Thay đổi →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* FC MIN */}
          {activeCard === "fcmin" && (
            <div className="p-4 space-y-3">
              <h4 className="font-display text-table font-semibold text-text-1">FC MIN {fcMin.toLocaleString()}</h4>
              <div className="rounded bg-surface-0 border border-surface-3 p-3 font-mono text-[12px] text-text-2 leading-relaxed">
                FC Min = Net + SS Buffer = {net.toLocaleString()} + {ssBuffer.toLocaleString()} = {fcMin.toLocaleString()}
              </div>
              <table className="w-full text-table-sm">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["NM", "FC Min", "MOQ", "Sau round", "Share%", "Committed"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fcMinNm.map((r) => (
                    <tr key={r.nm} className="border-b border-surface-3/50">
                      <td className="px-3 py-2 font-medium text-text-1">{r.nm}</td>
                      <td className="px-3 py-2 tabular-nums text-text-1">{r.fcMin.toLocaleString()}</td>
                      <td className="px-3 py-2 tabular-nums text-text-2">{r.moq.toLocaleString()}</td>
                      <td className="px-3 py-2 tabular-nums font-medium text-text-1">{r.afterRound.toLocaleString()}</td>
                      <td className="px-3 py-2 tabular-nums text-text-2">{r.sharePct}%</td>
                      <td className="px-3 py-2 tabular-nums text-text-2">{r.committed.toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-surface-1/50 font-semibold">
                    <td className="px-3 py-2 text-text-1">TOTAL</td>
                    <td className="px-3 py-2 tabular-nums text-text-1">{fcMinNm.reduce((a, r) => a + r.fcMin, 0).toLocaleString()}</td>
                    <td></td>
                    <td className="px-3 py-2 tabular-nums text-text-1">{fcMinNm.reduce((a, r) => a + r.afterRound, 0).toLocaleString()}</td>
                    <td></td>
                    <td className="px-3 py-2 tabular-nums text-text-1">{fcMinNm.reduce((a, r) => a + r.committed, 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
              <button onClick={() => navigate("/hub")} className="text-primary text-table-sm font-medium hover:underline">
                Xem MOQ → /hub tab 1
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

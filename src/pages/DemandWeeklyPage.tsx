import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { useTenant } from "@/components/TenantContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronRight, Bell, Clock, Filter } from "lucide-react";
import { ClickableNumber } from "@/components/ClickableNumber";
import { LogicLink } from "@/components/LogicLink";
import { ViewPivotToggle, usePivotMode, CnGapBadge } from "@/components/ViewPivotToggle";

const tenantScales: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.7, "Mondelez": 1.35 };

interface SkuRow {
  item: string; variant: string; duKien: number; cnAdjust: number | null;
  adjustNote: string; adjustStatus: "approved" | "pending" | "none"; po: number; final: number;
}

interface CnRow {
  cn: string; duKien: number; cnAdjust: string; adjustDelta: number;
  po: number; final: number; status: string; statusColor: string; skus: SkuRow[];
}

const baseCnData: CnRow[] = [
  {
    cn: "CN-BD", duKien: 2142, cnAdjust: "+94 (3 SKU) ✅", adjustDelta: 94, po: 757, final: 2550,
    status: "Đã adjust", statusColor: "text-success",
    skus: [
      { item: "GA-300", variant: "A4", duKien: 524, cnAdjust: 44, adjustNote: "Nhà thầu mới", adjustStatus: "approved", po: 200, final: 568 },
      { item: "GA-300", variant: "B2", duKien: 151, cnAdjust: null, adjustNote: "", adjustStatus: "none", po: 0, final: 151 },
      { item: "GA-400", variant: "A4", duKien: 294, cnAdjust: -30, adjustNote: "Dự án delay", adjustStatus: "pending", po: 0, final: 264 },
      { item: "GA-600", variant: "A4", duKien: 748, cnAdjust: 80, adjustNote: "Vingroup tăng", adjustStatus: "approved", po: 500, final: 828 },
    ],
  },
  {
    cn: "CN-ĐN", duKien: 1512, cnAdjust: "—", adjustDelta: 0, po: 400, final: 1800,
    status: "Chưa adjust ⏳", statusColor: "text-warning",
    skus: [
      { item: "GA-300", variant: "A4", duKien: 600, cnAdjust: null, adjustNote: "", adjustStatus: "none", po: 200, final: 600 },
      { item: "GA-600", variant: "A4", duKien: 512, cnAdjust: null, adjustNote: "", adjustStatus: "none", po: 200, final: 512 },
    ],
  },
  {
    cn: "CN-HN", duKien: 1764, cnAdjust: "−50 (1 SKU) 🟡", adjustDelta: -50, po: 500, final: 2100,
    status: "Pending duyệt", statusColor: "text-info",
    skus: [
      { item: "GA-300", variant: "A4", duKien: 700, cnAdjust: null, adjustNote: "", adjustStatus: "none", po: 300, final: 700 },
      { item: "GA-600", variant: "A4", duKien: 564, cnAdjust: -50, adjustNote: "Khách hủy 1 lot", adjustStatus: "pending", po: 200, final: 514 },
    ],
  },
  {
    cn: "CN-CT", duKien: 1008, cnAdjust: "—", adjustDelta: 0, po: 300, final: 1200,
    status: "Chưa adjust ⏳", statusColor: "text-warning",
    skus: [
      { item: "GA-300", variant: "A4", duKien: 400, cnAdjust: null, adjustNote: "", adjustStatus: "none", po: 150, final: 400 },
      { item: "GA-600", variant: "B2", duKien: 308, cnAdjust: null, adjustNote: "", adjustStatus: "none", po: 150, final: 308 },
    ],
  },
];

export default function DemandWeeklyPage() {
  const { tenant } = useTenant();
  const s = tenantScales[tenant] || 1;
  const [drillCn, setDrillCn] = useState<string | null>(null);
  const [drillSku, setDrillSku] = useState<string | null>(null);
  const [pivotMode, setPivotMode] = usePivotMode("demand-weekly");

  const data = baseCnData.map((r) => ({
    ...r,
    duKien: Math.round(r.duKien * s), po: Math.round(r.po * s), final: Math.round(r.final * s),
    adjustDelta: Math.round(r.adjustDelta * s),
    skus: r.skus.map((sk) => ({
      ...sk, duKien: Math.round(sk.duKien * s), po: Math.round(sk.po * s), final: Math.round(sk.final * s),
      cnAdjust: sk.cnAdjust !== null ? Math.round(sk.cnAdjust * s) : null,
    })),
  }));

  const totalDuKien = data.reduce((a, r) => a + r.duKien, 0);
  const totalDelta = data.reduce((a, r) => a + r.adjustDelta, 0);
  const totalPo = data.reduce((a, r) => a + r.po, 0);
  const totalFinal = data.reduce((a, r) => a + r.final, 0);
  const doneCn = data.filter((r) => r.status === "Đã adjust").length;
  const activeCn = drillCn ? data.find((r) => r.cn === drillCn) : null;

  // SKU-first aggregation
  const skuAgg = useMemo(() => {
    const map: Record<string, { item: string; variant: string; totalDuKien: number; totalAdjust: number; totalPo: number; totalFinal: number;
      cnRows: { cn: string; duKien: number; cnAdjust: number | null; adjustNote: string; adjustStatus: string; po: number; final: number; status: string }[];
    }> = {};
    data.forEach(cn => {
      cn.skus.forEach(sk => {
        const key = `${sk.item}-${sk.variant}`;
        if (!map[key]) map[key] = { item: sk.item, variant: sk.variant, totalDuKien: 0, totalAdjust: 0, totalPo: 0, totalFinal: 0, cnRows: [] };
        map[key].totalDuKien += sk.duKien;
        map[key].totalAdjust += sk.cnAdjust ?? 0;
        map[key].totalPo += sk.po;
        map[key].totalFinal += sk.final;
        map[key].cnRows.push({ cn: cn.cn, duKien: sk.duKien, cnAdjust: sk.cnAdjust, adjustNote: sk.adjustNote, adjustStatus: sk.adjustStatus, po: sk.po, final: sk.final, status: cn.status });
      });
    });
    return Object.values(map).sort((a, b) => b.totalFinal - a.totalFinal);
  }, [data]);

  const drillSkuData = drillSku ? skuAgg.find(sk => `${sk.item}-${sk.variant}` === drillSku) : null;

  const handleApprove = (item: string) => {
    toast.success(`Đã duyệt adjust ${item}`);
  };
  const handleReject = (item: string) => {
    toast.error(`Đã từ chối adjust ${item}`);
  };

  return (
    <AppLayout>
      <ScreenHeader title="Demand tuần" subtitle="Điều chỉnh nhu cầu tuần" />

      {/* Header strip */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="flex items-center gap-1.5 rounded-full border border-warning bg-warning-bg px-3 py-1 text-table-sm font-medium text-warning">
          <Clock className="h-3.5 w-3.5" /> Cutoff 18:00 còn 3h
        </span>
        <button className="flex items-center gap-1.5 rounded-full border border-surface-3 bg-surface-2 px-3 py-1 text-table-sm text-text-2 hover:bg-surface-1">
          <Filter className="h-3.5 w-3.5" /> CN: Tất cả ▼
        </button>
      </div>

      {/* Pivot toggle */}
      <div className="flex items-center gap-3 mb-4">
        <ViewPivotToggle value={pivotMode} onChange={(m) => { setPivotMode(m); setDrillCn(null); setDrillSku(null); }} />
      </div>

      {drillSku && drillSkuData ? (
        /* SKU-first drill: per CN for selected SKU */
        <div className="animate-fade-in">
          <button onClick={() => setDrillSku(null)} className="text-table-sm text-primary hover:underline mb-3 flex items-center gap-1">← Per SKU</button>
          <p className="text-caption text-text-3 mb-3">Per SKU › <span className="text-text-1 font-medium">{drillSkuData.item} {drillSkuData.variant}</span> (final {drillSkuData.totalFinal.toLocaleString()} m²)</p>
          <div className="rounded-card border border-surface-3 bg-surface-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["CN", "Dự kiến", "CN adjust", "PO", "Final", "Status"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {drillSkuData.cnRows.map((c, i) => (
                    <tr key={c.cn} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                      <td className="px-4 py-3 text-table font-medium text-text-1">{c.cn}</td>
                      <td className="px-4 py-3 text-table tabular-nums text-text-2">{c.duKien.toLocaleString()}</td>
                      <td className="px-4 py-3 text-table tabular-nums">
                        {c.cnAdjust !== null ? (
                          <span className={cn(c.adjustStatus === "approved" ? "text-success" : "text-warning", "font-medium")}>
                            {c.cnAdjust >= 0 ? "+" : ""}{c.cnAdjust} {c.adjustStatus === "approved" ? "✅" : "🟡"}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-table tabular-nums text-text-2">{c.po.toLocaleString()}</td>
                      <td className="px-4 py-3 text-table tabular-nums font-semibold text-text-1">{c.final.toLocaleString()}</td>
                      <td className="px-4 py-3 text-table text-text-2">{c.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : pivotMode === "sku" && !activeCn ? (
        /* SKU-first Lớp 1 */
        <div className="rounded-card border border-surface-3 bg-surface-2 animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["Item", "Variant", "Dự kiến total", "Total adjust", "Total PO", "Final total", "# CN", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {skuAgg.map(sk => (
                  <tr key={`${sk.item}-${sk.variant}`} className="border-b border-surface-3/50 hover:bg-surface-1/30 cursor-pointer" onClick={() => setDrillSku(`${sk.item}-${sk.variant}`)}>
                    <td className="px-4 py-3 text-table font-medium text-text-1">{sk.item}</td>
                    <td className="px-4 py-3 text-table text-text-2">{sk.variant}</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-2">{sk.totalDuKien.toLocaleString()}</td>
                    <td className="px-4 py-3 text-table tabular-nums">
                      <span className={cn("font-medium", sk.totalAdjust > 0 ? "text-success" : sk.totalAdjust < 0 ? "text-danger" : "text-text-3")}>
                        {sk.totalAdjust > 0 ? "+" : ""}{sk.totalAdjust}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-2">{sk.totalPo.toLocaleString()}</td>
                    <td className="px-4 py-3 text-table tabular-nums font-semibold text-text-1">{sk.totalFinal.toLocaleString()}</td>
                    <td className="px-4 py-3"><CnGapBadge count={sk.cnRows.length} /></td>
                    <td className="px-4 py-3 text-text-3"><ChevronRight className="h-4 w-4" /></td>
                  </tr>
                ))}
                <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                  <td className="px-4 py-3 text-table text-text-1" colSpan={2}>TOTAL</td>
                  <td className="px-4 py-3 text-table tabular-nums">{skuAgg.reduce((a, s) => a + s.totalDuKien, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-table tabular-nums">{skuAgg.reduce((a, s) => a + s.totalAdjust, 0)}</td>
                  <td className="px-4 py-3 text-table tabular-nums">{skuAgg.reduce((a, s) => a + s.totalPo, 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-table tabular-nums">{skuAgg.reduce((a, s) => a + s.totalFinal, 0).toLocaleString()}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : !activeCn ? (
        <div className="rounded-card border border-surface-3 bg-surface-2 animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {[
                    { h: "CN", logic: null },
                    { h: "Dự kiến (m²)", logic: null },
                    { h: "CN điều chỉnh", logic: { tab: "daily" as const, node: 1, tip: "Logic CN điều chỉnh & tolerance" } },
                    { h: "PO xác nhận", logic: null },
                    { h: "Final demand", logic: { tab: "monthly" as const, node: 0, tip: "Logic xác định Demand" } },
                    { h: "Status", logic: null },
                    { h: "", logic: null },
                  ].map((col, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">
                      <span className="flex items-center gap-1">
                        {col.h}
                        {col.logic && <LogicLink tab={col.logic.tab} node={col.logic.node} tooltip={col.logic.tip} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.cn} className="border-b border-surface-3/50 hover:bg-surface-1/30 cursor-pointer" onClick={() => setDrillCn(r.cn)}>
                    <td className="px-4 py-3 text-table font-medium text-text-1">{r.cn}</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-2">{r.duKien.toLocaleString()}</td>
                    <td className="px-4 py-3 text-table text-text-1">
                      <ClickableNumber
                        value={r.cnAdjust}
                        label={`CN adjust ${r.cn}`}
                        color="text-text-1"
                        breakdown={r.skus.filter(sk => sk.cnAdjust !== null).map(sk => ({
                          label: `${sk.item} ${sk.variant}: ${sk.cnAdjust! >= 0 ? "+" : ""}${sk.cnAdjust}`,
                          value: sk.adjustNote,
                          detail: sk.adjustStatus === "approved" ? "✅ Approved" : "🟡 Pending",
                        }))}
                        note={r.adjustDelta !== 0 ? `${r.skus.filter(sk => sk.cnAdjust !== null).length} SKU adjusted` : undefined}
                      />
                    </td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-2">{r.po.toLocaleString()}</td>
                    <td className="px-4 py-3 text-table tabular-nums font-semibold text-text-1">
                      <ClickableNumber
                        value={r.final}
                        label={`Final ${r.cn}`}
                        color="font-semibold text-text-1"
                        formula={`Dự kiến ${r.duKien.toLocaleString()} + CN adjust ${r.adjustDelta >= 0 ? "+" : ""}${r.adjustDelta} + PO ${r.po.toLocaleString()} − overlap = ${r.final.toLocaleString()}`}
                        breakdown={r.skus.map(sk => ({
                          label: `${sk.item} ${sk.variant}`,
                          value: sk.final,
                          detail: `${sk.duKien} ${sk.cnAdjust !== null ? (sk.cnAdjust >= 0 ? "+" : "") + sk.cnAdjust : ""} ${sk.po > 0 ? "+ PO " + sk.po : ""}`,
                        }))}
                        links={[{ label: `→ /demand tab 1 ${r.cn}`, to: "/demand" }]}
                      />
                    </td>
                    <td className={cn("px-4 py-3 text-table font-medium", r.statusColor)}>{r.status}</td>
                    <td className="px-4 py-3 text-text-3"><ChevronRight className="h-4 w-4" /></td>
                  </tr>
                ))}
                <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                  <td className="px-4 py-3 text-table text-text-1">TOTAL</td>
                  <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalDuKien.toLocaleString()}</td>
                  <td className="px-4 py-3 text-table text-text-1">{totalDelta >= 0 ? "+" : ""}{totalDelta}</td>
                  <td className="px-4 py-3 text-table tabular-nums text-text-2">{totalPo.toLocaleString()}</td>
                  <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalFinal.toLocaleString()}</td>
                  <td className="px-4 py-3 text-table text-text-2">{doneCn}/{data.length} CN done</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          {doneCn < data.length && (
            <div className="px-5 py-3 border-t border-surface-3">
              <button
                onClick={() => toast.success("Đã nhắc CN chưa adjust")}
                className="flex items-center gap-1.5 rounded-button border border-warning text-warning px-3 py-1.5 text-table-sm font-medium hover:bg-warning/10"
              >
                <Bell className="h-3.5 w-3.5" /> Nhắc CN chưa adjust
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ─── Lớp 2: Per SKU ─── */
        <div className="animate-fade-in">
          <button onClick={() => setDrillCn(null)} className="text-table-sm text-primary hover:underline mb-3 flex items-center gap-1">
            ← Per CN
          </button>
          <p className="text-caption text-text-3 mb-3">Per CN › <span className="text-text-1 font-medium">{activeCn.cn}</span> (final {activeCn.final.toLocaleString()} m²)</p>

          <div className="rounded-card border border-surface-3 bg-surface-2">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["Item", "Variant", "Dự kiến", "CN adjust", "PO", "Final", "Ghi chú CN", ""].map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeCn.skus.map((sk, i) => (
                    <tr key={i} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                      <td className="px-4 py-3 text-table font-medium text-text-1">{sk.item}</td>
                      <td className="px-4 py-3 text-table text-text-2">{sk.variant}</td>
                      <td className="px-4 py-3 text-table tabular-nums text-text-2">{sk.duKien.toLocaleString()}</td>
                      <td className="px-4 py-3 text-table tabular-nums">
                        {sk.cnAdjust !== null ? (
                          <span className={cn(sk.adjustStatus === "approved" ? "text-success" : "text-warning", "font-medium")}>
                            {sk.cnAdjust >= 0 ? "+" : ""}{sk.cnAdjust} {sk.adjustStatus === "approved" ? "✅" : "🟡"}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-table tabular-nums text-text-2">{sk.po > 0 ? sk.po.toLocaleString() : "—"}</td>
                      <td className="px-4 py-3 text-table tabular-nums font-semibold text-text-1">{sk.final.toLocaleString()}</td>
                      <td className="px-4 py-3 text-caption text-text-3 italic max-w-[150px] truncate">{sk.adjustNote || "—"}</td>
                      <td className="px-4 py-3">
                        {sk.adjustStatus === "pending" && (
                          <div className="flex gap-1.5">
                            <button onClick={() => handleApprove(sk.item)} className="rounded-button bg-success/10 text-success px-2 py-1 text-caption font-medium hover:bg-success/20">Duyệt</button>
                            <button onClick={() => handleReject(sk.item)} className="rounded-button bg-danger-bg text-danger px-2 py-1 text-caption font-medium hover:bg-danger/20">Từ chối</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                    <td className="px-4 py-3 text-table text-text-1">TOTAL</td>
                    <td></td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-1">{activeCn.duKien.toLocaleString()}</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-1">{activeCn.adjustDelta >= 0 ? "+" : ""}{activeCn.adjustDelta}</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-2">{activeCn.po.toLocaleString()}</td>
                    <td className="px-4 py-3 text-table tabular-nums text-text-1">{activeCn.final.toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

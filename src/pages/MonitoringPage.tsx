import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useTenant } from "@/components/TenantContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const tenantScales: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.7, "Mondelez": 1.35 };

/* ═══ TAB 1 DATA ═══ */
interface CnInvSku {
  item: string; variant: string; ton: number; dangVe: string; available: number;
  ssTarget: number; ssGap: number; hstk: number; status: string;
}

interface CnInvRow {
  cn: string; ton: number; dangVe: string; available: number; hstk: number;
  duoiSs: number; xauNhat: string; skus: CnInvSku[];
}

const baseCnInv: CnInvRow[] = [
  {
    cn: "CN-BD", ton: 2100, dangVe: "557 (Toko 17/05)", available: 1350, hstk: 5.2, duoiSs: 3, xauNhat: "GA-300 A4 (1,2d)",
    skus: [
      { item: "GA-300", variant: "A4", ton: 450, dangVe: "557 (Toko 17/05)", available: 200, ssTarget: 900, ssGap: -700, hstk: 1.2, status: "CRITICAL" },
      { item: "GA-300", variant: "B2", ton: 380, dangVe: "—", available: 300, ssTarget: 700, ssGap: -400, hstk: 3.5, status: "LOW" },
      { item: "GA-300", variant: "C1", ton: 320, dangVe: "—", available: 280, ssTarget: 150, ssGap: 130, hstk: 8, status: "OK" },
      { item: "GA-400", variant: "A4", ton: 800, dangVe: "—", available: 600, ssTarget: 600, ssGap: 0, hstk: 7, status: "OK" },
      { item: "GA-600", variant: "A4", ton: 2100, dangVe: "—", available: 1800, ssTarget: 1000, ssGap: 800, hstk: 12, status: "EXCESS" },
      { item: "GA-600", variant: "B2", ton: 650, dangVe: "—", available: 520, ssTarget: 500, ssGap: 20, hstk: 7.5, status: "OK" },
    ],
  },
  { cn: "CN-ĐN", ton: 4500, dangVe: "400", available: 3800, hstk: 14, duoiSs: 0, xauNhat: "—", skus: [] },
  { cn: "CN-HN", ton: 3200, dangVe: "500", available: 2500, hstk: 9, duoiSs: 0, xauNhat: "—", skus: [] },
  { cn: "CN-CT", ton: 2800, dangVe: "300", available: 2100, hstk: 11, duoiSs: 0, xauNhat: "—", skus: [] },
];

/* ═══ TAB 2 DATA ═══ */
const fcData = [
  { cn: "CN-BD", mapeNow: 12, mapePrev: 15, trend: "↗ improving", best: "v2 CN Input" },
  { cn: "CN-ĐN", mapeNow: 22, mapePrev: 20, trend: "↘ worse", best: "v1 Sales" },
  { cn: "CN-HN", mapeNow: 31, mapePrev: 28, trend: "↘ worse", best: "v0 Statistical" },
  { cn: "CN-CT", mapeNow: 15, mapePrev: 14, trend: "→ stable", best: "v3 Consensus" },
];

const ssData = [
  { cn: "CN-BD", adequate: 72, breaches: 12, wc: "389M₫", rec: "↑ Tăng SS" },
  { cn: "CN-ĐN", adequate: 146, breaches: 0, wc: "650M₫", rec: "↓ Giảm SS" },
  { cn: "CN-HN", adequate: 105, breaches: 2, wc: "407M₫", rec: "→ Giữ" },
  { cn: "CN-CT", adequate: 107, breaches: 1, wc: "296M₫", rec: "→ Giữ" },
];

const nmPerfData = [
  { nm: "Mikado", honoring: 92, ontime: 88, trend: "→ stable", grade: "A" },
  { nm: "Toko", honoring: 68, ontime: 52, trend: "↘ worse", grade: "C" },
  { nm: "Phú Mỹ", honoring: 45, ontime: 38, trend: "→ stable bad", grade: "D" },
  { nm: "Đồng Tâm", honoring: 90, ontime: 85, trend: "↗ better", grade: "A" },
  { nm: "Vigracera", honoring: 88, ontime: 80, trend: "→ stable", grade: "B" },
];

const finKpis = [
  { label: "Working Capital", value: "1,2B", target: "1,0B", delta: "+20%", bad: true },
  { label: "Freight", value: "45M₫", target: "", delta: "", bad: false },
  { label: "Stockout cost", value: "32M₫", target: "", delta: "", bad: false },
  { label: "LCNB savings", value: "96M₫", target: "", delta: "", bad: false },
];

/* ═══ HELPERS ═══ */
function hstkColor(d: number) { return d < 5 ? "text-danger" : d < 10 ? "text-warning" : "text-success"; }
function hstkBg(d: number) { return d < 5 ? "bg-danger" : d < 10 ? "bg-warning" : "bg-success"; }
function statusBadge(s: string) {
  const m: Record<string, string> = { CRITICAL: "bg-danger-bg text-danger", LOW: "bg-warning-bg text-warning", OK: "bg-success-bg text-success", EXCESS: "bg-info-bg text-info" };
  return m[s] || "";
}

const tabs = [
  { key: "inv", label: "Tồn kho" },
  { key: "review", label: "Đánh giá" },
];

export default function MonitoringPage() {
  const { tenant } = useTenant();
  const s = tenantScales[tenant] || 1;
  const [activeTab, setActiveTab] = useState("inv");
  const [drillCn, setDrillCn] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const cnInv = baseCnInv.map((r) => ({
    ...r,
    ton: Math.round(r.ton * s), available: Math.round(r.available * s),
    skus: r.skus.map((sk) => ({
      ...sk, ton: Math.round(sk.ton * s), available: Math.round(sk.available * s),
      ssTarget: Math.round(sk.ssTarget * s), ssGap: Math.round(sk.ssGap * s),
    })),
  }));

  const totalTon = cnInv.reduce((a, r) => a + r.ton, 0);
  const totalAvail = cnInv.reduce((a, r) => a + r.available, 0);
  const totalDuoiSs = cnInv.reduce((a, r) => a + r.duoiSs, 0);
  const activeCnInv = drillCn ? cnInv.find((r) => r.cn === drillCn) : null;

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-1">
        <div>
          <h1 className="font-display text-screen-title text-text-1">Monitoring</h1>
          <p className="text-table text-text-2">Giám sát chuỗi cung ứng</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-surface-3 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setDrillCn(null); }}
            className={cn(
              "px-5 py-3 text-body font-medium transition-colors relative whitespace-nowrap",
              activeTab === tab.key ? "text-primary" : "text-text-2 hover:text-text-1"
            )}
          >
            {tab.label}
            {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary rounded-t" />}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: Tồn kho ═══ */}
      {activeTab === "inv" && (
        <div className="animate-fade-in">
          {!activeCnInv ? (
            <div className="rounded-card border border-surface-3 bg-surface-2">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-3 bg-surface-1/50">
                      <th className="w-10 px-3 py-2.5"></th>
                      {["CN", "Tồn (m²)", "Đang về", "Available", "HSTK", "Dưới SS", "Xấu nhất", ""].map((h, i) => (
                        <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cnInv.map((r) => (
                      <tr key={r.cn} className={cn("border-b border-surface-3/50 cursor-pointer hover:bg-surface-1/30", r.duoiSs > 0 && "bg-danger-bg/20")}
                        onClick={() => r.skus.length > 0 && setDrillCn(r.cn)}>
                        <td className="px-3 py-3 text-text-3">{r.skus.length > 0 && <ChevronRight className="h-4 w-4" />}</td>
                        <td className="px-4 py-3 text-table font-medium text-text-1">{r.cn}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-1">{r.ton.toLocaleString()}</td>
                        <td className="px-4 py-3 text-table text-text-2">{r.dangVe}</td>
                        <td className="px-4 py-3 text-table tabular-nums text-text-2">{r.available.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-14 h-2 rounded-full bg-surface-3 overflow-hidden">
                              <div className={cn("h-full rounded-full", hstkBg(r.hstk))} style={{ width: `${Math.min((r.hstk / 20) * 100, 100)}%` }} />
                            </div>
                            <span className={cn("text-table-sm font-medium tabular-nums", hstkColor(r.hstk))}>{r.hstk}d</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-table tabular-nums">
                          {r.duoiSs > 0 ? <span className="text-danger font-medium">{r.duoiSs} SKU</span> : <span className="text-text-3">0</span>}
                        </td>
                        <td className="px-4 py-3 text-table text-text-2">{r.xauNhat}</td>
                        <td className="px-4 py-3">{r.skus.length > 0 && <span className="text-primary text-table-sm font-medium">Xem ▸</span>}</td>
                      </tr>
                    ))}
                    <tr className="bg-surface-1/50 font-semibold border-t border-surface-3">
                      <td></td>
                      <td className="px-4 py-3 text-table text-text-1">TOTAL</td>
                      <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalTon.toLocaleString()}</td>
                      <td className="px-4 py-3 text-table text-text-2">1.757</td>
                      <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalAvail.toLocaleString()}</td>
                      <td className="px-4 py-3 text-table-sm font-medium text-text-1">8,5d</td>
                      <td className="px-4 py-3 text-table tabular-nums text-text-1">{totalDuoiSs}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ─── Lớp 2: Per SKU ─── */
            <div className="space-y-3">
              <button onClick={() => setDrillCn(null)} className="text-table-sm text-primary hover:underline flex items-center gap-1">
                <ChevronLeft className="h-3.5 w-3.5" /> Tồn kho
              </button>
              <p className="text-caption text-text-3">Tồn kho › <span className="text-text-1 font-medium">{activeCnInv.cn}</span> (HSTK {activeCnInv.hstk}d, {activeCnInv.duoiSs} dưới SS)</p>
              <div className="rounded-card border border-surface-3 bg-surface-2">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-3 bg-surface-1/50">
                        {["Item", "Variant", "Tồn", "Đang về (ETA)", "Available", "SS target", "SS gap", "HSTK", "Status"].map((h, i) => (
                          <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeCnInv.skus.sort((a, b) => a.hstk - b.hstk).map((sk, i) => (
                        <tr key={i} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                          <td className="px-4 py-2.5 text-table font-medium text-text-1">{sk.item}</td>
                          <td className="px-4 py-2.5 text-table text-text-2">{sk.variant}</td>
                          <td className="px-4 py-2.5 text-table tabular-nums text-text-1">{sk.ton.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-table text-text-2">{sk.dangVe}</td>
                          <td className="px-4 py-2.5 text-table tabular-nums text-text-2">{sk.available.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-table tabular-nums text-text-3">{sk.ssTarget.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-table tabular-nums">
                            <span className={cn("font-medium", sk.ssGap < 0 ? "text-danger" : "text-success")}>
                              {sk.ssGap >= 0 ? "+" : ""}{sk.ssGap.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={cn("text-table-sm font-medium tabular-nums", hstkColor(sk.hstk))}>{sk.hstk}d</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={cn("rounded-full px-2 py-0.5 text-caption font-medium", statusBadge(sk.status))}>{sk.status}</span>
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

      {/* ═══ TAB 2: Đánh giá ═══ */}
      {activeTab === "review" && (
        <div className="space-y-4 animate-fade-in">
          {/* Section A: FC Accuracy */}
          <CollapsibleSection
            title="FC Accuracy"
            summary="Avg MAPE 20% · CN-HN 31% cần chú ý"
            sectionKey="fc"
            expanded={expandedSections.has("fc")}
            onToggle={() => toggleSection("fc")}
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["CN", "MAPE tháng này", "MAPE tháng trước", "Trend", "Best model"].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fcData.map((r) => (
                  <tr key={r.cn} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                    <td className="px-4 py-2.5 text-table font-medium text-text-1">{r.cn}</td>
                    <td className="px-4 py-2.5 text-table tabular-nums">
                      <span className={cn("font-medium", r.mapeNow > 25 ? "text-danger" : "text-text-1")}>{r.mapeNow}%</span>
                      {r.mapeNow > 25 && " 🔴"}
                    </td>
                    <td className="px-4 py-2.5 text-table tabular-nums text-text-3">{r.mapePrev}%</td>
                    <td className="px-4 py-2.5 text-table text-text-2">{r.trend}</td>
                    <td className="px-4 py-2.5 text-table text-text-2">{r.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-2.5 text-caption text-text-3 italic">
              CN-HN MAPE 31% tệ → cân nhắc đổi model sang v2 CN Input.
            </div>
          </CollapsibleSection>

          {/* Section B: SS Adequacy */}
          <CollapsibleSection
            title="SS Adequacy"
            summary="CN-BD 72% — cần tăng SS · CN-ĐN 146% — dư"
            sectionKey="ss"
            expanded={expandedSections.has("ss")}
            onToggle={() => toggleSection("ss")}
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["CN", "SS adequate%", "Breaches tháng", "WC tied up", "Recommendation"].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ssData.map((r) => (
                  <tr key={r.cn} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                    <td className="px-4 py-2.5 text-table font-medium text-text-1">{r.cn}</td>
                    <td className="px-4 py-2.5 text-table tabular-nums">
                      <span className={cn("font-medium", r.adequate < 80 ? "text-danger" : "text-success")}>{r.adequate}%</span>
                      {r.adequate < 80 && " 🔴"}
                    </td>
                    <td className="px-4 py-2.5 text-table tabular-nums text-text-2">{r.breaches}x</td>
                    <td className="px-4 py-2.5 text-table text-text-2">{r.wc}</td>
                    <td className="px-4 py-2.5 text-table text-text-2">{r.rec}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-2.5">
              <button onClick={() => toast.info("Mở simulation SS")} className="text-primary text-table-sm font-medium hover:underline">
                Mô phỏng thay đổi SS ▸
              </button>
            </div>
          </CollapsibleSection>

          {/* Section C: NM Performance */}
          <CollapsibleSection
            title="NM Performance"
            summary="Toko 68% C · Phú Mỹ 45% D — cần chú ý"
            sectionKey="nm"
            expanded={expandedSections.has("nm")}
            onToggle={() => toggleSection("nm")}
          >
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["NM", "Honoring%", "On-time%", "Trend 3M", "Grade"].map((h, i) => (
                    <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nmPerfData.map((r) => (
                  <tr key={r.nm} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                    <td className="px-4 py-2.5 text-table font-medium text-text-1">{r.nm}</td>
                    <td className="px-4 py-2.5 text-table tabular-nums">
                      <span className={cn("font-medium", r.honoring < 70 ? "text-danger" : r.honoring < 85 ? "text-warning" : "text-success")}>{r.honoring}%</span>
                      {r.honoring < 70 && " 🔴"}
                    </td>
                    <td className="px-4 py-2.5 text-table tabular-nums">
                      <span className={cn("font-medium", r.ontime < 60 ? "text-danger" : r.ontime < 80 ? "text-warning" : "text-success")}>{r.ontime}%</span>
                      {r.ontime < 60 && " 🔴"}
                    </td>
                    <td className="px-4 py-2.5 text-table text-text-2">{r.trend}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("rounded-full px-2 py-0.5 text-caption font-bold",
                        r.grade === "A" ? "bg-success-bg text-success" : r.grade === "B" ? "bg-info-bg text-info" :
                        r.grade === "C" ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger"
                      )}>{r.grade}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-2.5 text-caption text-text-3 italic">
              Toko 68% → ATP auto-discount ×0.68 cho DRP đêm nay.
            </div>
          </CollapsibleSection>

          {/* Section D: Tóm tắt tài chính */}
          <CollapsibleSection
            title="Tóm tắt tài chính"
            summary="WC 1,2B (+20%) · LCNB savings 96M₫"
            sectionKey="fin"
            expanded={expandedSections.has("fin")}
            onToggle={() => toggleSection("fin")}
          >
            <div className="grid grid-cols-4 gap-3 p-4">
              {finKpis.map((k) => (
                <div key={k.label} className={cn("rounded-card border border-surface-3 p-3", k.bad ? "bg-danger-bg/30" : "bg-surface-1/50")}>
                  <div className="text-caption text-text-3 uppercase mb-0.5">{k.label}</div>
                  <div className="font-display text-section-header tabular-nums text-text-1">{k.value}</div>
                  {k.target && (
                    <div className="text-caption text-text-3 mt-0.5">
                      Target {k.target} <span className={cn("font-medium", k.bad ? "text-danger" : "text-success")}>{k.delta} {k.bad ? "🔴" : ""}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
      )}
    </AppLayout>
  );
}

/* ═══ Collapsible Section Component ═══ */
function CollapsibleSection({ title, summary, sectionKey, expanded, onToggle, children }: {
  title: string; summary: string; sectionKey: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
      <button onClick={onToggle} className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-surface-1/30 transition-colors">
        <div className="flex items-center gap-3">
          <span className="font-display text-body font-semibold text-text-1">{title}</span>
          {!expanded && <span className="text-caption text-text-3">{summary}</span>}
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-text-3" /> : <ChevronRight className="h-4 w-4 text-text-3" />}
      </button>
      {expanded && <div className="border-t border-surface-3">{children}</div>}
    </div>
  );
}

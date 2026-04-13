import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useTenant } from "@/components/TenantContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, ChevronLeft, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";

const tenantScales: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.7, "Mondelez": 1.35 };

/* ═══ SHARED DATA ═══ */
const fcData = [
  { cn: "CN-BD", mapeNow: 12, mapePrev: 15, trend: "↗ improving", best: "v2 CN Input", fva: "+3%" },
  { cn: "CN-ĐN", mapeNow: 22, mapePrev: 20, trend: "↘ worse", best: "v1 Sales", fva: "−2%" },
  { cn: "CN-HN", mapeNow: 31, mapePrev: 28, trend: "↘ worse", best: "v0 Statistical", fva: "−3%" },
  { cn: "CN-CT", mapeNow: 15, mapePrev: 14, trend: "→ stable", best: "v3 Consensus", fva: "+1%" },
];

const nmPerfData = [
  { nm: "Mikado", honoring: 92, ontime: 88, ltDelta: "+1,2d", trend: "→ stable", grade: "A" },
  { nm: "Toko", honoring: 68, ontime: 52, ltDelta: "+5,5d", trend: "↘ worse", grade: "C" },
  { nm: "Phú Mỹ", honoring: 45, ontime: 38, ltDelta: "+8d", trend: "→ stable bad", grade: "D" },
  { nm: "Đồng Tâm", honoring: 90, ontime: 85, ltDelta: "+0,8d", trend: "↗ better", grade: "A" },
  { nm: "Vigracera", honoring: 88, ontime: 80, ltDelta: "+1,5d", trend: "→ stable", grade: "B" },
];

const finKpis = [
  { label: "Working Capital", value: "1,2B", target: "1,0B", delta: "+20%", bad: true },
  { label: "Premium freight", value: "45M₫", target: "", delta: "", bad: false },
  { label: "Stockout cost", value: "32M₫", target: "", delta: "", bad: false },
  { label: "LCNB savings", value: "96M₫", target: "", delta: "", bad: false },
];

/* ═══ TAB 2 (Tồn kho) DATA ═══ */
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

/* ═══ TAB 1 (Tổng quan) CHART DATA ═══ */
const kpiSparklines = {
  hstk: [7.1, 7.0, 6.8, 7.2, 7.5, 7.3, 7.8, 8.0, 7.6, 7.9, 8.2, 8.0, 7.8, 8.1, 8.3, 8.5].map((v, i) => ({ d: i, v })),
  fillRate: [94, 94.5, 95, 94.8, 95.2, 95, 95.3, 95.1, 95.5, 95.2, 95.4, 95.5].map((v, i) => ({ d: i, v })),
  fcAccuracy: [14, 13.5, 15, 16, 14.8, 15.2, 16.5, 17, 17.8, 18, 18.2, 18.4].map((v, i) => ({ d: i, v })),
  nmHonoring: [82, 81, 80, 79, 78, 77].map((v, i) => ({ d: i, v })),
  wc: [1.0, 1.05, 1.08, 1.1, 1.15, 1.2].map((v, i) => ({ d: i, v })),
  lcnb: [45, 55, 62, 70, 82, 96].map((v, i) => ({ d: i, v })),
};

const heatmapSkus = ["GA-300 A4", "GA-300 B2", "GA-300 C1", "GA-400 A4", "GA-400 D5", "GA-600 A4", "GA-600 B2"];
const heatmapCns = ["CN-BD", "CN-ĐN", "CN-HN", "CN-CT"];
const heatmapValues: Record<string, Record<string, number>> = {
  "CN-BD": { "GA-300 A4": 1.2, "GA-300 B2": 3.5, "GA-300 C1": 8, "GA-400 A4": 7, "GA-400 D5": 6.5, "GA-600 A4": 12, "GA-600 B2": 7.5 },
  "CN-ĐN": { "GA-300 A4": 11, "GA-300 B2": 14, "GA-300 C1": 9, "GA-400 A4": 15, "GA-400 D5": 12, "GA-600 A4": 18, "GA-600 B2": 13 },
  "CN-HN": { "GA-300 A4": 6, "GA-300 B2": 8, "GA-300 C1": 5, "GA-400 A4": 10, "GA-400 D5": 9, "GA-600 A4": 11, "GA-600 B2": 7 },
  "CN-CT": { "GA-300 A4": 9, "GA-300 B2": 10, "GA-300 C1": 12, "GA-400 A4": 11, "GA-400 D5": 8, "GA-600 A4": 14, "GA-600 B2": 10 },
};

const topExceptions = [
  { color: "border-danger", icon: "🔴", text: "SHORTAGE GA-300 A4 CN-BD 345m² · Risk 120M₫ · 3 ngày liên tiếp", link: "/drp", linkLabel: "→ DRP" },
  { color: "border-warning", icon: "🟡", text: "PO_OVERDUE Toko 557m² 8 ngày", link: "/orders", linkLabel: "→ Orders" },
  { color: "border-warning", icon: "🟡", text: "FC_DRIFT CN-HN MAPE 31% tăng 3 tuần", tab: "perf", linkLabel: "→ Hiệu suất" },
  { color: "border-info", icon: "🔵", text: "CN-ĐN excess 400m² above SS · LCNB opportunity", link: "/drp", linkLabel: "→ DRP" },
];

const nmStatus = [
  { nm: "Mikado", status: "🟢", time: "14:32", ok: true },
  { nm: "Toko", status: "🔴", time: "18h stale", ok: false },
  { nm: "Phú Mỹ", status: "❌", time: "3d offline", ok: false },
  { nm: "Đồng Tâm", status: "🟡", time: "4h", ok: true },
  { nm: "Vigracera", status: "🟢", time: "2h", ok: true },
];

/* ═══ TAB 3 (Hiệu suất) CHART DATA ═══ */
const fcWeeklyChart = Array.from({ length: 12 }, (_, i) => ({
  week: `W${i + 6}`,
  v0: 15 + Math.round(Math.random() * 10),
  v1: 12 + Math.round(Math.random() * 12),
  v2: 10 + Math.round(Math.random() * 8),
  v3: 8 + Math.round(Math.random() * 10),
}));

const nmMonthlyChart = [
  { month: "T11", Mikado: 90, Toko: 75, "Phú Mỹ": 50, "Đồng Tâm": 85, Vigracera: 86 },
  { month: "T12", Mikado: 91, Toko: 72, "Phú Mỹ": 48, "Đồng Tâm": 87, Vigracera: 87 },
  { month: "T1", Mikado: 89, Toko: 70, "Phú Mỹ": 46, "Đồng Tâm": 88, Vigracera: 88 },
  { month: "T2", Mikado: 92, Toko: 71, "Phú Mỹ": 44, "Đồng Tâm": 89, Vigracera: 87 },
  { month: "T3", Mikado: 91, Toko: 69, "Phú Mỹ": 45, "Đồng Tâm": 90, Vigracera: 88 },
  { month: "T4", Mikado: 92, Toko: 68, "Phú Mỹ": 45, "Đồng Tâm": 90, Vigracera: 88 },
];

const waterfallData = [
  { name: "Budget", value: 1000, fill: "hsl(var(--primary))" },
  { name: "+SS overshoot", value: 120, fill: "hsl(var(--destructive, 0 84% 60%))" },
  { name: "+Freight", value: 45, fill: "hsl(var(--destructive, 0 84% 60%))" },
  { name: "+Stockout", value: 32, fill: "hsl(var(--destructive, 0 84% 60%))" },
  { name: "−LCNB", value: -96, fill: "#00714d" },
  { name: "Actual", value: 1101, fill: "hsl(var(--primary))" },
];

const wcMonthly = [
  { month: "T11", wc: 950 }, { month: "T12", wc: 1000 }, { month: "T1", wc: 1050 },
  { month: "T2", wc: 1080 }, { month: "T3", wc: 1150 }, { month: "T4", wc: 1200 },
];

const recurringExceptions = [
  { exception: "SHORTAGE", sku: "GA-300 A4", cn: "CN-BD", freq: "8x/tháng", avgResolve: "3,5h", trend: "↗ tệ hơn" },
  { exception: "PO_OVERDUE", sku: "Toko all", cn: "All", freq: "6x/tháng", avgResolve: "8,2h", trend: "→ stable" },
  { exception: "FC_DRIFT", sku: "GA-400 A4", cn: "CN-HN", freq: "4x/tháng", avgResolve: "2,1h", trend: "→ stable" },
  { exception: "EXCESS", sku: "GA-600 A4", cn: "CN-ĐN", freq: "3x/tháng", avgResolve: "1,5h", trend: "↘ giảm" },
  { exception: "SS_BREACH", sku: "GA-300 B2", cn: "CN-BD", freq: "3x/tháng", avgResolve: "5h", trend: "→ stable" },
];

const closedLoopData = [
  { adjust: "ATP Toko ×0.68", trigger: "Honoring 68% < 80%", impact: "DRP giảm dependency Toko", status: "applied" },
  { adjust: "SS CN-BD +15%", trigger: "Stockout 2x/tháng", impact: "SS 900→1.035, WC +25M", status: "pending" },
  { adjust: "CN-HN trust 85→72", trigger: "Gap −20%", impact: "Tolerance thu hẹp 30%→20%", status: "applied" },
  { adjust: "Share Toko 25→20%", trigger: "Grade C 3 tháng", impact: "Chuyển 5% sang Mikado", status: "recommend" },
];

/* ═══ HELPERS ═══ */
function hstkColor(d: number) { return d < 5 ? "text-danger" : d < 10 ? "text-warning" : "text-success"; }
function hstkBg(d: number) { return d < 5 ? "bg-danger" : d < 10 ? "bg-warning" : "bg-success"; }
function heatCellBg(d: number) { return d < 5 ? "bg-danger-bg text-danger" : d < 10 ? "bg-warning-bg text-warning" : "bg-success-bg text-success"; }
function statusBadge(s: string) {
  const m: Record<string, string> = { CRITICAL: "bg-danger-bg text-danger", LOW: "bg-warning-bg text-warning", OK: "bg-success-bg text-success", EXCESS: "bg-info-bg text-info" };
  return m[s] || "";
}

/* ═══ Mini Sparkline ═══ */
function Sparkline({ data, color, width = 60, height = 20 }: { data: { d: number; v: number }[]; color: string; width?: number; height?: number }) {
  if (!data.length) return null;
  const min = Math.min(...data.map(p => p.v));
  const max = Math.max(...data.map(p => p.v));
  const range = max - min || 1;
  const points = data.map((p, i) => `${(i / (data.length - 1)) * width},${height - ((p.v - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend.includes("↗") || trend.includes("tăng") || trend.includes("improving") || trend.includes("better"))
    return <TrendingUp className="h-3.5 w-3.5 text-success" />;
  if (trend.includes("↘") || trend.includes("worse") || trend.includes("xấu") || trend.includes("tệ"))
    return <TrendingDown className="h-3.5 w-3.5 text-danger" />;
  return <Minus className="h-3.5 w-3.5 text-text-3" />;
}

const tabs = [
  { key: "overview", label: "Tổng quan" },
  { key: "inv", label: "Tồn kho" },
  { key: "perf", label: "Hiệu suất" },
];

export default function MonitoringPage() {
  const { tenant } = useTenant();
  const s = tenantScales[tenant] || 1;
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [drillCn, setDrillCn] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["fc"]));

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

      {/* ═══ TAB 1: Tổng quan ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-fade-in">
          {/* Section A: 6 KPI Cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "HSTK trung bình", value: "8,5d", target: "target 7d", delta: "↗ +1,3d vs tháng trước", spark: kpiSparklines.hstk, color: "#00714d", bg: "bg-success-bg/40", tab: "inv" },
              { label: "Fill rate", value: "95,5%", target: "target 95%", delta: "→ stable", spark: kpiSparklines.fillRate, color: "#00714d", bg: "bg-success-bg/40", tab: "inv" },
              { label: "FC Accuracy (MAPE)", value: "18,4%", target: "target <15%", delta: "↘ từ 15,2%", spark: kpiSparklines.fcAccuracy, color: "#991b1b", bg: "bg-danger-bg/40", tab: "perf" },
              { label: "NM Honoring", value: "77%", target: "target 85%", delta: "↘ xấu hơn", spark: kpiSparklines.nmHonoring, color: "#991b1b", bg: "bg-danger-bg/40", tab: "perf" },
              { label: "Working Capital", value: "1,2 tỷ₫", target: "target 1,0B", delta: "+20% over", spark: kpiSparklines.wc, color: "#7a4100", bg: "bg-warning-bg/40", tab: "perf" },
              { label: "LCNB Savings", value: "96M₫", target: "tháng này", delta: "↗ +14M vs T3", spark: kpiSparklines.lcnb, color: "#00714d", bg: "bg-success-bg/40", tab: "perf" },
            ].map((kpi) => (
              <button
                key={kpi.label}
                onClick={() => setActiveTab(kpi.tab)}
                className={cn("rounded-card border border-surface-3 p-4 text-left hover:shadow-md transition-shadow", kpi.bg)}
              >
                <div className="text-[11px] font-body uppercase tracking-wider text-text-3 mb-1">{kpi.label}</div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="font-display text-[24px] font-bold tabular-nums text-text-1 leading-tight">{kpi.value}</div>
                    <div className="text-[11px] text-text-3 mt-0.5">{kpi.target}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Sparkline data={kpi.spark} color={kpi.color} />
                    <div className="flex items-center gap-1 text-[11px] text-text-2">
                      <TrendIcon trend={kpi.delta} />
                      <span>{kpi.delta}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Section B: Heatmap HSTK */}
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
            <h3 className="font-display text-body font-semibold text-text-1 mb-3">Heatmap HSTK (ngày)</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left text-table-header uppercase text-text-3 w-20">CN</th>
                    {heatmapSkus.map((sku) => (
                      <th key={sku} className="px-1 py-2 text-center text-[10px] uppercase text-text-3 whitespace-nowrap">{sku}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmapCns.map((cnName) => (
                    <tr key={cnName}>
                      <td className="px-2 py-1.5 text-table-sm font-medium text-text-1">{cnName}</td>
                      {heatmapSkus.map((sku) => {
                        const val = heatmapValues[cnName]?.[sku] ?? 0;
                        return (
                          <td key={sku} className="px-1 py-1.5">
                            <button
                              onClick={() => { setActiveTab("inv"); if (cnName === "CN-BD") setDrillCn(cnName); }}
                              className={cn("w-[60px] h-[30px] rounded text-[11px] font-bold tabular-nums flex items-center justify-center mx-auto hover:ring-2 hover:ring-primary/30 transition-all", heatCellBg(val))}
                            >
                              {val.toFixed(val % 1 ? 1 : 0)}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-text-3">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-danger-bg border border-danger/20" /> &lt;5d</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning-bg border border-warning/20" /> 5-10d</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success-bg border border-success/20" /> ≥10d</span>
            </div>
          </div>

          {/* Section C: Top Exceptions */}
          <div>
            <h3 className="font-display text-body font-semibold text-text-1 mb-3">Top Exceptions</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {topExceptions.map((exc, i) => (
                <button
                  key={i}
                  onClick={() => exc.link ? navigate(exc.link) : exc.tab && setActiveTab(exc.tab)}
                  className={cn("shrink-0 rounded-card border-l-4 border border-surface-3 bg-surface-2 px-4 py-3 text-left hover:shadow-md transition-shadow min-w-[280px] max-w-[340px]", exc.color)}
                >
                  <div className="text-table-sm text-text-1 leading-snug">
                    <span className="mr-1.5">{exc.icon}</span>{exc.text}
                  </div>
                  <div className="text-[11px] text-primary font-medium mt-1.5 flex items-center gap-1">
                    {exc.linkLabel} <ArrowRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Section D: NM Status Strip */}
          <div className="rounded-card border border-surface-3 bg-surface-2 p-4">
            <h3 className="text-[11px] font-body uppercase tracking-wider text-text-3 mb-2">NM Status</h3>
            <div className="flex items-center gap-3 flex-wrap">
              {nmStatus.map((nm) => (
                <button
                  key={nm.nm}
                  onClick={() => navigate("/supply")}
                  className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-table-sm font-medium transition-colors hover:bg-surface-1",
                    nm.ok ? "border-surface-3 text-text-1" : "border-danger/30 bg-danger-bg/30 text-danger"
                  )}
                >
                  <span>{nm.status}</span>
                  <span>{nm.nm}</span>
                  <span className="text-text-3 font-normal">{nm.time}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 2: Tồn kho ═══ */}
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

      {/* ═══ TAB 3: Hiệu suất ═══ */}
      {activeTab === "perf" && (
        <div className="space-y-6 animate-fade-in">
          {/* Section A: FC Accuracy */}
          <CollapsibleSection title="FC Accuracy" summary="Avg MAPE 20% · CN-HN 31% cần chú ý" expanded={expandedSections.has("fc")} onToggle={() => toggleSection("fc")}>
            <div className="p-5">
              <div className="h-52 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fcWeeklyChart} barGap={1} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--color-text-3)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--color-text-3)" }} unit="%" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <ReferenceLine y={15} stroke="#991b1b" strokeDasharray="6 3" label={{ value: "Target 15%", fill: "#991b1b", fontSize: 10, position: "right" }} />
                    <Bar dataKey="v0" name="v0 Statistical" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="v1" name="v1 Sales" fill="#7a4100" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="v2" name="v2 CN Input" fill="#2563EB" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="v3" name="v3 Consensus" fill="#00714d" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["CN", "MAPE tháng này", "Tháng trước", "Trend 3M", "Best model", "FVA"].map((h, i) => (
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
                      <td className="px-4 py-2.5 text-table text-text-2 flex items-center gap-1"><TrendIcon trend={r.trend} /> {r.trend}</td>
                      <td className="px-4 py-2.5 text-table text-text-2">{r.best}</td>
                      <td className="px-4 py-2.5 text-table tabular-nums">
                        <span className={cn("font-medium", r.fva.startsWith("+") ? "text-success" : "text-danger")}>{r.fva}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 rounded-md bg-danger-bg/50 border border-danger/20 px-4 py-2.5 text-table-sm text-text-1">
                <span className="font-medium text-danger">⚠ CN-HN MAPE 31% &gt; target 15%.</span> FVA negative → CN input đang làm tệ hơn statistical. Recommend: dùng v0 cho CN-HN.
              </div>
            </div>
          </CollapsibleSection>

          {/* Section B: NM Performance */}
          <CollapsibleSection title="NM Performance" summary="Toko 68% C · Phú Mỹ 45% D" expanded={expandedSections.has("nm")} onToggle={() => toggleSection("nm")}>
            <div className="p-5">
              <div className="h-52 mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={nmMonthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-3)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--color-text-3)" }} unit="%" domain={[30, 100]} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <ReferenceLine y={80} stroke="#991b1b" strokeDasharray="6 3" label={{ value: "Min 80%", fill: "#991b1b", fontSize: 10, position: "right" }} />
                    <Line type="monotone" dataKey="Mikado" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Toko" stroke="#991b1b" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Phú Mỹ" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="Đồng Tâm" stroke="#00714d" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Vigracera" stroke="#7a4100" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["NM", "Honoring%", "On-time%", "LT actual vs plan", "Trend", "Grade", "Action"].map((h, i) => (
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
                      <td className="px-4 py-2.5 text-table tabular-nums text-text-2">{r.ltDelta}</td>
                      <td className="px-4 py-2.5 text-table text-text-2 flex items-center gap-1"><TrendIcon trend={r.trend} /> {r.trend}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("rounded-full px-2 py-0.5 text-caption font-bold",
                          r.grade === "A" ? "bg-success-bg text-success" : r.grade === "B" ? "bg-info-bg text-info" :
                          r.grade === "C" ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger"
                        )}>{r.grade} {r.grade === "A" && "🟢"}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        {r.grade === "C" && (
                          <button onClick={() => { toast.success("Review meeting tạo", { description: `Action item cho ${r.nm} gửi /workspace.` }); navigate("/workspace"); }}
                            className="text-primary text-table-sm font-medium hover:underline">Review meeting</button>
                        )}
                        {r.grade === "D" && (
                          <button onClick={() => toast.info("Tìm NM thay thế", { description: `Đang tìm nguồn thay thế cho ${r.nm}.` })}
                            className="text-danger text-table-sm font-medium hover:underline">Tìm NM thay thế</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 rounded-md bg-info-bg/50 border border-info/20 px-4 py-2.5 text-table-sm text-text-1 italic">
                Toko 68% → ATP auto-discount ×0.68 cho DRP. Share% giảm 25%→20% tháng sau.
              </div>
            </div>
          </CollapsibleSection>

          {/* Section C: Execution Quality */}
          <CollapsibleSection title="Execution Quality" summary="Fill 95,5% · Resolve avg 4,2h 🔴 · PO on-time 78%" expanded={expandedSections.has("exec")} onToggle={() => toggleSection("exec")}>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Fill rate avg 30d", value: "95,5%", sub: "target 95%", ok: true },
                  { label: "Exception resolve avg", value: "4,2h", sub: "target 2h 🔴", ok: false },
                  { label: "PO on-time", value: "78%", sub: "", ok: true },
                ].map((kpi) => (
                  <div key={kpi.label} className={cn("rounded-card border border-surface-3 p-3", kpi.ok ? "bg-success-bg/30" : "bg-danger-bg/30")}>
                    <div className="text-[11px] uppercase text-text-3 mb-0.5">{kpi.label}</div>
                    <div className="font-display text-section-header tabular-nums text-text-1">{kpi.value}</div>
                    {kpi.sub && <div className="text-caption text-text-3 mt-0.5">{kpi.sub}</div>}
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-table-sm font-medium text-text-2 mb-2">Top 5 recurring exceptions</h4>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-surface-3 bg-surface-1/50">
                      {["Exception", "SKU", "CN", "Frequency", "Avg resolve", "Trend"].map((h, i) => (
                        <th key={i} className="px-4 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recurringExceptions.map((r, i) => (
                      <tr key={i} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                        <td className="px-4 py-2 text-table font-medium text-text-1">{r.exception}</td>
                        <td className="px-4 py-2 text-table text-text-2">{r.sku}</td>
                        <td className="px-4 py-2 text-table text-text-2">{r.cn}</td>
                        <td className="px-4 py-2 text-table tabular-nums text-text-1">{r.freq}</td>
                        <td className="px-4 py-2 text-table tabular-nums text-text-2">{r.avgResolve}</td>
                        <td className="px-4 py-2 text-table text-text-2 flex items-center gap-1"><TrendIcon trend={r.trend} /> {r.trend}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CollapsibleSection>

          {/* Section D: Financial Summary */}
          <CollapsibleSection title="Financial Summary" summary="WC 1,2B (+20%) · LCNB 96M₫" expanded={expandedSections.has("fin")} onToggle={() => toggleSection("fin")}>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-4 gap-3">
                {finKpis.map((k) => (
                  <div key={k.label} className={cn("rounded-card border border-surface-3 p-3", k.bad ? "bg-danger-bg/30" : "bg-surface-1/50")}>
                    <div className="text-[11px] uppercase text-text-3 mb-0.5">{k.label}</div>
                    <div className="font-display text-section-header tabular-nums text-text-1">{k.value}</div>
                    {k.target && (
                      <div className="text-caption text-text-3 mt-0.5">
                        Target {k.target} <span className={cn("font-medium", k.bad ? "text-danger" : "text-success")}>{k.delta}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Waterfall chart */}
              <div>
                <h4 className="text-table-sm font-medium text-text-2 mb-2">WC Waterfall (M₫)</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={waterfallData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--color-text-3)" }} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--color-text-3)" }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {waterfallData.map((entry, index) => (
                          <Cell key={index} fill={entry.value < 0 ? "#00714d" : entry.name === "Budget" || entry.name === "Actual" ? "#2563EB" : "#991b1b"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* WC Trend */}
              <div>
                <h4 className="text-table-sm font-medium text-text-2 mb-2">WC Monthly Trend (M₫)</h4>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={wcMonthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-3)" }} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--color-text-3)" }} domain={[800, 1300]} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Line type="monotone" dataKey="wc" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-md bg-info-bg/50 border border-info/20 px-4 py-2.5 text-table-sm text-text-1 italic">
                WC +20% over target. Giảm SS CN-ĐN (over-stocked) → tiết kiệm 56M₫/tháng. Chuyển allocation Toko→Mikado → giảm 30M₫ freight.
              </div>
            </div>
          </CollapsibleSection>

          {/* Section E: Closed-loop Summary */}
          <CollapsibleSection title="Closed-loop Summary" summary="Hệ thống tự học — 4 điều chỉnh tháng này" expanded={expandedSections.has("loop")} onToggle={() => toggleSection("loop")}>
            <div className="p-5 space-y-3">
              <p className="text-table-sm text-text-2 mb-2">Tháng này hệ thống tự điều chỉnh gì?</p>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {["Điều chỉnh", "Trigger", "Impact", "Status"].map((h, i) => (
                      <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {closedLoopData.map((r, i) => (
                    <tr key={i} className="border-b border-surface-3/50 hover:bg-surface-1/30">
                      <td className="px-4 py-2.5 text-table font-medium text-text-1">{r.adjust}</td>
                      <td className="px-4 py-2.5 text-table text-text-2">{r.trigger}</td>
                      <td className="px-4 py-2.5 text-table text-text-2">{r.impact}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-caption font-medium",
                          r.status === "applied" ? "bg-success-bg text-success" :
                          r.status === "pending" ? "bg-warning-bg text-warning" :
                          "bg-info-bg text-info"
                        )}>
                          {r.status === "applied" ? "✅ Applied" : r.status === "pending" ? "⏳ Pending duyệt" : "⏳ Recommend"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="rounded-md bg-success-bg/50 border border-success/20 px-4 py-3 text-table font-semibold text-success text-center">
                Hệ thống TỰ HỌC — mỗi tháng tốt hơn tháng trước.
              </div>
            </div>
          </CollapsibleSection>
        </div>
      )}
    </AppLayout>
  );
}

/* ═══ Collapsible Section Component ═══ */
function CollapsibleSection({ title, summary, expanded, onToggle, children }: {
  title: string; summary: string; expanded: boolean; onToggle: () => void; children: React.ReactNode;
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

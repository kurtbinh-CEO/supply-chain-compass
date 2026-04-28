import React, { useState, useMemo } from "react";
import { useFcAccuracy, useNmPerformance } from "@/hooks/useMonitoringData";
import { AppLayout } from "@/components/AppLayout";
import { useTenant } from "@/components/TenantContext";
import { cn } from "@/lib/utils";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { toast } from "sonner";
import { ChevronRight, ChevronDown, ChevronLeft, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { LogicLink } from "@/components/LogicLink";
import { LogicTooltip, LogicExpand } from "@/components/LogicTooltip";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell as PieCell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClickableNumber } from "@/components/ClickableNumber";
import { InventorySSTab } from "@/components/monitoring/InventorySSTab";
import { ActivityLogTab } from "@/components/monitoring/ActivityLogTab";
import { TrustScoreCnPanel } from "@/components/monitoring/TrustScoreCnPanel";
import { PlannerOverridePanel } from "@/components/monitoring/PlannerOverridePanel";
import { NmRiskTab } from "@/components/monitoring/NmRiskTab";
import { RoiFlywheelTab } from "@/components/monitoring/RoiFlywheelTab";
import { FcAccuracyTab } from "@/components/monitoring/FcAccuracyTab";
import { TermTooltip } from "@/components/TermTooltip";
import { SYSTEM_ACCURACY } from "@/data/unis-enterprise-dataset";
import { BatchLockBanner, useBatchLock } from "@/components/BatchLockBanner";
import { MonitoringHeroCards } from "@/components/monitoring/MonitoringHeroCards";
import { SummaryCards } from "@/components/SummaryCards";
import { TimeRangeFilter, HistoryBanner, useTimeRange, defaultTimeRange } from "@/components/TimeRangeFilter";
import { monitoringCompare } from "@/lib/compare-metrics";
import { SectionTableHeader } from "@/components/SectionTableHeader";
import { TableDownloadButton } from "@/components/TableDownloadButton";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";
import { StatusChip } from "@/components/StatusChip";

const tenantScales: Record<string, number> = { "UNIS Group": 1, "TTC Agris": 0.7, "Mondelez": 1.35 };

/* ═══ SHARED DATA — mock fallbacks, overridden by DB when available ═══ */

const finKpis = [
  { label: "Vốn lưu động", value: "1,2 tỷ", target: "1,0 tỷ", delta: "+20%", bad: true },
  { label: "Cước vận chuyển premium", value: "45 triệu ₫", target: "", delta: "", bad: false },
  { label: "Chi phí thiếu hàng", value: "32 triệu ₫", target: "", delta: "", bad: false },
  { label: "Tiết kiệm LCNB", value: "96 triệu ₫", target: "", delta: "", bad: false },
];

/* ═══ TAB 2 (Tồn kho) DATA ═══ */
interface CnInvSku {
  item: string; variant: string; ton: number; dangVe: string; available: number;
  ssTarget: number; ssGap: number; hstk: number; status: string; aging?: string;
}
interface CnInvRow {
  cn: string; ton: number; dangVe: string; available: number; hstk: number;
  duoiSs: number; xauNhat: string; excess: number; turnover: number; skus: CnInvSku[];
}
const baseCnInv: CnInvRow[] = [
  {
    cn: "CN-BD", ton: 2100, dangVe: "557 (Toko 17/05)", available: 1350, hstk: 5.2, duoiSs: 3, xauNhat: "GA-300 A4 (1,2d)", excess: 0, turnover: 4.8,
    skus: [
      { item: "GA-300", variant: "A4", ton: 450, dangVe: "557 (Toko 17/05)", available: 200, ssTarget: 900, ssGap: -700, hstk: 1.2, status: "CRITICAL", aging: "15d" },
      { item: "GA-300", variant: "B2", ton: 380, dangVe: "—", available: 300, ssTarget: 700, ssGap: -400, hstk: 3.5, status: "LOW", aging: "22d" },
      { item: "GA-300", variant: "C1", ton: 320, dangVe: "—", available: 280, ssTarget: 150, ssGap: 130, hstk: 8, status: "OK", aging: "45d" },
      { item: "GA-400", variant: "A4", ton: 800, dangVe: "—", available: 600, ssTarget: 600, ssGap: 0, hstk: 7, status: "OK", aging: "30d" },
      { item: "GA-600", variant: "A4", ton: 2100, dangVe: "—", available: 1800, ssTarget: 1000, ssGap: 800, hstk: 12, status: "EXCESS", aging: "95d" },
      { item: "GA-600", variant: "B2", ton: 650, dangVe: "—", available: 520, ssTarget: 500, ssGap: 20, hstk: 7.5, status: "OK", aging: "18d" },
    ],
  },
  { cn: "CN-ĐN", ton: 4500, dangVe: "400", available: 3800, hstk: 14, duoiSs: 0, xauNhat: "—", excess: 400, turnover: 2.1, skus: [] },
  { cn: "CN-HN", ton: 3200, dangVe: "500", available: 2500, hstk: 9, duoiSs: 0, xauNhat: "—", excess: 0, turnover: 3.5, skus: [] },
  { cn: "CN-CT", ton: 2800, dangVe: "300", available: 2100, hstk: 11, duoiSs: 0, xauNhat: "—", excess: 0, turnover: 2.8, skus: [] },
];

/* ═══ Inventory trend data (30 days) ═══ */
const invTrendBase = Array.from({ length: 30 }, (_, i) => {
  const day = i + 1;
  const dateStr = `${String(day).padStart(2, "0")}/05`;
  return {
    date: dateStr,
    "CN-BD": { onHand: 2000 + Math.round(Math.sin(i / 5) * 300), ss: 2900, available: 1200 + Math.round(Math.sin(i / 4) * 200) },
    "CN-ĐN": { onHand: 4200 + Math.round(Math.cos(i / 6) * 400), ss: 2400, available: 3500 + Math.round(Math.cos(i / 5) * 300) },
    "CN-HN": { onHand: 3000 + Math.round(Math.sin(i / 7) * 250), ss: 2100, available: 2300 + Math.round(Math.sin(i / 6) * 200) },
    "CN-CT": { onHand: 2600 + Math.round(Math.cos(i / 5) * 200), ss: 1500, available: 1900 + Math.round(Math.cos(i / 4) * 150) },
  };
});

function getInvTrend(filter: string) {
  return invTrendBase.map((d) => {
    if (filter === "all") {
      return {
        date: d.date,
        onHand: d["CN-BD"].onHand + d["CN-ĐN"].onHand + d["CN-HN"].onHand + d["CN-CT"].onHand,
        ss: d["CN-BD"].ss + d["CN-ĐN"].ss + d["CN-HN"].ss + d["CN-CT"].ss,
        available: d["CN-BD"].available + d["CN-ĐN"].available + d["CN-HN"].available + d["CN-CT"].available,
      };
    }
    const cn = d[filter as keyof typeof d] as { onHand: number; ss: number; available: number };
    return { date: d.date, onHand: cn.onHand, ss: cn.ss, available: cn.available };
  });
}

/* Aging distribution */
const agingData = [
  { name: "<30d", value: 65, fill: "var(--color-success-text)" },
  { name: "30-60d", value: 25, fill: "var(--color-warning-text)" },
  { name: "60-90d", value: 8, fill: "#dc2626" },
  { name: ">90d", value: 2, fill: "var(--color-danger-text)" },
];

/* Stockout log */
const stockoutLog = [
  { date: "08/05", cn: "CN-BD", item: "GA-300 A4", duration: "6h", impact: "120m²", cause: "Toko trễ 4d", resolution: "LCNB CN-ĐN 100m²" },
  { date: "03/05", cn: "CN-BD", item: "GA-300 B2", duration: "12h", impact: "80m²", cause: "Demand spike", resolution: "Emergency PO Mikado" },
  { date: "28/04", cn: "CN-HN", item: "GA-400 A4", duration: "3h", impact: "45m²", cause: "SS breach", resolution: "Auto-restock" },
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
  { name: "−LCNB", value: -96, fill: "var(--color-success-text)" },
  { name: "Actual", value: 1101, fill: "hsl(var(--primary))" },
];

const wcMonthly = [
  { month: "T11", wc: 950 }, { month: "T12", wc: 1000 }, { month: "T1", wc: 1050 },
  { month: "T2", wc: 1080 }, { month: "T3", wc: 1150 }, { month: "T4", wc: 1200 },
];

const recurringExceptions = [
  { exception: "THIẾU HÀNG", sku: "GA-300 A4", cn: "CN-BD", freq: "8x/tháng", avgResolve: "3,5h", trend: "↗ tệ hơn" },
  { exception: "PO QUÁ HẠN", sku: "Toko all", cn: "All", freq: "6x/tháng", avgResolve: "8,2h", trend: "→ ổn định" },
  { exception: "FC LỆCH", sku: "GA-400 A4", cn: "CN-HN", freq: "4x/tháng", avgResolve: "2,1h", trend: "→ ổn định" },
  { exception: "DƯ THỪA", sku: "GA-600 A4", cn: "CN-ĐN", freq: "3x/tháng", avgResolve: "1,5h", trend: "↘ giảm" },
  { exception: "VƯỢT NGƯỠNG SS", sku: "GA-300 B2", cn: "CN-BD", freq: "3x/tháng", avgResolve: "5h", trend: "→ ổn định" },
];

const closedLoopData = [
  { adjust: "ATP Toko ×0.68", trigger: "Honoring 68% < 80%", impact: "DRP giảm dependency Toko", status: "applied" },
  { adjust: "SS CN-BD +15%", trigger: "Stockout 2x/tháng", impact: "SS 900→1.035, WC +25M", status: "pending" },
  { adjust: "CN-HN trust 85→72", trigger: "Gap −20%", impact: "Tolerance thu hẹp 30%→20%", status: "applied" },
  { adjust: "Share Toko 25→20%", trigger: "Grade C 3 tháng", impact: "Chuyển 5% sang Mikado", status: "recommend" },
];

/* ═══ CONFLICT LOG DATA ═══ */
const conflictLogData = [
  { time: "08:15", type: "CELL_OVERRIDE", screen: "S&OP v3", userA: "Planner C", userB: "SC Thúy", entity: "BD×GA-300", result: "Thúy wins", detail: "CELL_OVERRIDE — S&OP v3 input\nCell: CN-BD × GA-300 A4 × v2 CN Input\nUser A (Planner C): value 600, editing since 08:12\nUser B (SC Thúy): force-edit at 08:15, value 617\nResult: Thúy's value 617 saved. Planner C notified.\nOld value: 600 (Planner C's draft preserved)." },
  { time: "08:32", type: "VERSION_MISMATCH", screen: "PO approve", userA: "Planner A", userB: "CN-BD Minh", entity: "RPO-W17-002", result: "Minh refresh", detail: "VERSION_MISMATCH — PO RPO-MKD-2605-W17-002\nPlanner A edited qty 557→600, saved v5.\nCN-BD Minh tried approve on v4 → 409 conflict.\nMinh chose [Tải lại dữ liệu mới] → refreshed to v6.\nNo data lost." },
  { time: "23:05", type: "BATCH_QUEUE", screen: "DRP", userA: "Admin Dũng", userB: "System", entity: "DRP run #47", result: "Queued 2 actions", detail: "BATCH_QUEUE — DRP nightly run #47\nDRP started 23:00, running Step 4/8.\nAdmin Dũng tried manual allocation at 23:05 → queued.\nSC Thúy tried SS change at 23:10 → queued.\nDRP completed 23:18. Queue processed." },
  { time: "16:30", type: "FORCE_LOCK", screen: "S&OP lock", userA: "Planner C", userB: "SC Thúy", entity: "Period T5", result: "Locked (grace 0)", detail: "FORCE_LOCK — S&OP Period T5\nSC Thúy clicked Lock Consensus.\n2 editors active: Planner C (2m), Sales N (45s).\nThúy chose [Force lock ngay].\nPlanner C unsaved draft → preserved in Drafts.\nSales N notified: 'S&OP đã locked.'" },
  { time: "09:45", type: "CELL_OVERRIDE", screen: "CN-BD adjust", userA: "CN Minh", userB: "SC Thúy", entity: "BD×GA-400", result: "Thúy wins", detail: "CELL_OVERRIDE — CN-BD Adjustment\nCN Minh editing GA-400 A4 CN-BD.\nSC Thúy (bypass CN ownership) force-edited.\nValue: Minh 500 → Thúy 520.\nMinh nhận toast: 'Cell BD×GA-400 đã bị Thúy ghi đè.'" },
  { time: "14:20", type: "CELL_OVERRIDE", screen: "S&OP v3", userA: "Planner A", userB: "SC Thúy", entity: "HN×GA-600", result: "Thúy wins", detail: "CELL_OVERRIDE — S&OP v3\nPlanner A editing HN×GA-600. Thúy force-edit.\nFrequent: 3rd override in 5 min on S&OP.\nRecommend: phân CN ownership.", highlight: true },
  { time: "14:22", type: "CELL_OVERRIDE", screen: "S&OP v3", userA: "Planner A", userB: "SC Thúy", entity: "HN×GA-300", result: "Thúy wins", detail: "CELL_OVERRIDE — S&OP v3\nPlanner A editing HN×GA-300. Thúy force-edit.\nFrequent override pattern detected.", highlight: true },
  { time: "11:00", type: "VERSION_MISMATCH", screen: "Hub scenario", userA: "SC Thúy", userB: "SC Tuấn", entity: "Gap S-MKD-T5", result: "Tuấn refresh", detail: "VERSION_MISMATCH — Hub Gap Scenario\nThúy chose scenario A, saved v3.\nTuấn tried choose scenario B on v2 → conflict.\nTuấn refreshed, reviewed Thúy's choice, agreed." },
  { time: "07:30", type: "BATCH_QUEUE", screen: "Orders", userA: "System", userB: "System", entity: "Auto-gen PO #12", result: "3 RPOs generated", detail: "BATCH_QUEUE — Auto-gen PO batch #12\nTriggered by DRP completion.\n3 RPOs auto-generated.\nNo manual actions queued during batch." },
  { time: "22:00", type: "VERSION_MISMATCH", screen: "Master Data", userA: "Admin Dũng", userB: "System DRP", entity: "LT Mikado", result: "Saved (DRP snapshot)", detail: "VERSION_MISMATCH — Master Data LT Mikado\nAdmin Dũng changed LT 14→21.\nDRP running used snapshot LT=14.\nChange saved, effective from next DRP run.\nToast: 'DRP đang chạy dùng snapshot LT=14.'" },
  { time: "15:00", type: "VERSION_MISMATCH", screen: "SS adjust", userA: "Planner B", userB: "SC Thúy", entity: "SS BD GA-300", result: "Thúy force", detail: "VERSION_MISMATCH — SS Adjustment\nPlanner B proposed SS 900→1035.\nThúy approved different value 950 at same time.\nConflict → Thúy force-updated.\nPlanner B notified." },
  { time: "13:15", type: "CELL_OVERRIDE", screen: "B2B deals", userA: "Sales N", userB: "SC Thúy", entity: "Deal-VNG-001", result: "Thúy wins", detail: "CELL_OVERRIDE — B2B Deal Table\nSales N editing Deal-VNG-001 qty.\nSC Thúy overrode with approved value." },
];

const conflictWeeklyTrend = [
  { week: "W14", count: 18 },
  { week: "W15", count: 15 },
  { week: "W16", count: 14 },
  { week: "W17", count: 12 },
];

/* ═══ Conflict Log Section ═══ */
function ConflictLogSection({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const thisWeek = conflictLogData.slice(0, 12);
  const autoResolved = thisWeek.filter(c => c.result.includes("refresh")).length;
  const manual = thisWeek.length - autoResolved;
  const sopCount = thisWeek.filter(c => c.screen.includes("S&OP")).length;

  const typeBadge = (type: string) => {
    const m: Record<string, string> = {
      CELL_OVERRIDE: "bg-warning-bg text-warning",
      VERSION_MISMATCH: "bg-info-bg text-info",
      BATCH_QUEUE: "bg-primary/10 text-primary",
      FORCE_LOCK: "bg-danger-bg text-danger",
    };
    return m[type] || "bg-surface-3 text-text-2";
  };

  return (
    <CollapsibleSection title="Conflict Log — 7 ngày qua" summary={`${thisWeek.length} conflicts · ${manual} manual`} expanded={expanded} onToggle={onToggle}>
      <div className="p-5 space-y-4">
        {/* Summary strip */}
        <div className="rounded-lg bg-info-bg/50 border border-info/20 px-4 py-3 text-table-sm text-text-1 flex items-center justify-between">
          <span>
            <span className="font-semibold">{thisWeek.length} conflicts</span> tuần này.{" "}
            <span className="text-text-2">{autoResolved} auto-resolved (version refresh). {manual} manual (cell override).</span>
            {sopCount > thisWeek.length / 2 && (
              <span className="text-warning font-medium ml-2">Hot spot: S&OP input ({sopCount}/{thisWeek.length}).</span>
            )}
          </span>
          <TableDownloadButton targetId="conflict-log-table" filename="conflict-log-7d" size="xs" />
        </div>

        {/* Recommend */}
        {sopCount > thisWeek.length / 2 && (
          <div className="rounded-md bg-warning-bg/50 border border-warning/20 px-4 py-2.5 text-table-sm text-text-1">
            💡 <span className="font-medium">Recommend:</span> phân CN ownership (1 editor/CN) để giảm conflicts trên S&OP input.
          </div>
        )}

        {/* Table */}
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <table id="conflict-log-table" className="w-full text-table-sm">
            <thead>
              <tr className="bg-surface-1">
                {["Thời gian", "Loại", "Screen", "User A", "User B", "Entity", "Kết quả", ""].map((h, i) => (
                  <th key={i} className="px-3 py-2.5 text-left text-table-header uppercase text-text-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {thisWeek.map((c, i) => (
                <React.Fragment key={i}>
                  <tr className={cn("border-b border-surface-3/50 hover:bg-surface-1/30 transition-colors", (c as any).highlight && "bg-warning-bg/20")}>
                    <td className="px-3 py-2 tabular-nums text-text-2">{c.time}</td>
                    <td className="px-3 py-2">
                      <span className={cn("rounded-sm px-1.5 py-0.5 text-[10px] font-medium", typeBadge(c.type))}>{c.type}</span>
                    </td>
                    <td className="px-3 py-2 text-text-2">{c.screen}</td>
                    <td className="px-3 py-2 text-text-1">{c.userA}</td>
                    <td className="px-3 py-2 text-text-1">{c.userB}</td>
                    <td className="px-3 py-2 font-mono text-text-2">{c.entity}</td>
                    <td className="px-3 py-2 text-text-2">{c.result}</td>
                    <td className="px-3 py-2">
                      <button onClick={() => setExpandedRow(expandedRow === i ? null : i)} className="text-primary text-caption font-medium hover:underline">
                        {expandedRow === i ? "Ẩn" : "Chi tiết"}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === i && (
                    <tr>
                      <td colSpan={8} className="px-6 py-3 bg-surface-1/50">
                        <pre className="text-table-sm text-text-2 whitespace-pre-wrap font-body leading-relaxed">{c.detail}</pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Weekly trend chart */}
        <div>
          <h4 className="text-table-sm font-medium text-text-2 mb-2">Weekly Conflict Trend (giảm = tốt)</h4>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conflictWeeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--color-text-3)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-3)" }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="count" name="Conflicts" fill="var(--color-warning-text)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}

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
  { key: "inv", label: "Tồn kho an toàn" },
  { key: "perf", label: "Tiến độ đặt hàng" },
  { key: "nm-risk", label: "Rủi ro NM" },
  { key: "roi", label: "ROI" },
  { key: "fc", label: "Dự báo" },
  { key: "activity", label: "Nhật ký hoạt động" },
];

export default function MonitoringPage() {
  const { tenant } = useTenant();
  const s = tenantScales[tenant] || 1;
  const { summaryData: fcData, weeklyData: fcWeeklyFromDb, loading: fcLoading } = useFcAccuracy();
  const { data: nmPerfData, loading: nmLoading } = useNmPerformance();

  const ssBatch = useBatchLock({
    batchType: "SS Recalculation",
    status: "info",
    resultSummary: "SS recalc hoàn tất 06:00. 24 SKU updated, 2 breaches.",
    startedAt: "06:00",
  });
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [timeRange, setTimeRange] = useTimeRange("monitoring", "monthly");
  const [drillCn, setDrillCn] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["fc"]));
  const [invChartFilter, setInvChartFilter] = useState("all");
  const [showStockoutLog, setShowStockoutLog] = useState(false);
  const showAging = tenant === "TTC Agris" || tenant === "Mondelez";

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
      <ScreenHeader
        title="Giám sát"
        subtitle={timeRange.isCurrent ? "Sức khoẻ chuỗi cung ứng — KPI & cảnh báo" : `Snapshot ${timeRange.label}`}
        actions={
          <TimeRangeFilter
            mode="monthly"
            value={timeRange}
            onChange={setTimeRange}
            screenId="monitoring"
          />
        }
      />

      <HistoryBanner
        range={timeRange}
        onReset={() => setTimeRange(defaultTimeRange("monthly"))}
        entity="giám sát"
        resetLabel="Quay về tháng này"
        currentLabel="Tháng này (T5)"
        compareMetrics={monitoringCompare(timeRange)}
      />

      {/* SS Batch Banner */}
      {ssBatch.batch && (
        <div className="mb-4">
          <BatchLockBanner
            batch={ssBatch.batch}
            dismissed={ssBatch.dismissed}
            onDismiss={ssBatch.dismiss}
            showQueue={ssBatch.showQueue}
            onToggleQueue={() => ssBatch.setShowQueue(!ssBatch.showQueue)}
          />
        </div>
      )}

      {/* M15 — 5 hero KPI cards (always visible above tabs) */}
      <MonitoringHeroCards onTabChange={(k) => { setActiveTab(k); setDrillCn(null); }} />

      {/* M20-PATCH — Summary thẻ tóm tắt nhỏ (bổ sung dưới hero KPI) */}
      <div className="mt-4 mb-5">
        <SummaryCards
          screenId="monitoring"
          editable
          cards={[
            {
              key: "alerts_total",
              label: "Cảnh báo mở",
              value: 8,
              unit: "items",
              trend: { delta: "3 mới hôm nay", direction: "up", color: "red" },
              severity: "warn",
              onClick: () => setActiveTab("activity"),
            },
            {
              key: "ss_pending",
              label: "SS chờ duyệt",
              value: 2,
              unit: "thay đổi",
              trend: { delta: "+128M vốn", direction: "up", color: "red" },
              severity: "warn",
              onClick: () => navigate("/workspace"),
            },
            {
              key: "nm_at_risk",
              label: "NM rủi ro cao",
              value: 1,
              unit: "NM",
              trend: { delta: "Phú Mỹ 48%", direction: "down", color: "red" },
              severity: "critical",
              onClick: () => setActiveTab("nm"),
            },
            {
              key: "bpo_pace",
              label: "Tiến độ BPO",
              value: "72%",
              unit: "released",
              trend: { delta: "Ngày 24/30", direction: "flat", color: "gray" },
              severity: "ok",
            },
          ]}
        />
      </div>

      {/* Tab bar — section "Chi tiết" */}
      <div className="px-1 mb-2 text-caption uppercase tracking-wide text-text-3 font-semibold">
        Chi tiết
      </div>
      <div className="flex items-center gap-0 border-b border-surface-3 mb-6 overflow-x-auto">
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
          {/* Section A: 7 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              { label: "HSTK trung bình", termKey: "HSTK", value: "8,5d", target: "mục tiêu 7d", delta: "↗ +1,3d vs tháng trước", spark: kpiSparklines.hstk, color: "var(--color-success-text)", bg: "bg-success-bg/40", tab: "inv", logicTab: "ss" as const, logicNode: 0, logicTip: "Công thức Safety Stock" },
              { label: "Tỷ lệ lấp đầy", termKey: "FillRate", value: "95,5%", target: "mục tiêu 95%", delta: "→ ổn định", spark: kpiSparklines.fillRate, color: "var(--color-success-text)", bg: "bg-success-bg/40", tab: "inv", logicTab: "daily" as const, logicNode: 3, logicTip: "Logic phân bổ 6 lớp" },
              { label: "Độ chính xác FC (MAPE)", termKey: "MAPE", value: "18,4%", target: "mục tiêu <15%", delta: "↘ từ 15,2%", spark: kpiSparklines.fcAccuracy, color: "var(--color-danger-text)", bg: "bg-danger-bg/40", tab: "perf", logicTab: "forecast" as const, logicNode: 2, logicTip: "MAPE là gì?" },
              { label: "Tỷ lệ giữ cam kết NM", termKey: "HonoringRate", value: "77%", target: "mục tiêu 85%", delta: "↘ xấu hơn", spark: kpiSparklines.nmHonoring, color: "var(--color-danger-text)", bg: "bg-danger-bg/40", tab: "perf", logicTab: "forecast" as const, logicNode: 4, logicTip: "FVA & NM Honoring" },
              { label: "Vốn lưu động", termKey: undefined as string | undefined, value: "1,2 tỷ ₫", target: "mục tiêu 1,0 tỷ", delta: "+20% vượt mục tiêu", spark: kpiSparklines.wc, color: "var(--color-warning-text)", bg: "bg-warning-bg/40", tab: "perf", logicTab: "ss" as const, logicNode: 2, logicTip: "SS ↔ Vốn lưu động" },
              { label: "Tiết kiệm LCNB", termKey: "LCNB", value: "96 triệu ₫", target: "tháng này", delta: "↗ +14M vs T3", spark: kpiSparklines.lcnb, color: "var(--color-success-text)", bg: "bg-success-bg/40", tab: "perf", logicTab: "ss" as const, logicNode: 3, logicTip: "LCNB giảm SS toàn mạng" },
              { label: "Độ chính xác hệ thống", termKey: undefined, value: `${Math.round((SYSTEM_ACCURACY.fillRatePct + SYSTEM_ACCURACY.drpAccuracyPct + SYSTEM_ACCURACY.lcnbHitRatePct + SYSTEM_ACCURACY.containerFillAvgPct) / 4)}%`, target: "mục tiêu 80%", delta: "↗ +3pp vs T4", spark: kpiSparklines.fillRate, color: "var(--color-success-text)", bg: "bg-success-bg/40", tab: "perf", logicTab: "forecast" as const, logicNode: 0, logicTip: "Hệ thống chính xác = trung bình 4 chỉ số: Tỷ lệ lấp đầy, độ chính xác DRP, tỉ lệ trúng LCNB, mức lấp đầy container" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className={cn("rounded-card border border-surface-3 p-4 text-left", kpi.bg)}
              >
                <div className="text-[11px] font-body uppercase tracking-wider text-text-3 mb-1 flex items-center gap-1">
                  {kpi.termKey ? (
                    <TermTooltip term={kpi.termKey}>
                      <span>{kpi.label}</span>
                    </TermTooltip>
                  ) : (
                    <span>{kpi.label}</span>
                  )}
                  <LogicLink tab={kpi.logicTab} node={kpi.logicNode} tooltip={kpi.logicTip} />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <ClickableNumber
                      value={kpi.value}
                      label={kpi.label}
                      color="font-display text-[24px] font-bold text-text-1 leading-tight"
                      breakdown={
                        kpi.label === "HSTK trung bình" ? [
                          { label: "CN-BD", value: "5,2d 🔴" }, { label: "CN-ĐN", value: "14d" },
                          { label: "CN-HN", value: "9,5d" }, { label: "CN-CT", value: "11d" },
                        ] : kpi.label === "Tỷ lệ lấp đầy" ? [
                          { label: "CN-BD", value: "86%" }, { label: "CN-ĐN", value: "100%" },
                          { label: "CN-HN", value: "100%" }, { label: "CN-CT", value: "100%" },
                        ] : kpi.label === "Tỷ lệ giữ cam kết NM" ? [
                          { label: "Mikado", value: "92% A" }, { label: "Toko", value: "68% C 🔴" },
                          { label: "Phú Mỹ", value: "45% D 🔴" }, { label: "Đồng Tâm", value: "90% A" },
                          { label: "Vigracera", value: "88% B" },
                        ] : kpi.label === "Độ chính xác FC (MAPE)" ? [
                          { label: "CN-BD", value: "88%" }, { label: "CN-ĐN", value: "78%" },
                          { label: "CN-HN", value: "69% 🔴" }, { label: "CN-CT", value: "85%" },
                        ] : kpi.label === "Vốn lưu động" ? [
                          { label: "Giá trị tồn kho", value: "950 triệu" }, { label: "Giá trị đang về", value: "250 triệu" },
                        ] : kpi.label === "Tiết kiệm LCNB" ? [
                          { label: "TO-DN-BD-001", value: "220m² tiết kiệm 32 triệu ₫" },
                          { label: "TO-HN-BD-001", value: "150m² tiết kiệm 18 triệu ₫" },
                        ] : undefined
                      }
                      formula={
                        kpi.label === "HSTK trung bình" ? "Trọng số theo nhu cầu: CN-BD nhu cầu lớn nhất nhưng HSTK thấp nhất → kéo trung bình xuống 8,5d" :
                        kpi.label === "Tỷ lệ lấp đầy" ? "CN-BD 86% × CN-ĐN 100% × CN-HN 100% × CN-CT 100% → trọng số 95,5%" :
                        kpi.label === "Tỷ lệ giữ cam kết NM" ? "Trọng số theo SL cam kết → 77%. Toko + Phú Mỹ kéo xuống." :
                        kpi.label === "Độ chính xác FC (MAPE)" ? "100% − MAPE_trọng số = 100% − 18,4% = 81,6% ≈ 82%" :
                        kpi.label === "Vốn lưu động" ? "Tồn kho 950 triệu + Đang về 250 triệu = 1.200 triệu ₫. Ngân sách 1.000 triệu (+20%).\nVượt ngân sách do: SS CN-BD +120 triệu, cước premium Toko +45 triệu." :
                        kpi.label === "Tiết kiệm LCNB" ? "8 lần điều chuyển nội bộ tháng này. Tiết kiệm trung bình 12 triệu ₫/lần." :
                        undefined
                      }
                      links={
                        kpi.label === "HSTK trung bình" ? [{ label: "→ tab Tồn kho", to: "/monitoring" }] :
                        kpi.label === "Tỷ lệ lấp đầy" ? [{ label: "→ /drp", to: "/drp" }] :
                        kpi.label === "Tỷ lệ giữ cam kết NM" ? [{ label: "→ tab Hiệu suất Section B", to: "/monitoring" }] :
                        kpi.label === "Vốn lưu động" ? [{ label: "→ tab Hiệu suất Section D", to: "/monitoring" }] :
                        kpi.label === "Độ chính xác FC (MAPE)" ? [{ label: "→ tab Hiệu suất Section A", to: "/monitoring" }] :
                        kpi.label === "Tiết kiệm LCNB" ? [{ label: "→ /drp lịch sử LCNB", to: "/drp" }] :
                        undefined
                      }
                    />
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
              </div>
            ))}
          </div>

          {/* Section B: Heatmap HSTK */}
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-body font-semibold text-text-1">
                Heatmap{" "}
                <TermTooltip term="HSTK">
                  <span className="text-text-1">HSTK</span>
                </TermTooltip>{" "}
                (ngày)
              </h3>
              <TableDownloadButton targetId="monitoring-heatmap-hstk" filename="heatmap-hstk" size="xs" />
            </div>
            <div className="overflow-x-auto">
              <table id="monitoring-heatmap-hstk" className="w-full">
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

          {/* Section B2: Trust Score per CN — 12 chi nhánh + sparkline 12 tuần */}
          <TrustScoreCnPanel />

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

      {activeTab === "inv" && (
        <InventorySSTab scale={s} />
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
                    <ReferenceLine y={15} stroke="var(--color-danger-text)" strokeDasharray="6 3" label={{ value: "Target 15%", fill: "var(--color-danger-text)", fontSize: 10, position: "right" }} />
                    <Bar dataKey="v0" name="v0 Statistical" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="v1" name="v1 Sales" fill="var(--color-warning-text)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="v2" name="v2 CN Input" fill="#2563EB" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="v3" name="v3 Consensus" fill="var(--color-success-text)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="text-table-sm font-medium text-text-2">Chi tiết MAPE theo CN</h4>
                <TableDownloadButton targetId="monitoring-fc-mape" filename="fc-mape-by-cn" size="xs" />
              </div>
              <table id="monitoring-fc-mape" className="w-full">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {[
                      { h: "CN", term: undefined as string | undefined },
                      { h: "MAPE tháng này", term: "MAPE" },
                      { h: "Tháng trước", term: undefined },
                      { h: "Trend 3M", term: undefined },
                      { h: "Best model", term: undefined },
                      { h: "FVA", term: "FVA" },
                    ].map((col, i) => (
                      <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">
                        {col.term ? (
                          <TermTooltip term={col.term}>
                            <span>{col.h}</span>
                          </TermTooltip>
                        ) : (
                          col.h
                        )}
                      </th>
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
                        {r.cn === "CN-HN" && (
                          <div className="mt-1">
                            <LogicExpand label={`${r.cn} MAPE ${r.mapeNow}% per SKU`} title={`${r.cn} per SKU MAPE`} content={`GA-300 A4: 28% 🟡\nGA-300 B2: 42% 🔴 ← SKU tệ nhất\nGA-400 A4: 22% 🟡\nGA-600 A4: 33% 🔴\nGA-300 B2 kéo MAPE toàn CN lên.\nRecommend: kiểm tra data history GA-300 B2 CN-HN.\nCó thể: CN-HN ít bán B2, FC chưa đủ data → dùng v0 stat thay consensus.`} />
                          </div>
                        )}
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
                <div className="mt-1 text-danger font-medium">
                  ⚠ MAPE CN-BD xấu đi 18%→22% vì 3 tuần liên tiếp adjust lệch &gt;25% → SS Hub tăng 60m² → tốn thêm ~11M₫/tháng vốn lưu động
                </div>
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
                    <ReferenceLine y={80} stroke="var(--color-danger-text)" strokeDasharray="6 3" label={{ value: "Min 80%", fill: "var(--color-danger-text)", fontSize: 10, position: "right" }} />
                    <Line type="monotone" dataKey="Mikado" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Toko" stroke="var(--color-danger-text)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Phú Mỹ" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="Đồng Tâm" stroke="var(--color-success-text)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Vigracera" stroke="var(--color-warning-text)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <h4 className="text-table-sm font-medium text-text-2">Bảng NM Performance chi tiết</h4>
                <TableDownloadButton targetId="monitoring-nm-performance" filename="nm-performance" size="xs" />
              </div>
              <table id="monitoring-nm-performance" className="w-full">
                <thead>
                  <tr className="border-b border-surface-3 bg-surface-1/50">
                    {[
                      { h: "NM", tooltip: null, term: undefined as string | undefined },
                      { h: "Honoring%", tooltip: null, term: "HonoringRate" },
                      { h: "On-time%", tooltip: "On-time = delivered ≤ ETA + grace period (2d).\nOn-time% = (# PO on-time) ÷ (# PO total) × 100\nConfig: /config → PO → on_time_grace_days = 2.", term: undefined },
                      { h: "LT actual vs plan", tooltip: null, term: undefined },
                      { h: "Trend", tooltip: null, term: undefined },
                      { h: "Grade", tooltip: "NM Grade dựa trên Honoring% trung bình 3 tháng:\nA 🟢 ≥ 90%: NM đáng tin. ATP full confidence.\nB    ≥ 80%: OK. ATP × honoring factor.\nC 🟡 ≥ 60%: Cần cải thiện. ATP discounted. Review meeting.\nD 🔴 < 60%: Risk cao. Xem xét thay NM. Share% giảm.\nAuto-action: effective_ATP = raw_ATP × honoring%.\nConfig: /config → NM ATP → grade thresholds.", term: undefined },
                      { h: "Action", tooltip: null, term: undefined },
                    ].map((col, i) => (
                      <th key={i} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3">
                        <span className="inline-flex items-center gap-1">
                          {col.term ? (
                            <TermTooltip term={col.term}>
                              <span>{col.h}</span>
                            </TermTooltip>
                          ) : (
                            col.h
                          )}
                          {col.tooltip && <LogicTooltip title={col.h} content={col.tooltip} />}
                        </span>
                      </th>
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
                        <span className={cn("rounded-full px-2 py-0.5 text-caption font-bold inline-flex items-center gap-1",
                          r.grade === "A" ? "bg-success-bg text-success" : r.grade === "B" ? "bg-info-bg text-info" :
                          r.grade === "C" ? "bg-warning-bg text-warning" : "bg-danger-bg text-danger"
                        )}>
                          {r.grade} {r.grade === "A" && "🟢"}
                          <LogicTooltip size="sm" title={`${r.nm} Grade ${r.grade}`} content={`${r.nm}: Th3 ${r.honoring - 2}% + Th4 ${r.honoring - 1}% + Th5 ${r.honoring}% = avg ${r.honoring}%\n→ Grade ${r.grade}\nAuto-action: effective_ATP = raw_ATP × ${(r.honoring / 100).toFixed(2)}.\nConfig: /config → NM ATP → grade thresholds.`} />
                        </span>
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

          {/* Section C: Chất lượng thực thi */}
          <CollapsibleSection title="Chất lượng thực thi" summary="Fill 95,5% · Resolve avg 4,2h 🔴 · PO on-time 78%" expanded={expandedSections.has("exec")} onToggle={() => toggleSection("exec")}>
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
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-table-sm font-medium text-text-2">Top 5 recurring exceptions</h4>
                  <TableDownloadButton targetId="monitoring-recurring-exceptions" filename="recurring-exceptions" size="xs" />
                </div>
                <table id="monitoring-recurring-exceptions" className="w-full">
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
                          <Cell key={index} fill={entry.value < 0 ? "var(--color-success-text)" : entry.name === "Budget" || entry.name === "Actual" ? "#2563EB" : "var(--color-danger-text)"} />
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

          {/* Section D2: Planner Override Analysis — top 5 lý do sửa PO */}
          <CollapsibleSection
            title="Planner Override Analysis"
            summary="18/47 PO bị sửa · top reason: số lượng quá cao 35%"
            expanded={expandedSections.has("override")}
            onToggle={() => toggleSection("override")}
          >
            <div className="p-5">
              <PlannerOverridePanel />
            </div>
          </CollapsibleSection>

          {/* Section E: Closed-loop Summary */}
          <CollapsibleSection title="Closed-loop Summary" summary="Hệ thống tự học — 4 điều chỉnh tháng này" expanded={expandedSections.has("loop")} onToggle={() => toggleSection("loop")}>
            <div className="p-5 space-y-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-table-sm text-text-2">Tháng này hệ thống tự điều chỉnh gì?</p>
                <TableDownloadButton targetId="monitoring-closed-loop" filename="closed-loop-summary" size="xs" />
              </div>
              <table id="monitoring-closed-loop" className="w-full">
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

          {/* Section F: Conflict Log Dashboard */}
          <ConflictLogSection expanded={expandedSections.has("conflict")} onToggle={() => toggleSection("conflict")} />
        </div>
      )}

      {/* ═══ TAB: Rủi ro NM ═══ */}
      {activeTab === "nm-risk" && <NmRiskTab />}

      {/* ═══ TAB: ROI & Flywheel ═══ */}
      {activeTab === "roi" && <RoiFlywheelTab />}

      {/* ═══ TAB: Dự báo (FC accuracy) ═══ */}
      {activeTab === "fc" && <FcAccuracyTab />}

      {/* ═══ TAB: Nhật ký hoạt động ═══ */}
      {activeTab === "activity" && <ActivityLogTab />}

      <ScreenFooter actionCount={11} />
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

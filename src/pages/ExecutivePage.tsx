/**
 * ExecutivePage — M16 "Tổng quan lãnh đạo"
 *
 * 4 zones:
 *   1. 6 hero KPI cards (Tier 1) → click opens 4-tab Sheet (Tier 2)
 *   2. Allocation tracking SmartTable per CN → drillDown per SKU
 *   3. KPI trend 6-month SmartTable
 *   4. Decision queue (DecisionCard expand)
 *
 * RBAC: hide for SALES / VIEWER / CN_MANAGER. Visible for SC_MANAGER (treated
 * as DIRECTOR/CEO equivalent until those roles are added to RbacContext).
 *
 * All copy Vietnamese, all colors via semantic tokens, no hardcoded HSL.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, TrendingDown, ArrowRight, Lock,
  Package, CalendarDays, DollarSign, LineChart, Truck, Factory,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { TimeRangeFilter, HistoryBanner, useTimeRange, defaultTimeRange } from "@/components/TimeRangeFilter";
import { executiveCompare } from "@/lib/compare-metrics";
import { SmartTable, SmartTableColumn } from "@/components/SmartTable";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { useRbac } from "@/components/RbacContext";
import { getKpiTarget } from "@/data/unis-enterprise-dataset";
import { cn } from "@/lib/utils";

/** Map card key (Tier 1) → kpiKey trong KPI_TARGETS dataset. */
const KPI_TARGET_MAP: Record<string, string> = {
  fill:     "fill_rate",
  doi:      "days_of_inventory",
  wc:       "working_capital",
  fc:       "forecast_accuracy",
  otd:      "on_time_delivery",
  supplier: "supplier_fill_rate",
};

/** Render "Mục tiêu ≥ 95%" / "Mục tiêu ≤ 35 ngày" từ KPI_TARGETS. Fallback về fallback. */
function kpiTargetLabel(cardKey: string, fallback: string): string {
  const tgt = getKpiTarget(KPI_TARGET_MAP[cardKey] ?? "");
  if (!tgt) return fallback;
  const cmp = tgt.direction === "higher_better" ? "≥" : "≤";
  // Format 4500 → "4.500"; 95 → "95"
  const v = tgt.target.toLocaleString("vi-VN");
  return `Mục tiêu ${cmp} ${v} ${tgt.unit}`;
}

/* ════════════════════════════════════════════════════════════════════════
 * MOCK DATA
 * ══════════════════════════════════════════════════════════════════════ */

type Tone = "ok" | "near" | "miss"; // 🟢 đạt, 🟡 gần, 🔴 dưới

interface KpiCardData {
  key: string;
  icon: React.ElementType;
  label: string;
  value: string;
  unit?: string;
  trend12w: number[];
  target: string;
  delta: { value: string; dir: "up" | "down" | "flat"; positive: boolean };
  tone: Tone;
}

const KPIS: KpiCardData[] = [
  {
    key: "fill",
    icon: Package,
    label: "Tỷ lệ lấp đầy",
    value: "94,2",
    unit: "%",
    trend12w: [88, 89, 87, 90, 91, 90, 92, 91, 93, 92, 93, 94],
    target: "Mục tiêu ≥ 95%",
    delta: { value: "1,3%", dir: "up", positive: true },
    tone: "near",
  },
  {
    key: "doi",
    icon: CalendarDays,
    label: "Ngày tồn kho TB",
    value: "38",
    unit: "ngày",
    trend12w: [44, 43, 42, 42, 41, 41, 40, 40, 39, 39, 38, 38],
    target: "Mục tiêu ≤ 35 ngày",
    delta: { value: "3 ngày", dir: "down", positive: true },
    tone: "near",
  },
  {
    key: "wc",
    icon: DollarSign,
    label: "Vốn lưu động",
    value: "4,82",
    unit: "tỷ ₫",
    trend12w: [5.5, 5.4, 5.3, 5.2, 5.1, 5.0, 4.95, 4.9, 4.88, 4.85, 4.83, 4.82],
    target: "Mục tiêu ≤ 4,5 tỷ ₫",
    delta: { value: "12%", dir: "down", positive: true },
    tone: "near",
  },
  {
    key: "fc",
    icon: LineChart,
    label: "Độ chính xác dự báo",
    value: "82",
    unit: "%",
    trend12w: [75, 76, 76, 78, 78, 79, 80, 80, 81, 81, 82, 82],
    target: "Mục tiêu ≥ 85%",
    delta: { value: "2%", dir: "up", positive: true },
    tone: "near",
  },
  {
    key: "otd",
    icon: Truck,
    label: "Đúng hẹn giao hàng",
    value: "91",
    unit: "%",
    trend12w: [90, 91, 91, 90, 91, 91, 91, 91, 91, 91, 91, 91],
    target: "Mục tiêu ≥ 95%",
    delta: { value: "0%", dir: "flat", positive: false },
    tone: "near",
  },
  {
    key: "supplier",
    icon: Factory,
    label: "NM đáp ứng",
    value: "87",
    unit: "%",
    trend12w: [92, 91, 91, 90, 89, 89, 88, 88, 88, 87, 87, 87],
    target: "Mục tiêu ≥ 90%",
    delta: { value: "3%", dir: "down", positive: false },
    tone: "miss",
  },
];

/* ─── Drill-down per KPI: 4 tabs (CN / SKU / NM / Trend) ────────────── */
interface DrillTabRow { name: string; value: number; unit?: string; tone: Tone }
interface KpiDrillData {
  byCn?: DrillTabRow[];
  bySku?: DrillTabRow[];
  byNm?: DrillTabRow[];
  trend?: { weeks: string[]; values: number[]; target: number; unit: string };
  rootCause?: string;
  ctaLabel?: string;
  ctaRoute?: string;
}

const KPI_DRILL: Record<string, KpiDrillData> = {
  fill: {
    byCn: [
      { name: "CN-BD", value: 75, unit: "%", tone: "miss" },
      { name: "CN-NA", value: 88, unit: "%", tone: "near" },
      { name: "CN-CT", value: 92, unit: "%", tone: "near" },
      { name: "CN-DN", value: 96, unit: "%", tone: "ok" },
      { name: "CN-HCM", value: 98, unit: "%", tone: "ok" },
      { name: "CN-HN", value: 99, unit: "%", tone: "ok" },
    ],
    bySku: [
      { name: "GA-600", value: 76, unit: "%", tone: "miss" },
      { name: "PK-001", value: 82, unit: "%", tone: "miss" },
      { name: "GA-400", value: 91, unit: "%", tone: "near" },
      { name: "GA-300", value: 98, unit: "%", tone: "ok" },
    ],
    byNm: [
      { name: "Phú Mỹ", value: 45, unit: "%", tone: "miss" },
      { name: "Toko", value: 82, unit: "%", tone: "near" },
      { name: "Vigracera", value: 90, unit: "%", tone: "near" },
      { name: "Đồng Tâm", value: 92, unit: "%", tone: "near" },
      { name: "Mikado", value: 96, unit: "%", tone: "ok" },
    ],
    trend: {
      weeks: ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12"],
      values: [88,89,87,90,91,90,92,91,93,92,93,94],
      target: 95, unit: "%",
    },
    rootCause: "CN-BD chỉ đạt 75% vì NM Toko trễ PO 7 ngày + demand CN-BD tăng +32% (nhà thầu mới Q2).",
    ctaLabel: "Xem DRP CN-BD",
    ctaRoute: "/drp?cn=CN-BD",
  },
  doi: {
    byCn: [
      { name: "CN-BMT", value: 18, unit: "ngày", tone: "ok" },
      { name: "CN-BD", value: 26, unit: "ngày", tone: "ok" },
      { name: "CN-CT", value: 34, unit: "ngày", tone: "ok" },
      { name: "CN-HN", value: 42, unit: "ngày", tone: "near" },
      { name: "CN-HCM", value: 52, unit: "ngày", tone: "miss" },
    ],
    bySku: [
      { name: "GA-600", value: 21, unit: "ngày", tone: "ok" },
      { name: "PK-001", value: 35, unit: "ngày", tone: "ok" },
      { name: "GA-300", value: 48, unit: "ngày", tone: "near" },
      { name: "GA-400", value: 68, unit: "ngày", tone: "miss" },
    ],
    trend: {
      weeks: ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12"],
      values: [44,43,42,42,41,41,40,40,39,39,38,38],
      target: 35, unit: " ngày",
    },
    rootCause: "GA-400 tồn 68 ngày tại CN-HCM — slow-moving, cần promo hoặc chuyển CN khác.",
    ctaLabel: "Xem báo cáo Slow-moving",
    ctaRoute: "/reports",
  },
  wc: {
    byCn: [
      { name: "CN-HCM", value: 1.2, unit: "tỷ", tone: "miss" },
      { name: "CN-HN", value: 0.9, unit: "tỷ", tone: "near" },
      { name: "CN-BD", value: 0.7, unit: "tỷ", tone: "near" },
      { name: "CN-CT", value: 0.6, unit: "tỷ", tone: "ok" },
    ],
    bySku: [
      { name: "GA-300", value: 2.1, unit: "tỷ", tone: "miss" },
      { name: "GA-400", value: 1.2, unit: "tỷ", tone: "near" },
      { name: "GA-600", value: 0.9, unit: "tỷ", tone: "ok" },
      { name: "PK-001", value: 0.62, unit: "tỷ", tone: "ok" },
    ],
    trend: {
      weeks: ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12"],
      values: [5.5,5.4,5.3,5.2,5.1,5.0,4.95,4.9,4.88,4.85,4.83,4.82],
      target: 4.5, unit: " tỷ ₫",
    },
    rootCause: "Slow-moving > 60 ngày: GA-600 C1 CN-NA 85m² · PK-001 D3 CN-QN 40m² → 178 triệu ₫ tồn ứ.",
    ctaLabel: "Xem báo cáo slow-moving",
    ctaRoute: "/reports",
  },
  fc: {
    byCn: [
      { name: "CN-BD", value: 28, unit: "% MAPE", tone: "miss" },
      { name: "CN-NA", value: 22, unit: "% MAPE", tone: "near" },
      { name: "CN-DN", value: 14, unit: "% MAPE", tone: "ok" },
      { name: "CN-HN", value: 12, unit: "% MAPE", tone: "ok" },
    ],
    bySku: [
      { name: "GA-600", value: 25, unit: "% MAPE", tone: "miss" },
      { name: "GA-300", value: 22, unit: "% MAPE", tone: "near" },
      { name: "GA-400", value: 8, unit: "% MAPE", tone: "ok" },
    ],
    trend: {
      weeks: ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12"],
      values: [75,76,76,78,78,79,80,80,81,81,82,82],
      target: 85, unit: "%",
    },
    rootCause: "GA-600 MAPE tăng 3 tuần liên tiếp → cân nhắc đổi FC method.",
    ctaLabel: "Xem chi tiết Dự báo",
    ctaRoute: "/monitoring",
  },
  otd: {
    byCn: [
      { name: "CN-HN", value: 95, unit: "%", tone: "ok" },
      { name: "CN-HCM", value: 93, unit: "%", tone: "near" },
      { name: "CN-BD", value: 88, unit: "%", tone: "near" },
      { name: "CN-NA", value: 84, unit: "%", tone: "miss" },
    ],
    byNm: [
      { name: "Mikado", value: 96, unit: "%", tone: "ok" },
      { name: "Đồng Tâm", value: 94, unit: "%", tone: "near" },
      { name: "Vigracera", value: 88, unit: "%", tone: "near" },
      { name: "Toko", value: 72, unit: "%", tone: "miss" },
      { name: "Phú Mỹ", value: 60, unit: "%", tone: "miss" },
    ],
    trend: {
      weeks: ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12"],
      values: [90,91,91,90,91,91,91,91,91,91,91,91],
      target: 95, unit: "%",
    },
    rootCause: "Phú Mỹ và Toko kéo OTD trung bình xuống — 2 NM trễ thường xuyên.",
    ctaLabel: "Xem Đơn hàng",
    ctaRoute: "/orders",
  },
  supplier: {
    byNm: [
      { name: "Mikado", value: 96, unit: "%", tone: "ok" },
      { name: "Đồng Tâm", value: 92, unit: "%", tone: "near" },
      { name: "Vigracera", value: 90, unit: "%", tone: "near" },
      { name: "Toko", value: 78, unit: "%", tone: "miss" },
      { name: "Phú Mỹ", value: 45, unit: "%", tone: "miss" },
    ],
    trend: {
      weeks: ["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10","W11","W12"],
      values: [92,91,91,90,89,89,88,88,88,87,87,87],
      target: 90, unit: "%",
    },
    rootCause: "Phú Mỹ dưới target 6 tháng liên tiếp — đề xuất giảm phân bổ.",
    ctaLabel: "Xem Gap Scenario",
    ctaRoute: "/gap-scenario",
  },
};

/* ─── NM scorecard 5 yếu tố (cho card "NM đáp ứng") ─────────────────── */
interface NmScoreRow {
  nm: string; total: number; honor: number; ontime: number;
  quality: number; response: number; price: number; tone: Tone;
}
const NM_SCORECARD: NmScoreRow[] = [
  { nm: "Mikado",    total: 92, honor: 96, ontime: 96, quality: 98, response: 90, price: 85, tone: "ok"   },
  { nm: "Đồng Tâm",  total: 88, honor: 92, ontime: 94, quality: 92, response: 88, price: 80, tone: "ok"   },
  { nm: "Vigracera", total: 86, honor: 90, ontime: 88, quality: 90, response: 85, price: 82, tone: "ok"   },
  { nm: "Toko",      total: 70, honor: 78, ontime: 72, quality: 80, response: 60, price: 75, tone: "near" },
  { nm: "Phú Mỹ",    total: 48, honor: 45, ontime: 60, quality: 70, response: 35, price: 75, tone: "miss" },
];

/* ─── Zone 2: allocation tracking ───────────────────────────────────── */
interface AllocSku {
  sku: string; demand: number; alloc: number; received: number;
  pipeline: number; gap: number; tone: Tone;
}
interface AllocRow {
  cn: string; demand: number; alloc: number; received: number;
  pipeline: number; gap: number; fillRate: number; tone: Tone;
  skus: AllocSku[];
}
const ALLOC_ROWS: AllocRow[] = [
  {
    cn: "CN-BD", demand: 8200, alloc: 7400, received: 4100, pipeline: 1800, gap: 800, fillRate: 90, tone: "near",
    skus: [
      { sku: "GA-300 A4", demand: 1560, alloc: 1560, received: 800, pipeline: 760, gap: 0, tone: "ok" },
      { sku: "GA-600 A4", demand: 800, alloc: 400, received: 120, pipeline: 0, gap: 280, tone: "miss" },
      { sku: "GA-400 A4", demand: 4200, alloc: 4200, received: 2400, pipeline: 800, gap: 0, tone: "ok" },
      { sku: "PK-001 D3", demand: 1640, alloc: 1240, received: 780, pipeline: 240, gap: 520, tone: "miss" },
    ],
  },
  {
    cn: "CN-HN", demand: 9800, alloc: 9800, received: 6200, pipeline: 2400, gap: 0, fillRate: 99, tone: "ok",
    skus: [
      { sku: "GA-300 A4", demand: 4200, alloc: 4200, received: 2800, pipeline: 1200, gap: 0, tone: "ok" },
      { sku: "GA-400 A4", demand: 3800, alloc: 3800, received: 2400, pipeline: 800, gap: 0, tone: "ok" },
      { sku: "PK-001 D3", demand: 1800, alloc: 1800, received: 1000, pipeline: 400, gap: 0, tone: "ok" },
    ],
  },
  {
    cn: "CN-HCM", demand: 12400, alloc: 11800, received: 7200, pipeline: 2800, gap: 600, fillRate: 95, tone: "near",
    skus: [
      { sku: "GA-300 A4", demand: 5200, alloc: 5200, received: 3200, pipeline: 1400, gap: 0, tone: "ok" },
      { sku: "GA-600 A4", demand: 1800, alloc: 1200, received: 600, pipeline: 200, gap: 600, tone: "miss" },
      { sku: "GA-400 A4", demand: 5400, alloc: 5400, received: 3400, pipeline: 1200, gap: 0, tone: "ok" },
    ],
  },
  {
    cn: "CN-NA", demand: 4200, alloc: 3000, received: 1600, pipeline: 600, gap: 1200, fillRate: 71, tone: "miss",
    skus: [
      { sku: "GA-300 A4", demand: 2400, alloc: 2400, received: 1400, pipeline: 600, gap: 0, tone: "ok" },
      { sku: "GA-600 A4", demand: 1200, alloc: 400, received: 200, pipeline: 0, gap: 800, tone: "miss" },
      { sku: "PK-001 D3", demand: 600, alloc: 200, received: 0, pipeline: 0, gap: 400, tone: "miss" },
    ],
  },
  {
    cn: "CN-DN", demand: 3800, alloc: 3600, received: 2200, pipeline: 800, gap: 200, fillRate: 95, tone: "near",
    skus: [
      { sku: "GA-300 A4", demand: 1800, alloc: 1800, received: 1200, pipeline: 400, gap: 0, tone: "ok" },
      { sku: "GA-400 A4", demand: 1400, alloc: 1400, received: 800, pipeline: 300, gap: 0, tone: "ok" },
      { sku: "PK-001 D3", demand: 600, alloc: 400, received: 200, pipeline: 100, gap: 200, tone: "near" },
    ],
  },
  {
    cn: "CN-CT", demand: 4380, alloc: 2800, received: 800, pipeline: 1800, gap: 1580, fillRate: 64, tone: "miss",
    skus: [
      { sku: "GA-300 A4", demand: 2200, alloc: 1600, received: 600, pipeline: 800, gap: 600, tone: "miss" },
      { sku: "GA-400 A4", demand: 1600, alloc: 800, received: 200, pipeline: 600, gap: 800, tone: "miss" },
      { sku: "PK-001 D3", demand: 580, alloc: 400, received: 0, pipeline: 400, gap: 180, tone: "near" },
    ],
  },
];

/* ─── Zone 3: KPI trend 6 months ────────────────────────────────────── */
interface TrendRow {
  kpi: string; t12: number; t1: number; t2: number; t3: number; t4: number;
  t5: number; target: number; unit: string; lowerIsBetter: boolean;
}
const TREND_ROWS: TrendRow[] = [
  { kpi: "Tỷ lệ lấp đầy",       t12: 89, t1: 90, t2: 91, t3: 92, t4: 93, t5: 94, target: 95, unit: "%", lowerIsBetter: false },
  { kpi: "Ngày tồn kho TB",     t12: 44, t1: 42, t2: 41, t3: 40, t4: 39, t5: 38, target: 35, unit: " ngày", lowerIsBetter: true },
  { kpi: "Vốn lưu động",        t12: 5.5, t1: 5.3, t2: 5.1, t3: 5.0, t4: 4.9, t5: 4.82, target: 4.5, unit: " tỷ ₫", lowerIsBetter: true },
  { kpi: "Độ chính xác dự báo", t12: 76, t1: 78, t2: 79, t3: 80, t4: 81, t5: 82, target: 85, unit: "%", lowerIsBetter: false },
  { kpi: "Đúng hẹn giao hàng",  t12: 91, t1: 91, t2: 91, t3: 91, t4: 91, t5: 91, target: 95, unit: "%", lowerIsBetter: false },
  { kpi: "NM đáp ứng",          t12: 92, t1: 91, t2: 90, t3: 89, t4: 88, t5: 87, target: 90, unit: "%", lowerIsBetter: false },
  { kpi: "Vòng quay tồn kho",   t12: 8.2, t1: 8.4, t2: 8.6, t3: 8.8, t4: 9.0, t5: 9.2, target: 10, unit: " lần", lowerIsBetter: false },
  { kpi: "Cước/m² (đ)",         t12: 1280, t1: 1260, t2: 1240, t3: 1230, t4: 1220, t5: 1215, target: 1200, unit: " đ", lowerIsBetter: true },
];

/* ─── Zone 4: Decision queue ────────────────────────────────────────── */
interface Decision {
  id: string; severity: "danger" | "warning";
  title: string; summary: string;
  context: { label: string; value: string; tone?: Tone }[];
  ai: string;
  actions: { label: string; primary?: boolean }[];
}
const DECISIONS: Decision[] = [
  {
    id: "d1", severity: "danger",
    title: "NM Phú Mỹ dưới target 6 tháng liên tiếp",
    summary: "Tổng điểm 48/100 — Đáp ứng 45%, Phản hồi 35%. Rủi ro chuỗi cung ứng cao.",
    context: [
      { label: "Đáp ứng PO", value: "45%", tone: "miss" },
      { label: "Đúng hẹn", value: "60%", tone: "miss" },
      { label: "Chất lượng", value: "70%", tone: "near" },
      { label: "Phản hồi", value: "35%", tone: "miss" },
      { label: "Tác động nếu giảm 30%", value: "Mikado/Đồng Tâm gánh thêm 4.200m²/tháng" },
    ],
    ai: "Đề xuất giảm phân bổ Phú Mỹ 30% trong Q3 và chuyển sang Mikado (capacity còn 8.000m²).",
    actions: [
      { label: "Phê duyệt giảm phân bổ", primary: true },
      { label: "Chờ thêm 1 tháng" },
    ],
  },
  {
    id: "d2", severity: "warning",
    title: "Vốn lưu động vượt target 7%",
    summary: "WC 4,82 tỷ vs mục tiêu 4,5 tỷ → dư 320 triệu ₫ chủ yếu do slow-moving.",
    context: [
      { label: "Slow-moving > 60 ngày", value: "178 triệu ₫", tone: "miss" },
      { label: "GA-600 C1 CN-NA", value: "85m² · 42 triệu ₫", tone: "miss" },
      { label: "PK-001 D3 CN-QN", value: "40m² · 18 triệu ₫", tone: "near" },
      { label: "MAPE giảm 3 tháng liên tiếp", value: "−8% → có thể giảm SS" },
    ],
    ai: "MAPE cải thiện → đề xuất giảm SS 10% cho 5 SKU top → tiết kiệm WC ~280 triệu ₫.",
    actions: [
      { label: "Phê duyệt giảm SS", primary: true },
      { label: "Giữ nguyên" },
    ],
  },
];

/* ════════════════════════════════════════════════════════════════════════
 * UI HELPERS
 * ══════════════════════════════════════════════════════════════════════ */

const toneBorder = (t: Tone) =>
  t === "ok" ? "border-l-success" : t === "near" ? "border-l-warning" : "border-l-danger";
const toneText = (t: Tone) =>
  t === "ok" ? "text-success" : t === "near" ? "text-warning" : "text-danger";
const toneBg = (t: Tone) =>
  t === "ok" ? "bg-success" : t === "near" ? "bg-warning" : "bg-danger";
const toneEmoji = (t: Tone) =>
  t === "ok" ? "🟢" : t === "near" ? "🟡" : "🔴";

function Sparkline({ values, tone, target }: { values: number[]; tone: Tone; target?: number }) {
  const min = Math.min(...values, target ?? Infinity);
  const max = Math.max(...values, target ?? -Infinity);
  const range = max - min || 1;
  const w = 80, h = 24;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  const stroke = tone === "miss" ? "hsl(var(--danger))" : tone === "near" ? "hsl(var(--warning))" : "hsl(var(--success))";
  const targetY = target !== undefined ? h - ((target - min) / range) * h : null;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-[80px] h-[24px]">
      {targetY !== null && (
        <line x1="0" y1={targetY} x2={w} y2={targetY} stroke="hsl(var(--text-3))" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
      )}
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * DeltaBadge — gọn, có context.
 *  - `compact`=true: render dạng inline cho footer (icon + value, không pad).
 *  - mặc định: dùng cho hover/badge contexts khác.
 *  Color logic: positive → success, flat → muted text-3, negative → danger.
 */
function DeltaBadge({ delta, compact = false }: { delta: KpiCardData["delta"]; compact?: boolean }) {
  const Icon = delta.dir === "up" ? TrendingUp : delta.dir === "down" ? TrendingDown : ArrowRight;
  const colorClass = delta.positive ? "text-success" : delta.dir === "flat" ? "text-text-3" : "text-danger";
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 font-semibold tabular-nums shrink-0",
      compact ? "text-caption" : "text-table-sm",
      colorClass,
    )}>
      <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {delta.value}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * MAIN COMPONENT
 * ══════════════════════════════════════════════════════════════════════ */

export default function ExecutivePage() {
  const navigate = useNavigate();
  const { user } = useRbac();
  const [openKpi, setOpenKpi] = useState<string | null>(null);
  const [openDec, setOpenDec] = useState<string | null>(null);
  const [drillTab, setDrillTab] = useState<"cn" | "sku" | "nm" | "trend">("cn");
  const [trendCell, setTrendCell] = useState<{ kpi: string; period: string; value: number } | null>(null);
  const [timeRange, setTimeRange] = useTimeRange("executive", "monthly");

  // RBAC: only SC_MANAGER (treated as Director/CEO equivalent)
  if (user.role !== "SC_MANAGER") {
    return (
      <AppLayout>
        <ScreenHeader title="Tổng quan lãnh đạo" />
        <div className="rounded-card border border-surface-3 bg-surface-1 p-12 text-center">
          <Lock className="mx-auto h-10 w-10 text-text-3 mb-3" />
          <p className="text-table font-medium text-text-1">Chỉ dành cho ban lãnh đạo</p>
          <p className="text-table-sm text-text-3 mt-1">
            Vai trò hiện tại: <span className="font-medium">{user.role}</span>. Cần SC Manager / Director / CEO.
          </p>
        </div>
      </AppLayout>
    );
  }

  /* ─── Allocation summary totals ─── */
  const allocSum = ALLOC_ROWS.reduce((acc, r) => ({
    demand:    acc.demand    + r.demand,
    alloc:     acc.alloc     + r.alloc,
    received:  acc.received  + r.received,
    pipeline:  acc.pipeline  + r.pipeline,
    gap:       acc.gap       + r.gap,
  }), { demand: 0, alloc: 0, received: 0, pipeline: 0, gap: 0 });
  const allocPct = Math.round((allocSum.alloc / allocSum.demand) * 100);

  /* ─── Allocation columns ─── */
  const allocCols: SmartTableColumn<AllocRow>[] = [
    { key: "cn", label: "CN", width: 90, render: (r) => <span className="font-mono font-semibold text-text-1">{r.cn}</span> },
    { key: "demand", label: "Nhu cầu", width: 90, align: "right", render: (r) => <span className="tabular-nums">{r.demand.toLocaleString("vi-VN")}</span> },
    { key: "alloc", label: "Phân bổ", width: 90, align: "right", render: (r) => <span className="tabular-nums">{r.alloc.toLocaleString("vi-VN")}</span> },
    {
      key: "fillRate", label: "Tỷ lệ", width: 90, align: "right",
      render: (r) => <span className={cn("tabular-nums font-bold", toneText(r.tone))}>{r.fillRate}%</span>,
    },
    { key: "received", label: "Đã nhận", width: 90, align: "right", render: (r) => <span className="tabular-nums">{r.received.toLocaleString("vi-VN")}</span> },
    { key: "pipeline", label: "Pipeline", width: 90, align: "right", render: (r) => <span className="tabular-nums text-text-2">{r.pipeline.toLocaleString("vi-VN")}</span> },
    {
      key: "gap", label: "Thiếu", width: 90, align: "right",
      render: (r) => r.gap > 0
        ? <span className="tabular-nums font-medium text-danger">{r.gap.toLocaleString("vi-VN")}</span>
        : <span className="tabular-nums text-text-3">—</span>,
    },
    {
      key: "rating", label: "Đánh giá", width: 100,
      render: (r) => (
        <span className={cn("inline-flex items-center gap-1 text-table-sm font-medium", toneText(r.tone))}>
          {toneEmoji(r.tone)} {r.tone === "ok" ? "Tốt" : r.tone === "near" ? "Cần theo dõi" : "Khẩn cấp"}
        </span>
      ),
    },
  ];

  /* ─── Trend columns ─── */
  const trendCols: SmartTableColumn<TrendRow>[] = [
    { key: "kpi", label: "KPI", width: 200, render: (r) => <span className="font-medium text-text-1">{r.kpi}</span> },
    ...(["t12","t1","t2","t3","t4","t5"] as const).map((k, i) => ({
      key: k,
      label: ["T12/25","T1/26","T2/26","T3/26","T4/26","T5/26 (dk)"][i],
      width: 95, align: "right" as const,
      render: (r: TrendRow) => {
        const v = r[k];
        const ok = r.lowerIsBetter ? v <= r.target : v >= r.target;
        const near = r.lowerIsBetter
          ? v <= r.target * 1.1
          : v >= r.target * 0.95;
        const tone: Tone = ok ? "ok" : near ? "near" : "miss";
        return (
          <button
            onClick={() => setTrendCell({ kpi: r.kpi, period: ["T12/25","T1/26","T2/26","T3/26","T4/26","T5/26"][i], value: v })}
            className={cn(
              "tabular-nums font-medium hover:underline",
              toneText(tone)
            )}
          >
            {typeof v === "number" && v < 100 ? v.toLocaleString("vi-VN", { maximumFractionDigits: 2 }) : v.toLocaleString("vi-VN")}
            {r.unit}
          </button>
        );
      },
    })),
    {
      key: "target", label: "Mục tiêu", width: 100, align: "right",
      render: (r) => <span className="tabular-nums text-text-2">{r.target}{r.unit}</span>,
    },
    {
      key: "trend", label: "Xu hướng", width: 100,
      render: (r) => {
        const arr = [r.t12, r.t1, r.t2, r.t3, r.t4, r.t5];
        const ok = r.lowerIsBetter ? r.t5 <= r.target : r.t5 >= r.target;
        const tone: Tone = ok ? "ok" : Math.abs(r.t5 - r.target) / r.target < 0.1 ? "near" : "miss";
        return <Sparkline values={arr} tone={tone} target={r.target} />;
      },
    },
  ];

  /* ─── Render ─── */
  return (
    <AppLayout>
      <ScreenHeader
        title={`Tổng quan lãnh đạo — ${timeRange.isCurrent ? "Tháng 5/2026" : timeRange.label}`}
        subtitle="UNIS Group · Cập nhật: 24/04/2026 08:30"
        actions={
          <TimeRangeFilter
            mode="monthly"
            value={timeRange}
            onChange={setTimeRange}
            screenId="executive"
          />
        }
      />

      <HistoryBanner
        range={timeRange}
        onReset={() => setTimeRange(defaultTimeRange("monthly"))}
        entity="lãnh đạo"
        resetLabel="Quay về tháng này"
        currentLabel="Tháng này (T5)"
        compareMetrics={executiveCompare(timeRange)}
      />
      {/* ════ ZONE 1: 6 KPI cards ═══════════════════════════════════════ */}
      <section className="mb-8">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {KPIS.map((k) => (
            <button
              key={k.key}
              onClick={() => { setOpenKpi(k.key); setDrillTab("cn"); }}
              className={cn(
                "group relative overflow-hidden rounded-card border border-surface-3 border-l-[3px] bg-surface-1",
                "p-3.5 text-left transition-all hover:shadow-sm hover:-translate-y-px",
                "focus:outline-none focus:ring-2 focus:ring-primary/40",
                toneBorder(k.tone),
              )}
            >
              {/* Header: icon chip + label (1 dòng, không uppercase → đọc nhanh) */}
              <div className="flex items-center gap-1.5 mb-2">
                <div className={cn(
                  "shrink-0 rounded-md p-1",
                  k.tone === "ok" && "bg-success/10 text-success",
                  k.tone === "near" && "bg-warning/10 text-warning",
                  k.tone === "miss" && "bg-danger/10 text-danger",
                )}>
                  <k.icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-table-sm font-medium text-text-2 truncate">{k.label}</span>
              </div>

              {/* Row: value + sparkline cùng hàng → tiết kiệm chiều cao */}
              <div className="flex items-end justify-between gap-2 mb-2">
                <div className="flex items-baseline gap-1 min-w-0">
                  <span className="font-display text-[26px] leading-none font-bold text-text-1 tabular-nums">
                    {k.value}
                  </span>
                  {k.unit && <span className="text-table-sm text-text-3">{k.unit}</span>}
                </div>
                <Sparkline values={k.trend12w} tone={k.tone} />
              </div>

              {/* Footer 1 dòng: Mục tiêu · Delta vs kỳ trước
                  Gom 2 dòng cũ → 1 dòng compact, có context "vs T4" cho farmer hiểu */}
              <div className="flex items-center justify-between gap-2 text-caption text-text-3">
                <span className="truncate">{kpiTargetLabel(k.key, k.target)}</span>
                <span className="inline-flex items-center gap-1 shrink-0">
                  <DeltaBadge delta={k.delta} compact />
                  <span className="text-text-3/70">vs T4</span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ════ ZONE 2: Allocation tracking ═══════════════════════════════ */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-display text-h3 font-semibold text-text-1">Tình hình phân bổ — Tháng 5/2026</h2>
            <p className="text-table-sm text-text-2 mt-1">
              Booking <span className="font-medium text-text-1 tabular-nums">{allocSum.demand.toLocaleString("vi-VN")}m²</span>
              {" · "}
              Phân bổ <span className="font-medium text-text-1 tabular-nums">{allocSum.alloc.toLocaleString("vi-VN")}m² ({allocPct}%)</span>
              {" · "}
              Đang chở <span className="font-medium text-text-1 tabular-nums">{allocSum.pipeline.toLocaleString("vi-VN")}m²</span>
              {" · "}
              Đã nhận <span className="font-medium text-text-1 tabular-nums">{allocSum.received.toLocaleString("vi-VN")}m²</span>
            </p>
          </div>
        </div>
        <SmartTable<AllocRow>
          screenId="exec.alloc"
          data={ALLOC_ROWS}
          columns={allocCols}
          rowSeverity={(r) => r.tone === "miss" ? "shortage" : r.tone === "near" ? "watch" : undefined}
          defaultDensity="compact"
          drillDown={(r) => <AllocSkuDetail row={r} />}
          autoExpandWhen={(r) => r.fillRate < 80}
        />
      </section>

      {/* ════ ZONE 3: KPI trend 6 months ════════════════════════════════ */}
      <section className="mb-8">
        <div className="mb-3">
          <h2 className="font-display text-h3 font-semibold text-text-1">Xu hướng KPI — 6 tháng</h2>
          <p className="text-table-sm text-text-3 mt-1">Click số → xem chi tiết tháng đó</p>
        </div>
        <SmartTable<TrendRow>
          screenId="exec.trend"
          data={TREND_ROWS}
          columns={trendCols}
          defaultDensity="compact"
        />
      </section>

      {/* ════ ZONE 4: Decisions ═════════════════════════════════════════ */}
      <section className="mb-6">
        <h2 className="font-display text-h3 font-semibold text-text-1 mb-3">
          ⚡ Cần quyết định ({DECISIONS.length} mục)
        </h2>
        <div className="space-y-2">
          {DECISIONS.map((d) => {
            const expanded = openDec === d.id;
            const sevColor = d.severity === "danger" ? "border-l-danger bg-danger/5" : "border-l-warning bg-warning/5";
            return (
              <div key={d.id} className={cn("rounded-card border border-surface-3 border-l-4 transition-all", sevColor)}>
                <button
                  onClick={() => setOpenDec(expanded ? null : d.id)}
                  className="w-full text-left p-4 hover:bg-surface-2/30 rounded-card focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-text-1 mb-0.5">{d.title}</div>
                      <div className="text-table-sm text-text-2">{d.summary}</div>
                    </div>
                    <span className="text-caption text-primary font-medium shrink-0">
                      {expanded ? "Thu gọn ↑" : "Xem ↓"}
                    </span>
                  </div>
                </button>
                {expanded && (
                  <div className="px-4 pb-4 pt-0 space-y-3 border-t border-surface-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                      {d.context.map((c, i) => (
                        <div key={i} className="flex items-center justify-between rounded-card border border-surface-3 bg-surface-0 px-3 py-2">
                          <span className="text-table-sm text-text-2">{c.label}</span>
                          <span className={cn("text-table-sm font-medium tabular-nums", c.tone ? toneText(c.tone) : "text-text-1")}>
                            {c.value}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-card border border-info/30 bg-info-bg/40 p-3 text-table-sm text-text-1">
                      💡 <span className="font-medium">AI gợi ý:</span> {d.ai}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.actions.map((a, i) => (
                        <Button key={i} size="sm" variant={a.primary ? "default" : "outline"}>
                          {a.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ════ KPI drill-down sheet ══════════════════════════════════════ */}
      <Sheet open={!!openKpi} onOpenChange={(v) => !v && setOpenKpi(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md md:max-w-xl overflow-y-auto">
          {openKpi && (() => {
            const k = KPIS.find((x) => x.key === openKpi)!;
            const d = KPI_DRILL[openKpi];
            const tabs: { key: typeof drillTab; label: string; rows?: DrillTabRow[] }[] = [
              { key: "cn", label: "Theo CN", rows: d.byCn },
              { key: "sku", label: "Theo SKU", rows: d.bySku },
              { key: "nm", label: "Theo NM", rows: d.byNm },
              { key: "trend", label: "Xu hướng" },
            ].filter((t) => t.key === "trend" || (t.rows && t.rows.length > 0)) as typeof tabs;
            return (
              <>
                <SheetHeader>
                  <SheetTitle>{k.label} · {k.value}{k.unit}</SheetTitle>
                  <SheetDescription>{kpiTargetLabel(k.key, k.target)} · {k.delta.dir === "up" ? "↑" : k.delta.dir === "down" ? "↓" : "→"} {k.delta.value} vs tháng trước</SheetDescription>
                </SheetHeader>

                {/* Tab bar */}
                <div className="flex items-center gap-0 border-b border-surface-3 mt-4 mb-4">
                  {tabs.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setDrillTab(t.key)}
                      className={cn(
                        "px-3 py-2 text-table-sm font-medium transition-colors border-b-2",
                        drillTab === t.key
                          ? "border-primary text-primary"
                          : "border-transparent text-text-2 hover:text-text-1"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Tab content */}
                {drillTab !== "trend" ? (
                  <div className="space-y-1.5">
                    {(drillTab === "cn" ? d.byCn : drillTab === "sku" ? d.bySku : d.byNm)?.map((r) => {
                      const max = Math.max(...((drillTab === "cn" ? d.byCn : drillTab === "sku" ? d.bySku : d.byNm) ?? []).map((x) => x.value));
                      return (
                        <div key={r.name} className="grid grid-cols-[100px_1fr_80px] items-center gap-3 px-2 py-1.5 rounded-card hover:bg-surface-2">
                          <span className="font-mono text-table-sm font-medium text-text-1">{r.name}</span>
                          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full rounded-full", toneBg(r.tone))}
                              style={{ width: `${(r.value / max) * 100}%` }}
                            />
                          </div>
                          <span className={cn("text-right tabular-nums text-table-sm font-bold", toneText(r.tone))}>
                            {r.value}{r.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  d.trend && (
                    <div className="space-y-3">
                      <div className="rounded-card border border-surface-3 bg-surface-0 p-4">
                        <TrendChart trend={d.trend} tone={k.tone} />
                      </div>
                      <div className="text-table-sm text-text-2">
                        Mục tiêu: <span className="font-medium text-text-1">{d.trend.target}{d.trend.unit}</span> · Hiện tại: <span className={cn("font-bold", toneText(k.tone))}>{d.trend.values[d.trend.values.length - 1]}{d.trend.unit}</span>
                      </div>
                    </div>
                  )
                )}

                {/* Root cause + CTA */}
                {d.rootCause && (
                  <div className="rounded-card border border-warning/30 bg-warning-bg/40 p-3 text-table-sm text-text-1 mt-4">
                    🔍 <span className="font-medium">Nguyên nhân:</span> {d.rootCause}
                  </div>
                )}
                {d.ctaLabel && d.ctaRoute && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Button size="sm" onClick={() => { setOpenKpi(null); navigate(d.ctaRoute!); }}>
                      {d.ctaLabel} →
                    </Button>
                  </div>
                )}

                {/* Special: NM scorecard for "supplier" KPI */}
                {openKpi === "supplier" && (
                  <div className="mt-5">
                    <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
                      NM scorecard 5 yếu tố
                    </div>
                    <div className="rounded-card border border-surface-3 overflow-hidden">
                      <table className="w-full text-table-sm">
                        <thead className="bg-surface-1">
                          <tr>
                            <th className="text-left px-3 py-2 text-table-header uppercase text-text-3">NM</th>
                            <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Tổng</th>
                            <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Đáp ứng</th>
                            <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Đúng hẹn</th>
                            <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">CL</th>
                            <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Phản hồi</th>
                            <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Giá</th>
                          </tr>
                        </thead>
                        <tbody>
                          {NM_SCORECARD.map((n) => (
                            <tr key={n.nm} className="border-t border-surface-3/50">
                              <td className="px-3 py-2 font-medium text-text-1">{n.nm}</td>
                              <td className={cn("text-right tabular-nums px-2 py-2 font-bold", toneText(n.tone))}>
                                {n.total} {toneEmoji(n.tone)}
                              </td>
                              <td className="text-right tabular-nums px-2 py-2 text-text-2">{n.honor}%</td>
                              <td className="text-right tabular-nums px-2 py-2 text-text-2">{n.ontime}%</td>
                              <td className="text-right tabular-nums px-2 py-2 text-text-2">{n.quality}%</td>
                              <td className="text-right tabular-nums px-2 py-2 text-text-2">{n.response}%</td>
                              <td className="text-right tabular-nums px-2 py-2 text-text-2">{n.price}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ════ Trend cell popup ══════════════════════════════════════════ */}
      <Sheet open={!!trendCell} onOpenChange={(v) => !v && setTrendCell(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {trendCell && (
            <>
              <SheetHeader>
                <SheetTitle>{trendCell.kpi}</SheetTitle>
                <SheetDescription>{trendCell.period} · Giá trị {trendCell.value.toLocaleString("vi-VN")}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-table-sm">
                <div className="rounded-card border border-surface-3 bg-surface-0 p-3">
                  <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-1">Ghi chú</div>
                  <p className="text-text-2">
                    Dữ liệu lịch sử mock — trong môi trường thật sẽ hiển thị breakdown per CN/SKU, sự kiện ảnh hưởng (PO trễ, demand spike), và link đến báo cáo gốc của tháng.
                  </p>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => { setTrendCell(null); navigate("/reports"); }}>
                  Mở báo cáo {trendCell.period} →
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}

/* ════════════════════════════════════════════════════════════════════════
 * SUB-COMPONENTS
 * ══════════════════════════════════════════════════════════════════════ */

function AllocSkuDetail({ row }: { row: AllocRow }) {
  return (
    <div className="rounded-card border border-surface-3 bg-surface-0 p-3">
      <div className="text-caption uppercase tracking-wide text-text-3 font-semibold mb-2">
        Phân bổ chi tiết — {row.cn}
      </div>
      <div className="rounded-card border border-surface-3 overflow-hidden">
        <table className="w-full text-table-sm">
          <thead className="bg-surface-1">
            <tr>
              <th className="text-left px-3 py-2 text-table-header uppercase text-text-3">SKU</th>
              <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Cần</th>
              <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Phân bổ</th>
              <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Nhận</th>
              <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Pipeline</th>
              <th className="text-right px-2 py-2 text-table-header uppercase text-text-3">Thiếu</th>
              <th className="text-center px-2 py-2 text-table-header uppercase text-text-3">TT</th>
            </tr>
          </thead>
          <tbody>
            {row.skus.map((s) => (
              <tr key={s.sku} className="border-t border-surface-3/50">
                <td className="px-3 py-2 font-mono font-medium text-text-1">{s.sku}</td>
                <td className="text-right tabular-nums px-2 py-2 text-text-2">{s.demand.toLocaleString("vi-VN")}</td>
                <td className="text-right tabular-nums px-2 py-2 text-text-2">{s.alloc.toLocaleString("vi-VN")}</td>
                <td className="text-right tabular-nums px-2 py-2 text-text-2">{s.received.toLocaleString("vi-VN")}</td>
                <td className="text-right tabular-nums px-2 py-2 text-text-2">{s.pipeline.toLocaleString("vi-VN")}</td>
                <td className={cn("text-right tabular-nums px-2 py-2 font-medium", s.gap > 0 ? "text-danger" : "text-text-3")}>
                  {s.gap > 0 ? s.gap.toLocaleString("vi-VN") : "—"}
                </td>
                <td className="text-center px-2 py-2">
                  <span className={cn("text-table-sm", toneText(s.tone))}>{toneEmoji(s.tone)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrendChart({ trend, tone }: {
  trend: { weeks: string[]; values: number[]; target: number; unit: string };
  tone: Tone;
}) {
  const min = Math.min(...trend.values, trend.target);
  const max = Math.max(...trend.values, trend.target);
  const range = max - min || 1;
  const w = 480, h = 160, pad = 24;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;
  const step = innerW / (trend.values.length - 1);
  const pts = trend.values.map((v, i) => `${pad + i * step},${pad + innerH - ((v - min) / range) * innerH}`).join(" ");
  const targetY = pad + innerH - ((trend.target - min) / range) * innerH;
  const stroke = tone === "miss" ? "hsl(var(--danger))" : tone === "near" ? "hsl(var(--warning))" : "hsl(var(--success))";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {/* Target line */}
      <line x1={pad} y1={targetY} x2={w - pad} y2={targetY} stroke="hsl(var(--text-3))" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
      <text x={w - pad - 4} y={targetY - 4} textAnchor="end" fontSize="10" fill="hsl(var(--text-3))">
        Mục tiêu {trend.target}{trend.unit}
      </text>
      {/* Trend line */}
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {trend.values.map((v, i) => (
        <circle key={i} cx={pad + i * step} cy={pad + innerH - ((v - min) / range) * innerH} r="2.5" fill={stroke} />
      ))}
      {/* X-axis labels (every other) */}
      {trend.weeks.map((wk, i) => (
        i % 2 === 0 ? (
          <text key={i} x={pad + i * step} y={h - 4} textAnchor="middle" fontSize="10" fill="hsl(var(--text-3))">{wk}</text>
        ) : null
      ))}
    </svg>
  );
}

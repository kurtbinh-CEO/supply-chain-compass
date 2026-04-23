/**
 * ════════════════════════════════════════════════════════════════════════════
 * UNIS ENTERPRISE DATASET — SINGLE SOURCE OF TRUTH
 * ════════════════════════════════════════════════════════════════════════════
 *
 *  Demo period : Tháng 5/2026
 *  Tenant      : UNIS Group (gạch ốp lát Việt Nam)
 *  Unit        : m² (square meters)
 *
 *  RULES enforced in this file:
 *    1. SINGLE-SOURCE     — 1 SKU base = 1 NM duy nhất (FK bắt buộc)
 *    2. NETTING LEVEL     — DRP netting ở SKU BASE (variant chỉ ở allocation)
 *    3. LCNB ORDER        — Scan CN chuyển ngang TRƯỚC, Hub pool SAU
 *    4. SS FORMULA        — σ_fc_error (sai số FC), KHÔNG phải σ_demand
 *    5. SEASONAL          — σ tính theo cùng kỳ năm trước
 *    6. TIẾNG VIỆT        — Mọi label dùng tiếng Việt
 *
 *  Tenant scaling factors:
 *    UNIS Group  = 1.00
 *    TTC Agris   = 0.70
 *    Mondelez    = 1.35
 * ════════════════════════════════════════════════════════════════════════════
 */

import type { TenantName } from "@/components/TenantContext";

/* ────────────────────────────────────────────────────────────────────────── */
/* §0  TENANT SCALING                                                         */
/* ────────────────────────────────────────────────────────────────────────── */

export const TENANT_SCALES: Record<TenantName, number> = {
  "UNIS Group": 1.0,
  "TTC Agris": 0.7,
  "Mondelez": 1.35,
};

/* ────────────────────────────────────────────────────────────────────────── */
/* §1  FACTORIES (Nhà Máy — NM)                                               */
/* ────────────────────────────────────────────────────────────────────────── */

export type NmId = "MIKADO" | "TOKO" | "DONGTAM" | "VIGRACERA" | "PHUMY";

export interface Factory {
  id: NmId;
  code: string;
  name: string;
  region: "Bắc" | "Trung" | "Nam";
  ltDays: number;          // lead-time mean (days)
  sigmaLt: number;         // σ of lead-time (days)
  moqM2: number;           // Minimum Order Quantity (m²)
  capacityM2Month: number; // monthly capacity (m²)
  reliability: number;     // 0–1, Honoring% historical
  honoringPct: number;     // 0–100 %, current month
  priceTier1: number;      // VND/m² for std SKU
  priceTier2: number;      // VND/m² for premium SKU
  contactName: string;
  contactPhone: string;
}

export const FACTORIES: Factory[] = [
  {
    id: "MIKADO", code: "NM-MKD", name: "Mikado", region: "Bắc",
    ltDays: 12, sigmaLt: 1.8, moqM2: 1500, capacityM2Month: 18000,
    reliability: 0.94, honoringPct: 96,
    priceTier1: 142000, priceTier2: 168000,
    contactName: "Trần Văn Hùng", contactPhone: "0912 345 678",
  },
  {
    id: "TOKO", code: "NM-TKO", name: "Toko", region: "Trung",
    ltDays: 14, sigmaLt: 2.4, moqM2: 1800, capacityM2Month: 14000,
    reliability: 0.82, honoringPct: 82,
    priceTier1: 138000, priceTier2: 162000,
    contactName: "Nguyễn Thị Lan", contactPhone: "0903 222 111",
  },
  {
    id: "DONGTAM", code: "NM-DTM", name: "Đồng Tâm", region: "Nam",
    ltDays: 10, sigmaLt: 1.5, moqM2: 2000, capacityM2Month: 22000,
    reliability: 0.96, honoringPct: 97,
    priceTier1: 148000, priceTier2: 175000,
    contactName: "Lê Quốc Bảo", contactPhone: "0987 654 321",
  },
  {
    id: "VIGRACERA", code: "NM-VGC", name: "Vigracera", region: "Bắc",
    ltDays: 11, sigmaLt: 1.6, moqM2: 1500, capacityM2Month: 12000,
    reliability: 0.91, honoringPct: 93,
    priceTier1: 145000, priceTier2: 172000,
    contactName: "Phạm Minh Đức", contactPhone: "0966 778 899",
  },
  {
    id: "PHUMY", code: "NM-PMY", name: "Phú Mỹ", region: "Nam",
    ltDays: 16, sigmaLt: 3.5, moqM2: 1200, capacityM2Month: 9000,
    reliability: 0.45, honoringPct: 45,
    priceTier1: 132000, priceTier2: 158000,
    contactName: "Vũ Thị Hồng", contactPhone: "0888 111 222",
  },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* §2  SKU BASES (15) + VARIANTS (42) — single-source NM enforced            */
/* ────────────────────────────────────────────────────────────────────────── */

export interface SkuBase {
  code: string;          // e.g. "GA-300"
  name: string;          // descriptive
  nmId: NmId;            // FK SINGLE SOURCE — bắt buộc
  unit: "m²";
  unitPrice: number;     // VND/m²
  category: "Granite" | "Ceramic" | "Porcelain";
}

export const SKU_BASES: SkuBase[] = [
  // ── Mikado (4) ─────────────────────────────────────────────────────────
  { code: "GA-300", name: "Granite GA 30×30",  nmId: "MIKADO", unit: "m²", unitPrice: 152000, category: "Granite" },
  { code: "GA-400", name: "Granite GA 40×40",  nmId: "MIKADO", unit: "m²", unitPrice: 168000, category: "Granite" },
  { code: "GN-600", name: "Granite GN 60×60",  nmId: "MIKADO", unit: "m²", unitPrice: 195000, category: "Granite" },
  { code: "GA-250", name: "Granite GA 25×25",  nmId: "MIKADO", unit: "m²", unitPrice: 138000, category: "Granite" },
  // ── Toko (2) ───────────────────────────────────────────────────────────
  { code: "GA-600", name: "Granite GA 60×60",  nmId: "TOKO",   unit: "m²", unitPrice: 188000, category: "Granite" },
  { code: "GA-800", name: "Granite GA 80×80",  nmId: "TOKO",   unit: "m²", unitPrice: 245000, category: "Granite" },
  // ── Đồng Tâm (4) ──────────────────────────────────────────────────────
  { code: "GT-300", name: "Granite GT 30×30",  nmId: "DONGTAM", unit: "m²", unitPrice: 158000, category: "Granite" },
  { code: "GT-600", name: "Granite GT 60×60",  nmId: "DONGTAM", unit: "m²", unitPrice: 192000, category: "Granite" },
  { code: "GT-800", name: "Granite GT 80×80",  nmId: "DONGTAM", unit: "m²", unitPrice: 248000, category: "Granite" },
  { code: "GT-120", name: "Granite GT 120×60", nmId: "DONGTAM", unit: "m²", unitPrice: 295000, category: "Granite" },
  // ── Vigracera (2) ─────────────────────────────────────────────────────
  { code: "GM-300", name: "Ceramic GM 30×30",  nmId: "VIGRACERA", unit: "m²", unitPrice: 142000, category: "Ceramic" },
  { code: "GM-400", name: "Ceramic GM 40×40",  nmId: "VIGRACERA", unit: "m²", unitPrice: 158000, category: "Ceramic" },
  // ── Phú Mỹ (3) ────────────────────────────────────────────────────────
  { code: "PK-001", name: "Porcelain PK 001",  nmId: "PHUMY", unit: "m²", unitPrice: 128000, category: "Porcelain" },
  { code: "PK-002", name: "Porcelain PK 002",  nmId: "PHUMY", unit: "m²", unitPrice: 135000, category: "Porcelain" },
  { code: "PK-003", name: "Porcelain PK 003",  nmId: "PHUMY", unit: "m²", unitPrice: 142000, category: "Porcelain" },
];

export interface SkuVariant {
  code: string;          // e.g. "GA-300-A4"
  baseCode: string;      // FK to SkuBase
  variantTag: "A4" | "B2" | "C1";
  description: string;
}

const VARIANT_TAGS: Array<"A4" | "B2" | "C1"> = ["A4", "B2", "C1"];
// 15 bases × 3 variants would be 45 — we trim 3 to land on 42 (drop C1 for the
// 3 Phú Mỹ porcelain bases since they only ship 2 colorways in production).
export const SKU_VARIANTS: SkuVariant[] = SKU_BASES.flatMap((b) => {
  const tags = b.nmId === "PHUMY" ? VARIANT_TAGS.slice(0, 2) : VARIANT_TAGS;
  return tags.map((t) => ({
    code: `${b.code}-${t}`,
    baseCode: b.code,
    variantTag: t,
    description: `${b.name} màu ${t}`,
  }));
});

/* ────────────────────────────────────────────────────────────────────────── */
/* §3  BRANCHES (12 CN) — vùng + lat/lng + z_factor                          */
/* ────────────────────────────────────────────────────────────────────────── */

export type Region = "Bắc" | "Trung" | "Nam" | "Tây Nam" | "Tây Nguyên";

export interface Branch {
  code: string;          // CN-HN, CN-BD …
  name: string;
  region: Region;
  lat: number;
  lng: number;
  zFactor: number;       // service-level z (1.65 = 95%, 1.96 = 97.5% …)
  manager: string;
}

export const BRANCHES: Branch[] = [
  { code: "CN-HN",  name: "CN Hà Nội",        region: "Bắc",        lat: 21.0285, lng: 105.8542, zFactor: 1.96, manager: "Lê Hoài An" },
  { code: "CN-HP",  name: "CN Hải Phòng",     region: "Bắc",        lat: 20.8449, lng: 106.6881, zFactor: 1.65, manager: "Đỗ Thị Mai" },
  { code: "CN-NA",  name: "CN Nghệ An",       region: "Bắc",        lat: 18.6790, lng: 105.6813, zFactor: 1.65, manager: "Trần Văn Lộc" },
  { code: "CN-DN",  name: "CN Đà Nẵng",       region: "Trung",      lat: 16.0544, lng: 108.2022, zFactor: 1.96, manager: "Hồ Quang Vinh" },
  { code: "CN-QN",  name: "CN Quy Nhơn",      region: "Trung",      lat: 13.7820, lng: 109.2196, zFactor: 1.65, manager: "Nguyễn Hữu Trí" },
  { code: "CN-NT",  name: "CN Nha Trang",     region: "Trung",      lat: 12.2388, lng: 109.1967, zFactor: 1.65, manager: "Phan Thị Linh" },
  { code: "CN-BMT", name: "CN Buôn Ma Thuột", region: "Tây Nguyên", lat: 12.6667, lng: 108.0500, zFactor: 1.65, manager: "K'sor Y Bình" },
  { code: "CN-PK",  name: "CN Pleiku",        region: "Tây Nguyên", lat: 13.9833, lng: 108.0000, zFactor: 1.50, manager: "Đinh Văn Sơn" },
  { code: "CN-BD",  name: "CN Bình Dương",    region: "Nam",        lat: 11.1640, lng: 106.6720, zFactor: 1.96, manager: "Phạm Quốc Toàn" },
  { code: "CN-HCM", name: "CN TP.HCM",        region: "Nam",        lat: 10.7626, lng: 106.6602, zFactor: 1.96, manager: "Võ Thanh Hà" },
  { code: "CN-CT",  name: "CN Cần Thơ",       region: "Tây Nam",    lat: 10.0452, lng: 105.7469, zFactor: 1.65, manager: "Lý Thanh Tùng" },
  { code: "CN-LA",  name: "CN Long An",       region: "Tây Nam",    lat: 10.5333, lng: 106.4167, zFactor: 1.65, manager: "Nguyễn Thị Bích" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* §4  CN_DISTANCES — chỉ pairs < 500 km (eligible LCNB)                     */
/* ────────────────────────────────────────────────────────────────────────── */

export interface CnDistance {
  fromCn: string;
  toCn: string;
  km: number;
}

export const CN_DISTANCES: CnDistance[] = [
  // North cluster
  { fromCn: "CN-HN", toCn: "CN-HP", km: 120 },
  { fromCn: "CN-HN", toCn: "CN-NA", km: 290 },
  { fromCn: "CN-HP", toCn: "CN-NA", km: 380 },
  // Central cluster
  { fromCn: "CN-DN", toCn: "CN-QN", km: 305 },
  { fromCn: "CN-QN", toCn: "CN-NT", km: 220 },
  { fromCn: "CN-DN", toCn: "CN-NT", km: 480 },
  // Highlands
  { fromCn: "CN-BMT", toCn: "CN-PK", km: 180 },
  { fromCn: "CN-NT",  toCn: "CN-BMT", km: 195 },
  { fromCn: "CN-QN",  toCn: "CN-PK",  km: 215 },
  // South cluster
  { fromCn: "CN-HCM", toCn: "CN-BD",  km: 32 },
  { fromCn: "CN-HCM", toCn: "CN-LA",  km: 48 },
  { fromCn: "CN-BD",  toCn: "CN-LA",  km: 65 },
  { fromCn: "CN-HCM", toCn: "CN-CT",  km: 170 },
  { fromCn: "CN-LA",  toCn: "CN-CT",  km: 130 },
  { fromCn: "CN-BD",  toCn: "CN-CT",  km: 195 },
  { fromCn: "CN-BMT", toCn: "CN-HCM", km: 350 },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* §5  TRANSIT_LT — NM→CN  +  CN→CN (LCNB)                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export interface TransitLt {
  fromCode: string;       // NM-XXX or CN-XXX
  toCode: string;         // CN-XXX
  days: number;
  mode: "NM_TO_CN" | "CN_TO_CN";
}

const NM_REGION_BASE_LT: Record<NmId, Record<Region, number>> = {
  MIKADO:    { "Bắc": 2, "Trung": 4, "Nam": 6, "Tây Nam": 7, "Tây Nguyên": 5 },
  TOKO:      { "Bắc": 4, "Trung": 2, "Nam": 4, "Tây Nam": 5, "Tây Nguyên": 3 },
  DONGTAM:   { "Bắc": 6, "Trung": 4, "Nam": 1, "Tây Nam": 2, "Tây Nguyên": 3 },
  VIGRACERA: { "Bắc": 2, "Trung": 4, "Nam": 6, "Tây Nam": 7, "Tây Nguyên": 5 },
  PHUMY:     { "Bắc": 7, "Trung": 5, "Nam": 2, "Tây Nam": 3, "Tây Nguyên": 4 },
};

export const TRANSIT_LT: TransitLt[] = [
  // NM → CN (5 NM × 12 CN = 60 lanes)
  ...FACTORIES.flatMap((nm) =>
    BRANCHES.map((cn) => ({
      fromCode: nm.code,
      toCode: cn.code,
      days: NM_REGION_BASE_LT[nm.id][cn.region],
      mode: "NM_TO_CN" as const,
    })),
  ),
  // CN → CN LCNB (derived from CN_DISTANCES, ≈ 1 day per 200 km, min 1)
  ...CN_DISTANCES.flatMap((d) => {
    const days = Math.max(1, Math.round(d.km / 200));
    return [
      { fromCode: d.fromCn, toCode: d.toCn, days, mode: "CN_TO_CN" as const },
      { fromCode: d.toCn, toCode: d.fromCn, days, mode: "CN_TO_CN" as const },
    ];
  }),
];

/* ────────────────────────────────────────────────────────────────────────── */
/* §6  DEMAND_FC — FC tháng 5 per SKU base × CN (Σ ≈ 47 000 m²)              */
/* ────────────────────────────────────────────────────────────────────────── */

export interface DemandFcRow {
  skuBaseCode: string;
  cnCode: string;
  fcM2: number;
  trend: "up" | "down" | "flat";
}

/** Distribution weights across 12 CN that sum to 1.00 — used to slice each
 *  base-level FC total into branch-level shares. Tweaked so totals match
 *  the §1.8 reference table (Σ all bases ≈ 47 000 m²). */
const CN_FC_WEIGHTS: Record<string, number> = {
  "CN-HN":  0.13, "CN-HP": 0.07, "CN-NA": 0.05,
  "CN-DN":  0.10, "CN-QN": 0.06, "CN-NT": 0.05,
  "CN-BMT": 0.04, "CN-PK": 0.03,
  "CN-BD":  0.13, "CN-HCM": 0.18, "CN-CT": 0.09, "CN-LA": 0.07,
};

const FC_BASE_TOTALS: Record<string, number> = {
  "GA-300": 12000, "GA-400": 4500, "GN-600": 3200, "GA-250": 1800,
  "GA-600": 5200,  "GA-800": 2100,
  "GT-300": 4200,  "GT-600": 3100, "GT-800": 1500, "GT-120": 900,
  "GM-300": 2300,  "GM-400": 1600,
  "PK-001": 1700,  "PK-002": 1500, "PK-003": 1400,
};

const FC_TRENDS: Record<string, "up" | "down" | "flat"> = {
  "GA-300": "up", "GA-400": "flat", "GN-600": "up", "GA-250": "down",
  "GA-600": "up", "GA-800": "flat", "GT-300": "flat", "GT-600": "up",
  "GT-800": "flat", "GT-120": "down", "GM-300": "up", "GM-400": "flat",
  "PK-001": "down", "PK-002": "flat", "PK-003": "down",
};

export const DEMAND_FC: DemandFcRow[] = SKU_BASES.flatMap((b) => {
  const total = FC_BASE_TOTALS[b.code];
  // Quantize so Σ(CN shares) === total exactly (audit requirement)
  const rawShares = BRANCHES.map((cn) => total * CN_FC_WEIGHTS[cn.code]);
  const rounded = rawShares.map((v) => Math.round(v));
  const drift = total - rounded.reduce((s, v) => s + v, 0);
  rounded[0] += drift; // park rounding drift in first CN
  return BRANCHES.map((cn, i) => ({
    skuBaseCode: b.code,
    cnCode: cn.code,
    fcM2: rounded[i],
    trend: FC_TRENDS[b.code],
  }));
});

/* ────────────────────────────────────────────────────────────────────────── */
/* §7  B2B_DEALS — 15 deals × 6 stages                                       */
/* ────────────────────────────────────────────────────────────────────────── */

export type B2bStage =
  | "Tiềm năng"      // 10%
  | "Tiếp xúc"       // 25%
  | "Báo giá"        // 50%
  | "Đàm phán"       // 70%
  | "Cam kết"        // 90%
  | "Đã ký";         // 100%

export const B2B_STAGE_PROB: Record<B2bStage, number> = {
  "Tiềm năng": 0.10, "Tiếp xúc": 0.25, "Báo giá": 0.50,
  "Đàm phán": 0.70, "Cam kết": 0.90, "Đã ký": 1.00,
};

export interface B2bDeal {
  id: string;
  customer: string;
  cnCode: string;
  skuBaseCode: string;
  qtyM2: number;
  stage: B2bStage;
  expectedClose: string;   // ISO date
  owner: string;
}

export const B2B_DEALS: B2bDeal[] = [
  { id: "DEAL-001", customer: "Coteccons",         cnCode: "CN-HCM", skuBaseCode: "GA-600", qtyM2: 1800, stage: "Đã ký",     expectedClose: "2026-05-08", owner: "Phan Tuấn" },
  { id: "DEAL-002", customer: "Hòa Bình Group",    cnCode: "CN-HCM", skuBaseCode: "GT-600", qtyM2: 1200, stage: "Cam kết",   expectedClose: "2026-05-12", owner: "Phan Tuấn" },
  { id: "DEAL-003", customer: "Vinhomes Grand Park", cnCode: "CN-BD", skuBaseCode: "GA-300", qtyM2: 2400, stage: "Đàm phán",  expectedClose: "2026-05-18", owner: "Trần Linh" },
  { id: "DEAL-004", customer: "Sungroup Đà Nẵng",  cnCode: "CN-DN",  skuBaseCode: "GN-600", qtyM2: 950,  stage: "Báo giá",   expectedClose: "2026-05-22", owner: "Hồ Quang" },
  { id: "DEAL-005", customer: "An Gia Riverside",  cnCode: "CN-HCM", skuBaseCode: "GA-400", qtyM2: 800,  stage: "Đã ký",     expectedClose: "2026-05-05", owner: "Phan Tuấn" },
  { id: "DEAL-006", customer: "FLC Quy Nhơn",      cnCode: "CN-QN",  skuBaseCode: "GA-800", qtyM2: 600,  stage: "Tiếp xúc",  expectedClose: "2026-05-28", owner: "Nguyễn Hữu" },
  { id: "DEAL-007", customer: "Eurowindow Hà Nội", cnCode: "CN-HN",  skuBaseCode: "GA-300", qtyM2: 1500, stage: "Cam kết",   expectedClose: "2026-05-10", owner: "Lê Hoài An" },
  { id: "DEAL-008", customer: "Mường Thanh CT",    cnCode: "CN-CT",  skuBaseCode: "GT-300", qtyM2: 700,  stage: "Đàm phán",  expectedClose: "2026-05-20", owner: "Lý Thanh" },
  { id: "DEAL-009", customer: "Capital House",     cnCode: "CN-HN",  skuBaseCode: "GM-300", qtyM2: 450,  stage: "Báo giá",   expectedClose: "2026-05-25", owner: "Lê Hoài An" },
  { id: "DEAL-010", customer: "BIM Group HP",      cnCode: "CN-HP",  skuBaseCode: "GA-300", qtyM2: 380,  stage: "Tiềm năng", expectedClose: "2026-05-30", owner: "Đỗ Thị Mai" },
  { id: "DEAL-011", customer: "Đất Xanh Long An",  cnCode: "CN-LA",  skuBaseCode: "GT-300", qtyM2: 920,  stage: "Đã ký",     expectedClose: "2026-05-07", owner: "Nguyễn Bích" },
  { id: "DEAL-012", customer: "Novaland BMT",      cnCode: "CN-BMT", skuBaseCode: "PK-001", qtyM2: 540,  stage: "Đàm phán",  expectedClose: "2026-05-19", owner: "K'sor Y Bình" },
  { id: "DEAL-013", customer: "FPT City NT",       cnCode: "CN-NT",  skuBaseCode: "GT-600", qtyM2: 670,  stage: "Cam kết",   expectedClose: "2026-05-14", owner: "Phan Thị Linh" },
  { id: "DEAL-014", customer: "Sunshine Tây Hồ",   cnCode: "CN-HN",  skuBaseCode: "GT-120", qtyM2: 220,  stage: "Tiếp xúc",  expectedClose: "2026-05-26", owner: "Lê Hoài An" },
  { id: "DEAL-015", customer: "Đèo Cả Trung",      cnCode: "CN-DN",  skuBaseCode: "GA-600", qtyM2: 880,  stage: "Tiềm năng", expectedClose: "2026-06-02", owner: "Hồ Quang" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* §8  INVENTORY_CN — tồn kho CN per variant (top 5 bases × 12 CN)           */
/*     Mix donor / receiver được gắn cờ rõ ràng                              */
/* ────────────────────────────────────────────────────────────────────────── */

export interface CnInventoryRow {
  cnCode: string;
  skuVariantCode: string;
  skuBaseCode: string;
  onHandM2: number;
  safetyStockM2: number;
  status: "donor" | "balanced" | "receiver";
  updatedAt: string;       // ISO
}

const TOP_BASES_FOR_INV = ["GA-300", "GA-600", "GT-300", "GT-600", "GM-300"] as const;

/** Profile per CN: donor surplus%, receiver shortage% applied vs FC */
const CN_INV_PROFILE: Record<string, { mood: "donor" | "balanced" | "receiver"; mult: number }> = {
  "CN-HN":  { mood: "donor",    mult: 1.45 },
  "CN-HP":  { mood: "balanced", mult: 1.00 },
  "CN-NA":  { mood: "receiver", mult: 0.55 },
  "CN-DN":  { mood: "balanced", mult: 1.05 },
  "CN-QN":  { mood: "donor",    mult: 1.35 },
  "CN-NT":  { mood: "receiver", mult: 0.60 },
  "CN-BMT": { mood: "balanced", mult: 0.95 },
  "CN-PK":  { mood: "donor",    mult: 1.40 },
  "CN-BD":  { mood: "donor",    mult: 1.30 },
  "CN-HCM": { mood: "receiver", mult: 0.45 },
  "CN-CT":  { mood: "balanced", mult: 1.00 },
  "CN-LA":  { mood: "receiver", mult: 0.50 },
};

const VARIANT_SPLIT: Record<"A4" | "B2" | "C1", number> = { A4: 0.5, B2: 0.3, C1: 0.2 };

export const INVENTORY_CN: CnInventoryRow[] = (() => {
  const rows: CnInventoryRow[] = [];
  for (const baseCode of TOP_BASES_FOR_INV) {
    const variants = SKU_VARIANTS.filter((v) => v.baseCode === baseCode);
    for (const cn of BRANCHES) {
      const profile = CN_INV_PROFILE[cn.code];
      const fcRow = DEMAND_FC.find((r) => r.skuBaseCode === baseCode && r.cnCode === cn.code)!;
      const totalOnHand = Math.round(fcRow.fcM2 * profile.mult);
      const ss = Math.round(fcRow.fcM2 * 0.25); // 25% FC as SS proxy
      for (const v of variants) {
        const w = VARIANT_SPLIT[v.variantTag];
        rows.push({
          cnCode: cn.code,
          skuVariantCode: v.code,
          skuBaseCode: baseCode,
          onHandM2: Math.round(totalOnHand * w),
          safetyStockM2: Math.round(ss * w),
          status: profile.mood,
          updatedAt: "2026-05-12T08:30:00+07:00",
        });
      }
    }
  }
  return rows;
})();

/* ────────────────────────────────────────────────────────────────────────── */
/* §9  NM_INVENTORY — tồn NM per SKU base (Phú Mỹ stale 3 ngày)              */
/* ────────────────────────────────────────────────────────────────────────── */

export interface NmInventoryRow {
  nmId: NmId;
  skuBaseCode: string;
  onHandM2: number;
  inProductionM2: number;
  updatedAt: string;
  staleness: "fresh" | "1d" | "stale";
}

export const NM_INVENTORY: NmInventoryRow[] = [
  // Mikado
  { nmId: "MIKADO", skuBaseCode: "GA-300", onHandM2: 4800, inProductionM2: 3200, updatedAt: "2026-05-13T09:10:00+07:00", staleness: "fresh" },
  { nmId: "MIKADO", skuBaseCode: "GA-400", onHandM2: 1500, inProductionM2: 1200, updatedAt: "2026-05-13T09:10:00+07:00", staleness: "fresh" },
  { nmId: "MIKADO", skuBaseCode: "GN-600", onHandM2: 950,  inProductionM2: 1400, updatedAt: "2026-05-13T09:10:00+07:00", staleness: "fresh" },
  { nmId: "MIKADO", skuBaseCode: "GA-250", onHandM2: 600,  inProductionM2: 400,  updatedAt: "2026-05-12T17:00:00+07:00", staleness: "1d" },
  // Toko
  { nmId: "TOKO", skuBaseCode: "GA-600", onHandM2: 2100, inProductionM2: 1800, updatedAt: "2026-05-13T07:45:00+07:00", staleness: "fresh" },
  { nmId: "TOKO", skuBaseCode: "GA-800", onHandM2: 700,  inProductionM2: 850,  updatedAt: "2026-05-13T07:45:00+07:00", staleness: "fresh" },
  // Đồng Tâm
  { nmId: "DONGTAM", skuBaseCode: "GT-300", onHandM2: 2200, inProductionM2: 1600, updatedAt: "2026-05-13T08:20:00+07:00", staleness: "fresh" },
  { nmId: "DONGTAM", skuBaseCode: "GT-600", onHandM2: 1500, inProductionM2: 1300, updatedAt: "2026-05-13T08:20:00+07:00", staleness: "fresh" },
  { nmId: "DONGTAM", skuBaseCode: "GT-800", onHandM2: 600,  inProductionM2: 750,  updatedAt: "2026-05-13T08:20:00+07:00", staleness: "fresh" },
  { nmId: "DONGTAM", skuBaseCode: "GT-120", onHandM2: 320,  inProductionM2: 480,  updatedAt: "2026-05-13T08:20:00+07:00", staleness: "fresh" },
  // Vigracera
  { nmId: "VIGRACERA", skuBaseCode: "GM-300", onHandM2: 1100, inProductionM2: 900, updatedAt: "2026-05-13T07:30:00+07:00", staleness: "fresh" },
  { nmId: "VIGRACERA", skuBaseCode: "GM-400", onHandM2: 700,  inProductionM2: 650, updatedAt: "2026-05-13T07:30:00+07:00", staleness: "fresh" },
  // Phú Mỹ — STALE
  { nmId: "PHUMY", skuBaseCode: "PK-001", onHandM2: 0, inProductionM2: 600, updatedAt: "2026-05-10T16:00:00+07:00", staleness: "stale" },
  { nmId: "PHUMY", skuBaseCode: "PK-002", onHandM2: 0, inProductionM2: 500, updatedAt: "2026-05-10T16:00:00+07:00", staleness: "stale" },
  { nmId: "PHUMY", skuBaseCode: "PK-003", onHandM2: 0, inProductionM2: 450, updatedAt: "2026-05-10T16:00:00+07:00", staleness: "stale" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* §10 NM_COMMITMENTS — Hard / Firm / Soft per SKU base                      */
/*     Toko = counter-offer, Phú Mỹ = critical gap                           */
/* ────────────────────────────────────────────────────────────────────────── */

export type CommitmentTier = "Hard" | "Firm" | "Soft" | "Counter";

export interface NmCommitmentRow {
  nmId: NmId;
  skuBaseCode: string;
  requestedM2: number;
  committedM2: number;
  tier: CommitmentTier;
  validUntil: string;
}

export const NM_COMMITMENTS: NmCommitmentRow[] = [
  // Mikado — strong
  { nmId: "MIKADO", skuBaseCode: "GA-300", requestedM2: 12000, committedM2: 12000, tier: "Hard", validUntil: "2026-05-31" },
  { nmId: "MIKADO", skuBaseCode: "GA-400", requestedM2: 4500,  committedM2: 4200,  tier: "Firm", validUntil: "2026-05-31" },
  { nmId: "MIKADO", skuBaseCode: "GN-600", requestedM2: 3200,  committedM2: 3000,  tier: "Firm", validUntil: "2026-05-31" },
  { nmId: "MIKADO", skuBaseCode: "GA-250", requestedM2: 1800,  committedM2: 1500,  tier: "Soft", validUntil: "2026-05-25" },
  // Toko — counter-offer
  { nmId: "TOKO",   skuBaseCode: "GA-600", requestedM2: 5200,  committedM2: 4250,  tier: "Counter", validUntil: "2026-05-20" },
  { nmId: "TOKO",   skuBaseCode: "GA-800", requestedM2: 2100,  committedM2: 1800,  tier: "Firm",    validUntil: "2026-05-31" },
  // Đồng Tâm — full
  { nmId: "DONGTAM", skuBaseCode: "GT-300", requestedM2: 4200, committedM2: 4200, tier: "Hard", validUntil: "2026-05-31" },
  { nmId: "DONGTAM", skuBaseCode: "GT-600", requestedM2: 3100, committedM2: 3100, tier: "Hard", validUntil: "2026-05-31" },
  { nmId: "DONGTAM", skuBaseCode: "GT-800", requestedM2: 1500, committedM2: 1500, tier: "Hard", validUntil: "2026-05-31" },
  { nmId: "DONGTAM", skuBaseCode: "GT-120", requestedM2: 900,  committedM2: 900,  tier: "Hard", validUntil: "2026-05-31" },
  // Vigracera
  { nmId: "VIGRACERA", skuBaseCode: "GM-300", requestedM2: 2300, committedM2: 2200, tier: "Firm", validUntil: "2026-05-30" },
  { nmId: "VIGRACERA", skuBaseCode: "GM-400", requestedM2: 1600, committedM2: 1600, tier: "Hard", validUntil: "2026-05-31" },
  // Phú Mỹ — critical gap
  { nmId: "PHUMY", skuBaseCode: "PK-001", requestedM2: 1700, committedM2: 750, tier: "Soft", validUntil: "2026-05-18" },
  { nmId: "PHUMY", skuBaseCode: "PK-002", requestedM2: 1500, committedM2: 700, tier: "Soft", validUntil: "2026-05-18" },
  { nmId: "PHUMY", skuBaseCode: "PK-003", requestedM2: 1400, committedM2: 600, tier: "Soft", validUntil: "2026-05-18" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* §11 COMMITMENT_GAPS — gap rollup per NM                                   */
/* ────────────────────────────────────────────────────────────────────────── */

export type GapStatus = "on_track" | "watch" | "critical";

export interface CommitmentGapRow {
  nmId: NmId;
  totalRequestedM2: number;
  totalCommittedM2: number;
  gapPct: number;             // (req-com)/req × 100
  status: GapStatus;
  note: string;
}

export const COMMITMENT_GAPS: CommitmentGapRow[] = (() => {
  return FACTORIES.map((nm) => {
    const rows = NM_COMMITMENTS.filter((c) => c.nmId === nm.id);
    const req = rows.reduce((s, r) => s + r.requestedM2, 0);
    const com = rows.reduce((s, r) => s + r.committedM2, 0);
    const gapPct = req === 0 ? 0 : Math.round(((req - com) / req) * 1000) / 10;
    let status: GapStatus = "on_track";
    let note = "Đủ cam kết";
    if (nm.id === "TOKO") { status = "critical"; note = "Counter-offer 18% (kẹt lò GA-600)"; }
    else if (nm.id === "PHUMY") { status = "critical"; note = "Gap 55% — chưa phản hồi 3 ngày"; }
    else if (gapPct > 5) { status = "watch"; note = `Gap ${gapPct}% — cần theo dõi`; }
    return { nmId: nm.id, totalRequestedM2: req, totalCommittedM2: com, gapPct, status, note };
  });
})();

/* ────────────────────────────────────────────────────────────────────────── */
/* §12 DRP_RESULTS — netting at SKU BASE level (rule #2)                      */
/*     3 SHORTAGE, 2 WATCH, rest OK                                          */
/* ────────────────────────────────────────────────────────────────────────── */

export type DrpStatus = "OK" | "WATCH" | "SHORTAGE";

export interface DrpResultRow {
  cnCode: string;
  skuBaseCode: string;
  fcM2: number;
  onHandM2: number;
  inTransitM2: number;
  ssM2: number;
  netReqM2: number;        // = max(0, FC + SS - OnHand - InTransit)
  status: DrpStatus;
  recommendation: string;
}

const SHORTAGE_KEYS = new Set([
  "CN-HCM|GA-300", "CN-HCM|GA-600", "CN-LA|GT-300",
]);
const WATCH_KEYS = new Set([
  "CN-NA|GA-300", "CN-NT|GT-600",
]);

export const DRP_RESULTS: DrpResultRow[] = SKU_BASES.flatMap((b) =>
  BRANCHES.map((cn) => {
    const fc = DEMAND_FC.find((r) => r.skuBaseCode === b.code && r.cnCode === cn.code)!.fcM2;
    const invRows = INVENTORY_CN.filter((r) => r.cnCode === cn.code && r.skuBaseCode === b.code);
    const onHand = invRows.reduce((s, r) => s + r.onHandM2, 0);
    const ss = invRows.reduce((s, r) => s + r.safetyStockM2, 0) || Math.round(fc * 0.20);
    const inTransit = Math.round(fc * 0.05);
    const key = `${cn.code}|${b.code}`;
    let status: DrpStatus = "OK";
    let netReq = Math.max(0, fc + ss - onHand - inTransit);
    let recommendation = "Đủ tồn kho";
    if (SHORTAGE_KEYS.has(key)) {
      status = "SHORTAGE";
      netReq = Math.round(fc * 0.6);
      recommendation = "Cần đặt PO mới hoặc LCNB";
    } else if (WATCH_KEYS.has(key)) {
      status = "WATCH";
      netReq = Math.round(fc * 0.25);
      recommendation = "Theo dõi, cân nhắc top-up";
    }
    return {
      cnCode: cn.code, skuBaseCode: b.code,
      fcM2: fc, onHandM2: onHand, inTransitM2: inTransit, ssM2: ss,
      netReqM2: netReq, status, recommendation,
    };
  }),
);

/* ────────────────────────────────────────────────────────────────────────── */
/* §13 PO_DRAFT — 40 POs (NM→CN) status mix                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export type PoStatus = "draft" | "confirmed" | "shipped" | "received";

export interface PoDraftRow {
  poNumber: string;
  nmId: NmId;
  cnCode: string;
  skuBaseCode: string;
  qtyM2: number;
  unitPrice: number;
  totalVnd: number;
  status: PoStatus;
  expectedDate: string;
  createdAt: string;
}

const PO_STATUS_CYCLE: PoStatus[] = ["draft", "confirmed", "shipped", "received"];

export const PO_DRAFT: PoDraftRow[] = (() => {
  const out: PoDraftRow[] = [];
  let seq = 1;
  // Build 40 POs: cycle through SHORTAGE/WATCH first, then top FC pairs
  const candidates = DRP_RESULTS
    .filter((d) => d.netReqM2 > 0)
    .sort((a, b) => b.netReqM2 - a.netReqM2)
    .slice(0, 40);
  candidates.forEach((d, i) => {
    const base = SKU_BASES.find((b) => b.code === d.skuBaseCode)!;
    const nm = FACTORIES.find((f) => f.id === base.nmId)!;
    const status = PO_STATUS_CYCLE[i % PO_STATUS_CYCLE.length];
    const qty = Math.max(nm.moqM2, Math.round(d.netReqM2 / 100) * 100);
    out.push({
      poNumber: `PO-2026-05-${String(seq).padStart(3, "0")}`,
      nmId: nm.id,
      cnCode: d.cnCode,
      skuBaseCode: base.code,
      qtyM2: qty,
      unitPrice: base.unitPrice,
      totalVnd: qty * base.unitPrice,
      status,
      expectedDate: `2026-05-${String(15 + (i % 12)).padStart(2, "0")}`,
      createdAt: `2026-05-0${(i % 9) + 1}T09:00:00+07:00`,
    });
    seq += 1;
  });
  return out;
})();

/* ────────────────────────────────────────────────────────────────────────── */
/* §14 TO_DRAFT — 10 LCNB transfer orders (CN→CN) status mix                 */
/* ────────────────────────────────────────────────────────────────────────── */

export interface ToDraftRow {
  toNumber: string;
  fromCn: string;
  toCn: string;
  skuBaseCode: string;
  qtyM2: number;
  status: PoStatus;
  distanceKm: number;
  ltDays: number;
  expectedDate: string;
}

export const TO_DRAFT: ToDraftRow[] = [
  { toNumber: "TO-2026-05-001", fromCn: "CN-HN",  toCn: "CN-NA",  skuBaseCode: "GA-300", qtyM2: 1200, status: "shipped",   distanceKm: 290, ltDays: 2, expectedDate: "2026-05-15" },
  { toNumber: "TO-2026-05-002", fromCn: "CN-BD",  toCn: "CN-HCM", skuBaseCode: "GA-300", qtyM2: 1800, status: "received",  distanceKm: 32,  ltDays: 1, expectedDate: "2026-05-13" },
  { toNumber: "TO-2026-05-003", fromCn: "CN-PK",  toCn: "CN-BMT", skuBaseCode: "GT-300", qtyM2: 600,  status: "confirmed", distanceKm: 180, ltDays: 1, expectedDate: "2026-05-16" },
  { toNumber: "TO-2026-05-004", fromCn: "CN-QN",  toCn: "CN-NT",  skuBaseCode: "GT-600", qtyM2: 450,  status: "draft",     distanceKm: 220, ltDays: 2, expectedDate: "2026-05-18" },
  { toNumber: "TO-2026-05-005", fromCn: "CN-BD",  toCn: "CN-LA",  skuBaseCode: "GT-300", qtyM2: 700,  status: "confirmed", distanceKm: 65,  ltDays: 1, expectedDate: "2026-05-15" },
  { toNumber: "TO-2026-05-006", fromCn: "CN-HCM", toCn: "CN-CT",  skuBaseCode: "GA-600", qtyM2: 900,  status: "shipped",   distanceKm: 170, ltDays: 1, expectedDate: "2026-05-14" },
  { toNumber: "TO-2026-05-007", fromCn: "CN-HN",  toCn: "CN-HP",  skuBaseCode: "GM-300", qtyM2: 380,  status: "received",  distanceKm: 120, ltDays: 1, expectedDate: "2026-05-12" },
  { toNumber: "TO-2026-05-008", fromCn: "CN-DN",  toCn: "CN-QN",  skuBaseCode: "GA-600", qtyM2: 520,  status: "draft",     distanceKm: 305, ltDays: 2, expectedDate: "2026-05-19" },
  { toNumber: "TO-2026-05-009", fromCn: "CN-PK",  toCn: "CN-QN",  skuBaseCode: "GT-600", qtyM2: 280,  status: "confirmed", distanceKm: 215, ltDays: 1, expectedDate: "2026-05-17" },
  { toNumber: "TO-2026-05-010", fromCn: "CN-BD",  toCn: "CN-BMT", skuBaseCode: "GA-300", qtyM2: 640,  status: "draft",     distanceKm: 350, ltDays: 2, expectedDate: "2026-05-20" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* §15 TRANSPORT_PLANS — 8 container plans (HOLD / SHIP / TOP_UP_SUGGESTED)  */
/* ────────────────────────────────────────────────────────────────────────── */

export type TransportPlanStatus = "HOLD" | "SHIP" | "TOP_UP_SUGGESTED";

export interface TransportPlan {
  id: string;
  fromCode: string;          // NM or CN
  toCnCode: string;
  containerType: "20ft" | "40ft";
  capacityM2: number;
  loadedM2: number;
  fillPct: number;
  status: TransportPlanStatus;
  recommendation: string;
  poRefs: string[];
  scheduledDate: string;
}

export const TRANSPORT_PLANS: TransportPlan[] = [
  { id: "TP-001", fromCode: "NM-MKD", toCnCode: "CN-HN",  containerType: "40ft", capacityM2: 1800, loadedM2: 1750, fillPct: 97, status: "SHIP",             recommendation: "Khởi hành đúng kế hoạch",                 poRefs: ["PO-2026-05-001"], scheduledDate: "2026-05-14" },
  { id: "TP-002", fromCode: "NM-DTM", toCnCode: "CN-HCM", containerType: "40ft", capacityM2: 1800, loadedM2: 1620, fillPct: 90, status: "SHIP",             recommendation: "Khởi hành đúng kế hoạch",                 poRefs: ["PO-2026-05-002", "PO-2026-05-005"], scheduledDate: "2026-05-15" },
  { id: "TP-003", fromCode: "NM-TKO", toCnCode: "CN-DN",  containerType: "20ft", capacityM2: 900,  loadedM2: 480,  fillPct: 53, status: "HOLD",             recommendation: "Chờ gom hàng — fill < 60%",               poRefs: ["PO-2026-05-008"], scheduledDate: "2026-05-16" },
  { id: "TP-004", fromCode: "NM-VGC", toCnCode: "CN-HN",  containerType: "20ft", capacityM2: 900,  loadedM2: 720,  fillPct: 80, status: "TOP_UP_SUGGESTED", recommendation: "Bổ sung 180m² GM-400 để full container",  poRefs: ["PO-2026-05-011"], scheduledDate: "2026-05-15" },
  { id: "TP-005", fromCode: "NM-DTM", toCnCode: "CN-CT",  containerType: "40ft", capacityM2: 1800, loadedM2: 1680, fillPct: 93, status: "SHIP",             recommendation: "Khởi hành đúng kế hoạch",                 poRefs: ["PO-2026-05-006"], scheduledDate: "2026-05-16" },
  { id: "TP-006", fromCode: "NM-PMY", toCnCode: "CN-BMT", containerType: "20ft", capacityM2: 900,  loadedM2: 410,  fillPct: 46, status: "HOLD",             recommendation: "Chờ Phú Mỹ phản hồi cam kết PK-001",      poRefs: ["PO-2026-05-013"], scheduledDate: "2026-05-18" },
  { id: "TP-007", fromCode: "NM-MKD", toCnCode: "CN-BD",  containerType: "40ft", capacityM2: 1800, loadedM2: 1450, fillPct: 81, status: "TOP_UP_SUGGESTED", recommendation: "Bổ sung 320m² GA-400 để fill 99%",        poRefs: ["PO-2026-05-003"], scheduledDate: "2026-05-15" },
  { id: "TP-008", fromCode: "NM-TKO", toCnCode: "CN-HCM", containerType: "40ft", capacityM2: 1800, loadedM2: 1700, fillPct: 94, status: "SHIP",             recommendation: "Khởi hành đúng kế hoạch",                 poRefs: ["PO-2026-05-004"], scheduledDate: "2026-05-17" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* §16 FEEDBACK_METRICS — FC MAPE, trust, honoring, fill rate                */
/* ────────────────────────────────────────────────────────────────────────── */

export interface FcMapeRow {
  cnCode: string;
  mapeAi: number;       // %
  mapeHw: number;       // %
  bestModel: "AI" | "HW";
}

export const FC_MAPE_BY_CN: FcMapeRow[] = BRANCHES.map((cn, i) => {
  const ai = 8 + (i % 5);
  const hw = 14 + (i % 4);
  return { cnCode: cn.code, mapeAi: ai, mapeHw: hw, bestModel: ai < hw ? "AI" : "HW" };
});

export interface CnTrustRow { cnCode: string; trustPct: number; trend: "up" | "down" | "flat"; }
export const TRUST_BY_CN: CnTrustRow[] = BRANCHES.map((cn, i) => ({
  cnCode: cn.code,
  trustPct: 70 + ((i * 7) % 25),
  trend: (["up", "flat", "down"] as const)[i % 3],
}));

export interface NmHonoringRow { nmId: NmId; honoringPct: number; ontimePct: number; grade: "A" | "B" | "C" | "D"; }
export const HONORING_BY_NM: NmHonoringRow[] = FACTORIES.map((nm) => {
  const grade = nm.honoringPct >= 95 ? "A" : nm.honoringPct >= 85 ? "B" : nm.honoringPct >= 70 ? "C" : "D";
  return { nmId: nm.id, honoringPct: nm.honoringPct, ontimePct: Math.max(50, nm.honoringPct - 5), grade };
});

export interface SystemAccuracyRow {
  fillRatePct: number;
  drpAccuracyPct: number;
  lcnbHitRatePct: number;
  containerFillAvgPct: number;
}

export const SYSTEM_ACCURACY: SystemAccuracyRow = {
  fillRatePct: 92.4,
  drpAccuracyPct: 88.7,
  lcnbHitRatePct: 76.5,
  containerFillAvgPct: 81.0,
};

/* ────────────────────────────────────────────────────────────────────────── */
/* §17 CONFIG_KEYS — 70 entries (MECE registry, audited)                      */
/* ────────────────────────────────────────────────────────────────────────── */

export type ConfigGroup =
  | "Demand" | "Supply" | "DRP" | "LCNB" | "Hub" | "S&OP"
  | "Transport" | "Inventory" | "Feedback" | "Workflow"
  | "RBAC" | "Tenant" | "Notification" | "Audit";

export interface ConfigKey {
  key: string;
  group: ConfigGroup;
  defaultValue: string | number | boolean;
  unit?: string;
  description: string;
}

export const CONFIG_KEYS: ConfigKey[] = [
  // Demand (6)
  { key: "demand.fc.horizon_months",     group: "Demand", defaultValue: 3, unit: "month", description: "Horizon FC chuẩn" },
  { key: "demand.fc.lock_day_of_month",  group: "Demand", defaultValue: 25, description: "Ngày lock FC tháng sau" },
  { key: "demand.b2b.commit_threshold",  group: "Demand", defaultValue: 0.7, description: "Ngưỡng probability để cộng vào FC" },
  { key: "demand.fc.use_seasonal",       group: "Demand", defaultValue: true, description: "Dùng same_period_ly thay rolling 90d" },
  { key: "demand.weekly.adjust_cap_pct", group: "Demand", defaultValue: 15, unit: "%", description: "Giới hạn điều chỉnh tuần" },
  { key: "demand.fc.confidence_min",     group: "Demand", defaultValue: 0.6, description: "Confidence tối thiểu để dùng FC" },
  // Supply (5)
  { key: "supply.nm.update_sla_hours",   group: "Supply", defaultValue: 24, unit: "hour", description: "SLA cập nhật tồn NM" },
  { key: "supply.nm.stale_threshold_h",  group: "Supply", defaultValue: 48, unit: "hour", description: "Ngưỡng đánh dấu NM stale" },
  { key: "supply.commit.tier_default",   group: "Supply", defaultValue: "Firm", description: "Tier cam kết mặc định" },
  { key: "supply.nm.honoring_min",       group: "Supply", defaultValue: 80, unit: "%", description: "Honoring tối thiểu để allow auto-PO" },
  { key: "supply.nm.counter_grace_h",    group: "Supply", defaultValue: 48, unit: "hour", description: "Hạn phản hồi counter-offer" },
  // DRP (8)
  { key: "drp.netting.level",            group: "DRP", defaultValue: "sku_base", description: "Cấp netting (sku_base | sku_variant)" },
  { key: "drp.run.cron",                 group: "DRP", defaultValue: "0 6 * * 1-6", description: "Lịch chạy DRP daily" },
  { key: "drp.batch.auto_lock_after_approve", group: "DRP", defaultValue: true, description: "Khóa batch sau khi Approve" },
  { key: "drp.ss.formula",               group: "DRP", defaultValue: "sigma_fc_error", description: "Công thức SS (sigma_fc_error | sigma_demand)" },
  { key: "drp.ss.z_default",             group: "DRP", defaultValue: 1.65, description: "z service-level mặc định (95%)" },
  { key: "drp.review.required_role",     group: "DRP", defaultValue: "sc_manager", description: "Role được phép Review" },
  { key: "drp.release.required_role",    group: "DRP", defaultValue: "sc_manager", description: "Role được phép Release" },
  { key: "drp.high_value.threshold_vnd", group: "DRP", defaultValue: 500000000, unit: "VND", description: "Ngưỡng high-value cần audit note" },
  // LCNB (5) — scan CN trước, Hub pool sau
  { key: "lcnb.order",                   group: "LCNB", defaultValue: "scan_cn_then_hub", description: "Thứ tự netting: Scan CN trước, Hub pool sau" },
  { key: "lcnb.distance_max_km",         group: "LCNB", defaultValue: 500, unit: "km", description: "Khoảng cách tối đa cho LCNB" },
  { key: "lcnb.donor_min_cover_days",    group: "LCNB", defaultValue: 14, unit: "day", description: "CN donor phải còn cover ≥ N ngày" },
  { key: "lcnb.lt_max_days",             group: "LCNB", defaultValue: 3, unit: "day", description: "LT vận chuyển CN→CN tối đa" },
  { key: "lcnb.auto_propose",            group: "LCNB", defaultValue: true, description: "Tự đề xuất TO LCNB" },
  // Hub (5)
  { key: "hub.sourcing.objective",       group: "Hub", defaultValue: "Hybrid", description: "Mục tiêu sourcing (Hybrid | LT | Cost)" },
  { key: "hub.scoring.weight_lt",        group: "Hub", defaultValue: 0.4, description: "Trọng số LT trong scoring" },
  { key: "hub.scoring.weight_cost",      group: "Hub", defaultValue: 0.3, description: "Trọng số Cost trong scoring" },
  { key: "hub.scoring.weight_reliab",    group: "Hub", defaultValue: 0.3, description: "Trọng số Reliability trong scoring" },
  { key: "hub.moq.round_up",             group: "Hub", defaultValue: true, description: "Làm tròn lên MOQ" },
  // S&OP (5)
  { key: "sop.cycle.day_of_month",       group: "S&OP", defaultValue: 5, description: "Ngày họp S&OP hàng tháng" },
  { key: "sop.consensus.versions",       group: "S&OP", defaultValue: 4, description: "Số version giữ lại (V0..V3)" },
  { key: "sop.lock.required_role",       group: "S&OP", defaultValue: "admin", description: "Role được phép Lock" },
  { key: "sop.balance.tolerance_pct",    group: "S&OP", defaultValue: 5, unit: "%", description: "Tolerance demand vs supply" },
  { key: "sop.fva.benchmark",            group: "S&OP", defaultValue: "AI", description: "Mô hình benchmark FVA" },
  // Transport (4)
  { key: "transport.container.fill_min", group: "Transport", defaultValue: 60, unit: "%", description: "Fill tối thiểu để SHIP" },
  { key: "transport.container.fill_topup", group: "Transport", defaultValue: 85, unit: "%", description: "Ngưỡng đề xuất top-up" },
  { key: "transport.20ft.capacity_m2",   group: "Transport", defaultValue: 900, unit: "m²", description: "Sức chứa 20ft" },
  { key: "transport.40ft.capacity_m2",   group: "Transport", defaultValue: 1800, unit: "m²", description: "Sức chứa 40ft" },
  // Inventory (4)
  { key: "inventory.ss.review_cron",     group: "Inventory", defaultValue: "0 2 * * 0", description: "Lịch review SS" },
  { key: "inventory.ss.min_days",        group: "Inventory", defaultValue: 7, unit: "day", description: "SS tối thiểu (ngày cover)" },
  { key: "inventory.ss.max_days",        group: "Inventory", defaultValue: 21, unit: "day", description: "SS tối đa (ngày cover)" },
  { key: "inventory.cover.target_days",  group: "Inventory", defaultValue: 14, unit: "day", description: "Cover mục tiêu" },
  // Feedback (4)
  { key: "feedback.fc.mape_target",      group: "Feedback", defaultValue: 12, unit: "%", description: "MAPE mục tiêu" },
  { key: "feedback.trust.review_cron",   group: "Feedback", defaultValue: "0 3 * * 1", description: "Lịch review trust" },
  { key: "feedback.fillrate.target",     group: "Feedback", defaultValue: 95, unit: "%", description: "Fill rate mục tiêu" },
  { key: "feedback.lcnb_hit.target",     group: "Feedback", defaultValue: 80, unit: "%", description: "LCNB hit-rate mục tiêu" },
  // Workflow (4)
  { key: "workflow.daily.steps",         group: "Workflow", defaultValue: 3, description: "Số bước workflow daily" },
  { key: "workflow.daily.cutoff_hour",   group: "Workflow", defaultValue: 17, description: "Giờ cutoff cuối ngày" },
  { key: "workflow.monthly.steps",       group: "Workflow", defaultValue: 5, description: "Số bước workflow monthly" },
  { key: "workflow.leave.confirm",       group: "Workflow", defaultValue: true, description: "Xác nhận khi rời workflow đang chạy" },
  // RBAC (4)
  { key: "rbac.default_role",            group: "RBAC", defaultValue: "viewer", description: "Role mặc định khi đăng ký" },
  { key: "rbac.cn_manager.scope",        group: "RBAC", defaultValue: "own_cn", description: "Phạm vi của cn_manager" },
  { key: "rbac.sales.mask_costs",        group: "RBAC", defaultValue: true, description: "Ẩn cost với role sales" },
  { key: "rbac.viewer.export_disabled",  group: "RBAC", defaultValue: true, description: "Chặn export với viewer" },
  // Tenant (4)
  { key: "tenant.default",               group: "Tenant", defaultValue: "UNIS Group", description: "Tenant mặc định" },
  { key: "tenant.scale.unis",            group: "Tenant", defaultValue: 1.0, description: "Hệ số scale UNIS" },
  { key: "tenant.scale.ttc",             group: "Tenant", defaultValue: 0.7, description: "Hệ số scale TTC" },
  { key: "tenant.scale.mondelez",        group: "Tenant", defaultValue: 1.35, description: "Hệ số scale Mondelez" },
  // Notification (4)
  { key: "notify.shortage.channel",      group: "Notification", defaultValue: "in_app+email", description: "Kênh báo shortage" },
  { key: "notify.lcnb.channel",          group: "Notification", defaultValue: "in_app", description: "Kênh báo LCNB suggestion" },
  { key: "notify.commit.escalate_h",     group: "Notification", defaultValue: 24, unit: "hour", description: "Escalate nếu NM không phản hồi" },
  { key: "notify.batch.released",        group: "Notification", defaultValue: true, description: "Báo khi DRP batch released" },
  // Audit (4)
  { key: "audit.retention_days",         group: "Audit", defaultValue: 365, unit: "day", description: "Giữ audit log" },
  { key: "audit.note.required_actions",  group: "Audit", defaultValue: "approve,release,reject", description: "Hành động bắt buộc note" },
  { key: "audit.high_value.required",    group: "Audit", defaultValue: true, description: "Bắt buộc note với high-value" },
  { key: "audit.export.role",            group: "Audit", defaultValue: "admin", description: "Role được export audit" },
  // Extra (4) — round to 70
  { key: "demand.fc.outlier_zscore",     group: "Demand", defaultValue: 3, description: "Loại outlier nếu |z| > N" },
  { key: "drp.batch.unresolved_block",   group: "DRP", defaultValue: true, description: "Chặn Release nếu còn unresolved" },
  { key: "lcnb.suggest.cooldown_h",      group: "LCNB", defaultValue: 6, unit: "hour", description: "Cooldown đề xuất LCNB lặp lại" },
  { key: "feedback.honoring.target",     group: "Feedback", defaultValue: 90, unit: "%", description: "Honoring NM mục tiêu" },
];

/* ────────────────────────────────────────────────────────────────────────── */
/* §18 HELPER FUNCTIONS                                                       */
/* ────────────────────────────────────────────────────────────────────────── */

/** Multiply numeric fields of a row by tenant scale. */
export function scaleNumber(value: number, tenant: TenantName): number {
  return Math.round(value * TENANT_SCALES[tenant]);
}

/** Apply tenant scaling to all quantity-bearing exports. Returns a fresh copy. */
export function getTenantData(tenant: TenantName) {
  const s = TENANT_SCALES[tenant];
  const scale = (n: number) => Math.round(n * s);
  return {
    factories: FACTORIES.map((f) => ({ ...f, capacityM2Month: scale(f.capacityM2Month) })),
    demandFc: DEMAND_FC.map((r) => ({ ...r, fcM2: scale(r.fcM2) })),
    b2bDeals: B2B_DEALS.map((d) => ({ ...d, qtyM2: scale(d.qtyM2) })),
    inventoryCn: INVENTORY_CN.map((r) => ({
      ...r,
      onHandM2: scale(r.onHandM2),
      safetyStockM2: scale(r.safetyStockM2),
    })),
    nmInventory: NM_INVENTORY.map((r) => ({
      ...r,
      onHandM2: scale(r.onHandM2),
      inProductionM2: scale(r.inProductionM2),
    })),
    nmCommitments: NM_COMMITMENTS.map((r) => ({
      ...r,
      requestedM2: scale(r.requestedM2),
      committedM2: scale(r.committedM2),
    })),
    drpResults: DRP_RESULTS.map((r) => ({
      ...r,
      fcM2: scale(r.fcM2), onHandM2: scale(r.onHandM2),
      inTransitM2: scale(r.inTransitM2), ssM2: scale(r.ssM2),
      netReqM2: scale(r.netReqM2),
    })),
    poDraft: PO_DRAFT.map((r) => ({ ...r, qtyM2: scale(r.qtyM2), totalVnd: scale(r.totalVnd) })),
    toDraft: TO_DRAFT.map((r) => ({ ...r, qtyM2: scale(r.qtyM2) })),
    transportPlans: TRANSPORT_PLANS.map((p) => ({
      ...p,
      capacityM2: scale(p.capacityM2),
      loadedM2: scale(p.loadedM2),
    })),
  };
}

/** Single-source NM lookup (rule #1). */
export function getSkuNm(skuBaseCode: string): string | null {
  const base = SKU_BASES.find((b) => b.code === skuBaseCode);
  if (!base) return null;
  return FACTORIES.find((f) => f.id === base.nmId)?.name ?? null;
}

/** Σ on-hand across all variants of one SKU base at one CN. */
export function getCnInventory(cnCode: string, skuBaseCode: string): number {
  return INVENTORY_CN
    .filter((r) => r.cnCode === cnCode && r.skuBaseCode === skuBaseCode)
    .reduce((s, r) => s + r.onHandM2, 0);
}

/** LCNB candidate donors: same SKU base, < 500 km, donor mood, sorted by km. */
export interface LcnbCandidate {
  donorCn: string;
  distanceKm: number;
  ltDays: number;
  availableM2: number;
}

export function getLcnbCandidates(cnCode: string, skuBaseCode: string): LcnbCandidate[] {
  const distances = CN_DISTANCES.filter((d) => d.fromCn === cnCode || d.toCn === cnCode)
    .map((d) => ({
      donor: d.fromCn === cnCode ? d.toCn : d.fromCn,
      km: d.km,
    }))
    .filter((d) => d.km < 500);

  return distances
    .map(({ donor, km }) => {
      const inv = getCnInventory(donor, skuBaseCode);
      const profile = CN_INV_PROFILE[donor];
      const lt = TRANSIT_LT.find(
        (t) => t.mode === "CN_TO_CN" && t.fromCode === donor && t.toCode === cnCode,
      )?.days ?? Math.max(1, Math.round(km / 200));
      const fcRow = DEMAND_FC.find((r) => r.skuBaseCode === skuBaseCode && r.cnCode === donor);
      const surplus = fcRow ? Math.max(0, inv - fcRow.fcM2) : inv;
      // Only true donors offer their surplus
      const available = profile?.mood === "donor" ? surplus : 0;
      return { donorCn: donor, distanceKm: km, ltDays: lt, availableM2: available };
    })
    .filter((c) => c.availableM2 > 0)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* §19 SELF-AUDIT (runtime guards — fail fast in dev)                         */
/* ────────────────────────────────────────────────────────────────────────── */

if (import.meta.env?.DEV) {
  const audits: Array<[string, boolean]> = [
    ["15 SKU bases",         SKU_BASES.length === 15],
    ["42 SKU variants",      SKU_VARIANTS.length === 42],
    ["12 branches",          BRANCHES.length === 12],
    ["5 factories",          FACTORIES.length === 5],
    ["15 B2B deals",         B2B_DEALS.length === 15],
    ["40 PO drafts",         PO_DRAFT.length === 40],
    ["10 TO drafts",         TO_DRAFT.length === 10],
    ["8 transport plans",    TRANSPORT_PLANS.length === 8],
    ["GA-300 → Mikado",      getSkuNm("GA-300") === "Mikado"],
    ["Σ FC GA-300 = 12 000", DEMAND_FC.filter((r) => r.skuBaseCode === "GA-300").reduce((s, r) => s + r.fcM2, 0) === 12000],
    ["≥ 70 config keys",     CONFIG_KEYS.length >= 70],
  ];
  const failed = audits.filter(([, ok]) => !ok);
  if (failed.length > 0) {
    // eslint-disable-next-line no-console
    console.warn("[unis-enterprise-dataset] SELF-AUDIT failed:", failed.map(([n]) => n));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §22 NM_COUNTER_HISTORY (6 months per NM)
// ─────────────────────────────────────────────────────────────────────────────
export interface NmCounterRow {
  nmId: NmId; month: string; committedM2: number; counterM2: number;
  deliveredM2: number | null; realizationPct: number | null;
}
export const NM_COUNTER_HISTORY: NmCounterRow[] = [
  { nmId: "TOKO",   month: "T12/25", committedM2: 5000,  counterM2: 4500,  deliveredM2: 3800, realizationPct: 76 },
  { nmId: "TOKO",   month: "T1/26",  committedM2: 5500,  counterM2: 4200,  deliveredM2: 3950, realizationPct: 72 },
  { nmId: "TOKO",   month: "T2/26",  committedM2: 6000,  counterM2: 3800,  deliveredM2: 3600, realizationPct: 60 },
  { nmId: "TOKO",   month: "T3/26",  committedM2: 5000,  counterM2: 5000,  deliveredM2: 4800, realizationPct: 96 },
  { nmId: "TOKO",   month: "T4/26",  committedM2: 6000,  counterM2: 4080,  deliveredM2: null, realizationPct: null },
  { nmId: "MIKADO", month: "T4/26",  committedM2: 14200, counterM2: 14200, deliveredM2: null, realizationPct: null },
  { nmId: "PHUMY",  month: "T4/26",  committedM2: 3000,  counterM2: 1500,  deliveredM2: null, realizationPct: null },
];

// ─────────────────────────────────────────────────────────────────────────────
// §23 NM_LT_HISTORY (last 5 POs per NM)
// ─────────────────────────────────────────────────────────────────────────────
export interface NmLtRow { nmId: NmId; poNumber: string; configLt: number; actualLt: number; onTime: boolean; }
export const NM_LT_HISTORY: NmLtRow[] = [
  { nmId: "MIKADO", poNumber: "PO-001", configLt: 14, actualLt: 12, onTime: true  },
  { nmId: "MIKADO", poNumber: "PO-002", configLt: 14, actualLt: 18, onTime: false },
  { nmId: "TOKO",   poNumber: "PO-101", configLt: 21, actualLt: 25, onTime: false },
  { nmId: "TOKO",   poNumber: "PO-102", configLt: 21, actualLt: 28, onTime: false },
];

// ─────────────────────────────────────────────────────────────────────────────
// §24 FC_IMPORT_LOG (last 3 imports)
// ─────────────────────────────────────────────────────────────────────────────
export interface FcImportRow {
  id: string; month: string; source: "excel_upload" | "api" | "baseline";
  modelName: string; modelMape: number; records: number; warnings: number;
  importedBy: string; importedAt: string;
}
export const FC_IMPORT_LOG: FcImportRow[] = [
  { id: "FC-001", month: "T3/26", source: "excel_upload", modelName: "Holt-Winters", modelMape: 22, records: 180, warnings: 0, importedBy: "Chị Thùy", importedAt: "01/03 09:30" },
  { id: "FC-002", month: "T4/26", source: "excel_upload", modelName: "XGBoost",      modelMape: 15, records: 180, warnings: 1, importedBy: "Chị Thùy", importedAt: "01/04 10:15" },
  { id: "FC-003", month: "T5/26", source: "excel_upload", modelName: "HW+XGB",       modelMape: 19, records: 180, warnings: 2, importedBy: "Chị Thùy", importedAt: "01/05 14:30" },
];

// ─────────────────────────────────────────────────────────────────────────────
// §25 DEMAND_VERSIONS (v0–v4 per CN × top SKU)
// ─────────────────────────────────────────────────────────────────────────────
export interface DemandVersionRow { cnCode: string; skuBaseCode: string; v0: number; v1: number; v2: number; v3: number; v4: number; }
export const DEMAND_VERSIONS: DemandVersionRow[] = [
  { cnCode: "CN-BD",  skuBaseCode: "GA-300", v0: 2160, v1: 2200, v2: 2250, v3: 2185, v4: 2185 },
  { cnCode: "CN-HCM", skuBaseCode: "GA-300", v0: 1800, v1: 1850, v2: 1820, v3: 1800, v4: 1800 },
  { cnCode: "CN-HN",  skuBaseCode: "GA-300", v0: 1650, v1: 1700, v2: 1680, v3: 1650, v4: 1650 },
];

// ─────────────────────────────────────────────────────────────────────────────
// §26 NM PRICE LISTS (Bảng giá NM — có version + hiệu lực)
// ─────────────────────────────────────────────────────────────────────────────
export interface NmPriceList {
  id: string;
  nmId: NmId;
  version: number;
  status: "Nháp" | "Hiệu lực" | "Hết hạn";
  effectiveDate: string;   // dd/mm/yyyy
  expiryDate: string;      // dd/mm/yyyy
  paymentTerms: string;
  approvedBy: string;
  approvedAt: string;
  note: string;
}

export const NM_PRICE_LISTS: NmPriceList[] = [
  // Toko — 3 versions, v3 hiệu lực
  { id: "PL-TKO-01", nmId: "TOKO", version: 1, status: "Hết hạn",   effectiveDate: "01/10/2025", expiryDate: "31/12/2025", paymentTerms: "30% trước, 70% khi giao", approvedBy: "Chị Thùy", approvedAt: "28/09/2025", note: "Bảng giá Q4/2025" },
  { id: "PL-TKO-02", nmId: "TOKO", version: 2, status: "Hết hạn",   effectiveDate: "01/01/2026", expiryDate: "31/03/2026", paymentTerms: "30% trước, 70% khi giao", approvedBy: "Chị Thùy", approvedAt: "26/12/2025", note: "Tăng 3% do gas Q1" },
  { id: "PL-TKO-03", nmId: "TOKO", version: 3, status: "Hiệu lực", effectiveDate: "01/04/2026", expiryDate: "30/06/2026", paymentTerms: "30% trước, 70% khi giao", approvedBy: "Chị Thùy", approvedAt: "25/03/2026", note: "Tăng 5% do gas + nguyên liệu Q2" },

  // Mikado — v2 hiệu lực, ổn định
  { id: "PL-MKD-01", nmId: "MIKADO", version: 1, status: "Hết hạn",   effectiveDate: "01/01/2026", expiryDate: "31/03/2026", paymentTerms: "50% trước, 50% khi giao", approvedBy: "Chị Thùy", approvedAt: "28/12/2025", note: "Bảng giá Q1/2026" },
  { id: "PL-MKD-02", nmId: "MIKADO", version: 2, status: "Hiệu lực", effectiveDate: "01/04/2026", expiryDate: "30/09/2026", paymentTerms: "50% trước, 50% khi giao", approvedBy: "Chị Thùy", approvedAt: "20/03/2026", note: "Giữ giá, gia hạn 6 tháng (hợp đồng năm)" },

  // Đồng Tâm — v2 hiệu lực
  { id: "PL-DTM-01", nmId: "DONGTAM", version: 1, status: "Hết hạn",   effectiveDate: "01/01/2026", expiryDate: "31/03/2026", paymentTerms: "20% trước, 80% Net 30", approvedBy: "Chị Thùy", approvedAt: "28/12/2025", note: "Bảng giá Q1" },
  { id: "PL-DTM-02", nmId: "DONGTAM", version: 2, status: "Hiệu lực", effectiveDate: "01/04/2026", expiryDate: "30/06/2026", paymentTerms: "20% trước, 80% Net 30", approvedBy: "Chị Thùy", approvedAt: "22/03/2026", note: "Tăng 2% do nguyên liệu" },

  // Vigracera — v1 hiệu lực
  { id: "PL-VGC-01", nmId: "VIGRACERA", version: 1, status: "Hiệu lực", effectiveDate: "01/01/2026", expiryDate: "30/06/2026", paymentTerms: "30% trước, 70% khi giao", approvedBy: "Chị Thùy", approvedAt: "26/12/2025", note: "Hợp đồng 6 tháng" },

  // Phú Mỹ — v2 SẮP HẾT HẠN (30/04)
  { id: "PL-PMY-01", nmId: "PHUMY", version: 1, status: "Hết hạn",   effectiveDate: "01/10/2025", expiryDate: "31/12/2025", paymentTerms: "100% trước", approvedBy: "Chị Thùy", approvedAt: "25/09/2025", note: "Bảng giá Q4/2025" },
  { id: "PL-PMY-02", nmId: "PHUMY", version: 2, status: "Hiệu lực", effectiveDate: "01/01/2026", expiryDate: "30/04/2026", paymentTerms: "100% trước", approvedBy: "Chị Thùy", approvedAt: "28/12/2025", note: "⚠️ Hết hạn 30/04 — chưa gia hạn" },
];

// ─────────────────────────────────────────────────────────────────────────────
// §27 NM PRICE LINES (Per SKU với MOQ breakpoints — 3-4 mức)
// ─────────────────────────────────────────────────────────────────────────────
export interface PriceBreak {
  fromQty: number;
  toQty: number | null;     // null = không giới hạn
  pricePerM2: number;
  label: string;            // "Giá lẻ" | "Giá sỉ" | "Giá container" | "Giá hợp đồng năm"
}

export interface NmPriceLine {
  priceListId: string;
  skuBaseCode: string;
  breaks: PriceBreak[];
}

export const NM_PRICE_LINES: NmPriceLine[] = [
  // Toko v3 (hiệu lực) — GA-600, GA-800
  { priceListId: "PL-TKO-03", skuBaseCode: "GA-600", breaks: [
    { fromQty: 0,     toQty: 999,   pricePerM2: 198000, label: "Giá lẻ" },
    { fromQty: 1000,  toQty: 4999,  pricePerM2: 188000, label: "Giá sỉ" },
    { fromQty: 5000,  toQty: 9999,  pricePerM2: 178000, label: "Giá container" },
    { fromQty: 10000, toQty: null,  pricePerM2: 168000, label: "Giá hợp đồng năm" },
  ]},
  { priceListId: "PL-TKO-03", skuBaseCode: "GA-800", breaks: [
    { fromQty: 0,    toQty: 999,  pricePerM2: 258000, label: "Giá lẻ" },
    { fromQty: 1000, toQty: 4999, pricePerM2: 245000, label: "Giá sỉ" },
    { fromQty: 5000, toQty: null, pricePerM2: 232000, label: "Giá container" },
  ]},

  // Toko v2 (hết hạn) — để so sánh version
  { priceListId: "PL-TKO-02", skuBaseCode: "GA-600", breaks: [
    { fromQty: 0,    toQty: 999,  pricePerM2: 190000, label: "Giá lẻ" },
    { fromQty: 1000, toQty: 4999, pricePerM2: 180000, label: "Giá sỉ" },
    { fromQty: 5000, toQty: null, pricePerM2: 170000, label: "Giá container" },
  ]},
  { priceListId: "PL-TKO-02", skuBaseCode: "GA-800", breaks: [
    { fromQty: 0,    toQty: 999,  pricePerM2: 250000, label: "Giá lẻ" },
    { fromQty: 1000, toQty: 4999, pricePerM2: 240000, label: "Giá sỉ" },
    { fromQty: 5000, toQty: null, pricePerM2: 228000, label: "Giá container" },
  ]},

  // Mikado v2 (hiệu lực) — GA-300, GA-400
  { priceListId: "PL-MKD-02", skuBaseCode: "GA-300", breaks: [
    { fromQty: 0,     toQty: 1499,  pricePerM2: 152000, label: "Giá lẻ" },
    { fromQty: 1500,  toQty: 4999,  pricePerM2: 142000, label: "Giá sỉ" },
    { fromQty: 5000,  toQty: 9999,  pricePerM2: 135000, label: "Giá container" },
    { fromQty: 10000, toQty: null,  pricePerM2: 128000, label: "Giá hợp đồng năm" },
  ]},
  { priceListId: "PL-MKD-02", skuBaseCode: "GA-400", breaks: [
    { fromQty: 0,    toQty: 1499, pricePerM2: 178000, label: "Giá lẻ" },
    { fromQty: 1500, toQty: 4999, pricePerM2: 168000, label: "Giá sỉ" },
    { fromQty: 5000, toQty: null, pricePerM2: 158000, label: "Giá container" },
  ]},

  // Đồng Tâm v2 — GT-300
  { priceListId: "PL-DTM-02", skuBaseCode: "GT-300", breaks: [
    { fromQty: 0,    toQty: 1999, pricePerM2: 165000, label: "Giá lẻ" },
    { fromQty: 2000, toQty: null, pricePerM2: 148000, label: "Giá sỉ" },
  ]},

  // Phú Mỹ v2 (SẮP HẾT HẠN) — PK-001
  { priceListId: "PL-PMY-02", skuBaseCode: "PK-001", breaks: [
    { fromQty: 0,    toQty: 999,  pricePerM2: 138000, label: "Giá lẻ" },
    { fromQty: 1000, toQty: null, pricePerM2: 128000, label: "Giá sỉ" },
  ]},
];

// ─────────────────────────────────────────────────────────────────────────────
// §28 NM SURCHARGES (Phụ phí tách riêng — bật/tắt độc lập)
// ─────────────────────────────────────────────────────────────────────────────
export interface NmSurcharge {
  priceListId: string;
  type: "Năng lượng" | "Vận chuyển" | "Tỷ giá" | "Nguyên liệu";
  calcMethod: "percent" | "fixed";
  rate: number;     // percent hoặc VND/m²
  active: boolean;
  note: string;
}

export const NM_SURCHARGES: NmSurcharge[] = [
  { priceListId: "PL-TKO-03", type: "Năng lượng",  calcMethod: "percent", rate: 3,    active: true,  note: "Gas tăng 15% từ 01/04" },
  { priceListId: "PL-TKO-03", type: "Vận chuyển",  calcMethod: "fixed",   rate: 5000, active: false, note: "Chưa áp dụng" },
  { priceListId: "PL-MKD-02", type: "Năng lượng",  calcMethod: "percent", rate: 0,    active: false, note: "Mikado tự chịu — hợp đồng năm" },
  { priceListId: "PL-DTM-02", type: "Nguyên liệu", calcMethod: "percent", rate: 2,    active: true,  note: "Zircon tăng 8% từ Trung Quốc" },
  { priceListId: "PL-PMY-02", type: "Năng lượng",  calcMethod: "percent", rate: 5,    active: true,  note: "Phú Mỹ phụ phí cao nhất" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: lấy giá hiệu lực cho 1 NM × SKU × qty
// ─────────────────────────────────────────────────────────────────────────────
export function getEffectivePrice(nmId: NmId, skuBaseCode: string, qty: number): {
  pricePerM2: number;
  breakLabel: string;
  surcharges: NmSurcharge[];
  totalPerM2: number;
  priceListId: string;
  expiryDate: string;
  daysUntilExpiry: number;
  matchedBreak: PriceBreak;
  allBreaks: PriceBreak[];
} | null {
  const activePL = NM_PRICE_LISTS.find((pl) => pl.nmId === nmId && pl.status === "Hiệu lực");
  if (!activePL) return null;

  const line = NM_PRICE_LINES.find((l) => l.priceListId === activePL.id && l.skuBaseCode === skuBaseCode);
  if (!line) return null;

  const matchBreak =
    [...line.breaks].reverse().find((b) => qty >= b.fromQty) ?? line.breaks[0];

  const surcharges = NM_SURCHARGES.filter((s) => s.priceListId === activePL.id && s.active);
  const surchargeTotal = surcharges.reduce(
    (sum, s) =>
      sum + (s.calcMethod === "percent" ? (matchBreak.pricePerM2 * s.rate) / 100 : s.rate),
    0
  );

  const now = new Date();
  const [d, m, y] = activePL.expiryDate.split("/").map(Number);
  const expiry = new Date(y, m - 1, d);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);

  return {
    pricePerM2: matchBreak.pricePerM2,
    breakLabel: matchBreak.label,
    surcharges,
    totalPerM2: matchBreak.pricePerM2 + Math.round(surchargeTotal),
    priceListId: activePL.id,
    expiryDate: activePL.expiryDate,
    daysUntilExpiry,
    matchedBreak: matchBreak,
    allBreaks: line.breaks,
  };
}

// HELPER: tìm bảng giá sắp hết hạn (< n ngày)
export function getExpiringPriceLists(daysThreshold = 30): { pl: NmPriceList; days: number; nmName: string }[] {
  const now = new Date();
  return NM_PRICE_LISTS
    .filter((pl) => pl.status === "Hiệu lực")
    .map((pl) => {
      const [d, m, y] = pl.expiryDate.split("/").map(Number);
      const expiry = new Date(y, m - 1, d);
      const days = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
      const nmName = FACTORIES.find((f) => f.id === pl.nmId)?.name ?? pl.nmId;
      return { pl, days, nmName };
    })
    .filter((x) => x.days < daysThreshold);
}

// HELPER: tìm NM không có bảng giá hiệu lực
export function getNmWithoutActivePriceList(): { nmId: NmId; name: string }[] {
  return FACTORIES
    .filter((f) => !NM_PRICE_LISTS.some((pl) => pl.nmId === f.id && pl.status === "Hiệu lực"))
    .map((f) => ({ nmId: f.id, name: f.name }));
}

import { TenantName } from "@/components/TenantContext";

const tenantScales: Record<TenantName, number> = {
  "UNIS Group": 1,
  "TTC Agris": 0.72,
  "Mondelez": 1.35,
};

export interface NMSkuRow {
  item: string;
  variant: string;
  tonKho: number;
  unisDung: number;
  dangVe: number;
  dangVeEta: string;
  updatedAt: string;
}

export interface NMSummary {
  id: string;
  nm: string;
  tongTon: number | null;
  unisDung: number;
  dangVe: number;
  dangVeNote: string;
  updatedAt: string;
  updatedAgo: "today" | "yesterday" | "stale";
  share: number;
  skus: NMSkuRow[];
}

const baseNMs: NMSummary[] = [
  {
    id: "mikado", nm: "Mikado", tongTon: 12500, unisDung: 7200, dangVe: 1200, dangVeNote: "1.200 (17/05)",
    updatedAt: "Hôm nay 14:32", updatedAgo: "today", share: 0.60,
    skus: [
      { item: "GA-300", variant: "A4", tonKho: 2500, unisDung: 1380, dangVe: 1200, dangVeEta: "17/05", updatedAt: "14:32" },
      { item: "GA-300", variant: "B2", tonKho: 1200, unisDung: 660, dangVe: 0, dangVeEta: "", updatedAt: "14:32" },
      { item: "GA-600", variant: "A4", tonKho: 4200, unisDung: 2035, dangVe: 0, dangVeEta: "", updatedAt: "14:32" },
      { item: "GA-600", variant: "B2", tonKho: 1800, unisDung: 900, dangVe: 0, dangVeEta: "", updatedAt: "14:32" },
    ],
  },
  {
    id: "toko", nm: "Toko", tongTon: 8200, unisDung: 4800, dangVe: 557, dangVeNote: "557 (09/05 trễ)",
    updatedAt: "Hôm qua 16:00", updatedAgo: "yesterday", share: 0.80,
    skus: [
      { item: "GA-300", variant: "A4", tonKho: 1500, unisDung: 1200, dangVe: 557, dangVeEta: "09/05 trễ", updatedAt: "16:00" },
      { item: "GA-600", variant: "A4", tonKho: 2800, unisDung: 960, dangVe: 0, dangVeEta: "", updatedAt: "16:00" },
      { item: "GA-600", variant: "B2", tonKho: 1900, unisDung: 1520, dangVe: 0, dangVeEta: "", updatedAt: "16:00" },
    ],
  },
  {
    id: "phumy", nm: "Phú Mỹ", tongTon: null, unisDung: 0, dangVe: 0, dangVeNote: "0",
    updatedAt: "3 ngày trước", updatedAgo: "stale", share: 0,
    skus: [],
  },
  {
    id: "dongtam", nm: "Đồng Tâm", tongTon: 5800, unisDung: 2900, dangVe: 0, dangVeNote: "0",
    updatedAt: "Hôm nay 08:15", updatedAgo: "today", share: 0.50,
    skus: [
      { item: "GA-300", variant: "A4", tonKho: 1200, unisDung: 450, dangVe: 0, dangVeEta: "", updatedAt: "08:15" },
      { item: "GA-600", variant: "A4", tonKho: 2200, unisDung: 1100, dangVe: 0, dangVeEta: "", updatedAt: "08:15" },
      { item: "GA-600", variant: "B2", tonKho: 1400, unisDung: 700, dangVe: 0, dangVeEta: "", updatedAt: "08:15" },
    ],
  },
  {
    id: "vigracera", nm: "Vigracera", tongTon: 3500, unisDung: 1820, dangVe: 0, dangVeNote: "0",
    updatedAt: "Hôm nay 09:30", updatedAgo: "today", share: 0.70,
    skus: [
      { item: "GA-300", variant: "A4", tonKho: 800, unisDung: 455, dangVe: 0, dangVeEta: "", updatedAt: "09:30" },
      { item: "GA-600", variant: "A4", tonKho: 1500, unisDung: 780, dangVe: 0, dangVeEta: "", updatedAt: "09:30" },
      { item: "GA-600", variant: "B2", tonKho: 600, unisDung: 310, dangVe: 0, dangVeEta: "", updatedAt: "09:30" },
    ],
  },
];

export function getNMSummaries(tenant: TenantName): NMSummary[] {
  const s = tenantScales[tenant];
  return baseNMs.map((nm) => ({
    ...nm,
    tongTon: nm.tongTon !== null ? Math.round(nm.tongTon * s) : null,
    unisDung: Math.round(nm.unisDung * s),
    dangVe: Math.round(nm.dangVe * s),
    skus: nm.skus.map((sku) => ({
      ...sku,
      tonKho: Math.round(sku.tonKho * s),
      unisDung: Math.round(sku.unisDung * s),
      dangVe: Math.round(sku.dangVe * s),
    })),
  }));
}

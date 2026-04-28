/**
 * PriceTierSchedule — bảng giá theo bậc sản lượng cam kết với từng NM.
 * (PRD ADR-SCP-002: "Penalty" = chiết khấu volume — nếu kéo không đủ ngưỡng,
 * NM áp giá tier cao hơn cho TOÀN BỘ sản lượng đã mua → phụ phí retroactive.)
 *
 * tier1Threshold = ngưỡng tốt nhất (giá rẻ nhất khi kéo ≥ ngưỡng này).
 * Nếu released < tier2Threshold → rơi tier 3 (giá cao nhất).
 */

import type { NmId } from "./unis-enterprise-dataset";

export interface PriceTierSchedule {
  nmId: NmId;
  period: string;
  tier1Threshold: number; // m²
  tier1Price: number;     // ₫/m²
  tier2Threshold: number;
  tier2Price: number;
  tier3Threshold: number; // 0 = mọi sản lượng dưới tier2 đều là tier 3
  tier3Price: number;
  retroactiveUplift: boolean;
}

export const PRICE_TIERS: PriceTierSchedule[] = [
  {
    nmId: "MIKADO", period: "Q2-2026",
    tier1Threshold: 18000, tier1Price: 168200,
    tier2Threshold: 12000, tier2Price: 175000,
    tier3Threshold: 0,     tier3Price: 185000,
    retroactiveUplift: true,
  },
  {
    nmId: "TOKO", period: "Q2-2026",
    tier1Threshold: 6000,  tier1Price: 155000,
    tier2Threshold: 3000,  tier2Price: 165000,
    tier3Threshold: 0,     tier3Price: 178000,
    retroactiveUplift: true,
  },
  {
    nmId: "DONGTAM", period: "Q2-2026",
    tier1Threshold: 8000,  tier1Price: 145000,
    tier2Threshold: 5000,  tier2Price: 152000,
    tier3Threshold: 0,     tier3Price: 162000,
    retroactiveUplift: true,
  },
  {
    nmId: "VIGRACERA", period: "Q2-2026",
    tier1Threshold: 3500,  tier1Price: 148000,
    tier2Threshold: 2000,  tier2Price: 156000,
    tier3Threshold: 0,     tier3Price: 168000,
    retroactiveUplift: true,
  },
  {
    nmId: "PHUMY", period: "Q2-2026",
    tier1Threshold: 4000,  tier1Price: 132000,
    tier2Threshold: 2000,  tier2Price: 140000,
    tier3Threshold: 0,     tier3Price: 152000,
    retroactiveUplift: true,
  },
];

export type TierLevel = "tier1" | "tier2" | "tier3";

export interface TierStatus {
  schedule: PriceTierSchedule;
  current: TierLevel;
  currentPrice: number;
  /** Lượng cần kéo thêm để đạt ngưỡng tier kế trên (0 nếu đã ở tier 1) */
  toNextTier: number;
  nextTier: TierLevel | null;
  /** Phụ phí retroactive nếu rơi xuống tier hiện tại so với tier 1 (cho toàn bộ released) */
  upliftIfDrop: number;
  message: string;
}

export function getTierStatus(nmId: NmId, releasedM2: number): TierStatus | null {
  const s = PRICE_TIERS.find((p) => p.nmId === nmId);
  if (!s) return null;

  let current: TierLevel = "tier3";
  let currentPrice = s.tier3Price;
  let nextTier: TierLevel | null = "tier2";
  let toNextTier = Math.max(0, s.tier2Threshold - releasedM2);

  if (releasedM2 >= s.tier1Threshold) {
    current = "tier1";
    currentPrice = s.tier1Price;
    nextTier = null;
    toNextTier = 0;
  } else if (releasedM2 >= s.tier2Threshold) {
    current = "tier2";
    currentPrice = s.tier2Price;
    nextTier = "tier1";
    toNextTier = s.tier1Threshold - releasedM2;
  }

  // Phụ phí retroactive = (giá hiện tại − giá tier 1) × released
  const upliftIfDrop = current === "tier1"
    ? 0
    : (currentPrice - s.tier1Price) * releasedM2;

  let message: string;
  if (current === "tier1") {
    message = "Đã đạt Tier 1 ✅";
  } else if (current === "tier2") {
    message = `Cần kéo thêm ${toNextTier.toLocaleString("vi-VN")} m² để giữ Tier 1`;
  } else {
    message = `Gap lớn → đang ở Tier 3 (giá cao). Cần ${toNextTier.toLocaleString("vi-VN")} m² nữa lên Tier 2`;
  }

  return { schedule: s, current, currentPrice, toNextTier, nextTier, upliftIfDrop, message };
}

/** Mock dữ liệu "đã kéo" (released) per NM cho demo burn-down. */
export const RELEASED_BY_NM: Record<NmId, number> = {
  MIKADO:    12400,
  TOKO:      2800,
  DONGTAM:   6500,
  VIGRACERA: 1900,
  PHUMY:     800,
};

/** Mock burn-down theo tuần per NM (W16..W22). */
export const WEEKLY_BURN_BY_NM: Record<NmId, { week: string; pulled: number; status: "done" | "shipping" | "planned" }[]> = {
  MIKADO: [
    { week: "W16", pulled: 2800, status: "done" },
    { week: "W17", pulled: 2600, status: "done" },
    { week: "W18", pulled: 3500, status: "done" },
    { week: "W19", pulled: 1800, status: "shipping" },
    { week: "W20", pulled: 1700, status: "planned" },
    { week: "W21", pulled: 2500, status: "planned" },
    { week: "W22", pulled: 2800, status: "planned" },
  ],
  TOKO: [
    { week: "W16", pulled: 800, status: "done" },
    { week: "W17", pulled: 900, status: "done" },
    { week: "W18", pulled: 700, status: "done" },
    { week: "W19", pulled: 400, status: "shipping" },
    { week: "W20", pulled: 600, status: "planned" },
  ],
  DONGTAM: [
    { week: "W16", pulled: 1800, status: "done" },
    { week: "W17", pulled: 1500, status: "done" },
    { week: "W18", pulled: 1700, status: "done" },
    { week: "W19", pulled: 1500, status: "shipping" },
    { week: "W20", pulled: 1200, status: "planned" },
  ],
  VIGRACERA: [
    { week: "W16", pulled: 600, status: "done" },
    { week: "W17", pulled: 500, status: "done" },
    { week: "W18", pulled: 400, status: "done" },
    { week: "W19", pulled: 400, status: "shipping" },
    { week: "W20", pulled: 500, status: "planned" },
  ],
  PHUMY: [
    { week: "W16", pulled: 250, status: "done" },
    { week: "W17", pulled: 200, status: "done" },
    { week: "W18", pulled: 200, status: "done" },
    { week: "W19", pulled: 150, status: "shipping" },
  ],
};

/** Mock SKU-level released breakdown per NM (cho drill-down). */
export const SKU_RELEASED_BY_NM: Record<NmId, { sku: string; committed: number; released: number; lastPo: string }[]> = {
  MIKADO: [
    { sku: "GA-300 A4", committed: 8500, released: 5200, lastPo: "PO-HN-W20 1.500" },
    { sku: "GA-600 A4", committed: 5200, released: 3000, lastPo: "PO-BD-W20 800" },
    { sku: "GA-400 A4", committed: 4000, released: 2400, lastPo: "PO-HCM-W19 600" },
    { sku: "GT-300 A4", committed: 3000, released: 1800, lastPo: "—" },
  ],
  TOKO: [
    { sku: "GA-600 A4", committed: 3500, released: 1600, lastPo: "PO-HCM-W20 400" },
    { sku: "GA-300 A4", committed: 2550, released: 1200, lastPo: "PO-HN-W19 300" },
  ],
  DONGTAM: [
    { sku: "GT-300 A4", committed: 5800, released: 3900, lastPo: "PO-DN-W20 1.000" },
    { sku: "GT-600 A4", committed: 3900, released: 2600, lastPo: "PO-HN-W19 700" },
  ],
  VIGRACERA: [
    { sku: "GA-300 A4", committed: 2300, released: 1200, lastPo: "PO-HN-W19 400" },
    { sku: "GA-400 A4", committed: 1500, released: 700, lastPo: "—" },
  ],
  PHUMY: [
    { sku: "PK-001", committed: 1200, released: 500, lastPo: "PO-HCM-W18 200" },
    { sku: "PK-002", committed: 850, released: 300, lastPo: "—" },
  ],
};

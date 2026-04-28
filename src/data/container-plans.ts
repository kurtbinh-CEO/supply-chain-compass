/* ═══════════════════════════════════════════════════════════════════════════
   §  CONTAINER PLANS — DRP Bước 3 "Đóng container" mock dataset
   ═══════════════════════════════════════════════════════════════════════════
   12 chuyến mock: 8 mới (draft/ready), 4 đang vận chuyển/hoàn tất.
   - Multi-drop "ghép tuyến" để giảm cước.
   - Fill rate < 70% gắn cảnh báo (hold/ship).
   - poIds & cnCodes để cross-link sang tab Phân bổ và sang /orders.
*/

export interface DropPoint {
  order: number;
  cnCode: string;
  cnName: string;
  qtyM2: number;
  eta: string;            // "20/05" hoặc ISO
  skuLines: { sku: string; qty: number }[];
}

export type ContainerStatus = "draft" | "ready" | "hold" | "in_transit" | "delivered";

export interface ContainerPlan {
  id: string;             // TP-001
  vehicle: string;        // "40ft" | "Xe10T" | "20ft"
  capacityM2: number;     // theo loại xe
  factoryCode: string;    // NM-DT
  factoryName: string;    // Đồng Tâm
  fillPct: number;        // 0-100
  fillM2: number;
  freightVnd: number;     // cước (VND)
  savingVnd: number;      // tiết kiệm vs đi riêng
  routeLabel: string;     // "ĐT → BD → DN"
  distanceKm: number;
  status: ContainerStatus;
  holdDeadline?: string;  // hh:mm hôm nay
  drops: DropPoint[];
  poIds: string[];
  consolidated: boolean;  // ghép tuyến nhiều CN
  suggestion?: "gom_them" | "xuat_ngay" | "tach_xe" | null;
  suggestionLabel?: string;
}

export const CONTAINER_PLANS: ContainerPlan[] = [
  /* ──── 1: Ghép tuyến ĐT → BD → DN, fill 85% — recommend Xuất ngay ──── */
  {
    id: "TP-001", vehicle: "40ft", capacityM2: 2400,
    factoryCode: "NM-DT", factoryName: "Đồng Tâm",
    fillPct: 85, fillM2: 2040,
    freightVnd: 18_500_000, savingVnd: 4_200_000,
    routeLabel: "ĐT → CN-BD → CN-DN", distanceKm: 142,
    status: "ready", consolidated: true,
    suggestion: "xuat_ngay", suggestionLabel: "Fill ổn — xuất ngay tiết kiệm 4,2M₫",
    drops: [
      { order: 1, cnCode: "CN-BD", cnName: "CN Bình Dương", qtyM2: 1200, eta: "20/05",
        skuLines: [{ sku: "GR60-IV-A", qty: 800 }, { sku: "GR60-BG-A", qty: 400 }] },
      { order: 2, cnCode: "CN-DN", cnName: "CN Đồng Nai", qtyM2: 840, eta: "20/05",
        skuLines: [{ sku: "GR60-IV-A", qty: 600 }, { sku: "GR80-WH-B", qty: 240 }] },
    ],
    poIds: ["PO-BD-W20-002", "PO-DN-W20-001"],
  },

  /* ──── 2: Ghép tuyến VGR → NA → PK, fill THẤP 60% ──── */
  {
    id: "TP-002", vehicle: "Xe10T", capacityM2: 1200,
    factoryCode: "NM-VGR", factoryName: "Viglacera",
    fillPct: 60, fillM2: 720,
    freightVnd: 12_800_000, savingVnd: 1_900_000,
    routeLabel: "VGR → CN-NA → CN-PK", distanceKm: 280,
    status: "hold", holdDeadline: "16:00",
    consolidated: true,
    suggestion: "gom_them", suggestionLabel: "Gom thêm 480m² trước 16:00 để đạt 100%",
    drops: [
      { order: 1, cnCode: "CN-NA", cnName: "CN Nghệ An", qtyM2: 420, eta: "21/05",
        skuLines: [{ sku: "GR60-IV-A", qty: 420 }] },
      { order: 2, cnCode: "CN-PK", cnName: "CN Phú Khánh", qtyM2: 300, eta: "22/05",
        skuLines: [{ sku: "GR80-WH-B", qty: 300 }] },
    ],
    poIds: ["PO-NA-W20-001", "PO-PK-W20-001"],
  },

  /* ──── 3: ĐT → HCM, single drop, fill 92% ──── */
  {
    id: "TP-003", vehicle: "40ft", capacityM2: 2400,
    factoryCode: "NM-DT", factoryName: "Đồng Tâm",
    fillPct: 92, fillM2: 2208,
    freightVnd: 16_200_000, savingVnd: 0,
    routeLabel: "ĐT → CN-HCM", distanceKm: 65,
    status: "ready", consolidated: false,
    drops: [
      { order: 1, cnCode: "CN-HCM", cnName: "CN HCM", qtyM2: 2208, eta: "20/05",
        skuLines: [{ sku: "GR60-IV-A", qty: 1600 }, { sku: "GR60-BG-A", qty: 608 }] },
    ],
    poIds: ["PO-HCM-W20-001"],
  },

  /* ──── 4: Ghép HN → HP → QN, fill 78% ──── */
  {
    id: "TP-004", vehicle: "40ft", capacityM2: 2400,
    factoryCode: "NM-VGR", factoryName: "Viglacera",
    fillPct: 78, fillM2: 1872,
    freightVnd: 19_400_000, savingVnd: 5_100_000,
    routeLabel: "VGR → CN-HN → CN-HP → CN-QN", distanceKm: 320,
    status: "ready", consolidated: true,
    drops: [
      { order: 1, cnCode: "CN-HN", cnName: "CN Hà Nội", qtyM2: 900, eta: "21/05",
        skuLines: [{ sku: "GR60-IV-A", qty: 600 }, { sku: "GR80-WH-B", qty: 300 }] },
      { order: 2, cnCode: "CN-HP", cnName: "CN Hải Phòng", qtyM2: 600, eta: "21/05",
        skuLines: [{ sku: "GR60-BG-A", qty: 600 }] },
      { order: 3, cnCode: "CN-QN", cnName: "CN Quảng Ninh", qtyM2: 372, eta: "22/05",
        skuLines: [{ sku: "GR60-IV-A", qty: 372 }] },
    ],
    poIds: ["PO-HN-W20-002", "PO-HP-W20-001", "PO-QN-W20-001"],
  },

  /* ──── 5: ĐT → CT, single, fill 95% ──── */
  {
    id: "TP-005", vehicle: "40ft", capacityM2: 2400,
    factoryCode: "NM-DT", factoryName: "Đồng Tâm",
    fillPct: 95, fillM2: 2280,
    freightVnd: 21_500_000, savingVnd: 0,
    routeLabel: "ĐT → CN-CT", distanceKm: 175,
    status: "ready", consolidated: false,
    drops: [
      { order: 1, cnCode: "CN-CT", cnName: "CN Cần Thơ", qtyM2: 2280, eta: "21/05",
        skuLines: [{ sku: "GR60-IV-A", qty: 1280 }, { sku: "GR60-BG-A", qty: 1000 }] },
    ],
    poIds: ["PO-CT-W20-001"],
  },

  /* ──── 6: Single fill THẤP 55% — recommend Tách xe ──── */
  {
    id: "TP-006", vehicle: "Xe10T", capacityM2: 1200,
    factoryCode: "NM-DT", factoryName: "Đồng Tâm",
    fillPct: 55, fillM2: 660,
    freightVnd: 9_600_000, savingVnd: 0,
    routeLabel: "ĐT → CN-AG", distanceKm: 220,
    status: "hold", holdDeadline: "14:30",
    consolidated: false,
    suggestion: "tach_xe", suggestionLabel: "Fill quá thấp — tách sang xe nhỏ 5T tiết kiệm 2,8M₫",
    drops: [
      { order: 1, cnCode: "CN-AG", cnName: "CN An Giang", qtyM2: 660, eta: "22/05",
        skuLines: [{ sku: "GR60-IV-A", qty: 660 }] },
    ],
    poIds: ["PO-AG-W20-001"],
  },

  /* ──── 7: VGR → TH, single, fill 88% ──── */
  {
    id: "TP-007", vehicle: "40ft", capacityM2: 2400,
    factoryCode: "NM-VGR", factoryName: "Viglacera",
    fillPct: 88, fillM2: 2112,
    freightVnd: 14_700_000, savingVnd: 0,
    routeLabel: "VGR → CN-TH", distanceKm: 95,
    status: "draft", consolidated: false,
    drops: [
      { order: 1, cnCode: "CN-TH", cnName: "CN Thanh Hoá", qtyM2: 2112, eta: "22/05",
        skuLines: [{ sku: "GR60-IV-A", qty: 1500 }, { sku: "GR80-WH-B", qty: 612 }] },
    ],
    poIds: ["PO-TH-W20-001"],
  },

  /* ──── 8: Ghép ĐT → VT → BT, fill 72% ──── */
  {
    id: "TP-008", vehicle: "Xe10T", capacityM2: 1200,
    factoryCode: "NM-DT", factoryName: "Đồng Tâm",
    fillPct: 72, fillM2: 864,
    freightVnd: 10_500_000, savingVnd: 1_400_000,
    routeLabel: "ĐT → CN-VT → CN-BT", distanceKm: 130,
    status: "draft", consolidated: true,
    drops: [
      { order: 1, cnCode: "CN-VT", cnName: "CN Vũng Tàu", qtyM2: 480, eta: "22/05",
        skuLines: [{ sku: "GR60-IV-A", qty: 480 }] },
      { order: 2, cnCode: "CN-BT", cnName: "CN Bến Tre", qtyM2: 384, eta: "23/05",
        skuLines: [{ sku: "GR60-BG-A", qty: 384 }] },
    ],
    poIds: ["PO-VT-W20-001", "PO-BT-W20-001"],
  },

  /* ──── 9-12: đang vận chuyển / hoàn tất (read-only) ──── */
  {
    id: "TP-009", vehicle: "40ft", capacityM2: 2400,
    factoryCode: "NM-DT", factoryName: "Đồng Tâm",
    fillPct: 90, fillM2: 2160,
    freightVnd: 18_900_000, savingVnd: 3_600_000,
    routeLabel: "ĐT → CN-HCM → CN-BD", distanceKm: 88,
    status: "in_transit", consolidated: true,
    drops: [
      { order: 1, cnCode: "CN-HCM", cnName: "CN HCM", qtyM2: 1300, eta: "19/05",
        skuLines: [{ sku: "GR60-IV-A", qty: 1300 }] },
      { order: 2, cnCode: "CN-BD", cnName: "CN Bình Dương", qtyM2: 860, eta: "19/05",
        skuLines: [{ sku: "GR60-BG-A", qty: 860 }] },
    ],
    poIds: ["PO-HCM-W19-005", "PO-BD-W19-004"],
  },
  {
    id: "TP-010", vehicle: "Xe10T", capacityM2: 1200,
    factoryCode: "NM-VGR", factoryName: "Viglacera",
    fillPct: 95, fillM2: 1140,
    freightVnd: 13_200_000, savingVnd: 0,
    routeLabel: "VGR → CN-HN", distanceKm: 35,
    status: "in_transit", consolidated: false,
    drops: [
      { order: 1, cnCode: "CN-HN", cnName: "CN Hà Nội", qtyM2: 1140, eta: "19/05",
        skuLines: [{ sku: "GR80-WH-B", qty: 1140 }] },
    ],
    poIds: ["PO-HN-W19-003"],
  },
  {
    id: "TP-011", vehicle: "40ft", capacityM2: 2400,
    factoryCode: "NM-DT", factoryName: "Đồng Tâm",
    fillPct: 98, fillM2: 2352,
    freightVnd: 16_800_000, savingVnd: 0,
    routeLabel: "ĐT → CN-DN", distanceKm: 72,
    status: "delivered", consolidated: false,
    drops: [
      { order: 1, cnCode: "CN-DN", cnName: "CN Đồng Nai", qtyM2: 2352, eta: "18/05",
        skuLines: [{ sku: "GR60-IV-A", qty: 2352 }] },
    ],
    poIds: ["PO-DN-W19-002"],
  },
  {
    id: "TP-012", vehicle: "40ft", capacityM2: 2400,
    factoryCode: "NM-VGR", factoryName: "Viglacera",
    fillPct: 87, fillM2: 2088,
    freightVnd: 17_500_000, savingVnd: 4_800_000,
    routeLabel: "VGR → CN-NA → CN-TH", distanceKm: 195,
    status: "delivered", consolidated: true,
    drops: [
      { order: 1, cnCode: "CN-NA", cnName: "CN Nghệ An", qtyM2: 1100, eta: "18/05",
        skuLines: [{ sku: "GR60-IV-A", qty: 1100 }] },
      { order: 2, cnCode: "CN-TH", cnName: "CN Thanh Hoá", qtyM2: 988, eta: "18/05",
        skuLines: [{ sku: "GR60-BG-A", qty: 988 }] },
    ],
    poIds: ["PO-NA-W19-001", "PO-TH-W19-002"],
  },
];

/* Helpers */
export function getContainersForCn(cnCode: string): ContainerPlan[] {
  return CONTAINER_PLANS.filter((c) => c.drops.some((d) => d.cnCode === cnCode));
}

export function summarizeContainers(plans: ContainerPlan[]) {
  const total = plans.length;
  const consolidated = plans.filter((p) => p.consolidated).length;
  const lowFill = plans.filter((p) => p.fillPct < 70).length;
  const totalFreight = plans.reduce((a, p) => a + p.freightVnd, 0);
  const totalSaving = plans.reduce((a, p) => a + p.savingVnd, 0);
  const avgFill = total > 0
    ? Math.round(plans.reduce((a, p) => a + p.fillPct, 0) / total)
    : 0;
  return { total, consolidated, lowFill, totalFreight, totalSaving, avgFill };
}

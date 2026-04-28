/**
 * Container Planning data — DRP Bước 3
 * Mock data cho 12 container chuyến (8 mới + 4 đang/đã giao)
 * Mỗi container có thể ghép tuyến (2-3 CN/xe).
 */

export type VehicleType = "cont_20ft" | "cont_40ft" | "truck_10t" | "truck_15t";
export type ContainerStatus =
  | "draft"        // mới tạo, fill OK
  | "low_fill"     // ⚠️ fill < 70% — đang hold
  | "ready"        // sẵn sàng xuất
  | "in_transit"  // đang vận chuyển
  | "delivered";   // đã giao xong

export interface ContainerSkuLine {
  sku: string;
  name?: string;
  qty: number; // m² hoặc kg tuỳ vehicle
}

export interface DropPoint {
  order: number;        // 1, 2, 3 — thứ tự giao
  cnCode: string;       // "CN-BD"
  cnName: string;       // "CN Bình Dương"
  qtyM2: number;
  poId: string;         // "PO-BD-W20"
  eta: string;          // "22/05 14:00"
  distanceKm: number;
  skuLines: ContainerSkuLine[];
}

export interface ContainerPlan {
  id: string;                  // "TP-001"
  vehicleType: VehicleType;
  vehicleLabel: string;        // "40ft" / "Xe 10T"
  nmId: string;
  nmName: string;
  nmShortCode: string;         // "ĐT" / "MKD" / "TOKO" / "VGR"
  capacityM2: number;          // capacity của xe
  totalQtyM2: number;          // tổng đã đóng
  fillPct: number;             // 0-100
  isConsolidated: boolean;     // ghép tuyến (>1 drop)
  estimatedCost: number;       // VND
  savingAmount: number;        // VND tiết kiệm so với xe riêng (chỉ ghép)
  status: ContainerStatus;
  holdDeadline?: string;       // ISO date — chỉ low_fill
  holdDaysLeft?: number;       // 0-3
  carrier?: string;            // "Vinatrans" — null nếu chưa chọn
  drops: DropPoint[];
  poIds: string[];             // ['PO-BD-W20', 'PO-DN-W20']
  noteFromFarmer?: string;     // ghi chú farmer
}

export const VEHICLE_LABEL: Record<VehicleType, { label: string; capacity: number }> = {
  cont_20ft:  { label: "20ft",   capacity: 1000 },
  cont_40ft:  { label: "40ft",   capacity: 2820 },
  truck_10t:  { label: "Xe 10T", capacity: 1000 },
  truck_15t:  { label: "Xe 15T", capacity: 1500 },
};

export const STATUS_META: Record<ContainerStatus, { label: string; tone: "ok" | "warn" | "danger" | "info" | "neutral" }> = {
  draft:       { label: "Đủ hàng",      tone: "ok" },
  low_fill:    { label: "⚠️ Fill thấp", tone: "warn" },
  ready:       { label: "Sẵn sàng",     tone: "info" },
  in_transit: { label: "Vận chuyển 🚛", tone: "info" },
  delivered:  { label: "Hoàn tất ✅",   tone: "ok" },
};

export const CONTAINER_PLANS: ContainerPlan[] = [
  // TP-001 — Ghép tuyến ĐT → BD → DN
  {
    id: "TP-001", vehicleType: "cont_40ft", vehicleLabel: "40ft",
    nmId: "NM-DT", nmName: "NM Đồng Tâm (Biên Hòa)", nmShortCode: "ĐT",
    capacityM2: 2820, totalQtyM2: 2400, fillPct: 85,
    isConsolidated: true, estimatedCost: 18_500_000, savingAmount: 8_200_000,
    status: "draft", carrier: undefined,
    poIds: ["PO-BD-W20", "PO-DN-W20"],
    drops: [
      {
        order: 1, cnCode: "CN-BD", cnName: "CN Bình Dương",
        qtyM2: 1500, poId: "PO-BD-W20", eta: "22/05 10:00", distanceKm: 45,
        skuLines: [
          { sku: "GA-600-WHT", name: "Gạch 600x600 trắng", qty: 800 },
          { sku: "GA-300-BEI", name: "Gạch 300x300 be", qty: 700 },
        ],
      },
      {
        order: 2, cnCode: "CN-DN", cnName: "CN Đồng Nai",
        qtyM2: 900, poId: "PO-DN-W20", eta: "22/05 14:00", distanceKm: 30,
        skuLines: [{ sku: "GA-300-BEI", name: "Gạch 300x300 be", qty: 900 }],
      },
    ],
  },
  // TP-002
  {
    id: "TP-002", vehicleType: "cont_40ft", vehicleLabel: "40ft",
    nmId: "NM-MKD", nmName: "NM Mikado", nmShortCode: "MKD",
    capacityM2: 1550, totalQtyM2: 1500, fillPct: 97,
    isConsolidated: false, estimatedCost: 14_200_000, savingAmount: 0,
    status: "draft", carrier: "Vinatrans",
    poIds: ["PO-HN-W20"],
    drops: [{
      order: 1, cnCode: "CN-HN", cnName: "CN Hà Nội",
      qtyM2: 1500, poId: "PO-HN-W20", eta: "23/05 09:00", distanceKm: 1700,
      skuLines: [{ sku: "MK-CER-A1", name: "Sứ Mikado A1", qty: 1500 }],
    }],
  },
  // TP-003
  {
    id: "TP-003", vehicleType: "cont_20ft", vehicleLabel: "20ft",
    nmId: "NM-MKD", nmName: "NM Mikado", nmShortCode: "MKD",
    capacityM2: 900, totalQtyM2: 700, fillPct: 78,
    isConsolidated: false, estimatedCost: 8_500_000, savingAmount: 0,
    status: "draft",
    poIds: ["PO-HN-W20-S"],
    drops: [{
      order: 1, cnCode: "CN-HN", cnName: "CN Hà Nội",
      qtyM2: 700, poId: "PO-HN-W20-S", eta: "23/05 11:00", distanceKm: 1700,
      skuLines: [{ sku: "MK-CER-B2", name: "Sứ Mikado B2", qty: 700 }],
    }],
  },
  // TP-004
  {
    id: "TP-004", vehicleType: "cont_40ft", vehicleLabel: "40ft",
    nmId: "NM-TOKO", nmName: "NM Toko", nmShortCode: "TOKO",
    capacityM2: 3000, totalQtyM2: 2200, fillPct: 73,
    isConsolidated: false, estimatedCost: 12_800_000, savingAmount: 0,
    status: "draft",
    poIds: ["PO-BD-W20-T"],
    drops: [{
      order: 1, cnCode: "CN-BD", cnName: "CN Bình Dương",
      qtyM2: 2200, poId: "PO-BD-W20-T", eta: "22/05 15:00", distanceKm: 50,
      skuLines: [{ sku: "TK-FLR-300", name: "Lát Toko 300", qty: 2200 }],
    }],
  },
  // TP-005 — ⚠️ Fill thấp 60% — ghép tuyến
  {
    id: "TP-005", vehicleType: "truck_10t", vehicleLabel: "Xe 10T",
    nmId: "NM-VGR", nmName: "NM Vigracera", nmShortCode: "VGR",
    capacityM2: 1000, totalQtyM2: 600, fillPct: 60,
    isConsolidated: true, estimatedCost: 6_200_000, savingAmount: 2_300_000,
    status: "low_fill",
    holdDeadline: "2025-05-25",
    holdDaysLeft: 2,
    poIds: ["PO-NA-W20", "PO-PK-W20"],
    drops: [
      {
        order: 1, cnCode: "CN-NA", cnName: "CN Nghệ An",
        qtyM2: 400, poId: "PO-NA-W20", eta: "25/05 08:00", distanceKm: 280,
        skuLines: [{ sku: "VGR-WAL-200", name: "Ốp tường Vigracera 200", qty: 400 }],
      },
      {
        order: 2, cnCode: "CN-PK", cnName: "CN Phú Khánh",
        qtyM2: 200, poId: "PO-PK-W20", eta: "25/05 12:00", distanceKm: 90,
        skuLines: [{ sku: "VGR-WAL-200", name: "Ốp tường Vigracera 200", qty: 200 }],
      },
    ],
    noteFromFarmer: undefined,
  },
  // TP-006
  {
    id: "TP-006", vehicleType: "cont_20ft", vehicleLabel: "20ft",
    nmId: "NM-TOKO", nmName: "NM Toko", nmShortCode: "TOKO",
    capacityM2: 900, totalQtyM2: 720, fillPct: 80,
    isConsolidated: false, estimatedCost: 7_500_000, savingAmount: 0,
    status: "draft",
    poIds: ["PO-CT-W20"],
    drops: [{
      order: 1, cnCode: "CN-CT", cnName: "CN Cần Thơ",
      qtyM2: 720, poId: "PO-CT-W20", eta: "24/05 10:00", distanceKm: 170,
      skuLines: [{ sku: "TK-FLR-300", name: "Lát Toko 300", qty: 720 }],
    }],
  },
  // TP-007
  {
    id: "TP-007", vehicleType: "cont_40ft", vehicleLabel: "40ft",
    nmId: "NM-DT", nmName: "NM Đồng Tâm (Biên Hòa)", nmShortCode: "ĐT",
    capacityM2: 1800, totalQtyM2: 1620, fillPct: 90,
    isConsolidated: false, estimatedCost: 11_800_000, savingAmount: 0,
    status: "draft", carrier: "Tín Nghĩa",
    poIds: ["PO-HCM-W20"],
    drops: [{
      order: 1, cnCode: "CN-HCM", cnName: "CN HCM",
      qtyM2: 1620, poId: "PO-HCM-W20", eta: "22/05 11:00", distanceKm: 30,
      skuLines: [{ sku: "GA-600-WHT", name: "Gạch 600x600 trắng", qty: 1620 }],
    }],
  },
  // TP-008 — đang vận chuyển
  {
    id: "TP-008", vehicleType: "cont_40ft", vehicleLabel: "40ft",
    nmId: "NM-MKD", nmName: "NM Mikado", nmShortCode: "MKD",
    capacityM2: 1800, totalQtyM2: 1750, fillPct: 97,
    isConsolidated: false, estimatedCost: 14_200_000, savingAmount: 0,
    status: "in_transit", carrier: "Vinatrans",
    poIds: ["PO-HN-W19"],
    drops: [{
      order: 1, cnCode: "CN-HN", cnName: "CN Hà Nội",
      qtyM2: 1750, poId: "PO-HN-W19", eta: "21/05 09:00", distanceKm: 1700,
      skuLines: [{ sku: "MK-CER-A1", name: "Sứ Mikado A1", qty: 1750 }],
    }],
  },
  // TP-009 — đang vận chuyển
  {
    id: "TP-009", vehicleType: "cont_20ft", vehicleLabel: "20ft",
    nmId: "NM-DT", nmName: "NM Đồng Tâm (Biên Hòa)", nmShortCode: "ĐT",
    capacityM2: 900, totalQtyM2: 900, fillPct: 100,
    isConsolidated: false, estimatedCost: 8_500_000, savingAmount: 0,
    status: "in_transit", carrier: "Tín Nghĩa",
    poIds: ["PO-BD-W19"],
    drops: [{
      order: 1, cnCode: "CN-BD", cnName: "CN Bình Dương",
      qtyM2: 900, poId: "PO-BD-W19", eta: "21/05 14:00", distanceKm: 45,
      skuLines: [{ sku: "GA-300-BEI", name: "Gạch 300x300 be", qty: 900 }],
    }],
  },
  // TP-010 — hoàn tất
  {
    id: "TP-010", vehicleType: "cont_20ft", vehicleLabel: "20ft",
    nmId: "NM-TOKO", nmName: "NM Toko", nmShortCode: "TOKO",
    capacityM2: 900, totalQtyM2: 720, fillPct: 80,
    isConsolidated: false, estimatedCost: 7_500_000, savingAmount: 0,
    status: "delivered", carrier: "Phương Trang Cargo",
    poIds: ["PO-CT-W19"],
    drops: [{
      order: 1, cnCode: "CN-CT", cnName: "CN Cần Thơ",
      qtyM2: 720, poId: "PO-CT-W19", eta: "20/05 10:00", distanceKm: 170,
      skuLines: [{ sku: "TK-FLR-300", name: "Lát Toko 300", qty: 720 }],
    }],
  },
  // TP-011 — hoàn tất
  {
    id: "TP-011", vehicleType: "cont_40ft", vehicleLabel: "40ft",
    nmId: "NM-MKD", nmName: "NM Mikado", nmShortCode: "MKD",
    capacityM2: 1800, totalQtyM2: 1500, fillPct: 83,
    isConsolidated: false, estimatedCost: 11_800_000, savingAmount: 0,
    status: "delivered", carrier: "Vinatrans",
    poIds: ["PO-HCM-W19-M"],
    drops: [{
      order: 1, cnCode: "CN-HCM", cnName: "CN HCM",
      qtyM2: 1500, poId: "PO-HCM-W19-M", eta: "20/05 14:00", distanceKm: 30,
      skuLines: [{ sku: "MK-CER-A1", name: "Sứ Mikado A1", qty: 1500 }],
    }],
  },
  // TP-012 — hoàn tất
  {
    id: "TP-012", vehicleType: "cont_20ft", vehicleLabel: "20ft",
    nmId: "NM-DT", nmName: "NM Đồng Tâm (Biên Hòa)", nmShortCode: "ĐT",
    capacityM2: 900, totalQtyM2: 800, fillPct: 89,
    isConsolidated: false, estimatedCost: 8_500_000, savingAmount: 0,
    status: "delivered", carrier: "Tín Nghĩa",
    poIds: ["PO-HN-W19-D"],
    drops: [{
      order: 1, cnCode: "CN-HN", cnName: "CN Hà Nội",
      qtyM2: 800, poId: "PO-HN-W19-D", eta: "20/05 09:00", distanceKm: 1700,
      skuLines: [{ sku: "GA-600-WHT", name: "Gạch 600x600 trắng", qty: 800 }],
    }],
  },
];

// =================================================================
// Helpers
// =================================================================

export const fillTone = (pct: number): "ok" | "warn" | "danger" => {
  if (pct >= 80) return "ok";
  if (pct >= 70) return "warn";
  return "danger";
};

export const formatVnd = (amount: number): string => {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString("vi-VN");
};

export const summarizeContainerPlans = (plans: ContainerPlan[]) => {
  const active = plans.filter(p => p.status !== "delivered");
  const totalContainers = plans.length;
  const totalCont = plans.filter(p => p.vehicleType.startsWith("cont")).length;
  const totalTruck = plans.filter(p => p.vehicleType.startsWith("truck")).length;
  const consolidatedCount = plans.filter(p => p.isConsolidated).length;
  const avgFill = plans.length > 0
    ? Math.round(plans.reduce((a, p) => a + p.fillPct, 0) / plans.length)
    : 0;
  const lowFillCount = plans.filter(p => p.fillPct < 70).length;
  const totalCost = plans.reduce((a, p) => a + p.estimatedCost, 0);
  const totalSaving = plans.reduce((a, p) => a + p.savingAmount, 0);
  const totalM2 = plans.reduce((a, p) => a + p.totalQtyM2, 0);
  return {
    totalContainers, totalCont, totalTruck,
    consolidatedCount, avgFill, lowFillCount,
    totalCost, totalSaving, totalM2,
    activeCount: active.length,
  };
};

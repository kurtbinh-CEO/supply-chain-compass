/* ════════════════════════════════════════════════════════════════════════════
   §  ROUTE-VEHICLE CONSTRAINT MATRIX (TRANSPORT-LOGIC §①)
   §  Tuyến nào bắt buộc container, tuyến nào dùng xe tải
   ════════════════════════════════════════════════════════════════════════════ */

import type { VehicleType, VehicleTypeCanonical } from "./vehicle-types";

export type Region = "bac" | "trung" | "nam";
export type RouteType = "inter_region" | "intra_region" | "nm_local" | "nm_cross_region";

export const REGION_LABELS: Record<Region, string> = {
  bac: "Miền Bắc",
  trung: "Miền Trung",
  nam: "Miền Nam",
};

export const ROUTE_TYPE_LABELS: Record<RouteType, string> = {
  inter_region: "Liên vùng",
  intra_region: "Nội vùng",
  nm_local: "Nội NM (cùng vùng)",
  nm_cross_region: "Liên NM (khác vùng)",
};

export interface RouteConstraint {
  id: string;
  originRegion: Region | "any";
  destRegion: Region | "any";
  routeType: RouteType;
  routeLabel: string;            // "Bắc → Nam"
  allowedVehicles: VehicleTypeCanonical[];
  preferredVehicle: VehicleTypeCanonical;
  containerRequired: boolean;
  maxDetourKm: number;
  notes: string;
}

export const ROUTE_CONSTRAINTS: RouteConstraint[] = [
  {
    id: "bac_nam", originRegion: "bac", destRegion: "nam", routeType: "inter_region",
    routeLabel: "Miền Bắc → Miền Nam",
    allowedVehicles: ["container_20ft", "container_40ft"],
    preferredVehicle: "container_40ft",
    containerRequired: true, maxDetourKm: 50,
    notes: "Bắt buộc container. Xe tải cấm vì quá xa (1.700+km).",
  },
  {
    id: "nam_bac", originRegion: "nam", destRegion: "bac", routeType: "inter_region",
    routeLabel: "Miền Nam → Miền Bắc",
    allowedVehicles: ["container_20ft", "container_40ft"],
    preferredVehicle: "container_40ft",
    containerRequired: true, maxDetourKm: 50,
    notes: "Bắt buộc container. Xe tải cấm.",
  },
  {
    id: "bac_trung", originRegion: "bac", destRegion: "trung", routeType: "inter_region",
    routeLabel: "Miền Bắc → Miền Trung",
    allowedVehicles: ["container_20ft", "container_40ft", "truck_15t"],
    preferredVehicle: "container_40ft",
    containerRequired: false, maxDetourKm: 50,
    notes: "Container ưu tiên. Xe 15T nếu < 5T hàng.",
  },
  {
    id: "trung_nam", originRegion: "trung", destRegion: "nam", routeType: "inter_region",
    routeLabel: "Miền Trung → Miền Nam",
    allowedVehicles: ["container_20ft", "container_40ft", "truck_15t"],
    preferredVehicle: "container_40ft",
    containerRequired: false, maxDetourKm: 50,
    notes: "Container ưu tiên. Xe 15T nếu < 5T hàng.",
  },
  {
    id: "trung_bac", originRegion: "trung", destRegion: "bac", routeType: "inter_region",
    routeLabel: "Miền Trung → Miền Bắc",
    allowedVehicles: ["container_20ft", "container_40ft", "truck_15t"],
    preferredVehicle: "container_40ft",
    containerRequired: false, maxDetourKm: 50,
    notes: "Container ưu tiên.",
  },
  {
    id: "nam_trung", originRegion: "nam", destRegion: "trung", routeType: "inter_region",
    routeLabel: "Miền Nam → Miền Trung",
    allowedVehicles: ["container_20ft", "container_40ft", "truck_15t"],
    preferredVehicle: "container_40ft",
    containerRequired: false, maxDetourKm: 50,
    notes: "Container ưu tiên.",
  },
  {
    id: "intra_bac", originRegion: "bac", destRegion: "bac", routeType: "intra_region",
    routeLabel: "Nội vùng Bắc",
    allowedVehicles: ["truck_2.5t", "truck_5t", "truck_10t", "truck_15t"],
    preferredVehicle: "truck_10t",
    containerRequired: false, maxDetourKm: 30,
    notes: "Xe tải. Container không hiệu quả cho cự ly ngắn.",
  },
  {
    id: "intra_trung", originRegion: "trung", destRegion: "trung", routeType: "intra_region",
    routeLabel: "Nội vùng Trung",
    allowedVehicles: ["truck_2.5t", "truck_5t", "truck_10t", "truck_15t"],
    preferredVehicle: "truck_10t",
    containerRequired: false, maxDetourKm: 30,
    notes: "Xe tải.",
  },
  {
    id: "intra_nam", originRegion: "nam", destRegion: "nam", routeType: "intra_region",
    routeLabel: "Nội vùng Nam",
    allowedVehicles: ["truck_2.5t", "truck_5t", "truck_10t", "truck_15t"],
    preferredVehicle: "truck_10t",
    containerRequired: false, maxDetourKm: 30,
    notes: "Xe tải.",
  },
  {
    id: "nm_local", originRegion: "any", destRegion: "any", routeType: "nm_local",
    routeLabel: "NM → Hub (cùng vùng)",
    allowedVehicles: ["truck_10t", "truck_15t"],
    preferredVehicle: "truck_15t",
    containerRequired: false, maxDetourKm: 20,
    notes: "Pickup NM ngắn. Xe tải lớn để gom hàng.",
  },
  {
    id: "nm_cross", originRegion: "any", destRegion: "any", routeType: "nm_cross_region",
    routeLabel: "NM → Hub (khác vùng)",
    allowedVehicles: ["container_20ft", "container_40ft"],
    preferredVehicle: "container_40ft",
    containerRequired: true, maxDetourKm: 50,
    notes: "NM Bắc → CN Nam = bắt buộc container.",
  },
];

/* ── Helpers ── */

/** Tìm constraint phù hợp cho 1 cặp origin → dest */
export function findRouteConstraint(
  origin: Region,
  dest: Region,
): RouteConstraint {
  if (origin === dest) {
    return ROUTE_CONSTRAINTS.find((r) => r.originRegion === origin && r.destRegion === dest)!;
  }
  const exact = ROUTE_CONSTRAINTS.find(
    (r) => r.originRegion === origin && r.destRegion === dest,
  );
  if (exact) return exact;
  // fallback: any inter-region
  return ROUTE_CONSTRAINTS.find((r) => r.routeType === "inter_region")!;
}

/** Lấy danh sách xe được phép cho 1 tuyến */
export function getAllowedVehicles(
  origin: Region,
  dest: Region,
): VehicleTypeCanonical[] {
  return findRouteConstraint(origin, dest).allowedVehicles;
}

/** Kiểm tra 1 vehicle có hợp lệ cho tuyến không */
export function isVehicleAllowed(
  vehicle: VehicleTypeCanonical | VehicleType,
  origin: Region,
  dest: Region,
): boolean {
  const canon = (vehicle as string).startsWith("container") || (vehicle as string).startsWith("truck")
    ? vehicle as string
    : ({ "40ft": "container_40ft", "20ft": "container_20ft", "Xe10T": "truck_10t", "Xe5T": "truck_5t" }[vehicle as string] ?? vehicle as string);
  const allowed = getAllowedVehicles(origin, dest) as string[];
  return allowed.includes(canon);
}

/* ── Region inference từ mã NM/CN (mock — đơn giản hóa cho demo) ── */
const NM_REGION: Record<string, Region> = {
  "NM-DT": "nam", "NM-DTM": "nam", "NM-TKO": "nam",
  "NM-MKD": "bac", "NM-VGR": "bac",
};
const CN_REGION: Record<string, Region> = {
  // Nam
  "CN-HCM": "nam", "CN-BD": "nam", "CN-DN": "nam", "CN-VT": "nam", "CN-BT": "nam",
  "CN-CT": "nam", "CN-AG": "nam",
  // Trung
  "CN-DNG": "trung", "CN-NA": "trung", "CN-TH": "trung", "CN-PK": "trung",
  // Bắc
  "CN-HN": "bac", "CN-HP": "bac", "CN-VP": "bac", "CN-QN": "bac",
};

export function regionOfNm(nmCode: string): Region {
  return NM_REGION[nmCode] ?? "nam";
}

export function regionOfCn(cnCode: string): Region {
  return CN_REGION[cnCode] ?? "nam";
}

/**
 * Suy ra tuyến chính từ container: dùng region NM nguồn → region CN drop xa nhất.
 * Nếu nhiều CN khác vùng → ưu tiên cross-region (nm_cross hoặc inter-region).
 */
export function inferContainerRoute(
  factoryCode: string,
  cnCodes: string[],
): { origin: Region; dest: Region; constraint: RouteConstraint } {
  const origin = regionOfNm(factoryCode);
  const destRegions = cnCodes.map(regionOfCn);
  // Ưu tiên dest khác vùng (constraint nghiêm hơn)
  const crossDest = destRegions.find((r) => r !== origin);
  const dest = crossDest ?? origin;
  return { origin, dest, constraint: findRouteConstraint(origin, dest) };
}

/* ════════════════════════════════════════════════════════════════════════════
   §  VehicleType — enum chuẩn hóa loại phương tiện vận tải
   §  Bao gồm 6 spec mới + alias cho 3 mock cũ ("40ft", "20ft", "Xe10T")
   §  để giữ tương thích ngược với CONTAINER_PLANS hiện tại.
   ════════════════════════════════════════════════════════════════════════════ */

/** 6 loại phương tiện chính (spec TRANSPORT-LOGIC §①) */
export type VehicleTypeCanonical =
  | "container_20ft"
  | "container_40ft"
  | "truck_2.5t"
  | "truck_5t"
  | "truck_10t"
  | "truck_15t";

/** Legacy aliases dùng trong CONTAINER_PLANS mock (không refactor mock) */
export type VehicleTypeLegacy = "40ft" | "20ft" | "Xe10T" | "Xe5T";

export type VehicleType = VehicleTypeCanonical | VehicleTypeLegacy;

export interface VehicleSpec {
  key: VehicleType;
  canonical: VehicleTypeCanonical;
  label: string;            // VN hiển thị
  capacityM2: number;       // diện tích chứa
  maxWeightKg: number;      // tải tối đa
  costPerKm: number;        // VND/km
  isContainer: boolean;
}

/* Catalog đầy đủ — tham chiếu VEHICLES cũ trong ContainerEditPreview */
export const VEHICLE_CATALOG: Record<VehicleType, VehicleSpec> = {
  // Canonical
  container_40ft: {
    key: "container_40ft", canonical: "container_40ft",
    label: "Container 40ft", capacityM2: 2820, maxWeightKg: 28000,
    costPerKm: 85_000, isContainer: true,
  },
  container_20ft: {
    key: "container_20ft", canonical: "container_20ft",
    label: "Container 20ft", capacityM2: 1410, maxWeightKg: 28000,
    costPerKm: 65_000, isContainer: true,
  },
  "truck_15t": {
    key: "truck_15t", canonical: "truck_15t",
    label: "Xe tải 15T", capacityM2: 1800, maxWeightKg: 15000,
    costPerKm: 15_000, isContainer: false,
  },
  "truck_10t": {
    key: "truck_10t", canonical: "truck_10t",
    label: "Xe tải 10T", capacityM2: 1200, maxWeightKg: 10000,
    costPerKm: 12_000, isContainer: false,
  },
  "truck_5t": {
    key: "truck_5t", canonical: "truck_5t",
    label: "Xe tải 5T", capacityM2: 750, maxWeightKg: 5000,
    costPerKm: 9_000, isContainer: false,
  },
  "truck_2.5t": {
    key: "truck_2.5t", canonical: "truck_2.5t",
    label: "Xe tải 2.5T", capacityM2: 400, maxWeightKg: 2500,
    costPerKm: 6_500, isContainer: false,
  },
  // Legacy aliases
  "40ft": {
    key: "40ft", canonical: "container_40ft",
    label: "Container 40ft", capacityM2: 2400, maxWeightKg: 28000,
    costPerKm: 85_000, isContainer: true,
  },
  "20ft": {
    key: "20ft", canonical: "container_20ft",
    label: "Container 20ft", capacityM2: 1600, maxWeightKg: 28000,
    costPerKm: 65_000, isContainer: true,
  },
  Xe10T: {
    key: "Xe10T", canonical: "truck_10t",
    label: "Xe 10 tấn", capacityM2: 1200, maxWeightKg: 10000,
    costPerKm: 45_000, isContainer: false,
  },
  Xe5T: {
    key: "Xe5T", canonical: "truck_5t",
    label: "Xe 5 tấn", capacityM2: 600, maxWeightKg: 5000,
    costPerKm: 28_000, isContainer: false,
  },
};

export function getVehicleSpec(v: VehicleType | string): VehicleSpec | null {
  return (VEHICLE_CATALOG as Record<string, VehicleSpec>)[v] ?? null;
}

export function toCanonical(v: VehicleType | string): VehicleTypeCanonical | null {
  return getVehicleSpec(v)?.canonical ?? null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   §  VEHICLES — danh mục loại xe vận chuyển + capacity m².
   §  Dùng cho gợi ý đổi xe trong DRP container preview.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface VehicleType {
  code: string;     // "40ft", "20ft", "Xe10T", "Xe5T"
  label: string;    // hiển thị
  capacityM2: number;
}

// Sắp xếp theo capacity tăng dần để dễ tìm xe lớn hơn / nhỏ hơn liền kề.
export const VEHICLES: VehicleType[] = [
  { code: "Xe5T",  label: "Xe 5 tấn",  capacityM2: 600 },
  { code: "Xe10T", label: "Xe 10 tấn", capacityM2: 1200 },
  { code: "20ft",  label: "Cont 20ft", capacityM2: 1500 },
  { code: "40ft",  label: "Cont 40ft", capacityM2: 2400 },
];

export function getVehicle(code: string): VehicleType | undefined {
  return VEHICLES.find((v) => v.code === code);
}

/** Xe nhỏ hơn liền kề mà vẫn chứa được fillM2 (không overflow). */
export function suggestSmallerVehicle(currentCode: string, fillM2: number): VehicleType | null {
  const idx = VEHICLES.findIndex((v) => v.code === currentCode);
  if (idx <= 0) return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (VEHICLES[i].capacityM2 >= fillM2) return VEHICLES[i];
  }
  return null;
}

/** Xe lớn hơn liền kề (khi cần thêm chỗ). */
export function suggestLargerVehicle(currentCode: string): VehicleType | null {
  const idx = VEHICLES.findIndex((v) => v.code === currentCode);
  if (idx < 0 || idx >= VEHICLES.length - 1) return null;
  return VEHICLES[idx + 1];
}

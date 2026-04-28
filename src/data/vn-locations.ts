/* ═══════════════════════════════════════════════════════════════════════════
   §  VN_LOCATIONS — toạ độ gần đúng (lat/lng) các nhà máy & chi nhánh
   §  Dùng để vẽ mini map lộ trình trong DRP container preview.
   §  Toạ độ chỉ để minh hoạ vị trí tương đối — KHÔNG dùng cho điều phối thật.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface VnLocation {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

export const VN_LOCATIONS: Record<string, VnLocation> = {
  // ── Nhà máy ──
  "NM-DT":  { code: "NM-DT",  name: "NM Đồng Tâm",   lat: 10.560, lng: 106.405 }, // Long An
  "NM-VGR": { code: "NM-VGR", name: "NM Viglacera",  lat: 21.030, lng: 105.780 }, // Hà Nội
  // ── Chi nhánh Nam ──
  "CN-HCM": { code: "CN-HCM", name: "CN HCM",        lat: 10.776, lng: 106.700 },
  "CN-BD":  { code: "CN-BD",  name: "CN Bình Dương", lat: 10.980, lng: 106.675 },
  "CN-DN":  { code: "CN-DN",  name: "CN Đồng Nai",   lat: 10.945, lng: 106.825 },
  "CN-VT":  { code: "CN-VT",  name: "CN Vũng Tàu",   lat: 10.346, lng: 107.085 },
  "CN-CT":  { code: "CN-CT",  name: "CN Cần Thơ",    lat: 10.045, lng: 105.785 },
  "CN-AG":  { code: "CN-AG",  name: "CN An Giang",   lat: 10.380, lng: 105.430 },
  "CN-BT":  { code: "CN-BT",  name: "CN Bến Tre",    lat: 10.243, lng: 106.375 },
  // ── Chi nhánh Trung / Bắc ──
  "CN-PK":  { code: "CN-PK",  name: "CN Phú Khánh",  lat: 12.243, lng: 109.193 },
  "CN-NA":  { code: "CN-NA",  name: "CN Nghệ An",    lat: 18.680, lng: 105.690 },
  "CN-TH":  { code: "CN-TH",  name: "CN Thanh Hoá",  lat: 19.806, lng: 105.776 },
  "CN-HN":  { code: "CN-HN",  name: "CN Hà Nội",     lat: 21.028, lng: 105.854 },
  "CN-HP":  { code: "CN-HP",  name: "CN Hải Phòng",  lat: 20.860, lng: 106.683 },
  "CN-QN":  { code: "CN-QN",  name: "CN Quảng Ninh", lat: 21.006, lng: 107.295 },
};

export function getLocation(code: string): VnLocation | undefined {
  return VN_LOCATIONS[code];
}

/** Khoảng cách Haversine (km) — đủ chính xác cho minh hoạ lộ trình. */
export function haversineKm(a: VnLocation, b: VnLocation): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

/** Tổng km của 1 chuỗi điểm theo thứ tự. */
export function routeTotalKm(codes: string[]): number {
  let total = 0;
  for (let i = 0; i < codes.length - 1; i++) {
    const a = VN_LOCATIONS[codes[i]];
    const b = VN_LOCATIONS[codes[i + 1]];
    if (!a || !b) continue;
    total += haversineKm(a, b);
  }
  return total;
}

/** Khoảng cách từng chặng (km). */
export function legDistances(codes: string[]): number[] {
  const legs: number[] = [];
  for (let i = 0; i < codes.length - 1; i++) {
    const a = VN_LOCATIONS[codes[i]];
    const b = VN_LOCATIONS[codes[i + 1]];
    legs.push(a && b ? haversineKm(a, b) : 0);
  }
  return legs;
}

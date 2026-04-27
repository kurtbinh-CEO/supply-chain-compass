/**
 * PO Lifecycle data layer for OrdersPage (M5-REVISED).
 *
 * 7-stage lifecycle for RPO; 6-stage (skip nm_confirmed) for TO.
 * Each stage carries an SLA in hours; remaining time is computed from `enteredAt`.
 *
 * NO business logic here — just types, constants, and seed data. UI computes
 * derived state (overdue, reminders) at render time so we can scrub time
 * forward in demos without touching this file.
 */

export type LifecycleStage =
  | "approved"        // ĐÃ DUYỆT — Planner phải gửi NM
  | "sent_nm"         // ĐẶT NM — chờ NM xác nhận
  | "nm_confirmed"    // ĐẶT XE — NM OK, planner phải book NVT
  | "pickup"          // LẤY HÀNG — đã book NVT, chờ xe đến NM
  | "in_transit"      // ĐANG CHỞ — xe đang trên đường
  | "delivering"      // GIAO HÀNG — đến CN, chờ POD
  | "completed"       // HOÀN TẤT
  | "cancelled";

/** Display chip per stage (label + tone token). */
export const STAGE_META: Record<LifecycleStage, { label: string; tone: string; short: string }> = {
  approved:     { label: "ĐÃ DUYỆT",  tone: "bg-info-bg text-info border-info/30",          short: "Đã duyệt" },
  sent_nm:      { label: "ĐẶT NM",    tone: "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300", short: "Đặt NM" },
  nm_confirmed: { label: "ĐẶT XE",    tone: "bg-warning-bg text-warning border-warning/30", short: "Đặt xe" },
  pickup:       { label: "LẤY HÀNG",  tone: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300",     short: "Lấy hàng" },
  in_transit:   { label: "ĐANG CHỞ",  tone: "bg-info-bg text-info border-info/30",          short: "Đang chở" },
  delivering:   { label: "GIAO HÀNG", tone: "bg-success-bg text-success border-success/30", short: "Giao hàng" },
  completed:    { label: "HOÀN TẤT",  tone: "bg-surface-3 text-text-2 border-surface-3",    short: "Hoàn tất" },
  cancelled:    { label: "ĐÃ HỦY",   tone: "bg-danger-bg text-danger border-danger/30",    short: "Đã hủy" },
};

/** Order of the 7 active stages (excludes cancelled). */
export const STAGE_ORDER: LifecycleStage[] = [
  "approved", "sent_nm", "nm_confirmed", "pickup", "in_transit", "delivering", "completed",
];

/** SLA per transition, in hours. Mirrors PRD §11.8C config keys. */
export const STAGE_SLA_HOURS: Record<LifecycleStage, number> = {
  approved:     4,         // → sent_nm  (within day)
  sent_nm:      72,        // → nm_confirmed (3 days)
  nm_confirmed: 24,        // → pickup (1 day to book carrier)
  pickup:       4,         // grace after pickup ETA
  in_transit:   4,         // grace after ETA
  delivering:   2,         // POD deadline
  completed:    0,
  cancelled:    0,
};

export const REMINDER_CONFIG = {
  nmResponseSlaDays: 3,
  nmReminderFrequencyHours: 24,
  autoEscalateAfterDays: 5,
  podDeadlineHours: 2,
  podMinPhotos: 2,
  pickupReminderHours: 4,
  etaLateThresholdHours: 4,
} as const;

export type PoKind = "RPO" | "TO";

export interface PoEvidence {
  /** Free-form label e.g. "Ảnh Zalo", "Phiếu xuất NM" */
  label: string;
  kind: "photo" | "doc" | "screenshot" | "signature";
  /** Mock URL — empty in seed data, replaced by File handle after upload */
  url?: string;
  count?: number; // for "3 ảnh"
}

export interface LifecycleEvent {
  stage: LifecycleStage;
  ts: string;          // "DD/MM HH:mm"
  actor: string;       // "Planner Linh"
  note?: string;
  evidence?: PoEvidence[];
}

export interface PoLifecycleRow {
  id: string;
  kind: PoKind;
  poNumber: string;
  /** Top sub-items: SKU + qty. We render just the first one inline; expand for full list. */
  sku: string;
  skuLabel: string;     // "GA-600 B2"
  qty: number;          // m²
  qtyConfirmed?: number; // NM may counter
  qtyDelivered?: number; // CN may receive less

  fromName: string;     // "NM Đồng Tâm" or "CN-HCM"
  toName: string;       // "CN-BD"
  region: "Bắc" | "Trung" | "Nam";

  stage: LifecycleStage;
  /** Hours since entering current stage. Negative not possible. */
  hoursInStage: number;
  /** True when explicitly past SLA at seed time. */
  overdueFlag?: boolean;

  /** Carrier + driver details, populated from `nm_confirmed` onward. */
  carrierId?: string;
  carrierName?: string;
  vehiclePlate?: string;
  containerNo?: string;
  driverName?: string;
  driverPhone?: string;

  pickupEta?: string;   // "14/05"
  deliveryEta?: string; // "15/05 14:00"
  /** Hours remaining to ETA — negative = late. */
  etaRemainingH?: number;

  evidence: PoEvidence[];
  timeline: LifecycleEvent[];
  cancelReason?: string;
}

/** Minimal seed — 15 rows covering every stage incl. overdue cases. */
export const SEED_PO_LIFECYCLE: PoLifecycleRow[] = [
  // 1. APPROVED — fresh (multi-SKU group: PO-BD-W20-001 has 2 lines)
  {
    id: "1", kind: "RPO", poNumber: "PO-BD-W20-001",
    sku: "GA-600", skuLabel: "GA-600 B2", qty: 800,
    fromName: "NM Đồng Tâm", toName: "CN-BD", region: "Nam",
    stage: "approved", hoursInStage: 1,
    evidence: [],
    timeline: [
      { stage: "approved", ts: "20/05 09:00", actor: "Planner Linh", note: "Duyệt từ DRP batch W20" },
    ],
  },
  {
    id: "1b", kind: "RPO", poNumber: "PO-BD-W20-001",
    sku: "GA-300", skuLabel: "GA-300 A4", qty: 400,
    fromName: "NM Đồng Tâm", toName: "CN-BD", region: "Nam",
    stage: "approved", hoursInStage: 1,
    evidence: [],
    timeline: [
      { stage: "approved", ts: "20/05 09:00", actor: "Planner Linh", note: "Duyệt từ DRP batch W20" },
    ],
  },
  // 2. SENT_NM — 1 day
  {
    id: "2", kind: "RPO", poNumber: "PO-HN-W20-001",
    sku: "GA-300", skuLabel: "GA-300 A4", qty: 1500,
    fromName: "NM Mikado", toName: "CN-HN", region: "Bắc",
    stage: "sent_nm", hoursInStage: 26,
    evidence: [{ label: "Ảnh Zalo gửi anh Tân", kind: "screenshot" }],
    timeline: [
      { stage: "approved", ts: "18/05 14:00", actor: "Planner Linh" },
      { stage: "sent_nm",  ts: "19/05 08:00", actor: "Planner Linh", note: "Zalo + gọi điện anh Tân Mikado" },
    ],
  },
  // 3. SENT_NM — overdue 4 days (escalation candidate)
  {
    id: "3", kind: "RPO", poNumber: "PO-HN-W18-001",
    sku: "GA-600", skuLabel: "GA-600 B2", qty: 2200,
    fromName: "NM Toko", toName: "CN-HN", region: "Bắc",
    stage: "sent_nm", hoursInStage: 96, overdueFlag: true,
    evidence: [{ label: "Ảnh Zalo Toko", kind: "screenshot" }],
    timeline: [
      { stage: "approved", ts: "10/05 09:00", actor: "Planner Hà" },
      { stage: "sent_nm",  ts: "10/05 10:30", actor: "Planner Hà", note: "Đã gọi 3 lần, nhắn Zalo" },
    ],
  },
  // 4. NM_CONFIRMED
  {
    id: "4", kind: "RPO", poNumber: "PO-BD-W19-001",
    sku: "GA-600", skuLabel: "GA-600 A4", qty: 1500, qtyConfirmed: 1500,
    fromName: "NM Vigracera", toName: "CN-BD", region: "Nam",
    stage: "nm_confirmed", hoursInStage: 5,
    pickupEta: "14/05",
    evidence: [
      { label: "Ảnh Zalo gửi NM", kind: "screenshot" },
      { label: "Xác nhận từ NM", kind: "screenshot" },
    ],
    timeline: [
      { stage: "approved",     ts: "13/05 08:00", actor: "Planner Linh" },
      { stage: "sent_nm",      ts: "13/05 08:15", actor: "Planner Linh" },
      { stage: "nm_confirmed", ts: "14/05 11:00", actor: "NM Vigracera",  note: "Xác nhận đủ 1.500m², sẵn sàng 16/05" },
    ],
  },
  // 5. NM_CONFIRMED — counter offer (53% fill)
  {
    id: "5", kind: "RPO", poNumber: "PO-DN-W20-001",
    sku: "GA-300", skuLabel: "GA-300 A4", qty: 900, qtyConfirmed: 480,
    fromName: "NM Toko", toName: "CN-DN", region: "Trung",
    stage: "nm_confirmed", hoursInStage: 12,
    pickupEta: "16/05",
    evidence: [{ label: "Counter qty Zalo", kind: "screenshot" }],
    timeline: [
      { stage: "approved",     ts: "18/05 09:00", actor: "Planner Hà" },
      { stage: "sent_nm",      ts: "18/05 09:30", actor: "Planner Hà" },
      { stage: "nm_confirmed", ts: "19/05 16:00", actor: "NM Toko", note: "Chỉ confirm 480m² (53% PO) — thiếu nguyên liệu men" },
    ],
  },
  // 6. PICKUP — Vinatrans heading to NM
  {
    id: "6", kind: "RPO", poNumber: "PO-HCM-W19-001",
    sku: "GA-600", skuLabel: "GA-600 B2", qty: 1620, qtyConfirmed: 1620,
    fromName: "NM Đồng Tâm", toName: "CN-HCM", region: "Nam",
    stage: "pickup", hoursInStage: 3,
    carrierId: "CR-01", carrierName: "Vinatrans",
    vehiclePlate: "51C-72184",
    pickupEta: "14/05",
    evidence: [
      { label: "Ảnh Zalo NM", kind: "screenshot" },
      { label: "Xác nhận NM", kind: "screenshot" },
    ],
    timeline: [
      { stage: "approved",     ts: "12/05 08:00", actor: "Planner Linh" },
      { stage: "sent_nm",      ts: "12/05 08:30", actor: "Planner Linh" },
      { stage: "nm_confirmed", ts: "13/05 10:00", actor: "NM Đồng Tâm" },
      { stage: "pickup",       ts: "14/05 06:00", actor: "Planner Linh", note: "Book Vinatrans, 40ft, lấy hàng 14/05" },
    ],
  },
  // 7. IN_TRANSIT — on time
  {
    id: "7", kind: "RPO", poNumber: "PO-HN-W19-001",
    sku: "GA-300", skuLabel: "GA-300 B2", qty: 1750, qtyConfirmed: 1750,
    fromName: "NM Mikado", toName: "CN-HN", region: "Bắc",
    stage: "in_transit", hoursInStage: 18,
    carrierId: "CR-04", carrierName: "Vận tải Mikado",
    vehiclePlate: "29H-145.30",
    driverName: "Lê Văn Hùng", driverPhone: "0903 555 222",
    deliveryEta: "15/05 14:00", etaRemainingH: 6,
    evidence: [
      { label: "Ảnh Zalo NM", kind: "screenshot" },
      { label: "Xác nhận NM", kind: "screenshot" },
      { label: "Ảnh bốc hàng tại NM", kind: "photo", count: 2 },
    ],
    timeline: [
      { stage: "approved",     ts: "12/05 08:00", actor: "Planner Hà" },
      { stage: "sent_nm",      ts: "12/05 08:15", actor: "Planner Hà" },
      { stage: "nm_confirmed", ts: "13/05 09:00", actor: "NM Mikado" },
      { stage: "pickup",       ts: "13/05 14:00", actor: "Planner Hà" },
      { stage: "in_transit",   ts: "14/05 08:00", actor: "Tài xế Hùng", note: "Xuất phát từ Mikado lúc 08:00" },
    ],
  },
  // 8. IN_TRANSIT — late ETA 6h
  {
    id: "8", kind: "RPO", poNumber: "PO-BD-W18-001",
    sku: "GA-600", skuLabel: "GA-600 A4", qty: 900, qtyConfirmed: 900,
    fromName: "NM Đồng Tâm", toName: "CN-BD", region: "Nam",
    stage: "in_transit", hoursInStage: 32, overdueFlag: true,
    carrierId: "CR-03", carrierName: "Tân Cảng STC",
    vehiclePlate: "51C-65902", containerNo: "TCKU2200881",
    driverName: "Phạm Quốc Anh", driverPhone: "0908 444 333",
    deliveryEta: "14/05 18:00", etaRemainingH: -6,
    evidence: [
      { label: "Ảnh Zalo NM", kind: "screenshot" },
      { label: "Phiếu xuất NM", kind: "doc" },
      { label: "Ảnh bốc hàng", kind: "photo", count: 3 },
    ],
    timeline: [
      { stage: "approved",     ts: "10/05 09:00", actor: "Planner Linh" },
      { stage: "sent_nm",      ts: "10/05 09:30", actor: "Planner Linh" },
      { stage: "nm_confirmed", ts: "11/05 14:00", actor: "NM Đồng Tâm" },
      { stage: "pickup",       ts: "12/05 06:00", actor: "Planner Linh" },
      { stage: "in_transit",   ts: "13/05 10:00", actor: "Tài xế Anh", note: "Kẹt xe QL1A, có thể trễ" },
    ],
  },
  // 9. DELIVERING — POD pending normal
  {
    id: "9", kind: "RPO", poNumber: "PO-CT-W19-001",
    sku: "GA-300", skuLabel: "GA-300 A4", qty: 720, qtyConfirmed: 720,
    fromName: "NM Toko", toName: "CN-CT", region: "Nam",
    stage: "delivering", hoursInStage: 1,
    carrierId: "CR-03", carrierName: "Tân Cảng STC",
    vehiclePlate: "51F-221.05",
    driverName: "Võ Thanh Sơn", driverPhone: "0935 441 887",
    deliveryEta: "20/05 13:00",
    evidence: [
      { label: "Ảnh bốc hàng", kind: "photo", count: 2 },
      { label: "Phiếu xuất NM", kind: "doc" },
    ],
    timeline: [
      { stage: "approved",     ts: "16/05 08:00", actor: "Planner Hà" },
      { stage: "sent_nm",      ts: "16/05 08:30", actor: "Planner Hà" },
      { stage: "nm_confirmed", ts: "17/05 11:00", actor: "NM Toko" },
      { stage: "pickup",       ts: "18/05 06:00", actor: "Planner Hà" },
      { stage: "in_transit",   ts: "19/05 09:00", actor: "Tài xế Sơn" },
      { stage: "delivering",   ts: "20/05 13:00", actor: "CN Cần Thơ", note: "Xe đến CN, hàng nguyên vẹn" },
    ],
  },
  // 10. DELIVERING — POD overdue 3h
  {
    id: "10", kind: "RPO", poNumber: "PO-CT-W19-002",
    sku: "GA-600", skuLabel: "GA-600 B2", qty: 1200, qtyConfirmed: 1200,
    fromName: "NM Vigracera", toName: "CN-CT", region: "Nam",
    stage: "delivering", hoursInStage: 5, overdueFlag: true,
    carrierId: "CR-01", carrierName: "Vinatrans",
    vehiclePlate: "60A-882.71",
    driverName: "Trần Quốc Bảo", driverPhone: "0903 887 921",
    deliveryEta: "20/05 09:00",
    evidence: [
      { label: "Ảnh bốc hàng", kind: "photo", count: 2 },
    ],
    timeline: [
      { stage: "approved",     ts: "15/05 08:00", actor: "Planner Linh" },
      { stage: "sent_nm",      ts: "15/05 08:30", actor: "Planner Linh" },
      { stage: "nm_confirmed", ts: "16/05 14:00", actor: "NM Vigracera" },
      { stage: "pickup",       ts: "17/05 08:00", actor: "Planner Linh" },
      { stage: "in_transit",   ts: "18/05 10:00", actor: "Tài xế Bảo" },
      { stage: "delivering",   ts: "20/05 09:00", actor: "CN Cần Thơ" },
    ],
  },
  // 11–13. COMPLETED — happy path
  {
    id: "11", kind: "RPO", poNumber: "PO-HCM-W18-001",
    sku: "GA-300", skuLabel: "GA-300 A4", qty: 1500, qtyConfirmed: 1500, qtyDelivered: 1500,
    fromName: "NM Mikado", toName: "CN-HCM", region: "Nam",
    stage: "completed", hoursInStage: 72,
    carrierId: "CR-02", carrierName: "Gemadept Logistics",
    vehiclePlate: "51C-88521", containerNo: "TCKU5567890",
    driverName: "Nguyễn Văn Tài", driverPhone: "0902 777 888",
    deliveryEta: "16/05 14:00",
    evidence: [
      { label: "Ảnh bốc hàng NM", kind: "photo", count: 2 },
      { label: "Phiếu xuất NM", kind: "doc" },
      { label: "Ảnh nhận hàng CN", kind: "photo", count: 3 },
      { label: "Biên nhận", kind: "doc" },
      { label: "Chữ ký người nhận", kind: "signature" },
    ],
    timeline: [
      { stage: "approved",     ts: "10/05 08:00", actor: "Planner Linh" },
      { stage: "sent_nm",      ts: "10/05 08:30", actor: "Planner Linh" },
      { stage: "nm_confirmed", ts: "11/05 11:00", actor: "NM Mikado" },
      { stage: "pickup",       ts: "12/05 06:00", actor: "Planner Linh" },
      { stage: "in_transit",   ts: "14/05 08:00", actor: "Tài xế Tài" },
      { stage: "delivering",   ts: "16/05 13:00", actor: "CN HCM" },
      { stage: "completed",    ts: "16/05 14:30", actor: "Thủ kho Nguyễn Văn A", note: "POD đầy đủ, hàng nguyên vẹn" },
    ],
  },
  {
    id: "12", kind: "RPO", poNumber: "PO-HN-W17-001",
    sku: "GA-600", skuLabel: "GA-600 B2", qty: 800, qtyConfirmed: 800, qtyDelivered: 800,
    fromName: "NM Đồng Tâm", toName: "CN-HN", region: "Bắc",
    stage: "completed", hoursInStage: 168,
    carrierId: "CR-02", carrierName: "Gemadept Logistics",
    vehiclePlate: "29H-145.30",
    driverName: "Phạm Đức Anh", driverPhone: "0918 556 220",
    evidence: [
      { label: "Ảnh bốc hàng NM", kind: "photo", count: 2 },
      { label: "Ảnh nhận CN", kind: "photo", count: 2 },
      { label: "Biên nhận", kind: "doc" },
    ],
    timeline: [
      { stage: "completed", ts: "08/05 16:00", actor: "Thủ kho Hà Nội" },
    ],
  },
  {
    id: "13", kind: "RPO", poNumber: "PO-BD-W17-001",
    sku: "GA-300", skuLabel: "GA-300 A4", qty: 600, qtyConfirmed: 600, qtyDelivered: 600,
    fromName: "NM Toko", toName: "CN-BD", region: "Nam",
    stage: "completed", hoursInStage: 192,
    carrierId: "CR-01", carrierName: "Vinatrans",
    vehiclePlate: "51C-72184",
    driverName: "Võ Thanh Sơn", driverPhone: "0935 441 887",
    evidence: [
      { label: "Ảnh bốc hàng", kind: "photo", count: 2 },
      { label: "Ảnh nhận hàng CN", kind: "photo", count: 4 },
      { label: "Biên nhận", kind: "doc" },
    ],
    timeline: [
      { stage: "completed", ts: "06/05 11:00", actor: "Thủ kho Bình Dương" },
    ],
  },
  // 14. TO in transit
  {
    id: "14", kind: "TO", poNumber: "TO-HCM-BD-001",
    sku: "GA-600", skuLabel: "GA-600 A4", qty: 200, qtyConfirmed: 200,
    fromName: "CN-HCM", toName: "CN-BD", region: "Nam",
    stage: "in_transit", hoursInStage: 4,
    carrierId: "CR-01", carrierName: "Xe nội bộ UNIS",
    vehiclePlate: "51F-221.05",
    driverName: "Nguyễn Văn Hải", driverPhone: "0912 345 678",
    deliveryEta: "20/05 17:00", etaRemainingH: 4,
    evidence: [{ label: "Ảnh xuất kho HCM", kind: "photo", count: 1 }],
    timeline: [
      { stage: "approved",   ts: "20/05 08:00", actor: "Planner Linh", note: "TO chuyển ngang" },
      { stage: "pickup",     ts: "20/05 12:00", actor: "Planner Linh" },
      { stage: "in_transit", ts: "20/05 13:00", actor: "Tài xế Hải" },
    ],
  },
  // 15. TO completed
  {
    id: "15", kind: "TO", poNumber: "TO-QN-NA-001",
    sku: "GA-300", skuLabel: "GA-300 A4", qty: 180, qtyConfirmed: 180, qtyDelivered: 180,
    fromName: "CN-QN", toName: "CN-NA", region: "Bắc",
    stage: "completed", hoursInStage: 48,
    carrierId: "CR-04", carrierName: "Xe nội bộ UNIS",
    vehiclePlate: "29H-145.30",
    driverName: "Lê Minh Tuấn", driverPhone: "0987 112 334",
    evidence: [
      { label: "Ảnh giao hàng", kind: "photo", count: 2 },
      { label: "Biên nhận", kind: "doc" },
    ],
    timeline: [
      { stage: "completed", ts: "18/05 15:00", actor: "Thủ kho Nghệ An" },
    ],
  },
];

/** Lookup helpers */
export function nextStage(s: LifecycleStage): LifecycleStage | null {
  const idx = STAGE_ORDER.indexOf(s);
  if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

export function isOverdue(row: PoLifecycleRow): boolean {
  if (row.overdueFlag) return true;
  const sla = STAGE_SLA_HOURS[row.stage];
  return sla > 0 && row.hoursInStage > sla;
}

export function isNearSla(row: PoLifecycleRow): boolean {
  const sla = STAGE_SLA_HOURS[row.stage];
  return sla > 0 && row.hoursInStage > sla * 0.7 && !isOverdue(row);
}

export function fmtTimeInStage(h: number): string {
  if (h < 1)   return "Vừa xong";
  if (h < 24)  return `${Math.round(h)} giờ`;
  const d = Math.floor(h / 24);
  return `${d} ngày`;
}

export function fmtEta(h: number | undefined): { label: string; tone: "success" | "warning" | "danger" | "muted" } {
  if (h === undefined) return { label: "—", tone: "muted" };
  if (h < 0)  return { label: `Trễ ${Math.abs(Math.round(h))}h`, tone: "danger" };
  if (h <= 4) return { label: `Còn ${Math.round(h)}h`, tone: "warning" };
  if (h < 24) return { label: `Còn ${Math.round(h)}h`, tone: "success" };
  return { label: `Còn ${Math.round(h / 24)}ngày`, tone: "success" };
}

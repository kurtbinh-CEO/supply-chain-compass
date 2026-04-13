import { TenantName } from "@/components/TenantContext";

const tenantScales: Record<TenantName, number> = {
  "UNIS Group": 1,
  "TTC Agris": 0.72,
  "Mondelez": 1.35,
};

export type Freshness = "green" | "yellow" | "red" | "blocked";

export interface NMRow {
  id: string;
  nm: string;
  item: string;
  variant: string;
  onHand: number | null;
  committed: number;
  share: number;
  atp: number | null;
  freshness: Freshness;
  lastSync: string;
  stale: boolean;
}

const baseRows: Omit<NMRow, "atp">[] = [
  { id: "1", nm: "Toko", item: "GA-300", variant: "A4", onHand: 1500, committed: 300, share: 0.80, freshness: "yellow", lastSync: "6h ago", stale: true },
  { id: "2", nm: "Mikado", item: "GA-300", variant: "A4", onHand: 2500, committed: 200, share: 0.60, freshness: "green", lastSync: "45m ago", stale: false },
  { id: "3", nm: "Phú Mỹ", item: "GA-300", variant: "A4", onHand: null, committed: 0, share: 0, freshness: "blocked", lastSync: ">24h", stale: true },
  { id: "4", nm: "Đồng Tâm", item: "GA-300", variant: "A4", onHand: 1200, committed: 300, share: 0.50, freshness: "green", lastSync: "30m ago", stale: false },
  { id: "5", nm: "Vigracera", item: "GA-600", variant: "A4", onHand: 800, committed: 150, share: 0.70, freshness: "green", lastSync: "1h ago", stale: false },
  { id: "6", nm: "Long An Tech", item: "GA-300", variant: "B2", onHand: 600, committed: 100, share: 0.45, freshness: "red", lastSync: "18h ago", stale: true },
  { id: "7", nm: "Bình Dương", item: "GA-600", variant: "A4", onHand: 3200, committed: 500, share: 0.65, freshness: "green", lastSync: "20m ago", stale: false },
];

export function getNMRows(tenant: TenantName): NMRow[] {
  const s = tenantScales[tenant];
  return baseRows.map((r) => {
    const onHand = r.onHand ? Math.round(r.onHand * s) : null;
    const committed = Math.round(r.committed * s);
    const atp = onHand !== null ? Math.round((onHand - committed) * r.share) : null;
    return { ...r, onHand, committed, atp };
  });
}

export interface GanttRow {
  nm: string;
  item: string;
  weeks: { week: string; status: "production" | "setup" | "idle" | "maintenance" }[];
}

export const ganttData: GanttRow[] = [
  { nm: "Toko", item: "GA-300", weeks: [
    { week: "W1", status: "production" }, { week: "W2", status: "production" }, { week: "W3", status: "setup" },
    { week: "W4", status: "production" }, { week: "W5", status: "idle" }, { week: "W6", status: "production" },
  ]},
  { nm: "Mikado", item: "GA-300", weeks: [
    { week: "W1", status: "setup" }, { week: "W2", status: "production" }, { week: "W3", status: "production" },
    { week: "W4", status: "production" }, { week: "W5", status: "production" }, { week: "W6", status: "maintenance" },
  ]},
  { nm: "Phú Mỹ", item: "GA-300", weeks: [
    { week: "W1", status: "idle" }, { week: "W2", status: "idle" }, { week: "W3", status: "maintenance" },
    { week: "W4", status: "idle" }, { week: "W5", status: "setup" }, { week: "W6", status: "production" },
  ]},
  { nm: "Đồng Tâm", item: "GA-300", weeks: [
    { week: "W1", status: "production" }, { week: "W2", status: "production" }, { week: "W3", status: "production" },
    { week: "W4", status: "setup" }, { week: "W5", status: "production" }, { week: "W6", status: "production" },
  ]},
  { nm: "Vigracera", item: "GA-600", weeks: [
    { week: "W1", status: "production" }, { week: "W2", status: "maintenance" }, { week: "W3", status: "production" },
    { week: "W4", status: "production" }, { week: "W5", status: "production" }, { week: "W6", status: "setup" },
  ]},
  { nm: "Long An Tech", item: "GA-300", weeks: [
    { week: "W1", status: "idle" }, { week: "W2", status: "setup" }, { week: "W3", status: "production" },
    { week: "W4", status: "production" }, { week: "W5", status: "maintenance" }, { week: "W6", status: "idle" },
  ]},
  { nm: "Bình Dương", item: "GA-600", weeks: [
    { week: "W1", status: "production" }, { week: "W2", status: "production" }, { week: "W3", status: "production" },
    { week: "W4", status: "production" }, { week: "W5", status: "setup" }, { week: "W6", status: "production" },
  ]},
];

export interface Shipment {
  id: string;
  from: string;
  to: string;
  item: string;
  qty: number;
  eta: string;
  status: "in-transit" | "arrived" | "delayed" | "pending";
  carrier: string;
  trackingId: string;
}

const baseShipments: Shipment[] = [
  { id: "s1", from: "Toko", to: "Hub HCM", item: "GA-300", qty: 2400, eta: "15/04", status: "in-transit", carrier: "VN Logistics", trackingId: "VNL-88201" },
  { id: "s2", from: "Mikado", to: "Hub Đà Nẵng", item: "GA-300", qty: 1800, eta: "14/04", status: "arrived", carrier: "Gemadept", trackingId: "GMD-44120" },
  { id: "s3", from: "Đồng Tâm", to: "Hub HCM", item: "GA-300", qty: 3000, eta: "16/04", status: "in-transit", carrier: "ITL Corp", trackingId: "ITL-77034" },
  { id: "s4", from: "Vigracera", to: "Hub Hà Nội", item: "GA-600", qty: 1200, eta: "17/04", status: "delayed", carrier: "Transimex", trackingId: "TMX-55098" },
  { id: "s5", from: "Long An Tech", to: "Hub HCM", item: "GA-300", qty: 800, eta: "18/04", status: "pending", carrier: "Saigon Cargo", trackingId: "SGC-33012" },
  { id: "s6", from: "Bình Dương", to: "Hub HCM", item: "GA-600", qty: 4500, eta: "14/04", status: "arrived", carrier: "VN Logistics", trackingId: "VNL-88215" },
];

export function getShipments(tenant: TenantName): Shipment[] {
  const s = tenantScales[tenant];
  return baseShipments.map((sh) => ({ ...sh, qty: Math.round(sh.qty * s) }));
}

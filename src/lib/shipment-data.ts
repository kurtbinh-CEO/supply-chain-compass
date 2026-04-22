/* Mock shipment / carrier / driver data — keyed by ASN code */

export interface ShipmentEvent {
  stage: "picked" | "loaded" | "in_transit" | "at_gate" | "received";
  label: string;
  ts: string; // "DD/MM HH:mm"
  done: boolean;
  note?: string;
}

export interface ShipmentDetail {
  asn: string;
  rpo: string;
  carrier: string;
  carrierPhone: string;
  driver: string;
  driverPhone: string;
  vehicle: string;        // biển số
  vehicleType: string;    // "Tải 5T", "Container 20ft"
  fillPct: number;
  origin: string;
  destination: string;
  shipDate: string;
  eta: string;
  etaCountdownH?: number; // hours remaining (negative = overdue)
  temperature?: string;
  podUrl?: string;
  events: ShipmentEvent[];
  currentStage: ShipmentEvent["stage"];
}

const carriers = [
  { name: "Vinatrans Logistics", phone: "1900-6868" },
  { name: "Gemadept Shipping", phone: "028-3823-4567" },
  { name: "ITL Corporation", phone: "1900-7676" },
  { name: "Sotrans Cargo", phone: "028-3848-1234" },
];

const drivers = [
  { name: "Nguyễn Văn Hải", phone: "0912-345-678" },
  { name: "Trần Quốc Bảo", phone: "0903-887-921" },
  { name: "Lê Minh Tuấn", phone: "0987-112-334" },
  { name: "Phạm Đức Anh", phone: "0918-556-220" },
  { name: "Võ Thanh Sơn", phone: "0935-441-887" },
];

const vehicles = [
  { plate: "51C-678.92", type: "Container 20ft" },
  { plate: "29H-145.30", type: "Tải 10T" },
  { plate: "60A-882.71", type: "Container 40ft" },
  { plate: "51F-221.05", type: "Tải 5T" },
];

const stageOrder: ShipmentEvent["stage"][] = ["picked", "loaded", "in_transit", "at_gate", "received"];
const stageLabels: Record<ShipmentEvent["stage"], string> = {
  picked: "Đã pick hàng",
  loaded: "Đã load lên xe",
  in_transit: "Đang vận chuyển",
  at_gate: "Tới cổng kho",
  received: "Đã nhận",
};

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function fmtTs(daysAgo: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  return `${dd}/${mm} ${hh}:00`;
}

export function getShipmentDetail(
  asn: string,
  rpo: string,
  status: string,
  shipDate: string,
  eta: string,
  destination: string,
): ShipmentDetail {
  const h = hashStr(asn);
  const carrier = carriers[h % carriers.length];
  const driver = drivers[h % drivers.length];
  const vehicle = vehicles[h % vehicles.length];
  const fillPct = 65 + (h % 30);

  // Determine current stage from status
  const statusLow = status.toLowerCase();
  let currentStage: ShipmentEvent["stage"] = "picked";
  if (statusLow.includes("received")) currentStage = "received";
  else if (statusLow.includes("shipped")) currentStage = "in_transit";
  else if (statusLow.includes("confirmed")) currentStage = "loaded";

  const currentIdx = stageOrder.indexOf(currentStage);

  const events: ShipmentEvent[] = stageOrder.map((s, i) => ({
    stage: s,
    label: stageLabels[s],
    ts: i <= currentIdx ? fmtTs(currentIdx - i, 8 + i * 3) : "—",
    done: i <= currentIdx,
    note: s === "in_transit" && i <= currentIdx ? "QL1A — qua trạm Dầu Giây" : undefined,
  }));

  // ETA countdown — random offset from now
  const etaCountdownH = ((h % 96) - 48); // -48..+48h

  return {
    asn,
    rpo,
    carrier: carrier.name,
    carrierPhone: carrier.phone,
    driver: driver.name,
    driverPhone: driver.phone,
    vehicle: vehicle.plate,
    vehicleType: vehicle.type,
    fillPct,
    origin: ["KCN Mỹ Phước", "KCN Sóng Thần", "Nhà máy Bình Dương", "Nhà máy Long An"][h % 4],
    destination,
    shipDate,
    eta,
    etaCountdownH: currentStage === "received" ? undefined : etaCountdownH,
    temperature: h % 3 === 0 ? "Nhiệt độ thường" : undefined,
    podUrl: currentStage === "received" ? `pod-${asn}.pdf` : undefined,
    events,
    currentStage,
  };
}

export function etaTone(hours: number | undefined): "success" | "warning" | "danger" | "muted" {
  if (hours === undefined) return "muted";
  if (hours < 0) return "danger";
  if (hours <= 12) return "warning";
  return "success";
}

export function etaLabel(hours: number | undefined): string {
  if (hours === undefined) return "Đã nhận";
  if (hours < 0) return `Trễ ${Math.abs(hours)}h`;
  if (hours < 24) return `Còn ${hours}h`;
  return `Còn ${Math.round(hours / 24)} ngày`;
}

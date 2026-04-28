/**
 * PO Group builder — gộp các dòng SKU theo PO number (NM × CN × Tuần).
 *
 * MULTI-DROP support: nếu 1 PO có nhiều `toName` khác nhau → mỗi `toName` là 1
 * drop point (1 xe ghép tuyến giao 2-3 CN). Lines cùng `toName` gộp thành SKU
 * detail của drop đó.
 *
 * Group status = stage SỚM NHẤT chưa hoàn thành trong các lines.
 * Drop status = stage của các line trong drop đó (lines cùng drop luôn cùng stage).
 */
import {
  PoLifecycleRow, LifecycleStage, STAGE_ORDER, isOverdue, STAGE_SLA_HOURS,
} from "@/lib/po-lifecycle-data";

export interface DropPoint {
  /** "CN-BD" */
  cn: string;
  /** Thứ tự giao trong tuyến (1, 2, 3) — sort theo first appearance */
  dropOrder: number;
  /** Tổng qty của drop (m²) */
  qty: number;
  /** ETA giao của drop — lấy từ deliveryEta của line đầu, fallback pickupEta */
  eta?: string;
  /** Stage của drop (= stage của lines trong drop, lines cùng drop luôn cùng stage) */
  stage: LifecycleStage;
  /** Lines (SKU detail) thuộc drop này */
  lines: PoLifecycleRow[];
}

export interface PoGroup {
  groupId: string;          // = poNumber
  poNumber: string;
  kind: "RPO" | "TO";
  fromName: string;
  /** Tóm tắt điểm đến: "CN-BD" hoặc "2 điểm: CN-BD, CN-DN" */
  toName: string;
  region: "Bắc" | "Trung" | "Nam";

  totalQty: number;
  lineCount: number;
  lines: PoLifecycleRow[];

  /** Drop points — luôn ≥1. Multi-drop khi length > 1. */
  drops: DropPoint[];
  /** True khi >1 drop = ghép tuyến */
  isConsolidated: boolean;
  /** Số tiền tiết kiệm được từ ghép tuyến (mock, VND) */
  savingAmount?: number;

  /** Stage sớm nhất chưa hoàn thành — đại diện cho group. */
  stage: LifecycleStage;
  /** Hàng "leader" (line đại diện ở stage sớm nhất) cho action button. */
  leader: PoLifecycleRow;

  /** True khi BẤT KỲ line nào trong group bị overdue. */
  anyOverdue: boolean;
  /** Container fill ước tính (giả định 1 cont 40ft = 1.800m²). */
  containerFill: { type: string; pct: number };
}

const STAGE_RANK: Record<LifecycleStage, number> = {
  approved: 0, sent_nm: 1, nm_confirmed: 2, pickup: 3,
  in_transit: 4, delivering: 5, completed: 6, cancelled: 7,
};

function pickContainer(qty: number) {
  if (qty <= 900) {
    const pct = Math.round((qty / 900) * 100);
    return { type: "20ft", pct };
  }
  if (qty <= 1800) {
    const pct = Math.round((qty / 1800) * 100);
    return { type: "40ft", pct };
  }
  // > 1800: cần 40ft + thêm
  const extra = qty - 1800;
  const pct = Math.round((extra / 900) * 100);
  return { type: "40ft+20ft", pct };
}

/** Build drop points từ lines của 1 PO group. */
function buildDrops(lines: PoLifecycleRow[]): DropPoint[] {
  const map = new Map<string, PoLifecycleRow[]>();
  const order: string[] = [];
  for (const l of lines) {
    if (!map.has(l.toName)) {
      map.set(l.toName, []);
      order.push(l.toName);
    }
    map.get(l.toName)!.push(l);
  }
  return order.map((cn, idx) => {
    const dropLines = map.get(cn)!;
    const first = dropLines[0];
    return {
      cn,
      dropOrder: idx + 1,
      qty: dropLines.reduce((s, l) => s + l.qty, 0),
      eta: first.deliveryEta ?? first.pickupEta,
      stage: first.stage, // assume same stage per drop
      lines: dropLines,
    };
  });
}

/** Mock saving — multi-drop tiết kiệm theo số drops và qty. */
function mockSaving(drops: DropPoint[]): number | undefined {
  if (drops.length < 2) return undefined;
  // ~5M₫/drop bổ sung + bonus theo qty
  const totalQty = drops.reduce((s, d) => s + d.qty, 0);
  return (drops.length - 1) * 5_000_000 + Math.round(totalQty * 1500);
}

export function buildPoGroups(rows: PoLifecycleRow[]): PoGroup[] {
  const map = new Map<string, PoLifecycleRow[]>();
  for (const r of rows) {
    const key = r.poNumber;
    const arr = map.get(key);
    if (arr) arr.push(r);
    else map.set(key, [r]);
  }

  const groups: PoGroup[] = [];
  for (const [poNumber, lines] of map.entries()) {
    // Stage sớm nhất chưa hoàn thành (rank thấp nhất, bỏ cancelled)
    const active = lines.filter(l => l.stage !== "cancelled");
    const ref = (active.length > 0 ? active : lines).reduce((min, l) =>
      STAGE_RANK[l.stage] < STAGE_RANK[min.stage] ? l : min
    );
    const totalQty = lines.reduce((s, l) => s + l.qty, 0);
    const drops = buildDrops(lines);
    const isConsolidated = drops.length > 1;
    const toName = isConsolidated
      ? `${drops.length} điểm: ${drops.map(d => d.cn).join(", ")}`
      : drops[0]?.cn ?? ref.toName;

    groups.push({
      groupId: poNumber,
      poNumber,
      kind: ref.kind,
      fromName: ref.fromName,
      toName,
      region: ref.region,
      totalQty,
      lineCount: lines.length,
      lines,
      drops,
      isConsolidated,
      savingAmount: mockSaving(drops),
      stage: ref.stage,
      leader: ref,
      anyOverdue: lines.some(l => isOverdue(l)),
      containerFill: pickContainer(totalQty),
    });
  }
  return groups;
}

/** Check overdue ở mức group (any line overdue). */
export function groupOverdue(g: PoGroup): boolean {
  return g.anyOverdue;
}

/** Check near-SLA ở mức group (any line near). */
export function groupNearSla(g: PoGroup): boolean {
  return g.lines.some(l => {
    const sla = STAGE_SLA_HOURS[l.stage];
    return sla > 0 && l.hoursInStage > sla * 0.7 && !isOverdue(l);
  });
}

/** Lấy tất cả line ID có cùng stage với leader (để cascade action). */
export function leaderSiblingIds(g: PoGroup): string[] {
  return g.lines.filter(l => l.stage === g.leader.stage).map(l => l.id);
}

/**
 * PO Group builder — gộp các dòng SKU theo PO number (NM × CN × Tuần).
 *
 * Nhiều SKU có cùng poNumber được gom vào 1 group (parent row).
 * Group status = stage SỚM NHẤT chưa hoàn thành trong các lines.
 */
import {
  PoLifecycleRow, LifecycleStage, STAGE_ORDER, isOverdue, STAGE_SLA_HOURS,
} from "@/lib/po-lifecycle-data";

export interface PoGroup {
  groupId: string;          // = poNumber
  poNumber: string;
  kind: "RPO" | "TO";
  fromName: string;
  toName: string;
  region: "Bắc" | "Trung" | "Nam";

  totalQty: number;
  lineCount: number;
  lines: PoLifecycleRow[];

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
    groups.push({
      groupId: poNumber,
      poNumber,
      kind: ref.kind,
      fromName: ref.fromName,
      toName: ref.toName,
      region: ref.region,
      totalQty,
      lineCount: lines.length,
      lines,
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

/**
 * po-group-builder — Group flat PO/TO line rows into 2-tier "PO group → SKU child".
 *
 * Group key: `${kind}-${cnCode}-W${week}` derived from the line's poNumber
 * (PO-BD-W20-001 → group "PO-BD-W20"). Lines that share NM × CN × Week land
 * under the same parent (gom container chung).
 *
 * Group status = the EARLIEST incomplete stage among lines (so a 2-line group
 * with [sent_nm, approved] surfaces as "ĐÃ DUYỆT" — chưa gửi hết).
 */
import {
  type PoLifecycleRow, type LifecycleStage, STAGE_ORDER,
} from "./po-lifecycle-data";

/* ── Đơn giá demo (₫/m²) — fallback nếu không match ──────────────────────── */
const SKU_UNIT_PRICE: Record<string, number> = {
  "GA-600 B2": 193_640,
  "GA-600 A4": 178_500,
  "GA-300 A4": 168_200,
  "GA-300 B2": 172_800,
};
export const unitPriceFor = (skuLabel: string): number =>
  SKU_UNIT_PRICE[skuLabel] ?? 175_000;

/* ── Container fill demo: tổng m² / 1400 = % của 1 container 40ft ───────── */
const CONTAINER_40FT_CAP_M2 = 1400;
export function containerLabel(totalQty: number): string {
  if (totalQty <= 0) return "—";
  if (totalQty <= CONTAINER_40FT_CAP_M2) {
    const pct = Math.round((totalQty / CONTAINER_40FT_CAP_M2) * 100);
    return `40ft ${pct}%`;
  }
  if (totalQty <= CONTAINER_40FT_CAP_M2 * 2) {
    return "40ft + 20ft";
  }
  return "2 × 40ft";
}

/* ── Parse "PO-BD-W20-001" → groupId "PO-BD-W20", week 20 ────────────────── */
function parsePoNumber(poNumber: string): { groupId: string; week: number } {
  // Pattern 1: PO-{cn}-W{week}-{seq}
  const m1 = poNumber.match(/^(PO-[A-Z]+-W\d+)(?:-\d+)?$/);
  if (m1) {
    const week = Number(poNumber.match(/W(\d+)/)?.[1] ?? 0);
    return { groupId: m1[1], week };
  }
  // Pattern 2: TO-{from}-{to}-{seq}
  const m2 = poNumber.match(/^(TO-[A-Z]+-[A-Z]+)(?:-\d+)?$/);
  if (m2) return { groupId: m2[1], week: 0 };
  // Fallback: strip last "-NNN"
  return { groupId: poNumber.replace(/-\d{1,3}$/, ""), week: 0 };
}

export interface PoGroup {
  groupId: string;             // "PO-BD-W20"
  kind: "RPO" | "TO";
  fromName: string;
  toName: string;
  week: number;
  totalQty: number;            // Σ lines.qty
  totalQtyConfirmed: number;   // Σ lines.qtyConfirmed (fallback qty)
  totalValue: number;          // Σ lines.qty × unitPrice
  lineCount: number;
  container: string;
  /** Group status = earliest incomplete stage among lines. */
  stage: LifecycleStage;
  /** Max hoursInStage among lines whose stage == group stage. */
  hoursInStage: number;
  overdueFlag: boolean;
  /** True if any line is overdue. */
  anyOverdue: boolean;
  /** Lines (preserves original order). */
  lines: PoLifecycleRow[];
  /** The "leader" line — earliest-incomplete child whose action drives the group action. */
  leader: PoLifecycleRow;
}

/** Order index for stage comparison; lower = earlier (cancelled treated as last). */
function stageRank(s: LifecycleStage): number {
  if (s === "cancelled") return 999;
  const i = STAGE_ORDER.indexOf(s);
  return i < 0 ? 998 : i;
}

export function buildPoGroups(rows: PoLifecycleRow[]): PoGroup[] {
  const map = new Map<string, PoLifecycleRow[]>();
  for (const r of rows) {
    const { groupId } = parsePoNumber(r.poNumber);
    const key = `${r.kind}|${groupId}`;
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  const groups: PoGroup[] = [];
  for (const [, lines] of map) {
    const first = lines[0];
    const { groupId, week } = parsePoNumber(first.poNumber);
    const totalQty = lines.reduce((s, l) => s + l.qty, 0);
    const totalQtyConfirmed = lines.reduce((s, l) => s + (l.qtyConfirmed ?? l.qty), 0);
    const totalValue = lines.reduce((s, l) => s + l.qty * unitPriceFor(l.skuLabel), 0);
    // Earliest-incomplete stage among lines
    const sortedByStage = [...lines].sort((a, b) => stageRank(a.stage) - stageRank(b.stage));
    const leader = sortedByStage[0];
    const stage = leader.stage;
    // Max hoursInStage among lines that share group stage
    const hoursInStage = lines
      .filter(l => l.stage === stage)
      .reduce((m, l) => Math.max(m, l.hoursInStage), 0);
    const anyOverdue = lines.some(l => !!l.overdueFlag);
    groups.push({
      groupId,
      kind: first.kind,
      fromName: first.fromName,
      toName: first.toName,
      week,
      totalQty,
      totalQtyConfirmed,
      totalValue,
      lineCount: lines.length,
      container: containerLabel(totalQty),
      stage,
      hoursInStage,
      overdueFlag: leader.overdueFlag ?? false,
      anyOverdue,
      lines,
      leader,
    });
  }
  // Stable sort: overdue first, then by stage rank, then by hoursInStage desc
  groups.sort((a, b) => {
    if (a.anyOverdue !== b.anyOverdue) return a.anyOverdue ? -1 : 1;
    const sr = stageRank(a.stage) - stageRank(b.stage);
    if (sr !== 0) return sr;
    return b.hoursInStage - a.hoursInStage;
  });
  return groups;
}

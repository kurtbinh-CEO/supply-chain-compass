/**
 * BPO ↔ RPO Tracker — PRD §11.1F
 *
 *   Hub_available = Σ(NM_committed) − Σ(PO_released) − Hub_SS
 *
 * Mỗi PO tuần (RPO) approved → trừ lùi khỏi cam kết tháng (BPO).
 *
 *   "Đầu tháng: NM Mikado cam kết 4.200m² GA-300."
 *   "W18 release 1.200m² → còn 3.000m²"
 *   "W19 release 1.000m² → còn 2.000m²"
 *   "W20 release  800m² → còn 1.200m² (cần W21–W22 cover nốt)"
 *
 * Cung cấp cho Orders, Hub Cam kết, DRP step 7.
 */

export type BpoWeekStatus = "completed" | "in_transit" | "draft" | "planned";
export type BpoStatusTone = "ok" | "warn" | "critical" | "done";

export interface BpoWeekRelease {
  week: number;
  qty: number;
  status: BpoWeekStatus;
  /** PO id (optional — link sang Orders) */
  poId?: string;
  poNumber?: string;
  /** dd/MM */
  releaseDate?: string;
}

export interface BpoTracker {
  nmId: string;        // "NM-MKD"
  nmName: string;      // "Mikado"
  skuBaseCode: string; // "GA-300"
  skuLabel: string;    // "GA-300 30×30"
  month: number;
  year: number;
  /** m² */
  committedQty: number;
  /** Σ PO qty (status != cancelled) */
  releasedQty: number;
  /** committed − released */
  remainingQty: number;
  /** released / committed × 100 */
  releasePct: number;
  /** từng tuần đã release / dự kiến */
  weeklyBreakdown: BpoWeekRelease[];
  /** ngày hôm nay coi là 24/30 → onTrack nếu releasePct ≥ (24/30)*100 = 80% */
  onTrack: boolean;
}

/** Tháng làm việc của demo: T5/2026 đang ngày 24/30. */
export const BPO_DEMO_MONTH = 5;
export const BPO_DEMO_YEAR = 2026;
export const BPO_DEMO_DAY_OF_MONTH = 24;
export const BPO_DEMO_DAYS_IN_MONTH = 30;

/** ngưỡng tiến độ kỳ vọng tại ngày hôm nay (≈80%) */
export const BPO_EXPECTED_PCT =
  (BPO_DEMO_DAY_OF_MONTH / BPO_DEMO_DAYS_IN_MONTH) * 100;

/* ═══════════════════════════════════════════════════════════════════════════
   Mock data — 5 NM × ~3 SKU = 15 entries
   ═══════════════════════════════════════════════════════════════════════════ */
const M = BPO_DEMO_MONTH;
const Y = BPO_DEMO_YEAR;

function build(
  nmId: string,
  nmName: string,
  skuBaseCode: string,
  skuLabel: string,
  committed: number,
  weekly: BpoWeekRelease[],
): BpoTracker {
  // Released = chỉ tính status != "planned" (planned là dự định cho W21+, chưa thật)
  // — và status != "draft"? Không, draft cũng đã release ra batch DRP rồi (chờ duyệt).
  const released = weekly
    .filter(w => w.status !== "planned")
    .reduce((s, w) => s + w.qty, 0);
  const remaining = Math.max(0, committed - released);
  const pct = committed > 0 ? Math.round((released / committed) * 100) : 0;
  return {
    nmId, nmName, skuBaseCode, skuLabel,
    month: M, year: Y,
    committedQty: committed,
    releasedQty: released,
    remainingQty: remaining,
    releasePct: pct,
    weeklyBreakdown: weekly,
    onTrack: pct >= BPO_EXPECTED_PCT,
  };
}

export const BPO_TRACKER: BpoTracker[] = [
  // ── Mikado ─────────────────────────────────────────────────────────────────
  build("NM-MKD", "Mikado", "GA-300", "GA-300 30×30", 4200, [
    { week: 18, qty: 1200, status: "completed",  poNumber: "PO-HN-W18-001", releaseDate: "05/05" },
    { week: 19, qty: 1000, status: "in_transit", poNumber: "PO-HN-W19-001", releaseDate: "12/05" },
    { week: 20, qty:  800, status: "draft",      poNumber: "PO-HN-W20-001", releaseDate: "19/05" },
  ]),
  build("NM-MKD", "Mikado", "GA-400", "GA-400 40×40", 2000, [
    { week: 18, qty:  600, status: "completed",  poNumber: "PO-HN-W18-002", releaseDate: "06/05" },
    { week: 19, qty:  500, status: "in_transit", poNumber: "PO-HN-W19-002", releaseDate: "13/05" },
    { week: 20, qty:  400, status: "draft",      poNumber: "PO-HN-W20-002", releaseDate: "20/05" },
  ]),
  build("NM-MKD", "Mikado", "GN-600", "GN-600 60×60", 1800, [
    { week: 18, qty:  500, status: "completed",  poNumber: "PO-HN-W18-003", releaseDate: "07/05" },
    { week: 19, qty:  500, status: "completed",  poNumber: "PO-HN-W19-003", releaseDate: "14/05" },
    { week: 20, qty:  400, status: "draft",      poNumber: "PO-HN-W20-003", releaseDate: "21/05" },
  ]),

  // ── Toko (chậm) ────────────────────────────────────────────────────────────
  build("NM-TKO", "Toko", "GA-600", "GA-600 60×60", 3000, [
    { week: 18, qty:  600, status: "completed",  poNumber: "PO-DN-W18-001", releaseDate: "05/05" },
    { week: 19, qty:  600, status: "in_transit", poNumber: "PO-DN-W19-001", releaseDate: "12/05" },
    { week: 20, qty:    0, status: "draft",      poNumber: "PO-DN-W20-001", releaseDate: "19/05" },
  ]),
  build("NM-TKO", "Toko", "GA-800", "GA-800 80×80", 1800, [
    { week: 18, qty:  400, status: "completed",  poNumber: "PO-DN-W18-002", releaseDate: "06/05" },
    { week: 19, qty:  300, status: "in_transit", poNumber: "PO-DN-W19-002", releaseDate: "13/05" },
  ]),

  // ── Đồng Tâm (xong sớm) ────────────────────────────────────────────────────
  build("NM-DTM", "Đồng Tâm", "GT-300", "GT-300 30×30", 2800, [
    { week: 18, qty: 1200, status: "completed",  poNumber: "PO-HCM-W18-001", releaseDate: "05/05" },
    { week: 19, qty: 1000, status: "completed",  poNumber: "PO-HCM-W19-001", releaseDate: "12/05" },
    { week: 20, qty:  600, status: "in_transit", poNumber: "PO-HCM-W20-001", releaseDate: "19/05" },
  ]),
  build("NM-DTM", "Đồng Tâm", "GT-600", "GT-600 60×60", 2200, [
    { week: 18, qty:  900, status: "completed",  poNumber: "PO-HCM-W18-002", releaseDate: "06/05" },
    { week: 19, qty:  800, status: "completed",  poNumber: "PO-HCM-W19-002", releaseDate: "13/05" },
    { week: 20, qty:  500, status: "in_transit", poNumber: "PO-HCM-W20-002", releaseDate: "20/05" },
  ]),

  // ── Vigracera (chậm) ───────────────────────────────────────────────────────
  build("NM-VGC", "Vigracera", "GM-300", "GM-300 30×30", 1500, [
    { week: 18, qty:  400, status: "completed",  poNumber: "PO-HN-W18-004", releaseDate: "07/05" },
    { week: 19, qty:  200, status: "in_transit", poNumber: "PO-HN-W19-004", releaseDate: "14/05" },
  ]),
  build("NM-VGC", "Vigracera", "GM-400", "GM-400 40×40", 1200, [
    { week: 18, qty:  300, status: "completed",  poNumber: "PO-HN-W18-005", releaseDate: "08/05" },
    { week: 19, qty:  200, status: "in_transit", poNumber: "PO-HN-W19-005", releaseDate: "15/05" },
  ]),

  // ── Phú Mỹ (rất chậm) ──────────────────────────────────────────────────────
  build("NM-PHM", "Phú Mỹ", "PK-001", "PK-001 Porcelain", 1200, [
    { week: 18, qty:  200, status: "completed",  poNumber: "PO-CT-W18-001", releaseDate: "08/05" },
  ]),
];

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

export function bpoStatusTone(t: BpoTracker): { tone: BpoStatusTone; label: string; emoji: string } {
  if (t.releasePct >= 100) return { tone: "done", label: "Xong",            emoji: "✅" };
  if (t.releasePct >= BPO_EXPECTED_PCT) return { tone: "ok", label: "Đúng tiến độ", emoji: "🟢" };
  if (t.releasePct >= BPO_EXPECTED_PCT * 0.6) return { tone: "warn", label: "Chậm", emoji: "🟡" };
  return { tone: "critical", label: "Rất chậm", emoji: "🔴" };
}

/** Aggregate per NM (sum across SKUs) */
export interface BpoNmSummary {
  nmId: string;
  nmName: string;
  committedQty: number;
  releasedQty: number;
  remainingQty: number;
  releasePct: number;
  skuCount: number;
  trackers: BpoTracker[];
}

export function aggregateByNm(rows: BpoTracker[] = BPO_TRACKER): BpoNmSummary[] {
  const map = new Map<string, BpoNmSummary>();
  for (const r of rows) {
    const cur = map.get(r.nmId) || {
      nmId: r.nmId, nmName: r.nmName,
      committedQty: 0, releasedQty: 0, remainingQty: 0, releasePct: 0,
      skuCount: 0, trackers: [],
    };
    cur.committedQty += r.committedQty;
    cur.releasedQty += r.releasedQty;
    cur.remainingQty += r.remainingQty;
    cur.skuCount += 1;
    cur.trackers.push(r);
    map.set(r.nmId, cur);
  }
  for (const v of map.values()) {
    v.releasePct = v.committedQty > 0 ? Math.round((v.releasedQty / v.committedQty) * 100) : 0;
  }
  return Array.from(map.values()).sort((a, b) => a.releasePct - b.releasePct);
}

/** Aggregate weekly across all NM (cho monthly→weekly flow viz) */
export interface BpoWeekTotal {
  week: number;
  qty: number;
  /** dominant status — completed nếu tất cả completed, in_transit nếu ≥1 chở, draft nếu ≥1 nháp */
  status: BpoWeekStatus;
  poCount: number;
}

export function aggregateByWeek(rows: BpoTracker[] = BPO_TRACKER): BpoWeekTotal[] {
  const map = new Map<number, { qty: number; statuses: BpoWeekStatus[]; poCount: number }>();
  for (const r of rows) {
    for (const w of r.weeklyBreakdown) {
      if (w.qty <= 0) continue;
      const cur = map.get(w.week) || { qty: 0, statuses: [], poCount: 0 };
      cur.qty += w.qty;
      cur.statuses.push(w.status);
      cur.poCount += 1;
      map.set(w.week, cur);
    }
  }
  // dummy planned weeks W21, W22
  if (!map.has(21)) map.set(21, { qty: 2400, statuses: ["planned"], poCount: 0 });
  if (!map.has(22)) map.set(22, { qty: 2500, statuses: ["planned"], poCount: 0 });

  return Array.from(map.entries())
    .map(([week, v]) => {
      const status: BpoWeekStatus =
        v.statuses.every(s => s === "completed") ? "completed" :
        v.statuses.some(s => s === "draft") ? "draft" :
        v.statuses.some(s => s === "in_transit") ? "in_transit" :
        v.statuses[0] || "planned";
      return { week, qty: v.qty, status, poCount: v.poCount };
    })
    .sort((a, b) => a.week - b.week);
}

/** Tổng cam kết / đã release toàn tháng */
export function totals(rows: BpoTracker[] = BPO_TRACKER) {
  const committed = rows.reduce((s, r) => s + r.committedQty, 0);
  const released = rows.reduce((s, r) => s + r.releasedQty, 0);
  const remaining = committed - released;
  const pct = committed > 0 ? Math.round((released / committed) * 100) : 0;
  return { committed, released, remaining, pct };
}

/** Lookup helper for PO drill-down ("Thuộc cam kết …") */
export function findBpoForPo(poNumber: string): { tracker: BpoTracker; week: BpoWeekRelease } | null {
  for (const t of BPO_TRACKER) {
    const w = t.weeklyBreakdown.find(x => x.poNumber === poNumber);
    if (w) return { tracker: t, week: w };
  }
  // Fallback: parse "PO-XX-Wnn-..." → tìm theo skuBaseCode trong PO seed (best effort)
  return null;
}

/** Lookup by sku base code → (nm tier — first match) used by DRP */
export function findBpoBySku(skuBaseCode: string): BpoTracker[] {
  return BPO_TRACKER.filter(t => t.skuBaseCode === skuBaseCode);
}

export const WEEK_STATUS_META: Record<BpoWeekStatus, { label: string; emoji: string; cls: string }> = {
  completed:  { label: "Hoàn tất",   emoji: "✅", cls: "text-success" },
  in_transit: { label: "Đang chở",   emoji: "🚛", cls: "text-info" },
  draft:      { label: "Nháp",       emoji: "📝", cls: "text-warning" },
  planned:    { label: "Dự kiến",    emoji: "📅", cls: "text-text-3" },
};

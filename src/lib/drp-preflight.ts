/**
 * Shared DRP preflight evaluator (async, DB-backed).
 *
 * Cùng dataset thực tế mà /drp Bước 1 đang dùng. Tách riêng để trang
 * /drp/preflight-audit có thể tái sử dụng và bổ sung explanation chi tiết.
 *
 * 4 DQ gates mới (G2..G5) query trực tiếp Supabase:
 *   G1 NM Freshness   — inventory.updated_at trong 48h
 *   G2 Demand Version — demand_versions.status = 'LOCKED' tồn tại
 *   G3 SS Coverage    — safety_stock count ≥ 80% CN×SKU combos
 *   G4 Lead Time      — lead_times phủ đủ NM→CN active pairs
 *   G5 Master Data    — inventory phủ ≥ 90% active SKU
 *
 * Các row legacy (cn-stock, cn-adj, sop workspace, nm-commit, pricelist) giữ
 * nguyên ý nghĩa mock để không phá UI hiện tại.
 *
 * Mọi text tiếng Việt.
 */
import type { TenantName } from "@/components/TenantContext";
import { getNMSummaries, type NMSummary } from "@/components/supply/supplyData";
import type { PreflightItem, PreflightLevel } from "@/components/drp/DrpPreflight";
import type { PlanningCycle } from "@/data/unis-enterprise-dataset";
import { supabase } from "@/integrations/supabase/client";

/** Map updatedAgo → giờ stale ước lượng (đồng bộ với DrpPage). */
export function staleHoursOf(ago: NMSummary["updatedAgo"]): number {
  return ago === "today" ? 12 : ago === "yesterday" ? 26 : 72;
}

const TENANT_CODE: Record<TenantName, string> = {
  "UNIS Group": "UNIS",
  "TTC Agris": "TTC",
  "Mondelez": "MDLZ",
};

export interface PreflightContext {
  tenant: TenantName;
  planCycle: PlanningCycle;
  sopLockedFromWorkspace: boolean;
  /** % SKU NM đã cam kết (mock 60% để khớp UI hiện tại). */
  nmCommitPct?: number;
}

export interface PreflightAuditRow extends PreflightItem {
  thresholdText: string;
  evidence: string[];
  ruleText: string;
  blocksRun: boolean;
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  G1 — NM stock freshness via inventory.updated_at                        */
/* ──────────────────────────────────────────────────────────────────────── */
async function gateNmFreshness(tenantCode: string): Promise<PreflightAuditRow> {
  const { data, error } = await supabase
    .from("inventory")
    .select("warehouse_code, updated_at")
    .eq("tenant", tenantCode);

  if (error || !data || data.length === 0) {
    return {
      key: "nm-stock",
      label: "Tồn kho NM",
      level: "warn",
      result: error ? "Không đọc được tồn NM" : "Chưa có dòng tồn kho",
      detail: error?.message ?? "Hãy seed inventory trước khi chạy DRP.",
      fixHref: "/inventory",
      fixLabel: "Mở Tồn kho NM",
      thresholdText: "≤ 48h: ✅ · 24–48h: ⚠️ · >48h: 🔴 chặn",
      evidence: [error ? `Supabase error: ${error.message}` : "0 dòng inventory"],
      ruleText: "DRP cần dữ liệu tồn NM trong 48h gần nhất.",
      blocksRun: false,
    };
  }

  // Group by warehouse_code → max(staleHours)
  const now = Date.now();
  const byWh = new Map<string, number>();
  for (const r of data) {
    const ts = r.updated_at ? new Date(r.updated_at).getTime() : 0;
    const hours = ts > 0 ? (now - ts) / 36e5 : 999;
    byWh.set(r.warehouse_code, Math.min(byWh.get(r.warehouse_code) ?? 999, hours));
  }
  const items = Array.from(byWh.entries()).map(([wh, h]) => ({ wh, h }));
  const stale = items.filter(i => i.h > 48);
  const warn = items.filter(i => i.h > 24 && i.h <= 48);
  const evidence = items.map(i => `${i.wh}: ${i.h.toFixed(0)}h`);

  if (stale.length > 0) {
    return {
      key: "nm-stock",
      label: "Tồn kho NM",
      level: "block",
      result: `${stale.map(s => s.wh).join(", ")} cũ >48h`,
      detail: "Cần cập nhật tồn NM trong vòng 48h trước khi chạy DRP.",
      fixHref: "/inventory",
      fixLabel: "Mở Tồn kho NM",
      staleHours: Math.max(...stale.map(s => s.h)),
      staleNmName: stale.map(s => s.wh).join(", "),
      thresholdText: "≤ 48h: ✅ · 24–48h: ⚠️ · >48h: 🔴 chặn",
      evidence,
      ruleText: "DRP cần dữ liệu tồn NM trong 48h gần nhất để tính nguồn cung khả dụng. Quá 48h, kết quả phân bổ có thể sai lệch >15%.",
      blocksRun: true,
    };
  }
  if (warn.length > 0) {
    return {
      key: "nm-stock",
      label: "Tồn kho NM",
      level: "warn",
      result: `${warn.length} kho >24h`,
      detail: "DRP vẫn chạy được nhưng nên cập nhật trước khi release lô lớn.",
      fixHref: "/inventory",
      fixLabel: "Cập nhật NM",
      thresholdText: "≤ 48h: ✅ · 24–48h: ⚠️ · >48h: 🔴 chặn",
      evidence,
      ruleText: "Trong vùng 24–48h, DRP vẫn chạy được nhưng nên cập nhật trước khi release lô lớn.",
      blocksRun: false,
    };
  }
  return {
    key: "nm-stock",
    label: "Tồn kho NM",
    level: "ok",
    result: `${items.length}/${items.length} kho mới (<24h)`,
    thresholdText: "≤ 48h: ✅ · 24–48h: ⚠️ · >48h: 🔴 chặn",
    evidence,
    ruleText: "Tất cả kho NM đã cập nhật tồn trong 24h gần nhất.",
    blocksRun: false,
  };
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  G2 — Demand Version LOCKED                                              */
/* ──────────────────────────────────────────────────────────────────────── */
async function gateDemandVersion(tenantId: string | null): Promise<PreflightAuditRow> {
  if (!tenantId) {
    return baseRow("demand-version", "Phiên bản nhu cầu", "warn",
      "Chưa xác định tenant", "Đăng nhập để kiểm tra phiên bản nhu cầu.",
      "/demand", "Mở Demand", "Tối thiểu 1 phiên bản LOCKED",
      ["Tenant chưa map"], "DRP cần phiên bản nhu cầu đã khoá để có baseline.", false);
  }
  const { data, error } = await supabase
    .from("demand_versions")
    .select("id, name, status")
    .eq("tenant_id", tenantId);
  if (error) {
    return baseRow("demand-version", "Phiên bản nhu cầu", "warn",
      "Lỗi truy vấn", error.message, "/demand", "Mở Demand",
      "Tối thiểu 1 phiên bản LOCKED", [`Supabase error: ${error.message}`],
      "DRP cần phiên bản nhu cầu đã khoá để có baseline.", false);
  }
  const all = data ?? [];
  const locked = all.filter(v => v.status === "LOCKED");
  if (locked.length === 0) {
    return baseRow("demand-version", "Phiên bản nhu cầu", "block",
      "Chưa có phiên bản LOCKED",
      "Phải khoá ít nhất 1 phiên bản nhu cầu (AOP / S&OP) trước khi chạy DRP.",
      "/demand", "Mở Demand",
      "Tối thiểu 1 phiên bản LOCKED",
      [`Tổng số phiên bản: ${all.length}`, `LOCKED: 0`],
      "DRP đọc demand baseline từ phiên bản LOCKED. Không có LOCKED → không có nguồn nhu cầu thống nhất.",
      true);
  }
  return baseRow("demand-version", "Phiên bản nhu cầu", "ok",
    `${locked.length}/${all.length} phiên bản LOCKED`,
    undefined, undefined, undefined,
    "Tối thiểu 1 phiên bản LOCKED",
    locked.slice(0, 3).map(v => `${v.name} · LOCKED`),
    "Có phiên bản nhu cầu đã khoá để DRP đọc baseline.",
    false);
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  G3 — SS Coverage ≥ 80% CN×SKU combos                                    */
/* ──────────────────────────────────────────────────────────────────────── */
async function gateSsCoverage(tenantId: string | null, tenantCode: string): Promise<PreflightAuditRow> {
  if (!tenantId) {
    return baseRow("ss-coverage", "Phủ Safety Stock", "warn",
      "Chưa xác định tenant", undefined, "/monitoring", "Mở Monitoring",
      "≥80% combos CN×SKU có SS", ["Tenant chưa map"],
      "DRP dùng SS để tránh stockout — cần phủ đủ.", false);
  }
  const [ssRes, invRes] = await Promise.all([
    supabase.from("safety_stock").select("cn_code, sku_code", { count: "exact" }).eq("tenant_id", tenantId),
    supabase.from("inventory").select("cn_code, sku").eq("tenant", tenantCode),
  ]);
  const ssCount = ssRes.count ?? (ssRes.data?.length ?? 0);
  const invPairs = new Set((invRes.data ?? []).map(r => `${r.cn_code}|${r.sku}`));
  const target = invPairs.size;
  const pct = target > 0 ? Math.round((ssCount / target) * 100) : 0;
  const evidence = [
    `Combos CN×SKU thực tế (từ inventory): ${target}`,
    `Số dòng safety_stock: ${ssCount}`,
    `Tỉ lệ phủ: ${pct}%`,
  ];

  if (target === 0) {
    return baseRow("ss-coverage", "Phủ Safety Stock", "warn",
      "Chưa có inventory để so sánh", undefined, "/monitoring", "Mở Monitoring",
      "≥80% combos CN×SKU có SS", evidence,
      "Cần inventory để xác định combos cần phủ SS.", false);
  }
  if (pct < 80) {
    return baseRow("ss-coverage", "Phủ Safety Stock", "block",
      `Mới phủ ${pct}% — chưa đủ 80%`,
      "Bổ sung Safety Stock cho các combo CN×SKU còn thiếu, hoặc bấm 'Tính lại SS'.",
      "/monitoring", "Mở Safety Stock",
      "≥80% combos CN×SKU có SS", evidence,
      "Thiếu SS làm DRP đánh giá sai mức an toàn — sinh shortage / overstock giả.",
      true);
  }
  return baseRow("ss-coverage", "Phủ Safety Stock", "ok",
    `${pct}% combos CN×SKU có SS`,
    undefined, undefined, undefined,
    "≥80% combos CN×SKU có SS", evidence,
    "Đủ phủ SS để DRP tính reorder point chính xác.", false);
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  G4 — Lead Time covers NM→CN active pairs                                */
/* ──────────────────────────────────────────────────────────────────────── */
async function gateLeadTimeCoverage(tenantId: string | null, tenantCode: string): Promise<PreflightAuditRow> {
  if (!tenantId) {
    return baseRow("lt-coverage", "Lead time NM→CN", "warn",
      "Chưa xác định tenant", undefined, "/master-data", "Mở Master Data",
      "Đủ lead_time cho mọi NM→CN active",
      ["Tenant chưa map"], "DRP dùng lead time để tính ETA.", false);
  }
  const [nmRes, cnRes, ltRes] = await Promise.all([
    supabase.from("master_factories").select("code").eq("tenant", tenantCode).eq("is_active", true),
    supabase.from("master_branches").select("code").eq("tenant", tenantCode).eq("is_active", true),
    supabase.from("lead_times").select("source_code, dest_code").eq("tenant_id", tenantId),
  ]);
  let nms = (nmRes.data ?? []).map(r => r.code);
  let cns = (cnRes.data ?? []).map(r => r.code);
  const ltRows = ltRes.data ?? [];
  const ltPairs = new Set(ltRows.map(r => `${r.source_code}|${r.dest_code}`));

  // Fallback when master tables are empty: derive NM/CN universe from lead_times
  // distinct source/dest. This makes the gate verifiable from real data.
  if (nms.length === 0) nms = Array.from(new Set(ltRows.map(r => r.source_code)));
  if (cns.length === 0) cns = Array.from(new Set(ltRows.map(r => r.dest_code)));

  const required: string[] = [];
  for (const nm of nms) for (const cn of cns) required.push(`${nm}|${cn}`);
  const missing = required.filter(p => !ltPairs.has(p));
  const evidence = [
    `NM active: ${nms.length}`,
    `CN active: ${cns.length}`,
    `Cặp NM→CN cần phủ: ${required.length}`,
    `Cặp đã có lead_time: ${required.length - missing.length}`,
    missing.length > 0 ? `Còn thiếu: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "…" : ""}` : "Phủ đủ 100%",
  ];

  if (required.length === 0) {
    return baseRow("lt-coverage", "Lead time NM→CN", "warn",
      "Chưa có NM/CN active", undefined, "/master-data", "Mở Master Data",
      "Đủ lead_time cho mọi NM→CN active", evidence,
      "Thiếu master NM hoặc CN active → không xác định được pairs.", false);
  }
  if (missing.length > 0) {
    return baseRow("lt-coverage", "Lead time NM→CN", "block",
      `Thiếu ${missing.length}/${required.length} cặp lead_time`,
      "Bổ sung lead_times cho các cặp NM→CN còn thiếu.",
      "/master-data", "Mở Master Data",
      "Đủ lead_time cho mọi NM→CN active", evidence,
      "DRP dùng lead time để chốt ETA và xếp ưu tiên nguồn cung. Thiếu cặp → DRP fallback giá trị mặc định, sai lệch lịch giao.",
      true);
  }
  return baseRow("lt-coverage", "Lead time NM→CN", "ok",
    `Phủ đủ ${required.length} cặp NM→CN`,
    undefined, undefined, undefined,
    "Đủ lead_time cho mọi NM→CN active", evidence,
    "Mọi cặp NM→CN active đều có lead_time để DRP tính ETA.", false);
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  G5 — Master Data: inventory ≥ 90% active SKU                            */
/* ──────────────────────────────────────────────────────────────────────── */
async function gateMasterData(tenantCode: string): Promise<PreflightAuditRow> {
  const [itemsRes, invRes] = await Promise.all([
    supabase.from("master_items").select("code").eq("tenant", tenantCode).eq("is_active", true),
    supabase.from("inventory").select("sku").eq("tenant", tenantCode),
  ]);
  const items = (itemsRes.data ?? []).map(r => r.code);
  const invSkus = new Set((invRes.data ?? []).map(r => r.sku));
  // Match by sku_base prefix (split on space) to allow inventory rows like "GA-300 A4"
  const matched = items.filter(code => {
    if (invSkus.has(code)) return true;
    for (const s of invSkus) if (s.startsWith(code)) return true;
    return false;
  });
  const total = items.length;
  const pct = total > 0 ? Math.round((matched.length / total) * 100) : 0;
  const evidence = [
    `Active SKU (master_items): ${total}`,
    `SKU có dòng inventory: ${matched.length}`,
    `Tỉ lệ phủ: ${pct}%`,
  ];

  if (total === 0) {
    return baseRow("master-data", "Master Data SKU", "warn",
      "Chưa có active SKU", undefined, "/master-data", "Mở Master Data",
      "≥90% active SKU có inventory", evidence,
      "Thiếu master SKU → không có gì để phân bổ.", false);
  }
  if (pct < 90) {
    return baseRow("master-data", "Master Data SKU", "block",
      `Mới phủ ${pct}% — chưa đủ 90%`,
      "Bổ sung inventory cho các SKU còn thiếu hoặc tắt active các SKU không dùng nữa.",
      "/master-data", "Mở Master Data",
      "≥90% active SKU có inventory", evidence,
      "DRP cần inventory cho mọi SKU active. Thiếu phủ → SKU đó luôn rơi vào GAP.",
      true);
  }
  return baseRow("master-data", "Master Data SKU", "ok",
    `${pct}% active SKU có inventory`,
    undefined, undefined, undefined,
    "≥90% active SKU có inventory", evidence,
    "Master data đầy đủ, DRP có thể phân bổ cho toàn bộ active SKU.", false);
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Helper                                                                  */
/* ──────────────────────────────────────────────────────────────────────── */
function baseRow(
  key: string, label: string, level: PreflightLevel,
  result: string, detail: string | undefined,
  fixHref: string | undefined, fixLabel: string | undefined,
  thresholdText: string, evidence: string[], ruleText: string, blocksRun: boolean,
): PreflightAuditRow {
  return { key, label, level, result, detail, fixHref, fixLabel, thresholdText, evidence, ruleText, blocksRun };
}

async function resolveTenantId(tenantCode: string): Promise<string | null> {
  const { data } = await supabase.from("tenants").select("id").eq("tenant_code", tenantCode).maybeSingle();
  return data?.id ?? null;
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Main evaluator (async)                                                  */
/* ──────────────────────────────────────────────────────────────────────── */
export async function computePreflightAudit(ctx: PreflightContext): Promise<PreflightAuditRow[]> {
  const { tenant, planCycle, sopLockedFromWorkspace, nmCommitPct = 60 } = ctx;
  const tenantCode = TENANT_CODE[tenant] ?? "UNIS";
  const tenantId = await resolveTenantId(tenantCode);

  const [g1, g2, g3, g4, g5] = await Promise.all([
    gateNmFreshness(tenantCode),
    gateDemandVersion(tenantId),
    gateSsCoverage(tenantId, tenantCode),
    gateLeadTimeCoverage(tenantId, tenantCode),
    gateMasterData(tenantCode),
  ]);

  // Rows synchronous (legacy mock) — giữ nguyên để khớp UI hiện tại
  const sopLocked = sopLockedFromWorkspace || planCycle.stepsCompleted.includes("sop");
  const sopRow: PreflightAuditRow = sopLocked ? {
    key: "sop", label: "S&OP đã khoá", level: "ok",
    result: `v${planCycle.version} · ${planCycle.label} · Locked`,
    thresholdText: "Cycle status = LOCKED",
    evidence: [
      `Kỳ hiện tại: ${planCycle.label}`,
      `Trạng thái: ${planCycle.status}`,
      `Bước hoàn tất: ${planCycle.stepsCompleted.length}/6`,
      planCycle.lockedAt ? `Khoá ${planCycle.lockedAt} bởi ${planCycle.lockedBy ?? "—"}` : "Đã đánh dấu hoàn tất bước S&OP",
    ],
    ruleText: "DRP cần demand baseline đã khoá. Khi S&OP chưa lock, các CN có thể còn chỉnh số.",
    blocksRun: false,
  } : {
    key: "sop", label: "S&OP đã khoá", level: "block",
    result: "S&OP CHƯA KHOÁ",
    detail: "Phải khoá S&OP trước khi chạy DRP để có demand baseline.",
    fixHref: "/sop", fixLabel: "Mở S&OP",
    thresholdText: "Cycle status = LOCKED",
    evidence: [
      `Kỳ hiện tại: ${planCycle.label}`,
      `Trạng thái: ${planCycle.status}`,
      `Bước hoàn tất: ${planCycle.stepsCompleted.length}/6 · chưa có "sop"`,
    ],
    ruleText: "Không thể chạy DRP khi demand baseline chưa được chốt.",
    blocksRun: true,
  };

  const cnStock: PreflightAuditRow = baseRow("cn-stock", "Tồn kho CN", "ok",
    "12/12 CN sync 06:00", undefined, undefined, undefined,
    "Sync ETL trước 07:00 hằng ngày", ["Job ETL CN chạy 06:00 sáng nay · 12/12 CN nhận đủ"],
    "Tồn kho 12 CN được sync hằng ngày từ ERP. DRP đọc snapshot 06:00.", false);

  const cnAdj: PreflightAuditRow = baseRow("cn-adj", "CN điều chỉnh", "ok",
    "4/12 CN adjust · Đã duyệt", undefined, undefined, undefined,
    "Adjust >30% cần SC Manager duyệt", ["4 CN gửi điều chỉnh trong tuần · 0 còn chờ duyệt"],
    "Mọi điều chỉnh nhu cầu CN >30% phải có chữ ký SC Manager.", false);

  const nmCommitRow: PreflightAuditRow = nmCommitPct < 50 ? baseRow(
    "nm-commit", "NM cam kết", "block", `${nmCommitPct}% — quá thấp`,
    "Cần ≥50% NM cam kết để DRP có nguồn cung tin cậy.", "/hub", "Mở Hub & Cam kết",
    "≥80%: ✅ · 50–79%: ⚠️ · <50%: 🔴 chặn", [`Tỉ lệ SKU đã có cam kết NM: ${nmCommitPct}%`],
    "Dưới 50% cam kết → DRP sinh nhiều shortage giả.", true,
  ) : nmCommitPct < 80 ? baseRow(
    "nm-commit", "NM cam kết", "warn", `${nmCommitPct}% — chưa đủ 80%`,
    "DRP vẫn chạy nhưng kết quả có thể thiếu chính xác.", "/hub", "Mở Hub & Cam kết",
    "≥80%: ✅ · 50–79%: ⚠️ · <50%: 🔴 chặn", [`Tỉ lệ SKU đã có cam kết NM: ${nmCommitPct}%`],
    "Dưới 80% → SKU chưa cam kết dùng FC làm proxy → sai số ±10%.", false,
  ) : baseRow(
    "nm-commit", "NM cam kết", "ok", `${nmCommitPct}% ✅`, undefined, undefined, undefined,
    "≥80%: ✅ · 50–79%: ⚠️ · <50%: 🔴 chặn", [`Tỉ lệ SKU đã có cam kết NM: ${nmCommitPct}%`],
    "Đủ cam kết để DRP phân bổ tin cậy.", false,
  );

  const pricelist: PreflightAuditRow = baseRow("pricelist", "Bảng giá NM", "ok",
    "5/5 NM hiệu lực", undefined, undefined, undefined,
    "Mọi NM phải có price list active trong kỳ", ["5/5 NM có bảng giá hiệu lực trong kỳ hiện tại"],
    "DRP cần bảng giá để tính landed cost. Thiếu giá → DRP fallback giá kỳ trước.", false);

  // Suppress legacy NMSummary read — keep import side-effect minimal
  void getNMSummaries;

  return [g1, cnStock, cnAdj, sopRow, nmCommitRow, pricelist, g2, g3, g4, g5];
}

export interface PreflightSummary {
  ok: number;
  warn: number;
  block: number;
  total: number;
  canRun: boolean;
  blockReasons: string[];
}

export function summarizePreflight(rows: PreflightAuditRow[]): PreflightSummary {
  const ok = rows.filter((r) => r.level === "ok").length;
  const warn = rows.filter((r) => r.level === "warn").length;
  const blockRows = rows.filter((r) => r.level === "block");
  return {
    ok, warn, block: blockRows.length, total: rows.length,
    canRun: blockRows.length === 0,
    blockReasons: blockRows.map((r) => `${r.label}: ${r.result}`),
  };
}

export function levelLabelVi(l: PreflightLevel): string {
  if (l === "ok") return "Sẵn sàng";
  if (l === "warn") return "Cảnh báo";
  return "Chặn — cần xử lý";
}

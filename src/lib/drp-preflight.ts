/**
 * Shared DRP preflight evaluator.
 *
 * Cùng dataset thực tế (NM stale, S&OP lock cycle, NM commit %, bảng giá…)
 * mà /drp Bước 1 đang dùng. Tách riêng để trang /drp/preflight-audit có thể
 * tái sử dụng và bổ sung explanation chi tiết cho từng điều kiện.
 *
 * Mọi text tiếng Việt.
 */
import type { TenantName } from "@/components/TenantContext";
import { getNMSummaries, type NMSummary } from "@/components/supply/supplyData";
import type { PreflightItem, PreflightLevel } from "@/components/drp/DrpPreflight";
import type { PlanningCycle } from "@/data/unis-enterprise-dataset";

/** Map updatedAgo → giờ stale ước lượng (đồng bộ với DrpPage). */
export function staleHoursOf(ago: NMSummary["updatedAgo"]): number {
  return ago === "today" ? 12 : ago === "yesterday" ? 26 : 72;
}

export interface PreflightContext {
  tenant: TenantName;
  planCycle: PlanningCycle;
  sopLockedFromWorkspace: boolean;
  /** % SKU NM đã cam kết (mock 60% để khớp UI hiện tại). */
  nmCommitPct?: number;
}

export interface PreflightAuditRow extends PreflightItem {
  /** Threshold dạng text để giải thích vì sao pass / block */
  thresholdText: string;
  /** Bằng chứng đầu vào — ví dụ "Phú Mỹ: 72h, Toko: 26h" */
  evidence: string[];
  /** Quy tắc business gắn với mục này */
  ruleText: string;
  /** Tác động khi block: cản chạy DRP / không */
  blocksRun: boolean;
}

export function computePreflightAudit(ctx: PreflightContext): PreflightAuditRow[] {
  const { tenant, planCycle, sopLockedFromWorkspace, nmCommitPct = 60 } = ctx;
  const nms = getNMSummaries(tenant);

  const stale = nms.filter((n) => staleHoursOf(n.updatedAgo) > 48);
  const warn = nms.filter((n) => {
    const h = staleHoursOf(n.updatedAgo);
    return h > 24 && h <= 48;
  });

  const sopLocked = sopLockedFromWorkspace || planCycle.stepsCompleted.includes("sop");

  const rows: PreflightAuditRow[] = [];

  // 1) NM stock freshness
  {
    const evidence = nms.map(
      (n) => `${n.nm}: ${staleHoursOf(n.updatedAgo)}h (${n.updatedAt})`,
    );
    if (stale.length > 0) {
      rows.push({
        key: "nm-stock",
        label: "Tồn kho NM",
        level: "block",
        result: `${stale.map((n) => n.nm).join(", ")} cũ >48h`,
        detail: "Cần cập nhật tồn NM trong vòng 48h trước khi chạy DRP.",
        fixHref: "/inventory",
        fixLabel: "Mở Tồn kho NM",
        staleHours: Math.max(...stale.map((n) => staleHoursOf(n.updatedAgo))),
        staleNmName: stale.map((n) => n.nm).join(", "),
        thresholdText: "≤ 48h: ✅ · 24–48h: ⚠️ · >48h: 🔴 chặn",
        evidence,
        ruleText:
          "DRP cần dữ liệu tồn NM trong 48h gần nhất để tính nguồn cung khả dụng. Quá 48h, kết quả phân bổ có thể sai lệch >15%.",
        blocksRun: true,
      });
    } else if (warn.length > 0) {
      rows.push({
        key: "nm-stock",
        label: "Tồn kho NM",
        level: "warn",
        result: `${warn.length} NM >24h`,
        detail: "DRP vẫn chạy được nhưng kết quả có thể thiếu chính xác.",
        fixHref: "/inventory",
        fixLabel: "Cập nhật NM",
        thresholdText: "≤ 48h: ✅ · 24–48h: ⚠️ · >48h: 🔴 chặn",
        evidence,
        ruleText:
          "Trong vùng 24–48h, DRP vẫn chạy được nhưng nên cập nhật trước khi release lô lớn.",
        blocksRun: false,
      });
    } else {
      rows.push({
        key: "nm-stock",
        label: "Tồn kho NM",
        level: "ok",
        result: `${nms.length}/${nms.length} NM mới (<24h)`,
        thresholdText: "≤ 48h: ✅ · 24–48h: ⚠️ · >48h: 🔴 chặn",
        evidence,
        ruleText: "Tất cả NM đã cập nhật tồn trong 24h gần nhất.",
        blocksRun: false,
      });
    }
  }

  // 2) CN stock sync (mock OK)
  rows.push({
    key: "cn-stock",
    label: "Tồn kho CN",
    level: "ok",
    result: "12/12 CN sync 06:00",
    thresholdText: "Sync ETL trước 07:00 hằng ngày",
    evidence: ["Job ETL CN chạy 06:00 sáng nay · 12/12 CN nhận đủ"],
    ruleText:
      "Tồn kho 12 CN được sync hằng ngày từ ERP. DRP đọc snapshot 06:00.",
    blocksRun: false,
  });

  // 3) CN adjust approval (mock OK)
  rows.push({
    key: "cn-adj",
    label: "CN điều chỉnh",
    level: "ok",
    result: "4/12 CN adjust · Đã duyệt",
    thresholdText: "Adjust >30% cần SC Manager duyệt",
    evidence: ["4 CN gửi điều chỉnh trong tuần · 0 còn chờ duyệt"],
    ruleText:
      "Mọi điều chỉnh nhu cầu CN >30% phải có chữ ký SC Manager trước khi đưa vào DRP.",
    blocksRun: false,
  });

  // 4) S&OP lock
  if (sopLocked) {
    rows.push({
      key: "sop",
      label: "S&OP đã khoá",
      level: "ok",
      result: `v${planCycle.version} · ${planCycle.label} · Locked`,
      thresholdText: "Cycle status = LOCKED",
      evidence: [
        `Kỳ hiện tại: ${planCycle.label}`,
        `Trạng thái: ${planCycle.status}`,
        `Bước hoàn tất: ${planCycle.stepsCompleted.length}/6`,
        planCycle.lockedAt
          ? `Khoá ${planCycle.lockedAt} bởi ${planCycle.lockedBy ?? "—"}`
          : "Đã đánh dấu hoàn tất bước S&OP",
      ],
      ruleText:
        "DRP cần demand baseline đã khoá để có nguồn nhu cầu thống nhất. Khi S&OP chưa lock, các CN có thể còn chỉnh số.",
      blocksRun: false,
    });
  } else {
    rows.push({
      key: "sop",
      label: "S&OP đã khoá",
      level: "block",
      result: "S&OP CHƯA KHOÁ",
      detail: "Phải khoá S&OP trước khi chạy DRP để có demand baseline.",
      fixHref: "/sop",
      fixLabel: "Mở S&OP",
      thresholdText: "Cycle status = LOCKED",
      evidence: [
        `Kỳ hiện tại: ${planCycle.label}`,
        `Trạng thái: ${planCycle.status}`,
        `Bước hoàn tất: ${planCycle.stepsCompleted.length}/6 · chưa có "sop"`,
      ],
      ruleText:
        "Không thể chạy DRP khi demand baseline chưa được chốt. Mở /sop, xử lý các chênh lệch >10% rồi nhấn 'Khoá S&OP'.",
      blocksRun: true,
    });
  }

  // 5) NM commit %
  if (nmCommitPct < 50) {
    rows.push({
      key: "nm-commit",
      label: "NM cam kết",
      level: "block",
      result: `${nmCommitPct}% — quá thấp`,
      detail: "Cần ≥50% NM cam kết để DRP có nguồn cung tin cậy.",
      fixHref: "/hub",
      fixLabel: "Mở Hub & Cam kết",
      thresholdText: "≥80%: ✅ · 50–79%: ⚠️ · <50%: 🔴 chặn",
      evidence: [`Tỉ lệ SKU đã có cam kết NM hiện tại: ${nmCommitPct}%`],
      ruleText:
        "Dưới 50% cam kết, nguồn cung quá yếu để phân bổ. DRP sẽ tạo nhiều shortage giả.",
      blocksRun: true,
    });
  } else if (nmCommitPct < 80) {
    rows.push({
      key: "nm-commit",
      label: "NM cam kết",
      level: "warn",
      result: `${nmCommitPct}% — chưa đủ 80%`,
      detail:
        "DRP vẫn chạy nhưng kết quả có thể thiếu chính xác cho NM chưa cam kết.",
      fixHref: "/hub",
      fixLabel: "Mở Hub & Cam kết",
      thresholdText: "≥80%: ✅ · 50–79%: ⚠️ · <50%: 🔴 chặn",
      evidence: [`Tỉ lệ SKU đã có cam kết NM hiện tại: ${nmCommitPct}%`],
      ruleText:
        "Dưới 80% cam kết, các SKU chưa cam kết sẽ dùng FC làm proxy → sai số ±10%.",
      blocksRun: false,
    });
  } else {
    rows.push({
      key: "nm-commit",
      label: "NM cam kết",
      level: "ok",
      result: `${nmCommitPct}% ✅`,
      thresholdText: "≥80%: ✅ · 50–79%: ⚠️ · <50%: 🔴 chặn",
      evidence: [`Tỉ lệ SKU đã có cam kết NM hiện tại: ${nmCommitPct}%`],
      ruleText: "Đủ cam kết để DRP phân bổ tin cậy.",
      blocksRun: false,
    });
  }

  // 6) Pricelist (mock OK)
  rows.push({
    key: "pricelist",
    label: "Bảng giá NM",
    level: "ok",
    result: "5/5 NM hiệu lực",
    thresholdText: "Mọi NM phải có price list active trong kỳ",
    evidence: ["5/5 NM có bảng giá hiệu lực trong kỳ hiện tại"],
    ruleText:
      "DRP cần bảng giá để tính landed cost khi so sánh nguồn cung. Thiếu giá → DRP fallback giá kỳ trước.",
    blocksRun: false,
  });

  return rows;
}

export interface PreflightSummary {
  ok: number;
  warn: number;
  block: number;
  total: number;
  canRun: boolean;
  /** Lý do block tổng hợp ngắn gọn — dùng cho banner */
  blockReasons: string[];
}

export function summarizePreflight(rows: PreflightAuditRow[]): PreflightSummary {
  const ok = rows.filter((r) => r.level === "ok").length;
  const warn = rows.filter((r) => r.level === "warn").length;
  const blockRows = rows.filter((r) => r.level === "block");
  return {
    ok,
    warn,
    block: blockRows.length,
    total: rows.length,
    canRun: blockRows.length === 0,
    blockReasons: blockRows.map((r) => `${r.label}: ${r.result}`),
  };
}

export function levelLabelVi(l: PreflightLevel): string {
  if (l === "ok") return "Sẵn sàng";
  if (l === "warn") return "Cảnh báo";
  return "Chặn — cần xử lý";
}

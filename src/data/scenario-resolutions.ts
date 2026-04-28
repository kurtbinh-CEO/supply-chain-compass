/**
 * Scenario resolutions store — lưu kịch bản đã chọn cho từng NM × period
 * và compute downstream impact (PO bù, task đàm phán, tier risk).
 *
 * Persist localStorage để demo state survive reload.
 * Module-level subscribe pattern (không dùng React context) để page khác
 * (Workspace, Orders) có thể đọc mà không cần wrap provider mới.
 */

import type { NmId } from "@/data/unis-enterprise-dataset";

export type ScenarioKey = "A" | "B" | "C" | "D" | "E";

export interface ChosenScenario {
  nmId: NmId;
  nmName: string;
  scenarioKey: ScenarioKey;
  scenarioTitle: string;
  gapM2: number;
  gapPctBefore: number;
  gapPctAfter: number;
  cost: number;
  chosenAt: number;            // epoch ms
  chosenBy: string;            // mock planner name
  resolveDeadline: number;     // epoch ms (today + 5 days)
  // Generated downstream artifacts:
  poTopupId?: string;          // PO bổ sung draft id
  poTopupQty?: number;
  negotiateTaskId?: string;    // Task đàm phán id
  negotiateQty?: number;
  // Tier impact (for B):
  tierImpact?: {
    from: "tier1" | "tier2" | "tier3";
    to: "tier1" | "tier2" | "tier3";
    upliftAmount: number;
  };
  // Negotiation outcome (C/D):
  negotiationStatus?: "pending" | "accepted" | "rejected" | "fallback_b";
}

const STORAGE_KEY = "smartlog.scenario_resolutions.v1";

let store: Record<NmId, ChosenScenario> = loadFromStorage();
const listeners = new Set<() => void>();

function loadFromStorage(): Record<NmId, ChosenScenario> {
  if (typeof window === "undefined") return {} as Record<NmId, ChosenScenario>;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {} as Record<NmId, ChosenScenario>;
    return JSON.parse(raw);
  } catch {
    return {} as Record<NmId, ChosenScenario>;
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* swallow quota */
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export function getResolution(nmId: NmId): ChosenScenario | undefined {
  return store[nmId];
}

export function getAllResolutions(): ChosenScenario[] {
  return Object.values(store);
}

export function setResolution(res: ChosenScenario) {
  store = { ...store, [res.nmId]: res };
  persist();
  notify();
}

export function clearResolution(nmId: NmId) {
  const next = { ...store };
  delete next[nmId];
  store = next;
  persist();
  notify();
}

export function updateNegotiationStatus(
  nmId: NmId,
  status: NonNullable<ChosenScenario["negotiationStatus"]>,
) {
  const cur = store[nmId];
  if (!cur) return;
  setResolution({ ...cur, negotiationStatus: status });
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React hook tiện cho component */
import { useSyncExternalStore } from "react";
export function useResolutions(): Record<NmId, ChosenScenario> {
  return useSyncExternalStore(
    (cb) => subscribe(cb),
    () => store,
    () => store,
  );
}

/* ──────────────────────────────────────────────────────────────────────── */
/* Downstream impact computation                                            */
/* ──────────────────────────────────────────────────────────────────────── */

export interface DownstreamAction {
  kind: "po_topup" | "negotiate" | "tier_uplift" | "dashboard";
  icon: string;            // emoji
  title: string;
  description: string;
  link?: { label: string; href: string };
  badge?: string;
}

export interface ScenarioImpact {
  actions: DownstreamAction[];
  gapAfterM2: number;
  gapAfterPct: number;
  tierAfter: "tier1" | "tier2" | "tier3" | "pending";
  hybridSplit?: { topupQty: number; negotiateQty: number };
}

interface ImpactInput {
  scenarioKey: ScenarioKey;
  nmName: string;
  skuBase: string;
  gapM2: number;
  committedM2: number;
  totalRequestedM2: number;
  upliftIfDrop: number;
  currentTier: "tier1" | "tier2" | "tier3";
  hybridSplitPct: number;   // 0..1, % phần mua bù trong kịch bản D
}

export function computeImpact(input: ImpactInput): ScenarioImpact {
  const {
    scenarioKey, nmName, skuBase, gapM2, committedM2,
    totalRequestedM2, upliftIfDrop, currentTier, hybridSplitPct,
  } = input;

  const fmtM2 = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} m²`;
  const fmtVnd = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M₫` : `${n.toLocaleString("vi-VN")}₫`;

  const actions: DownstreamAction[] = [];
  let gapAfterM2 = gapM2;
  let tierAfter: ScenarioImpact["tierAfter"] = currentTier;
  let hybridSplit: ScenarioImpact["hybridSplit"] | undefined;

  if (scenarioKey === "A") {
    actions.push({
      kind: "po_topup", icon: "📦",
      title: `Tạo PO bổ sung ${fmtM2(gapM2)}`,
      description: `${nmName} ${skuBase} — xuất hiện trong Đơn hàng trạng thái NHÁP. DRP tuần tới sẽ include.`,
      link: { label: "Đơn hàng", href: "/orders" },
      badge: "NHÁP",
    });
    gapAfterM2 = 0;
    tierAfter = "tier1";
  } else if (scenarioKey === "B") {
    actions.push({
      kind: "tier_uplift", icon: "💰",
      title: `Cập nhật tier giá → Tier 2`,
      description: `Áp giá Tier 2 cho TOÀN BỘ ${fmtM2(committedM2)} đã mua. Uplift retroactive: ${fmtVnd(upliftIfDrop)}.`,
      badge: "RETROACTIVE",
    });
    actions.push({
      kind: "dashboard", icon: "📊",
      title: "Cập nhật báo cáo Lãnh đạo",
      description: `Card "Uplift" tăng ${fmtVnd(upliftIfDrop)}. Monitoring NM cảnh báo chi phí.`,
      link: { label: "Báo cáo Lãnh đạo", href: "/executive" },
    });
    tierAfter = "tier2";
  } else if (scenarioKey === "C") {
    actions.push({
      kind: "negotiate", icon: "📞",
      title: `Tạo task đàm phán ${fmtM2(gapM2)}`,
      description: `Đàm phán ${nmName} chuyển ${fmtM2(gapM2)} sang T6. Deadline 5 ngày. Nếu fail → fallback Kịch bản B.`,
      link: { label: "Việc cần làm", href: "/workspace" },
      badge: "5 NGÀY",
    });
    tierAfter = "pending";
  } else if (scenarioKey === "D") {
    const topupQty = Math.round(gapM2 * hybridSplitPct);
    const negotiateQty = gapM2 - topupQty;
    hybridSplit = { topupQty, negotiateQty };
    actions.push({
      kind: "po_topup", icon: "📦",
      title: `Tạo PO bổ sung ${fmtM2(topupQty)} (${Math.round(hybridSplitPct * 100)}%)`,
      description: `${nmName} ${skuBase} — xuất hiện trong Đơn hàng trạng thái NHÁP.`,
      link: { label: "Đơn hàng", href: "/orders" },
      badge: "NHÁP",
    });
    actions.push({
      kind: "negotiate", icon: "📞",
      title: `Tạo task đàm phán ${fmtM2(negotiateQty)} (${Math.round((1 - hybridSplitPct) * 100)}%)`,
      description: `Đàm phán chuyển ${fmtM2(negotiateQty)} sang T6. Deadline 5 ngày. Fail → fallback B.`,
      link: { label: "Việc cần làm", href: "/workspace" },
      badge: "5 NGÀY",
    });
    gapAfterM2 = negotiateQty;       // 50% giảm ngay; 50% chờ
    tierAfter = "pending";
  } else {
    // E: tùy chỉnh — compute không xác định, để UI show CEO approval
    actions.push({
      kind: "po_topup", icon: "📦",
      title: "Tạo theo input của bạn (chờ CEO duyệt)",
      description: "Sản lượng + chi phí do người dùng nhập, vượt ngưỡng cần CEO ký duyệt.",
      link: { label: "Việc cần làm", href: "/workspace" },
      badge: "CEO",
    });
  }

  // Dashboard update là hệ quả chung (trừ B đã có riêng)
  if (scenarioKey !== "B" && scenarioKey !== "E") {
    actions.push({
      kind: "dashboard", icon: "📊",
      title: "Cập nhật bảng theo dõi",
      description: `Card "Khoảng cách" giảm: ${fmtM2(gapM2)} → ${fmtM2(gapAfterM2)}. Monitoring ${nmName} cập nhật.`,
    });
  }

  const gapAfterPct = totalRequestedM2 > 0
    ? Math.round((gapAfterM2 / totalRequestedM2) * 1000) / 10
    : 0;

  return { actions, gapAfterM2, gapAfterPct, tierAfter, hybridSplit };
}

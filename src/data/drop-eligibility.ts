/* ════════════════════════════════════════════════════════════════════════════
   §  DROP CONSOLIDATION ELIGIBILITY MATRIX (TRANSPORT-LOGIC §②)
   §  CN nào ghép được với CN nào, theo NM nguồn
   ════════════════════════════════════════════════════════════════════════════ */

export interface CnPair {
  cn1: string;
  cn2: string;
  detourKm: number;
  eligible: boolean;
  reason?: string;       // lý do không ghép
  estSavingVnd?: number; // tiết kiệm khi ghép
  direction?: string;    // "cùng hướng Đông", "ngược hướng Bắc"...
}

export interface NmDropEligibility {
  nmId: string;
  nmName: string;
  pairs: CnPair[];
}

export const DROP_ELIGIBILITY: NmDropEligibility[] = [
  {
    nmId: "NM-DTM", nmName: "NM Đồng Tâm (Biên Hòa, Nam)",
    pairs: [
      { cn1: "CN-BD", cn2: "CN-DN", detourKm: 30, eligible: true,
        estSavingVnd: 4_200_000, direction: "Cùng hướng Đông" },
      { cn1: "CN-BD", cn2: "CN-HCM", detourKm: 15, eligible: true,
        estSavingVnd: 3_800_000, direction: "Cùng hướng Tây" },
      { cn1: "CN-DN", cn2: "CN-HCM", detourKm: 22, eligible: true,
        estSavingVnd: 3_500_000, direction: "Cùng hướng Tây" },
      { cn1: "CN-BD", cn2: "CN-VT", detourKm: 38, eligible: true,
        estSavingVnd: 2_900_000, direction: "Cùng hướng Đông Nam" },
      { cn1: "CN-BD", cn2: "CN-CT", detourKm: 180, eligible: false,
        reason: "Detour 180km > 50km tối đa liên vùng" },
      { cn1: "CN-BD", cn2: "CN-AG", detourKm: 220, eligible: false,
        reason: "Detour 220km > 50km tối đa" },
      { cn1: "CN-BD", cn2: "CN-HN", detourKm: 1600, eligible: false,
        reason: "Ngược hướng Bắc — phải đi tuyến riêng" },
    ],
  },
  {
    nmId: "NM-MKD", nmName: "NM Mikado (Bắc Ninh, Bắc)",
    pairs: [
      { cn1: "CN-HN", cn2: "CN-HP", detourKm: 40, eligible: true,
        estSavingVnd: 3_600_000, direction: "Cùng hướng Đông Bắc" },
      { cn1: "CN-HN", cn2: "CN-VP", detourKm: 25, eligible: true,
        estSavingVnd: 3_100_000, direction: "Cùng hướng Tây Bắc" },
      { cn1: "CN-HP", cn2: "CN-QN", detourKm: 35, eligible: true,
        estSavingVnd: 2_800_000, direction: "Cùng hướng Đông" },
      { cn1: "CN-HN", cn2: "CN-NA", detourKm: 250, eligible: false,
        reason: "Detour 250km — Nghệ An quá xa Hà Nội" },
      { cn1: "CN-HN", cn2: "CN-BD", detourKm: 1700, eligible: false,
        reason: "Ngược hướng Nam" },
    ],
  },
  {
    nmId: "NM-VGR", nmName: "NM Viglacera (Bắc, Trung)",
    pairs: [
      { cn1: "CN-NA", cn2: "CN-TH", detourKm: 95, eligible: false,
        reason: "Detour 95km > 50km tối đa liên vùng" },
      { cn1: "CN-NA", cn2: "CN-PK", detourKm: 45, eligible: true,
        estSavingVnd: 2_200_000, direction: "Cùng hướng Nam" },
      { cn1: "CN-HN", cn2: "CN-TH", detourKm: 32, eligible: true,
        estSavingVnd: 2_900_000, direction: "Cùng hướng Nam" },
    ],
  },
  {
    nmId: "NM-TKO", nmName: "NM Toko (Long An, Nam)",
    pairs: [
      { cn1: "CN-HCM", cn2: "CN-BD", detourKm: 25, eligible: true,
        estSavingVnd: 3_400_000, direction: "Cùng hướng Bắc" },
      { cn1: "CN-HCM", cn2: "CN-CT", detourKm: 40, eligible: true,
        estSavingVnd: 2_700_000, direction: "Cùng hướng Tây" },
      { cn1: "CN-CT", cn2: "CN-AG", detourKm: 28, eligible: true,
        estSavingVnd: 2_400_000, direction: "Cùng hướng Tây" },
    ],
  },
  {
    nmId: "NM-DT", nmName: "NM Đồng Tâm (legacy)",
    pairs: [
      { cn1: "CN-BD", cn2: "CN-DN", detourKm: 30, eligible: true,
        estSavingVnd: 4_200_000, direction: "Cùng hướng Đông" },
      { cn1: "CN-HCM", cn2: "CN-BD", detourKm: 15, eligible: true,
        estSavingVnd: 3_800_000, direction: "Cùng hướng Bắc" },
      { cn1: "CN-VT", cn2: "CN-BT", detourKm: 65, eligible: false,
        reason: "Detour 65km > 50km tối đa" },
    ],
  },
];

/* ── Helpers ── */
export function getEligibilityForNm(nmId: string): NmDropEligibility | null {
  return DROP_ELIGIBILITY.find((e) => e.nmId === nmId) ?? null;
}

/** Kiểm tra cặp CN có ghép được không (đã 2-chiều) */
export function checkPairEligible(
  nmId: string,
  cnA: string,
  cnB: string,
): CnPair | null {
  const elig = getEligibilityForNm(nmId);
  if (!elig) return null;
  return (
    elig.pairs.find(
      (p) => (p.cn1 === cnA && p.cn2 === cnB) || (p.cn1 === cnB && p.cn2 === cnA),
    ) ?? null
  );
}

/** Lấy danh sách CN có thể ghép thêm vào chuyến đang có baseCn */
export function getCandidateDropCns(
  nmId: string,
  baseCn: string,
  excludeCns: string[] = [],
): CnPair[] {
  const elig = getEligibilityForNm(nmId);
  if (!elig) return [];
  return elig.pairs
    .filter((p) => p.cn1 === baseCn || p.cn2 === baseCn)
    .map((p) => ({
      ...p,
      // Normalize: cn2 luôn là CN khác (không phải baseCn)
      cn1: baseCn,
      cn2: p.cn1 === baseCn ? p.cn2 : p.cn1,
    }))
    .filter((p) => !excludeCns.includes(p.cn2));
}

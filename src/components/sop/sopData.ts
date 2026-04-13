// S&OP mock data — tenant-aware

export interface SopSku {
  sku: string;
  cnBd: number;
  cnDn: number;
  cnHn: number;
  cnCt: number;
  total: number;
}

export interface AopTarget {
  cnBd: number;
  cnDn: number;
  cnHn: number;
  cnCt: number;
  total: number;
}

export interface PhasingRow {
  sku: string;
  node: string;
  monthlyBase: number;
  w16: number;
  w17: number;
  w18: number;
  w19: number;
}

export interface VersionCard {
  label: string;
  version: string;
  name: string;
  value: number;
  subtitle: string;
  active?: boolean;
}

export interface VariantRow {
  name: string;
  skuCode: string;
  statistical: number;
  sales: number;
  consensus: number;
  delta: number;
}

export interface DecisionLog {
  initials: string;
  who: string;
  when: string;
  version: string;
  reason: string;
}

export interface FvaNode {
  code: string;
  name: string;
  mape: number;
  delta: number;
}

const unisSopSkus: SopSku[] = [
  { sku: "GA-300 A4", cnBd: 450, cnDn: 320, cnHn: 680, cnCt: 210, total: 1660 },
  { sku: "GA-300 B2", cnBd: 120, cnDn: 80, cnHn: 150, cnCt: 90, total: 440 },
  { sku: "GA-300 C1", cnBd: 280, cnDn: 410, cnHn: 290, cnCt: 150, total: 1130 },
  { sku: "GA-400 A4", cnBd: 600, cnDn: 420, cnHn: 580, cnCt: 330, total: 1930 },
  { sku: "GA-400 D5", cnBd: 150, cnDn: 90, cnHn: 110, cnCt: 60, total: 410 },
  { sku: "GA-600 A4", cnBd: 350, cnDn: 210, cnHn: 440, cnCt: 280, total: 1280 },
  { sku: "GA-600 B2", cnBd: 200, cnDn: 140, cnHn: 310, cnCt: 150, total: 800 },
];

const unisAop: AopTarget = { cnBd: 1400, cnDn: 1100, cnHn: 1500, cnCt: 1000, total: 5000 };

const unisPhasingRows: PhasingRow[] = [
  { sku: "ELITE-M400-BLK", node: "DRP-NODE-VN-001", monthlyBase: 2400, w16: 672, w17: 600, w18: 576, w19: 552 },
  { sku: "PRO-X15-WHT", node: "DRP-NODE-VN-001", monthlyBase: 1800, w16: 504, w17: 450, w18: 432, w19: 414 },
  { sku: "STUDIO-Z8-GRY", node: "DRP-NODE-VN-002", monthlyBase: 3450, w16: 966, w17: 863, w18: 828, w19: 793 },
  { sku: "CORE-A2-SILV", node: "DRP-NODE-VN-003", monthlyBase: 0, w16: 0, w17: 0, w18: 0, w19: 0 },
];

const unisVersions: VersionCard[] = [
  { label: "BASELINE V0", version: "V0", name: "Statistical", value: 6200, subtitle: "Auto-generated forecast", active: false },
  { label: "MARKET V1", version: "V1", name: "Sales", value: 8100, subtitle: "+30.6% vs Statistical", active: false },
  { label: "CONSTRAINT V2", version: "V2", name: "CN Inputs", value: 7200, subtitle: "Supply Cap applied", active: false },
  { label: "ACTIVE V3", version: "V3", name: "Consensus", value: 7650, subtitle: "Finalized Planning Target", active: true },
];

const unisVariants: VariantRow[] = [
  { name: "Premium Bottled Water", skuCode: "SKU-9902-WH", statistical: 1200, sales: 1850, consensus: 1600, delta: 15.6 },
  { name: "Sparkling Soda 500ml", skuCode: "SKU-1022-CN", statistical: 2400, sales: 2500, consensus: 2450, delta: 2.1 },
  { name: "Natural Fruit Juice", skuCode: "SKU-4481-MT", statistical: 2600, sales: 3750, consensus: 3600, delta: -12.2 },
];

const unisDecisionLog: DecisionLog[] = [
  { initials: "TH", who: "Trần Hùng (Regional)", when: "2023-11-24 14:20", version: "v3.4.1", reason: "Baseline correction for CNY promotion" },
  { initials: "LM", who: "Lê Minh (Supply)", when: "2023-11-23 09:15", version: "v3.4.0", reason: "Production capacity adjustment (Line B)" },
  { initials: "NQ", who: "Nguyễn Quân (Sales)", when: "2023-11-22 17:45", version: "v3.3.8", reason: "Flash sale addition for E-commerce channel" },
];

const unisFvaNodes: FvaNode[] = [
  { code: "BD", name: "CN-Bình Dương", mape: 12, delta: 2.1 },
  { code: "ĐN", name: "CN-Đà Nẵng", mape: 22, delta: 5.4 },
  { code: "HN", name: "CN-Hà Nội", mape: 31, delta: 1.8 },
  { code: "CT", name: "CN-Cần Thơ", mape: 15, delta: -0.5 },
];

// Tenant-scaled data
function scale(skus: SopSku[], factor: number): SopSku[] {
  return skus.map(s => ({
    ...s,
    cnBd: Math.round(s.cnBd * factor),
    cnDn: Math.round(s.cnDn * factor),
    cnHn: Math.round(s.cnHn * factor),
    cnCt: Math.round(s.cnCt * factor),
    total: Math.round(s.total * factor),
  }));
}

function scaleAop(a: AopTarget, factor: number): AopTarget {
  return {
    cnBd: Math.round(a.cnBd * factor),
    cnDn: Math.round(a.cnDn * factor),
    cnHn: Math.round(a.cnHn * factor),
    cnCt: Math.round(a.cnCt * factor),
    total: Math.round(a.total * factor),
  };
}

export const tenantSopData: Record<string, {
  skus: SopSku[];
  aop: AopTarget;
  phasingRows: PhasingRow[];
  versions: VersionCard[];
  variants: VariantRow[];
  decisionLog: DecisionLog[];
  fvaNodes: FvaNode[];
}> = {
  "UNIS Group": { skus: unisSopSkus, aop: unisAop, phasingRows: unisPhasingRows, versions: unisVersions, variants: unisVariants, decisionLog: unisDecisionLog, fvaNodes: unisFvaNodes },
  "TTC Agris": { skus: scale(unisSopSkus, 0.75), aop: scaleAop(unisAop, 0.75), phasingRows: unisPhasingRows, versions: unisVersions.map(v => ({ ...v, value: Math.round(v.value * 0.75) })), variants: unisVariants, decisionLog: unisDecisionLog, fvaNodes: unisFvaNodes },
  "Mondelez": { skus: scale(unisSopSkus, 1.2), aop: scaleAop(unisAop, 1.2), phasingRows: unisPhasingRows, versions: unisVersions.map(v => ({ ...v, value: Math.round(v.value * 1.2) })), variants: unisVariants, decisionLog: unisDecisionLog, fvaNodes: unisFvaNodes },
};

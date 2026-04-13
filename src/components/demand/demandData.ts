// Tenant-aware mock data for Demand page

export interface DemandSku {
  item: string;
  variant: string;
  fc: number;
  b2bWt: number;
  po: number;
  overlap: number;
  total: number;
  deltaLm: number;
  trend: "up" | "down" | "flat";
  source: { fc: string; b2b: string; po: string };
  phases: DemandPhase[];
  cnSplits: CnSplit[];
}

export interface DemandPhase {
  week: string;
  weight: number;
  qty: number;
}

export interface CnSplit {
  cn: string;
  share: number;
  qty: number;
}

export interface B2BDeal {
  id: string;
  customer: string;
  project: string;
  cn: string;
  items: string;
  qty: number;
  probability: number;
  stage: "Lead" | "Qualified" | "Proposal" | "Committed" | "Won";
  cnSplit: { cn: string; units: number; pct: number }[];
  timeline: { week: string; label: string; status: "done" | "active" | "pending" }[];
  skuBreakdown: { sku: string; qty: number }[];
  poMapping: string;
  changeLog: { user: string; action: string; time: string }[];
}

const unisSkus: DemandSku[] = [
  {
    item: "GA-300", variant: "A4", fc: 1150, b2bWt: 540, po: 255, overlap: -75, total: 1870, deltaLm: 8,
    trend: "up", source: { fc: "XGBoost-V4", b2b: "12 deals", po: "8 Early / 4 Late" },
    phases: [
      { week: "W16", qty: 532, weight: 28 }, { week: "W17", qty: 467, weight: 25 },
      { week: "W18", qty: 449, weight: 24 }, { week: "W19", qty: 430, weight: 23 },
    ],
    cnSplits: [
      { cn: "BD", share: 45, qty: 842 }, { cn: "HN", share: 30, qty: 561 }, { cn: "Other", share: 25, qty: 467 },
    ],
  },
  {
    item: "GA-300", variant: "B2", fc: 380, b2bWt: 130, po: 50, overlap: -20, total: 540, deltaLm: -3,
    trend: "down", source: { fc: "XGBoost-V4", b2b: "5 deals", po: "3 Early / 2 Late" },
    phases: [
      { week: "W16", qty: 162, weight: 30 }, { week: "W17", qty: 135, weight: 25 },
      { week: "W18", qty: 130, weight: 24 }, { week: "W19", qty: 113, weight: 21 },
    ],
    cnSplits: [
      { cn: "BD", share: 50, qty: 270 }, { cn: "HN", share: 35, qty: 189 }, { cn: "DN", share: 15, qty: 81 },
    ],
  },
  {
    item: "GA-300", variant: "C1", fc: 320, b2bWt: 95, po: 40, overlap: -15, total: 440, deltaLm: 2,
    trend: "up", source: { fc: "HW-Seasonal", b2b: "3 deals", po: "2 Early / 1 Late" },
    phases: [
      { week: "W16", qty: 132, weight: 30 }, { week: "W17", qty: 110, weight: 25 },
      { week: "W18", qty: 110, weight: 25 }, { week: "W19", qty: 88, weight: 20 },
    ],
    cnSplits: [
      { cn: "BD", share: 40, qty: 176 }, { cn: "HN", share: 40, qty: 176 }, { cn: "CT", share: 20, qty: 88 },
    ],
  },
  {
    item: "GA-400", variant: "A4", fc: 770, b2bWt: 255, po: 75, overlap: -50, total: 1050, deltaLm: 12,
    trend: "up", source: { fc: "XGBoost-V4", b2b: "8 deals", po: "5 Early / 3 Late" },
    phases: [
      { week: "W16", qty: 315, weight: 30 }, { week: "W17", qty: 263, weight: 25 },
      { week: "W18", qty: 252, weight: 24 }, { week: "W19", qty: 220, weight: 21 },
    ],
    cnSplits: [
      { cn: "BD", share: 55, qty: 578 }, { cn: "DN", share: 25, qty: 263 }, { cn: "CT", share: 20, qty: 210 },
    ],
  },
  {
    item: "GA-400", variant: "D5", fc: 190, b2bWt: 30, po: 15, overlap: -5, total: 230, deltaLm: -1,
    trend: "flat", source: { fc: "HW-Seasonal", b2b: "2 deals", po: "1 Early / 1 Late" },
    phases: [
      { week: "W16", qty: 69, weight: 30 }, { week: "W17", qty: 58, weight: 25 },
      { week: "W18", qty: 58, weight: 25 }, { week: "W19", qty: 46, weight: 20 },
    ],
    cnSplits: [
      { cn: "HN", share: 60, qty: 138 }, { cn: "BD", share: 40, qty: 92 },
    ],
  },
  {
    item: "GA-600", variant: "A4", fc: 1550, b2bWt: 850, po: 490, overlap: -220, total: 2670, deltaLm: 15,
    trend: "up", source: { fc: "XGBoost-V4", b2b: "15 deals", po: "10 Early / 5 Late" },
    phases: [
      { week: "W16", qty: 801, weight: 30 }, { week: "W17", qty: 668, weight: 25 },
      { week: "W18", qty: 641, weight: 24 }, { week: "W19", qty: 561, weight: 21 },
    ],
    cnSplits: [
      { cn: "BD", share: 40, qty: 1068 }, { cn: "HN", share: 30, qty: 801 }, { cn: "DN", share: 20, qty: 534 }, { cn: "CT", share: 10, qty: 267 },
    ],
  },
  {
    item: "GA-600", variant: "B2", fc: 440, b2bWt: 300, po: 175, overlap: -65, total: 850, deltaLm: 5,
    trend: "up", source: { fc: "HW-Seasonal", b2b: "6 deals", po: "4 Early / 2 Late" },
    phases: [
      { week: "W16", qty: 255, weight: 30 }, { week: "W17", qty: 213, weight: 25 },
      { week: "W18", qty: 204, weight: 24 }, { week: "W19", qty: 179, weight: 21 },
    ],
    cnSplits: [
      { cn: "BD", share: 50, qty: 425 }, { cn: "HN", share: 30, qty: 255 }, { cn: "DN", share: 20, qty: 170 },
    ],
  },
];

const ttcSkus: DemandSku[] = unisSkus.map(s => ({
  ...s,
  fc: Math.round(s.fc * 0.7),
  b2bWt: Math.round(s.b2bWt * 0.6),
  po: Math.round(s.po * 0.8),
  overlap: Math.round(s.overlap * 0.65),
  total: Math.round(s.total * 0.7),
  deltaLm: Math.round(s.deltaLm * 0.9),
}));

const mdlzSkus: DemandSku[] = unisSkus.map(s => ({
  ...s,
  fc: Math.round(s.fc * 1.2),
  b2bWt: Math.round(s.b2bWt * 1.1),
  po: Math.round(s.po * 1.3),
  overlap: Math.round(s.overlap * 1.15),
  total: Math.round(s.total * 1.2),
  deltaLm: Math.round(s.deltaLm * 1.1),
}));

export const tenantDemandData: Record<string, DemandSku[]> = {
  "UNIS Group": unisSkus,
  "TTC Agris": ttcSkus,
  "Mondelez": mdlzSkus,
};

const unisDeals: B2BDeal[] = [
  {
    id: "B2B-001", customer: "Vingroup", project: "Grand Park Ph.3", cn: "BD 60% + HN 40%", items: "GA-600 A4",
    qty: 10200, probability: 85, stage: "Committed",
    cnSplit: [{ cn: "Bình Dương (BD)", units: 7200, pct: 60 }, { cn: "Hà Nội (HN)", units: 4800, pct: 40 }],
    timeline: [
      { week: "W18", label: "Initial Drop", status: "done" },
      { week: "W20", label: "Peak Demand", status: "active" },
      { week: "W22", label: "Final Completion", status: "pending" },
    ],
    skuBreakdown: [{ sku: "GA-600 A4", qty: 8500 }, { sku: "GA-600 B2", qty: 1700 }],
    poMapping: "PO-BD-W16, PO-HN-W18",
    changeLog: [
      { user: "Anh Tuấn", action: "updated Stage to Committed", time: "2 hours ago" },
      { user: "System", action: "increased Probability +15%", time: "Yesterday, 14:20" },
    ],
  },
  {
    id: "B2B-002", customer: "Novaland", project: "Aqua City", cn: "BD 100%", items: "GA-300 A4",
    qty: 5400, probability: 70, stage: "Proposal",
    cnSplit: [{ cn: "Bình Dương (BD)", units: 5400, pct: 100 }],
    timeline: [
      { week: "W19", label: "Sample Delivery", status: "done" },
      { week: "W21", label: "Contract Sign", status: "active" },
      { week: "W24", label: "Delivery", status: "pending" },
    ],
    skuBreakdown: [{ sku: "GA-300 A4", qty: 5400 }],
    poMapping: "Pending",
    changeLog: [
      { user: "Chị Thúy", action: "moved to Proposal stage", time: "1 day ago" },
    ],
  },
  {
    id: "B2B-003", customer: "Hưng Thịnh", project: "Moonlight", cn: "ĐN 100%", items: "GA-600 B2",
    qty: 3200, probability: 60, stage: "Qualified",
    cnSplit: [{ cn: "Đà Nẵng (ĐN)", units: 3200, pct: 100 }],
    timeline: [
      { week: "W20", label: "Site Visit", status: "active" },
      { week: "W23", label: "PO Expected", status: "pending" },
    ],
    skuBreakdown: [{ sku: "GA-600 B2", qty: 3200 }],
    poMapping: "N/A",
    changeLog: [
      { user: "System", action: "auto-qualified from lead score", time: "3 days ago" },
    ],
  },
  {
    id: "B2B-004", customer: "Phú Đông", project: "SkyOne", cn: "CT 100%", items: "GA-400 A4",
    qty: 2800, probability: 45, stage: "Lead",
    cnSplit: [{ cn: "Cần Thơ (CT)", units: 2800, pct: 100 }],
    timeline: [
      { week: "W22", label: "First Contact", status: "active" },
    ],
    skuBreakdown: [{ sku: "GA-400 A4", qty: 2800 }],
    poMapping: "N/A",
    changeLog: [
      { user: "Anh Minh", action: "created deal", time: "5 days ago" },
    ],
  },
  {
    id: "B2B-005", customer: "Khang Điền", project: "Lovera Vista", cn: "HN 100%", items: "GA-300 C1",
    qty: 4100, probability: 90, stage: "Won",
    cnSplit: [{ cn: "Hà Nội (HN)", units: 4100, pct: 100 }],
    timeline: [
      { week: "W15", label: "Contract Signed", status: "done" },
      { week: "W17", label: "First Shipment", status: "done" },
      { week: "W20", label: "Completion", status: "active" },
    ],
    skuBreakdown: [{ sku: "GA-300 C1", qty: 4100 }],
    poMapping: "PO-HN-W15",
    changeLog: [
      { user: "System", action: "auto-updated to Won", time: "1 week ago" },
    ],
  },
];

export const tenantB2BData: Record<string, B2BDeal[]> = {
  "UNIS Group": unisDeals,
  "TTC Agris": unisDeals.map(d => ({ ...d, qty: Math.round(d.qty * 0.7), customer: d.customer })),
  "Mondelez": unisDeals.map(d => ({ ...d, qty: Math.round(d.qty * 1.3), customer: d.customer })),
};

export const locationColors: Record<string, string> = {
  BD: "#2563EB",
  HN: "#0891b2",
  DN: "#7c3aed",
  CT: "#059669",
};

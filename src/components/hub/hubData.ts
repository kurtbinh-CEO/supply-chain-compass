import { TenantName } from "@/components/TenantContext";

const tenantScales: Record<TenantName, number> = {
  "UNIS Group": 1,
  "TTC Agris": 0.72,
  "Mondelez": 1.35,
};

export interface HubNode {
  id: string;
  name: string;
  code: string;
  reliability: number;
  grade: string;
  trend: "Up" | "Steady" | "Down";
  stockLevel: number;
  efficiency: number;
  skus: { sku: string; name: string; stock: number; target: number; gap: number }[];
}

const baseNodes: HubNode[] = [
  {
    id: "1", name: "Toko", code: "HUB-101-TK", reliability: 78, grade: "C", trend: "Down", stockLevel: 0.45, efficiency: 0.82,
    skus: [
      { sku: "SKU-90231", name: "Ceramic V2", stock: 2100, target: 3600, gap: -42 },
      { sku: "SKU-11204", name: "Adhesive G4", stock: 3200, target: 3650, gap: -12 },
      { sku: "SKU-44019", name: "Panel X1", stock: 1800, target: 2000, gap: -10 },
    ],
  },
  {
    id: "2", name: "Mikado", code: "HUB-205-MK", reliability: 92, grade: "A", trend: "Steady", stockLevel: 0.72, efficiency: 0.96,
    skus: [
      { sku: "SKU-30128", name: "Resin HD", stock: 5400, target: 5500, gap: -2 },
      { sku: "SKU-22019", name: "Coating B2", stock: 3100, target: 3000, gap: 3 },
    ],
  },
  {
    id: "3", name: "Phú Mỹ", code: "HUB-104-PMY", reliability: 45, grade: "D", trend: "Down", stockLevel: 0.15, efficiency: 0.34,
    skus: [
      { sku: "SKU-55012", name: "Steel Rod M8", stock: 800, target: 4200, gap: -81 },
      { sku: "SKU-67201", name: "Bolt Set A", stock: 1200, target: 2800, gap: -57 },
    ],
  },
  {
    id: "4", name: "Đồng Tâm", code: "HUB-310-DT", reliability: 90, grade: "A", trend: "Steady", stockLevel: 0.68, efficiency: 0.89,
    skus: [
      { sku: "SKU-78022", name: "Tile Premium", stock: 6200, target: 7000, gap: -11 },
      { sku: "SKU-81033", name: "Grout Mix", stock: 4500, target: 4600, gap: -2 },
    ],
  },
  {
    id: "5", name: "Vigracera", code: "HUB-420-VGC", reliability: 88, grade: "B", trend: "Up", stockLevel: 0.78, efficiency: 0.91,
    skus: [
      { sku: "SKU-92011", name: "Ceramic XL", stock: 8100, target: 8500, gap: -5 },
      { sku: "SKU-93044", name: "Porcelain S", stock: 5600, target: 5200, gap: 8 },
    ],
  },
];

export function getHubNodes(tenant: TenantName): HubNode[] {
  const s = tenantScales[tenant];
  return baseNodes.map((n) => ({
    ...n,
    skus: n.skus.map((sk) => ({
      ...sk,
      stock: Math.round(sk.stock * s),
      target: Math.round(sk.target * s),
    })),
  }));
}

export interface CommitmentRow {
  id: string;
  factory: string;
  code: string;
  tier: number;
  m1Commit: number;
  m2Commit: number | null;
  status: "Confirmed" | "Rejected" | "In Review" | "Pending";
  alertType?: "rejected" | "overdue";
  alertMsg?: string;
}

const baseCommitments: CommitmentRow[] = [
  { id: "c1", factory: "Vigracera", code: "FAC-882-VIG", tier: 1, m1Commit: 12500, m2Commit: null, status: "Rejected", alertType: "rejected", alertMsg: "Vigracera M+2 has rejected the requested allocation due to maintenance downtime on Line 4." },
  { id: "c2", factory: "Phú Mỹ", code: "FAC-104-PMY", tier: 2, m1Commit: 8200, m2Commit: 9000, status: "Pending", alertType: "overdue", alertMsg: "Phú Mỹ has not acknowledged the T5 commitment request sent 72 hours ago." },
  { id: "c3", factory: "Bình Dương Alpha", code: "FAC-559-BDA", tier: 1, m1Commit: 25000, m2Commit: 25000, status: "Confirmed" },
  { id: "c4", factory: "Long An Tech", code: "FAC-223-LAT", tier: 3, m1Commit: 4500, m2Commit: null, status: "In Review" },
];

export function getCommitments(tenant: TenantName): CommitmentRow[] {
  const s = tenantScales[tenant];
  return baseCommitments.map((c) => ({
    ...c,
    m1Commit: Math.round(c.m1Commit * s),
    m2Commit: c.m2Commit ? Math.round(c.m2Commit * s) : null,
  }));
}

export interface ScenarioCard {
  id: string;
  label: string;
  title: string;
  tag: string;
  description: string;
  estCost: string;
  recommended?: boolean;
  details: string;
}

export const scenarios: ScenarioCard[] = [
  { id: "a", label: "A", title: "Buy All", tag: "FAST-TRACK", description: "Secure all remaining inventory immediately at spot rates to eliminate stock-out risk.", estCost: "+14.2%", details: "Mua tất cả hàng tồn còn lại ở giá spot. Ưu điểm: loại bỏ hoàn toàn rủi ro hết hàng. Nhược điểm: chi phí cao nhất, tăng 14.2% so với baseline. Thời gian thực hiện: 2-3 ngày." },
  { id: "b", label: "B", title: "Higher Price", tag: "STRATEGIC", description: "Accept 5-8% price increase from Tier-1 suppliers to ensure quality and priority delivery.", estCost: "+8.5%", details: "Chấp nhận tăng giá 5-8% từ NCC Tier-1. Ưu điểm: đảm bảo chất lượng & ưu tiên giao hàng. Nhược điểm: chi phí tăng 8.5%. Thời gian đàm phán: 1-2 ngày." },
  { id: "c", label: "C", title: "Rollover", tag: "DEFERRED", description: "Push unmet demand to T6. Minimizes immediate cost but risks fulfillment delay.", estCost: "-2.1%", details: "Chuyển demand chưa đáp ứng sang T6. Ưu điểm: giảm chi phí 2.1%. Nhược điểm: rủi ro trễ fulfillment, ảnh hưởng SLA. Cần theo dõi sát inventory T6." },
  { id: "d", label: "D", title: "Hybrid Model", tag: "AI RECOMMENDED", description: "Spot buy 40% for critical items + Rollover 60% for non-essential SKUs.", estCost: "+4.8%", recommended: true, details: "Kết hợp spot buy 40% cho critical items + rollover 60% cho non-essential. AI confidence: 92.4%. Tối ưu cân bằng Time-to-Customer & Landed Cost. Sử dụng predictive buffer stock tại Hub 4." },
];

export const kpiCards = [
  { label: "Commitment Rate", value: "78.2%", delta: "↑ 4.5% vs Last Period (T4)", color: "success" as const },
  { label: "Risk Exceptions", value: "12 Nodes", delta: "3 High Priority | 9 Managed", color: "warning" as const },
  { label: "Avg. Response Time", value: "1.8 Days", delta: "Within curation SLA (2.0 Days)", color: "info" as const },
];

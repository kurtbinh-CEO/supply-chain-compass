import React, { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { cn } from "@/lib/utils";
import { useRbac, UserRole } from "@/components/RbacContext";
import { ChevronDown, ChevronRight } from "lucide-react";

/* ═══ TYPES ═══ */
type RoleKey = "SC_MANAGER" | "CN_MANAGER" | "SALES" | "BUYER";

interface RoleCard {
  key: RoleKey;
  icon: string;
  label: string;
  sub: string;
  accent: string;
  accentBg: string;
  border: string;
}

const roles: RoleCard[] = [
  { key: "SC_MANAGER", icon: "🎯", label: "SC Manager", sub: "Điều phối toàn chuỗi", accent: "text-[#004AC6]", accentBg: "bg-[#004AC6]/5", border: "border-[#004AC6]" },
  { key: "CN_MANAGER", icon: "🏢", label: "CN Manager", sub: "Quản lý chi nhánh", accent: "text-[#00714d]", accentBg: "bg-[#00714d]/5", border: "border-[#00714d]" },
  { key: "SALES", icon: "💼", label: "Sales", sub: "Nhập B2B deals", accent: "text-[#7c3aed]", accentBg: "bg-[#7c3aed]/5", border: "border-[#7c3aed]" },
  { key: "BUYER", icon: "🏭", label: "Buyer", sub: "Đặt hàng NM", accent: "text-[#b45309]", accentBg: "bg-[#b45309]/5", border: "border-[#b45309]" },
];

const roleMap: Record<UserRole, RoleKey> = {
  SC_MANAGER: "SC_MANAGER",
  CN_MANAGER: "CN_MANAGER",
  SALES: "SALES",
  VIEWER: "SC_MANAGER",
};

/* ═══ DATA ═══ */
interface DailyStep { route: string; label: string; time: string }
interface MonthlyStep { route: string; label: string; days: string }
interface Tip { text: string }
interface StepCard { route: string; title: string; badge: string; collapsed: string; why: string; what: string; how: string; formula: string }

interface RoleData {
  heroDesc: string;
  daily: DailyStep[];
  dailyTotal: string;
  monthly: MonthlyStep[];
  tips: Tip[];
  steps: StepCard[];
  dailySteps: StepCard[];
  formulas: { title: string; content: string }[];
  dailyIntro?: string;
  monthlyIntro?: string;
}

const roleData: Record<RoleKey, RoleData> = {
  SC_MANAGER: {
    heroDesc: "Bạn điều phối toàn bộ chuỗi cung ứng: từ dự báo demand → S&OP consensus → đặt NM → theo dõi giao hàng → tối ưu tồn kho. Mỗi sáng 25 phút, mỗi tháng 1 giờ S&OP.",
    daily: [
      { route: "/workspace", label: "Cần làm", time: "5 phút" },
      { route: "/supply", label: "Cập nhật tồn NM", time: "2 phút" },
      { route: "/demand-weekly", label: "Check CN adjust", time: "3 phút" },
      { route: "/drp", label: "Xử lý exceptions", time: "8 phút" },
      { route: "/orders", label: "Duyệt PO", time: "5 phút" },
      { route: "/monitoring", label: "Quick check", time: "2 phút" },
    ],
    dailyTotal: "~25 phút/ngày",
    monthly: [
      { route: "/demand", label: "Thu thập Demand", days: "Day 1-3" },
      { route: "/sop", label: "S&OP Consensus + Lock", days: "Day 5-7" },
      { route: "/hub", label: "Sourcing NM + BPO", days: "Day 7-8" },
    ],
    tips: [
      { text: "Click bất kỳ số nào → thấy nguồn gốc + cách tính. Không có số \"câm\"." },
      { text: "FormulaBar ở /sop tab 2: 6 ô click được. Demand−Stock−Pipeline=Net+SS=FCMin." },
      { text: "[▶ Chạy DRP] bất kỳ lúc nào, không chỉ 23:00 nightly." },
      { text: "Pivot toggle [🏢 CN→SKU] ↔ [📦 SKU→CN]: 2 góc nhìn phát hiện LCNB." },
      { text: "/logic page: giải thích chi tiết forecast, safety stock, 6-layer allocation." },
    ],
    steps: [
      {
        route: "/demand", title: "Thu thập Demand", badge: "Day 1-3",
        collapsed: "Xem tổng demand = FC + B2B + PO. Click số → thấy nguồn.",
        why: "Biết thị trường cần bao nhiêu hàng tháng tới. Demand = nền tảng mọi quyết định supply chain. Sai demand → sai tất cả: đặt NM thừa (tốn vốn) hoặc thiếu (mất khách).",
        what: "Tab 1 'Demand tổng': xem per CN, drill per SKU. Mỗi số = FC + B2B + PO. Click bất kỳ → thấy breakdown.\nTab 2 'B2B nhập liệu': review deals Sales nhập. Sửa nếu cần. Weighted = qty × probability% auto-tính.",
        how: "1. Mở /demand tab 1 → toggle [12 tháng] xem trend dài.\n2. Click cell tháng 5 → popover: FC 4.800 + B2B 2.200 + PO 1.100 − Overlap 450 = 7.650.\n3. Tab 2: review 12 deals. Vingroup 85% ✅ PO signed. Novaland 70% chưa PO.\n4. Demand ready → chuyển /sop.",
        formula: "Demand = FC_statistical + Σ(B2B_qty × probability%) + PO_confirmed − overlap\n\nVD tháng 5: 4.800 + 2.200 + 1.100 − 450 = 7.650 m²\n\nFC: Holt-Winters/XGBoost, 24M history, MAPE 18,4%\nB2B: 12 deals × prob%. Chỉ deals ≥30% mới tính.\nPO: đơn hàng ERP Bravo. Sync mỗi 30 phút.\nOverlap: PO đã tính trong B2B → trừ trùng lặp.",
      },
      {
        route: "/sop", title: "S&OP Consensus + Lock", badge: "Day 5",
        collapsed: "4 versions demand → đồng ý 1 số → Lock → phasing gửi NM.",
        why: "4 bộ phận (Model, Sales, CN, SC Manager) đưa 4 con số khác nhau. Nếu không ĐỒNG Ý 1 con số → NM nhận số sai → sản xuất sai → stockout hoặc excess. S&OP = quy trình đồng ý 1 con số duy nhất.",
        what: "Tab 1 'Consensus': bảng 4 CN × 4 versions (v0 Statistical, v1 Sales, v2 CN, v3 Consensus). FVA cho biết ai dự báo đúng nhất tháng trước → tin ai tháng này. Lớp 1 per CN → click Lớp 2 per SKU editable.\nTab 2 'Cân đối & Lock': FormulaBar 6 ô (Demand−Stock−Pipeline=Net+SS=FCMin). NM Panel: xem 5 NM per SKU thiếu → chọn NM tốt nhất. AOP gap. [🔒 Lock] → phasing auto → FC gửi NM.",
        how: "1. Tab 1 Lớp 1: 'CN-BD: v0=2.100, v1=2.800, v2=2.550. FVA: v2 CN best (MAPE 12%).'\n2. Click FVA → thấy: v2 sai 2,2% vs v0 sai 8,1% → chọn v2.\n3. Tab 2: FormulaBar 'Demand 7.650 − Stock 3.200 − Pipeline 1.757 = Net 2.693 + SS 1.200 = FC Min 3.893'\n4. Click 'Net 2.693' → breakdown per CN. CN-BD net 1.543 (CRITICAL).\n5. Click CN-BD exception → NM Panel mở: Mikado score 88 ★, Đồng Tâm 82.\n6. [🔒 Lock Consensus] → confirm → phasing auto → /hub pre-populated.",
        formula: "Net = Demand − Stock − Pipeline = 7.650 − 3.200 − 1.757 = 2.693\nFC_Min = Net + SS_buffer = 2.693 + 1.200 = 3.893\nFVA = MAPE(v0_stat) − MAPE(vX_input)\n\nVD: FVA_CN = 8,1% − 2,2% = +5,9% (v2 CN tốt hơn model 5,9%)\nFVA dương → input có giá trị. FVA âm → model tốt hơn.",
      },
      {
        route: "/hub", title: "Sourcing NM + BPO", badge: "Day 7-8",
        collapsed: "FC Min → ranking NM → phân bổ → MOQ round → tạo BPO.",
        why: "FC Min = 3.893 nhưng NM nào cung cấp? Mikado rẻ nhưng LT dài. Đồng Tâm nhanh nhưng capacity ít. Toko reliability thấp. PHẢI có quy trình so sánh transparent để chọn NM tối ưu. Pre-allocated ẩn = user không tin = manual override = hệ thống vô nghĩa.",
        what: "4-step Sourcing Workbench:\nBước 1 'Cần gì?': per SKU net req (từ S&OP Lock). Sort urgency.\nBước 2 'NM nào có?': ranking 5 NM. Score = LT + Cost + Reliability. Objective chọn được (Hybrid/Shortest LT/Lowest Cost).\nBước 3 'Phân bổ': allocate per NM. Single source hoặc dual source. Sửa ratio.\nBước 4 'MOQ + Gửi': round MOQ NM + POQ option (gộp tuần) + container optimize → [Tạo BPO].",
        how: "1. Bước 1: 'GA-300 A4 cần 840m², CRITICAL.' 5 SKU cần sourcing, 2 đủ hàng.\n2. Bước 2: Mikado score 88 ★ (LT 14d, cost 185K, reliability 92%). Toko 52 ⚠ (68%).\n   Hover Mikado → 'LT score 64×50% + Cost 0×30% + Reliability 92×20% = 88.'\n3. Bước 3: chọn Mikado primary 700 (83%) + Đồng Tâm backup 140 (17%).\n4. Bước 4: Mikado allocated 1.067 → MOQ 1.000 → round 2.000. Surplus 933.\n5. [Xác nhận & Tạo BPO] → BPO-MKD-2605 created → NM nhận commitment.",
        formula: "Score = W₁×(1−LT/max_LT) + W₂×(1−cost/max_cost) + W₃×reliability\nHybrid: W₁=50%, W₂=30%, W₃=20%\n\nMOQ_round = ceil(net_req ÷ MOQ) × MOQ\nVD: ceil(1.067 ÷ 1.000) × 1.000 = 2.000. Surplus = 2.000 − 1.067 = 933.\n\nBPO = cam kết tháng. RPO = đặt tuần (trừ vào BPO quota).\nBPO_remaining = committed − Σ(RPO_qty)",
      },
    ],
    formulas: [
      { title: "Safety Stock", content: "SS = Z × σ_demand × √LT + Z × d_avg × σ_LT\nZ = 1.65 (service level 95%)\nσ_demand = std of demand history 12M\nσ_LT = std of lead time 6M" },
      { title: "HSTK", content: "HSTK = Available ÷ Daily_demand\nAvailable = On_hand − Reserved + In_transit\nDaily_demand = Monthly_demand ÷ 30" },
      { title: "DRP Net", content: "Net_req = Demand − Available − Pipeline\nIf Net_req > 0 → shortage → create RPO\nIf Net_req < 0 → excess → LCNB candidate" },
    ],
  },
  CN_MANAGER: {
    heroDesc: "Bạn quản lý chi nhánh: nhập điều chỉnh demand, theo dõi tồn kho CN, trao đổi với SC team. Mỗi ngày 10 phút điều chỉnh, cuối tháng review demand.",
    daily: [
      { route: "/workspace", label: "Cần làm", time: "3 phút" },
      { route: "/cn-portal", label: "Điều chỉnh demand CN", time: "5 phút" },
      { route: "/demand-weekly", label: "Xem phasing tuần", time: "2 phút" },
    ],
    dailyTotal: "~10 phút/ngày",
    monthly: [
      { route: "/cn-portal", label: "Nhập điều chỉnh demand tháng", days: "Day 1-3" },
      { route: "/sop", label: "Xem kết quả consensus (read-only)", days: "Day 5-7" },
    ],
    tips: [
      { text: "Tolerance: thay đổi ±10% → auto-approve. 10-30% → SC Manager duyệt. >30% → cần giải trình." },
      { text: "Tab Tồn kho: xem real-time stock CN mình. HSTK < 5d = cần nhắc SC." },
      { text: "Tab Trao đổi: chat trực tiếp với SC Manager về exception." },
    ],
    steps: [],
    formulas: [],
  },
  SALES: {
    heroDesc: "Bạn nhập thông tin B2B deals vào hệ thống. Deals của bạn ảnh hưởng trực tiếp đến demand forecast và quyết định đặt hàng NM.",
    daily: [
      { route: "/workspace", label: "Cần làm", time: "2 phút" },
      { route: "/demand", label: "Nhập B2B deals (tab 2)", time: "5 phút" },
    ],
    dailyTotal: "~7 phút/ngày",
    monthly: [
      { route: "/demand", label: "Update B2B pipeline đầu tháng", days: "Day 1-3" },
      { route: "/sop", label: "Xem consensus (tab 1 read-only)", days: "Day 5" },
    ],
    tips: [
      { text: "Probability%: chỉ deals ≥30% mới tính vào demand. <30% = pipeline chưa dùng." },
      { text: "PO signed → set 100%. Hệ thống tự link PO ERP." },
      { text: "Weighted demand = qty × probability%. Ví dụ: 1.000m² × 85% = 850m²." },
    ],
    steps: [],
    formulas: [],
  },
  BUYER: {
    heroDesc: "Bạn đặt hàng NM, theo dõi PO lifecycle, và đảm bảo NM giao hàng đúng hạn. Mỗi ngày check PO status và NM supply.",
    daily: [
      { route: "/workspace", label: "Cần làm", time: "3 phút" },
      { route: "/supply", label: "Check NM supply", time: "3 phút" },
      { route: "/orders", label: "Quản lý PO/TO", time: "8 phút" },
      { route: "/hub", label: "Xem commitment NM", time: "2 phút" },
    ],
    dailyTotal: "~16 phút/ngày",
    monthly: [
      { route: "/hub", label: "Tạo BPO (sau S&OP Lock)", days: "Day 7-8" },
      { route: "/supplier-portal", label: "Review NM performance", days: "Day 10" },
    ],
    tips: [
      { text: "ATP check: mỗi RPO auto-check NM có hàng không. Pass/Fail visible." },
      { text: "BPO quota: RPO trừ vào BPO. Over-commit → warning + options." },
      { text: "Force-release: bypass ATP → cần 3 cấp duyệt. Dùng khi khẩn cấp." },
    ],
    steps: [],
    formulas: [],
  },
};

/* ═══ Expandable Section ═══ */
function ExpandSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-5 py-3 flex items-center justify-between hover:bg-surface-1/30 transition-colors">
        <span className="font-display text-body font-semibold text-text-1">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-text-3" /> : <ChevronRight className="h-4 w-4 text-text-3" />}
      </button>
      {open && <div className="border-t border-surface-3 px-5 py-4">{children}</div>}
    </div>
  );
}

/* ═══ Step Card with WHY/WHAT/HOW/FORMULA ═══ */
function StepCardComponent({ step, index, accentBg }: { step: StepCard; index: number; accentBg: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-surface-1/30 transition-colors text-left">
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary text-table font-bold shrink-0">{index + 1}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-body font-semibold text-text-1">{step.route} — {step.title}</span>
            <span className="rounded-sm bg-primary/10 text-primary text-caption font-medium px-1.5 py-0.5">{step.badge}</span>
          </div>
          <p className="text-table-sm text-text-2 mt-0.5">{step.collapsed}</p>
        </div>
        {expanded ? <ChevronDown className="h-4 w-4 text-text-3 shrink-0" /> : <ChevronRight className="h-4 w-4 text-text-3 shrink-0" />}
      </button>
      {expanded && (
        <div className="border-t border-surface-3 space-y-0">
          <div className="px-5 py-4 bg-[#004AC6]/5">
            <h4 className="text-table font-semibold text-[#004AC6] mb-1.5">💡 TẠI SAO</h4>
            <p className="text-table-sm text-text-2 whitespace-pre-wrap leading-relaxed">{step.why}</p>
          </div>
          <div className="px-5 py-4 bg-[#00714d]/5">
            <h4 className="text-table font-semibold text-[#00714d] mb-1.5">📋 LÀM GÌ</h4>
            <p className="text-table-sm text-text-2 whitespace-pre-wrap leading-relaxed">{step.what}</p>
          </div>
          <div className="px-5 py-4 bg-[#b45309]/5">
            <h4 className="text-table font-semibold text-[#b45309] mb-1.5">🔧 CÁCH LÀM</h4>
            <p className="text-table-sm text-text-2 whitespace-pre-wrap leading-relaxed font-body">{step.how}</p>
          </div>
          <div className="px-5 py-4 bg-[#111827] rounded-b-card">
            <h4 className="text-table font-semibold text-emerald-400 mb-1.5">📐 CÔNG THỨC</h4>
            <pre className="text-table-sm text-emerald-300 whitespace-pre-wrap font-mono leading-relaxed">{step.formula}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function GuidePage() {
  const { user } = useRbac();
  const defaultRole = roleMap[user.role] || "SC_MANAGER";
  const [selectedRole, setSelectedRole] = useState<RoleKey>(defaultRole);
  const [activeTab, setActiveTab] = useState("overview");

  const role = roles.find(r => r.key === selectedRole)!;
  const data = roleData[selectedRole];

  const tabs = [
    { key: "overview", label: "Tổng quan" },
    { key: "monthly", label: "Kế hoạch tháng" },
    { key: "daily", label: "Vận hành ngày" },
    { key: "formulas", label: "Công thức" },
  ];

  return (
    <AppLayout>
      <ScreenHeader title="SCP Smartlog — Hướng dẫn sử dụng" subtitle="Chọn role của bạn để xem quy trình phù hợp" />

      {/* Role Selector 2x2 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {roles.map((r) => (
          <button
            key={r.key}
            onClick={() => { setSelectedRole(r.key); setActiveTab("overview"); }}
            className={cn(
              "rounded-card border-2 p-4 text-left transition-all hover:shadow-md",
              selectedRole === r.key
                ? cn(r.border, "shadow-lg", r.accentBg)
                : "border-surface-3 bg-surface-2 hover:border-surface-3"
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{r.icon}</span>
              <div>
                <div className={cn("font-display text-body font-semibold", selectedRole === r.key ? r.accent : "text-text-1")}>{r.label}</div>
                <div className="text-table-sm text-text-2">{r.sub}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-surface-1 rounded-lg p-1 mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 rounded-md text-table font-medium transition-all",
              activeTab === tab.key
                ? "bg-surface-0 text-text-1 shadow-sm"
                : "text-text-2 hover:text-text-1"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: Tổng quan ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-4 animate-fade-in">
          {/* Hero card */}
          <div className={cn("rounded-card border border-surface-3 p-6", role.accentBg)}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">{role.icon}</span>
              <h2 className={cn("font-display text-section-header font-bold", role.accent)}>{role.label}</h2>
            </div>
            <p className="text-table text-text-2 leading-relaxed">{data.heroDesc}</p>
          </div>

          {/* Quy trình hàng ngày */}
          <ExpandSection title="Quy trình hàng ngày" defaultOpen>
            <ol className="space-y-2">
              {data.daily.map((step, i) => (
                <li key={i} className="flex items-center gap-3 text-table">
                  <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-caption font-bold shrink-0">{i + 1}</span>
                  <span className="font-mono text-primary text-table-sm">{step.route}</span>
                  <span className="text-text-1 flex-1">— {step.label}</span>
                  <span className="text-text-3 text-caption tabular-nums">({step.time})</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-table-sm text-text-3 font-medium">Tổng: {data.dailyTotal}</p>
          </ExpandSection>

          {/* Quy trình hàng tháng */}
          {data.monthly.length > 0 && (
            <ExpandSection title="Quy trình hàng tháng">
              <ol className="space-y-2">
                {data.monthly.map((step, i) => (
                  <li key={i} className="flex items-center gap-3 text-table">
                    <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-caption font-bold shrink-0">{i + 1}</span>
                    <span className="font-mono text-primary text-table-sm">{step.route}</span>
                    <span className="text-text-1 flex-1">— {step.label}</span>
                    <span className="rounded-sm bg-surface-3 text-text-3 text-caption px-1.5 py-0.5">{step.days}</span>
                  </li>
                ))}
              </ol>
            </ExpandSection>
          )}

          {/* Mẹo */}
          {data.tips.length > 0 && (
            <ExpandSection title="Mẹo quan trọng">
              <ul className="space-y-2">
                {data.tips.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-table-sm text-text-2">
                    <span className="text-primary shrink-0">•</span>
                    <span>{tip.text}</span>
                  </li>
                ))}
              </ul>
            </ExpandSection>
          )}
        </div>
      )}

      {/* ═══ TAB: Kế hoạch tháng ═══ */}
      {activeTab === "monthly" && (
        <div className="space-y-4 animate-fade-in">
          {data.steps.length > 0 ? (
            <>
              <p className="text-table text-text-2 mb-2">
                Chu kỳ monthly: Day 1 thu thập → Day 5 S&OP meeting → Day 7 Lock → Day 8 gửi NM.
              </p>
              {data.steps.map((step, i) => (
                <StepCardComponent key={i} step={step} index={i} accentBg={role.accentBg} />
              ))}
            </>
          ) : (
            <div className="rounded-card border border-surface-3 bg-surface-2 p-8 text-center">
              <p className="text-text-2">Role <span className="font-medium text-text-1">{role.label}</span> chủ yếu tham gia quy trình hàng ngày.</p>
              <p className="text-table-sm text-text-3 mt-1">Xem tab "Vận hành ngày" hoặc chọn SC Manager để xem full monthly flow.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: Vận hành ngày ═══ */}
      {activeTab === "daily" && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-table text-text-2 mb-2">
            Quy trình hàng ngày cho {role.label}. Tổng thời gian: {data.dailyTotal}.
          </p>
          <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
            <table className="w-full text-table">
              <thead>
                <tr className="bg-surface-1">
                  <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 w-12">#</th>
                  <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3 w-40">Màn hình</th>
                  <th className="text-left px-4 py-2.5 text-table-header uppercase text-text-3">Việc cần làm</th>
                  <th className="text-right px-4 py-2.5 text-table-header uppercase text-text-3 w-24">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {data.daily.map((step, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}>
                    <td className="px-4 py-3">
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-caption font-bold">{i + 1}</span>
                    </td>
                    <td className="px-4 py-3 font-mono text-primary text-table-sm">{step.route}</td>
                    <td className="px-4 py-3 text-text-1">{step.label}</td>
                    <td className="px-4 py-3 text-right text-text-2 tabular-nums">{step.time}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface-1 border-t border-surface-3">
                  <td colSpan={3} className="px-4 py-2.5 font-medium text-text-1">Tổng</td>
                  <td className="px-4 py-2.5 text-right font-medium text-primary tabular-nums">{data.dailyTotal}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ═══ TAB: Công thức ═══ */}
      {activeTab === "formulas" && (
        <div className="space-y-4 animate-fade-in">
          {data.formulas.length > 0 ? (
            data.formulas.map((f, i) => (
              <div key={i} className="rounded-card border border-surface-3 overflow-hidden">
                <div className="px-5 py-3 bg-surface-2 border-b border-surface-3">
                  <h3 className="font-display text-body font-semibold text-text-1">{f.title}</h3>
                </div>
                <div className="px-5 py-4 bg-[#111827]">
                  <pre className="text-table-sm text-emerald-300 whitespace-pre-wrap font-mono leading-relaxed">{f.content}</pre>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-card border border-surface-3 bg-surface-2 p-8 text-center">
              <p className="text-text-2">Chọn role <span className="font-medium text-text-1">SC Manager</span> để xem đầy đủ công thức.</p>
              <p className="text-table-sm text-text-3 mt-1">Hoặc truy cập <span className="font-mono text-primary">/logic</span> để xem chi tiết.</p>
            </div>
          )}

          {/* Step formulas */}
          {data.steps.length > 0 && (
            <>
              <h3 className="font-display text-body font-semibold text-text-1 mt-6">Công thức theo bước</h3>
              {data.steps.map((step, i) => (
                <div key={i} className="rounded-card border border-surface-3 overflow-hidden">
                  <div className="px-5 py-3 bg-surface-2 border-b border-surface-3 flex items-center gap-2">
                    <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-caption font-bold">{i + 1}</span>
                    <h4 className="font-display text-table font-semibold text-text-1">{step.title}</h4>
                  </div>
                  <div className="px-5 py-4 bg-[#111827]">
                    <pre className="text-table-sm text-emerald-300 whitespace-pre-wrap font-mono leading-relaxed">{step.formula}</pre>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </AppLayout>
  );
}

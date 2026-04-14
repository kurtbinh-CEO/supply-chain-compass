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
      { route: "/drp", label: "Xử lý exceptions", time: "10 phút" },
      { route: "/orders", label: "Duyệt PO", time: "5 phút" },
    ],
    dailyTotal: "~25 phút/ngày",
    dailyIntro: "Mỗi sáng 25 phút: Workspace → Supply → DRP → Orders.",
    monthly: [
      { route: "/demand", label: "Thu thập Demand", days: "Day 1-3" },
      { route: "/sop", label: "S&OP Consensus + Lock", days: "Day 5-7" },
      { route: "/hub", label: "Sourcing NM + BPO", days: "Day 7-8" },
    ],
    monthlyIntro: "Chu kỳ monthly: Day 1 thu thập → Day 5 S&OP meeting → Day 7 Lock → Day 8 gửi NM.",
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
        what: "Tab 1 'Consensus': bảng 4 CN × 4 versions (v0 Statistical, v1 Sales, v2 CN, v3 Consensus). FVA cho biết ai dự báo đúng nhất tháng trước → tin ai tháng này.\nTab 2 'Cân đối & Lock': FormulaBar 6 ô. NM Panel. AOP gap. [🔒 Lock] → phasing auto → FC gửi NM.",
        how: "1. Tab 1: 'CN-BD: v0=2.100, v1=2.800, v2=2.550. FVA: v2 CN best (MAPE 12%).'\n2. Click FVA → v2 sai 2,2% vs v0 sai 8,1% → chọn v2.\n3. Tab 2: FormulaBar 'Demand 7.650 − Stock 3.200 − Pipeline 1.757 = Net 2.693 + SS 1.200 = FC Min 3.893'\n4. Click 'Net 2.693' → breakdown per CN. CN-BD net 1.543 (CRITICAL).\n5. [🔒 Lock Consensus] → confirm → phasing auto → /hub pre-populated.",
        formula: "Net = Demand − Stock − Pipeline = 7.650 − 3.200 − 1.757 = 2.693\nFC_Min = Net + SS_buffer = 2.693 + 1.200 = 3.893\nFVA = MAPE(v0_stat) − MAPE(vX_input)\n\nVD: FVA_CN = 8,1% − 2,2% = +5,9% (v2 CN tốt hơn model 5,9%)\nFVA dương → input có giá trị. FVA âm → model tốt hơn.",
      },
      {
        route: "/hub", title: "Sourcing NM + BPO", badge: "Day 7-8",
        collapsed: "FC Min → ranking NM → phân bổ → MOQ round → tạo BPO.",
        why: "FC Min = 3.893 nhưng NM nào cung cấp? PHẢI có quy trình so sánh transparent để chọn NM tối ưu.",
        what: "4-step Sourcing Workbench:\nBước 1: per SKU net req. Bước 2: ranking 5 NM (Score). Bước 3: allocate per NM. Bước 4: MOQ round + container optimize → [Tạo BPO].",
        how: "1. GA-300 A4 cần 840m², CRITICAL.\n2. Mikado score 88 ★ (LT 14d, cost 185K, reliability 92%). Toko 52 ⚠.\n3. Mikado primary 700 (83%) + Đồng Tâm backup 140 (17%).\n4. MOQ round 2.000. [Xác nhận & Tạo BPO].",
        formula: "Score = W₁×(1−LT/max_LT) + W₂×(1−cost/max_cost) + W₃×reliability\nHybrid: W₁=50%, W₂=30%, W₃=20%\n\nMOQ_round = ceil(net_req ÷ MOQ) × MOQ\nBPO_remaining = committed − Σ(RPO_qty)",
      },
    ],
    dailySteps: [
      {
        route: "/workspace", title: "Cần làm", badge: "5 phút",
        collapsed: "1 list thay 3 list. Sort: đỏ → vàng → xanh. Xử lý xong → bắt đầu ngày.",
        why: "1 list thay 3 list (duyệt + exceptions + thông báo). Sort: đỏ → vàng → xanh. Xử lý xong → bắt đầu ngày.",
        what: "List unified: 'Force-release Toko [Duyệt]', 'SHORTAGE CN-BD [→/drp]', 'CN adjust +12% [Duyệt]'. 4 KPI mini + 2 CTA workflow.",
        how: "1. Scan list: đỏ trước.\n2. [Duyệt] inline (không cần modal).\n3. [Xử lý →] navigate screen.\n4. Click [▶ Vận hành ngày].",
        formula: "",
      },
      {
        route: "/supply", title: "Cập nhật tồn NM", badge: "2 phút",
        collapsed: "DRP cần data NM fresh. Stale >24h → DRP tính sai → PO fail.",
        why: "DRP cần data NM fresh. UNIS NM thường manual (Excel/phone), không API. Stale >24h → DRP tính sai → PO fail.",
        what: "Upload Excel hoặc nhập tay. 'UNIS dùng' = tồn × share% auto. Lớp 1 per NM. Stale → [Nhắc NM].",
        how: "1. Drag-drop file NM gửi sáng.\n2. Preview → [Xác nhận].\n3. NM chưa gửi → [Nhắc NM] push Supplier Portal.",
        formula: "UNIS_dùng = on_hand × share%\nVD: Mikado tồn 2.500 × 60% = 1.500 − reserved 120 = 1.380.",
      },
      {
        route: "/drp", title: "DRP & Phân bổ", badge: "10 phút",
        collapsed: "DRP đêm qua tính hết. Sáng chỉ xử lý EXCEPTIONS. 95% OK → focus 5%.",
        why: "DRP đêm qua tính hết. Sáng bạn chỉ xử lý EXCEPTIONS. 95% SKU OK → focus 5% có vấn đề.",
        what: "3 lớp progressive disclosure:\nLớp 1 KẾT QUẢ: per CN fill rate + exceptions. 'CN-BD 86%, 2 exceptions.'\nLớp 2 CÁCH TÍNH: click [Xem cách tính] → netting 8 bước + allocation 6 chips.\nLớp 3 ĐIỀU CHỈNH: SS management + DRP params. [Mô phỏng] slider z.",
        how: "1. Lớp 1: 'CN-BD 86%, 2 exceptions.'\n2. Click CN-BD → GA-300 A4 SHORTAGE 345.\n3. Click [Xem cách tính] → 'Demand 617 − On-hand 120 − Pipeline 557 + SS 900 = Net 840 → MOQ 1.000.'\n4. Click [Xử lý] → 3 options: A. Lateral CN-ĐN 220m² | B. PO mới Mikado 345 | C. Kết hợp ★.\n5. Chọn C → TO + RPO tạo → Workspace duyệt.",
        formula: "Netting: Demand − On_hand − Pipeline + SS = Net_req\n617 − 120 − 557 + 900 = 840 → MOQ round 1.000\n\nAllocation 6 layers:\nL1 Source✓ → L2 Variant✓ → L3 FIFO✓ → L4 Fair✓ → L5 SS Guard✗(−228) → L6 Lateral+0\n\nSS = z × σ_fc_error × √LT = 1,65 × 28,5 × √14 = 176 m²/SKU\n\nQUAN TRỌNG: σ_fc_error (sai số forecast) KHÔNG PHẢI σ_demand.\nFC đã hấp thụ phần dự đoán được → SS chỉ buffer phần sai → tiết kiệm 54% WC.",
      },
      {
        route: "/orders", title: "Quản lý PO", badge: "5 phút",
        collapsed: "RPO draft từ DRP → ATP check → duyệt → post Bravo.",
        why: "RPO draft từ DRP cần 3 bước: ATP check → duyệt → post Bravo. NM chỉ sản xuất khi nhận PO trong Bravo.",
        what: "Tab 1: per status. [Gửi ATP] → [Duyệt] → [Post Bravo]. SHIP/HOLD inline.\nTab 2: tracking per NM → per RPO → per ASN. Honoring%.",
        how: "1. Filter DRAFT → [Gửi ATP tất cả].\n2. ATP Pass → [Duyệt tất cả].\n3. Approved → [Post Bravo].\n4. ATP Fail → data NM stale → [Nhắc NM update] hoặc [Force 3 cấp].\n5. Tab 2: Toko overdue 8d → [Nhắc NM]. Honoring 68% → review meeting.",
        formula: "ATP = on_hand × share% × honoring_rate\nVD: 2.500 × 60% × 92% = 1.380.\nATP Pass: 1.380 ≥ RPO 1.000 ✅.\n\nBPO quota: RPO trừ vào BPO.\nRPO > remaining → warning over-commitment.",
      },
    ],
    formulas: [
      { title: "Safety Stock", content: "SS = Z × σ_fc_error × √LT + Z × d_avg × σ_LT\nZ = 1.65 (service level 95%)\nσ_fc_error = std of FORECAST ERROR 12M (không phải σ_demand!)\nσ_LT = std of lead time 6M\n\nQUAN TRỌNG: dùng forecast error, không phải demand variation → SS nhỏ hơn 54%." },
      { title: "HSTK", content: "HSTK = Available ÷ Daily_demand\nAvailable = On_hand − Reserved + In_transit\nDaily_demand = Monthly_demand ÷ 30" },
      { title: "DRP Net", content: "Net_req = Demand − Available − Pipeline\nIf Net_req > 0 → shortage → create RPO\nIf Net_req < 0 → excess → LCNB candidate" },
    ],
  },
  CN_MANAGER: {
    heroDesc: "Bạn quản lý chi nhánh: điều chỉnh demand, xem tồn, trao đổi. 5-8 phút/ngày. Trước 18:00!",
    daily: [
      { route: "/cn-portal tab 1", label: "Điều chỉnh demand", time: "5 phút" },
      { route: "/cn-portal tab 2", label: "Tồn kho CN", time: "1 phút" },
      { route: "/cn-portal tab 3", label: "Trao đổi", time: "2 phút" },
    ],
    dailyTotal: "~8 phút/ngày",
    dailyIntro: "Mỗi ngày 8 phút: Adjust → Tồn kho → Trao đổi. Trước 18:00!",
    monthly: [
      { route: "/cn-portal", label: "Nhập điều chỉnh demand tháng", days: "Day 1-3" },
      { route: "/sop", label: "Xem kết quả consensus (read-only)", days: "Day 5-7" },
    ],
    tips: [
      { text: "⏱ Cutoff 18:00. Sau 18:00 không sửa. Nhập sớm = DRP đêm nay dùng số bạn." },
      { text: "🎤 Voice: nói thay gõ. \"Nhà thầu mới Hòa Bình\" → text tự điền. Nhanh hơn 6x." },
      { text: "Trust score: adjust đúng → trust tăng → tolerance mở rộng → auto-approve nhiều hơn." },
      { text: "Tab 2 Tồn kho: HSTK thấp → tăng demand → DRP đặt thêm NM → hàng về kịp." },
    ],
    steps: [],
    dailySteps: [
      {
        route: "/cn-portal tab 1", title: "Điều chỉnh demand", badge: "5 phút",
        collapsed: "Nhập số liệu thị trường mà hệ thống chưa biết. Input của bạn = 29% accuracy improvement.",
        why: "Bạn biết thị trường địa phương mà hệ thống không biết: nhà thầu mới, dự án delay, đối thủ giảm giá. Input của bạn = 29% accuracy improvement (FVA data).",
        what: "Bảng per SKU: 'Dự kiến (HQ)' = hệ thống tính từ S&OP. 'CN điều chỉnh' = bạn nhập. Delta auto-tính. Lý do bắt buộc >5%.",
        how: "1. Click ô số GA-300 A4 → nhập 568 (thay 524). Delta +44 (+8,4%).\n2. Lý do: gõ 'Nhà thầu mới Q2' HOẶC 🎤 nói 'nhà thầu mới Hòa Bình ký tháng 5'.\n3. Làm tương tự per SKU cần adjust. Không adjust = giữ nguyên.\n4. [Gửi điều chỉnh] → <10% auto-approve ✅. 10-30% chờ SC Manager 🟡. >30% blocked 🔴.\n5. Check ⏱ countdown: 'Cutoff 18:00 còn 3h'. Gửi trước!",
        formula: "Final_demand = Dự_kiến + CN_adjustment (nếu approved)\nTrust = Σ(|adjust−actual| < 20%) / total × 100%\n\nTrust >85% → auto-approve tất cả + tolerance ±40%\nTrust 60-85% → SC Manager duyệt + tolerance ±30%\nTrust <60% → tolerance ±15% + giải trình tất cả",
      },
      {
        route: "/cn-portal tab 2", title: "Tồn kho CN", badge: "1 phút",
        collapsed: "Biết SKU nào sắp hết → tăng demand → DRP đặt NM → hàng về trước stockout.",
        why: "Biết SKU nào sắp hết → tăng demand → DRP đặt NM → hàng về trước khi stockout.",
        what: "Bảng read-only: Tồn | SS target | SS gap | HSTK (bao nhiêu ngày còn hàng).",
        how: "GA-300 A4: HSTK 1,2d 🔴 (sắp hết!) → quay Tab 1 → tăng demand GA-300 A4.",
        formula: "",
      },
      {
        route: "/cn-portal tab 3", title: "Trao đổi", badge: "2 phút",
        collapsed: "Comment + file = evidence. SC Manager duyệt nhanh hơn khi thấy PO scan.",
        why: "Comment + file = evidence. SC Manager duyệt nhanh hơn khi thấy PO scan, hợp đồng.",
        what: "Thread per SKU. Text + 📎 file + 🎙 voice. @ mention.",
        how: "1. Comment 'Hòa Bình Group ký PO 500m²/tháng'.\n2. 📎 đính kèm PO scan.\n3. @Thúy → push cho SC Manager.",
        formula: "",
      },
    ],
    formulas: [
      { title: "Trust Score", content: "Trust = Σ(|adjust−actual| < 20%) / total_adjustments × 100%\n\nTrust >85% → auto-approve + tolerance ±40%\nTrust 60-85% → SC Manager duyệt + tolerance ±30%\nTrust <60% → tolerance ±15% + giải trình tất cả" },
    ],
  },
  SALES: {
    heroDesc: "Nhập deals B2B để planning chính xác. 15 phút/tuần. Deals sớm = planning tốt.",
    daily: [
      { route: "/demand tab 2", label: "Nhập/update B2B deals", time: "10 phút" },
      { route: "/cn-portal tab 3", label: "Comments & evidence", time: "5 phút" },
    ],
    dailyTotal: "~15 phút/tuần",
    dailyIntro: "Mỗi tuần 15 phút: update B2B pipeline + comment evidence.",
    monthly: [
      { route: "/demand", label: "Update B2B pipeline đầu tháng", days: "Day 1-3" },
      { route: "/sop", label: "Xem consensus (tab 1 read-only)", days: "Day 5" },
    ],
    monthlyIntro: "Đầu tháng: update full pipeline. Day 5: xem S&OP consensus result.",
    tips: [
      { text: "Xác suất chính xác = FVA tốt. 30%=Qualified, 70%=Proposal, 85%=Committed, 100%=PO." },
      { text: "Nhập sớm: deal lớn nhập ngay Day 1 → S&OP Day 5 đã có data." },
      { text: "FVA tracking: hệ thống so sánh bạn vs model. FVA dương = bạn tốt hơn AI." },
      { text: "Upload Excel nếu nhiều deals: template có sẵn [Download template]." },
    ],
    steps: [
      {
        route: "/demand tab 2", title: "Nhập B2B Deals", badge: "15 phút/tuần",
        collapsed: "B2B chiếm 29% demand. Không nhập → FC thiếu → mất khách.",
        why: "B2B chiếm 29% demand. Không nhập → FC chỉ dùng history → thiếu hàng cho deals mới → mất khách.",
        what: "Bảng CRUD: Khách + Dự án + CN + SKU + Qty + Xác suất% + Tháng giao. Upload Excel hoặc từng dòng.",
        how: "1. [+ Thêm deal] → form: Vingroup, Grand Park Ph.3, CN-BD+HN, GA-600 A4, 12.000m², 85%, Th5-Th6.\n2. Hoặc [Upload Excel] → drag-drop → preview → [Xác nhận].\n3. Deal có PO signed → PO status tự chuyển ✅. Hệ thống trừ overlap.\n4. Review deals cũ: update probability nếu thay đổi.",
        formula: "Weighted = qty_gốc × probability%\nVD: 12.000 × 85% = 10.200 (chỉ phần tháng này)\n\nProbability scale:\n10% Lead (chưa qualify) → KHÔNG tính vào demand\n30% Qualified → tính vào demand\n60-70% Proposal → tính cao\n85% Committed → tính gần chắc\n100% PO signed → chuyển sang PO confirmed",
      },
    ],
    dailySteps: [],
    formulas: [
      { title: "B2B Weighted Demand", content: "Weighted = qty × probability%\nVD: 12.000 × 85% = 10.200m²\n\nChỉ deals ≥30% mới tính vào demand.\nPO signed (100%) → chuyển sang PO confirmed, trừ overlap." },
    ],
  },
  BUYER: {
    heroDesc: "Chọn NM tối ưu, đặt hàng, theo dõi giao hàng. 15 phút/ngày + 30 phút/tháng.",
    daily: [
      { route: "/supply", label: "Update tồn NM", time: "5 phút" },
      { route: "/orders tab 1", label: "Duyệt & Post PO", time: "5 phút" },
      { route: "/orders tab 2", label: "Tracking & POD", time: "5 phút" },
    ],
    dailyTotal: "~15 phút/ngày",
    dailyIntro: "Mỗi ngày 15 phút: Supply → Orders Duyệt → Orders Tracking.",
    monthly: [
      { route: "/hub", label: "Sourcing NM + BPO", days: "Day 7-8" },
    ],
    monthlyIntro: "Mỗi tháng 30 phút: Sourcing NM sau S&OP Lock → tạo BPO.",
    tips: [
      { text: "NM Score transparent: hover row → breakdown LT/Cost/Reliability. Không pre-allocated ẩn." },
      { text: "Dual-source: chọn 2 NM (primary 80% + backup 20%) giảm risk." },
      { text: "BPO quota: RPO > BPO remaining → warning. Monitor quota mỗi tuần." },
      { text: "SHIP/HOLD: HSTK<3d → SHIP ngay (urgent). >14d → HOLD gộp container (tiết kiệm freight)." },
    ],
    steps: [
      {
        route: "/hub", title: "Sourcing NM + BPO", badge: "30 phút/tháng",
        collapsed: "Chọn NM quyết định: giá, tốc độ, độ tin cậy. Hệ thống ranking transparent — bạn quyết định.",
        why: "Chọn NM quyết định: giá (cost), tốc độ (LT), độ tin cậy (reliability). Sai NM = overdue + stockout + premium freight. Hệ thống ranking transparent — bạn quyết định, không phải hộp đen.",
        what: "4-step Sourcing Workbench:\nBước 1 'Cần gì?': 7 SKU, 5 cần sourcing (2 đủ hàng). Sort urgency (CRITICAL first).\nBước 2 'NM nào có?': 5 NM ranked. Score = weighted hybrid. Objective chọn được.\nBước 3 'Phân bổ': allocate qty per NM. Single/dual/custom. Sửa ratio slider hoặc input.\nBước 4 'MOQ + Gửi': round MOQ + POQ gộp tuần + container fit → [Tạo BPO].",
        how: "1. Bước 1: 'GA-300 A4 CRITICAL (HSTK 1,2d), 4 NM eligible.'\n2. Bước 2: click GA-300 A4 → ranking: Mikado 88★, Đồng Tâm 82, Vigracera 75, Toko 52⚠, Phú Mỹ offline.\n   Hover Mikado → score breakdown: LT 64×50% + Cost 0×30% + Reliability 92×20% = 88.\n   Đổi objective [Lowest Cost ▼] → Đồng Tâm #1 (170K vs 185K).\n3. Bước 3: chọn Mikado primary (700) + Đồng Tâm backup (140) = 840 covered ✅.\n4. Bước 4: Mikado total 1.067 → MOQ 1.000 → round 2.000. Surplus 933 → dùng tháng sau.\n   [Xác nhận & Tạo BPO] → BPO-MKD-2605 (2.000m²), BPO-DTM-2605 (500m²).",
        formula: "Score = W₁×(1−LT/max) + W₂×(1−cost/max) + W₃×reliability\nHybrid: 50/30/20. Shortest LT: 80/10/10. Lowest Cost: 10/80/10.\n\nMOQ = ceil(allocated ÷ MOQ_NM) × MOQ_NM\nPOQ = gộp 2 tuần demand → đặt 1 lần → tiết kiệm 1 chuyến container\nBPO = Purchase Agreement (Bravo). RPO = Purchase Order. ASN = Goods Receipt.",
      },
    ],
    dailySteps: [
      {
        route: "/supply", title: "Update tồn NM", badge: "5 phút",
        collapsed: "DRP cần data NM fresh. Stale >24h → DRP tính sai → PO fail.",
        why: "DRP cần data NM fresh. UNIS NM thường manual (Excel/phone), không API. Stale >24h → DRP tính sai → PO fail.",
        what: "Upload Excel hoặc nhập tay. 'UNIS dùng' = tồn × share% auto. Lớp 1 per NM. Stale → [Nhắc NM].",
        how: "1. Drag-drop file NM gửi sáng.\n2. Preview → [Xác nhận].\n3. NM chưa gửi → [Nhắc NM] push Supplier Portal.",
        formula: "UNIS_dùng = on_hand × share%\nVD: Mikado tồn 2.500 × 60% = 1.500 − reserved 120 = 1.380.",
      },
      {
        route: "/orders tab 1", title: "Duyệt & Post PO", badge: "5 phút",
        collapsed: "RPO từ DRP đêm qua = draft. Bạn là người duyệt cuối cùng trước khi NM nhận đơn.",
        why: "RPO từ DRP đêm qua = draft. Bạn là người duyệt cuối cùng trước khi NM nhận đơn trong Bravo.",
        what: "Per status summary → click drill. ATP check per PO. Force-release 3 cấp nếu cần.",
        how: "1. [Gửi ATP tất cả] → 4 DRAFT → 3 ATP Pass + 1 ATP Fail.\n2. ATP Fail (Toko stale): [Nhắc NM update tồn] → chờ → re-ATP. Hoặc [Force 3 cấp].\n3. ATP Pass → [Duyệt tất cả] → [Post Bravo]. Idempotent (safe retry).\n4. SHIP/HOLD: 'HSTK CN-BD 1,2d → SHIP ngay. HSTK CN-ĐN 19d → HOLD gộp container.'",
        formula: "ATP = on_hand × share% × honoring_rate\nVD: Mikado 2.500 × 60% × 92% = 1.380. RPO 1.000 ≤ 1.380 → Pass ✅.\n\nToko: data stale 18h → ATP = undefined → Fail ❌.\nForce-release: SC Manager → Director → CEO (3 cấp, risk-based).",
      },
      {
        route: "/orders tab 2", title: "Tracking & POD", badge: "5 phút",
        collapsed: "NM giao trễ = stockout CN. Track sớm = escalate sớm = ít impact.",
        why: "NM giao trễ = stockout CN. Track sớm = escalate sớm = ít impact.",
        what: "Per NM → per RPO → per ASN. Honoring% + On-time%. Overdue highlight.",
        how: "1. Toko overdue 8 ngày → [Nhắc NM].\n2. Click Toko honoring 68% → breakdown per RPO.\n3. Trend 3 tháng: 70% → 65% → 68% = getting worse → [Review meeting].",
        formula: "Honoring% = Σ(delivered) ÷ Σ(committed) × 100%\nOn-time% = (# PO on-time) ÷ (# PO total) × 100%\nOn-time = delivered ≤ ETA + grace 2d.\n\nNM Grade: A≥90% | B≥80% | C≥60% | D<60%\nGrade C → ATP auto-discount (×0.68). Grade D → xem xét thay NM.",
      },
    ],
    formulas: [
      { title: "NM Grade", content: "NM Grade: A≥90% | B≥80% | C≥60% | D<60%\n\nAuto-actions per grade:\nA: full ATP credit (×1.0), priority allocation\nB: standard (×0.9)\nC: ATP discount (×honoring%), review quarterly\nD: xem xét thay NM, escalate Director\n\nGrade = weighted(Honoring% × 60% + On-time% × 40%)" },
      { title: "ATP Check", content: "ATP = on_hand × share% × honoring_rate\nVD: 2.500 × 60% × 92% = 1.380\nATP Pass: 1.380 ≥ RPO 1.000 ✅\n\nBPO_remaining = committed − Σ(RPO_qty)\nRPO > remaining → over-commitment warning\n\nForce-release: bypass ATP → 3 cấp duyệt (SC → Director → CEO)" },
    ],
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
                {data.monthlyIntro || "Chu kỳ monthly: Day 1 thu thập → Day 5 S&OP meeting → Day 7 Lock → Day 8 gửi NM."}
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
            {data.dailyIntro || `Quy trình hàng ngày cho ${role.label}. Tổng thời gian: ${data.dailyTotal}.`}
          </p>

          {data.dailySteps.length > 0 ? (
            data.dailySteps.map((step, i) => (
              <StepCardComponent key={i} step={step} index={i} accentBg={role.accentBg} />
            ))
          ) : (
            /* Fallback: simple table */
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
          )}
        </div>
      )}

      {/* ═══ TAB: Công thức ═══ */}
      {activeTab === "formulas" && (
        <div className="space-y-4 animate-fade-in">
          {/* Role-specific formula cards */}
          {data.formulas.length > 0 && data.formulas.map((f, i) => (
            <div key={`rf-${i}`} className="rounded-card border border-surface-3 overflow-hidden">
              <div className="px-5 py-3 bg-surface-2 border-b border-surface-3">
                <h3 className="font-display text-body font-semibold text-text-1">{f.title}</h3>
              </div>
              <div className="px-5 py-4 bg-[#111827]">
                <pre className="text-table-sm text-emerald-300 whitespace-pre-wrap font-mono leading-relaxed">{f.content}</pre>
              </div>
            </div>
          ))}

          {/* Step formulas (monthly + daily) */}
          {[...data.steps, ...data.dailySteps].filter(s => s.formula).length > 0 && (
            <>
              <h3 className="font-display text-body font-semibold text-text-1 mt-6">Công thức theo bước</h3>
              {[...data.steps, ...data.dailySteps].filter(s => s.formula).map((step, i) => (
                <div key={`sf-${i}`} className="rounded-card border border-surface-3 overflow-hidden">
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

          {/* SC Manager only: key insight */}
          {selectedRole === "SC_MANAGER" && (
            <div className="rounded-card border-2 border-[#b45309]/40 bg-[#b45309]/5 p-5">
              <p className="text-table font-semibold text-[#b45309] mb-1">⚡ Insight quan trọng nhất</p>
              <p className="text-table-sm text-text-2 leading-relaxed">
                SS dùng <span className="font-mono font-semibold text-text-1">σ_fc_error</span> (sai số FC) không phải <span className="font-mono font-semibold text-text-1">σ_demand</span>.
                Tiết kiệm ~54% vốn. Đầu tư FC accuracy = cách tiết kiệm vốn tốt nhất.
              </p>
            </div>
          )}

          {data.formulas.length === 0 && [...data.steps, ...data.dailySteps].filter(s => s.formula).length === 0 && (
            <div className="rounded-card border border-surface-3 bg-surface-2 p-8 text-center">
              <p className="text-text-2">Chọn role <span className="font-medium text-text-1">SC Manager</span> để xem đầy đủ công thức.</p>
              <p className="text-table-sm text-text-3 mt-1">Hoặc truy cập <span className="font-mono text-primary">/logic</span> để xem chi tiết.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ Quick links + Footer ═══ */}
      <div className="mt-10 pt-6 border-t border-surface-3 space-y-3">
        <p className="text-table text-text-2">
          📚 Xem thêm:{" "}
          <a href="/logic" className="font-mono text-primary hover:underline">/logic — Logic vận hành chi tiết</a>
          {" | "}
          <a href="/config" className="font-mono text-primary hover:underline">/config — Cấu hình hệ thống</a>
        </p>
        <p className="text-caption text-text-3">SCP Smartlog v5.0 LEAN · 14 screens · 30 views</p>
      </div>
    </AppLayout>
  );
}

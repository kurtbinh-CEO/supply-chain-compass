import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { cn } from "@/lib/utils";
import { useRbac, UserRole } from "@/components/RbacContext";
import { ChevronDown, ChevronRight, ExternalLink, Clock, ArrowRight, Zap, Target, Building2, Briefcase, Factory, TrendingUp, BarChart3, ShieldCheck, Package, Truck, Calculator, MousePointerClick, Mic, AlertTriangle, CheckCircle2, XCircle, PlayCircle, Sparkles, GitBranch, Layers, Activity } from "lucide-react";
import { useWalkthrough, TourHighlight } from "@/components/WalkthroughContext";

/* ═══ TYPES ═══ */
type RoleKey = "SC_MANAGER" | "CN_MANAGER" | "SALES" | "BUYER";

const roleMap: Record<UserRole, RoleKey> = {
  SC_MANAGER: "SC_MANAGER", CN_MANAGER: "CN_MANAGER", SALES: "SALES", VIEWER: "SC_MANAGER",
};

interface RoleMeta {
  key: RoleKey; icon: React.ReactNode; label: string; sub: string;
  color: string; colorLight: string; colorText: string;
  heroDesc: string; timeDaily: string; timeMonthly: string;
}

const roleMeta: RoleMeta[] = [
  {
    key: "SC_MANAGER", icon: <Target className="h-6 w-6" />, label: "SC Manager", sub: "Điều phối toàn chuỗi",
    color: "#004AC6", colorLight: "#004AC6", colorText: "#004AC6",
    heroDesc: "Điều phối toàn bộ chuỗi cung ứng", timeDaily: "22'", timeMonthly: "2h",
  },
  {
    key: "CN_MANAGER", icon: <Building2 className="h-6 w-6" />, label: "CN Manager", sub: "Quản lý chi nhánh",
    color: "#00714d", colorLight: "#00714d", colorText: "#00714d",
    heroDesc: "Điều chỉnh demand & quản lý tồn kho CN", timeDaily: "8'", timeMonthly: "—",
  },
  {
    key: "SALES", icon: <Briefcase className="h-6 w-6" />, label: "Sales", sub: "Nhập B2B deals",
    color: "#7c3aed", colorLight: "#7c3aed", colorText: "#7c3aed",
    heroDesc: "Nhập deals B2B → planning chính xác", timeDaily: "15'/tuần", timeMonthly: "15'",
  },
  {
    key: "BUYER", icon: <Factory className="h-6 w-6" />, label: "Buyer", sub: "Đặt hàng NM",
    color: "#b45309", colorLight: "#b45309", colorText: "#b45309",
    heroDesc: "Chọn NM, đặt hàng, theo dõi giao hàng", timeDaily: "15'", timeMonthly: "30'",
  },
];

/* ═══ FLOW DATA ═══ */
interface FlowNode {
  route: string; label: string; time: string; icon: React.ReactNode;
  keyAction: string; kpi?: string;
  why: string; what: string; how: string; formula: string;
  highlights?: TourHighlight[];
}

interface FormulaViz {
  title: string; visual: React.ReactNode; detail: string;
}

interface RoleFlows {
  daily: FlowNode[];
  monthly: FlowNode[];
  tips: { icon: React.ReactNode; text: string }[];
  formulas: FormulaViz[];
}

const scFlows: RoleFlows = {
  daily: [
    {
      route: "/supply", label: "Tồn NM", time: "~2'", icon: <Package className="h-5 w-5" />,
      keyAction: "Kiểm tra NM cập nhật tồn", kpi: "Mới < 24h",
      why: "DRP cần data NM fresh. Stale >24h → DRP sai.", what: "Upload Excel hoặc nhập tay. UNIS dùng = tồn × share%.",
      how: "1. Drag-drop file NM\n2. Preview → [Xác nhận]\n3. NM chưa gửi → [Nhắc NM]", formula: "UNIS_dùng = on_hand × share%\nMikado: 2.500 × 60% = 1.500 − 120 = 1.380",
      highlights: [
        { selector: "supply-upload", label: "Upload Excel / Template", description: "Drag-drop file NM vào zone, hoặc click [Upload Excel]. Hệ thống validate trước khi import." },
        { selector: "supply-nm-table", label: "Bảng tồn kho NM", description: "Per NM: tổng tồn, UNIS dùng (= tồn × share%), đang về. NM stale → hàng đỏ, click [Nhắc NM]." },
      ],
    },
    {
      route: "/demand-weekly", label: "Nhu cầu tuần", time: "~5'", icon: <Activity className="h-5 w-5" />,
      keyAction: "Xem CN điều chỉnh trước cutoff", kpi: "CN đã điều chỉnh",
      why: "CN biết thị trường — adjust giúp DRP chính xác hơn.", what: "Bảng demand tuần per CN: Phased FC | CN adjust | Delta | Lý do.",
      how: "1. Mở /demand-weekly trước cutoff 18:00\n2. Xem CN nào chưa adjust → [Nhắc CN]\n3. Approve adjust hợp lý", formula: "Demand_tuần = FC_phased + Σ(CN_adjust)\nDelta >5% → cần lý do",
    },
    {
      route: "/drp", label: "Xem DRP", time: "~10'", icon: <GitBranch className="h-5 w-5" />,
      keyAction: "DRP chạy 23:00 — xem kết quả", kpi: "Lấp đầy ≥ 95%",
      why: "DRP đêm qua tính 95% OK. Focus 5% exceptions.", what: "3 lớp: Kết quả → Cách tính → Điều chỉnh.",
      how: "1. CN-BD 86%, 2 exceptions\n2. GA-300 SHORTAGE 345\n3. Lateral / PO mới / Kết hợp", formula: "Net = Demand − On_hand − Pipeline + SS\n617 − 120 − 557 + 900 = 840\nSS = z × σ_fc_error × √LT",
      highlights: [
        { selector: "drp-header", label: "Header & Chạy DRP", description: "Xem lần chạy cuối + badge exceptions. Click [Chạy DRP] để chạy lại ngay bất kỳ lúc nào." },
        { selector: "drp-exceptions-badge", label: "Exceptions Badge", description: "Số exceptions đỏ = các SKU cần xử lý thủ công. Focus 5% này, 95% OK auto." },
        { selector: "drp-controls", label: "Controls: Tham số & Pivot", description: "Toggle Tham số (Lớp 3) hoặc đổi Pivot CN↔SKU để xem 2 góc nhìn khác nhau." },
        { selector: "drp-results-table", label: "Bảng kết quả per CN", description: "Click hàng CN-BD (fill 86%) → drill xuống Lớp 2 xem SKU exceptions + 3 options giải quyết." },
      ],
    },
    {
      route: "/allocation", label: "Phân bổ", time: "~5'", icon: <Layers className="h-5 w-5" />,
      keyAction: "LCNB + Hub Pool + exceptions", kpi: "0 thiếu hàng",
      why: "Phân bổ đúng → không thiếu hàng + tận dụng LCNB.", what: "6 lớp phân bổ: LCNB → Hub Pool → NM Primary → Backup → Spot → Exception.",
      how: "1. Xem priority queue\n2. LCNB first → tiết kiệm cước\n3. Hub Pool → netting NM commits\n4. Exception → escalate SC", formula: "Priority = HSTK_gap × revenue_at_risk\nLCNB tiết kiệm 8-12% cước",
    },
    {
      route: "/orders?tab=packing", label: "Đóng hàng", time: "~5'", icon: <Package className="h-5 w-5" />,
      keyAction: "Gom PO vào container, chọn nhà xe", kpi: "Lấp đầy ≥ 85%",
      why: "Container đầy → tiết kiệm cước. Xe trống = lãng phí.", what: "Gom PO theo tuyến NM→CN. Hold-or-Ship rule: <60% HOLD, 60-85% TOP-UP, ≥85% SHIP.",
      how: "1. Xem container fill%\n2. <60% → HOLD chờ gom\n3. Chọn nhà xe (Vinatrans/Gemadept)\n4. Override nếu CN cần gấp", formula: "Fill% = loaded / capacity\n40ft cap = 1.800m² · 20ft cap = 900m²",
    },
    {
      route: "/orders?tab=approval", label: "Duyệt PO", time: "~5'", icon: <CheckCircle2 className="h-5 w-5" />,
      keyAction: "Duyệt PO/TO trước khi gửi NM", kpi: "0 chờ duyệt",
      why: "NM chỉ sản xuất khi nhận PO trong Bravo.", what: "ATP check → Duyệt → Post. SHIP/HOLD inline.",
      how: "1. [Gửi ATP tất cả]\n2. Pass → [Duyệt tất cả]\n3. [Post Bravo]", formula: "ATP = on_hand × share% × honoring\n2.500 × 60% × 92% = 1.380",
      highlights: [
        { selector: "orders-tabs", label: "5 Tab: Đóng hàng / Duyệt / Theo dõi / Chuyển ngang / Nhà xe", description: "Workflow lifecycle PO từ đóng hàng đến giao hàng." },
        { selector: "orders-status-table", label: "Status Summary Table", description: "Click hàng status → drill xuống danh sách PO cụ thể. Action buttons per status: [Gửi ATP] → [Duyệt] → [Post Bravo]." },
      ],
    },
  ],
  monthly: [
    {
      route: "/demand", label: "Nhập nhu cầu", time: "Ngày 1-3", icon: <BarChart3 className="h-5 w-5" />,
      keyAction: "FC + B2B pipeline", kpi: "7.650 m²",
      why: "Demand = nền tảng mọi quyết định. Sai demand → sai tất cả.", what: "Tab 1: tổng per CN. Tab 2: B2B deals. Click số → breakdown.",
      how: "1. /demand tab 1 → trend 12M\n2. Click cell → FC + B2B + PO breakdown\n3. Tab 2: review deals\n4. Ready → /sop",
      formula: "Demand = FC + Σ(B2B × prob%) + PO − Overlap\n4.800 + 2.200 + 1.100 − 450 = 7.650",
      highlights: [
        { selector: "demand-header", label: "Header & AOP Badges", description: "AOP 2026 target + YTD progress. Badges show bạn đang ở đâu vs. kế hoạch năm." },
        { selector: "demand-tabs", label: "2 Tab: Demand tổng & B2B", description: "Tab 1: Demand per CN (FC + B2B + PO). Tab 2: Nhập/quản lý B2B deals." },
        { selector: "demand-total-table", label: "Bảng Demand per CN", description: "Click số → breakdown FC/B2B/PO. Trend 12 tháng. Pivot CN↔SKU." },
      ],
    },
    {
      route: "/sop", label: "Đồng thuận S&OP", time: "Ngày 3-5", icon: <ShieldCheck className="h-5 w-5" />,
      keyAction: "So sánh v0→v4, khóa demand", kpi: "1 số đồng ý",
      why: "4 bộ phận, 4 con số → phải ĐỒNG Ý 1 số.", what: "Tab 1: 4 versions × FVA. Tab 2: FormulaBar 6 ô → Lock.",
      how: "1. v0/v1/v2 → FVA chọn best\n2. FormulaBar: D−S−P=Net+SS=FCMin\n3. [🔒 Lock] → phasing auto",
      formula: "Net = D − S − P = 7.650 − 3.200 − 1.757 = 2.693\nFVA = MAPE(v0) − MAPE(vX)\nFVA_CN = 8,1% − 2,2% = +5,9%",
      highlights: [
        { selector: "sop-status", label: "Status Strip & Lock Countdown", description: "Day 5/30, Lock Day 7 — còn 2 ngày. Sau lock, demand frozen cho DRP." },
        { selector: "sop-consensus", label: "Consensus Tab: 4 Versions", description: "v0 (Stat) → v1 (Sales) → v2 (CN) → v3 (Consensus). FVA chọn version tốt nhất per CN." },
        { selector: "sop-balance", label: "Cân đối & Lock", description: "FormulaBar: D − S − P = Net + SS = FC Min. Click [🔒 Lock] khi đồng ý 1 số." },
      ],
    },
    {
      route: "/supply", label: "Tính đặt hàng", time: "Ngày 5-6", icon: <Calculator className="h-5 w-5" />,
      keyAction: "Booking netting per SKU", kpi: "Booking ready",
      why: "Booking = cam kết với NM trước khi đặt PO chính thức.", what: "Booking per SKU: Demand_locked − On_hand − Pipeline + SS.",
      how: "1. Mở /supply → Booking tab\n2. Netting per SKU\n3. Confirm → gửi NM cam kết", formula: "Booking = Σ(Demand_locked) − Inventory − Pipeline + SS",
    },
    {
      route: "/hub", label: "Cam kết NM", time: "Ngày 6-7", icon: <Factory className="h-5 w-5" />,
      keyAction: "Hard/Firm/Soft → NM xác nhận", kpi: "Honoring ≥ 85%",
      why: "NM cam kết 3 mức: Hard (chốt) / Firm (90%) / Soft (60%).", what: "Workbench rank NM, gửi cam kết, theo dõi response.",
      how: "1. Rank NM (Score = LT×50 + Cost×30 + Rel×20)\n2. Gửi Hard/Firm/Soft\n3. NM confirm → tạo BPO",
      formula: "Score = W₁×LT + W₂×Cost + W₃×Reliability\nHybrid: 50/30/20",
    },
    {
      route: "/hub", label: "Hub ảo", time: "Ngày 7-8", icon: <Layers className="h-5 w-5" />,
      keyAction: "Hub = Σ confirmed − released − SS", kpi: "Hub balance",
      why: "Hub ảo = tổng cam kết NM trừ đã release, dùng cho allocation.", what: "Real-time Hub balance per SKU. Dùng cho phân bổ DRP hằng ngày.",
      how: "1. Xem Hub balance per SKU\n2. So sánh vs Demand tuần\n3. Gap → kích hoạt kịch bản",
      formula: "Hub = Σ(NM_confirmed) − Σ(Released_PO) − SS_buffer",
    },
    {
      route: "/gap-scenario", label: "Gap & Kịch bản", time: "Ngày 8-10", icon: <AlertTriangle className="h-5 w-5" />,
      keyAction: "4 kịch bản, AI khuyến nghị", kpi: "Gap closed",
      why: "Khi Hub < Demand → cần kịch bản đóng gap.", what: "4 kịch bản: A (NM thêm) | B (Spot mua) | C (Giảm SS) | D (Delay demand).",
      how: "1. Xem gap per SKU\n2. AI rank 4 kịch bản\n3. Chọn → execute",
      formula: "Gap = Demand_locked − Hub_available\nKịch bản chọn: min(cost) + max(fill_rate)",
    },
  ],
  tips: [
    { icon: <MousePointerClick className="h-4 w-4" />, text: "✨ Nhấn bất kỳ số → xem nguồn gốc" },
    { icon: <Calculator className="h-4 w-4" />, text: "📊 Thanh công thức /sop: 6 ô nhấn được" },
    { icon: <Zap className="h-4 w-4" />, text: "▶ [Chạy DRP] bất kỳ lúc nào" },
    { icon: <TrendingUp className="h-4 w-4" />, text: "🔄 Xoay bảng: CN ↔ Mã hàng — 2 góc nhìn" },
  ],
  formulas: [
    {
      title: "Safety Stock",
      visual: <FormulaBarViz parts={[
        { label: "Z", value: "1.65", sub: "SL 95%" },
        { label: "×", value: "", sub: "" },
        { label: "σ_fc_err", value: "28.5", sub: "forecast error", highlight: true },
        { label: "×", value: "", sub: "" },
        { label: "√LT", value: "√14", sub: "lead time" },
        { label: "=", value: "", sub: "" },
        { label: "SS", value: "176", sub: "m²/SKU", result: true },
      ]} />,
      detail: "σ_fc_error (sai số FC) KHÔNG PHẢI σ_demand → tiết kiệm 54% vốn",
    },
    {
      title: "Demand Total",
      visual: <FormulaBarViz parts={[
        { label: "FC", value: "4.800", sub: "statistical" },
        { label: "+", value: "", sub: "" },
        { label: "B2B", value: "2.200", sub: "weighted" },
        { label: "+", value: "", sub: "" },
        { label: "PO", value: "1.100", sub: "confirmed" },
        { label: "−", value: "", sub: "" },
        { label: "Overlap", value: "450", sub: "" },
        { label: "=", value: "", sub: "" },
        { label: "Demand", value: "7.650", sub: "m²", result: true },
      ]} />,
      detail: "FC: Holt-Winters/XGBoost, MAPE 18,4%. B2B: deals ≥30% prob.",
    },
    {
      title: "NM Score",
      visual: <NmScoreViz />,
      detail: "Hybrid 50/30/20 · Shortest LT 80/10/10 · Lowest Cost 10/80/10",
    },
  ],
};

const cnFlows: RoleFlows = {
  daily: [
    {
      route: "/cn-portal", label: "Điều chỉnh", time: "5'", icon: <TrendingUp className="h-5 w-5" />,
      keyAction: "Nhập số → Gửi", kpi: "FVA +29%",
      why: "Bạn biết thị trường mà hệ thống không biết.", what: "Per SKU: Dự kiến → CN điều chỉnh → Delta auto. Lý do >5%.",
      how: "1. Click ô → nhập 568 (thay 524)\n2. Lý do hoặc 🎤 voice\n3. [Gửi] → <10% auto ✅", formula: "Trust = Σ(|adjust−actual|<20%) / total\n>85% auto-approve · 60-85% SC duyệt · <60% giải trình",
      highlights: [
        { selector: "cn-header", label: "Header & Trust Score", description: "Trust Score 82% 🟢 — auto-approve nếu >85%. Cutoff 18:00 — nhập sớm!" },
        { selector: "cn-tabs", label: "4 Tab: Adjust / Tồn / Chat / Audit", description: "Tab 1: Điều chỉnh demand. Tab 2: Tồn kho CN. Tab 3: Trao đổi với SC. Tab 4: Lịch sử." },
        { selector: "cn-adjust-table", label: "Bảng điều chỉnh demand", description: "Per SKU: Dự kiến (HQ) → CN điều chỉnh → Delta auto. Lý do bắt buộc nếu delta >5%." },
      ],
    },
    {
      route: "/cn-portal", label: "Tồn kho", time: "1'", icon: <Package className="h-5 w-5" />,
      keyAction: "Check HSTK", kpi: "HSTK >3d",
      why: "SKU sắp hết → tăng demand → DRP đặt NM.", what: "Read-only: Tồn | SS | HSTK.",
      how: "HSTK 1,2d 🔴 → Tab 1 tăng demand", formula: "",
    },
    {
      route: "/cn-portal", label: "Trao đổi", time: "2'", icon: <Mic className="h-5 w-5" />,
      keyAction: "Comment + Evidence", kpi: "Response <4h",
      why: "Evidence = SC Manager duyệt nhanh.", what: "Thread per SKU. Text + file + voice. @mention.",
      how: "1. Comment + 📎 PO scan\n2. @Thúy → push SC", formula: "",
    },
  ],
  monthly: [],
  tips: [
    { icon: <Clock className="h-4 w-4" />, text: "Cutoff 18:00 — nhập sớm!" },
    { icon: <Mic className="h-4 w-4" />, text: "Voice: nói thay gõ, nhanh 6x" },
    { icon: <ShieldCheck className="h-4 w-4" />, text: "Trust cao → auto-approve nhiều" },
  ],
  formulas: [
    {
      title: "Trust Score & Tolerance",
      visual: <TrustScoreViz />,
      detail: "Adjust đúng liên tục → trust tăng → tolerance mở rộng",
    },
  ],
};

const salesFlows: RoleFlows = {
  daily: [],
  monthly: [
    {
      route: "/demand", label: "B2B Deals", time: "15'/tuần", icon: <Briefcase className="h-5 w-5" />,
      keyAction: "Thêm/Update deals", kpi: "29% demand",
      why: "B2B = 29% demand. Không nhập → thiếu hàng.", what: "CRUD: Khách + SKU + Qty + Prob%. Upload Excel.",
      how: "1. [+ Thêm deal] → form\n2. Hoặc Upload Excel\n3. Update prob. nếu thay đổi",
      formula: "Weighted = qty × prob%\n12.000 × 85% = 10.200 m²",
      highlights: [
        { selector: "demand-tabs", label: "Tab B2B nhập liệu", description: "Click Tab 2 \'B2B nhập liệu\' để nhập/quản lý deals. Deals tự tính weighted demand." },
        { selector: "demand-b2b-table", label: "Bảng B2B Deals", description: "CRUD: Khách + SKU + Qty + Prob%. Upload Excel. Deals ≥30% prob tự cộng vào Demand." },
      ],
    },
  ],
  tips: [
    { icon: <Target className="h-4 w-4" />, text: "30% Qualified → 85% Committed → 100% PO" },
    { icon: <Zap className="h-4 w-4" />, text: "Nhập sớm Day 1 → S&OP Day 5 có data" },
    { icon: <TrendingUp className="h-4 w-4" />, text: "FVA dương = bạn tốt hơn AI" },
  ],
  formulas: [
    {
      title: "FVA & Probability",
      visual: <ProbabilityViz />,
      detail: "FVA = MAPE(model) − MAPE(bạn). Dương = bạn giỏi hơn AI.",
    },
  ],
};

const buyerFlows: RoleFlows = {
  daily: [
    {
      route: "/supply", label: "Tồn NM", time: "5'", icon: <Package className="h-5 w-5" />,
      keyAction: "Upload → Xác nhận", kpi: "Fresh <24h",
      why: "DRP cần data NM fresh. Stale → PO fail.", what: "Upload Excel. UNIS dùng = tồn × share%.",
      how: "1. Drag-drop file\n2. [Xác nhận]\n3. Stale → [Nhắc NM]", formula: "UNIS_dùng = on_hand × share%",
    },
    {
      route: "/orders", label: "Duyệt PO", time: "5'", icon: <CheckCircle2 className="h-5 w-5" />,
      keyAction: "ATP → Duyệt → Post", kpi: "0 draft",
      why: "Bạn duyệt cuối cùng trước khi NM nhận đơn.", what: "ATP check → Duyệt → Post Bravo. Force 3 cấp.",
      how: "1. [Gửi ATP tất cả]\n2. Pass → [Duyệt]\n3. [Post Bravo]", formula: "ATP = on_hand × share% × honoring\nPass: ATP ≥ RPO qty",
    },
    {
      route: "/orders", label: "Tracking", time: "5'", icon: <Truck className="h-5 w-5" />,
      keyAction: "Monitor NM delivery", kpi: "On-time ≥90%",
      why: "NM trễ = stockout CN. Track sớm = escalate sớm.", what: "Per NM → RPO → ASN. Honoring% + On-time%.",
      how: "1. Overdue → [Nhắc NM]\n2. Honoring <70% → [Review]\n3. Trend 3 tháng", formula: "Honoring% = delivered ÷ committed\nGrade: A≥90 B≥80 C≥60 D<60",
    },
  ],
  monthly: [
    {
      route: "/hub", label: "Sourcing", time: "30'", icon: <Factory className="h-5 w-5" />,
      keyAction: "Rank → Allocate → BPO", kpi: "BPO created",
      why: "Sai NM = overdue + stockout. Ranking transparent.", what: "4 bước: Cần gì → NM rank → Phân bổ → MOQ + BPO.",
      how: "1. CRITICAL → 4 NM eligible\n2. Mikado 88★ #1\n3. Primary 700 + Backup 140\n4. [Tạo BPO]",
      formula: "Score = W₁×LT + W₂×Cost + W₃×Rel\nMOQ = ceil(alloc ÷ MOQ) × MOQ",
      highlights: [
        { selector: "hub-tabs", label: "Sourcing & Đối chiếu", description: "Tab 1: Sourcing Workbench 4 bước. Tab 2: Đối chiếu BPO vs NM delivery." },
        { selector: "hub-sourcing", label: "4-Step Sourcing", description: "① SKU cần mua (CRITICAL/MEDIUM) → ② NM ranking → ③ Primary/Backup phân bổ → ④ MOQ round-up + BPO." },
      ],
    },
  ],
  tips: [
    { icon: <Target className="h-4 w-4" />, text: "NM Score transparent — hover = breakdown" },
    { icon: <ShieldCheck className="h-4 w-4" />, text: "Dual-source: 80% primary + 20% backup" },
    { icon: <AlertTriangle className="h-4 w-4" />, text: "HSTK<3d → SHIP · >14d → HOLD gộp" },
  ],
  formulas: [
    {
      title: "NM Grade & ATP",
      visual: <NmGradeViz />,
      detail: "Grade C → ATP discount. Grade D → xem xét thay NM.",
    },
  ],
};

const allFlows: Record<RoleKey, RoleFlows> = {
  SC_MANAGER: scFlows, CN_MANAGER: cnFlows, SALES: salesFlows, BUYER: buyerFlows,
};

/* ═══════════════════════════════════════════ */
/*  ANIMATION HOOKS                           */
/* ═══════════════════════════════════════════ */

function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCountUp(target: number, inView: boolean, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setValue(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);
  return value;
}

/* ═══════════════════════════════════════════ */
/*  VISUAL COMPONENTS                         */
/* ═══════════════════════════════════════════ */

/* Formula bar visualization */
function FormulaBarViz({ parts }: { parts: { label: string; value: string; sub: string; highlight?: boolean; result?: boolean }[] }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref} className="flex items-center gap-1.5 flex-wrap py-2">
      {parts.map((p, i) => {
        if (p.label === "×" || p.label === "+" || p.label === "−" || p.label === "=" || p.label === "/")
          return <span key={i} className="text-text-3 font-mono text-body font-light mx-1">{p.label}</span>;
        return (
          <AnimatedFormulaCell key={i} part={p} inView={inView} delay={i * 80} />
        );
      })}
    </div>
  );
}

function AnimatedFormulaCell({ part: p, inView, delay }: {
  part: { label: string; value: string; sub: string; highlight?: boolean; result?: boolean };
  inView: boolean; delay: number;
}) {
  const numericValue = parseFloat(p.value.replace(/[,.]/g, ""));
  const isNumeric = !isNaN(numericValue) && p.value.length > 0;
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, [inView, delay]);

  const countedValue = useCountUp(isNumeric ? numericValue : 0, show, 700);

  const formatValue = (v: number) => {
    if (p.value.includes(".")) {
      const parts = p.value.split(".");
      return v.toLocaleString("vi-VN") + (parts[1] ? "" : "");
    }
    if (p.value.includes(",")) return v.toLocaleString("vi-VN");
    return v.toLocaleString("vi-VN");
  };

  return (
    <div className={cn(
      "flex flex-col items-center px-3 py-2 rounded-lg min-w-[56px] transition-all duration-500",
      p.result ? "bg-primary/15 ring-2 ring-primary/30" :
      p.highlight ? "bg-[#b45309]/10 ring-1 ring-[#b45309]/30" :
      "bg-surface-1",
      show ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"
    )}>
      <span className={cn(
        "font-mono text-body font-bold tabular-nums",
        p.result ? "text-primary" : p.highlight ? "text-[#b45309]" : "text-text-1"
      )}>
        {isNumeric && show ? formatValue(countedValue) : p.value}
      </span>
      <span className="text-[10px] text-text-3 font-medium mt-0.5">{p.label}</span>
      {p.sub && <span className="text-[9px] text-text-3/60">{p.sub}</span>}
    </div>
  );
}

/* NM Score radar-like viz */
function NmScoreViz() {
  const { ref, inView } = useInView();
  const nms = [
    { name: "Mikado", score: 88, lt: 64, cost: 100, rel: 92, star: true },
    { name: "Đồng Tâm", score: 82, lt: 78, cost: 82, rel: 85, star: false },
    { name: "Toko", score: 52, lt: 45, cost: 90, rel: 68, star: false },
  ];
  return (
    <div ref={ref} className="space-y-2 py-2">
      {nms.map((nm, idx) => {
        const animScore = useCountUp(nm.score, inView, 900 + idx * 200);
        return (
          <div key={nm.name} className="flex items-center gap-3">
            <span className={cn("font-display text-table font-semibold w-20 shrink-0", nm.star ? "text-primary" : nm.score < 60 ? "text-status-danger" : "text-text-1")}>
              {nm.name} {nm.star && "★"}
            </span>
            <div className="flex-1 flex items-center gap-1.5">
              <ScoreBar label="LT" value={nm.lt} max={100} color="#004AC6" animate={inView} delay={idx * 150} />
              <ScoreBar label="Cost" value={nm.cost} max={100} color="#00714d" animate={inView} delay={idx * 150 + 50} />
              <ScoreBar label="Rel" value={nm.rel} max={100} color="#b45309" animate={inView} delay={idx * 150 + 100} />
            </div>
            <span className={cn(
              "font-mono text-body font-bold w-10 text-right tabular-nums",
              nm.score >= 80 ? "text-primary" : nm.score < 60 ? "text-status-danger" : "text-text-1"
            )}>{animScore}</span>
          </div>
        );
      })}
      <div className="flex items-center gap-4 mt-1 text-[10px] text-text-3">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#004AC6]" />LT ×50%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#00714d]" />Cost ×30%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#b45309]" />Rel ×20%</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max, color, animate, delay }: { label: string; value: number; max: number; color: string; animate?: boolean; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setWidth((value / max) * 100), delay || 0);
    return () => clearTimeout(t);
  }, [animate, value, max, delay]);
  return (
    <div className="flex-1">
      <div className="h-3 rounded-full bg-surface-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${animate ? width : (value / max) * 100}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
    </div>
  );
}

/* Trust Score tiers */
function TrustScoreViz() {
  const tiers = [
    { range: ">85%", label: "Auto-approve", tolerance: "±40%", color: "bg-status-success", textColor: "text-status-success" },
    { range: "60-85%", label: "SC duyệt", tolerance: "±30%", color: "bg-status-warning", textColor: "text-status-warning" },
    { range: "<60%", label: "Giải trình", tolerance: "±15%", color: "bg-status-danger", textColor: "text-status-danger" },
  ];
  return (
    <div className="flex gap-3 py-2">
      {tiers.map((t) => (
        <div key={t.range} className="flex-1 rounded-lg border border-surface-3 p-3 text-center">
          <div className={cn("h-2 rounded-full mb-2 mx-auto w-16", t.color)} />
          <div className="font-mono text-body font-bold text-text-1">{t.range}</div>
          <div className="text-table-sm text-text-2 mt-0.5">{t.label}</div>
          <div className={cn("text-caption font-medium mt-1", t.textColor)}>Tolerance {t.tolerance}</div>
        </div>
      ))}
    </div>
  );
}

/* Probability pipeline viz */
function ProbabilityViz() {
  const stages = [
    { pct: "10%", label: "Lead", included: false },
    { pct: "30%", label: "Qualified", included: true },
    { pct: "70%", label: "Proposal", included: true },
    { pct: "85%", label: "Committed", included: true },
    { pct: "100%", label: "PO Signed", included: true },
  ];
  return (
    <div className="flex items-center gap-0 py-3">
      {stages.map((s, i) => (
        <React.Fragment key={s.pct}>
          <div className={cn(
            "flex flex-col items-center px-3 py-2 rounded-lg border transition-all flex-1 text-center",
            s.included ? "border-primary/30 bg-primary/5" : "border-surface-3 bg-surface-1 opacity-50"
          )}>
            <span className={cn("font-mono text-body font-bold", s.included ? "text-primary" : "text-text-3")}>{s.pct}</span>
            <span className="text-[10px] text-text-2 mt-0.5">{s.label}</span>
            {!s.included && <XCircle className="h-3 w-3 text-status-danger mt-1" />}
            {s.included && <CheckCircle2 className="h-3 w-3 text-status-success mt-1" />}
          </div>
          {i < stages.length - 1 && <ArrowRight className="h-3 w-3 text-text-3 shrink-0 mx-0.5" />}
        </React.Fragment>
      ))}
    </div>
  );
}

/* NM Grade viz */
function NmGradeViz() {
  const grades = [
    { grade: "A", min: "≥90%", action: "Full ATP ×1.0", color: "text-status-success", bg: "bg-status-success" },
    { grade: "B", min: "≥80%", action: "Standard ×0.9", color: "text-primary", bg: "bg-primary" },
    { grade: "C", min: "≥60%", action: "Discount ×honoring", color: "text-status-warning", bg: "bg-status-warning" },
    { grade: "D", min: "<60%", action: "Xem xét thay NM", color: "text-status-danger", bg: "bg-status-danger" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 py-2">
      {grades.map((g) => (
        <div key={g.grade} className="rounded-lg border border-surface-3 p-3 text-center">
          <div className={cn("font-display text-section-header font-bold", g.color)}>{g.grade}</div>
          <div className={cn("h-1.5 rounded-full mx-auto w-12 my-1.5", g.bg)} />
          <div className="font-mono text-caption text-text-2">{g.min}</div>
          <div className="text-[10px] text-text-3 mt-1">{g.action}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  FLOW TIMELINE COMPONENT                   */
/* ═══════════════════════════════════════════ */

function FlowTimeline({ nodes, accentColor, onNavigate }: { nodes: FlowNode[]; accentColor: string; onNavigate: (node: FlowNode, flowArray?: FlowNode[], nodeIdx?: number) => void }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (nodes.length === 0) return (
    <div className="rounded-card border border-surface-3 bg-surface-1/50 p-8 text-center">
      <p className="text-text-3 text-table">Không có quy trình cho phần này.</p>
    </div>
  );

  return (
    <div className="relative">
      {/* Vertical connector line */}
      <div className="absolute left-[27px] top-8 bottom-8 w-[2px] bg-surface-3" />

      <div className="space-y-3">
        {nodes.map((node, i) => {
          const isExpanded = expandedIdx === i;
          return (
            <div key={i} className="relative">
              <div
                className={cn(
                  "rounded-card border bg-surface-0 overflow-hidden transition-all cursor-pointer hover:shadow-md",
                  isExpanded ? "border-primary/30 shadow-md" : "border-surface-3"
                )}
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
              >
                {/* Main row */}
                <div className="flex items-center gap-4 px-4 py-3.5">
                  {/* Circle node */}
                  <div
                    className="relative z-10 flex items-center justify-center h-[54px] w-[54px] rounded-xl shrink-0 text-white shadow-sm"
                    style={{ backgroundColor: accentColor }}
                  >
                    {node.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-body font-semibold text-text-1">{node.label}</span>
                      <span className="rounded-sm bg-surface-3 text-text-3 text-[10px] font-mono px-1.5 py-0.5">{node.route}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-table-sm text-text-2">
                        <Clock className="h-3 w-3" />{node.time}
                      </span>
                      <span className="text-table-sm text-text-2">→ {node.keyAction}</span>
                    </div>
                  </div>

                  {/* KPI badge */}
                  {node.kpi && (
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-text-3 uppercase tracking-wider">Target</div>
                      <div className="font-mono text-table font-bold text-primary">{node.kpi}</div>
                    </div>
                  )}

                  {/* Expand indicator */}
                  <div className="shrink-0">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-text-3" /> : <ChevronRight className="h-4 w-4 text-text-3" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-surface-3">
                    {/* Visual action strip */}
                    <div className="px-4 py-3 bg-surface-1/50 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div>
                          <div className="text-[10px] text-text-3 uppercase tracking-wider mb-0.5">Tại sao</div>
                          <p className="text-table-sm text-text-2 max-w-md">{node.why}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onNavigate(node, nodes, i); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-button bg-primary text-primary-foreground text-table-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Mở {node.route.split(" ")[0]}
                      </button>
                    </div>

                    {/* How steps - visual */}
                    <div className="px-4 py-3 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-text-3 uppercase tracking-wider mb-2">Các bước</div>
                        <div className="space-y-1.5">
                          {node.how.split("\n").map((line, li) => (
                            <div key={li} className="flex items-start gap-2 text-table-sm">
                              <span className="flex items-center justify-center h-4 w-4 rounded-full text-[9px] font-bold shrink-0 mt-0.5" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
                                {li + 1}
                              </span>
                              <span className="text-text-2">{line.replace(/^\d+\.\s*/, "")}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Formula mini */}
                      {node.formula && (
                        <div>
                          <div className="text-[10px] text-text-3 uppercase tracking-wider mb-2">Công thức</div>
                          <div className="rounded-lg bg-[#111827] p-3">
                            <pre className="text-[11px] text-emerald-300 font-mono whitespace-pre-wrap leading-relaxed">{node.formula}</pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ */
/*  DEMO UNIS 7 PHÚT — 7 STEPS                */
/* ═══════════════════════════════════════════ */

interface DemoStep {
  num: number;
  route: string;
  routeLabel: string;
  title: string;
  duration: string;
  icon: React.ReactNode;
  color: string;
  highlights: string[];
  keyAction: string;
  metric: { label: string; value: string }[];
}

const demoSteps: DemoStep[] = [
  {
    num: 1,
    route: "/demand",
    routeLabel: "Demand Review",
    title: "Demand 15 SKU — nền tảng kế hoạch",
    duration: "1'",
    icon: <BarChart3 className="h-5 w-5" />,
    color: "#004AC6",
    highlights: [
      "Tab 1: 15 SKU × 4 CN — tổng 47.000 m² nhu cầu tháng",
      "Tab 2: 15 B2B deals (Vinhomes, Sun Group...) — weighted theo prob%",
      "Click số bất kỳ → breakdown FC + B2B + PO",
    ],
    keyAction: "Xác nhận demand → mở /sop",
    metric: [
      { label: "SKU", value: "15" },
      { label: "Tổng nhu cầu", value: "47.000 m²" },
      { label: "B2B deals", value: "15" },
    ],
  },
  {
    num: 2,
    route: "/sop",
    routeLabel: "S&OP Consensus",
    title: "S&OP — đồng thuận v0→v4 và lock",
    duration: "1'",
    icon: <ShieldCheck className="h-5 w-5" />,
    color: "#7c3aed",
    highlights: [
      "v0 (Stat) → v1 (Sales) → v2 (CN) → v3 (Consensus) → v4 (Final)",
      "Variance bar: chênh lệch giữa các version → FVA chọn best",
      "FormulaBar 6 ô: D − S − P = Net + SS = FC Min → [🔒 Lock]",
    ],
    keyAction: "Lock S&OP → mở /supply",
    metric: [
      { label: "Versions", value: "v0 → v4" },
      { label: "Best FVA", value: "+5,9%" },
      { label: "Status", value: "🔒 Lock" },
    ],
  },
  {
    num: 3,
    route: "/supply",
    routeLabel: "NM Supply",
    title: "Booking 4.500 m² — kiểm tra fresh",
    duration: "1'",
    icon: <Package className="h-5 w-5" />,
    color: "#00714d",
    highlights: [
      "5 NM (Toko, Mikado, Đồng Tâm, Vigracera, Phú Mỹ) — fresh badge",
      "Booking GA-300 4.500 m² → click ô → công thức UNIS_dùng = tồn × share%",
      "Mikado: 2.500 × 60% = 1.500 − 120 đang về = 1.380 m² ATP",
    ],
    keyAction: "Booking xong → mở /hub",
    metric: [
      { label: "NM tổng", value: "5" },
      { label: "Booking", value: "4.500 m²" },
      { label: "Fresh", value: "<24h" },
    ],
  },
  {
    num: 4,
    route: "/hub",
    routeLabel: "Hub & Gap Scenario",
    title: "Hub commitment — Toko gap 31,7%",
    duration: "1'",
    icon: <Factory className="h-5 w-5" />,
    color: "#b45309",
    highlights: [
      "Hub formula: Cam kết NM = ranking × share% × honoring",
      "Toko gap 31,7% (cam kết 1.580 vs cần 2.310) → /gap-scenario",
      "Scenario A/B/C: Mua thêm | Tăng giá tier | Kết hợp — chọn C tiết kiệm 9,2 triệu ₫",
    ],
    keyAction: "Quyết định Scenario C → mở /drp",
    metric: [
      { label: "Toko gap", value: "31,7%" },
      { label: "Best", value: "Scenario C" },
      { label: "Savings", value: "9,2tr ₫" },
    ],
  },
  {
    num: 5,
    route: "/drp",
    routeLabel: "DRP & Allocation",
    title: "DRP 6 lớp — LCNB first, netting base",
    duration: "1'",
    icon: <Layers className="h-5 w-5" />,
    color: "#0ea5e9",
    highlights: [
      "6-layer allocation: LCNB → SS reserve → Pipeline → On-hand → New PO → Lateral",
      "LCNB priority first (lock CN-bộ phận trước) → Net = Demand − tồn − pipeline + SS",
      "GA-300 CN-BD: Net 840 m² → cần đặt mới qua Mikado primary",
    ],
    keyAction: "DRP done → mở /transport",
    metric: [
      { label: "Lớp", value: "6" },
      { label: "Fill rate", value: "95%" },
      { label: "Net new", value: "840 m²" },
    ],
  },
  {
    num: 6,
    route: "/transport",
    routeLabel: "Transport & Orders",
    title: "Container fill 53% → HOLD, PO lifecycle",
    duration: "1'",
    icon: <Truck className="h-5 w-5" />,
    color: "#dc2626",
    highlights: [
      "Container fill 53% < 80% threshold → HOLD gộp với chuyến sau",
      "PO lifecycle: Draft → ATP → Approved → Posted → Shipped → Received",
      "ATP check pass → [Duyệt tất cả] → [Post Bravo] → NM nhận đơn",
    ],
    keyAction: "PO posted → mở /monitoring",
    metric: [
      { label: "Container", value: "53%" },
      { label: "Action", value: "HOLD" },
      { label: "PO posted", value: "8" },
    ],
  },
  {
    num: 7,
    route: "/monitoring",
    routeLabel: "Monitoring",
    title: "NM Risk + ROI 507 triệu ₫ + Flywheel",
    duration: "1'",
    icon: <Activity className="h-5 w-5" />,
    color: "#00714d",
    highlights: [
      "NM Risk panel: Toko honoring 68% Grade C → cảnh báo, đề xuất giảm allocation",
      "ROI Flywheel: tiết kiệm 507 triệu ₫/tháng (vốn lưu động + giảm stockout)",
      "Bánh đà cải tiến: data fresh → DRP đúng → PO đúng → trust ↑ → tự động hoá ↑",
    ],
    keyAction: "Closed loop — chu kỳ mới quay về /demand",
    metric: [
      { label: "ROI", value: "507tr ₫/th" },
      { label: "Trust", value: "82% 🟢" },
      { label: "Flywheel", value: "▶ chạy" },
    ],
  },
];

function DemoSection({ onNavigate }: { onNavigate: (route: string) => void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const step = demoSteps[stepIdx];
  const total = demoSteps.length;
  const progressPct = ((stepIdx + 1) / total) * 100;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero */}
      <div className="rounded-xl p-5 relative overflow-hidden bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border-l-4 border-primary">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-primary text-primary-foreground shadow-md">
            <PlayCircle className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-section-header font-bold text-text-1">Demo UNIS 7 phút</h2>
              <span className="rounded-full bg-primary/10 text-primary text-caption font-mono px-2 py-0.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> 7 bước · 2-Flow
              </span>
            </div>
            <p className="text-table text-text-2 mt-0.5">
              Đi qua toàn bộ chu kỳ từ Demand → S&OP → Supply → Hub → DRP → Transport → Monitoring trong 7 phút.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-section-header font-bold text-primary">{stepIdx + 1}/{total}</div>
            <div className="text-[10px] text-text-3 uppercase tracking-wider">Bước</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-table-sm text-text-2 font-medium">Tiến độ Demo</span>
          <span className="text-caption text-text-3 font-mono">{Math.round(progressPct)}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {/* Step dots */}
        <div className="flex items-center justify-between mt-3">
          {demoSteps.map((s, i) => (
            <button
              key={i}
              onClick={() => setStepIdx(i)}
              className={cn(
                "flex flex-col items-center gap-1 transition-all group",
                i <= stepIdx ? "opacity-100" : "opacity-50 hover:opacity-80"
              )}
            >
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-mono font-bold border-2 transition-all",
                  i === stepIdx ? "scale-110 shadow-md text-white" : i < stepIdx ? "text-white" : "bg-surface-1 text-text-3 border-surface-3"
                )}
                style={i <= stepIdx ? { backgroundColor: s.color, borderColor: s.color } : {}}
              >
                {i < stepIdx ? "✓" : s.num}
              </div>
              <span className={cn("text-[10px] font-medium hidden md:block", i === stepIdx ? "text-text-1" : "text-text-3")}>
                {s.routeLabel.split(" ")[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Active step card */}
      <div className="rounded-xl border-2 bg-surface-0 overflow-hidden shadow-md transition-all" style={{ borderColor: `${step.color}40` }}>
        <div className="px-5 py-4 flex items-center gap-4 border-b border-surface-3" style={{ backgroundColor: `${step.color}08` }}>
          <div className="flex items-center justify-center h-12 w-12 rounded-xl text-white shadow-sm shrink-0" style={{ backgroundColor: step.color }}>
            {step.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-body font-bold text-text-1">Bước {step.num}: {step.title}</span>
              <span className="rounded-sm bg-surface-3 text-text-3 text-[10px] font-mono px-1.5 py-0.5">{step.route}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-table-sm text-text-2">
                <Clock className="h-3 w-3" /> {step.duration}
              </span>
              <span className="text-table-sm text-text-2">· {step.routeLabel}</span>
            </div>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="px-5 py-4 grid grid-cols-3 gap-3 border-b border-surface-3">
          {step.metric.map((m, i) => (
            <div key={i} className="rounded-lg bg-surface-1 px-3 py-2 text-center">
              <div className="text-[10px] text-text-3 uppercase tracking-wider">{m.label}</div>
              <div className="font-mono text-body font-bold mt-0.5" style={{ color: step.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Highlights */}
        <div className="px-5 py-4">
          <div className="text-[10px] text-text-3 uppercase tracking-wider mb-2">Điểm nhấn</div>
          <div className="space-y-2">
            {step.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2.5 text-table-sm">
                <span
                  className="flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold shrink-0 mt-0.5"
                  style={{ backgroundColor: `${step.color}15`, color: step.color }}
                >
                  {i + 1}
                </span>
                <span className="text-text-2">{h}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 bg-surface-1/50 border-t border-surface-3 flex items-center justify-between gap-3">
          <button
            onClick={() => setStepIdx(Math.max(0, stepIdx - 1))}
            disabled={stepIdx === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-button text-table-sm font-medium text-text-2 hover:bg-surface-3 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Bước trước
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate(step.route)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-button border border-primary/30 text-primary text-table-sm font-medium hover:bg-primary/5 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Mở {step.route}
            </button>
            {stepIdx < total - 1 ? (
              <button
                onClick={() => setStepIdx(stepIdx + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-button bg-primary text-primary-foreground text-table-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
              >
                Bước tiếp <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setStepIdx(0)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-button bg-status-success text-white text-table-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Hoàn tất · Lặp lại
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Key action callout */}
      <div className="rounded-lg border border-surface-3 bg-surface-1/50 px-4 py-3 flex items-center gap-3">
        <GitBranch className="h-4 w-4 text-text-3 shrink-0" />
        <span className="text-table-sm text-text-2">
          <span className="text-text-3">Hành động chính:</span>{" "}
          <span className="font-medium text-text-1">{step.keyAction}</span>
        </span>
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function GuidePage() {
  const navigate = useNavigate();
  const { user } = useRbac();
  const { start } = useWalkthrough();
  const defaultRole = roleMap[user.role] || "SC_MANAGER";
  const [selectedRole, setSelectedRole] = useState<RoleKey>(defaultRole);
  const [activeTab, setActiveTab] = useState("overview");

  const role = roleMeta.find(r => r.key === selectedRole)!;
  const flows = allFlows[selectedRole];

  const handleNavigate = (node: FlowNode, flowArray?: FlowNode[], nodeIdx?: number) => {
    const navRoute = node.route.split(" ")[0];
    // Build full flow sequence from the array
    const flowSeq = flowArray?.filter(n => n.highlights && n.highlights.length > 0).map(n => ({
      route: n.route, title: n.label, badge: n.time,
      what: n.what, how: n.how, highlights: n.highlights,
    })) || [];
    const stepInFlow = flowSeq.findIndex(s => s.route === node.route);
    start({
      route: node.route, title: node.label, badge: node.time,
      what: node.what, how: node.how,
      highlights: node.highlights,
    }, flowSeq.length > 1 ? flowSeq : undefined, stepInFlow >= 0 ? stepInFlow : 0);
    navigate(navRoute);
  };

  const tabs = [
    { key: "overview", label: "Tổng quan" },
    { key: "demo", label: "🎬 Demo UNIS 7'" },
    { key: "monthly", label: "Kế hoạch tháng" },
    { key: "daily", label: "Vận hành ngày" },
    { key: "formulas", label: "Công thức" },
  ];

  return (
    <AppLayout>
      <ScreenHeader title="SCP Smartlog — Hướng dẫn sử dụng" subtitle="Chọn role để xem quy trình phù hợp" />

      {/* ═══ ROLE SELECTOR — Visual cards ═══ */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {roleMeta.map((r) => {
          const isActive = selectedRole === r.key;
          return (
            <button
              key={r.key}
              onClick={() => { setSelectedRole(r.key); setActiveTab("overview"); }}
              className={cn(
                "group rounded-xl p-4 text-center transition-all border-2 relative overflow-hidden",
                isActive
                  ? "shadow-lg scale-[1.02]"
                  : "border-surface-3 bg-surface-0 hover:border-surface-3 hover:shadow-md"
              )}
              style={isActive ? { borderColor: r.color, backgroundColor: `${r.color}08` } : {}}
            >
              {/* Icon */}
              <div
                className={cn("mx-auto flex items-center justify-center h-12 w-12 rounded-xl mb-3 transition-all", isActive ? "text-white shadow-md" : "bg-surface-1 text-text-2 group-hover:text-text-1")}
                style={isActive ? { backgroundColor: r.color } : {}}
              >
                {r.icon}
              </div>

              <div className={cn("font-display text-body font-bold transition-colors", isActive ? "" : "text-text-1")} style={isActive ? { color: r.color } : {}}>
                {r.label}
              </div>
              <div className="text-caption text-text-3 mt-0.5">{r.sub}</div>

              {/* Time badges */}
              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="rounded-full bg-surface-1 px-2 py-0.5 text-[10px] font-mono text-text-2">
                  📅 {r.timeDaily}/ngày
                </span>
                {r.timeMonthly !== "—" && (
                  <span className="rounded-full bg-surface-1 px-2 py-0.5 text-[10px] font-mono text-text-2">
                    📆 {r.timeMonthly}/tháng
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ═══ TAB BAR ═══ */}
      <div className="flex items-center gap-1 bg-surface-1 rounded-xl p-1 mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-5 py-2 rounded-lg text-table font-medium transition-all",
              activeTab === tab.key
                ? "bg-surface-0 text-text-1 shadow-sm"
                : "text-text-2 hover:text-text-1"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: TỔNG QUAN ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-fade-in">
          {/* Hero banner */}
          <div
            className="rounded-xl p-6 relative overflow-hidden"
            style={{ backgroundColor: `${role.color}08`, borderLeft: `4px solid ${role.color}` }}
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center h-14 w-14 rounded-xl text-white shadow-md" style={{ backgroundColor: role.color }}>
                {role.icon}
              </div>
              <div>
                <h2 className="font-display text-section-header font-bold text-text-1">{role.label}</h2>
                <p className="text-table text-text-2 mt-0.5">{role.heroDesc}</p>
              </div>
              <div className="ml-auto flex gap-4">
                <div className="text-center">
                  <div className="font-mono text-section-header font-bold" style={{ color: role.color }}>{role.timeDaily}</div>
                  <div className="text-[10px] text-text-3 uppercase tracking-wider">Hàng ngày</div>
                </div>
                {role.timeMonthly !== "—" && (
                  <div className="text-center">
                    <div className="font-mono text-section-header font-bold" style={{ color: role.color }}>{role.timeMonthly}</div>
                    <div className="text-[10px] text-text-3 uppercase tracking-wider">Hàng tháng</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visual flow preview — daily */}
          {flows.daily.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-body font-semibold text-text-1">Quy trình hàng ngày</h3>
                <button onClick={() => setActiveTab("daily")} className="text-table-sm text-primary font-medium hover:underline flex items-center gap-1">
                  Xem chi tiết <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              {/* Horizontal flow cards */}
              <div className="flex gap-3 overflow-x-auto pb-2">
                {flows.daily.map((node, i) => (
                  <React.Fragment key={i}>
                    <div className="rounded-xl border border-surface-3 bg-surface-0 p-4 min-w-[160px] flex-1 text-center hover:shadow-md transition-all cursor-pointer"
                      onClick={() => { setActiveTab("daily"); }}
                    >
                      <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-lg text-white mb-2" style={{ backgroundColor: role.color }}>
                        {node.icon}
                      </div>
                      <div className="font-display text-table font-semibold text-text-1">{node.label}</div>
                      <div className="flex items-center justify-center gap-1 mt-1 text-caption text-text-3">
                        <Clock className="h-3 w-3" />{node.time}
                      </div>
                      {node.kpi && (
                        <div className="mt-2 rounded-md bg-primary/5 px-2 py-1 text-[10px] font-mono text-primary font-medium">
                          Mục tiêu: {node.kpi}
                        </div>
                      )}
                    </div>
                    {i < flows.daily.length - 1 && (
                      <div className="flex items-center shrink-0">
                        <ArrowRight className="h-4 w-4 text-text-3" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Monthly flow preview */}
          {flows.monthly.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-body font-semibold text-text-1">Quy trình hàng tháng</h3>
                <button onClick={() => setActiveTab("monthly")} className="text-table-sm text-primary font-medium hover:underline flex items-center gap-1">
                  Xem chi tiết <ArrowRight className="h-3 w-3" />
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {flows.monthly.map((node, i) => (
                  <React.Fragment key={i}>
                    <div className="rounded-xl border border-surface-3 bg-surface-0 p-4 min-w-[160px] flex-1 text-center hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setActiveTab("monthly")}
                    >
                      <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-lg text-white mb-2" style={{ backgroundColor: role.color }}>
                        {node.icon}
                      </div>
                      <div className="font-display text-table font-semibold text-text-1">{node.label}</div>
                      <div className="rounded-sm bg-surface-3 text-text-3 text-[10px] font-mono px-1.5 py-0.5 mt-1 inline-block">{node.time}</div>
                    </div>
                    {i < flows.monthly.length - 1 && (
                      <div className="flex items-center shrink-0">
                        <ArrowRight className="h-4 w-4 text-text-3" />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Quick tips — icon grid */}
          {flows.tips.length > 0 && (
            <div>
              <h3 className="font-display text-body font-semibold text-text-1 mb-3">Mẹo nhanh</h3>
              <div className="grid grid-cols-2 gap-2">
                {flows.tips.map((tip, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border border-surface-3 bg-surface-0 px-4 py-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
                      {tip.icon}
                    </div>
                    <span className="text-table-sm text-text-2">{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: DEMO UNIS 7 PHÚT ═══ */}
      {activeTab === "demo" && (
        <DemoSection onNavigate={(route) => navigate(route)} />
      )}

      {/* ═══ TAB: KẾ HOẠCH THÁNG ═══ */}
      {activeTab === "monthly" && (
        <div className="animate-fade-in">
          <FlowTimeline nodes={flows.monthly} accentColor={role.color} onNavigate={handleNavigate} />
        </div>
      )}

      {/* ═══ TAB: VẬN HÀNH NGÀY ═══ */}
      {activeTab === "daily" && (
        <div className="animate-fade-in">
          <FlowTimeline nodes={flows.daily} accentColor={role.color} onNavigate={handleNavigate} />
        </div>
      )}

      {/* ═══ TAB: CÔNG THỨC ═══ */}
      {activeTab === "formulas" && (
        <div className="space-y-4 animate-fade-in">
          {flows.formulas.map((f, i) => (
            <div key={i} className="rounded-xl border border-surface-3 bg-surface-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-3">
                <h3 className="font-display text-body font-semibold text-text-1">{f.title}</h3>
              </div>
              <div className="px-5 py-3">
                {f.visual}
              </div>
              <div className="px-5 py-2 bg-surface-1/50 border-t border-surface-3">
                <p className="text-table-sm text-text-3">{f.detail}</p>
              </div>
            </div>
          ))}

          {/* SC Manager insight */}
          {selectedRole === "SC_MANAGER" && (
            <div className="rounded-xl border-2 border-[#b45309]/30 p-5" style={{ backgroundColor: `#b4530908` }}>
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-[#b45309]" />
                <div>
                  <p className="text-table font-semibold text-[#b45309]">Key Insight</p>
                  <p className="text-table-sm text-text-2">
                    SS dùng <span className="font-mono font-bold text-text-1">σ_fc_error</span> → tiết kiệm <span className="font-mono font-bold text-primary">54% vốn</span> so với σ_demand
                  </p>
                </div>
              </div>
            </div>
          )}

          {flows.formulas.length === 0 && (
            <div className="rounded-xl border border-surface-3 bg-surface-1/50 p-8 text-center">
              <p className="text-text-3">Chọn <span className="font-semibold text-text-1">SC Manager</span> để xem đầy đủ công thức.</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <div className="mt-10 pt-6 border-t border-surface-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/logic" className="text-table-sm text-primary hover:underline font-medium">/logic — Logic chi tiết</a>
          <a href="/config" className="text-table-sm text-primary hover:underline font-medium">/config — Cấu hình</a>
        </div>
        <p className="text-caption text-text-3">SCP Smartlog v5.0 LEAN · 14 screens · 30 views</p>
      </div>
    </AppLayout>
  );
}

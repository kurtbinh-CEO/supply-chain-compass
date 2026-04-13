import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { LogicTreeNode, LogicNodeData } from "@/components/logic/LogicTreeNode";
import { CodeBlock, Note } from "@/components/logic/CodeBlock";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

/* ═══ CSS accent vars mapping ═══ */
// accent colors use design token CSS vars
const accentMap: Record<string, string> = {
  blue: "color-info",
  green: "color-success",
  amber: "color-warning",
  red: "color-danger",
  teal: "color-info",
};

/* ═══ TAB 1: Kế hoạch tháng ═══ */
const tab1Nodes: LogicNodeData[] = [
  {
    label: "Xác định Demand",
    formulaHeader: "= FC + B2B + PO − Overlap = 7.650",
    accent: "blue",
    children: [
      {
        label: "FC Statistical: 4.800 (63%)",
        accent: "blue",
        content: (
          <Note>
            Hệ thống xem <strong>24 tháng</strong> bán hàng quá khứ → tìm pattern (mùa vụ, tăng trưởng) → dự đoán tháng tới.
            <br /><br />
            <strong>Model:</strong> Holt-Winters (mặc định) hoặc XGBoost (khi có ≥36 tháng data).
            <br />
            <strong>MAPE hiện tại:</strong> 18,4%. Nghĩa là trung bình sai khoảng 18%.
            <br /><br />
            Chạy tự động ngày 1 mỗi tháng. Planner có thể Override nếu có thông tin Sales chưa phản ánh trong data.
          </Note>
        ),
      },
      {
        label: "B2B Weighted: 2.200 (29%)",
        accent: "blue",
        content: (
          <Note>
            Tổng deals B2B × xác suất thành công = weighted demand.
            <br />
            VD: Vingroup 12.000m² × 85% = 10.200 (chỉ phần thuộc tháng này).
            <br /><br />
            Chỉ tính deals có probability ≥ 30%.
            <br />
            Sales nhập deals tại <strong>/demand tab 2</strong> (CRUD table hoặc upload Excel).
          </Note>
        ),
      },
      {
        label: "PO Confirmed: 1.100 (14%)",
        accent: "blue",
        content: (
          <Note>
            PO đã ký chính thức trong ERP Bravo. Sync mỗi 30 phút.
            <br />
            Độ chính xác: <strong>100%</strong> (đã ký, có giá trị pháp lý).
          </Note>
        ),
      },
      {
        label: "Overlap: −450 (−6%)",
        accent: "blue",
        content: (
          <Note>
            Khi B2B deal chuyển Committed → PO Confirmed, qty đó đã có trong cả B2B lẫn PO → trùng lặp.
            <br />
            Hệ thống tự phát hiện và trừ. Planner không cần làm gì.
          </Note>
        ),
      },
    ],
    content: (
      <div className="space-y-3">
        {/* Stacked bar */}
        <div className="flex rounded-lg overflow-hidden h-7 text-[10px] font-medium">
          <div className="bg-info/80 text-white flex items-center justify-center" style={{ width: "63%" }}>FC 63%</div>
          <div className="bg-success/80 text-white flex items-center justify-center" style={{ width: "29%" }}>B2B 29%</div>
          <div className="bg-primary/70 text-white flex items-center justify-center" style={{ width: "14%" }}>PO 14%</div>
          <div className="bg-danger/70 text-white flex items-center justify-center min-w-[40px]" style={{ width: "6%" }}>−6%</div>
        </div>
      </div>
    ),
  },
  {
    label: "S&OP Consensus → Lock",
    formulaHeader: "4 phiên bản → chọn → 7.650 locked",
    accent: "green",
    content: (
      <div className="space-y-3">
        <Note>
          S&OP = cuộc họp hàng tháng (Day 5) để 4 bộ phận đồng ý 1 con số demand.
        </Note>
        <CodeBlock>{`v0 Statistical: 6.800 — Model tự chạy, không ai can thiệp.
v1 Sales:       8.500 — Sales team nhập dựa trên pipeline B2B.
v2 CN Input:    7.650 — CN Managers nhập dựa trên thực tế vùng.
v3 Consensus:   7.650 — SC Manager quyết định cuối cùng.`}</CodeBlock>
        <Note>
          <strong>Chọn bằng gì?</strong>
          <br />→ FVA (Forecast Value Add): so sánh ai dự báo đúng nhất tháng trước.
          <br />→ Nếu v2 CN MAPE 12% tốt hơn v0 stat 18% → v2 có giá trị → chọn v2.
          <br /><br />
          <strong>Lock Day 7</strong> → số KHÔNG ĐỔI. Phasing tự động M→W (28/25/24/23%).
          <br />
          Phasing: chia monthly → 4 tuần theo tỷ trọng lịch sử (VD: tuần 1 thường bán nhiều hơn).
        </Note>
      </div>
    ),
  },
  {
    label: "Cân đối: Demand − Supply = Gap",
    formulaHeader: "7.650 − 3.200 − 1.757 = 2.693 → +SS 1.200 = FC Min 3.893",
    accent: "amber",
    content: (
      <div className="space-y-3">
        <CodeBlock>{`Demand:      7.650  ← S&OP locked
− Stock:     −3.200  ← on-hand − reserved, từ WMS các CN
− Pipeline:  −1.757  ← hàng đang về (RPO shipped, chưa nhận)
─────────────────
= Net req:    2.693  ← cần đặt thêm bao nhiêu

+ SS buffer: +1.200  ← dự phòng sai số forecast (xem tab 4)
─────────────────
= FC Min:     3.893  ← SỐ TỐI THIỂU phải đặt NM`}</CodeBlock>
        <Note>
          Cân đối = bước quan trọng nhất: biết <strong>THIẾU BAO NHIÊU</strong>.
          <br />
          Nếu Net req = 0 hoặc âm → đủ hàng, không cần đặt thêm.
          <br />
          Nếu Net req &gt; 0 → phải đặt NM, con số này feed sang Hub.
        </Note>
        <p className="text-caption text-primary font-medium">Xem FormulaBar chi tiết tại /sop tab 2</p>
      </div>
    ),
  },
  {
    label: "MOQ Round → Commit NM → BPO",
    formulaHeader: "FC Min 3.893 → MOQ → 5.000 → share% → 18.500 → BPO",
    accent: "red",
    content: (
      <div className="space-y-3">
        <Note>
          FC Min nói cần 3.893. Nhưng NM có Minimum Order Qty (MOQ).
        </Note>
        <CodeBlock>{`Cross-CN Aggregation:
→ Gộp demand 4 CN cho cùng 1 NM
  VD: Mikado tổng 4 CN = 2.293
→ Nếu 2.293 < MOQ 1.000:
  ceil(2.293 ÷ 1.000) × 1.000 = 3.000
→ Surplus: 3.000 − 2.293 = +707 (tồn dùng tháng sau)

Share%:
→ NM phục vụ nhiều khách. UNIS chiếm 30% capacity Mikado.
→ Committed cho UNIS = capacity × share% = 5.500

POQ option:
→ Gộp 2 tuần demand → đặt 1 lần → tiết kiệm container.`}</CodeBlock>
        <Note>
          <strong>BPO</strong> (Blanket PO): BPO-MKD-2605 = cam kết tháng 5 cho Mikado, 5.500m².
          <br />→ NM confirm/reject → gap nếu NM từ chối → escalate.
        </Note>
        <CodeBlock>{`Mã số PO tự động:
BPO-{NM}-{YYMM}:               cam kết tháng (monthly)
RPO-{NM}-{YYMM}-W{tuần}-{seq}: đặt hàng tuần (daily)
TO-{From}-{To}-{YYMM}-{seq}:   chuyển hàng nội bộ
ASN-{NM}-{YYMM}-{seq}:         NM giao hàng`}</CodeBlock>
      </div>
    ),
  },
];

/* ═══ TAB 2: Vận hành ngày ═══ */
const tab2Nodes: LogicNodeData[] = [
  {
    label: "Cập nhật tồn NM (sáng)",
    accent: "blue",
    content: (
      <Note>
        Planner upload file Excel tồn kho NM hoặc nhập tay.
        <br /><br />
        <strong>UNIS dùng</strong> = tồn_kho × share%. Hệ thống tự tính.
        <br />
        VD: Mikado tồn 12.500 × share 60% = 7.200 cho UNIS.
        <br /><br />
        Nếu NM chưa cập nhật &gt; 24h → cảnh báo <span className="text-warning font-medium">stale</span>.
      </Note>
    ),
  },
  {
    label: "CN điều chỉnh demand tuần",
    accent: "blue",
    content: (
      <div className="space-y-3">
        <Note>
          <strong>Top-down:</strong> S&OP monthly → phasing tuần (28/25/24/23%)
          <br />
          <strong>CN Manager adjust:</strong> +/− per SKU + lý do (mobile).
        </Note>
        <CodeBlock>{`Tolerance:
  < 10%:   Auto-approve  (nhỏ, tin tưởng CN)
  10-30%:  SC Manager duyệt  (trung bình)
  > 30%:   Blocked  (quá lớn, cần giải trình)`}</CodeBlock>
        <Note>
          <strong>Cutoff:</strong> 18:00 mỗi ngày. Sau cutoff = hệ thống dùng top-down.
        </Note>
      </div>
    ),
  },
  {
    label: "DRP Netting (chạy đêm 23:00)",
    accent: "green",
    content: (
      <div className="space-y-3">
        <CodeBlock>{`Per SKU per CN per tuần:
  Gross demand:  617  ← final demand (top-down + adjust + PO)
− On-hand:      −120  ← tồn kho CN hiện tại
− In-transit:   −557  ← hàng đang về (RPO shipped, ETA)
+ SS buffer:    +900  ← dự phòng (xem tab 4)
──────────────────
= Net req:       840

÷ MOQ round:   1.000  ← Mikado MOQ = 1.000/container
= Planned RPO:  1.000  → RPO-MKD-2605-W17-002 (draft)`}</CodeBlock>
        <Note>
          Chạy <strong>TỰ ĐỘNG</strong> đêm. Planner có thể [▶ Chạy lại] bất kỳ lúc nào.
          <br />
          Nếu có exception (shortage, no-source) → hiện /workspace sáng hôm sau.
        </Note>
      </div>
    ),
  },
  {
    label: "Phân bổ 6 lớp",
    accent: "green",
    content: (
      <div className="space-y-3">
        <Note>
          Khi demand &gt; supply, hệ thống phân bổ hàng qua 6 lớp tuần tự:
        </Note>
        <CodeBlock>{`L1 Source:     Hàng từ NM nào?              → ✓ 617
L2 Variant:    Đúng loại hàng (A4/B2/C1)?  → ✓ 617
L3 FIFO:       Hàng cũ xuất trước          → ✓ 500
L4 Fair-share: Thiếu thì chia đều theo %   → ✓ 500
L5 SS Guard:   KHÔNG xuất dưới SS          → ✗ 272
   Lý do: on-hand 450 − SS 900 = −450
   Chỉ cấp 272 (phần trên SS).
L6 Lateral:    CN khác thừa?               → scan CN-ĐN +220`}</CodeBlock>
        <Note>
          Kết quả: allocated 272. Gap 345. Exception <span className="text-danger font-medium">SHORTAGE</span>.
          <br />
          Planner chọn: (A) Lateral 220 + PO 125 hoặc (B) PO full 345.
        </Note>
        <div className="bg-surface-1 border border-surface-3 rounded-lg p-3 mt-2">
          <p className="text-caption text-text-2 font-medium mb-1">Tại sao 6 lớp?</p>
          <Note>
            → <strong>L4 Fair-share:</strong> CN lớn không ăn hết của CN nhỏ
            <br />→ <strong>L5 SS Guard:</strong> không bao giờ để CN hết hàng hoàn toàn
            <br />→ <strong>L6 Lateral:</strong> tận dụng hàng thừa trước khi đặt NM mới
          </Note>
        </div>
      </div>
    ),
  },
  {
    label: "PO Release: BPO → RPO → ASN",
    accent: "amber",
    content: (
      <div className="space-y-3">
        <CodeBlock>{`Monthly: BPO (cam kết)
  → Daily: RPO (đặt thực tế)
    → ASN (NM giao)`}</CodeBlock>
        <Note>
          RPO draft (từ DRP) → Check BPO còn quota?
          <br />→ <strong>ATP check:</strong> NM có hàng sẵn?
          <br />&nbsp;&nbsp;ATP Pass → Duyệt → Post Bravo → NM nhận → sản xuất → ship
          <br />&nbsp;&nbsp;ATP Fail → NM stale/hết hàng → <span className="text-danger">Force 3 cấp</span> (SC Manager → Director → CEO)
          <br /><br />
          → NM ship → tạo ASN → CN nhận → upload POD → RECEIVED
        </Note>
        <CodeBlock>{`Bravo mapping:
BPO = Purchase Agreement
RPO = Purchase Order
ASN = Goods Receipt`}</CodeBlock>
      </div>
    ),
  },
  {
    label: "Closed-loop (cuối tháng)",
    accent: "blue",
    content: (
      <div className="space-y-3">
        <div className="bg-surface-1 border border-surface-3 rounded-lg p-3 mb-2">
          <p className="text-table-sm font-semibold text-text-1 mb-1">Hệ thống TỰ HỌC — mỗi tháng tốt hơn tháng trước</p>
        </div>
        <CodeBlock>{`Loop 1: Plan → Deliver → Learn
  FC vs Actual → error → cải thiện model

Loop 2: FC accuracy → σ_error → SS → Working Capital
  MAPE giảm 25%→15% → σ giảm → SS giảm → tiết kiệm vốn

Loop 3: NM honoring → ATP discount
  NM giao 68% → hệ thống tự giảm tin tưởng: ATP × 0.68

Loop 4: CN accuracy → Trust score → Tolerance
  CN adjust sai > 15% → trust giảm → tolerance 30%→20%

Loop 5: Financial target → Inventory policy
  WC > budget → gợi ý giảm SS CN thừa hàng

Loop 6: Stockout → Auto-adjust SS
  Stockout > 2 lần/tháng → SS tự tăng 15%
  CN thừa > 14 ngày → SS tự giảm 10%`}</CodeBlock>
        <Note>
          Planner <strong>duyệt thay đổi</strong> trước khi áp dụng (không ai bị surprise).
        </Note>
      </div>
    ),
  },
];

/* ═══ TAB 3: Forecast & Độ tin cậy ═══ */
const tab3Nodes: LogicNodeData[] = [
  {
    label: "FC Accuracy (MAPE)",
    formulaHeader: "MAPE = avg(|FC − Actual| ÷ Actual) × 100%",
    accent: "blue",
    content: (
      <div className="space-y-3">
        <CodeBlock>{`MAPE = 1/n × Σ |FC − Actual| ÷ Actual × 100%

VD tháng 4:
  FC = 7.650, Actual = 7.280
  |7.650 − 7.280| ÷ 7.280 = 5,1%
  
Per SKU MAPE khác nhau → weighted by demand.
FC Accuracy = 100% − MAPE = 100% − 18,4% = 81,6% ≈ 82%`}</CodeBlock>
        <Note>
          <strong>Target:</strong> MAPE &lt; 15%. Hiện tại 18,4% → cần cải thiện.
          <br />
          Cải thiện bằng: (1) thêm data, (2) Sales input tốt hơn, (3) CN adjust chính xác hơn.
        </Note>
      </div>
    ),
  },
  {
    label: "FVA (Forecast Value Add)",
    formulaHeader: "Ai dự báo tốt nhất?",
    accent: "green",
    content: (
      <div className="space-y-3">
        <CodeBlock>{`FVA = MAPE_baseline − MAPE_version

v0 Statistical MAPE: 18,4% (baseline)
v1 Sales MAPE:       22,0% → FVA = −3,6% (tệ hơn!)
v2 CN Input MAPE:    12,0% → FVA = +6,4% (tốt hơn!)

Kết luận: CN Input v2 add value → nên dùng cho consensus.`}</CodeBlock>
        <Note>
          FVA giúp đo lường <strong>ai thực sự cải thiện</strong> forecast.
          <br />
          Nếu FVA âm → version đó làm forecast tệ hơn → cân nhắc bỏ.
        </Note>
      </div>
    ),
  },
  {
    label: "Trust Score (CN)",
    formulaHeader: "Trust = f(accuracy, bias, timeliness)",
    accent: "amber",
    content: (
      <div className="space-y-3">
        <CodeBlock>{`Trust Score = w1 × Accuracy + w2 × (1−Bias) + w3 × Timeliness

Accuracy:  |adjust − actual| < 10% → score cao
Bias:      luôn adjust lên (hoặc xuống) → bias → giảm trust
Timeliness: adjust trước cutoff → điểm cao

VD CN-BD:  Accuracy 88%, Bias 5%, On-time 95%
  Trust = 0.5×88 + 0.3×95 + 0.2×95 = 91.5

Trust → Tolerance:
  > 90: tolerance 30% (tin tưởng cao)
  70-90: tolerance 20%
  < 70: tolerance 10% (kiểm soát chặt)`}</CodeBlock>
      </div>
    ),
  },
  {
    label: "NM Honoring & ATP Discount",
    formulaHeader: "Honoring% = Delivered ÷ Committed",
    accent: "red",
    content: (
      <div className="space-y-3">
        <CodeBlock>{`Honoring% = Actual delivered ÷ Plan committed

VD Toko: delivered 4.080 ÷ committed 6.000 = 68%

Grade: A ≥90% | B 80-90% | C 70-80% | D <70%
Toko = 68% → Grade D

ATP Discount:
  Lần sau DRP dùng: NM_stock × honoring% = adjusted ATP
  Toko stock 5.000 × 0.68 = 3.400 (thay vì tin 5.000)
  → Hệ thống TỰ GIẢM tin tưởng NM yếu.`}</CodeBlock>
      </div>
    ),
  },
];

/* ═══ TAB 4: Safety Stock ═══ */
const tab4Nodes: LogicNodeData[] = [
  {
    label: "Safety Stock là gì?",
    accent: "blue",
    content: (
      <Note>
        Safety Stock = hàng dự phòng để <strong>không bao giờ hết hàng</strong> khi forecast sai hoặc NM giao trễ.
        <br /><br />
        Giống "quỹ dự phòng": không dùng hàng ngày, nhưng khi có sự cố → cứu.
        <br />
        Càng nhiều SS → càng an toàn → nhưng tốn vốn (tiền nằm trong kho).
      </Note>
    ),
  },
  {
    label: "Công thức SS",
    formulaHeader: "SS = z × σ_fc_error × √LT",
    accent: "green",
    content: (
      <div className="space-y-3">
        <CodeBlock>{`SS = z × σ_fc_error × √LT

z          = hệ số phục vụ (service level)
             90% → z = 1.28
             95% → z = 1.65 (mặc định)
             99% → z = 2.33
σ_fc_error = độ lệch chuẩn sai số forecast
             Nếu forecast càng sai → σ càng lớn → SS càng cao
√LT        = căn bậc 2 của Lead Time (ngày)
             LT càng dài → SS càng cao (vì chờ lâu hơn)`}</CodeBlock>
        <CodeBlock>{`VD: GA-300 A4 tại CN-BD:
  z = 1.65 (service 95%)
  σ = 28.5 (sai số forecast)
  LT = 14 ngày

  SS = 1.65 × 28.5 × √14
     = 1.65 × 28.5 × 3.74
     = 176 m²/ngày × ... → monthly SS = 1.035 m²`}</CodeBlock>
      </div>
    ),
  },
  {
    label: "SS ↔ Working Capital",
    formulaHeader: "Tăng SS = tốn vốn, giảm SS = rủi ro",
    accent: "amber",
    content: (
      <div className="space-y-3">
        <CodeBlock>{`WC impact = SS_qty × unit_cost

VD: SS tăng 135m² × 185.000đ/m² = +25M₫/tháng
    Tiền nằm trong kho, không sinh lời.

Trade-off:
  SS cao  → stockout 0% → WC tăng 20% → CFO không vui
  SS thấp → stockout 5% → WC giảm 15% → khách hàng không vui

Mục tiêu: tìm điểm CÂN BẰNG.
  → Simulation: thử z = 1.28 vs 1.65 vs 2.33
  → Xem stockout risk vs WC impact → chọn z phù hợp.`}</CodeBlock>
      </div>
    ),
  },
  {
    label: "Auto-adjust SS (Closed-loop)",
    formulaHeader: "Hệ thống tự điều chỉnh SS",
    accent: "red",
    content: (
      <div className="space-y-3">
        <CodeBlock>{`Trigger tăng SS:
  Stockout > 2 lần/tháng → SS +15%
  VD: CN-BD GA-300 A4 stockout 2x → SS 900 → 1.035

Trigger giảm SS:
  HSTK > 14 ngày liên tục → SS −10%
  VD: CN-ĐN GA-600 A4 HSTK 18d → SS 1.000 → 900

Trigger từ FC accuracy:
  MAPE giảm 25% → 15% → σ giảm → SS tự giảm
  (Forecast tốt hơn → cần ít dự phòng hơn)

Tất cả thay đổi → pending duyệt (Planner xác nhận).
Không bao giờ tự áp dụng mà không có người kiểm tra.`}</CodeBlock>
      </div>
    ),
  },
];

const tabs = [
  { key: "monthly", label: "Kế hoạch tháng", nodes: tab1Nodes },
  { key: "daily", label: "Vận hành ngày", nodes: tab2Nodes },
  { key: "forecast", label: "Forecast & Độ tin cậy", nodes: tab3Nodes },
  { key: "ss", label: "Safety Stock", nodes: tab4Nodes },
];

export default function LogicPage() {
  const [activeTab, setActiveTab] = useState("monthly");
  const current = tabs.find((t) => t.key === activeTab)!;

  return (
    <AppLayout>
      <ScreenHeader title="Logic vận hành SCP" subtitle="Hiểu cách hệ thống tính toán và ra quyết định" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-surface-3 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-table-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-text-3 hover:text-text-1"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tree */}
      <div className="space-y-3 max-w-4xl animate-fade-in">
        {current.nodes.map((node, i) => (
          <LogicTreeNode key={`${activeTab}-${i}`} node={node} />
        ))}
      </div>
    </AppLayout>
  );
}

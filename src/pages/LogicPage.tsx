import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader } from "@/components/ScreenShell";
import { LogicTreeNode, LogicNodeData } from "@/components/logic/LogicTreeNode";
import { CodeBlock, Note } from "@/components/logic/CodeBlock";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Info } from "lucide-react";

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
const confidenceData = [
  { period: "1 tuần", confidence: 85, fill: "#1e40af" },
  { period: "2 tuần", confidence: 78, fill: "#2563eb" },
  { period: "1 tháng", confidence: 70, fill: "#3b82f6" },
  { period: "2 tháng", confidence: 60, fill: "#eab308" },
  { period: "3 tháng", confidence: 45, fill: "#f97316" },
  { period: "6 tháng", confidence: 35, fill: "#ef4444" },
  { period: "12 tháng", confidence: 20, fill: "#991b1b" },
];

const tab3Nodes: LogicNodeData[] = [
  {
    label: "Forecast là gì?",
    accent: "blue",
    content: (
      <div className="space-y-3">
        <Note>
          Forecast = <strong>DỰ ĐOÁN</strong> tương lai dựa trên quá khứ.
        </Note>
        <Note>
          Hệ thống xem 24 tháng bán hàng → tìm:
          <br />• <strong>Xu hướng:</strong> doanh số tăng hay giảm theo thời gian?
          <br />• <strong>Mùa vụ:</strong> tháng nào bán nhiều, tháng nào ít? (xây dựng: mùa khô bán nhiều)
          <br />• <strong>Chu kỳ:</strong> có pattern lặp lại?
        </Note>
        <Note>
          Rồi chiếu về phía trước: <em>"Nếu 2 năm qua tháng 5 luôn bán 5.000, tháng 5 năm nay có thể ~5.300 (tăng trưởng 6%)."</em>
        </Note>
        <div className="bg-warning-bg border border-warning/30 rounded-lg p-3">
          <p className="text-caption text-text-1 font-medium">
            ⚠️ QUAN TRỌNG: Forecast KHÔNG BAO GIỜ chính xác 100%.
          </p>
          <p className="text-caption text-text-2 mt-1">
            Sai số là <strong>BẢN CHẤT</strong> của dự đoán, không phải lỗi hệ thống.
            Vì vậy cần Safety Stock để dự phòng phần sai.
          </p>
        </div>
      </div>
    ),
  },
  {
    label: "2 loại model",
    accent: "blue",
    content: (
      <div className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-table-sm border border-surface-3 rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-surface-1/50">
                <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">Model</th>
                <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">Khi nào dùng</th>
                <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">Ưu điểm</th>
                <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">Nhược điểm</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-surface-3/50">
                <td className="px-3 py-2 font-medium text-text-1">Holt-Winters</td>
                <td className="px-3 py-2 text-text-2">≥ 12 tháng history, có mùa vụ rõ</td>
                <td className="px-3 py-2 text-success">Đơn giản, ổn định, giải thích được</td>
                <td className="px-3 py-2 text-text-3">Không bắt pattern phức tạp</td>
              </tr>
              <tr className="border-t border-surface-3/50">
                <td className="px-3 py-2 font-medium text-text-1">XGBoost (ML)</td>
                <td className="px-3 py-2 text-text-2">≥ 36 tháng history, nhiều biến</td>
                <td className="px-3 py-2 text-success">Chính xác hơn với data lớn</td>
                <td className="px-3 py-2 text-text-3">Khó giải thích, cần nhiều data</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Note>
          Hệ thống <strong>tự chọn</strong> model có MAPE thấp nhất cho mỗi SKU × CN.
          <br /><br />
          GA-300 A4 CN-BD: HW MAPE 18%, XGBoost MAPE 16% → chọn <strong>XGBoost</strong>.
          <br />
          GA-600 A4 CN-HN: HW MAPE 14%, XGBoost MAPE 19% → chọn <strong>HW</strong>.
          <br /><br />
          Planner không cần chọn model — hệ thống tự tối ưu.
        </Note>
      </div>
    ),
  },
  {
    label: "MAPE là gì?",
    formulaHeader: "Chỉ số quan trọng nhất",
    accent: "green",
    content: (
      <div className="space-y-3">
        <CodeBlock>{`MAPE = Mean Absolute Percentage Error
     = Trung bình phần trăm sai số

VD 4 tuần:
  Tuần 1: Forecast 1.000, Actual 850  → |1000−850|÷850 = 17,6%
  Tuần 2: Forecast 1.000, Actual 1.100 → |1000−1100|÷1100 = 9,1%
  Tuần 3: Forecast 1.200, Actual 1.150 → |1200−1150|÷1150 = 4,3%
  Tuần 4: Forecast 1.000, Actual 750  → |1000−750|÷750 = 33,3%

  MAPE = (17,6 + 9,1 + 4,3 + 33,3) ÷ 4 = 16,1%

Nghĩa: trung bình sai khoảng 16%.
FC Accuracy = 100% − MAPE = 83,9%`}</CodeBlock>
        {/* Color scale */}
        <div className="space-y-1.5">
          <p className="text-caption font-medium text-text-2">Thang đánh giá MAPE:</p>
          {[
            { range: "< 10%", label: "Xuất sắc 🟢", note: "SS thấp, tiết kiệm vốn", bg: "bg-success/10 border-success/30" },
            { range: "10-20%", label: "Tốt 🟢", note: "SS vừa phải", bg: "bg-success/5 border-success/20" },
            { range: "20-30%", label: "Chấp nhận 🟡", note: "SS cao, review model", bg: "bg-warning/10 border-warning/30" },
            { range: "> 30%", label: "Cần cải thiện 🔴", note: "SS rất cao, xem lại data + model", bg: "bg-danger/10 border-danger/30" },
          ].map((row) => (
            <div key={row.range} className={`flex items-center gap-3 px-3 py-1.5 rounded-lg border ${row.bg}`}>
              <span className="font-mono text-[11px] font-semibold text-text-1 w-16">{row.range}</span>
              <span className="text-caption font-medium text-text-1 w-32">{row.label}</span>
              <span className="text-caption text-text-2">{row.note}</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    label: "Độ tin cậy GIẢM theo thời gian",
    formulaHeader: "Càng xa → càng không chính xác",
    accent: "amber",
    content: (
      <div className="space-y-3">
        {/* Bar chart */}
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={confidenceData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} />
              <YAxis type="category" dataKey="period" fontSize={10} width={55} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Confidence"]} />
              <Bar dataKey="confidence" radius={[0, 4, 4, 0]}>
                {confidenceData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Note>
          Càng xa tương lai → càng khó đoán chính xác.
        </Note>
        <div className="bg-surface-1 border border-surface-3 rounded-lg p-3">
          <p className="text-caption font-medium text-text-1 mb-2">VÌ VẬY hệ thống dùng số khác nhau cho mỗi tầng:</p>
          <Note>
            • <strong>Tuần này (M):</strong> S&OP consensus + CN adjust → chính xác nhất
            <br />• <strong>M+1:</strong> S&OP forecast → khá tin cậy
            <br />• <strong>M+2, M+3:</strong> FC commitment tiers:
          </Note>
          <CodeBlock className="mt-2">{`Hard M+1: ±5% tolerance  (cam kết chắc)
Firm M+2: ±15%           (cam kết tương đối)
Soft M+3: ±30%           (chỉ tham khảo)`}</CodeBlock>
          <Note>
            • <strong>&gt; M+3:</strong> AOP/Budget → chỉ indicative, không dùng cho SS.
          </Note>
        </div>
      </div>
    ),
  },
  {
    label: "FVA — Ai dự báo chính xác nhất?",
    formulaHeader: "FVA = MAPE(v0) − MAPE(version)",
    accent: "green",
    content: (
      <div className="space-y-3">
        <Note>
          FVA = Forecast Value Add = người nhập có làm <strong>TỐT HƠN</strong> model tự động không?
        </Note>
        <CodeBlock>{`Cách tính:
FVA = MAPE(v0 statistical) − MAPE(version đang xét)

v0 Statistical (model): MAPE 18,4%
v1 Sales (Anh Tuấn):   MAPE 22%  → FVA = 18,4 − 22 = −3,6% (xấu hơn model!)
v2 CN (Chị Thúy):      MAPE 12%  → FVA = 18,4 − 12 = +6,4% (tốt hơn model!)`}</CodeBlock>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-success/10 border border-success/30 rounded-lg p-2.5">
            <p className="text-caption font-semibold text-success">FVA dương ✅</p>
            <p className="text-caption text-text-2">Input có giá trị → nên tin</p>
          </div>
          <div className="bg-danger/10 border border-danger/30 rounded-lg p-2.5">
            <p className="text-caption font-semibold text-danger">FVA âm ❌</p>
            <p className="text-caption text-text-2">Input làm tệ hơn → dùng model thay</p>
          </div>
        </div>
        <Note>
          Hệ thống tracking FVA mỗi tháng → biết tin ai, không tin ai.
          <br />
          Đây là cơ sở để SC Manager chọn version nào trong S&OP meeting.
        </Note>
      </div>
    ),
  },
  {
    label: "Seasonal σ — Mùa vụ ảnh hưởng",
    formulaHeader: "σ theo mùa, không rolling",
    accent: "amber",
    content: (
      <div className="space-y-3">
        <Note>
          UNIS bán vật liệu xây dựng → <strong>mùa khô bán nhiều, mùa mưa bán ít</strong>.
        </Note>
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-3">
          <p className="text-caption text-text-1">
            <strong>Vấn đề:</strong> Nếu tính σ từ 90 ngày gần nhất (rolling): tháng 10 sẽ gồm data tháng 7-9 (mùa mưa) → σ thấp → SS thấp → <span className="text-danger font-semibold">stockout mùa xây!</span>
          </p>
        </div>
        <div className="bg-success/10 border border-success/30 rounded-lg p-3">
          <p className="text-caption text-text-1">
            <strong>Giải pháp:</strong> Seasonal σ = dùng data <strong>cùng kỳ năm trước</strong>.
            <br />Tháng 10/2026 dùng σ từ tháng 10/2025, 10/2024.
          </p>
        </div>
        <CodeBlock>{`Config:
UNIS:     seasonal_method = 'same_period_ly' (default)
          → Dùng data tháng 10 năm trước cho tháng 10 năm nay

FMCG:     seasonal_method = 'rolling'
(Mondelez) → Demand ổn định hơn, rolling 90d OK`}</CodeBlock>
      </div>
    ),
  },
];

/* ═══ SS Interactive Calculator ═══ */
function SSCalculator() {
  const [z, setZ] = useState(1.65);
  const sigma = 28.5;
  const lt = 14;
  const sqrtLt = Math.sqrt(lt);
  const ss = z * sigma * sqrtLt;
  const unitCost = 185000;
  const wc = (ss * unitCost) / 1e6;

  const scenarios = [
    { z: 1.28, label: "90%", risk: "10%" },
    { z: 1.65, label: "95%", risk: "5%" },
    { z: 2.33, label: "99%", risk: "1%" },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-caption font-medium text-text-2">z = {z.toFixed(2)}</span>
          <span className="text-caption text-text-3">Service level: {z <= 1.28 ? "90%" : z <= 1.65 ? "95%" : z <= 2.0 ? "97%" : "99%"}</span>
        </div>
        <Slider
          min={1.0}
          max={2.5}
          step={0.01}
          value={[z]}
          onValueChange={([v]) => setZ(v)}
        />
      </div>
      <div className="bg-surface-1 border border-surface-3 rounded-lg p-3">
        <p className="text-caption font-mono text-text-1">
          SS = {z.toFixed(2)} × 28,5 × √14 = <strong>{Math.round(ss)} m²</strong>
        </p>
        <p className="text-caption text-text-2 mt-1">
          WC = {Math.round(ss)} × 185.000₫ = <strong>{wc.toFixed(0)}M₫</strong>
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {scenarios.map((s) => {
          const ssSc = s.z * sigma * sqrtLt;
          const wcSc = (ssSc * unitCost) / 1e6;
          const baseline = 1.65 * sigma * sqrtLt * unitCost / 1e6;
          const diff = wcSc - baseline;
          return (
            <div key={s.z} className={`rounded-lg border p-2.5 text-center ${s.z === 1.65 ? "border-primary bg-primary/5" : "border-surface-3"}`}>
              <p className="text-[10px] font-semibold text-text-1">z={s.z} ({s.label})</p>
              <p className="text-caption font-mono font-bold text-text-1 mt-1">{Math.round(ssSc)} m²</p>
              <p className="text-[10px] text-text-2">WC: {wcSc.toFixed(0)}M₫</p>
              <p className="text-[10px] text-text-3">Stockout: {s.risk}</p>
              <p className={`text-[10px] font-medium mt-1 ${diff < 0 ? "text-success" : diff > 0 ? "text-danger" : "text-text-3"}`}>
                {s.z === 1.65 ? "Baseline" : `${diff > 0 ? "+" : ""}${diff.toFixed(0)}M₫`}
              </p>
            </div>
          );
        })}
      </div>
      <Note>
        SC Manager cân đối: chi phí vốn vs risk hết hàng.
        <br />95% (z=1.65) là lựa chọn phổ biến cho sản xuất/phân phối.
        <br />99% chỉ dùng cho items cực kỳ quan trọng (VD: thuốc, phụ tùng máy).
      </Note>
    </div>
  );
}

/* ═══ SS z Slider for Node 1 ═══ */
function ZSliderDemo() {
  const [z, setZ] = useState(1.65);
  const sigma = 28.5;
  const sqrtLt = Math.sqrt(14);
  const ss = z * sigma * sqrtLt;
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center justify-between text-caption">
        <span className="text-text-2">Kéo z:</span>
        <span className="font-mono font-semibold text-text-1">z = {z.toFixed(2)} → SS = {Math.round(ss)} m²</span>
      </div>
      <Slider min={1.0} max={2.5} step={0.01} value={[z]} onValueChange={([v]) => setZ(v)} />
    </div>
  );
}

/* ═══ TAB 4: Safety Stock ═══ */
const SSAlertIntro = () => (
  <Alert className="mb-4 border-info/30 bg-info/5">
    <Info className="h-4 w-4 text-info" />
    <AlertDescription className="text-caption text-text-1">
      <strong>Safety Stock = dự phòng cho SAI SỐ FORECAST</strong>, KHÔNG PHẢI dự phòng cho demand cao.
      <br />Nếu forecast chính xác 100% → SS = 0. FC tốt hơn → SS thấp hơn → tiết kiệm vốn.
    </AlertDescription>
  </Alert>
);

const tab4Nodes: LogicNodeData[] = [
  {
    label: "Công thức SS",
    formulaHeader: "SS = z × σ_fc_error × √LT",
    accent: "blue",
    content: (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Card 1: z */}
          <div className="rounded-lg border-2 border-info/40 bg-info/5 p-3">
            <p className="text-table font-bold text-info mb-1">z = Mức bảo vệ</p>
            <p className="text-caption text-text-2">Bạn muốn an toàn bao nhiêu?</p>
            <div className="mt-2 space-y-1 text-[10px] font-mono text-text-1">
              <p>z = 1.28 → 90% (10% risk)</p>
              <p className="font-bold">z = 1.65 → 95% (5% risk) ← UNIS</p>
              <p>z = 2.33 → 99% (1% risk, tốn vốn)</p>
            </div>
            <p className="text-[10px] text-text-3 mt-2 italic">VD: z=1.65 → cứ 20 tuần, chấp nhận 1 tuần có thể thiếu hàng.</p>
            <ZSliderDemo />
          </div>
          {/* Card 2: σ */}
          <div className="rounded-lg border-2 border-success/40 bg-success/5 p-3">
            <p className="text-table font-bold text-success mb-1">σ_fc_error = FC sai bao nhiêu?</p>
            <p className="text-caption text-text-2">σ = standard deviation sai số forecast.</p>
            <p className="text-[10px] text-text-1 mt-2">Tính từ 12 tuần gần nhất: |actual − forecast| mỗi tuần → tính σ.</p>
            <p className="text-[10px] font-mono font-semibold text-text-1 mt-2">UNIS GA-300 A4: σ = 28,5 m²/tuần</p>
            <p className="text-[10px] text-text-3 mt-1 italic">Nghĩa là: forecast thường sai khoảng ±28,5 m²/tuần.</p>
            <div className="mt-2 bg-success/10 rounded p-1.5">
              <p className="text-[10px] text-success font-medium">★ FC tốt hơn → σ giảm → SS giảm → tiết kiệm vốn. Đây là ROI lớn nhất.</p>
            </div>
          </div>
          {/* Card 3: √LT */}
          <div className="rounded-lg border-2 border-warning/40 bg-warning/5 p-3">
            <p className="text-table font-bold text-warning mb-1">√LT = Chờ hàng bao lâu?</p>
            <p className="text-caption text-text-2">LT = Lead Time = thời gian từ đặt NM đến nhận.</p>
            <div className="text-[10px] font-mono text-text-1 mt-2 space-y-0.5">
              <p>Mikado: 14 ngày. √14 = 3,74</p>
              <p>Đồng Tâm: 7 ngày. √7 = 2,65</p>
            </div>
            <p className="text-[10px] text-text-3 mt-2 italic">√LT vì: chờ càng lâu → SS càng nhiều (nhưng không tuyến tính).</p>
            <p className="text-[10px] text-warning font-medium mt-1">Mikado LT dài hơn → SS cao hơn 41%.</p>
          </div>
        </div>
        <CodeBlock>{`SS = z × σ_fc_error × √LT
   = 1,65 × 28,5 × √14
   = 1,65 × 28,5 × 3,74
   = 176 m² per SKU per CN
     
Tổng SS cho GA-300 A4 toàn network:
  CN-BD: 176 × 5,1 (demand weight) = 900
  CN-ĐN: 176 × 4,5 = 800
  CN-HN: 176 × 4,0 = 700
  CN-CT: 176 × 2,8 = 500
  Total = 2.900 m²`}</CodeBlock>
      </div>
    ),
  },
  {
    label: "Tại sao σ_fc_error mà KHÔNG PHẢI σ_demand?",
    formulaHeader: "QUAN TRỌNG — tiết kiệm 54% vốn",
    accent: "red",
    content: (
      <div className="space-y-3">
        <Note>
          Nhiều hệ thống dùng σ_demand (biến động demand) → SS quá cao → <strong>lãng phí vốn</strong>.
          <br />SCP Smartlog dùng <strong>σ_fc_error</strong> (sai số forecast) → SS chính xác hơn.
        </Note>
        <div className="bg-surface-1 border border-surface-3 rounded-lg p-3">
          <p className="text-caption font-semibold text-text-1 mb-2">TẠI SAO?</p>
          <Note>
            Forecast ĐÃ "hấp thụ" phần dự đoán được của demand.
            <br />SS chỉ cần buffer phần forecast <strong>SAI</strong> — phần không dự đoán được.
          </Note>
        </div>
        <CodeBlock>{`VÍ DỤ THỰC TẾ:
┌─────────────────────────────────────────────────────┐
│ Tháng 5: Demand thực tế = 7.650 (biến động LỚN)    │
│ Forecast = 7.500 (dự đoán GẦN ĐÚNG)                │
│ Sai số = 150 (chỉ 2%)                              │
│ → σ_fc_error THẤP → SS cần ÍT                      │
│                                                     │
│ Tháng 6: Demand thực tế = 5.000 (biến động NHỎ)    │
│ Forecast = 6.500 (dự đoán SAI)                      │
│ Sai số = 1.500 (30%)                                │
│ → σ_fc_error CAO → SS cần NHIỀU                     │
└─────────────────────────────────────────────────────┘

KẾT LUẬN:
σ_demand    = biến động demand   = 35 m²/ngày
σ_fc_error  = sai số forecast    = 16 m²/ngày (FC absorb 54%)

SS dùng σ_demand:   1,65 × 35 × 3,74 = 216 m² (quá cao)
SS dùng σ_fc_error: 1,65 × 16 × 3,74 = 99 m²  (chính xác)
→ Tiết kiệm 54% working capital!

FC accuracy cải thiện thêm (MAPE 18%→10%):
σ_fc_error giảm từ 16 → 9 → SS giảm thêm 44%.
→ ĐẦU TƯ FC ACCURACY = CÁCH TIẾT KIỆM VỐN TỐT NHẤT.`}</CodeBlock>
        {/* 2 bars comparison */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="bg-danger/70 rounded h-6 flex items-center px-2" style={{ width: "100%" }}>
              <span className="text-[10px] text-white font-medium whitespace-nowrap">σ_demand: SS = 216 m² | WC = 40M₫</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-success/70 rounded h-6 flex items-center px-2" style={{ width: "46%" }}>
              <span className="text-[10px] text-white font-medium whitespace-nowrap">σ_fc_error: SS = 99 m² | WC = 18M₫</span>
            </div>
            <span className="text-[10px] font-semibold text-success whitespace-nowrap">−54%</span>
          </div>
          <p className="text-[10px] text-text-3 text-center font-medium">Tiết kiệm 54% vốn nhờ dùng đúng σ</p>
        </div>
      </div>
    ),
  },
  {
    label: "SS thay đổi thì tốn/tiết kiệm bao nhiêu?",
    formulaHeader: "Interactive calculator",
    accent: "amber",
    content: <SSCalculator />,
  },
  {
    label: "LCNB giúp giảm SS network",
    formulaHeader: "SS giảm 25% nhờ risk pooling",
    accent: "green",
    content: (
      <div className="space-y-3">
        <Note>
          Khi bật LCNB (chuyển hàng CN→CN), SS giảm <strong>25%</strong> nhờ CN hỗ trợ nhau.
        </Note>
        <div className="grid grid-cols-2 gap-2">
          <div className="border border-danger/30 bg-danger/5 rounded-lg p-2.5 text-center">
            <p className="text-[10px] font-semibold text-danger">Không có LCNB</p>
            <p className="text-caption font-mono font-bold text-text-1 mt-1">SS = 2.900 m²</p>
            <p className="text-[10px] text-text-3">Mỗi CN tự đủ SS</p>
          </div>
          <div className="border border-success/30 bg-success/5 rounded-lg p-2.5 text-center">
            <p className="text-[10px] font-semibold text-success">Có LCNB ✓</p>
            <p className="text-caption font-mono font-bold text-text-1 mt-1">SS = 2.175 m²</p>
            <p className="text-[10px] text-text-3">CN thừa → CN thiếu</p>
          </div>
        </div>
        <div className="bg-success/10 border border-success/30 rounded-lg p-2.5 text-center">
          <p className="text-caption font-semibold text-success">Tiết kiệm: 725 m² = 134M₫/tháng</p>
        </div>
        <CodeBlock>{`Công thức: SS_lcnb = σ_fc_error × 0.75 (giảm 25% nhờ network pooling)

Risk pooling: 4 CN biến động không cùng lúc
→ gộp lại thì σ tổng nhỏ hơn Σ(σ riêng)`}</CodeBlock>
      </div>
    ),
  },
  {
    label: "Closed-loop: SS tự động điều chỉnh",
    formulaHeader: "Hệ thống tự học mỗi tuần",
    accent: "blue",
    content: (
      <div className="space-y-3">
        {/* Flow visual */}
        <div className="space-y-0">
          {[
            { step: "①", text: "Mỗi tuần: tính lại σ_fc_error từ 12 tuần gần nhất" },
            { step: "②", text: "FC accuracy tốt hơn → σ giảm → SS giảm tự động\nFC accuracy xấu hơn → σ tăng → SS tăng tự động" },
            { step: "③", text: "Stockout > 2 lần/tháng → SS tự tăng +15%\nExcess > 14 ngày → SS tự giảm −10%" },
            { step: "④", text: "Thay đổi gửi Workspace → Planner duyệt → áp dụng" },
            { step: "⑤", text: "DRP đêm nay dùng SS mới → kết quả tốt hơn" },
          ].map((item, i, arr) => (
            <div key={i}>
              <div className="flex items-start gap-3 py-2">
                <span className="text-lg leading-none">{item.step}</span>
                <p className="text-caption text-text-1 whitespace-pre-line">{item.text}</p>
              </div>
              {i < arr.length - 1 && (
                <div className="ml-3 border-l-2 border-dashed border-surface-3 h-3" />
              )}
            </div>
          ))}
        </div>
        <div className="bg-surface-1 border border-surface-3 rounded-lg p-3 text-center">
          <p className="text-caption font-semibold text-text-1">Hệ thống TỰ HỌC. Planner chỉ DUYỆT, không phải tính tay.</p>
        </div>
        <div className="bg-success/10 border border-success/30 rounded-lg p-3">
          <p className="text-caption font-semibold text-success mb-1">ROI Example:</p>
          <CodeBlock>{`MAPE cải thiện 25% → 15%:
  → σ_fc_error giảm 42%
  → SS giảm 42%
  → WC tiết kiệm: 42% × 1.742M₫ = 732M₫/tháng
  → "Đầu tư vào FC accuracy = cách tiết kiệm vốn tốt nhất."`}</CodeBlock>
        </div>
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
        {activeTab === "ss" && <SSAlertIntro />}
        {current.nodes.map((node, i) => (
          <LogicTreeNode key={`${activeTab}-${i}`} node={node} />
        ))}
      </div>
    </AppLayout>
  );
}

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

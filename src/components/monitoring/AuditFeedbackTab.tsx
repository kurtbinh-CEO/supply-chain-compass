import { useState } from "react";
import { cn } from "@/lib/utils";
import { StatusChip } from "@/components/StatusChip";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowRight, Zap, Shield, Target, Box, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TermTooltip } from "@/components/TermTooltip";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";

type Period = "Tháng" | "Quý" | "YTD";

function PeriodFilter({ value, onChange }: { value: Period; onChange: (v: Period) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Period)}
      className="h-8 rounded-button border border-surface-3 bg-surface-0 px-3 text-table-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <option value="Tháng">Tháng</option>
      <option value="Quý">Quý</option>
      <option value="YTD">Lũy kế năm</option>
    </select>
  );
}

function FeedForwardCard({ title, description, linkLabel, linkUrl }: { title: string; description: string; linkLabel: string; linkUrl: string }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-card bg-info-bg border border-info/20 border-l-4 border-l-primary p-4 space-y-2">
      <h4 className="font-display text-table font-semibold text-text-1">{title}</h4>
      <p className="text-table-sm text-text-2">{description}</p>
      <button onClick={() => navigate(linkUrl)} className="inline-flex items-center gap-1 text-primary text-table-sm font-medium hover:underline">
        {linkLabel} <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// Section A — Audit dự báo
type DemandAuditRow = { category: string; plan: string; actual: string; bias: string; fva: string };
const demandAudit: DemandAuditRow[] = [
  { category: "Thành phẩm", plan: "1.240,5", actual: "1.215,2", bias: "-2.0%", fva: "+4.2%" },
  { category: "Nguyên liệu", plan: "890,0", actual: "945,8", bias: "+6.2%", fva: "+1.8%" },
  { category: "Bao bì", plan: "459,2", actual: "448,0", bias: "-0.5%", fva: "+0.9%" },
];

// Section B — Hiệu suất cung ứng
type SupplyPerfRow = { node: string; honoring: string; onTime: string; ltGap: string; grade: string };
const supplyPerf: SupplyPerfRow[] = [
  { node: "Hub Trung tâm VN", honoring: "98.5%", onTime: "94.0%", ltGap: "-0.2", grade: "A+" },
  { node: "Sourcing miền Bắc", honoring: "82.1%", onTime: "78.5%", ltGap: "+2.5", grade: "C-" },
  { node: "Cổng phía Đông", honoring: "91.0%", onTime: "89.2%", ltGap: "0.0", grade: "B" },
];

// Section C — Ngoại lệ lặp lại
const topExceptions = [
  { sku: "SKU-7728: Sắp hết hàng", location: "Kho A", count: "12 lần" },
  { sku: "SKU-9102: Dự báo trễ hàng", location: "Đang vận chuyển", count: "8 lần" },
  { sku: "SKU-1029: Cảnh báo lệch giá", location: "Thu mua", count: "5 lần" },
];

// Section D — Sức khỏe tồn kho
type InventoryHealthRow = { channel: string; target: string; actual: string; stockout: string; adequacy: string };
const inventoryHealth: InventoryHealthRow[] = [
  { channel: "Kênh hiện đại", target: "4,2 tỷ ₫", actual: "3,9 tỷ ₫", stockout: "Trung bình", adequacy: "92%" },
  { channel: "Thương mại điện tử", target: "2,8 tỷ ₫", actual: "3,1 tỷ ₫", stockout: "Thấp", adequacy: "104%" },
  { channel: "Kênh truyền thống", target: "1,5 tỷ ₫", actual: "1,1 tỷ ₫", stockout: "Cao", adequacy: "76%" },
];

const waterfallChartData = [
  { name: "Chi phí gốc", positive: 245, negative: 0 },
  { name: "Vận chuyển", positive: 24.5, negative: 0 },
  { name: "Thiếu hàng", positive: 112, negative: 0 },
  { name: "Tối ưu SS", positive: 0, negative: 45.1 },
  { name: "Kế hoạch ròng", positive: 336.4, negative: 0 },
];

export function AuditFeedbackTab() {
  const [periodA, setPeriodA] = useState<Period>("Tháng");
  const [periodB, setPeriodB] = useState<Period>("Tháng");
  const [periodC, setPeriodC] = useState<Period>("Tháng");
  const [periodD, setPeriodD] = useState<Period>("Tháng");
  const [periodE, setPeriodE] = useState<Period>("Tháng");

  // ====================== SmartTable cấu hình ======================
  const demandColumns: SmartTableColumn<DemandAuditRow>[] = [
    {
      key: "category", label: "Nhóm hàng", sortable: true, hideable: false, priority: "high",
      filter: "text", width: 180,
      render: (r) => <span className="font-medium text-text-1">{r.category}</span>,
    },
    {
      key: "plan", label: "Kế hoạch (K đv)", sortable: true, hideable: true, priority: "medium",
      numeric: true, align: "right", width: 140, accessor: (r) => parseFloat(r.plan.replace(",", ".")),
      render: (r) => <span className="text-text-2 tabular-nums">{r.plan}</span>,
    },
    {
      key: "actual", label: "Thực tế (K đv)", sortable: true, hideable: true, priority: "medium",
      numeric: true, align: "right", width: 140, accessor: (r) => parseFloat(r.actual.replace(",", ".")),
      render: (r) => <span className="text-text-2 tabular-nums">{r.actual}</span>,
    },
    {
      key: "bias", label: "Sai lệch %", sortable: true, hideable: true, priority: "high",
      numeric: true, align: "right", width: 110, accessor: (r) => parseFloat(r.bias),
      render: (r) => (
        <span className={cn("font-medium tabular-nums", r.bias.startsWith("-") ? "text-danger" : "text-success")}>{r.bias}</span>
      ),
    },
    {
      key: "fva", label: "FVA % (Tốt nhất)", sortable: true, hideable: true, priority: "high",
      numeric: true, align: "right", width: 140, accessor: (r) => parseFloat(r.fva),
      render: (r) => <span className="font-medium text-success tabular-nums">{r.fva}</span>,
    },
  ];

  const supplyColumns: SmartTableColumn<SupplyPerfRow>[] = [
    {
      key: "node", label: "Node", sortable: true, hideable: false, priority: "high",
      filter: "text", width: 200,
      render: (r) => <span className="font-medium text-text-1">{r.node}</span>,
    },
    {
      key: "honoring", label: "Giữ cam kết %", sortable: true, hideable: true, priority: "high",
      numeric: true, align: "right", width: 140, accessor: (r) => parseFloat(r.honoring),
      render: (r) => <span className="text-text-1 tabular-nums">{r.honoring}</span>,
    },
    {
      key: "onTime", label: "Đúng hẹn %", sortable: true, hideable: true, priority: "medium",
      numeric: true, align: "right", width: 130, accessor: (r) => parseFloat(r.onTime),
      render: (r) => <span className="text-text-1 tabular-nums">{r.onTime}</span>,
    },
    {
      key: "ltGap", label: "Lệch LT (Ngày)", sortable: true, hideable: true, priority: "medium",
      numeric: true, align: "right", width: 140, accessor: (r) => parseFloat(r.ltGap),
      render: (r) => (
        <span className={cn(
          "font-medium tabular-nums",
          r.ltGap.startsWith("+") ? "text-danger" : r.ltGap === "0.0" ? "text-text-2" : "text-success"
        )}>
          {r.ltGap}
        </span>
      ),
    },
    {
      key: "grade", label: "Hạng", sortable: true, hideable: false, priority: "high",
      align: "center", width: 90,
      filter: "enum",
      filterOptions: [
        { value: "A+", label: "A+" }, { value: "A", label: "A" },
        { value: "B", label: "B" }, { value: "C-", label: "C-" },
      ],
      render: (r) => (
        <span className={cn(
          "inline-flex items-center justify-center h-7 w-9 rounded-md text-table-sm font-bold border",
          r.grade.startsWith("A") ? "border-success text-success bg-success-bg" :
          r.grade.startsWith("B") ? "border-info text-info bg-info-bg" :
          "border-danger text-danger bg-danger-bg"
        )}>
          {r.grade}
        </span>
      ),
    },
  ];

  const inventoryColumns: SmartTableColumn<InventoryHealthRow>[] = [
    {
      key: "channel", label: "Kênh", sortable: true, hideable: false, priority: "high",
      filter: "text", width: 200,
      render: (r) => <span className="font-medium text-text-1">{r.channel}</span>,
    },
    {
      key: "target", label: "HSTK mục tiêu", sortable: false, hideable: true, priority: "medium",
      align: "right", width: 130,
      render: (r) => <span className="text-text-1 tabular-nums">{r.target}</span>,
    },
    {
      key: "actual", label: "HSTK thực tế", sortable: false, hideable: true, priority: "medium",
      align: "right", width: 130,
      render: (r) => <span className="text-text-1 tabular-nums">{r.actual}</span>,
    },
    {
      key: "stockout", label: "Rủi ro thiếu hàng", sortable: true, hideable: false, priority: "high",
      width: 150, accessor: (r) => r.stockout,
      filter: "enum",
      filterOptions: [
        { value: "Cao", label: "Cao" },
        { value: "Trung bình", label: "Trung bình" },
        { value: "Thấp", label: "Thấp" },
      ],
      render: (r) => (
        <span className={cn(
          "font-bold uppercase",
          r.stockout === "Cao" ? "text-danger" : r.stockout === "Trung bình" ? "text-warning" : "text-success"
        )}>
          {r.stockout}
        </span>
      ),
    },
    {
      key: "adequacy", label: "Đầy đủ SS", sortable: true, hideable: true, priority: "medium",
      numeric: true, align: "right", width: 110, accessor: (r) => parseFloat(r.adequacy),
      render: (r) => <span className="text-text-1 tabular-nums">{r.adequacy}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* A: Audit độ chính xác dự báo */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h2 className="font-display text-section-header text-text-1">A) Audit độ chính xác dự báo</h2>
              <TermTooltip term="FVA"><span className="text-caption text-text-3">(FVA)</span></TermTooltip>
            </div>
            <div className="flex items-center gap-2">
              <StatusChip status="success" label="Ổn định" />
              <PeriodFilter value={periodA} onChange={setPeriodA} />
            </div>
          </div>
          <SmartTable<DemandAuditRow>
            screenId="monitoring-audit-demand"
            title="Audit độ chính xác dự báo"
            exportFilename="audit-do-chinh-xac-du-bao"
            columns={demandColumns}
            data={demandAudit}
            defaultDensity="normal"
            getRowId={(r) => r.category}
            rowSeverity={(r) => Math.abs(parseFloat(r.bias)) > 5 ? "watch" : "ok"}
          />
        </div>
        <div className="col-span-2 space-y-4">
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-info" />
              <span className="text-table-header uppercase text-info font-semibold tracking-wider">Mức tin cậy</span>
            </div>
            <h3 className="font-display text-section-header text-text-1">Điểm tin cậy mô hình</h3>
            <p className="text-table text-text-2">
              Mức tin cậy của hệ thống đối với dự báo ML cho Nguyên liệu giảm 12% do nhiều lần dưới kế hoạch.
              Khuyến nghị điều chỉnh thủ công cho Q3.
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-table-sm text-text-2">Mức tin cậy</span>
              <span className="text-table font-bold text-primary">82%</span>
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full" style={{ width: "82%" }} />
            </div>
          </div>
          <FeedForwardCard
            title="Điều chỉnh dự báo"
            description="Cân nhắc tăng đệm Nguyên liệu thêm 6% cho Q3."
            linkLabel="Đến Cấu hình"
            linkUrl="/config"
          />
        </div>
      </div>

      {/* B: Hiệu suất cung ứng */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 rounded-card border border-surface-3 bg-surface-2 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />
            <span className="text-table-header uppercase text-warning font-semibold tracking-wider">Tự động hóa</span>
          </div>
          <h3 className="font-display text-section-header text-text-1">
            <TermTooltip term="ATP">ATP</TermTooltip> tự giảm
          </h3>
          <p className="text-table text-text-2">
            NM "NM Logistics" đang giảm 15% tỷ lệ giữ cam kết LT. Hệ thống đã kích hoạt giảm 5% ATP cho các đơn hàng tương lai từ node này.
          </p>
          <button className="inline-flex items-center gap-1 rounded-button border border-primary text-primary px-4 py-2 text-table font-medium hover:bg-info-bg transition-colors">
            Xem xếp hạng NM
          </button>
        </div>
        <div className="col-span-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-text-2" />
              <h2 className="font-display text-section-header text-text-1">B) Hiệu suất cung ứng</h2>
              <TermTooltip term="HonoringRate"><span className="text-caption text-text-3">(Honoring)</span></TermTooltip>
            </div>
            <PeriodFilter value={periodB} onChange={setPeriodB} />
          </div>
          <SmartTable<SupplyPerfRow>
            screenId="monitoring-audit-supply"
            title="Hiệu suất cung ứng"
            exportFilename="hieu-suat-cung-ung"
            columns={supplyColumns}
            data={supplyPerf}
            defaultDensity="normal"
            getRowId={(r) => r.node}
            rowSeverity={(r) => r.grade.startsWith("C") ? "shortage" : r.grade.startsWith("B") ? "watch" : "ok"}
          />
        </div>
      </div>

      {/* C: Phân tích thực thi & ngoại lệ */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-text-2" />
              <h2 className="font-display text-section-header text-text-1">C) Thực thi & phân tích ngoại lệ</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-table-header uppercase text-text-3">
                  <TermTooltip term="FillRate">Tỷ lệ lấp đầy</TermTooltip>
                </p>
                <p className="font-display text-kpi text-text-1">96.8%</p>
              </div>
              <div className="text-center">
                <p className="text-table-header uppercase text-text-3">Thời gian xử lý</p>
                <p className="font-display text-kpi text-text-1">4.2h</p>
              </div>
              <PeriodFilter value={periodC} onChange={setPeriodC} />
            </div>
          </div>
          <div className="px-5 py-3">
            <p className="text-table-header uppercase text-text-3 mb-2">Top 5 ngoại lệ lặp lại</p>
            <div className="space-y-2">
              {topExceptions.map((ex, i) => (
                <div key={i} className="flex items-center gap-3 text-table">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", i < 2 ? "bg-danger" : "bg-primary")} />
                  <span className="text-text-1 font-medium flex-1">{ex.sku}</span>
                  <span className="text-text-2">{ex.location}</span>
                  <span className="text-text-2 tabular-nums">{ex.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-2 space-y-4">
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5 space-y-3 text-center">
            <Zap className="h-8 w-8 text-primary mx-auto" />
            <h3 className="font-display text-section-header text-text-1">Tự động tăng SS</h3>
            <p className="text-table text-text-2">
              Phát hiện thiếu hàng lặp lại ở nhóm "Hàng tươi". Đệm <TermTooltip term="SS">SS</TermTooltip> tự động tăng +12%.
            </p>
            <span className="inline-block text-table-header uppercase font-bold text-text-1 border border-surface-3 rounded-full px-3 py-1">Đang điều chỉnh</span>
          </div>
          <FeedForwardCard
            title="Chuyển tiếp ngoại lệ"
            description="Liên kết các ngoại lệ lặp lại với điều chỉnh SS tự động."
            linkLabel="Đến Tồn an toàn"
            linkUrl="/monitoring"
          />
        </div>
      </div>

      {/* D: Tổng quan sức khỏe tồn kho */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4 text-text-2" />
              <h2 className="font-display text-section-header text-text-1">D) Sức khỏe tồn kho</h2>
              <TermTooltip term="HSTK"><span className="text-caption text-text-3">(HSTK)</span></TermTooltip>
            </div>
            <PeriodFilter value={periodD} onChange={setPeriodD} />
          </div>
          <SmartTable<InventoryHealthRow>
            screenId="monitoring-audit-inventory"
            title="Sức khỏe tồn kho"
            exportFilename="suc-khoe-ton-kho"
            columns={inventoryColumns}
            data={inventoryHealth}
            defaultDensity="normal"
            getRowId={(r) => r.channel}
            rowSeverity={(r) => r.stockout === "Cao" ? "shortage" : r.stockout === "Trung bình" ? "watch" : "ok"}
          />
        </div>
        <div className="col-span-2 space-y-4">
          <div className="rounded-card border border-surface-3 bg-surface-2 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-1 rounded-full bg-gradient-primary" />
              <h3 className="font-display text-section-header text-text-1">Điều chỉnh SS</h3>
            </div>
            <p className="text-caption text-text-3">Chính sách chu kỳ kế tiếp</p>
            <div className="space-y-2">
              <div className="flex justify-between text-table">
                <span className="text-text-2">Tăng đệm tồn kho</span>
                <span className="text-success font-medium">+15.2%</span>
              </div>
              <div className="flex justify-between text-table">
                <span className="text-text-2">Điều tiết động</span>
                <span className="text-text-1 font-medium">ĐANG BẬT</span>
              </div>
            </div>
            <p className="text-caption text-text-3 italic">Điều chỉnh sẽ có hiệu lực vào sáng thứ Hai khi đồng bộ.</p>
          </div>
          <FeedForwardCard
            title="Chuyển tiếp tồn kho"
            description="Các kênh đầy đủ thấp cần xem xét SS trước chu kỳ kế tiếp."
            linkLabel="Đến Cung ứng"
            linkUrl="/supply"
          />
        </div>
      </div>

      {/* E: Tác động tài chính & waterfall */}
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3 rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-text-2" />
              <h2 className="font-display text-section-header text-text-1">E) Tác động tài chính & dòng chi phí</h2>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-table-header uppercase text-text-3">Vốn lưu động</p>
                <p className="font-display text-kpi text-text-1">12,4 tỷ ₫</p>
              </div>
              <div className="text-center">
                <p className="text-table-header uppercase text-text-3">Tiết kiệm LCNB</p>
                <p className="font-display text-kpi text-success">+840 triệu ₫</p>
              </div>
              <PeriodFilter value={periodE} onChange={setPeriodE} />
            </div>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={waterfallChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${v}K ₫`} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "var(--color-surface-3)", fontSize: 12 }} />
                <Bar dataKey="positive" fill="#2563EB" name="Chi phí" radius={[4, 4, 0, 0]} />
                <Bar dataKey="negative" fill="var(--color-success-text)" name="Tiết kiệm" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-surface-3">
              {[
                { label: "Vận chuyển khẩn", value: "24,5 triệu ₫" },
                { label: "Chi phí thiếu hàng", value: "112,0 triệu ₫", color: "text-danger" },
                { label: "Chi phí lưu kho", value: "45,1 triệu ₫" },
                { label: "ROI LCNB", value: "14.2%", color: "text-success" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <p className="text-table-header uppercase text-text-3">{item.label}</p>
                  <p className={cn("font-display text-section-header", item.color || "text-text-1")}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="col-span-2 space-y-4">
          <FeedForwardCard
            title="Mục tiêu tiết kiệm"
            description="Giảm SS thêm 4% ở các node ổn định sẽ tiết kiệm thêm 120 triệu ₫ vốn lưu động mỗi tháng."
            linkLabel="Đến Cấu hình"
            linkUrl="/config"
          />
          <div className="rounded-card bg-success p-6 text-primary-foreground text-center space-y-3">
            <Shield className="h-10 w-10 mx-auto opacity-80" />
            <h3 className="font-display text-section-header">Hoàn thành audit</h3>
            <p className="font-display text-kpi">98.2%</p>
            <button className="inline-flex items-center gap-1 rounded-button border border-white/30 bg-white/10 px-4 py-2 text-table font-medium hover:bg-white/20 transition-colors">
              Phát hành audit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

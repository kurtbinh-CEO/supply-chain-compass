import { KpiCard } from "@/components/KpiCard";
import { StatusChip } from "@/components/StatusChip";
import { AlertTriangle, TrendingDown, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const exceptions = [
  {
    id: "EX-001", type: "Thiếu hụt tồn kho", sku: "GT-6060-WH",
    description: "Gạch 60x60 trắng sắp hết tồn — chỉ còn 3 ngày bán",
    revenueAtRisk: "1.2 tỷ", costToResolve: "180 tr", roi: "6.7x", timeToAct: "48h",
    status: "danger" as const, statusLabel: "Khẩn cấp",
  },
  {
    id: "EX-002", type: "Chênh lệch dự báo", sku: "GT-3030-BG",
    description: "Dự báo tháng 5 vượt 32% so với xu hướng — cần xác nhận",
    revenueAtRisk: "680 tr", costToResolve: "45 tr", roi: "15.1x", timeToAct: "5 ngày",
    status: "warning" as const, statusLabel: "Cần xem xét",
  },
  {
    id: "EX-003", type: "Trễ giao hàng NCC", sku: "KM-GLAZE-01",
    description: "NCC Minh Phát trễ 7 ngày — ảnh hưởng 12 đơn sản xuất",
    revenueAtRisk: "950 tr", costToResolve: "120 tr", roi: "7.9x", timeToAct: "24h",
    status: "danger" as const, statusLabel: "Khẩn cấp",
  },
  {
    id: "EX-004", type: "Tồn kho cao", sku: "GT-4545-GR",
    description: "Tồn kho 92 ngày bán — vượt ngưỡng 60 ngày",
    revenueAtRisk: "340 tr", costToResolve: "25 tr", roi: "13.6x", timeToAct: "2 tuần",
    status: "info" as const, statusLabel: "Theo dõi",
  },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Screen title */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-screen-title text-text-1">Tổng quan chuỗi cung ứng</h1>
        <span className="text-table-sm text-text-3">Cập nhật: 13/04/2026 08:30</span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard title="Doanh thu rủi ro" value="3.17" unit="tỷ VND" trend={{ value: "12% vs tuần trước", positive: false }} />
        <KpiCard title="Ngoại lệ mở" value="14" unit="vấn đề" trend={{ value: "3 mới hôm nay", positive: false }} />
        <KpiCard title="Fill rate" value="94.2" unit="%" trend={{ value: "1.3% vs tháng trước", positive: true }} />
        <KpiCard title="Ngày tồn kho TB" value="38" unit="ngày" trend={{ value: "Trong ngưỡng", positive: true }} />
      </div>

      {/* Exception table */}
      <div className="rounded-card border border-surface-3 bg-surface-2">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h2 className="font-display text-section-header text-text-1">Ngoại lệ ưu tiên</h2>
            <span className="ml-1 rounded-full bg-danger-bg text-danger text-caption font-medium px-2 py-0.5">
              4 cần xử lý
            </span>
          </div>
          <Button variant="outline" size="sm">
            Xem tất cả <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-3">
              {["Mã", "Loại", "Mô tả"].map((h) => (
                <th key={h} className="text-left text-table-header uppercase text-text-3 px-5 py-3">{h}</th>
              ))}
              <th className="text-right text-table-header uppercase text-text-3 px-5 py-3">Doanh thu rủi ro</th>
              <th className="text-right text-table-header uppercase text-text-3 px-5 py-3">ROI</th>
              <th className="text-center text-table-header uppercase text-text-3 px-5 py-3">Thời hạn</th>
              <th className="text-center text-table-header uppercase text-text-3 px-5 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((ex, i) => (
              <tr
                key={ex.id}
                className={`border-b border-surface-3/50 hover:bg-surface-3 transition-all cursor-pointer ${
                  i % 2 === 0 ? "bg-surface-0" : "bg-surface-2"
                }`}
              >
                <td className="px-5 py-3 text-table font-mono text-text-2">{ex.id}</td>
                <td className="px-5 py-3 text-table font-medium text-text-1">{ex.type}</td>
                <td className="px-5 py-3 text-table text-text-2 max-w-xs truncate">{ex.description}</td>
                <td className="px-5 py-3 text-table font-medium text-text-1 text-right tabular-nums">{ex.revenueAtRisk}</td>
                <td className="px-5 py-3 text-table font-medium text-success text-right tabular-nums">{ex.roi}</td>
                <td className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1 text-table-sm text-text-2">
                    <Clock className="h-3 w-3" />
                    {ex.timeToAct}
                  </span>
                </td>
                <td className="px-5 py-3 text-center">
                  <StatusChip status={ex.status} label={ex.statusLabel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Quick summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-card border border-surface-3 bg-surface-1 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-warning" />
            <h3 className="font-display text-section-header text-text-1">Dự báo nhu cầu</h3>
          </div>
          <p className="text-table text-text-2">Tháng 5 dự kiến nhu cầu gạch 60x60 tăng 18%. Nhóm GT-3030 giảm 5%.</p>
          <Button variant="ghost" size="sm" className="text-primary">Xem chi tiết →</Button>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-1 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-info" />
            <h3 className="font-display text-section-header text-text-1">Chờ duyệt</h3>
          </div>
          <p className="text-table text-text-2">3 đề xuất mua hàng và 2 điều chỉnh dự báo đang chờ duyệt tại Workspace.</p>
          <Button variant="ghost" size="sm" className="text-primary">Đi đến Workspace →</Button>
        </div>
        <div className="rounded-card border border-surface-3 bg-surface-1 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-danger" />
            <h3 className="font-display text-section-header text-text-1">NCC cần theo dõi</h3>
          </div>
          <p className="text-table text-text-2">2 NCC có fill-rate dưới 85% trong 30 ngày qua. Minh Phát: 72%, Đại Việt: 81%.</p>
          <Button variant="ghost" size="sm" className="text-primary">Xem NCC →</Button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { StatusChip } from "@/components/StatusChip";
import { Shield, TrendingDown, TrendingUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFcAccuracy } from "@/hooks/useMonitoringData";
import { TermTooltip } from "@/components/TermTooltip";

const fallbackMapeData = [
  { week: "W01", hw: 28, ai: 22 }, { week: "W02", hw: 26, ai: 24 }, { week: "W03", hw: 30, ai: 25 },
  { week: "W04", hw: 27, ai: 23 }, { week: "W05", hw: 29, ai: 28 }, { week: "W06", hw: 25, ai: 27 },
  { week: "W07", hw: 24, ai: 30 }, { week: "W08", hw: 26, ai: 29 }, { week: "W09", hw: 23, ai: 26 },
  { week: "W10", hw: 22, ai: 20 }, { week: "W11", hw: 20, ai: 18 }, { week: "W12", hw: 24.8, ai: 16.2 },
];

const models = [
  { name: "HW (Hiện tại)", mape: "24.8%", trend: "up", stdev: "±4.2", ssImpact: "1.2k m²", wcImpact: "182Mđ", optimal: false },
  { name: "XGBoost (AI)", mape: "16.2%", trend: "down", stdev: "±1.8", ssImpact: "-300m²", wcImpact: "-56Mđ", optimal: true },
];

export function FcAccuracyTab() {
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const { weeklyData } = useFcAccuracy();
  const mapeData = weeklyData.length > 0 ? weeklyData : fallbackMapeData;

  const handleSwitchConfirm = () => {
    setShowSwitchModal(false);
    toast.success("Đã chuyển sang XGBoost (AI) thành công", { description: "Mô hình sẽ được áp dụng từ chu kỳ tiếp theo." });
  };

  return (
    <div className="grid grid-cols-5 gap-6">
      {/* Trái: chart + bảng — 3 cột */}
      <div className="col-span-3 space-y-6">
        {/* Biểu đồ MAPE */}
        <div className="rounded-card border border-surface-3 bg-surface-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-section-header text-text-1">
              Hiệu suất <TermTooltip term="MAPE">MAPE</TermTooltip> 12 tuần
            </h2>
            <div className="flex items-center gap-4 text-table-sm text-text-2">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-text-3" /> HW (Hiện tại)</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" /> XGBoost (AI)</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={mapeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-3)" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${v}%`} />
              <Tooltip contentStyle={{ borderRadius: 8, borderColor: "var(--color-surface-3)", fontSize: 12 }} />
              <Line type="monotone" dataKey="hw" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" dot={false} name="HW" />
              <Line type="monotone" dataKey="ai" stroke="#2563EB" strokeWidth={2.5} dot={false} name="XGBoost" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bảng so sánh mô hình */}
        <div className="rounded-card border border-surface-3 bg-surface-2">
          <div className="px-5 py-4 border-b border-surface-3">
            <h2 className="font-display text-section-header text-text-1 uppercase">So sánh mô hình</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3">
                {[
                  { label: "Mô hình", term: null },
                  { label: "MAPE", term: "MAPE" },
                  { label: "Xu hướng", term: null },
                  { label: "σ (Độ lệch)", term: null },
                  { label: "Ảnh hưởng SS", term: "SS" },
                  { label: "Ảnh hưởng vốn", term: null },
                ].map((h) => (
                  <th key={h.label} className="text-left text-table-header uppercase text-text-3 px-5 py-3">
                    {h.term ? <TermTooltip term={h.term}>{h.label}</TermTooltip> : h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {models.map((m, i) => (
                <tr key={m.name} className={cn("border-b border-surface-3/50", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                  <td className="px-5 py-3">
                    <span className="text-table font-medium text-text-1">{m.name}</span>
                    {m.optimal && <StatusChip status="success" label="Tối ưu" className="ml-2" />}
                  </td>
                  <td className={cn("px-5 py-3 text-table font-mono font-bold tabular-nums", m.optimal ? "text-success" : "text-text-1")}>{m.mape}</td>
                  <td className="px-5 py-3">
                    {m.trend === "up" ? <TrendingUp className="h-4 w-4 text-danger" /> : <TrendingDown className="h-4 w-4 text-success" />}
                  </td>
                  <td className="px-5 py-3 text-table text-text-2 tabular-nums">{m.stdev}</td>
                  <td className={cn("px-5 py-3 text-table font-medium tabular-nums", m.optimal ? "text-success" : "text-text-2")}>{m.ssImpact}</td>
                  <td className={cn("px-5 py-3 text-table font-medium tabular-nums", m.optimal ? "text-success" : "text-text-2")}>{m.wcImpact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phải: AI Trust Block — 2 cột */}
      <div className="col-span-2">
        <div className="rounded-card bg-primary p-6 text-primary-foreground space-y-5 sticky top-20">
          <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-caption font-semibold uppercase tracking-wider">
            Gợi ý từ AI
          </span>
          <h3 className="font-display text-screen-title">Chuyển sang XGBoost để tối ưu hiệu quả</h3>
          <p className="text-table opacity-90">
            Mô hình AI phát hiện biến động mùa vụ cao trong logic Holt-Winters (HW) hiện tại.
            Việc chuyển đổi giúp giảm đáng kể rủi ro tồn dư.
          </p>

          <div className="space-y-2">
            <div className="rounded-md bg-white/10 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 opacity-80" />
                <span className="text-table-sm">Tối ưu SS</span>
              </div>
              <span className="font-display font-bold text-table">-300m²</span>
            </div>
            <div className="rounded-md bg-white/10 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 opacity-80" />
                <span className="text-table-sm">Giảm vốn lưu động</span>
              </div>
              <span className="font-display font-bold text-table">-56Mđ/tháng</span>
            </div>
          </div>

          <Button
            className="w-full bg-white text-primary hover:bg-white/90 font-medium"
            onClick={() => setShowSwitchModal(true)}
          >
            Chuyển mô hình <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Modal chuyển mô hình */}
      <Dialog open={showSwitchModal} onOpenChange={setShowSwitchModal}>
        <DialogContent className="bg-surface-2 border-surface-3">
          <DialogHeader>
            <DialogTitle className="font-display text-text-1">Xác nhận chuyển mô hình</DialogTitle>
            <DialogDescription className="text-table text-text-2">
              Bạn có chắc chắn muốn chuyển từ HW sang XGBoost (AI)?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-info bg-info-bg p-4 space-y-2">
            <p className="text-table text-text-1">Thay đổi dự kiến:</p>
            <div className="flex gap-6 text-table-sm">
              <span className="text-success font-medium">MAPE: 24.8% → 16.2%</span>
              <span className="text-success font-medium">SS: -300m²</span>
              <span className="text-success font-medium">Vốn: -56Mđ/tháng</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSwitchModal(false)}>Hủy</Button>
            <Button className="bg-gradient-primary text-primary-foreground" onClick={handleSwitchConfirm}>Xác nhận chuyển</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

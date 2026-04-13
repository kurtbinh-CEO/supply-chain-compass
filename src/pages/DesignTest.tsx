import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/StatusChip";

export default function DesignTest() {
  return (
    <div className="min-h-screen bg-surface-0 p-10 space-y-8 font-sans">
      <h1 className="font-display text-screen-title text-text-1">Design Token Test</h1>

      {/* 1. Gradient button */}
      <section className="space-y-2">
        <p className="text-table-sm uppercase tracking-wider text-text-3">Gradient Button</p>
        <div className="flex gap-3">
          <Button>Primary Gradient</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </section>

      {/* 2. Tonal status chips */}
      <section className="space-y-2">
        <p className="text-table-sm uppercase tracking-wider text-text-3">Tonal Chips</p>
        <div className="flex gap-3">
          <StatusChip status="success" label="On track" />
          <StatusChip status="warning" label="Cần xem xét" />
          <StatusChip status="danger" label="Khẩn cấp" />
          <StatusChip status="info" label="Theo dõi" />
        </div>
      </section>

      {/* 3. Card */}
      <section className="space-y-2">
        <p className="text-table-sm uppercase tracking-wider text-text-3">Card (surface-1, radius-lg)</p>
        <div className="rounded-card border border-surface-3 bg-surface-1 p-5 max-w-sm">
          <p className="font-display text-section-header text-text-1 mb-1">KPI Card</p>
          <p className="font-display text-kpi text-text-1">3.17 <span className="text-table text-text-2">tỷ VND</span></p>
          <p className="text-table-sm text-danger font-medium mt-1">↓ 12% vs tuần trước</p>
        </div>
      </section>

      {/* 4. Zebra table row */}
      <section className="space-y-2">
        <p className="text-table-sm uppercase tracking-wider text-text-3">Zebra Table</p>
        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden max-w-2xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-3">
                <th className="text-left text-table-header uppercase text-text-3 px-5 py-3">SKU</th>
                <th className="text-left text-table-header uppercase text-text-3 px-5 py-3">Tên sản phẩm</th>
                <th className="text-right text-table-header uppercase text-text-3 px-5 py-3">Tồn kho</th>
                <th className="text-center text-table-header uppercase text-text-3 px-5 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-surface-0 border-b border-surface-3/50 hover:bg-surface-3/50 transition-colors">
                <td className="px-5 py-3 text-table font-mono text-text-2">GT-6060-WH</td>
                <td className="px-5 py-3 text-table font-medium text-text-1">Gạch 60×60 trắng</td>
                <td className="px-5 py-3 text-table text-text-1 text-right tabular-nums">1,240</td>
                <td className="px-5 py-3 text-center"><StatusChip status="danger" label="Thiếu" /></td>
              </tr>
              <tr className="bg-surface-2 border-b border-surface-3/50 hover:bg-surface-3/50 transition-colors">
                <td className="px-5 py-3 text-table font-mono text-text-2">GT-3030-BG</td>
                <td className="px-5 py-3 text-table font-medium text-text-1">Gạch 30×30 be</td>
                <td className="px-5 py-3 text-table text-text-1 text-right tabular-nums">8,560</td>
                <td className="px-5 py-3 text-center"><StatusChip status="success" label="Đủ" /></td>
              </tr>
              <tr className="bg-surface-0 hover:bg-surface-3/50 transition-colors">
                <td className="px-5 py-3 text-table font-mono text-text-2">GT-4545-GR</td>
                <td className="px-5 py-3 text-table font-medium text-text-1">Gạch 45×45 xám</td>
                <td className="px-5 py-3 text-table text-text-1 text-right tabular-nums">12,300</td>
                <td className="px-5 py-3 text-center"><StatusChip status="warning" label="Cao" /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. JetBrains Mono code block */}
      <section className="space-y-2">
        <p className="text-table-sm uppercase tracking-wider text-text-3">Code / Config (JetBrains Mono)</p>
        <pre className="rounded-card border border-surface-3 bg-surface-1 p-4 text-table-sm font-mono text-text-1 max-w-lg overflow-x-auto">
{`safety_stock_formula: "AVG(D_30d) × LT × 1.65"
reorder_point:        SS + AVG(D_7d) × LT
service_level:        0.95
review_cycle:         7  # days`}
        </pre>
      </section>
    </div>
  );
}

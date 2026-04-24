/**
 * Step 1 — Booking: NM cần cung cấp bao nhiêu?
 * Auto-calc sau S&OP lock. Hiển thị booking netting per NM.
 */
import { useMemo } from "react";
import { ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ClickableNumber } from "@/components/ClickableNumber";
import { SmartTable, type SmartTableColumn } from "@/components/SmartTable";

interface BookingRow {
  nm: string;
  sop3M: number;
  hubAvail: number;
  pipeline: number;
  needed: number;
  pctTotal: number;
  skuBreakdown: { sku: string; sop: number; need: number }[];
}

const SEED: Omit<BookingRow, "needed" | "pctTotal">[] = [
  { nm: "Mikado",    sop3M: 18_500, hubAvail: 2_400, pipeline: 1_200, skuBreakdown: [
    { sku: "GA-300 A4", sop: 7_200, need: 5_900 },
    { sku: "GA-450 A4", sop: 6_300, need: 5_100 },
    { sku: "GM-300 A4", sop: 5_000, need: 3_900 },
  ]},
  { nm: "Toko",      sop3M: 12_200, hubAvail: 1_800, pipeline:   600, skuBreakdown: [
    { sku: "GA-300 B2", sop: 6_100, need: 4_900 },
    { sku: "GA-600 A4", sop: 6_100, need: 4_900 },
  ]},
  { nm: "Đồng Tâm",  sop3M: 15_800, hubAvail: 3_200, pipeline:   800, skuBreakdown: [
    { sku: "GA-300 A4", sop: 5_300, need: 4_000 },
    { sku: "GA-450 A4", sop: 5_300, need: 4_000 },
    { sku: "GA-600 A4", sop: 5_200, need: 3_800 },
  ]},
  { nm: "Vigracera", sop3M:  8_400, hubAvail: 1_200, pipeline:   400, skuBreakdown: [
    { sku: "GA-450 A4", sop: 4_200, need: 3_400 },
    { sku: "GM-300 A4", sop: 4_200, need: 3_400 },
  ]},
  { nm: "Phú Mỹ",    sop3M:  6_000, hubAvail:   800, pipeline:   200, skuBreakdown: [
    { sku: "GA-300 A4", sop: 3_000, need: 2_500 },
    { sku: "GA-600 A4", sop: 3_000, need: 2_500 },
  ]},
];

interface Props {
  scale: number;
  sopLocked: boolean;
  sopVersion: number;
  onNext: () => void;
}

export function Step1Booking({ scale, sopLocked, sopVersion, onNext }: Props) {
  const rows: BookingRow[] = useMemo(() => {
    const scaled = SEED.map(r => {
      const sop3M = Math.round(r.sop3M * scale);
      const hubAvail = Math.round(r.hubAvail * scale);
      const pipeline = Math.round(r.pipeline * scale);
      const needed = Math.max(0, sop3M - hubAvail - pipeline);
      return {
        ...r,
        sop3M, hubAvail, pipeline, needed,
        pctTotal: 0,
        skuBreakdown: r.skuBreakdown.map(s => ({
          ...s,
          sop: Math.round(s.sop * scale),
          need: Math.round(s.need * scale),
        })),
      };
    });
    const total = scaled.reduce((s, r) => s + r.needed, 0);
    return scaled.map(r => ({ ...r, pctTotal: total > 0 ? Math.round((r.needed / total) * 100) : 0 }));
  }, [scale]);

  const totals = useMemo(() => rows.reduce(
    (acc, r) => ({
      sop3M: acc.sop3M + r.sop3M,
      hubAvail: acc.hubAvail + r.hubAvail,
      pipeline: acc.pipeline + r.pipeline,
      needed: acc.needed + r.needed,
    }),
    { sop3M: 0, hubAvail: 0, pipeline: 0, needed: 0 },
  ), [rows]);

  if (!sopLocked) {
    return (
      <div className="rounded-card border border-warning/30 bg-warning-bg/30 p-8 text-center">
        <Clock className="h-8 w-8 text-warning mx-auto mb-3" />
        <p className="text-table font-semibold text-text-1">⏳ Chờ S&OP lock để chạy booking.</p>
        <p className="text-table-sm text-text-2 mt-1">Booking netting sẽ tự động chạy sau khi S&OP đồng thuận khóa.</p>
      </div>
    );
  }

  const cols: SmartTableColumn<BookingRow>[] = [
    { key: "nm", label: "NM", sortable: true, width: 130, render: r => <span className="font-medium text-text-1">{r.nm}</span> },
    { key: "sop3M", label: "S&OP 3M", numeric: true, align: "right", sortable: true, width: 110,
      render: r => <span className="tabular-nums text-text-2">{r.sop3M.toLocaleString()}</span> },
    { key: "hubAvail", label: "Hub còn", numeric: true, align: "right", sortable: true, width: 100,
      render: r => <span className="tabular-nums text-text-2">{r.hubAvail.toLocaleString()}</span> },
    { key: "pipeline", label: "Pipeline", numeric: true, align: "right", sortable: true, width: 100,
      render: r => <span className="tabular-nums text-text-2">{r.pipeline.toLocaleString()}</span> },
    { key: "needed", label: "Cần đặt", numeric: true, align: "right", sortable: true, width: 110,
      render: r => <span className="tabular-nums font-semibold text-warning">{r.needed.toLocaleString()}</span> },
    { key: "pctTotal", label: "% Tổng", numeric: true, align: "right", sortable: true, width: 90,
      render: r => <span className="tabular-nums text-text-3">{r.pctTotal}%</span> },
  ];

  return (
    <div className="space-y-4">
      {/* Title + explainer */}
      <div className="rounded-card border border-surface-3 bg-surface-1 p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-display text-section-header text-text-1">
              Bước 1 — Booking: NM cần cung cấp bao nhiêu?
            </h2>
            <p className="text-table-sm text-text-2 mt-1">
              Tự động tính sau S&OP lock. Xem kết quả booking netting.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-bg text-success px-2.5 py-0.5 text-caption font-semibold">
            <CheckCircle2 className="h-3.5 w-3.5" /> Booking xong · S&OP v{sopVersion}
          </span>
        </div>

        <div className="mt-3 rounded-card bg-info-bg/40 border border-info/20 p-3 text-table-sm text-text-2">
          <p>
            <span className="font-semibold text-text-1">S&OP locked</span>{" "}
            <span className="tabular-nums">{totals.sop3M.toLocaleString()} m²</span> (3 tháng).
            Trừ Hub còn <span className="tabular-nums text-text-1">{totals.hubAvail.toLocaleString()}</span>,
            trừ đang về <span className="tabular-nums text-text-1">{totals.pipeline.toLocaleString()}</span>
            {" "}= NM cần cung thêm{" "}
            <span className="font-bold text-warning tabular-nums">{totals.needed.toLocaleString()} m²</span>.
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <ClickableNumber
            value={`${totals.needed.toLocaleString()} m²`}
            label="Cần đặt NM"
            color="font-display text-hero text-warning"
            breakdown={[
              { label: "S&OP 3 tháng", value: `${totals.sop3M.toLocaleString()} m²`, color: "text-text-1" },
              { label: "− Hub Available", value: `${totals.hubAvail.toLocaleString()} m²`, color: "text-text-2" },
              { label: "− Pipeline", value: `${totals.pipeline.toLocaleString()} m²`, color: "text-text-2" },
              { label: "= Cần đặt NM", value: `${totals.needed.toLocaleString()} m²`, color: "text-warning" },
            ]}
            note="Số m² còn thiếu — phân bổ cho 5 NM ở bước 2"
          />
        </div>
      </div>

      {/* Table */}
      <SmartTable<BookingRow>
        screenId="hub-step1-booking"
        title="Booking netting per NM"
        exportFilename="hub-booking-nm"
        columns={cols}
        data={rows}
        defaultDensity="compact"
        getRowId={r => r.nm}
        summaryRow={{
          nm: <span className="font-semibold text-text-1">TỔNG</span>,
          sop3M: <span className="tabular-nums font-semibold text-text-1">{totals.sop3M.toLocaleString()}</span>,
          hubAvail: <span className="tabular-nums font-semibold text-text-1">{totals.hubAvail.toLocaleString()}</span>,
          pipeline: <span className="tabular-nums font-semibold text-text-1">{totals.pipeline.toLocaleString()}</span>,
          needed: <span className="tabular-nums font-bold text-warning">{totals.needed.toLocaleString()}</span>,
          pctTotal: <span className="tabular-nums text-text-3">100%</span>,
        }}
        drillDown={(r) => (
          <div className="bg-surface-1/40 px-4 py-3">
            <p className="text-caption uppercase tracking-wide text-text-3 mb-2">
              Phân rã theo Mã hàng — {r.nm}
            </p>
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 text-text-3 text-caption uppercase">
                  <th className="text-left py-1.5">Mã hàng</th>
                  <th className="text-right py-1.5">S&OP 3M</th>
                  <th className="text-right py-1.5">Cần đặt</th>
                </tr>
              </thead>
              <tbody>
                {r.skuBreakdown.map(s => (
                  <tr key={s.sku} className="border-b border-surface-3/50">
                    <td className="py-1.5 font-mono text-text-2">{s.sku}</td>
                    <td className="py-1.5 text-right tabular-nums text-text-2">{s.sop.toLocaleString()}</td>
                    <td className="py-1.5 text-right tabular-nums font-medium text-warning">{s.need.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      />

      {/* Footer */}
      <div className="flex justify-end">
        <Button onClick={onNext} className="gap-1.5">
          Bước tiếp: Cam kết NM <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

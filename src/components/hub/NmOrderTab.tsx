import { useState } from "react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

interface Props { scale: number }

interface NmRow {
  nm: string;
  tier: string;
  sent: number;
  confirmed: number;
  skus: { item: string; variant: string; sent: number; confirmed: number; note: string }[];
}

const baseNms: NmRow[] = [
  { nm: "Mikado", tier: "Hard M+1 · ±5%", sent: 5500, confirmed: 5060,
    skus: [
      { item: "GA-300", variant: "A4", sent: 2500, confirmed: 2300, note: "" },
      { item: "GA-600", variant: "A4", sent: 3000, confirmed: 2760, note: "" },
    ] },
  { nm: "Toko", tier: "Hard M+1 · ±5%", sent: 6000, confirmed: 4080,
    skus: [
      { item: "GA-300", variant: "A4", sent: 2000, confirmed: 1500, note: "Thiếu nguyên liệu" },
      { item: "GA-300", variant: "B2", sent: 1000, confirmed: 800, note: "" },
      { item: "GA-600", variant: "A4", sent: 2000, confirmed: 1200, note: "Line bận Q2" },
      { item: "GA-600", variant: "B2", sent: 1000, confirmed: 580, note: "" },
    ] },
  { nm: "Phú Mỹ", tier: "Firm M+2 · ±10%", sent: 3000, confirmed: 1350,
    skus: [
      { item: "GA-300", variant: "B2", sent: 1500, confirmed: 650, note: "Capacity limited" },
      { item: "GA-600", variant: "B2", sent: 1500, confirmed: 700, note: "Raw material delay" },
    ] },
  { nm: "Đồng Tâm", tier: "Hard M+1 · ±5%", sent: 2500, confirmed: 2250,
    skus: [
      { item: "GA-400", variant: "A4", sent: 1300, confirmed: 1200, note: "" },
      { item: "GA-400", variant: "D5", sent: 1200, confirmed: 1050, note: "" },
    ] },
  { nm: "Vigracera", tier: "Soft M+3 · ±15%", sent: 1500, confirmed: 1460,
    skus: [
      { item: "GA-600", variant: "A4", sent: 800, confirmed: 780, note: "" },
      { item: "GA-600", variant: "B2", sent: 700, confirmed: 680, note: "" },
    ] },
];

export function NmOrderTab({ scale }: Props) {
  const navigate = useNavigate();
  const [drillNm, setDrillNm] = useState<number | null>(null);

  const nms = baseNms.map(n => ({
    ...n,
    sent: Math.round(n.sent * scale),
    confirmed: Math.round(n.confirmed * scale),
    skus: n.skus.map(s => ({
      ...s,
      sent: Math.round(s.sent * scale),
      confirmed: Math.round(s.confirmed * scale),
    })),
  }));

  const totalSent = nms.reduce((a, n) => a + n.sent, 0);
  const totalConfirmed = nms.reduce((a, n) => a + n.confirmed, 0);
  const totalUnconfirmed = totalSent - totalConfirmed;
  const sopDemand = Math.round(7650 * scale);

  const kpis = [
    { label: "S&OP demand", value: `${sopDemand.toLocaleString()} m²`, bg: "bg-info-bg", text: "text-info" },
    { label: "Đã gửi NM", value: totalSent.toLocaleString(), bg: "bg-success-bg", text: "text-success" },
    { label: "NM xác nhận", value: totalConfirmed.toLocaleString(), bg: "bg-success-bg", text: "text-success" },
    { label: "Chưa confirm", value: `${totalUnconfirmed.toLocaleString()} 🔴`, bg: "bg-danger-bg", text: "text-danger" },
  ];

  // Drill down
  if (drillNm !== null) {
    const nm = nms[drillNm];
    const nmUnconf = nm.sent - nm.confirmed;
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-2 text-table-sm">
          <button onClick={() => setDrillNm(null)} className="text-primary font-medium hover:underline flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5" /> Per NM
          </button>
          <span className="text-text-3">/</span>
          <span className="text-text-1 font-medium">{nm.nm} (gửi {nm.sent.toLocaleString()}, xác nhận {nm.confirmed.toLocaleString()})</span>
        </div>

        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead>
                <tr className="border-b border-surface-3 bg-surface-1/50">
                  {["Item", "Variant", "Gửi", "NM xác nhận", "Chưa", "Ghi chú NM", "Action"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nm.skus.map((sk, si) => {
                  const unconf = sk.sent - sk.confirmed;
                  return (
                    <tr key={si} className={cn("border-b border-surface-3/50 hover:bg-primary/5", si % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                      <td className="px-4 py-2.5 font-medium text-text-1">{sk.item}</td>
                      <td className="px-4 py-2.5 text-text-2">{sk.variant}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-1">{sk.sent.toLocaleString()}</td>
                      <td className="px-4 py-2.5 tabular-nums text-text-1 font-medium">{sk.confirmed.toLocaleString()}</td>
                      <td className={cn("px-4 py-2.5 tabular-nums font-medium", unconf > 0 ? "text-danger" : "text-success")}>
                        {unconf.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-text-3 text-table-sm italic max-w-[200px]">{sk.note || "—"}</td>
                      <td className="px-4 py-2.5">
                        {unconf > 0 && sk.note && (
                          <button onClick={() => navigate("/supply")} className="text-primary text-table-sm font-medium hover:underline">
                            Tìm NM khác
                          </button>
                        )}
                        {unconf > 0 && !sk.note && (
                          <button onClick={() => toast.success(`Đã nhắc ${nm.nm} về ${sk.item} ${sk.variant}`)}
                            className="text-warning text-table-sm font-medium hover:underline">Nhắc</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                  <td className="px-4 py-2.5 text-text-1">TOTAL</td>
                  <td />
                  <td className="px-4 py-2.5 tabular-nums text-text-1">{nm.sent.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-text-1">{nm.confirmed.toLocaleString()}</td>
                  <td className="px-4 py-2.5 tabular-nums text-danger font-medium">{nmUnconf.toLocaleString()}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Layer 1
  return (
    <div className="space-y-5 animate-fade-in">
      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={cn("rounded-card border border-surface-3 p-4", k.bg)}>
            <div className="text-caption text-text-3 uppercase mb-1">{k.label}</div>
            <div className={cn("font-display text-kpi tabular-nums", k.text)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* NM table */}
      <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-table-sm">
            <thead>
              <tr className="border-b border-surface-3 bg-surface-1/50">
                {["NM", "Đã gửi", "Xác nhận", "Chưa confirm", "Status", "Action"].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nms.map((nm, i) => {
                const pct = nm.sent > 0 ? Math.round((nm.confirmed / nm.sent) * 100) : 0;
                const unconf = nm.sent - nm.confirmed;
                const statusColor = pct >= 80 ? "text-success" : pct >= 60 ? "text-warning" : "text-danger";
                const statusIcon = pct >= 80 ? "✅" : pct >= 60 ? "⚠" : "🔴";

                return (
                  <tr key={i} className={cn("border-b border-surface-3/50 hover:bg-primary/5 transition-colors", i % 2 === 0 ? "bg-surface-0" : "bg-surface-2")}>
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-text-1">{nm.nm}</div>
                      <div className="text-[11px] text-text-3 mt-0.5">{nm.tier}</div>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-text-1">{nm.sent.toLocaleString()}</td>
                    <td className="px-4 py-2.5 tabular-nums text-text-1 font-medium">{nm.confirmed.toLocaleString()}</td>
                    <td className={cn("px-4 py-2.5 tabular-nums font-medium", unconf > 0 ? "text-danger" : "text-success")}>
                      {unconf.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("font-medium", statusColor)}>{statusIcon} {pct}%</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {pct >= 80 ? (
                        <button onClick={() => setDrillNm(i)} className="text-primary text-table-sm font-medium hover:underline flex items-center gap-0.5">
                          Detail <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      ) : pct >= 60 ? (
                        <button onClick={() => toast.success(`Đã nhắc ${nm.nm}`, { description: "Notification gửi qua portal + email" })}
                          className="text-warning text-table-sm font-medium hover:underline">Nhắc NM</button>
                      ) : (
                        <button onClick={() => toast.success(`Đã escalate ${nm.nm} lên SC Manager`, { description: "Approval item tạo trong Workspace" })}
                          className="text-danger text-table-sm font-medium hover:underline">Escalate</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-surface-1 border-t-2 border-primary/20 font-bold">
                <td className="px-4 py-2.5 text-text-1">TOTAL</td>
                <td className="px-4 py-2.5 tabular-nums text-text-1">{totalSent.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-text-1">{totalConfirmed.toLocaleString()}</td>
                <td className="px-4 py-2.5 tabular-nums text-danger font-medium">{totalUnconfirmed.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-text-2 font-medium">{Math.round((totalConfirmed / totalSent) * 100)}%</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  NM_PRICE_LISTS,
  NM_PRICE_LINES,
  NM_SURCHARGES,
  FACTORIES,
  type NmPriceList,
  type NmSurcharge,
} from "@/data/unis-enterprise-dataset";
import { ClickableNumber } from "@/components/ClickableNumber";
import { TermTooltip } from "@/components/TermTooltip";
import { Switch } from "@/components/ui/switch";

const fmtVnd = (v: number) => v.toLocaleString("vi-VN");
const nmName = (id: string) => FACTORIES.find((f) => f.id === id)?.name ?? id;

const STATUS_META: Record<NmPriceList["status"], { tone: string; dot: string }> = {
  "Hiệu lực": { tone: "bg-success-bg text-success border-success/30", dot: "🟢" },
  "Hết hạn":  { tone: "bg-surface-1 text-text-3 border-surface-3",     dot: "⚪" },
  "Nháp":     { tone: "bg-warning-bg text-warning border-warning/30",  dot: "🟡" },
};

function daysUntil(ddmmyyyy: string): number {
  const [d, m, y] = ddmmyyyy.split("/").map(Number);
  const expiry = new Date(y, m - 1, d);
  return Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
}

export function PriceListsTab() {
  const [expanded, setExpanded] = useState<string | null>("PL-TKO-03");
  const [surchargeState, setSurchargeState] = useState<Record<string, boolean>>(() =>
    NM_SURCHARGES.reduce((acc, s, i) => {
      acc[`${s.priceListId}-${i}`] = s.active;
      return acc;
    }, {} as Record<string, boolean>)
  );
  const [showVersionCompare, setShowVersionCompare] = useState(true);

  const linesByPl = useMemo(() => {
    const map: Record<string, typeof NM_PRICE_LINES> = {};
    NM_PRICE_LINES.forEach((l) => {
      if (!map[l.priceListId]) map[l.priceListId] = [];
      map[l.priceListId].push(l);
    });
    return map;
  }, []);

  const surchargesByPl = useMemo(() => {
    const map: Record<string, { sc: NmSurcharge; idx: number }[]> = {};
    NM_SURCHARGES.forEach((s, i) => {
      if (!map[s.priceListId]) map[s.priceListId] = [];
      map[s.priceListId].push({ sc: s, idx: i });
    });
    return map;
  }, []);

  // For Section D: Toko v2 vs v3
  const tokoV2 = useMemo(() => linesByPl["PL-TKO-02"] ?? [], [linesByPl]);
  const tokoV3 = useMemo(() => linesByPl["PL-TKO-03"] ?? [], [linesByPl]);
  const versionDiff = useMemo(() => {
    return tokoV3.map((l3) => {
      const l2 = tokoV2.find((x) => x.skuBaseCode === l3.skuBaseCode);
      // Compare giá sỉ (1k+) for fair compare
      const p3 = l3.breaks.find((b) => b.label === "Giá sỉ")?.pricePerM2 ?? l3.breaks[0].pricePerM2;
      const p2 = l2?.breaks.find((b) => b.label === "Giá sỉ")?.pricePerM2 ?? p3;
      const delta = p3 - p2;
      const deltaPct = (delta / p2) * 100;
      return { sku: l3.skuBaseCode, p2, p3, delta, deltaPct };
    });
  }, [tokoV2, tokoV3]);

  const totalImpact = useMemo(
    () => Math.round(versionDiff.reduce((sum, d) => sum + d.delta * 1500, 0)), // 1500m²/SKU/tháng giả định
    [versionDiff]
  );

  const toggleSurcharge = (key: string, label: string) => {
    setSurchargeState((s) => ({ ...s, [key]: !s[key] }));
    toast.success(`Đã ${!surchargeState[key] ? "bật" : "tắt"} phụ phí: ${label}`);
  };

  return (
    <div className="space-y-6">
      {/* SECTION A: Danh sách bảng giá */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-section-header text-text-1">
            Danh sách bảng giá
          </h3>
          <span className="text-caption text-text-3">
            {NM_PRICE_LISTS.length} bảng · {NM_PRICE_LISTS.filter((p) => p.status === "Hiệu lực").length} hiệu lực
          </span>
        </div>

        <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead className="bg-surface-1/60 border-b border-surface-3">
                <tr>
                  {["", "NM", "Ver.", <span key="h-eff">
                    <TermTooltip term="Hieu_luc">Hiệu lực từ</TermTooltip>
                  </span>, "Hết hạn", "Trạng thái", "Điều khoản", "Người duyệt"].map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left text-table-header uppercase text-text-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NM_PRICE_LISTS.map((pl) => {
                  const isOpen = expanded === pl.id;
                  const days = daysUntil(pl.expiryDate);
                  const expiringSoon = pl.status === "Hiệu lực" && days < 30;
                  const meta = STATUS_META[pl.status];
                  return (
                    <>
                      <tr
                        key={pl.id}
                        onClick={() => setExpanded(isOpen ? null : pl.id)}
                        className={cn(
                          "border-b border-surface-3/50 cursor-pointer hover:bg-surface-1/40 transition-colors",
                          isOpen && "bg-surface-1/60",
                          expiringSoon && "bg-warning-bg/30"
                        )}
                        data-severity={expiringSoon ? "shortage" : undefined}
                      >
                        <td className="px-3 py-2.5 w-8">
                          {isOpen ? <ChevronDown className="h-4 w-4 text-text-3" /> : <ChevronRight className="h-4 w-4 text-text-3" />}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-text-1">{nmName(pl.nmId)}</td>
                        <td className="px-3 py-2.5 tabular-nums text-text-2">v{pl.version}</td>
                        <td className="px-3 py-2.5 tabular-nums text-text-2">{pl.effectiveDate}</td>
                        <td className="px-3 py-2.5 tabular-nums text-text-2">
                          {pl.expiryDate}
                          {expiringSoon && (
                            <span className="ml-1.5 text-caption text-warning">(còn {days}d)</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-medium", meta.tone)}>
                            {meta.dot} {pl.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-text-2 max-w-[200px] truncate" title={pl.paymentTerms}>
                          {pl.paymentTerms}
                        </td>
                        <td className="px-3 py-2.5 text-text-2">{pl.approvedBy}</td>
                      </tr>

                      {/* Cảnh báo Phú Mỹ sắp hết hạn */}
                      {expiringSoon && !isOpen && (
                        <tr key={`${pl.id}-warn`} className="bg-warning-bg/20 border-b border-warning/20">
                          <td />
                          <td colSpan={7} className="px-3 py-2 text-table-sm text-warning">
                            <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
                            Hết hạn {pl.expiryDate} — còn <strong>{days} ngày</strong>. Chưa gia hạn. {pl.note}
                          </td>
                        </tr>
                      )}

                      {/* SECTION B + C: Expanded detail */}
                      {isOpen && (
                        <tr key={`${pl.id}-detail`} className="bg-surface-1/30">
                          <td />
                          <td colSpan={7} className="px-3 py-4">
                            {/* SECTION B */}
                            <ExpandedDetail
                              pl={pl}
                              lines={linesByPl[pl.id] ?? []}
                              surcharges={surchargesByPl[pl.id] ?? []}
                              surchargeState={surchargeState}
                              onToggleSurcharge={toggleSurcharge}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION D: So sánh version Toko v2 vs v3 */}
      <section>
        <button
          onClick={() => setShowVersionCompare((s) => !s)}
          className="flex items-center gap-2 mb-3 group"
        >
          {showVersionCompare ? <ChevronDown className="h-4 w-4 text-text-3" /> : <ChevronRight className="h-4 w-4 text-text-3" />}
          <h3 className="font-display text-section-header text-text-1 group-hover:text-primary transition-colors">
            So sánh version — Toko v2 (Q1) vs v3 (Q2)
          </h3>
        </button>

        {showVersionCompare && (
          <div className="rounded-card border border-surface-3 bg-surface-2 p-4 space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-table-sm">
                <thead className="bg-surface-1/60 border-b border-surface-3">
                  <tr>
                    {["SKU", "v2 (Q1)", "v3 (Q2)", "Δ", "%", ""].map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left text-table-header uppercase text-text-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {versionDiff.map((d) => {
                    const tone =
                      d.deltaPct >= 4 ? "text-warning" :
                      d.deltaPct > 0 ? "text-success" : "text-text-2";
                    const icon = d.deltaPct >= 4 ? "🟡" : d.deltaPct > 0 ? "🟢" : "⚪";
                    return (
                      <tr key={d.sku} className="border-b border-surface-3/30">
                        <td className="px-3 py-2 font-medium text-text-1">{d.sku}</td>
                        <td className="px-3 py-2 tabular-nums text-text-2">{fmtVnd(d.p2)}</td>
                        <td className="px-3 py-2 tabular-nums text-text-1 font-medium">{fmtVnd(d.p3)}</td>
                        <td className={cn("px-3 py-2 tabular-nums font-medium", tone)}>+{fmtVnd(d.delta)}</td>
                        <td className={cn("px-3 py-2 tabular-nums font-medium", tone)}>+{d.deltaPct.toFixed(1)}%</td>
                        <td className="px-3 py-2">{icon}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="rounded-button bg-warning-bg/40 border border-warning/30 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-table-sm">
                <span className="text-text-2">Tổng tác động ước tính (sản lượng giả định 1.500m²/SKU/tháng):</span>{" "}
                <ClickableNumber
                  value={`+${fmtVnd(totalImpact)}₫/tháng`}
                  color="text-warning font-semibold"
                  panelTitle="Tác động giá Toko v2 → v3"
                  formula={versionDiff.map(
                    (d) => `${d.sku}: +${fmtVnd(d.delta)}₫ × 1.500m² = +${fmtVnd(d.delta * 1500)}₫`
                  ).join("\n")}
                  note="Ước tính trên sản lượng trung bình 1.500m²/SKU/tháng. Số thực tế phụ thuộc PO từng tuần."
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Expanded detail — SECTION B (giá per SKU) + SECTION C (phụ phí)            */
/* ─────────────────────────────────────────────────────────────────────────── */

function ExpandedDetail({
  pl, lines, surcharges, surchargeState, onToggleSurcharge,
}: {
  pl: NmPriceList;
  lines: typeof NM_PRICE_LINES;
  surcharges: { sc: NmSurcharge; idx: number }[];
  surchargeState: Record<string, boolean>;
  onToggleSurcharge: (key: string, label: string) => void;
}) {
  if (lines.length === 0 && surcharges.length === 0) {
    return (
      <div className="text-table-sm text-text-3 italic flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Chưa có dòng giá hoặc phụ phí cho bảng giá này.
      </div>
    );
  }

  // collect unique break labels across SKUs
  const allLabels = ["Giá lẻ", "Giá sỉ", "Giá container", "Giá hợp đồng năm"];

  return (
    <div className="space-y-4">
      {/* SECTION B: Chi tiết giá per SKU */}
      {lines.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-table text-text-1">
              Chi tiết giá theo <TermTooltip term="MOQ">MOQ</TermTooltip> (
              <TermTooltip term="Break">Break</TermTooltip>{" "}
              <TermTooltip term="Tier">Tier</TermTooltip>)
            </h4>
            <span className="text-caption text-text-3">{lines.length} SKU</span>
          </div>
          <div className="overflow-x-auto rounded-button border border-surface-3 bg-surface-0">
            <table className="w-full text-table-sm">
              <thead className="bg-surface-1 border-b border-surface-3">
                <tr>
                  <th className="px-3 py-2 text-left text-table-header uppercase text-text-3">SKU</th>
                  {allLabels.map((l) => (
                    <th key={l} className="px-3 py-2 text-right text-table-header uppercase text-text-3 whitespace-nowrap">{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.skuBaseCode} className="border-b border-surface-3/30">
                    <td className="px-3 py-2 font-medium text-text-1">{line.skuBaseCode}</td>
                    {allLabels.map((label) => {
                      const br = line.breaks.find((b) => b.label === label);
                      if (!br) return <td key={label} className="px-3 py-2 text-right text-text-3">—</td>;
                      const moqRange = br.toQty
                        ? `${br.fromQty.toLocaleString("vi-VN")}–${br.toQty.toLocaleString("vi-VN")}m²`
                        : `≥${br.fromQty.toLocaleString("vi-VN")}m²`;
                      return (
                        <td key={label} className="px-3 py-2 text-right">
                          <ClickableNumber
                            value={`${fmtVnd(br.pricePerM2)}₫`}
                            color="text-text-1 font-medium"
                            panelTitle={`${line.skuBaseCode} · ${label}`}
                            breakdown={[
                              { label: "Giá/m²",       value: `${fmtVnd(br.pricePerM2)}₫` },
                              { label: "MOQ",          value: moqRange },
                              { label: "Bảng giá",     value: `${nmName(pl.nmId)} v${pl.version}` },
                              { label: "Hiệu lực",     value: `${pl.effectiveDate} → ${pl.expiryDate}` },
                              { label: "Điều khoản",   value: pl.paymentTerms },
                            ]}
                            note={`${label} áp dụng cho ${moqRange}. Bảng giá ${pl.id}.`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION C: Phụ phí */}
      {surcharges.length > 0 && (
        <div>
          <h4 className="font-medium text-table text-text-1 mb-2">
            <TermTooltip term="Phu_phi">Phụ phí</TermTooltip> tách riêng
          </h4>
          <div className="space-y-2">
            {surcharges.map(({ sc, idx }) => {
              const key = `${sc.priceListId}-${idx}`;
              const isOn = surchargeState[key];
              const icon =
                sc.type === "Năng lượng" ? "🔥" :
                sc.type === "Vận chuyển" ? "🚛" :
                sc.type === "Tỷ giá" ? "💱" : "📦";
              const valueLabel =
                sc.calcMethod === "percent" ? `+${sc.rate}%` : `+${fmtVnd(sc.rate)}₫/m²`;
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center justify-between rounded-button border p-3 transition-colors",
                    isOn ? "bg-info-bg/40 border-info/30" : "bg-surface-2 border-surface-3"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-lg">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-1">{sc.type}</span>
                        <span className={cn("font-mono text-table-sm tabular-nums", isOn ? "text-info" : "text-text-3")}>
                          {valueLabel}
                        </span>
                        <span className={cn(
                          "text-caption font-semibold uppercase",
                          isOn ? "text-info" : "text-text-3"
                        )}>
                          {isOn ? "● Đang áp dụng" : "○ Tắt"}
                        </span>
                      </div>
                      <p className="text-caption text-text-3 truncate">{sc.note}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isOn}
                    onCheckedChange={() => onToggleSurcharge(key, `${sc.type} (${pl.id})`)}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-caption text-text-3 italic mt-2 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Bật/tắt phụ phí KHÔNG ảnh hưởng giá gốc — chỉ điều chỉnh tổng giá khi tính booking.
          </p>
        </div>
      )}
    </div>
  );
}

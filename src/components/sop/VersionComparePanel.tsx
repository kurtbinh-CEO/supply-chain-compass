import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMAND_VERSIONS } from "@/data/unis-enterprise-dataset";
import { TermTooltip } from "@/components/TermTooltip";

type Vk = "v0" | "v1" | "v2" | "v3" | "v4";

const VERSION_META: { key: Vk; label: string; owner: string; tone: string }[] = [
  { key: "v0", label: "v0", owner: "FC gốc",       tone: "text-text-2" },
  { key: "v1", label: "v1", owner: "Sales",        tone: "text-info" },
  { key: "v2", label: "v2", owner: "CN Manager",   tone: "text-warning" },
  { key: "v3", label: "v3", owner: "SC Manager",   tone: "text-primary" },
  { key: "v4", label: "v4", owner: "Locked",       tone: "text-success" },
];

function deltaTone(deltaPct: number): { bg: string; text: string } {
  const abs = Math.abs(deltaPct);
  if (abs > 10) return { bg: "bg-danger-bg",  text: "text-danger"  };
  if (abs > 5)  return { bg: "bg-warning-bg", text: "text-warning" };
  return { bg: "",                            text: "text-text-2"  };
}

export function VersionComparePanel() {
  const [open, setOpen] = useState(false);

  const rows = DEMAND_VERSIONS;

  // FVA per version (lower MAPE vs v0 = better; here we mock FVA in pp).
  // FVA = improvement vs naive baseline. Positive = good.
  const fvaSummary = useMemo(() => {
    const fvaPerVersion = (vk: Vk): number => {
      // Mock: average abs delta vs v4 (locked = ground truth proxy).
      // Smaller deviation → higher FVA.
      const deviations = rows.map((r) => Math.abs(r[vk] - r.v4) / Math.max(1, r.v4));
      const avgDev = deviations.reduce((a, b) => a + b, 0) / deviations.length;
      // Convert to FVA pp scale: 0% dev → +5pp, 10% dev → −5pp.
      return Math.round((0.05 - avgDev) * 100);
    };
    return (["v1", "v2", "v3"] as Vk[]).map((vk) => ({
      version: vk,
      fva: fvaPerVersion(vk),
    }));
  }, [rows]);

  return (
    <section className="mt-6 rounded-card border border-surface-3 bg-surface-0 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-1 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-text-3 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-text-3 shrink-0" />
        )}
        <GitCompare className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-display text-section-header text-text-1">
            So sánh Versions v0 → v4
          </div>
          <div className="text-table-sm text-text-3 mt-0.5">
            Per <TermTooltip term="CN">CN</TermTooltip> × <TermTooltip term="SKU">SKU</TermTooltip> · highlight Δ &gt;±5% vàng · Δ &gt;±10% đỏ
          </div>
        </div>
        {/* FVA mini summary in header */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {fvaSummary.map((f) => {
            const positive = f.fva >= 0;
            return (
              <span
                key={f.version}
                className={cn(
                  "inline-flex items-center gap-1 rounded-button px-2 py-1 text-caption font-mono font-medium",
                  positive ? "bg-success-bg text-success" : "bg-warning-bg text-warning",
                )}
              >
                {f.version} <TermTooltip term="FVA">FVA</TermTooltip>{" "}
                {positive ? "+" : ""}
                {f.fva}pp {positive ? "✅" : "⚠️"}
              </span>
            );
          })}
        </div>
      </button>

      {open && (
        <div className="border-t border-surface-3">
          {/* FVA detailed line for mobile */}
          <div className="md:hidden flex items-center gap-2 flex-wrap px-4 py-3 border-b border-surface-3 bg-surface-1">
            {fvaSummary.map((f) => {
              const positive = f.fva >= 0;
              return (
                <span
                  key={f.version}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-button px-2 py-1 text-caption font-mono",
                    positive ? "bg-success-bg text-success" : "bg-warning-bg text-warning",
                  )}
                >
                  {f.version} FVA {positive ? "+" : ""}{f.fva}pp {positive ? "✅" : "⚠️"}
                </span>
              );
            })}
          </div>

          {/* Comparison grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-table-sm">
              <thead className="bg-surface-1 text-text-3">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">CN</th>
                  <th className="text-left font-medium px-3 py-2.5">SKU</th>
                  {VERSION_META.map((v) => (
                    <th key={v.key} className="text-right font-medium px-3 py-2.5">
                      <div className="flex flex-col items-end">
                        <span className={cn("font-display font-semibold", v.tone)}>{v.label}</span>
                        <span className="text-[10px] text-text-3 font-normal">{v.owner}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const v0 = r.v0;
                  return (
                    <tr
                      key={`${r.cnCode}-${r.skuBaseCode}`}
                      className={cn(
                        "border-t border-surface-3",
                        i % 2 === 1 && "bg-surface-1/40",
                      )}
                    >
                      <td className="px-4 py-2 font-medium text-text-1">{r.cnCode}</td>
                      <td className="px-3 py-2 font-mono text-text-2">{r.skuBaseCode}</td>
                      {VERSION_META.map((v) => {
                        const val = r[v.key];
                        const isV0 = v.key === "v0";
                        const deltaPct = isV0 ? 0 : ((val - v0) / Math.max(1, v0)) * 100;
                        const tone = isV0 ? { bg: "", text: "text-text-1" } : deltaTone(deltaPct);
                        return (
                          <td
                            key={v.key}
                            className={cn(
                              "px-3 py-2 text-right tabular-nums",
                              tone.bg,
                            )}
                          >
                            <div className={cn("font-mono", tone.text)}>
                              {val.toLocaleString("vi-VN")}
                            </div>
                            {!isV0 && deltaPct !== 0 && (
                              <div className={cn("text-[10px] mt-0.5", tone.text)}>
                                {deltaPct > 0 ? "+" : ""}
                                {deltaPct.toFixed(1)}%
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer legend */}
          <div className="px-4 py-3 border-t border-surface-3 bg-surface-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-caption">
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-warning-bg border border-warning/30" />
                <span className="text-text-2">Δ &gt; ±5% vs v0</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-danger-bg border border-danger/30" />
                <span className="text-text-2">Δ &gt; ±10% vs v0</span>
              </span>
            </div>
            <p className="text-caption text-text-3 leading-relaxed">
              <span className="font-medium text-text-2">v0</span> = FC gốc (statistical baseline).{" "}
              <span className="font-medium text-text-2">v1</span> = Sales (B2B + thị trường).{" "}
              <span className="font-medium text-text-2">v2</span> = CN Manager (điều chỉnh chi nhánh).{" "}
              <span className="font-medium text-text-2">v3</span> = SC Manager (consensus).{" "}
              <span className="font-medium text-success">v4</span> = Locked (chốt cuối, đưa vào DRP).
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

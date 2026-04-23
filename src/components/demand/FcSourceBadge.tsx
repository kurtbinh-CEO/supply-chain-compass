import { useState } from "react";
import { cn } from "@/lib/utils";
import { Upload, Database, Zap, X, FileSpreadsheet, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { FC_IMPORT_LOG, FC_MAPE_BY_CN } from "@/data/unis-enterprise-dataset";

/* ─────────────────────────────────────────────────────────────────────────── */
/* FC Source Badge — top-right of DemandTotalTab                              */
/*   "📁 Excel Upload | HW+XGB 19% | 01/05" from FC_IMPORT_LOG (latest)       */
/*   "Nhập FC" button → dialog: API(disabled) | Excel(upload) | Baseline      */
/*   FC drift: if MAPE > target+5% → "⚠️ FC drift CN-BD: 18%→22%"             */
/* ─────────────────────────────────────────────────────────────────────────── */

const TARGET_MAPE = 15;
const DRIFT_THRESHOLD = TARGET_MAPE + 5; // 20%

type FcSource = "api" | "excel" | "baseline";

export function FcSourceBadge() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeSource, setActiveSource] = useState<FcSource>("excel");
  const [busy, setBusy] = useState(false);

  // Latest import (FC_IMPORT_LOG sorted by month — last entry = latest)
  const latest = FC_IMPORT_LOG[FC_IMPORT_LOG.length - 1];

  // FC drift detection — flag any CN above DRIFT_THRESHOLD
  const driftCns = FC_MAPE_BY_CN
    .map((r) => {
      const mapeNow = r.bestModel === "AI" ? r.mapeAi : r.mapeHw;
      // mock previous-month MAPE (slightly lower)
      const mapePrev = Math.max(8, mapeNow - 4);
      return { cn: r.cnCode, mapeNow, mapePrev };
    })
    .filter((r) => r.mapeNow > DRIFT_THRESHOLD)
    .slice(0, 1); // show top 1

  const sourceLabel: Record<FcSource, string> = {
    api: "API Sync",
    excel: "Excel Upload",
    baseline: "Baseline",
  };
  const sourceIcon: Record<FcSource, string> = {
    api: "🔌",
    excel: "📁",
    baseline: "📊",
  };

  const handleImport = (src: FcSource) => {
    if (src === "api") return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setActiveSource(src);
      setDialogOpen(false);
      if (src === "excel") {
        toast.success("Đã upload FC Excel", {
          description: `${latest.records} records · model ${latest.modelName} · MAPE ${latest.modelMape}%`,
        });
      } else {
        toast.success("Đã generate baseline FC", {
          description: "Holt-Winters baseline · 180 records · MAPE ~22%",
        });
      }
    }, 700);
  };

  return (
    <>
      {/* Badge strip */}
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-info/10 text-info px-3 py-1 text-table-sm font-medium">
            <span className="text-base leading-none">{sourceIcon[activeSource]}</span>
            <span>{sourceLabel[activeSource]}</span>
            <span className="text-text-3">|</span>
            <span className="font-mono">{latest.modelName}</span>
            <span
              className={cn(
                "font-bold tabular-nums",
                latest.modelMape > TARGET_MAPE ? "text-warning" : "text-success"
              )}
            >
              {latest.modelMape}%
            </span>
            <span className="text-text-3">|</span>
            <span className="tabular-nums text-text-2">{latest.month}</span>
          </span>
          <button
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-button bg-primary text-primary-foreground px-3 py-1.5 text-table-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Nhập FC
          </button>
        </div>

        {/* FC Drift banner */}
        {driftCns.map((d) => (
          <div
            key={d.cn}
            className="rounded-button border border-warning/30 bg-warning-bg/60 px-3 py-1.5 text-table-sm text-warning flex items-center gap-1.5"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>
              FC drift <span className="font-mono font-semibold">{d.cn}</span>:{" "}
              <span className="tabular-nums">{d.mapePrev}% → {d.mapeNow}%</span>
            </span>
          </div>
        ))}
      </div>

      {/* Import Dialog */}
      {dialogOpen && (
        <>
          <div
            className="fixed inset-0 bg-text-1/30 z-50"
            onClick={() => !busy && setDialogOpen(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] max-w-[92vw] bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 p-6 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-section-header text-text-1">Nhập FC</h3>
              <button
                onClick={() => !busy && setDialogOpen(false)}
                className="text-text-3 hover:text-text-1"
                disabled={busy}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-table-sm text-text-2">
              Chọn nguồn nhập FC tháng tiếp theo. Mỗi lần nhập tạo 1 entry trong FC Import Log.
            </p>

            {/* Source options */}
            <div className="space-y-3">
              {/* API — disabled */}
              <button
                disabled
                className="w-full text-left rounded-card border border-surface-3 bg-surface-1 p-4 opacity-50 cursor-not-allowed"
              >
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-text-3 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-display text-body font-semibold text-text-1">
                      API Sync{" "}
                      <span className="rounded-full bg-surface-3 text-text-3 px-2 py-0.5 text-caption font-medium ml-1">
                        Coming soon
                      </span>
                    </div>
                    <p className="text-table-sm text-text-3 mt-0.5">
                      Đồng bộ trực tiếp từ DSS / SAP. Cần thiết lập connector.
                    </p>
                  </div>
                </div>
              </button>

              {/* Excel upload */}
              <button
                onClick={() => handleImport("excel")}
                disabled={busy}
                className="w-full text-left rounded-card border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-colors disabled:opacity-60"
              >
                <div className="flex items-start gap-3">
                  <FileSpreadsheet className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-display text-body font-semibold text-text-1">
                      Excel Upload{" "}
                      <span className="rounded-full bg-success-bg text-success px-2 py-0.5 text-caption font-medium ml-1">
                        Khuyến nghị
                      </span>
                    </div>
                    <p className="text-table-sm text-text-2 mt-0.5">
                      Upload file .xlsx theo template. Validate model + MAPE trước khi áp dụng.
                    </p>
                  </div>
                </div>
              </button>

              {/* Baseline */}
              <button
                onClick={() => handleImport("baseline")}
                disabled={busy}
                className="w-full text-left rounded-card border border-surface-3 bg-surface-1 p-4 hover:bg-surface-2 transition-colors disabled:opacity-60"
              >
                <div className="flex items-start gap-3">
                  <Database className="h-5 w-5 text-text-2 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-display text-body font-semibold text-text-1">
                      Generate Baseline
                    </div>
                    <p className="text-table-sm text-text-2 mt-0.5">
                      Sinh FC bằng Holt-Winters từ history 12 tháng. Dùng khi không có file Excel.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {busy && (
              <div className="rounded-button bg-info-bg/40 px-3 py-2 text-table-sm text-info">
                Đang xử lý…
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

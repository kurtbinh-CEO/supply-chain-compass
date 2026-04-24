import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Upload,
  Database,
  Zap,
  X,
  FileSpreadsheet,
  AlertTriangle,
  Download,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  FileCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { FC_IMPORT_LOG, FC_MAPE_BY_CN } from "@/data/unis-enterprise-dataset";

/* ─────────────────────────────────────────────────────────────────────────── */
/* FC Source Badge — top-right of DemandTotalTab                              */
/*   Excel Upload now uses a 5-step wizard:                                   */
/*   1) Tải template → 2) Chọn file → 3) Validate → 4) Preview → 5) Áp dụng  */
/* ─────────────────────────────────────────────────────────────────────────── */

const TARGET_MAPE = 15;
const DRIFT_THRESHOLD = TARGET_MAPE + 5;

type FcSource = "api" | "excel" | "baseline";
type View = "menu" | "excel-wizard";
type WizStep = 1 | 2 | 3 | 4 | 5;

type ValidationResult = {
  totalRows: number;
  validRows: number;
  warnings: { row: number; field: string; message: string }[];
  errors: { row: number; field: string; message: string }[];
  detectedModel: string;
  detectedMape: number;
  affectedCns: string[];
  affectedSkus: number;
};

export function FcSourceBadge() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [activeSource, setActiveSource] = useState<FcSource>("excel");
  const [busy, setBusy] = useState(false);

  // Wizard state
  const [step, setStep] = useState<WizStep>(1);
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const latest = FC_IMPORT_LOG[FC_IMPORT_LOG.length - 1];

  const driftCns = FC_MAPE_BY_CN
    .map((r) => {
      const mapeNow = r.bestModel === "AI" ? r.mapeAi : r.mapeHw;
      const mapePrev = Math.max(8, mapeNow - 4);
      return { cn: r.cnCode, mapeNow, mapePrev };
    })
    .filter((r) => r.mapeNow > DRIFT_THRESHOLD)
    .slice(0, 1);

  const sourceLabel: Record<FcSource, string> = {
    api: "Đồng bộ API",
    excel: "Tải Excel",
    baseline: "Dự báo gốc",
  };
  const sourceIcon: Record<FcSource, string> = {
    api: "🔌",
    excel: "📁",
    baseline: "📊",
  };

  const resetWizard = () => {
    setStep(1);
    setFile(null);
    setValidation(null);
    setValidating(false);
    setApplying(false);
    setApplyProgress(0);
  };

  const closeDialog = () => {
    if (busy || validating || applying) return;
    setDialogOpen(false);
    setTimeout(() => {
      setView("menu");
      resetWizard();
    }, 200);
  };

  const handleBaseline = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setActiveSource("baseline");
      setDialogOpen(false);
      toast.success("Đã sinh dự báo gốc FC", {
        description: "Holt-Winters baseline · 180 records · MAPE ~22%",
      });
    }, 700);
  };

  /* ───── Wizard step actions ───── */

  const downloadTemplate = () => {
    // Mock CSV template
    const csv =
      "SKU,CN_Code,Period,FC_Qty,Model,Confidence\n" +
      "GA-600 A4,CN-HN,2025-05,2200,HW+XGB,0.92\n" +
      "GA-600 B2,CN-HCM,2025-05,1800,HW+XGB,0.88\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "FC_Template_2025-05.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã tải mẫu FC");
    setStep(2);
  };

  const handleFileSelect = (f: File | null) => {
    if (!f) return;
    const ok = /\.(xlsx|csv)$/i.test(f.name);
    if (!ok) {
      toast.error("Chỉ chấp nhận file .xlsx hoặc .csv");
      return;
    }
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  };

  const runValidation = () => {
    if (!file) return;
    setValidating(true);
    setStep(3);
    setTimeout(() => {
      // Mock validation result
      const result: ValidationResult = {
        totalRows: 186,
        validRows: 184,
        warnings: [
          { row: 47, field: "FC_Qty", message: "Giảm > 30% so với tháng trước" },
          { row: 92, field: "Confidence", message: "Confidence < 0.7 (model yếu)" },
        ],
        errors: [
          { row: 12, field: "SKU", message: "SKU không tồn tại trong master" },
          { row: 158, field: "Period", message: "Sai format YYYY-MM" },
        ],
        detectedModel: latest.modelName,
        detectedMape: latest.modelMape,
        affectedCns: ["CN-HN", "CN-HCM", "CN-DN", "CN-CT", "CN-BD"],
        affectedSkus: 42,
      };
      setValidation(result);
      setValidating(false);
    }, 1200);
  };

  const goToPreview = () => setStep(4);

  const applyImport = () => {
    setApplying(true);
    setStep(5);
    setApplyProgress(0);
    const id = setInterval(() => {
      setApplyProgress((p) => {
        const next = p + Math.random() * 18;
        if (next >= 100) {
          clearInterval(id);
          return 100;
        }
        return next;
      });
    }, 200);
    setTimeout(() => {
      clearInterval(id);
      setApplyProgress(100);
      setTimeout(() => {
        setApplying(false);
        setActiveSource("excel");
        setDialogOpen(false);
        setTimeout(() => {
          setView("menu");
          resetWizard();
        }, 200);
        toast.success("Đã áp dụng FC từ Excel", {
          description: `${validation?.validRows ?? 0} bản ghi · mô hình ${
            validation?.detectedModel
          } · MAPE ${validation?.detectedMape}%`,
        });
      }, 400);
    }, 1800);
  };

  const stepLabels = ["Mẫu", "Chọn file", "Kiểm tra", "Xem trước", "Áp dụng"];

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
            onClick={() => {
              setView("menu");
              resetWizard();
              setDialogOpen(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-button bg-primary text-primary-foreground px-3 py-1.5 text-table-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Nhập FC
          </button>
        </div>

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

      {/* Dialog */}
      {dialogOpen && (
        <>
          <div
            className="fixed inset-0 bg-text-1/30 z-50"
            onClick={closeDialog}
          />
          <div
            className={cn(
              "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-[94vw] bg-surface-2 border border-surface-3 rounded-card shadow-xl z-50 animate-fade-in",
              view === "menu" ? "w-[520px]" : "w-[680px]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-surface-3">
              <div className="flex items-center gap-3">
                {view === "excel-wizard" && (
                  <button
                    onClick={() => {
                      if (validating || applying) return;
                      if (step === 1) {
                        setView("menu");
                        resetWizard();
                      } else {
                        setStep((s) => (s - 1) as WizStep);
                      }
                    }}
                    className="text-text-3 hover:text-text-1"
                    disabled={validating || applying || step === 5}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <h3 className="font-display text-section-header text-text-1">
                  {view === "menu" ? "Nhập FC" : "Tải Excel — Nhập FC"}
                </h3>
              </div>
              <button
                onClick={closeDialog}
                className="text-text-3 hover:text-text-1 disabled:opacity-40"
                disabled={busy || validating || applying}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {view === "menu" && (
                <>
                  <p className="text-table-sm text-text-2">
                    Chọn nguồn nhập FC tháng tiếp theo. Mỗi lần nhập tạo 1 entry trong nhật ký nhập FC.
                  </p>

                  <div className="space-y-3">
                    {/* API */}
                    <button
                      disabled
                      className="w-full text-left rounded-card border border-surface-3 bg-surface-1 p-4 opacity-50 cursor-not-allowed"
                    >
                      <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-text-3 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-display text-body font-semibold text-text-1">
                            Đồng bộ API{" "}
                            <span className="rounded-full bg-surface-3 text-text-3 px-2 py-0.5 text-caption font-medium ml-1">
                              Sắp có
                            </span>
                          </div>
                          <p className="text-table-sm text-text-3 mt-0.5">
                            Đồng bộ trực tiếp từ DSS / SAP. Cần thiết lập kết nối.
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Excel */}
                    <button
                      onClick={() => {
                        setView("excel-wizard");
                        setStep(1);
                      }}
                      className="w-full text-left rounded-card border border-primary/30 bg-primary/5 p-4 hover:bg-primary/10 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-display text-body font-semibold text-text-1 flex items-center gap-2">
                            Tải Excel
                            <span className="rounded-full bg-success-bg text-success px-2 py-0.5 text-caption font-medium">
                              Khuyến nghị
                            </span>
                          </div>
                          <p className="text-table-sm text-text-2 mt-0.5">
                            Tải file .xlsx theo mẫu. Trợ giúp 5 bước: tải mẫu → kiểm tra → áp dụng.
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-primary mt-1" />
                      </div>
                    </button>

                    {/* Baseline */}
                    <button
                      onClick={handleBaseline}
                      disabled={busy}
                      className="w-full text-left rounded-card border border-surface-3 bg-surface-1 p-4 hover:bg-surface-2 transition-colors disabled:opacity-60"
                    >
                      <div className="flex items-start gap-3">
                        <Database className="h-5 w-5 text-text-2 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-display text-body font-semibold text-text-1">
                            Sinh dự báo gốc
                          </div>
                          <p className="text-table-sm text-text-2 mt-0.5">
                            Sinh FC bằng Holt-Winters từ lịch sử 12 tháng. Dùng khi không có file Excel.
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {busy && (
                    <div className="rounded-button bg-info-bg/40 px-3 py-2 text-table-sm text-info flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Đang xử lý…
                    </div>
                  )}
                </>
              )}

              {view === "excel-wizard" && (
                <>
                  {/* Stepper */}
                  <div className="flex items-center justify-between">
                    {stepLabels.map((label, idx) => {
                      const n = (idx + 1) as WizStep;
                      const done = n < step;
                      const active = n === step;
                      return (
                        <div key={label} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1.5">
                            <div
                              className={cn(
                                "h-8 w-8 rounded-full flex items-center justify-center text-table-sm font-semibold border-2 transition-colors",
                                done && "bg-success border-success text-white",
                                active && "bg-primary border-primary text-primary-foreground",
                                !done && !active && "bg-surface-1 border-surface-3 text-text-3"
                              )}
                            >
                              {done ? <CheckCircle2 className="h-4 w-4" /> : n}
                            </div>
                            <span
                              className={cn(
                                "text-caption text-center whitespace-nowrap",
                                active ? "text-text-1 font-semibold" : "text-text-3"
                              )}
                            >
                              {label}
                            </span>
                          </div>
                          {idx < stepLabels.length - 1 && (
                            <div
                              className={cn(
                                "h-0.5 flex-1 mx-2 transition-colors",
                                n < step ? "bg-success" : "bg-surface-3"
                              )}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-surface-3 pt-5">
                    {/* Step 1: Template */}
                    {step === 1 && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-display text-body font-semibold text-text-1 mb-1">
                            Bước 1 — Tải template chuẩn
                          </h4>
                          <p className="text-table-sm text-text-2">
                            Template gồm 6 cột bắt buộc: SKU · CN_Code · Period · FC_Qty · Model · Confidence.
                            Đảm bảo SKU khớp master và Period theo format YYYY-MM.
                          </p>
                        </div>
                        <div className="rounded-card bg-surface-1 border border-surface-3 p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileSpreadsheet className="h-8 w-8 text-success" />
                            <div>
                              <div className="font-medium text-text-1">FC_Template_2025-05.csv</div>
                              <div className="text-caption text-text-3">UTF-8 · 6 cột · ~2 KB</div>
                            </div>
                          </div>
                          <button
                            onClick={downloadTemplate}
                            className="inline-flex items-center gap-2 rounded-button bg-primary text-primary-foreground px-4 py-2 text-table-sm font-medium hover:bg-primary/90"
                          >
                            <Download className="h-4 w-4" />
                            Tải template
                          </button>
                        </div>
                        <button
                          onClick={() => setStep(2)}
                          className="text-table-sm text-primary hover:underline"
                        >
                          Đã có file → bỏ qua bước này
                        </button>
                      </div>
                    )}

                    {/* Step 2: Choose file */}
                    {step === 2 && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-display text-body font-semibold text-text-1 mb-1">
                            Bước 2 — Chọn file FC
                          </h4>
                          <p className="text-table-sm text-text-2">
                            Kéo-thả file vào vùng dưới hoặc bấm chọn file. Hỗ trợ .xlsx, .csv (≤ 5 MB).
                          </p>
                        </div>
                        <div
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "rounded-card border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                            file
                              ? "border-success bg-success-bg/30"
                              : "border-surface-3 hover:border-primary/50 hover:bg-primary/5"
                          )}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.csv"
                            className="hidden"
                            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                          />
                          {file ? (
                            <div className="space-y-2">
                              <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
                              <div className="font-medium text-text-1">{file.name}</div>
                              <div className="text-caption text-text-3">
                                {(file.size / 1024).toFixed(1)} KB · sẵn sàng validate
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFile(null);
                                }}
                                className="text-caption text-danger hover:underline"
                              >
                                Đổi file khác
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <Upload className="h-10 w-10 text-text-3 mx-auto" />
                              <div className="font-medium text-text-1">
                                Kéo-thả file FC vào đây
                              </div>
                              <div className="text-caption text-text-3">
                                hoặc bấm để chọn từ máy
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end">
                          <button
                            onClick={runValidation}
                            disabled={!file}
                            className="inline-flex items-center gap-2 rounded-button bg-primary text-primary-foreground px-4 py-2 text-table-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Validate file
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Validate */}
                    {step === 3 && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-display text-body font-semibold text-text-1 mb-1">
                            Bước 3 — Validate dữ liệu
                          </h4>
                          <p className="text-table-sm text-text-2">
                            Kiểm tra schema, SKU master, format Period, range FC_Qty và confidence.
                          </p>
                        </div>
                        {validating ? (
                          <div className="rounded-card bg-surface-1 border border-surface-3 p-8 flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 text-primary animate-spin" />
                            <div className="text-table-sm text-text-2">Đang validate {file?.name}…</div>
                          </div>
                        ) : validation ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-3">
                              <div className="rounded-card bg-surface-1 border border-surface-3 p-3">
                                <div className="text-caption text-text-3">Tổng dòng</div>
                                <div className="font-display text-section-header text-text-1 tabular-nums">
                                  {validation.totalRows}
                                </div>
                              </div>
                              <div className="rounded-card bg-success-bg/40 border border-success/30 p-3">
                                <div className="text-caption text-text-3">Hợp lệ</div>
                                <div className="font-display text-section-header text-success tabular-nums">
                                  {validation.validRows}
                                </div>
                              </div>
                              <div className="rounded-card bg-danger-bg/40 border border-danger/30 p-3">
                                <div className="text-caption text-text-3">Lỗi</div>
                                <div className="font-display text-section-header text-danger tabular-nums">
                                  {validation.errors.length}
                                </div>
                              </div>
                            </div>

                            {validation.errors.length > 0 && (
                              <div className="rounded-card border border-danger/30 bg-danger-bg/30 p-3">
                                <div className="text-table-sm font-semibold text-danger mb-2 flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {validation.errors.length} lỗi cần sửa (sẽ bỏ qua khi áp dụng)
                                </div>
                                <ul className="space-y-1 text-caption text-text-2">
                                  {validation.errors.map((e, i) => (
                                    <li key={i} className="flex gap-2">
                                      <span className="font-mono text-text-3 w-14">Row {e.row}</span>
                                      <span className="font-mono text-text-3 w-20">{e.field}</span>
                                      <span>{e.message}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {validation.warnings.length > 0 && (
                              <div className="rounded-card border border-warning/30 bg-warning-bg/30 p-3">
                                <div className="text-table-sm font-semibold text-warning mb-2 flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {validation.warnings.length} cảnh báo (vẫn áp dụng được)
                                </div>
                                <ul className="space-y-1 text-caption text-text-2">
                                  {validation.warnings.map((w, i) => (
                                    <li key={i} className="flex gap-2">
                                      <span className="font-mono text-text-3 w-14">Row {w.row}</span>
                                      <span className="font-mono text-text-3 w-20">{w.field}</span>
                                      <span>{w.message}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex justify-end">
                              <button
                                onClick={goToPreview}
                                className="inline-flex items-center gap-2 rounded-button bg-primary text-primary-foreground px-4 py-2 text-table-sm font-medium hover:bg-primary/90"
                              >
                                Tiếp tục xem trước
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Step 4: Preview */}
                    {step === 4 && validation && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-display text-body font-semibold text-text-1 mb-1">
                            Bước 4 — Xem trước & MAPE check
                          </h4>
                          <p className="text-table-sm text-text-2">
                            Kiểm tra model, MAPE và phạm vi ảnh hưởng trước khi ghi đè FC tháng tiếp theo.
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-card bg-surface-1 border border-surface-3 p-3">
                            <div className="text-caption text-text-3 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> Model phát hiện
                            </div>
                            <div className="font-mono text-body text-text-1 mt-1">
                              {validation.detectedModel}
                            </div>
                          </div>
                          <div className="rounded-card bg-surface-1 border border-surface-3 p-3">
                            <div className="text-caption text-text-3">MAPE backtest</div>
                            <div
                              className={cn(
                                "font-display text-section-header tabular-nums mt-1",
                                validation.detectedMape > TARGET_MAPE
                                  ? "text-warning"
                                  : "text-success"
                              )}
                            >
                              {validation.detectedMape}%
                              <span className="text-caption text-text-3 ml-2">
                                target ≤ {TARGET_MAPE}%
                              </span>
                            </div>
                          </div>
                          <div className="rounded-card bg-surface-1 border border-surface-3 p-3">
                            <div className="text-caption text-text-3">CN ảnh hưởng</div>
                            <div className="font-medium text-text-1 mt-1 text-table-sm">
                              {validation.affectedCns.join(" · ")}
                            </div>
                          </div>
                          <div className="rounded-card bg-surface-1 border border-surface-3 p-3">
                            <div className="text-caption text-text-3">SKU ảnh hưởng</div>
                            <div className="font-display text-section-header text-text-1 tabular-nums mt-1">
                              {validation.affectedSkus}
                            </div>
                          </div>
                        </div>
                        {validation.detectedMape > TARGET_MAPE && (
                          <div className="rounded-button border border-warning/30 bg-warning-bg/40 px-3 py-2 text-table-sm text-warning flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>
                              MAPE vượt target. Bạn vẫn có thể áp dụng nhưng nên review lại model
                              hoặc chạy Generate Baseline để so sánh.
                            </span>
                          </div>
                        )}
                        <div className="rounded-card bg-info-bg/30 border border-info/30 p-3 text-table-sm text-text-2">
                          <span className="font-semibold text-text-1">Sẽ ghi đè:</span>{" "}
                          {validation.validRows} records FC cho period{" "}
                          <span className="font-mono">2025-05</span>. Bản FC cũ sẽ được lưu trong
                          FC Import Log để rollback nếu cần.
                        </div>
                        <div className="flex justify-between gap-2">
                          <button
                            onClick={() => setStep(3)}
                            className="text-table-sm text-text-2 hover:text-text-1"
                          >
                            ← Quay lại validate
                          </button>
                          <button
                            onClick={applyImport}
                            className="inline-flex items-center gap-2 rounded-button bg-primary text-primary-foreground px-4 py-2 text-table-sm font-medium hover:bg-primary/90"
                          >
                            <FileCheck className="h-4 w-4" />
                            Áp dụng FC
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 5: Apply */}
                    {step === 5 && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-display text-body font-semibold text-text-1 mb-1">
                            Bước 5 — Áp dụng FC
                          </h4>
                          <p className="text-table-sm text-text-2">
                            Đang ghi {validation?.validRows} records vào FC tháng tiếp theo và cập
                            nhật FC Import Log…
                          </p>
                        </div>
                        <div className="rounded-card bg-surface-1 border border-surface-3 p-6 space-y-3">
                          <div className="flex items-center justify-between text-table-sm">
                            <span className="text-text-2">Tiến độ</span>
                            <span className="font-mono tabular-nums text-text-1">
                              {Math.round(applyProgress)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${applyProgress}%` }}
                            />
                          </div>
                          <div className="text-caption text-text-3 flex items-center gap-1.5">
                            {applyProgress < 100 ? (
                              <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Đang ghi dữ liệu…
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3 text-success" />
                                Hoàn tất — đang đóng dialog…
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

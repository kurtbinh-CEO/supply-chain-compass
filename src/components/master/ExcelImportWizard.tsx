/**
 * ExcelImportWizard — 5-step universal upload flow.
 *
 * Bước:
 *   1. UPLOAD   — kéo thả / chọn file (.xlsx, .xls, .csv)
 *   2. PREVIEW  — đọc 10 dòng đầu, chọn sheet (nếu nhiều)
 *   3. MAPPING  — gán cột Excel → field hệ thống (auto-suggest theo tên)
 *   4. VALIDATE — kiểm tra required, type, duplicate; hiển thị lỗi từng dòng
 *   5. COMMIT   — confirm & nhận callback `onCommit(rows)`
 *
 * Dùng được cho mọi entity: Mã hàng, NM, CN, Container, FC, Actual, AOP…
 *
 * Cách dùng:
 *   <ExcelImportWizard
 *     open={open}
 *     onClose={...}
 *     entityName="mã hàng"
 *     fields={ITEM_IMPORT_FIELDS}
 *     onCommit={(rows) => { ... }}
 *   />
 */
import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  X,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════════════════════════════ */
/* Types                                                                     */
/* ════════════════════════════════════════════════════════════════════════ */
export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
  type?: "text" | "number" | "select";
  /** Whitelist value cho select. */
  options?: string[];
  /** Aliases để auto-detect cột Excel. */
  aliases?: string[];
}

interface ExcelImportWizardProps {
  open: boolean;
  onClose: () => void;
  entityName: string;
  fields: ImportField[];
  /** Trả về rows đã validated. */
  onCommit: (rows: Record<string, string | number>[]) => void;
  /** URL template để user tải xuống mẫu (optional). */
  templateUrl?: string;
}

type Step = 1 | 2 | 3 | 4 | 5;

interface RowError {
  rowIndex: number; // 1-based theo Excel
  field: string;
  message: string;
}

/* ════════════════════════════════════════════════════════════════════════ */
/* Helpers                                                                   */
/* ════════════════════════════════════════════════════════════════════════ */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function autoSuggest(
  excelHeader: string,
  fields: ImportField[],
): string | null {
  const target = normalize(excelHeader);
  for (const f of fields) {
    const candidates = [f.key, f.label, ...(f.aliases ?? [])];
    if (candidates.some((c) => normalize(c) === target)) return f.key;
  }
  // partial match
  for (const f of fields) {
    const candidates = [f.key, f.label, ...(f.aliases ?? [])];
    if (candidates.some((c) => normalize(c).includes(target) || target.includes(normalize(c))))
      return f.key;
  }
  return null;
}

/* ════════════════════════════════════════════════════════════════════════ */
/* Component                                                                 */
/* ════════════════════════════════════════════════════════════════════════ */
export function ExcelImportWizard({
  open,
  onClose,
  entityName,
  fields,
  onCommit,
  templateUrl,
}: ExcelImportWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetName, setSheetName] = useState<string>("");
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // excelHeader → fieldKey
  const [errors, setErrors] = useState<RowError[]>([]);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep(1);
    setFile(null);
    setWorkbook(null);
    setSheetName("");
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setErrors([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  /* ────────── Step 1 → 2: Parse file ────────── */
  const handleFile = async (f: File) => {
    setParsing(true);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const firstSheet = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheet];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const hdrs = json.length > 0 ? Object.keys(json[0]) : [];

      setFile(f);
      setWorkbook(wb);
      setSheetName(firstSheet);
      setRawRows(json);
      setHeaders(hdrs);

      // Auto-mapping
      const auto: Record<string, string> = {};
      hdrs.forEach((h) => {
        const suggested = autoSuggest(h, fields);
        if (suggested) auto[h] = suggested;
      });
      setMapping(auto);

      setStep(2);
    } catch (e) {
      toast.error(`Không đọc được file: ${(e as Error).message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleSheetChange = (name: string) => {
    if (!workbook) return;
    const ws = workbook.Sheets[name];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    const hdrs = json.length > 0 ? Object.keys(json[0]) : [];
    setSheetName(name);
    setRawRows(json);
    setHeaders(hdrs);
    const auto: Record<string, string> = {};
    hdrs.forEach((h) => {
      const suggested = autoSuggest(h, fields);
      if (suggested) auto[h] = suggested;
    });
    setMapping(auto);
  };

  /* ────────── Step 4: Validate ────────── */
  const validatedRows = useMemo(() => {
    if (step < 4) return [] as Record<string, string | number>[];
    const errs: RowError[] = [];
    const seenCodes = new Set<string>();

    const rows: Record<string, string | number>[] = rawRows.map((raw, idx) => {
      const out: Record<string, string | number> = {};
      const excelRow = idx + 2; // +1 header +1 1-based

      fields.forEach((f) => {
        // Tìm cột Excel đã map vào field này
        const excelHeader = Object.entries(mapping).find(([, fk]) => fk === f.key)?.[0];
        const value = excelHeader != null ? raw[excelHeader] : "";
        const str = value == null ? "" : String(value).trim();

        if (f.required && !str) {
          errs.push({ rowIndex: excelRow, field: f.label, message: "Bắt buộc nhưng để trống" });
        }
        if (f.type === "number" && str && Number.isNaN(Number(str))) {
          errs.push({ rowIndex: excelRow, field: f.label, message: `"${str}" không phải số` });
        }
        if (f.type === "select" && f.options && str && !f.options.includes(str)) {
          errs.push({
            rowIndex: excelRow,
            field: f.label,
            message: `"${str}" không hợp lệ. Cho phép: ${f.options.join(", ")}`,
          });
        }
        out[f.key] = f.type === "number" && str ? Number(str) : str;
      });

      // Duplicate code check (nếu có field "code")
      const code = String(out.code ?? "").trim();
      if (code) {
        if (seenCodes.has(code)) {
          errs.push({ rowIndex: excelRow, field: "code", message: `Mã "${code}" trùng trong file` });
        }
        seenCodes.add(code);
      }

      return out;
    });

    setErrors(errs);
    return rows;
  }, [step, rawRows, mapping, fields]);

  /* ────────── Render steps ────────── */
  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[760px] bg-surface-2 border-surface-3 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display text-text-1">
            Nhập {entityName} từ Excel
          </DialogTitle>
          <DialogDescription className="text-text-3">
            Wizard 5 bước — upload, kiểm tra, ánh xạ cột, validate, lưu vào hệ thống.
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between px-2 py-3 border-b border-surface-3">
          {(
            [
              { n: 1, label: "Upload" },
              { n: 2, label: "Xem trước" },
              { n: 3, label: "Ánh xạ cột" },
              { n: 4, label: "Kiểm tra" },
              { n: 5, label: "Hoàn tất" },
            ] as const
          ).map((s, i, arr) => (
            <div key={s.n} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-table-sm font-medium",
                    step > s.n
                      ? "bg-success text-primary-foreground"
                      : step === s.n
                      ? "bg-gradient-primary text-primary-foreground"
                      : "bg-surface-1 text-text-3 border border-surface-3",
                  )}
                >
                  {step > s.n ? <Check className="h-3.5 w-3.5" /> : s.n}
                </div>
                <span
                  className={cn(
                    "text-table-sm font-medium",
                    step >= s.n ? "text-text-1" : "text-text-3",
                  )}
                >
                  {s.label}
                </span>
              </div>
              {i < arr.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px mx-3",
                    step > s.n ? "bg-success" : "bg-surface-3",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-1">
          {/* ─── STEP 1: UPLOAD ─── */}
          {step === 1 && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                className="border-2 border-dashed border-surface-3 rounded-card p-12 text-center cursor-pointer hover:border-primary hover:bg-info-bg/30 transition-colors"
              >
                {parsing ? (
                  <Loader2 className="h-10 w-10 text-primary mx-auto animate-spin" />
                ) : (
                  <Upload className="h-10 w-10 text-text-3 mx-auto" />
                )}
                <p className="mt-3 text-text-1 font-medium">
                  {parsing ? "Đang đọc file..." : "Kéo thả file vào đây hoặc nhấn để chọn"}
                </p>
                <p className="mt-1 text-table-sm text-text-3">
                  Hỗ trợ: .xlsx, .xls, .csv (tối đa 10 MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>

              {templateUrl && (
                <div className="text-center">
                  <a
                    href={templateUrl}
                    download
                    className="text-primary text-table-sm hover:underline inline-flex items-center gap-1"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" /> Tải mẫu Excel chuẩn
                  </a>
                </div>
              )}

              <div className="rounded-card bg-info-bg border border-info/30 p-3 text-table-sm text-text-2">
                <strong className="text-info">Yêu cầu file:</strong>
                <ul className="mt-1 ml-4 list-disc space-y-0.5">
                  <li>Hàng đầu tiên là tiêu đề cột</li>
                  <li>
                    Cột bắt buộc:{" "}
                    {fields
                      .filter((f) => f.required)
                      .map((f) => f.label)
                      .join(", ")}
                  </li>
                  <li>Tối đa 5.000 dòng/file</li>
                </ul>
              </div>
            </div>
          )}

          {/* ─── STEP 2: PREVIEW ─── */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-text-1 font-medium">{file?.name}</p>
                  <p className="text-table-sm text-text-3">
                    {rawRows.length} dòng · {headers.length} cột
                  </p>
                </div>
                {workbook && workbook.SheetNames.length > 1 && (
                  <select
                    value={sheetName}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1"
                  >
                    {workbook.SheetNames.map((n) => (
                      <option key={n} value={n}>
                        Sheet: {n}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="rounded-card border border-surface-3 bg-surface-2 overflow-x-auto max-h-[320px]">
                <table className="w-full text-table">
                  <thead className="sticky top-0 bg-surface-1">
                    <tr>
                      <th className="text-left px-3 py-2 text-table-header text-text-3 font-medium">#</th>
                      {headers.map((h) => (
                        <th
                          key={h}
                          className="text-left px-3 py-2 text-table-header text-text-3 font-medium whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rawRows.slice(0, 10).map((r, i) => (
                      <tr
                        key={i}
                        className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}
                      >
                        <td className="px-3 py-1.5 text-text-3 tabular-nums">{i + 2}</td>
                        {headers.map((h) => (
                          <td key={h} className="px-3 py-1.5 text-text-2 whitespace-nowrap">
                            {String(r[h] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-table-sm text-text-3">
                Hiển thị 10 dòng đầu. Tổng cộng {rawRows.length} dòng sẽ được nhập.
              </p>
            </div>
          )}

          {/* ─── STEP 3: MAPPING ─── */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-table-sm text-text-2">
                Gán cột Excel sang trường hệ thống. Hệ thống đã gợi ý dựa trên tên cột.
              </p>
              <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden">
                <table className="w-full text-table">
                  <thead>
                    <tr className="bg-surface-1">
                      <th className="text-left px-4 py-2 text-table-header text-text-3 font-medium">
                        Cột trong Excel
                      </th>
                      <th className="text-left px-4 py-2 text-table-header text-text-3 font-medium">
                        Trường hệ thống
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((h, i) => (
                      <tr
                        key={h}
                        className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}
                      >
                        <td className="px-4 py-2 text-text-1 font-mono">{h}</td>
                        <td className="px-4 py-2">
                          <select
                            value={mapping[h] ?? ""}
                            onChange={(e) =>
                              setMapping({ ...mapping, [h]: e.target.value })
                            }
                            className="h-9 w-full rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1"
                          >
                            <option value="">— Bỏ qua —</option>
                            {fields.map((f) => (
                              <option key={f.key} value={f.key}>
                                {f.label}
                                {f.required ? " *" : ""}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Required check */}
              {(() => {
                const mapped = new Set(Object.values(mapping));
                const missingRequired = fields.filter((f) => f.required && !mapped.has(f.key));
                if (missingRequired.length === 0) return null;
                return (
                  <div className="flex items-start gap-2 p-3 rounded-card bg-warning-bg border border-warning/30 text-warning text-table-sm">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      Chưa ánh xạ trường bắt buộc:{" "}
                      <strong>
                        {missingRequired.map((f) => f.label).join(", ")}
                      </strong>
                    </span>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ─── STEP 4: VALIDATE ─── */}
          {step === 4 && (
            <div className="space-y-3">
              {errors.length === 0 ? (
                <div className="flex items-start gap-3 p-4 rounded-card bg-success-bg border border-success/30">
                  <CheckCircle2 className="h-5 w-5 text-success mt-0.5 shrink-0" />
                  <div>
                    <p className="text-success font-medium">
                      Tất cả {validatedRows.length} dòng hợp lệ
                    </p>
                    <p className="text-table-sm text-text-2 mt-1">
                      Sẵn sàng nhập vào hệ thống. Nhấn "Tiếp" để xác nhận.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3 p-3 rounded-card bg-danger-bg border border-danger/30">
                    <AlertTriangle className="h-5 w-5 text-danger mt-0.5 shrink-0" />
                    <div>
                      <p className="text-danger font-medium">
                        {errors.length} lỗi trong {validatedRows.length} dòng
                      </p>
                      <p className="text-table-sm text-text-2 mt-1">
                        Sửa file Excel rồi tải lại, hoặc bỏ qua dòng lỗi để chỉ nhập dòng hợp lệ.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-card border border-surface-3 bg-surface-2 overflow-hidden max-h-[280px] overflow-y-auto">
                    <table className="w-full text-table">
                      <thead className="sticky top-0 bg-surface-1">
                        <tr>
                          <th className="text-left px-3 py-2 text-table-header text-text-3 font-medium">
                            Dòng
                          </th>
                          <th className="text-left px-3 py-2 text-table-header text-text-3 font-medium">
                            Trường
                          </th>
                          <th className="text-left px-3 py-2 text-table-header text-text-3 font-medium">
                            Lỗi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {errors.slice(0, 100).map((e, i) => (
                          <tr
                            key={i}
                            className={i % 2 === 0 ? "bg-surface-2" : "bg-surface-0"}
                          >
                            <td className="px-3 py-1.5 text-danger tabular-nums font-medium">
                              {e.rowIndex}
                            </td>
                            <td className="px-3 py-1.5 text-text-2">{e.field}</td>
                            <td className="px-3 py-1.5 text-text-2">{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {errors.length > 100 && (
                    <p className="text-table-sm text-text-3">
                      Hiển thị 100 lỗi đầu tiên. Tải lại file đã sửa để xem tiếp.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── STEP 5: COMMIT ─── */}
          {step === 5 && (
            <div className="space-y-4 py-4">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-success-bg flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <h3 className="mt-3 font-display text-section-header text-text-1">
                  Sẵn sàng nhập {validatedRows.length - errors.length} dòng
                </h3>
                <p className="mt-1 text-table-sm text-text-3 max-w-sm">
                  {errors.length > 0
                    ? `${errors.length} dòng lỗi sẽ bị bỏ qua. Chỉ nhập các dòng hợp lệ.`
                    : `Toàn bộ ${validatedRows.length} dòng sẽ được lưu vào ${entityName}.`}
                </p>
              </div>

              <div className="rounded-card border border-surface-3 bg-surface-1 p-4 space-y-2 text-table-sm">
                <div className="flex justify-between">
                  <span className="text-text-3">File:</span>
                  <span className="text-text-1 font-medium">{file?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-3">Sheet:</span>
                  <span className="text-text-1">{sheetName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-3">Tổng dòng:</span>
                  <span className="text-text-1 tabular-nums">{validatedRows.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-3">Hợp lệ:</span>
                  <span className="text-success tabular-nums font-medium">
                    {validatedRows.length - errors.length}
                  </span>
                </div>
                {errors.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-text-3">Bỏ qua (lỗi):</span>
                    <span className="text-danger tabular-nums font-medium">
                      {errors.length}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-3">
          <Button variant="ghost" onClick={handleClose}>
            <X className="h-3.5 w-3.5" /> Hủy
          </Button>
          <div className="flex gap-2">
            {step > 1 && step < 5 && (
              <Button variant="outline" onClick={() => setStep((step - 1) as Step)}>
                <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
              </Button>
            )}
            {step === 2 && (
              <Button onClick={() => setStep(3)} disabled={rawRows.length === 0}>
                Tiếp <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {step === 3 && (
              <Button
                onClick={() => setStep(4)}
                disabled={(() => {
                  const mapped = new Set(Object.values(mapping));
                  return fields.some((f) => f.required && !mapped.has(f.key));
                })()}
              >
                Kiểm tra <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {step === 4 && (
              <Button onClick={() => setStep(5)} disabled={validatedRows.length === errors.length && errors.length > 0}>
                Tiếp <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {step === 5 && (
              <Button
                onClick={() => {
                  // Lọc chỉ dòng không lỗi
                  const errorRows = new Set(errors.map((e) => e.rowIndex - 2));
                  const clean = validatedRows.filter((_, i) => !errorRows.has(i));
                  onCommit(clean);
                  toast.success(`Đã nhập ${clean.length} dòng vào ${entityName}`);
                  handleClose();
                }}
              >
                <Check className="h-3.5 w-3.5" /> Nhập {validatedRows.length - errors.length} dòng
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

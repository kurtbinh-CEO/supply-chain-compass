/**
 * CRUD Primitives — chuẩn cho mọi tab Master Data.
 *
 * Cung cấp 3 thành phần dùng chung:
 *  - <CrudToolbar>           : header + Search + [Thêm] + [Nhập] + [Xuất]
 *  - <EntityFormDialog>      : modal form tự sinh từ cấu hình field
 *  - <DeleteConfirmDialog>   : xác nhận xóa kèm tên entity
 *
 * Mục tiêu: mọi tab MasterData đồng nhất pattern Add/Edit/Delete/Import/Export
 * mà không phải copy-paste boilerplate.
 */
import { useState, type ReactNode } from "react";
import { Search, Plus, Upload, Download, AlertTriangle, X, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DataSourceSelector, type DataSource } from "@/components/DataSourceSelector";
import { ExcelImportWizard, type ImportField } from "@/components/master/ExcelImportWizard";

/* ════════════════════════════════════════════════════════════════════════ */
/* CrudToolbar                                                              */
/* ════════════════════════════════════════════════════════════════════════ */
interface CrudToolbarProps {
  search: string;
  onSearchChange: (s: string) => void;
  onAdd: () => void;
  onImport?: (sourceKey: string) => void;
  onExport?: () => void;
  addLabel?: string;
  importTitle?: string;
  importDescription?: string;
  importSources?: DataSource[];
  placeholder?: string;
  /** Bật wizard 5 bước cho key "excel". Khi có, source "excel" sẽ mở wizard thay vì gọi onImport. */
  excelImport?: {
    entityName: string;
    fields: ImportField[];
    onCommit: (rows: Record<string, string | number>[]) => void;
    templateUrl?: string;
  };
}

const DEFAULT_IMPORT_SOURCES: DataSource[] = [
  {
    key: "excel",
    icon: <Upload className="h-5 w-5" />,
    title: "Tải lên Excel / CSV",
    description: "Theo mẫu chuẩn — kéo thả file hoặc chọn từ máy",
    badge: "Khuyến nghị",
    badgeColor: "green",
  },
  {
    key: "api",
    icon: <Upload className="h-5 w-5" />,
    title: "Đồng bộ qua API",
    description: "Kết nối hệ thống ERP (Bravo, SAP) — nhập tự động",
    badge: "Sắp có",
    badgeColor: "gray",
    disabled: true,
  },
  {
    key: "manual",
    icon: <Plus className="h-5 w-5" />,
    title: "Nhập thủ công",
    description: "Thêm từng dòng qua form — phù hợp cho dữ liệu nhỏ",
    badge: "Dự phòng",
    badgeColor: "amber",
  },
];

export function CrudToolbar({
  search,
  onSearchChange,
  onAdd,
  onImport,
  onExport,
  addLabel = "Thêm mới",
  importTitle = "Nhập dữ liệu",
  importDescription = "Chọn nguồn nhập dữ liệu hàng loạt",
  importSources = DEFAULT_IMPORT_SOURCES,
  placeholder = "Tìm kiếm...",
}: CrudToolbarProps) {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-3" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-9 pl-9 pr-3 rounded-button border border-surface-3 bg-surface-0 text-table text-text-1 placeholder:text-text-3"
          />
        </div>

        <Button onClick={onAdd} size="sm" className="h-9">
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </Button>

        {onImport && (
          <Button onClick={() => setImportOpen(true)} variant="outline" size="sm" className="h-9">
            <Upload className="h-3.5 w-3.5" /> Nhập
          </Button>
        )}

        {onExport && (
          <Button onClick={onExport} variant="secondary" size="sm" className="h-9">
            <Download className="h-3.5 w-3.5" /> Xuất
          </Button>
        )}
      </div>

      {onImport && (
        <DataSourceSelector
          open={importOpen}
          onClose={() => setImportOpen(false)}
          title={importTitle}
          description={importDescription}
          sources={importSources}
          onSelect={(key) => {
            setImportOpen(false);
            onImport(key);
          }}
        />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* RowActions — inline icons hiện khi hover/select                          */
/* ════════════════════════════════════════════════════════════════════════ */
export function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="h-7 w-7 rounded-button flex items-center justify-center text-text-3 hover:text-primary hover:bg-info-bg transition-colors"
        title="Sửa"
        aria-label="Sửa"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="h-7 w-7 rounded-button flex items-center justify-center text-text-3 hover:text-danger hover:bg-danger-bg transition-colors"
        title="Xóa"
        aria-label="Xóa"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* EntityFormDialog                                                          */
/* ════════════════════════════════════════════════════════════════════════ */
export type FieldType = "text" | "number" | "select" | "textarea";

export interface FormField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Hiển thị dưới dạng mono (cho mã code, SKU, …) */
  mono?: boolean;
  /** Read-only khi chế độ edit. */
  readOnlyOnEdit?: boolean;
  /** Ghi chú nhỏ dưới input. */
  hint?: string;
  /** Số cột grid: 1 (full) | 2 (half). */
  span?: 1 | 2;
}

interface EntityFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  entityName: string; // "mã hàng", "nhà máy", "chi nhánh"…
  fields: FormField[];
  initialValues?: Record<string, string | number>;
  onClose: () => void;
  onSave: (values: Record<string, string>) => void;
}

export function EntityFormDialog({
  open,
  mode,
  entityName,
  fields,
  initialValues = {},
  onClose,
  onSave,
}: EntityFormDialogProps) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [f.key, String(initialValues[f.key] ?? "")]),
    ),
  );
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const missing = fields.find((f) => f.required && !String(values[f.key] ?? "").trim());
    if (missing) {
      setError(`Trường "${missing.label}" là bắt buộc.`);
      return;
    }
    onSave(values);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px] bg-surface-2 border-surface-3">
        <DialogHeader>
          <DialogTitle className="font-display text-text-1">
            {mode === "create" ? `Thêm ${entityName} mới` : `Chỉnh sửa ${entityName}`}
          </DialogTitle>
          <DialogDescription className="text-text-3">
            {mode === "create"
              ? `Điền thông tin để tạo ${entityName} mới trong hệ thống.`
              : `Cập nhật thông tin ${entityName}. Lưu để áp dụng thay đổi.`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          {fields.map((f) => {
            const span = f.span ?? (f.type === "textarea" ? 2 : 1);
            const readOnly = mode === "edit" && f.readOnlyOnEdit;
            return (
              <div key={f.key} className={span === 2 ? "col-span-2" : "col-span-1"}>
                <label className="text-table-sm text-text-3 uppercase font-medium block mb-1">
                  {f.label} {f.required && <span className="text-danger">*</span>}
                </label>

                {f.type === "select" ? (
                  <select
                    value={values[f.key] ?? ""}
                    onChange={(e) => {
                      setValues({ ...values, [f.key]: e.target.value });
                      setError(null);
                    }}
                    disabled={readOnly}
                    className="w-full h-10 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 disabled:opacity-60"
                  >
                    <option value="">— Chọn —</option>
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    value={values[f.key] ?? ""}
                    onChange={(e) => {
                      setValues({ ...values, [f.key]: e.target.value });
                      setError(null);
                    }}
                    placeholder={f.placeholder}
                    rows={3}
                    readOnly={readOnly}
                    className="w-full rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table text-text-1 read-only:opacity-60"
                  />
                ) : (
                  <input
                    type={f.type === "number" ? "number" : "text"}
                    value={values[f.key] ?? ""}
                    onChange={(e) => {
                      setValues({ ...values, [f.key]: e.target.value });
                      setError(null);
                    }}
                    placeholder={f.placeholder}
                    readOnly={readOnly}
                    className={`w-full h-10 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 read-only:opacity-60 ${
                      f.mono ? "font-mono" : ""
                    }`}
                  />
                )}
                {f.hint && <p className="text-table-sm text-text-3 mt-1">{f.hint}</p>}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-card bg-danger-bg border border-danger/30 text-danger text-table-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={handleSave}>
            {mode === "create" ? "Tạo mới" : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* DeleteConfirmDialog                                                       */
/* ════════════════════════════════════════════════════════════════════════ */
interface DeleteConfirmDialogProps {
  open: boolean;
  entityLabel: string; // "NM Mikado", "Mã GA-300"…
  description?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  open,
  entityLabel,
  description,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px] bg-surface-2 border-surface-3">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-danger-bg flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-danger" />
            </div>
            <div className="flex-1">
              <DialogTitle className="font-display text-text-1">
                Xóa {entityLabel}?
              </DialogTitle>
              <DialogDescription className="text-text-3 mt-1">
                {description ??
                  "Hành động này không thể hoàn tác. Dữ liệu liên quan có thể bị ảnh hưởng."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="h-3.5 w-3.5" /> Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ════════════════════════════════════════════════════════════════════════ */
/* Helpers                                                                  */
/* ════════════════════════════════════════════════════════════════════════ */
export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    toast.error("Không có dữ liệu để xuất");
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.success(`Đã xuất ${rows.length} dòng → ${a.download}`);
}

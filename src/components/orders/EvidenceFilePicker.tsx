/**
 * EvidenceFilePicker — Mock-but-functional file picker for order transition dialogs.
 *
 * Lưu file vào state bên ngoài (controlled). Sinh thumbnail dataURL cho ảnh,
 * giữ tên + size cho doc. KHÔNG upload lên storage — files chỉ tồn tại trong session.
 *
 * Hỗ trợ:
 *   - Chọn nhiều file (input file picker)
 *   - Chụp ảnh trực tiếp trên mobile (capture="environment")
 *   - Xoá từng file
 *   - Hiển thị min/max files yêu cầu
 *   - Đánh dấu bắt buộc *
 *
 * Mọi text tiếng Việt.
 */
import { useRef } from "react";
import { Camera, Paperclip, X, FileText, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EvidenceFile {
  id: string;
  name: string;
  size: number;
  type: string;
  /** dataURL preview cho ảnh (PNG/JPG/WebP). Doc/PDF: undefined. */
  dataUrl?: string;
  /** Đính trực tiếp object File để upstream có thể upload thật về sau. */
  file: File;
}

interface Props {
  label: string;
  required?: boolean;
  /** Số file tối thiểu. Mặc định 0. Khi required && minCount<=0 ⇒ tối thiểu 1. */
  minCount?: number;
  files: EvidenceFile[];
  onChange: (files: EvidenceFile[]) => void;
  /** Hỗ trợ mở camera (mobile). Mặc định true cho ảnh. */
  allowCamera?: boolean;
  /** accept attribute cho <input>. Mặc định ảnh + pdf + doc. */
  accept?: string;
  hint?: string;
}

function readDataUrl(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/")) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function EvidenceFilePicker({
  label,
  required,
  minCount,
  files,
  onChange,
  allowCamera = true,
  accept = "image/*,application/pdf,.doc,.docx",
  hint,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const min = required ? Math.max(1, minCount ?? 1) : (minCount ?? 0);
  const meets = files.length >= min;

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const arr = Array.from(list);
    const next: EvidenceFile[] = await Promise.all(
      arr.map(async (f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: f.name,
        size: f.size,
        type: f.type,
        dataUrl: await readDataUrl(f),
        file: f,
      })),
    );
    onChange([...files, ...next]);
  };

  const remove = (id: string) => onChange(files.filter((f) => f.id !== id));

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-caption text-text-2">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
          {min > 1 && <span className="text-text-3 ml-1">(tối thiểu {min} file)</span>}
        </label>
        {files.length > 0 && (
          <span className={cn(
            "text-[10px] tabular-nums",
            meets ? "text-success" : "text-warning",
          )}>
            {files.length}/{min || "∞"} file
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {allowCamera && (
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-1 hover:bg-surface-2 px-3 py-2 text-table-sm text-text-2"
          >
            <Camera className="h-4 w-4" /> Chụp ảnh
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-1 hover:bg-surface-2 px-3 py-2 text-table-sm text-text-2"
        >
          <Paperclip className="h-4 w-4" /> Chọn file
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {hint && <div className="mt-1 text-[11px] text-text-3">{hint}</div>}

      {/* Thumbnail strip */}
      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="group relative flex flex-col items-center w-16"
              title={`${f.name} · ${formatSize(f.size)}`}
            >
              <div className="relative h-16 w-16 rounded border border-surface-3 bg-surface-1 overflow-hidden flex items-center justify-center">
                {f.dataUrl ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img src={f.dataUrl} alt={f.name} className="h-full w-full object-cover" />
                ) : f.type.includes("pdf") ? (
                  <FileText className="h-7 w-7 text-danger" />
                ) : f.type.startsWith("image/") ? (
                  <ImageIcon className="h-7 w-7 text-text-3" />
                ) : (
                  <FileText className="h-7 w-7 text-text-3" />
                )}
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  className="absolute top-0.5 right-0.5 rounded-full bg-danger text-primary-foreground p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Xoá file"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="mt-0.5 w-full truncate text-[10px] text-text-3 text-center">{f.name}</div>
            </div>
          ))}
        </div>
      )}

      {required && !meets && (
        <div className="mt-1 text-[11px] text-danger">Cần ít nhất {min} file để tiếp tục.</div>
      )}
    </div>
  );
}

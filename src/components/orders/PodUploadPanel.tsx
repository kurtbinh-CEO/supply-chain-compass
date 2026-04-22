import { useCallback, useRef, useState } from "react";
import {
  UploadCloud, Camera, FileText, X, CheckCircle2, Loader2, FileImage, FilePlus2,
  PenLine, ShieldCheck, AlertCircle, Trash2, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface PodFile {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  isImage: boolean;
}

type Step = "upload" | "review" | "submitting" | "done";

interface Props {
  asn: string;
  rpo: string;
  canEdit: boolean;
  existingPodUrl?: string | null;
  onComplete?: (files: PodFile[], signer: string, note: string) => void;
}

const ACCEPT = "image/*,application/pdf";
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function PodUploadPanel({ asn, rpo, canEdit, existingPodUrl, onComplete }: Props) {
  const [step, setStep] = useState<Step>(existingPodUrl ? "done" : "upload");
  const [files, setFiles] = useState<PodFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [signer, setSigner] = useState("");
  const [note, setNote] = useState("");
  const [progress, setProgress] = useState(0);
  const [previewing, setPreviewing] = useState<PodFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const accepted: PodFile[] = [];
    const errors: string[] = [];
    arr.forEach((f) => {
      if (files.length + accepted.length >= MAX_FILES) {
        errors.push(`Tối đa ${MAX_FILES} file`);
        return;
      }
      if (f.size > MAX_SIZE) {
        errors.push(`${f.name}: vượt 10MB`);
        return;
      }
      if (!/^image\/|application\/pdf$/.test(f.type)) {
        errors.push(`${f.name}: định dạng không hỗ trợ`);
        return;
      }
      accepted.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: f.name,
        size: f.size,
        type: f.type,
        previewUrl: URL.createObjectURL(f),
        isImage: f.type.startsWith("image/"),
      });
    });
    if (accepted.length) {
      setFiles((prev) => [...prev, ...accepted]);
      if (step === "upload") setStep("review");
    }
    if (errors.length) toast.error(errors[0]);
  }, [files.length, step]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEdit) return;
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      if (!next.length) setStep("upload");
      return next;
    });
  };

  const submit = () => {
    if (!files.length) {
      toast.error("Cần ít nhất 1 file POD");
      return;
    }
    if (!signer.trim()) {
      toast.error("Cần điền tên người ký nhận");
      return;
    }
    setStep("submitting");
    setProgress(0);
    const start = Date.now();
    const tick = () => {
      const p = Math.min(100, ((Date.now() - start) / 1400) * 100);
      setProgress(p);
      if (p < 100) requestAnimationFrame(tick);
      else {
        setStep("done");
        toast.success(`POD đã upload cho ${asn}`);
        onComplete?.(files, signer, note);
      }
    };
    requestAnimationFrame(tick);
  };

  const reset = () => {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
    setSigner("");
    setNote("");
    setProgress(0);
    setStep("upload");
  };

  /* ─── stepper rail ─── */
  const steps: { key: Step | "review"; label: string }[] = [
    { key: "upload", label: "Chọn file" },
    { key: "review", label: "Xác nhận" },
    { key: "done", label: "Hoàn tất" },
  ];
  const stepIdx = step === "submitting" ? 1 : step === "done" ? 2 : step === "review" ? 1 : 0;

  return (
    <div className="rounded-card border border-surface-3 bg-surface-1/40 overflow-hidden">
      {/* Header + stepper */}
      <div className="px-4 py-3 border-b border-surface-3 bg-surface-2/40">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-button bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-table-sm font-semibold text-text-1">Proof of Delivery</p>
              <p className="text-caption text-text-3">Bằng chứng giao nhận hàng</p>
            </div>
          </div>
          {step === "done" && (
            <span className="rounded-full px-2 py-0.5 text-caption font-medium bg-success-bg text-success flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Đã xác nhận
            </span>
          )}
        </div>
        {/* Stepper */}
        <div className="flex items-center gap-1.5">
          {steps.map((s, i) => {
            const active = i === stepIdx;
            const done = i < stepIdx || step === "done";
            return (
              <div key={s.key} className="flex items-center flex-1 gap-1.5">
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 transition-colors",
                  done ? "bg-success text-success-foreground" :
                  active ? "bg-primary text-primary-foreground" :
                  "bg-surface-3 text-text-3"
                )}>
                  {done ? <CheckCircle2 className="h-3 w-3" /> : i + 1}
                </div>
                <span className={cn(
                  "text-caption font-medium",
                  done || active ? "text-text-1" : "text-text-3"
                )}>{s.label}</span>
                {i < steps.length - 1 && (
                  <div className={cn("h-0.5 flex-1 rounded-full", done ? "bg-success" : "bg-surface-3")} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── DONE state ─── */}
      {step === "done" && (
        <div className="p-4 space-y-3">
          <div className="rounded-card border border-success/30 bg-success-bg/30 p-3 flex items-start gap-3">
            <div className="h-9 w-9 rounded-button bg-success/15 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-table-sm font-semibold text-text-1">POD đã được lưu trữ</p>
              <p className="text-caption text-text-3 mt-0.5">
                {existingPodUrl ?? `${files.length} file · ký bởi ${signer || "—"}`}
              </p>
            </div>
          </div>
          {!!files.length && (
            <div className="grid grid-cols-3 gap-2">
              {files.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setPreviewing(f)}
                  className="relative aspect-square rounded-card border border-surface-3 bg-surface-2 overflow-hidden hover:border-primary/40 transition-colors group"
                >
                  {f.isImage ? (
                    <img src={f.previewUrl} alt={f.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-text-3">
                      <FileText className="h-6 w-6" />
                      <span className="text-[10px] uppercase">PDF</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                </button>
              ))}
            </div>
          )}
          {canEdit && (
            <button
              onClick={reset}
              className="w-full rounded-button border border-surface-3 bg-surface-2 px-3 py-2 text-table-sm text-text-2 hover:bg-surface-1 flex items-center justify-center gap-1.5"
            >
              <FilePlus2 className="h-3.5 w-3.5" /> Upload bổ sung / thay thế
            </button>
          )}
        </div>
      )}

      {/* ─── UPLOAD state ─── */}
      {step === "upload" && (
        <div className="p-4 space-y-3">
          {!canEdit && (
            <div className="rounded-card border border-warning/30 bg-warning-bg/40 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-caption text-text-2">Bạn không có quyền upload POD cho lô này.</p>
            </div>
          )}
          {/* Dropzone */}
          <div
            onDragOver={(e) => { e.preventDefault(); if (canEdit) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => canEdit && fileInputRef.current?.click()}
            className={cn(
              "rounded-card border-2 border-dashed p-6 text-center cursor-pointer transition-all",
              !canEdit && "opacity-50 cursor-not-allowed",
              dragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-surface-3 bg-surface-2/40 hover:border-primary/40 hover:bg-surface-2/70"
            )}
          >
            <div className={cn(
              "h-12 w-12 rounded-full mx-auto flex items-center justify-center mb-2 transition-colors",
              dragOver ? "bg-primary/15" : "bg-surface-3"
            )}>
              <UploadCloud className={cn("h-6 w-6", dragOver ? "text-primary" : "text-text-2")} />
            </div>
            <p className="text-table-sm font-semibold text-text-1">
              {dragOver ? "Thả file vào đây…" : "Kéo & thả file POD"}
            </p>
            <p className="text-caption text-text-3 mt-0.5">
              hoặc <span className="text-primary font-medium">bấm để chọn</span> · JPG, PNG, PDF · tối đa 10MB
            </p>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => canEdit && cameraInputRef.current?.click()}
              disabled={!canEdit}
              className="rounded-button border border-surface-3 bg-surface-2 hover:bg-surface-1 px-3 py-2.5 text-table-sm text-text-1 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Camera className="h-4 w-4" /> Chụp ảnh
            </button>
            <button
              type="button"
              onClick={() => canEdit && fileInputRef.current?.click()}
              disabled={!canEdit}
              className="rounded-button border border-surface-3 bg-surface-2 hover:bg-surface-1 px-3 py-2.5 text-table-sm text-text-1 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <FileImage className="h-4 w-4" /> Chọn từ máy
            </button>
          </div>

          {/* Hidden inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />

          <div className="rounded-card bg-surface-2/30 border border-surface-3 px-3 py-2 text-caption text-text-3 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span>POD bao gồm: phiếu giao nhận có ký tên + ảnh hàng tại điểm giao ({asn} · {rpo})</span>
          </div>
        </div>
      )}

      {/* ─── REVIEW / SUBMITTING state ─── */}
      {(step === "review" || step === "submitting") && (
        <div className="p-4 space-y-4">
          {/* File grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-caption text-text-3 uppercase tracking-wide">
                Files đã chọn ({files.length}/{MAX_FILES})
              </p>
              {step === "review" && files.length < MAX_FILES && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-caption text-primary hover:underline flex items-center gap-1"
                >
                  <FilePlus2 className="h-3 w-3" /> Thêm
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="relative group aspect-square rounded-card border border-surface-3 bg-surface-2 overflow-hidden"
                >
                  {f.isImage ? (
                    <img src={f.previewUrl} alt={f.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-text-2 p-2">
                      <FileText className="h-7 w-7" />
                      <span className="text-[10px] truncate w-full text-center" title={f.name}>{f.name}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1 flex items-center justify-between">
                    <span className="text-[10px] text-white/90 tabular-nums">{formatBytes(f.size)}</span>
                  </div>
                  {step === "review" && (
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setPreviewing(f)}
                        className="h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                        aria-label="Xem"
                      >
                        <Eye className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => removeFile(f.id)}
                        className="h-6 w-6 rounded-full bg-danger text-primary-foreground flex items-center justify-center hover:opacity-90"
                        aria-label="Xoá"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {/* Signer + note */}
          <div className="space-y-2">
            <div>
              <label className="text-caption text-text-3 uppercase tracking-wide flex items-center gap-1.5 mb-1">
                <PenLine className="h-3 w-3" /> Người ký nhận <span className="text-danger">*</span>
              </label>
              <Input
                value={signer}
                onChange={(e) => setSigner(e.target.value)}
                placeholder="VD: Nguyễn Văn A — Thủ kho CN"
                disabled={step === "submitting"}
                className="h-9 text-table-sm"
              />
            </div>
            <div>
              <label className="text-caption text-text-3 uppercase tracking-wide mb-1 block">
                Ghi chú (tùy chọn)
              </label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Thiếu hàng / hư hỏng / tình trạng đặc biệt…"
                rows={2}
                disabled={step === "submitting"}
                className="text-table-sm resize-none"
              />
            </div>
          </div>

          {/* Submitting progress */}
          {step === "submitting" && (
            <div className="rounded-card border border-info/30 bg-info-bg/30 p-3 space-y-2">
              <div className="flex items-center gap-2 text-table-sm text-text-1">
                <Loader2 className="h-4 w-4 animate-spin text-info" />
                <span className="font-medium">Đang upload {files.length} file…</span>
                <span className="ml-auto tabular-nums text-text-2">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                <div
                  className="h-full bg-info transition-[width] duration-150 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={reset}
              disabled={step === "submitting"}
              className="rounded-button border border-surface-3 bg-surface-2 px-3 py-2 text-table-sm text-text-2 hover:bg-surface-1 disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              onClick={submit}
              disabled={step === "submitting" || !files.length}
              className="flex-1 rounded-button bg-gradient-primary text-primary-foreground px-3 py-2 text-table-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {step === "submitting" ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang xác nhận…</>
              ) : (
                <><ShieldCheck className="h-3.5 w-3.5" /> Xác nhận & Lưu POD</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── Lightbox preview ─── */}
      {previewing && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewing(null)}
        >
          <button
            className="absolute top-4 right-4 h-9 w-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
            onClick={() => setPreviewing(null)}
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
          {previewing.isImage ? (
            <img
              src={previewing.previewUrl}
              alt={previewing.name}
              className="max-h-full max-w-full rounded-card object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="bg-surface-1 rounded-card p-6 text-center" onClick={(e) => e.stopPropagation()}>
              <FileText className="h-12 w-12 text-text-2 mx-auto mb-2" />
              <p className="text-table text-text-1 font-medium">{previewing.name}</p>
              <p className="text-caption text-text-3 mt-1">{formatBytes(previewing.size)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

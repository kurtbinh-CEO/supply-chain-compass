/**
 * TransitionShell — Khung dùng chung cho mọi Dialog chuyển trạng thái PO/TO.
 *
 * Cung cấp:
 *   1. Info bar: PO ID + tuyến + qty + chuyển trạng thái cũ → mới
 *   2. Slot per-stage (children) — fields đặc thù từng bước
 *   3. Comment textarea (bắt buộc / tuỳ chọn theo cấu hình)
 *   4. EvidenceFilePicker (bắt buộc / tuỳ chọn theo cấu hình, min files)
 *   5. SLA reminder banner
 *   6. Footer: nút Submit (disabled khi chưa đủ comment/file) + Hủy
 *
 * Mobile-first: <640px → full-screen sheet (qua Dialog className).
 *
 * Mọi text tiếng Việt.
 */
import { ReactNode, useMemo, useState } from "react";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { EvidenceFilePicker, type EvidenceFile } from "./EvidenceFilePicker";
import {
  STAGE_META, STAGE_SLA_HOURS,
  type LifecycleStage, type PoLifecycleRow,
} from "@/lib/po-lifecycle-data";

export interface TransitionConfig {
  /** comment bắt buộc? mặc định true */
  commentRequired?: boolean;
  /** file đính kèm bắt buộc? */
  filesRequired?: boolean;
  /** số file tối thiểu khi filesRequired */
  filesMinCount?: number;
  /** label cho phần đính kèm */
  filesLabel?: string;
  /** placeholder cho comment */
  commentPlaceholder?: string;
  /** label nút submit */
  submitLabel?: string;
  /** màu nút submit: primary | success | warning | danger */
  submitTone?: "primary" | "success" | "warning" | "danger";
}

interface Props {
  row: PoLifecycleRow;
  fromStage: LifecycleStage;
  toStage: LifecycleStage;
  config: TransitionConfig;
  /** Form fields đặc thù theo bước (vd input số xe, số lượng nhận…). */
  children?: ReactNode;
  /** Trạng thái hợp lệ của form fields đặc thù; nếu false thì disable submit. */
  fieldsValid?: boolean;
  /** Hàm gọi khi bấm Submit. Nhận thêm comment + files để upstream lưu. */
  onSubmit: (data: { comment: string; files: EvidenceFile[] }) => void;
  /** Tiêu đề custom (mặc định: "Chuyển sang {stage}"). */
  title?: string;
  /** Mô tả custom (mặc định: route + qty). */
  description?: string;
}

export function TransitionShell({
  row, fromStage, toStage, config, children, fieldsValid = true, onSubmit, title, description,
}: Props) {
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<EvidenceFile[]>([]);

  const commentRequired = config.commentRequired ?? true;
  const filesRequired = config.filesRequired ?? false;
  const filesMin = filesRequired ? Math.max(1, config.filesMinCount ?? 1) : 0;

  const commentOk = !commentRequired || comment.trim().length >= 5;
  const filesOk = !filesRequired || files.length >= filesMin;
  const canSubmit = fieldsValid && commentOk && filesOk;

  const sla = STAGE_SLA_HOURS[toStage] || 0;
  const slaText = useMemo(() => {
    if (!sla) return null;
    if (sla < 24) return `${sla} giờ`;
    return `${Math.round(sla / 24)} ngày`;
  }, [sla]);

  const submitToneClass = config.submitTone === "success" ? "bg-success text-primary-foreground hover:bg-success/90"
    : config.submitTone === "warning" ? "bg-warning text-primary-foreground hover:bg-warning/90"
    : config.submitTone === "danger" ? "bg-danger text-primary-foreground hover:bg-danger/90"
    : "";

  return (
    <div className="flex flex-col h-full max-h-[inherit] min-h-0">
      {/* HEADER — sticky top */}
      <DialogHeader className="px-6 pt-6 pb-3 max-sm:px-4 max-sm:pt-4 border-b border-surface-3 shrink-0">
        <DialogTitle className="text-h3">
          {title ?? `Chuyển sang ${STAGE_META[toStage].label}`}
        </DialogTitle>
        <DialogDescription className="text-table-sm text-text-2">
          {description ?? (
            <>
              <span className="font-mono font-semibold text-text-1">{row.poNumber}</span>
              {" · "}{row.fromName} → {row.toName}
              {" · "}<span className="tabular-nums">{(row.qtyConfirmed ?? row.qty).toLocaleString()} m²</span>
            </>
          )}
        </DialogDescription>

        {/* Info bar — chuyển trạng thái */}
        <div className="mt-2 flex items-center gap-1.5 text-table-xs flex-wrap">
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-medium", STAGE_META[fromStage].tone)}>
            {STAGE_META[fromStage].short}
          </span>
          <ArrowRight className="h-3.5 w-3.5 text-text-3" />
          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 font-semibold", STAGE_META[toStage].tone)}>
            {STAGE_META[toStage].short}
          </span>
        </div>
      </DialogHeader>

      {/* BODY — scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-3 max-sm:px-4 space-y-3 min-h-0">
        {/* Per-stage fields */}
        {children}

        {/* Comment — luôn có, required theo config */}
        <div>
          <Label className="text-caption">
            Ghi chú {commentRequired && <span className="text-danger">*</span>}
          </Label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder={config.commentPlaceholder ?? "Mô tả ngắn gọn việc đã làm, kênh liên hệ, kết quả phản hồi…"}
            className="text-base"
          />
          <div className="flex items-center justify-between mt-0.5">
            <span className={cn("text-[10px]", commentRequired && !commentOk ? "text-danger" : "text-text-3")}>
              {commentRequired && !commentOk ? "Cần ≥ 5 ký tự." : "Càng chi tiết càng tốt — sẽ lưu vào nhật ký."}
            </span>
            <span className="text-[10px] text-text-3 tabular-nums">{comment.length}/500</span>
          </div>
        </div>

        {/* Files */}
        <EvidenceFilePicker
          label={config.filesLabel ?? "Đính kèm minh chứng"}
          required={filesRequired}
          minCount={filesMin}
          files={files}
          onChange={setFiles}
        />

        {/* SLA reminder */}
        {slaText && (
          <div className="rounded border border-info/30 bg-info-bg/40 px-2.5 py-1.5 text-[11px] text-info inline-flex items-center gap-1.5">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>SLA bước tiếp: {slaText}</span>
          </div>
        )}
      </div>

      {/* FOOTER — sticky bottom với safe-area cho iOS */}
      <DialogFooter className="px-6 py-3 max-sm:px-4 max-sm:pb-[max(env(safe-area-inset-bottom),12px)] border-t border-surface-3 bg-surface-0 shrink-0 gap-2 sm:gap-2">
        <Button
          disabled={!canSubmit}
          onClick={() => onSubmit({ comment: comment.trim(), files })}
          className={cn(
            "w-full sm:w-auto min-h-11 max-sm:min-h-14 max-sm:text-base font-semibold",
            submitToneClass,
          )}
        >
          {config.submitLabel ?? `Xác nhận ${STAGE_META[toStage].short}`}
        </Button>
      </DialogFooter>
    </div>
  );
}

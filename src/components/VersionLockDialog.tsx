/**
 * VersionLockDialog & ViewingVersionBanner — phụ trợ Version System
 *
 * VersionLockDialog: modal xác nhận khóa/mở khóa kèm lý do.
 * ViewingVersionBanner: banner vàng khi xem phiên bản cũ — disable mọi action.
 */
import { useState } from "react";
import { Lock, Unlock, AlertTriangle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface LockDialogProps {
  open: boolean;
  onClose: () => void;
  /** "lock" | "unlock" */
  mode: "lock" | "unlock";
  /** Tên thực thể: "DRP W20" / "S&OP T5" */
  entityLabel: string;
  versionNumber: number;
  onConfirm: (reason: string) => void;
}

export function VersionLockDialog({
  open, onClose, mode, entityLabel, versionNumber, onConfirm,
}: LockDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason);
    setReason("");
    onClose();
  };

  const isLock = mode === "lock";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLock ? <Lock className="h-4 w-4 text-warning" /> : <Unlock className="h-4 w-4 text-info" />}
            {isLock ? "Khóa" : "Mở khóa"} {entityLabel} v{versionNumber}?
          </DialogTitle>
          <DialogDescription className="text-text-2 leading-relaxed">
            {isLock
              ? "Sau khi khóa, không thể chạy lại hoặc sửa kết quả của tuần/tháng này. Mọi thay đổi cần Mở khóa trước (chỉ SC Manager)."
              : "Mở khóa cho phép chạy lại và sửa kết quả. Hành động này được ghi vào nhật ký và yêu cầu lý do."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-table-sm font-medium text-text-1">
            Lý do {isLock ? "(tuỳ chọn)" : "(bắt buộc)"}
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isLock
              ? "VD: Đã release PO, chốt số liệu tuần."
              : "VD: Phát hiện sai sót trong SS — cần chạy lại."}
            rows={3}
            className="resize-none text-table-sm"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Hủy</Button>
          <Button
            onClick={handleConfirm}
            disabled={!isLock && reason.trim().length === 0}
            className={cn(
              "gap-1.5",
              isLock ? "bg-warning text-warning-foreground hover:bg-warning/90" : "bg-info text-info-foreground hover:bg-info/90"
            )}
          >
            {isLock ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            {isLock ? "Khóa ✓" : "Mở khóa ✓"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ViewingBannerProps {
  /** version đang xem (cũ) */
  versionNumber: number;
  /** version active hiện tại */
  activeVersion: number;
  /** Tên thực thể */
  entityLabel: string;
  onReturn: () => void;
}

export function ViewingVersionBanner({
  versionNumber, activeVersion, entityLabel, onReturn,
}: ViewingBannerProps) {
  return (
    <div className="mb-4 rounded-card border-2 border-warning/40 bg-warning-bg/40 px-4 py-2.5 flex items-center gap-3 animate-fade-in">
      <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
      <div className="flex-1 text-table-sm text-text-1">
        <span className="font-semibold">Đang xem phiên bản cũ (v{versionNumber}) của {entityLabel}.</span>{" "}
        <span className="text-text-2">Không thể chỉnh sửa — mọi action đã khóa.</span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1 border-warning/40 text-warning hover:bg-warning/10"
        onClick={onReturn}
      >
        Quay về v{activeVersion} <ArrowRight className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default VersionLockDialog;

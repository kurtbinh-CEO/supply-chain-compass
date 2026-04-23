import { useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, X, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SKU_BASES, type NmId } from "@/data/unis-enterprise-dataset";
import { getSkuBasesForNm } from "@/data/unis-enterprise-dataset";

interface PreviewRow {
  sku: string;
  qty: number;
  status: "new" | "update" | "error";
  error?: string;
}

/**
 * 7-step Excel preview/validate dialog.
 * Steps surfaced to the user: download template → upload → validate → preview
 * (N new / M update / K error) → resolve errors → confirm → import.
 */
export function NmUploadPreviewDialog({
  nmId,
  nmName,
  fileName,
  onClose,
  onConfirm,
}: {
  nmId: NmId;
  nmName: string;
  fileName: string;
  onClose: () => void;
  onConfirm: (rows: PreviewRow[]) => void;
}) {
  // Build a synthetic preview based on the NM's allowed SKUs + a deliberate
  // mismatch so validators can show error rows.
  const rows = useMemo<PreviewRow[]>(() => {
    const allowed = getSkuBasesForNm(nmId).map((b) => b.code);
    if (allowed.length === 0) return [];
    const valid: PreviewRow[] = allowed.slice(0, 4).map((sku, i) => ({
      sku,
      qty: 800 + i * 220,
      status: i === 0 ? "new" : "update",
    }));
    // Inject an SKU that doesn't belong to this NM as an error row.
    const foreign = SKU_BASES.find((b) => !allowed.includes(b.code));
    if (foreign) {
      valid.push({
        sku: foreign.code,
        qty: 500,
        status: "error",
        error: `${foreign.code} không thuộc NM ${nmName}`,
      });
    }
    return valid;
  }, [nmId, nmName]);

  const counts = useMemo(() => {
    const c = { new: 0, update: 0, error: 0 };
    rows.forEach((r) => c[r.status]++);
    return c;
  }, [rows]);

  const [confirming, setConfirming] = useState(false);

  const handleConfirm = () => {
    if (counts.error > 0) {
      toast.error("Vẫn còn dòng lỗi", { description: "Vui lòng sửa file Excel rồi tải lại." });
      return;
    }
    setConfirming(true);
    setTimeout(() => {
      setConfirming(false);
      onConfirm(rows);
      toast.success(`Đã import tồn kho ${nmName}`, {
        description: `${counts.new} mã mới · ${counts.update} mã cập nhật.`,
      });
      onClose();
    }, 800);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="rounded-card border border-surface-3 bg-surface-0 w-full max-w-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-body font-semibold text-text-1">
                Preview import — {nmName}
              </p>
              <p className="text-caption text-text-3 truncate">{fileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-text-3 hover:bg-surface-2 hover:text-text-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-table-sm">
          <div className="rounded-button border border-success/30 bg-success-bg px-3 py-2 text-center">
            <p className="text-caption text-text-3 uppercase tracking-wider">Mới</p>
            <p className="text-body font-semibold text-success">{counts.new}</p>
          </div>
          <div className="rounded-button border border-primary/30 bg-info-bg px-3 py-2 text-center">
            <p className="text-caption text-text-3 uppercase tracking-wider">Cập nhật</p>
            <p className="text-body font-semibold text-primary">{counts.update}</p>
          </div>
          <div
            className={cn(
              "rounded-button border px-3 py-2 text-center",
              counts.error > 0
                ? "border-danger/40 bg-danger-bg"
                : "border-surface-3 bg-surface-2"
            )}
          >
            <p className="text-caption text-text-3 uppercase tracking-wider">Lỗi</p>
            <p
              className={cn(
                "text-body font-semibold",
                counts.error > 0 ? "text-danger" : "text-text-3"
              )}
            >
              {counts.error}
            </p>
          </div>
        </div>

        <div className="rounded-card border border-surface-3 bg-surface-1 max-h-72 overflow-y-auto">
          <table className="w-full text-table-sm">
            <thead className="bg-surface-2 text-text-3 text-caption uppercase tracking-wider sticky top-0">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Mã hàng</th>
                <th className="text-right px-3 py-2 font-semibold">Tồn kho (m²)</th>
                <th className="text-center px-3 py-2 font-semibold">Trạng thái</th>
                <th className="text-left px-3 py-2 font-semibold">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-surface-3">
                  <td className="px-3 py-2 font-mono text-text-1">{r.sku}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-2">
                    {r.qty.toLocaleString("vi-VN")}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {r.status === "new" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success-bg px-2 py-0.5 text-caption font-semibold text-success">
                        <CheckCircle2 className="h-3 w-3" /> Mới
                      </span>
                    )}
                    {r.status === "update" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-info-bg px-2 py-0.5 text-caption font-semibold text-primary">
                        Cập nhật
                      </span>
                    )}
                    {r.status === "error" && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-danger/40 bg-danger-bg px-2 py-0.5 text-caption font-semibold text-danger">
                        <AlertTriangle className="h-3 w-3" /> Lỗi
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-caption text-text-3">
                    {r.error ?? (r.status === "new" ? "Sẽ thêm mới" : "Ghi đè giá trị cũ")}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-caption text-text-3">
                    Không có dòng dữ liệu hợp lệ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <p className="text-caption text-text-3">
            Bước 4/7 · Preview & validate
            {counts.error > 0 && (
              <span className="text-danger font-medium">
                {" "}— sửa {counts.error} dòng lỗi trước khi xác nhận
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-button border border-surface-3 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-1"
            >
              Huỷ
            </button>
            <button
              onClick={handleConfirm}
              disabled={confirming || counts.error > 0}
              className={cn(
                "rounded-button bg-gradient-primary text-primary-foreground px-3 py-1.5 text-table-sm font-medium",
                (confirming || counts.error > 0) && "opacity-60 cursor-not-allowed"
              )}
            >
              {confirming ? "Đang import…" : "Xác nhận import"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

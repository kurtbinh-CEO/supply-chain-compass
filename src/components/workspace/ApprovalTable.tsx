import { useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const rejectReasons = [
  "Dữ liệu chưa chính xác",
  "Cần xác nhận thêm từ NM",
  "Vượt ngân sách cho phép",
  "Không phù hợp kế hoạch",
  "Lý do khác",
];

/** Map raw English approval types to Vietnamese labels (M14). */
const approvalTypeLabel: Record<string, string> = {
  "S&OP": "S&OP",
  "CN Adjust": "CN điều chỉnh",
  "PO Release": "Phát hành PO",
  "Force-release": "Phát hành khẩn",
  "SS Change": "Thay đổi tồn kho an toàn",
  "TO Source": "Nguồn TO",
  "Nguồn TO": "Nguồn TO",
  "CN điều chỉnh": "CN điều chỉnh",
  "Phát hành PO": "Phát hành PO",
  "Phát hành khẩn": "Phát hành khẩn",
  "Thay đổi tồn kho an toàn": "Thay đổi tồn kho an toàn",
};

const localizeType = (raw: string) => approvalTypeLabel[raw] ?? raw;

export function ApprovalTable() {
  const { approvals, pendingCount, removeApproval } = useWorkspace();
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState(rejectReasons[0]);
  const [rejectNote, setRejectNote] = useState("");

  const approveItem = approvals.find((a) => a.id === approveId);
  const rejectItem = approvals.find((a) => a.id === rejectId);

  const handleConfirmApprove = () => {
    if (approveId) {
      removeApproval(approveId);
      setApproveId(null);
    }
  };

  const handleConfirmReject = () => {
    if (rejectId) {
      removeApproval(rejectId);
      setRejectId(null);
      setRejectReason(rejectReasons[0]);
      setRejectNote("");
    }
  };

  return (
    <>
      <div className="rounded-card border border-surface-3 bg-surface-2">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-section-header text-text-1">Cần duyệt</h2>
            <span className="rounded-full bg-primary text-primary-foreground text-caption font-semibold px-2 py-0.5 min-w-[22px] text-center">
              {pendingCount}
            </span>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-3">
              <th className="text-left text-table-header uppercase text-text-3 px-5 py-3 w-[140px]">Loại</th>
              <th className="text-left text-table-header uppercase text-text-3 px-5 py-3">Mô tả</th>
              <th className="text-left text-table-header uppercase text-text-3 px-5 py-3 w-[100px]">Người gửi</th>
              <th className="text-center text-table-header uppercase text-text-3 px-5 py-3 w-[80px]">Thời gian</th>
              <th className="text-right text-table-header uppercase text-text-3 px-5 py-3 w-[150px]">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((item, i) => (
              <tr
                key={item.id}
                className={cn(
                  "border-b border-surface-3/50 hover:bg-surface-3 transition-colors",
                  i % 2 === 0 ? "bg-surface-0" : "bg-surface-2"
                )}
              >
                <td className="px-5 py-3">
                  <StatusChip status={item.typeColor} label={localizeType(item.type)} />
                </td>
                <td className="px-5 py-3 text-table text-text-1">{item.description}</td>
                <td className="px-5 py-3 text-table text-text-2">{item.submitter}</td>
                <td className="px-5 py-3 text-table-sm text-text-3 text-center">{item.timeAgo}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setApproveId(item.id)}
                      className="text-primary text-table-sm font-semibold hover:underline"
                    >
                      Duyệt
                    </button>
                    <button
                      onClick={() => setRejectId(item.id)}
                      className="text-text-3 text-table-sm hover:text-danger hover:underline"
                    >
                      Từ chối
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {approvals.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-table text-text-3">
                  Không còn mục nào cần duyệt ✓
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Approve Confirm Modal */}
      <Dialog open={!!approveId} onOpenChange={() => setApproveId(null)}>
        <DialogContent className="bg-surface-2 border-surface-3">
          <DialogHeader>
            <DialogTitle className="font-display text-text-1">Xác nhận duyệt</DialogTitle>
            <DialogDescription className="text-text-2 text-table">
              Bạn có chắc chắn muốn duyệt mục này?
            </DialogDescription>
          </DialogHeader>
          {approveItem && (
            <div className="rounded-md border border-surface-3 bg-surface-0 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <StatusChip status={approveItem.typeColor} label={localizeType(approveItem.type)} />
                <span className="text-table-sm text-text-3">{approveItem.timeAgo}</span>
              </div>
              <p className="text-table text-text-1 font-medium">{approveItem.description}</p>
              <p className="text-table-sm text-text-3">Gửi bởi: {approveItem.submitter}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveId(null)}>Hủy</Button>
            <Button className="bg-gradient-primary text-primary-foreground" onClick={handleConfirmApprove}>
              Xác nhận duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={!!rejectId} onOpenChange={() => setRejectId(null)}>
        <DialogContent className="bg-surface-2 border-surface-3">
          <DialogHeader>
            <DialogTitle className="font-display text-text-1">Từ chối</DialogTitle>
            <DialogDescription className="text-text-2 text-table">
              Chọn lý do từ chối và thêm ghi chú nếu cần.
            </DialogDescription>
          </DialogHeader>
          {rejectItem && (
            <div className="rounded-md border border-surface-3 bg-surface-0 p-4 space-y-1">
              <div className="flex items-center gap-2">
                <StatusChip status={rejectItem.typeColor} label={localizeType(rejectItem.type)} />
              </div>
              <p className="text-table text-text-1 font-medium">{rejectItem.description}</p>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-table-sm font-medium text-text-2 mb-1.5 block">Lý do</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full h-9 rounded-button border border-surface-3 bg-surface-0 px-3 text-table text-text-1 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {rejectReasons.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-table-sm font-medium text-text-2 mb-1.5 block">Ghi chú</label>
              <textarea
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="Thêm ghi chú cho người gửi..."
                rows={3}
                className="w-full rounded-button border border-surface-3 bg-surface-0 px-3 py-2 text-table text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Hủy</Button>
            <Button variant="destructive" onClick={handleConfirmReject}>
              Xác nhận từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

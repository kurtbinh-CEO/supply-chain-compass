import { Download, FileText, ChevronRight } from "lucide-react";
import { useState } from "react";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, actions }: ScreenHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="font-display text-screen-title text-text-1">{title}</h1>
        {subtitle && <p className="text-table text-text-2 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-2 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3 transition-colors">
          <Download className="h-3.5 w-3.5" />
          Excel
        </button>
        <button className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-2 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3 transition-colors">
          <FileText className="h-3.5 w-3.5" />
          PDF
        </button>
        {actions}
      </div>
    </div>
  );
}

interface ScreenFooterProps {
  actionCount: number;
}

export function ScreenFooter({ actionCount }: ScreenFooterProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mt-6 flex items-center justify-between rounded-card border border-surface-3 bg-surface-1 px-5 py-3">
        <span className="text-table text-text-2">
          <span className="font-medium text-text-1">{actionCount} actions</span> · Chi tiết
        </span>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-table-sm text-primary font-medium hover:underline"
        >
          Xem audit log
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Audit slide-in panel */}
      {open && (
        <>
          <div className="fixed inset-0 bg-text-1/30 z-50" onClick={() => setOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-[480px] bg-surface-2 border-l border-surface-3 z-50 rounded-l-panel animate-slide-in-right shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
              <h2 className="font-display text-section-header text-text-1">Audit Log</h2>
              <button onClick={() => setOpen(false)} className="text-text-3 hover:text-text-1 transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-3">
              <div className="rounded-button border border-surface-3 bg-surface-0 p-3">
                <p className="text-table-sm text-text-3">14:30 · Hôm nay</p>
                <p className="text-table text-text-1 mt-0.5">Nguyễn Văn A đã cập nhật dự báo GT-6060</p>
              </div>
              <div className="rounded-button border border-surface-3 bg-surface-0 p-3">
                <p className="text-table-sm text-text-3">11:15 · Hôm nay</p>
                <p className="text-table text-text-1 mt-0.5">Hệ thống tự động điều chỉnh allocation CN Miền Nam</p>
              </div>
              <div className="rounded-button border border-surface-3 bg-surface-0 p-3">
                <p className="text-table-sm text-text-3">09:00 · Hôm nay</p>
                <p className="text-table text-text-1 mt-0.5">DRP run #47 hoàn tất — 3 cảnh báo</p>
              </div>
              <button className="inline-flex items-center gap-1.5 rounded-button border border-surface-3 bg-surface-2 px-3 py-1.5 text-table-sm text-text-2 hover:bg-surface-3 transition-colors mt-4">
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

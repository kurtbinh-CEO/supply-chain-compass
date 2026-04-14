import { useWalkthrough } from "./WalkthroughContext";
import { X, BookOpen, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function WalkthroughOverlay() {
  const { active, dismiss } = useWalkthrough();
  const navigate = useNavigate();

  if (!active) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-[90] animate-fade-in"
        onClick={dismiss}
      />

      {/* Overlay panel — top right */}
      <div className="fixed top-16 right-6 z-[91] w-[400px] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-card border border-primary/30 bg-surface-0 shadow-xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-3 bg-primary/5">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="font-display text-table font-semibold text-primary">Hướng dẫn</span>
            <span className="rounded-sm bg-primary/10 text-primary text-caption font-medium px-1.5 py-0.5">{active.badge}</span>
          </div>
          <button
            onClick={dismiss}
            className="p-1 rounded-md hover:bg-surface-3 transition-colors"
          >
            <X className="h-4 w-4 text-text-3" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <h3 className="font-display text-body font-semibold text-text-1 mb-1">
              {active.route} — {active.title}
            </h3>
          </div>

          <div className="rounded-md bg-[#00714d]/5 p-3">
            <h4 className="text-table-sm font-semibold text-[#00714d] mb-1">📋 LÀM GÌ</h4>
            <p className="text-table-sm text-text-2 whitespace-pre-wrap leading-relaxed">{active.what}</p>
          </div>

          <div className="rounded-md bg-[#b45309]/5 p-3">
            <h4 className="text-table-sm font-semibold text-[#b45309] mb-1">🔧 CÁCH LÀM</h4>
            <p className="text-table-sm text-text-2 whitespace-pre-wrap leading-relaxed">{active.how}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-surface-3">
          <button
            onClick={() => { dismiss(); navigate("/guide"); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-button text-table-sm font-medium text-text-2 hover:bg-surface-3 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại Guide
          </button>
          <div className="flex-1" />
          <button
            onClick={dismiss}
            className="px-3 py-1.5 rounded-button bg-primary text-primary-foreground text-table-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Đã hiểu ✓
          </button>
        </div>
      </div>
    </>
  );
}

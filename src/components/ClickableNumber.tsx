import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface BreakdownRow {
  label: string;
  value: number | string;
  pct?: string;
  detail?: string;
  color?: string; // text color class
}

export interface BreakdownLink {
  label: string;
  to: string;
}

export interface ClickableNumberProps {
  value: string | number;
  label?: string;
  color?: string; // text color class for the number
  className?: string;
  breakdown?: BreakdownRow[];
  formula?: string; // mono formula block
  note?: string; // extra note below
  links?: BreakdownLink[];
  panelTitle?: string; // override header
  children?: React.ReactNode; // custom panel content
}

// Global close handler — only one popover open at a time
let globalClose: (() => void) | null = null;

export function ClickableNumber({
  value,
  label,
  color,
  className,
  breakdown,
  formula,
  note,
  links,
  panelTitle,
  children,
}: ClickableNumberProps) {
  const [open, setOpen] = useState(false);
  const [hasClicked, setHasClicked] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const close = useCallback(() => setOpen(false), []);

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
      globalClose = null;
    } else {
      // Close any other open popover
      if (globalClose) globalClose();
      setOpen(true);
      setHasClicked(true);
      globalClose = close;
    }
  }, [open, close]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        globalClose = null;
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const displayValue = typeof value === "number" ? value.toLocaleString() : value;
  const header = panelTitle || (label ? `${label}: ${displayValue}` : displayValue);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={toggle}
        className={cn(
          "tabular-nums cursor-pointer transition-all duration-100",
          "border-b border-dotted border-current",
          "hover:shadow-[0_0_0_3px_hsl(var(--info)/0.15)]",
          open && "ring-2 ring-info/30",
          color,
          className
        )}
        title={!hasClicked ? "click xem nguồn" : undefined}
      >
        {displayValue}
      </button>

      {!hasClicked && (
        <span className="block text-[7px] text-text-3 leading-tight mt-0.5 text-center select-none">
          click xem nguồn
        </span>
      )}

      {open && (
        <div
          className="absolute z-50 top-full left-1/2 -translate-x-1/2 mt-2 w-[380px] max-w-[90vw] bg-surface-2 border border-surface-3 rounded-xl shadow-lg animate-fade-in"
          style={{ animationDuration: "150ms" }}
        >
          {/* Arrow */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-surface-2 border-l border-t border-surface-3" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-3 relative z-10">
            <span className="font-display text-table font-semibold text-text-1 truncate">{header}</span>
            <button onClick={close} className="text-text-3 hover:text-text-1 p-0.5">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-3 space-y-3 max-h-[300px] overflow-y-auto relative z-10">
            {/* Custom children */}
            {children}

            {/* Breakdown table */}
            {breakdown && breakdown.length > 0 && (
              <table className="w-full text-table-sm">
                <tbody>
                  {breakdown.map((row, i) => (
                    <tr key={i} className="border-b border-surface-3/30 last:border-0">
                      <td className="py-1.5 pr-3 text-text-2">{row.label}</td>
                      <td className={cn("py-1.5 pr-2 tabular-nums font-medium text-right", row.color || "text-text-1")}>
                        {typeof row.value === "number" ? row.value.toLocaleString() : row.value}
                      </td>
                      {row.pct && <td className="py-1.5 text-text-3 text-right text-caption">{row.pct}</td>}
                      {row.detail && (
                        <td className="py-1.5 pl-2 text-text-3 text-caption max-w-[140px] truncate">{row.detail}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Formula block */}
            {formula && (
              <pre className="bg-surface-1 border border-surface-3 rounded-lg px-3 py-2 text-[11px] font-mono text-text-2 whitespace-pre-wrap leading-relaxed">
                {formula}
              </pre>
            )}

            {/* Note */}
            {note && (
              <p className="text-caption text-text-3 italic">{note}</p>
            )}
          </div>

          {/* Footer links */}
          {links && links.length > 0 && (
            <div className="px-4 py-2 border-t border-surface-3 flex flex-wrap gap-2 relative z-10">
              {links.map((link, i) => (
                <button
                  key={i}
                  onClick={() => { navigate(link.to); setOpen(false); }}
                  className="text-primary text-caption font-medium hover:underline"
                >
                  {link.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

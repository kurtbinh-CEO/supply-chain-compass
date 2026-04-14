import { useState, useRef, useEffect, ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogicTooltipProps {
  /** Multi-line explanation text — supports \n for line breaks */
  content: string;
  /** Optional children to render instead of default ❓ icon */
  children?: ReactNode;
  /** Icon size */
  size?: "sm" | "md";
  /** Optional title */
  title?: string;
  /** Always visible info card (no toggle, always shown) */
  alwaysVisible?: boolean;
  /** Expandable content (click to expand) */
  expandable?: boolean;
  /** Custom trigger className */
  triggerClassName?: string;
}

export function LogicTooltip({
  content,
  children,
  size = "sm",
  title,
  alwaysVisible = false,
  expandable = false,
  triggerClassName,
}: LogicTooltipProps) {
  const [open, setOpen] = useState(alwaysVisible);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (alwaysVisible) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, alwaysVisible]);

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  if (alwaysVisible) {
    return (
      <div className="rounded-card border border-info/20 bg-info-bg/30 px-4 py-3 text-table-sm text-text-2 space-y-1">
        {title && <p className="font-medium text-info text-table-sm">{title}</p>}
        {content.split("\n").map((line, i) => (
          <p key={i} className={cn(
            line.startsWith("•") ? "pl-2" : "",
            line.startsWith("  ") ? "pl-4 text-caption text-text-3" : "",
            line.includes("✅") ? "text-success" : "",
            line.includes("🟡") ? "text-warning" : "",
            line.includes("🔴") ? "text-danger" : "",
          )}>{line}</p>
        ))}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center text-text-3 hover:text-info transition-colors",
          triggerClassName
        )}
        title="Xem giải thích logic"
      >
        {children || <HelpCircle className={iconSize} />}
      </button>
      {open && (
        <div className={cn(
          "absolute z-50 w-[360px] rounded-card border border-surface-3 bg-surface-2 shadow-xl p-4 space-y-1 animate-fade-in",
          "top-full mt-1.5 left-0"
        )} style={{ maxHeight: "400px", overflowY: "auto" }}>
          {title && <p className="font-display text-table-sm font-semibold text-text-1 mb-2">{title}</p>}
          {content.split("\n").map((line, i) => (
            <p key={i} className={cn(
              "text-caption leading-relaxed",
              line.startsWith("  ") ? "pl-3 text-text-3" : "text-text-2",
              line.startsWith("→") || line.startsWith("★") ? "font-medium text-primary" : "",
              line.includes("Config:") ? "text-text-3 italic" : "",
            )}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Inline expandable logic detail — click to show/hide */
export function LogicExpand({ label, content, title }: { label: string; content: string; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="text-info text-caption font-medium hover:underline inline-flex items-center gap-0.5"
      >
        {open ? "▾" : "▸"} {label}
      </button>
      {open && (
        <div className="mt-2 rounded-card border border-info/20 bg-info-bg/20 px-4 py-3 space-y-1 animate-fade-in">
          {title && <p className="font-medium text-info text-table-sm mb-1">{title}</p>}
          {content.split("\n").map((line, i) => (
            <p key={i} className={cn(
              "text-caption leading-relaxed",
              line.startsWith("  ") ? "pl-3 text-text-3" : "text-text-2",
              line.startsWith("→") ? "font-medium text-primary" : "",
              line.includes("|") ? "font-mono text-[10px]" : "",
            )}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}

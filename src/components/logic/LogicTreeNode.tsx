import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export interface LogicNodeData {
  label: string;
  formulaHeader?: string;
  accent: string; // "blue" | "green" | "amber" | "red" | "teal"
  content?: React.ReactNode;
  children?: LogicNodeData[];
}

interface LogicTreeNodeProps {
  node: LogicNodeData;
  depth?: number;
  defaultOpen?: boolean;
}

export function LogicTreeNode({ node, depth = 0, defaultOpen = false }: LogicTreeNodeProps) {
  const [open, setOpen] = useState(defaultOpen);
  const hasContent = !!(node.content || (node.children && node.children.length > 0));

  const accentColors: Record<string, string> = {
    blue: "hsl(var(--info))",
    green: "hsl(var(--success))",
    amber: "hsl(var(--warning))",
    red: "hsl(var(--danger))",
    teal: "hsl(var(--info))",
  };
  const borderColor = accentColors[node.accent] || accentColors.blue;

  return (
    <div className={cn("relative", depth > 0 && "ml-6 border-l border-dashed border-surface-3 pl-0")}>
      <div
        className={cn(
          "rounded-lg bg-white dark:bg-surface-2 border border-surface-3 overflow-hidden transition-shadow",
          open && "shadow-md",
        )}
        style={{ borderLeftWidth: "3px", borderLeftColor: borderColor, borderLeftStyle: "solid" }}
      >
        {/* Header */}
        <button
          onClick={() => hasContent && setOpen(!open)}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2.5 text-left",
            hasContent && "cursor-pointer hover:bg-surface-1/50"
          )}
        >
          {hasContent && (
            <ChevronRight
              className={cn("h-4 w-4 text-text-3 shrink-0 transition-transform duration-150", open && "rotate-90")}
            />
          )}
          <span className="font-display text-table font-semibold text-text-1">{node.label}</span>
          {node.formulaHeader && (
            <span className="ml-auto text-[11px] font-mono text-text-3 tabular-nums truncate max-w-[50%] text-right">
              {node.formulaHeader}
            </span>
          )}
        </button>

        {/* Body */}
        {open && (
          <div
            className="px-4 pb-3 pt-1 border-t border-surface-3/50 animate-fade-in space-y-3"
            style={{ animationDuration: "150ms" }}
          >
            {node.content}
            {node.children && node.children.length > 0 && (
              <div className="space-y-2 mt-2">
                {node.children.map((child, i) => (
                  <LogicTreeNode key={i} node={child} depth={depth + 1} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

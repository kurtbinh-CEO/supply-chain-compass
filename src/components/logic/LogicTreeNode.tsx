import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

export interface LogicNodeData {
  label: string;
  formulaHeader?: string;
  accent: string; // "blue" | "green" | "amber" | "red" | "teal"
  content?: React.ReactNode;
  children?: LogicNodeData[];
}

/** Check if a node or its children contain the search query (checks label + formulaHeader) */
export function nodeMatchesSearch(node: LogicNodeData, query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase();
  if (node.label.toLowerCase().includes(q)) return true;
  if (node.formulaHeader && node.formulaHeader.toLowerCase().includes(q)) return true;
  if (node.children?.some((c) => nodeMatchesSearch(c, q))) return true;
  return false;
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const q = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-warning/30 text-inherit rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

interface LogicTreeNodeProps {
  node: LogicNodeData;
  depth?: number;
  defaultOpen?: boolean;
  searchQuery?: string;
}

export function LogicTreeNode({ node, depth = 0, defaultOpen = false, searchQuery = "" }: LogicTreeNodeProps) {
  const matchesSelf = searchQuery && (
    node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.formulaHeader && node.formulaHeader.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const childMatches = searchQuery && node.children?.some((c) => nodeMatchesSearch(c, searchQuery));
  const shouldAutoOpen = !!(matchesSelf || childMatches);

  const [open, setOpen] = useState(defaultOpen || shouldAutoOpen);
  const hasContent = !!(node.content || (node.children && node.children.length > 0));

  // Re-sync open state when search changes
  const [prevQuery, setPrevQuery] = useState(searchQuery);
  if (searchQuery !== prevQuery) {
    setPrevQuery(searchQuery);
    if (searchQuery) {
      if (shouldAutoOpen && !open) setOpen(true);
      if (!shouldAutoOpen && !matchesSelf && open && !defaultOpen) setOpen(false);
    }
  }

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
          matchesSelf && "ring-2 ring-warning/50",
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
          <span className="font-display text-table font-semibold text-text-1">
            <HighlightText text={node.label} query={searchQuery} />
          </span>
          {node.formulaHeader && (
            <span className="ml-auto text-[11px] font-mono text-text-3 tabular-nums truncate max-w-[50%] text-right">
              <HighlightText text={node.formulaHeader} query={searchQuery} />
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
                  <LogicTreeNode key={i} node={child} depth={depth + 1} searchQuery={searchQuery} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

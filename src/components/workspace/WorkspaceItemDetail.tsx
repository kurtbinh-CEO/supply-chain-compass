/**
 * WorkspaceItemDetail — M14
 *
 * Inline expand panel rendered BELOW a row in the WorkspacePage "Cần làm" list.
 * Shows submitter info, lead summary, reason, structured context sections,
 * an optional AI suggestion banner, and the action buttons relevant to the
 * specific item (replacing the row's collapsed mini buttons).
 *
 * Pure presentation — receives a `WorkspaceItemContext` and dispatches a
 * single `onAction(label)` callback for the parent to handle.
 */
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  WorkspaceItemContext,
  ContextRow,
  ContextSection,
} from "@/lib/workspace-context-data";

interface WorkspaceItemDetailProps {
  ctx: WorkspaceItemContext;
  onAction: (label: string) => void;
  onClose?: () => void;
}

const toneTextClass: Record<NonNullable<ContextRow["tone"]>, string> = {
  danger: "text-danger",
  warning: "text-warning",
  success: "text-success",
  info: "text-info",
  muted: "text-text-2",
};

const variantBtnClass: Record<"primary" | "secondary" | "danger", string> = {
  primary:
    "bg-gradient-primary text-primary-foreground border border-primary/40 hover:opacity-90",
  secondary:
    "bg-surface-0 text-text-1 border border-surface-3 hover:bg-surface-2",
  danger:
    "bg-surface-0 text-danger border border-surface-3 hover:bg-danger-bg hover:border-danger",
};

export function WorkspaceItemDetail({ ctx, onAction }: WorkspaceItemDetailProps) {
  return (
    <div className="px-5 py-4 bg-surface-1/40 border-t border-surface-3 space-y-4">
      {/* Lead summary */}
      {(ctx.lead || ctx.submitter) && (
        <div className="space-y-1">
          {ctx.lead && (
            <p className="text-table font-medium text-text-1">{ctx.lead}</p>
          )}
          {ctx.submitter && (
            <p className="text-caption text-text-3">{ctx.submitter}</p>
          )}
          {ctx.reason && (
            <p className="text-table-sm text-text-2">
              <span className="text-text-3">Lý do: </span>
              {ctx.reason}
            </p>
          )}
        </div>
      )}

      {/* Structured sections */}
      {ctx.sections.map((section, idx) => (
        <SectionBlock key={idx} section={section} />
      ))}

      {/* AI Suggestion banner */}
      {ctx.aiSuggestion && (
        <div className="rounded-card border border-info bg-info-bg/50 p-3 flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-info shrink-0 mt-0.5" />
          <div>
            <div className="text-caption uppercase tracking-wide text-info font-semibold mb-1">
              AI gợi ý
            </div>
            <p className="text-table-sm text-text-1">{ctx.aiSuggestion}</p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {ctx.actions.map((action, idx) => (
          <button
            key={idx}
            onClick={(e) => {
              e.stopPropagation();
              onAction(action.label);
            }}
            className={cn(
              "rounded-button px-3 py-1.5 text-table-sm font-medium transition-colors inline-flex items-center gap-1.5",
              variantBtnClass[action.variant]
            )}
          >
            {action.icon && <span aria-hidden>{action.icon}</span>}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionBlock({ section }: { section: ContextSection }) {
  return (
    <div className="rounded-card border border-surface-3 bg-surface-0 p-3 space-y-2">
      {section.heading && (
        <div className="text-caption uppercase tracking-wide text-text-3 font-semibold">
          {section.heading}
        </div>
      )}
      {section.paragraph && (
        <p className="text-table-sm text-text-1">{section.paragraph}</p>
      )}
      {section.rows && section.rows.length > 0 && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {section.rows.map((row, i) => (
            <div
              key={i}
              className="flex items-baseline justify-between gap-3 text-table-sm"
            >
              <span className="text-text-3 truncate">{row.label}</span>
              <span
                className={cn(
                  "font-medium tabular-nums text-right shrink-0",
                  row.tone ? toneTextClass[row.tone] : "text-text-1"
                )}
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}
      {section.bullets && section.bullets.length > 0 && (
        <ul className="space-y-1 text-table-sm text-text-1">
          {section.bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-text-3 shrink-0">•</span>
              <span className="flex-1">{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

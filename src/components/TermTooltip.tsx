import { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/components/i18n/I18nContext";
import { TERMS } from "@/components/i18n/terms";
import { cn } from "@/lib/utils";

interface TermTooltipProps {
  /** Term key from `terms.ts` (e.g. "HSTK", "SS", "LCNB"). */
  term: string;
  /** Optional inline children (text, badge…). When omitted a HelpCircle icon is rendered. */
  children?: ReactNode;
  /** Extra className for the trigger wrapper. */
  className?: string;
}

export function TermTooltip({ term, children, className }: TermTooltipProps) {
  const { locale } = useI18n();
  const entry = TERMS[term];

  if (!entry) {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[TermTooltip] Unknown term key: "${term}"`);
    }
    return <>{children ?? null}</>;
  }

  const label = locale === "en" ? entry.en : entry.vi;
  const tip = locale === "en" ? entry.tooltip_en : entry.tooltip_vi;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2",
              className,
            )}
            aria-label={label}
          >
            {children ?? (
              <HelpCircle
                size={12}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-hidden
              />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          sideOffset={6}
          className="max-w-[280px] bg-secondary text-secondary-foreground border border-border shadow-lg p-3 text-[12px] leading-relaxed"
        >
          <div className="font-semibold mb-1 text-foreground">{label}</div>
          <div className="text-muted-foreground">{tip}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

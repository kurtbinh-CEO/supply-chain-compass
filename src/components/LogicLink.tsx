import { HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LogicLinkProps {
  tab: "monthly" | "daily" | "forecast" | "ss";
  node?: number;
  tooltip?: string;
  className?: string;
}

/**
 * A small "?" icon that navigates to /logic with the correct tab & node pre-opened.
 * Usage: <LogicLink tab="ss" node={0} tooltip="Công thức SS" />
 */
export function LogicLink({ tab, node, tooltip, className }: LogicLinkProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const params = new URLSearchParams({ tab });
    if (node !== undefined) params.set("node", String(node));
    navigate(`/logic?${params.toString()}`);
  };

  const btn = (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center h-4.5 w-4.5 rounded-full text-text-3 hover:text-info hover:bg-info/10 transition-colors",
        className
      )}
      aria-label={tooltip || "Xem logic"}
    >
      <HelpCircle className="h-3.5 w-3.5" />
    </button>
  );

  if (!tooltip) return btn;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="top" className="text-[11px]">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

import { cn } from "@/lib/utils";

interface StatusChipProps {
  status: "success" | "warning" | "danger" | "info";
  label: string;
  className?: string;
}

const statusStyles = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
};

const dotStyles = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export function StatusChip({ status, label, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-table-sm font-medium",
        statusStyles[status],
        className
      )}
    >
      <span className={cn("h-[5px] w-[5px] rounded-full", dotStyles[status])} />
      {label}
    </span>
  );
}

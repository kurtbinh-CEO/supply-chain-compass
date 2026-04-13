import { cn } from "@/lib/utils";

export function CodeBlock({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <pre className={cn("bg-surface-1 border border-surface-3 rounded-lg px-3 py-2.5 text-[11px] font-mono text-text-2 whitespace-pre-wrap leading-relaxed overflow-x-auto", className)}>
      {children}
    </pre>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-caption text-text-2 leading-relaxed">{children}</p>;
}

export function Highlight({ children, color = "text-primary" }: { children: React.ReactNode; color?: string }) {
  return <span className={cn("font-semibold", color)}>{children}</span>;
}

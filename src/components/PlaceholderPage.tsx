import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";

interface PlaceholderPageProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PlaceholderPage({ title, subtitle, children }: PlaceholderPageProps) {
  return (
    <AppLayout>
      <ScreenHeader title={title} subtitle={subtitle} />
      {children || (
        <div className="rounded-card border border-surface-3 bg-surface-2 p-12 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-section-header font-display text-text-2">{title}</p>
            <p className="text-table text-text-3">Nội dung đang được phát triển</p>
          </div>
        </div>
      )}
      <ScreenFooter actionCount={12} />
    </AppLayout>
  );
}

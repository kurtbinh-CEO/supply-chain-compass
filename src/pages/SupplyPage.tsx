import { AppLayout } from "@/components/AppLayout";
import { ScreenHeader, ScreenFooter } from "@/components/ScreenShell";
import { NMSupplyView } from "@/components/supply/NMSupplyView";

export default function SupplyPage() {
  return (
    <AppLayout>
      <ScreenHeader title="NM Supply" subtitle="Tồn kho nhà máy — Nhập liệu & theo dõi" />
      <NMSupplyView />
      <ScreenFooter actionCount={6} />
    </AppLayout>
  );
}

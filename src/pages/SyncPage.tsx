import { ScreenShell } from "@/components/ScreenShell";
import PlaceholderPage from "@/components/PlaceholderPage";

export default function SyncPage() {
  return (
    <ScreenShell
      title="Đồng bộ dữ liệu"
      breadcrumbs={[{ label: "Vận hành ngày" }, { label: "Đồng bộ dữ liệu" }]}
    >
      <PlaceholderPage
        title="Đồng bộ dữ liệu (F2-B1)"
        description="Bravo + NM upload — màn hình sẽ được xây dựng ở P08."
      />
    </ScreenShell>
  );
}

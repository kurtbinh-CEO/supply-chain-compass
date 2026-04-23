import { ScreenShell } from "@/components/ScreenShell";
import PlaceholderPage from "@/components/PlaceholderPage";

export default function TransportPage() {
  return (
    <ScreenShell
      title="Đóng hàng & Vận tải"
      breadcrumbs={[{ label: "Vận hành ngày" }, { label: "Đóng hàng & Vận tải" }]}
    >
      <PlaceholderPage
        title="Đóng hàng & Vận tải (F2-B5)"
        description="Container + Hold/Ship — màn hình sẽ được xây dựng ở P09."
      />
    </ScreenShell>
  );
}

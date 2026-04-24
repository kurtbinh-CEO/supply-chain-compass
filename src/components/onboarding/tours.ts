import { OnboardingTour } from "./OnboardingContext";

/**
 * M23 — Tour catalog
 *
 * Định nghĩa các tour theo screen. Mỗi target phải có element với data-tour-id.
 * Tour ID dùng làm key persist trong localStorage.
 */

export const TOURS: Record<string, OnboardingTour> = {
  workspace: {
    id: "workspace-v1",
    name: "Workspace",
    route: "/workspace",
    steps: [
      {
        target: "workspace-pending",
        title: "Việc cần làm hôm nay",
        description: "Đây là danh sách ưu tiên các tác vụ chờ bạn xử lý — phê duyệt PO, điều chỉnh CN, xác nhận giao hàng…",
        placement: "bottom",
      },
      {
        target: "workspace-exceptions",
        title: "Cảnh báo ngoại lệ",
        description: "Các vấn đề cần can thiệp ngay: thiếu hàng, SLA quá hạn, NM từ chối. Click vào để mở chi tiết.",
        placement: "top",
      },
      {
        target: "workspace-quickstart",
        title: "Bắt đầu quy trình",
        description: "Khởi động Quy trình ngày hoặc Quy trình tháng từ đây để hệ thống dẫn dắt bạn qua từng bước.",
        placement: "left",
      },
    ],
  },

  drp: {
    id: "drp-v1",
    name: "DRP",
    route: "/drp",
    steps: [
      {
        target: "drp-summary",
        title: "Tóm tắt nhanh",
        description: "Các thẻ tóm tắt phía trên giúp bạn đọc nhanh tình hình: fill rate, CN thiếu hàng, m² gap, PO/TO chờ duyệt.",
        placement: "bottom",
      },
      {
        target: "drp-table",
        title: "Bảng kết quả phân bổ",
        description: "Xem chi tiết phân bổ cho từng CN-SKU. Click vào dòng để mở panel giải thích logic tính toán.",
        placement: "top",
      },
      {
        target: "drp-actions",
        title: "Phê duyệt & xuất PO",
        description: "Sau khi rà soát, dùng các nút phê duyệt để chuyển kết quả thành PO/TO chính thức.",
        placement: "left",
      },
    ],
  },

  orders: {
    id: "orders-v1",
    name: "Đơn hàng",
    route: "/orders",
    steps: [
      {
        target: "orders-summary",
        title: "Tình hình đơn hàng",
        description: "Theo dõi: PO đang chờ, hàng đang trên đường, đơn quá SLA (đỏ pulse), tỷ lệ hoàn tất.",
        placement: "bottom",
      },
      {
        target: "orders-tabs",
        title: "Quy trình 3 bước",
        description: "Duyệt PO → Vận chuyển → Theo dõi giao hàng. Mỗi tab tương ứng một giai đoạn lifecycle.",
        placement: "bottom",
      },
    ],
  },

  sop: {
    id: "sop-v1",
    name: "S&OP Consensus",
    route: "/sop",
    steps: [
      {
        target: "sop-summary",
        title: "Đồng thuận v3",
        description: "Theo dõi các phiên consensus: bao nhiêu CN đã đồng thuận, sai lệch so với AOP, vấn đề cần thảo luận.",
        placement: "bottom",
      },
      {
        target: "sop-versions",
        title: "Phiên bản v0 → v4",
        description: "So sánh các phiên bản dự báo qua các bước rà soát. Dùng nút So sánh để xem diff chi tiết.",
        placement: "right",
      },
    ],
  },

  executive: {
    id: "executive-v1",
    name: "Tổng quan lãnh đạo",
    route: "/executive",
    steps: [
      {
        target: "exec-kpis",
        title: "KPI cốt lõi",
        description: "FC accuracy, Net booking, On-time delivery, NM honoring rate — bốn chỉ số then chốt cập nhật theo tuần.",
        placement: "bottom",
      },
      {
        target: "exec-cards",
        title: "Cảnh báo cho leadership",
        description: "Những vấn đề lớn cần ra quyết định: revenue at risk, capacity gap, supplier issues.",
        placement: "top",
      },
    ],
  },
};

export function getTourForRoute(route: string): OnboardingTour | undefined {
  return Object.values(TOURS).find(t => t.route === route);
}

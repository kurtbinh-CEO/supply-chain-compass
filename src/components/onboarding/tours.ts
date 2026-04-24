import { OnboardingTour } from "./OnboardingContext";

/**
 * M23 — Tour catalog
 *
 * Định nghĩa các tour theo screen. Mỗi target trỏ tới element có
 * data-tour-id tương ứng. Nếu không tìm thấy, overlay sẽ tự fallback
 * hiển thị tooltip ở giữa màn hình với backdrop mờ — tour vẫn chạy.
 *
 * Quy ước: mỗi route trong sidebar phải có 1 entry tại đây để nút
 * "Hướng dẫn màn này" hiển thị. Tour thông tin (2-4 step ngắn) là đủ.
 */

export const TOURS: Record<string, OnboardingTour> = {
  /* ───────────────────── EXECUTIVE ───────────────────── */
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

  /* ───────────────────── WORKSPACE ───────────────────── */
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

  /* ───────────────────── MONITORING ───────────────────── */
  monitoring: {
    id: "monitoring-v1",
    name: "Theo dõi hệ thống",
    route: "/monitoring",
    steps: [
      {
        target: "monitoring-summary",
        title: "Tóm tắt sức khỏe hệ thống",
        description: "Cảnh báo mở, Safety Stock chờ duyệt, NM rủi ro cao và tiến độ BPO — nhìn 1 giây biết tình hình.",
        placement: "bottom",
      },
      {
        target: "monitoring-tabs",
        title: "3 nhóm theo dõi",
        description: "Sức khỏe vận hành · Tồn kho & SS · Sự kiện hệ thống. Mỗi tab trả lời 1 câu hỏi khác nhau.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── DEMAND REVIEW ───────────────────── */
  demand: {
    id: "demand-v1",
    name: "Rà soát nhu cầu",
    route: "/demand",
    steps: [
      {
        target: "demand-summary",
        title: "Tóm tắt rà soát tháng",
        description: "Tổng FC kỳ này, độ chính xác tháng trước, B2B đã nhập, CN còn chưa điều chỉnh.",
        placement: "bottom",
      },
      {
        target: "demand-tabs",
        title: "Demand tổng vs B2B nhập liệu",
        description: "Tab Demand tổng dùng pivot 3 cấp (CN→SKU→Variant). Tab B2B dùng để nhập deal lớn riêng lẻ.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── S&OP ───────────────────── */
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
      {
        target: "sop-tabs",
        title: "Đồng thuận → Cân đối & Khóa",
        description: "Tab 1 chốt số. Tab 2 cân đối với năng lực NM rồi khóa kỳ.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── HUB & COMMITMENT ───────────────────── */
  hub: {
    id: "hub-v1",
    name: "Hub & Cam kết NM",
    route: "/hub",
    steps: [
      {
        target: "hub-summary",
        title: "Tình hình cam kết",
        description: "Đã cam kết / Chờ phản hồi / Chưa gọi / Gap. Click thẻ Gap để mở kịch bản xử lý thiếu hàng.",
        placement: "bottom",
      },
      {
        target: "hub-tabs",
        title: "Đặt hàng NM ↔ Đối chiếu",
        description: "Tab đầu để gọi/nhắn NM xác nhận năng lực. Tab sau đối chiếu commit vs giao thực tế.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── GAP & SCENARIOS ───────────────────── */
  "gap-scenario": {
    id: "gap-scenario-v1",
    name: "Gap & Kịch bản",
    route: "/gap-scenario",
    steps: [
      {
        target: "gap-summary",
        title: "Tổng Gap & kịch bản",
        description: "Đo độ thiếu hụt và số kịch bản đề xuất xử lý. NM rủi ro hiện ngay trên thẻ.",
        placement: "bottom",
      },
      {
        target: "gap-table",
        title: "Bảng Gap chi tiết",
        description: "Mỗi dòng là 1 SKU-CN thiếu hàng. Dùng nút \"Tạo kịch bản\" để mô phỏng phương án bù đắp.",
        placement: "top",
      },
    ],
  },

  /* ───────────────────── INVENTORY (NM Supply) ───────────────────── */
  inventory: {
    id: "inventory-v1",
    name: "Tồn kho NM",
    route: "/inventory",
    steps: [
      {
        target: "inventory-summary",
        title: "Tóm tắt tồn kho",
        description: "Tổng tồn, ngày cover trung bình, NM dưới ngưỡng SS, batch upload mới nhất.",
        placement: "bottom",
      },
      {
        target: "inventory-upload",
        title: "Upload Excel/CSV",
        description: "Kéo file tồn cuối ngày vào đây. Hệ thống tự parse 2 lớp (NM → SKU) và áp vào DRP kế tiếp.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── DEMAND WEEKLY ───────────────────── */
  "demand-weekly": {
    id: "demand-weekly-v1",
    name: "Demand tuần",
    route: "/demand-weekly",
    steps: [
      {
        target: "demand-weekly-summary",
        title: "Điều chỉnh tuần CN",
        description: "Theo dõi: CN đã chỉnh, biến động so với phased FC, deal B2B mới phát sinh trong tuần.",
        placement: "bottom",
      },
      {
        target: "demand-weekly-table",
        title: "Bảng điều chỉnh",
        description: "CN nhập % điều chỉnh hoặc số tuyệt đối. Hệ thống tự tính impact lên DRP và highlight bất thường.",
        placement: "top",
      },
    ],
  },

  /* ───────────────────── DRP ───────────────────── */
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

  /* ───────────────────── ORDERS ───────────────────── */
  orders: {
    id: "orders-v2",
    name: "Đơn hàng",
    route: "/orders",
    steps: [
      {
        target: "orders-summary",
        title: "Tình hình đơn hàng",
        description: "4 thẻ: Cần xử lý / Vận chuyển / Trễ hạn / Hoàn tất. Click thẻ để xem phân rã trong popup.",
        placement: "bottom",
      },
      {
        target: "orders-pills",
        title: "Lọc nhanh nhiều lớp",
        description: "Pills gộp Trạng thái + Loại (PO/TO) + Trễ. Có thể chọn nhiều cùng lúc.",
        placement: "bottom",
      },
      {
        target: "orders-flow",
        title: "Tiến trình lifecycle",
        description: "Dòng tiến trình hiện đơn đang ở stage nào. Click 1 node để filter bảng theo stage đó.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── CN PORTAL ───────────────────── */
  "cn-portal": {
    id: "cn-portal-v1",
    name: "CN Portal",
    route: "/cn-portal",
    steps: [
      {
        target: "cn-portal-tabs",
        title: "4 tab cho CN Manager",
        description: "Điều chỉnh nhu cầu · Tồn kho · Chat · Lịch sử audit. Đây là cổng duy nhất CN cần dùng hằng ngày.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── MASTER DATA ───────────────────── */
  "master-data": {
    id: "master-data-v1",
    name: "Master Data",
    route: "/master-data",
    steps: [
      {
        target: "master-data-tabs",
        title: "Quản lý dữ liệu nền",
        description: "SKU, NM, CN, Lane, Calendar, Carrier… Mọi dropdown khắp hệ thống đều lấy từ đây.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── SYNC ───────────────────── */
  sync: {
    id: "sync-v1",
    name: "Đồng bộ dữ liệu",
    route: "/sync",
    steps: [
      {
        target: "sync-status",
        title: "Trạng thái đồng bộ",
        description: "Theo dõi job ETL với SAP/Odoo, lần chạy gần nhất, lỗi cần xử lý.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── REPORTS ───────────────────── */
  reports: {
    id: "reports-v1",
    name: "Báo cáo",
    route: "/reports",
    steps: [
      {
        target: "reports-list",
        title: "Báo cáo định kỳ",
        description: "Xuất Excel/PDF cho FC accuracy, OTD, NM honoring, capacity utilization theo tháng/tuần.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── CONFIG ───────────────────── */
  config: {
    id: "config-v1",
    name: "Cấu hình hệ thống",
    route: "/config",
    steps: [
      {
        target: "config-tabs",
        title: "Tham số kế hoạch",
        description: "SLA, ngưỡng SS, công thức consensus, RBAC, ngôn ngữ. Chỉ SC Manager truy cập được.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── LOGIC CENTER ───────────────────── */
  logic: {
    id: "logic-v1",
    name: "Logic Center",
    route: "/logic",
    steps: [
      {
        target: "logic-tabs",
        title: "Tài liệu công thức",
        description: "Kế hoạch tháng · Vận hành ngày · FC · DRP. Nơi tra cứu công thức và quy tắc tính toán.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── GUIDE ───────────────────── */
  guide: {
    id: "guide-v1",
    name: "Cẩm nang",
    route: "/guide",
    steps: [
      {
        target: "guide-content",
        title: "Cẩm nang sử dụng",
        description: "Hướng dẫn theo vai trò: SC Planner, CN Manager, Sales, Sourcing. Có video ngắn cho từng quy trình.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── SCENARIOS ───────────────────── */
  scenarios: {
    id: "scenarios-v1",
    name: "Kịch bản demo",
    route: "/scenarios",
    steps: [
      {
        target: "scenarios-list",
        title: "Mô phỏng tình huống",
        description: "Chạy thử các kịch bản: NM nghỉ Tết, CN tăng đột biến, đứt gãy lane vận chuyển… để training & QA.",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── COMPARE ───────────────────── */
  compare: {
    id: "compare-v1",
    name: "So sánh phiên bản",
    route: "/compare",
    steps: [
      {
        target: "compare-picker",
        title: "Chọn 2 phiên bản",
        description: "So sánh DRP/SOP/FC giữa 2 lần chạy bất kỳ. Diff theo CN-SKU và lý do thay đổi (Root cause).",
        placement: "bottom",
      },
    ],
  },

  /* ───────────────────── AUDIT ───────────────────── */
  audit: {
    id: "audit-v1",
    name: "Audit Trail",
    route: "/audit",
    steps: [
      {
        target: "audit-filters",
        title: "Lọc lịch sử thao tác",
        description: "Theo người dùng, module, loại hành động, khoảng thời gian. Mọi thay đổi quan trọng đều được ghi lại.",
        placement: "bottom",
      },
      {
        target: "audit-table",
        title: "Bảng nhật ký",
        description: "Mỗi dòng là 1 sự kiện: ai, làm gì, ở đâu, khi nào. Click để mở chi tiết payload before/after.",
        placement: "top",
      },
    ],
  },
};

export function getTourForRoute(route: string): OnboardingTour | undefined {
  return Object.values(TOURS).find(t => t.route === route);
}

export type Locale = "vi" | "en";

export const translations: Record<Locale, Record<string, string>> = {
  vi: {
    // TopBar
    "search.placeholder": "Tìm kiếm...",
    "role.planner": "SC Planner",

    // Sidebar groups
    "nav.overview": "Tổng quan",
    "nav.workplace": "Nơi làm việc",
    "nav.monitoring": "Giám sát",
    "nav.monthlyPlan": "Kế hoạch tháng",
    "nav.dailyOps": "Vận hành hàng ngày",
    "nav.partners": "Đối tác",
    "nav.config": "Cấu hình",
    "nav.support": "Hỗ trợ",
    "nav.executive": "Lãnh đạo",
    "nav.executiveItem": "Tổng quan lãnh đạo",

    // Sidebar items
    "nav.dashboard": "Tổng quan SCP",
    "nav.workspace": "Việc cần làm",
    "nav.monitoringItem": "Giám sát",
    "nav.demandReview": "Rà soát nhu cầu",
    "nav.sopConsensus": "Đồng thuận S&OP",
    "nav.hubCommitment": "Cam kết & Hub",
    "nav.gapScenario": "Khoảng cách & Kịch bản",
    "nav.nmSupply": "Tồn kho NM",
    "nav.inventory": "Tồn kho",
    "nav.demandWeekly": "Nhu cầu tuần",
    "nav.drpAllocation": "DRP",
    "nav.drpResult": "Kết quả DRP",
    "nav.allocation": "Phân bổ",
    "nav.orders": "Đơn hàng",
    "nav.sync": "Đồng bộ",
    "nav.cnPortal": "CN Portal",
    "nav.supplierPortal": "Cổng nhà máy",
    "nav.masterData": "Dữ liệu gốc",
    "nav.reports": "Báo cáo",
    "nav.configItem": "Tham số hệ thống",
    "nav.logicOps": "Logic vận hành",
    "nav.guide": "Hướng dẫn",
    "nav.scenarios": "Tình huống Demo",
    "nav.compare": "So sánh phiên bản",
    "nav.audit": "Audit Trail",

    // Sidebar footer
    "workflow.daily": "Quy trình ngày",
    "workflow.monthly": "Quy trình tháng",

    // Sidebar badge — hidden by role
    "badge.hidden.aria": "Số liệu bị ẩn theo phân quyền — di chuột để xem chi tiết",
    "badge.hidden.title": "Số liệu bị ẩn",
    "badge.hidden.metric": "Đo gì:",
    "badge.hidden.role": "Cần vai trò:",
    "badge.hidden.viewAt": "Xem ở:",
    "badge.hidden.currentRole": "Vai trò hiện tại:",
    "badge.hidden.contact": "Liên hệ quản trị nếu cần nâng quyền.",
    "badge.hidden.or": "hoặc",

    // Role labels
    "role.SC_MANAGER": "Quản lý Supply Chain",
    "role.CN_MANAGER": "Quản lý Chi nhánh",
    "role.SALES": "Sales",
    "role.VIEWER": "Người xem",

    // Badge metric descriptions
    "badge.metric.nm_cn_fresh": "Độ tươi nguồn dữ liệu NM/CN.",
    "badge.metric.cn_adjust": "Số CN đã gửi điều chỉnh tuần / tổng CN.",
    "badge.metric.exceptions": "Số shortage đang treo trong DRP.",
    "badge.metric.po_pending": "Số PO/lệnh phát hành đang chờ duyệt.",
    "badge.metric.demand_progress": "Tiến độ submit Demand tháng (CN đã chốt / tổng).",
    "badge.metric.sop_status": "Trạng thái phiên S&OP tháng (đã/cần chốt).",
    "badge.metric.hub_commitment": "NM đã confirm cam kết tuần / tổng NM.",
    "badge.metric.gap_pending": "Số kịch bản gap đang theo dõi.",
    "badge.metric.monitoring_alerts": "Số cảnh báo hệ thống chưa đọc.",
    "badge.metric.executive_risk": "Tổng rủi ro lãnh đạo (critical + thay đổi SS chờ duyệt).",
    "badge.metric.cn_portal_pending": "Số CN có yêu cầu pending trên Cổng CN.",

    // Badge "view at" suggestions
    "badge.viewAt.nm_cn_fresh": "Trang Tồn kho → tab Master.",
    "badge.viewAt.cn_adjust": "Trang Demand tuần.",
    "badge.viewAt.exceptions": "Trang DRP → bảng exceptions.",
    "badge.viewAt.po_pending": "Trang Đơn hàng → tab Duyệt PO.",
    "badge.viewAt.demand_progress": "Trang Rà soát Demand.",
    "badge.viewAt.sop_status": "Trang S&OP Consensus.",
    "badge.viewAt.hub_commitment": "Trang Hub & Cam kết.",
    "badge.viewAt.gap_pending": "Trang Khoảng cách & Kịch bản.",
    "badge.viewAt.monitoring_alerts": "Trang Giám sát.",
    "badge.viewAt.executive_risk": "Trang Điều hành.",
    "badge.viewAt.cn_portal_pending": "Cổng CN → tab Pending.",

    // Route breadcrumbs
    "route.workspace": "Workspace",
    "route.monitoring": "Monitoring",
    "route.demand": "Demand Review",
    "route.sop": "S&OP Consensus",
    "route.hub": "Hub & Commitment",
    "route.supply": "NM Supply Sync",
    "route.demandWeekly": "Demand Weekly",
    "route.drp": "DRP",
    "route.allocation": "Allocation",
    "route.orders": "Đơn hàng",
    "route.supplierPortal": "Supplier Portal",
    "route.masterData": "Master Data",
    "route.reports": "Reports",
    "route.config": "Config",
    "route.overview": "Tổng quan",

    // Workspace page
    "ws.title": "Workspace",
    "ws.needToDo": "Cần làm",
    "ws.all": "Tất cả",
    "ws.needApproval": "Cần duyệt",
    "ws.exceptions": "Exceptions",
    "ws.notifications": "Thông báo",
    "ws.approve": "Duyệt",
    "ws.reject": "Từ chối",
    "ws.rejectReason": "Lý do...",
    "ws.viewAll": "Xem tất cả",
    "ws.noItems": "✅ Không có việc cần làm. Hệ thống đang chạy tốt.",
    "ws.dailyOps": "Vận hành ngày",
    "ws.dailyOpsDesc": "NM Supply → Demand → DRP & Orders",
    "ws.monthlyPlan": "Kế hoạch tháng",
    "ws.monthlyPlanDesc": "Demand Review → S&OP → Hub",
    "ws.demand": "Demand",
    "ws.hstk": "HSTK",
    "ws.fcAccuracy": "FC Accuracy",
    "ws.vsLastMonth": "vs tháng trước",
    "ws.today": "hôm nay",
    "ws.vsLastWeek": "vs tuần trước",

    // Common actions
    "action.excel": "Excel",
    "action.pdf": "PDF",
    "action.viewAuditLog": "Xem audit log",
    "action.actions": "actions",
    "action.details": "Chi tiết",
    "action.exportCsv": "Export CSV",
    "action.remindNm": "Nhắc NM",
    "action.view": "Xem",
    "action.handle": "Xử lý",

    // Theme
    "theme.light": "Sáng",
    "theme.dark": "Tối",
    "theme.system": "Hệ thống",

    // Farmer mode
    "farmer.toggle": "Chế độ Farmer",
    "farmer.tooltip.on": "Tắt chế độ Farmer (cỡ chữ thường)",
    "farmer.tooltip.off": "Bật chế độ Farmer — chữ to, giãn cách rộng, dễ xem nhanh trên mobile",

    // Demand page
    "demand.title": "Demand Review",
    "demand.totalTab": "Demand tổng",
    "demand.b2bTab": "B2B nhập liệu",

    // SOP page
    "sop.title": "S&OP Consensus",
    "sop.consensusTab": "Consensus",
    "sop.balanceLockTab": "Cân đối & Lock",

    // Hub page
    "hub.title": "Hub & Commitment",
    "hub.nmOrderTab": "Đặt hàng NM",
    "hub.reconciliationTab": "Đối chiếu",

    // Monitoring
    "monitoring.title": "Monitoring",
    "monitoring.inventoryTab": "Tồn kho & SS",
    "monitoring.hstkTab": "HSTK",
    "monitoring.fcAccuracyTab": "FC Accuracy",

    // Supply
    "supply.title": "NM Supply Sync",

    // Demand Weekly
    "demandWeekly.title": "Demand Weekly",

    // DRP
    "drp.title": "DRP & Phân bổ",

    // Orders
    "orders.title": "Orders & Tracking",

    // Workflow bar
    "wf.dailyOps": "Vận hành ngày",
    "wf.monthlyPlan": "Kế hoạch tháng",
    "wf.completeStep": "Hoàn tất bước",
    "wf.completeSession": "Hoàn tất phiên",
    "wf.sessionComplete": "Phiên làm việc hoàn tất",
    "wf.allDone": "Tất cả đã xong",
    "wf.completeBefore": "Hoàn thành bước {n} trước",
    "wf.celebrationTitle": "🎉 Hoàn tất xuất sắc!",
    "wf.celebrationDesc": "Phiên làm việc hoàn thành trong {time}",

    // Workflow leave dialog
    "wf.leaveTitle": "Rời khỏi phiên làm việc?",
    "wf.leaveDesc": "Bạn đang ở bước",
    "wf.leaveOf": "của workflow",
    "wf.leaveRemaining": "bước chưa hoàn tất.",
    "wf.backToWorkflow": "Quay lại workflow",
    "wf.leave": "Rời đi",
    "wf.leaveNote": "Workflow sẽ vẫn hoạt động. Bạn có thể quay lại từ sidebar.",

    // Activity log
    "log.workflow": "Workflow",
    "log.data": "Dữ liệu",
    "log.approval": "Phê duyệt",
    "log.system": "Hệ thống",
    "log.all": "Tất cả",
    "log.totalEvents": "Tổng sự kiện",
    "log.search": "Tìm kiếm...",
    "log.noEvents": "Chưa có sự kiện nào",
    "log.events": "sự kiện",
    "log.justNow": "Vừa xong",
    "log.minutesAgo": "phút trước",
    "log.today": "Hôm nay",
    "log.activityLog": "Activity Log",
    "log.eventsOnPage": "sự kiện trên trang này",
    "log.viewAuditLog": "Xem audit log",
  },
  en: {
    // TopBar
    "search.placeholder": "Search...",
    "role.planner": "SC Planner",

    // Sidebar groups
    "nav.overview": "Overview",
    "nav.workplace": "Workplace",
    "nav.monitoring": "Monitoring",
    "nav.monthlyPlan": "Monthly Planning",
    "nav.dailyOps": "Daily Operations",
    "nav.partners": "Partners",
    "nav.config": "Configuration",
    "nav.support": "Support",
    "nav.executive": "Executive",
    "nav.executiveItem": "Executive Overview",

    // Sidebar items
    "nav.dashboard": "SCP Overview",
    "nav.workspace": "Workspace",
    "nav.monitoringItem": "Monitoring",
    "nav.demandReview": "Demand Review",
    "nav.sopConsensus": "S&OP Consensus",
    "nav.hubCommitment": "Hub & Commitment",
    "nav.gapScenario": "Gap & Scenario",
    "nav.nmSupply": "NM Supply",
    "nav.inventory": "Inventory",
    "nav.demandWeekly": "Weekly Demand",
    "nav.drpAllocation": "DRP",
    "nav.drpResult": "DRP Result",
    "nav.allocation": "Allocation",
    "nav.orders": "Orders",
    "nav.sync": "Data Sync",
    "nav.cnPortal": "CN Portal",
    "nav.supplierPortal": "Supplier Portal",
    "nav.masterData": "Master Data",
    "nav.reports": "Reports",
    "nav.configItem": "Config",
    "nav.logicOps": "Operations Logic",
    "nav.guide": "User Guide",
    "nav.scenarios": "Demo Scenarios",
    "nav.compare": "Version Compare",
    "nav.audit": "Audit Trail",

    // Sidebar footer
    "workflow.daily": "Daily Workflow",
    "workflow.monthly": "Monthly Workflow",

    // Sidebar badge — hidden by role
    "badge.hidden.aria": "Badge hidden by role permissions — hover for details",
    "badge.hidden.title": "Metric hidden",
    "badge.hidden.metric": "Measures:",
    "badge.hidden.role": "Required role:",
    "badge.hidden.viewAt": "View at:",
    "badge.hidden.currentRole": "Your current role:",
    "badge.hidden.contact": "Contact your admin to request elevated access.",
    "badge.hidden.or": "or",

    // Role labels
    "role.SC_MANAGER": "Supply Chain Manager",
    "role.CN_MANAGER": "Branch Manager",
    "role.SALES": "Sales",
    "role.VIEWER": "Viewer",

    // Badge metric descriptions
    "badge.metric.nm_cn_fresh": "Freshness of NM/CN data sources.",
    "badge.metric.cn_adjust": "Branches that submitted weekly adjustments / total branches.",
    "badge.metric.exceptions": "Open shortages pending in DRP.",
    "badge.metric.po_pending": "POs / release orders awaiting approval.",
    "badge.metric.demand_progress": "Monthly Demand submission progress (branches locked / total).",
    "badge.metric.sop_status": "Status of the monthly S&OP session (locked / pending).",
    "badge.metric.hub_commitment": "Factories that confirmed weekly commitment / total factories.",
    "badge.metric.gap_pending": "Gap scenarios under tracking.",
    "badge.metric.monitoring_alerts": "Unread system alerts.",
    "badge.metric.executive_risk": "Executive risk total (critical + pending SS changes).",
    "badge.metric.cn_portal_pending": "Branches with pending requests on the CN Portal.",

    // Badge "view at" suggestions
    "badge.viewAt.nm_cn_fresh": "Inventory page → Master tab.",
    "badge.viewAt.cn_adjust": "Weekly Demand page.",
    "badge.viewAt.exceptions": "DRP page → exceptions table.",
    "badge.viewAt.po_pending": "Orders page → PO Approval tab.",
    "badge.viewAt.demand_progress": "Demand Review page.",
    "badge.viewAt.sop_status": "S&OP Consensus page.",
    "badge.viewAt.hub_commitment": "Hub & Commitment page.",
    "badge.viewAt.gap_pending": "Gap & Scenario page.",
    "badge.viewAt.monitoring_alerts": "Monitoring page.",
    "badge.viewAt.executive_risk": "Executive page.",
    "badge.viewAt.cn_portal_pending": "CN Portal → Pending tab.",

    // Route breadcrumbs
    "route.workspace": "Workspace",
    "route.monitoring": "Monitoring",
    "route.demand": "Demand Review",
    "route.sop": "S&OP Consensus",
    "route.hub": "Hub & Commitment",
    "route.supply": "NM Supply Sync",
    "route.demandWeekly": "Demand Weekly",
    "route.drp": "DRP",
    "route.allocation": "Allocation",
    "route.orders": "Orders",
    "route.supplierPortal": "Supplier Portal",
    "route.masterData": "Master Data",
    "route.reports": "Reports",
    "route.config": "Config",
    "route.overview": "Overview",

    // Workspace page
    "ws.title": "Workspace",
    "ws.needToDo": "To Do",
    "ws.all": "All",
    "ws.needApproval": "Approvals",
    "ws.exceptions": "Exceptions",
    "ws.notifications": "Notifications",
    "ws.approve": "Approve",
    "ws.reject": "Reject",
    "ws.rejectReason": "Reason...",
    "ws.viewAll": "View all",
    "ws.noItems": "✅ Nothing to do. System running smoothly.",
    "ws.dailyOps": "Daily Operations",
    "ws.dailyOpsDesc": "NM Supply → Demand → DRP & Orders",
    "ws.monthlyPlan": "Monthly Planning",
    "ws.monthlyPlanDesc": "Demand Review → S&OP → Hub",
    "ws.demand": "Demand",
    "ws.hstk": "HSTK",
    "ws.fcAccuracy": "FC Accuracy",
    "ws.vsLastMonth": "vs last month",
    "ws.today": "today",
    "ws.vsLastWeek": "vs last week",

    // Common actions
    "action.excel": "Excel",
    "action.pdf": "PDF",
    "action.viewAuditLog": "View audit log",
    "action.actions": "actions",
    "action.details": "Details",
    "action.exportCsv": "Export CSV",
    "action.remindNm": "Remind NM",
    "action.view": "View",
    "action.handle": "Handle",

    // Theme
    "theme.light": "Light",
    "theme.dark": "Dark",
    "theme.system": "System",

    // Farmer mode
    "farmer.toggle": "Farmer mode",
    "farmer.tooltip.on": "Turn off Farmer mode (normal text size)",
    "farmer.tooltip.off": "Turn on Farmer mode — bigger text and spacing for quick scanning on mobile",

    // Demand page
    "demand.title": "Demand Review",
    "demand.totalTab": "Demand Total",
    "demand.b2bTab": "B2B Input",

    // SOP page
    "sop.title": "S&OP Consensus",
    "sop.consensusTab": "Consensus",
    "sop.balanceLockTab": "Balance & Lock",

    // Hub page
    "hub.title": "Hub & Commitment",
    "hub.nmOrderTab": "NM Orders",
    "hub.reconciliationTab": "Reconciliation",

    // Monitoring
    "monitoring.title": "Monitoring",
    "monitoring.inventoryTab": "Inventory & SS",
    "monitoring.hstkTab": "HSTK",
    "monitoring.fcAccuracyTab": "FC Accuracy",

    // Supply
    "supply.title": "NM Supply Sync",

    // Demand Weekly
    "demandWeekly.title": "Demand Weekly",

    // DRP
    "drp.title": "DRP & Allocation",

    // Orders
    "orders.title": "Orders & Tracking",

    // Pivot toggle
    "pivot.cnFirst": "CN-first",
    "pivot.skuFirst": "SKU-first",

    // Workflow bar
    "wf.dailyOps": "Daily Operations",
    "wf.monthlyPlan": "Monthly Planning",
    "wf.completeStep": "Complete step",
    "wf.completeSession": "Complete session",
    "wf.sessionComplete": "Session complete",
    "wf.allDone": "All steps done",
    "wf.completeBefore": "Complete step {n} first",
    "wf.celebrationTitle": "🎉 Well done!",
    "wf.celebrationDesc": "Session completed in {time}",

    // Workflow leave dialog
    "wf.leaveTitle": "Leave work session?",
    "wf.leaveDesc": "You are at step",
    "wf.leaveOf": "of workflow",
    "wf.leaveRemaining": "steps remaining.",
    "wf.backToWorkflow": "Back to workflow",
    "wf.leave": "Leave",
    "wf.leaveNote": "Workflow will remain active. You can return from the sidebar.",

    // Activity log
    "log.workflow": "Workflow",
    "log.data": "Data",
    "log.approval": "Approval",
    "log.system": "System",
    "log.all": "All",
    "log.totalEvents": "Total events",
    "log.search": "Search...",
    "log.noEvents": "No events yet",
    "log.events": "events",
    "log.justNow": "Just now",
    "log.minutesAgo": "min ago",
    "log.today": "Today",
    "log.activityLog": "Activity Log",
    "log.eventsOnPage": "events on this page",
    "log.viewAuditLog": "View audit log",
  },
};

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

    // Sidebar footer
    "workflow.daily": "Quy trình ngày",
    "workflow.monthly": "Quy trình tháng",

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

    // Sidebar footer
    "workflow.daily": "Daily Workflow",
    "workflow.monthly": "Monthly Workflow",

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

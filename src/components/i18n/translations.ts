export type Locale = "vi" | "en";

export const translations: Record<Locale, Record<string, string>> = {
  vi: {
    // TopBar
    "search.placeholder": "Tìm kiếm...",
    "role.planner": "SC Planner",

    // Sidebar groups
    "nav.workplace": "Nơi làm việc",
    "nav.monitoring": "Giám sát",
    "nav.monthlyPlan": "Kế hoạch tháng",
    "nav.dailyOps": "Vận hành ngày",
    "nav.partners": "Đối tác",
    "nav.config": "Cấu hình",
    "nav.support": "Hỗ trợ",

    // Sidebar items
    "nav.workspace": "Workspace",
    "nav.monitoringItem": "Monitoring",
    "nav.demandReview": "Demand Review",
    "nav.sopConsensus": "S&OP Consensus",
    "nav.hubCommitment": "Hub & Commitment",
    "nav.nmSupply": "NM Supply",
    "nav.demandWeekly": "Demand tuần",
    "nav.drpAllocation": "DRP & Phân bổ",
    "nav.orders": "Orders",
    "nav.cnPortal": "CN Portal",
    "nav.supplierPortal": "Supplier Portal",
    "nav.masterData": "Master Data",
    "nav.reports": "Reports",
    "nav.configItem": "Config",
    "nav.logicOps": "Logic vận hành",

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
    "route.orders": "Orders & Tracking",
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

    // Pivot toggle
    "pivot.cnFirst": "CN-first",
    "pivot.skuFirst": "SKU-first",
  },
  en: {
    // TopBar
    "search.placeholder": "Search...",
    "role.planner": "SC Planner",

    // Sidebar groups
    "nav.workplace": "Workplace",
    "nav.monitoring": "Monitoring",
    "nav.monthlyPlan": "Monthly Planning",
    "nav.dailyOps": "Daily Operations",
    "nav.partners": "Partners",
    "nav.config": "Configuration",
    "nav.support": "Support",

    // Sidebar items
    "nav.workspace": "Workspace",
    "nav.monitoringItem": "Monitoring",
    "nav.demandReview": "Demand Review",
    "nav.sopConsensus": "S&OP Consensus",
    "nav.hubCommitment": "Hub & Commitment",
    "nav.nmSupply": "NM Supply",
    "nav.demandWeekly": "Weekly Demand",
    "nav.drpAllocation": "DRP & Allocation",
    "nav.orders": "Orders",
    "nav.cnPortal": "CN Portal",
    "nav.supplierPortal": "Supplier Portal",
    "nav.masterData": "Master Data",
    "nav.reports": "Reports",
    "nav.configItem": "Config",
    "nav.logicOps": "Operations Logic",

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
    "route.orders": "Orders & Tracking",
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
  },
};

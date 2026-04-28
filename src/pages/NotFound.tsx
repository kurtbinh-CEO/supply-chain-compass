import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowRight, Home, LayoutDashboard, Package, Activity, TrendingUp } from "lucide-react";

const QUICK_LINKS = [
  { to: "/workspace", label: "Workspace", icon: LayoutDashboard, desc: "Việc cần xử lý hôm nay" },
  { to: "/drp",       label: "DRP",       icon: Package,         desc: "Phân bổ & đóng container" },
  { to: "/orders",    label: "Đơn hàng",  icon: Activity,        desc: "PO/TO lifecycle" },
  { to: "/monitoring",label: "Giám sát",  icon: TrendingUp,      desc: "5 KPI hero + 7 tab" },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.warn("404 — route không tồn tại:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-warning-bg mb-4">
            <span className="text-4xl">🧭</span>
          </div>
          <h1 className="text-3xl font-bold text-text-1 mb-2">Không tìm thấy trang</h1>
          <p className="text-text-2 mb-1">
            Đường dẫn <code className="px-1.5 py-0.5 rounded bg-surface-2 font-mono text-table-sm text-warning">{location.pathname}</code> không tồn tại trong Smartlog SCP/DRP.
          </p>
          <p className="text-caption text-text-3">Có thể trang đã được gộp vào module khác — chọn một mục bên dưới để tiếp tục.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {QUICK_LINKS.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.to}
                to={q.to}
                className="group flex items-center gap-3 rounded-card border border-surface-3 bg-surface-1 hover:bg-surface-2 hover:border-primary/40 px-4 py-3 transition-colors"
              >
                <div className="h-10 w-10 rounded-button bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text-1 group-hover:text-primary transition-colors">{q.label}</div>
                  <div className="text-caption text-text-3 truncate">{q.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-text-3 group-hover:text-primary transition-colors" />
              </Link>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-button bg-gradient-primary text-primary-foreground px-5 py-2.5 text-table font-semibold shadow-sm hover:opacity-90 transition-opacity"
          >
            <Home className="h-4 w-4" /> Về trang chủ
          </Link>
          <Link
            to="/guide"
            className="inline-flex items-center gap-2 rounded-button border border-surface-3 bg-surface-1 text-text-2 hover:text-text-1 px-5 py-2.5 text-table font-medium hover:bg-surface-2 transition-colors"
          >
            Xem hướng dẫn
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

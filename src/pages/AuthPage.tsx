import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/components/AuthContext";
import { Eye, EyeOff, LogIn, UserPlus, ArrowRight } from "lucide-react";
import smartlogIcon from "@/assets/smartlog-icon.png";

export default function AuthPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  if (session) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Đăng nhập thành công!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Đăng ký thành công! Kiểm tra email để xác nhận.");
      }
    } catch (err: any) {
      toast.error(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[480px] bg-gradient-primary flex-col justify-between p-10 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <img src={smartlogIcon} alt="Smartlog" className="h-10 w-10 rounded-xl" />
            <div>
              <div className="font-display text-lg font-bold tracking-tight">Supply Chain</div>
              <div className="font-display text-[10px] font-semibold tracking-[0.2em] uppercase opacity-70">Planning Intelligence</div>
            </div>
          </div>
          <h1 className="font-display text-[32px] font-bold leading-tight mb-4">
            Tối ưu chuỗi cung ứng<br />bằng dữ liệu thời gian thực
          </h1>
          <p className="text-base opacity-80 leading-relaxed max-w-sm">
            Demand Planning · DRP · Allocation · Orders — tất cả trong một nền tảng duy nhất.
          </p>
        </div>
        <div className="space-y-3 text-sm opacity-60">
          <div className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5" /> Exception-first workflow</div>
          <div className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5" /> Multi-tenant & RBAC</div>
          <div className="flex items-center gap-2"><ArrowRight className="h-3.5 w-3.5" /> Real-time collaboration</div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <img src={smartlogIcon} alt="Smartlog" className="h-9 w-9 rounded-lg" />
            <div>
              <span className="font-display text-sm font-bold text-text-1">Supply Chain</span>
              <span className="font-display text-[9px] font-semibold text-primary tracking-[0.15em] uppercase block">Planning Intelligence</span>
            </div>
          </div>

          <h2 className="font-display text-screen-title text-text-1 mb-1">
            {isLogin ? "Đăng nhập" : "Tạo tài khoản"}
          </h2>
          <p className="text-body text-text-2 mb-8">
            {isLogin ? "Nhập thông tin để truy cập hệ thống SCP" : "Đăng ký để bắt đầu sử dụng"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-table-sm font-medium text-text-2 mb-1.5">Họ tên</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  required
                  className="w-full rounded-button border border-surface-3 bg-surface-1 px-4 py-2.5 text-body text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-table-sm font-medium text-text-2 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@company.com"
                required
                className="w-full rounded-button border border-surface-3 bg-surface-1 px-4 py-2.5 text-body text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="block text-table-sm font-medium text-text-2 mb-1.5">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-button border border-surface-3 bg-surface-1 px-4 py-2.5 pr-10 text-body text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-1 transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-button bg-gradient-primary text-white font-semibold py-2.5 text-body hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isLogin ? (
                <><LogIn className="h-4 w-4" /> Đăng nhập</>
              ) : (
                <><UserPlus className="h-4 w-4" /> Đăng ký</>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-table-sm text-text-3">
            {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? "Đăng ký" : "Đăng nhập"}
            </button>
          </p>

          {/* DEV: Quick role login */}
          <div className="mt-8 border-t border-surface-3 pt-6">
            <p className="text-table-sm text-text-3 text-center mb-3">⚡ Dev Quick Login</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { role: "admin", label: "Admin", color: "bg-red-500" },
                { role: "sc_manager", label: "SC Manager", color: "bg-blue-500" },
                { role: "cn_manager", label: "CN Manager", color: "bg-green-500" },
                { role: "viewer", label: "Viewer", color: "bg-gray-500" },
              ] as const).map(({ role, label, color }) => (
                <button
                  key={role}
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    const testEmail = `test-${role}@smartlog.dev`;
                    const testPw = "Test1234!";
                    try {
                      // Try sign in first
                      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: testEmail, password: testPw });
                      if (signInErr) {
                        // Account doesn't exist, create it
                        const { error: signUpErr } = await supabase.auth.signUp({
                          email: testEmail,
                          password: testPw,
                          options: { data: { full_name: `Test ${label}` } },
                        });
                        if (signUpErr) throw signUpErr;
                        // Now sign in
                        const { error: err2 } = await supabase.auth.signInWithPassword({ email: testEmail, password: testPw });
                        if (err2) throw err2;
                      }
                      toast.success(`Đăng nhập ${label}`);
                      navigate("/");
                    } catch (err: any) {
                      toast.error(err.message);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className={`${color} text-white rounded-button py-2 text-table-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

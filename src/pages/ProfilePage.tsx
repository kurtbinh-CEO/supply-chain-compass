import { useState, useRef } from "react";
import { useAuth } from "@/components/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Camera, Save, ArrowLeft, Shield, Mail, Clock } from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: "Quản trị viên", color: "bg-danger-bg text-danger-text" },
  sc_manager: { label: "SC Manager", color: "bg-info-bg text-info-text" },
  cn_manager: { label: "CN Manager", color: "bg-warning-bg text-warning-text" },
  sales: { label: "Sales", color: "bg-success-bg text-success-text" },
  viewer: { label: "Viewer", color: "bg-surface-3 text-text-2" },
};

export default function ProfilePage() {
  const { user, profile, roles } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const initials = (displayName || user?.email || "U").slice(0, 2).toUpperCase();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ảnh tối đa 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Chỉ chấp nhận file ảnh");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(url);

      await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("user_id", user.id);

      toast.success("Cập nhật ảnh đại diện thành công!");
    } catch (err: any) {
      toast.error(err.message || "Lỗi upload ảnh");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast.error("Tên không được để trống");
      return;
    }
    if (trimmed.length > 100) {
      toast.error("Tên tối đa 100 ký tự");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: trimmed })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Cập nhật thông tin thành công!");
    } catch (err: any) {
      toast.error(err.message || "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-table-sm text-text-3 hover:text-text-1 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>

        <h1 className="font-display text-screen-title text-text-1 mb-8">Hồ sơ cá nhân</h1>

        {/* Avatar section */}
        <div className="bg-surface-1 rounded-card border border-surface-3 p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-20 w-20 rounded-2xl object-cover border-2 border-surface-3"
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-xl font-bold text-white">
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                {uploading ? (
                  <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold text-text-1">
                {profile?.display_name || "User"}
              </h2>
              <p className="text-table-sm text-text-3 mt-0.5">{user?.email}</p>
              <p className="text-caption text-text-3 mt-1">Click vào ảnh để thay đổi (tối đa 2MB)</p>
            </div>
          </div>
        </div>

        {/* Info form */}
        <div className="bg-surface-1 rounded-card border border-surface-3 p-6 mb-6">
          <h3 className="text-body font-semibold text-text-1 mb-4">Thông tin cơ bản</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-table-sm font-medium text-text-2 mb-1.5">Họ tên</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={100}
                className="w-full rounded-button border border-surface-3 bg-surface-0 px-4 py-2.5 text-body text-text-1 placeholder:text-text-3 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              />
            </div>

            <div>
              <label className="flex items-center gap-1.5 text-table-sm font-medium text-text-2 mb-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </label>
              <div className="w-full rounded-button border border-surface-3 bg-surface-3/30 px-4 py-2.5 text-body text-text-3 cursor-not-allowed">
                {user?.email}
              </div>
              <p className="text-caption text-text-3 mt-1">Email không thể thay đổi</p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-button bg-gradient-primary text-white font-semibold px-5 py-2.5 text-body hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Lưu thay đổi
            </button>
          </div>
        </div>

        {/* Roles section */}
        <div className="bg-surface-1 rounded-card border border-surface-3 p-6 mb-6">
          <h3 className="flex items-center gap-1.5 text-body font-semibold text-text-1 mb-4">
            <Shield className="h-4 w-4 text-primary" /> Vai trò hệ thống
          </h3>
          <div className="flex flex-wrap gap-2">
            {roles.length > 0 ? (
              roles.map((role) => {
                const cfg = ROLE_LABELS[role] || { label: role, color: "bg-surface-3 text-text-2" };
                return (
                  <span key={role} className={`px-3 py-1.5 rounded-full text-table-sm font-medium ${cfg.color}`}>
                    {cfg.label}
                  </span>
                );
              })
            ) : (
              <span className="text-table-sm text-text-3">Chưa được gán vai trò</span>
            )}
          </div>
          <p className="text-caption text-text-3 mt-3">
            Vai trò được quản lý bởi admin hệ thống. Liên hệ quản trị viên nếu cần thay đổi.
          </p>
        </div>

        {/* Account info */}
        <div className="bg-surface-1 rounded-card border border-surface-3 p-6">
          <h3 className="flex items-center gap-1.5 text-body font-semibold text-text-1 mb-4">
            <Clock className="h-4 w-4 text-text-3" /> Thông tin tài khoản
          </h3>
          <div className="grid grid-cols-2 gap-4 text-table-sm">
            <div>
              <span className="text-text-3">Ngày tạo</span>
              <p className="text-text-1 font-medium mt-0.5">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : "—"}
              </p>
            </div>
            <div>
              <span className="text-text-3">Đăng nhập lần cuối</span>
              <p className="text-text-1 font-medium mt-0.5">
                {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("vi-VN") : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

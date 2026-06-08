import { useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { PageShell } from "./PageShell";
import { changePassword } from "../lib/api";

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary text-sm transition-all";

export function ChangePasswordPage({ onBack }: { onBack: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setSuccess(null);

    // Kiểm tra phía client trước khi gọi server để báo lỗi nhanh.
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ 3 ô");
      return;
    }
    if (newPassword.length < 8) {
      setError("Mật khẩu mới tối thiểu 8 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setSuccess("Đã đổi mật khẩu thành công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đổi được mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Đổi mật khẩu" tag="đổi_mật_khẩu" onBack={onBack}>
      <div className="max-w-md">
        {success && (
          <div className="mb-5 flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-4 py-3">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{success}</span>
          </div>
        )}
        {error && (
          <div className="mb-5 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-4 py-3">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Mật khẩu hiện tại</label>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Mật khẩu mới</label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              placeholder="Tối thiểu 8 ký tự"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Nhập lại mật khẩu mới</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && submit()}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <button
            onClick={submit}
            disabled={loading}
            className="w-full px-5 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

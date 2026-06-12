import { useState } from "react";
import { toast } from "sonner";
import { PageShell } from "./PageShell";
import { changePassword } from "../lib/api";

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-primary text-sm transition-all";

export function ChangePasswordPage({ onBack }: { onBack: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Vui lòng nhập đầy đủ 3 ô");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Mật khẩu mới tối thiểu 8 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu nhập lại không khớp");
      return;
    }

    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      toast.success("Đã đổi mật khẩu thành công");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không đổi được mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell title="Đổi mật khẩu" tag="đổi_mật_khẩu" onBack={onBack}>
      <div className="max-w-md">
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

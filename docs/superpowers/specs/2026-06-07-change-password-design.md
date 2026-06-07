# Spec: Đổi mật khẩu trong giao diện

**Ngày:** 2026-06-07
**Trạng thái:** Đã duyệt thiết kế, chờ implement

## Mục tiêu

Cho phép người dùng **đã đăng nhập** tự đổi mật khẩu của mình ngay trong app, không phải sửa tay trong database. (Hiện app chưa có chức năng này — mật khẩu chỉ đặt được lúc đăng ký.)

**Ngoài phạm vi (YAGNI):** chức năng "Quên mật khẩu" (reset qua email) — phức tạp hơn nhiều, để một spec riêng sau.

## Trải nghiệm người dùng

1. Người dùng mở menu (icon ô vuông ở header) → thấy mục mới **🔑 Đổi mật khẩu**.
2. Chọn → mở một **trang panel** riêng (giống Thống kê / Xếp hạng), có nút **Quay lại**.
3. Trang có 3 ô nhập:
   - Mật khẩu hiện tại
   - Mật khẩu mới
   - Nhập lại mật khẩu mới
4. Bấm **Lưu**:
   - Thành công → **ở lại trang**, hiện banner xanh "Đã đổi mật khẩu thành công", xóa trắng 3 ô. Giữ nguyên phiên đăng nhập (token cũ vẫn dùng được).
   - Thất bại → hiện banner đỏ với thông báo lỗi lấy từ server.

## Backend (`server/`)

### Endpoint

`POST /api/auth/change-password` — bảo vệ bằng middleware `requireAuth` (đã có sẵn).

**Request body:** `{ currentPassword: string, newPassword: string }`

**Luồng xử lý** (trong `routes/auth.ts`):
1. Validate body bằng `changePasswordSchema` (zod). Lỗi → `400` với thông điệp đầu tiên.
2. Lấy user theo `req.userId` (do `requireAuth` gán). Không thấy → `401`.
3. Kiểm tra `currentPassword` khớp hash hiện tại bằng `verifyPassword`. Sai → `401 { error: "Mật khẩu hiện tại không đúng" }`.
4. Băm `newPassword` bằng `hashPassword` (bcryptjs cost 10) → cập nhật `prisma.user.update`.
5. Trả `200 { ok: true }`.

### Validation (`validation/auth.ts`)

```ts
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự"),
});
```

Ràng buộc "mật khẩu mới phải khác mật khẩu cũ" kiểm tra trong route (sau khi đã xác minh mật khẩu cũ): nếu `newPassword === currentPassword` → `400 { error: "Mật khẩu mới phải khác mật khẩu hiện tại" }`.

### Tests (`tests/auth.routes.test.ts`)

Thêm các ca:
- Đổi mật khẩu thành công (2xx) → sau đó **đăng nhập bằng mật khẩu mới thành công** và **mật khẩu cũ thất bại**.
- Sai `currentPassword` → 401.
- `newPassword` < 8 ký tự → 400.
- `newPassword` trùng `currentPassword` → 400.
- Không gửi token (chưa đăng nhập) → 401.

## Frontend (`src/`)

### `app/lib/api.ts`

Thêm hàm:
```ts
export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiFetch("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
```
(`apiFetch` đã tự gắn `Authorization: Bearer <token>` và tự ném `Error(data.error)` khi không OK.)

### `app/components/AppMenu.tsx`

- Mở rộng `PanelKey` thêm `"password"`.
- Thêm vào `ITEMS`: `{ key: "password", label: "Đổi mật khẩu", desc: "Cập nhật mật khẩu đăng nhập", icon: KeyRound }` (icon `KeyRound` từ `lucide-react`).

### `app/components/ChangePasswordPage.tsx` (mới)

Component panel nhận `{ onBack }`, theo đúng phong cách `StatsPage` (header có nút Quay lại). State nội bộ: `currentPassword`, `newPassword`, `confirmPassword`, `error`, `success`, `loading`.

Khi submit:
1. Client check: 3 ô không trống; `newPassword.length >= 8`; `newPassword === confirmPassword` (không khớp → đặt `error = "Mật khẩu nhập lại không khớp"`).
2. `setLoading(true)`, gọi `changePassword({ currentPassword, newPassword })`.
3. Thành công → `setSuccess("Đã đổi mật khẩu thành công")`, xóa trắng 3 ô, `setError(null)`.
4. Lỗi → `setError(err.message)`, `setSuccess(null)`.
5. `finally { setLoading(false) }`.

### `app/components/Dashboard.tsx`

Trong khối `if (activePanel)`, thêm:
```tsx
if (activePanel === "password") return <ChangePasswordPage onBack={back} />;
```

## Tiêu chí hoàn thành

- [ ] Backend: endpoint + schema + 5 ca test mới đều pass; toàn bộ test cũ vẫn pass.
- [ ] Frontend: build (`vite build`) không lỗi TypeScript.
- [ ] Kiểm thử end-to-end trên bản thật: đổi mật khẩu → đăng xuất → đăng nhập bằng mật khẩu mới thành công, mật khẩu cũ thất bại.
- [ ] Push lên GitHub → Render + Vercel tự deploy.

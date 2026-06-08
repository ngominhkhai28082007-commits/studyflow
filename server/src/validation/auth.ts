import { z } from "zod";

// .toLowerCase() chuẩn hóa email về chữ thường để việc tra cứu không phân biệt
// HOA/thường (PostgreSQL phân biệt). Nhờ vậy đăng ký "Khai@X.com" rồi đăng nhập
// "khai@x.com" vẫn khớp.
export const registerSchema = z.object({
  name: z.string().trim().min(1, "Tên không được để trống"),
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự"),
});

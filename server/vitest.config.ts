import { defineConfig } from "vitest/config";
import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

export default defineConfig({
  test: {
    environment: "node",
    // Các test route dùng chung một database test (Neon). Chạy song song
    // sẽ khiến file này xoá/đăng ký dữ liệu của file kia (P2002/P2003).
    // Tắt chạy song song để các file test chạy tuần tự, cô lập lẫn nhau.
    fileParallelism: false,
  },
});

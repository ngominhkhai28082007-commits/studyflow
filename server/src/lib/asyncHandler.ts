import { RequestHandler } from "express";

// Bọc một route handler async. Express 4 KHÔNG tự bắt lỗi từ Promise bị reject
// trong handler async -> request sẽ treo, không có phản hồi. Helper này bắt lỗi
// và chuyển sang error-handling middleware (qua next) để trả về 500 đàng hoàng.
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

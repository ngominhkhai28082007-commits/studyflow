import { z } from "zod";

export const createTaskSchema = z.object({
  name: z.string().trim().min(1, "Tên công việc không được để trống"),
});

export const createSessionSchema = z.object({
  taskId: z.string().min(1, "Thiếu taskId"),
  seconds: z.number().int("seconds phải là số nguyên").min(1, "seconds tối thiểu 1").max(86400, "seconds tối đa 86400"),
});

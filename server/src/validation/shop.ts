import { z } from "zod";

export const mascotIdSchema = z.object({
  mascotId: z.string().min(1, "Thiếu mã linh vật"),
});

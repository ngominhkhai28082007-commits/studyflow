# Linh vật CÚN gốc cho StudyFlow

Bộ nhân vật **gốc 100%** (tự vẽ bằng SVG vector) — dùng thoải mái, **không lo bản quyền**.
5 trạng thái khớp 5 level giờ học của app (`DogAvatar` level 0–4).

| File | Level | Trạng thái |
|---|---|---|
| `dog_0_newbie.svg`       | 0 | Newbie — hớn hở, ✨ |
| `dog_1_beginner.svg`     | 1 | Beginner — đọc sách bình yên |
| `dog_2_intermediate.svg` | 2 | Intermediate — quyết tâm, bốc khói |
| `dog_3_expert.svg`       | 3 | Expert — bốc lửa |
| `dog_4_master.svg`       | 4 | Master — cháy hết mình |

- **SVG**: bản gốc vector — nét ở mọi kích thước, dùng trực tiếp trên web.
- **png/**: PNG **trong suốt** 512×512 (`dog_N.png`) và 1024×1024 (`dog_N_1024.png`).
- `_preview.png`: xem nhanh 5 trạng thái trên nền sáng + nền đen.

## Tạo lại / chỉnh sửa

```bash
python tools/make_mascot.py
```

Sửa màu/biểu cảm trong [tools/make_mascot.py](../make_mascot.py) (bảng màu pastel ở đầu
file, biểu cảm trong hàm `face()`, hiệu ứng lửa/khói/✨ trong `flames()/steam()/sparkles()`).
PNG xuất qua `cairosvg` (`pip install cairosvg`).

# Sticker Extractor

Tự động nhận diện, cắt từng sticker, xóa nền (trong suốt) và **làm nét bằng AI**
từ ảnh chụp màn hình lưới sticker kiểu Studicon.

Pipeline: tách nền (ngưỡng độ sáng) → tìm & lọc sticker → khử nhiễu JPEG →
**siêu phân giải 4x bằng Real-ESRGAN anime (ONNX, chạy CPU)** → defringe viền →
unsharp nhẹ → chuẩn hóa khung vuông trong suốt (mặc định 1024×1024).

## Cài đặt (một lần)

```bash
python -m pip install opencv-python-headless numpy pillow onnxruntime
```

Lần chạy đầu ở chế độ AI sẽ **tự tải model** (~5MB) về `tools/models/`,
sau đó chạy offline. Cần mạng cho lần đầu.

## Dùng

```bash
python tools/sticker_extractor.py src/imports/<ten_anh>.jpg -o tools/stickers_out
```

Nhiều ảnh cùng lúc:

```bash
python tools/sticker_extractor.py src/imports/a.jpg src/imports/b.png -o tools/stickers_out
```

## Kết quả trong thư mục `-o`

- `<ten_anh>_01.png … _NN.png` — từng sticker, nền trong suốt, AI 4x, khung 1024×1024.
- `overlay_<ten_anh>.png` — ảnh debug: khung **xanh** = giữ (có đánh số theo thứ tự đọc),
  khung **đỏ** = bị loại. Xem ảnh này để bỏ các crop rác (vd mockup điện thoại).

## Chế độ "crop nền đen" (`--crop-black`) — cho web theme đen

Nếu web của bạn để nền **`#000000` thuần**, đây là cách **đơn giản & giữ chất lượng
nhất**: chỉ crop sticker ở kích thước gốc rồi đặt trên nền đen — không xóa nền, không
AI, không upscale, **không mất pixel nào**.

```bash
python tools/sticker_extractor.py src/imports/cho.jpg src/imports/tho.jpg \
    -o tools/stickers_black --crop-black --names cho tho
```

- **Mỗi ảnh đầu vào = 1 pack → 1 thư mục riêng**, bên trong là sticker lẻ `01.png…10.png`:
  ```
  tools/stickers_black/cho/  01.png … 10.png  (+ _overlay.png)
  tools/stickers_black/tho/  01.png … 10.png  (+ _overlay.png)
  ```
  Tên thư mục lấy từ `--names` (theo thứ tự ảnh); không có thì lấy tên file. Dùng `--flat`
  nếu muốn đổ chung 1 thư mục như cũ.
- Mỗi sticker crop sát (chỉ chứa nó) rồi dán **canh giữa** vào **khung vuông đen `#000000`
  tạo mới** ⇒ tất cả cùng kích thước, **không bao giờ dính sticker bên cạnh**.
- Xuất **PNG đặc (RGB, không alpha)**.
- Kích thước vuông tự động theo sticker lớn nhất; đặt cố định bằng `--square-size N`.

**Bắt buộc:** vùng đặt sticker trên web phải là `#000000` thuần (cả thẻ/nút chứa nó),
không dùng `#0a0a0a`/`#111` — nếu không sẽ lộ ô vuông đen. Ảnh giữ **kích thước gốc nhỏ**:
hiển thị nhỏ thì nét, phóng to sẽ mờ (vì không upscale — muốn to & nét thì dùng chế độ AI).

## Tùy chọn hữu ích

| Cờ | Mặc định | Ý nghĩa |
|---|---|---|
| `--crop-black` | tắt | Crop vuông nền đen, giữ pixel gốc (cho web nền #000000) |
| `--square-size N` | 0 (auto) | Cỡ khung vuông cố định cho `--crop-black` |
| `--names a b …` | (tên file) | Tên thư mục pack theo thứ tự ảnh đầu vào |
| `--flat` | (per-pack) | Đổ tất cả vào 1 thư mục thay vì mỗi pack 1 thư mục |
| `--no-ai` | (AI bật) | Tắt AI, dùng Lanczos (nhanh, kém nét hơn) |
| `--model PATH` | tools/models/…4B32F.onnx | Đường dẫn model ONNX |
| `--canvas N` | 1024 | Kích thước khung vuông xuất ra (`0` = giữ tỉ lệ, không vuông) |
| `--no-denoise` | (bật) | Tắt khử nhiễu JPEG trước upscale |
| `--defringe N` | 3 | Số px co alpha để khử viền tối (`0` = tắt) |
| `--final-sharpen N` | 40 | Độ unsharp sau upscale (`0` = tắt) |
| `--scale N` | 4 | Hệ số Lanczos khi `--no-ai` (AI luôn 4x) |
| `--min-area F` | 0.002 | Diện tích tối thiểu (tỉ lệ ảnh) để giữ một khối |
| `--min-aspect` / `--max-aspect` | 0.4 / 2.2 | Khoảng tỉ lệ rộng/cao để loại dòng chữ |
| `--max-fill F` | 0.85 | Loại khối đặc hình chữ nhật (mockup điện thoại) |
| `--top` / `--bottom` | 0.28 / 0.88 | Bỏ khối ở đỉnh (status bar/tiêu đề) và đáy (nút bấm) |
| `--thr-lo` | 35 | Ngưỡng tách nền tối (thấp hơn = giữ nhiều hơn) |
| `--pad` | 8 | Đệm thêm quanh mỗi crop (px) |

## Lưu ý

- Chỉ dùng cho ảnh **lưới sticker nền tối**. Ảnh khác loại (vd màn hình chọn
  avatar `da9bf4ac…`) sẽ cho kết quả không hữu ích.
- Mỗi ảnh lưới cho 10 sticker nhân vật. Mockup điện thoại đã bị loại tự động
  (qua `--max-fill`); nếu muốn giữ lại thì đặt `--max-fill 1.0`.
- Nếu 2 sticker chạm/đè nhau chúng có thể bị gộp; hiện chưa tách trường hợp này.
- Nếu thiếu `onnxruntime` hoặc model → tự động fallback sang Lanczos (vẫn ra ảnh).
- **Trần chất lượng** bị giới hạn bởi nguồn (ảnh chụp JPEG nhỏ). AI làm nét rõ rệt
  nhưng không "bịa" chi tiết không có. Muốn nét tối đa cần ảnh gốc độ phân giải cao.
- Model `4B32F` là bản lightweight. Cần nét hơn nữa có thể chuyển sang
  `RealESRGAN_x4plus_anime_6B` (cần convert `.pth`→`.onnx` một lần bằng torch).

"""
AI super-resolution for anime/illustration stickers.

Wraps a Real-ESRGAN anime ONNX model (RealESRGAN_x4plus_anime_4B32F, 4x, RGB)
and runs it on CPU via onnxruntime. The model has dynamic H/W so any crop size
works in a single forward pass; tiny sticker crops upscale in well under a second.

Used by sticker_extractor.py; can also be run standalone for a quick test:
    python tools/ai_upscale.py <input.png> <output.png>
"""
import sys
import urllib.request
from pathlib import Path

import numpy as np

MODEL_URL = (
    "https://huggingface.co/xiongjie/lightweight-real-ESRGAN-anime/"
    "resolve/main/RealESRGAN_x4plus_anime_4B32F.onnx"
)
DEFAULT_MODEL = Path(__file__).parent / "models" / "RealESRGAN_x4plus_anime_4B32F.onnx"
SCALE = 4


def ensure_model(path=DEFAULT_MODEL):
    """Download the ONNX model to `path` if missing. Returns the path."""
    path = Path(path)
    if path.exists() and path.stat().st_size > 1_000_000:
        return path
    path.parent.mkdir(parents=True, exist_ok=True)
    print(f"  downloading model -> {path} ...")
    urllib.request.urlretrieve(MODEL_URL, path)
    if path.stat().st_size < 1_000_000:
        raise RuntimeError(f"model download looks too small: {path.stat().st_size} bytes")
    return path


class AnimeUpscaler:
    """Lazy-loaded ONNX anime upscaler (4x). RGB uint8 in, RGB uint8 out."""

    def __init__(self, model_path=DEFAULT_MODEL):
        import onnxruntime as ort  # imported lazily so the tool runs without it

        ensure_model(model_path)
        self.sess = ort.InferenceSession(
            str(model_path), providers=["CPUExecutionProvider"]
        )
        self.in_name = self.sess.get_inputs()[0].name
        self.out_name = self.sess.get_outputs()[0].name

    def upscale_rgb(self, rgb):
        """rgb: HxWx3 uint8 (RGB). Returns (4H)x(4W)x3 uint8."""
        x = rgb.astype(np.float32) / 255.0          # HWC, [0,1]
        x = np.transpose(x, (2, 0, 1))[None]        # 1,C,H,W
        y = self.sess.run([self.out_name], {self.in_name: x})[0]
        y = np.clip(y[0], 0.0, 1.0)                 # C,H,W
        y = np.transpose(y, (1, 2, 0))              # HWC
        return (y * 255.0 + 0.5).astype(np.uint8)


def _selftest(inp, outp):
    import cv2

    up = AnimeUpscaler()
    bgr = cv2.imread(inp, cv2.IMREAD_COLOR)
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    out = up.upscale_rgb(rgb)
    print(f"{bgr.shape[1]}x{bgr.shape[0]} -> {out.shape[1]}x{out.shape[0]}")
    cv2.imwrite(outp, cv2.cvtColor(out, cv2.COLOR_RGB2BGR))
    print("wrote", outp)


if __name__ == "__main__":
    _selftest(sys.argv[1], sys.argv[2])

"""
Sticker extractor for Studicon-style screenshots.

Detects individual character stickers in a screenshot grid, cuts each one out
on a transparent background, sharpens/upscales it, and writes a debug overlay
so you can eyeball detections and discard any junk.

Pipeline:
  1. Matte the (near-uniform dark) background via a luminance threshold.
  2. Find connected components -> sticker candidates.
  3. Filter by position / area / aspect / fill (rules derived from real data).
  4. Per sticker: fill silhouette holes so dark outlines stay opaque; crop at
     native resolution.
  5. Enhance: JPEG denoise -> 4x super-resolution (Real-ESRGAN anime ONNX on
     CPU, or Lanczos fallback) -> defringe alpha -> unsharp -> fit to a square
     transparent canvas (default 1024).
  6. Save transparent PNGs (numbered in reading order) + overlay_debug.png.

Usage:
  python tools/sticker_extractor.py <image> [<image> ...] -o output [options]
"""
import argparse
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter


def matte_alpha(img, thr_lo, thr_hi):
    """Soft alpha from dark-background threshold. maxc = brightest channel."""
    maxc = img.max(axis=2).astype(np.float32)
    alpha = np.clip((maxc - thr_lo) / max(thr_hi - thr_lo, 1), 0, 1)
    return (alpha * 255).astype(np.uint8)


def fill_holes(mask):
    """Fill enclosed holes in a binary mask so interior dark outlines stay solid."""
    h, w = mask.shape
    ff = mask.copy()
    flood = np.zeros((h + 2, w + 2), np.uint8)
    cv2.floodFill(ff, flood, (0, 0), 255)  # flood the outside background
    holes = cv2.bitwise_not(ff)            # everything not reachable = holes
    return cv2.bitwise_or(mask, holes)


def detect(img, args):
    """Return (kept, rejected) lists of (x, y, w, h, area) bounding boxes."""
    H, W = img.shape[:2]
    area_img = W * H
    fg = (img.max(axis=2) > args.thr_lo).astype(np.uint8) * 255
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2)
    n, labels, stats, _ = cv2.connectedComponentsWithStats(fg, connectivity=8)

    kept, rejected = [], []
    for i in range(1, n):
        x, y, w, h, a = stats[i]
        if a < area_img * 0.0003:
            continue  # speckle, not even worth drawing
        box = (x, y, w, h, a)
        yc = (y + h / 2) / H
        aspect = w / h
        fill = a / (w * h)  # solid rectangles (phone mockup) have fill ~0.95+
        ok = (
            a >= area_img * args.min_area
            and args.top <= yc <= args.bottom
            and args.min_aspect <= aspect <= args.max_aspect
            and fill <= args.max_fill
            and w <= 0.9 * W
        )
        (kept if ok else rejected).append(box)

    # reading order: group into rows by y, then sort by x within a row
    kept.sort(key=lambda b: b[1])
    rows, cur, last_y = [], [], None
    for b in kept:
        if last_y is None or b[1] - last_y < args.row_gap * H:
            cur.append(b)
        else:
            rows.append(cur); cur = [b]
        last_y = b[1]
    if cur:
        rows.append(cur)
    ordered = [b for row in rows for b in sorted(row, key=lambda b: b[0])]
    return ordered, rejected, labels


def cut_native(img, alpha, labels, box, args):
    """Crop one sticker at native resolution. Returns (rgb_uint8, alpha_uint8)."""
    H, W = img.shape[:2]
    x, y, w, h, _ = box
    p = args.pad
    x0, y0 = max(x - p, 0), max(y - p, 0)
    x1, y1 = min(x + w + p, W), min(y + h + p, H)

    # silhouette of THIS component, holes filled so inner outlines stay opaque
    comp = labels[y + h // 2, x + w // 2]
    sil = (labels[y0:y1, x0:x1] == comp).astype(np.uint8) * 255
    sil = cv2.morphologyEx(sil, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8), iterations=2)
    sil = fill_holes(sil)
    sil = cv2.GaussianBlur(sil, (0, 0), 1.0)  # feather edge for anti-aliasing

    crop_bgr = img[y0:y1, x0:x1]
    a = cv2.min(sil, alpha[y0:y1, x0:x1])  # silhouette AND background-matte
    rgb = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2RGB)
    return rgb, a


def fit_canvas(pil, canvas, margin=0.06):
    """Scale an RGBA image to fit a square `canvas`, centered on transparency."""
    avail = int(canvas * (1 - 2 * margin))
    s = avail / max(pil.width, pil.height)
    pil = pil.resize((max(1, round(pil.width * s)), max(1, round(pil.height * s))), Image.LANCZOS)
    bg = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    bg.paste(pil, ((canvas - pil.width) // 2, (canvas - pil.height) // 2), pil)
    return bg


def crop_square_black(img, box, side, args):
    """Crop a sticker at native resolution, centered on a synthetic black square.

    The square padding is freshly generated black (#000000), never sampled from
    the source, so a neighbouring sticker can never bleed in. No scaling -> the
    sticker keeps its exact original pixels (lossless on a black web background).
    """
    H, W = img.shape[:2]
    x, y, w, h, _ = box
    p = args.pad
    x0, y0 = max(x - p, 0), max(y - p, 0)
    x1, y1 = min(x + w + p, W), min(y + h + p, H)
    crop = img[y0:y1, x0:x1]                     # only this sticker (+ black gap)
    ch, cw = crop.shape[:2]
    s = max(side, ch, cw)
    canvas = np.zeros((s, s, 3), np.uint8)       # black BGR canvas
    oy, ox = (s - ch) // 2, (s - cw) // 2
    canvas[oy:oy + ch, ox:ox + cw] = crop
    return canvas


def finish(rgb, a, args, upscaler):
    """Denoise -> upscale (AI or Lanczos) -> defringe -> sharpen -> canvas."""
    if args.denoise:
        rgb = cv2.fastNlMeansDenoisingColored(rgb, None, 3, 3, 7, 21)

    if upscaler is not None:
        rgb_up = upscaler.upscale_rgb(rgb)                  # 4x, RGB
        Wt, Ht = rgb_up.shape[1], rgb_up.shape[0]
    else:
        f = args.scale
        rgb_up = cv2.resize(rgb, (rgb.shape[1] * f, rgb.shape[0] * f), interpolation=cv2.INTER_LANCZOS4)
        Wt, Ht = rgb_up.shape[1], rgb_up.shape[0]
    a_up = cv2.resize(a, (Wt, Ht), interpolation=cv2.INTER_LANCZOS4)

    # defringe: pull the alpha edge slightly inward so the dark background that
    # bled into edge pixels during upscaling is cut away (no dark halo)
    if args.defringe > 0:
        k = 2 * args.defringe + 1
        a_up = cv2.erode(a_up, np.ones((k, k), np.uint8))
        a_up = cv2.GaussianBlur(a_up, (0, 0), max(args.defringe * 0.8, 0.6))

    pil = Image.fromarray(np.dstack([rgb_up, a_up]), "RGBA")
    if args.final_sharpen > 0:
        pil = pil.filter(ImageFilter.UnsharpMask(radius=2, percent=args.final_sharpen, threshold=2))
    if args.canvas > 0:
        pil = fit_canvas(pil, args.canvas)
    return pil


def process(path, dest, prefix, args, upscaler):
    img = cv2.imread(str(path))
    if img is None:
        print(f"!! cannot read {path}")
        return
    H, W = img.shape[:2]
    alpha = matte_alpha(img, args.thr_lo, args.thr_hi)
    kept, rejected, labels = detect(img, args)
    print(f"\n{path.name}  {W}x{H}  -> {len(kept)} stickers ({len(rejected)} rejected)")
    for i, box in enumerate(kept, 1):
        rgb, a = cut_native(img, alpha, labels, box, args)
        pil = finish(rgb, a, args, upscaler)
        pil.save(dest / f"{prefix}{i:02d}.png")
    ov = dest / f"{prefix or '_'}overlay.png"
    cv2.imwrite(str(ov), draw_overlay(img, kept, rejected))
    print(f"  stickers -> {dest}/{prefix}NN.png ({len(kept)} files)")
    print(f"  debug    -> {ov}")


def pack_dest(out_dir, path, idx, args):
    """Resolve (destination dir, filename prefix) for one input image (pack)."""
    name = args.names[idx] if idx < len(args.names) else path.stem
    if args.per_pack:
        dest = out_dir / name
        dest.mkdir(parents=True, exist_ok=True)
        return dest, ""              # folder identifies the pack -> files 01.png..
    return out_dir, f"{name}_"       # flat -> name_01.png..


def draw_overlay(img, kept, rejected):
    overlay = img.copy()
    for (x, y, w, h, _) in rejected:
        cv2.rectangle(overlay, (x, y), (x + w, y + h), (0, 0, 255), 2)
    for i, (x, y, w, h, _) in enumerate(kept, 1):
        cv2.rectangle(overlay, (x, y), (x + w, y + h), (0, 255, 0), 3)
        cv2.putText(overlay, str(i), (x + 4, y + 34),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 255, 0), 3)
    return overlay


def process_black(path, img, kept, rejected, dest, prefix, side, args):
    """Native-resolution square crops on a black canvas (for black-theme web)."""
    print(f"\n{path.name}  {img.shape[1]}x{img.shape[0]}  -> {len(kept)} stickers "
          f"({len(rejected)} rejected)")
    for i, box in enumerate(kept, 1):
        sq = crop_square_black(img, box, side, args)
        cv2.imwrite(str(dest / f"{prefix}{i:02d}.png"), sq)
    ov = dest / f"{prefix or '_'}overlay.png"
    cv2.imwrite(str(ov), draw_overlay(img, kept, rejected))
    print(f"  stickers -> {dest}/{prefix}NN.png ({len(kept)} files, {side}x{side})")
    print(f"  debug    -> {ov}")


def main():
    ap = argparse.ArgumentParser(description="Extract & cut out stickers from screenshots.")
    ap.add_argument("images", nargs="+", help="input image path(s)")
    ap.add_argument("-o", "--out", default="tools/stickers_out", help="output directory")
    ap.add_argument("--names", nargs="*", default=[],
                    help="friendly pack/folder name per input image, in order (e.g. cho tho)")
    ap.add_argument("--flat", dest="per_pack", action="store_false", default=True,
                    help="put all stickers in one folder instead of one folder per pack")
    ap.add_argument("--pad", type=int, default=8, help="padding px around each crop")
    # crop-black mode: native-res square crops on #000000 (for black-theme web)
    ap.add_argument("--crop-black", dest="crop_black", action="store_true",
                    help="lossless square crops on black bg (no matting/AI/upscale)")
    ap.add_argument("--square-size", dest="square_size", type=int, default=0,
                    help="fixed square size for --crop-black (0 = auto from largest sticker)")
    # enhancement
    ap.add_argument("--ai", dest="ai", action="store_true", default=True,
                    help="use AI super-resolution (Real-ESRGAN anime, default on)")
    ap.add_argument("--no-ai", dest="ai", action="store_false", help="disable AI; use Lanczos")
    ap.add_argument("--model", default=str(Path(__file__).parent / "models" / "RealESRGAN_x4plus_anime_4B32F.onnx"),
                    help="path to the ONNX upscaler model")
    ap.add_argument("--denoise", dest="denoise", action="store_true", default=True,
                    help="light JPEG denoise before upscaling (default on)")
    ap.add_argument("--no-denoise", dest="denoise", action="store_false", help="disable denoise")
    ap.add_argument("--scale", type=int, default=4, help="Lanczos upscale factor (AI is fixed 4x)")
    ap.add_argument("--canvas", type=int, default=1024, help="square output size; 0 = keep aspect")
    ap.add_argument("--defringe", type=int, default=3, help="px to erode alpha to kill dark halo (0=off)")
    ap.add_argument("--final-sharpen", dest="final_sharpen", type=int, default=40,
                    help="unsharp percent after upscale (0=off)")
    # detection thresholds (defaults tuned on Studicon screenshots)
    ap.add_argument("--thr-lo", type=int, default=35, help="dark-bg threshold (lower=more kept)")
    ap.add_argument("--thr-hi", type=int, default=70, help="alpha feather upper bound")
    ap.add_argument("--min-area", type=float, default=0.002, help="min blob area as fraction of image")
    ap.add_argument("--min-aspect", type=float, default=0.4, help="min w/h to keep")
    ap.add_argument("--max-aspect", type=float, default=2.2, help="max w/h to keep")
    ap.add_argument("--max-fill", type=float, default=0.85,
                    help="max area/bbox fill; drops solid rects like the phone mockup")
    ap.add_argument("--top", type=float, default=0.28, help="ignore blobs above this y fraction")
    ap.add_argument("--bottom", type=float, default=0.88, help="ignore blobs below this y fraction")
    ap.add_argument("--row-gap", type=float, default=0.06, help="row grouping gap as y fraction")
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.crop_black:
        # pre-scan all images to pick one uniform square size, then crop
        scans = []
        for p in args.images:
            img = cv2.imread(str(Path(p)))
            if img is None:
                print(f"!! cannot read {p}")
                continue
            kept, rejected, _ = detect(img, args)
            scans.append((Path(p), img, kept, rejected))
        if args.square_size > 0:
            side = args.square_size
        else:
            dims = [max(w, h) for _, _, kept, _ in scans for (x, y, w, h, a) in kept]
            side = (max(dims) if dims else 0) + 2 * args.pad
        print(f"crop-black mode | uniform square {side}x{side} | set web bg = #000000")
        for idx, (path, img, kept, rejected) in enumerate(scans):
            dest, prefix = pack_dest(out_dir, path, idx, args)
            process_black(path, img, kept, rejected, dest, prefix, side, args)
        print("\nReminder: place these on a pure #000000 background for a seamless look.")
        return

    upscaler = None
    if args.ai:
        try:
            from ai_upscale import AnimeUpscaler
            print("loading AI upscaler (Real-ESRGAN anime, CPU)...")
            upscaler = AnimeUpscaler(args.model)
        except Exception as e:
            print(f"!! AI upscaler unavailable ({e}); falling back to Lanczos {args.scale}x")
    for idx, p in enumerate(args.images):
        path = Path(p)
        dest, prefix = pack_dest(out_dir, path, idx, args)
        process(path, dest, prefix, args, upscaler)


if __name__ == "__main__":
    main()

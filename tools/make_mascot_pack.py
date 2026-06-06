"""
Generate 3 more ORIGINAL pastel study mascots (single hero pose each), in the
same sitting-with-a-book style as the dog so the set looks cohesive:

  owl    -> Cú Thông Thái (wise owl, round glasses)
  bunny  -> Thỏ Siêng Năng (diligent rabbit, long ears)
  dragon -> Rồng Học Tập (study dragon, little horns + wings)

Run:  python tools/make_mascot_pack.py  -> tools/mascot_out/{owl,bunny,dragon}.svg (+png)
"""
from pathlib import Path

LINE = "#5B4636"
PAGE = "#FFFDF8"
PAGE_L = "#D9C7AE"
CREAM = "#F7EAD9"

W = 512

def book(cover, body=CREAM):
    """open book + two paws, shared bottom element (matches the dog)."""
    page_lines = "".join(
        f'<line x1="172" y1="{384+i*9}" x2="248" y2="{378+i*9}" stroke="{PAGE_L}" stroke-width="3" stroke-linecap="round"/>'
        f'<line x1="264" y1="{378+i*9}" x2="340" y2="{384+i*9}" stroke="{PAGE_L}" stroke-width="3" stroke-linecap="round"/>'
        for i in range(4))
    return f"""
  <ellipse cx="196" cy="372" rx="26" ry="18" fill="{body}" stroke="{LINE}" stroke-width="5"/>
  <ellipse cx="316" cy="372" rx="26" ry="18" fill="{body}" stroke="{LINE}" stroke-width="5"/>
  <path d="M150,392 L256,372 L256,432 L156,452 Z" fill="{PAGE}" stroke="{LINE}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M362,392 L256,372 L256,432 L356,452 Z" fill="{PAGE}" stroke="{LINE}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M150,392 L256,372 L256,432 L156,452 Z M362,392 L256,372 L256,432 L356,452 Z" fill="{cover}" opacity="0.45"/>
  {page_lines}
  <line x1="256" y1="372" x2="256" y2="432" stroke="{LINE}" stroke-width="4"/>
"""

def wrap(defs, content):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {W}" width="{W}" height="{W}">'
            f"{defs}{content}</svg>\n")

# ---------------------------------------------------------------- BUNNY
def bunny():
    body, ear_in, cheek, nose = "#F7EAD9", "#F4B8AE", "#F4B8AE", "#C98B9A"
    shade = "#EAD7BE"
    defs = f"""<defs>
      <radialGradient id="bh" cx="50%" cy="42%" r="60%"><stop offset="60%" stop-color="{body}"/><stop offset="100%" stop-color="{shade}"/></radialGradient>
    </defs>"""
    c = f"""
  <ellipse cx="256" cy="356" rx="112" ry="100" fill="url(#bh)" stroke="{LINE}" stroke-width="5"/>
  <!-- long ears -->
  <g stroke="{LINE}" stroke-width="5">
    <ellipse cx="222" cy="92" rx="24" ry="80" fill="{body}" transform="rotate(-9 222 92)"/>
    <ellipse cx="292" cy="92" rx="24" ry="80" fill="{body}" transform="rotate(9 292 92)"/>
  </g>
  <ellipse cx="222" cy="96" rx="11" ry="58" fill="{ear_in}" transform="rotate(-9 222 96)"/>
  <ellipse cx="292" cy="96" rx="11" ry="58" fill="{ear_in}" transform="rotate(9 292 96)"/>
  <circle cx="256" cy="206" r="90" fill="url(#bh)" stroke="{LINE}" stroke-width="5"/>
  <ellipse cx="256" cy="236" rx="46" ry="34" fill="#FFF8EE"/>
  <!-- cheeks, eyes, nose -->
  <ellipse cx="198" cy="232" rx="16" ry="10" fill="{cheek}"/>
  <ellipse cx="314" cy="232" rx="16" ry="10" fill="{cheek}"/>
  <circle cx="222" cy="202" r="12" fill="{LINE}"/><circle cx="218" cy="198" r="4" fill="#fff"/>
  <circle cx="290" cy="202" r="12" fill="{LINE}"/><circle cx="286" cy="198" r="4" fill="#fff"/>
  <path d="M256,226 q-9,0 -9,7 q0,7 9,10 q9,-3 9,-10 q0,-7 -9,-7 Z" fill="{nose}"/>
  <path d="M256,243 v8 M256,251 q-8,6 -16,2 M256,251 q8,6 16,2" fill="none" stroke="{LINE}" stroke-width="3.5" stroke-linecap="round"/>
  {book('#E8B7C8', body)}
"""
    return wrap(defs, c)

# ---------------------------------------------------------------- OWL
def owl():
    body, belly, beak, feet = "#C9B8E8", "#FBF3E9", "#F2A65A", "#F2A65A"
    shade = "#B7A2DD"
    defs = f"""<defs>
      <radialGradient id="ob" cx="50%" cy="38%" r="65%"><stop offset="60%" stop-color="{body}"/><stop offset="100%" stop-color="{shade}"/></radialGradient>
    </defs>"""
    c = f"""
  <!-- feet -->
  <g stroke="{LINE}" stroke-width="4" fill="{feet}">
    <path d="M214,452 l-12,16 M214,452 l0,18 M214,452 l12,16"/>
    <path d="M298,452 l-12,16 M298,452 l0,18 M298,452 l12,16"/>
  </g>
  <!-- ear tufts -->
  <path d="M176,150 l18,-58 l34,30 Z" fill="{body}" stroke="{LINE}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M336,150 l-18,-58 l-34,30 Z" fill="{body}" stroke="{LINE}" stroke-width="5" stroke-linejoin="round"/>
  <!-- body -->
  <ellipse cx="256" cy="288" rx="138" ry="160" fill="url(#ob)" stroke="{LINE}" stroke-width="5"/>
  <!-- wings -->
  <path d="M126,250 q-18,70 24,150 q-30,-70 -10,-150 Z" fill="{shade}" stroke="{LINE}" stroke-width="4"/>
  <path d="M386,250 q18,70 -24,150 q30,-70 10,-150 Z" fill="{shade}" stroke="{LINE}" stroke-width="4"/>
  <!-- belly -->
  <ellipse cx="256" cy="312" rx="86" ry="118" fill="{belly}"/>
  <!-- big eyes + wise glasses -->
  <circle cx="206" cy="214" r="46" fill="#fff" stroke="{LINE}" stroke-width="4"/>
  <circle cx="306" cy="214" r="46" fill="#fff" stroke="{LINE}" stroke-width="4"/>
  <circle cx="210" cy="218" r="18" fill="{LINE}"/><circle cx="204" cy="212" r="6" fill="#fff"/>
  <circle cx="302" cy="218" r="18" fill="{LINE}"/><circle cx="296" cy="212" r="6" fill="#fff"/>
  <g fill="none" stroke="{LINE}" stroke-width="5"><circle cx="206" cy="214" r="40"/><circle cx="306" cy="214" r="40"/><line x1="246" y1="210" x2="266" y2="210"/></g>
  <!-- beak -->
  <path d="M256,238 l-16,22 l32,0 Z" fill="{beak}" stroke="{LINE}" stroke-width="4" stroke-linejoin="round"/>
  {book('#A9C7E8', belly)}
"""
    return wrap(defs, c)

# ---------------------------------------------------------------- DRAGON
def dragon():
    body, belly, horn, wing, spike = "#9FD6BE", "#FBF3E0", "#FFE0A8", "#BFA8E8", "#6FC1A0"
    shade = "#83C7AB"
    defs = f"""<defs>
      <radialGradient id="db" cx="50%" cy="40%" r="62%"><stop offset="60%" stop-color="{body}"/><stop offset="100%" stop-color="{shade}"/></radialGradient>
    </defs>"""
    c = f"""
  <!-- tail -->
  <path d="M348,400 q70,10 70,-60 q0,-30 -26,-30 q22,12 14,40 q-10,34 -58,20 Z" fill="{body}" stroke="{LINE}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M404,318 l20,-6 l-6,20 Z" fill="{spike}" stroke="{LINE}" stroke-width="3"/>
  <!-- wings -->
  <path d="M150,250 q-70,-20 -96,18 q44,-6 64,18 q-30,2 -34,30 q40,-16 72,2 Z" fill="{wing}" stroke="{LINE}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M362,250 q70,-20 96,18 q-44,-6 -64,18 q30,2 34,30 q-40,-16 -72,2 Z" fill="{wing}" stroke="{LINE}" stroke-width="4" stroke-linejoin="round"/>
  <!-- body -->
  <ellipse cx="256" cy="352" rx="116" ry="102" fill="url(#db)" stroke="{LINE}" stroke-width="5"/>
  <ellipse cx="256" cy="368" rx="70" ry="80" fill="{belly}"/>
  <!-- back spikes -->
  <g fill="{spike}" stroke="{LINE}" stroke-width="3" stroke-linejoin="round">
    <path d="M256,118 l-14,26 l28,0 Z"/><path d="M256,150 l-16,28 l32,0 Z"/>
  </g>
  <!-- head -->
  <circle cx="256" cy="208" r="92" fill="url(#db)" stroke="{LINE}" stroke-width="5"/>
  <!-- horns -->
  <path d="M206,140 q-10,-40 -30,-52 q26,8 44,40 Z" fill="{horn}" stroke="{LINE}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M306,140 q10,-40 30,-52 q-26,8 -44,40 Z" fill="{horn}" stroke="{LINE}" stroke-width="4" stroke-linejoin="round"/>
  <!-- snout -->
  <ellipse cx="256" cy="240" rx="50" ry="36" fill="{belly}"/>
  <circle cx="240" cy="236" r="3.4" fill="{LINE}"/><circle cx="272" cy="236" r="3.4" fill="{LINE}"/>
  <!-- eyes + cheeks -->
  <ellipse cx="200" cy="226" rx="15" ry="9" fill="#F4B8AE" opacity="0.8"/>
  <ellipse cx="312" cy="226" rx="15" ry="9" fill="#F4B8AE" opacity="0.8"/>
  <circle cx="220" cy="198" r="12" fill="{LINE}"/><circle cx="216" cy="194" r="4" fill="#fff"/>
  <circle cx="292" cy="198" r="12" fill="{LINE}"/><circle cx="288" cy="194" r="4" fill="#fff"/>
  <path d="M242,256 q14,12 28,0" fill="none" stroke="{LINE}" stroke-width="4.5" stroke-linecap="round"/>
  {book('#F2C79A', body)}
"""
    return wrap(defs, c)

BUILDERS = {"owl": owl, "bunny": bunny, "dragon": dragon}

def render(out):
    try:
        import cairosvg
    except ImportError:
        print("(skip PNG: pip install cairosvg)"); return
    (out / "png").mkdir(exist_ok=True)
    for name in BUILDERS:
        for sz in (512, 1024):
            suffix = "" if sz == 512 else "_1024"
            cairosvg.svg2png(url=str(out / f"{name}.svg"),
                             write_to=str(out / "png" / f"{name}{suffix}.png"),
                             output_width=sz, output_height=sz)
    # combined preview of the whole roster (dog + 3 new) on dark bg
    from PIL import Image
    names = ["dog_2", "owl", "bunny", "dragon"]
    cell = 300
    sheet = Image.new("RGB", (4 * cell, cell), (16, 16, 22))
    for i, n in enumerate(names):
        p = out / "png" / f"{n}.png"
        if not p.exists():
            continue
        im = Image.open(p).convert("RGBA"); im.thumbnail((cell - 20, cell - 20))
        sheet.paste(im, (i * cell + (cell - im.width) // 2, (cell - im.height) // 2), im)
    sheet.save(out / "_pack_preview.png")
    print("rendered PNG + _pack_preview.png")

def main():
    out = Path("tools/mascot_out"); out.mkdir(parents=True, exist_ok=True)
    for name, fn in BUILDERS.items():
        (out / f"{name}.svg").write_text(fn(), encoding="utf-8")
        print("wrote", out / f"{name}.svg")
    render(out)

if __name__ == "__main__":
    main()

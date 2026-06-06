"""
Generate an original soft-pastel puppy mascot set for StudyFlow as SVG.

Five escalating "study intensity" states (matching DogAvatar level 0-4):
  0 Newbie  1 Beginner  2 Intermediate  3 Expert  4 Master

One shared base body keeps all five consistent; each level swaps the
expression and the "study heat" effects. 100% original vector art.

Run:  python tools/make_mascot.py    ->  writes tools/mascot_out/dog_*.svg
"""
from pathlib import Path

# ---- palette (soft pastel, warm) -------------------------------------------
BODY   = "#F7EAD9"   # cream fur
BODY_D = "#EAD7BE"   # cream shade
EAR    = "#C9A480"   # brown ears / patch
EAR_D  = "#B58D66"
MUZZLE = "#FFF8EE"
NOSE   = "#5B4636"
LINE   = "#5B4636"   # outlines (soft dark brown, not black)
CHEEK  = "#F4B8AE"
CHEEK2 = "#F29D9D"   # hotter cheek
PAGE   = "#FFFDF8"
PAGE_L = "#D9C7AE"
BOOKS  = ["#A8D5C4", "#A9C7E8", "#E8B7C8", "#C9B8E8", "#F2C79A"]  # cover per level

W = 512

def defs(level):
    cover = BOOKS[level]
    return f"""
  <defs>
    <radialGradient id="head" cx="50%" cy="42%" r="62%">
      <stop offset="60%" stop-color="{BODY}"/>
      <stop offset="100%" stop-color="{BODY_D}"/>
    </radialGradient>
    <radialGradient id="body" cx="50%" cy="40%" r="65%">
      <stop offset="60%" stop-color="{BODY}"/>
      <stop offset="100%" stop-color="{BODY_D}"/>
    </radialGradient>
    <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%"  stop-color="#FFE0A8"/>
      <stop offset="55%" stop-color="#FFB27D"/>
      <stop offset="100%" stop-color="#FF9E7D"/>
    </linearGradient>
    <linearGradient id="cover" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{cover}"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0"/>
    </linearGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6"/>
    </filter>
  </defs>"""

def flames():
    # pastel flame tongues behind the body
    def tongue(cx, scale, op):
        return (f'<path transform="translate({cx},360) scale({scale})" opacity="{op}" '
                f'fill="url(#flame)" d="M0,0 C-26,-30 -18,-66 0,-96 C18,-66 26,-30 0,0 Z"/>')
    return ('<g>'
            + tongue(150, 1.0, .95) + tongue(362, 1.0, .95)
            + tongue(120, 0.7, .8) + tongue(392, 0.7, .8)
            + tongue(256, 1.25, .55) + '</g>')

def big_effort():
    # large effort cloud + flames for Master
    cloud = ('<g opacity="0.85">'
             '<ellipse cx="256" cy="92" rx="120" ry="60" fill="url(#flame)"/>'
             '<ellipse cx="170" cy="120" rx="60" ry="44" fill="url(#flame)"/>'
             '<ellipse cx="342" cy="120" rx="60" ry="44" fill="url(#flame)"/>'
             '<ellipse cx="256" cy="70" rx="70" ry="48" fill="#FFE9C7" opacity="0.7"/>'
             '</g>')
    return flames() + cloud

def steam():
    return ('<g fill="#D9D2CC" opacity="0.8">'
            '<path d="M205,118 q-14,-18 0,-34 q14,-16 0,-32" stroke="#D9D2CC" '
            'stroke-width="9" fill="none" stroke-linecap="round"/>'
            '<path d="M308,118 q14,-18 0,-34 q-14,-16 0,-32" stroke="#CFC8C2" '
            'stroke-width="9" fill="none" stroke-linecap="round"/></g>')

def sparkles():
    def star(x, y, s):
        return (f'<path transform="translate({x},{y}) scale({s})" fill="#FFE39A" '
                f'd="M0,-12 C2,-3 3,-2 12,0 C3,2 2,3 0,12 C-2,3 -3,2 -12,0 C-3,-2 -2,-3 0,-12 Z"/>')
    return '<g>' + star(150, 120, 1.2) + star(372, 110, 1.5) + star(400, 200, 0.9) + '</g>'

def sweat(x=336, y=150):
    return (f'<path transform="translate({x},{y})" fill="#9BD3F0" stroke="#7FBEE0" '
            f'stroke-width="2" d="M0,0 C8,12 13,18 0,26 C-13,18 -8,12 0,0 Z"/>')

def base_body():
    return f"""
  <!-- body -->
  <ellipse cx="256" cy="352" rx="120" ry="104" fill="url(#body)" stroke="{LINE}" stroke-width="5"/>
  <!-- back legs/paws -->
  <ellipse cx="185" cy="430" rx="40" ry="26" fill="{BODY}" stroke="{LINE}" stroke-width="5"/>
  <ellipse cx="327" cy="430" rx="40" ry="26" fill="{BODY}" stroke="{LINE}" stroke-width="5"/>
  <!-- ears (behind head) -->
  <ellipse cx="176" cy="196" rx="40" ry="66" fill="{EAR}" stroke="{LINE}" stroke-width="5" transform="rotate(-16 176 196)"/>
  <ellipse cx="336" cy="196" rx="40" ry="66" fill="{EAR}" stroke="{LINE}" stroke-width="5" transform="rotate(16 336 196)"/>
  <!-- head -->
  <circle cx="256" cy="204" r="96" fill="url(#head)" stroke="{LINE}" stroke-width="5"/>
  <!-- brown eye patch (character mark) -->
  <ellipse cx="300" cy="196" rx="40" ry="42" fill="{EAR}" opacity="0.55"/>
  <!-- muzzle -->
  <ellipse cx="256" cy="240" rx="52" ry="40" fill="{MUZZLE}"/>
"""

def face(level, cheek):
    """eyes + nose + mouth per level"""
    nose = f'<path d="M256,224 q-13,0 -13,9 q0,9 13,13 q13,-4 13,-13 q0,-9 -13,-9 Z" fill="{NOSE}"/>'
    cheeks = (f'<ellipse cx="196" cy="232" rx="17" ry="11" fill="{cheek}"/>'
              f'<ellipse cx="316" cy="232" rx="17" ry="11" fill="{cheek}"/>')
    eye = lambda x,y,r=13: (f'<circle cx="{x}" cy="{y}" r="{r}" fill="{NOSE}"/>'
                            f'<circle cx="{x-4}" cy="{y-5}" r="{r*0.34:.1f}" fill="#fff"/>')
    if level == 0:        # big shiny happy eyes, open smile
        eyes = eye(220,200,15) + eye(292,200,15)
        mouth = f'<path d="M242,258 q14,14 28,0" fill="none" stroke="{LINE}" stroke-width="5" stroke-linecap="round"/>'
    elif level == 1:      # calm reading, gentle closed-ish eyes
        eyes = (f'<path d="M208,202 q12,10 24,0" stroke="{LINE}" stroke-width="6" fill="none" stroke-linecap="round"/>'
                f'<path d="M280,202 q12,10 24,0" stroke="{LINE}" stroke-width="6" fill="none" stroke-linecap="round"/>')
        mouth = f'<path d="M246,256 q10,8 20,0" fill="none" stroke="{LINE}" stroke-width="5" stroke-linecap="round"/>'
    elif level == 2:      # determined, slight frown + brows
        eyes = eye(220,202,12) + eye(292,202,12)
        brows = (f'<path d="M204,182 l28,8" stroke="{LINE}" stroke-width="6" stroke-linecap="round"/>'
                 f'<path d="M308,182 l-28,8" stroke="{LINE}" stroke-width="6" stroke-linecap="round"/>')
        mouth = f'<path d="M244,260 q12,-6 24,0" fill="none" stroke="{LINE}" stroke-width="5" stroke-linecap="round"/>'
        eyes = brows + eyes
    elif level == 3:      # fired-up, focused intense eyes
        eyes = eye(220,202,13) + eye(292,202,13)
        brows = (f'<path d="M202,180 l30,10" stroke="{LINE}" stroke-width="7" stroke-linecap="round"/>'
                 f'<path d="M310,180 l-30,10" stroke="{LINE}" stroke-width="7" stroke-linecap="round"/>')
        mouth = f'<path d="M240,256 q16,16 32,0" fill="{NOSE}" stroke="{LINE}" stroke-width="4"/>'
        eyes = brows + eyes
    else:                 # level 4: swirl/overwhelmed but pushing on
        eyes = (f'<path d="M222,202 m-13,0 a13,13 0 1,1 26,0 a8,8 0 1,1 -16,0 a4,4 0 1,1 8,0" '
                f'fill="none" stroke="{LINE}" stroke-width="4"/>'
                f'<path d="M292,202 m-13,0 a13,13 0 1,1 26,0 a8,8 0 1,1 -16,0 a4,4 0 1,1 8,0" '
                f'fill="none" stroke="{LINE}" stroke-width="4"/>')
        mouth = f'<ellipse cx="256" cy="262" rx="14" ry="10" fill="{NOSE}"/>'
    return cheeks + nose + eyes + mouth

def book(level):
    cover = BOOKS[level]
    lines = ''.join(f'<line x1="{170+i*0}" y1="0" x2="0" y2="0"/>' for i in range(0))
    page_lines = ''.join(
        f'<line x1="172" y1="{384+i*9}" x2="248" y2="{378+i*9}" stroke="{PAGE_L}" stroke-width="3" stroke-linecap="round"/>'
        f'<line x1="264" y1="{378+i*9}" x2="340" y2="{384+i*9}" stroke="{PAGE_L}" stroke-width="3" stroke-linecap="round"/>'
        for i in range(4))
    return f"""
  <!-- paws holding the book -->
  <ellipse cx="196" cy="372" rx="26" ry="18" fill="{BODY}" stroke="{LINE}" stroke-width="5"/>
  <ellipse cx="316" cy="372" rx="26" ry="18" fill="{BODY}" stroke="{LINE}" stroke-width="5"/>
  <!-- open book -->
  <path d="M150,392 L256,372 L256,432 L156,452 Z" fill="{PAGE}" stroke="{LINE}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M362,392 L256,372 L256,432 L356,452 Z" fill="{PAGE}" stroke="{LINE}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M150,392 L256,372 L256,432 L156,452 Z M362,392 L256,372 L256,432 L356,452 Z" fill="url(#cover)" opacity="0.5"/>
  {page_lines}
  <line x1="256" y1="372" x2="256" y2="432" stroke="{LINE}" stroke-width="4"/>
"""

def build(level):
    cheek = [CHEEK, CHEEK, CHEEK2, CHEEK2, CHEEK2][level]
    back = ''
    if level == 3:
        back = flames()
    elif level == 4:
        back = big_effort()
    front_fx = ''
    if level == 0:
        front_fx = sparkles()
    elif level == 2:
        front_fx = steam() + sweat()
    elif level == 3:
        front_fx = sweat(340, 150)
    elif level == 4:
        front_fx = sweat(338, 156) + sweat(176, 150)
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {W}" width="{W}" height="{W}">
{defs(level)}
  <g>{back}</g>
  {base_body()}
  {face(level, cheek)}
  {book(level)}
  <g>{front_fx}</g>
</svg>
"""
    return svg

NAMES = ["newbie", "beginner", "intermediate", "expert", "master"]

def render_png(out):
    """SVG -> transparent PNG (512 & 1024) + a light/dark preview sheet."""
    try:
        import cairosvg
    except ImportError:
        print("(skip PNG: `pip install cairosvg` to also export PNG)")
        return
    from PIL import Image, ImageDraw
    (out / "png").mkdir(exist_ok=True)
    for lvl, n in enumerate(NAMES):
        svg = out / f"dog_{lvl}_{n}.svg"
        for sz in (512, 1024):
            suffix = "" if sz == 512 else "_1024"
            cairosvg.svg2png(url=str(svg), write_to=str(out / "png" / f"dog_{lvl}{suffix}.png"),
                             output_width=sz, output_height=sz)
    cell = 300
    sheet = Image.new("RGB", (5 * cell, 2 * cell + 30), (240, 240, 240))
    d = ImageDraw.Draw(sheet)
    d.rectangle([0, cell + 30, 5 * cell, 2 * cell + 30], fill=(10, 10, 10))
    d.text((8, 8), "Light bg / Dark bg", fill=(0, 0, 0))
    for lvl, n in enumerate(NAMES):
        im = Image.open(out / "png" / f"dog_{lvl}.png").convert("RGBA")
        im.thumbnail((cell - 20, cell - 40))
        x = lvl * cell + (cell - im.width) // 2
        sheet.paste(im, (x, 30 + (cell - 40 - im.height) // 2), im)
        sheet.paste(im, (x, cell + 30 + (cell - 40 - im.height) // 2), im)
        d.text((lvl * cell + 8, 30 + cell - 26), f"{lvl} {n}", fill=(80, 80, 80))
    sheet.save(out / "_preview.png")
    print("rendered PNG + _preview.png")

def main():
    out = Path("tools/mascot_out")
    out.mkdir(parents=True, exist_ok=True)
    for lvl, name in enumerate(NAMES):
        (out / f"dog_{lvl}_{name}.svg").write_text(build(lvl), encoding="utf-8")
        print("wrote", out / f"dog_{lvl}_{name}.svg")
    render_png(out)

if __name__ == "__main__":
    main()

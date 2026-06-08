"""
Generate the FULL mascot set: every animal (dog, bunny, dragon, owl) in all
5 escalating "study intensity" levels (0 Newbie .. 4 Master), matching the
dog's emotional beats.

Design: one shared *effect kit* (flames / sparkles / steam / sweat / effort
cloud — all positioned at canvas edges, so animal-agnostic) + one shared book.
Each animal supplies a *base* (its body without the face) and a per-level
*expression* (eyes + mouth) drawn at that animal's face coordinates.

- dog  : reuses the original face() verbatim -> pixel-identical to shipped art.
- bunny/dragon : parametric round_face() that mirrors the dog's 5 expressions.
- owl  : special owl_face() (pupils inside the big glasses).

Run:  python tools/make_mascot_all.py [out_dir]
      writes <out_dir>/{animal}_{0..4}.svg (+ png/ + _all_preview.png)
      default out_dir = tools/mascot_out/all
"""
import sys
from pathlib import Path

LINE = "#5B4636"
PAGE = "#FFFDF8"
PAGE_L = "#D9C7AE"
NOSE = "#5B4636"
CHEEK = "#F4B8AE"
CHEEK2 = "#F29D9D"
BOOKS = ["#A8D5C4", "#A9C7E8", "#E8B7C8", "#C9B8E8", "#F2C79A"]  # book cover per level
LEVEL_CHEEK = [CHEEK, CHEEK, CHEEK2, CHEEK2, CHEEK2]
NAMES = ["newbie", "beginner", "intermediate", "expert", "master"]
W = 512

# ---------------------------------------------------------------- shared defs
def shared_defs(cover):
    """flame gradient + book cover gradient + soft blur — needed by the effects."""
    return f"""
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
    </filter>"""

# ---------------------------------------------------------------- effect kit
def flames():
    def tongue(cx, scale, op):
        return (f'<path transform="translate({cx},360) scale({scale})" opacity="{op}" '
                f'fill="url(#flame)" d="M0,0 C-26,-30 -18,-66 0,-96 C18,-66 26,-30 0,0 Z"/>')
    return ('<g>' + tongue(150, 1.0, .95) + tongue(362, 1.0, .95)
            + tongue(120, 0.7, .8) + tongue(392, 0.7, .8)
            + tongue(256, 1.25, .55) + '</g>')

def big_effort():
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

def back_fx(level):
    if level == 3:
        return flames()
    if level == 4:
        return big_effort()
    return ""

def front_fx(level):
    if level == 0:
        return sparkles()
    if level == 2:
        return steam() + sweat()
    if level == 3:
        return sweat(340, 150)
    if level == 4:
        return sweat(338, 156) + sweat(176, 150)
    return ""

# ---------------------------------------------------------------- shared book
def book():
    page_lines = "".join(
        f'<line x1="172" y1="{384+i*9}" x2="248" y2="{378+i*9}" stroke="{PAGE_L}" stroke-width="3" stroke-linecap="round"/>'
        f'<line x1="264" y1="{378+i*9}" x2="340" y2="{384+i*9}" stroke="{PAGE_L}" stroke-width="3" stroke-linecap="round"/>'
        for i in range(4))
    return f"""
  <ellipse cx="196" cy="372" rx="26" ry="18" fill="#F7EAD9" stroke="{LINE}" stroke-width="5"/>
  <ellipse cx="316" cy="372" rx="26" ry="18" fill="#F7EAD9" stroke="{LINE}" stroke-width="5"/>
  <path d="M150,392 L256,372 L256,432 L156,452 Z" fill="{PAGE}" stroke="{LINE}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M362,392 L256,372 L256,432 L356,452 Z" fill="{PAGE}" stroke="{LINE}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M150,392 L256,372 L256,432 L156,452 Z M362,392 L256,372 L256,432 L356,452 Z" fill="url(#cover)" opacity="0.5"/>
  {page_lines}
  <line x1="256" y1="372" x2="256" y2="432" stroke="{LINE}" stroke-width="4"/>
"""

def eye(x, y, r=13):
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="{NOSE}"/>'
            f'<circle cx="{x-4}" cy="{y-5}" r="{r*0.34:.1f}" fill="#fff"/>')

# ---------------------------------------------------------------- DOG (verbatim)
DOG_BODY, DOG_BODY_D, DOG_EAR, DOG_MUZZLE = "#F7EAD9", "#EAD7BE", "#C9A480", "#FFF8EE"

def dog_defs(cover):
    return f"""
  <defs>
    <radialGradient id="head" cx="50%" cy="42%" r="62%">
      <stop offset="60%" stop-color="{DOG_BODY}"/><stop offset="100%" stop-color="{DOG_BODY_D}"/>
    </radialGradient>
    <radialGradient id="body" cx="50%" cy="40%" r="65%">
      <stop offset="60%" stop-color="{DOG_BODY}"/><stop offset="100%" stop-color="{DOG_BODY_D}"/>
    </radialGradient>{shared_defs(cover)}
  </defs>"""

def dog_base():
    return f"""
  <ellipse cx="256" cy="352" rx="120" ry="104" fill="url(#body)" stroke="{LINE}" stroke-width="5"/>
  <ellipse cx="185" cy="430" rx="40" ry="26" fill="{DOG_BODY}" stroke="{LINE}" stroke-width="5"/>
  <ellipse cx="327" cy="430" rx="40" ry="26" fill="{DOG_BODY}" stroke="{LINE}" stroke-width="5"/>
  <ellipse cx="176" cy="196" rx="40" ry="66" fill="{DOG_EAR}" stroke="{LINE}" stroke-width="5" transform="rotate(-16 176 196)"/>
  <ellipse cx="336" cy="196" rx="40" ry="66" fill="{DOG_EAR}" stroke="{LINE}" stroke-width="5" transform="rotate(16 336 196)"/>
  <circle cx="256" cy="204" r="96" fill="url(#head)" stroke="{LINE}" stroke-width="5"/>
  <ellipse cx="300" cy="196" rx="40" ry="42" fill="{DOG_EAR}" opacity="0.55"/>
  <ellipse cx="256" cy="240" rx="52" ry="40" fill="{DOG_MUZZLE}"/>
"""

def dog_face(level):
    cheek = LEVEL_CHEEK[level]
    nose = f'<path d="M256,224 q-13,0 -13,9 q0,9 13,13 q13,-4 13,-13 q0,-9 -13,-9 Z" fill="{NOSE}"/>'
    cheeks = (f'<ellipse cx="196" cy="232" rx="17" ry="11" fill="{cheek}"/>'
              f'<ellipse cx="316" cy="232" rx="17" ry="11" fill="{cheek}"/>')
    if level == 0:
        eyes = eye(220, 200, 15) + eye(292, 200, 15)
        mouth = f'<path d="M242,258 q14,14 28,0" fill="none" stroke="{LINE}" stroke-width="5" stroke-linecap="round"/>'
    elif level == 1:
        eyes = (f'<path d="M208,202 q12,10 24,0" stroke="{LINE}" stroke-width="6" fill="none" stroke-linecap="round"/>'
                f'<path d="M280,202 q12,10 24,0" stroke="{LINE}" stroke-width="6" fill="none" stroke-linecap="round"/>')
        mouth = f'<path d="M246,256 q10,8 20,0" fill="none" stroke="{LINE}" stroke-width="5" stroke-linecap="round"/>'
    elif level == 2:
        brows = (f'<path d="M204,182 l28,8" stroke="{LINE}" stroke-width="6" stroke-linecap="round"/>'
                 f'<path d="M308,182 l-28,8" stroke="{LINE}" stroke-width="6" stroke-linecap="round"/>')
        eyes = brows + eye(220, 202, 12) + eye(292, 202, 12)
        mouth = f'<path d="M244,260 q12,-6 24,0" fill="none" stroke="{LINE}" stroke-width="5" stroke-linecap="round"/>'
    elif level == 3:
        brows = (f'<path d="M202,180 l30,10" stroke="{LINE}" stroke-width="7" stroke-linecap="round"/>'
                 f'<path d="M310,180 l-30,10" stroke="{LINE}" stroke-width="7" stroke-linecap="round"/>')
        eyes = brows + eye(220, 202, 13) + eye(292, 202, 13)
        mouth = f'<path d="M240,256 q16,16 32,0" fill="{NOSE}" stroke="{LINE}" stroke-width="4"/>'
    else:
        eyes = (f'<path d="M222,202 m-13,0 a13,13 0 1,1 26,0 a8,8 0 1,1 -16,0 a4,4 0 1,1 8,0" fill="none" stroke="{LINE}" stroke-width="4"/>'
                f'<path d="M292,202 m-13,0 a13,13 0 1,1 26,0 a8,8 0 1,1 -16,0 a4,4 0 1,1 8,0" fill="none" stroke="{LINE}" stroke-width="4"/>')
        mouth = f'<ellipse cx="256" cy="262" rx="14" ry="10" fill="{NOSE}"/>'
    return cheeks + nose + eyes + mouth

# ---------------------------------------------------------------- parametric round face (bunny/dragon)
def round_face(level, exl, exr, ey, mx, my, cheeks, nose=""):
    """Mirror the dog's 5 expressions at arbitrary eye centres (exl,exr,ey)
    and a mouth baseline (mx,my). `cheeks` is pre-rendered (color per level)."""
    if level == 0:
        eyes = eye(exl, ey, 15) + eye(exr, ey, 15)
        mouth = f'<path d="M{mx-14},{my} q14,14 28,0" fill="none" stroke="{LINE}" stroke-width="5" stroke-linecap="round"/>'
    elif level == 1:
        eyes = (f'<path d="M{exl-12},{ey} q12,10 24,0" stroke="{LINE}" stroke-width="6" fill="none" stroke-linecap="round"/>'
                f'<path d="M{exr-12},{ey} q12,10 24,0" stroke="{LINE}" stroke-width="6" fill="none" stroke-linecap="round"/>')
        mouth = f'<path d="M{mx-10},{my-2} q10,8 20,0" fill="none" stroke="{LINE}" stroke-width="5" stroke-linecap="round"/>'
    elif level == 2:
        brows = (f'<path d="M{exl-16},{ey-20} l28,8" stroke="{LINE}" stroke-width="6" stroke-linecap="round"/>'
                 f'<path d="M{exr+16},{ey-20} l-28,8" stroke="{LINE}" stroke-width="6" stroke-linecap="round"/>')
        eyes = brows + eye(exl, ey, 12) + eye(exr, ey, 12)
        mouth = f'<path d="M{mx-12},{my+2} q12,-6 24,0" fill="none" stroke="{LINE}" stroke-width="5" stroke-linecap="round"/>'
    elif level == 3:
        brows = (f'<path d="M{exl-18},{ey-22} l30,10" stroke="{LINE}" stroke-width="7" stroke-linecap="round"/>'
                 f'<path d="M{exr+18},{ey-22} l-30,10" stroke="{LINE}" stroke-width="7" stroke-linecap="round"/>')
        eyes = brows + eye(exl, ey, 13) + eye(exr, ey, 13)
        mouth = f'<path d="M{mx-16},{my-2} q16,16 32,0" fill="{NOSE}" stroke="{LINE}" stroke-width="4"/>'
    else:
        eyes = (f'<path d="M{exl},{ey} m-13,0 a13,13 0 1,1 26,0 a8,8 0 1,1 -16,0 a4,4 0 1,1 8,0" fill="none" stroke="{LINE}" stroke-width="4"/>'
                f'<path d="M{exr},{ey} m-13,0 a13,13 0 1,1 26,0 a8,8 0 1,1 -16,0 a4,4 0 1,1 8,0" fill="none" stroke="{LINE}" stroke-width="4"/>')
        mouth = f'<ellipse cx="{mx}" cy="{my+4}" rx="14" ry="10" fill="{NOSE}"/>'
    return cheeks + nose + eyes + mouth

# ---------------------------------------------------------------- BUNNY
BUN_BODY, BUN_SHADE, BUN_EARIN, BUN_NOSE = "#F7EAD9", "#EAD7BE", "#F4B8AE", "#C98B9A"

def bunny_defs(cover):
    return (f'<defs><radialGradient id="bh" cx="50%" cy="42%" r="60%">'
            f'<stop offset="60%" stop-color="{BUN_BODY}"/><stop offset="100%" stop-color="{BUN_SHADE}"/>'
            f'</radialGradient>{shared_defs(cover)}</defs>')

def bunny_base():
    return f"""
  <ellipse cx="256" cy="356" rx="112" ry="100" fill="url(#bh)" stroke="{LINE}" stroke-width="5"/>
  <g stroke="{LINE}" stroke-width="5">
    <ellipse cx="222" cy="92" rx="24" ry="80" fill="{BUN_BODY}" transform="rotate(-9 222 92)"/>
    <ellipse cx="292" cy="92" rx="24" ry="80" fill="{BUN_BODY}" transform="rotate(9 292 92)"/>
  </g>
  <ellipse cx="222" cy="96" rx="11" ry="58" fill="{BUN_EARIN}" transform="rotate(-9 222 96)"/>
  <ellipse cx="292" cy="96" rx="11" ry="58" fill="{BUN_EARIN}" transform="rotate(9 292 96)"/>
  <circle cx="256" cy="206" r="90" fill="url(#bh)" stroke="{LINE}" stroke-width="5"/>
  <ellipse cx="256" cy="236" rx="46" ry="34" fill="#FFF8EE"/>
"""

def bunny_face(level):
    cheek = LEVEL_CHEEK[level]
    cheeks = (f'<ellipse cx="198" cy="232" rx="16" ry="10" fill="{cheek}"/>'
              f'<ellipse cx="314" cy="232" rx="16" ry="10" fill="{cheek}"/>')
    # bunny keeps its little Y nose + whisker mouth; eyes/brows come from round_face
    nose = (f'<path d="M256,226 q-9,0 -9,7 q0,7 9,10 q9,-3 9,-10 q0,-7 -9,-7 Z" fill="{BUN_NOSE}"/>'
            f'<path d="M256,243 v6" fill="none" stroke="{LINE}" stroke-width="3.5" stroke-linecap="round"/>')
    return round_face(level, 222, 290, 202, 256, 255, cheeks, nose)

# ---------------------------------------------------------------- DRAGON
DRG_BODY, DRG_SHADE, DRG_BELLY, DRG_HORN, DRG_WING, DRG_SPIKE = "#9FD6BE", "#83C7AB", "#FBF3E0", "#FFE0A8", "#BFA8E8", "#6FC1A0"

def dragon_defs(cover):
    return (f'<defs><radialGradient id="db" cx="50%" cy="40%" r="62%">'
            f'<stop offset="60%" stop-color="{DRG_BODY}"/><stop offset="100%" stop-color="{DRG_SHADE}"/>'
            f'</radialGradient>{shared_defs(cover)}</defs>')

def dragon_base():
    return f"""
  <path d="M348,400 q70,10 70,-60 q0,-30 -26,-30 q22,12 14,40 q-10,34 -58,20 Z" fill="{DRG_BODY}" stroke="{LINE}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M404,318 l20,-6 l-6,20 Z" fill="{DRG_SPIKE}" stroke="{LINE}" stroke-width="3"/>
  <path d="M150,250 q-70,-20 -96,18 q44,-6 64,18 q-30,2 -34,30 q40,-16 72,2 Z" fill="{DRG_WING}" stroke="{LINE}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M362,250 q70,-20 96,18 q-44,-6 -64,18 q30,2 34,30 q-40,-16 -72,2 Z" fill="{DRG_WING}" stroke="{LINE}" stroke-width="4" stroke-linejoin="round"/>
  <ellipse cx="256" cy="352" rx="116" ry="102" fill="url(#db)" stroke="{LINE}" stroke-width="5"/>
  <ellipse cx="256" cy="368" rx="70" ry="80" fill="{DRG_BELLY}"/>
  <g fill="{DRG_SPIKE}" stroke="{LINE}" stroke-width="3" stroke-linejoin="round">
    <path d="M256,118 l-14,26 l28,0 Z"/><path d="M256,150 l-16,28 l32,0 Z"/>
  </g>
  <circle cx="256" cy="208" r="92" fill="url(#db)" stroke="{LINE}" stroke-width="5"/>
  <path d="M206,140 q-10,-40 -30,-52 q26,8 44,40 Z" fill="{DRG_HORN}" stroke="{LINE}" stroke-width="4" stroke-linejoin="round"/>
  <path d="M306,140 q10,-40 30,-52 q-26,8 -44,40 Z" fill="{DRG_HORN}" stroke="{LINE}" stroke-width="4" stroke-linejoin="round"/>
  <ellipse cx="256" cy="240" rx="50" ry="36" fill="{DRG_BELLY}"/>
  <circle cx="240" cy="236" r="3.4" fill="{LINE}"/><circle cx="272" cy="236" r="3.4" fill="{LINE}"/>
"""

def dragon_face(level):
    cheek = LEVEL_CHEEK[level]
    cheeks = (f'<ellipse cx="200" cy="226" rx="15" ry="9" fill="{cheek}" opacity="0.85"/>'
              f'<ellipse cx="312" cy="226" rx="15" ry="9" fill="{cheek}" opacity="0.85"/>')
    return round_face(level, 220, 292, 198, 256, 256, cheeks)

# ---------------------------------------------------------------- OWL (special)
OWL_BODY, OWL_SHADE, OWL_BELLY, OWL_BEAK = "#C9B8E8", "#B7A2DD", "#FBF3E9", "#F2A65A"

def owl_defs(cover):
    return (f'<defs><radialGradient id="ob" cx="50%" cy="38%" r="65%">'
            f'<stop offset="60%" stop-color="{OWL_BODY}"/><stop offset="100%" stop-color="{OWL_SHADE}"/>'
            f'</radialGradient>{shared_defs(cover)}</defs>')

def owl_base():
    # body + wings + belly + glasses frames + white eye discs + beak (no pupils)
    return f"""
  <g stroke="{LINE}" stroke-width="4" fill="{OWL_BEAK}">
    <path d="M214,452 l-12,16 M214,452 l0,18 M214,452 l12,16"/>
    <path d="M298,452 l-12,16 M298,452 l0,18 M298,452 l12,16"/>
  </g>
  <path d="M176,150 l18,-58 l34,30 Z" fill="{OWL_BODY}" stroke="{LINE}" stroke-width="5" stroke-linejoin="round"/>
  <path d="M336,150 l-18,-58 l-34,30 Z" fill="{OWL_BODY}" stroke="{LINE}" stroke-width="5" stroke-linejoin="round"/>
  <ellipse cx="256" cy="288" rx="138" ry="160" fill="url(#ob)" stroke="{LINE}" stroke-width="5"/>
  <path d="M126,250 q-18,70 24,150 q-30,-70 -10,-150 Z" fill="{OWL_SHADE}" stroke="{LINE}" stroke-width="4"/>
  <path d="M386,250 q18,70 -24,150 q30,-70 10,-150 Z" fill="{OWL_SHADE}" stroke="{LINE}" stroke-width="4"/>
  <ellipse cx="256" cy="312" rx="86" ry="118" fill="{OWL_BELLY}"/>
  <circle cx="206" cy="214" r="46" fill="#fff" stroke="{LINE}" stroke-width="4"/>
  <circle cx="306" cy="214" r="46" fill="#fff" stroke="{LINE}" stroke-width="4"/>
"""

def owl_glasses():
    return (f'<g fill="none" stroke="{LINE}" stroke-width="5">'
            f'<circle cx="206" cy="214" r="40"/><circle cx="306" cy="214" r="40"/>'
            f'<line x1="246" y1="210" x2="266" y2="210"/></g>')

def owl_beak():
    return f'<path d="M256,238 l-16,22 l32,0 Z" fill="{OWL_BEAK}" stroke="{LINE}" stroke-width="4" stroke-linejoin="round"/>'

def owl_face(level):
    """Pupils inside the big white eyes + glasses + beak; expression by level."""
    glasses = owl_glasses()
    beak = owl_beak()
    lx, rx, ey = 206, 306, 214
    if level == 0:
        pupils = (f'<circle cx="210" cy="218" r="18" fill="{LINE}"/><circle cx="204" cy="212" r="6" fill="#fff"/>'
                  f'<circle cx="302" cy="218" r="18" fill="{LINE}"/><circle cx="296" cy="212" r="6" fill="#fff"/>')
        extra = ""
    elif level == 1:
        # happy closed arcs across the eyes
        pupils = (f'<path d="M{lx-20},{ey+4} q20,16 40,0" fill="none" stroke="{LINE}" stroke-width="6" stroke-linecap="round"/>'
                  f'<path d="M{rx-20},{ey+4} q20,16 40,0" fill="none" stroke="{LINE}" stroke-width="6" stroke-linecap="round"/>')
        extra = ""
    elif level == 2:
        pupils = (f'<circle cx="210" cy="220" r="16" fill="{LINE}"/><circle cx="204" cy="214" r="5.5" fill="#fff"/>'
                  f'<circle cx="302" cy="220" r="16" fill="{LINE}"/><circle cx="296" cy="214" r="5.5" fill="#fff"/>')
        # determined brows above the glasses
        extra = (f'<path d="M176,168 l44,12" stroke="{LINE}" stroke-width="7" stroke-linecap="round"/>'
                 f'<path d="M336,168 l-44,12" stroke="{LINE}" stroke-width="7" stroke-linecap="round"/>')
    elif level == 3:
        pupils = (f'<circle cx="208" cy="216" r="13" fill="{LINE}"/><circle cx="204" cy="211" r="4.5" fill="#fff"/>'
                  f'<circle cx="304" cy="216" r="13" fill="{LINE}"/><circle cx="300" cy="211" r="4.5" fill="#fff"/>')
        extra = (f'<path d="M174,164 l48,14" stroke="{LINE}" stroke-width="8" stroke-linecap="round"/>'
                 f'<path d="M338,164 l-48,14" stroke="{LINE}" stroke-width="8" stroke-linecap="round"/>')
    else:
        # swirl pupils (overwhelmed master)
        pupils = (f'<path d="M206,214 m-12,0 a12,12 0 1,1 24,0 a7,7 0 1,1 -14,0 a3,3 0 1,1 6,0" fill="none" stroke="{LINE}" stroke-width="4"/>'
                  f'<path d="M306,214 m-12,0 a12,12 0 1,1 24,0 a7,7 0 1,1 -14,0 a3,3 0 1,1 6,0" fill="none" stroke="{LINE}" stroke-width="4"/>')
        extra = ""
    return pupils + glasses + beak + extra

# ---------------------------------------------------------------- assemble
ANIMALS = {
    "dog":    (dog_defs, dog_base, dog_face),
    "bunny":  (bunny_defs, bunny_base, bunny_face),
    "dragon": (dragon_defs, dragon_base, dragon_face),
    "owl":    (owl_defs, owl_base, owl_face),
}

def build(animal, level):
    defs_fn, base_fn, face_fn = ANIMALS[animal]
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {W}" width="{W}" height="{W}">
{defs_fn(BOOKS[level])}
  <g>{back_fx(level)}</g>
  {base_fn()}
  {face_fn(level)}
  {book()}
  <g>{front_fx(level)}</g>
</svg>
"""

def render_preview(out):
    import cairosvg
    from PIL import Image, ImageDraw
    (out / "png").mkdir(exist_ok=True)
    for a in ANIMALS:
        for lvl in range(5):
            cairosvg.svg2png(url=str(out / f"{a}_{lvl}.svg"),
                             write_to=str(out / "png" / f"{a}_{lvl}.png"),
                             output_width=256, output_height=256)
    cell = 180
    rows = list(ANIMALS)
    sheet = Image.new("RGB", (5 * cell + 90, len(rows) * cell + 30), (18, 18, 24))
    d = ImageDraw.Draw(sheet)
    for li in range(5):
        d.text((90 + li * cell + 60, 8), f"L{li}", fill=(200, 200, 200))
    for ri, a in enumerate(rows):
        d.text((8, 30 + ri * cell + cell // 2), a, fill=(220, 220, 220))
        for lvl in range(5):
            im = Image.open(out / "png" / f"{a}_{lvl}.png").convert("RGBA")
            im.thumbnail((cell - 16, cell - 16))
            x = 90 + lvl * cell + (cell - im.width) // 2
            y = 30 + ri * cell + (cell - im.height) // 2
            sheet.paste(im, (x, y), im)
    sheet.save(out / "_all_preview.png")
    print("rendered", out / "_all_preview.png")

def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("tools/mascot_out/all")
    out.mkdir(parents=True, exist_ok=True)
    for a in ANIMALS:
        for lvl in range(5):
            (out / f"{a}_{lvl}.svg").write_text(build(a, lvl), encoding="utf-8")
    print("wrote 20 svgs ->", out)
    render_preview(out)

if __name__ == "__main__":
    main()

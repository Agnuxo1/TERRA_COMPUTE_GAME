from __future__ import annotations

import math
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "assets" / "sprites" / "factions"
SIZE = 256
SCALE = 3
CANVAS = SIZE * SCALE


FILES = {
    "factory": "terra-factory.png",
    "ai-factory": "terra-ai-factory.png",
    "city": "terra-city.png",
    "datacenter": "terra-datacenter.png",
    "defense-bunker": "terra-defense-bunker.png",
    "farm": "terra-farm.png",
    "lab": "terra-lab.png",
    "market": "terra-market.png",
    "power-plant": "terra-power-plant.png",
    "seaport": "terra-seaport.png",
    "truck": "terra-truck.png",
    "university": "terra-university.png",
}


THEMES = {
    "na": {
        "name": "North America",
        "base": (33, 86, 152, 255),
        "dark": (15, 23, 42, 255),
        "accent": (229, 54, 63, 255),
        "gold": (245, 204, 91, 255),
        "light": (169, 219, 255, 255),
        "line": (5, 13, 31, 255),
        "motif": "comic",
    },
    "eu": {
        "name": "Europe",
        "base": (82, 92, 98, 255),
        "dark": (25, 29, 31, 255),
        "accent": (198, 168, 83, 255),
        "gold": (221, 205, 146, 255),
        "light": (158, 173, 181, 255),
        "line": (10, 12, 13, 255),
        "motif": "steel",
    },
    "su": {
        "name": "Soviet Union",
        "base": (146, 30, 27, 255),
        "dark": (34, 30, 27, 255),
        "accent": (222, 172, 75, 255),
        "gold": (236, 194, 95, 255),
        "light": (180, 80, 54, 255),
        "line": (18, 15, 13, 255),
        "motif": "brutalist",
    },
    "cn": {
        "name": "China",
        "base": (162, 35, 32, 255),
        "dark": (35, 24, 20, 255),
        "accent": (238, 181, 65, 255),
        "gold": (252, 215, 94, 255),
        "light": (220, 89, 58, 255),
        "line": (20, 12, 10, 255),
        "motif": "red-gold",
    },
    "af": {
        "name": "Africa",
        "base": (45, 115, 69, 255),
        "dark": (21, 44, 36, 255),
        "accent": (221, 177, 82, 255),
        "gold": (244, 214, 116, 255),
        "light": (116, 198, 123, 255),
        "line": (8, 31, 25, 255),
        "motif": "biotech",
    },
    "sa": {
        "name": "South America",
        "base": (34, 126, 116, 255),
        "dark": (23, 45, 50, 255),
        "accent": (220, 111, 45, 255),
        "gold": (237, 195, 79, 255),
        "light": (108, 207, 185, 255),
        "line": (9, 31, 35, 255),
        "motif": "renewable",
    },
    "in": {
        "name": "India",
        "base": (178, 104, 42, 255),
        "dark": (45, 36, 33, 255),
        "accent": (32, 129, 128, 255),
        "gold": (230, 179, 85, 255),
        "light": (230, 157, 85, 255),
        "line": (25, 21, 18, 255),
        "motif": "dieselpunk",
    },
    "oc": {
        "name": "Oceania",
        "base": (31, 94, 139, 255),
        "dark": (12, 36, 58, 255),
        "accent": (63, 199, 219, 255),
        "gold": (230, 185, 92, 255),
        "light": (114, 213, 234, 255),
        "line": (4, 21, 37, 255),
        "motif": "marine",
    },
}


def s(v: float) -> int:
    return int(round(v * SCALE))


def sc_point(p: tuple[float, float]) -> tuple[int, int]:
    return s(p[0]), s(p[1])


def sc_poly(points: Iterable[tuple[float, float]]) -> list[tuple[int, int]]:
    return [sc_point(p) for p in points]


def rgba(c, a: int | None = None):
    if a is None:
        return c
    return c[:3] + (a,)


def lighten(c, amount=32):
    return tuple(min(255, int(v + amount)) for v in c[:3]) + (c[3],)


def darken(c, amount=32):
    return tuple(max(0, int(v - amount)) for v in c[:3]) + (c[3],)


def new_sprite():
    return Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))


def downsample(img: Image.Image) -> Image.Image:
    return img.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def draw_shadow(d: ImageDraw.ImageDraw):
    d.ellipse([s(34), s(190), s(222), s(234)], fill=(0, 0, 0, 58))


def poly(d, pts, fill, outline=None, width=2):
    d.polygon(sc_poly(pts), fill=fill)
    if outline:
        d.line(sc_poly(pts + [pts[0]]), fill=outline, width=s(width), joint="curve")


def rect(d, box, fill, outline=None, width=2, radius=0):
    xy = [s(box[0]), s(box[1]), s(box[2]), s(box[3])]
    if radius:
        d.rounded_rectangle(xy, radius=s(radius), fill=fill, outline=outline, width=s(width))
    else:
        d.rectangle(xy, fill=fill, outline=outline, width=s(width) if outline else 1)


def line(d, pts, fill, width=2):
    d.line(sc_poly(pts), fill=fill, width=s(width), joint="curve")


def ellipse(d, box, fill, outline=None, width=2):
    d.ellipse([s(box[0]), s(box[1]), s(box[2]), s(box[3])], fill=fill, outline=outline, width=s(width))


def glow(img, center, color, radius=22):
    overlay = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    cx, cy = sc_point(center)
    r = s(radius)
    od.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rgba(color, 72))
    overlay = overlay.filter(ImageFilter.GaussianBlur(s(10)))
    img.alpha_composite(overlay)


def draw_iso_block(d, x, y, w, h, depth, t):
    linec = t["line"]
    top = [(x, y), (x + w, y - 22), (x + w + depth, y), (x + depth, y + 22)]
    left = [(x, y), (x + depth, y + 22), (x + depth, y + h + 22), (x, y + h)]
    right = [(x + depth, y + 22), (x + w + depth, y), (x + w + depth, y + h), (x + depth, y + h + 22)]
    poly(d, left, darken(t["base"], 18), linec, 2)
    poly(d, right, t["base"], linec, 2)
    poly(d, top, lighten(t["base"], 46), linec, 2)


def add_motif(d, t, x=128, y=128):
    m = t["motif"]
    if m == "comic":
        for i in range(7):
            ellipse(d, (20 + i * 18, 28 + (i % 2) * 8, 25 + i * 18, 33 + (i % 2) * 8), t["accent"])
        poly(d, [(190, 42), (198, 58), (216, 60), (203, 72), (206, 90), (190, 80), (174, 90), (177, 72), (164, 60), (182, 58)], t["gold"], t["line"], 1)
    elif m == "steel":
        for i in range(6):
            rect(d, (34 + i * 22, 34, 44 + i * 22, 42), t["accent"], t["line"], 1)
        line(d, [(42, 54), (214, 30)], t["light"], 2)
    elif m == "brutalist":
        poly(d, [(38, 52), (82, 32), (68, 78)], t["accent"], t["line"], 1)
        line(d, [(28, 194), (230, 58)], rgba(t["accent"], 180), 5)
    elif m == "red-gold":
        for i in range(5):
            poly(d, [(190 + i * 5, 48 + i * 10), (214 + i * 4, 58 + i * 10), (190 + i * 5, 68 + i * 10)], t["gold"], t["line"], 1)
    elif m == "biotech":
        for r in (16, 27, 39):
            ellipse(d, (x - r, y - r, x + r, y + r), rgba(t["light"], 25), rgba(t["light"], 90), 1)
        for a in range(0, 360, 60):
            line(d, [(x, y), (x + math.cos(math.radians(a)) * 72, y + math.sin(math.radians(a)) * 42)], rgba(t["light"], 120), 2)
    elif m == "renewable":
        for i in range(3):
            line(d, [(28, 58 + i * 14), (94, 42 + i * 9), (162, 55 + i * 10), (224, 35 + i * 8)], rgba(t["accent"], 160), 3)
    elif m == "dieselpunk":
        for i in range(5):
            rect(d, (36 + i * 24, 42, 47 + i * 24, 70), t["gold"], t["line"], 1, 3)
            ellipse(d, (33 + i * 24, 35, 50 + i * 24, 52), t["light"], t["line"], 1)
    elif m == "marine":
        for i in range(4):
            line(d, [(28, 64 + i * 14), (74, 54 + i * 14), (120, 64 + i * 14), (166, 54 + i * 14), (226, 64 + i * 14)], rgba(t["accent"], 160), 3)


def windows(d, x, y, cols, rows, t, step=15):
    for r in range(rows):
        for c in range(cols):
            rect(d, (x + c * step, y + r * step, x + c * step + 7, y + r * step + 8), rgba(t["light"], 210), t["line"], 0)


def sprite_factory(t, ai=False):
    img = new_sprite()
    d = ImageDraw.Draw(img)
    draw_shadow(d)
    add_motif(d, t, 132, 126)
    if t["motif"] == "biotech":
        for x in (64, 104, 144):
            ellipse(d, (x, 94, x + 54, 156), t["base"], t["line"], 3)
            line(d, [(x + 27, 94), (x + 27, 64)], t["light"], 4)
    elif t["motif"] == "marine":
        rect(d, (52, 132, 200, 185), t["base"], t["line"], 4, 10)
        for x in (70, 122, 174):
            ellipse(d, (x - 15, 104, x + 15, 134), t["accent"], t["line"], 3)
            line(d, [(x, 89), (x, 149)], t["line"], 3)
    else:
        draw_iso_block(d, 52, 110, 126, 64, 34, t)
        for x in (80, 116, 154):
            rect(d, (x, 70, x + 18, 132), darken(t["dark"], 4), t["line"], 2)
            rect(d, (x - 4, 64, x + 22, 76), t["accent"], t["line"], 2)
    if ai:
        glow(img, (144, 112), t["accent"], 40)
        ellipse(d, (105, 88, 169, 152), rgba(t["dark"], 235), t["accent"], 4)
        for a in range(0, 360, 45):
            line(d, [(137, 120), (137 + math.cos(math.radians(a)) * 39, 120 + math.sin(math.radians(a)) * 39)], t["accent"], 2)
        ellipse(d, (124, 107, 150, 133), t["light"], t["line"], 2)
    else:
        windows(d, 82, 134, 5, 2, t, 19)
    return downsample(img)


def sprite_city(t):
    img = new_sprite()
    d = ImageDraw.Draw(img)
    draw_shadow(d)
    add_motif(d, t, 128, 116)
    shapes = [(58, 106, 92, 184), (98, 72, 132, 184), (138, 96, 176, 184), (180, 124, 208, 184)]
    if t["motif"] == "biotech":
        for b in shapes:
            ellipse(d, (b[0] - 4, b[1] - 8, b[2] + 4, b[3]), t["base"], t["line"], 3)
    elif t["motif"] == "dieselpunk":
        for b in shapes:
            rect(d, b, t["base"], t["line"], 3, 8)
            ellipse(d, (b[0] + 5, b[1] - 12, b[2] - 5, b[1] + 10), t["gold"], t["line"], 2)
    elif t["motif"] == "marine":
        for b in shapes:
            poly(d, [(b[0], b[3]), (b[0] + 5, b[1] + 12), ((b[0] + b[2]) / 2, b[1]), (b[2] - 5, b[1] + 12), (b[2], b[3])], t["base"], t["line"], 3)
    else:
        for i, b in enumerate(shapes):
            rect(d, b, t["base"] if i % 2 else darken(t["base"], 20), t["line"], 3)
            if t["motif"] in ("steel", "brutalist"):
                poly(d, [(b[0], b[1]), (b[2], b[1] - 16), (b[2], b[1] + 6), (b[0], b[1] + 20)], lighten(t["base"], 34), t["line"], 2)
    for b in shapes:
        windows(d, b[0] + 8, b[1] + 16, 2, 4, t, 13)
    return downsample(img)


def sprite_datacenter(t):
    img = new_sprite()
    d = ImageDraw.Draw(img)
    draw_shadow(d)
    add_motif(d, t, 128, 128)
    for i, x in enumerate((50, 90, 130, 170)):
        h = 84 + (i % 2) * 18
        if t["motif"] == "marine":
            ellipse(d, (x - 4, 82, x + 38, 82 + h), darken(t["base"], 8), t["line"], 3)
        else:
            rect(d, (x, 92 - i * 5, x + 34, 190), darken(t["base"], 8), t["line"], 3, 4)
        for r in range(5):
            line(d, [(x + 8, 111 + r * 14), (x + 26, 111 + r * 14)], t["accent"] if r % 2 else t["light"], 2)
    glow(img, (128, 140), t["accent"], 52)
    return downsample(img)


def sprite_bunker(t):
    img = new_sprite()
    d = ImageDraw.Draw(img)
    draw_shadow(d)
    add_motif(d, t, 128, 120)
    if t["motif"] == "biotech":
        ellipse(d, (48, 112, 208, 190), t["dark"], t["line"], 4)
        for x in (82, 128, 174):
            ellipse(d, (x - 14, 126, x + 14, 154), t["light"], t["line"], 2)
    elif t["motif"] == "marine":
        poly(d, [(44, 162), (82, 112), (174, 112), (214, 162), (188, 194), (70, 194)], t["dark"], t["line"], 4)
        ellipse(d, (104, 122, 152, 170), t["accent"], t["line"], 3)
    else:
        poly(d, [(42, 162), (76, 104), (180, 104), (216, 162), (196, 190), (62, 190)], t["dark"], t["line"], 4)
        rect(d, (86, 132, 170, 158), t["base"], t["line"], 3)
        for x in (74, 184):
            line(d, [(x, 106), (x + (12 if x < 100 else -12), 78)], t["accent"], 5)
    return downsample(img)


def sprite_farm(t):
    img = new_sprite()
    d = ImageDraw.Draw(img)
    draw_shadow(d)
    add_motif(d, t, 128, 128)
    for i in range(5):
        poly(d, [(36 + i * 30, 178), (66 + i * 30, 154), (96 + i * 30, 178), (66 + i * 30, 202)], lighten(t["base"], i * 5), t["line"], 1)
    if t["motif"] == "biotech":
        for x in (70, 106, 142, 178):
            ellipse(d, (x - 14, 108, x + 22, 156), t["light"], t["line"], 2)
            line(d, [(x + 4, 156), (x + 4, 184)], t["accent"], 4)
    elif t["motif"] == "marine":
        for x in (76, 126, 176):
            ellipse(d, (x - 23, 112, x + 23, 158), rgba(t["accent"], 185), t["line"], 2)
            line(d, [(x - 28, 162), (x + 28, 162)], t["light"], 3)
    else:
        rect(d, (86, 102, 154, 154), t["base"], t["line"], 3)
        poly(d, [(78, 104), (120, 72), (162, 104)], t["accent"], t["line"], 3)
        rect(d, (166, 122, 196, 166), t["gold"], t["line"], 2)
    return downsample(img)


def sprite_lab(t):
    img = new_sprite()
    d = ImageDraw.Draw(img)
    draw_shadow(d)
    add_motif(d, t, 128, 128)
    if t["motif"] == "dieselpunk":
        for x in (82, 126, 170):
            rect(d, (x, 70, x + 22, 172), t["base"], t["line"], 3, 8)
            ellipse(d, (x - 3, 58, x + 25, 86), t["gold"], t["line"], 2)
    elif t["motif"] == "biotech":
        ellipse(d, (58, 86, 198, 180), t["base"], t["line"], 4)
        for x in (92, 128, 164):
            ellipse(d, (x - 16, 108, x + 16, 140), t["light"], t["line"], 2)
    else:
        rect(d, (68, 104, 188, 184), t["base"], t["line"], 4, 6)
        ellipse(d, (88, 52, 168, 132), rgba(t["light"], 145), t["line"], 4)
        line(d, [(128, 52), (128, 184)], t["line"], 3)
        line(d, [(88, 92), (168, 92)], t["line"], 3)
    glow(img, (128, 100), t["light"], 54)
    return downsample(img)


def sprite_market(t):
    img = new_sprite()
    d = ImageDraw.Draw(img)
    draw_shadow(d)
    add_motif(d, t, 128, 128)
    rect(d, (54, 118, 202, 188), t["base"], t["line"], 4, 8)
    if t["motif"] in ("comic", "red-gold", "renewable"):
        for i in range(5):
            poly(d, [(50 + i * 31, 118), (66 + i * 31, 90), (82 + i * 31, 118)], t["accent"] if i % 2 else t["gold"], t["line"], 2)
    elif t["motif"] == "marine":
        poly(d, [(50, 118), (86, 82), (170, 82), (206, 118)], t["accent"], t["line"], 3)
        line(d, [(74, 102), (182, 102)], t["light"], 3)
    else:
        poly(d, [(50, 118), (78, 86), (178, 86), (206, 118)], t["accent"], t["line"], 3)
        for x in (80, 112, 144, 176):
            line(d, [(x, 88), (x - 20, 118)], t["line"], 2)
    windows(d, 76, 136, 5, 2, t, 20)
    return downsample(img)


def sprite_power(t):
    img = new_sprite()
    d = ImageDraw.Draw(img)
    draw_shadow(d)
    add_motif(d, t, 128, 128)
    if t["motif"] == "marine":
        for x in (82, 128, 174):
            ellipse(d, (x - 24, 112, x + 24, 160), t["base"], t["line"], 3)
            line(d, [(x, 88), (x, 182)], t["accent"], 4)
        for y in (130, 150):
            line(d, [(52, y), (204, y)], t["light"], 3)
    elif t["motif"] == "biotech":
        ellipse(d, (70, 82, 186, 178), t["base"], t["line"], 4)
        for a in range(0, 360, 30):
            line(d, [(128, 130), (128 + math.cos(math.radians(a)) * 74, 130 + math.sin(math.radians(a)) * 48)], t["light"], 2)
        ellipse(d, (110, 112, 146, 148), t["accent"], t["line"], 3)
    else:
        rect(d, (54, 132, 204, 188), t["base"], t["line"], 4, 4)
        for x in (82, 128, 174):
            poly(d, [(x - 18, 132), (x - 8, 72), (x + 8, 72), (x + 18, 132)], darken(t["dark"], 2), t["line"], 3)
            ellipse(d, (x - 16, 60, x + 16, 92), rgba(t["accent"], 210), t["line"], 2)
    glow(img, (128, 128), t["accent"], 50)
    return downsample(img)


def sprite_seaport(t):
    img = new_sprite()
    d = ImageDraw.Draw(img)
    draw_shadow(d)
    add_motif(d, t, 128, 128)
    for i in range(4):
        line(d, [(34, 182 + i * 10), (80, 174 + i * 10), (126, 182 + i * 10), (172, 174 + i * 10), (222, 182 + i * 10)], rgba(t["accent"], 180), 3)
    poly(d, [(54, 138), (146, 138), (174, 166), (82, 188)], t["base"], t["line"], 4)
    rect(d, (92, 100, 154, 140), t["dark"], t["line"], 3, 4)
    line(d, [(164, 136), (202, 84), (212, 92), (180, 138)], t["gold"], 5)
    if t["motif"] == "marine":
        ellipse(d, (176, 112, 222, 158), rgba(t["light"], 180), t["line"], 2)
    return downsample(img)


def sprite_truck(t):
    img = new_sprite()
    d = ImageDraw.Draw(img)
    draw_shadow(d)
    add_motif(d, t, 128, 128)
    if t["motif"] == "marine":
        poly(d, [(48, 142), (150, 118), (210, 146), (184, 172), (74, 174)], t["base"], t["line"], 4)
        ellipse(d, (76, 160, 104, 188), t["dark"], t["accent"], 4)
        ellipse(d, (166, 160, 194, 188), t["dark"], t["accent"], 4)
    else:
        rect(d, (46, 126, 148, 170), t["base"], t["line"], 4, 6)
        poly(d, [(148, 138), (178, 112), (208, 126), (208, 170), (148, 170)], t["accent"], t["line"], 4)
        rect(d, (168, 124, 194, 142), t["light"], t["line"], 2)
        for x in (78, 176):
            ellipse(d, (x - 17, 154, x + 17, 188), t["dark"], t["line"], 3)
            ellipse(d, (x - 7, 164, x + 7, 178), t["gold"], t["line"], 1)
    return downsample(img)


def sprite_university(t):
    img = new_sprite()
    d = ImageDraw.Draw(img)
    draw_shadow(d)
    add_motif(d, t, 128, 128)
    if t["motif"] == "biotech":
        ellipse(d, (62, 82, 194, 176), t["base"], t["line"], 4)
        for x in (88, 128, 168):
            line(d, [(x, 102), (x, 182)], t["accent"], 5)
    elif t["motif"] == "marine":
        poly(d, [(54, 146), (128, 82), (202, 146), (182, 182), (74, 182)], t["base"], t["line"], 4)
        ellipse(d, (106, 104, 150, 148), t["light"], t["line"], 3)
    else:
        poly(d, [(46, 116), (128, 66), (210, 116)], t["accent"], t["line"], 4)
        rect(d, (60, 116, 196, 184), t["base"], t["line"], 4)
        for x in (78, 112, 146, 180):
            rect(d, (x, 124, x + 14, 184), t["dark"], t["line"], 2)
        rect(d, (92, 94, 164, 110), t["gold"], t["line"], 2)
    return downsample(img)


DRAWERS = {
    "factory": sprite_factory,
    "ai-factory": lambda t: sprite_factory(t, ai=True),
    "city": sprite_city,
    "datacenter": sprite_datacenter,
    "defense-bunker": sprite_bunker,
    "farm": sprite_farm,
    "lab": sprite_lab,
    "market": sprite_market,
    "power-plant": sprite_power,
    "seaport": sprite_seaport,
    "truck": sprite_truck,
    "university": sprite_university,
}


def main():
    for fid, theme in THEMES.items():
        folder = OUT / fid
        folder.mkdir(parents=True, exist_ok=True)
        for typ, filename in FILES.items():
            sprite = DRAWERS[typ](theme)
            sprite.save(folder / filename)
    print(f"generated {len(THEMES) * len(FILES)} custom sprites in {OUT}")


if __name__ == "__main__":
    main()

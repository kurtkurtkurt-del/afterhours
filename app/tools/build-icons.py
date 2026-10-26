"""afterhours — the app icon, the splash and the favicons, from the logo (components/Logo.tsx).

    python3 tools/build-icons.py        (from app/)

The mark is design 11F "the shared stub" (22.10.2026): a ticket torn in two, the left half
paper, the right half red, each with its notch on the outer edge. The shapes and their
placing are the numbers of components/Logo.tsx (HALF 32 × 40, PLACE in an 84 × 56 box), so
the icon and the app draw the same thing. Pillow cannot read SVG, so the halves are traced
here as polygons and drawn at four times the size, then scaled down.

Writes assets/icon.png, assets/android-icon-{foreground,background,monochrome}.png,
assets/splash-icon.png, assets/favicon.png, public/{favicon,apple-touch-icon,icon-192,icon-512}.png
and public/splash/<w>x<h>@<r>.png, the iPhone start-up images for the PWA (iOS shows a white
screen while a home-screen app loads unless one is linked per screen size; the links are in
public/index.html, SPLASH below is their list). The phone shows a new icon and splash only
after a new build.
"""
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

APP = Path(__file__).resolve().parent.parent
FONT = APP / "assets" / "fonts" / "ArchivoLogo.ttf"
INK = (14, 13, 12)
PAPER = (243, 241, 236)
RED = (215, 38, 30)
SS = 4

# components/Logo.tsx
W, H, R, NOTCH = 32, 40, 3, 5
PLACE = {"left": dict(x=5, y=9, rot=-8, scale=1.0), "right": dict(x=44, y=6, rot=7, scale=1.04)}
BOX = (84, 56)

# iPhone screens, CSS points and pixel ratio: one start-up image each (public/index.html links
# them with the same numbers). Models sharing a size share the image.
SPLASH = [
    (440, 956, 3),  # 16 pro max
    (402, 874, 3),  # 16 pro
    (430, 932, 3),  # 14 / 15 pro max, 15 / 16 plus
    (393, 852, 3),  # 14 pro, 15, 16
    (428, 926, 3),  # 12 / 13 pro max, 14 plus
    (390, 844, 3),  # 12, 13, 14
    (375, 812, 3),  # x, xs, 11 pro, 12 mini, 13 mini
    (414, 896, 3),  # xs max, 11 pro max
    (414, 896, 2),  # xr, 11
    (414, 736, 3),  # 6 / 7 / 8 plus
    (375, 667, 2),  # 6, 7, 8, se 2 and 3
    (320, 568, 2),  # se 1
]


def half(mirror: bool) -> list[tuple[float, float]]:
    """The outline of one half in its own 32 × 40 box, the notch on the left (right if mirrored)."""
    pts = []
    def arc(cx, cy, r, a0, a1, n=10):
        for i in range(n + 1):
            a = math.radians(a0 + (a1 - a0) * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    arc(W - R, R, R, -90, 0)                    # top right corner
    if mirror:
        arc(W, H / 2, NOTCH, -90, -270, 16)     # notch in the right edge, bulging inwards
    arc(W - R, H - R, R, 0, 90)                 # bottom right
    arc(R, H - R, R, 90, 180)                   # bottom left
    if not mirror:
        arc(0, H / 2, NOTCH, 90, -90, 16)       # notch in the left edge, bulging inwards
    arc(R, R, R, 180, 270)                      # top left
    return pts


def placed(mirror: bool, p: dict, k: float, ox: float, oy: float):
    a = math.radians(p["rot"])
    out = []
    for x, y in half(mirror):
        # SVG: translate(x y) rotate(rot 16 20) scale(s)
        x, y = x * p["scale"], y * p["scale"]
        dx, dy = x - 16, y - 20
        x, y = 16 + dx * math.cos(a) - dy * math.sin(a), 20 + dx * math.sin(a) + dy * math.cos(a)
        out.append((ox + (p["x"] + x) * k, oy + (p["y"] + y) * k))
    return out


def mark(img: Image.Image, width: float, cx: float, cy: float, left=PAPER, right=RED):
    k = width / BOX[0]
    ox, oy = cx - width / 2, cy - BOX[1] * k / 2
    d = ImageDraw.Draw(img)
    d.polygon(placed(False, PLACE["left"], k, ox, oy), fill=left)
    d.polygon(placed(True, PLACE["right"], k, ox, oy), fill=right)


def square(size: int, mark_share: float, ground=INK, left=PAPER, right=RED, mode="RGB") -> Image.Image:
    n = size * SS
    img = Image.new(mode, (n, n), ground)
    mark(img, n * mark_share, n / 2, n / 2, left, right)
    return img.resize((size, size), Image.LANCZOS)


def wordmark(size: int) -> Image.Image:
    """The mark and the name side by side, paper on nothing, `size` the letter height in px;
    the image is 1200 × 600 at size 170 and scales with it."""
    n = SS
    font = ImageFont.truetype(str(FONT), size * n)
    word = "afterhours."
    tmp = Image.new("RGBA", (1, 1)); box = ImageDraw.Draw(tmp).textbbox((0, 0), word, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    mh = size * 0.84 * n
    mw = mh * BOX[0] / BOX[1]
    gap = size * 0.32 * n
    W2, H2 = round(1200 * size / 170) * n, round(600 * size / 170) * n
    img = Image.new("RGBA", (W2, H2), (0, 0, 0, 0))
    x0 = (W2 - (mw + gap + tw)) / 2
    mark(img, mw, x0 + mw / 2, H2 / 2)
    ImageDraw.Draw(img).text((x0 + mw + gap - box[0], H2 / 2 - th / 2 - box[1]), word, font=font, fill=PAPER)
    return img.resize((W2 // n, H2 // n), Image.LANCZOS)


def splashes(folder: Path):
    """One start-up image per iPhone size: the wordmark at 56% of the width on the ink ground."""
    folder.mkdir(exist_ok=True)
    for w, h, r in SPLASH:
        W2, H2 = w * r, h * r
        img = Image.new("RGB", (W2, H2), INK)
        wm = wordmark(round(170 * (W2 * 0.56) / 1200))
        img.paste(wm, ((W2 - wm.width) // 2, (H2 - wm.height) // 2), wm)
        img.save(folder / f"{w}x{h}@{r}.png", optimize=True)


def build():
    a = APP / "assets"
    square(1024, 0.62).save(a / "icon.png")
    # Android crops the foreground to its own shape: keep the mark inside the safe circle.
    square(1024, 0.44, ground=(0, 0, 0, 0), mode="RGBA").save(a / "android-icon-foreground.png")
    Image.new("RGB", (1024, 1024), INK).save(a / "android-icon-background.png")
    square(1024, 0.44, ground=(0, 0, 0, 0), left=(255, 255, 255), right=(255, 255, 255), mode="RGBA").save(a / "android-icon-monochrome.png")
    square(96, 0.7).save(a / "favicon.png")

    # The splash: the mark and the name, paper on the ink ground the splash paints.
    wordmark(170).save(a / "splash-icon.png")

    p = APP / "public"
    for name, size in [("favicon.png", 96), ("apple-touch-icon.png", 180), ("icon-192.png", 192), ("icon-512.png", 512)]:
        square(size, 0.62).save(p / name)
    splashes(p / "splash")
    print("icons, splash, favicons and iphone start-up images written")


if __name__ == "__main__":
    build()

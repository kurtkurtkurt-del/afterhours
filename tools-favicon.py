"""afterhours — the favicons and the app-style icons, from the logo set.

The mark is "a." sitting bottom-left in a square, in three grounds so the
three can be told apart on a home screen: the site white (an ink "a", a red
full stop), the web app red (a paper "a", an ink stop), and the phone app ink
(app/assets/icon.png). The large ones also carry their name top-left,
aligned with the mark: website, webapp, app. The tiny sizes drop the dot and centre the
letter, since a 16 px dot is a smear. Type: Archivo at width 62, weight 900,
the static instance the app ships in app/assets/fonts/ArchivoLogo.ttf.

    python3 tools-favicon.py
"""

from PIL import Image, ImageDraw, ImageFont

FONT = "app/assets/fonts/ArchivoLogo.ttf"
INK = (14, 13, 12)
PAPER = (243, 241, 236)
RED = (215, 38, 30)
WHITE = (255, 255, 255)

SITE = (WHITE, INK, RED)   # ground, letter, full stop
PWA = (RED, PAPER, INK)
APP = (INK, PAPER, RED)
TRACK = -0.012  # em, between the "a" and the dot


def render(text, size, fill, dot):
    """draw on a large canvas, crop to the ink: exact bounds, tight tracking"""
    f = ImageFont.truetype(FONT, size)
    im = Image.new("RGBA", (size * (len(text) + 1), size * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = size * 0.2
    for i, ch in enumerate(text):
        d.text((x, size * 0.3), ch, font=f, fill=dot if (ch == "." and i == len(text) - 1) else fill)
        x += f.getlength(ch) + TRACK * size
    return im.crop(im.getbbox())


def fit(glyph, h):
    s = h / glyph.height
    return glyph.resize((max(1, round(glyph.width * s)), max(1, round(glyph.height * s))), Image.LANCZOS)


def mark(size, with_dot, h_frac, left_frac=None, bottom_frac=None, colours=SITE, label=None, clear=False, label_top=None):
    ground, letter, stop = colours
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0) if clear else ground + (255,))
    if label:
        # the name: top-left, on the mark's left edge, as far from the top as the mark from the bottom
        # one scale for every name (fitted on "website"), so "app" is not blown up
        k = size * h_frac * 0.30 / render("website", 600, letter, letter).height
        t = render(label, 600, letter + (255,), letter + (255,))
        t = t.resize((round(t.width * k), round(t.height * k)), Image.LANCZOS)
        top = bottom_frac if label_top is None else label_top
        im.alpha_composite(t, (int(size * left_frac), int(size * top)))
    g = fit(render("a." if with_dot else "a", 600, letter + (255,), stop + (255,)), size * h_frac)
    if left_frac is None:
        pos = ((size - g.width) // 2, (size - g.height) // 2)
    else:
        pos = (int(size * left_frac), int(size * (1 - bottom_frac) - g.height))
    im.alpha_composite(g, pos)
    return im.convert("RGB")


# small: a centred "a", no dot
for s in (16, 32):
    mark(s, False, 0.62).save(f"favicon-{s}.png")
# medium: "a." centred
for s in (48, 64):
    mark(s, True, 0.50).save(f"favicon-{s}.png")
# large: the app icon — "a." bottom-left
mark(180, True, 0.40, 0.12, 0.13, label="website").save("favicon-180.png")
# maskable: keep the mark inside the safe circle (centre 80%)
mark(512, True, 0.30, 0.30, 0.34, label="website", label_top=0.22).save("favicon-512.png")
print("favicons: 16 32 48 64 180 512")

# the web app (app/public, published by app/tools/publish-pwa.sh)
mark(180, True, 0.40, 0.12, 0.13, PWA, "webapp").save("app/public/apple-touch-icon.png")
mark(192, True, 0.30, 0.30, 0.34, PWA, "webapp", label_top=0.22).save("app/public/icon-192.png")
mark(512, True, 0.30, 0.30, 0.34, PWA, "webapp", label_top=0.22).save("app/public/icon-512.png")
mark(48, True, 0.50, colours=PWA).save("app/public/favicon.png")
print("web app: 180 192 512 48")

# the phone app: the iOS icon, and Android's adaptive foreground (kept inside the safe circle)
mark(1024, True, 0.40, 0.12, 0.13, APP, "app").save("app/assets/icon.png")
mark(1024, True, 0.30, 0.30, 0.34, APP, "app", clear=True, label_top=0.22).save("app/assets/android-icon-foreground.png")
print("app: icon, android foreground")

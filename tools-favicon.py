"""afterhours — the favicons and the app-style icons, from the logo set.

The mark is "a." — a paper "a" with a red full stop, sitting bottom-left in
an ink square (the app icon). The tiny sizes drop the dot and centre the
letter, since a 16 px dot is a smear. Type: Archivo at width 62, weight 900,
the static instance the app ships in app/assets/fonts/ArchivoLogo.ttf.

    python3 tools-favicon.py
"""

from PIL import Image, ImageDraw, ImageFont

FONT = "app/assets/fonts/ArchivoLogo.ttf"
INK = (14, 13, 12)
PAPER = (243, 241, 236)
RED = (215, 38, 30)
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


def mark(size, with_dot, h_frac, left_frac=None, bottom_frac=None):
    im = Image.new("RGBA", (size, size), INK + (255,))
    g = fit(render("a." if with_dot else "a", 600, PAPER + (255,), RED + (255,)), size * h_frac)
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
mark(180, True, 0.40, 0.12, 0.13).save("favicon-180.png")
# maskable: keep the mark inside the safe circle (centre 80%)
mark(512, True, 0.30, 0.30, 0.34).save("favicon-512.png")
print("favicons: 16 32 48 64 180 512")

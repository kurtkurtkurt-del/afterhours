"""The city labels: a small library of scenes and landmarks, drawn with Pillow.

Every label is the same frame (Munich's "föhn" of 22.10.2026): a sky, a scene in the lower
part, the city's name above it. The label is 400 × 400 units; the cover hides about its
left quarter, so names are centred at x 240 and landmarks stand between x 230 and 350,
clear of the name (y < 160) and of the hole (200, 200). A city is a spec in cities.json:
a scene, a palette, a landmark and a seed; the same spec always draws the same label.
"""
import math
import random

from PIL import Image, ImageDraw, ImageFilter

Color = tuple


def mix(a: Color, b: Color, t: float) -> Color:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def hexc(h: str) -> Color:
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


class Canvas:
    """A label being drawn, in 400-unit coordinates."""

    def __init__(self, px: int):
        self.px = px
        self.k = px / 400
        self.img = Image.new("RGBA", (px, px), (0, 0, 0, 255))
        self.d = ImageDraw.Draw(self.img)

    def P(self, pts):
        return [(x * self.k, y * self.k) for x, y in pts]

    def poly(self, pts, fill):
        self.d.polygon(self.P(pts), fill=fill)

    def rect(self, x0, y0, x1, y1, fill):
        # Pillow wants the corners ordered; a shape drawn "upwards" is still a rectangle
        x0, x1 = sorted((x0, x1)); y0, y1 = sorted((y0, y1))
        self.d.rectangle([x0 * self.k, y0 * self.k, x1 * self.k, y1 * self.k], fill=fill)

    def ellipse(self, cx, cy, rx, ry, fill=None, outline=None, width=1):
        rx, ry = abs(rx), abs(ry)
        self.d.ellipse([(cx - rx) * self.k, (cy - ry) * self.k, (cx + rx) * self.k, (cy + ry) * self.k],
                       fill=fill, outline=outline, width=max(1, round(width * self.k)))

    def line(self, pts, fill, w=1.0):
        self.d.line(self.P(pts), fill=fill, width=max(1, round(w * self.k)), joint="curve")

    def pieslice(self, cx, cy, r, a0, a1, fill):
        self.d.pieslice([(cx - r) * self.k, (cy - r) * self.k, (cx + r) * self.k, (cy + r) * self.k], a0, a1, fill=fill)

    def vgrad(self, stops, y0=0, y1=400):
        """Vertical gradient over the whole width; stops: [(t 0–1, color), …]."""
        a, b = round(y0 * self.k), round(y1 * self.k)
        for y in range(a, b):
            t = (y - a) / max(1, b - a - 1)
            for i in range(len(stops) - 1):
                t0, c0 = stops[i]
                t1, c1 = stops[i + 1]
                if t0 <= t <= t1:
                    c = mix(c0, c1, (t - t0) / max(1e-6, t1 - t0))
                    break
            else:
                c = stops[-1][1]
            self.d.line([(0, y), (self.px, y)], fill=c + (255,))

    def layer(self):
        lay = Image.new("RGBA", (self.px, self.px), (0, 0, 0, 0))
        return lay, ImageDraw.Draw(lay)

    def put(self, lay, blur=0.0, opacity=1.0):
        if blur:
            lay = lay.filter(ImageFilter.GaussianBlur(blur * self.k))
        if opacity < 1:
            a = lay.getchannel("A").point(lambda v: round(v * opacity))
            lay.putalpha(a)
        self.img.alpha_composite(lay)


# ---------------------------------------------------------------- shapes

def ridge(base, amp, peaks, jag, seed, step=4, width=400):
    r = random.Random(seed)
    pk = [(r.uniform(0, width), r.uniform(0.45, 1.0) * amp, r.uniform(28, 70)) for _ in range(peaks)]
    pts = []
    for x in range(0, width + step, step):
        y = 0
        for px, a, sw in pk:
            d = abs(x - px) / sw
            y = max(y, a * max(0, 1 - d) ** 1.15)
        y += r.uniform(-jag, jag)
        pts.append((x, base - y))
    return pts


def fill_below(c: Canvas, pts, fill):
    c.poly([(0, 400)] + pts + [(400, 400)], fill)


def water(c: Canvas, top, colors, rng, streaks=None):
    c.vgrad([(0, colors[0]), (1, colors[1])], top, 400)
    lay, d = c.layer()
    col = streaks or mix(colors[0], (255, 255, 255), 0.45)
    for i in range(26):
        y = top + 4 + (i ** 1.35) * 1.7
        if y > 392:
            break
        x = rng.uniform(40, 360)
        w = rng.uniform(14, 46) * (0.5 + i / 30)
        d.line([((x - w / 2) * c.k, y * c.k), ((x + w / 2) * c.k, y * c.k)], fill=col + (150,), width=max(1, round(1.1 * c.k)))
    c.put(lay)


def sun(c: Canvas, x, y, r, color, glow=True, stripes=0, horizon=None):
    if glow:
        lay, d = c.layer()
        d.ellipse([(x - r * 2.4) * c.k, (y - r * 2.4) * c.k, (x + r * 2.4) * c.k, (y + r * 2.4) * c.k], fill=color + (90,))
        c.put(lay, blur=r * 0.9)
    lay, d = c.layer()
    d.ellipse([(x - r) * c.k, (y - r) * c.k, (x + r) * c.k, (y + r) * c.k], fill=color + (255,))
    if stripes:
        # retro sun: bands cut out of its lower half, thinner towards the top
        for i in range(stripes):
            yy = y + r * (0.15 + i * 0.22)
            h = r * (0.04 + i * 0.035)
            d.rectangle([(x - r) * c.k, yy * c.k, (x + r) * c.k, (yy + h) * c.k], fill=(0, 0, 0, 0))
    if horizon is not None:
        d.rectangle([0, horizon * c.k, c.px, c.px], fill=(0, 0, 0, 0))
    c.put(lay)


def stars(c: Canvas, rng, n=40, top=0, bottom=200, color=(255, 255, 255)):
    for _ in range(n):
        x, y = rng.uniform(0, 400), rng.uniform(top, bottom)
        r = rng.choice([0.6, 0.8, 1.0, 1.3])
        c.ellipse(x, y, r, r, fill=color + (rng.randint(120, 255),))


def windows(c: Canvas, rng, x0, x1, y0, y1, color, density=0.25, size=2.2):
    y = y0 + 4
    while y < y1 - 3:
        x = x0 + 3
        while x < x1 - 3:
            if rng.random() < density:
                c.rect(x, y, x + size, y + size * 1.3, color + (255,))
            x += size * 2.2
        y += size * 2.6


def buildings(c: Canvas, rng, base, color, hmin, hmax, wmin=10, wmax=26, lit=None, density=0.2, x0=0, x1=400):
    x = x0 - rng.uniform(0, 10)
    while x < x1:
        w = rng.uniform(wmin, wmax)
        h = rng.uniform(hmin, hmax)
        c.rect(x, base - h, x + w, base, color + (255,))
        if rng.random() < 0.25:   # a stepped top now and then
            c.rect(x + w * 0.25, base - h - h * 0.12, x + w * 0.75, base - h, color + (255,))
        if lit:
            windows(c, rng, x, x + w, base - h, base, lit, density)
        x += w + rng.uniform(-2, 1.5)


def palm(c: Canvas, x, base, h, color, lean=1):
    pts = []
    for i in range(11):
        t = i / 10
        pts.append((x + lean * 10 * t * t, base - h * t))
    for i in range(len(pts) - 1):
        w = 3.0 - 1.6 * i / 10
        c.line([pts[i], pts[i + 1]], color + (255,), w)
    tx, ty = pts[-1]
    for ang, ln in [(-160, 26), (-130, 24), (-95, 18), (-60, 24), (-25, 26), (10, 20), (160 + 25, 20)]:
        a = math.radians(ang)
        ex, ey = tx + math.cos(a) * ln, ty + math.sin(a) * ln * 0.6 + ln * 0.25
        mx, my = tx + math.cos(a) * ln * 0.5, ty + math.sin(a) * ln * 0.5 - 4
        frond = [(tx, ty), (mx, my - 2.5), (ex, ey), (mx, my + 2.5)]
        c.poly(frond, color + (255,))


def pine(c: Canvas, x, base, h, color):
    for i in range(3):
        w = h * (0.42 - i * 0.1)
        top = base - h * (0.45 + i * 0.25)
        c.poly([(x - w, base - h * i * 0.22), (x, top - h * 0.15), (x + w, base - h * i * 0.22)], color + (255,))
    c.rect(x - 1, base - 3, x + 1, base + 2, color + (255,))


def gables(c: Canvas, rng, base, x0, x1, palette, style="bell", hmin=34, hmax=56, wmin=13, wmax=19, outline=None):
    x = x0
    while x < x1:
        w = rng.uniform(wmin, wmax)
        h = rng.uniform(hmin, hmax)
        col = rng.choice(palette)
        top = base - h
        c.rect(x, top, x + w, base, col + (255,))
        cx = x + w / 2
        if style == "step":
            s = w / 6
            pts = [(x, top), (x, top - s), (x + s, top - s), (x + s, top - 2 * s), (x + 2 * s, top - 2 * s), (x + 2 * s, top - 3 * s),
                   (x + 4 * s, top - 3 * s), (x + 4 * s, top - 2 * s), (x + 5 * s, top - 2 * s), (x + 5 * s, top - s), (x + w, top - s), (x + w, top)]
        elif style == "pointed":
            pts = [(x, top), (cx, top - w * 0.8), (x + w, top)]
        else:  # bell
            pts = [(x, top), (x + w * 0.12, top - w * 0.25), (x + w * 0.25, top - w * 0.35), (x + w * 0.3, top - w * 0.7), (x + w * 0.7, top - w * 0.7),
                   (x + w * 0.75, top - w * 0.35), (x + w * 0.88, top - w * 0.25), (x + w, top)]
        c.poly(pts, col + (255,))
        win = mix(col, (255, 255, 255), 0.65)
        for row in range(int(h // 11)):
            for col_i in range(2):
                wx = x + w * (0.22 + col_i * 0.38)
                wy = top + 5 + row * 11
                if wy < base - 6:
                    c.rect(wx, wy, wx + w * 0.2, wy + 5, win + (255,))
        if outline:
            c.line([(x, base), (x, top)], outline + (255,), 0.6)
        x += w


# ---------------------------------------------------------------- landmarks

def lm_needle(c, x, base, h, col, pod="disc", top=0.72, antenna=0.18):
    sw = h * 0.035
    c.poly([(x - sw * 1.8, base), (x - sw * 0.7, base - h * top), (x + sw * 0.7, base - h * top), (x + sw * 1.8, base)], col + (255,))
    py = base - h * top
    if pod == "sphere":
        c.ellipse(x, py - h * 0.04, h * 0.075, h * 0.075, fill=col + (255,))
    elif pod == "ring":
        c.poly([(x - h * 0.09, py), (x - h * 0.07, py - h * 0.06), (x + h * 0.07, py - h * 0.06), (x + h * 0.09, py)], col + (255,))
    elif pod == "pod":
        c.ellipse(x, py - h * 0.03, h * 0.06, h * 0.045, fill=col + (255,))
        c.ellipse(x, py - h * 0.12, h * 0.03, h * 0.02, fill=col + (255,))
    else:  # disc (space needle)
        c.poly([(x - h * 0.13, py - h * 0.02), (x - h * 0.05, py - h * 0.07), (x + h * 0.05, py - h * 0.07), (x + h * 0.13, py - h * 0.02), (x + h * 0.04, py + h * 0.01), (x - h * 0.04, py + h * 0.01)], col + (255,))
    c.rect(x - sw * 0.35, base - h, x + sw * 0.35, py - h * 0.05, col + (255,))
    if antenna:
        c.rect(x - sw * 0.2, base - h - h * antenna * 0.3, x + sw * 0.2, base - h, col + (255,))


def lm_tv(c, x, base, h, col):   # Berlin, Fernsehturm
    lm_needle(c, x, base, h, col, pod="sphere", top=0.66, antenna=0.4)


def lm_spires(c, x, base, h, col, n=2, gap=None, cone=False):
    w = h * 0.16
    gap = gap if gap is not None else h * 0.32
    xs = [x + (i - (n - 1) / 2) * gap for i in range(n)]
    c.rect(xs[0] - w * 0.6, base - h * 0.45, xs[-1] + w * 0.6, base, col + (255,))       # the nave
    for sx in xs:
        c.rect(sx - w / 2, base - h * 0.62, sx + w / 2, base, col + (255,))
        if cone:
            c.poly([(sx - w * 0.55, base - h * 0.62), (sx, base - h), (sx + w * 0.55, base - h * 0.62)], col + (255,))
        else:
            c.poly([(sx - w * 0.5, base - h * 0.62), (sx - w * 0.12, base - h * 0.96), (sx, base - h), (sx + w * 0.12, base - h * 0.96), (sx + w * 0.5, base - h * 0.62)], col + (255,))
            for side in (-1, 1):
                c.poly([(sx + side * w * 0.5, base - h * 0.62), (sx + side * w * 0.42, base - h * 0.72), (sx + side * w * 0.34, base - h * 0.62)], col + (255,))


def lm_mosque(c, x, base, h, col, minarets=4, small_domes=2):
    dome_r = h * 0.22
    body_w = h * 0.7
    c.rect(x - body_w / 2, base - h * 0.28, x + body_w / 2, base, col + (255,))
    c.rect(x - dome_r * 1.05, base - h * 0.4, x + dome_r * 1.05, base - h * 0.26, col + (255,))
    c.pieslice(x, base - h * 0.4, dome_r, 180, 360, col + (255,))
    c.rect(x - 1, base - h * 0.4 - dome_r - h * 0.06, x + 1, base - h * 0.4 - dome_r, col + (255,))
    for s in (-1, 1):
        for i in range(small_domes):
            cx = x + s * (dome_r * 1.35 + i * h * 0.14)
            c.pieslice(cx, base - h * 0.28, h * 0.08, 180, 360, col + (255,))
    mw = h * 0.035
    positions = [-0.52, -0.42, 0.42, 0.52][:minarets] if minarets == 4 else [-0.5, 0.5]
    for p in positions:
        mx = x + p * h
        mh = h * (0.95 if abs(p) > 0.45 else 0.85)
        c.rect(mx - mw, base - mh, mx + mw, base, col + (255,))
        c.poly([(mx - mw * 1.3, base - mh), (mx, base - mh - h * 0.12), (mx + mw * 1.3, base - mh)], col + (255,))
        for b in (0.55, 0.75):
            c.rect(mx - mw * 1.8, base - mh * b - 1, mx + mw * 1.8, base - mh * b + 1, col + (255,))


def lm_lattice(c, x, base, h, col, decks=(0.25, 0.52), foot=0.32):
    pts_l, pts_r = [], []
    for i in range(21):
        t = i / 20
        half = h * foot * (1 - t) ** 2.1 + h * 0.012
        pts_l.append((x - half, base - h * 0.88 * t))
        pts_r.append((x + half, base - h * 0.88 * t))
    c.poly(pts_l + list(reversed(pts_r)), col + (255,))
    # the arch between the legs
    c.pieslice(x, base, h * foot * 0.62, 180, 360, (0, 0, 0, 0))
    for dk in decks:
        t = dk / 0.88
        half = h * foot * (1 - t) ** 2.1 + h * 0.03
        c.rect(x - half * 1.15, base - h * dk - h * 0.012, x + half * 1.15, base - h * dk + h * 0.012, col + (255,))
    c.rect(x - h * 0.006, base - h, x + h * 0.006, base - h * 0.86, col + (255,))


def lm_clock(c, x, base, h, col, face=(250, 240, 210), spire=True, w=None):
    w = w or h * 0.17
    c.rect(x - w / 2, base - h * 0.72, x + w / 2, base, col + (255,))
    c.rect(x - w * 0.62, base - h * 0.74, x + w * 0.62, base - h * 0.7, col + (255,))
    c.ellipse(x, base - h * 0.62, w * 0.32, w * 0.32, fill=face + (255,))
    c.line([(x, base - h * 0.62), (x, base - h * 0.62 - w * 0.22)], col + (255,), 0.8)
    c.line([(x, base - h * 0.62), (x + w * 0.15, base - h * 0.62)], col + (255,), 0.8)
    if spire:
        c.poly([(x - w * 0.55, base - h * 0.74), (x, base - h), (x + w * 0.55, base - h * 0.74)], col + (255,))
    else:
        c.rect(x - w * 0.4, base - h * 0.86, x + w * 0.4, base - h * 0.74, col + (255,))


def lm_stepped(c, x, base, h, col, steps=5, w=None, spire=0.12, lit=None, rng=None):
    w = w or h * 0.3
    y = base
    for i in range(steps):
        sh = (h * (1 - spire)) / steps * (1.4 if i == 0 else 1)
        ww = w * (1 - i * 0.16)
        c.rect(x - ww / 2, y - sh, x + ww / 2, y, col + (255,))
        if lit and rng:
            windows(c, rng, x - ww / 2, x + ww / 2, y - sh, y, lit, 0.3, 1.6)
        y -= sh
    c.rect(x - 0.8, base - h, x + 0.8, y, col + (255,))


def lm_burj(c, x, base, h, col):
    pts_l, pts_r = [], []
    steps = 9
    for i in range(steps + 1):
        t = i / steps
        half = h * 0.1 * (1 - t) ** 1.3 + 0.6
        y = base - h * 0.9 * t
        pts_l += [(x - half, y), (x - half, y - h * 0.9 / steps * 0.6)]
        pts_r += [(x + half * 0.8, y), (x + half * 0.8, y - h * 0.9 / steps * 0.6)]
    c.poly(pts_l + list(reversed(pts_r)), col + (255,))
    c.rect(x - 0.6, base - h, x + 0.6, base - h * 0.88, col + (255,))


def lm_obelisk(c, x, base, h, col):
    c.poly([(x - h * 0.05, base), (x - h * 0.035, base - h * 0.93), (x, base - h), (x + h * 0.035, base - h * 0.93), (x + h * 0.05, base)], col + (255,))


def lm_ferris(c, x, base, r, col, cabins=None):
    cy = base - r * 1.15
    c.ellipse(x, cy, r, r, outline=col + (255,), width=1.6)
    c.ellipse(x, cy, r * 0.92, r * 0.92, outline=col + (255,), width=0.6)
    for i in range(16):
        a = 2 * math.pi * i / 16
        c.line([(x, cy), (x + r * math.cos(a), cy + r * math.sin(a))], col + (255,), 0.5)
        if cabins:
            c.ellipse(x + r * math.cos(a), cy + r * math.sin(a), r * 0.07, r * 0.07, fill=cabins + (255,))
    c.poly([(x - r * 0.5, base), (x - 1, cy), (x + 1, cy), (x + r * 0.5, base)], (0, 0, 0, 0))
    c.line([(x - r * 0.55, base), (x, cy), (x + r * 0.55, base)], col + (255,), 1.6)
    c.ellipse(x, cy, r * 0.08, r * 0.08, fill=col + (255,))


def lm_atomium(c, x, base, h, col, shine=(230, 236, 245)):
    s = h * 0.3
    cy = base - h * 0.6
    pts = [(0, -1.2), (-1, -0.6), (1, -0.6), (0, 0), (-1, 0.6), (1, 0.6), (0, 1.2), (-0.55, -0.1), (0.55, 0.1)]
    P = [(x + px * s, cy + py * s) for px, py in pts]
    for a, b in [(0, 1), (0, 2), (1, 3), (2, 3), (3, 4), (3, 5), (4, 6), (5, 6), (0, 3), (3, 6), (1, 4), (2, 5)]:
        c.line([P[a], P[b]], col + (255,), 1.3)
    c.line([(x, base), P[6]], col + (255,), 2)
    c.poly([(x - s * 0.9, base), (x - s * 0.5, P[4][1]), (x - s * 0.35, P[4][1]), (x - s * 0.7, base)], col + (255,))
    c.poly([(x + s * 0.9, base), (x + s * 0.5, P[5][1]), (x + s * 0.35, P[5][1]), (x + s * 0.7, base)], col + (255,))
    for px, py in P:
        c.ellipse(px, py, s * 0.24, s * 0.24, fill=col + (255,))
        c.ellipse(px - s * 0.07, py - s * 0.07, s * 0.08, s * 0.08, fill=shine + (220,))


def lm_colosseum(c, x, base, h, col, light):
    w = h * 1.5
    c.poly([(x - w / 2, base), (x - w / 2, base - h * 0.55), (x - w * 0.1, base - h * 0.62), (x + w * 0.25, base - h * 0.6), (x + w / 2, base - h * 0.4), (x + w / 2, base)], col + (255,))
    for tier, (y0, y1) in enumerate([(0.06, 0.2), (0.24, 0.38), (0.42, 0.52)]):
        n = 9
        for i in range(n):
            ax = x - w / 2 + w * (i + 0.5) / n
            top = base - h * y1
            if top < base - h * (0.62 if ax < x + w * 0.25 else 0.4) + 4:
                continue
            c.rect(ax - w / n * 0.28, base - h * y1, ax + w / n * 0.28, base - h * y0, light + (255,))
            c.pieslice(ax, base - h * y1, w / n * 0.28, 180, 360, light + (255,))


def lm_temple(c, x, base, h, col, hill):
    c.poly([(x - h * 1.6, base + 2), (x - h * 0.8, base - h * 0.18), (x + h * 0.9, base - h * 0.2), (x + h * 1.7, base + 2)], hill + (255,))
    b = base - h * 0.2
    w = h * 1.1
    c.rect(x - w / 2, b - h * 0.05, x + w / 2, b, col + (255,))
    for i in range(8):
        cx = x - w / 2 + w * (i + 0.5) / 8
        c.rect(cx - w * 0.025, b - h * 0.4, cx + w * 0.025, b - h * 0.05, col + (255,))
    c.rect(x - w / 2, b - h * 0.47, x + w / 2, b - h * 0.4, col + (255,))
    c.poly([(x - w / 2, b - h * 0.47), (x, b - h * 0.62), (x + w / 2, b - h * 0.47)], col + (255,))


def lm_castle(c, x, base, h, col, roof):   # Osaka: stacked roofs on a stone base
    c.poly([(x - h * 0.42, base), (x - h * 0.34, base - h * 0.28), (x + h * 0.34, base - h * 0.28), (x + h * 0.42, base)], col + (255,))
    y = base - h * 0.28
    w = h * 0.52
    for i in range(4):
        sh = h * 0.14
        c.rect(x - w * 0.42, y - sh, x + w * 0.42, y, mix(col, (255, 255, 255), 0.75) + (255,))
        c.poly([(x - w * 0.62, y - sh * 0.15), (x - w * 0.42, y - sh * 0.6), (x + w * 0.42, y - sh * 0.6), (x + w * 0.62, y - sh * 0.15)], roof + (255,))
        y -= sh
        w *= 0.8
    c.poly([(x - w * 0.6, y), (x, y - h * 0.08), (x + w * 0.6, y)], roof + (255,))


def lm_fortress(c, x, base, h, col, hill):
    c.poly([(x - h * 1.5, base + 2), (x - h * 0.6, base - h * 0.35), (x + h * 0.7, base - h * 0.38), (x + h * 1.6, base + 2)], hill + (255,))
    b = base - h * 0.34
    c.rect(x - h * 0.6, b - h * 0.22, x + h * 0.65, b + 4, col + (255,))
    for i in range(9):
        cx = x - h * 0.6 + i * h * 0.155
        c.rect(cx, b - h * 0.26, cx + h * 0.07, b - h * 0.22, col + (255,))
    c.rect(x - h * 0.1, b - h * 0.48, x + h * 0.08, b - h * 0.2, col + (255,))
    c.poly([(x - h * 0.13, b - h * 0.48), (x - h * 0.01, b - h * 0.62), (x + h * 0.11, b - h * 0.48)], col + (255,))
    c.rect(x + h * 0.3, b - h * 0.38, x + h * 0.42, b - h * 0.2, col + (255,))


def lm_dome_church(c, x, base, h, col, dome=None, small=False, hill=None, statue=None):
    if hill:
        c.poly([(x - h * 1.4, base + 2), (x - h * 0.5, base - h * 0.3), (x + h * 0.6, base - h * 0.32), (x + h * 1.5, base + 2)], hill + (255,))
        base = base - h * 0.3
    dome = dome or col
    w = h * 0.7
    c.rect(x - w / 2, base - h * 0.3, x + w / 2, base, col + (255,))
    for i in range(6):
        cx = x - w / 2 + w * (i + 0.5) / 6
        c.rect(cx - 1, base - h * 0.27, cx + 1, base - h * 0.04, mix(col, (0, 0, 0), 0.25) + (255,))
    c.poly([(x - w / 2, base - h * 0.3), (x, base - h * 0.4), (x + w / 2, base - h * 0.3)], col + (255,))
    c.rect(x - h * 0.15, base - h * 0.55, x + h * 0.15, base - h * 0.34, col + (255,))
    c.pieslice(x, base - h * 0.55, h * 0.17, 180, 360, dome + (255,))
    c.rect(x - h * 0.03, base - h * 0.84, x + h * 0.03, base - h * 0.7, col + (255,))
    if small:
        for s in (-1, 1):
            c.pieslice(x + s * w * 0.42, base - h * 0.32, h * 0.07, 180, 360, dome + (255,))
    if statue:
        c.ellipse(x, base - h * 0.9, h * 0.03, h * 0.05, fill=statue + (255,))


def lm_round_tower(c, x, base, h, col):
    w = h * 0.36
    c.rect(x - w / 2, base - h * 0.8, x + w / 2, base, col + (255,))
    for i in range(5):
        cx = x - w / 2 + i * w / 4.5
        c.rect(cx, base - h * 0.86, cx + w / 9, base - h * 0.8, col + (255,))
    c.rect(x - w * 0.2, base - h, x + w * 0.2, base - h * 0.84, col + (255,))
    for row in (0.3, 0.55):
        c.rect(x - 1.5, base - h * row - 3, x + 1.5, base - h * row + 3, mix(col, (0, 0, 0), 0.4) + (255,))


def lm_twisted(c, x, base, h, col):
    for i in range(9):
        sh = h / 9
        off = math.sin(i / 8 * math.pi * 0.9) * h * 0.06
        c.rect(x - h * 0.06 + off, base - (i + 1) * sh + 0.6, x + h * 0.06 + off, base - i * sh, col + (255,))


def lm_wave_roof(c, x, base, h, col, glass):   # Elbphilharmonie
    w = h * 1.1
    c.rect(x - w / 2, base - h * 0.42, x + w / 2, base, col + (255,))
    pts = [(x - w / 2, base - h * 0.42)]
    for i in range(21):
        t = i / 20
        pts.append((x - w / 2 + w * t, base - h * 0.75 - math.sin(t * math.pi * 3) * h * 0.1 - t * h * 0.05))
    pts.append((x + w / 2, base - h * 0.42))
    c.poly(pts, glass + (255,))
    for i in range(6):
        c.line([(x - w / 2 + 3, base - h * (0.47 + i * 0.045)), (x + w / 2 - 3, base - h * (0.47 + i * 0.045))], mix(glass, (255, 255, 255), 0.4) + (255,), 0.5)


def lm_rocket(c, x, base, h, col, flame=(255, 170, 60)):
    w = h * 0.1
    c.rect(x - w, base - h * 0.75, x + w, base - h * 0.1, col + (255,))
    c.poly([(x - w, base - h * 0.75), (x, base - h), (x + w, base - h * 0.75)], col + (255,))
    for s in (-1, 1):
        c.poly([(x + s * w, base - h * 0.3), (x + s * w * 2.4, base - h * 0.08), (x + s * w, base - h * 0.12)], col + (255,))
    c.poly([(x - w * 0.7, base - h * 0.1), (x, base + h * 0.05), (x + w * 0.7, base - h * 0.1)], flame + (255,))


def lm_fountain(c, x, base, h, col):
    lay, d = c.layer()
    pts = []
    for i in range(30):
        t = i / 29
        pts.append(((x - (1 - t) * h * 0.035 - t * h * 0.06) * c.k, (base - h * t) * c.k))
    pts2 = [((x + (1 - t) * h * 0.035 + t * h * 0.11) * c.k, (base - h * t * 0.97) * c.k) for t in [i / 29 for i in range(30)]]
    d.polygon(pts + list(reversed(pts2)), fill=col + (230,))
    d.ellipse([(x - h * 0.08) * c.k, (base - h * 1.04) * c.k, (x + h * 0.16) * c.k, (base - h * 0.9) * c.k], fill=col + (200,))
    c.put(lay, blur=0.8)


def lm_column_angel(c, x, base, h, col, gold):
    c.rect(x - h * 0.12, base - h * 0.1, x + h * 0.12, base, col + (255,))
    c.poly([(x - h * 0.04, base - h * 0.1), (x - h * 0.03, base - h * 0.82), (x + h * 0.03, base - h * 0.82), (x + h * 0.04, base - h * 0.1)], col + (255,))
    c.rect(x - h * 0.05, base - h * 0.85, x + h * 0.05, base - h * 0.82, col + (255,))
    c.poly([(x - h * 0.03, base - h * 0.86), (x, base - h * 0.99), (x + h * 0.03, base - h * 0.86)], gold + (255,))
    c.poly([(x, base - h * 0.95), (x - h * 0.09, base - h * 1.0), (x - h * 0.02, base - h * 0.9)], gold + (255,))
    c.poly([(x, base - h * 0.95), (x + h * 0.09, base - h * 1.0), (x + h * 0.02, base - h * 0.9)], gold + (255,))


def lm_marina(c, x, base, h, col):
    tw = h * 0.12
    for i in (-1, 0, 1):
        tx = x + i * h * 0.24
        c.poly([(tx - tw, base), (tx - tw * 0.8, base - h * 0.78), (tx + tw * 0.8, base - h * 0.78), (tx + tw, base)], col + (255,))
    c.poly([(x - h * 0.42, base - h * 0.78), (x + h * 0.48, base - h * 0.8), (x + h * 0.46, base - h * 0.86), (x - h * 0.38, base - h * 0.84)], col + (255,))


def lm_cylinders(c, x, base, h, col):
    for dx, hh, w in [(-0.22, 0.6, 0.1), (0.22, 0.6, 0.1), (-0.11, 0.66, 0.1), (0.11, 0.66, 0.1), (0, 1.0, 0.14)]:
        c.rect(x + dx * h - w * h, base - h * hh, x + dx * h + w * h, base, col + (255,))
        c.ellipse(x + dx * h, base - h * hh, w * h, w * h * 0.25, fill=col + (255,))


def lm_spire_cluster(c, x, base, h, col):   # Sagrada Família
    for dx, hh in [(-0.36, 0.7), (-0.24, 0.84), (-0.12, 0.92), (0.12, 0.95), (0.24, 0.86), (0.36, 0.72), (0, 1.0)]:
        sx = x + dx * h
        w = h * 0.045
        pts = [(sx - w, base)]
        for i in range(12):
            t = i / 11
            pts.append((sx - w * (1 - t ** 3), base - h * hh * (0.3 + 0.7 * t)))
        pts += [(sx + w * (1 - t ** 3), base - h * hh * (0.3 + 0.7 * t)) for t in [i / 11 for i in range(11, -1, -1)]]
        pts.append((sx + w, base))
        c.poly(pts, col + (255,))
    c.rect(x - h * 0.42, base - h * 0.28, x + h * 0.42, base, col + (255,))


def lm_gate(c, x, base, h, col):
    w = h * 1.1
    c.rect(x - w / 2, base - h * 0.62, x + w / 2, base, col + (255,))
    c.rect(x - w * 0.55, base - h * 0.7, x + w * 0.55, base - h * 0.62, col + (255,))
    c.rect(x - w * 0.18, base - h * 0.85, x + w * 0.18, base - h * 0.7, col + (255,))
    for i in range(3):
        ax = x + (i - 1) * w * 0.3
        c.rect(ax - w * 0.08, base - h * 0.4, ax + w * 0.08, base, (0, 0, 0, 0))
        c.pieslice(ax, base - h * 0.4, w * 0.08, 180, 360, (0, 0, 0, 0))


def lm_mole(c, x, base, h, col):   # Torino: square base, a tall curved roof, a needle
    c.rect(x - h * 0.16, base - h * 0.3, x + h * 0.16, base, col + (255,))
    pts = [(x - h * 0.16, base - h * 0.3)]
    for i in range(12):
        t = i / 11
        pts.append((x - h * 0.16 * (1 - t) ** 1.6 - h * 0.012, base - h * 0.3 - h * 0.35 * t))
    pts += [(x + h * 0.16 * (1 - t) ** 1.6 + h * 0.012, base - h * 0.3 - h * 0.35 * t) for t in [i / 11 for i in range(11, -1, -1)]]
    c.poly(pts, col + (255,))
    c.poly([(x - h * 0.02, base - h * 0.64), (x, base - h), (x + h * 0.02, base - h * 0.64)], col + (255,))


def lm_two_towers(c, x, base, h, col):   # Bologna
    c.rect(x - h * 0.12, base - h, x - h * 0.04, base, col + (255,))
    c.poly([(x + h * 0.06, base), (x + h * 0.1, base - h * 0.55), (x + h * 0.18, base - h * 0.55), (x + h * 0.14, base)], col + (255,))


def lm_inclined(c, x, base, h, col):   # Montréal, the Olympic tower over the stadium
    c.pieslice(x - h * 0.15, base + h * 0.05, h * 0.5, 180, 360, col + (255,))
    c.poly([(x + h * 0.12, base - h * 0.2), (x + h * 0.35, base - h * 0.95), (x + h * 0.45, base - h * 0.92), (x + h * 0.26, base - h * 0.2)], col + (255,))


def lm_twin_spire_tower(c, x, base, h, col):   # Nashville, the "Batman" building
    w = h * 0.26
    c.rect(x - w / 2, base - h * 0.62, x + w / 2, base, col + (255,))
    c.poly([(x - w / 2, base - h * 0.62), (x - w * 0.3, base - h * 0.7), (x + w * 0.3, base - h * 0.7), (x + w / 2, base - h * 0.62)], col + (255,))
    for s in (-1, 1):
        c.poly([(x + s * w * 0.42, base - h * 0.66), (x + s * w * 0.38, base - h), (x + s * w * 0.3, base - h * 0.66)], col + (255,))


def lm_junk(c, x, base, h, col, sail):
    c.poly([(x - h * 0.4, base - h * 0.08), (x + h * 0.4, base - h * 0.12), (x + h * 0.3, base), (x - h * 0.32, base)], col + (255,))
    for dx, hh in [(-0.15, 0.85), (0.15, 0.7)]:
        sx = x + dx * h
        c.poly([(sx, base - h * 0.1), (sx - h * 0.22, base - h * 0.2), (sx - h * 0.2, base - h * hh), (sx + h * 0.04, base - h * (hh - 0.05))], sail + (255,))
        for i in range(4):
            yy = base - h * (0.25 + i * (hh - 0.25) / 4)
            c.line([(sx - h * 0.21, yy), (sx + h * 0.02, yy - h * 0.02)], mix(sail, (0, 0, 0), 0.35) + (255,), 0.6)


def lm_steamboat(c, x, base, h, col, wheel):
    c.poly([(x - h * 0.6, base - h * 0.12), (x + h * 0.55, base - h * 0.12), (x + h * 0.45, base), (x - h * 0.5, base)], col + (255,))
    c.rect(x - h * 0.45, base - h * 0.28, x + h * 0.35, base - h * 0.12, col + (255,))
    c.rect(x - h * 0.3, base - h * 0.4, x + h * 0.2, base - h * 0.28, col + (255,))
    for sx in (-0.05, 0.08):
        c.rect(x + sx * h - h * 0.025, base - h * 0.75, x + sx * h + h * 0.025, base - h * 0.4, col + (255,))
        c.rect(x + sx * h - h * 0.04, base - h * 0.78, x + sx * h + h * 0.04, base - h * 0.75, col + (255,))
    c.ellipse(x - h * 0.58, base - h * 0.14, h * 0.14, h * 0.14, fill=wheel + (255,))


def lm_opera(c, x, base, h, col):   # Oslo: the white roof that walks into the water
    c.poly([(x - h * 0.9, base), (x - h * 0.1, base - h * 0.32), (x + h * 0.5, base - h * 0.32), (x + h * 0.6, base)], col + (255,))
    c.rect(x + h * 0.05, base - h * 0.58, x + h * 0.32, base - h * 0.32, mix(col, (120, 140, 160), 0.35) + (255,))


def lm_rainbow_ring(c, x, base, h, col):   # Aarhus, ARoS
    c.rect(x - h * 0.5, base - h * 0.45, x + h * 0.5, base, col + (255,))
    lay, d = c.layer()
    for i, rc in enumerate([(230, 60, 60), (240, 150, 50), (240, 220, 70), (80, 190, 110), (70, 140, 220), (130, 90, 200)]):
        x0 = x - h * 0.42 + i * h * 0.14
        d.rectangle([x0 * c.k, (base - h * 0.62) * c.k, (x0 + h * 0.14) * c.k, (base - h * 0.45) * c.k], fill=rc + (230,))
    c.put(lay)


def lm_sphere(c, x, base, h, colors):   # Las Vegas, the Sphere
    lay, d = c.layer()
    r = h * 0.38
    d.ellipse([(x - r * 1.6) * c.k, (base - r * 1.6 - r) * c.k, (x + r * 1.6) * c.k, (base + r * 0.6 - r) * c.k], fill=colors[0] + (110,))
    c.put(lay, blur=r * 0.5)
    c.pieslice(x, base - r * 0.82, r, 0, 360, colors[0] + (255,))
    c.ellipse(x - r * 0.25, base - r * 1.1, r * 0.45, r * 0.4, fill=colors[1] + (255,))
    c.rect(x - r, base - r * 0.1, x + r, base, (0, 0, 0, 0))


def lm_twin_cone_cathedral(c, x, base, h, col):
    lm_spires(c, x, base, h, col, n=2, cone=True, gap=h * 0.36)


LANDMARKS = {
    "needle": lm_needle, "tv": lm_tv, "spires": lm_spires, "mosque": lm_mosque, "lattice": lm_lattice,
    "clock": lm_clock, "stepped": lm_stepped, "burj": lm_burj, "obelisk": lm_obelisk, "ferris": lm_ferris,
    "atomium": lm_atomium, "colosseum": lm_colosseum, "temple": lm_temple, "castle": lm_castle,
    "fortress": lm_fortress, "dome_church": lm_dome_church, "round_tower": lm_round_tower,
    "twisted": lm_twisted, "wave_roof": lm_wave_roof, "rocket": lm_rocket, "fountain": lm_fountain,
    "column_angel": lm_column_angel, "marina": lm_marina, "cylinders": lm_cylinders,
    "spire_cluster": lm_spire_cluster, "gate": lm_gate, "mole": lm_mole, "two_towers": lm_two_towers,
    "inclined": lm_inclined, "twin_spire_tower": lm_twin_spire_tower, "junk": lm_junk,
    "steamboat": lm_steamboat, "opera": lm_opera, "rainbow_ring": lm_rainbow_ring, "sphere": lm_sphere,
    "twin_cone": lm_twin_cone_cathedral,
}


def landmark(c: Canvas, spec: dict, base: float, col: Color, pal: dict, rng):
    """Draws the spec's landmark(s) on a layer of their own (arches and windows are cut out of
    the layer, not out of the sky), then lays the layer on the label."""
    lm = spec.get("landmark")
    if not lm:
        return
    items = lm if isinstance(lm, list) else [lm]
    main = c
    c = Canvas.__new__(Canvas)
    c.px, c.k = main.px, main.k
    c.img = Image.new("RGBA", (main.px, main.px), (0, 0, 0, 0))
    c.d = ImageDraw.Draw(c.img)
    _draw_landmarks(c, items, base, col, rng)
    main.img.alpha_composite(c.img)


def _draw_landmarks(c, items, base, col, rng):
    for item in items:
        kind = item["kind"]
        x, h = item.get("x", 290), item.get("h", 90)
        b = base + item.get("dy", 0)
        color = hexc(item["color"]) if "color" in item else col
        f = LANDMARKS[kind]
        extra = {k: v for k, v in item.items() if k not in ("kind", "x", "h", "dy", "color")}
        for k2 in ("face", "light", "hill", "roof", "glass", "gold", "sail", "wheel", "dome", "statue", "cabins", "shine", "flame"):
            if k2 in extra and isinstance(extra[k2], str):
                extra[k2] = hexc(extra[k2])
        if kind == "sphere":
            f(c, x, b, h, [hexc(v) for v in item.get("colors", ["#ffb347", "#ff6fb1"])])
        elif kind == "stepped" and extra.get("lit"):
            extra["lit"] = hexc(extra["lit"]); f(c, x, b, h, color, rng=rng, **extra)
        elif kind in ("colosseum",):
            f(c, x, b, h, color, extra.get("light", mix(color, (255, 255, 255), 0.5)))
        elif kind in ("temple", "fortress"):
            f(c, x, b, h, color, extra.get("hill", mix(color, (0, 0, 0), 0.2)))
        elif kind == "castle":
            f(c, x, b, h, color, extra.get("roof", (40, 60, 70)))
        elif kind == "wave_roof":
            f(c, x, b, h, color, extra.get("glass", (150, 180, 210)))
        elif kind == "junk":
            f(c, x, b, h, color, extra.get("sail", (200, 60, 40)))
        elif kind == "steamboat":
            f(c, x, b, h, color, extra.get("wheel", (180, 40, 40)))
        elif kind == "column_angel":
            f(c, x, b, h, color, extra.get("gold", (230, 180, 70)))
        elif kind == "ferris":
            f(c, x, b, h * 0.42, color, extra.get("cabins"))
        else:
            f(c, x, b, h, color, **extra)


# ---------------------------------------------------------------- scenes

def sky(c: Canvas, pal: dict):
    stops = pal["sky"]
    c.vgrad([(i / (len(stops) - 1), hexc(s)) for i, s in enumerate(stops)])


def deco(c: Canvas, spec: dict, pal: dict, rng):
    if pal.get("stars"):
        stars(c, rng, n=pal["stars"], top=10, bottom=230)
    if "sun" in spec:
        s = spec["sun"]
        sun(c, s.get("x", 300), s.get("y", 230), s.get("r", 26), hexc(s.get("color", "#fff2c4")), glow=s.get("glow", True),
            stripes=s.get("stripes", 0), horizon=s.get("cut"))
    if "moon" in spec:
        m = spec["moon"]
        mc = hexc(m.get("color", "#eef3fb"))
        c.ellipse(m.get("x", 320), m.get("y", 70), 14, 14, fill=mc + (255,))
        c.ellipse(m.get("x", 320) + 6, m.get("y", 70) - 4, 12, 12, fill=hexc(pal["sky"][0]) + (255,))
    if spec.get("aurora"):
        lay, d = c.layer()
        for j, colr in enumerate([(90, 240, 170), (120, 255, 200), (170, 120, 240)]):
            pts = []
            for i in range(41):
                x = i * 10
                y = 120 + j * 18 + math.sin(i / 6 + j) * 16 + math.sin(i / 2.3) * 4
                pts.append((x * c.k, y * c.k))
            for w, a in [(16, 60), (7, 120)]:
                d.line(pts, fill=colr + (a,), width=round(w * c.k))
        c.put(lay, blur=3, opacity=0.8)


# The five ranges of Munich's label (22.10.2026), back to front: base below the horizon,
# height, number of peaks, roughness, and the seed offset (seed 3 gives Munich's own lines).
RANGES = [(0, 70, 9, 1.6, 0), (10, 58, 10, 1.8, 4), (22, 44, 12, 2.0, 10), (36, 34, 14, 2.2, 18), (52, 22, 16, 2.4, 26)]


def scene_ridges(c, spec, pal, rng):
    sky(c, pal); deco(c, spec, pal, rng)
    layers = [hexc(v) for v in pal["layers"]]
    H = spec.get("horizon", 314)
    amp = spec.get("amp", 1.0)
    seed = spec.get("seed", 3)
    start = 0
    if spec.get("volcano"):
        v = spec["volcano"]
        vx, vh, vb = v.get("x", 270), v.get("h", 95), H + 6
        c.poly([(vx - vh * 1.5, vb + 30), (vx - vh * 0.15, vb - vh), (vx + vh * 0.15, vb - vh), (vx + vh * 1.5, vb + 30)], layers[0] + (255,))
        snow = hexc(pal.get("snow", "#f7fafd"))
        c.poly([(vx - vh * 0.42, vb - vh * 0.7), (vx - vh * 0.15, vb - vh), (vx + vh * 0.15, vb - vh), (vx + vh * 0.42, vb - vh * 0.7),
                (vx + vh * 0.25, vb - vh * 0.75), (vx + vh * 0.1, vb - vh * 0.66), (vx - vh * 0.06, vb - vh * 0.76), (vx - vh * 0.24, vb - vh * 0.67)], snow + (255,))
        start = 1
    for i in range(start, len(layers)):
        dy, a, pk, jag, so = RANGES[i]
        pts = ridge(H + dy, a * amp, pk, jag, seed + so)
        if spec.get("saddle") and i == 1:
            pts = [(x, y - 64 * math.exp(-((x - 245) / 26) ** 2) - 74 * math.exp(-((x - 318) / 20) ** 2)) for x, y in pts]
        fill_below(c, pts, layers[i] + (255,))
        if i == 0 and pal.get("snow"):
            lay, d = c.layer()
            d.polygon(c.P([(0, 400)] + pts + [(400, 400)]), fill=hexc(pal["snow"]) + (235,))
            d.rectangle([0, (min(y for _, y in pts) + 11.5) * c.k, c.px, c.px], fill=(0, 0, 0, 0))
            c.put(lay)
        if spec.get("landmark") and i == len(layers) - 2:
            landmark(c, spec, H + RANGES[i + 1][0] - 6, layers[-1], pal, rng)
    if spec.get("lake"):
        water(c, spec["lake"], [hexc(pal["water"][0]), hexc(pal["water"][1])], rng)
        if spec.get("lake_landmark"):
            landmark(c, {"landmark": spec["lake_landmark"]}, spec["lake"], layers[-1], pal, rng)


def scene_skyline(c, spec, pal, rng):
    sky(c, pal); deco(c, spec, pal, rng)
    base = spec.get("horizon", 285)
    far, near = hexc(pal["far"]), hexc(pal["near"])
    lit = hexc(pal["lit"]) if pal.get("lit") else None
    if spec.get("hills"):
        fill_below(c, ridge(base - 18, 34, 6, 1.0, spec.get("seed", 1) + 99), hexc(pal.get("hill", pal["far"])) + (255,))
    buildings(c, random.Random(spec.get("seed", 1)), base - 6, far, 18, spec.get("far_h", 46), 9, 18)
    landmark(c, spec, base, near, pal, rng)
    buildings(c, random.Random(spec.get("seed", 1) + 5), base, near, 8, spec.get("near_h", 30), 10, 24, lit, 0.22)
    if spec.get("water"):
        water(c, base, [hexc(pal["water"][0]), hexc(pal["water"][1])], rng, streaks=lit)
    else:
        c.rect(0, base, 400, 400, near + (255,))
        if lit:
            windows(c, rng, 0, 400, base, 400, lit, 0.08)


def scene_sea(c, spec, pal, rng):
    sky(c, pal); deco(c, spec, pal, rng)
    base = spec.get("horizon", 270)
    if spec.get("headland"):
        hd = spec["headland"]
        c.poly([(hd.get("x0", 200), base + 1), (hd.get("x1", 260), base - hd.get("h", 22)), (hd.get("x2", 340), base - hd.get("h", 22) - 4), (hd.get("x3", 400), base + 1)], hexc(pal["land"]) + (255,))
    if spec.get("skyline"):
        buildings(c, random.Random(spec.get("seed", 2)), base, hexc(pal["land"]), 6, spec.get("skyline_h", 22), 8, 16, hexc(pal["lit"]) if pal.get("lit") else None, 0.2)
    landmark(c, spec, base, hexc(pal["land"]), pal, rng)
    water(c, base, [hexc(pal["water"][0]), hexc(pal["water"][1])], rng)
    for p in spec.get("palms", []):
        palm(c, p["x"], p.get("base", 400), p.get("h", 90), hexc(pal.get("palm", pal["land"])), p.get("lean", 1))


def scene_dunes(c, spec, pal, rng):
    sky(c, pal); deco(c, spec, pal, rng)
    base = spec.get("horizon", 280)
    if spec.get("skyline"):
        buildings(c, random.Random(spec.get("seed", 4)), base, hexc(pal["far"]), 6, 26, 7, 14)
    landmark(c, spec, base, hexc(pal["near"]), pal, rng)
    for i, col in enumerate(pal["dunes"]):
        pts = [(x, base + i * 18 + math.sin(x / (38 + i * 9) + i * 1.7) * (8 - i) - 4) for x in range(0, 404, 4)]
        fill_below(c, pts, hexc(col) + (255,))


def scene_palms(c, spec, pal, rng):
    sky(c, pal)
    base = spec.get("horizon", 285)
    sp = spec.get("sun", {"x": 270, "y": 255, "r": 52, "stripes": 5})
    sun(c, sp.get("x", 270), sp.get("y", 255), sp.get("r", 52), hexc(sp.get("color", "#ffd46b")), glow=True, stripes=sp.get("stripes", 5), horizon=base)
    if pal.get("stars"):
        stars(c, rng, n=pal["stars"], top=10, bottom=200)
    if spec.get("hills"):
        fill_below(c, ridge(base - 4, 30, 5, 1.0, spec.get("seed", 6)), hexc(pal["hill"]) + (255,))
    if spec.get("skyline"):
        buildings(c, random.Random(spec.get("seed", 6)), base, hexc(pal["palm"]), 6, spec.get("skyline_h", 30), 8, 16, hexc(pal["lit"]) if pal.get("lit") else None, 0.25)
    landmark(c, spec, base, hexc(pal["palm"]), pal, rng)
    if spec.get("water", True):
        water(c, base, [hexc(pal["water"][0]), hexc(pal["water"][1])], rng)
    else:
        c.rect(0, base, 400, 400, hexc(pal["palm"]) + (255,))
    for p in spec.get("palms", [{"x": 120, "h": 120, "lean": 1}, {"x": 345, "h": 100, "lean": -1}]):
        palm(c, p["x"], p.get("base", 402), p.get("h", 110), hexc(pal["palm"]), p.get("lean", 1))


def scene_canal(c, spec, pal, rng):
    sky(c, pal); deco(c, spec, pal, rng)
    base = spec.get("horizon", 290)
    landmark(c, spec, base - 30, hexc(pal.get("tower", pal["roof"])), pal, rng)
    houses = [hexc(v) for v in pal["houses"]]
    gables(c, random.Random(spec.get("seed", 5)), base, -4, 404, houses, spec.get("style", "bell"), spec.get("hmin", 34), spec.get("hmax", 56))
    water(c, base, [hexc(pal["water"][0]), hexc(pal["water"][1])], rng)
    # the houses in the water: a dimmed, broken copy
    lay, d = c.layer()
    src = c.img.crop((0, round((base - 60) * c.k), c.px, round(base * c.k))).transpose(Image.FLIP_TOP_BOTTOM)
    lay.paste(src, (0, round(base * c.k)))
    c.put(lay, blur=1.4, opacity=0.35)
    if spec.get("boats"):
        for bx in spec["boats"]:
            c.poly([(bx - 16, base + 8), (bx + 18, base + 8), (bx + 13, base + 14), (bx - 12, base + 14)], hexc(pal.get("boat", "#2b2a28")) + (255,))


def scene_river(c, spec, pal, rng):
    sky(c, pal); deco(c, spec, pal, rng)
    base = spec.get("horizon", 280)
    far = hexc(pal["far"])
    if spec.get("hills"):
        fill_below(c, ridge(base - 16, 36, 6, 1.0, spec.get("seed", 7) + 3), hexc(pal.get("hill", pal["far"])) + (255,))
    buildings(c, random.Random(spec.get("seed", 7)), base, far, 8, spec.get("far_h", 26), 9, 18, hexc(pal["lit"]) if pal.get("lit") else None, 0.15)
    landmark(c, spec, base, hexc(pal.get("near", pal["far"])), pal, rng)
    water(c, base, [hexc(pal["water"][0]), hexc(pal["water"][1])], rng, streaks=hexc(pal["lit"]) if pal.get("lit") else None)
    br = spec.get("bridge")
    if br:
        bc = hexc(br.get("color", pal.get("bridge", pal["far"])))
        deck = base + br.get("deck", 18)
        kind = br["kind"]
        if kind == "arches":
            c.rect(0, deck - 5, 400, deck, bc + (255,))
            n = br.get("n", 6)
            for i in range(n + 1):
                px = i * 400 / n
                c.rect(px - 4, deck, px + 4, 400, bc + (255,))
            for i in range(n):
                cx = (i + 0.5) * 400 / n
                w = 400 / n / 2 - 4
                lay, d = c.layer()
                d.rectangle([(cx - w) * c.k, deck * c.k, (cx + w) * c.k, (deck + 40) * c.k], fill=bc + (255,))
                d.ellipse([(cx - w) * c.k, (deck + 4) * c.k, (cx + w) * c.k, (deck + 4 + w * 2.2) * c.k], fill=(0, 0, 0, 0))
                c.img.alpha_composite(lay)
        elif kind == "iron_arch":
            c.rect(0, deck - 4, 400, deck, bc + (255,))
            pts = [(x, deck + 40 - 46 * math.sin(math.pi * x / 400)) for x in range(0, 404, 4)]
            c.line(pts, bc + (255,), 4)
            for x in range(20, 400, 20):
                y = deck + 40 - 46 * math.sin(math.pi * x / 400)
                c.line([(x, deck), (x, y)], bc + (255,), 1)
        elif kind == "suspension":
            t1, t2 = br.get("towers", (150, 330))
            th = br.get("h", 70)
            c.rect(0, deck - 4, 400, deck, bc + (255,))
            for tx in (t1, t2):
                c.rect(tx - 3.5, deck - th, tx + 3.5, deck + 30, bc + (255,))
                c.rect(tx - 5, deck - th * 0.55, tx + 5, deck - th * 0.5, bc + (255,))
            span = [(x, deck - th + (th - 6) * ((x - t1) / (t2 - t1) * 2 - 1) ** 2) for x in range(int(t1), int(t2) + 1, 3)]
            c.line(span, bc + (255,), 1.6)
            c.line([(0, deck - 10), (t1 * 0.4, deck - th * 0.35), (t1, deck - th)], bc + (255,), 1.6)
            c.line([(t2, deck - th), (t2 + (400 - t2) * 0.6, deck - th * 0.35), (400, deck - 10)], bc + (255,), 1.6)
            for x in range(int(t1) + 6, int(t2), 7):
                y = deck - th + (th - 6) * ((x - t1) / (t2 - t1) * 2 - 1) ** 2
                c.line([(x, deck), (x, y)], bc + (255,), 0.5)
        elif kind == "cable":
            px = br.get("pylon", 300)
            ph = br.get("h", 90)
            c.rect(0, deck - 4, 400, deck, bc + (255,))
            c.poly([(px - 3, deck + 20), (px + br.get("bend", 10) - 2, deck - ph), (px + br.get("bend", 10) + 2, deck - ph), (px + 3, deck + 20)], bc + (255,))
            for i in range(1, 9):
                c.line([(px + br.get("bend", 10), deck - ph + i * 3), (px - i * 22, deck)], bc + (255,), 0.6)
                c.line([(px + br.get("bend", 10), deck - ph + i * 3), (px + i * 12, deck)], bc + (255,), 0.6)
    for b in spec.get("boats", []):
        landmark(c, {"landmark": b}, base + 14, hexc(pal["far"]), pal, rng)


def scene_harbor(c, spec, pal, rng):
    sky(c, pal); deco(c, spec, pal, rng)
    base = spec.get("horizon", 282)
    far = hexc(pal["far"])
    buildings(c, random.Random(spec.get("seed", 8)), base - 2, mix(far, hexc(pal["sky"][-1]), 0.45), 6, 20, 8, 16)
    landmark(c, spec, base, far, pal, rng)
    for cx in spec.get("cranes", [130, 175, 360]):
        h = rng.uniform(52, 66)
        c.rect(cx - 2, base - h, cx + 2, base, far + (255,))
        c.rect(cx + 6, base - h, cx + 10, base, far + (255,))
        c.rect(cx - 20, base - h - 2, cx + 30, base - h + 3, far + (255,))
        c.line([(cx + 4, base - h - 12), (cx - 20, base - h), (cx + 4, base - h - 12), (cx + 30, base - h)], far + (255,), 0.8)
        c.rect(cx + 2, base - h - 14, cx + 6, base - h, far + (255,))
    stacks = [hexc(v) for v in pal.get("containers", ["#c8553d", "#2f6690", "#d9a441", "#3a7d44"])]
    x = spec.get("containers_x", 40)
    while x < spec.get("containers_x1", 110):
        for row in range(rng.randint(1, 3)):
            c.rect(x, base - 6 - row * 6, x + 13, base - row * 6 - 0.6, rng.choice(stacks) + (255,))
        x += 14
    water(c, base, [hexc(pal["water"][0]), hexc(pal["water"][1])], rng)


def scene_fjord(c, spec, pal, rng):
    sky(c, pal); deco(c, spec, pal, rng)
    base = spec.get("horizon", 270)
    m = [hexc(v) for v in pal["mountains"]]
    left = [(x, base - max(0, 120 - x * 0.75) - math.sin(x / 9) * 4) for x in range(0, 404, 4)]
    right = [(x, base - max(0, (x - 250) * 0.75) - math.sin(x / 7) * 3) for x in range(0, 404, 4)]
    back = ridge(base - 4, 60, 8, 1.5, spec.get("seed", 9))
    fill_below(c, back, m[0] + (255,))
    if pal.get("snow"):
        lay, d = c.layer()
        d.polygon(c.P([(0, 400)] + back + [(400, 400)]), fill=hexc(pal["snow"]) + (230,))
        d.rectangle([0, (min(y for _, y in back) + 10) * c.k, c.px, c.px], fill=(0, 0, 0, 0))
        c.put(lay)
    fill_below(c, left, m[1] + (255,))
    fill_below(c, right, m[1] + (255,))
    landmark(c, spec, base, m[-1], pal, rng)
    if spec.get("wharf"):
        gables(c, random.Random(spec.get("seed", 9) + 2), base, 210, 404, [hexc(v) for v in spec["wharf"]], "pointed", 18, 28, 10, 14)
    water(c, base, [hexc(pal["water"][0]), hexc(pal["water"][1])], rng)
    lay, d = c.layer()
    src = c.img.crop((0, round((base - 80) * c.k), c.px, round(base * c.k))).transpose(Image.FLIP_TOP_BOTTOM)
    lay.paste(src, (0, round(base * c.k)))
    c.put(lay, blur=1.6, opacity=0.3)


def scene_aurora(c, spec, pal, rng):
    spec = dict(spec, aurora=True)
    sky(c, pal); deco(c, spec, pal, rng)
    base = spec.get("horizon", 285)
    if spec.get("water"):
        landmark(c, spec, base, hexc(pal["land"]), pal, rng)
        buildings(c, random.Random(spec.get("seed", 10)), base, hexc(pal["land"]), 6, 20, 8, 16, hexc(pal["lit"]), 0.25)
        water(c, base, [hexc(pal["water"][0]), hexc(pal["water"][1])], rng, streaks=hexc(pal["lit"]))
    else:
        fill_below(c, [(x, base + math.sin(x / 40) * 6) for x in range(0, 404, 4)], hexc(pal["snowfield"]) + (255,))
        landmark(c, spec, base, hexc(pal["land"]), pal, rng)
        for x in range(-10, 410, 14):
            pine(c, x + rng.uniform(-4, 4), base + 30 + rng.uniform(-6, 6), rng.uniform(22, 36), hexc(pal["land"]))


SCENES = {"ridges": scene_ridges, "skyline": scene_skyline, "sea": scene_sea, "dunes": scene_dunes, "palms": scene_palms,
          "canal": scene_canal, "river": scene_river, "harbor": scene_harbor, "fjord": scene_fjord, "aurora": scene_aurora}

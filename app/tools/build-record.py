"""afterhours — the record behind the profile photo (components/Sleeve.tsx), drawn as a picture.

    python3 tools/build-record.py        (from app/)

Writes assets/record/record.webp (a black record, its label left empty: the app paints the
red label with the words on it) and assets/record/munchen.webp (the same record with the
Munich label: the Alps seen from the city on a föhn day, under "MÜNCHEN"). Design 1
"Föhn" of the five the owner was shown on 22.10.2026.

React Native cannot paint the grooves and the sheen (repeating and conic gradients), so the
record is drawn here with numpy and Pillow: grooves as a fine wave over the radius with a
little random wear, two highlights opposite each other the way light lies on vinyl, the
gaps between tracks, the smooth run-out around the label, a bevelled edge, and a spindle
hole left transparent. Drawn at twice the size, then scaled down.

Measures follow the sleeve: the label is 42 % of the record. The cover hides about the left
quarter of the label, so "MÜNCHEN" sits centred on what shows (60 % across).
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

APP = Path(__file__).resolve().parent.parent
OUT = APP / "assets" / "record"
FONT = APP / "assets" / "fonts" / "ArchivoLogo.ttf"

SIZE = 1024          # final pixels
SS = 2               # supersampling
LABEL = 0.42         # label radius / record radius
RUNOUT = 0.50        # smooth run-out up to here
HOLE = 0.026
TEXT_X = 0.60        # centre of "MÜNCHEN" across the label

# The Alps as five ridges, back to front (the same lines as the design; x 0–400, y 0–200).
RIDGES = [
    "0 64.2 4 55.9 8 58.2 12 66.1 16 68.5 20 65.0 24 58.5 28 60.6 32 64.3 36 69.6 40 77.2 44 79.1 48 75.0 52 68.7 56 66.5 60 61.9 64 66.4 68 69.7 72 74.0 76 77.5 80 70.4 84 64.0 88 56.4 92 50.5 96 50.6 100 57.5 104 63.6 108 71.0 112 79.0 116 82.9 120 84.1 124 86.0 128 89.4 132 91.2 136 95.1 140 95.3 144 98.4 148 101.5 152 104.3 156 103.9 160 105.5 164 110.2 168 104.0 172 101.1 176 97.7 180 92.9 184 86.9 188 82.1 192 80.1 196 73.6 200 70.7 204 63.7 208 60.1 212 60.1 216 64.6 220 70.9 224 74.1 228 80.9 232 83.1 236 73.5 240 67.2 244 68.4 248 75.9 252 83.1 256 92.3 260 100.0 264 104.5 268 112.8 272 116.2 276 116.7 280 118.3 284 115.5 288 112.3 292 108.6 296 105.4 300 102.0 304 98.1 308 93.3 312 90.9 316 87.3 320 82.4 324 79.9 328 75.6 332 69.3 336 69.6 340 73.6 344 79.4 348 82.2 352 85.6 356 91.3 360 93.3 364 97.0 368 102.5 372 104.3 376 108.2 380 110.8 384 115.0 388 116.6 392 117.2 396 119.5 400 119.4",
    "0 101.4 4 96.7 8 90.3 12 86.1 16 80.1 20 77.7 24 82.0 28 86.2 32 88.9 36 92.4 40 97.3 44 102.2 48 104.7 52 102.2 56 100.5 60 99.8 64 101.0 68 96.8 72 94.3 76 92.9 80 87.3 84 87.4 88 83.2 92 83.1 96 88.3 100 90.2 104 94.8 108 95.6 112 98.2 116 101.8 120 101.8 124 101.3 128 97.4 132 98.3 136 100.9 140 103.9 144 105.0 148 107.0 152 106.4 156 99.1 160 94.5 164 85.2 168 78.3 172 77.7 176 85.5 180 94.4 184 100.8 188 106.3 192 114.8 196 110.9 200 109.6 204 107.4 208 105.2 212 100.2 216 100.0 220 97.1 224 94.0 228 89.7 232 91.5 236 92.7 240 94.9 244 96.2 248 99.0 252 101.3 256 105.8 260 107.7 264 110.3 268 110.7 272 112.7 276 117.8 280 119.9 284 121.8 288 122.0 292 118.7 296 116.0 300 114.6 304 113.0 308 108.9 312 106.5 316 103.1 320 99.0 324 97.2 328 97.2 332 99.6 336 102.1 340 107.0 344 106.6 348 109.7 352 111.9 356 114.6 360 118.5 364 120.9 368 124.2 372 124.4 376 128.4 380 129.6 384 129.0 388 129.2 392 128.6 396 129.6 400 129.8",
    "0 137.3 4 135.3 8 132.3 12 131.0 16 129.1 20 125.7 24 125.5 28 120.6 32 118.8 36 117.1 40 114.1 44 109.9 48 108.1 52 104.3 56 100.7 60 100.5 64 104.6 68 106.1 72 110.1 76 113.0 80 116.0 84 118.2 88 116.6 92 111.4 96 107.4 100 106.7 104 103.0 108 105.1 112 111.6 116 112.2 120 109.7 124 111.8 128 114.7 132 118.8 136 119.9 140 120.1 144 122.1 148 124.4 152 128.8 156 125.8 160 124.2 164 119.2 168 117.8 172 110.8 176 116.1 180 119.3 184 125.0 188 126.8 192 130.4 196 131.6 200 129.8 204 125.5 208 124.1 212 121.3 216 118.8 220 113.6 224 112.7 228 112.8 232 116.6 236 117.4 240 120.8 244 120.1 248 124.4 252 125.1 256 127.7 260 130.9 264 133.4 268 131.4 272 136.9 276 133.9 280 131.6 284 127.6 288 127.0 292 122.7 296 120.3 300 115.6 304 116.0 308 111.8 312 108.1 316 103.2 320 102.0 324 101.5 328 103.8 332 108.3 336 112.4 340 108.4 344 109.2 348 112.3 352 116.6 356 117.2 360 118.9 364 119.5 368 113.9 372 110.4 376 106.3 380 102.2 384 107.1 388 111.0 392 116.7 396 119.5 400 125.0",
    "0 151.9 4 151.8 8 150.4 12 147.9 16 146.1 20 142.8 24 142.7 28 138.3 32 133.8 36 133.5 40 127.3 44 124.3 48 123.3 52 123.6 56 126.3 60 129.7 64 124.8 68 127.5 72 131.4 76 133.4 80 133.0 84 131.0 88 129.6 92 126.0 96 125.8 100 128.6 104 134.5 108 136.3 112 140.0 116 143.0 120 146.0 124 144.9 128 142.8 132 139.0 136 140.2 140 137.8 144 137.8 148 137.8 152 139.3 156 137.3 160 138.8 164 141.8 168 141.7 172 140.8 176 138.5 180 136.8 184 137.8 188 133.8 192 132.8 196 135.8 200 135.1 204 138.0 208 139.3 212 137.9 216 133.1 220 134.2 224 135.8 228 134.6 232 136.8 236 138.1 240 137.7 244 141.1 248 139.8 252 141.4 256 142.6 260 145.3 264 147.4 268 147.8 272 146.7 276 147.4 280 149.5 284 150.1 288 149.2 292 144.1 296 144.0 300 141.0 304 142.0 308 139.0 312 134.0 316 131.9 320 129.3 324 129.2 328 132.2 332 133.8 336 134.9 340 139.5 344 140.7 348 143.9 352 143.8 356 147.9 360 143.1 364 140.1 368 142.3 372 137.9 376 135.8 380 132.9 384 132.1 388 131.6 392 128.9 396 124.4 400 123.6",
    "0 170.2 4 167.9 8 169.2 12 170.9 16 168.2 20 169.0 24 167.6 28 167.7 32 165.4 36 167.8 40 166.1 44 161.5 48 164.3 52 158.0 56 156.1 60 157.7 64 158.1 68 152.9 72 154.1 76 156.1 80 156.3 84 155.0 88 156.1 92 158.6 96 156.8 100 156.6 104 156.6 108 157.0 112 157.8 116 155.7 120 156.1 124 158.9 128 161.5 132 162.4 136 162.0 140 162.6 144 161.5 148 160.1 152 159.5 156 154.6 160 151.3 164 151.4 168 149.1 172 150.9 176 156.2 180 157.5 184 156.7 188 156.3 192 155.5 196 153.3 200 152.9 204 152.7 208 150.7 212 151.7 216 156.6 220 156.8 224 158.1 228 153.5 232 154.6 236 152.0 240 154.9 244 153.5 248 151.3 252 152.1 256 155.9 260 159.8 264 159.9 268 157.7 272 157.4 276 157.8 280 157.3 284 161.8 288 160.0 292 161.3 296 164.1 300 163.3 304 161.3 308 156.0 312 157.5 316 153.2 320 154.1 324 158.5 328 161.2 332 160.3 336 165.0 340 164.5 344 164.2 348 167.9 352 167.0 356 166.4 360 163.7 364 161.8 368 160.9 372 156.2 376 155.6 380 157.0 384 161.8 388 160.7 392 156.3 396 159.5 400 156.9",
]
FILLS = [(167, 190, 219), (134, 164, 206), (99, 133, 186), (68, 103, 159), (39, 68, 122)]
INK = (31, 58, 102)


def record(n: int, seed: int = 7) -> np.ndarray:
    """The black record as RGBA floats 0–1, n × n."""
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:n, 0:n].astype(np.float64)
    c = (n - 1) / 2
    dx, dy = x - c, y - c
    r = np.hypot(dx, dy) / (n / 2)          # 0 at the centre, 1 at the edge
    a = np.arctan2(dy, dx)                  # -pi..pi

    base = np.full_like(r, 0.055)
    # grooves: a fine wave over the radius, its depth wandering a little (wear, pressing)
    period = 3.4 / (n / 2)                  # in radius units: about 3.4 px a groove
    wander = np.cumsum(rng.normal(0, 1, 4096)); wander = (wander - wander.min()) / (np.ptp(wander) + 1e-9)
    depth = 0.5 + 0.5 * np.interp(r, np.linspace(0, 1, 4096), wander)
    groove = 0.5 + 0.5 * np.sin(2 * np.pi * r / period)
    grooved = (r > RUNOUT) & (r < 0.965)
    for g in (0.62, 0.74, 0.86):            # the gaps between tracks: smooth, a hair brighter
        grooved &= ~(np.abs(r - g) < 0.006)
    gaps = np.zeros_like(r)
    for g in (0.62, 0.74, 0.86):
        gaps += np.exp(-((r - g) / 0.003) ** 2)
    v = base + grooved * groove * depth * 0.035 + gaps * 0.03

    # the light: two highlights opposite each other, a narrow core and a soft spread,
    # strongest on the middle of the grooves, broken up by them
    def lobe(theta, w):
        d = np.angle(np.exp(1j * (a - theta)))
        return np.exp(-(d / w) ** 2)
    t0 = np.deg2rad(-58)
    sheen = 0.55 * (lobe(t0, 0.09) + lobe(t0 + np.pi, 0.08)) + 0.22 * (lobe(t0, 0.32) + lobe(t0 + np.pi, 0.3))
    band = np.clip((r - 0.44) / 0.12, 0, 1) * np.clip((0.985 - r) / 0.05, 0, 1)
    texture = np.where(grooved, 0.55 + 0.45 * groove, 0.8)
    v = v + sheen * band * texture * 0.34
    # the run-out keeps a softer, wider gloss
    runout = (r > LABEL) & (r <= RUNOUT)
    v = v + runout * (0.018 + 0.12 * (lobe(t0, 0.22) + lobe(t0 + np.pi, 0.22)))
    # the edge: a dark lip, a bright bevel, then off
    v = v + 0.16 * np.exp(-((r - 0.982) / 0.006) ** 2) - 0.03 * np.exp(-((r - 0.995) / 0.004) ** 2)
    v = v + rng.normal(0, 0.006, v.shape)   # a little grain so it is not plastic-smooth

    rgb = np.clip(np.stack([v * 0.99, v, v * 1.02], -1), 0, 1)
    edge = np.clip(((1.0 - r) * (n / 2)), 0, 1)      # 1 px soft edge
    hole = np.clip(((r - HOLE) * (n / 2)), 0, 1)
    alpha = edge * hole
    return np.dstack([rgb, alpha])


def munich_label(px: int) -> Image.Image:
    """The Munich label, px × px, as an RGBA square (the circle is cut later)."""
    k = px / 400
    img = Image.new("RGBA", (px, px))
    sky = np.linspace(0, 1, px)[:, None]
    top, mid, low = np.array([185, 208, 234]), np.array([220, 232, 244]), np.array([238, 243, 248])
    col = np.where(sky < 0.55, top + (mid - top) * (sky / 0.55), mid + (low - mid) * ((sky - 0.55) / 0.45))
    img.paste(Image.fromarray(np.repeat(col[:, None, :], px, 1).reshape(px, px, 3).astype(np.uint8)), (0, 0))
    draw = ImageDraw.Draw(img)
    off = 196
    for i, line in enumerate(RIDGES):
        nums = list(map(float, line.split()))
        pts = [(nums[j] * k, (nums[j + 1] + off) * k) for j in range(0, len(nums), 2)]
        poly = [(0, px)] + pts + [(px, px)]
        draw.polygon(poly, fill=FILLS[i] + (255,))
        if i == 0:
            # snow on what stands above the line of the summits
            snow = Image.new("L", (px, px)); ImageDraw.Draw(snow).polygon(poly, fill=255)
            cut = Image.new("L", (px, px)); ImageDraw.Draw(cut).rectangle([0, 0, px, int(258 * k)], fill=255)
            mask = Image.fromarray((np.array(snow) & np.array(cut)).astype(np.uint8))
            img.paste((247, 250, 253, 255), (0, 0), mask.point(lambda p: int(p * 0.92)))
    # paper: a fine grain over everything
    grain = np.random.default_rng(4).normal(0, 7, (px, px))
    arr = np.array(img).astype(np.float64)
    arr[..., :3] = np.clip(arr[..., :3] + grain[..., None], 0, 255)
    img = Image.fromarray(arr.astype(np.uint8))
    draw = ImageDraw.Draw(img)
    # the printed ring
    w = max(1, round(1.4 * k))
    draw.ellipse([9 * k, 9 * k, px - 9 * k, px - 9 * k], outline=INK + (95,), width=w)
    # MÜNCHEN, on the part the cover leaves showing
    font = ImageFont.truetype(str(FONT), round(70 * k))
    word = "MÜNCHEN"
    box = draw.textbbox((0, 0), word, font=font)
    tw = box[2] - box[0]
    draw.text((TEXT_X * px - tw / 2 - box[0], 152 * k - box[3]), word, font=font, fill=INK + (255,))
    return img


def build():
    n = SIZE * SS
    disc = (record(n) * 255).astype(np.uint8)
    blank = Image.fromarray(disc, "RGBA")
    OUT.mkdir(parents=True, exist_ok=True)
    blank.resize((SIZE, SIZE), Image.LANCZOS).save(OUT / "record.webp", quality=90, method=6)

    lab_px = round(n * LABEL)
    label = munich_label(lab_px)
    circle = Image.new("L", (lab_px, lab_px)); ImageDraw.Draw(circle).ellipse([0, 0, lab_px - 1, lab_px - 1], fill=255)
    # a soft shadow where the paper meets the vinyl
    shade = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    o = (n - lab_px) // 2
    ring = Image.new("L", (n, n)); ImageDraw.Draw(ring).ellipse([o - 3 * SS, o - 3 * SS, o + lab_px + 3 * SS, o + lab_px + 3 * SS], fill=110)
    shade.putalpha(ring.filter(ImageFilter.GaussianBlur(4 * SS)))
    out = blank.copy()
    out.alpha_composite(shade)
    out.paste(label, (o, o), circle)
    # the hole goes through the label too
    arr = np.array(out)
    arr[..., 3] = np.minimum(arr[..., 3], disc[..., 3])
    Image.fromarray(arr, "RGBA").resize((SIZE, SIZE), Image.LANCZOS).save(OUT / "munchen.webp", quality=90, method=6)
    print("wrote", OUT / "record.webp", OUT / "munchen.webp")


if __name__ == "__main__":
    build()

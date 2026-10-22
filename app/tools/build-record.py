"""afterhours — the record behind the profile photo (components/Sleeve.tsx), one per city.

    python3 tools/build-record.py                 every city in tools/record/cities.json
    python3 tools/build-record.py berlin izmir    just these (fast, for tuning a label)
    python3 tools/build-record.py --sheet         also a contact sheet in the scratch folder
    python3 tools/build-record.py --sync          add the cities the live database serves that
                                                  the spec file does not know yet (a default look,
                                                  marked "auto": true), then draw them

The record is drawn once (tools/record/vinyl.py: grooves, the light on them, the run-out,
the edge, the hole left transparent) and saved as assets/record/record.webp with its label
empty — the app paints the red label with the number of nights on it. Then every city in
cities.json gets the same record with its own label, assets/record/<slug>.webp: Munich's
"föhn" frame of 22.10.2026 — a sky, a scene in the lower part (tools/record/scenes.py: the
Alps, a skyline, a canal, a river and its bridge, a harbor, a fjord, dunes, palms, the
northern lights), one landmark the city is known by, and its name in the logo face above.
The name sits right of centre because the cover hides the label's left quarter.

components/Sleeve.tsx keeps the list of slugs that have a record (RECORDS, generated here
into src/content/records.ts) and picks the one of the city chosen in the app.
"""
import json
import math
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent / "record"))
from scenes import SCENES, Canvas, hexc  # noqa: E402
from vinyl import LABEL, record  # noqa: E402
import random  # noqa: E402

APP = Path(__file__).resolve().parent.parent
OUT = APP / "assets" / "record"
SPEC = APP / "tools" / "record" / "cities.json"
TS = APP / "src" / "content" / "records.ts"
FONT = APP / "assets" / "fonts" / "ArchivoLogo.ttf"

SIZE = 1024
SS = 2
TEXT_X = 0.60        # centre of the name across the label (the cover hides the left quarter)
NAME_Y = 152         # baseline of the name, label units (400)
NAME_SIZE = 70


def label_image(spec: dict, palettes: dict, px: int) -> Image.Image:
    pal = dict(palettes[spec["palette"]])
    pal.update(spec.get("pal", {}))
    rng = random.Random(spec.get("seed", 1))
    c = Canvas(px)
    SCENES[spec["scene"]](c, spec, pal, rng)
    img = c.img
    k = px / 400
    # paper: a fine grain over everything
    grain = np.random.default_rng(spec.get("seed", 1)).normal(0, 7, (px, px))
    arr = np.array(img).astype(np.float64)
    arr[..., :3] = np.clip(arr[..., :3] + grain[..., None], 0, 255)
    img = Image.fromarray(arr.astype(np.uint8))
    d = ImageDraw.Draw(img)
    ink = hexc(pal["ink"])
    d.ellipse([9 * k, 9 * k, px - 9 * k, px - 9 * k], outline=ink + (95,), width=max(1, round(1.4 * k)))
    # the name, in the logo face; two lines when written with a newline
    lines = spec["name"].split("\n")
    size = NAME_SIZE if len(lines) == 1 else 44
    font = ImageFont.truetype(str(FONT), round(size * k))
    # a long name shrinks until it fits the visible part of the label
    while True:
        widest = max(d.textbbox((0, 0), ln, font=font)[2] for ln in lines)
        if widest <= 250 * k or font.size <= 30 * k:
            break
        font = ImageFont.truetype(str(FONT), font.size - 2)
    y = NAME_Y * k - (len(lines) - 1) * font.size * 0.95
    for ln in lines:
        box = d.textbbox((0, 0), ln, font=font)
        tw = box[2] - box[0]
        d.text((TEXT_X * px - tw / 2 - box[0], y - box[3]), ln, font=font, fill=ink + (255,))
        y += font.size * 0.95
    return img


def compose(blank: Image.Image, disc_alpha: np.ndarray, label: Image.Image, n: int) -> Image.Image:
    lab_px = label.width
    circle = Image.new("L", (lab_px, lab_px)); ImageDraw.Draw(circle).ellipse([0, 0, lab_px - 1, lab_px - 1], fill=255)
    o = (n - lab_px) // 2
    shade = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    ring = Image.new("L", (n, n)); ImageDraw.Draw(ring).ellipse([o - 3 * SS, o - 3 * SS, o + lab_px + 3 * SS, o + lab_px + 3 * SS], fill=110)
    shade.putalpha(ring.filter(ImageFilter.GaussianBlur(4 * SS)))
    out = blank.copy()
    out.alpha_composite(shade)
    out.paste(label, (o, o), circle)
    arr = np.array(out)
    arr[..., 3] = np.minimum(arr[..., 3], disc_alpha)
    return Image.fromarray(arr, "RGBA").resize((SIZE, SIZE), Image.LANCZOS)


def sync(spec: dict) -> list[str]:
    """Adds the cities the live database serves that the spec does not know, with a default look."""
    env = {}
    for line in (APP / ".env").read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1); env[k.strip()] = v.strip()
    url, key = env["EXPO_PUBLIC_SUPABASE_URL"], env["EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
    req = urllib.request.Request(f"{url}/rest/v1/rpc/city_counts", data=b"{}", method="POST",
                                 headers={"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    rows = json.load(urllib.request.urlopen(req))
    known = {c["slug"] for c in spec["cities"]}
    added = []
    for r in sorted(rows, key=lambda r: r["sort_order"]):
        if r["slug"] in known:
            continue
        spec["cities"].append({"slug": r["slug"], "name": r["name"].upper(), "scene": "skyline", "palette": "dusk", "seed": 200 + len(spec["cities"]), "auto": True})
        added.append(r["slug"])
    if added:
        SPEC.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n")
    return added


def write_ts(slugs: list[str]):
    lines = ["// Generated by tools/build-record.py from tools/record/cities.json — do not edit.",
             "// The cities that have a record of their own behind the profile photo (components/Sleeve.tsx).",
             "export const RECORDS: Record<string, number> = {"]
    for s in slugs:
        lines.append(f"  '{s}': require('../../assets/record/{s}.webp'),")
    lines.append("};")
    lines.append("// The same at 192 px, for rails and grids.")
    lines.append("export const RECORD_THUMBS: Record<string, number> = {")
    for s in slugs:
        lines.append(f"  '{s}': require('../../assets/record/thumb/{s}.webp'),")
    lines.append("};")
    TS.write_text("\n".join(lines) + "\n")


def build(only: list[str], sheet: bool, do_sync: bool):
    spec = json.loads(SPEC.read_text())
    if do_sync:
        added = sync(spec)
        print("added from the live list:", ", ".join(added) if added else "nothing new")
    n = SIZE * SS
    disc = (record(n) * 255).astype(np.uint8)
    blank = Image.fromarray(disc, "RGBA")
    OUT.mkdir(parents=True, exist_ok=True)
    if not only:
        blank.resize((SIZE, SIZE), Image.LANCZOS).save(OUT / "record.webp", quality=90, method=6)
        (OUT / "thumb").mkdir(exist_ok=True)
        blank.resize((192, 192), Image.LANCZOS).save(OUT / "thumb" / "record.webp", quality=82, method=6)
    lab_px = round(n * LABEL)
    cities = [c for c in spec["cities"] if not only or c["slug"] in only]
    tiles = []
    for c in cities:
        label = label_image(c, spec["palettes"], lab_px)
        img = compose(blank, disc[..., 3], label, n)
        img.save(OUT / f"{c['slug']}.webp", quality=88, method=6)
        # a 192 px copy for rails and grids (96 px on screen): decoding 93 full records at once froze the phone, 22.10.2026
        (OUT / "thumb").mkdir(exist_ok=True)
        img.resize((192, 192), Image.LANCZOS).save(OUT / "thumb" / f"{c['slug']}.webp", quality=82, method=6)
        print("·", c["slug"])
        if sheet:
            tiles.append((c["slug"], label.resize((220, 220), Image.LANCZOS)))
    write_ts([c["slug"] for c in spec["cities"]])
    if sheet and tiles:
        cols = 8
        rows = math.ceil(len(tiles) / cols)
        board = Image.new("RGB", (cols * 236 + 16, rows * 252 + 16), (24, 23, 21))
        d = ImageDraw.Draw(board)
        font = ImageFont.truetype(str(FONT), 16)
        for i, (slug, tile) in enumerate(tiles):
            x, y = 16 + (i % cols) * 236, 16 + (i // cols) * 252
            mask = Image.new("L", tile.size); ImageDraw.Draw(mask).ellipse([0, 0, 219, 219], fill=255)
            board.paste(tile.convert("RGB"), (x, y), mask)
            d.text((x + 4, y + 224), slug, font=font, fill=(200, 196, 188))
        p = Path(__file__).resolve().parent / "record" / "sheet.png"
        board.save(p)
        print("sheet:", p)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    build(args, "--sheet" in sys.argv, "--sync" in sys.argv)

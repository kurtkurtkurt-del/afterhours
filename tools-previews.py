#!/usr/bin/env python3
"""afterhours — the sharing preview images (og:image).

When a link to a night lands in WhatsApp or Instagram, the preview bot
reads the page without running any JS: at that moment our event pages are
completely empty. Half the answer is the <meta> tags, the other half is
these images.

For every night a 1200x630 card is made: that night's OWN poster on the
left, its name and its line on the right. Because the poster is an SVG it
first goes through headless Chrome to become a PNG (PIL does not read SVG).

    python3 tools-previews.py            # all of them
    python3 tools-previews.py asap-rocky # a single night
"""
import pathlib, re, subprocess, sys, tempfile, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "og"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FONT = pathlib.Path("/tmp/InterTight.ttf")
FONT_URL = ("https://raw.githubusercontent.com/google/fonts/main/ofl/"
            "intertight/InterTight%5Bwght%5D.ttf")

W, H = 1200, 630
BLACK, WHITE, FAINT = (10, 10, 10), (242, 242, 240), (140, 140, 138)

from PIL import Image, ImageDraw, ImageFont


def font(boy, agirlik=500):
    if not FONT.exists():
        urllib.request.urlretrieve(FONT_URL, FONT)
    f = ImageFont.truetype(str(FONT), boy)
    f.set_variation_by_axes([agirlik])
    return f


def events():
    raw = (ROOT / "events-data.js").read_text(encoding="utf-8")
    return [
        {"slug": s, "kind": t, "title": b, "meta": m, "poster": i + 1}
        for i, (s, t, b, m) in enumerate(re.findall(
            r'\{ slug: "([^"]+)", kind: "([^"]+)", *title: "([^"]+)", *meta: "([^"]+)"', raw))
    ]


def poster_to_png(no, target):
    """SVG to PNG: PIL does not read SVG, Chrome does."""
    source = ROOT / "posters" / f"{no:02d}.svg"
    if not source.exists():
        return None
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         f"--window-size=560,840", "--virtual-time-budget=4000",
         f"--screenshot={target}", source.as_uri()],
        capture_output=True, timeout=60)
    return target if target.exists() else None


def wrap(draw, text, f, width):
    """Break into lines that do not exceed the given width."""
    lines, current = [], ""
    for word in text.split():
        attempt = (current + " " + word).strip()
        if draw.textlength(attempt, font=f) <= width:
            current = attempt
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def card(e, poster_png):
    canvas = Image.new("RGB", (W, H), BLACK)
    draw = ImageDraw.Draw(canvas)

    left = 72
    if poster_png:
        p = Image.open(poster_png).convert("RGB")
        top = H - 140
        avail = int(p.width * top / p.height)
        canvas.paste(p.resize((avail, top), Image.LANCZOS), (left, 70))
        left += avail + 64

    avail = W - left - 72

    draw.text((left, 84), e["kind"].upper(), font=font(19, 500), fill=FAINT)

    f_title = font(58, 500)
    lines = wrap(draw, e["title"], f_title, avail)
    if len(lines) > 3:                       # a very long name: shrink it
        f_title = font(44, 500)
        lines = wrap(draw, e["title"], f_title, avail)[:3]
    y = 132
    for s in lines:
        draw.text((left, y), s, font=f_title, fill=WHITE)
        y += int(f_title.size * 1.06)

    y += 18
    for s in wrap(draw, e["meta"], font(24, 400), avail)[:2]:
        draw.text((left, y), s, font=font(24, 400), fill=FAINT)
        y += 34

    draw.text((left, H - 106), "afterhours", font=font(28, 500), fill=WHITE)
    draw.text((left, H - 68), "one card at a time. no search.",
             font=font(19, 400), fill=FAINT)
    return canvas


def general():
    """A single card for the pages that are not events."""
    canvas = Image.new("RGB", (W, H), BLACK)
    draw = ImageDraw.Draw(canvas)
    draw.text((80, 208), "afterhours", font=font(104, 500), fill=WHITE)
    draw.text((84, 344), "your scene, one card at a time.", font=font(34, 400), fill=FAINT)
    draw.text((84, 400), "raves · club nights · konzert · festival · meetup · hausparty",
             font=font(21, 400), fill=FAINT)
    canvas.save(OUT / "afterhours.png", quality=90)
    print("  og/afterhours.png")


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    istenen = sys.argv[1] if len(sys.argv) > 1 else None

    if not istenen:
        general()

    tmpdir = pathlib.Path(tempfile.mkdtemp())
    n = 0
    for e in events():
        if istenen and e["slug"] != istenen:
            continue
        png = poster_to_png(e["poster"], tmpdir / f"{e['poster']:02d}.png")
        card(e, png).save(OUT / f"{e['slug']}.png", quality=90)
        n += 1
        print(f"  og/{e['slug']}.png")
    print(f"{n} previews made")

#!/usr/bin/env python3
"""afterhours — paylasim onizleme gorselleri (og:image).

Bir gece linki WhatsApp'a ya da Instagram'a dusunce onizleme botu
sayfayi JS calistirmadan okuyor: bizim etkinlik sayfalarimiz o anda
bombos. Cozumun yarisi <meta> etiketleri, digeri de bu gorseller.

Her gece icin 1200x630 bir kart uretiliyor: solda gecenin KENDI posteri,
sagda adi ve satiri. Poster SVG oldugu icin once headless Chrome ile
PNG'ye cevriliyor (PIL SVG okumuyor).

    python3 tools-previews.py            # hepsi
    python3 tools-previews.py asap-rocky # tek gece
"""
import pathlib, re, subprocess, sys, tempfile, urllib.request

KOK = pathlib.Path(__file__).resolve().parent
CIKTI = KOK / "og"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FONT = pathlib.Path("/tmp/InterTight.ttf")
FONT_URL = ("https://raw.githubusercontent.com/google/fonts/main/ofl/"
            "intertight/InterTight%5Bwght%5D.ttf")

W, H = 1200, 630
SIYAH, BEYAZ, SOLUK = (10, 10, 10), (242, 242, 240), (140, 140, 138)

from PIL import Image, ImageDraw, ImageFont


def font(boy, agirlik=500):
    if not FONT.exists():
        urllib.request.urlretrieve(FONT_URL, FONT)
    f = ImageFont.truetype(str(FONT), boy)
    f.set_variation_by_axes([agirlik])
    return f


def etkinlikler():
    ham = (KOK / "events-data.js").read_text(encoding="utf-8")
    return [
        {"slug": s, "tur": t, "baslik": b, "meta": m, "poster": i + 1}
        for i, (s, t, b, m) in enumerate(re.findall(
            r'\{ slug: "([^"]+)", tur: "([^"]+)", *baslik: "([^"]+)", *meta: "([^"]+)"', ham))
    ]


def posteri_cevir(no, hedef):
    """SVG'yi PNG'ye: PIL SVG okumuyor, Chrome okuyor."""
    kaynak = KOK / "posters" / f"{no:02d}.svg"
    if not kaynak.exists():
        return None
    subprocess.run(
        [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
         f"--window-size=560,840", "--virtual-time-budget=4000",
         f"--screenshot={hedef}", kaynak.as_uri()],
        capture_output=True, timeout=60)
    return hedef if hedef.exists() else None


def sar(cizim, yazi, f, genislik):
    """Verilen genisligi asmayan satirlara bol."""
    satirlar, simdi = [], ""
    for kelime in yazi.split():
        deneme = (simdi + " " + kelime).strip()
        if cizim.textlength(deneme, font=f) <= genislik:
            simdi = deneme
        else:
            if simdi:
                satirlar.append(simdi)
            simdi = kelime
    if simdi:
        satirlar.append(simdi)
    return satirlar


def kart(e, poster_png):
    tuval = Image.new("RGB", (W, H), SIYAH)
    ciz = ImageDraw.Draw(tuval)

    sol = 72
    if poster_png:
        p = Image.open(poster_png).convert("RGB")
        yuk = H - 140
        gen = int(p.width * yuk / p.height)
        tuval.paste(p.resize((gen, yuk), Image.LANCZOS), (sol, 70))
        sol += gen + 64

    gen = W - sol - 72

    ciz.text((sol, 84), e["tur"].upper(), font=font(19, 500), fill=SOLUK)

    f_baslik = font(58, 500)
    satirlar = sar(ciz, e["baslik"], f_baslik, gen)
    if len(satirlar) > 3:                       # cok uzun ad: kucult
        f_baslik = font(44, 500)
        satirlar = sar(ciz, e["baslik"], f_baslik, gen)[:3]
    y = 132
    for s in satirlar:
        ciz.text((sol, y), s, font=f_baslik, fill=BEYAZ)
        y += int(f_baslik.size * 1.06)

    y += 18
    for s in sar(ciz, e["meta"], font(24, 400), gen)[:2]:
        ciz.text((sol, y), s, font=font(24, 400), fill=SOLUK)
        y += 34

    ciz.text((sol, H - 106), "afterhours", font=font(28, 500), fill=BEYAZ)
    ciz.text((sol, H - 68), "one card at a time. no search.",
             font=font(19, 400), fill=SOLUK)
    return tuval


def genel():
    """Etkinlik olmayan sayfalar icin tek kart."""
    tuval = Image.new("RGB", (W, H), SIYAH)
    ciz = ImageDraw.Draw(tuval)
    ciz.text((80, 208), "afterhours", font=font(104, 500), fill=BEYAZ)
    ciz.text((84, 344), "your scene, one card at a time.", font=font(34, 400), fill=SOLUK)
    ciz.text((84, 400), "raves · club nights · konzert · festival · meetup · hausparty",
             font=font(21, 400), fill=SOLUK)
    tuval.save(CIKTI / "afterhours.png", quality=90)
    print("  og/afterhours.png")


if __name__ == "__main__":
    CIKTI.mkdir(exist_ok=True)
    istenen = sys.argv[1] if len(sys.argv) > 1 else None

    if not istenen:
        genel()

    gecici = pathlib.Path(tempfile.mkdtemp())
    n = 0
    for e in etkinlikler():
        if istenen and e["slug"] != istenen:
            continue
        png = posteri_cevir(e["poster"], gecici / f"{e['poster']:02d}.png")
        kart(e, png).save(CIKTI / f"{e['slug']}.png", quality=90)
        n += 1
        print(f"  og/{e['slug']}.png")
    print(f"{n} onizleme uretildi")

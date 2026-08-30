#!/usr/bin/env python3
"""afterhours — etkinlik sayfalarinin kabugunu uretir.

Her gecenin sayfasi ayni: menu, bos <main class="cs">, dipnot, betikler.
Icerigi explore/event.js kuruyor. Yeni bir gece eklemek icin
events-data.js'e satiri yaz ve bu betigi calistir:

    python3 tools-event-pages.py
"""
import pathlib, re, sys

KOK = pathlib.Path(__file__).resolve().parent
SURUM = sys.argv[1] if len(sys.argv) > 1 else "100"

KABUK = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{baslik} | afterhours</title>
  <meta name="description" content="{metin}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="afterhours" />
  <meta property="og:title" content="{baslik} &mdash; {tur}, {meta}" />
  <meta property="og:description" content="{metin}" />
  <meta property="og:url" content="{site}/explore/{slug}/index.html" />
  <meta property="og:image" content="{site}/og/{slug}.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="theme-color" content="#000000" />
  <link rel="icon" type="image/png" sizes="16x16" href="../../favicon-16.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="../../favicon-32.png" />
  <link rel="icon" type="image/png" sizes="48x48" href="../../favicon-48.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="../../favicon-180.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;700&family=Archivo:wght@400;500;600;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../../style.css?v={v}" />
</head>
<body>

  <a class="skip" href="#content">skip to the content</a>

  <header class="header">
    <a class="logo" href="../../index.html">afterhours</a>
    <nav class="header-links">
      <a href="../../explore/index.html" aria-current="page">explore</a>
      <a href="../../maps/index.html">maps</a>
      <a href="../../friends/index.html">friends&amp;more</a>
      <a href="../../cards/index.html">card collection</a>
      <a href="../../help/index.html">help</a>
      <a href="../../login/index.html">login</a>
    </nav>
  </header>

  <!-- Icerigi explore/event.js kuruyor: duzen tek, gece basina degisen
       her sey etkinligin kendi verisinden ve tur havuzlarindan geliyor. -->
  <main id="content" tabindex="-1" class="cs"></main>

  <footer class="foot">
    <p class="foot-name">&copy; 2026 afterhours</p>
    <nav class="foot-links">
      <a href="../../impressum/index.html">impressum</a>
      <a href="../../datenschutz/index.html">datenschutz</a>
      <a href="../../agb/index.html">agb</a>
    </nav>
  </footer>

  <script src="../../cards.js?v={v}"></script>
  <script src="../event-data.js?v={v}"></script>
  <script src="../../config.js?v={v}"></script>
  <script src="../../session.js?v={v}"></script>
  <script src="../../menu.js?v={v}"></script>
  <script src="../../data.js?v={v}"
          data-fallback="../../events-data.js?v={v}"
          data-after="../event.js?v={v}"></script>

</body>
</html>
"""

SITE = "https://kurtkurtkurt-del.github.io/afterhours"

def kacir(y):
    return y.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")

ham = (KOK / "events-data.js").read_text(encoding="utf-8")
kayitlar = re.findall(
    r'\{ slug: "([^"]+)", kind: "([^"]+)", *title: "([^"]+)", *meta: "([^"]+)", *body: "([^"]+)"',
    ham)
if not kayitlar:
    raise SystemExit("events-data.js'te kayit bulunamadi")

yeni, guncel = 0, 0
for slug, tur, baslik, meta, metin in kayitlar:
    klasor = KOK / "explore" / slug
    vardi = klasor.exists()
    klasor.mkdir(parents=True, exist_ok=True)
    (klasor / "index.html").write_text(
        KABUK.format(baslik=kacir(baslik), tur=kacir(tur.lower()), meta=kacir(meta),
                     metin=kacir(metin), slug=slug, site=SITE, v=SURUM), encoding="utf-8")
    guncel += 1
    yeni += 0 if vardi else 1

print(f"{guncel} etkinlik sayfasi yazildi ({yeni} yeni), surum ?v={SURUM}")

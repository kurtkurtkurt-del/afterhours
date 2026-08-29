#!/usr/bin/env python3
"""afterhours — etkinlik sayfalarinin kabugunu uretir.

Her gecenin sayfasi ayni: menu, bos <main class="ks">, dipnot, betikler.
Icerigi explore/etkinlik.js kuruyor. Yeni bir gece eklemek icin
events-data.js'e satiri yaz ve bu betigi calistir:

    python3 tools-etkinlik.py
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

  <header class="header">
    <a class="logo" href="../../index.html">afterhours</a>
    <nav class="header-links">
      <a href="../../explore/index.html" aria-current="page">explore</a>
      <a href="../../friends/index.html">friends&amp;more</a>
      <a href="../../cards/index.html">card collection</a>
      <a href="../../help/index.html">help</a>
      <a href="../../login/index.html">login</a>
    </nav>
  </header>

  <!-- Icerigi explore/etkinlik.js kuruyor: duzen tek, gece basina degisen
       her sey etkinligin kendi verisinden ve tur havuzlarindan geliyor. -->
  <main class="ks"></main>

  <footer class="dipnot">
    <p class="dipnot-ad">&copy; 2026 afterhours</p>
    <nav class="dipnot-linkler">
      <a href="../../impressum/index.html">impressum</a>
      <a href="../../datenschutz/index.html">datenschutz</a>
      <a href="../../agb/index.html">agb</a>
    </nav>
  </footer>

  <script src="../../kartlar.js?v={v}"></script>
  <script src="../etkinlik-veri.js?v={v}"></script>
  <script src="../../ayar.js?v={v}"></script>
  <script src="../../oturum.js?v={v}"></script>
  <script src="../../menu.js?v={v}"></script>
  <script src="../../veri.js?v={v}"
          data-yedek="../../events-data.js?v={v}"
          data-sonra="../etkinlik.js?v={v}"></script>

</body>
</html>
"""

ham = (KOK / "events-data.js").read_text(encoding="utf-8")
kayitlar = re.findall(r'\{\s*slug:\s*"([^"]+)".*?baslik:\s*"([^"]+)"', ham, re.S)
if not kayitlar:
    raise SystemExit("events-data.js'te kayit bulunamadi")

yeni, guncel = 0, 0
for slug, baslik in kayitlar:
    klasor = KOK / "explore" / slug
    vardi = klasor.exists()
    klasor.mkdir(parents=True, exist_ok=True)
    (klasor / "index.html").write_text(
        KABUK.format(baslik=baslik.replace("&", "&amp;"), v=SURUM), encoding="utf-8")
    guncel += 1
    yeni += 0 if vardi else 1

print(f"{guncel} etkinlik sayfasi yazildi ({yeni} yeni), surum ?v={SURUM}")

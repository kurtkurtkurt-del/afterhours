#!/usr/bin/env python3
"""afterhours — writes the shell of the event pages, and the sitemap.

Every night's page is the same: the menu, an empty <main class="cs">, the
footer, the scripts. explore/event.js builds the content. Two sources:
the 36 Munich nights in events-data.js, and the 106 world nights in
backend/tools/world-record.json (their slug and meta line are derived
here EXACTLY the way backend/tools/world-sql.mjs derives them for the
database — the folder name and the live slug must never disagree).

    python3 tools-event-pages.py [version]
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent
VERSION = sys.argv[1] if len(sys.argv) > 1 else "100"

SHELL = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title} | afterhours</title>
  <meta name="description" content="{body}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="afterhours" />
  <meta property="og:title" content="{title} &mdash; {kind}, {meta}" />
  <meta property="og:description" content="{body}" />
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
  <link rel="manifest" href="../../manifest.webmanifest" />
  <link rel="stylesheet" href="../../fonts/fonts.css?v={v}" />
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

  <!-- explore/event.js builds the content: one layout, and everything that
       changes from night to night comes from the event's own data and the
       pools for its kind. -->
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

def escape(y):
    return y.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;")

raw = (ROOT / "events-data.js").read_text(encoding="utf-8")
records = re.findall(
    r'\{ slug: "([^"]+)", kind: "([^"]+)", *title: "([^"]+)", *meta: "([^"]+)", *body: "([^"]+)"',
    raw)
if not records:
    raise SystemExit("no records found in events-data.js")


def slugify(s):
    """The SAME rule as backend/tools/world-sql.mjs — change both or neither."""
    s = s.lower()
    for a, b in [("\u00fc", "u"), ("\u00f6", "o"), ("\u00e4", "a"), ("\u00df", "ss"),
                 ("\u015f", "s"), ("\u00e7", "c"), ("\u0131", "i"), ("\u011f", "g"),
                 ("\u00e9", "e"), ("\u00e8", "e"), ("\u00ea", "e"),
                 ("\u00e1", "a"), ("\u00e0", "a"), ("\u00e2", "a"),
                 ("\u00ed", "i"), ("\u00ec", "i"),
                 ("\u00f3", "o"), ("\u00f2", "o"), ("\u00f4", "o"),
                 ("\u00fa", "u"), ("\u00f9", "u"), ("\u00fb", "u"), ("\u00f1", "n"),
                 ("$", "s")]:
        s = s.replace(a, b)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


world = json.loads((ROOT / "backend" / "tools" / "world-record.json").read_text(encoding="utf-8"))
for g in world:
    records.append((
        slugify(g["city"] + "-" + g["title"]),
        g["kind"], g["title"],
        f"{g['venue']} \u00b7 {g['day']} \u00b7 {g['time']}",
        g["body"],
    ))

fresh, written = 0, 0
for slug, kind, title, meta, body in records:
    folder = ROOT / "explore" / slug
    existed = folder.exists()
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "index.html").write_text(
        SHELL.format(title=escape(title), kind=escape(kind.lower()), meta=escape(meta),
                     body=escape(body), slug=slug, site=SITE, v=VERSION), encoding="utf-8")
    written += 1
    fresh += 0 if existed else 1

print(f"{written} event pages written ({fresh} new), version ?v={VERSION}")

# ---- the sitemap: every page that exists, nothing that does not ----
import datetime
today = datetime.date.today().isoformat()
STATIC = ["", "explore/", "maps/", "cards/", "friends/", "login/", "register/",
          "settings/", "feedback/", "reset/", "help/",
          "impressum/", "datenschutz/", "agb/"]
lines = ['<?xml version="1.0" encoding="UTF-8"?>',
         '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
def url(path, prio):
    lines.append("  <url>")
    lines.append(f"    <loc>{SITE}/{path}index.html</loc>")
    lines.append(f"    <lastmod>{today}</lastmod>")
    lines.append(f"    <priority>{prio}</priority>")
    lines.append("  </url>")
for path in STATIC:
    url(path, "0.8" if path in ("", "explore/") else "0.5")
for slug, *_ in records:
    url(f"explore/{slug}/", "0.6")
lines.append("</urlset>")
(ROOT / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"sitemap.xml written: {len(STATIC) + len(records)} pages")

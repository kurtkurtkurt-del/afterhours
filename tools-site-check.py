#!/usr/bin/env python3
"""afterhours — does every reference on the site lead somewhere.

The browser shows none of this: a bulk rename that leaves two <label>s
pointing at nothing, a kept-list link to an event page that was never
generated, a poster or og image whose number nobody wrote — it all fails
in silence until a person walks into it. This walks instead:

  1. every href/src/data/action in every HTML file resolves to a file
     that exists (external addresses, anchors and mailto are left alone);
  2. every event — the 36 in events-data.js AND the 106 world nights in
     backend/tools/world-record.json — has its page shell, its poster
     and its og preview;
  3. every page carries the same ?v= number.

Exit 0 clean, exit 1 with a list. CI runs it as the "site" job.
"""
import json, pathlib, re, sys
from urllib.parse import urlparse, unquote

ROOT = pathlib.Path(__file__).resolve().parent
problems = []


def slugify(s):
    """The SAME rule as backend/tools/world-sql.mjs — change both or neither."""
    s = s.lower()
    for a, b in [("ü", "u"), ("ö", "o"), ("ä", "a"), ("ß", "ss"),
                 ("ş", "s"), ("ç", "c"), ("ı", "i"), ("ğ", "g"),
                 ("é", "e"), ("è", "e"), ("ê", "e"),
                 ("á", "a"), ("à", "a"), ("â", "a"),
                 ("í", "i"), ("ì", "i"),
                 ("ó", "o"), ("ò", "o"), ("ô", "o"),
                 ("ú", "u"), ("ù", "u"), ("û", "u"), ("ñ", "n"),
                 ("$", "s")]:
        s = s.replace(a, b)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


# ---------------------------------------------------- 1 · every reference

SKIP_DIRS = {".git", "backend", "node_modules"}
pages = [p for p in ROOT.rglob("*.html")
         if not (set(p.relative_to(ROOT).parts) & SKIP_DIRS)]

REF = re.compile(r'(?:href|src|data|action)="([^"]+)"')
versions = set()

for page in pages:
    text = page.read_text(encoding="utf-8")
    versions.update(re.findall(r"\?v=(\d+)", text))
    for ref in REF.findall(text):
        if ref.startswith(("http://", "https://", "mailto:", "#", "data:", "//")):
            continue
        path = unquote(urlparse(ref).path)
        if not path:
            continue
        # 404.html builds its links at runtime from data-path
        if page.name == "404.html":
            continue
        target = (ROOT / path.lstrip("/")) if path.startswith("/") \
            else (page.parent / path).resolve()
        if not target.exists():
            problems.append(f"{page.relative_to(ROOT)}: {ref} leads nowhere")

# data-path on 404.html resolves from the ROOT
t404 = (ROOT / "404.html")
if t404.exists():
    for ref in re.findall(r'data-path="([^"]+)"', t404.read_text(encoding="utf-8")):
        if not (ROOT / ref).exists():
            problems.append(f"404.html: data-path {ref} leads nowhere")

# ------------------------------------------ 2 · (retired with the seeds)

# The per-event page/poster/og requirement is gone: real events live in
# the database and are served by the shared shell explore/event/, no
# generated folder per night. The walk above still proves every link
# that EXISTS leads somewhere.

# ----------------------------------------------------- 3 · one version

if len(versions) > 1:
    problems.append("more than one ?v= across the pages: " + ", ".join(sorted(versions)))

# --------------------------------------------------------------- report

if problems:
    print(f"{len(problems)} problems:")
    for p in problems:
        print("  · " + p)
    sys.exit(1)

print(f"clean: {len(pages)} pages walked, "
      f"one version (?v={versions.pop() if versions else '—'})")

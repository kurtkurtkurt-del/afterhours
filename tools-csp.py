#!/usr/bin/env python3
"""afterhours — the Content-Security-Policy of every site page.

GitHub Pages sends no headers of our own, so the policy rides in a
<meta http-equiv> right after <meta charset> (audit L-14). One policy for
all pages, written here; each page adds the sha256 of its own inline
<script> blocks, so an inline script that changes without this tool being
run is blocked in the browser — and caught by --check first.

  python3 tools-csp.py           write / refresh the meta on every page
  python3 tools-csp.py --check   only report (tools-site-check.py runs this)
  python3 tools-csp.py --local   also allow the local mock server (localhost),
                                 for development only — --check fails on it,
                                 so it cannot be committed by accident

What a meta CSP cannot do: frame-ancestors (ignored in a meta), so the
pages can still be framed; that needs a real header (own domain + CDN).
Prototypes (prototypes/), the other repository's user-site/ and the app
(app/, its own build) are left alone.
"""
import base64
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SKIP_DIRS = {"app", ".git", ".claude", "backend", "node_modules", "user-site", "prototypes", "design"}

config = (ROOT / "config.js").read_text(encoding="utf-8")
supabase = re.search(r'url:\s*"(https://[^"]+)"', config).group(1).rstrip("/")

POLICY = [
    "default-src 'self'",
    "script-src 'self'{hashes}",
    # style="" attributes and the <style> some scripts add (webapp.js)
    "style-src 'self' 'unsafe-inline'",
    # posters and avatars come from many hosts (Ticketmaster, Storage, …)
    "img-src 'self' data: blob: https:",
    # song previews (iTunes and whatever previews_for hands back)
    "media-src 'self' blob: https:",
    "font-src 'self'",
    # Supabase (REST, Auth, Storage) and the iTunes search on a night page
    f"connect-src 'self' {supabase} https://itunes.apple.com{{local}}",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    # a drawn poster is an SVG in an <object> (app.js, strip.js)
    "object-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
]

LOCAL = "--local" in sys.argv

INLINE = re.compile(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", re.S)
META = re.compile(r'\n?[ \t]*<meta http-equiv="Content-Security-Policy"[^>]*>')
CHARSET = re.compile(r'([ \t]*)<meta charset="[^"]*"\s*/?>')


def pages():
    return sorted(p for p in ROOT.rglob("*.html")
                  if not (set(p.relative_to(ROOT).parts) & SKIP_DIRS))


def policy_for(text):
    hashes = "".join(
        " 'sha256-" + base64.b64encode(hashlib.sha256(body.encode("utf-8")).digest()).decode() + "'"
        for body in INLINE.findall(text))
    local = " http://localhost:* http://127.0.0.1:*" if LOCAL else ""
    return "; ".join(POLICY).format(hashes=hashes, local=local)


def wanted(text):
    """The page as it should be: one CSP meta, right after the charset."""
    bare = META.sub("", text)
    m = CHARSET.search(bare)
    if not m:
        return None
    tag = f'\n{m.group(1)}<meta http-equiv="Content-Security-Policy" content="{policy_for(bare)}" />'
    return bare[:m.end()] + tag + bare[m.end():]


def main():
    check = "--check" in sys.argv
    problems, changed = [], 0
    for page in pages():
        text = page.read_text(encoding="utf-8")
        name = page.relative_to(ROOT)
        good = wanted(text)
        if good is None:
            problems.append(f"{name}: no <meta charset>, nowhere to put the CSP")
        elif good != text:
            if check:
                problems.append(f"{name}: CSP missing or out of date (python3 tools-csp.py)")
            else:
                page.write_text(good, encoding="utf-8")
                changed += 1
    for p in problems:
        print("  ✗ " + p)
    if problems:
        sys.exit(1)
    print(f"CSP: {len(pages())} pages" + (f", {changed} written" if changed else " — clean"))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""afterhours — a local server whose pages reload themselves (owner, 04.11.2026).

    python3 tools-live.py [port]        default 4341, serves this folder

Every .html page gets a small script that asks the server every 700 ms whether any
file it loaded (the page, its css, its js) changed on disk; when one did, the page
reloads. Nothing else is touched: no build step, no extra files. For looking at a
design while it is being edited: http://localhost:4341/design/site-5.html
"""
import json
import os
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote, urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4341

SCRIPT = b"""
<script>
(function(){
  var seen = {};
  function files(){
    var out = [location.pathname];
    document.querySelectorAll('link[rel=stylesheet][href],script[src]').forEach(function(e){
      var u = new URL(e.getAttribute('href') || e.getAttribute('src'), location.href);
      if (u.origin === location.origin) out.push(u.pathname);
    });
    return out;
  }
  function tick(){
    fetch('/__mtime?' + files().map(function(f){ return 'f=' + encodeURIComponent(f); }).join('&'), {cache:'no-store'})
      .then(function(r){ return r.json(); })
      .then(function(m){
        var changed = false;
        Object.keys(m).forEach(function(k){ if (seen[k] !== undefined && seen[k] !== m[k]) changed = true; seen[k] = m[k]; });
        if (changed) location.reload();
      }).catch(function(){});
  }
  setInterval(tick, 700); tick();
})();
</script>
"""


class Live(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=ROOT, **k)

    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/__mtime":
            out = {}
            for f in parse_qs(u.query).get("f", []):
                p = os.path.normpath(os.path.join(ROOT, unquote(f).lstrip("/")))
                if p.startswith(ROOT) and os.path.isdir(p):
                    p = os.path.join(p, "index.html")
                try:
                    out[f] = os.stat(p).st_mtime if p.startswith(ROOT) else 0
                except OSError:
                    out[f] = 0
            body = json.dumps(out).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        path = self.translate_path(u.path)
        if os.path.isdir(path):
            path = os.path.join(path, "index.html")
        if path.endswith(".html") and os.path.isfile(path):
            with open(path, "rb") as fh:
                body = fh.read()
            i = body.lower().rfind(b"</body>")
            body = body[:i] + SCRIPT + body[i:] if i >= 0 else body + SCRIPT
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


if __name__ == "__main__":
    print(f"live at http://localhost:{PORT}/  (pages reload when their files change)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Live).serve_forever()

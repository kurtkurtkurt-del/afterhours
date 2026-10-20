"""afterhours — cut numbered SQL files into small parts for the Supabase SQL editor.

The editor freezes on a phone with more than ~10 KB, so comment lines go and files
are cut at statement boundaries (outside quotes and $tag$ bodies) into parts of at
most LIMIT bytes; one statement larger than that stays whole. Usage:
    python3 tools/paste-parts.py 64 94 sql/paste-2026-10-20 [extra.sql ...]
"""
import glob, os, re, sys

LIMIT = 6000
D = os.path.join(os.path.dirname(__file__), "..", "sql") + "/"

def strip(t):
    t = "\n".join(l.rstrip() for l in t.split("\n") if not re.match(r"^\s*--", l))
    return re.sub(r"\n{3,}", "\n\n", t).strip() + "\n"

def statements(t):
    out, buf, i, n, dollar, sq = [], [], 0, len(t), None, False
    while i < n:
        c = t[i]
        if dollar:
            if t.startswith(dollar, i):
                buf.append(dollar); i += len(dollar); dollar = None; continue
        elif sq:
            if c == "'": sq = False
        else:
            m = re.match(r"\$[A-Za-z_]*\$", t[i:])
            if m:
                dollar = m.group(0); buf.append(dollar); i += len(dollar); continue
            if c == "'": sq = True
            if c == ";":
                buf.append(";"); s = "".join(buf).strip()
                if s: out.append(s)
                buf = []; i += 1; continue
        buf.append(c); i += 1
    rest = "".join(buf).strip()
    if rest: out.append(rest)
    return out

def split_values(stmt):
    m = re.match(r"(?s)(.*?from \(values\n)(.*?)(\n\) as v.*)", stmt)
    if not m: return [stmt]
    head, rows, tail = m.groups(); rows = rows.split(",\n"); out, cur = [], []
    for r in rows:
        if cur and len(head + ",\n".join(cur + [r]) + tail) > LIMIT:
            out.append(head + ",\n".join(cur) + tail); cur = []
        cur.append(r)
    out.append(head + ",\n".join(cur) + tail); return out

def main(lo, hi, out, extra):
    files = [os.path.basename(f) for n in range(lo, hi + 1) for f in sorted(glob.glob(D + f"{n}_*.sql"))] + extra
    chunks = []
    for f in files:
        for s in statements(strip(open(D + f).read())):
            chunks += [(f, x) for x in (split_values(s) if len(s) > LIMIT else [s])]
    parts, cur, size = [], [], 0
    for f, s in chunks:
        if cur and size + len(s) + 2 > LIMIT: parts.append(cur); cur, size = [], 0
        cur.append((f, s)); size += len(s) + 2
    parts.append(cur)
    os.makedirs(D + out, exist_ok=True)
    for g in glob.glob(D + out + "/*.sql"): os.remove(g)
    for i, p in enumerate(parts, 1):
        names = list(dict.fromkeys(f for f, _ in p))
        body = f"-- paste {i}/{len(parts)}: " + " ".join(x.split("_")[0].replace(".sql", "") for x in names) + "\n" + "\n\n".join(s for _, s in p) + "\n"
        open(D + out + f"/part-{i:02d}.sql", "w").write(body)
    print(len(parts), "parts in", out)

if __name__ == "__main__":
    main(int(sys.argv[1]), int(sys.argv[2]), sys.argv[3].replace("sql/", ""), sys.argv[4:])

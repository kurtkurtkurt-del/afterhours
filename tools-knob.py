"""Builds knob.js from knob.src.js: bundles the three.js parts it uses
(vendor/three-0.184.0) and minifies them into one file.

    python3 tools-knob.py

Needs esbuild. It uses the copy in ../fitkurt if there is one, otherwise
npx fetches it. Node lives at ~/.local/node (not on PATH by default)."""

import os
import subprocess

here = os.path.dirname(os.path.abspath(__file__))
env = dict(os.environ)
env["PATH"] = os.path.expanduser("~/.local/node/bin") + os.pathsep + env.get("PATH", "")

local = os.path.join(here, "..", "fitkurt", "node_modules", ".bin", "esbuild")
cmd = [local] if os.path.exists(local) else ["npx", "--yes", "esbuild@0.25"]
cmd += [
    "knob.src.js", "--bundle", "--minify", "--format=iife",
    "--target=es2020", "--legal-comments=eof", "--outfile=knob.js",
]
subprocess.run(cmd, cwd=here, env=env, check=True)
print("knob.js:", os.path.getsize(os.path.join(here, "knob.js")) // 1024, "KB")

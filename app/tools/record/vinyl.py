"""The black record itself: grooves, the light on them, the run-out, the edge, the hole.

React Native cannot paint grooves or a conic sheen, so the record is drawn here with numpy
as a picture (RGBA floats 0–1). Used by tools/build-record.py for every city.
"""
import numpy as np

LABEL = 0.42         # label radius / record radius
RUNOUT = 0.50        # smooth run-out up to here
HOLE = 0.026


def record(n: int, seed: int = 7) -> np.ndarray:
    """The black record, n × n, as RGBA floats 0–1; the label area is left as plain run-out."""
    rng = np.random.default_rng(seed)
    y, x = np.mgrid[0:n, 0:n].astype(np.float64)
    c = (n - 1) / 2
    dx, dy = x - c, y - c
    r = np.hypot(dx, dy) / (n / 2)          # 0 at the centre, 1 at the edge
    a = np.arctan2(dy, dx)                  # -pi..pi

    base = np.full_like(r, 0.055)
    # grooves: a fine wave over the radius, its depth wandering a little (wear, pressing)
    period = 3.4 / (n / 2)
    wander = np.cumsum(rng.normal(0, 1, 4096)); wander = (wander - wander.min()) / (np.ptp(wander) + 1e-9)
    depth = 0.5 + 0.5 * np.interp(r, np.linspace(0, 1, 4096), wander)
    groove = 0.5 + 0.5 * np.sin(2 * np.pi * r / period)
    grooved = (r > RUNOUT) & (r < 0.965)
    for g in (0.62, 0.74, 0.86):            # the gaps between tracks: smooth, a hair brighter
        grooved &= ~(np.abs(r - g) < 0.006)
    gaps = np.zeros_like(r)
    for g in (0.62, 0.74, 0.86):
        gaps += np.exp(-((r - g) / 0.003) ** 2)
    v = base + grooved * groove * depth * 0.035 + gaps * 0.03

    # the light: two highlights opposite each other, a narrow core and a soft spread
    def lobe(theta, w):
        d = np.angle(np.exp(1j * (a - theta)))
        return np.exp(-(d / w) ** 2)
    t0 = np.deg2rad(-58)
    sheen = 0.55 * (lobe(t0, 0.09) + lobe(t0 + np.pi, 0.08)) + 0.22 * (lobe(t0, 0.32) + lobe(t0 + np.pi, 0.3))
    band = np.clip((r - 0.44) / 0.12, 0, 1) * np.clip((0.985 - r) / 0.05, 0, 1)
    texture = np.where(grooved, 0.55 + 0.45 * groove, 0.8)
    v = v + sheen * band * texture * 0.34
    runout = (r > LABEL) & (r <= RUNOUT)
    v = v + runout * (0.018 + 0.12 * (lobe(t0, 0.22) + lobe(t0 + np.pi, 0.22)))
    # the edge: a dark lip, a bright bevel, then off
    v = v + 0.16 * np.exp(-((r - 0.982) / 0.006) ** 2) - 0.03 * np.exp(-((r - 0.995) / 0.004) ** 2)
    v = v + rng.normal(0, 0.006, v.shape)

    rgb = np.clip(np.stack([v * 0.99, v, v * 1.02], -1), 0, 1)
    edge = np.clip(((1.0 - r) * (n / 2)), 0, 1)
    hole = np.clip(((r - HOLE) * (n / 2)), 0, 1)
    return np.dstack([rgb, edge * hole])

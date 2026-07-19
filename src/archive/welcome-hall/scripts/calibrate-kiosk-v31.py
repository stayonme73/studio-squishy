"""Calibrate kioskTapTarget on 1920x1080 welcome hall plate v31."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SCENE = ROOT / "public" / "welcome-hall" / "welcome-hall-scene-v3.2.png"
OUT = ROOT / "public" / "welcome-hall" / "_verify-hotspots-v31.png"


def main() -> None:
    img = Image.open(SCENE).convert("RGB")
    w, h = img.size
    assert w == 1920 and h == 1080, f"expected 1920x1080, got {w}x{h}"

    # Search right foreground for dark kiosk body (screen is bright cyan/white).
    x0, x1 = int(w * 0.68), w
    y0, y1 = int(h * 0.35), int(h * 0.98)

    best = None
    for y in range(y0, y1 - 80, 4):
        for x in range(x0, x1 - 60, 4):
            region = img.crop((x, y, min(x + 220, w), min(y + 420, h)))
            px = region.load()
            rw, rh = region.size
            dark = 0
            bright = 0
            for py in range(rh):
                for px_x in range(rw):
                    r, g, b = px[px_x, py]
                    lum = 0.299 * r + 0.587 * g + 0.114 * b
                    if lum < 55:
                        dark += 1
                    elif lum > 170 and g > r and b > r:
                        bright += 1
            score = dark + bright * 0.35
            if best is None or score > best[0]:
                best = (score, x, y)

    assert best is not None
    _, bx, by = best
    rect = {
        "x": max(0, bx - 12),
        "y": max(0, by - 8),
        "width": min(w - bx + 12, 420),
        "height": min(h - by + 8, 560),
    }

    overlay = img.copy()
    from PIL import ImageDraw

    draw = ImageDraw.Draw(overlay)
    r = rect
    draw.rectangle(
        (r["x"], r["y"], r["x"] + r["width"], r["y"] + r["height"]),
        outline="red",
        width=4,
    )
    overlay.save(OUT)

    print("kioskTapTarget", rect)
    print(
        "percent",
        {
            "left": f'{(rect["x"] / w) * 100:.1f}%',
            "top": f'{(rect["y"] / h) * 100:.1f}%',
            "width": f'{(rect["width"] / w) * 100:.1f}%',
            "height": f'{(rect["height"] / h) * 100:.1f}%',
        },
    )


if __name__ == "__main__":
    main()

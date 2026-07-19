"""Calibrate kioskTapTarget on welcome hall plate v4 (left kiosk)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SCENE = ROOT / "public" / "welcome-hall" / "welcome-hall-scene-v4.png"
OUT = ROOT / "public" / "welcome-hall" / "_verify-hotspots-v4.png"


def main() -> None:
    img = Image.open(SCENE).convert("RGB")
    w, h = img.size
    print("native", w, h)

    x0, x1 = 0, int(w * 0.42)
    y0, y1 = int(h * 0.28), int(h * 0.98)

    best = None
    for y in range(y0, y1 - 40, 8):
        for x in range(x0, x1 - 40, 8):
            region = img.crop((x, y, min(x + 180, w), min(y + 280, h)))
            px = region.load()
            rw, rh = region.size
            dark = bright = 0
            for py in range(rh):
                for px_x in range(rw):
                    r, g, b = px[px_x, py]
                    lum = 0.299 * r + 0.587 * g + 0.114 * b
                    if lum < 55:
                        dark += 1
                    elif lum > 150:
                        bright += 1
            score = dark + bright * 0.25
            if best is None or score > best[0]:
                best = (score, x, y)

    assert best is not None
    _, bx, by = best
    rect = {
        "x": max(0, bx - 8),
        "y": max(0, by - 6),
        "width": min(w - bx + 8, 280),
        "height": min(h - by + 6, 320),
    }

    overlay = img.copy()
    draw = ImageDraw.Draw(overlay)
    draw.rectangle(
        (rect["x"], rect["y"], rect["x"] + rect["width"], rect["y"] + rect["height"]),
        outline="red",
        width=3,
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

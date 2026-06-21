"""Install draft board asset: crop to clipboard only, trim margins, calibrate paper rect."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSETS = Path(
    r"C:\Users\tagia\.cursor\projects\c-Users-tagia-studio-squishy\assets"
)
OUT = ROOT / "public" / "draft-room" / "draft-board-paper.png"
VERIFY = ROOT / "public" / "draft-room" / "_verify-paper-rect.png"


def is_dark_wood(r: int, g: int, b: int) -> bool:
    return r < 95 and g < 75 and b < 60 and r > 18


def is_cream(r: int, g: int, b: int) -> bool:
    return r > 195 and g > 180 and b > 150 and r - b < 80 and g > b - 20


def wood_col_density(img: Image.Image, x: int, y0: int, y1: int) -> float:
    px = img.load()
    hits = sum(1 for y in range(y0, y1) if is_dark_wood(*px[x, y][:3]))
    return hits / (y1 - y0)


def wood_row_density(img: Image.Image, y: int, x0: int, x1: int) -> float:
    px = img.load()
    hits = sum(1 for x in range(x0, x1) if is_dark_wood(*px[x, y][:3]))
    return hits / (x1 - x0)


def find_board_rect(img: Image.Image) -> tuple[int, int, int, int]:
    """Tight crop to wood clipboard frame — excludes desk, blueprints, room."""
    w, h = img.size
    y0, y1 = int(h * 0.15), int(h * 0.92)
    cx = w // 2

    left = 0
    for x in range(cx, -1, -1):
        if wood_col_density(img, x, y0, y1) > 0.55:
            left = x
            break

    right = w - 1
    for x in range(cx, w):
        if wood_col_density(img, x, y0, y1) > 0.55:
            right = x
            break

    x0, x1 = left, right + 1
    top = 0
    for y in range(int(h * 0.05), int(h * 0.45)):
        if wood_row_density(img, y, x0, x1) > 0.30:
            top = y
            break

    bottom = h - 1
    for y in range(h - 1, int(h * 0.55), -1):
        if wood_row_density(img, y, x0, x1) > 0.30:
            bottom = y
            break

    pad = 1
    return max(0, left - pad), max(0, top - pad), min(w, right + 1 + pad), min(h, bottom + 1 + pad)


def find_writable_paper_rect(img: Image.Image) -> dict[str, int]:
    """Blank center paper: below clip, above compass rose / corner flourishes."""
    w, h = img.size
    px = img.load()
    cx0, cx1 = int(w * 0.18), int(w * 0.82)

    def cream_row(y: int) -> float:
        return sum(1 for x in range(cx0, cx1) if is_cream(*px[x, y][:3])) / (cx1 - cx0)

    paper_top = int(h * 0.14)
    for y in range(int(h * 0.10), int(h * 0.35)):
        if cream_row(y) >= 0.75:
            paper_top = y
            break

    paper_bottom = int(h * 0.78)
    for y in range(int(h * 0.82), int(h * 0.50), -1):
        if cream_row(y) >= 0.75:
            paper_bottom = y
            break

    paper_left = int(w * 0.14)
    for x in range(int(w * 0.08), int(w * 0.35)):
        hits = sum(1 for y in range(paper_top, paper_bottom + 1) if is_cream(*px[x, y][:3]))
        if hits >= (paper_bottom - paper_top + 1) * 0.65:
            paper_left = x
            break

    paper_right = int(w * 0.86)
    for x in range(int(w * 0.92), int(w * 0.65), -1):
        hits = sum(1 for y in range(paper_top, paper_bottom + 1) if is_cream(*px[x, y][:3]))
        if hits >= (paper_bottom - paper_top + 1) * 0.65:
            paper_right = x
            break

    inset = 10
    return {
        "x": paper_left + inset,
        "y": paper_top + inset,
        "width": paper_right - paper_left + 1 - 2 * inset,
        "height": paper_bottom - paper_top + 1 - 2 * inset,
    }


def pick_source() -> tuple[Path, str]:
    primary = next(ASSETS.rglob("*7e446b52*"), None)
    fallback = next(ASSETS.rglob("*d3d52f89*"), None)
    if primary:
        return primary, "7e446b52 wood-border scan"
    if fallback:
        return fallback, "d3d52f89 wood-border scan (fallback)"
    raise FileNotFoundError("No draft board source image in assets folder")


def main() -> None:
    src, method = pick_source()
    img = Image.open(src).convert("RGBA")
    orig_w, orig_h = img.size

    board = find_board_rect(img)
    cropped = img.crop(board)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    cropped.save(OUT, optimize=True)

    paper = find_writable_paper_rect(cropped)

    vis = cropped.convert("RGB")
    draw = ImageDraw.Draw(vis)
    x, y, pw, ph = paper["x"], paper["y"], paper["width"], paper["height"]
    draw.rectangle([x, y, x + pw, y + ph], outline=(255, 0, 0), width=2)
    vis.save(VERIFY)

    result = {
        "source": src.name,
        "crop_method": method,
        "source_size": {"width": orig_w, "height": orig_h},
        "board_crop": {
            "x": board[0],
            "y": board[1],
            "width": board[2] - board[0],
            "height": board[3] - board[1],
        },
        "native_size": {"width": cropped.width, "height": cropped.height},
        "paper_rect": paper,
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

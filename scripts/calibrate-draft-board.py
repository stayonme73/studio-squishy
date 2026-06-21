"""Refined paper rect + CONTINUE hotspot calibration for draft board."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

IMG = Path("public/draft-room/draft-board-paper.png")


def is_cream(r: int, g: int, b: int) -> bool:
    return r > 200 and g > 185 and b > 155 and r - b < 70 and g - b > 5


def cream_density_row(img: Image.Image, y: int, x0: int, x1: int) -> float:
    px = img.load()
    hits = sum(1 for x in range(x0, x1) if is_cream(*px[x, y][:3]))
    return hits / (x1 - x0)


def main() -> None:
    img = Image.open(IMG).convert("RGB")
    w, h = img.size
    px = img.load()

    # Scan center column band for paper left/right edges
    mid_y0 = int(h * 0.35)
    mid_y1 = int(h * 0.75)
    col_score = []
    for x in range(w):
        hits = sum(1 for y in range(mid_y0, mid_y1) if is_cream(*px[x, y][:3]))
        col_score.append(hits / (mid_y1 - mid_y0))

    threshold = 0.65
    cream_cols = [x for x, s in enumerate(col_score) if s >= threshold]
    paper_left = cream_cols[0] if cream_cols else int(w * 0.22)
    paper_right = cream_cols[-1] if cream_cols else int(w * 0.78)

    # Paper top: first row with high cream density across paper width
    row_threshold = 0.7
    paper_top = mid_y0
    for y in range(int(h * 0.15), int(h * 0.45)):
        d = cream_density_row(img, y, paper_left, paper_right + 1)
        if d >= row_threshold:
            paper_top = y
            break

    # Paper bottom: last sustained cream row before desk clutter
    paper_bottom = int(h * 0.82)
    for y in range(int(h * 0.85), paper_top, -1):
        d = cream_density_row(img, y, paper_left, paper_right + 1)
        if d >= row_threshold:
            paper_bottom = y
            break

    inset = 12
    paper = {
        "x": paper_left + inset,
        "y": paper_top + inset,
        "width": paper_right - paper_left + 1 - 2 * inset,
        "height": paper_bottom - paper_top + 1 - 2 * inset,
    }

    # CONTINUE button: dark brown band in upper-mid paper
    btn_min_x, btn_min_y, btn_max_x, btn_max_y = paper["x"] + paper["width"], paper["y"] + paper["height"], paper["x"], paper["y"]
    scan_y0 = paper["y"] + int(paper["height"] * 0.30)
    scan_y1 = paper["y"] + int(paper["height"] * 0.52)
    cx0 = paper["x"] + int(paper["width"] * 0.15)
    cx1 = paper["x"] + int(paper["width"] * 0.85)

    for y in range(scan_y0, scan_y1):
        for x in range(cx0, cx1):
            r, g, b = px[x, y][:3]
            if 45 < r < 95 and 30 < g < 75 and 25 < b < 65:
                btn_min_x = min(btn_min_x, x)
                btn_max_x = max(btn_max_x, x)
                btn_min_y = min(btn_min_y, y)
                btn_max_y = max(btn_max_y, y)

    pad = 8
    hotspot = {
        "x": max(paper["x"], btn_min_x - pad),
        "y": max(paper["y"], btn_min_y - pad),
        "width": min(paper["x"] + paper["width"], btn_max_x + pad) - max(paper["x"], btn_min_x - pad),
        "height": min(paper["y"] + paper["height"], btn_max_y + pad) - max(paper["y"], btn_min_y - pad),
    }

    # Wizard overlay rect: cream below intro (for steps 1+)
    # Intro ends ~52% of paper height; questions use lower 45%
    intro_end_y = paper["y"] + int(paper["height"] * 0.52)
    wizard_paper = {
        "x": paper["x"],
        "y": intro_end_y,
        "width": paper["width"],
        "height": paper["y"] + paper["height"] - intro_end_y,
    }

    print(json.dumps({
        "native_size": {"width": w, "height": h},
        "paper_rect_full": paper,
        "paper_rect_wizard": wizard_paper,
        "continue_hotspot": hotspot,
    }, indent=2))


if __name__ == "__main__":
    main()

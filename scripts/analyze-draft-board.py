"""Analyze draft board candidates and calibrate paper rect."""
from __future__ import annotations

import json
import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CANDIDATES = {
    "A": Path(
        r"C:\Users\tagia\.cursor\projects\c-Users-tagia-studio-squishy\assets\c__Users_tagia_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-e4092fd3-2cf2-437d-be8d-f4d2106569c9.png"
    ),
    "B": Path(
        r"C:\Users\tagia\.cursor\projects\c-Users-tagia-studio-squishy\assets\c__Users_tagia_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-78ab49ba-55b4-44d7-8817-6ed0e1c68a46.png"
    ),
}
OUT = ROOT / "public" / "draft-room" / "draft-board-paper.png"


def edge_near_white_pct(img: Image.Image, side: str, threshold: int = 240) -> float:
    w, h = img.size
    px = img.load()
    hits = 0
    total = 0
    if side == "top":
        for x in range(w):
            r, g, b = px[x, 0][:3]
            hits += int(r >= threshold and g >= threshold and b >= threshold)
            total += 1
    elif side == "bottom":
        for x in range(w):
            r, g, b = px[x, h - 1][:3]
            hits += int(r >= threshold and g >= threshold and b >= threshold)
            total += 1
    elif side == "left":
        for y in range(h):
            r, g, b = px[0, y][:3]
            hits += int(r >= threshold and g >= threshold and b >= threshold)
            total += 1
    elif side == "right":
        for y in range(h):
            r, g, b = px[w - 1, y][:3]
            hits += int(r >= threshold and g >= threshold and b >= threshold)
            total += 1
    return hits / total * 100 if total else 0.0


def trim_bounds(img: Image.Image, threshold: int = 240) -> tuple[int, int, int, int]:
    w, h = img.size
    px = img.load()
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            if r < threshold or g < threshold or b < threshold:
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)
    return min_x, min_y, max_x + 1, max_y + 1


def is_cream(r: int, g: int, b: int) -> bool:
    return r > 195 and g > 180 and b > 150 and r - b < 80 and g > b - 20


def find_paper_rect(img: Image.Image) -> dict:
    """Find cream paper bounding box within trimmed image."""
    w, h = img.size
    px = img.load()
    min_x, min_y, max_x, max_y = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            if is_cream(r, g, b):
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)

    # Shrink to inner cream (exclude wood clip at top)
    # Scan rows for cream density
    row_counts = []
    for y in range(min_y, max_y + 1):
        count = sum(1 for x in range(min_x, max_x + 1) if is_cream(*px[x, y][:3]))
        row_counts.append((y, count))

    width_span = max_x - min_x + 1
    cream_rows = [y for y, c in row_counts if c > width_span * 0.55]
    if cream_rows:
        paper_top = cream_rows[0]
        paper_bottom = cream_rows[-1]
    else:
        paper_top, paper_bottom = min_y, max_y

    col_counts = []
    for x in range(min_x, max_x + 1):
        count = sum(1 for y in range(paper_top, paper_bottom + 1) if is_cream(*px[x, y][:3]))
        col_counts.append((x, count))

    height_span = paper_bottom - paper_top + 1
    cream_cols = [x for x, c in col_counts if c > height_span * 0.55]
    if cream_cols:
        paper_left = cream_cols[0]
        paper_right = cream_cols[-1]
    else:
        paper_left, paper_right = min_x, max_x

    # Inset slightly from wood edges
    inset = 8
    return {
        "x": paper_left + inset,
        "y": paper_top + inset,
        "width": paper_right - paper_left + 1 - 2 * inset,
        "height": paper_bottom - paper_top + 1 - 2 * inset,
    }


def find_continue_hotspot(img: Image.Image, paper: dict) -> dict:
    """Locate dark brown CONTINUE button region on paper."""
    px = img.load()
    x0, y0 = paper["x"], paper["y"]
    x1 = x0 + paper["width"]
    y1 = y0 + paper["height"]
    # Button is in upper half of paper
    scan_y1 = y0 + int(paper["height"] * 0.55)
    min_x, min_y, max_x, max_y = x1, y1, x0, y0

    for y in range(y0 + int(paper["height"] * 0.25), scan_y1):
        for x in range(x0, x1):
            r, g, b = px[x, y][:3]
            # dark brown button
            if r < 100 and g < 75 and b < 60 and r > 40:
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)

    if min_x >= x1:
        # fallback center band
        cy = y0 + int(paper["height"] * 0.42)
        return {
            "x": x0 + int(paper["width"] * 0.25),
            "y": cy - 20,
            "width": int(paper["width"] * 0.5),
            "height": 40,
        }

    pad = 6
    return {
        "x": max(x0, min_x - pad),
        "y": max(y0, min_y - pad),
        "width": min(x1, max_x + pad) - max(x0, min_x - pad),
        "height": min(y1, max_y + pad) - max(y0, min_y - pad),
    }


def analyze(label: str, path: Path) -> dict:
    img = Image.open(path).convert("RGB")
    w, h = img.size
    fsize = os.path.getsize(path)
    edges = {s: edge_near_white_pct(img, s) for s in ("top", "bottom", "left", "right")}
    trim = trim_bounds(img)
    trimmed = img.crop(trim)
    paper = find_paper_rect(trimmed)
    hotspot = find_continue_hotspot(trimmed, paper)
    return {
        "label": label,
        "path": str(path),
        "format": Image.open(path).format,
        "mode": img.mode,
        "width": w,
        "height": h,
        "file_kb": round(fsize / 1024, 1),
        "edges_near_white_pct": edges,
        "trim": {"x": trim[0], "y": trim[1], "width": trim[2] - trim[0], "height": trim[3] - trim[1]},
        "trimmed_size": {"width": trimmed.width, "height": trimmed.height},
        "paper_rect": paper,
        "continue_hotspot": hotspot,
        "white_border_score": sum(edges.values()) / 4,
    }


def install_winner(path: Path) -> dict:
    img = Image.open(path).convert("RGB")
    trim = trim_bounds(img)
    trimmed = img.crop(trim)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    trimmed.save(OUT, optimize=True)
    paper = find_paper_rect(trimmed)
    hotspot = find_continue_hotspot(trimmed, paper)
    return {
        "output": str(OUT),
        "native_size": {"width": trimmed.width, "height": trimmed.height},
        "paper_rect": paper,
        "continue_hotspot": hotspot,
    }


if __name__ == "__main__":
    results = {label: analyze(label, path) for label, path in CANDIDATES.items()}
    print(json.dumps(results, indent=2))

    # Pick A unless B clearly better (lower white border, similar/better quality)
    a, b = results["A"], results["B"]
    winner = "A"
    if b["white_border_score"] + 5 < a["white_border_score"] and b["file_kb"] >= a["file_kb"] * 0.8:
        winner = "B"
    print(f"\nWINNER: {winner}")

    install = install_winner(CANDIDATES[winner])
    print(f"\nINSTALLED:\n{json.dumps(install, indent=2)}")

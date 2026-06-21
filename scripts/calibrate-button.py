"""Detect CONTINUE button as compact dark rectangle."""
import json
from PIL import Image

img = Image.open("public/draft-room/draft-board-paper.png").convert("RGB")
w, h = img.size
px = img.load()

paper = {"x": 180, "y": 210, "width": 360, "height": 588}

def is_button(r, g, b):
    return 42 < r < 98 and 28 < g < 78 and 22 < b < 68 and r > g > b

# Find rows with button-colored pixels in center 70% of paper
candidates = []
for y in range(paper["y"] + 250, paper["y"] + 340):
    xs = [x for x in range(paper["x"] + 30, paper["x"] + paper["width"] - 30) if is_button(*px[x, y][:3])]
    if len(xs) > 80:
        span = xs[-1] - xs[0]
        if 120 < span < 320:
            candidates.append((y, xs[0], xs[-1], span))

if candidates:
    # pick row with median span
    candidates.sort(key=lambda c: c[3])
    mid = candidates[len(candidates) // 2]
    y, x0, x1, span = mid
    # expand vertically
    y0 = y
    y1 = y
    for yy in range(y - 1, y - 30, -1):
        xs = [x for x in range(x0, x1 + 1) if is_button(*px[x, yy][:3])]
        if len(xs) > span * 0.5:
            y0 = yy
        else:
            break
    for yy in range(y + 1, y + 30):
        xs = [x for x in range(x0, x1 + 1) if is_button(*px[x, yy][:3])]
        if len(xs) > span * 0.5:
            y1 = yy
        else:
            break
    hotspot = {"x": x0 - 8, "y": y0 - 6, "width": x1 - x0 + 16, "height": y1 - y0 + 12}
else:
    hotspot = {"x": 248, "y": 492, "width": 224, "height": 44}

print(json.dumps({"paper_rect": paper, "continue_hotspot": hotspot}, indent=2))

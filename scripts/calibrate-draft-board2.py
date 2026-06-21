"""Visual calibration — scan from top for cream paper bounds."""
import json
from PIL import Image

img = Image.open("public/draft-room/draft-board-paper.png").convert("RGB")
w, h = img.size
px = img.load()

def is_cream(r, g, b):
    return r > 198 and g > 182 and b > 152 and r - b < 75

# For each row, fraction of center 60% width that is cream
cx0, cx1 = int(w * 0.20), int(w * 0.80)
rows = []
for y in range(h):
    hits = sum(1 for x in range(cx0, cx1) if is_cream(*px[x, y][:3]))
    rows.append(hits / (cx1 - cx0))

# Find longest run of rows with >0.75 cream density
best = (0, 0, 0)
run_start = None
for y, d in enumerate(rows):
    if d > 0.75:
        if run_start is None:
            run_start = y
    else:
        if run_start is not None:
            length = y - run_start
            if length > best[2]:
                best = (run_start, y - 1, length)
            run_start = None
if run_start is not None:
    length = h - run_start
    if length > best[2]:
        best = (run_start, h - 1, length)

y0, y1, _ = best
# cols within paper band
col_hits = []
for x in range(w):
    hits = sum(1 for y in range(y0, y1 + 1) if is_cream(*px[x, y][:3]))
    col_hits.append(hits / (y1 - y0 + 1))

cream_cols = [x for x, s in enumerate(col_hits) if s > 0.75]
x0, x1 = cream_cols[0], cream_cols[-1]

inset = 14
paper = {"x": x0 + inset, "y": y0 + inset, "width": x1 - x0 + 1 - 2*inset, "height": y1 - y0 + 1 - 2*inset}

# Button scan
btn = [9999, 9999, 0, 0]
sy0 = paper["y"] + int(paper["height"] * 0.28)
sy1 = paper["y"] + int(paper["height"] * 0.48)
for y in range(sy0, sy1):
    for x in range(paper["x"] + 40, paper["x"] + paper["width"] - 40):
        r, g, b = px[x, y][:3]
        if 45 < r < 95 and 30 < g < 75 and 25 < b < 65:
            btn[0] = min(btn[0], x)
            btn[1] = min(btn[1], y)
            btn[2] = max(btn[2], x)
            btn[3] = max(btn[3], y)

hotspot = {"x": btn[0]-6, "y": btn[1]-6, "width": btn[2]-btn[0]+12, "height": btn[3]-btn[1]+12}

print(json.dumps({
    "native_size": {"width": w, "height": h},
    "paper_band": {"y0": y0, "y1": y1, "x0": x0, "x1": x1},
    "paper_rect": paper,
    "continue_hotspot": hotspot,
    "paper_pct": {
        "x": round(paper["x"]/w, 3),
        "y": round(paper["y"]/h, 3),
        "w": round(paper["width"]/w, 3),
        "h": round(paper["height"]/h, 3),
    }
}, indent=2))

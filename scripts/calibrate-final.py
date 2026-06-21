"""Final manual-assisted calibration."""
import json
from PIL import Image

img = Image.open("public/draft-room/draft-board-paper.png").convert("RGB")
w, h = img.size
px = img.load()


def lum(r, g, b):
    return 0.299 * r + 0.587 * g + 0.114 * b


candidates = [
    {"x": 158, "y": 200, "width": 400, "height": 620, "name": "desc24-81"},
    {"x": 170, "y": 210, "width": 380, "height": 600, "name": "centered"},
    {"x": 155, "y": 185, "width": 410, "height": 640, "name": "taller"},
]
for c in candidates:
    x, y, cw, ch = c["x"], c["y"], c["width"], c["height"]
    samples = []
    for sy in [0.1, 0.3, 0.5, 0.7, 0.9]:
        for sx in [0.1, 0.5, 0.9]:
            px_x = x + int(cw * sx)
            px_y = y + int(ch * sy)
            if px_x < w and px_y < h:
                r, g, b = px[px_x, px_y][:3]
                samples.append(lum(r, g, b))
    avg = sum(samples) / len(samples)
    dark = sum(1 for l in samples if l < 120)
    print(f"{c['name']}: avg_lum={avg:.0f} dark_samples={dark}/{len(samples)}")

print("--- button scan y=480-530 ---")
for y in range(480, 531, 5):
    dark_run = []
    for x in range(200, 520):
        r, g, b = px[x, y][:3]
        if 40 < r < 95 and g < 80 and b < 70:
            dark_run.append(x)
    if dark_run and len(dark_run) > 30:
        print(f"y={y}: dark x {dark_run[0]}-{dark_run[-1]} w={dark_run[-1]-dark_run[0]}")

# Best rect from visual + validation
paper = {"x": 168, "y": 198, "width": 384, "height": 612}
inset = 12
paper_inset = {
    "x": paper["x"] + inset,
    "y": paper["y"] + inset,
    "width": paper["width"] - 2 * inset,
    "height": paper["height"] - 2 * inset,
}

hotspot = {"x": 228, "y": 478, "width": 264, "height": 52}

print(json.dumps(
    {
        "native_size": {"width": w, "height": h},
        "paper_rect": paper_inset,
        "continue_hotspot": hotspot,
    },
    indent=2,
))

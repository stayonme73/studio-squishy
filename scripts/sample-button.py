"""Grid sample around expected CONTINUE button."""
from PIL import Image

img = Image.open("public/draft-room/draft-board-paper.png").convert("RGB")
px = img.load()

for y in range(470, 545, 5):
    row = []
    for x in range(240, 480, 5):
        r, g, b = px[x, y][:3]
        if 42 < r < 98 and 28 < g < 78 and 22 < b < 68:
            row.append("X")
        elif r > 180:
            row.append(".")
        else:
            row.append(" ")
    if "X" in row:
        print(f"y={y:3d}: {''.join(row)}")

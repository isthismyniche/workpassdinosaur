"""
Removes checkerboard background from Firefly sprite sheet, crops into 4 frames.
Usage: python3 scripts/remove-bg.py
"""
from PIL import Image
import numpy as np
from collections import deque
import os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(root, 'dino_images', 'Firefly_Gemini Flash_1.png')

img = Image.open(src).convert('RGBA')
data = np.array(img)
H, W = data.shape[:2]

def is_background(r, g, b):
    # White squares
    if r >= 240 and g >= 240 and b >= 240:
        return True
    # Light grey squares (~191-195, neutral)
    if 178 <= r <= 210 and 178 <= g <= 210 and 178 <= b <= 210:
        if abs(int(r) - int(g)) < 15 and abs(int(g) - int(b)) < 15:
            return True
    return False

# Flood fill from all edges to identify background
bg_mask = np.zeros((H, W), dtype=bool)
visited = np.zeros((H, W), dtype=bool)
queue = deque()

def seed(y, x):
    r, g, b, _ = data[y, x]
    if not visited[y, x] and is_background(r, g, b):
        visited[y, x] = True
        bg_mask[y, x] = True
        queue.append((y, x))

hw_src, hh_src = W // 2, H // 2

for x in range(W):
    seed(0, x)
    seed(H - 1, x)
    # Also seed from centre horizontal line (guaranteed background between quadrants)
    seed(hh_src, x)
for y in range(H):
    seed(y, 0)
    seed(y, W - 1)
    # Also seed from centre vertical line (guaranteed background between quadrants)
    seed(y, hw_src)

while queue:
    y, x = queue.popleft()
    for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
        ny, nx = y + dy, x + dx
        if 0 <= ny < H and 0 <= nx < W and not visited[ny, nx]:
            r, g, b, _ = data[ny, nx]
            if is_background(r, g, b):
                visited[ny, nx] = True
                bg_mask[ny, nx] = True
                queue.append((ny, nx))

# Apply mask: set background alpha to 0
data[bg_mask, 3] = 0

full_img = Image.fromarray(data)

print(f'Source: {W}×{H}  Background pixels removed: {bg_mask.sum()}')

# Quadrant crop + trim
hw, hh = W // 2, H // 2
frames = [
    ('neutral',  0,  0),
    ('happy',   hw,  0),
    ('sad',      0, hh),
    ('thinking',hw, hh),
]

out_dir = os.path.join(root, 'public', 'mascot')

for name, left, top in frames:
    quad = full_img.crop((left, top, left + hw, top + hh))

    # Trim transparent edges
    bbox = quad.getbbox()
    if bbox:
        quad = quad.crop(bbox)

    # Resize to max 400px wide
    if quad.width > 400:
        ratio = 400 / quad.width
        quad = quad.resize((400, int(quad.height * ratio)), Image.LANCZOS)

    png_path = os.path.join(out_dir, f'{name}.png')
    quad.save(png_path, 'PNG', optimize=True)

    # WebP with alpha
    webp_path = os.path.join(out_dir, f'{name}.webp')
    quad.save(webp_path, 'WebP', quality=85, method=4)

    png_kb = os.path.getsize(png_path) // 1024
    webp_kb = os.path.getsize(webp_path) // 1024
    mode = Image.open(webp_path).mode
    print(f'  {name}: {quad.width}×{quad.height}  webp {webp_kb}KB ({mode})  png {png_kb}KB')

print('\nDone.')

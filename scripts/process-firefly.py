"""
Processes the Firefly background-removed images:
 - Sprite sheet (4 poses) → crop into neutral/happy/sad/thinking
 - Hero card → single hero frame
Usage: python3 scripts/process-firefly.py
"""
from PIL import Image
import os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out_dir = os.path.join(root, 'public', 'mascot')

def save(img, name, max_width):
    if img.width > max_width:
        ratio = max_width / img.width
        img = img.resize((max_width, int(img.height * ratio)), Image.LANCZOS)

    png_path = os.path.join(out_dir, f'{name}.png')
    webp_path = os.path.join(out_dir, f'{name}.webp')

    img.save(png_path, 'PNG', optimize=True)
    img.save(webp_path, 'WebP', quality=87, method=4)

    png_kb = os.path.getsize(png_path) // 1024
    webp_kb = os.path.getsize(webp_path) // 1024
    webp_mode = Image.open(webp_path).mode
    print(f'  {name}: {img.width}×{img.height}  webp {webp_kb}KB ({webp_mode})  png {png_kb}KB')

# --- Sprite sheet (4 poses) ---
sprite = Image.open(os.path.join(root, 'dino_images', 'Firefly_Remove background 209675.png'))
W, H = sprite.size
hw, hh = W // 2, H // 2

print(f'Sprite sheet: {W}×{H} → four {hw}×{hh} quadrants')

frames = [
    ('neutral',  0,  0),
    ('happy',   hw,  0),
    ('sad',      0, hh),
    ('thinking',hw, hh),
]

for name, left, top in frames:
    quad = sprite.crop((left, top, left + hw, top + hh))
    bbox = quad.getbbox()
    if bbox:
        quad = quad.crop(bbox)
    save(quad, name, 400)

# --- Hero card ---
print('\nHero card:')
hero = Image.open(os.path.join(root, 'dino_images', 'Firefly_Remove background 935170.png'))
bbox = hero.getbbox()
if bbox:
    hero = hero.crop(bbox)
save(hero, 'hero', 800)

print('\nDone.')

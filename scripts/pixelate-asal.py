"""Builds Asal's pixel-art desk sprite from the illustrated character art.

    python scripts/pixelate-asal.py

Reads assets/characters/asal-helper-cozy.png, keeps the head and shoulders,
downsamples with area averaging, reduces the palette, replaces the raised
waving hand with mirrored hair and shoulder, adds a crisp outline, and writes
three frames side by side to public/images/pixel/asal-desk.png:
  0 eyes open, 1 sleepy closed (blink and dozing), 2 happy closed (tea break).
The eye, hand and mouth coordinates below belong to this crop and scale.
Only Pillow is required.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets' / 'characters' / 'asal-helper-cozy.png'
OUTPUT = ROOT / 'public' / 'images' / 'pixel' / 'asal-desk.png'
CROP_BOTTOM = 700  # source pixels: just below the collar
HEIGHT = 64        # sprite height in pixels
COLORS = 28
OUTLINE = (52, 33, 24, 255)
LASH = (59, 36, 24, 255)

source = Image.open(SOURCE).convert('RGBA')
pixels = source.load()
for y in range(source.size[1]):
    for x in range(source.size[0]):
        if pixels[x, y][3] < 140:
            pixels[x, y] = (0, 0, 0, 0)
crop = source.crop((0, 0, source.size[0], CROP_BOTTOM))
crop = crop.crop(crop.getchannel('A').getbbox())
small = crop.resize((round(crop.size[0] * HEIGHT / crop.size[1]), HEIGHT), Image.BOX)
width = small.size[0]

sp = small.load()
opaque = [[sp[x, y][3] >= 110 for x in range(width)] for y in range(HEIGHT)]
quant = small.convert('RGB').quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB').load()
sprite = Image.new('RGBA', (width, HEIGHT), (0, 0, 0, 0))
px = sprite.load()
for y in range(HEIGHT):
    for x in range(width):
        if opaque[y][x]:
            px[x, y] = (*quant[x, y], 255)

# Swap the raised waving hand (left side) for her mirrored right side.
mirror = sprite.copy().load()
for y in range(42, HEIGHT):
    for x in range(0, 17):
        px[x, y] = mirror[width - 1 - x, y]
for y in range(51, HEIGHT):
    for x in range(17, 27):
        px[x, y] = mirror[width - 1 - x, y]

# Crisp one-pixel outline around the silhouette.
base = sprite.copy().load()
for y in range(HEIGHT):
    for x in range(width):
        if base[x, y][3]:
            continue
        if any(0 <= x + dx < width and 0 <= y + dy < HEIGHT and base[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
            px[x, y] = OUTLINE

skin = px[37, 40]
eyes = [(24, 29, 35, 41), (42, 29, 53, 40)]  # x0, y0, x1, y1 inclusive


def closed(frame, happy):
    fp = frame.load()
    for x0, y0, x1, y1 in eyes:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                fp[x, y] = skin
        mid = (y0 + y1) // 2 + (0 if happy else 2)
        span = x1 - x0
        for i in range(span + 1):
            edge = min(i, span - i)
            lift = (1 if edge < 2 else 0) if not happy else (-1 if edge >= 2 else 0)
            fp[x0 + i, mid - lift if not happy else mid + lift] = LASH
        # Lashes flick outward at the outer corner.
        fp[x0 - 1 if x0 < 40 else x1 + 1, mid - 1] = LASH
    return frame


frames = [sprite, closed(sprite.copy(), happy=False), closed(sprite.copy(), happy=True)]
sheet = Image.new('RGBA', (width * len(frames), HEIGHT), (0, 0, 0, 0))
for index, frame in enumerate(frames):
    sheet.paste(frame, (index * width, 0))
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
sheet.save(OUTPUT, optimize=True)
print(f'{OUTPUT.relative_to(ROOT)}: {len(frames)} frames of {width}x{HEIGHT}')

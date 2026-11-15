"""Builds Asal's pixel-art sprites from the illustrated character art.

    python scripts/pixelate-asal.py

Reads assets/characters/asal-helper-cozy.png, keeps the head and shoulders,
downsamples with area averaging, reduces the palette, replaces the raised
waving hand with mirrored hair and shoulder, and adds a crisp outline.

Writes to public/images/pixel/:
  asal-desk.png   three frames side by side for the study room:
                  0 eyes open, 1 sleepy closed (blink, dozing), 2 happy closed (tea)
  asal-moods.png  five head-only faces for the focus rating, from 1 (drained)
                  to 5 (amazing)
Feature coordinates were measured on the 64px sprite and scale with HEIGHT.
Only Pillow is required.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets' / 'characters' / 'asal-helper-cozy.png'
OUT = ROOT / 'public' / 'images' / 'pixel'
CROP_BOTTOM = 700  # source pixels: just below the collar
COLORS = 28
OUTLINE = (52, 33, 24, 255)
LASH = (59, 36, 24, 255)
MOUTH = (150, 72, 66, 255)
BLUSH = (238, 150, 140, 255)
SPARKLE = (255, 255, 255, 255)

source = Image.open(SOURCE).convert('RGBA')
pixels = source.load()
for y in range(source.size[1]):
    for x in range(source.size[0]):
        if pixels[x, y][3] < 140:
            pixels[x, y] = (0, 0, 0, 0)
crop = source.crop((0, 0, source.size[0], CROP_BOTTOM))
crop = crop.crop(crop.getchannel('A').getbbox())


def build(height):
    """Returns (sprite, scale) where scale maps 64px coordinates to this size."""
    f = height / 64
    small = crop.resize((round(crop.size[0] * height / crop.size[1]), height), Image.BOX)
    width = small.size[0]
    sp = small.load()
    quant = small.convert('RGB').quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB').load()
    sprite = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    px = sprite.load()
    for y in range(height):
        for x in range(width):
            if sp[x, y][3] >= 110:
                px[x, y] = (*quant[x, y], 255)
    # Swap the raised waving hand (left side) for her mirrored right side.
    mirror = sprite.copy().load()
    for y in range(round(42 * f), height):
        for x in range(0, round(17 * f)):
            px[x, y] = mirror[width - 1 - x, y]
    for y in range(round(51 * f), height):
        for x in range(round(17 * f), round(27 * f)):
            px[x, y] = mirror[width - 1 - x, y]
    # Crisp one-pixel outline around the silhouette.
    base = sprite.copy().load()
    for y in range(height):
        for x in range(width):
            if base[x, y][3]:
                continue
            if any(0 <= x + dx < width and 0 <= y + dy < height and base[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                px[x, y] = OUTLINE
    return sprite, f


def eyes_for(f):
    return [tuple(round(v * f) for v in box) for box in [(24, 29, 35, 41), (42, 29, 53, 40)]]


def close_eyes(frame, f, happy):
    fp = frame.load()
    skin = fp[round(37 * f), round(40 * f)]
    for x0, y0, x1, y1 in eyes_for(f):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                fp[x, y] = skin
        mid = (y0 + y1) // 2 + (0 if happy else round(2 * f))
        span = x1 - x0
        for i in range(span + 1):
            edge = min(i, span - i)
            lift = (1 if edge < 2 else 0) if not happy else (-1 if edge >= 2 else 0)
            fp[x0 + i, mid - lift if not happy else mid + lift] = LASH
            if f > 1.1:
                fp[x0 + i, (mid - lift if not happy else mid + lift) + 1] = LASH
        fp[x0 - 1 if x0 < 40 * f else x1 + 1, mid - 1] = LASH
    return frame


def paint_mouth(frame, f, shape):
    """Replaces the open smile with another mouth shape."""
    fp = frame.load()
    skin = fp[round(37 * f), round(40 * f)]
    x0, y0, x1, y1 = (round(v * f) for v in (37, 42, 46, 48))
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            fp[x, y] = skin
    cx = (x0 + x1) // 2
    if shape == 'flat':
        for x in range(cx - 2, cx + 3):
            fp[x, y0 + 2] = MOUTH
    elif shape == 'smile':
        for x in range(cx - 3, cx + 4):
            fp[x, y0 + 3 if abs(x - cx) < 2 else y0 + 2] = MOUTH
    elif shape == 'wavy':
        for i, x in enumerate(range(cx - 3, cx + 4)):
            fp[x, y0 + 2 + (i % 2)] = MOUTH
    return frame


def x_eyes(frame, f):
    fp = frame.load()
    skin = fp[round(37 * f), round(40 * f)]
    for x0, y0, x1, y1 in eyes_for(f):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                fp[x, y] = skin
        size = min(x1 - x0, y1 - y0) - 4
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2 + 1
        for i in range(-size // 2, size // 2 + 1):
            fp[cx + i, cy + i] = LASH
            fp[cx + i, cy - i] = LASH
    return frame


def half_lids(frame, f):
    """Droopy, unimpressed eyes: the top half of each eye becomes a lid."""
    fp = frame.load()
    skin = fp[round(37 * f), round(40 * f)]
    for x0, y0, x1, y1 in eyes_for(f):
        lid = y0 + (y1 - y0) // 2
        for y in range(y0, lid):
            for x in range(x0, x1 + 1):
                fp[x, y] = skin
        for x in range(x0, x1 + 1):
            fp[x, lid] = LASH
    return frame


def sparkle(frame, f):
    fp = frame.load()
    for x0, y0, x1, y1 in eyes_for(f):
        cx, cy = x0 + (x1 - x0) // 3, y0 + (y1 - y0) // 3 + 1
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            fp[cx + dx, cy + dy] = SPARKLE
    for x, y in ((24, 44), (25, 44), (51, 43), (52, 43)):
        fp[round(x * f), round(y * f)] = BLUSH
    return frame


OUT.mkdir(parents=True, exist_ok=True)

# Study-room sprite: larger, so Asal is the heart of the scene.
desk, f = build(80)
w, h = desk.size
frames = [desk, close_eyes(desk.copy(), f, happy=False), close_eyes(desk.copy(), f, happy=True)]
sheet = Image.new('RGBA', (w * 3, h), (0, 0, 0, 0))
for index, frame in enumerate(frames):
    sheet.paste(frame, (index * w, 0))
sheet.save(OUT / 'asal-desk.png', optimize=True)

# Mood faces (head only) for the focus rating, worst to best.
face, f = build(64)
head = (0, 0, face.size[0], 54)
moods = [
    paint_mouth(x_eyes(face.copy(), f), f, 'wavy'),
    paint_mouth(half_lids(face.copy(), f), f, 'flat'),
    paint_mouth(face.copy(), f, 'smile'),
    close_eyes(face.copy(), f, happy=True),
    sparkle(face.copy(), f),
]
mw, mh = head[2], head[3]
mood_sheet = Image.new('RGBA', (mw * len(moods), mh), (0, 0, 0, 0))
for index, mood in enumerate(moods):
    mood_sheet.paste(mood.crop(head), (index * mw, 0))
mood_sheet.save(OUT / 'asal-moods.png', optimize=True)
print(f'asal-desk.png: 3 frames of {w}x{h}; asal-moods.png: 5 faces of {mw}x{mh}')

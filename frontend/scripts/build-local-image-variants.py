"""Builds small WebP versions of the JPGs that live at the site root (public/*.jpg), used as catalog fallback photos.

    python scripts/build-local-image-variants.py

Writes public/optimized/<name>-<width>.webp (480, 800, 1200 wide, never larger than the original) and the manifest
src/lib/localImageVariants.json ({"name.jpg": [480, 800, ...]}). The manifest is also copied to the Laravel backend
(backend-php/resources/local-image-variants.json) so server-rendered pages choose the same files. Originals are never
touched, and the browser falls back to the original JPG if a variant is missing.
"""
import json, os, glob
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public')
OUT = os.path.join(PUBLIC, 'optimized')
WIDTHS = (480, 800, 1200)
QUALITY = 74
os.makedirs(OUT, exist_ok=True)

manifest = {}
saved_before = saved_after = 0
for path in sorted(glob.glob(os.path.join(PUBLIC, '*.jpg')) + glob.glob(os.path.join(PUBLIC, '*.jpeg'))):
    name = os.path.basename(path)
    base = os.path.splitext(name)[0]
    im = Image.open(path)
    im.load()
    im = im.convert('RGB')
    widths = []
    for w in WIDTHS:
        if im.width < w * 0.9:
            continue
        target = min(w, im.width)
        r = im.resize((target, round(im.height * target / im.width)), Image.LANCZOS) if target != im.width else im
        out = os.path.join(OUT, '%s-%d.webp' % (base, w))
        r.save(out, 'WEBP', quality=QUALITY, method=6)
        # only keep a variant that is really smaller than the original JPG
        if os.path.getsize(out) >= os.path.getsize(path):
            os.remove(out)
            continue
        widths.append(w)
    if widths:
        manifest[name] = widths
        saved_before += os.path.getsize(path)
        saved_after += os.path.getsize(os.path.join(OUT, '%s-%d.webp' % (base, widths[-1])))

with open(os.path.join(ROOT, 'src', 'lib', 'localImageVariants.json'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=1, sort_keys=True)
backend = os.path.join(os.path.dirname(ROOT), 'backend-php', 'resources', 'local-image-variants.json')
with open(backend, 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=1, sort_keys=True)
print(len(manifest), 'images with variants;', 'largest variant total %d KB vs originals %d KB' % (saved_after // 1024, saved_before // 1024))

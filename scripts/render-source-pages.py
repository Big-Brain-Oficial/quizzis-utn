# Dev helper: renders the PDF page behind each high-confidence "source" (the theory) and each "origin"
# (the exam the question was taken from) as an image, so the review can show it without opening the PDF.
# Writes sources/pages/<pdf>-p<N>.webp and sets "img" on that field; a source that is not high confidence
# loses "source.img". Safe to run again after changing pages or crops.
# With "crop" (a list of [x0, y0, x1, y1] boxes, in % of the page image) it keeps only those parts of
# the page, stacked top to bottom, in sources/pages/<pdf>-p<N>-<hash>.webp. A box with a fifth value
# ([x0, y0, x1, y1, page]) is cut from that page instead, for text that continues on the next page.
# Requires PyMuPDF and Pillow (pip install pymupdf pillow). Usage:
#   python scripts/render-source-pages.py <materia>/<parcial> [--only source|origin]
import hashlib
import io
import json
import sys
from pathlib import Path

import pymupdf
from PIL import Image, ImageChops, ImageDraw

WIDTH = 1280  # px; the slides are landscape, so this keeps small text legible on a phone when zoomed
QUALITY = 80
GAP = 17  # px between two crop boxes of the same page, with a thin line in the middle

root = Path(__file__).resolve().parent.parent
if len(sys.argv) not in (2, 4) or (len(sys.argv) == 4 and (sys.argv[2] != "--only" or sys.argv[3] not in ("source", "origin"))):
    sys.exit("uso: python scripts/render-source-pages.py <materia>/<parcial> [--only source|origin]")
only = sys.argv[3] if len(sys.argv) == 4 else None
subject = root / "subjects" / sys.argv[1]
qpath = subject / "questions.json"
data = json.loads(qpath.read_text(encoding="utf-8"))
out = subject / "sources" / "pages"
out.mkdir(exist_ok=True)


def content_box(img):
    return ImageChops.difference(img, Image.new("RGB", img.size, "white")).convert("L").point(lambda v: 255 if v > 12 else 0).getbbox()


def page_image(file, n):
    key = (file, n)
    if key not in pages:
        doc = docs.setdefault(file, pymupdf.open(subject / file))
        page = doc[n - 1]
        pix = page.get_pixmap(matrix=pymupdf.Matrix(WIDTH / page.rect.width, WIDTH / page.rect.width), alpha=False)
        img = Image.open(io.BytesIO(pix.tobytes("png"))).convert("RGB")
        # trim the white bands around 16:9 slides printed on A4
        box = content_box(img)
        pages[key] = img.crop(box) if box else img
    return pages[key]


def crop(file, default_page, boxes):
    parts = []
    for x0, y0, x1, y1, *n in boxes:
        img = page_image(file, n[0] if n else default_page)
        w, h = img.size
        part = img.crop((round(w * x0 / 100), round(h * y0 / 100), round(w * x1 / 100), round(h * y1 / 100)))
        # drop the blank lines at the top and bottom of the box, but keep its left margin so the stacked parts
        # stay aligned
        box = content_box(part)
        if box:
            part = part.crop((0, box[1], part.width, box[3]))
        parts.append(part)
    stacked = Image.new("RGB", (max(p.width for p in parts), sum(p.height for p in parts) + GAP * (len(parts) - 1)), "white")
    y = 0
    for i, part in enumerate(parts):
        if i:
            ImageDraw.Draw(stacked).line([(0, y - GAP // 2 - 1), (stacked.width, y - GAP // 2 - 1)], fill=(200, 200, 200))
        stacked.paste(part, (0, y))
        y += part.height + GAP
    return stacked


def render_ref(ref):
    name = f"{Path(ref['file']).stem}-p{ref['page']}"
    if ref.get("crop"):
        name += "-" + hashlib.sha1(json.dumps(ref["crop"]).encode()).hexdigest()[:6]
    name += ".webp"
    ref["img"] = f"sources/pages/{name}"
    if name in used:
        return
    used.add(name)
    if ref.get("crop"):
        img = crop(ref["file"], ref["page"], ref["crop"])
    else:
        img = page_image(ref["file"], ref["page"])
    img.save(out / name, "WEBP", quality=QUALITY, method=6)


docs, pages, used, kept = {}, {}, set(), set()
for q in data["questions"]:
    src = q.get("source")
    if src and only != "origin":
        if src.get("confidence") != "high":
            src.pop("img", None)
        elif src.get("file"):
            render_ref(src)
    elif src and src.get("img"):
        kept.add(Path(src["img"]).name)
    origin = q.get("origin")
    if origin and origin.get("file") and only != "source":
        render_ref(origin)
    elif origin and origin.get("img"):
        kept.add(Path(origin["img"]).name)

for stale in out.glob("*.webp"):
    if stale.name not in used and stale.name not in kept:
        stale.unlink()

# each crop box on a single line, instead of one line per number
crops = {}
for q in data["questions"]:
    for field in ("source", "origin"):
        if q.get(field, {}).get("crop"):
            key = f"@crop{len(crops)}@"
            crops[key] = "[" + ", ".join(json.dumps(b) for b in q[field]["crop"]) + "]"
            q[field]["crop"] = key
text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
for key, value in crops.items():
    text = text.replace(f'"{key}"', value)
qpath.write_text(text, encoding="utf-8", newline="\n")
print(f"{len(used)} páginas renderizadas en {out.relative_to(root)}")

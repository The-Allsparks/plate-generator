"""Rebuild digit polygons from the reference pictures and the FontSpace webfonts."""
import re
import urllib.request
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
SEG_REF = Path(r"C:\Users\garre\.cursor\projects\c-Users-garre-Documents-The-Allsparks\assets\c__Users_garre_AppData_Roaming_Cursor_User_workspaceStorage_f5166136557b3bce1726f7401f651038_images_image-b051400c-a2c9-4cea-bbc5-72a01d8c02d7.png")
PAGES = {
    "locomotive": "https://www.fontspace.com/loccomotive-stencil-military-block-font-f168607",
    "velodrome": "https://www.fontspace.com/velodrome-futuristic-tech-stencil-font-f165715",
}
ORDER = list("1234567890")
HEIGHT = 57.0
GAP_MM = 2.4


def fetch(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read()


def webfont_urls(page):
    html = fetch(page).decode("utf-8", "replace")
    stems = re.findall(r"https:\\u002F\\u002Fget\.fontspace\.co\\u002Fwebfont\\u002F[^\s\"'<]+", html)
    urls = []
    for stem in stems:
        url = stem.encode("utf-8").decode("unicode_escape")
        if any(url.endswith(ext) for ext in (".eot", ".css", ".woff", ".woff2", ".svg")):
            continue
        if not (url.endswith(".ttf") or url.endswith(".otf")):
            url += ".ttf"
        if url not in urls:
            urls.append(url)
    return urls


def alpha_mask(path):
    image = Image.open(path).convert("RGBA")
    alpha = np.array(image.getchannel("A"))
    return (alpha > 80).astype(np.uint8) * 255


def column_groups(mask):
    ink = mask.any(axis=0)
    groups, start = [], None
    for x, on in enumerate(ink):
        if on and start is None:
            start = x
        elif not on and start is not None:
            groups.append((start, x - 1))
            start = None
    if start is not None:
        groups.append((start, mask.shape[1] - 1))
    return groups


def open_holes(mask, pixel_height):
    height, width = mask.shape
    inverse = cv2.bitwise_not(mask)
    flood = inverse.copy()
    cv2.floodFill(flood, np.zeros((height + 2, width + 2), np.uint8), (0, 0), 128)
    holes = ((inverse == 255) & (flood != 128)).astype(np.uint8) * 255
    count, labels = cv2.connectedComponents(holes)
    if count <= 1:
        return mask
    outside = flood == 128
    field = np.full((height, width), 255, np.uint8)
    field[outside] = 0
    distance = cv2.distanceTransform(field, cv2.DIST_L2, 3)
    thickness = max(2, int(round(GAP_MM * pixel_height / HEIGHT)))
    opened = mask.copy()
    for label in range(1, count):
        ys, xs = np.where(labels == label)
        pick = int(np.argmin(distance[ys, xs]))
        y, x = int(ys[pick]), int(xs[pick])
        options = []
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            xx, yy, steps = x, y, 0
            while 0 <= xx < width and 0 <= yy < height and not outside[yy, xx]:
                xx += dx
                yy += dy
                steps += 1
                if steps > height + width:
                    break
            if 0 <= xx < width and 0 <= yy < height and outside[yy, xx]:
                options.append((steps, dx, dy, xx, yy))
        if not options:
            continue
        # A horizontal cut leaves the plate bridge in Y, which is not scaled down
        # when a long team number is squeezed horizontally.
        sideways = [item for item in options if item[2] == 0]
        steps, dx, dy, xx, yy = min(sideways or options)
        cv2.line(opened, (x, y), (xx, yy), 0, thickness)
    return opened


def polygons_from_mask(mask, x_of, y_of, pixel_height):
    opened = open_holes(mask, pixel_height)
    found, _ = cv2.findContours(opened, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    epsilon = max(0.8, pixel_height / 220)
    polygons = []
    for contour in found:
        simplified = cv2.approxPolyDP(contour, epsilon, True)
        if len(simplified) < 3:
            continue
        poly = [[round(x_of(float(p[0])), 2), round(y_of(float(p[1])), 2)] for p in simplified[:, 0, :]]
        area = sum(poly[i][0] * poly[(i + 1) % len(poly)][1] - poly[(i + 1) % len(poly)][0] * poly[i][1] for i in range(len(poly)))
        if abs(area) < 1.2:
            continue
        if area < 0:
            poly.reverse()
        polygons.append(poly)
    return polygons


def digits_from_image(path):
    mask = alpha_mask(path)
    height = mask.shape[0]
    count, labels = cv2.connectedComponents((mask > 0).astype(np.uint8))
    scale = HEIGHT / height
    crops = []
    if count - 1 == 10:
        for label in range(1, count):
            ys, xs = np.where(labels == label)
            crops.append((int(xs.mean()), int(xs.min()), (labels == label).astype(np.uint8) * 255))
        crops.sort()
    else:
        groups = column_groups(mask)
        if len(groups) != 10:
            raise SystemExit(f"{path.name}: found {len(groups)} digit groups, expected 10")
        for x0, x1 in groups:
            crop = np.zeros_like(mask)
            crop[:, x0 : x1 + 1] = mask[:, x0 : x1 + 1]
            crops.append((x0, x0, crop))
    digits = {}
    for glyph, (_, x0, crop) in zip(ORDER, crops):
        digits[glyph] = polygons_from_mask(
            crop,
            lambda x, x0=x0: (x - x0) * scale,
            lambda y, height=height: (height - y) * scale,
            height,
        )
        if not digits[glyph]:
            raise SystemExit(f"empty glyph {glyph} in {path.name}")
    return digits


def render_family(font_path):
    font = ImageFont.truetype(str(font_path), 460)
    ascent, descent = font.getmetrics()
    pad = 50
    width, height = 1600, ascent + descent + pad * 2
    baseline = pad + ascent
    masks = {}
    for glyph in "0123456789":
        image = Image.new("L", (width, height), 0)
        ImageDraw.Draw(image).text((pad, pad), glyph, fill=255, font=font)
        masks[glyph] = (np.array(image) > 80).astype(np.uint8) * 255
    ink = np.where(masks["8"] > 0)
    cap = max(1, baseline - int(ink[0].min()))
    scale = HEIGHT / cap
    digits = {}
    for glyph, mask in masks.items():
        ys, xs = np.where(mask > 0)
        if len(xs) == 0:
            raise SystemExit(f"{font_path.name} missing {glyph}")
        left = int(xs.min())
        digits[glyph] = polygons_from_mask(
            mask,
            lambda x, left=left: (x - left) * scale,
            lambda y, baseline=baseline: (baseline - y) * scale,
            cap,
        )
    return digits


def rotate_half(polygons):
    xs = [x for poly in polygons for x, _ in poly]
    ys = [y for poly in polygons for _, y in poly]
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    turned = []
    for poly in polygons:
        moved = [[round(2 * cx - x, 2), round(2 * cy - y, 2)] for x, y in poly]
        area = sum(moved[i][0] * moved[(i + 1) % len(moved)][1] - moved[(i + 1) % len(moved)][0] * moved[i][1] for i in range(len(moved)))
        if area < 0:
            moved.reverse()
        turned.append(moved)
    return turned


def preview(fonts):
    scale = 3
    labels = list(fonts)
    width, height = 1900, 40 + len(labels) * 200
    canvas = np.full((height, width, 3), 255, np.uint8)
    for row, name in enumerate(labels):
        cv2.putText(canvas, name, (8, 30 + row * 200), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        x = 160
        for glyph in ORDER:
            for poly in fonts[name][glyph]:
                pts = np.array([[[int(px * scale + x), int(170 - py * scale + row * 200)]] for px, py in poly])
                cv2.fillPoly(canvas, [pts], (20, 20, 20))
            xs = [px for poly in fonts[name][glyph] for px, _ in poly]
            x += int((max(xs) - min(xs)) * scale) + 18
    cv2.imwrite(str(ROOT / "font-preview.png"), canvas)


def main():
    fonts = {
        "7segment": digits_from_image(SEG_REF),
    }
    cache = ROOT / ".fontcache"
    cache.mkdir(exist_ok=True)
    for name, page in PAGES.items():
        print("fetch", name)
        chosen = None
        for index, url in enumerate(webfont_urls(page)):
            dest = cache / f"{name}-{index}.ttf"
            if not dest.exists() or dest.stat().st_size < 800:
                dest.write_bytes(fetch(url))
            print(" ", dest.name, dest.stat().st_size)
            try:
                digits = render_family(dest)
            except Exception as error:
                print("  unusable", error)
                continue
            area = sum(abs(sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))) for p in digits["0"])
            print("  parts", {key: len(value) for key, value in digits.items()}, "area0", round(area))
            if chosen is None or area > chosen[0]:
                chosen = (area, digits)
        if chosen is None:
            raise SystemExit("no font for " + name)
        fonts[name] = chosen[1]
    import json
    text = "export const FONT_DIGITS=" + json.dumps(fonts, separators=(",", ":")) + ";\n"
    (ROOT / "digit-fonts.js").write_text(text, encoding="utf-8")
    preview(fonts)
    print("wrote digit-fonts.js", len(text))


if __name__ == "__main__":
    main()

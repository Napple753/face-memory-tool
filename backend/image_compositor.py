"""
Final image composition.

Responsibilities:
- Given the group photo + list of missing members (with photos or none),
  build a bottom grid of thumbnails, sized to match in-photo face crops.
- Auto-fit row count based on how many are missing; expose the computed
  layout to the frontend for a check/adjust step before finalizing.
- Placeholder thumbnail (gray box + initials/name) for members with no photo.
- Merge group photo + bottom grid into a single final image (in-memory,
  passed to html_generator.py -- not written to disk as a separate file).
"""

import base64
import io
import math

from PIL import Image, ImageDraw, ImageFont

PADDING = 8
BACKGROUND = (255, 255, 255)
PLACEHOLDER_BG = (158, 158, 158)
PLACEHOLDER_TEXT = (255, 255, 255)
DEFAULT_THUMB_SIZE = (120, 150)


def _decode_data_url(data_url: str) -> Image.Image:
    _, encoded = data_url.split(",", 1)
    return Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGB")


def _encode_data_url(image: Image.Image) -> str:
    buf = io.BytesIO()
    image.convert("RGB").save(buf, format="JPEG", quality=90)
    encoded = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def _initials(name: str) -> str:
    parts = [p for p in name.strip().split() if p]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return (parts[0][0] + parts[-1][0]).upper()


def _make_placeholder(w: int, h: int, name: str) -> Image.Image:
    image = Image.new("RGB", (w, h), PLACEHOLDER_BG)
    draw = ImageDraw.Draw(image)
    font = ImageFont.load_default()
    text = _initials(name)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((w - text_w) / 2, (h - text_h) / 2), text, fill=PLACEHOLDER_TEXT, font=font)
    return image


def _fit_thumbnail(image: Image.Image, w: int, h: int) -> Image.Image:
    fitted = image.copy()
    fitted.thumbnail((w, h))
    canvas = Image.new("RGB", (w, h), BACKGROUND)
    canvas.paste(fitted, ((w - fitted.width) // 2, (h - fitted.height) // 2))
    return canvas


def build_composite(
    group_photo_data_url: str,
    missing_members: list[dict],
    rows: int | None = None,
    thumb_size: tuple[int, int] | None = None,
) -> dict:
    group_image = _decode_data_url(group_photo_data_url)
    width, height = group_image.size

    if not missing_members:
        return {
            "compositeImageDataUrl": _encode_data_url(group_image),
            "imageWidth": width,
            "imageHeight": height,
            "rows": 0,
            "gridBoxes": [],
        }

    thumb_w, thumb_h = thumb_size or DEFAULT_THUMB_SIZE
    thumb_w = max(40, min(thumb_w, width))

    count = len(missing_members)
    max_cols = max(1, width // (thumb_w + PADDING))
    if rows is None or rows < 1:
        rows = math.ceil(count / max_cols)
    cols = math.ceil(count / rows)

    cell_w = width // cols
    cell_h = round(thumb_h * (cell_w / thumb_w))
    grid_height = rows * cell_h + PADDING * (rows + 1)

    composite = Image.new("RGB", (width, height + grid_height), BACKGROUND)
    composite.paste(group_image, (0, 0))

    grid_boxes = []
    for index, member in enumerate(missing_members):
        row, col = divmod(index, cols)
        x = col * cell_w + PADDING // 2
        y = height + PADDING + row * (cell_h + PADDING)
        w = cell_w - PADDING
        h = cell_h - PADDING

        photo_data_url = member.get("photoDataUrl")
        if photo_data_url:
            thumb = _fit_thumbnail(_decode_data_url(photo_data_url), w, h)
            location = "bottom-grid"
        else:
            thumb = _make_placeholder(w, h, member.get("name", ""))
            location = "placeholder"
        composite.paste(thumb, (x, y))

        grid_boxes.append(
            {"memberId": member["id"], "x": x, "y": y, "w": w, "h": h, "location": location}
        )

    return {
        "compositeImageDataUrl": _encode_data_url(composite),
        "imageWidth": width,
        "imageHeight": height + grid_height,
        "rows": rows,
        "gridBoxes": grid_boxes,
    }

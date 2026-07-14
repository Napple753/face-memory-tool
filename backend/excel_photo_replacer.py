"""
Excel photo replacement: swap specific cells' photos in the *original*
uploaded .xlsx, byte-for-byte otherwise.

Unlike a from-scratch rebuild (openpyxl `Workbook()` + `.save()`), this
edits the original zip directly -- every other sheet, style, formula, and
non-photo cell is preserved exactly as uploaded, including the "Place in
Cell" rich-value images openpyxl can't round-trip (see excel_parser.py's
module docstring). Only the photo cell of a *detected* member (found in the
group photo) is touched, and only if that cell already has an image to
swap; a row whose original cell has no image is left as-is (creating a
brand-new image anchor from nothing needs many more interlocking OOXML
parts -- media, relationships, content-type, and drawing XML -- and isn't
supported here to avoid emitting a corrupt file for what's an edge case in
practice, since a detected member normally already has a source photo).
"""

import base64
import io
import xml.etree.ElementTree as ET
import zipfile
from typing import NamedTuple

from openpyxl import load_workbook
from PIL import Image

import excel_parser

# Keep in sync with output-template/quiz.js PORTRAIT_*_MARGIN.
PORTRAIT_TOP_MARGIN = 0.20
PORTRAIT_BOTTOM_MARGIN = 0.45
PORTRAIT_SIDE_MARGIN = 0.30

for _prefix, _uri in excel_parser._NS.items():
    ET.register_namespace(_prefix, _uri)


class PhotoReplacement(NamedTuple):
    sheet_name: str
    row_index: int  # 0-based, matches excel_parser.py's sheetRowIndex
    box: dict  # {"x", "y", "w", "h"}, group-photo pixel space


class NoPhotoColumnError(ValueError):
    """Replacements were requested but no photo column was mapped, so there's
    nothing to swap -- distinct from other errors so a caller can surface an
    honest "nothing to do" message instead of a generic failure (or, worse,
    silently returning the untouched file while claiming success)."""


def replace_photos(
    file_bytes: bytes,
    photo_column: str | None,
    replacements: list[PhotoReplacement],
    group_photo_data_url: str,
    group_photo_width: int,
    group_photo_height: int,
) -> tuple[bytes, int]:
    """Return (new .xlsx bytes, number of cells actually swapped).

    The output is identical to `file_bytes` except each entry in
    `replacements` has its photo cell swapped for a portrait crop of the
    group photo at its detection box (same crop used on the quiz screen).
    Everything else -- every other cell, sheet, and any row not named here
    -- is untouched. A requested row whose cell had no pre-existing image is
    silently skipped (see module docstring) and not counted as swapped, so
    the returned count can be less than `len(replacements)`.
    """
    if not replacements:
        return file_bytes, 0
    if not photo_column:
        raise NoPhotoColumnError(
            "No photo column was selected in the column mapping, so there's no cell to "
            "put the replacement photos in."
        )

    group_image = _decode_data_url(group_photo_data_url)
    group_photo_width = group_photo_width or group_image.width
    group_photo_height = group_photo_height or group_image.height

    by_sheet: dict[str, list[PhotoReplacement]] = {}
    for r in replacements:
        by_sheet.setdefault(r.sheet_name, []).append(r)

    media_overrides: dict[str, bytes] = {}
    drawing_overrides: dict[str, ET.Element] = {}
    replaced_count = 0

    with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
        workbook = load_workbook(io.BytesIO(file_bytes), data_only=True)

        for sheet_name, sheet_replacements in by_sheet.items():
            if sheet_name not in workbook.sheetnames:
                continue
            sheet = workbook[sheet_name]
            header = excel_parser._sheet_header(sheet)
            if photo_column not in header:
                continue
            col0 = header.index(photo_column)

            sheet_part = excel_parser._find_sheet_part(zf, sheet_name)
            if sheet_part is None:
                continue
            sheet_root = excel_parser._read_xml(zf, sheet_part)
            if sheet_root is None:
                continue

            row_count = len(excel_parser._read_sheet_rows(sheet, header))
            rich_paths = excel_parser._rich_value_cell_image_paths(zf, sheet_root)
            floating_records = excel_parser._floating_image_records(
                zf, sheet_part, sheet_root, row_count
            )

            for r in sheet_replacements:
                new_bytes = _crop_portrait(
                    group_image, r.box, group_photo_width, group_photo_height
                )
                if new_bytes is None:
                    continue

                rich_path = rich_paths.get((r.row_index + 1, col0))
                if rich_path:
                    media_overrides[rich_path] = new_bytes
                    replaced_count += 1
                    continue

                match = next(
                    (
                        rec
                        for rec in floating_records
                        if rec["col"] == col0 and rec["row_index"] == r.row_index
                    ),
                    None,
                )
                if match is None:
                    continue  # no existing image for this cell -- nothing to swap
                media_overrides[match["media_path"]] = new_bytes
                replaced_count += 1
                if match["src_rect"] is not None:
                    # A stale crop box computed for the old image would
                    # otherwise be reapplied on top of our new crop.
                    blip_fill_el = match["blip_fill_el"]
                    src_rect_el = blip_fill_el.find("a:srcRect", excel_parser._NS)
                    if src_rect_el is not None:
                        blip_fill_el.remove(src_rect_el)
                    drawing_overrides[match["drawing_part"]] = match["drawing_root"]

        return _rewrite_zip(zf, media_overrides, drawing_overrides), replaced_count


def _rewrite_zip(
    zf: zipfile.ZipFile,
    media_overrides: dict[str, bytes],
    drawing_overrides: dict[str, ET.Element],
) -> bytes:
    out_buf = io.BytesIO()
    with zipfile.ZipFile(out_buf, "w", zipfile.ZIP_DEFLATED) as out_zf:
        for info in zf.infolist():
            if info.filename in media_overrides:
                data = media_overrides[info.filename]
            elif info.filename in drawing_overrides:
                data = ET.tostring(
                    drawing_overrides[info.filename], encoding="UTF-8", xml_declaration=True
                )
            else:
                data = zf.read(info.filename)
            out_zf.writestr(info, data)
    return out_buf.getvalue()


def _crop_portrait(
    group_image: Image.Image, box: dict, image_width: int, image_height: int
) -> bytes | None:
    x, y, w, h = box["x"], box["y"], box["w"], box["h"]
    top = max(0, y - h * PORTRAIT_TOP_MARGIN)
    bottom = min(image_height, y + h + h * PORTRAIT_BOTTOM_MARGIN)
    left = max(0, x - w * PORTRAIT_SIDE_MARGIN)
    right = min(image_width, x + w + w * PORTRAIT_SIDE_MARGIN)
    if right <= left or bottom <= top:
        return None
    box_px = (round(left), round(top), round(right), round(bottom))
    cropped = group_image.crop(box_px)
    buf = io.BytesIO()
    cropped.convert("RGB").save(buf, format="PNG")
    return buf.getvalue()


def _decode_data_url(data_url: str) -> Image.Image:
    _, encoded = data_url.split(",", 1)
    return Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGB")

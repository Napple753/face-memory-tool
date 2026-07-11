"""
Excel import (openpyxl).

Responsibilities:
- Read uploaded .xlsx, return column headers to frontend for mapping.
- Given chosen columns (name / division / photo / answer-text columns),
  build a list of member records.
- Assign a hidden internal ID to every row (not just duplicates).
- Extract embedded images from the sheet and match each to the nearest
  row by vertical position -> return match list for the frontend's
  preview/confirm grid.
"""

import base64
import io
import uuid

from openpyxl import load_workbook


def parse_excel(file_bytes: bytes) -> dict:
    """Read the first sheet of an .xlsx file.

    Returns:
        {
          "columns": ["Name", "Division", ...],
          "rows": [{"id": "<uuid>", "cells": {"Name": "Alice", ...}}, ...],
          "photoMatches": {"<row id>": "data:image/png;base64,..." | None, ...},
        }
    """
    workbook = load_workbook(io.BytesIO(file_bytes), data_only=True)
    sheet = workbook.active

    rows_iter = sheet.iter_rows(values_only=True)
    header = next(rows_iter, None)
    columns = [str(cell) if cell is not None else "" for cell in (header or [])]

    rows = []
    for values in rows_iter:
        if values is None or all(v is None for v in values):
            continue
        cells = {
            columns[i]: values[i] if i < len(values) else None
            for i in range(len(columns))
        }
        rows.append({"id": str(uuid.uuid4()), "cells": cells})

    photo_matches = _match_images_to_rows(sheet, len(rows))
    return {
        "columns": columns,
        "rows": rows,
        "photoMatches": {
            rows[i]["id"]: photo_matches.get(i) for i in range(len(rows))
        },
    }


def _match_images_to_rows(sheet, row_count: int) -> dict[int, str]:
    """Match each embedded image to the nearest data row by vertical anchor
    position, returning {row_index: data-url}. Header occupies sheet row 0
    (0-indexed); data row `i` sits at sheet row `i + 1`.
    """
    matches: dict[int, str] = {}
    for image in getattr(sheet, "_images", []):
        anchor_row = _anchor_row(image)
        if anchor_row is None or row_count == 0:
            continue
        row_index = min(range(row_count), key=lambda i: abs((i + 1) - anchor_row))
        data_url = _image_to_data_url(image)
        if data_url:
            matches[row_index] = data_url
    return matches


def _anchor_row(image) -> int | None:
    anchor = getattr(image, "anchor", None)
    frm = getattr(anchor, "_from", None)
    if frm is None:
        return None
    return frm.row


def _image_to_data_url(image) -> str | None:
    try:
        data = image._data()
    except Exception:
        return None
    fmt = (getattr(image, "format", None) or "png").lower()
    mime = "jpeg" if fmt in ("jpg", "jpeg") else fmt
    encoded = base64.b64encode(data).decode("ascii")
    return f"data:image/{mime};base64,{encoded}"

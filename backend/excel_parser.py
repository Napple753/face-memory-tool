"""
Excel import (openpyxl).

Responsibilities (to implement):
- Read uploaded .xlsx, return column headers to frontend for mapping.
- Given chosen columns (name / division / photo / answer-text columns),
  build a list of member records.
- Assign a hidden internal ID to every row (not just duplicates).
- Extract embedded images from the sheet and match each to the nearest
  row by vertical position -> return match list for the frontend's
  preview/confirm grid.
"""

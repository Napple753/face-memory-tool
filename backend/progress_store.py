"""
Single-file JSON persistence for a lone user's in-progress annotation session.

Lives on a volume mounted outside the app code (see docker-compose.yml) so it
survives container restarts and image rebuilds, but is never baked into the
image or committed to the repo.
"""

import json
import os
from typing import Any

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
PROGRESS_PATH = os.path.join(DATA_DIR, "progress.json")
ORIGINAL_EXCEL_PATH = os.path.join(DATA_DIR, "original.xlsx")


def _atomic_write(path: str, content: bytes) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp_path = path + ".tmp"
    with open(tmp_path, "wb") as f:
        f.write(content)
    os.replace(tmp_path, path)  # atomic on the same filesystem


def load_progress() -> dict[str, Any] | None:
    if not os.path.isfile(PROGRESS_PATH):
        return None
    with open(PROGRESS_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_progress(data: dict[str, Any]) -> None:
    _atomic_write(PROGRESS_PATH, json.dumps(data).encode("utf-8"))


def delete_progress() -> None:
    if os.path.isfile(PROGRESS_PATH):
        os.remove(PROGRESS_PATH)


def load_original_excel() -> bytes | None:
    if not os.path.isfile(ORIGINAL_EXCEL_PATH):
        return None
    with open(ORIGINAL_EXCEL_PATH, "rb") as f:
        return f.read()


def save_original_excel(content: bytes) -> None:
    _atomic_write(ORIGINAL_EXCEL_PATH, content)


def delete_original_excel() -> None:
    if os.path.isfile(ORIGINAL_EXCEL_PATH):
        os.remove(ORIGINAL_EXCEL_PATH)

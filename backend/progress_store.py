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


def load_progress() -> dict[str, Any] | None:
    if not os.path.isfile(PROGRESS_PATH):
        return None
    with open(PROGRESS_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_progress(data: dict[str, Any]) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    tmp_path = PROGRESS_PATH + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f)
    os.replace(tmp_path, PROGRESS_PATH)  # atomic on the same filesystem


def delete_progress() -> None:
    if os.path.isfile(PROGRESS_PATH):
        os.remove(PROGRESS_PATH)

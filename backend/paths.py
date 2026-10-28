"""Path helpers that work both in normal dev/Docker runs and inside a
PyInstaller-frozen executable.

Bundled read-only resources (face-detection model, built frontend,
output-template) are extracted by PyInstaller into a temp dir
(`sys._MEIPASS`) on startup, mirroring the repo layout (see
scripts/build-windows-exe.sh), so `resource_dir()` looks them up there
when frozen. Writable data (in-progress session) must live next to the
.exe instead, since `_MEIPASS` is a temp dir wiped after the process
exits -- `writable_dir()` resolves that.
"""

import os
import sys

_DEV_ROOT = os.path.join(os.path.dirname(__file__), "..")


def resource_dir(*parts: str) -> str:
    base = getattr(sys, "_MEIPASS", _DEV_ROOT)
    return os.path.join(base, *parts)


def writable_dir(*parts: str) -> str:
    base = os.path.dirname(sys.executable) if getattr(sys, "frozen", False) else _DEV_ROOT
    return os.path.join(base, *parts)

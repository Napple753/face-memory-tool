#!/usr/bin/env bash
# Builds a single-file Windows executable (FastAPI backend + built Vue
# frontend + face-detection model, all bundled) via PyInstaller.
#
# Prerequisites (see .github/workflows/release.yml for the CI sequence):
#   - frontend built and copied into backend/static/
#       (cd frontend && npm ci && npm run build; rm -rf ../backend/static && cp -r dist ../backend/static)
#   - face-detection model downloaded: bash backend/download_models.sh
#   - backend/requirements.txt and backend/requirements-build.txt installed
#
# Output: dist/FaceMemoryTool.exe
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# `pwd` on Git Bash (used by CI's `shell: bash` on windows-latest) returns a
# POSIX-style path (/d/a/...). Passed straight to the native Windows
# pyinstaller.exe, that becomes a malformed \d\a\... path instead of
# D:\a\..., so PyInstaller can't find the source files. `pwd -W` gives the
# drive-letter form Git Bash itself provides for exactly this situation;
# it doesn't exist on Linux/macOS, hence the fallback.
root="$(pwd -W 2>/dev/null || pwd)"

# Sources must be absolute: PyInstaller resolves relative --add-data paths
# against --specpath (where it writes the generated .spec), not the CWD
# at invocation, so a relative source here would resolve to build/... .
pyinstaller \
  --onefile \
  --name FaceMemoryTool \
  --console \
  --paths backend \
  --add-data "$root/backend/models/face_detection_yunet.onnx;backend/models" \
  --add-data "$root/backend/static;backend/static" \
  --add-data "$root/output-template;output-template" \
  --collect-all cv2 \
  --collect-all uvicorn \
  --distpath dist \
  --workpath build \
  --specpath build \
  backend/main.py

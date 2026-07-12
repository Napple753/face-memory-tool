#!/usr/bin/env bash
# Fetches the face-detection model into ./models so it can be bundled into
# the Docker image at build time (no download needed at runtime). Run once
# from this directory, or via Docker build / devcontainer postCreateCommand.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

mkdir -p models
curl -fsSL -o models/face_detection_yunet.onnx \
  https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx

"""
Face detection (OpenCV DNN, CPU-only, pre-trained model in ./models).

Responsibilities:
- Load group photo, run detection, return list of bounding boxes
  in real image pixel coordinates: [{x, y, w, h}, ...]
- No recognition/identity matching here -- naming is manual, in the
  frontend annotation step.

Uses YuNet (ONNX), OpenCV's current recommended lightweight face detector.
The older Caffe-based res10 detector isn't usable here: OpenCV 5.x's dnn
module dropped the Caffe importer (readNetFromCaffe).
"""

import os

import cv2
import numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "face_detection_yunet.onnx")


def detect_faces(image_bytes: bytes, score_threshold: float = 0.6) -> list[dict]:
    if not os.path.isfile(MODEL_PATH):
        raise FileNotFoundError(
            f"Face detection model not found at {MODEL_PATH} "
            "(see backend/models/README.md)"
        )

    array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode image")

    height, width = image.shape[:2]
    detector = cv2.FaceDetectorYN_create(
        MODEL_PATH, "", (width, height), score_threshold=score_threshold
    )
    detector.setInputSize((width, height))
    _, faces = detector.detect(image)

    boxes = []
    if faces is not None:
        for face in faces:
            x, y, w, h = face[:4]
            boxes.append(
                {
                    "x": max(0, round(float(x))),
                    "y": max(0, round(float(y))),
                    "w": round(float(w)),
                    "h": round(float(h)),
                }
            )
    return boxes

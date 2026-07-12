Face-detection model lives here: `face_detection_yunet.onnx` (OpenCV's
YuNet, the current recommended lightweight face detector -- the older
Caffe-based res10 model doesn't work with OpenCV 5.x, which dropped the
Caffe importer).

Not committed to git (see .gitignore); fetched by `../download_models.sh`,
which runs automatically during `docker build` and in the devcontainer's
postCreateCommand. Bundled into the Docker image at build time so no
download is needed at runtime (keeps the tool fully offline-capable).

To fetch it manually: `bash backend/download_models.sh`

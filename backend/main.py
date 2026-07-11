"""
FastAPI entry point.

Responsibilities (to implement):
- Serve the built Vue/Vuetify frontend from ./static
- Routes:
    POST /api/upload/excel      -> excel_parser.py
    POST /api/upload/photo      -> save group photo / member photo
    POST /api/detect-faces      -> face_detector.py
    POST /api/composite         -> image_compositor.py (missing-member grid + merge)
    POST /api/export            -> html_generator.py (final single HTML)
- Print the reachable URL clearly on startup (see APP_PORT env var).
"""

# import uvicorn
# from fastapi import FastAPI
# from fastapi.staticfiles import StaticFiles
#
# app = FastAPI()
# app.mount("/", StaticFiles(directory="static", html=True), name="static")
#
# if __name__ == "__main__":
#     port = int(os.environ.get("APP_PORT", 8000))
#     print(f"Open this in your browser: http://localhost:{port}")
#     uvicorn.run(app, host="0.0.0.0", port=port)

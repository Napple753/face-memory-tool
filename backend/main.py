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

import os

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.staticfiles import StaticFiles

import excel_parser

app = FastAPI()


@app.post("/api/upload/excel")
async def upload_excel(file: UploadFile):
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Please upload a .xlsx file")
    content = await file.read()
    try:
        return excel_parser.parse_excel(content)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read this Excel file")


static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("APP_PORT", 8000))
    print(f"Open this in your browser: http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

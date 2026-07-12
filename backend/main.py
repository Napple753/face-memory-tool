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
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import excel_parser
import face_detector
import html_generator
import image_compositor

app = FastAPI()


class CompositeMember(BaseModel):
    id: str
    name: str
    photoDataUrl: str | None = None


class CompositeRequest(BaseModel):
    groupPhotoDataUrl: str
    missingMembers: list[CompositeMember]
    rows: int | None = None
    thumbWidth: int | None = None
    thumbHeight: int | None = None


class ExportMember(BaseModel):
    id: str
    name: str
    division: str
    answerText: str
    x: int
    y: int
    w: int
    h: int
    location: str


class ExportRequest(BaseModel):
    title: str
    compositeImageDataUrl: str
    imageWidth: int
    imageHeight: int
    members: list[ExportMember]


@app.post("/api/upload/excel")
async def upload_excel(file: UploadFile):
    if not file.filename or not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Please upload a .xlsx file")
    content = await file.read()
    try:
        return excel_parser.parse_excel(content)
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read this Excel file")


@app.post("/api/detect-faces")
async def detect_faces(file: UploadFile):
    content = await file.read()
    try:
        boxes = face_detector.detect_faces(content)
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except ValueError:
        raise HTTPException(status_code=400, detail="Could not read this image")
    return {"boxes": boxes}


@app.post("/api/composite")
async def composite(req: CompositeRequest):
    thumb_size = None
    if req.thumbWidth and req.thumbHeight:
        thumb_size = (req.thumbWidth, req.thumbHeight)
    try:
        return image_compositor.build_composite(
            group_photo_data_url=req.groupPhotoDataUrl,
            missing_members=[m.model_dump() for m in req.missingMembers],
            rows=req.rows,
            thumb_size=thumb_size,
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Could not build the composite image")


@app.post("/api/export")
async def export_html(req: ExportRequest):
    try:
        page = html_generator.generate_html(
            title=req.title,
            composite_image_data_url=req.compositeImageDataUrl,
            image_width=req.imageWidth,
            image_height=req.imageHeight,
            members=[m.model_dump() for m in req.members],
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Could not generate the export file")
    return Response(content=page, media_type="text/html")


static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("APP_PORT", 8000))
    print(f"Open this in your browser: http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

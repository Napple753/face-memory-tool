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
    POST /api/export/excel      -> excel_photo_replacer.py (original excel, photos swapped in place)
- Print the reachable URL clearly on startup (see APP_PORT env var).
"""

import os

from fastapi import FastAPI, Form, HTTPException, UploadFile
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import excel_parser
import excel_photo_replacer
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


class PhotoReplacementIn(BaseModel):
    sheetName: str
    rowIndex: int
    x: float
    y: float
    w: float
    h: float


class ExcelExportMetadata(BaseModel):
    photoColumn: str | None = None
    groupPhotoDataUrl: str
    groupPhotoWidth: int
    groupPhotoHeight: int
    replacements: list[PhotoReplacementIn]


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


@app.post("/api/export/excel")
async def export_excel(file: UploadFile, metadata: str = Form(...)):
    try:
        meta = ExcelExportMetadata.model_validate_json(metadata)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid export metadata")

    original_bytes = await file.read()
    replacements = [
        excel_photo_replacer.PhotoReplacement(
            sheet_name=r.sheetName,
            row_index=r.rowIndex,
            box={"x": r.x, "y": r.y, "w": r.w, "h": r.h},
        )
        for r in meta.replacements
    ]
    try:
        content, replaced_count = excel_photo_replacer.replace_photos(
            file_bytes=original_bytes,
            photo_column=meta.photoColumn,
            replacements=replacements,
            group_photo_data_url=meta.groupPhotoDataUrl,
            group_photo_width=meta.groupPhotoWidth,
            group_photo_height=meta.groupPhotoHeight,
        )
    except excel_photo_replacer.NoPhotoColumnError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not generate the export Excel file")
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": "attachment; filename=members-export.xlsx",
            "X-Photos-Replaced": f"{replaced_count}/{len(meta.replacements)}",
            "Access-Control-Expose-Headers": "X-Photos-Replaced",
        },
    )


static_dir = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


def _check_port_free(port: int) -> None:
    """Bind-and-release probe so a taken port fails with our own clear
    message, rather than uvicorn's internal sys.exit() and log line."""
    import socket
    import sys

    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        probe.bind(("0.0.0.0", port))
    except OSError:
        print(
            f"\nPort {port} is already in use. Set APP_PORT to a free port and "
            f"try again, e.g.:\n\n    APP_PORT=8001 docker compose up --build\n",
            file=sys.stderr,
        )
        sys.exit(1)
    finally:
        probe.close()


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("APP_PORT", 8000))
    _check_port_free(port)
    print(f"Open this in your browser: http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)

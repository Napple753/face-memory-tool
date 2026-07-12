# Face Memory Tool — Minimum Development Plan

This plan breaks the work into small phases. Each phase produces something
that can be run and checked, so problems are found early instead of at the
end.

## Phase 0 — Project skeleton (no logic yet)
- Set up folder structure (`backend/`, `frontend/`, `output-template/`).
- Backend: FastAPI app that serves a "hello world" page and static files.
- Frontend: Vue 3 + Vuetify + TypeScript project (via Vite) that shows a
  blank page with the app title.
- Dockerfile (multi-stage: Node build → Python runtime) + docker-compose.yml.
- Confirm `docker compose up --build` works and `http://localhost:8000`
  shows the blank Vuetify page, on both Mac and Windows/WSL2.
- **Exit check:** container builds and starts on both target machines.

## Phase 1 — Excel import + column mapping
- Backend: `excel_parser.py` — read `.xlsx`, list columns, extract embedded
  images, guess image-to-row match by position.
- Backend: assign hidden internal ID to every row.
- Frontend: Upload screen (Excel + group photo + optional JSON).
- Frontend: Column-mapping screen (pick name/division/photo columns,
  build combined answer text with separator/line-break).
- Frontend: Photo-match preview grid, with manual fix option.
- **Exit check:** upload a real Excel file, correctly map columns, see
  matched photos, fix a wrong match.

## Phase 2 — Face detection + annotation core
- Backend: `face_detector.py` — OpenCV DNN face detector on group photo,
  returns list of boxes.
- Frontend: `FaceBoxCanvas.vue` — show group photo + boxes, click to
  select, draw new box, delete box.
- Frontend: `BoxAdjustSliders.vue` — X/Y/W/H sliders in real image
  coordinates.
- Frontend: `NameAutocomplete.vue` + `SuggestionList.vue` — assign name to
  selected box, remove used names from suggestions.
- Pinia store: holds members, boxes, mapping — single source of truth.
- **Exit check:** detect faces on a real group photo, label all of them
  manually, edit box positions, confirm no duplicate names allowed.

## Phase 3 — Save/restore
- `progress-storage.ts`: continuous localStorage auto-save.
- Manual "Export progress as JSON" button (always visible), with
  `formatVersion` field.
- JSON import on upload screen, with overwrite warning, skips column
  mapping and restores state directly.
- **Exit check:** close browser mid-annotation, reopen, confirm state
  restored from localStorage. Export JSON, clear storage, re-import,
  confirm full restore.

## Phase 4 — Missing members + bottom grid
- Backend: compute missing members (full list − annotated).
- Backend: `image_compositor.py` — build bottom grid image, merge with
  group photo.
- Frontend: `MissingMembersView.vue` — list missing members, upload photo
  per person if absent, show gray placeholder otherwise, preview/adjust
  grid row count before finalizing.
- **Exit check:** with some members missing from the group photo, confirm
  they appear correctly in the generated bottom grid.

## Phase 5 — Final HTML export
- Backend: `html_generator.py` — embed merged image (base64), member data,
  and plain JS (annotation view + quiz view) into `output-template/template.html`.
- Output template: Mode A (browse + hover + search/highlight) and Mode B
  (quiz: checkbox division select + select-all, face-only question,
  combined answer, remembered/forgot, same-round retry).
- **Exit check:** open the generated HTML file directly (double-click, no
  server) and confirm both modes work fully offline.

## Phase 6 — Polish and edge cases
- Port conflict handling (`APP_PORT` override, clear error/log message).
- Duplicate-name detection during column mapping (once the name column is
  chosen -- raw import rows don't know their own name column yet).
- Empty/edge cases: zero missing members, zero photos, very small/large
  member counts.
- README finalized with run instructions.
- **Exit check:** full run-through of the whole workflow, start to finish,
  using a real Excel file and real photos.

## Explicitly out of scope (per earlier discussion)
- Automatic face recognition/matching (manual tagging only).
- Mobile/touch support (desktop browser only).
- Multi-user concurrent editing.
- Any external network calls, login, or tracking in the final HTML.
- Automatic free-port detection (manual `APP_PORT` override only).

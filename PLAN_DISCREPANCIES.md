# Discrepancies from DEVELOPMENT_PLAN.md

Audit of the finished implementation (Phases 0-6, all committed) against the
original plan. Each item below was verified directly against current code,
not from memory of the build sessions. Nothing here is a functional bug —
the app works end-to-end per every phase's exit check — these are places
where the *implementation* diverges from what the plan literally described.

## 1. Face detector: YuNet instead of the Caffe res10 model (Phase 2)

**Status: acknowledged, no action for now.**

`backend/face_detector.py` uses OpenCV's YuNet (ONNX, via
`cv2.FaceDetectorYN_create`), not the `res10_300x300_ssd_iter_140000`
Caffe model the plan named as the example.

**Why:** `opencv-python-headless` is unpinned in `requirements.txt`, and
current releases (OpenCV 5.x) dropped the Caffe importer entirely —
`cv2.dnn.readNetFromCaffe` no longer exists, so the named model literally
cannot load. `backend/models/README.md`'s original wording ("res10... *or
an equivalent small pre-trained face-detection model*") already permitted
a substitution; YuNet is OpenCV's current officially-recommended
lightweight detector. Functionally compliant with the stub's own
allowance, but a real deviation from the specific technology
`DEVELOPMENT_PLAN.md` names.

## 2. "Backend: compute missing members" is actually done on the frontend (Phase 4)

**Status: acknowledged, no action for now.**

Plan: *"Backend: compute missing members (full list − annotated)."*

Actual: `annotationStore.ts`'s `missingMembers` getter computes this
client-side (members without an `in-photo` box). `POST /api/composite`
(`backend/main.py`) just accepts an already-filtered `missingMembers` list
in the request body and trusts it — `image_compositor.py` never
independently re-derives "full roster minus annotated" itself.

## 3. Bottom-grid thumbnails don't strictly match in-photo face-crop size (Phase 4)

**Status: pending -- to be checked against actual behavior/real photos before deciding.**

Plan: *"build a bottom grid of thumbnails, **sized to match in-photo face
crops**."*

Actual (`backend/image_compositor.py`, `build_composite`): `cell_w = width
// cols` — grid cells stretch to fill the full row width. The average
in-photo box size (sent by the frontend) is only used as a *starting
hint* to pick the initial column count, not as a fixed cell dimension.
With few missing members, cells end up much larger than any real detected
face. Separately, `_fit_thumbnail` uses `Image.thumbnail()`, which only
ever shrinks — a small source photo stays small and centered on a padded
canvas rather than filling its cell.

## 4. `photoColumn` in column mapping is captured but never used (Phase 1)

**Status: acknowledged, no action for now.**

Plan: *"Column-mapping screen (pick name/division/**photo** columns...)."*

The UI has a "Photo column (optional)" selector, and
`ColumnMapping.photoColumn` is stored and round-tripped through progress
export/import — but nothing ever reads it (verified: no reference to
`.photoColumn` anywhere outside where it's set). Photo matching is done
entirely by embedded-image position within the sheet (the actual Phase 1
design), making this field inert UI/state.

## 5. Duplicate-name detection fires at column-mapping time, not "during Excel import" (Phase 6)

**Status: resolved.** `DEVELOPMENT_PLAN.md` updated to read "Duplicate-name
detection during column mapping (once the name column is chosen -- raw
import rows don't know their own name column yet)," matching the actual
(and effectively unavoidable) behavior. No code changes needed.

Plan (original wording): *"Duplicate-name detection during Excel import."*

Actual: detection (`annotationStore.ts`'s `duplicateNames` getter,
surfaced in `ColumnMappingView.vue`) can only run once the user has
picked which column is "Name," so it fires when "Build member list" is
clicked — one screen after the literal upload step.

## 6. Port-conflict handling is unreachable in both documented run paths (Phase 6)

**Status: deferred -- to be considered later.**

`backend/main.py`'s `if __name__ == "__main__":` block pre-checks the
port via a bind-and-release probe and prints a clear message + exits 1 on
conflict (built and tested against a real occupied port). However:

- `Dockerfile`'s `CMD` invokes `uvicorn main:app --host 0.0.0.0 --port
  8000` directly via the uvicorn CLI — it never calls `python main.py`,
  so this code never runs in the shipped container.
- `README.md`'s dev-container instructions likewise run `uvicorn main:app
  --reload --host 0.0.0.0 --port 8000` directly, also bypassing it, and
  hardcoding port 8000 regardless of `APP_PORT`.

Net effect: `APP_PORT` overriding still works for the documented `docker
compose up` flow, but only via Docker's own host-port remapping
(`${APP_PORT:-8000}:8000` in `docker-compose.yml`) — which does fail with
a reasonably clear Docker-level error on conflict. The custom
Python-level friendly message is real, tested, working code, just
currently unreachable from either way this app is actually run per the
README.

## 7. `POST /api/upload/photo` was planned but never built

**Status: left as-is.** Possible future update; not actioned now.

`backend/main.py`'s module docstring still lists, under "Responsibilities
(to implement)": `POST /api/upload/photo -> save group photo / member
photo`. This route doesn't exist. Group and member photos are instead
sent inline as base64 data URLs inside the `/api/detect-faces`,
`/api/composite`, and `/api/export` request bodies — never via a
dedicated upload endpoint. The docstring is stale: it still says "(to
implement)" for the whole route list even though everything else in it
was in fact built.

## 8. `data/` Docker volume is unused (Phase 0 scaffold carryover)

**Status: resolved -- deleted.** Removed the `volumes:` mount from
`docker-compose.yml`, the `data/*` / `!data/.gitkeep` rules from
`.gitignore`, and the empty `data/` directory itself.

Original finding: `docker-compose.yml` mounted `./data:/app/data`
("optional: keeps temp/working files if the container restarts
mid-session"), but no backend code ever read or wrote anything under
`data/` — the architecture ended up fully stateless-backend /
client-held-state (Pinia + localStorage), so this mount did nothing.

---

**Not a discrepancy, worth noting for context:** `vue-router` (hash-mode,
`createWebHashHistory`) was added to wire the five views together. The
plan lists each screen but never specifies a routing mechanism; hash mode
was chosen specifically to avoid needing a backend SPA-fallback route.

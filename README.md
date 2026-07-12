# Face Memory Tool

A workplace face-and-name memorization tool. Runs locally in Docker,
produces one self-contained HTML file (annotation viewer + flashcard quiz)
that can be shared and opened by anyone on the closed internal network,
with no server or install required.

Development happens in this dev container (VS Code); this README covers
running the **finished tool**, not the dev setup (see below for that).

## How to run (finished tool)

1. Make sure Docker Desktop (Mac) or Rancher Desktop (Windows/WSL2) is
   running.
2. From this folder, run:

   ```
   docker compose up --build
   ```

3. Open your browser to:

   ```
   http://localhost:8000
   ```

4. If port 8000 is already used by something else on your machine, run
   this instead (replace 8001 with any free port number):

   ```
   APP_PORT=8001 docker compose up --build
   ```

   Then open `http://localhost:8001` instead.

5. To stop, press `Ctrl+C` in the terminal, or run:

   ```
   docker compose down
   ```

The tool prints the exact URL to open in the terminal on startup, so you
don't need to remember the port.

## How to use it

1. **Upload** -- pick your roster (`.xlsx`) and the group photo. Embedded
   photos in the spreadsheet are auto-matched to rows by their position.
2. **Column mapping** -- pick which columns are the name, division, and
   the columns to combine into the quiz's "answer" text. Fix any wrong
   photo matches here. If two rows share a name, you'll see a warning --
   the tool doesn't require unique names, but duplicates will look
   identical in the assignment list during annotation, so it's worth
   disambiguating them in the spreadsheet (e.g. add a last initial).
3. **Annotate** -- faces are auto-detected; click a box to select it, drag
   on the photo to add a box the detector missed, assign a name via the
   dropdown or the quick-pick chip list. A name can only be assigned to
   one box at a time.
4. **Missing members** -- anyone not matched to a face gets a spot in a
   grid appended below the group photo (their own photo if they have one,
   otherwise a gray placeholder with their initials). Adjust the row
   count and re-preview before finalizing.
5. **Export** -- generates one self-contained `.html` file (photo +
   quiz data + logic all embedded, nothing external) and downloads it.
   Open it directly in a browser -- no server, no install.

Progress auto-saves to the browser's local storage as you go, so closing
the tab and reopening it picks up where you left off. Use "Export
progress" (top right, always available) to save a JSON snapshot you can
re-import later from the Upload screen.

## How to develop (VS Code dev container)

This repo includes a `.devcontainer/` configuration with both Python and
Node available, plus recommended VS Code extensions (Python, Volar for
Vue, ESLint, Prettier, Docker).

1. Open this folder in VS Code.
2. Install the "Dev Containers" extension if you don't have it.
3. Command Palette -> "Dev Containers: Reopen in Container".
4. Inside the container terminal:

   - Backend: `cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000`
   - Frontend: `cd frontend && npm run dev` (serves on :5173, proxies
     `/api` calls to the backend on :8000)

See `DEVELOPMENT_PLAN.md` for the phased build plan.

## Project structure

```
backend/            FastAPI app: Excel parsing, face detection,
                     image compositing, final HTML generation
frontend/            Vue 3 + Vuetify + TypeScript annotation tool
output-template/    Plain HTML/JS template for the final deliverable file
                     (browse view + quiz), inlined by html_generator.py
.devcontainer/      VS Code dev container config
Dockerfile          Production image (multi-stage: Node build -> Python runtime)
Dockerfile.dev      Dev-container image (Python + Node together)
docker-compose.yml  Production run
```

The face-detection model (`backend/models/face_detection_yunet.onnx`) isn't
committed to git -- it's fetched once by `backend/download_models.sh`, which
runs automatically during `docker build` and in the devcontainer's
`postCreateCommand`. Run it manually if you ever need to re-fetch it.

## Notes

- Face detection only -- no automatic face *recognition*. All name
  assignment is manual, by design (recognition is unreliable on old/
  low-quality individual photos).
- The final output HTML is desktop-browser only, fully offline, and has
  no login/tracking/external calls.
- Quiz progress is intentionally not saved -- resets each time the file
  is opened.
- Duplicate names in the roster are allowed but flagged with a warning
  during column mapping (see "How to use it" above).

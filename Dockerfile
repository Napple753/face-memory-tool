# ---- Stage 1: build the Vue 3 + Vuetify + TypeScript frontend ----
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build
# output goes to /app/dist

# ---- Stage 2: runtime — Python backend serves API + built frontend ----
FROM python:3.11-slim
WORKDIR /app

# opencv-python-headless still needs a couple of system libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libsm6 libxext6 libxrender1 curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
RUN bash download_models.sh
COPY --from=frontend-build /app/dist ./static
# html_generator.py resolves this as a sibling of backend/ (../output-template)
COPY output-template/ /output-template/

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

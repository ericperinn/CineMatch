# Python FastAPI image for SBERT embeddings.
# Uses CPU-only torch to keep the image lean (~700MB total instead of ~3GB with CUDA).
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.cache/huggingface

# Build deps for native wheels (numpy, sentence-transformers transitive deps)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install CPU-only torch first (much smaller wheel), then the rest.
# Pinning torch keeps sentence-transformers happy.
RUN pip install --upgrade pip && \
    pip install --index-url https://download.pytorch.org/whl/cpu torch==2.2.2

COPY requirements.txt .
RUN pip install -r requirements.txt

# Pre-download the SBERT model so cold starts are fast and the container
# does not need outbound HuggingFace access at runtime.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

COPY main.py .

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=5 \
  CMD python -c "import urllib.request; r=urllib.request.urlopen('http://localhost:8000/health'); import json; assert json.loads(r.read())['status']=='ok'" || exit 1

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

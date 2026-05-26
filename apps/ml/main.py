"""
CineMatch ML Service — Sentence-BERT embeddings microservice.

Loads `sentence-transformers/all-MiniLM-L6-v2` at startup (384-dim vectors).
Inference is CPU-only and batched — see `BATCH_LIMIT` below.
"""

import os
from contextlib import asynccontextmanager
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
BATCH_LIMIT = 64  # max texts per /embed call

# ---- Lifespan: load model once ----

state: dict = {}


@asynccontextmanager
async def lifespan(_app: FastAPI):
    print(f"Loading SBERT model: {MODEL_NAME} ...")
    state["model"] = SentenceTransformer(MODEL_NAME)
    print(f"Model loaded — embedding dim = {state['model'].get_sentence_embedding_dimension()}")
    yield
    state.clear()


app = FastAPI(title="CineMatch ML Service", version="0.2.0", lifespan=lifespan)


# ---- Schemas ----


class HealthResponse(BaseModel):
    status: str
    service: str
    model: Optional[str] = None
    embedding_dim: Optional[int] = None


class EmbedRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, max_length=BATCH_LIMIT)


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    model: str
    dim: int


# ---- Endpoints ----


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    model = state.get("model")
    if model is None:
        return HealthResponse(status="loading", service="cinematch-ml")
    return HealthResponse(
        status="ok",
        service="cinematch-ml",
        model=MODEL_NAME,
        embedding_dim=model.get_sentence_embedding_dimension(),
    )


@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest) -> EmbedResponse:
    model = state.get("model")
    if model is None:
        raise HTTPException(status_code=503, detail="Model still loading")

    # encode is sync but fast for CPU + small batches; run in the threadpool implicitly via FastAPI
    embeddings = model.encode(
        request.texts,
        batch_size=BATCH_LIMIT,
        show_progress_bar=False,
        normalize_embeddings=True,  # so cosine == dot product
        convert_to_numpy=True,
    )

    return EmbedResponse(
        embeddings=embeddings.tolist(),
        model=MODEL_NAME,
        dim=model.get_sentence_embedding_dimension(),
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

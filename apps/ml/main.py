"""
CineMatch ML Service — SBERT embeddings microservice.
Runs on port 8000 by default.
"""

import os
from typing import List

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="CineMatch ML Service", version="0.1.0")

# ---- Models ----


class HealthResponse(BaseModel):
    status: str
    service: str


class EmbedRequest(BaseModel):
    texts: List[str]


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]


# ---- Health check ----


@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", service="cinematch-ml")


# ---- Embeddings (mock for now, will be real SBERT later) ----


@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest) -> EmbedResponse:
    """
    Generate 384-dimensional embeddings for a batch of texts.
    Currently returns random embeddings (placeholder).
    Will use Sentence-BERT in production.
    """
    batch_size = len(request.texts)
    embedding_dim = 384

    # TODO: Replace with real SBERT inference
    # For now, generate random vectors of the right shape
    embeddings = np.random.randn(batch_size, embedding_dim).tolist()

    return EmbedResponse(embeddings=embeddings)


# ---- Startup / Shutdown ----


@app.on_event("startup")
async def startup_event():
    print("🤖 CineMatch ML Service starting...")
    # TODO: Load SBERT model here
    print("✓ ML Service ready on http://localhost:8000")


@app.on_event("shutdown")
async def shutdown_event():
    print("🤖 CineMatch ML Service shutting down...")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

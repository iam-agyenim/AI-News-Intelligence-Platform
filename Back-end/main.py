"""AI News Intelligence Platform — FastAPI entrypoint.

Run from this directory:  uvicorn main:app --reload
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select

import config
from api.routes import router
from database import Article, SessionLocal, init_db
from utils import ingest as ingest_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("news")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with SessionLocal() as db:
        count = db.scalar(select(func.count(Article.id)))
        if count == 0 and config.SAMPLE_DATASET.exists():
            from utils.dataset_loader import load_csv

            log.info("Empty database — seeding with %s", config.SAMPLE_DATASET.name)
            ingest_service.ingest(db, load_csv(config.SAMPLE_DATASET, spread_days=30))
        else:
            ingest_service.rebuild_index(db)
    yield


app = FastAPI(
    title="AI News Intelligence Platform",
    description="NLP API: preprocessing, POS, NER, sentiment, topics, keywords, classification, search, summarization.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"],
)
app.include_router(router, prefix="/api")

# Serve the built React app (frontend/dist) when present, so one process runs everything.
if config.FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=config.FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        file = config.FRONTEND_DIST / path
        if path and file.is_file() and config.FRONTEND_DIST in file.resolve().parents:
            return FileResponse(file)
        return FileResponse(config.FRONTEND_DIST / "index.html")

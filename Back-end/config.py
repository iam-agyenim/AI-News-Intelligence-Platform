"""Central configuration, driven by environment variables."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'news.db'}")
MODELS_DIR = Path(os.getenv("MODELS_DIR", BASE_DIR / "trained_models"))
DATASETS_DIR = BASE_DIR / "datasets"
SAMPLE_DATASET = DATASETS_DIR / "sample_news.csv"
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"

SPACY_MODEL = os.getenv("SPACY_MODEL", "en_core_web_sm")

# Transformer models are optional (torch is ~2GB). Enable with ENABLE_TRANSFORMERS=1
# after `pip install -r requirements-transformers.txt`.
ENABLE_TRANSFORMERS = os.getenv("ENABLE_TRANSFORMERS", "0") == "1"
TRANSFORMER_SENTIMENT_MODEL = os.getenv(
    "TRANSFORMER_SENTIMENT_MODEL", "distilbert-base-uncased-finetuned-sst-2-english"
)
TRANSFORMER_SUMMARY_MODEL = os.getenv("TRANSFORMER_SUMMARY_MODEL", "sshleifer/distilbart-cnn-12-6")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

CATEGORIES = ["business", "entertainment", "politics", "sport", "tech"]

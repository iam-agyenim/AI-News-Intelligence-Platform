"""Run every NLP stage on a piece of text."""
import logging
import time

from preprocessing import preprocess
from . import classification_pipeline as clf
from .keyword_pipeline import extract_keywords
from .ner_pipeline import entity_summary, extract_entities
from .pos_pipeline import pos_counts, pos_tag
from .search_pipeline import index
from .sentiment_pipeline import analyze_sentiment
from .summarization_pipeline import summarize

log = logging.getLogger(__name__)


def analyze(text: str, *, include_pos: bool = True, summary_sentences: int = 3) -> dict:
    timings: dict[str, float] = {}

    def timed(name, fn, *a, **kw):
        t0 = time.perf_counter()
        out = fn(*a, **kw)
        timings[name] = round((time.perf_counter() - t0) * 1000, 1)
        return out

    result = {
        "preprocessing": timed("preprocessing", preprocess, text),
        "entities": timed("ner", extract_entities, text),
        "sentiment": timed("sentiment", analyze_sentiment, text),
        "keywords": timed("keywords", extract_keywords, text, 10, index.vectorizer),
        "summary": timed("summary", summarize, text, summary_sentences),
    }
    result["entity_summary"] = entity_summary(result["entities"])
    if include_pos:
        tags = timed("pos", pos_tag, text)
        result["pos"] = tags
        result["pos_counts"] = pos_counts(tags)
    try:
        result["classification"] = timed("classification", clf.classify, text)
    except RuntimeError as exc:
        log.info("classification skipped: %s", exc)
        result["classification"] = None
    result["timings_ms"] = timings
    return result


def analyze_for_storage(title: str, content: str) -> dict:
    """Lightweight analysis persisted with each article (no POS table)."""
    r = analyze(f"{title}. {content}", include_pos=False)
    # body only: the headline repeats the lede, which would inflate phrase counts
    r["summary"] = summarize(content, 2)
    r["keywords"] = extract_keywords(content, 10, index.vectorizer)
    cls = r["classification"]
    return {
        "sentiment_label": r["sentiment"]["label"],
        "sentiment_score": r["sentiment"]["score"],
        "sentiment_detail": r["sentiment"]["models"],
        "entities": r["entities"],
        "keywords": r["keywords"],
        "summary": r["summary"]["summary"],
        "predicted_category": cls["category"] if cls else None,
        "category_confidence": cls["confidence"] if cls else None,
    }

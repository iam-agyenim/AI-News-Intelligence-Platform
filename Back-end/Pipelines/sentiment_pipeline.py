"""Sentiment analysis comparing TextBlob, VADER and (optionally) a Hugging Face transformer."""
from functools import lru_cache

from .nlp import get_hf_pipeline, transformers_available
import config

POS_THRESHOLD = 0.05


def _label(score: float) -> str:
    if score >= POS_THRESHOLD:
        return "positive"
    if score <= -POS_THRESHOLD:
        return "negative"
    return "neutral"


@lru_cache(maxsize=1)
def _vader():
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

    return SentimentIntensityAnalyzer()


def textblob_sentiment(text: str) -> dict:
    from textblob import TextBlob

    s = TextBlob(text).sentiment
    return {
        "model": "TextBlob",
        "score": round(s.polarity, 4),
        "label": _label(s.polarity),
        "subjectivity": round(s.subjectivity, 4),
    }


def vader_sentiment(text: str) -> dict:
    s = _vader().polarity_scores(text)
    return {
        "model": "VADER",
        "score": round(s["compound"], 4),
        "label": _label(s["compound"]),
        "breakdown": {k: s[k] for k in ("pos", "neu", "neg")},
    }


def transformer_sentiment(text: str) -> dict | None:
    if not transformers_available():
        return None
    clf = get_hf_pipeline("sentiment-analysis", config.TRANSFORMER_SENTIMENT_MODEL)
    out = clf(text[:2000], truncation=True)[0]
    signed = out["score"] if out["label"].upper().startswith("POS") else -out["score"]
    # SST-2 has no neutral class; treat low-confidence predictions as neutral
    label = "neutral" if out["score"] < 0.75 else _label(signed)
    return {"model": "Transformer", "score": round(signed, 4), "label": label, "raw_label": out["label"]}


def analyze_sentiment(text: str) -> dict:
    results = [textblob_sentiment(text), vader_sentiment(text)]
    tr = transformer_sentiment(text)
    if tr:
        results.append(tr)

    # Consensus: majority vote, ties broken by the average score
    votes: dict[str, int] = {}
    for r in results:
        votes[r["label"]] = votes.get(r["label"], 0) + 1
    avg = sum(r["score"] for r in results) / len(results)
    top = max(votes.values())
    winners = [lbl for lbl, n in votes.items() if n == top]
    label = winners[0] if len(winners) == 1 else _label(avg)

    return {"label": label, "score": round(avg, 4), "models": results}

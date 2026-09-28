"""Summarization: extractive TextRank by default, abstractive transformer when enabled."""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from preprocessing import sentence_tokenize
from .nlp import get_hf_pipeline, transformers_available
import config


def textrank_summary(text: str, num_sentences: int = 3) -> list[str]:
    sentences = sentence_tokenize(text)
    if len(sentences) <= num_sentences:
        return sentences
    try:
        tfidf = TfidfVectorizer(stop_words="english").fit_transform(sentences)
    except ValueError:  # only stopwords
        return sentences[:num_sentences]
    sim = (tfidf @ tfidf.T).toarray()
    np.fill_diagonal(sim, 0)
    row_sums = sim.sum(axis=1, keepdims=True)
    row_sums[row_sums == 0] = 1
    transition = sim / row_sums

    n = len(sentences)
    scores = np.ones(n) / n
    damping = 0.85
    for _ in range(100):
        new = (1 - damping) / n + damping * transition.T @ scores
        if np.abs(new - scores).sum() < 1e-6:
            break
        scores = new
    # slight lead bias: news puts key facts first
    scores = scores * (1 + 0.3 / (1 + np.arange(n)))
    top = sorted(np.argsort(-scores)[:num_sentences])
    return [sentences[i] for i in top]


def summarize(text: str, num_sentences: int = 3, method: str = "auto") -> dict:
    use_transformer = method == "abstractive" or (method == "auto" and transformers_available())
    if use_transformer and transformers_available():
        summarizer = get_hf_pipeline("summarization", config.TRANSFORMER_SUMMARY_MODEL)
        out = summarizer(text[:4000], max_length=130, min_length=30, truncation=True)[0]
        summary = out["summary_text"].strip()
        return {"method": "abstractive", "summary": summary, "sentences": sentence_tokenize(summary)}

    sents = textrank_summary(text, num_sentences)
    return {"method": "extractive", "summary": " ".join(sents), "sentences": sents}

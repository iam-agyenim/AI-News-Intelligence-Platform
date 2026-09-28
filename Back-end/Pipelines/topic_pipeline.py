"""Topic modeling with NMF (default; cleaner on short news texts) or Latent Dirichlet Allocation."""
import numpy as np
from sklearn.decomposition import LatentDirichletAllocation, NMF
from sklearn.feature_extraction.text import CountVectorizer, TfidfVectorizer

from preprocessing import clean_text, STOPWORDS

# words that appear everywhere in news and make topics unreadable
NEWS_FILLER = {
    "first", "second", "third", "last", "next", "year", "years", "week", "weeks", "month", "months",
    "day", "days", "time", "million", "billion", "per", "cent", "percent", "including", "expected",
    "says", "told", "made", "make", "set", "back", "well", "like", "many", "much", "since", "still",
    "may", "might", "get", "got", "take", "taken", "going", "just", "around", "already",
}
TOKEN_PATTERN = r"(?u)\b[a-zA-Z][a-zA-Z]+\b"


def discover_topics(texts: list[str], n_topics: int = 5, n_words: int = 10, method: str = "nmf") -> dict:
    if len(texts) < n_topics:
        raise ValueError(f"Need at least {n_topics} articles to find {n_topics} topics")
    stop = list(STOPWORDS | NEWS_FILLER)
    max_df = 0.7 if len(texts) >= 20 else 1.0
    min_df = 2 if len(texts) >= 50 else 1
    if method == "nmf":
        vec = TfidfVectorizer(preprocessor=clean_text, stop_words=stop, max_df=max_df, min_df=min_df,
                              token_pattern=TOKEN_PATTERN)
        X = vec.fit_transform(texts)
        model = NMF(n_components=n_topics, random_state=42, init="nndsvda", max_iter=400)
    else:
        vec = CountVectorizer(preprocessor=clean_text, stop_words=stop, max_df=max_df, min_df=min_df,
                              token_pattern=TOKEN_PATTERN)
        X = vec.fit_transform(texts)
        model = LatentDirichletAllocation(n_components=n_topics, random_state=42, learning_method="batch", max_iter=30)

    doc_topic = model.fit_transform(X)
    doc_topic = doc_topic / np.clip(doc_topic.sum(axis=1, keepdims=True), 1e-12, None)
    vocab = vec.get_feature_names_out()
    assignments = doc_topic.argmax(axis=1)

    topics = []
    for k, weights in enumerate(model.components_):
        top = weights.argsort()[::-1][:n_words]
        norm = weights[top] / weights[top].sum()
        topics.append({
            "id": k,
            "label": " / ".join(vocab[i] for i in top[:3]),
            "words": [{"word": vocab[i], "weight": round(float(w), 4)} for i, w in zip(top, norm)],
            "article_count": int((assignments == k).sum()),
            "prevalence": round(float(doc_topic[:, k].mean()), 4),
        })
    return {
        "method": method,
        "n_topics": n_topics,
        "topics": topics,
        "assignments": assignments.tolist(),
        "confidence": doc_topic.max(axis=1).round(4).tolist(),
    }

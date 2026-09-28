"""Stopword removal using NLTK's English list plus sklearn's as a fallback."""
from functools import lru_cache


@lru_cache(maxsize=1)
def _stopwords() -> frozenset[str]:
    try:
        from nltk.corpus import stopwords

        words = set(stopwords.words("english"))
    except LookupError:
        from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS

        words = set(ENGLISH_STOP_WORDS)
    # Common news boilerplate
    words |= {"said", "also", "would", "could", "one", "two", "new", "mr", "mrs", "ms", "s"}
    return frozenset(words)


STOPWORDS = _stopwords()


def remove_stopwords(tokens: list[str]) -> list[str]:
    return [t for t in tokens if t.lower() not in STOPWORDS and len(t) > 1]

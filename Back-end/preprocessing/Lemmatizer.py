"""Lemmatization with NLTK WordNet (falls back to identity if data is missing)."""
from functools import lru_cache


@lru_cache(maxsize=1)
def _lemmatizer():
    from nltk.stem import WordNetLemmatizer

    lem = WordNetLemmatizer()
    lem.lemmatize("warmup")  # raises LookupError early if wordnet is missing
    return lem


def lemmatize(tokens: list[str]) -> list[str]:
    try:
        lem = _lemmatizer()
    except LookupError:
        return tokens
    return [lem.lemmatize(lem.lemmatize(t), pos="v") for t in tokens]

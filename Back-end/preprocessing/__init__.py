"""Text preprocessing utilities."""
from .clean_text import LoadData, clean_text
from .regex import Regex, remove_html, remove_urls, remove_punctuation
from .tokenize import tokenize, sentence_tokenize
from .stopwords import remove_stopwords, STOPWORDS
from .Lemmatizer import lemmatize
from .stemmer import stem

__all__ = [
    "LoadData", "clean_text", "Regex", "remove_html", "remove_urls", "remove_punctuation",
    "tokenize", "sentence_tokenize", "remove_stopwords", "STOPWORDS", "lemmatize", "stem",
    "preprocess",
]


def preprocess(text: str, *, remove_stops: bool = True, lemma: bool = True, stemming: bool = False) -> dict:
    """Run the full preprocessing chain and return every intermediate step."""
    cleaned = clean_text(text)
    tokens = tokenize(cleaned)
    filtered = remove_stopwords(tokens) if remove_stops else tokens
    lemmas = lemmatize(filtered) if lemma else filtered
    stems = stem(lemmas) if stemming else None
    final = stems if stems is not None else lemmas
    return {
        "original": text,
        "cleaned": cleaned,
        "tokens": tokens,
        "without_stopwords": filtered,
        "lemmas": lemmas,
        "stems": stems,
        "processed_text": " ".join(final),
    }

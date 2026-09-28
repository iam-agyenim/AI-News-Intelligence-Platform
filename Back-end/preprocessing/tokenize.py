"""Word and sentence tokenization (NLTK, with a regex fallback)."""
import re

_WORD = re.compile(r"[A-Za-z0-9]+(?:'[A-Za-z]+)?")
_SENT = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9\"'])")


def tokenize(text: str) -> list[str]:
    try:
        from nltk.tokenize import word_tokenize

        return [t for t in word_tokenize(text) if any(c.isalnum() for c in t)]
    except LookupError:
        return _WORD.findall(text)


def sentence_tokenize(text: str) -> list[str]:
    try:
        from nltk.tokenize import sent_tokenize

        sents = sent_tokenize(text)
    except LookupError:
        sents = _SENT.split(text)
    return [s.strip() for s in sents if s.strip()]

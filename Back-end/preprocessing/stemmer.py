"""Porter stemming (optional step)."""
from nltk.stem import PorterStemmer

_stemmer = PorterStemmer()


def stem(tokens: list[str]) -> list[str]:
    return [_stemmer.stem(t) for t in tokens]

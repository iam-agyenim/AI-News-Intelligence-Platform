"""Semantic search over articles.

Uses sentence-transformer embeddings when transformers are enabled; otherwise falls back to
Latent Semantic Analysis (TF-IDF + truncated SVD), which still matches on meaning rather than
exact keywords because related words share latent dimensions.
"""
import logging
from threading import Lock

import numpy as np
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize

import config
from preprocessing import clean_text
from preprocessing.stemmer import stem
from .nlp import transformers_available

log = logging.getLogger(__name__)

_base_analyzer = TfidfVectorizer(
    preprocessor=clean_text, stop_words="english", token_pattern=r"(?u)\b[a-zA-Z][a-zA-Z]+\b"
).build_analyzer()


def _stemmed_analyzer(text: str) -> list[str]:
    """Stemmed unigrams + bigrams so 'cutting' matches 'cuts' and 'job cuts'."""
    words = stem(_base_analyzer(text))
    return words + [f"{a} {b}" for a, b in zip(words, words[1:])]


class SearchIndex:
    def __init__(self):
        self._lock = Lock()
        self.ids: list[int] = []
        self.matrix: np.ndarray | None = None
        self.backend = "empty"
        self._vectorizer: TfidfVectorizer | None = None
        self._svd: TruncatedSVD | None = None
        self._encoder = None

    @property
    def vectorizer(self) -> TfidfVectorizer | None:
        """Corpus-fitted TF-IDF (also reused for keyword extraction)."""
        return self._vectorizer

    def build(self, ids: list[int], texts: list[str]) -> None:
        with self._lock:
            self.ids = list(ids)
            if not texts:
                self.matrix, self.backend = None, "empty"
                return
            self._vectorizer = TfidfVectorizer(
                preprocessor=clean_text, stop_words="english", ngram_range=(1, 2),
                sublinear_tf=True, min_df=1, token_pattern=r"(?u)\b[a-zA-Z][a-zA-Z]+\b", max_df=0.85 if len(texts) > 10 else 1.0,
            )
            self._vectorizer.fit(texts)  # display-friendly vocabulary, reused for keywords
            self._search_vec = TfidfVectorizer(analyzer=_stemmed_analyzer, sublinear_tf=True)
            tfidf = self._search_vec.fit_transform(texts)

            if transformers_available():
                try:
                    from sentence_transformers import SentenceTransformer

                    self._encoder = self._encoder or SentenceTransformer(config.EMBEDDING_MODEL)
                    self.matrix = self._encoder.encode(texts, normalize_embeddings=True, show_progress_bar=False)
                    self.backend = "sentence-transformers"
                    return
                except ImportError:
                    log.warning("sentence-transformers not installed; using LSA search")

            n_comp = max(2, min(150, tfidf.shape[1] - 1, len(texts) - 1))
            self._svd = TruncatedSVD(n_components=n_comp, random_state=42)
            self.matrix = normalize(self._svd.fit_transform(tfidf))
            self._tfidf = normalize(tfidf)
            self.backend = "lsa"

    def search(self, query: str, top_k: int = 10) -> list[tuple[int, float]]:
        with self._lock:
            if self.matrix is None or not query.strip():
                return []
            if self.backend == "sentence-transformers":
                q = self._encoder.encode([query], normalize_embeddings=True)[0]
                scores = self.matrix @ q
            else:
                q_tfidf = normalize(self._search_vec.transform([query]))
                q = normalize(self._svd.transform(q_tfidf))[0]
                # blend latent (semantic) similarity with lexical similarity
                lexical = (self._tfidf @ q_tfidf.T).toarray().ravel()
                scores = 0.7 * (self.matrix @ q) + 0.3 * lexical
            order = np.argsort(-scores)[:top_k]
            return [(self.ids[i], float(scores[i])) for i in order if scores[i] > 0.05]


index = SearchIndex()

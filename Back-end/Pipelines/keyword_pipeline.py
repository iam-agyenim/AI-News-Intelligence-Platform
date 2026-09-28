"""Keyword extraction: TF-IDF against the corpus, with a frequency fallback."""
from collections import Counter

from preprocessing import clean_text, tokenize, remove_stopwords, lemmatize


def extract_keywords(text: str, top_n: int = 10, vectorizer=None) -> list[dict]:
    if vectorizer is not None:
        vec = vectorizer.transform([text])
        names = vectorizer.get_feature_names_out()
        row = vec.tocoo()
        pairs = sorted(zip(row.col, row.data), key=lambda p: -p[1])
        counts = Counter(vectorizer.build_analyzer()(text))
        # a phrase must repeat to count; one-off bigrams are mostly noise
        candidates = [
            (names[col], float(score)) for col, score in pairs
            if " " not in names[col] or counts[names[col]] >= 2
        ][: top_n * 4]
        phrase_words = {w for term, _ in candidates[: top_n * 2] if " " in term for w in term.split()}
        out = []
        for term, score in candidates:
            if " " not in term and term in phrase_words:
                continue  # covered by a multi-word keyword
            out.append({"keyword": term, "score": round(score, 4)})
            if len(out) >= top_n:
                break
        if out:
            return out

    tokens = lemmatize(remove_stopwords(tokenize(clean_text(text))))
    tokens = [t for t in tokens if not t.isdigit()]
    counts = Counter(tokens)
    total = sum(counts.values()) or 1
    return [{"keyword": w, "score": round(c / total, 4)} for w, c in counts.most_common(top_n)]

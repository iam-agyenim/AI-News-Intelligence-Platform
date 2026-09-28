"""Tokenization and Part-of-Speech tagging with spaCy."""
from .nlp import get_spacy


def pos_tag(text: str) -> list[dict]:
    doc = get_spacy()(text)
    return [
        {
            "text": t.text,
            "lemma": t.lemma_,
            "pos": t.pos_,
            "tag": t.tag_,
            "dep": t.dep_,
            "is_stop": t.is_stop,
            "explanation": _explain(t.pos_),
        }
        for t in doc
        if not t.is_space
    ]


def pos_counts(tags: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for t in tags:
        if t["pos"] != "PUNCT":
            counts[t["pos"]] = counts.get(t["pos"], 0) + 1
    return dict(sorted(counts.items(), key=lambda kv: -kv[1]))


def _explain(pos: str) -> str:
    import spacy

    return spacy.explain(pos) or pos

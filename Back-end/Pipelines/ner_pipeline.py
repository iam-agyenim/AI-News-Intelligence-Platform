"""Named Entity Recognition with spaCy."""
from collections import Counter

from .nlp import get_spacy

# spaCy label -> human-friendly group used by the dashboard
LABEL_GROUPS = {
    "PERSON": "Person",
    "ORG": "Organization",
    "GPE": "Location",
    "LOC": "Location",
    "FAC": "Location",
    "NORP": "Group",
    "DATE": "Date",
    "TIME": "Date",
    "PRODUCT": "Product",
    "EVENT": "Event",
    "WORK_OF_ART": "Work of Art",
    "LAW": "Law",
    "MONEY": "Money",
    "PERCENT": "Percent",
}
IGNORED = {"CARDINAL", "ORDINAL", "QUANTITY", "LANGUAGE"}


def _normalize(text: str) -> str:
    text = text.strip()
    for prefix in ("the ", "The "):
        if text.startswith(prefix):
            text = text[len(prefix):]
    for suffix in ("'s", "\u2019s"):
        if text.endswith(suffix):
            text = text[: -len(suffix)]
    return text.strip()


def extract_entities(text: str) -> list[dict]:
    doc = get_spacy()(text)
    return [
        {
            "text": _normalize(ent.text),
            "label": ent.label_,
            "group": LABEL_GROUPS.get(ent.label_, ent.label_.title()),
            "start": ent.start_char,
            "end": ent.end_char,
        }
        for ent in doc.ents
        if ent.label_ not in IGNORED and _normalize(ent.text)
    ]


def entity_summary(entities: list[dict]) -> dict[str, list[dict]]:
    """Group entities and count mentions: {"Person": [{"text": "Tim Cook", "count": 2}, ...]}."""
    grouped: dict[str, Counter] = {}
    for e in entities:
        grouped.setdefault(e["group"], Counter())[e["text"]] += 1
    return {
        group: [{"text": t, "count": c} for t, c in counter.most_common()]
        for group, counter in grouped.items()
    }

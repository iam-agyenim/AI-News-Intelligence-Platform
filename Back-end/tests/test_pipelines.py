from Pipelines.ner_pipeline import extract_entities
from Pipelines.pos_pipeline import pos_tag
from Pipelines.sentiment_pipeline import analyze_sentiment
from Pipelines.summarization_pipeline import summarize

TEXT = ("Apple chief executive Tim Cook visited California on Monday. "
        "The company announced record profits and investors were delighted. "
        "Shares rose sharply in New York.")


def test_ner_finds_people_orgs_places():
    groups = {(e["text"], e["group"]) for e in extract_entities(TEXT)}
    assert ("Tim Cook", "Person") in groups
    assert ("California", "Location") in groups
    assert any(g == "Organization" for _, g in groups)


def test_pos_tags():
    tags = {t["text"]: t["pos"] for t in pos_tag("The government announced new policies today.")}
    assert tags["government"] == "NOUN" and tags["announced"] == "VERB"


def test_sentiment_polarity():
    assert analyze_sentiment("This is a wonderful, fantastic success!")["label"] == "positive"
    assert analyze_sentiment("A terrible, horrible disaster that ruined everything.")["label"] == "negative"


def test_extractive_summary_shorter():
    s = summarize(TEXT, num_sentences=1)
    assert s["method"] == "extractive" and len(s["sentences"]) == 1

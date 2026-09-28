import pandas as pd

from preprocessing import LoadData, Regex, clean_text, preprocess, remove_stopwords, tokenize


def test_clean_text_strips_html_urls_punctuation():
    assert clean_text("<p>Hello, World!</p> Visit https://x.com now.") == "hello world visit now"


def test_original_dataframe_helpers():
    df = pd.DataFrame({"text": ["Hello, World!"]})
    assert Regex(LoadData(df))["text"][0] == "hello world"


def test_tokenize_and_stopwords():
    tokens = tokenize("The government announced new policies today.")
    assert "government" in tokens
    assert remove_stopwords(tokens) == ["government", "announced", "policies", "today"]


def test_preprocess_lemmatizes():
    out = preprocess("The companies were announcing policies")
    assert "company" in out["lemmas"] and "announce" in out["lemmas"]

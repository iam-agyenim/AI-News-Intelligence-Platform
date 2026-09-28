import re

import pandas as pd

_HTML = re.compile(r"<[^>]+>")
_URL = re.compile(r"(https?://\S+|www\.\S+)")
_PUNCT = re.compile(r"[^a-zA-Z0-9\s]")
_SPACES = re.compile(r"\s+")


def Regex(data: pd.DataFrame) -> pd.DataFrame:
    from .clean_text import LoadData

    data = LoadData(data)
    data['text'] = data['text'].apply(lambda x: re.sub(r'[^a-zA-Z0-9\s]', '', x))
    return data


def remove_html(text: str) -> str:
    return _HTML.sub(" ", text)


def remove_urls(text: str) -> str:
    return _URL.sub(" ", text)


def remove_punctuation(text: str) -> str:
    return _PUNCT.sub(" ", text)


def normalize_whitespace(text: str) -> str:
    return _SPACES.sub(" ", text).strip()

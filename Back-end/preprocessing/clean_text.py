import pandas as pd

from .regex import remove_html, remove_urls, remove_punctuation, normalize_whitespace


#Load the dataset
def LoadData(data: pd.DataFrame) -> pd.DataFrame:
    data['text'] = data.text.str.lower()
    return data


def clean_text(text: str) -> str:
    """Lowercase and strip HTML, URLs, punctuation and extra whitespace from a string."""
    text = remove_html(text or "")
    text = remove_urls(text)
    text = text.lower()
    text = remove_punctuation(text)
    return normalize_whitespace(text)

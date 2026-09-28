from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TextIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=100_000)


class PreprocessIn(TextIn):
    remove_stopwords: bool = True
    lemmatize: bool = True
    stem: bool = False


class KeywordsIn(TextIn):
    top_n: int = Field(10, ge=1, le=50)


class ClassifyIn(TextIn):
    model: str | None = None
    compare: bool = False


class SummarizeIn(TextIn):
    num_sentences: int = Field(3, ge=1, le=10)
    method: str = Field("auto", pattern="^(auto|extractive|abstractive)$")


class SearchIn(BaseModel):
    query: str = Field(..., min_length=1, max_length=1000)
    top_k: int = Field(10, ge=1, le=50)


class ArticleIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    category: str | None = None
    source: str | None = None
    url: str | None = None
    published_at: datetime | None = None


class ArticleSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str | None
    predicted_category: str | None
    category_confidence: float | None
    sentiment_label: str | None
    sentiment_score: float | None
    summary: str | None
    source: str | None
    published_at: datetime
    topic_id: int | None


class ArticleOut(ArticleSummary):
    content: str
    url: str | None
    entities: list | None
    keywords: list | None
    sentiment_detail: list | None


class ArticlePage(BaseModel):
    items: list[ArticleSummary]
    total: int
    page: int
    page_size: int

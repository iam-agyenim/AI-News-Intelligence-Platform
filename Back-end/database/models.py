from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500))
    content: Mapped[str] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(50), index=True)  # ground-truth label, if known
    source: Mapped[str | None] = mapped_column(String(200))
    url: Mapped[str | None] = mapped_column(String(1000))
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # NLP analysis
    predicted_category: Mapped[str | None] = mapped_column(String(50), index=True)
    category_confidence: Mapped[float | None] = mapped_column(Float)
    sentiment_label: Mapped[str | None] = mapped_column(String(20), index=True)
    sentiment_score: Mapped[float | None] = mapped_column(Float)
    sentiment_detail: Mapped[list | None] = mapped_column(JSON)
    entities: Mapped[list | None] = mapped_column(JSON)
    keywords: Mapped[list | None] = mapped_column(JSON)
    summary: Mapped[str | None] = mapped_column(Text)
    topic_id: Mapped[int | None] = mapped_column(Integer)

    @property
    def display_category(self) -> str | None:
        return self.category or self.predicted_category

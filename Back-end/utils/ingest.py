"""Ingestion service: store articles, rebuild indexes, run NLP analysis, assign topics."""
import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from database import Article
from Pipelines import classification_pipeline as clf
from Pipelines.full_pipeline import analyze_for_storage
from Pipelines.search_pipeline import index
from Pipelines.topic_pipeline import discover_topics

log = logging.getLogger(__name__)
DEFAULT_TOPICS = 5


def rebuild_index(db: Session) -> None:
    rows = db.execute(select(Article.id, Article.title, Article.content)).all()
    index.build([r.id for r in rows], [f"{r.title}. {r.content}" for r in rows])
    log.info("Search index rebuilt: %d articles (%s)", len(rows), index.backend)


def assign_topics(db: Session, n_topics: int = DEFAULT_TOPICS) -> dict | None:
    articles = db.scalars(select(Article).order_by(Article.id)).all()
    if len(articles) < max(n_topics, 10):
        return None
    result = discover_topics([f"{a.title}. {a.content}" for a in articles], n_topics)
    for a, t in zip(articles, result["assignments"]):
        a.topic_id = int(t)
    db.commit()
    return result


def train_classifier(db: Session) -> dict:
    labeled = db.execute(
        select(Article.title, Article.content, Article.category).where(Article.category.is_not(None))
    ).all()
    if len(labeled) < 10:
        raise ValueError(f"Need at least 10 labeled articles to train; have {len(labeled)}")
    return clf.train([f"{r.title}. {r.content}" for r in labeled], [r.category for r in labeled])


def analyze_articles(db: Session, articles: list[Article]) -> None:
    for i, a in enumerate(articles, 1):
        for k, v in analyze_for_storage(a.title, a.content).items():
            setattr(a, k, v)
        if i % 100 == 0:
            db.commit()
            log.info("Analyzed %d/%d", i, len(articles))
    db.commit()


def ingest(db: Session, records: list[dict], *, retrain: bool = True) -> dict:
    """Insert records, then (re)train the classifier, rebuild search, analyze and assign topics."""
    articles = [Article(**r) for r in records]
    db.add_all(articles)
    db.commit()

    trained = None
    if retrain:
        try:
            trained = train_classifier(db)
        except ValueError as exc:
            log.info("Skipping training: %s", exc)
    rebuild_index(db)
    analyze_articles(db, articles)
    assign_topics(db)
    return {
        "inserted": len(articles),
        "trained": bool(trained),
        "best_model": trained["best_model"] if trained else None,
    }


def reanalyze_all(db: Session) -> int:
    articles = db.scalars(select(Article)).all()
    rebuild_index(db)
    analyze_articles(db, articles)
    assign_topics(db)
    return len(articles)

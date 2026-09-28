from collections import Counter, defaultdict
from functools import lru_cache

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from database import Article, get_db
from preprocessing import preprocess, sentence_tokenize, tokenize
from Pipelines import classification_pipeline as clf
from Pipelines.full_pipeline import analyze
from Pipelines.keyword_pipeline import extract_keywords
from Pipelines.ner_pipeline import entity_summary, extract_entities
from Pipelines.nlp import transformers_available
from Pipelines.pos_pipeline import pos_counts, pos_tag
from Pipelines.search_pipeline import index
from Pipelines.sentiment_pipeline import analyze_sentiment
from Pipelines.summarization_pipeline import summarize
from Pipelines.topic_pipeline import discover_topics
from utils import ingest as ingest_service
from utils.dataset_loader import load_csv

from .schemas import (
    ArticleIn, ArticleOut, ArticlePage, ClassifyIn, KeywordsIn, PreprocessIn, SearchIn, SummarizeIn, TextIn,
)

router = APIRouter()


# ---------------------------------------------------------------- health
@router.get("/health")
def health(db: Session = Depends(get_db)):
    return {
        "status": "ok",
        "articles": db.scalar(select(func.count(Article.id))),
        "classifier_trained": clf.is_trained(),
        "search_backend": index.backend,
        "transformers_enabled": transformers_available(),
    }


# ---------------------------------------------------------------- NLP endpoints
@router.post("/preprocess")
def preprocess_text(body: PreprocessIn):
    return preprocess(body.text, remove_stops=body.remove_stopwords, lemma=body.lemmatize, stemming=body.stem)


@router.post("/tokenize")
def tokenize_text(body: TextIn):
    return {"tokens": tokenize(body.text), "sentences": sentence_tokenize(body.text)}


@router.post("/pos")
def pos(body: TextIn):
    tags = pos_tag(body.text)
    return {"tokens": tags, "counts": pos_counts(tags)}


@router.post("/ner")
def ner(body: TextIn):
    ents = extract_entities(body.text)
    return {"entities": ents, "summary": entity_summary(ents)}


@router.post("/sentiment")
def sentiment(body: TextIn):
    return analyze_sentiment(body.text)


@router.post("/keywords")
def keywords(body: KeywordsIn):
    return {"keywords": extract_keywords(body.text, body.top_n, index.vectorizer)}


@router.post("/classify")
def classify(body: ClassifyIn):
    try:
        if body.compare:
            return {"results": clf.classify_all_models(body.text)}
        return clf.classify(body.text, body.model)
    except RuntimeError as exc:
        raise HTTPException(409, str(exc))
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@router.post("/summarize")
def summarize_text(body: SummarizeIn):
    return summarize(body.text, body.num_sentences, body.method)


@router.post("/analyze")
def analyze_text(body: TextIn):
    return analyze(body.text)


@router.post("/search")
def search(body: SearchIn, db: Session = Depends(get_db)):
    hits = index.search(body.query, body.top_k)
    if not hits:
        return {"backend": index.backend, "results": []}
    by_id = {a.id: a for a in db.scalars(select(Article).where(Article.id.in_([h[0] for h in hits])))}
    results = [
        {"score": round(score, 4), "article": ArticleOut.model_validate(by_id[aid]).model_dump()}
        for aid, score in hits
        if aid in by_id
    ]
    return {"backend": index.backend, "results": results}


# ---------------------------------------------------------------- articles
@router.get("/articles", response_model=ArticlePage)
def list_articles(
    q: str | None = None,
    category: str | None = None,
    sentiment: str | None = None,
    topic: int | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    stmt = select(Article)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Article.title.ilike(like), Article.content.ilike(like)))
    if category:
        stmt = stmt.where(func.coalesce(Article.category, Article.predicted_category) == category)
    if sentiment:
        stmt = stmt.where(Article.sentiment_label == sentiment)
    if topic is not None:
        stmt = stmt.where(Article.topic_id == topic)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    items = db.scalars(
        stmt.order_by(Article.published_at.desc(), Article.id.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.get("/articles/{article_id}", response_model=ArticleOut)
def get_article(article_id: int, db: Session = Depends(get_db)):
    art = db.get(Article, article_id)
    if not art:
        raise HTTPException(404, "Article not found")
    return art


@router.post("/articles", response_model=ArticleOut, status_code=201)
def create_article(body: ArticleIn, db: Session = Depends(get_db)):
    data = body.model_dump(exclude_none=True)
    ingest_service.ingest(db, [data], retrain=False)
    _invalidate_caches()
    return db.scalars(select(Article).order_by(Article.id.desc()).limit(1)).one()


@router.delete("/articles/{article_id}", status_code=204)
def delete_article(article_id: int, db: Session = Depends(get_db)):
    art = db.get(Article, article_id)
    if not art:
        raise HTTPException(404, "Article not found")
    db.delete(art)
    db.commit()
    ingest_service.rebuild_index(db)
    _invalidate_caches()


@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...), retrain: bool = True, db: Session = Depends(get_db)):
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(400, "Upload a .csv file with a text/content column (title, category, date optional)")
    try:
        records = load_csv(await file.read(), spread_days=30)
    except Exception as exc:  # pandas raises many types
        raise HTTPException(400, f"Could not parse CSV: {exc}")
    if not records:
        raise HTTPException(400, "No articles found in the file")
    result = ingest_service.ingest(db, records, retrain=retrain)
    _invalidate_caches()
    return result


# ---------------------------------------------------------------- topics, trends, models
@lru_cache(maxsize=16)
def _topics_cached(n_topics: int, method: str, version: int):
    from database import SessionLocal

    with SessionLocal() as db:
        rows = db.execute(select(Article.id, Article.title, Article.content).order_by(Article.id)).all()
    result = discover_topics([f"{r.title}. {r.content}" for r in rows], n_topics, method=method)
    result["article_ids"] = [r.id for r in rows]
    return result


_cache_version = 0


def _invalidate_caches():
    global _cache_version
    _cache_version += 1


@router.get("/topics")
def topics(n_topics: int = Query(5, ge=2, le=20), method: str = Query("nmf", pattern="^(lda|nmf)$"),
           db: Session = Depends(get_db)):
    try:
        result = _topics_cached(n_topics, method, _cache_version)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    # attach representative articles per topic
    ids, assign, conf = result["article_ids"], result["assignments"], result["confidence"]
    best: dict[int, list[tuple[float, int]]] = defaultdict(list)
    for aid, t, c in zip(ids, assign, conf):
        best[t].append((c, aid))
    wanted = {aid for t in best for _, aid in sorted(best[t], reverse=True)[:3]}
    titles = dict(db.execute(select(Article.id, Article.title).where(Article.id.in_(wanted))).all())
    topics_out = []
    for t in result["topics"]:
        top = sorted(best[t["id"]], reverse=True)[:3]
        topics_out.append({**t, "examples": [{"id": aid, "title": titles.get(aid), "confidence": c} for c, aid in top]})
    return {"method": result["method"], "n_topics": n_topics, "topics": topics_out}


@router.get("/trends")
def trends(top_n: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    arts = db.execute(
        select(Article.published_at, Article.category, Article.predicted_category, Article.sentiment_label,
               Article.sentiment_score, Article.entities, Article.keywords)
    ).all()
    groups: dict[str, Counter] = defaultdict(Counter)
    kw, cats, sents = Counter(), Counter(), Counter()
    daily: dict[str, list[float]] = defaultdict(list)
    daily_count: Counter = Counter()
    cat_sent: dict[str, Counter] = defaultdict(Counter)
    for a in arts:
        seen = set()
        for e in a.entities or []:
            key = (e["group"], e["text"])
            if key not in seen:  # count articles mentioning an entity, not raw mentions
                seen.add(key)
                groups[e["group"]][e["text"]] += 1
        for k in (a.keywords or [])[:5]:
            kw[k["keyword"]] += 1
        cat = a.category or a.predicted_category or "unknown"
        cats[cat] += 1
        if a.sentiment_label:
            sents[a.sentiment_label] += 1
            cat_sent[cat][a.sentiment_label] += 1
        day = a.published_at.date().isoformat()
        daily_count[day] += 1
        if a.sentiment_score is not None:
            daily[day].append(a.sentiment_score)

    def top(counter):
        return [{"name": n, "count": c} for n, c in counter.most_common(top_n)]

    return {
        "total_articles": len(arts),
        "people": top(groups["Person"]),
        "organizations": top(groups["Organization"]),
        "locations": top(groups["Location"]),
        "keywords": top(kw),
        "categories": top(cats),
        "sentiment": dict(sents),
        "category_sentiment": {c: dict(v) for c, v in cat_sent.items()},
        "daily": [
            {"date": d, "articles": daily_count[d],
             "avg_sentiment": round(sum(daily[d]) / len(daily[d]), 4) if daily[d] else None}
            for d in sorted(daily_count)
        ],
    }


@router.get("/models")
def models():
    return {"trained": clf.is_trained(), "metrics": clf.load_metrics(), "available": clf.MODEL_NAMES}


@router.post("/models/train")
def train_models(db: Session = Depends(get_db)):
    try:
        metrics = ingest_service.train_classifier(db)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    ingest_service.reanalyze_all(db)
    _invalidate_caches()
    return metrics

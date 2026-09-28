# AI News Intelligence Platform

An end-to-end Natural Language Processing (NLP) platform that transforms raw news articles into meaningful insights using machine learning, transformer models, and modern data visualization.

It cleans, tokenizes, tags, extracts entities from, scores the sentiment of, classifies, clusters into topics, summarizes, and semantically indexes every article — then presents the results in an interactive dashboard backed by a REST API.

---

## Quick start

Requirements: Python 3.10+ and Node 18+.

```bash
make setup     # venv + pip deps + spaCy/NLTK data + npm install
make api       # terminal 1 — FastAPI on http://localhost:8000  (docs at /docs)
make web       # terminal 2 — dashboard on http://localhost:5173
```

On first start the API seeds the database with **60 short fictional sample articles** (`Back-end/datasets/sample_news.csv`), trains the classifiers, builds the search index and assigns topics — so everything works immediately.

Use the real **BBC News dataset** (2,225 articles, 5 categories):

```bash
make bbc       # downloads bbc-fulltext.zip, replaces the sample data, retrains
```

Single-process production mode (API also serves the built frontend):

```bash
make serve     # http://localhost:8000
```

Run the tests: `make test`.

<details>
<summary>Manual setup (without make)</summary>

```bash
cd Back-end
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python scripts/setup_nltk.py
uvicorn main:app --reload

cd ../frontend
npm install
npm run dev
```
</details>

### Optional: transformer models

Hugging Face models give better sentiment, abstractive summaries and embedding-based search, but pull in ~2 GB (PyTorch). Every feature has a lightweight fallback, so they are opt-in:

```bash
make setup-transformers
ENABLE_TRANSFORMERS=1 make api
```

| Feature | Default | With `ENABLE_TRANSFORMERS=1` |
|---|---|---|
| Sentiment | TextBlob + VADER (consensus vote) | + DistilBERT SST-2 as a third voter |
| Summarization | Extractive TextRank | Abstractive DistilBART-CNN |
| Semantic search | LSA (TF-IDF + truncated SVD, stemmed) | `all-MiniLM-L6-v2` sentence embeddings |

### Configuration

| Env var | Default |
|---|---|
| `DATABASE_URL` | `sqlite:///Back-end/news.db` — set to `postgresql://user:pass@host/db` for PostgreSQL |
| `ENABLE_TRANSFORMERS` | `0` |
| `SPACY_MODEL` | `en_core_web_sm` |
| `CORS_ORIGINS` | `http://localhost:5173` |
| `MODELS_DIR` | `Back-end/trained_models` |

---

## Features

| Area | Implementation |
|---|---|
| **Text preprocessing** | HTML/URL/punctuation removal, lowercasing, stopwords (NLTK), WordNet lemmatization, optional Porter stemming — `preprocessing/` |
| **Tokenization** | NLTK word & sentence tokenizers (regex fallback) |
| **POS tagging** | spaCy — token, lemma, universal POS, fine tag, dependency |
| **Named Entity Recognition** | spaCy — people, organizations, locations, dates, money, products, events |
| **Sentiment analysis** | TextBlob vs VADER (vs Transformer) with per-model scores and a consensus label |
| **Topic modeling** | NMF (default — cleaner on short news) or LDA, 2–20 topics, representative articles |
| **Keyword extraction** | Corpus TF-IDF over 1–2-grams; repeated phrases preferred over their single words |
| **News classification** | Logistic Regression, Multinomial Naive Bayes, Linear SVM (calibrated) on TF-IDF; accuracy, macro F1, per-class report and confusion matrix |
| **Semantic search** | Latent Semantic Analysis blended with lexical similarity, or sentence embeddings |
| **Summarization** | TextRank with a lead bias, or DistilBART |
| **Trend dashboard** | Top people/organizations/locations/keywords, daily volume & sentiment, category distribution, sentiment mix per category |
| **Data ingestion** | CSV upload (flexible column names), single-article form, BBC folder loader, CLI |

### Dashboard pages

- **Dashboard** — KPIs, daily volume and sentiment, categories, sentiment mix, entity and keyword rankings
- **Articles** — filter by keyword, category, sentiment or topic; article view with highlighted entities, AI summary, per-model sentiment and keywords
- **Analyzer** — paste any text and see every pipeline stage: overview, entities, tokens & POS table, preprocessing steps
- **Semantic search** — meaning-based search with similarity scores
- **Topics** — interactive NMF/LDA topic discovery
- **Models** — classifier comparison, confusion matrix, per-class metrics, one-click retraining
- **Add data** — CSV import or single article

Light, dark and system themes; responsive down to phone width.

---

## REST API

All endpoints are under `/api`. Interactive docs: http://localhost:8000/docs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Status, article count, model/search backends |
| GET | `/articles` | Paginated list — `q`, `category`, `sentiment`, `topic`, `page`, `page_size` |
| GET | `/articles/{id}` | Full article with stored analysis |
| POST | `/articles` | Add and analyze one article |
| DELETE | `/articles/{id}` | Remove an article |
| POST | `/upload` | Import a CSV (`retrain=true` to retrain classifiers) |
| POST | `/preprocess` | Cleaning → tokens → stopwords → lemmas (→ stems) |
| POST | `/tokenize` | Word and sentence tokens |
| POST | `/pos` | POS tags + counts |
| POST | `/ner` | Entities + grouped summary |
| POST | `/sentiment` | Per-model and consensus sentiment |
| POST | `/keywords` | Top keywords |
| POST | `/classify` | Category + probabilities (`model`, or `compare: true` for all three) |
| POST | `/summarize` | `num_sentences`, `method` = auto / extractive / abstractive |
| POST | `/analyze` | Everything above in one call, with per-stage timings |
| POST | `/search` | Semantic search — `query`, `top_k` |
| GET | `/topics` | `n_topics`, `method` = nmf / lda |
| GET | `/trends` | Aggregates for the dashboard |
| GET | `/models` | Training metrics |
| POST | `/models/train` | Retrain on all labeled articles and re-analyze |

```bash
curl -X POST localhost:8000/api/classify -H 'Content-Type: application/json' \
  -d '{"text": "The striker scored twice as the team won the league match."}'
```

---

## Project architecture

```
                News Dataset (CSV / BBC folder / API)
                      │
                      ▼
             Data Preprocessing  (clean → tokenize → stopwords → lemmatize)
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
 Tokenization      POS Tagging      NER            (NLTK, spaCy)
        │             │              │
        └─────────────┼──────────────┘
                      ▼
             Feature Engineering  (TF-IDF 1–2 grams, LSA / embeddings)
                      │
                      ▼
           Machine Learning Models
                      │
      ┌───────────────┼─────────────────┬──────────────┐
      ▼               ▼                 ▼              ▼
 Classification   Sentiment       Topic Modeling   Summarization
 (LR / NB / SVM)  (TextBlob/VADER) (NMF / LDA)     (TextRank)
      │               │                 │              │
      └───────────────┼─────────────────┴──────────────┘
                      ▼
       SQLite / PostgreSQL  ──►  FastAPI  ──►  React dashboard
```

## Project structure

```
AI-News-Intelligence-Platform/
├── Back-end/
│   ├── main.py                  FastAPI app (seeds DB on first run, serves frontend/dist)
│   ├── config.py                env-driven settings
│   ├── api/                     routes.py, schemas.py
│   ├── preprocessing/           clean_text, regex, tokenize, stopwords, Lemmatizer, stemmer
│   ├── Pipelines/               pos, ner, sentiment, classification, topic, keyword,
│   │                            summarization, search, full_pipeline
│   ├── database/                SQLAlchemy engine + Article model
│   ├── utils/                   dataset_loader.py, ingest.py
│   ├── scripts/                 ingest, train, download_bbc, setup_nltk, build_sample_dataset
│   ├── datasets/                sample_news.csv (+ bbc/ after download)
│   ├── trained_models/          *.joblib + metrics.json (generated)
│   ├── tests/                   pytest suite (preprocessing, pipelines, API)
│   ├── requirements.txt
│   └── requirements-transformers.txt
├── frontend/
│   └── src/
│       ├── components/          Layout, cards, rank lists, entity highlighter, charts
│       ├── pages/               Dashboard, Articles, ArticleDetail, Analyzer, Search, Topics, Models, Upload
│       ├── services/api.ts      typed API client
│       └── lib/                 theme tokens, Chart.js setup, hooks
├── docs/README.md
└── Makefile
```

### CLI

```bash
cd Back-end
python -m scripts.ingest --csv my_news.csv            # add a dataset
python -m scripts.ingest --bbc datasets/bbc --reset   # replace everything with BBC
python -m scripts.train                               # retrain + print model comparison
```

CSV columns are matched flexibly: text from `content`/`text`/`article`/`body`, plus optional `title`/`headline`, `category`/`label`, `date`/`published_at`, `source`, `url`. Articles without dates are spread over the previous 30 days (`--spread-days`) so trend charts have shape; the BBC dataset has no dates, so its timeline is synthetic.

---

## Tech stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Chart.js
**Backend:** FastAPI, Python, SQLAlchemy
**NLP:** spaCy, NLTK, TextBlob, VADER, (optional) Hugging Face Transformers & sentence-transformers
**Machine learning:** scikit-learn
**Database:** SQLite (default) or PostgreSQL

---

## Future improvements

- Live news ingestion (RSS / news APIs)
- Fake news and bias detection
- Cross-document summarization
- Knowledge graph visualization of co-occurring entities
- Multilingual support
- Recommendation engine
- RAG-powered news chatbot
- Real-time news monitoring

---

## Learning outcomes

Natural Language Processing · Machine Learning · Transformer Models · Information Retrieval · REST API Development · Full Stack Development · Data Visualization · AI Model Deployment · Text Analytics · Software Engineering

## License

This project is licensed under the MIT License.

"""Load news datasets from CSV or the BBC News folder layout (bbc/<category>/<n>.txt)."""
import io
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

TEXT_COLUMNS = ("content", "text", "article", "body", "description")
TITLE_COLUMNS = ("title", "headline")
CATEGORY_COLUMNS = ("category", "label", "topic")
DATE_COLUMNS = ("published_at", "date", "published", "publishedAt")


def _pick(df: pd.DataFrame, names) -> str | None:
    lower = {c.lower(): c for c in df.columns}
    for n in names:
        if n.lower() in lower:
            return lower[n.lower()]
    return None


def normalize_frame(df: pd.DataFrame, spread_days: int | None = None) -> list[dict]:
    """Map arbitrary CSV columns to article dicts. Missing titles use the first line of text."""
    text_col = _pick(df, TEXT_COLUMNS)
    if not text_col:
        raise ValueError(f"CSV needs a text column (one of {TEXT_COLUMNS}); got {list(df.columns)}")
    title_col = _pick(df, TITLE_COLUMNS)
    cat_col = _pick(df, CATEGORY_COLUMNS)
    date_col = _pick(df, DATE_COLUMNS)
    src_col = _pick(df, ("source",))
    url_col = _pick(df, ("url", "link"))

    now = datetime.now(timezone.utc).replace(microsecond=0)
    rows = []
    for i, r in enumerate(df.itertuples(index=False)):
        rec = r._asdict() if hasattr(r, "_asdict") else dict(zip(df.columns, r))
        text = str(rec.get(text_col) or "").strip()
        if not text:
            continue
        title = str(rec.get(title_col) or "").strip() if title_col else ""
        if not title:
            first, _, rest = text.partition("\n")
            title, text = (first.strip(), rest.strip() or text) if len(first) < 200 else (text[:80] + "…", text)
        published = None
        if date_col and pd.notna(rec.get(date_col)):
            published = pd.to_datetime(rec[date_col], utc=True, errors="coerce")
            published = None if pd.isna(published) else published.to_pydatetime()
        if published is None and spread_days:
            # Datasets without dates (e.g. BBC) are spread over recent days so trend charts have shape
            published = now - timedelta(days=i % spread_days, hours=(i * 7) % 24)
        rows.append({
            "title": title[:500],
            "content": text,
            "category": str(rec.get(cat_col)).strip().lower() if cat_col and pd.notna(rec.get(cat_col)) else None,
            "source": str(rec.get(src_col)) if src_col and pd.notna(rec.get(src_col)) else None,
            "url": str(rec.get(url_col)) if url_col and pd.notna(rec.get(url_col)) else None,
            "published_at": published or now,
        })
    return rows


def load_csv(path_or_bytes, spread_days: int | None = None) -> list[dict]:
    if isinstance(path_or_bytes, (bytes, bytearray)):
        df = pd.read_csv(io.BytesIO(path_or_bytes))
    else:
        df = pd.read_csv(path_or_bytes)
    return normalize_frame(df, spread_days)


def load_bbc_folder(root: Path, spread_days: int = 30) -> list[dict]:
    """BBC News dataset: root/<category>/*.txt where line 1 is the headline."""
    records = []
    for cat_dir in sorted(p for p in Path(root).iterdir() if p.is_dir()):
        for f in sorted(cat_dir.glob("*.txt")):
            raw = f.read_text(encoding="latin-1").strip()
            title, _, body = raw.partition("\n")
            records.append({"title": title.strip(), "text": body.strip(), "category": cat_dir.name, "source": "BBC News"})
    if not records:
        raise ValueError(f"No BBC articles found under {root}")
    return normalize_frame(pd.DataFrame(records), spread_days)

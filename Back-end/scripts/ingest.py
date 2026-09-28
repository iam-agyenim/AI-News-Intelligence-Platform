"""Load a dataset into the database, train classifiers and run analysis.

Examples (run from Back-end/):
  python -m scripts.ingest --csv datasets/sample_news.csv
  python -m scripts.ingest --bbc datasets/bbc          # after scripts/download_bbc.py
  python -m scripts.ingest --bbc datasets/bbc --reset  # wipe existing articles first
"""
import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete  # noqa: E402

from database import Article, SessionLocal, init_db  # noqa: E402
from utils import ingest as ingest_service  # noqa: E402
from utils.dataset_loader import load_bbc_folder, load_csv  # noqa: E402


def main():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--csv", type=Path)
    src.add_argument("--bbc", type=Path, help="folder with <category>/*.txt")
    p.add_argument("--reset", action="store_true", help="delete all articles first")
    p.add_argument("--spread-days", type=int, default=30,
                   help="assign synthetic dates over N days when the data has none (default 30)")
    p.add_argument("--limit", type=int, help="only ingest the first N articles")
    args = p.parse_args()

    records = load_bbc_folder(args.bbc, args.spread_days) if args.bbc else load_csv(args.csv, args.spread_days)
    if args.limit:
        records = records[: args.limit]
    init_db()
    with SessionLocal() as db:
        if args.reset:
            db.execute(delete(Article))
            db.commit()
        print(ingest_service.ingest(db, records))


if __name__ == "__main__":
    main()

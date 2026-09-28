"""Retrain the classifiers on all labeled articles in the database and print a comparison."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import SessionLocal, init_db  # noqa: E402
from utils import ingest as ingest_service  # noqa: E402

if __name__ == "__main__":
    init_db()
    with SessionLocal() as db:
        m = ingest_service.train_classifier(db)
        print(f"Trained on {m['n_samples']} articles ({m['n_train']} train / {m['n_test']} test)\n")
        print(f"{'Model':<26}{'Accuracy':>10}{'Macro F1':>10}")
        for key, r in m["models"].items():
            star = " *" if key == m["best_model"] else ""
            print(f"{r['name']:<26}{r['accuracy']:>10.3f}{r['f1_macro']:>10.3f}{star}")
        print("\nRe-analyzing stored articles with the new model…")
        print(f"Done: {ingest_service.reanalyze_all(db)} articles")

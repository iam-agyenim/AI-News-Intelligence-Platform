"""News category classification: Logistic Regression, Naive Bayes and SVM on TF-IDF features."""
import json
import logging
from datetime import datetime, timezone
from threading import Lock

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC

import config
from preprocessing import clean_text

log = logging.getLogger(__name__)

MODEL_NAMES = {
    "logistic_regression": "Logistic Regression",
    "naive_bayes": "Naive Bayes",
    "svm": "Support Vector Machine",
}
METRICS_FILE = config.MODELS_DIR / "metrics.json"

_lock = Lock()
_models: dict[str, Pipeline] = {}


def _build(name: str) -> Pipeline:
    vec = TfidfVectorizer(
        preprocessor=clean_text, stop_words="english", ngram_range=(1, 2),
        min_df=1, max_df=0.9, sublinear_tf=True,
    )
    if name == "logistic_regression":
        clf = LogisticRegression(max_iter=2000, C=10)
    elif name == "naive_bayes":
        clf = MultinomialNB(alpha=0.1)
    elif name == "svm":
        # calibrated so the SVM exposes probabilities like the others
        clf = CalibratedClassifierCV(LinearSVC(C=1.0), cv=3)
    else:
        raise ValueError(f"Unknown model: {name}")
    return Pipeline([("tfidf", vec), ("clf", clf)])


def train(texts: list[str], labels: list[str], test_size: float = 0.2, seed: int = 42) -> dict:
    """Train all three models, evaluate on a held-out split, then refit on all data and save."""
    if len(set(labels)) < 2:
        raise ValueError("Need at least two categories to train a classifier")
    x_train, x_test, y_train, y_test = train_test_split(
        texts, labels, test_size=test_size, random_state=seed, stratify=labels
    )
    classes = sorted(set(labels))
    results = {}
    config.MODELS_DIR.mkdir(parents=True, exist_ok=True)

    for name in MODEL_NAMES:
        model = _build(name).fit(x_train, y_train)
        pred = model.predict(x_test)
        results[name] = {
            "name": MODEL_NAMES[name],
            "accuracy": round(accuracy_score(y_test, pred), 4),
            "f1_macro": round(f1_score(y_test, pred, average="macro"), 4),
            "report": classification_report(y_test, pred, output_dict=True, zero_division=0),
            "confusion_matrix": confusion_matrix(y_test, pred, labels=classes).tolist(),
        }
        final = _build(name).fit(texts, labels)
        joblib.dump(final, config.MODELS_DIR / f"{name}.joblib")
        log.info("%s: acc=%.3f f1=%.3f", name, results[name]["accuracy"], results[name]["f1_macro"])

    best = max(results, key=lambda n: results[n]["f1_macro"])
    metrics = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_samples": len(texts),
        "n_train": len(x_train),
        "n_test": len(x_test),
        "classes": classes,
        "best_model": best,
        "models": results,
    }
    METRICS_FILE.write_text(json.dumps(metrics, indent=2))
    with _lock:
        _models.clear()
    return metrics


def load_metrics() -> dict | None:
    if METRICS_FILE.exists():
        return json.loads(METRICS_FILE.read_text())
    return None


def is_trained() -> bool:
    return METRICS_FILE.exists() and all(
        (config.MODELS_DIR / f"{n}.joblib").exists() for n in MODEL_NAMES
    )


def _get(name: str) -> Pipeline:
    with _lock:
        if name not in _models:
            path = config.MODELS_DIR / f"{name}.joblib"
            if not path.exists():
                raise RuntimeError("Classifier not trained yet. POST /api/models/train first.")
            _models[name] = joblib.load(path)
        return _models[name]


def classify(text: str, model: str | None = None) -> dict:
    metrics = load_metrics() or {}
    name = model or metrics.get("best_model", "logistic_regression")
    if name not in MODEL_NAMES:
        raise ValueError(f"Unknown model '{name}'. Choose from {list(MODEL_NAMES)}")
    pipe = _get(name)
    probs = pipe.predict_proba([text])[0]
    classes = pipe.classes_
    order = np.argsort(-probs)
    return {
        "model": name,
        "model_name": MODEL_NAMES[name],
        "category": str(classes[order[0]]),
        "confidence": round(float(probs[order[0]]), 4),
        "probabilities": {str(classes[i]): round(float(probs[i]), 4) for i in order},
    }


def classify_all_models(text: str) -> list[dict]:
    return [classify(text, name) for name in MODEL_NAMES]

"""Shared lazy loaders for heavy models so each is loaded once per process."""
import logging
from functools import lru_cache

import config

log = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_spacy():
    import spacy

    try:
        return spacy.load(config.SPACY_MODEL)
    except OSError as exc:
        raise RuntimeError(
            f"spaCy model '{config.SPACY_MODEL}' is not installed. "
            f"Run: python -m spacy download {config.SPACY_MODEL}"
        ) from exc


def transformers_available() -> bool:
    if not config.ENABLE_TRANSFORMERS:
        return False
    try:
        import transformers  # noqa: F401
        import torch  # noqa: F401
    except ImportError:
        log.warning("ENABLE_TRANSFORMERS=1 but transformers/torch are not installed")
        return False
    return True


@lru_cache(maxsize=4)
def get_hf_pipeline(task: str, model: str):
    from transformers import pipeline

    log.info("Loading transformer %s (%s)", model, task)
    return pipeline(task, model=model)

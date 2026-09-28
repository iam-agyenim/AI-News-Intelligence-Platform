import os
import sys
import tempfile
from pathlib import Path

# isolated DB + model dir for the test run (must be set before importing config)
_tmp = tempfile.mkdtemp(prefix="news-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["MODELS_DIR"] = f"{_tmp}/models"
os.environ["ENABLE_TRANSFORMERS"] = "0"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture(scope="session")
def client():
    from main import app

    with TestClient(app) as c:  # lifespan seeds the sample dataset and trains
        yield c

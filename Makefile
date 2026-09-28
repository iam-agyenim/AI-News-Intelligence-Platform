# AI News Intelligence Platform — common tasks (run from the repo root)
PY := Back-end/.venv/bin/python

.PHONY: setup setup-transformers api web dev build serve test bbc lint

setup:            ## create venv, install backend + frontend deps, download NLP data
	python3 -m venv Back-end/.venv
	$(PY) -m pip install -r Back-end/requirements.txt
	$(PY) Back-end/scripts/setup_nltk.py
	npm --prefix frontend install

setup-transformers: ## optional: Hugging Face models (~2GB); then run with ENABLE_TRANSFORMERS=1
	$(PY) -m pip install -r Back-end/requirements-transformers.txt

api:              ## FastAPI on :8000 (auto-reload)
	cd Back-end && .venv/bin/uvicorn main:app --reload --port 8000

web:              ## Vite dev server on :5173 (proxies /api to :8000)
	npm --prefix frontend run dev

build:            ## production build of the frontend into frontend/dist
	npm --prefix frontend run build

serve: build      ## single process: API + built frontend on :8000
	cd Back-end && .venv/bin/uvicorn main:app --port 8000

test:             ## backend tests + frontend type-check/lint
	cd Back-end && .venv/bin/python -m pytest -q
	npm --prefix frontend run build
	npm --prefix frontend run lint

bbc:              ## download the BBC News dataset and replace the sample data with it
	cd Back-end && .venv/bin/python -m scripts.download_bbc && .venv/bin/python -m scripts.ingest --bbc datasets/bbc --reset

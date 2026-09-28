def test_health_seeded(client):
    h = client.get("/api/health").json()
    assert h["articles"] >= 50 and h["classifier_trained"]


def test_articles_list_and_detail(client):
    page = client.get("/api/articles", params={"page_size": 5}).json()
    assert len(page["items"]) == 5 and page["total"] >= 50
    art = client.get(f"/api/articles/{page['items'][0]['id']}").json()
    assert art["sentiment_label"] in {"positive", "neutral", "negative"}
    assert art["entities"] is not None and art["summary"]


def test_classify_sport(client):
    r = client.post("/api/classify", json={"text": "The striker scored twice as the team won the league match."})
    assert r.status_code == 200 and r.json()["category"] == "sport"
    cmp = client.post("/api/classify", json={"text": "Shares fell as profits slumped", "compare": True}).json()
    assert len(cmp["results"]) == 3


def test_search_semantic(client):
    res = client.post("/api/search", json={"query": "football match goals", "top_k": 5}).json()
    assert res["results"] and res["results"][0]["article"]["category"] == "sport"


def test_topics_trends_models(client):
    t = client.get("/api/topics", params={"n_topics": 5}).json()
    assert len(t["topics"]) == 5 and all(tp["words"] for tp in t["topics"])
    tr = client.get("/api/trends").json()
    assert tr["categories"] and tr["daily"] and tr["people"]
    m = client.get("/api/models").json()
    assert m["trained"] and set(m["metrics"]["models"]) == {"logistic_regression", "naive_bayes", "svm"}


def test_analyze_full(client):
    r = client.post("/api/analyze", json={"text": "Tim Cook said Apple will open a new office in London next year."}).json()
    for key in ("preprocessing", "entities", "sentiment", "keywords", "summary", "pos", "classification"):
        assert key in r


def test_create_and_upload(client):
    r = client.post("/api/articles", json={"title": "Chancellor unveils budget", "content": "The chancellor unveiled the budget in parliament today, raising taxes."})
    assert r.status_code == 201 and r.json()["predicted_category"]
    csv = b"title,text,category\nA,The minister resigned after a vote in parliament.,politics\n"
    up = client.post("/api/upload", files={"file": ("x.csv", csv, "text/csv")}, params={"retrain": "false"})
    assert up.status_code == 200 and up.json()["inserted"] == 1

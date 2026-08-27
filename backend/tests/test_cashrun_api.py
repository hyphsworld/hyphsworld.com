"""Backend API tests for Cash Run game."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cash-runner-game.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Root version endpoint ---
def test_root_version(session):
    r = session.get(f"{API}/")
    assert r.status_code == 200
    data = r.json()
    assert "version" in data
    assert "message" in data


# --- POST leaderboard valid ---
def test_post_leaderboard_valid(session):
    payload = {"name": "TEST_A", "score": 12345, "level": 3, "character": "boy"}
    r = session.post(f"{API}/leaderboard", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"] == "TEST_A"
    assert data["score"] == 12345
    assert data["level"] == 3
    assert data["character"] == "boy"
    assert "id" in data and isinstance(data["id"], str)
    assert "timestamp" in data
    assert "_id" not in data


# --- GET leaderboard sorted desc, no _id ---
def _fetch_leaderboard(session):
    """Seed a couple entries and return the current leaderboard list."""
    session.post(f"{API}/leaderboard", json={"name": "TEST_B", "score": 5000, "level": 1, "character": "girl"})
    session.post(f"{API}/leaderboard", json={"name": "TEST_C", "score": 99999, "level": 5, "character": "boy"})
    r = session.get(f"{API}/leaderboard")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    return data


def test_get_leaderboard_sorted_desc(session):
    data = _fetch_leaderboard(session)
    scores = [row["score"] for row in data]
    assert scores == sorted(scores, reverse=True)


def test_get_leaderboard_excludes_mongo_id(session):
    data = _fetch_leaderboard(session)
    for row in data:
        assert "_id" not in row


def test_get_leaderboard_rows_have_public_fields(session):
    data = _fetch_leaderboard(session)
    for row in data:
        assert "id" in row
        assert "name" in row
        assert "score" in row


# --- GET leaderboard limit ---
def test_get_leaderboard_limit(session):
    r = session.get(f"{API}/leaderboard?limit=2")
    assert r.status_code == 200
    data = r.json()
    assert len(data) <= 2


# --- GET leaderboard rank ---
def test_get_rank(session):
    # Insert known scores
    session.post(f"{API}/leaderboard", json={"name": "TEST_R1", "score": 100, "level": 1})
    session.post(f"{API}/leaderboard", json={"name": "TEST_R2", "score": 200, "level": 1})

    r = session.get(f"{API}/leaderboard/rank?score=150")
    assert r.status_code == 200
    data = r.json()
    assert "rank" in data
    assert data["score"] == 150
    assert data["rank"] >= 1


# --- POST rejects empty name ---
def test_post_rejects_empty_name(session):
    r = session.post(f"{API}/leaderboard", json={"name": "", "score": 100, "level": 1})
    assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}: {r.text}"


# --- POST rejects long name ---
def test_post_rejects_long_name(session):
    r = session.post(f"{API}/leaderboard", json={"name": "A" * 13, "score": 100, "level": 1})
    assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}: {r.text}"


# --- Character defaults to 'boy' if invalid ---
def test_character_defaults_to_boy(session):
    payload = {"name": "TEST_INV", "score": 50, "level": 1, "character": "alien"}
    r = session.post(f"{API}/leaderboard", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["character"] == "boy"


# --- Negative score rejected ---
def test_post_rejects_negative_score(session):
    r = session.post(f"{API}/leaderboard", json={"name": "TEST_NEG", "score": -5, "level": 1})
    assert r.status_code in (400, 422)

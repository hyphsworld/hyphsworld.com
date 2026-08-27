"""Backend tests for Cash Run admin auth + admin leaderboard ops."""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = f"{BASE_URL}/api"

# Credentials from env — never hardcode in source.
# Falls back to values from backend/.env only when env is not injected (e.g. local dev).
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@cashrun.local")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "cashrun-admin-2026")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data
    assert data["user"]["role"] == "admin"
    return data["token"]


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---- Auth ----

def test_login_success_returns_admin(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data.get("token"), str) and len(data["token"]) > 20
    assert data["user"]["email"] == ADMIN_EMAIL
    assert data["user"]["role"] == "admin"


def test_login_wrong_password_401(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-password"})
    assert r.status_code == 401
    assert "detail" in r.json()


def test_login_unknown_email_401(session):
    r = session.post(f"{API}/auth/login", json={"email": "ghost@cashrun.local", "password": "whatever"})
    assert r.status_code == 401


def test_me_with_token(session, auth_headers):
    r = session.get(f"{API}/auth/me", headers=auth_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    assert data["role"] == "admin"


def test_me_without_token_401(session):
    # use a fresh session to avoid bleed
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_me_invalid_token_401(session):
    r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer not-a-jwt"})
    assert r.status_code == 401


# ---- Public still works (no auth) ----

def test_public_get_leaderboard_no_auth(session):
    r = requests.get(f"{API}/leaderboard")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_public_post_leaderboard_no_auth(session):
    r = requests.post(
        f"{API}/leaderboard",
        json={"name": "TEST_PUB", "score": 777, "level": 2, "character": "boy"},
    )
    assert r.status_code == 200
    assert r.json()["name"] == "TEST_PUB"


# ---- Admin ops requiring Bearer ----

def test_delete_entry_requires_auth(session):
    r = requests.delete(f"{API}/leaderboard/some-id")
    assert r.status_code == 401


def test_patch_entry_requires_auth(session):
    r = requests.patch(f"{API}/leaderboard/some-id", json={"name": "X"})
    assert r.status_code == 401


def test_clear_all_requires_auth(session):
    r = requests.delete(f"{API}/leaderboard")
    assert r.status_code == 401


def test_admin_delete_entry(session, auth_headers):
    # Create entry
    create = session.post(f"{API}/leaderboard", json={"name": "TEST_DEL", "score": 11, "level": 1})
    assert create.status_code == 200
    entry_id = create.json()["id"]

    # Delete with admin
    r = requests.delete(f"{API}/leaderboard/{entry_id}", headers=auth_headers)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["deleted"]
    assert body["id"] == entry_id

    # Verify gone - 404 on second delete
    r2 = requests.delete(f"{API}/leaderboard/{entry_id}", headers=auth_headers)
    assert r2.status_code == 404


def test_admin_patch_entry_uppercases_and_truncates(session, auth_headers):
    create = session.post(f"{API}/leaderboard", json={"name": "TEST_EDIT", "score": 22, "level": 1})
    assert create.status_code == 200
    entry_id = create.json()["id"]

    # Send mixed-case long name; backend should upper + truncate to 12
    new_name = "newname12345"  # 12 chars exactly when uppered
    r = requests.patch(f"{API}/leaderboard/{entry_id}", json={"name": new_name}, headers=auth_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["id"] == entry_id
    assert data["name"] == "NEWNAME12345"
    assert len(data["name"]) <= 12

    # GET to verify persisted
    rows = requests.get(f"{API}/leaderboard?limit=200").json()
    found = next((row for row in rows if row["id"] == entry_id), None)
    assert found is not None
    assert found["name"] == "NEWNAME12345"

    # Cleanup
    requests.delete(f"{API}/leaderboard/{entry_id}", headers=auth_headers)


def test_admin_patch_empty_name_rejected(session, auth_headers):
    create = session.post(f"{API}/leaderboard", json={"name": "TEST_E2", "score": 33, "level": 1})
    entry_id = create.json()["id"]
    r = requests.patch(f"{API}/leaderboard/{entry_id}", json={"name": "   "}, headers=auth_headers)
    assert r.status_code == 400
    requests.delete(f"{API}/leaderboard/{entry_id}", headers=auth_headers)


def test_admin_patch_unknown_id_404(session, auth_headers):
    r = requests.patch(f"{API}/leaderboard/does-not-exist", json={"name": "X"}, headers=auth_headers)
    assert r.status_code == 404


def test_admin_clear_all(session, auth_headers):
    # Seed a couple entries
    session.post(f"{API}/leaderboard", json={"name": "TEST_C1", "score": 5, "level": 1})
    session.post(f"{API}/leaderboard", json={"name": "TEST_C2", "score": 6, "level": 1})

    before = requests.get(f"{API}/leaderboard?limit=200").json()
    assert len(before) >= 2

    r = requests.delete(f"{API}/leaderboard", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert "deleted_count" in body
    assert body["deleted_count"] >= 2

    after = requests.get(f"{API}/leaderboard?limit=200").json()
    assert after == []


def test_admin_seed_idempotent_login_still_works(session):
    """If seeding ran multiple times, login should still succeed (no duplicate user)."""
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200

# HYPHSWORLD Chase the Bag Backend

FastAPI backend powering the Chase the Bag leaderboard system.

## Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8000
```

## Environment

Create a `.env` file using `.env.example`.

## Routes

- GET /api/
- POST /api/leaderboard
- GET /api/leaderboard
- GET /api/leaderboard/rank?score=1000

## Future Expansion

- Live tournament brackets
- Real-time jackpot ticker
- Neon admin HUD
- Wallet / reward integration
- Cross-game leaderboard sync

## MongoDB driver compatibility checks

Keep `motor==3.7.1` paired with `pymongo==4.18.3`. Motor 3.7.1 declares
`pymongo>=4.9,<5` and Python 3.9+. Motor 3.3.1 cannot import with PyMongo
4.9 or later. See the [upstream compatibility matrix](https://motor.readthedocs.io/en/3.7.1/requirements.html).
Motor is in its critical-fix support period through May 14, 2027; migrating
to the PyMongo Async API is separate work from this dependency repair.

From the repository root, use a fresh virtual environment and run:

```bash
python -m venv /tmp/hyphsworld-backend-check
. /tmp/hyphsworld-backend-check/bin/activate
python -m pip install -r backend/requirements.txt -r backend/requirements-test.txt \
  'emergentintegrations @ https://d33sy5i8bnduwe.cloudfront.net/simple/emergentintegrations/emergentintegrations-0.1.0-py3-none-any.whl'
python -m pip check
python -m pytest backend/tests -q
```

The existing `emergentintegrations==0.1.0` dependency is hosted outside PyPI.
The explicit wheel URL above supplies that exact dependency without changing
the index for other packages or removing it from production requirements.

Tests use no production credentials or data. They cover backend imports with
and without `MONGO_URL`, database selection via `DB_NAME`, FastAPI lifespan,
in-memory leaderboard behavior, validation, and real Motor/PyMongo insert,
find/sort/filter, and count commands against a local MongoDB wire-protocol
simulator. This does not verify production database connectivity, TLS,
authentication, or the deployed MongoDB server version. To check HTTP startup:

```bash
MONGO_URL='' uvicorn server:app --app-dir backend --host 127.0.0.1 --port 8000
# In another terminal:
curl --fail http://127.0.0.1:8000/api/health
```

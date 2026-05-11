# HYPHSWORLD Cash Run Backend

FastAPI backend powering the Cash Run leaderboard system.

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

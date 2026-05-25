from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Cash Run Game API")
api_router = APIRouter(prefix="/api")

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'cash_run')
client: Optional[AsyncIOMotorClient] = None
db = None
in_memory_leaderboard: List[dict] = []

if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    logger.info("MongoDB configured for database: %s", db_name)
else:
    logger.warning("MONGO_URL is not configured. API will boot, but leaderboard database routes will return setup errors.")


# ---------- Models ----------

class LeaderboardEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=12)
    score: int = Field(..., ge=0)
    level: int = Field(..., ge=1)
    character: str = Field(default="boy")  # "boy" or "girl"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaderboardSubmit(BaseModel):
    name: str = Field(..., min_length=1, max_length=12)
    score: int = Field(..., ge=0)
    level: int = Field(..., ge=1)
    character: str = Field(default="boy")


def require_database():
    if db is None:
        raise HTTPException(status_code=503, detail="Database is not configured. Set MONGO_URL and DB_NAME on the backend host.")
    return db


# ---------- Routes ----------

@api_router.get("/")
async def root():
    return {"message": "Cash Run Game API", "version": "1.0", "database": "configured" if db is not None else "missing"}


@api_router.get("/health")
async def health():
    return {"status": "online", "service": "cash-run-backend", "database": "configured" if db is not None else "missing"}


@api_router.post("/leaderboard", response_model=LeaderboardEntry)
async def submit_score(payload: LeaderboardSubmit):
    name = payload.name.strip().upper()[:12]
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")

    char = payload.character.lower()
    if char not in ("boy", "girl"):
        char = "boy"

    entry = LeaderboardEntry(
        name=name,
        score=payload.score,
        level=payload.level,
        character=char,
    )

    doc = entry.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()

    if db is None:
        in_memory_leaderboard.append(doc)
        in_memory_leaderboard.sort(key=lambda row: row.get('score', 0), reverse=True)
        if len(in_memory_leaderboard) > 500:
            del in_memory_leaderboard[500:]
        logger.warning("Stored leaderboard entry in memory because database is not configured")
        return entry

    await db.leaderboard.insert_one(doc)
    return entry


@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(limit: int = 50):
    if db is None:
        logger.warning("Leaderboard requested while database is not configured; serving in-memory entries")
        rows = in_memory_leaderboard[:limit]
        return [LeaderboardEntry(**row) for row in rows]

    database = db
    if limit < 1:
        limit = 50
    if limit > 200:
        limit = 200

    cursor = database.leaderboard.find({}, {"_id": 0}).sort("score", -1).limit(limit)
    rows = await cursor.to_list(length=limit)

    for row in rows:
        if isinstance(row.get('timestamp'), str):
            try:
                row['timestamp'] = datetime.fromisoformat(row['timestamp'])
            except ValueError:
                row['timestamp'] = datetime.now(timezone.utc)

    return rows


@api_router.get("/leaderboard/rank")
async def get_rank(score: int):
    """Return how many entries beat this score (rank = count + 1)."""
    if db is None:
        logger.warning("Rank requested while database is not configured; using in-memory entries")
        higher = sum(1 for row in in_memory_leaderboard if int(row.get("score", 0)) > score)
        return {"rank": higher + 1, "score": score}

    higher = await db.leaderboard.count_documents({"score": {"$gt": score}})
    return {"rank": higher + 1, "score": score}


# Mount router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client is not None:
        client.close()

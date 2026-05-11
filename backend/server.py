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

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Cash Run Game API")
api_router = APIRouter(prefix="/api")


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


# ---------- Routes ----------

@api_router.get("/")
async def root():
    return {"message": "Cash Run Game API", "version": "1.0"}


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

    await db.leaderboard.insert_one(doc)
    return entry


@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(limit: int = 50):
    if limit < 1:
        limit = 50
    if limit > 200:
        limit = 200

    cursor = db.leaderboard.find({}, {"_id": 0}).sort("score", -1).limit(limit)
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

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

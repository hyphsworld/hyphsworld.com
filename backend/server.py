from fastapi import FastAPI, APIRouter, HTTPException, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
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
    model_config = ConfigDict(extra="ignore")

    name: str = Field(..., min_length=1, max_length=12)
    score: int = Field(default=0, ge=0)
    level: int = Field(default=1, ge=1)
    character: str = Field(default="boy")


class AuthLoginPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: str = Field(default="")
    password: str = Field(default="")


@api_router.post("/auth/login")
async def auth_login(payload: AuthLoginPayload):
    email = payload.email.strip()
    password = payload.password
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password are required")

    return {"ok": True, "message": "Login endpoint is reachable. Use Supabase auth on the frontend for session issuance.", "email": email}


class AuthMeResponse(BaseModel):
    authenticated: bool
    email: Optional[str] = None


class LeaderboardAdminUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: Optional[str] = Field(default=None, min_length=1, max_length=12)
    score: Optional[int] = Field(default=None, ge=0)
    level: Optional[int] = Field(default=None, ge=1)
    character: Optional[str] = Field(default=None)


def require_admin(x_admin_token: Optional[str]):
    expected = os.environ.get("ADMIN_TOKEN", "")
    if not expected:
        raise HTTPException(status_code=503, detail="ADMIN_TOKEN is not configured on backend host.")
    if x_admin_token != expected:
        raise HTTPException(status_code=403, detail="Admin token is invalid.")


@api_router.get("/auth/me", response_model=AuthMeResponse)
async def auth_me(x_user_email: Optional[str] = Header(default=None, alias="X-User-Email")):
    email = (x_user_email or "").strip()
    return {"authenticated": bool(email), "email": email or None}


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
    database = require_database()
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

    await database.leaderboard.insert_one(doc)
    return entry


@api_router.get("/leaderboard", response_model=List[LeaderboardEntry])
async def get_leaderboard(limit: int = 50):
    database = require_database()
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
async def get_rank(score: int = 0):
    """Return how many entries beat this score (rank = count + 1)."""
    database = require_database()
    higher = await database.leaderboard.count_documents({"score": {"$gt": score}})
    return {"rank": higher + 1, "score": score}


@api_router.put("/admin/leaderboard/{entry_id}", response_model=LeaderboardEntry)
async def admin_update_leaderboard_entry(entry_id: str, payload: LeaderboardAdminUpdate, x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token")):
    require_admin(x_admin_token)
    database = require_database()

    updates = {}
    if payload.name is not None:
        name = payload.name.strip().upper()[:12]
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        updates["name"] = name
    if payload.score is not None:
        updates["score"] = payload.score
    if payload.level is not None:
        updates["level"] = payload.level
    if payload.character is not None:
        char = payload.character.lower()
        updates["character"] = char if char in ("boy", "girl") else "boy"

    if not updates:
        raise HTTPException(status_code=400, detail="No valid update fields provided")

    result = await database.leaderboard.find_one_and_update({"id": entry_id}, {"$set": updates}, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if not result:
        raise HTTPException(status_code=404, detail="Leaderboard entry not found")

    if isinstance(result.get('timestamp'), str):
        try:
            result['timestamp'] = datetime.fromisoformat(result['timestamp'])
        except ValueError:
            result['timestamp'] = datetime.now(timezone.utc)
    return result


@api_router.delete("/admin/leaderboard/{entry_id}")
async def admin_delete_leaderboard_entry(entry_id: str, x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token")):
    require_admin(x_admin_token)
    database = require_database()
    result = await database.leaderboard.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Leaderboard entry not found")
    return {"ok": True, "deleted": result.deleted_count, "id": entry_id}


@api_router.delete("/admin/leaderboard")
async def admin_clear_leaderboard(x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token")):
    require_admin(x_admin_token)
    database = require_database()
    result = await database.leaderboard.delete_many({})
    return {"ok": True, "deleted": result.deleted_count}


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

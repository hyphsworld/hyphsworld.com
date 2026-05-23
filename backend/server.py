from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

import bcrypt
import jwt as pyjwt


# ---------- Config ----------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'change-me-please')
JWT_ALG = 'HS256'
JWT_EXP_DAYS = 7

ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@cashrun.local').strip().lower()
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'cashrun-admin-2026')


app = FastAPI(title="Cash Run Game API")
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class LeaderboardEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = Field(..., min_length=1, max_length=12)
    score: int = Field(..., ge=0)
    level: int = Field(..., ge=1)
    character: str = Field(default="boy")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LeaderboardSubmit(BaseModel):
    name: str = Field(..., min_length=1, max_length=12)
    score: int = Field(..., ge=0)
    level: int = Field(..., ge=1)
    character: str = Field(default="boy")


class LeaderboardUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=12)


class LoginIn(BaseModel):
    email: str = Field(..., min_length=3, max_length=120)
    password: str = Field(..., min_length=1)


class AdminUser(BaseModel):
    email: str
    role: str
    created_at: Optional[str] = None


# ---------- Auth helpers ----------
def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_admin(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:].strip()
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ---------- Routes: public ----------
@api_router.get("/")
async def root():
    return {"message": "Cash Run Game API", "version": "1.1"}


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
    higher = await db.leaderboard.count_documents({"score": {"$gt": score}})
    return {"rank": higher + 1, "score": score}


# ---------- Routes: auth ----------
@api_router.post("/auth/login")
async def login(payload: LoginIn):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user["id"], email, user.get("role", "user"))
    return {
        "token": token,
        "user": {
            "email": email,
            "role": user.get("role", "user"),
        },
    }


@api_router.get("/auth/me")
async def me(admin: dict = Depends(get_current_admin)):
    return {
        "email": admin.get("email"),
        "role": admin.get("role"),
    }


@api_router.post("/auth/logout")
async def logout(admin: dict = Depends(get_current_admin)):
    return {"ok": True}


# ---------- Routes: admin leaderboard ops ----------
@api_router.delete("/leaderboard/{entry_id}")
async def admin_delete_entry(entry_id: str, admin: dict = Depends(get_current_admin)):
    result = await db.leaderboard.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return {"deleted": True, "id": entry_id}


@api_router.patch("/leaderboard/{entry_id}", response_model=LeaderboardEntry)
async def admin_update_entry(entry_id: str, payload: LeaderboardUpdate, admin: dict = Depends(get_current_admin)):
    update: dict = {}
    if payload.name is not None:
        new_name = payload.name.strip().upper()[:12]
        if not new_name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        update["name"] = new_name
    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")
    result = await db.leaderboard.update_one({"id": entry_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    doc = await db.leaderboard.find_one({"id": entry_id}, {"_id": 0})
    if isinstance(doc.get('timestamp'), str):
        try:
            doc['timestamp'] = datetime.fromisoformat(doc['timestamp'])
        except ValueError:
            doc['timestamp'] = datetime.now(timezone.utc)
    return doc


@api_router.delete("/leaderboard")
async def admin_clear_leaderboard(admin: dict = Depends(get_current_admin)):
    result = await db.leaderboard.delete_many({})
    return {"deleted_count": result.deleted_count}


# ---------- Startup ----------
async def seed_admin_and_indexes():
    await db.users.create_index("email", unique=True)
    await db.leaderboard.create_index([("score", -1)])

    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logging.getLogger(__name__).info(f"Seeded admin user: {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}}
        )
        logging.getLogger(__name__).info(f"Updated admin password for: {ADMIN_EMAIL}")


@app.on_event("startup")
async def on_startup():
    await seed_admin_and_indexes()


# ---------- App wiring ----------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=False,
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

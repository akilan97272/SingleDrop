from __future__ import annotations

import os
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
import dotenv

dotenv.load_dotenv()

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        mongo_url = os.getenv("MONGO_URL")
        print("MONGO_URL exists:", bool(mongo_url))
        print("MONGO_DB:", os.getenv("MONGO_DB"))
        _client = AsyncIOMotorClient(mongo_url)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    global _db
    if _db is None:
        _db = get_client()[os.getenv("MONGO_DB", "single_drop")]
    return _db

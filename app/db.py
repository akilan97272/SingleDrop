"""
JSON-file storage layer — drop-in replacement for Motor/MongoDB.

Each collection is stored as  data/<name>.json  (a JSON array of dicts).
Concurrency is managed by:
  • asyncio.Lock per collection   — protects concurrent coroutines / requests
  • Atomic rename on write        — prevents corrupt files on crash
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import uuid
from pathlib import Path
from typing import Any

# ── data directory ────────────────────────────────────────────────────────────

DATA_DIR = Path(os.getenv("DATA_DIR", "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── per-collection asyncio locks (created lazily) ────────────────────────────

_locks: dict[str, asyncio.Lock] = {}


def _lock(name: str) -> asyncio.Lock:
    if name not in _locks:
        _locks[name] = asyncio.Lock()
    return _locks[name]


# ── low-level file I/O ───────────────────────────────────────────────────────

def _path(name: str) -> Path:
    return DATA_DIR / f"{name}.json"


def _read_raw(name: str) -> list[dict]:
    p = _path(name)
    if not p.exists():
        return []
    try:
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _write_raw(name: str, data: list[dict]) -> None:
    p = _path(name)
    tmp = p.with_suffix(".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str, ensure_ascii=False)
    tmp.replace(p)          # atomic on POSIX; near-atomic on Windows


# ── filter / update helpers ───────────────────────────────────────────────────

def _matches(doc: dict, flt: dict) -> bool:
    """Return True if doc matches the MongoDB-style filter dict."""
    for key, condition in flt.items():
        val = doc.get(key)
        if isinstance(condition, dict):
            for op, operand in condition.items():
                if op == "$ne":
                    if val == operand:
                        return False
                elif op == "$in":
                    if val not in (operand or []):
                        return False
                elif op == "$nin":
                    if val in (operand or []):
                        return False
                elif op == "$lt":
                    try:
                        if val is None or not (str(val) < str(operand)):
                            return False
                    except TypeError:
                        return False
                elif op == "$lte":
                    try:
                        if val is None or not (str(val) <= str(operand)):
                            return False
                    except TypeError:
                        return False
                elif op == "$gt":
                    try:
                        if val is None or not (str(val) > str(operand)):
                            return False
                    except TypeError:
                        return False
                elif op == "$gte":
                    try:
                        if val is None or not (str(val) >= str(operand)):
                            return False
                    except TypeError:
                        return False
                elif op == "$exists":
                    present = key in doc and doc[key] is not None
                    if operand and not present:
                        return False
                    if not operand and present:
                        return False
                elif op == "$regex":
                    flags = re.IGNORECASE if "i" in condition.get("$options", "") else 0
                    if val is None or not re.search(operand, str(val), flags):
                        return False
                # skip unknown operators rather than crash
        else:
            if val != condition:
                return False
    return True


def _apply_update(doc: dict, update: dict) -> None:
    """Apply MongoDB-style update operators to doc in place."""
    if "$set" in update:
        for k, v in update["$set"].items():
            doc[k] = v
    if "$unset" in update:
        for k in update["$unset"]:
            doc.pop(k, None)
    if "$push" in update:
        for k, v in update["$push"].items():
            doc.setdefault(k, [])
            doc[k].append(v)
    if "$pull" in update:
        for k, v in update["$pull"].items():
            if isinstance(doc.get(k), list):
                doc[k] = [item for item in doc[k] if item != v]
    if "$inc" in update:
        for k, v in update["$inc"].items():
            doc[k] = (doc.get(k) or 0) + v


# ── cursor ────────────────────────────────────────────────────────────────────

class JSONCursor:
    """
    Mimics Motor's cursor: find() returns one synchronously; only
    to_list() is awaited.
    """

    def __init__(self, collection: "JSONCollection", flt: dict):
        self._col = collection
        self._flt = flt
        self._sorts: list[tuple[str, int]] = []
        self._skip_n = 0

    def sort(self, key: Any, direction: int = 1) -> "JSONCursor":
        if isinstance(key, list):          # Motor-style: sort([("field", dir), …])
            self._sorts = [(k, d) for k, d in key]
        else:                              # sort("field", direction)
            self._sorts = [(key, direction)]
        return self

    def skip(self, n: int) -> "JSONCursor":
        self._skip_n = n
        return self

    async def to_list(self, length: int | None = None) -> list[dict]:
        async with _lock(self._col.name):
            docs = _read_raw(self._col.name)

        results = [d for d in docs if _matches(d, self._flt)]

        for sort_key, direction in reversed(self._sorts):
            results.sort(
                key=lambda d: (d.get(sort_key) or ""),
                reverse=(direction == -1),
            )

        if self._skip_n:
            results = results[self._skip_n:]
        if length is not None:
            results = results[:length]

        return results


# ── collection ────────────────────────────────────────────────────────────────

class JSONCollection:
    """Drop-in async replacement for AsyncIOMotorCollection."""

    def __init__(self, name: str):
        self.name = name

    # ── read ──────────────────────────────────────────────────────────────────

    def find(self, flt: dict | None = None) -> JSONCursor:
        """Returns a cursor synchronously (Motor compatibility)."""
        return JSONCursor(self, flt or {})

    async def find_one(self, flt: dict) -> dict | None:
        async with _lock(self.name):
            docs = _read_raw(self.name)
        for doc in docs:
            if _matches(doc, flt):
                return doc
        return None

    async def count_documents(self, flt: dict) -> int:
        async with _lock(self.name):
            docs = _read_raw(self.name)
        return sum(1 for d in docs if _matches(d, flt))

    # ── write ─────────────────────────────────────────────────────────────────

    async def insert_one(self, doc: dict) -> None:
        async with _lock(self.name):
            docs = _read_raw(self.name)
            docs.append(doc)
            _write_raw(self.name, docs)

    async def update_one(self, flt: dict, update: dict) -> None:
        async with _lock(self.name):
            docs = _read_raw(self.name)
            for doc in docs:
                if _matches(doc, flt):
                    _apply_update(doc, update)
                    break
            _write_raw(self.name, docs)

    async def update_many(self, flt: dict, update: dict) -> None:
        async with _lock(self.name):
            docs = _read_raw(self.name)
            for doc in docs:
                if _matches(doc, flt):
                    _apply_update(doc, update)
            _write_raw(self.name, docs)

    async def delete_one(self, flt: dict) -> None:
        async with _lock(self.name):
            docs = _read_raw(self.name)
            for i, doc in enumerate(docs):
                if _matches(doc, flt):
                    docs.pop(i)
                    break
            _write_raw(self.name, docs)

    async def delete_many(self, flt: dict) -> None:
        async with _lock(self.name):
            docs = _read_raw(self.name)
            docs = [d for d in docs if not _matches(d, flt)]
            _write_raw(self.name, docs)


# ── public helpers ────────────────────────────────────────────────────────────

def new_id() -> str:
    """Generate a new unique document ID (replaces ObjectId())."""
    return uuid.uuid4().hex


def get_collection(name: str) -> JSONCollection:
    return JSONCollection(name)
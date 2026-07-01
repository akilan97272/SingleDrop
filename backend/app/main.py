from __future__ import annotations

import os
from datetime import date, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from bson import ObjectId

from .db import get_db
from .schemas import (
    TaskCreate, TaskOut, DashboardOut, TrackerOut, DailyPoint,
    NotificationItem, StatsOut,
)
from .services import (
    today_local, task_label, compute_streak, classify_kind, parse_date,
    random_quote, random_mindset, days_away,
)

app = FastAPI(title="Single Drop API", version="1.0.0")

origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if origins == ["*"] else origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def coll():
    return get_db()["tasks"]


def to_task_out(doc: dict) -> TaskOut:
    current = today_local()
    planned = parse_date(doc["planned_date"])
    return TaskOut(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc.get("description", ""),
        planned_date=planned,
        created_at=parse_date(doc["created_at"]),
        completed_date=parse_date(doc["completed_date"]) if doc.get("completed_date") else None,
        missed_date=parse_date(doc["missed_date"]) if doc.get("missed_date") else None,
        disbanded_date=parse_date(doc["disbanded_date"]) if doc.get("disbanded_date") else None,
        missed_reason=doc.get("missed_reason"),
        status=doc["status"],
        kind=classify_kind(planned, current),
        label=task_label(doc),
    )


async def auto_miss_overdue() -> None:
    """Tasks never drag forward. Anything still 'planned' once its day has
    passed gets moved to the missed/deprecated bucket automatically."""
    current = today_local()
    await coll().update_many(
        {"status": "planned", "planned_date": {"$lt": current.isoformat()}},
        {
            "$set": {
                "status": "missed",
                "missed_date": current.isoformat(),
                "missed_reason": "Missed task. Reason for you being average.",
            }
        },
    )


async def load_all_tasks() -> list[dict]:
    await auto_miss_overdue()
    docs = await coll().find().sort([("planned_date", 1), ("created_at", 1)]).to_list(length=10000)
    return docs


@app.get("/api/health")
async def health():
    return {"ok": True, "service": "single-drop"}


@app.get("/api/dashboard", response_model=DashboardOut)
async def dashboard():
    docs = await load_all_tasks()
    current = today_local()
    tomorrow = current + timedelta(days=1)

    tasks = [to_task_out(d) for d in docs]
    today_tasks = [t for t in tasks if t.planned_date == current and t.status == "planned"]
    tomorrow_tasks = [t for t in tasks if t.planned_date == tomorrow and t.status == "planned"]
    future_plans = [t for t in tasks if t.planned_date > tomorrow and t.status == "planned"]
    completed_today = [t for t in tasks if t.planned_date == current and t.status in ("completed", "completed_late")]
    missed_tasks = [t for t in tasks if t.status == "missed"]

    completed_days = [t.completed_date for t in tasks if t.status == "completed" and t.completed_date]
    streak, shield_used = compute_streak(completed_days)

    notifications: list[NotificationItem] = []
    if tomorrow_tasks:
        notifications.append(NotificationItem(
            type="tomorrow",
            message=f"{len(tomorrow_tasks)} task(s) lined up for tomorrow's agenda.",
        ))
    for plan in future_plans:
        d = days_away(plan.planned_date, current)
        notifications.append(NotificationItem(
            type="future_plan",
            message=f"Future plan reminder: '{plan.title}' is set for {plan.planned_date.isoformat()} ({d} day{'s' if d != 1 else ''} away).",
        ))
    if missed_tasks:
        notifications.append(NotificationItem(
            type="missed",
            message=f"{len(missed_tasks)} task(s) sitting in the deprecated page. Complete or disband them.",
        ))
    if not notifications:
        notifications.append(NotificationItem(type="info", message="Nothing pending. Clean slate energy."))

    return DashboardOut(
        today=today_tasks,
        tomorrow=tomorrow_tasks,
        future_plans=future_plans,
        completed_today=completed_today,
        missed_count=len(missed_tasks),
        quote=random_quote(),
        streak=streak,
        shield_used=shield_used,
        notifications=notifications,
        mindset_note=random_mindset(),
        day_name=DAY_NAMES[current.weekday()],
        today_date=current,
    )


@app.get("/api/quote")
async def quote():
    return {"quote": random_quote()}


@app.get("/api/tasks")
async def list_tasks(status: str | None = None):
    docs = await load_all_tasks()
    if status:
        docs = [d for d in docs if d["status"] == status]
    return [jsonable_encoder(to_task_out(d)) for d in docs]


@app.get("/api/future-plans")
async def future_plans():
    docs = await load_all_tasks()
    current = today_local()
    tomorrow = current + timedelta(days=1)
    docs = [d for d in docs if d["status"] == "planned" and parse_date(d["planned_date"]) > tomorrow]
    return [jsonable_encoder(to_task_out(d)) for d in docs]


@app.get("/api/missed")
async def missed_tasks():
    docs = await load_all_tasks()
    docs = [d for d in docs if d["status"] == "missed"]
    return [jsonable_encoder(to_task_out(d)) for d in docs]


@app.get("/api/notifications")
async def notifications():
    data = await dashboard()
    return {"notifications": [jsonable_encoder(n) for n in data.notifications], "mindset_note": data.mindset_note}


@app.post("/api/tasks", response_model=TaskOut)
async def create_task(payload: TaskCreate):
    current = today_local()
    doc = {
        "_id": ObjectId(),
        "title": payload.title.strip(),
        "description": payload.description.strip(),
        "planned_date": payload.planned_date.isoformat(),
        "created_at": current.isoformat(),
        "status": "planned",
        "completed_date": None,
        "missed_date": None,
        "disbanded_date": None,
        "missed_reason": None,
    }
    await coll().insert_one(doc)
    return to_task_out(doc)


async def _get_task(task_id: str) -> dict:
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task id")
    doc = await coll().find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Task not found")
    return doc


@app.patch("/api/tasks/{task_id}/complete", response_model=TaskOut)
async def complete_task(task_id: str):
    doc = await _get_task(task_id)
    if doc["status"] != "planned":
        raise HTTPException(status_code=400, detail="Only planned tasks can be completed directly")
    current = today_local()
    await coll().update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": "completed", "completed_date": current.isoformat()}},
    )
    doc = await coll().find_one({"_id": doc["_id"]})
    return to_task_out(doc)


@app.patch("/api/tasks/{task_id}/complete-late", response_model=TaskOut)
async def complete_late_task(task_id: str):
    doc = await _get_task(task_id)
    if doc["status"] != "missed":
        raise HTTPException(status_code=400, detail="Only missed tasks can be completed late")
    current = today_local()
    await coll().update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": "completed_late", "completed_date": current.isoformat()}},
    )
    doc = await coll().find_one({"_id": doc["_id"]})
    return to_task_out(doc)


@app.patch("/api/tasks/{task_id}/disband", response_model=TaskOut)
async def disband_task(task_id: str):
    doc = await _get_task(task_id)
    if doc["status"] != "missed":
        raise HTTPException(status_code=400, detail="Only missed tasks can be disbanded")
    current = today_local()
    await coll().update_one(
        {"_id": doc["_id"]},
        {"$set": {"status": "disbanded", "disbanded_date": current.isoformat()}},
    )
    doc = await coll().find_one({"_id": doc["_id"]})
    return to_task_out(doc)


@app.get("/api/tracker", response_model=TrackerOut)
async def tracker(days: int = 90):
    docs = await load_all_tasks()
    current = today_local()
    start = current - timedelta(days=days - 1)

    completed_on_time = [parse_date(d["completed_date"]) for d in docs if d["status"] == "completed" and d.get("completed_date")]
    streak, shield_used = compute_streak(completed_on_time)

    completed_counts = {start + timedelta(days=i): 0 for i in range(days)}
    missed_counts = {start + timedelta(days=i): 0 for i in range(days)}

    total_started = len(docs)
    total_completed = 0
    completed_late_count = 0
    deprecated_count = 0
    missed_pending_count = 0

    for d in docs:
        status = d["status"]
        if status in ("completed", "completed_late"):
            total_completed += 1
            if status == "completed_late":
                completed_late_count += 1
            cd = parse_date(d["completed_date"])
            if cd in completed_counts:
                completed_counts[cd] += 1
        elif status == "missed":
            missed_pending_count += 1
            pd = parse_date(d["planned_date"])
            if pd in missed_counts:
                missed_counts[pd] += 1
        elif status == "disbanded":
            deprecated_count += 1
            pd = parse_date(d["planned_date"])
            if pd in missed_counts:
                missed_counts[pd] += 1

    grid = []
    for day, count in completed_counts.items():
        level = 0
        if count >= 8:
            level = 4
        elif count >= 5:
            level = 3
        elif count >= 3:
            level = 2
        elif count >= 1:
            level = 1
        grid.append({"day": day.isoformat(), "count": count, "level": level})

    completed_series = [DailyPoint(day=day, count=count) for day, count in completed_counts.items()]
    missed_series = [DailyPoint(day=day, count=count) for day, count in missed_counts.items()]

    stats = StatsOut(
        streak=streak,
        shield_used=shield_used,
        total_completed=total_completed,
        total_started=total_started,
        completed_late_count=completed_late_count,
        deprecated_count=deprecated_count,
        missed_pending_count=missed_pending_count,
    )

    return TrackerOut(grid=grid, completed_series=completed_series, missed_series=missed_series, stats=stats)

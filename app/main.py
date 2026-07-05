from __future__ import annotations
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from datetime import date, datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from bson import ObjectId

from .db import get_db
from .schemas import (
    TaskCreate, TaskOut, DashboardOut, TrackerOut, DailyPoint,
    NotificationItem, StatsOut,
    TimelineCreate, TimelineTaskCreate, TimelineOut, TimelineTaskOut,
    PomodoroSessionCreate, PomodoroSessionComplete, PomodoroSessionOut, PomodoroStatsOut,
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

app.mount("/assets", StaticFiles(directory="app/static/assets"), name="assets")


DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ═══════════════════════════════════════════════════
#  TASKS helpers
# ═══════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════
#  TIMELINE helpers
# ═══════════════════════════════════════════════════

def tl_coll():
    return get_db()["timelines"]


def _tl_task_status(start: date, end: date, current: date) -> str:
    if current < start:
        return "upcoming"
    elif current > end:
        return "completed"
    return "active"


def _tl_task_progress(start: date, end: date, current: date) -> float:
    total = max((end - start).days + 1, 1)
    elapsed = min(max((current - start).days + 1, 0), total)
    return round(elapsed / total, 4)


def to_timeline_out(doc: dict) -> TimelineOut:
    current = today_local()
    raw_tasks = doc.get("tasks", [])
    tasks_out: list[TimelineTaskOut] = []
    is_active_today = False
    dates: list[date] = []

    for t in raw_tasks:
        s = parse_date(t["start_date"])
        e = parse_date(t["end_date"])
        status = _tl_task_status(s, e, current)
        days_total = max((e - s).days + 1, 1)
        days_elapsed = min(max((current - s).days + 1, 0), days_total)
        is_today = s <= current <= e
        if is_today:
            is_active_today = True
        dates += [s, e]
        tasks_out.append(TimelineTaskOut(
            id=str(t["_id"]),
            title=t["title"],
            description=t.get("description", ""),
            start_date=s,
            end_date=e,
            status=status,
            progress=_tl_task_progress(s, e, current),
            days_total=days_total,
            days_elapsed=days_elapsed,
            is_today=is_today,
        ))

    return TimelineOut(
        id=str(doc["_id"]),
        name=doc["name"],
        color=doc.get("color", "blue"),
        created_at=parse_date(doc["created_at"]),
        tasks=tasks_out,
        is_active_today=is_active_today,
        overall_start=min(dates) if dates else None,
        overall_end=max(dates) if dates else None,
    )


async def load_all_timelines() -> list[dict]:
    return await tl_coll().find().sort("created_at", 1).to_list(length=500)


# ═══════════════════════════════════════════════════
#  HEALTH
# ═══════════════════════════════════════════════════

@app.get("/api/health")
async def health():
    return {"ok": True, "service": "single-drop"}


# ═══════════════════════════════════════════════════
#  DASHBOARD
# ═══════════════════════════════════════════════════

@app.get("/api/dashboard", response_model=DashboardOut)
async def dashboard():
    docs = await load_all_tasks()
    current = today_local()
    tomorrow = current + timedelta(days=1)

    tasks = [to_task_out(d) for d in docs]
    today_tasks     = [t for t in tasks if t.planned_date == current and t.status == "planned"]
    tomorrow_tasks  = [t for t in tasks if t.planned_date == tomorrow and t.status == "planned"]
    future_plans    = [t for t in tasks if t.planned_date > tomorrow and t.status == "planned"]
    completed_today = [t for t in tasks if t.planned_date == current and t.status in ("completed", "completed_late")]
    missed_tasks    = [t for t in tasks if t.status == "missed"]

    completed_days = [t.completed_date for t in tasks if t.status == "completed" and t.completed_date]
    streak, shield_used = compute_streak(completed_days)

    tl_docs = await load_all_timelines()
    timelines = [to_timeline_out(d) for d in tl_docs]

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
            message=f"Future plan: '{plan.title}' is {d} day{'s' if d != 1 else ''} away ({plan.planned_date.isoformat()}).",
        ))
    for tl in timelines:
        active = [t for t in tl.tasks if t.is_today]
        if active:
            notifications.append(NotificationItem(
                type="timeline",
                message=f"Timeline '{tl.name}': {active[0].title} is active today.",
            ))
    if missed_tasks:
        notifications.append(NotificationItem(
            type="missed",
            message=f"{len(missed_tasks)} task(s) sitting in deprecated. Complete or disband them.",
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
        timelines=timelines,
    )


@app.get("/api/quote")
async def quote():
    return {"quote": random_quote()}


@app.get("/api/notifications")
async def notifications():
    data = await dashboard()
    return {"notifications": [jsonable_encoder(n) for n in data.notifications], "mindset_note": data.mindset_note}


# ═══════════════════════════════════════════════════
#  TASKS CRUD
# ═══════════════════════════════════════════════════

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
    return [jsonable_encoder(to_task_out(d)) for d in docs if d["status"] == "missed"]


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
    await coll().update_one({"_id": doc["_id"]}, {"$set": {"status": "completed", "completed_date": current.isoformat()}})
    return to_task_out(await coll().find_one({"_id": doc["_id"]}))


@app.patch("/api/tasks/{task_id}/complete-late", response_model=TaskOut)
async def complete_late_task(task_id: str):
    doc = await _get_task(task_id)
    if doc["status"] != "missed":
        raise HTTPException(status_code=400, detail="Only missed tasks can be completed late")
    current = today_local()
    await coll().update_one({"_id": doc["_id"]}, {"$set": {"status": "completed_late", "completed_date": current.isoformat()}})
    return to_task_out(await coll().find_one({"_id": doc["_id"]}))


@app.patch("/api/tasks/{task_id}/disband", response_model=TaskOut)
async def disband_task(task_id: str):
    doc = await _get_task(task_id)
    if doc["status"] != "missed":
        raise HTTPException(status_code=400, detail="Only missed tasks can be disbanded")
    current = today_local()
    await coll().update_one({"_id": doc["_id"]}, {"$set": {"status": "disbanded", "disbanded_date": current.isoformat()}})
    return to_task_out(await coll().find_one({"_id": doc["_id"]}))


# ═══════════════════════════════════════════════════
#  TIMELINES CRUD
# ═══════════════════════════════════════════════════

@app.get("/api/timelines")
async def list_timelines():
    docs = await load_all_timelines()
    return [jsonable_encoder(to_timeline_out(d)) for d in docs]


@app.post("/api/timelines", response_model=TimelineOut)
async def create_timeline(payload: TimelineCreate):
    current = today_local()
    doc = {
        "_id": ObjectId(),
        "name": payload.name.strip(),
        "color": payload.color,
        "created_at": current.isoformat(),
        "tasks": [],
    }
    await tl_coll().insert_one(doc)
    return to_timeline_out(doc)


async def _get_timeline(tl_id: str) -> dict:
    try:
        oid = ObjectId(tl_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid timeline id")
    doc = await tl_coll().find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Timeline not found")
    return doc


@app.delete("/api/timelines/{tl_id}", status_code=204)
async def delete_timeline(tl_id: str):
    doc = await _get_timeline(tl_id)
    await tl_coll().delete_one({"_id": doc["_id"]})


@app.post("/api/timelines/{tl_id}/tasks", response_model=TimelineOut)
async def add_timeline_task(tl_id: str, payload: TimelineTaskCreate):
    doc = await _get_timeline(tl_id)
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=400, detail="end_date must be >= start_date")
    task = {
        "_id": ObjectId(),
        "title": payload.title.strip(),
        "description": payload.description.strip(),
        "start_date": payload.start_date.isoformat(),
        "end_date": payload.end_date.isoformat(),
    }
    await tl_coll().update_one({"_id": doc["_id"]}, {"$push": {"tasks": task}})
    updated = await tl_coll().find_one({"_id": doc["_id"]})
    return to_timeline_out(updated)


@app.delete("/api/timelines/{tl_id}/tasks/{task_id}", response_model=TimelineOut)
async def delete_timeline_task(tl_id: str, task_id: str):
    doc = await _get_timeline(tl_id)
    try:
        task_oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid task id")
    await tl_coll().update_one({"_id": doc["_id"]}, {"$pull": {"tasks": {"_id": task_oid}}})
    updated = await tl_coll().find_one({"_id": doc["_id"]})
    return to_timeline_out(updated)


# ═══════════════════════════════════════════════════
#  TRACKER
# ═══════════════════════════════════════════════════

@app.get("/api/tracker", response_model=TrackerOut)
async def tracker(days: int = 90):
    docs = await load_all_tasks()
    current = today_local()
    start = current - timedelta(days=days - 1)

    completed_on_time = [parse_date(d["completed_date"]) for d in docs if d["status"] == "completed" and d.get("completed_date")]
    streak, shield_used = compute_streak(completed_on_time)

    completed_counts = {start + timedelta(days=i): 0 for i in range(days)}
    missed_counts    = {start + timedelta(days=i): 0 for i in range(days)}

    total_started = len(docs)
    total_completed = completed_late_count = deprecated_count = missed_pending_count = 0

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
        level = 0 if count == 0 else 1 if count < 3 else 2 if count < 5 else 3 if count < 8 else 4
        grid.append({"day": day.isoformat(), "count": count, "level": level})

    return TrackerOut(
        grid=grid,
        completed_series=[DailyPoint(day=d, count=c) for d, c in completed_counts.items()],
        missed_series=[DailyPoint(day=d, count=c) for d, c in missed_counts.items()],
        stats=StatsOut(
            streak=streak, shield_used=shield_used,
            total_completed=total_completed, total_started=total_started,
            completed_late_count=completed_late_count,
            deprecated_count=deprecated_count,
            missed_pending_count=missed_pending_count,
        ),
    )

@app.get("/{full_path:path}")
# ═══════════════════════════════════════════════════
#  POMODORO
# ═══════════════════════════════════════════════════

def pomo_coll():
    return get_db()["pomodoro_sessions"]


def to_pomo_out(doc: dict) -> PomodoroSessionOut:
    refl = doc.get("reflection")
    from .schemas import ReflectionData
    return PomodoroSessionOut(
        id=str(doc["_id"]),
        start_time=doc["start_time"],
        end_time=doc.get("end_time"),
        work_minutes=doc["work_minutes"],
        break_minutes=doc["break_minutes"],
        planned_cycles=doc["planned_cycles"],
        completed_cycles=doc.get("completed_cycles", 0),
        total_focus_minutes=doc.get("total_focus_minutes", 0),
        total_break_minutes=doc.get("total_break_minutes", 0),
        interrupted=doc.get("interrupted", False),
        linked_task_id=doc.get("linked_task_id"),
        linked_task_title=doc.get("linked_task_title"),
        reflection=ReflectionData(**refl) if refl else None,
    )


@app.post("/api/pomodoro/sessions", response_model=PomodoroSessionOut)
async def create_pomodoro_session(payload: PomodoroSessionCreate):
    linked_title = None
    if payload.linked_task_id:
        try:
            t = await coll().find_one({"_id": ObjectId(payload.linked_task_id)})
            if t:
                linked_title = t["title"]
        except Exception:
            pass
    doc = {
        "_id": ObjectId(),
        "start_time": datetime.utcnow().isoformat(),
        "end_time": None,
        "work_minutes": payload.work_minutes,
        "break_minutes": payload.break_minutes,
        "planned_cycles": payload.planned_cycles,
        "completed_cycles": 0,
        "total_focus_minutes": 0.0,
        "total_break_minutes": 0.0,
        "interrupted": False,
        "linked_task_id": payload.linked_task_id,
        "linked_task_title": linked_title,
        "reflection": None,
    }
    await pomo_coll().insert_one(doc)
    return to_pomo_out(doc)


@app.patch("/api/pomodoro/sessions/{session_id}/complete", response_model=PomodoroSessionOut)
async def complete_pomodoro_session(session_id: str, payload: PomodoroSessionComplete):
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid session id")
    doc = await pomo_coll().find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    refl = payload.reflection.model_dump() if payload.reflection else None
    await pomo_coll().update_one({"_id": oid}, {"$set": {
        "end_time": payload.end_time,
        "total_focus_minutes": payload.total_focus_minutes,
        "total_break_minutes": payload.total_break_minutes,
        "completed_cycles": payload.completed_cycles,
        "interrupted": payload.interrupted,
        "reflection": refl,
    }})
    return to_pomo_out(await pomo_coll().find_one({"_id": oid}))


@app.get("/api/pomodoro/sessions", response_model=list[PomodoroSessionOut])
async def list_pomodoro_sessions(limit: int = 30):
    docs = await pomo_coll().find(
        {"end_time": {"$ne": None}}
    ).sort("start_time", -1).to_list(length=limit)
    return [to_pomo_out(d) for d in docs]


@app.get("/api/pomodoro/stats", response_model=PomodoroStatsOut)
async def pomodoro_stats():
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day).isoformat()
    week_start = (datetime(now.year, now.month, now.day) - timedelta(days=now.weekday())).isoformat()

    docs = await pomo_coll().find(
        {"end_time": {"$ne": None}, "interrupted": False}
    ).to_list(length=10000)

    total_today = sum(d["total_focus_minutes"] for d in docs if d.get("start_time", "") >= today_start)
    total_week = sum(d["total_focus_minutes"] for d in docs if d.get("start_time", "") >= week_start)
    sessions_completed = len(docs)
    longest = max((d["total_focus_minutes"] for d in docs), default=0)
    average = (sum(d["total_focus_minutes"] for d in docs) / sessions_completed) if sessions_completed else 0

    hour_counts: dict[int, float] = {}
    for d in docs:
        try:
            h = datetime.fromisoformat(d["start_time"]).hour
            hour_counts[h] = hour_counts.get(h, 0) + d["total_focus_minutes"]
        except Exception:
            pass
    most_productive = max(hour_counts, key=hour_counts.get) if hour_counts else None

    return PomodoroStatsOut(
        total_focus_today=round(total_today, 1),
        total_focus_week=round(total_week, 1),
        longest_session=round(longest, 1),
        average_session=round(average, 1),
        sessions_completed=sessions_completed,
        most_productive_hour=most_productive,
    )


async def spa_fallback(full_path: str):
    if full_path.startswith("api"):
            raise HTTPException(status_code=404)
    
    return FileResponse("app/static/index.html")
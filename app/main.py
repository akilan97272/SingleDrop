from __future__ import annotations
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from datetime import date, datetime, timedelta
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder
from bson import ObjectId

from app.db import get_db
from app.schemas import (
    TaskCreate, TaskOut, DashboardOut, TrackerOut, DailyPoint,
    NotificationItem, StatsOut,
    PomodoroSessionCreate, PomodoroSessionComplete, PomodoroSessionOut, PomodoroStatsOut,
    RecurringTemplateCreate, RecurringTemplateUpdate, RecurringTemplateOut,
    OccurrenceNotesUpdate, RecurringOccurrenceOut,
    TagCreate, TagOut,
    PromiseCreate, PromiseUpdate, PromiseOut, PromiseAnalyticsOut,
)
from app.services import (
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
        tags=[str(t) for t in (doc.get("tags") or [])],
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

    notifications = []
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
    if missed_tasks:
        notifications.append(NotificationItem(
            type="missed",
            message=f"{len(missed_tasks)} task(s) sitting in deprecated. Complete or disband them.",
        ))
    if not notifications:
        notifications.append(NotificationItem(type="info", message="Nothing pending. Clean slate energy."))

    DAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]

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


@app.get("/api/notifications")
async def notifications():
    data = await dashboard()
    return {
        "notifications": [n.model_dump() for n in data.notifications],
        "mindset_note": data.mindset_note,
    }


# ═══════════════════════════════════════════════════
#  TASKS CRUD
# ═══════════════════════════════════════════════════

@app.get("/api/tasks")
async def list_tasks(status: str | None = None):
    docs = await load_all_tasks()
    if status:
        docs = [d for d in docs if d["status"] == status]
    return [to_task_out(d).model_dump() for d in docs]


@app.get("/api/future-plans")
async def future_plans():
    docs = await load_all_tasks()
    current = today_local()
    tomorrow = current + timedelta(days=1)
    docs = [d for d in docs if d["status"] == "planned" and parse_date(d["planned_date"]) > tomorrow]
    return [to_task_out(d).model_dump() for d in docs]


@app.get("/api/missed")
async def missed_tasks():
    docs = await load_all_tasks()
    return [to_task_out(d).model_dump() for d in docs if d["status"] == "missed"]


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
        "tags": [str(t) for t in (payload.tags or [])],
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
#  TIMELINE helpers
# ═══════════════════════════════════════════════════

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
    week_start  = (datetime(now.year, now.month, now.day) - timedelta(days=now.weekday())).isoformat()

    docs = await pomo_coll().find(
        {"end_time": {"$ne": None}, "interrupted": False}
    ).to_list(length=10000)

    if not docs:
        return PomodoroStatsOut(
            total_focus_today=0.0,
            total_focus_week=0.0,
            longest_session=0.0,
            average_session=0.0,
            sessions_completed=0,
            most_productive_hour=None,
        )

    focus_today  = 0.0
    focus_week   = 0.0
    longest      = 0.0
    total_focus  = 0.0
    hour_counts: dict[int, float] = {}

    for d in docs:
        fm = float(d.get("total_focus_minutes") or 0)
        st = d.get("start_time") or ""
        total_focus += fm
        if fm > longest:
            longest = fm
        if st >= today_start:
            focus_today += fm
        if st >= week_start:
            focus_week += fm
        try:
            h = int(datetime.fromisoformat(st).hour)
            hour_counts[h] = hour_counts.get(h, 0.0) + fm
        except Exception:
            pass

    sessions_completed = int(len(docs))
    average = total_focus / sessions_completed if sessions_completed else 0.0

    # Explicit loop avoids passing bound method to max() (Python 3.14 serialiser issue)
    most_productive: int | None = None
    if hour_counts:
        best_val = -1.0
        for h, v in hour_counts.items():
            if v > best_val:
                best_val = v
                most_productive = int(h)

    return PomodoroStatsOut(
        total_focus_today=round(float(focus_today), 1),
        total_focus_week=round(float(focus_week), 1),
        longest_session=round(float(longest), 1),
        average_session=round(float(average), 1),
        sessions_completed=sessions_completed,
        most_productive_hour=most_productive,
    )


# ═══════════════════════════════════════════════════
#  RECURRING TASKS
# ═══════════════════════════════════════════════════

def rec_tpl_coll():
    return get_db()["recurring_templates"]

def rec_occ_coll():
    return get_db()["recurring_occurrences"]

# ── recurrence helpers ───────────────────────────

_DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
_DAY_FULL  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

def _rule_label(tpl: dict) -> str:
    rule     = tpl.get('rule', 'daily')
    interval = int(tpl.get('interval', 1))
    weekdays = tpl.get('weekdays', [])
    start    = parse_date(tpl['start_date'])
    if rule == 'daily':         return 'Every day'
    if rule == 'weekdays':      return 'Every weekday (Mon–Fri)'
    if rule == 'weekends':      return 'Weekends only'
    if rule == 'every_n_days':
        return f'Every {interval} day{"s" if interval != 1 else ""}'
    if rule == 'weekly':
        return f'Every {_DAY_FULL[start.weekday()]}'
    if rule == 'every_n_weeks':
        return f'Every {interval} week{"s" if interval != 1 else ""} on {_DAY_FULL[start.weekday()]}'
    if rule == 'monthly':
        d = start.day
        sfx = 'th' if 11 <= d <= 13 else {1:'st',2:'nd',3:'rd'}.get(d % 10, 'th')
        return f'Monthly on the {d}{sfx}'
    if rule == 'selected_weekdays':
        names = ', '.join(_DAY_SHORT[int(w)] for w in sorted(weekdays))
        return names or 'Selected weekdays'
    return rule


def _should_occur(tpl: dict, today: date) -> bool:
    if tpl.get('paused'):
        return False
    start = parse_date(tpl['start_date'])
    if today < start:
        return False
    rule = tpl.get('rule', 'daily')
    if rule == 'daily':
        return True
    if rule == 'weekdays':
        return today.weekday() < 5
    if rule == 'weekends':
        return today.weekday() >= 5
    if rule == 'every_n_days':
        n = max(1, int(tpl.get('interval', 1)))
        return (today - start).days % n == 0
    if rule == 'weekly':
        return today.weekday() == start.weekday() and (today - start).days % 7 == 0
    if rule == 'every_n_weeks':
        n = max(1, int(tpl.get('interval', 1)))
        delta = (today - start).days
        return delta >= 0 and today.weekday() == start.weekday() and delta % (n * 7) == 0
    if rule == 'monthly':
        return today.day == start.day
    if rule == 'selected_weekdays':
        return today.weekday() in [int(w) for w in tpl.get('weekdays', [])]
    return False


def _to_tpl_out(tpl: dict, completed: int = 0, missed: int = 0) -> RecurringTemplateOut:
    return RecurringTemplateOut(
        id=str(tpl['_id']),
        title=tpl['title'],
        description=tpl.get('description', ''),
        rule=tpl['rule'],
        rule_label=_rule_label(tpl),
        interval=int(tpl.get('interval', 1)),
        weekdays=[int(w) for w in tpl.get('weekdays', [])],
        start_date=parse_date(tpl['start_date']),
        paused=bool(tpl.get('paused', False)),
        created_at=tpl.get('created_at', ''),
        completed_count=completed,
        missed_count=missed,
    )


def _to_occ_out(occ: dict) -> RecurringOccurrenceOut:
    return RecurringOccurrenceOut(
        id=str(occ['_id']),
        template_id=str(occ['template_id']),
        template_title=occ.get('template_title', ''),
        template_description=occ.get('template_description', ''),
        date=parse_date(occ['date']),
        status=occ.get('status', 'pending'),
        completed_at=occ.get('completed_at'),
        notes=occ.get('notes'),
        reflection=occ.get('reflection'),
        difficulty=occ.get('difficulty'),
    )


async def _auto_miss_past(today: date) -> None:
    """Mark yesterday's pending recurring occurrences as missed."""
    yesterday = (today - timedelta(days=1)).isoformat()
    await rec_occ_coll().update_many(
        {'date': {'$lt': today.isoformat()}, 'status': 'pending'},
        {'$set': {'status': 'missed'}},
    )


async def _generate_today(today: date) -> list[dict]:
    """Idempotent: ensure exactly one occurrence per active template for today."""
    await _auto_miss_past(today)
    templates = await rec_tpl_coll().find({'paused': {'$ne': True}}).to_list(10000)
    result = []
    for tpl in templates:
        if not _should_occur(tpl, today):
            continue
        existing = await rec_occ_coll().find_one(
            {'template_id': str(tpl['_id']), 'date': today.isoformat()}
        )
        if existing:
            result.append(existing)
        else:
            doc = {
                '_id': ObjectId(),
                'template_id': str(tpl['_id']),
                'template_title': tpl['title'],
                'template_description': tpl.get('description', ''),
                'date': today.isoformat(),
                'status': 'pending',
                'completed_at': None,
                'notes': None,
                'reflection': None,
                'difficulty': None,
                'created_at': datetime.utcnow().isoformat(),
            }
            await rec_occ_coll().insert_one(doc)
            result.append(doc)
    return result


# ── TEMPLATE CRUD ────────────────────────────────

@app.get('/api/recurring/templates', response_model=list[RecurringTemplateOut])
async def list_recurring_templates():
    tpls = await rec_tpl_coll().find().sort('created_at', 1).to_list(10000)
    out = []
    for tpl in tpls:
        tid = str(tpl['_id'])
        completed = await rec_occ_coll().count_documents({'template_id': tid, 'status': 'completed'})
        missed    = await rec_occ_coll().count_documents({'template_id': tid, 'status': 'missed'})
        out.append(_to_tpl_out(tpl, int(completed), int(missed)))
    return out


@app.post('/api/recurring/templates', response_model=RecurringTemplateOut)
async def create_recurring_template(payload: RecurringTemplateCreate):
    doc = {
        '_id': ObjectId(),
        'title': payload.title.strip(),
        'description': payload.description.strip(),
        'rule': payload.rule,
        'interval': int(payload.interval),
        'weekdays': [int(w) for w in payload.weekdays],
        'start_date': payload.start_date.isoformat(),
        'paused': False,
        'created_at': datetime.utcnow().isoformat(),
    }
    await rec_tpl_coll().insert_one(doc)
    return _to_tpl_out(doc)


@app.patch('/api/recurring/templates/{tpl_id}', response_model=RecurringTemplateOut)
async def update_recurring_template(tpl_id: str, payload: RecurringTemplateUpdate):
    try: oid = ObjectId(tpl_id)
    except Exception: raise HTTPException(400, 'Invalid id')
    tpl = await rec_tpl_coll().find_one({'_id': oid})
    if not tpl: raise HTTPException(404, 'Template not found')
    upd = {}
    if payload.title       is not None: upd['title']       = payload.title.strip()
    if payload.description is not None: upd['description'] = payload.description.strip()
    if payload.rule        is not None: upd['rule']        = payload.rule
    if payload.interval    is not None: upd['interval']    = int(payload.interval)
    if payload.weekdays    is not None: upd['weekdays']    = [int(w) for w in payload.weekdays]
    if upd:
        await rec_tpl_coll().update_one({'_id': oid}, {'$set': upd})
        tpl = await rec_tpl_coll().find_one({'_id': oid})
    tid = str(tpl['_id'])
    completed = await rec_occ_coll().count_documents({'template_id': tid, 'status': 'completed'})
    missed    = await rec_occ_coll().count_documents({'template_id': tid, 'status': 'missed'})
    return _to_tpl_out(tpl, int(completed), int(missed))


@app.patch('/api/recurring/templates/{tpl_id}/pause', response_model=RecurringTemplateOut)
async def pause_recurring(tpl_id: str):
    try: oid = ObjectId(tpl_id)
    except Exception: raise HTTPException(400, 'Invalid id')
    tpl = await rec_tpl_coll().find_one({'_id': oid})
    if not tpl: raise HTTPException(404, 'Not found')
    await rec_tpl_coll().update_one({'_id': oid}, {'$set': {'paused': True}})
    return _to_tpl_out(await rec_tpl_coll().find_one({'_id': oid}))


@app.patch('/api/recurring/templates/{tpl_id}/resume', response_model=RecurringTemplateOut)
async def resume_recurring(tpl_id: str):
    try: oid = ObjectId(tpl_id)
    except Exception: raise HTTPException(400, 'Invalid id')
    tpl = await rec_tpl_coll().find_one({'_id': oid})
    if not tpl: raise HTTPException(404, 'Not found')
    await rec_tpl_coll().update_one({'_id': oid}, {'$set': {'paused': False}})
    return _to_tpl_out(await rec_tpl_coll().find_one({'_id': oid}))


@app.delete('/api/recurring/templates/{tpl_id}', status_code=204)
async def delete_recurring_template(tpl_id: str):
    try: oid = ObjectId(tpl_id)
    except Exception: raise HTTPException(400, 'Invalid id')
    await rec_tpl_coll().delete_one({'_id': oid})
    await rec_occ_coll().delete_many({'template_id': tpl_id})


# ── OCCURRENCES ──────────────────────────────────

@app.get('/api/recurring/today', response_model=list[RecurringOccurrenceOut])
async def recurring_today():
    today = today_local()
    docs = await _generate_today(today)
    return [_to_occ_out(d) for d in docs]


@app.patch('/api/recurring/occurrences/{occ_id}/complete', response_model=RecurringOccurrenceOut)
async def complete_recurring(occ_id: str):
    try: oid = ObjectId(occ_id)
    except Exception: raise HTTPException(400, 'Invalid id')
    occ = await rec_occ_coll().find_one({'_id': oid})
    if not occ: raise HTTPException(404, 'Occurrence not found')
    await rec_occ_coll().update_one({'_id': oid}, {'$set': {
        'status': 'completed',
        'completed_at': datetime.utcnow().isoformat(),
    }})
    return _to_occ_out(await rec_occ_coll().find_one({'_id': oid}))


@app.patch('/api/recurring/occurrences/{occ_id}/miss', response_model=RecurringOccurrenceOut)
async def miss_recurring(occ_id: str):
    try: oid = ObjectId(occ_id)
    except Exception: raise HTTPException(400, 'Invalid id')
    occ = await rec_occ_coll().find_one({'_id': oid})
    if not occ: raise HTTPException(404, 'Occurrence not found')
    await rec_occ_coll().update_one({'_id': oid}, {'$set': {'status': 'missed'}})
    return _to_occ_out(await rec_occ_coll().find_one({'_id': oid}))


@app.patch('/api/recurring/occurrences/{occ_id}/notes', response_model=RecurringOccurrenceOut)
async def update_occurrence_notes(occ_id: str, payload: OccurrenceNotesUpdate):
    try: oid = ObjectId(occ_id)
    except Exception: raise HTTPException(400, 'Invalid id')
    upd = {}
    if payload.notes      is not None: upd['notes']      = payload.notes
    if payload.reflection is not None: upd['reflection'] = payload.reflection
    if payload.difficulty is not None: upd['difficulty'] = int(payload.difficulty)
    if upd:
        await rec_occ_coll().update_one({'_id': oid}, {'$set': upd})
    occ = await rec_occ_coll().find_one({'_id': oid})
    if not occ: raise HTTPException(404, 'Not found')
    return _to_occ_out(occ)


@app.get('/api/recurring/history', response_model=list[RecurringOccurrenceOut])
async def recurring_history_all(limit: int = 60):
    docs = await rec_occ_coll().find({'status': {'$ne': 'pending'}}).sort('date', -1).to_list(length=limit)
    return [_to_occ_out(d) for d in docs]


@app.get('/api/recurring/history/{tpl_id}', response_model=list[RecurringOccurrenceOut])
async def recurring_history_template(tpl_id: str, limit: int = 60):
    docs = await rec_occ_coll().find(
        {'template_id': tpl_id}
    ).sort('date', -1).to_list(length=limit)
    return [_to_occ_out(d) for d in docs]



# ═══════════════════════════════════════════════════
#  TAGS
# ═══════════════════════════════════════════════════

def tag_coll():
    return get_db()["tags"]


def _to_tag_out(doc: dict) -> TagOut:
    return TagOut(id=str(doc["_id"]), name=doc["name"], color=doc.get("color", "blue"))


@app.get("/api/tags")
async def list_tags():
    docs = await tag_coll().find().sort("name", 1).to_list(length=1000)
    return [_to_tag_out(d).model_dump() for d in docs]


@app.post("/api/tags", response_model=TagOut)
async def create_tag(payload: TagCreate):
    existing = await tag_coll().find_one(
        {"name": {"$regex": f"^{payload.name.strip()}$", "$options": "i"}}
    )
    if existing:
        return _to_tag_out(existing)
    doc = {"_id": ObjectId(), "name": payload.name.strip(), "color": payload.color}
    await tag_coll().insert_one(doc)
    return _to_tag_out(doc)


@app.delete("/api/tags/{tag_id}", status_code=204)
async def delete_tag(tag_id: str):
    try:
        oid = ObjectId(tag_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    await tag_coll().delete_one({"_id": oid})
    await coll().update_many({}, {"$pull": {"tags": tag_id}})


@app.patch("/api/tasks/{task_id}/tags")
async def set_task_tags(task_id: str, tag_ids: list[str]):
    try:
        oid = ObjectId(task_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    await coll().update_one({"_id": oid}, {"$set": {"tags": tag_ids}})
    return {"id": task_id, "tags": tag_ids}


@app.patch("/api/pomodoro/sessions/{session_id}/tag-focus")
async def set_pomodoro_tag_focus(session_id: str, tag_id: str, focus_minutes: float):
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    session = await pomo_coll().find_one({"_id": oid})
    if not session:
        raise HTTPException(404, "Session not found")
    await pomo_coll().update_one(
        {"_id": oid},
        {"$set": {"focused_tag_id": tag_id, "focused_tag_minutes": float(focus_minutes)}}
    )
    return {"ok": True}


@app.get("/api/tags/analytics")
async def tag_analytics():
    tags     = await tag_coll().find().sort("name", 1).to_list(length=1000)
    sessions = await pomo_coll().find(
        {"end_time": {"$ne": None}, "focused_tag_id": {"$exists": True}}
    ).to_list(length=50000)
    tasks_all = await coll().find(
        {"status": {"$in": ["completed", "completed_late"]}}
    ).to_list(length=50000)

    result = []
    for tag in tags:
        tid         = str(tag["_id"])
        tag_sessions = [s for s in sessions if s.get("focused_tag_id") == tid]
        total_focus  = float(sum(float(s.get("focused_tag_minutes") or 0) for s in tag_sessions))
        n_sessions   = len(tag_sessions)
        avg_session  = round(total_focus / n_sessions, 1) if n_sessions else 0.0
        tag_tasks    = [t for t in tasks_all if tid in (t.get("tags") or [])]
        result.append({
            "id":                   tid,
            "name":                 tag["name"],
            "color":                tag.get("color", "blue"),
            "total_focus_minutes":  round(total_focus, 1),
            "completed_tasks":      int(len(tag_tasks)),
            "avg_session_minutes":  avg_session,
            "total_sessions":       n_sessions,
        })
    return result


@app.get("/api/tags/{tag_id}/detail")
async def tag_detail(tag_id: str):
    try:
        oid = ObjectId(tag_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    tag = await tag_coll().find_one({"_id": oid})
    if not tag:
        raise HTTPException(404, "Tag not found")

    sessions = await pomo_coll().find(
        {"end_time": {"$ne": None}, "focused_tag_id": tag_id}
    ).sort("start_time", -1).to_list(length=1000)

    tasks_all = await coll().find(
        {"status": {"$in": ["completed", "completed_late"]}, "tags": tag_id}
    ).to_list(length=5000)

    total_focus = float(sum(float(s.get("focused_tag_minutes") or 0) for s in sessions))
    n_sessions  = len(sessions)
    avg_session = round(total_focus / n_sessions, 1) if n_sessions else 0.0

    session_list = [
        {
            "date":          s.get("start_time", "")[:10],
            "focus_minutes": round(float(s.get("focused_tag_minutes") or 0), 1),
            "reflection":    (s.get("reflection") or {}).get("focus_score"),
            "difficulty":    (s.get("reflection") or {}).get("energy_score"),
        }
        for s in sessions
    ]

    task_list = [
        {
            "title":        t.get("title", ""),
            "completed_at": t.get("completed_date", ""),
        }
        for t in tasks_all
    ]

    return {
        "tag":                  {"id": tag_id, "name": tag["name"], "color": tag.get("color","blue")},
        "total_focus_minutes":  round(total_focus, 1),
        "completed_tasks":      int(len(task_list)),
        "total_sessions":       n_sessions,
        "avg_session_minutes":  avg_session,
        "sessions":             session_list,
        "tasks":                task_list,
    }



# ═══════════════════════════════════════════════════
#  PROMISES
# ═══════════════════════════════════════════════════

def prm_coll():
    return get_db()["promises"]


def _to_prm_out(doc: dict, focus_minutes: float = 0.0, sessions: int = 0) -> PromiseOut:
    avg = round(focus_minutes / sessions, 1) if sessions else 0.0
    start = parse_date(doc["start_date"])
    completed = parse_date(doc["completed_date"]) if doc.get("completed_date") else None
    days_taken = (completed - start).days if completed else None
    return PromiseOut(
        id=str(doc["_id"]),
        title=doc["title"],
        description=doc.get("description", ""),
        tags=[str(t) for t in (doc.get("tags") or [])],
        status=doc.get("status", "active"),
        start_date=start,
        end_date=parse_date(doc["end_date"]) if doc.get("end_date") else None,
        completed_date=completed,
        broken_date=parse_date(doc["broken_date"]) if doc.get("broken_date") else None,
        days_taken=days_taken,
        created_at=doc.get("created_at", ""),
        total_focus_minutes=round(focus_minutes, 1),
        total_sessions=sessions,
        avg_session_minutes=avg,
    )


async def _prm_focus(promise_id: str):
    """Sum Pomodoro focus time where linked_promise_id matches."""
    sessions = await pomo_coll().find(
        {"end_time": {"$ne": None}, "linked_promise_id": promise_id}
    ).to_list(length=10000)
    total = float(sum(float(s.get("total_focus_minutes") or 0) for s in sessions))
    return total, len(sessions)


@app.get("/api/promises")
async def list_promises(status: str | None = None):
    query = {}
    if status:
        query["status"] = status
    docs = await prm_coll().find(query).sort("created_at", -1).to_list(length=10000)
    result = []
    for doc in docs:
        fm, ns = await _prm_focus(str(doc["_id"]))
        result.append(_to_prm_out(doc, fm, ns).model_dump())
    return result


@app.post("/api/promises")
async def create_promise(payload: PromiseCreate):
    current = today_local()
    doc = {
        "_id": ObjectId(),
        "title": payload.title.strip(),
        "description": payload.description.strip(),
        "tags": [str(t) for t in (payload.tags or [])],
        "status": "active",
        "start_date": (payload.start_date or current).isoformat(),
        "end_date": payload.end_date.isoformat() if payload.end_date else None,
        "completed_date": None,
        "broken_date": None,
        "created_at": datetime.utcnow().isoformat(),
    }
    await prm_coll().insert_one(doc)
    return _to_prm_out(doc).model_dump()


@app.patch("/api/promises/{prm_id}")
async def update_promise(prm_id: str, payload: PromiseUpdate):
    try:
        oid = ObjectId(prm_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    doc = await prm_coll().find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Promise not found")
    upd = {}
    if payload.title       is not None: upd["title"]       = payload.title.strip()
    if payload.description is not None: upd["description"] = payload.description.strip()
    if payload.tags        is not None: upd["tags"]        = [str(t) for t in payload.tags]
    if payload.end_date    is not None: upd["end_date"]    = payload.end_date.isoformat()
    if upd:
        await prm_coll().update_one({"_id": oid}, {"$set": upd})
    doc = await prm_coll().find_one({"_id": oid})
    fm, ns = await _prm_focus(prm_id)
    return _to_prm_out(doc, fm, ns).model_dump()


@app.patch("/api/promises/{prm_id}/complete")
async def complete_promise(prm_id: str):
    try:
        oid = ObjectId(prm_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    doc = await prm_coll().find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Promise not found")
    current = today_local()
    start = parse_date(doc["start_date"])
    days_taken = (current - start).days
    await prm_coll().update_one({"_id": oid}, {"$set": {
        "status": "completed",
        "completed_date": current.isoformat(),
    }})
    doc = await prm_coll().find_one({"_id": oid})
    fm, ns = await _prm_focus(prm_id)
    return _to_prm_out(doc, fm, ns).model_dump()


@app.patch("/api/promises/{prm_id}/break")
async def break_promise(prm_id: str):
    try:
        oid = ObjectId(prm_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    doc = await prm_coll().find_one({"_id": oid})
    if not doc:
        raise HTTPException(404, "Promise not found")
    current = today_local()
    await prm_coll().update_one({"_id": oid}, {"$set": {
        "status": "broken",
        "broken_date": current.isoformat(),
    }})
    doc = await prm_coll().find_one({"_id": oid})
    fm, ns = await _prm_focus(prm_id)
    return _to_prm_out(doc, fm, ns).model_dump()


@app.delete("/api/promises/{prm_id}", status_code=204)
async def delete_promise(prm_id: str):
    try:
        oid = ObjectId(prm_id)
    except Exception:
        raise HTTPException(400, "Invalid id")
    await prm_coll().delete_one({"_id": oid})


@app.get("/api/promises/analytics")
async def promise_analytics():
    docs = await prm_coll().find().to_list(length=10000)
    active    = int(sum(1 for d in docs if d.get("status") == "active"))
    completed = int(sum(1 for d in docs if d.get("status") == "completed"))
    broken    = int(sum(1 for d in docs if d.get("status") == "broken"))

    completion_days = []
    for d in docs:
        if d.get("status") == "completed" and d.get("completed_date") and d.get("start_date"):
            days = (parse_date(d["completed_date"]) - parse_date(d["start_date"])).days
            completion_days.append(days)
    avg_days = round(sum(completion_days) / len(completion_days), 1) if completion_days else 0.0

    # Total Pomodoro focus linked to any promise
    pomo_sessions = await pomo_coll().find(
        {"end_time": {"$ne": None}, "linked_promise_id": {"$exists": True}}
    ).to_list(length=50000)
    total_focus_hours = round(
        float(sum(float(s.get("total_focus_minutes") or 0) for s in pomo_sessions)) / 60, 2
    )

    return {
        "active": active,
        "completed": completed,
        "broken": broken,
        "avg_completion_days": avg_days,
        "total_focus_hours": total_focus_hours,
    }


# Also allow linking a Pomodoro session to a promise
@app.patch("/api/pomodoro/sessions/{session_id}/link-promise")
async def link_promise_to_session(session_id: str, promise_id: str):
    try:
        oid = ObjectId(session_id)
    except Exception:
        raise HTTPException(400, "Invalid session id")
    await pomo_coll().update_one({"_id": oid}, {"$set": {"linked_promise_id": promise_id}})
    return {"ok": True}


async def spa_fallback(full_path: str):
    if full_path.startswith("api"):
            raise HTTPException(status_code=404)
    
    return FileResponse("app/static/index.html")
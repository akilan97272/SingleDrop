from __future__ import annotations

import json
import os
import random
from datetime import date, datetime, timedelta
from typing import Iterable

_QUOTES_PATH = os.path.join(os.path.dirname(__file__), "random_quote.json")
_quotes_cache: dict | None = None


def _load_quotes() -> dict:
    global _quotes_cache
    if _quotes_cache is None:
        with open(_QUOTES_PATH, "r", encoding="utf-8") as fh:
            _quotes_cache = json.load(fh)
    return _quotes_cache


def random_quote() -> str:
    return random.choice(_load_quotes()["quotes"])


def random_mindset() -> str:
    return random.choice(_load_quotes()["mindsets"])


def today_local() -> date:
    return datetime.now().date()


def iso(d: date | None) -> str | None:
    return d.isoformat() if d else None


def parse_date(value) -> date:
    if isinstance(value, date):
        return value
    return date.fromisoformat(str(value))


def task_label(task: dict) -> str:
    """task_name#description_of_that_task[checkmark]date_day style label."""
    title = task.get("title", "")
    desc = task.get("description") or ""
    marker = "\u2713" if task.get("status") in ("completed", "completed_late") else " "
    day = parse_date(task["planned_date"]).isoformat()
    return f"{title}#{desc}[{marker}]{day}"


def classify_kind(planned_date: date, current: date) -> str:
    if planned_date == current:
        return "today"
    if planned_date == current + timedelta(days=1):
        return "tomorrow"
    if planned_date > current + timedelta(days=1):
        return "future"
    return "overdue"


def compute_streak(completed_days: Iterable[date]) -> tuple[int, bool]:
    """
    Streak counts consecutive days on which at least one task was completed
    on-time. A 2-day shield protects the streak: skipping exactly one full
    day in between two completion days keeps the streak alive (shield used).
    Skipping two or more full days in a row breaks the streak.
    """
    days = sorted(set(completed_days))
    if not days:
        return 0, False

    streak = 1
    shield_used = False
    prev = days[0]

    for current in days[1:]:
        gap = (current - prev).days
        if gap == 1:
            streak += 1
        elif gap == 2:
            streak += 1
            shield_used = True
        else:
            streak = 1
            shield_used = False
        prev = current

    return streak, shield_used


def days_away(target: date, current: date) -> int:
    return (target - current).days

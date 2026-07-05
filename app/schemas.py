from __future__ import annotations

from datetime import date
from typing import Optional, Literal, Any
from pydantic import BaseModel, Field, ConfigDict

TaskStatus = Literal["planned", "completed", "missed", "completed_late", "disbanded"]
TimelineTaskStatus = Literal["upcoming", "active", "completed"]
TIMELINE_COLORS = Literal["blue", "purple", "cyan", "pink", "green", "orange"]


# ── Task ──────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    planned_date: date


class TaskOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    title: str
    description: str = ""
    planned_date: date
    created_at: date
    completed_date: Optional[date] = None
    missed_date: Optional[date] = None
    disbanded_date: Optional[date] = None
    missed_reason: Optional[str] = None
    status: TaskStatus
    kind: Literal["today", "tomorrow", "future", "overdue"]
    label: str


# ── Timeline ──────────────────────────────────────────────────────────────────

class TimelineTaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    start_date: date
    end_date: date  # same as start_date for a single-day entry


class TimelineCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: TIMELINE_COLORS = "blue"


class TimelineTaskOut(BaseModel):
    id: str
    title: str
    description: str
    start_date: date
    end_date: date
    status: TimelineTaskStatus
    progress: float       # 0.0 → 1.0
    days_total: int
    days_elapsed: int
    is_today: bool        # true if today falls within the range


class TimelineOut(BaseModel):
    id: str
    name: str
    color: TIMELINE_COLORS
    created_at: date
    tasks: list[TimelineTaskOut]
    is_active_today: bool   # any task spans today
    overall_start: Optional[date] = None
    overall_end: Optional[date] = None


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationItem(BaseModel):
    type: Literal["future_plan", "missed", "tomorrow", "timeline", "info"]
    message: str


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DashboardOut(BaseModel):
    today: list[TaskOut]
    tomorrow: list[TaskOut]
    future_plans: list[TaskOut]
    completed_today: list[TaskOut]
    missed_count: int
    quote: str
    streak: int
    shield_used: bool
    notifications: list[NotificationItem]
    mindset_note: str
    day_name: str
    today_date: date
    timelines: list[TimelineOut]


# ── Tracker ───────────────────────────────────────────────────────────────────

class DailyPoint(BaseModel):
    day: date
    count: int


class StatsOut(BaseModel):
    streak: int
    shield_used: bool
    total_completed: int
    total_started: int
    completed_late_count: int
    deprecated_count: int
    missed_pending_count: int


class TrackerOut(BaseModel):
    grid: list[dict[str, Any]]
    completed_series: list[DailyPoint]
    missed_series: list[DailyPoint]
    stats: StatsOut


# ── Pomodoro ──────────────────────────────────────────────────────────────────

class ReflectionData(BaseModel):
    focus_score: Optional[int] = None   # 1–5
    distracted: Optional[bool] = None
    energy_score: Optional[int] = None  # 1–5
    would_repeat: Optional[bool] = None


class PomodoroSessionCreate(BaseModel):
    work_minutes: int = Field(default=25, ge=1, le=120)
    break_minutes: int = Field(default=5, ge=1, le=60)
    planned_cycles: int = Field(default=4, ge=1, le=20)
    linked_task_id: Optional[str] = None


class PomodoroSessionComplete(BaseModel):
    end_time: str                       # ISO datetime
    total_focus_minutes: float
    total_break_minutes: float
    completed_cycles: int
    interrupted: bool
    reflection: Optional[ReflectionData] = None


class PomodoroSessionOut(BaseModel):
    id: str
    start_time: str
    end_time: Optional[str] = None
    work_minutes: int
    break_minutes: int
    planned_cycles: int
    completed_cycles: int
    total_focus_minutes: float
    total_break_minutes: float
    interrupted: bool
    linked_task_id: Optional[str] = None
    linked_task_title: Optional[str] = None
    reflection: Optional[ReflectionData] = None


class PomodoroStatsOut(BaseModel):
    total_focus_today: float    # minutes
    total_focus_week: float     # minutes
    longest_session: float      # minutes
    average_session: float      # minutes
    sessions_completed: int
    most_productive_hour: Optional[int] = None  # 0–23
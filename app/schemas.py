from __future__ import annotations

from datetime import date
from typing import Optional, Literal, Any
from pydantic import BaseModel, Field, ConfigDict

TaskStatus    = Literal["planned", "completed", "missed", "completed_late", "disbanded"]
PromiseStatus = Literal["active", "completed", "broken"]

RecurrenceRule = Literal[
    'daily', 'weekdays', 'weekends',
    'every_n_days', 'weekly', 'every_n_weeks',
    'monthly', 'selected_weekdays',
]
OccurrenceStatus = Literal['pending', 'completed', 'missed']


# ── Task ──────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    planned_date: date
    tags: list[str] = Field(default=[])


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
    tags: list[str] = Field(default=[])


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationItem(BaseModel):
    type: Literal["future_plan", "missed", "tomorrow", "info"]
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
    focus_score: Optional[int] = None
    distracted: Optional[bool] = None
    energy_score: Optional[int] = None
    would_repeat: Optional[bool] = None


class PomodoroSessionCreate(BaseModel):
    work_minutes: int = Field(default=25, ge=1, le=120)
    break_minutes: int = Field(default=5, ge=1, le=60)
    planned_cycles: int = Field(default=4, ge=1, le=20)
    linked_task_id: Optional[str] = None


class PomodoroSessionComplete(BaseModel):
    end_time: str
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
    total_focus_today: float
    total_focus_week: float
    longest_session: float
    average_session: float
    sessions_completed: int
    most_productive_hour: Optional[int] = None


# ── Recurring Tasks ───────────────────────────────────────────────────────────

class RecurringTemplateCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default='', max_length=500)
    rule: RecurrenceRule
    interval: int = Field(default=1, ge=1, le=365)
    weekdays: list[int] = Field(default=[])
    start_date: date


class RecurringTemplateUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    rule: Optional[RecurrenceRule] = None
    interval: Optional[int] = None
    weekdays: Optional[list[int]] = None


class RecurringTemplateOut(BaseModel):
    id: str
    title: str
    description: str
    rule: str
    rule_label: str
    interval: int
    weekdays: list[int]
    start_date: date
    paused: bool
    created_at: str
    completed_count: int = 0
    missed_count: int = 0


class OccurrenceNotesUpdate(BaseModel):
    notes: Optional[str] = None
    reflection: Optional[str] = None
    difficulty: Optional[int] = None


class RecurringOccurrenceOut(BaseModel):
    id: str
    template_id: str
    template_title: str
    template_description: str
    date: date
    status: OccurrenceStatus
    completed_at: Optional[str] = None
    notes: Optional[str] = None
    reflection: Optional[str] = None
    difficulty: Optional[int] = None


# ── Tags ─────────────────────────────────────────────────────────────────────

class TagCreate(BaseModel):
    name: str = Field(min_length=1, max_length=40)
    color: str = Field(default="blue", max_length=20)


class TagOut(BaseModel):
    id: str
    name: str
    color: str


# ── Promises ──────────────────────────────────────────────────────────────────

class PromiseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=1000)
    tags: list[str] = Field(default=[])
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class PromiseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[list[str]] = None
    end_date: Optional[date] = None


class PromiseOut(BaseModel):
    id: str
    title: str
    description: str
    tags: list[str]
    status: PromiseStatus
    start_date: date
    end_date: Optional[date] = None
    completed_date: Optional[date] = None
    broken_date: Optional[date] = None
    days_taken: Optional[int] = None
    created_at: str
    total_focus_minutes: float = 0.0
    total_sessions: int = 0
    avg_session_minutes: float = 0.0


class PromiseAnalyticsOut(BaseModel):
    active: int
    completed: int
    broken: int
    avg_completion_days: float
    total_focus_hours: float
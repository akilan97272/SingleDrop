from __future__ import annotations

from datetime import date
from typing import Optional, Literal, Any
from pydantic import BaseModel, Field, ConfigDict

TaskStatus = Literal["planned", "completed", "missed", "completed_late", "disbanded"]


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


class NotificationItem(BaseModel):
    type: Literal["future_plan", "missed", "tomorrow", "info"]
    message: str


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

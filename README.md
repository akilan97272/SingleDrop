<p align="center">
  <img src="SingleDrop-dev/public/assets/logo.png" width="72" alt="Single Drop logo" />
</p>

<h1 align="center">Single Drop</h1>

<p align="center">
  A task tracker built around one rule — <strong>one day, one drop, no date dragging.</strong><br/>
  Tasks are tied to the day they are created. They are completed that day or they are missed. No exceptions.
</p>

---

## Features

### Dashboard
The main view of the day. Shows a randomly rotating motivational quote at the top, followed by today's task list with an inline add form. The right panel surfaces tomorrow's agenda, upcoming future plans, and a mindset callout pulling from the missed task count. A streak counter with a 2-day shield system sits at the top right of the panel.

### Today's Tasks
Tasks are added directly from the Dashboard and are locked to the current date. Once added, the date cannot be changed. Each task follows the format:

```
task_name#description[✓ or space]date
```

Mark a task done during the day. Anything left `planned` when the day ends is automatically moved to the Deprecated page — it never rolls over.

### Plan Your Tomorrow
A dedicated page for preparing the next day. Shows the upcoming date and day name. Tasks added here land in the Dashboard's "Tomorrow" panel and trigger a notification reminder.

### Future Plans
Schedule tasks beyond tomorrow with a date picker. Each future plan is surfaced daily in the notification bell until its day arrives, keeping long-range commitments visible without cluttering the current day.

### Deprecated (Missed Tasks)
Any task that was not completed on its planned date is automatically moved here — labelled *"Reason for you being average."* From here you can either mark it completed late or permanently disband it. Disbanded tasks count toward deprecation stats.

### Timeline
Frame a multi-day span and nest tasks inside it. Useful for structured periods like training blocks, study sprints, or project phases. Each nested task carries its own start and end date, and progress is tracked as a bar that fills across the range. Active tasks (those whose date range includes today) are highlighted across the Timeline page and the Dashboard.

Example structure:
```
Training
  ├── Python        01/07 → 07/07
  ├── FastAPI       08/07 → 14/07
  └── React         15/07 → 21/07
```

### Progress Tracker
A full analytics view of your task history:
- **Streak** — consecutive days with at least one task completed on time. A 2-day shield lets you skip one day without breaking the streak; two consecutive missed days reset it.
- **GitHub-style contribution grid** — colour-coded cells showing task output per day across 30, 90, 180, or 365 days.
- **Bar chart** — tasks completed per day.
- **Line chart** — tasks missed/ignored per day.
- **Summary stats** — total completed, started, completed late, and deprecated.

### Notifications
The bell icon in the nav bar aggregates:
- Tomorrow's agenda count
- Future plan reminders (shown every day until the task's date)
- Active timeline tasks for today
- Missed task count

### Themes
Three visual modes selectable from the nav bar. Persisted across sessions.

---

## Project Structure

```
SingleDrop/
├── app/                        # FastAPI backend
│   ├── static/                 # Frontend build output is copied here by Docker
│   ├── __init__.py
│   ├── db.py                   # MongoDB connection helper
│   ├── main.py                 # API routes
│   ├── random_quote.json       # Motivational quotes — edit before shipping
│   ├── schemas.py              # Pydantic request / response models
│   └── services.py             # Streak logic, date helpers, quote loader
│
├── SingleDrop-dev/             # React / Vite frontend
│   ├── public/
│   │   └── assets/
│   │       └── logo.png
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── api.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env                    # ← create this (see below)
│   └── package.json
│
├── .dockerignore
├── .gitignore
├── .env                        # ← root env for backend (see below)
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── README.md
```

---

## Before You Ship the Container

### 1. Personalise your quotes

Open `app/random_quote.json`. It contains two arrays:

- **`quotes`** — shown on the Dashboard on every refresh or login.
- **`mindsets`** — the "Deprecated Mindset" callout on the Dashboard.

Add, edit, or remove entries as you like. These are loaded at runtime so the file must be present inside the container (it is copied in automatically by the Dockerfile).

```json
{
  "quotes": [
    "Your quote here.",
    "Another one."
  ],
  "mindsets": [
    "Deprecated mindset: waiting for the right moment instead of making one."
  ]
}
```

### 2. Create your `.env` files

**Root `.env`** (backend / Docker Compose):

```env
MONGO_URL=mongodb://mongo:27017
MONGO_DB=single_drop
CORS_ORIGINS=*
```

**`SingleDrop-dev/.env`** (frontend — used during local development only):

```env
VITE_API_URL=http://localhost:8000
```

> When running via Docker, `VITE_API_URL` does not need to be set. The frontend is built into static files and served by the backend directly, so all `/api/*` calls are same-origin.

---

## Running with Docker

```bash
docker compose up --build
```

The Dockerfile builds the React frontend first (`npm run build` inside `SingleDrop-dev/`), copies the output into `app/static/`, then builds the Python backend image. The result is a single container that serves both the API and the compiled frontend.

Open `http://localhost:8000` in your browser.

---

## Local Development (without Docker)

**Backend:**

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
# Requires a local or remote MongoDB instance
export MONGO_URL=mongodb://localhost:27017
uvicorn app.main:app --reload
```

**Frontend:**

```bash
cd SingleDrop-dev
cp .env.example .env            # or create .env manually (see above)
npm install
npm run dev
```

Frontend dev server runs on `http://localhost:5173` and proxies `/api/*` to the backend.

---

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/dashboard` | Full dashboard payload — tasks, streak, quote, timelines, notifications |
| `GET` | `/api/tasks` | All tasks (optional `?status=` filter) |
| `POST` | `/api/tasks` | Create a task |
| `PATCH` | `/api/tasks/{id}/complete` | Mark a task done |
| `PATCH` | `/api/tasks/{id}/complete-late` | Complete a missed task after its day |
| `PATCH` | `/api/tasks/{id}/disband` | Permanently disband a missed task |
| `GET` | `/api/missed` | Tasks in the deprecated bucket |
| `GET` | `/api/future-plans` | Tasks scheduled beyond tomorrow |
| `GET` | `/api/timelines` | All timelines with nested tasks and progress |
| `POST` | `/api/timelines` | Create a timeline |
| `POST` | `/api/timelines/{id}/tasks` | Add a nested task to a timeline |
| `DELETE` | `/api/timelines/{id}/tasks/{tid}` | Remove a nested task |
| `DELETE` | `/api/timelines/{id}` | Delete a timeline |
| `GET` | `/api/tracker` | Grid, charts, and stats (optional `?days=` range) |
| `GET` | `/api/notifications` | Notification bell content |

Interactive API docs are available at `http://localhost:8000/docs` when the backend is running.

---

## Requirements

- Docker + Docker Compose, **or**
- Python 3.12+ and Node 20+ for local development
- MongoDB 7 (included in the Compose file)
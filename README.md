# Single Drop

A green-themed, no-date-dragging task tracker. Built with:

- **FastAPI** backend (Python), MongoDB via Motor
- **React + Vite** frontend, React Router, Recharts, Tailwind CSS
- **Docker Compose** to run Mongo + backend + frontend together

## What it does

- Add a task for today and complete it that same day. Once a task's date is set, it never moves.
- If a task isn't completed on its day, it is **never dragged into the next day**. It automatically lands on the
  **Deprecated** page ("Reason for you being average"), where you can either complete it late or disband it for good.
- **Plan your tomorrow**: a dedicated page that shows tomorrow's date and day name, with a quick add form.
- **Future plans**: schedule anything further out with a date picker. Every future plan is reminded daily in the
  notification bell until the day finally arrives.
- **Tracker page**: streak counter (with a 2-day shield — missing a single day is forgiven, two in a row breaks the
  streak), a GitHub-style contribution grid, a bar chart of tasks completed per day, a line chart of tasks
  missed/ignored per day, and top-line stats (completed, started, completed-late, deprecated).
- **Dashboard**: a randomly rotating motivational quote (served from `random_quote.json`), today's agenda, a
  notification bell, and a rotating "deprecated mindset" callout.
- Light/dark theme switch (green accent, persisted in `localStorage`).
- Responsive layout for both desktop and mobile.

## Task label format

Every task renders using the format:

```
task_name#description_of_that_task[checkmark]date_day
```

`[✓]` once completed, `[ ]` while still open or missed.

## Run with Docker

```bash
docker compose up --build
```

- Frontend: http://localhost:5173 (Nginx serving the production `npm run build` output, proxying `/api/*` to the backend container)
- Backend: http://localhost:8000 (docs at `/docs`)
- Mongo: localhost:27017 (data persisted in the `mongo_data` volume)

The frontend container is a multi-stage build: Node builds the static bundle with `npm run build`, then Nginx serves
it on port 80 (mapped to host `5173`). Nginx also reverse-proxies any `/api/*` request to the `backend` service, so
the browser only ever talks to one origin and the frontend code can call relative paths like `/api/dashboard` — no
`VITE_API_URL` needs to be baked in at build time.

## Run without Docker (local dev)

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export MONGO_URL=mongodb://localhost:27017
uvicorn app.main:app --reload
```

Frontend (dev server, with hot reload):

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

Frontend (production build served statically, e.g. for `npm run build` + your own static server or Nginx): point
your server's `/api/*` location at `http://localhost:8000/api/` (see `frontend/nginx.conf` for a working example),
and leave `VITE_API_URL` unset so the app calls relative `/api/...` paths. If you serve the `dist/` folder directly
without any reverse proxy in front of it, API calls will fail with a JSON parse error because there's nothing to
forward `/api/*` requests to the backend — you need either the Nginx proxy or a `VITE_API_URL` baked in at build
time (`VITE_API_URL=http://localhost:8000 npm run build`).

## API summary

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/dashboard` | Quote, streak, today/tomorrow/future tasks, notifications, mindset note |
| GET | `/api/tasks?status=` | All tasks, optional status filter |
| GET | `/api/future-plans` | Tasks planned beyond tomorrow |
| GET | `/api/missed` | Tasks sitting in the deprecated page |
| GET | `/api/notifications` | Notification box content (used by the bell) |
| POST | `/api/tasks` | Create a task (`title`, `description`, `planned_date`) |
| PATCH | `/api/tasks/{id}/complete` | Mark a planned task done |
| PATCH | `/api/tasks/{id}/complete-late` | Complete a missed task late |
| PATCH | `/api/tasks/{id}/disband` | Disband a missed task permanently |
| GET | `/api/tracker?days=` | Grid + charts + stats for the tracker page |

## Notes

- Tasks auto-transition from `planned` → `missed` the moment their day has fully passed, on the next request.
- A task can only be completed normally while `planned`; once `missed`, the only options are complete-late or
  disband — matching the "Complete or disband" requirement on the Deprecated page.
- The streak only counts tasks completed **on time** (`completed`), not `completed_late`.

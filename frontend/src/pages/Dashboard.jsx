import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Shell from '../components/Shell'
import SectionCard from '../components/SectionCard'
import TaskComposer from '../components/TaskComposer'
import TaskList from '../components/TaskList'
import { FlameIcon, ShieldIcon } from '../components/Icons'
import { api } from '../api'

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  const load = () => api.dashboard().then(setData).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const createTask = (payload) => api.createTask(payload).then(load)
  const completeTask = (id) => api.completeTask(id).then(load)

  if (error) return (
    <Shell>
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="glass chip-danger rounded-2xl p-6 text-sm">{error}</div>
      </main>
    </Shell>
  )

  if (!data) return (
    <Shell>
      <main className="mx-auto max-w-7xl px-4 py-10 text-secondary-c">
        <div className="glass animate-pulse-glow rounded-2xl p-6 text-center text-sm">loading…</div>
      </main>
    </Shell>
  )

  return (
    <Shell>
      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6 lg:grid-cols-[1.6fr_1fr]">

        {/* ── LEFT COLUMN ── */}
        <div className="grid gap-5">

          {/* Hero quote + streak */}
          <div className="glass p-6" style={{ backgroundImage: 'var(--accent-gradient)', border: 'none' }}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                  {data.day_name} &middot; quote of the refresh
                </div>
                <h1 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
                  {data.quote}
                </h1>
              </div>

              {/* Streak card */}
              <div className="glass min-w-[12rem] p-4" style={{ background: 'rgba(0,0,0,0.22)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/70">
                  <FlameIcon className="h-4 w-4" /> streak
                </div>
                <div className="mt-1 text-3xl font-black text-white">
                  {data.streak} day{data.streak === 1 ? '' : 's'}
                </div>
                <div className="mt-1 flex items-center gap-1 text-xs text-white/60">
                  <ShieldIcon className="h-3.5 w-3.5" />
                  {data.shield_used ? 'shield used in this run' : 'shield intact'}
                </div>
              </div>
            </div>
          </div>

          {/* Add today's task */}
          <SectionCard title="Add today's task">
            <TaskComposer
              onCreate={createTask}
              fixedDate={data.today_date}
              helperText="Added for today. Complete it today — the date never moves."
            />
          </SectionCard>

          {/* Today's agenda */}
          <SectionCard title="Today's agenda" subtitle="Lined up for today only.">
            <TaskList items={data.today} onComplete={completeTask} emptyText="No tasks for today. Peace or danger?" />
          </SectionCard>

          {/* Completed today */}
          <SectionCard title="Completed today">
            <TaskList items={data.completed_today} emptyText="Nothing completed yet today." />
          </SectionCard>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="grid gap-5">

          {/* Tomorrow's agenda */}
          <SectionCard
            title="Tomorrow's agenda"
            action={
              <Link to="/plan-tomorrow" className="text-xs font-semibold" style={{ color: 'var(--accent-blue)' }}>
                plan it →
              </Link>
            }
          >
            <TaskList items={data.tomorrow} emptyText="Nothing planned for tomorrow yet." showDate={false} />
          </SectionCard>

          {/* Future plans */}
          <SectionCard
            title="Future plans"
            action={
              <Link to="/future-plans" className="text-xs font-semibold" style={{ color: 'var(--accent-purple)' }}>
                view all →
              </Link>
            }
          >
            <TaskList items={data.future_plans.slice(0, 4)} emptyText="No future plans yet." showDate={false} />
          </SectionCard>

          {/* Deprecated mindset */}
          <SectionCard
            title="Deprecated mindset"
            action={
              <Link to="/deprecated" className="text-xs font-semibold" style={{ color: 'var(--accent-pink)' }}>
                {data.missed_count} missed →
              </Link>
            }
          >
            <div className="chip-warning rounded-2xl p-4 text-sm italic leading-relaxed">
              {data.mindset_note}
            </div>
          </SectionCard>

        </div>
      </main>
    </Shell>
  )
}

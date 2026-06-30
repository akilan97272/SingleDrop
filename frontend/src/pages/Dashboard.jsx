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

  if (error) {
    return (
      <Shell>
        <main className="mx-auto max-w-7xl px-4 py-10 text-rose-500">{error}</main>
      </Shell>
    )
  }

  if (!data) {
    return (
      <Shell>
        <main className="mx-auto max-w-7xl px-4 py-10 text-brand-700/60 dark:text-brand-300/60">loading…</main>
      </Shell>
    )
  }

  return (
    <Shell>
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="grid gap-6">
          <div className="rounded-3xl border border-brand-900/10 bg-gradient-to-br from-brand-500/10 via-white to-white p-6 shadow-sm dark:border-white/10 dark:from-brand-500/10 dark:via-brand-950/40 dark:to-brand-950/40">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-2xl">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600 dark:text-brand-300">
                  {data.day_name} &middot; quote of the refresh
                </div>
                <h1 className="mt-2 text-2xl font-black leading-tight sm:text-3xl">{data.quote}</h1>
              </div>
              <div className="grid min-w-[12rem] gap-1 rounded-2xl border border-brand-900/10 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-brand-700/60 dark:text-brand-300/60">
                  <FlameIcon className="h-4 w-4" /> streak
                </div>
                <div className="text-3xl font-black">{data.streak} day{data.streak === 1 ? '' : 's'}</div>
                <div className="flex items-center gap-1 text-xs text-brand-700/60 dark:text-brand-300/60">
                  <ShieldIcon className="h-3.5 w-3.5" /> {data.shield_used ? 'shield used in this run' : 'shield intact'}
                </div>
              </div>
            </div>
          </div>

          <TaskComposer onCreate={createTask} fixedDate={data.today_date} helperText="Added for today. Complete it today — the date never moves." />

          <SectionCard title="Today's agenda" subtitle="Lined up for today only.">
            <TaskList items={data.today} onComplete={completeTask} emptyText="No tasks for today. That is either peace or danger." />
          </SectionCard>

          <SectionCard title="Completed today">
            <TaskList items={data.completed_today} emptyText="Nothing completed yet today." />
          </SectionCard>
        </div>

        <div className="grid gap-6">
          <SectionCard title="Tomorrow's agenda" action={<Link to="/plan-tomorrow" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">plan it →</Link>}>
            <TaskList items={data.tomorrow} emptyText="Nothing planned for tomorrow yet." showDate={false} />
          </SectionCard>

          <SectionCard title="Future plan" action={<Link to="/future-plans" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">view all →</Link>}>
            <TaskList items={data.future_plans.slice(0, 4)} emptyText="No future plans yet." showDate={false} />
          </SectionCard>

          <SectionCard title="Deprecated mindset" action={<Link to="/deprecated" className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-300">{data.missed_count} missed →</Link>}>
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-700 dark:text-amber-200">
              {data.mindset_note}
            </div>
          </SectionCard>
        </div>
      </main>
    </Shell>
  )
}

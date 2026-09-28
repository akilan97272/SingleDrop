import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Shell from '../components/Shell'
import TaskComposer from '../components/TaskComposer'
import TaskList from '../components/TaskList'
import QuickAddModal from '../components/QuickAddModal'
import { FlameIcon, ShieldIcon } from '../components/Icons'
import { api } from '../api'

export default function Dashboard() {
  const [data,          setData]          = useState(null)
  const [recurringOccs, setRecurringOccs] = useState([])
  const [error,         setError]         = useState('')
  const [quickAdd,      setQuickAdd]      = useState(false)

  const load = () => {
    api.dashboard().then(setData).catch(e => setError(e.message))
    api.recurringToday().then(setRecurringOccs).catch(() => {})
  }
  useEffect(() => { load() }, [])

  const createTask        = p  => api.createTask(p).then(load)
  const completeTask      = id => api.completeTask(id).then(load)
  const completeRecurring = id => api.completeOccurrence(id).then(() =>
    api.recurringToday().then(setRecurringOccs)
  )

  if (error) return (
    <Shell onQuickAdd={() => setQuickAdd(true)}>
      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="glass chip-danger rounded-2xl p-6 text-sm">{error}</div>
      </div>
    </Shell>
  )
  if (!data) return (
    <Shell onQuickAdd={() => setQuickAdd(true)}>
      <div className="mx-auto max-w-7xl px-4 py-5">
        <div className="glass animate-pulse-glow rounded-2xl p-8 text-center text-secondary-c text-sm">
          Loading your day…
        </div>
      </div>
    </Shell>
  )

  return (
    <Shell onQuickAdd={() => setQuickAdd(true)}>
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-6">

        {/*
          ════════════════════════════════════════════════════════
          TWO-COLUMN GRID — items in the SAME ROW share height
          automatically via CSS grid (align-items: stretch).

          Row 1: Quote hero (left)  │  Streak card (right)
          Row 2: Today's Agenda (left) │ Right panel (right, sticky)
          Row 3: Recurring (full-width)
          ════════════════════════════════════════════════════════
        */}
        <div className="grid gap-4 md:grid-cols-[1fr_380px] lg:grid-cols-[1fr_420px]">

          {/* ══ ROW 1 LEFT — Quote hero + Add task ══ */}
          <div className="glass overflow-hidden flex flex-col">
            {/* Quote strip */}
            <div className="p-5 pb-4 flex-shrink-0" style={{ backgroundImage: 'var(--accent-gradient)' }}>
              <p className="text-[13px] font-semibold uppercase tracking-[0.3em] text-white/60 mb-1">
                {data.day_name} · quote of the refresh
              </p>
              <p className="text-lg font-black text-white leading-snug">{data.quote}</p>
            </div>
            {/* Add task form */}
            <div className="p-4 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c mb-3">
                Add Today's Task
              </p>
              <TaskComposer
                onCreate={createTask}
                fixedDate={data.today_date}
                helperText="Completion never changes the date."
              />
            </div>
          </div>

          {/* ══ ROW 1 RIGHT — Streak card (same height as Quote+Add via grid) ══ */}
          <div className="glass overflow-hidden flex flex-col"
               style={{ backgroundImage: 'var(--accent-gradient)', border: 'none' }}>
            <div className="flex flex-col justify-center flex-1 p-6">
              {/* Label */}
              <p className="text-[13px] font-semibold uppercase tracking-[0.3em] text-white/60 flex items-center gap-1.5 mb-3">
                <FlameIcon className="h-4 w-4" /> Current Streak
              </p>
              {/* Big number */}
              <p className="text-6xl font-black text-white leading-none mb-1">
                {data.streak}
                <span className="text-2xl font-normal ml-2 text-white/70">days</span>
              </p>
              {/* Shield status */}
              <div className="flex items-center gap-2 mt-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-white/25">
                  <ShieldIcon className="h-5 w-5" style={{ stroke: 'white', opacity: data.shield_used ? 0.45 : 1 }} />
                </div>
                <p className="text-sm text-white/60">
                  Shield {data.shield_used ? 'used this run' : 'still intact'}
                </p>
              </div>
            </div>
          </div>

          {/* ══ ROW 2 LEFT — Today's Agenda + Completed + Recurring ══ */}
          <div className="grid gap-4 content-start">

            {/* Today's Agenda */}
            <div className="glass overflow-hidden">
              <div className="p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c mb-3">
                  Today's Agenda
                  <span className="ml-2 chip-accent rounded-full px-2 py-0.5 text-[13px] normal-case font-bold">
                    {data.today.length}
                  </span>
                </p>
                {/* min-h so empty state is visually balanced with the right column */}
                <div style={{ minHeight: '160px' }}>
                  <TaskList
                    items={data.today}
                    onComplete={completeTask}
                    emptyText="Nothing lined up yet. Add the first task above."
                  />
                </div>
              </div>

              {data.completed_today.length > 0 && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: 'var(--glass-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c my-3">
                    Completed today
                    <span className="ml-2 chip-success rounded-full px-2 py-0.5 text-[13px] normal-case font-bold">
                      {data.completed_today.length}
                    </span>
                  </p>
                  <TaskList items={data.completed_today} emptyText="" />
                </div>
              )}
            </div>

            {/* Recurring routines */}
            {recurringOccs.length > 0 && (
              <div className="glass p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c">
                    ↺ Routines today
                    <span className="ml-2 chip-accent rounded-full px-2 py-0.5 text-[13px] normal-case font-bold">
                      {recurringOccs.length}
                    </span>
                  </p>
                  <Link to="/recurring" className="text-xs font-semibold transition hover:opacity-80"
                        style={{ color: 'var(--accent-purple)' }}>
                    manage →
                  </Link>
                </div>
                <div className="grid gap-2">
                  {recurringOccs.map(occ => (
                    <div key={occ.id} className="glass rounded-xl p-3 transition" style={{ borderRadius: '14px' }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-primary-c" style={{ overflowWrap: 'anywhere' }}>
                              {occ.template_title}
                            </span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[13px] font-bold uppercase ${
                              occ.status === 'completed' ? 'chip-success' : occ.status === 'missed' ? 'chip-danger' : 'chip-accent'
                            }`}>
                              {occ.status === 'completed' ? 'done' : occ.status === 'missed' ? 'missed' : 'pending'}
                            </span>
                          </div>
                          {occ.template_description && (
                            <p className="mt-0.5 text-xs text-secondary-c">{occ.template_description}</p>
                          )}
                        </div>
                        {occ.status === 'pending' && (
                          <button onClick={() => completeRecurring(occ.id)}
                            className="btn-accent shrink-0 flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-white">
                            ✔ Done
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ══ ROW 2 RIGHT — Tomorrow + Future + Deprecated (sticky) ══ */}
          <div className="glass flex flex-col gap-0 overflow-hidden self-start md:sticky md:top-20">

            {/* Tomorrow */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c">Tomorrow</p>
                <Link to="/plan-tomorrow" className="text-xs font-semibold transition hover:opacity-80"
                      style={{ color: 'var(--accent-blue)' }}>
                  plan →
                </Link>
              </div>
              <TaskList items={data.tomorrow} emptyText="Nothing planned for tomorrow yet." showDate={false} />
            </div>

            {/* Future plans */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c">Future Plans</p>
                <Link to="/future-plans" className="text-xs font-semibold transition hover:opacity-80"
                      style={{ color: 'var(--accent-purple)' }}>
                  {data.future_plans.length} total →
                </Link>
              </div>
              <TaskList items={data.future_plans.slice(0, 3)} emptyText="No future plans yet." showDate={false} />
            </div>

            {/* Deprecated mindset */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c">Deprecated Mindset</p>
                {data.missed_count > 0 && (
                  <Link to="/deprecated" className="chip-danger rounded-full px-2.5 py-1 text-[13px] font-bold transition hover:opacity-80">
                    {data.missed_count} missed
                  </Link>
                )}
              </div>
              <div className="chip-warning rounded-2xl p-3 text-xs italic leading-relaxed">
                {data.mindset_note}
              </div>
            </div>

          </div>
        </div>
      </div>

      <QuickAddModal open={quickAdd} onClose={() => setQuickAdd(false)} onCreate={createTask} />
    </Shell>
  )
}
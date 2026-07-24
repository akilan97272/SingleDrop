import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Shell from '../components/Shell'
import SectionCard from '../components/SectionCard'
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

  const createTask        = (p)  => api.createTask(p).then(load)
  const completeTask      = (id) => api.completeTask(id).then(load)
  const completeRecurring = (id) => api.completeOccurrence(id).then(() =>
    api.recurringToday().then(setRecurringOccs)
  )

  /* ── loading / error ── */
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

      {/* ════════════════════════════════════════════
          ASYMMETRIC GRID
          Left col  → 2 stacked blocks
          Right col → 1 tall block
      ════════════════════════════════════════════ */}
      <div className="mx-auto grid max-w-7xl gap-4 px-4 pt-4
                      md:grid-cols-[1fr_380px] lg:grid-cols-[1fr_420px]">

        {/* ══════════ LEFT COLUMN ══════════ */}
        <div className="grid gap-4 content-start">

          {/* ── BLOCK 1: Quote + Today tasks ── */}
          <div className="glass overflow-hidden">

            {/* Quote hero strip */}
            <div className="relative p-5 pb-4"
                 style={{ backgroundImage: 'var(--accent-gradient)' }}>
              <p className="text-[13px] font-semibold uppercase tracking-[0.3em] text-white/60 mb-1">
                {data.day_name} · quote of the refresh
              </p>
              <p className="text-lg font-black text-white leading-snug">{data.quote}</p>
            </div>

            {/* Add today's task */}
            <div className="p-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c mb-3">
                Add Today's Task
              </p>
              <TaskComposer
                onCreate={createTask}
                fixedDate={data.today_date}
                helperText="Completion never changes the date."
              />
            </div>

            {/* Today's task list */}
            <div className="p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c mb-3">
                Today's Agenda
                <span className="ml-2 chip-accent rounded-full px-2 py-0.5 text-[13px] normal-case font-bold">
                  {data.today.length}
                </span>
              </p>
              <TaskList
                items={data.today}
                onComplete={completeTask}
                emptyText="Nothing lined up yet. Add the first task above."
              />
              {data.completed_today.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c mb-3">
                    Completed today
                    <span className="ml-2 chip-success rounded-full px-2 py-0.5 text-[13px] normal-case font-bold">
                      {data.completed_today.length}
                    </span>
                  </p>
                  <TaskList items={data.completed_today} emptyText="" />
                </div>
              )}
            </div>
          </div>

          {/* ── Recurring today ── */}
          {recurringOccs.length > 0 && (
            <div className="glass p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c">
                  ↺ Routines today
                  <span className="ml-2 chip-accent rounded-full px-2 py-0.5 text-[13px] normal-case font-bold">
                    {recurringOccs.length}
                  </span>
                </p>
                <Link to="/recurring"
                      className="text-xs font-semibold transition hover:opacity-80"
                      style={{ color: 'var(--accent-purple)' }}>
                  manage →
                </Link>
              </div>
              <div className="grid gap-2">
                {recurringOccs.map(occ => (
                  <div key={occ.id}
                       className="glass rounded-xl overflow-hidden p-3 transition"
                       style={{ borderRadius: '14px' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-primary-c"
                                style={{ overflowWrap: 'anywhere' }}>
                            {occ.template_title}
                          </span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[13px] font-bold uppercase ${
                            occ.status === 'completed' ? 'chip-success'
                            : occ.status === 'missed'  ? 'chip-danger'
                            : 'chip-accent'
                          }`}>
                            {occ.status === 'completed' ? 'done' : occ.status === 'missed' ? 'missed' : 'pending'}
                          </span>
                        </div>
                        {occ.template_description && (
                          <p className="mt-0.5 text-xs text-secondary-c">
                            {occ.template_description}
                          </p>
                        )}
                      </div>
                      {occ.status === 'pending' && (
                        <button
                          onClick={() => completeRecurring(occ.id)}
                          className="btn-accent shrink-0 flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-white"
                        >
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

        {/* ══════════ RIGHT COLUMN (tall card) ══════════ */}
        <div className="glass flex flex-col gap-0 overflow-hidden self-start md:sticky md:top-20">

          {/* Streak */}
          <div className="p-5 border-b" style={{ borderColor: 'var(--glass-border)', backgroundImage: 'var(--accent-gradient)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-semibold uppercase tracking-[0.3em] text-white/60 flex items-center gap-1">
                  <FlameIcon className="h-3.5 w-3.5" /> current streak
                </p>
                <p className="mt-1 text-4xl font-black text-white leading-none">
                  {data.streak}
                  <span className="text-lg font-normal ml-1 text-white/70">days</span>
                </p>
              </div>
              <div className="text-right">
                <div className="grid h-12 w-12 place-items-center rounded-2xl text-white/20 text-3xl font-black border border-white/20">
                  <ShieldIcon className="h-6 w-6" style={{ stroke: 'white', opacity: data.shield_used ? 0.5 : 1 }} />
                </div>
                <p className="mt-1 text-[13px] text-white/50">
                  {data.shield_used ? 'used' : 'intact'}
                </p>
              </div>
            </div>
          </div>

          {/* Tomorrow's agenda */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c">Tomorrow</p>
              <Link to="/plan-tomorrow"
                    className="text-xs font-semibold transition hover:opacity-80"
                    style={{ color: 'var(--accent-blue)' }}>
                plan →
              </Link>
            </div>
            <TaskList
              items={data.tomorrow}
              emptyText="Nothing planned for tomorrow yet."
              showDate={false}
            />
          </div>

          {/* Future plans */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c">Future Plans</p>
              <Link to="/future-plans"
                    className="text-xs font-semibold transition hover:opacity-80"
                    style={{ color: 'var(--accent-purple)' }}>
                {data.future_plans.length} total →
              </Link>
            </div>
            <TaskList items={data.future_plans.slice(0, 3)} emptyText="No future plans yet." showDate={false} />
          </div>

          {/* Deprecated / Mindset note */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c">Deprecated Mindset</p>
              {data.missed_count > 0 && (
                <Link to="/deprecated"
                      className="chip-danger rounded-full px-2.5 py-1 text-[13px] font-bold transition hover:opacity-80">
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

      {/* Quick Add Modal */}
      <QuickAddModal
        open={quickAdd}
        onClose={() => setQuickAdd(false)}
        onCreate={createTask}
      />

    </Shell>
  )
}
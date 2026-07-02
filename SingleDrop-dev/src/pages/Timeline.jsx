import React, { useEffect, useState } from 'react'
import Shell from '../components/Shell'
import QuickAddModal from '../components/QuickAddModal'
import { TrashIcon, PlusIcon, ChevronDown, ChevronUp, TimelineIcon } from '../components/Icons'
import { api } from '../api'

/* ── colour palette ── */
const COLORS = [
  { key: 'blue',   label: 'Ocean',  hex: 'var(--accent-blue)'              },
  { key: 'purple', label: 'Aurora', hex: 'var(--accent-purple)'            },
  { key: 'cyan',   label: 'Cyber',  hex: 'var(--accent-cyan)'              },
  { key: 'pink',   label: 'Sunset', hex: 'var(--accent-pink)'              },
  { key: 'green',  label: 'Matrix', hex: 'var(--accent-green, #39FF14)'    },
  { key: 'orange', label: 'Lava',   hex: 'var(--accent-orange, #FF7A00)'   },
]

const inputClass = 'input-glass w-full px-4 py-2.5 text-sm outline-none transition'

/* ── small helpers ── */
function fmt(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`
}

function statusStyle(status) {
  return status === 'active'    ? 'chip-success'
       : status === 'upcoming'  ? 'chip-accent'
       : 'chip-muted'
}

function todayISO() { return new Date().toISOString().slice(0,10) }

/* ────────────────────────────────────────────────
   Add-Task-to-Timeline inline form
──────────────────────────────────────────────── */
function AddTaskForm({ tlId, onDone }) {
  const [title, setTitle] = useState('')
  const [desc,  setDesc]  = useState('')
  const [start, setStart] = useState(todayISO())
  const [end,   setEnd]   = useState(todayISO())
  const [busy,  setBusy]  = useState(false)
  const [err,   setErr]   = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!title.trim()) { setErr('Title required.'); return }
    if (end < start)   { setErr('End date must be ≥ start date.'); return }
    setBusy(true)
    try {
      await api.addTimelineTask(tlId, { title: title.trim(), description: desc.trim(), start_date: start, end_date: end })
      setTitle(''); setDesc(''); setStart(todayISO()); setEnd(todayISO())
      onDone()
    } catch (ex) { setErr(ex.message) }
    finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="glass grid gap-2 p-3 mt-2" style={{ borderRadius: '16px' }}>
      <p className="text-[13px] font-semibold uppercase tracking-widest text-secondary-c">Add nested task</p>
      <input className={inputClass} placeholder="Task title (e.g. Python)" value={title} onChange={e => setTitle(e.target.value)} />
      <input className={inputClass} placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[13px] text-disabled-c uppercase tracking-wide">Start</label>
          <input className={inputClass} type="date" value={start} onChange={e => setStart(e.target.value)} />
        </div>
        <div>
          <label className="text-[13px] text-disabled-c uppercase tracking-wide">End</label>
          <input className={inputClass} type="date" min={start} value={end} onChange={e => setEnd(e.target.value)} />
        </div>
      </div>
      {err && <p className="chip-danger rounded-xl px-3 py-1.5 text-xs">{err}</p>}
      <button disabled={busy} className="btn-accent flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold disabled:opacity-60" style={{ borderRadius: '12px' }}>
        <PlusIcon className="h-4 w-4" /> {busy ? 'Adding…' : 'Add Task'}
      </button>
    </form>
  )
}

/* ────────────────────────────────────────────────
   Single timeline card (expanded / collapsed)
──────────────────────────────────────────────── */
function ProgressBar({ value, color }) {
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--glass-border)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(value*100)}%`, background: color }} />
    </div>
  )
}

function TLCard({ tl, onDelete, onTaskDelete, onRefresh }) {
  const [open, setOpen]       = useState(true)
  const [adding, setAdding]   = useState(false)
  const colorHex = COLORS.find(c => c.key === tl.color)?.hex || 'var(--accent-blue)'

  return (
    <div className="glass overflow-hidden" style={{ borderLeft: `3px solid ${colorHex}` }}>

      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
           style={{ borderBottom: open ? '1px solid var(--glass-border)' : 'none' }}
           onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full" style={{ background: colorHex }} />
          <span className="font-black text-primary-c">{tl.name}</span>
          {tl.is_active_today && (
            <span className="chip-success rounded-full px-2 py-0.5 text-[13px] font-bold uppercase">active today</span>
          )}
          <span className="text-xs text-disabled-c">
            {tl.tasks.length} task{tl.tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); onDelete(tl.id) }}
            className="chip-danger grid h-7 w-7 place-items-center rounded-full opacity-60 hover:opacity-100 transition"
            title="Delete timeline"
          >
            <TrashIcon />
          </button>
          {open ? <ChevronUp /> : <ChevronDown />}
        </div>
      </div>

      {open && (
        <div className="p-4 grid gap-2">

          {/* task rows */}
          {tl.tasks.length === 0 && (
            <p className="text-sm text-secondary-c italic text-center py-2">No tasks yet. Add one below.</p>
          )}
          {tl.tasks.map(t => (
            <div key={t.id}
                 className={`glass rounded-xl p-3 transition ${t.is_today ? 'brightness-110' : ''}`}
                 style={t.is_today ? { background: `color-mix(in srgb, ${colorHex} 8%, transparent)` } : undefined}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-primary-c">{t.title}</span>
                    <span className={`${statusStyle(t.status)} rounded-full px-2 py-0.5 text-[13px] font-bold uppercase`}>
                      {t.status}
                    </span>
                    {t.is_today && <span className="text-[13px] font-bold" style={{ color: colorHex }}>◆ today</span>}
                  </div>
                  {t.description && (
                    <p className="text-xs text-disabled-c mb-1.5 truncate">#{t.description}</p>
                  )}
                  <ProgressBar value={t.progress} color={colorHex} />
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-[13px] text-disabled-c">
                      {fmt(t.start_date)} → {fmt(t.end_date)}
                    </span>
                    <span className="text-[13px] text-secondary-c">
                      {t.days_elapsed}/{t.days_total}d &nbsp; {Math.round(t.progress*100)}%
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onTaskDelete(tl.id, t.id)}
                  className="chip-danger shrink-0 grid h-6 w-6 place-items-center rounded-full opacity-50 hover:opacity-100 transition mt-0.5"
                  title="Remove task"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}

          {/* Add task toggle */}
          <button
            onClick={() => setAdding(a => !a)}
            className="btn-ghost-glass flex items-center justify-center gap-1.5 rounded-xl border border-[var(--glass-border)] py-2 text-xs font-semibold text-secondary-c hover:text-primary-c transition mt-1"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {adding ? 'Cancel' : 'Add nested task'}
          </button>
          {adding && <AddTaskForm tlId={tl.id} onDone={() => { setAdding(false); onRefresh() }} />}
        </div>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────
   Create timeline form
──────────────────────────────────────────────── */
function CreateTimelineForm({ onCreated }) {
  const [name,  setName]  = useState('')
  const [color, setColor] = useState('blue')
  const [busy,  setBusy]  = useState(false)
  const [err,   setErr]   = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!name.trim()) { setErr('Name required.'); return }
    setBusy(true)
    try { await api.createTimeline({ name: name.trim(), color }); setName(''); onCreated() }
    catch (ex) { setErr(ex.message) }
    finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="glass p-4 grid gap-3" style={{ borderRadius: '20px' }}>
      <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c">New Timeline</p>
      <input
        className={inputClass}
        placeholder="Timeline name (e.g. Training, Study Sprint)"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      {/* Colour picker */}
      <div>
        <p className="text-[13px] text-disabled-c uppercase tracking-wide mb-2">Colour</p>
        <div className="flex flex-wrap gap-2">
          {COLORS.map(c => (
            <button
              key={c.key}
              type="button"
              onClick={() => setColor(c.key)}
              title={c.label}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                color === c.key ? 'border-white/40 text-white' : 'btn-ghost-glass border-[var(--glass-border)] text-secondary-c'
              }`}
              style={color === c.key ? { background: c.hex } : undefined}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.hex }} />
              {c.label}
            </button>
          ))}
        </div>
      </div>
      {err && <p className="chip-danger rounded-xl px-3 py-2 text-xs">{err}</p>}
      <button disabled={busy} className="btn-accent py-3 font-bold disabled:opacity-60 flex items-center justify-center gap-2" style={{ borderRadius: '14px' }}>
        <PlusIcon className="h-4 w-4" />
        {busy ? 'Creating…' : 'Create Timeline'}
      </button>
    </form>
  )
}

/* ────────────────────────────────────────────────
   PAGE
──────────────────────────────────────────────── */
export default function TimelinePage() {
  const [timelines, setTimelines] = useState([])
  const [error,     setError]     = useState('')
  const [quickAdd,  setQuickAdd]  = useState(false)

  const load = () => api.timelines().then(setTimelines).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const deleteTimeline = (id)       => api.deleteTimeline(id).then(load)
  const deleteTask     = (id, tid)  => api.deleteTimelineTask(id, tid).then(load)
  const createTask     = (p)        => api.createTask(p).then(() => {})

  return (
    <Shell onQuickAdd={() => setQuickAdd(true)}>
      <div className="mx-auto max-w-7xl px-4 py-4 grid gap-5">

        {/* Hero */}
        <div className="glass p-5 flex items-center gap-4"
             style={{ backgroundImage: 'var(--hero-gradient)', border: 'none' }}>
          <TimelineIcon className="h-8 w-8 text-white shrink-0" />
          <div>
            <h1 className="text-2xl font-black text-white">Timeline</h1>
            <p className="text-sm text-white/70 mt-0.5">
              Frame a span of days and nest tasks inside — classes, sprints, projects.
            </p>
          </div>
        </div>

        {/* Create form */}
        <CreateTimelineForm onCreated={load} />

        {/* Error */}
        {error && <div className="glass chip-danger rounded-2xl p-4 text-sm">{error}</div>}

        {/* Timeline list */}
        {timelines.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-secondary-c text-sm"
               style={{ borderStyle: 'dashed' }}>
            No timelines yet. Create your first one above.
          </div>
        ) : (
          <div className="grid gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c">
              {timelines.length} timeline{timelines.length !== 1 ? 's' : ''}
            </p>
            {timelines.map(tl => (
              <TLCard
                key={tl.id}
                tl={tl}
                onDelete={deleteTimeline}
                onTaskDelete={deleteTask}
                onRefresh={load}
              />
            ))}
          </div>
        )}

      </div>

      <QuickAddModal open={quickAdd} onClose={() => setQuickAdd(false)} onCreate={createTask} />
    </Shell>
  )
}

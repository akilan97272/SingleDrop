import React, { useEffect, useState, useCallback } from 'react'
import Shell from '../components/Shell'
import QuickAddModal from '../components/QuickAddModal'
import { CheckIcon, XIcon, TrashIcon, RecurringIcon } from '../components/Icons'
import { api } from '../api'

/* ── constants ── */
const RULES = [
  { value: 'daily',            label: 'Every day'            },
  { value: 'weekdays',         label: 'Every weekday'        },
  { value: 'weekends',         label: 'Weekends only'        },
  { value: 'weekly',           label: 'Every week'           },
  { value: 'monthly',          label: 'Monthly'              },
  { value: 'every_n_days',     label: 'Every N days'         },
  { value: 'every_n_weeks',    label: 'Every N weeks'        },
  { value: 'selected_weekdays',label: 'Selected weekdays'    },
]

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

const STATUS_STYLE = {
  completed: 'chip-success',
  missed:    'chip-danger',
  pending:   'chip-accent',
}

/* ── helpers ── */
function todayISO() { return new Date().toISOString().slice(0, 10) }

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

const inputClass = 'input-glass w-full px-3 py-2.5 text-sm outline-none transition'

/* ═══════════════════════════════════════════════════
   CREATE / EDIT FORM
═══════════════════════════════════════════════════ */
function TemplateForm({ initial, onSave, onCancel }) {
  const [title,    setTitle]    = useState(initial?.title       || '')
  const [desc,     setDesc]     = useState(initial?.description || '')
  const [rule,     setRule]     = useState(initial?.rule        || 'daily')
  const [interval, setInterval] = useState(initial?.interval    || 2)
  const [weekdays, setWeekdays] = useState(initial?.weekdays    || [])
  const [start,    setStart]    = useState(initial?.start_date  || todayISO())
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState('')

  const needsInterval = rule === 'every_n_days' || rule === 'every_n_weeks'
  const needsWeekdays = rule === 'selected_weekdays'

  const toggleDay = (d) =>
    setWeekdays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!title.trim()) { setErr('Title required.'); return }
    if (needsWeekdays && weekdays.length === 0) { setErr('Select at least one weekday.'); return }
    setBusy(true)
    try {
      const payload = {
        title: title.trim(), description: desc.trim(),
        rule, interval, weekdays, start_date: start,
      }
      await onSave(payload)
    } catch (ex) {
      setErr(ex.message || 'Error saving.')
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="glass grid gap-3 p-4" style={{ borderRadius: '20px' }}>
      <input className={inputClass} placeholder="Task title (e.g. Read 10 pages)"
        value={title} onChange={e => setTitle(e.target.value)} />
      <input className={inputClass} placeholder="Description (optional)"
        value={desc} onChange={e => setDesc(e.target.value)} />

      {/* Rule */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-secondary-c">
            Recurrence
          </label>
          <select className={inputClass} value={rule} onChange={e => setRule(e.target.value)}>
            {RULES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        {needsInterval && (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-secondary-c">
              Every N
            </label>
            <input className={inputClass} type="number" min="2" max="365"
              value={interval} onChange={e => setInterval(+e.target.value)} />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-secondary-c">
            Start date
          </label>
          <input className={inputClass} type="date" value={start} onChange={e => setStart(e.target.value)} />
        </div>
      </div>

      {/* Weekday picker */}
      {needsWeekdays && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-secondary-c">
            Days
          </label>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, i) => (
              <button key={i} type="button"
                onClick={() => toggleDay(i)}
                className={`h-9 w-11 rounded-xl text-sm font-bold transition ${
                  weekdays.includes(i)
                    ? 'border-transparent text-white'
                    : 'btn-ghost-glass border border-[var(--glass-border)]'
                }`}
                style={weekdays.includes(i) ? { backgroundImage: 'var(--accent-gradient)' } : undefined}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {err && <p className="chip-danger rounded-xl px-3 py-2 text-xs">{err}</p>}

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="btn-ghost-glass rounded-xl border border-[var(--glass-border)] px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
        )}
        <button disabled={busy}
          className="btn-accent rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Create'}
        </button>
      </div>
    </form>
  )
}

/* ═══════════════════════════════════════════════════
   OCCURRENCE HISTORY (per template)
═══════════════════════════════════════════════════ */
function OccurrenceHistory({ tplId, onClose }) {
  const [occs, setOccs] = useState([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes]     = useState({}) // id -> draft notes string
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    api.recurringHistoryFor(tplId)
      .then(setOccs)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [tplId])

  const saveNotes = async (occ) => {
    const n = notes[occ.id] ?? occ.notes ?? ''
    await api.updateOccurrenceNotes(occ.id, { notes: n })
    setOccs(prev => prev.map(o => o.id === occ.id ? { ...o, notes: n } : o))
  }

  if (loading) return <div className="py-4 text-center text-sm text-secondary-c">Loading…</div>

  if (!occs.length) return (
    <div className="py-6 text-center text-sm italic text-secondary-c">
      No history yet. Complete today's occurrence to start.
    </div>
  )

  return (
    <div className="grid gap-2 max-h-96 overflow-y-auto pr-1">
      {occs.map(occ => (
        <div key={occ.id} className="glass rounded-2xl overflow-hidden" style={{ borderRadius: '14px' }}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer"
               onClick={() => setExpanded(expanded === occ.id ? null : occ.id)}>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-semibold text-primary-c">
                {fmtDate(occ.date)}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold uppercase ${STATUS_STYLE[occ.status]}`}>
                {occ.status === 'completed' ? '✔' : occ.status === 'missed' ? '✖' : '…'}
              </span>
              {occ.completed_at && (
                <span className="text-xs text-disabled-c">{fmtTime(occ.completed_at)}</span>
              )}
              {occ.difficulty && (
                <span className="text-xs text-secondary-c">
                  {'★'.repeat(occ.difficulty)}{'☆'.repeat(5 - occ.difficulty)}
                </span>
              )}
            </div>
            <span className="text-disabled-c text-sm">{expanded === occ.id ? '▴' : '▾'}</span>
          </div>

          {expanded === occ.id && (
            <div className="border-t px-4 py-3 grid gap-2" style={{ borderColor: 'var(--glass-border)' }}>
              {occ.reflection && (
                <p className="text-sm text-secondary-c italic">"{occ.reflection}"</p>
              )}
              <textarea
                className={`${inputClass} min-h-16 text-xs`}
                placeholder="Add notes…"
                defaultValue={occ.notes || ''}
                onChange={e => setNotes(prev => ({ ...prev, [occ.id]: e.target.value }))}
              />
              <button onClick={() => saveNotes(occ)}
                className="self-end btn-accent rounded-xl px-3 py-1.5 text-xs font-bold text-white">
                Save notes
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   TEMPLATE CARD
═══════════════════════════════════════════════════ */
function TemplateCard({ tpl, onRefresh }) {
  const [editing,  setEditing]  = useState(false)
  const [history,  setHistory]  = useState(false)
  const [busy,     setBusy]     = useState(false)

  const act = async (fn) => { setBusy(true); try { await fn() } finally { setBusy(false) } }

  const handleEdit = async (payload) => {
    await api.updateRecurring(tpl.id, payload)
    setEditing(false)
    onRefresh()
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${tpl.title}" and all its history?`)) return
    await api.deleteRecurring(tpl.id)
    onRefresh()
  }

  return (
    <div className={`glass overflow-hidden transition ${tpl.paused ? 'opacity-60' : ''}`}
         style={{ borderRadius: '20px', borderLeft: `3px solid ${tpl.paused ? 'var(--text-disabled)' : 'var(--accent-blue)'}` }}>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-primary-c">{tpl.title}</span>
            {tpl.paused && (
              <span className="chip-muted rounded-full px-2 py-0.5 text-[13px] font-bold uppercase">paused</span>
            )}
          </div>
          {tpl.description && (
            <p className="mt-0.5 text-sm text-secondary-c" style={{ overflowWrap: 'anywhere' }}>
              {tpl.description}
            </p>
          )}
          <p className="mt-1 text-xs text-disabled-c">{tpl.rule_label}</p>
          <div className="mt-1 flex gap-3 text-xs text-secondary-c">
            <span className="chip-success rounded-full px-2 py-0.5">✔ {tpl.completed_count}</span>
            <span className="chip-danger rounded-full px-2 py-0.5">✖ {tpl.missed_count}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            onClick={() => act(() => tpl.paused ? api.resumeRecurring(tpl.id) : api.pauseRecurring(tpl.id)).then(onRefresh)}
            disabled={busy}
            className="btn-ghost-glass rounded-xl border border-[var(--glass-border)] px-3 py-1.5 text-xs font-semibold disabled:opacity-50">
            {tpl.paused ? 'Resume' : 'Pause'}
          </button>
          <button onClick={() => setEditing(e => !e)}
            className="btn-ghost-glass rounded-xl border border-[var(--glass-border)] px-3 py-1.5 text-xs font-semibold">
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button onClick={handleDelete}
            className="chip-danger grid h-8 w-8 place-items-center rounded-xl opacity-60 hover:opacity-100 transition">
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="border-t px-4 pb-4" style={{ borderColor: 'var(--glass-border)' }}>
          <div className="pt-3">
            <TemplateForm initial={tpl} onSave={handleEdit} onCancel={() => setEditing(false)} />
          </div>
        </div>
      )}

      {/* History toggle */}
      <div className="border-t" style={{ borderColor: 'var(--glass-border)' }}>
        <button
          onClick={() => setHistory(h => !h)}
          className="w-full px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-secondary-c transition hover:text-primary-c">
          {history ? '▴ Hide history' : '▾ View history'}
        </button>
        {history && (
          <div className="px-4 pb-4">
            <OccurrenceHistory tplId={tpl.id} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════ */
export default function RecurringPage() {
  const [templates,  setTemplates]  = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [quickAdd,   setQuickAdd]   = useState(false)
  const [error,      setError]      = useState('')

  const load = useCallback(() =>
    api.recurringTemplates().then(setTemplates).catch(e => setError(e.message)), [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (payload) => {
    await api.createRecurring(payload)
    setShowCreate(false)
    load()
  }

  const active = templates.filter(t => !t.paused)
  const paused = templates.filter(t => t.paused)

  return (
    <Shell onQuickAdd={() => setQuickAdd(true)}>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5">

        {/* Hero */}
        <div className="glass flex items-center gap-4 overflow-hidden p-5"
             style={{ backgroundImage: 'var(--accent-gradient)', border: 'none' }}>
          <RecurringIcon className="h-8 w-8 shrink-0 text-white" />
          <div>
            <h1 className="text-2xl font-black text-white">Recurring Tasks</h1>
            <p className="mt-0.5 text-sm text-white/70">
              Routines, not reminders. Only today's occurrence ever appears.
            </p>
          </div>
        </div>

        {error && <div className="glass chip-danger rounded-2xl p-4 text-sm">{error}</div>}

        {/* Create */}
        <div className="glass p-4" style={{ borderRadius: '20px' }}>
          <button
            onClick={() => setShowCreate(s => !s)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-sm font-bold uppercase tracking-widest text-secondary-c">
              New recurring task
            </span>
            <span className="text-disabled-c">{showCreate ? '▴' : '▾'}</span>
          </button>
          {showCreate && (
            <div className="mt-4">
              <TemplateForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
            </div>
          )}
        </div>

        {/* Active */}
        {active.length > 0 && (
          <div className="grid gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c">
              Active — {active.length}
            </p>
            {active.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} onRefresh={load} />)}
          </div>
        )}

        {/* Paused */}
        {paused.length > 0 && (
          <div className="grid gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c">
              Paused — {paused.length}
            </p>
            {paused.map(tpl => <TemplateCard key={tpl.id} tpl={tpl} onRefresh={load} />)}
          </div>
        )}

        {templates.length === 0 && (
          <div className="glass rounded-2xl p-10 text-center text-sm italic text-secondary-c"
               style={{ borderStyle: 'dashed' }}>
            No recurring tasks yet. Create one above.
          </div>
        )}
      </div>

      <QuickAddModal open={quickAdd} onClose={() => setQuickAdd(false)}
        onCreate={p => api.createTask(p)} />
    </Shell>
  )
}

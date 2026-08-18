import React, { useCallback, useEffect, useState } from 'react'
import Shell from '../components/Shell'
import QuickAddModal from '../components/QuickAddModal'
import TagChip, { TAG_COLORS } from '../components/TagChip'
import { PromiseIcon, TrashIcon, CheckIcon, XIcon } from '../components/Icons'
import { api } from '../api'

/* ── helpers ── */
const fmtM  = m => { if (!m||m<1) return '—'; if (m<60) return `${Math.round(m)}m`; const h=Math.floor(m/60),mm=Math.round(m%60); return mm?`${h}h ${mm}m`:`${h}h` }
const fmtD  = iso => iso ? new Date(iso+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}) : '—'
const today = () => new Date().toISOString().slice(0,10)
const inputClass = 'input-glass w-full px-3 py-2.5 text-sm outline-none transition'

const STATUS_STYLE = { active:'chip-accent', completed:'chip-success', broken:'chip-danger' }
const STATUS_LABEL = { active:'Active', completed:'Completed', broken:'Broken' }

/* ── Create / Edit Form ── */
function PromiseForm({ initial, onSave, onCancel }) {
  const [title, setTitle]     = useState(initial?.title || '')
  const [desc,  setDesc]      = useState(initial?.description || '')
  const [tags,  setTags]      = useState(initial?.tags || [])
  const [start, setStart]     = useState(initial?.start_date || today())
  const [end,   setEnd]       = useState(initial?.end_date || '')
  const [allTags, setAllTags] = useState([])
  const [newTag,  setNewTag]  = useState('')
  const [newColor,setNewColor]= useState('blue')
  const [busy,  setBusy]      = useState(false)
  const [err,   setErr]       = useState('')

  useEffect(() => { api.tags().then(setAllTags).catch(() => {}) }, [])

  const toggleTag = id => setTags(prev => prev.includes(id) ? prev.filter(t=>t!==id) : [...prev, id])

  const addTag = async () => {
    if (!newTag.trim()) return
    const t = await api.createTag({ name: newTag.trim(), color: newColor })
    setAllTags(prev => [...prev.filter(x=>x.id!==t.id), t].sort((a,b)=>a.name.localeCompare(b.name)))
    setTags(prev => [...prev.filter(id=>id!==t.id), t.id])
    setNewTag('')
  }

  const submit = async e => {
    e.preventDefault()
    if (!title.trim()) { setErr('Title required.'); return }
    setBusy(true)
    try {
      await onSave({ title: title.trim(), description: desc.trim(), tags, start_date: start || null, end_date: end || null })
    } catch (ex) { setErr(ex.message) }
    finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="glass grid gap-3 p-4" style={{ borderRadius:'18px' }}>
      <input className={inputClass} placeholder="Promise title" value={title} onChange={e=>setTitle(e.target.value)} />
      <textarea className={`${inputClass} min-h-20`} placeholder="Description (optional)" value={desc} onChange={e=>setDesc(e.target.value)} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-secondary-c">Start date</label>
          <input className={inputClass} type="date" value={start} onChange={e=>setStart(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-secondary-c">End date (optional)</label>
          <input className={inputClass} type="date" min={start} value={end} onChange={e=>setEnd(e.target.value)} />
        </div>
      </div>

      {/* Tag picker */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-secondary-c">Tags</label>
        {allTags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {allTags.map(t => (
              <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                  tags.includes(t.id) ? 'border-transparent text-white' : 'btn-ghost-glass border-[var(--glass-border)] opacity-60 hover:opacity-100'
                }`}
                style={tags.includes(t.id) ? { backgroundImage:'var(--accent-gradient)' } : undefined}>
                {t.name}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input className="input-glass flex-1 px-3 py-1.5 text-xs outline-none" placeholder="New tag…"
            value={newTag} onChange={e=>setNewTag(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'){e.preventDefault();addTag()} }} />
          <select className="input-glass px-2 py-1.5 text-xs outline-none" value={newColor} onChange={e=>setNewColor(e.target.value)}>
            {TAG_COLORS.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <button type="button" onClick={addTag} className="btn-accent rounded-xl px-3 py-1.5 text-xs font-bold text-white">+ Add</button>
        </div>
      </div>

      {err && <p className="chip-danger rounded-xl px-3 py-2 text-xs">{err}</p>}
      <div className="flex gap-2 justify-end">
        {onCancel && <button type="button" onClick={onCancel} className="btn-ghost-glass rounded-xl border border-[var(--glass-border)] px-4 py-2 text-sm font-semibold">Cancel</button>}
        <button disabled={busy} className="btn-accent rounded-xl px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
          {busy ? 'Saving…' : initial ? 'Save changes' : 'Make this Promise'}
        </button>
      </div>
    </form>
  )
}

/* ── Promise Card ── */
function PromiseCard({ promise, tagMap, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [busy,     setBusy]     = useState(false)

  const act = async fn => { setBusy(true); try { await fn() } finally { setBusy(false); onRefresh() } }

  const statusStyle = {
    active:    { border: 'var(--accent-blue)' },
    completed: { border: 'var(--success)' },
    broken:    { border: 'var(--danger)' },
  }[promise.status] || { border: 'var(--glass-border)' }

  return (
    <div className="glass overflow-hidden" style={{ borderRadius:'20px', borderLeft:`3px solid ${statusStyle.border}` }}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 p-4 cursor-pointer"
           onClick={() => { if (!editing) setExpanded(e=>!e) }}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-black text-primary-c" style={{ overflowWrap:'anywhere' }}>{promise.title}</span>
            <span className={`${STATUS_STYLE[promise.status]} rounded-full px-2.5 py-0.5 text-[13px] font-bold uppercase`}>
              {STATUS_LABEL[promise.status]}
            </span>
          </div>
          {promise.description && (
            <p className="mt-0.5 text-sm text-secondary-c" style={{ overflowWrap:'anywhere' }}>{promise.description}</p>
          )}
          {promise.tags?.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {promise.tags.map(tid => tagMap[tid]
                ? <TagChip key={tid} tag={tagMap[tid]} small />
                : <span key={tid} className="chip-muted rounded-full px-2 py-0.5 text-[11px] font-semibold">{tid}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex shrink-0 gap-2" onClick={e=>e.stopPropagation()}>
          {promise.status === 'active' && (
            <>
              <button onClick={() => act(() => api.completePromise(promise.id))} disabled={busy}
                className="btn-accent flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                <CheckIcon /> Kept
              </button>
              <button onClick={() => act(() => api.breakPromise(promise.id))} disabled={busy}
                className="chip-danger flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition hover:brightness-110 disabled:opacity-50">
                <XIcon /> Broke
              </button>
            </>
          )}
          <button onClick={() => setEditing(e=>!e)} className="btn-ghost-glass rounded-xl border border-[var(--glass-border)] px-3 py-2 text-xs font-semibold">
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button onClick={() => act(() => api.deletePromise(promise.id))}
            className="chip-danger grid h-8 w-8 place-items-center rounded-xl opacity-50 hover:opacity-100 transition">
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="border-t px-4 pb-4 pt-3" style={{ borderColor:'var(--glass-border)' }}>
          <PromiseForm initial={promise} onSave={async p => { await api.updatePromise(promise.id, p); setEditing(false); onRefresh() }} onCancel={() => setEditing(false)} />
        </div>
      )}

      {/* Expanded detail */}
      {expanded && !editing && (
        <div className="border-t px-4 pb-4" style={{ borderColor:'var(--glass-border)' }}>
          <div className="grid grid-cols-2 gap-3 pt-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              { label:'Start date',    value: fmtD(promise.start_date) },
              { label:'End date',      value: promise.end_date ? fmtD(promise.end_date) : '—' },
              { label:'Completed',     value: promise.completed_date ? fmtD(promise.completed_date) : promise.broken_date ? fmtD(promise.broken_date) : '—' },
              { label:'Days taken',    value: promise.days_taken != null ? `${promise.days_taken}d` : '—' },
              { label:'Total focus',   value: fmtM(promise.total_focus_minutes) },
              { label:'Sessions',      value: promise.total_sessions || '—' },
              { label:'Avg session',   value: fmtM(promise.avg_session_minutes) },
            ].map(({ label, value }) => (
              <div key={label} className="glass rounded-xl p-3" style={{ borderRadius:'12px' }}>
                <div className="text-xs font-semibold uppercase tracking-wider text-secondary-c mb-0.5">{label}</div>
                <div className="font-black text-primary-c">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Page ── */
export default function PromisesPage() {
  const [promises,  setPromises]  = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [tagMap,    setTagMap]    = useState({})
  const [filter,    setFilter]    = useState('all')
  const [showCreate,setShowCreate]= useState(false)
  const [quickAdd,  setQuickAdd]  = useState(false)
  const [error,     setError]     = useState('')

  const load = useCallback(() => {
    api.promises().then(setPromises).catch(e => setError(e.message))
    api.promiseAnalytics().then(setAnalytics).catch(() => {})
    api.tags().then(ts => setTagMap(Object.fromEntries(ts.map(t=>[t.id,t])))).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const create = async payload => {
    await api.createPromise(payload)
    setShowCreate(false)
    load()
  }

  const filtered = filter === 'all' ? promises : promises.filter(p => p.status === filter)

  return (
    <Shell onQuickAdd={() => setQuickAdd(true)}>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5">

        {/* Hero */}
        <div className="glass flex items-center gap-4 p-5" style={{ backgroundImage:'var(--hero-gradient)', border:'none' }}>
          <PromiseIcon className="h-8 w-8 shrink-0 text-white" />
          <div>
            <h1 className="text-2xl font-black text-white">Promises</h1>
            <p className="mt-0.5 text-sm text-white/70">Long-term personal commitments. Not tasks — deeper than that.</p>
          </div>
        </div>

        {error && <div className="glass chip-danger rounded-2xl p-4 text-sm">{error}</div>}

        {/* Analytics */}
        {analytics && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label:'Active',           value: analytics.active,                        cls:'chip-accent'   },
              { label:'Completed',        value: analytics.completed,                     cls:'chip-success'  },
              { label:'Broken',           value: analytics.broken,                        cls:'chip-danger'   },
              { label:'Avg completion',   value: analytics.avg_completion_days ? `${analytics.avg_completion_days}d` : '—', cls:'' },
              { label:'Total focus',      value: analytics.total_focus_hours ? `${analytics.total_focus_hours}h` : '—', cls:'' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="glass rounded-2xl p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-secondary-c mb-1">{label}</div>
                <div className={`text-2xl font-black ${cls || 'text-primary-c'}`}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter + Create toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="glass-pill flex gap-1 p-1">
            {['all','active','completed','broken'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition ${filter===f ? 'text-white' : 'text-secondary-c hover:text-primary-c'}`}
                style={filter===f ? { backgroundImage:'var(--accent-gradient)' } : undefined}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={() => setShowCreate(s=>!s)}
            className="btn-accent rounded-xl px-5 py-2.5 text-sm font-bold text-white">
            {showCreate ? 'Cancel' : '+ New Promise'}
          </button>
        </div>

        {/* Create form */}
        {showCreate && <PromiseForm onSave={create} onCancel={() => setShowCreate(false)} />}

        {/* Promise list */}
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-sm italic text-secondary-c" style={{ borderStyle:'dashed' }}>
            {filter === 'all' ? 'No promises yet. Make one above.' : `No ${filter} promises.`}
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(p => <PromiseCard key={p.id} promise={p} tagMap={tagMap} onRefresh={load} />)}
          </div>
        )}
      </div>

      <QuickAddModal open={quickAdd} onClose={() => setQuickAdd(false)} onCreate={p => api.createTask(p)} />
    </Shell>
  )
}

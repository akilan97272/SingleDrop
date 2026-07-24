import React, { useEffect, useState, useCallback } from 'react'
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import Shell from '../components/Shell'
import TagChip, { TAG_COLORS, getTagStyle } from '../components/TagChip'
import QuickAddModal from '../components/QuickAddModal'
import { TagIcon, TrashIcon, XIcon } from '../components/Icons'
import { api } from '../api'

/* ── helpers ── */
const fmtM = m => {
  if (!m || m < 1) return '—'
  if (m < 60) return `${Math.round(m)}m`
  const h = Math.floor(m/60), mm = Math.round(m%60)
  return mm ? `${h}h ${mm}m` : `${h}h`
}
const fmtD = iso => iso ? new Date(iso+'T00:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'}) : '—'
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim()

/* ── Create Tag Form ── */
function CreateTagForm({ onCreated }) {
  const [name, setName]   = useState('')
  const [color, setColor] = useState('blue')
  const [busy, setBusy]   = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try { await api.createTag({ name: name.trim(), color }); setName(''); onCreated() }
    catch (_) {} finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 items-center">
      <input className="input-glass flex-1 min-w-36 px-3 py-2 text-sm outline-none"
        placeholder="New tag name…" value={name} onChange={e => setName(e.target.value)} />
      <select className="input-glass px-3 py-2 text-sm outline-none" value={color} onChange={e => setColor(e.target.value)}>
        {TAG_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <button disabled={busy} className="btn-accent rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
        {busy ? 'Adding…' : '+ Create'}
      </button>
    </form>
  )
}

/* ── Tag Detail Drawer ── */
function TagDetail({ tagId, onClose }) {
  const [data, setData] = useState(null)
  useEffect(() => { tagId && api.tagDetail(tagId).then(setData).catch(() => {}) }, [tagId])

  if (!data) return <div className="glass p-8 text-center text-sm text-secondary-c animate-pulse-glow">Loading…</div>

  const { tag, total_focus_minutes, completed_tasks, total_sessions, avg_session_minutes, sessions, tasks } = data

  return (
    <div className="glass overflow-hidden" style={{ borderRadius:'20px' }}>
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor:'var(--glass-border)' }}>
        <div className="flex items-center gap-3">
          <TagChip tag={tag} />
          <span className="text-sm text-secondary-c">Detail view</span>
        </div>
        <button onClick={onClose} className="chip-muted grid h-7 w-7 place-items-center rounded-full hover:brightness-110 transition">
          <XIcon />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        {[
          { label:'Total focus',     value: fmtM(total_focus_minutes)  },
          { label:'Completed tasks', value: completed_tasks             },
          { label:'Sessions',        value: total_sessions              },
          { label:'Avg session',     value: fmtM(avg_session_minutes)   },
        ].map(({ label, value }) => (
          <div key={label} className="glass rounded-2xl p-3" style={{ borderRadius:'14px' }}>
            <div className="text-xs font-semibold uppercase tracking-wider text-secondary-c mb-1">{label}</div>
            <div className="text-xl font-black text-primary-c">{value || '—'}</div>
          </div>
        ))}
      </div>

      {sessions.length > 0 && (
        <div className="px-4 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c mb-2">Sessions</p>
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {sessions.map((s,i) => (
              <div key={i} className="glass rounded-xl px-3 py-2 flex items-center justify-between gap-3" style={{ borderRadius:'12px' }}>
                <span className="font-mono text-sm text-primary-c">{fmtD(s.date)}</span>
                <span className="text-sm text-secondary-c">{fmtM(s.focus_minutes)}</span>
                {s.reflection != null && <span className="text-xs text-disabled-c">Focus {'★'.repeat(s.reflection)}{'☆'.repeat(5-s.reflection)}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="px-4 pb-4 border-t pt-4" style={{ borderColor:'var(--glass-border)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary-c mb-2">Completed Tasks</p>
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {tasks.map((t,i) => (
              <div key={i} className="glass rounded-xl px-3 py-2 flex items-center justify-between gap-3" style={{ borderRadius:'12px' }}>
                <span className="text-sm text-primary-c" style={{ overflowWrap:'anywhere' }}>{t.title}</span>
                <span className="text-xs text-disabled-c shrink-0">{fmtD(t.completed_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Page ── */
export default function TagsPage() {
  const [tags,      setTags]      = useState([])
  const [analytics, setAnalytics] = useState([])
  const [selected,  setSelected]  = useState(null)
  const [quickAdd,  setQuickAdd]  = useState(false)
  const [error,     setError]     = useState('')

  const load = useCallback(() => {
    api.tags().then(setTags).catch(e => setError(e.message))
    api.tagAnalytics().then(setAnalytics).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const removeTag = async id => {
    if (!window.confirm('Delete this tag? It will be removed from all tasks.')) return
    await api.deleteTag(id)
    if (selected === id) setSelected(null)
    load()
  }

  const pieData = analytics.filter(t => t.total_focus_minutes > 0).map(t => ({ name:t.name, value:t.total_focus_minutes, color:t.color, id:t.id }))
  const barData = analytics.filter(t => t.completed_tasks > 0).map(t => ({ name:t.name, tasks:t.completed_tasks, color:t.color, id:t.id }))

  const grid = cssVar('--glass-border')
  const txt  = cssVar('--text-disabled')
  const axP  = { tick:{ fill:txt, fontSize:11 }, stroke:grid }

  const totalFocus     = analytics.reduce((s,t) => s + t.total_focus_minutes, 0)
  const totalCompleted = analytics.reduce((s,t) => s + t.completed_tasks, 0)
  const totalSessions  = analytics.reduce((s,t) => s + t.total_sessions, 0)

  return (
    <Shell onQuickAdd={() => setQuickAdd(true)}>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5">

        {/* Hero */}
        <div className="glass flex items-center gap-4 p-5" style={{ backgroundImage:'var(--accent-gradient)', border:'none' }}>
          <TagIcon className="h-8 w-8 shrink-0 text-white" />
          <div>
            <h1 className="text-2xl font-black text-white">Tags</h1>
            <p className="mt-0.5 text-sm text-white/70">Context labels for tasks and Pomodoro focus tracking.</p>
          </div>
        </div>

        {error && <div className="glass chip-danger rounded-2xl p-4 text-sm">{error}</div>}

        {/* Summary */}
        {analytics.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:'Total focus time',   value: fmtM(totalFocus)  },
              { label:'Completed tasks',    value: totalCompleted     },
              { label:'Pomodoro sessions',  value: totalSessions      },
            ].map(({ label, value }) => (
              <div key={label} className="glass rounded-2xl p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-secondary-c mb-1">{label}</div>
                <div className="text-2xl font-black text-primary-c">{value || '—'}</div>
              </div>
            ))}
          </div>
        )}

        {/* Charts */}
        {(pieData.length > 0 || barData.length > 0) && (
          <div className="grid gap-5 lg:grid-cols-2">
            {pieData.length > 0 && (
              <div className="glass p-5">
                <p className="text-sm font-bold uppercase tracking-widest text-secondary-c mb-4">Focus time by tag</p>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={85} dataKey="value" nameKey="name"
                           label={({ name, percent }) => `${name} ${Math.round(percent*100)}%`} labelLine={false}>
                        {pieData.map((entry,i) => (
                          <Cell key={i} fill={getTagStyle(entry.color).text} opacity={0.85}
                                cursor="pointer" onClick={() => setSelected(entry.id)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={v => fmtM(v)} contentStyle={{ background:'var(--glass-bg-strong)', border:'1px solid var(--glass-border)', borderRadius:12, color:'var(--text-primary)', backdropFilter:'blur(20px)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {barData.length > 0 && (
              <div className="glass p-5">
                <p className="text-sm font-bold uppercase tracking-widest text-secondary-c mb-4">Completed tasks by tag</p>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                      <XAxis type="number" allowDecimals={false} {...axP} />
                      <YAxis type="category" dataKey="name" width={80} {...axP} />
                      <Tooltip contentStyle={{ background:'var(--glass-bg-strong)', border:'1px solid var(--glass-border)', borderRadius:12, color:'var(--text-primary)', backdropFilter:'blur(20px)' }} />
                      <Bar dataKey="tasks" name="Completed" radius={[0,4,4,0]}>
                        {barData.map((entry,i) => (
                          <Cell key={i} fill={getTagStyle(entry.color).text} opacity={0.85}
                                cursor="pointer" onClick={() => setSelected(entry.id)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Detail drawer */}
        {selected && <TagDetail tagId={selected} onClose={() => setSelected(null)} />}

        {/* Tag list */}
        <div className="glass p-5" style={{ borderRadius:'20px' }}>
          <p className="text-sm font-bold uppercase tracking-widest text-secondary-c mb-4">All Tags ({tags.length})</p>
          <div className="mb-4"><CreateTagForm onCreated={load} /></div>
          {tags.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-sm italic text-secondary-c" style={{ borderStyle:'dashed' }}>
              No tags yet. Create one above.
            </div>
          ) : (
            <div className="grid gap-2">
              {tags.map(tag => {
                const stat = analytics.find(a => a.id === tag.id)
                return (
                  <div key={tag.id}
                       className={`glass rounded-2xl p-3 flex items-center justify-between gap-3 cursor-pointer transition hover:brightness-110 ${selected === tag.id ? 'brightness-110' : ''}`}
                       style={{ borderRadius:'14px' }}
                       onClick={() => setSelected(selected === tag.id ? null : tag.id)}>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <TagChip tag={tag} />
                      {stat && (
                        <div className="flex flex-wrap gap-3 text-xs text-secondary-c">
                          {stat.total_focus_minutes > 0 && <span>{fmtM(stat.total_focus_minutes)} focus</span>}
                          {stat.completed_tasks > 0 && <span>{stat.completed_tasks} tasks done</span>}
                          {stat.total_sessions > 0 && <span>{stat.total_sessions} sessions</span>}
                        </div>
                      )}
                    </div>
                    <button onClick={e => { e.stopPropagation(); removeTag(tag.id) }}
                      className="chip-danger shrink-0 grid h-7 w-7 place-items-center rounded-full opacity-50 hover:opacity-100 transition">
                      <TrashIcon />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <QuickAddModal open={quickAdd} onClose={() => setQuickAdd(false)} onCreate={p => api.createTask(p)} />
    </Shell>
  )
}

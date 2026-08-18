import React, { useEffect, useState } from 'react'
import TagChip, { TAG_COLORS } from './TagChip'
import { api } from '../api'

const inputClass = 'input-glass w-full px-4 py-3 text-sm outline-none transition'

export default function TaskComposer({ onCreate, fixedDate, minDate, helperText, buttonLabel = 'Add task' }) {
  const [title,        setTitle]        = useState('')
  const [description,  setDescription]  = useState('')
  const [plannedDate,  setPlannedDate]  = useState(fixedDate || minDate || '')
  const [selectedTags, setSelectedTags] = useState([])
  const [allTags,      setAllTags]      = useState([])
  const [newTagName,   setNewTagName]   = useState('')
  const [newTagColor,  setNewTagColor]  = useState('blue')
  const [showTags,     setShowTags]     = useState(false)
  const [busy,         setBusy]         = useState(false)
  const [error,        setError]        = useState('')

  useEffect(() => { api.tags().then(setAllTags).catch(() => {}) }, [])

  const toggleTag = tag =>
    setSelectedTags(prev =>
      prev.find(t => t.id === tag.id) ? prev.filter(t => t.id !== tag.id) : [...prev, tag]
    )

  const addNewTag = async () => {
    if (!newTagName.trim()) return
    try {
      const tag = await api.createTag({ name: newTagName.trim(), color: newTagColor })
      setAllTags(prev => [...prev.filter(t => t.id !== tag.id), tag].sort((a,b) => a.name.localeCompare(b.name)))
      setSelectedTags(prev => [...prev.filter(t => t.id !== tag.id), tag])
      setNewTagName('')
    } catch (_) {}
  }

  const submit = async e => {
    e.preventDefault()
    setError('')
    if (!title.trim()) { setError('Give the task a name first.'); return }
    const planned_date = fixedDate || plannedDate
    if (!planned_date) { setError('Pick a date.'); return }
    setBusy(true)
    try {
      await onCreate({ title: title.trim(), description: description.trim(), planned_date, tags: selectedTags.map(t => t.id) })
      setTitle(''); setDescription(''); setSelectedTags([])
      if (!fixedDate) setPlannedDate(minDate || '')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={submit} className="glass grid gap-3 p-4">
      <div className={`grid gap-3 ${fixedDate ? '' : 'md:grid-cols-2'}`}>
        <input className={inputClass} placeholder="task name" value={title} onChange={e => setTitle(e.target.value)} />
        {!fixedDate && <input className={inputClass} type="date" min={minDate} value={plannedDate} onChange={e => setPlannedDate(e.target.value)} />}
      </div>
      <textarea className={`${inputClass} min-h-16`} placeholder="description of that task"
        value={description} onChange={e => setDescription(e.target.value)} />

      <div>
        <button type="button" onClick={() => setShowTags(s => !s)}
          className="text-xs font-semibold text-secondary-c hover:text-primary-c transition flex items-center gap-1.5">
          🏷 Tags{selectedTags.length > 0 ? ` (${selectedTags.length})` : ''} {showTags ? '▴' : '▾'}
        </button>
        {showTags && (
          <div className="mt-2 glass rounded-2xl p-3 grid gap-3" style={{ borderRadius:'16px' }}>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allTags.map(tag => {
                  const active = !!selectedTags.find(t => t.id === tag.id)
                  return (
                    <button key={tag.id} type="button" onClick={() => toggleTag(tag)}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${active ? 'border-transparent text-white' : 'btn-ghost-glass border-[var(--glass-border)] opacity-60 hover:opacity-100'}`}
                      style={active ? { backgroundImage:'var(--accent-gradient)' } : undefined}>
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="flex gap-2 items-center">
              <input className="input-glass flex-1 px-3 py-1.5 text-xs outline-none" placeholder="New tag name…"
                value={newTagName} onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewTag() } }} />
              <select className="input-glass px-2 py-1.5 text-xs outline-none" value={newTagColor} onChange={e => setNewTagColor(e.target.value)}>
                {TAG_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="button" onClick={addNewTag} className="btn-accent rounded-xl px-3 py-1.5 text-xs font-bold text-white">+ Add</button>
            </div>
          </div>
        )}
        {selectedTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedTags.map(tag => <TagChip key={tag.id} tag={tag} onRemove={() => toggleTag(tag)} small />)}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-secondary-c">{helperText || 'The date is fixed once added.'}</div>
        <button disabled={busy} className="btn-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ borderRadius:'14px' }}>
          {busy ? 'Adding…' : buttonLabel}
        </button>
      </div>
      {error && <div className="chip-danger rounded-xl px-3 py-2 text-xs font-medium">{error}</div>}
    </form>
  )
}

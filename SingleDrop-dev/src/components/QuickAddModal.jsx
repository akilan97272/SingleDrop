import React, { useEffect, useState } from 'react'
import { XIcon, PlusIcon } from './Icons'

const inputClass = 'input-glass w-full px-4 py-3 text-sm outline-none transition'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function QuickAddModal({ open, onClose, onCreate }) {
  const [title, setTitle]     = useState('')
  const [date,  setDate]      = useState(todayISO)
  const [desc,  setDesc]      = useState('')
  const [busy,  setBusy]      = useState(false)
  const [err,   setErr]       = useState('')

  /* reset on open */
  useEffect(() => {
    if (open) { setTitle(''); setDate(todayISO()); setDesc(''); setErr('') }
  }, [open])

  /* close on Escape */
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  if (!open) return null

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (!title.trim()) { setErr('Task name is required.'); return }
    setBusy(true)
    try {
      await onCreate({ title: title.trim(), description: desc.trim(), planned_date: date })
      onClose()
    } catch (ex) {
      setErr(ex.message || 'Error adding task.')
    } finally {
      setBusy(false)
    }
  }

  return (
    /* backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Panel — slides up on mobile, centered on desktop */}
      <div className="glass-strong w-full max-w-md p-5 md:rounded-3xl"
           style={{ borderRadius: '24px 24px 0 0' }}>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-black gradient-text text-lg">Quick Add Task</h2>
          <button onClick={onClose}
                  className="btn-ghost-glass grid h-8 w-8 place-items-center rounded-full border border-[var(--glass-border)]">
            <XIcon />
          </button>
        </div>

        <form onSubmit={submit} className="grid gap-3">
          <input
            className={inputClass}
            placeholder="Task name"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
          />
          <input
            className={inputClass}
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <textarea
            className={`${inputClass} min-h-16`}
            placeholder="Description (optional)"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />

          {err && <div className="chip-danger rounded-xl px-3 py-2 text-xs">{err}</div>}

          <button
            disabled={busy}
            className="btn-accent flex items-center justify-center gap-2 py-3 font-bold disabled:opacity-60"
            style={{ borderRadius: '16px' }}
          >
            <PlusIcon className="h-4 w-4" />
            {busy ? 'Adding…' : 'Add Task'}
          </button>
        </form>
      </div>
    </div>
  )
}

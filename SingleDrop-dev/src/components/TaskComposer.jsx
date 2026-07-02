import React, { useState } from 'react'

const inputClass = 'input-glass px-4 py-3 text-sm outline-none transition'

export default function TaskComposer({ onCreate, fixedDate, minDate, helperText, buttonLabel = 'Add task' }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [plannedDate, setPlannedDate] = useState(fixedDate || minDate || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!title.trim()) {
      setError('Give the task a name first.')
      return
    }
    const planned_date = fixedDate || plannedDate
    if (!planned_date) {
      setError('Pick a date.')
      return
    }
    setBusy(true)
    try {
      await onCreate({ title: title.trim(), description: description.trim(), planned_date })
      setTitle('')
      setDescription('')
      if (!fixedDate) setPlannedDate(minDate || '')
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="glass grid gap-3 p-4">
      <div className={`grid gap-3 ${fixedDate ? '' : 'md:grid-cols-2'}`}>
        <input
          className={inputClass}
          placeholder="task name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        {!fixedDate && (
          <input
            className={inputClass}
            type="date"
            min={minDate}
            value={plannedDate}
            onChange={(e) => setPlannedDate(e.target.value)}
          />
        )}
      </div>
      <textarea
        className={`${inputClass} min-h-20`}
        placeholder="description of that task"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-secondary-c">
          {helperText || 'The date is fixed once added. Completion never changes it.'}
        </div>
        <button
          disabled={busy}
          className="btn-accent px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          {busy ? 'Adding…' : buttonLabel}
        </button>
      </div>
      {error && <div className="chip-danger rounded-lg px-2.5 py-1.5 text-xs font-medium">{error}</div>}
    </form>
  )
}

import React, { useState } from 'react'

const inputClass = 'rounded-2xl border border-brand-900/15 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 dark:border-white/10 dark:bg-brand-950/60 dark:text-brand-50'

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
    <form onSubmit={submit} className="grid gap-3 rounded-3xl border border-brand-900/10 bg-brand-50/60 p-4 dark:border-white/10 dark:bg-white/5">
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
        <div className="text-xs text-brand-700/60 dark:text-brand-300/60">
          {helperText || 'The date is fixed once added. Completion never changes it.'}
        </div>
        <button
          disabled={busy}
          className="rounded-2xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? 'Adding…' : buttonLabel}
        </button>
      </div>
      {error && <div className="text-xs font-medium text-rose-500">{error}</div>}
    </form>
  )
}

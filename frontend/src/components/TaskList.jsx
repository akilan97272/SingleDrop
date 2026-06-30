import React from 'react'
import { CheckIcon, XIcon } from './Icons'

function StatusBadge({ status }) {
  const map = {
    planned: 'bg-brand-100 text-brand-700 dark:bg-white/10 dark:text-brand-200',
    completed: 'bg-brand-500 text-white',
    completed_late: 'bg-amber-400 text-amber-950',
    missed: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
    disbanded: 'bg-zinc-400/20 text-zinc-500 dark:text-zinc-300',
  }
  const text = {
    planned: 'planned',
    completed: 'done',
    completed_late: 'done late',
    missed: 'missed',
    disbanded: 'disbanded',
  }
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${map[status]}`}>{text[status]}</span>
}

export default function TaskList({
  items,
  onComplete,
  onCompleteLate,
  onDisband,
  emptyText = 'No tasks here.',
  showDate = true,
}) {
  if (!items?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-900/15 p-6 text-center text-sm text-brand-700/60 dark:border-white/10 dark:text-brand-300/60">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {items.map((task) => (
        <div
          key={task.id}
          className="rounded-2xl border border-brand-900/10 bg-white p-4 transition hover:border-brand-300 dark:border-white/10 dark:bg-brand-950/40 dark:hover:border-brand-600/50"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{task.title}</span>
                <StatusBadge status={task.status} />
              </div>
              {task.description && (
                <div className="mt-0.5 truncate text-sm text-brand-700/70 dark:text-brand-300/70">
                  #{task.description}
                </div>
              )}
              {showDate && (
                <div className="mt-1 font-mono text-[11px] text-brand-700/50 dark:text-brand-300/50">
                  {task.label}
                </div>
              )}
              {task.missed_reason && (
                <div className="mt-1 text-xs italic text-rose-500/80">{task.missed_reason}</div>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {onComplete && task.status === 'planned' && (
                <button
                  onClick={() => onComplete(task.id)}
                  className="flex items-center gap-1 rounded-xl bg-brand-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-600"
                >
                  <CheckIcon /> Done
                </button>
              )}
              {onCompleteLate && task.status === 'missed' && (
                <button
                  onClick={() => onCompleteLate(task.id)}
                  className="flex items-center gap-1 rounded-xl bg-amber-400 px-3 py-2 text-xs font-semibold text-amber-950 transition hover:bg-amber-300"
                >
                  <CheckIcon /> Complete
                </button>
              )}
              {onDisband && task.status === 'missed' && (
                <button
                  onClick={() => onDisband(task.id)}
                  className="flex items-center gap-1 rounded-xl bg-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-300 dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/20"
                >
                  <XIcon /> Disband
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

import React from 'react'
import { CheckIcon, XIcon } from './Icons'

function StatusBadge({ status }) {
  const map = {
    planned: 'chip-accent',
    completed: 'chip-success',
    completed_late: 'chip-warning',
    missed: 'chip-danger',
    disbanded: 'chip-muted',
  }
  const text = {
    planned: 'planned',
    completed: 'done',
    completed_late: 'done late',
    missed: 'missed',
    disbanded: 'disbanded',
  }
  return (
    <span className={`rounded-full px-2.5 py-1 text-[13px] font-semibold uppercase tracking-wide ${map[status]}`}>
      {text[status]}
    </span>
  )
}

export default function TaskList({ items, onComplete, onCompleteLate, onDisband, emptyText = 'No tasks here.', showDate = true }) {
  if (!items?.length) {
    return (
      <div className="glass rounded-2xl p-6 text-center text-sm text-secondary-c"
           style={{ borderStyle: 'dashed' }}>
        {emptyText}
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {items.map((task) => (
        <div
          key={task.id}
          className="glass rounded-2xl p-4 transition hover:brightness-110"
          style={{ borderRadius: '16px' }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="break-words min-w-0 font-semibold text-primary-c [overflow-wrap:anywhere]">{task.title}</span>
                <StatusBadge status={task.status} />
              </div>
              {task.description && (
                <div className="mt-0.5 break-words text-sm text-secondary-c [overflow-wrap:anywhere]">
                  #{task.description}
                </div>
              )}
              {showDate && (
                <div className="mt-1 font-mono text-[13px] text-disabled-c">
                  {task.label}
                </div>
              )}
              {task.missed_reason && (
                <div className="chip-danger mt-1 rounded-lg px-2 py-0.5 text-xs italic inline-block">
                  {task.missed_reason}
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {onComplete && task.status === 'planned' && (
                <button
                  onClick={() => onComplete(task.id)}
                  className="btn-accent flex items-center gap-1 px-3 py-2 text-xs font-semibold"
                  style={{ borderRadius: '12px' }}
                >
                  <CheckIcon /> Done
                </button>
              )}
              {onCompleteLate && task.status === 'missed' && (
                <button
                  onClick={() => onCompleteLate(task.id)}
                  className="chip-warning flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition hover:brightness-110"
                >
                  <CheckIcon /> Complete
                </button>
              )}
              {onDisband && task.status === 'missed' && (
                <button
                  onClick={() => onDisband(task.id)}
                  className="chip-muted flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition hover:brightness-110"
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
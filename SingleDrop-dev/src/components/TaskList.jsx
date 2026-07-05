import React from 'react'
import { CheckIcon, XIcon } from './Icons'

function StatusBadge({ status }) {
  const map = {
    planned:       'chip-accent',
    completed:     'chip-success',
    completed_late:'chip-warning',
    missed:        'chip-danger',
    disbanded:     'chip-muted',
  }
  const text = {
    planned:       'planned',
    completed:     'done',
    completed_late:'done late',
    missed:        'missed',
    disbanded:     'disbanded',
  }
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[13px] font-semibold uppercase tracking-wide ${map[status]}`}>
      {text[status]}
    </span>
  )
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
      <div
        className="glass rounded-2xl p-6 text-center text-sm text-secondary-c"
        style={{ borderStyle: 'dashed' }}
      >
        {emptyText}
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {items.map((task) => (
        <div
          key={task.id}
          /* overflow-hidden is the hard stop — nothing escapes this card */
          className="glass overflow-hidden p-4 transition hover:brightness-110"
          style={{ borderRadius: '16px' }}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

            {/* ── text content — constrained to its flex share ── */}
            <div className="min-w-0 flex-1 overflow-hidden">

              {/* title + badge */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="min-w-0 font-semibold text-primary-c"
                  style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                >
                  {task.title}
                </span>
                <StatusBadge status={task.status} />
              </div>

              {/* description */}
              {task.description && (
                <div
                  className="mt-0.5 text-sm text-secondary-c"
                  style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                >
                  #{task.description}
                </div>
              )}

              {/* label — font-mono with no natural break points, needs break-all */}
              {showDate && (
                <div
                  className="mt-1 font-mono text-[13px] text-disabled-c"
                  style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}
                >
                  {task.label}
                </div>
              )}

              {/* missed reason */}
              {task.missed_reason && (
                <div
                  className="chip-danger mt-1 rounded-lg px-2 py-0.5 text-xs italic"
                  style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', display: 'block' }}
                >
                  {task.missed_reason}
                </div>
              )}
            </div>

            {/* ── action buttons — never shrink or wrap ── */}
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
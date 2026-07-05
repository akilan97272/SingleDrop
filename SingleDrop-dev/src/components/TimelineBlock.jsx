import React from 'react'
import { Link } from 'react-router-dom'

const COLOR_HEX = {
  blue:   'var(--accent-blue)',
  purple: 'var(--accent-purple)',
  cyan:   'var(--accent-cyan)',
  pink:   'var(--accent-pink)',
  green:  'var(--accent-green, #39FF14)',
  orange: 'var(--accent-orange, #FF7A00)',
}

function fmt(iso) {
  const d = new Date(iso)
  return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}`
}

function StatusPip({ status }) {
  const map = {
    upcoming:  { cls: 'chip-accent',  label: 'upcoming' },
    active:    { cls: 'chip-success', label: 'active'   },
    completed: { cls: 'chip-muted',   label: 'done'     },
  }
  const { cls, label } = map[status] || map.upcoming
  return (
    <span className={`${cls} shrink-0 rounded-full px-2 py-0.5 text-[13px] font-bold uppercase tracking-wide`}>
      {label}
    </span>
  )
}

function ProgressBar({ value, color }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--glass-border)' }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.round(value * 100)}%`, background: color }}
      />
    </div>
  )
}

function TimelineCard({ tl }) {
  const color = COLOR_HEX[tl.color] || COLOR_HEX.blue

  return (
    /* overflow-hidden clips any rogue content at the card edge */
    <div className="glass overflow-hidden" style={{ borderRadius: '16px' }}>

      {/* header strip */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--glass-border)', borderLeft: `3px solid ${color}` }}
      >
        {/* left: dot + name + badges — min-w-0 lets it shrink */}
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full animate-pulse-glow" style={{ background: color }} />
          <span
            className="min-w-0 truncate font-bold text-sm text-primary-c"
            title={tl.name}
          >
            {tl.name}
          </span>
          {tl.is_active_today && (
            <span className="chip-success shrink-0 rounded-full px-2 py-0.5 text-[13px] font-bold uppercase">
              today
            </span>
          )}
        </div>
        {/* right: date range — always short, shrink-0 so it never gets cut */}
        {tl.overall_start && (
          <span className="shrink-0 font-mono text-[13px] text-disabled-c">
            {fmt(tl.overall_start)} → {fmt(tl.overall_end)}
          </span>
        )}
      </div>

      {/* task rows */}
      <div className="divide-y" style={{ borderColor: 'var(--glass-border)' }}>
        {tl.tasks.length === 0 && (
          <p className="px-4 py-3 text-sm text-secondary-c italic">No tasks yet.</p>
        )}
        {tl.tasks.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 transition ${t.is_today ? 'brightness-110' : ''}`}
            style={t.is_today ? { background: `color-mix(in srgb, ${color} 8%, transparent)` } : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 overflow-hidden">

                {/* title + badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`min-w-0 text-sm font-semibold ${t.is_today ? 'text-primary-c' : 'text-secondary-c'}`}
                    style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                  >
                    {t.title}
                  </span>
                  <StatusPip status={t.status} />
                  {t.is_today && (
                    <span className="shrink-0 text-[13px]" style={{ color }}>◆ today</span>
                  )}
                </div>

                {/* description — truncate is intentional; full text lives in the Timeline page */}
                {t.description && (
                  <p className="mt-0.5 truncate text-xs text-disabled-c">#{t.description}</p>
                )}

                {/* progress */}
                <div className="mt-1.5 grid gap-1">
                  <ProgressBar value={t.progress} color={color} />
                  <span className="font-mono text-[13px] text-disabled-c">
                    {fmt(t.start_date)} → {fmt(t.end_date)} &nbsp;·&nbsp; {t.days_elapsed}/{t.days_total}d
                  </span>
                </div>

              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TimelineBlock({ timelines }) {
  if (!timelines?.length) {
    return (
      <div
        className="glass flex flex-col items-center justify-center gap-3 p-8 text-center"
        style={{ borderStyle: 'dashed' }}
      >
        <p className="text-sm text-secondary-c">No timelines yet.</p>
        <Link
          to="/timeline"
          className="btn-accent px-4 py-2 text-xs font-bold text-white"
          style={{ borderRadius: '12px' }}
        >
          Create a timeline →
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {timelines.map(tl => <TimelineCard key={tl.id} tl={tl} />)}
      <Link
        to="/timeline"
        className="btn-ghost-glass mt-1 block rounded-2xl border border-[var(--glass-border)] py-2.5 text-center text-xs font-semibold text-secondary-c transition hover:text-primary-c"
      >
        Manage timelines →
      </Link>
    </div>
  )
}
import React, { useEffect, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import Shell from '../components/Shell'
import SectionCard from '../components/SectionCard'
import StatCard from '../components/StatCard'
import GridTracker from '../components/GridTracker'
import { FlameIcon, CheckIcon, ListIcon, ShieldIcon, DeprecatedIcon } from '../components/Icons'
import { useTheme } from '../context/ThemeContext'
import { api } from '../api'

const RANGE_OPTIONS = [
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: '180d', value: 180 },
  { label: '365d', value: 365 },
]

function fmtTick(d) {
  const dt = new Date(d)
  return `${dt.getMonth() + 1}/${dt.getDate()}`
}

/* Read a CSS variable from the document root at call time */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function ChartTooltipStyle() {
  return null // recharts default tooltip is fine; we just colour it via CSS
}

export default function Tracker() {
  const [data, setData] = useState(null)
  const [range, setRange] = useState(90)
  const [error, setError] = useState('')
  const { theme } = useTheme()

  useEffect(() => {
    setData(null)
    api.tracker(range).then(setData).catch((e) => setError(e.message))
  }, [range])

  if (error) return (
    <Shell>
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="glass chip-danger rounded-2xl p-6 text-sm">{error}</div>
      </main>
    </Shell>
  )

  if (!data) return (
    <Shell>
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="glass animate-pulse-glow rounded-2xl p-6 text-center text-sm text-secondary-c">loading tracker…</div>
      </main>
    </Shell>
  )

  const { stats } = data

  /* Pull live theme colours for the charts */
  const blue   = cssVar('--accent-blue')
  const purple = cssVar('--accent-purple')
  const cyan   = cssVar('--accent-cyan')
  const pink   = cssVar('--accent-pink')
  const grid   = cssVar('--glass-border')
  const txt    = cssVar('--text-disabled')

  const axisProps = { tick: { fill: txt, fontSize: 11 }, stroke: grid }

  return (
    <Shell>
      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-6">

        {/* ── Stat tiles ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={<FlameIcon className="h-4 w-4" />}
            label="Streak"
            value={stats.streak}
            sub={stats.shield_used ? '🛡 shield used' : '🛡 shield intact'}
            accent
            glowClass={theme === 'rage' ? 'glow-pink' : ''}
          />
          <StatCard icon={<CheckIcon />}      label="Completed"      value={stats.total_completed} />
          <StatCard icon={<ListIcon />}        label="Started"        value={stats.total_started} />
          <StatCard icon={<ShieldIcon />}      label="Completed late" value={stats.completed_late_count} sub="finished after due date" />
          <StatCard icon={<DeprecatedIcon />}  label="Deprecated"     value={stats.deprecated_count} sub="disbanded for good" />
        </div>

        {/* ── GitHub grid ── */}
        <SectionCard
          title="GitHub-style tracker"
          subtitle="More colour = more tasks completed on that day."
          action={
            <div className="glass-pill flex gap-1 p-1">
              {RANGE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setRange(o.value)}
                  className={`rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${
                    range === o.value ? 'text-white' : 'text-secondary-c hover:text-primary-c'
                  }`}
                  style={range === o.value ? { backgroundImage: 'var(--accent-gradient)' } : undefined}
                >
                  {o.label}
                </button>
              ))}
            </div>
          }
        >
          <GridTracker grid={data.grid} />
        </SectionCard>

        {/* ── Charts ── */}
        <div className="grid gap-5 lg:grid-cols-2">

          <SectionCard title="Tasks completed per day" subtitle="Which days you actually get things done.">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.completed_series}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                  <XAxis dataKey="day" tickFormatter={fmtTick} minTickGap={20} {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip
                    labelFormatter={fmtTick}
                    contentStyle={{ background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)', borderRadius: 12, color: 'var(--text-primary)', backdropFilter: 'blur(20px)' }}
                  />
                  <Bar dataKey="count" name="completed" fill={blue} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Tasks ignored / missed per day" subtitle="Days that slipped into the deprecated page.">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.missed_series}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                  <XAxis dataKey="day" tickFormatter={fmtTick} minTickGap={20} {...axisProps} />
                  <YAxis allowDecimals={false} {...axisProps} />
                  <Tooltip
                    labelFormatter={fmtTick}
                    contentStyle={{ background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)', borderRadius: 12, color: 'var(--text-primary)', backdropFilter: 'blur(20px)' }}
                  />
                  <Line type="monotone" dataKey="count" name="missed" stroke={pink} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

        </div>
      </main>
    </Shell>
  )
}

import React, { useEffect, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import Shell from '../components/Shell'
import SectionCard from '../components/SectionCard'
import StatCard from '../components/StatCard'
import GridTracker from '../components/GridTracker'
import { FlameIcon, CheckIcon, ListIcon, ShieldIcon, DeprecatedIcon } from '../components/Icons'
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

export default function Tracker() {
  const [data, setData] = useState(null)
  const [range, setRange] = useState(90)
  const [error, setError] = useState('')

  useEffect(() => {
    api.tracker(range).then(setData).catch((e) => setError(e.message))
  }, [range])

  if (error) {
    return (
      <Shell>
        <main className="mx-auto max-w-7xl px-4 py-10 text-rose-500">{error}</main>
      </Shell>
    )
  }

  if (!data) {
    return (
      <Shell>
        <main className="mx-auto max-w-7xl px-4 py-10 text-brand-700/60 dark:text-brand-300/60">loading…</main>
      </Shell>
    )
  }

  const { stats } = data

  return (
    <Shell>
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard icon={<FlameIcon className="h-4 w-4" />} label="Streak" value={stats.streak} sub={stats.shield_used ? 'shield used' : 'shield intact'} accent />
          <StatCard icon={<CheckIcon />} label="Completed" value={stats.total_completed} />
          <StatCard icon={<ListIcon />} label="Started" value={stats.total_started} />
          <StatCard icon={<ShieldIcon />} label="Completed late" value={stats.completed_late_count} sub="finished after due date" />
          <StatCard icon={<DeprecatedIcon />} label="Deprecated" value={stats.deprecated_count} sub="disbanded for good" />
        </div>

        <SectionCard
          title="GitHub-style tracker"
          subtitle="More green = more tasks completed on that day."
          action={
            <div className="flex gap-1.5">
              {RANGE_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setRange(o.value)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    range === o.value
                      ? 'bg-brand-600 text-white'
                      : 'bg-brand-900/5 text-brand-700 hover:bg-brand-900/10 dark:bg-white/5 dark:text-brand-200 dark:hover:bg-white/10'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          }
        >
          <GridTracker grid={data.grid} />
        </SectionCard>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Tasks completed per day" subtitle="Which days you actually get things done.">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.completed_series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-brand-900/10 dark:text-white/10" />
                  <XAxis dataKey="day" tickFormatter={fmtTick} tick={{ fontSize: 11 }} stroke="currentColor" className="text-brand-700/60 dark:text-brand-300/60" minTickGap={20} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-brand-700/60 dark:text-brand-300/60" />
                  <Tooltip labelFormatter={fmtTick} />
                  <Bar dataKey="count" fill="#21b261" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Tasks ignored / missed per day" subtitle="Days that slipped into the deprecated page.">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.missed_series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-brand-900/10 dark:text-white/10" />
                  <XAxis dataKey="day" tickFormatter={fmtTick} tick={{ fontSize: 11 }} stroke="currentColor" className="text-brand-700/60 dark:text-brand-300/60" minTickGap={20} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-brand-700/60 dark:text-brand-300/60" />
                  <Tooltip labelFormatter={fmtTick} />
                  <Line type="monotone" dataKey="count" stroke="#f43f5e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>
      </main>
    </Shell>
  )
}

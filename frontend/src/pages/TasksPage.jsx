import React, { useEffect, useMemo, useState } from 'react'
import Shell from '../components/Shell'
import SectionCard from '../components/SectionCard'
import TaskList from '../components/TaskList'
import { api } from '../api'

const FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'completed', label: 'Completed' },
  { key: 'all', label: 'All' },
]

export default function TasksPage() {
  const [all, setAll] = useState([])
  const [filter, setFilter] = useState('upcoming')
  const [error, setError] = useState('')

  const load = () => api.tasks().then(setAll).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (filter === 'all') return all
    if (filter === 'completed') return all.filter((t) => t.status === 'completed' || t.status === 'completed_late')
    if (filter === 'upcoming') return all.filter((t) => t.status === 'planned')
    return all
  }, [all, filter])

  const completeTask = (id) => api.completeTask(id).then(load)

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <SectionCard
          title="Completed & upcoming tasks"
          subtitle="Everything you've added, sorted by planned date."
          action={
            <div className="flex gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    filter === f.key
                      ? 'bg-brand-600 text-white'
                      : 'bg-brand-900/5 text-brand-700 hover:bg-brand-900/10 dark:bg-white/5 dark:text-brand-200 dark:hover:bg-white/10'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          }
        >
          {error && <div className="mb-3 text-sm text-rose-500">{error}</div>}
          <TaskList items={filtered} onComplete={completeTask} emptyText="No tasks found for this filter." />
        </SectionCard>
      </main>
    </Shell>
  )
}

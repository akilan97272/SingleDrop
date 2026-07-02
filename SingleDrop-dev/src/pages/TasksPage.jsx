import React, { useEffect, useMemo, useState } from 'react'
import Shell from '../components/Shell'
import SectionCard from '../components/SectionCard'
import TaskList from '../components/TaskList'
import QuickAddModal from '../components/QuickAddModal'
import { api } from '../api'

const FILTERS = [
  { key: 'upcoming',  label: 'Upcoming'  },
  { key: 'completed', label: 'Completed' },
  { key: 'all',       label: 'All'       },
]

export default function TasksPage() {
  const [all,      setAll]      = useState([])
  const [filter,   setFilter]   = useState('upcoming')
  const [error,    setError]    = useState('')
  const [quickAdd, setQuickAdd] = useState(false)

  const load = () => api.tasks().then(setAll).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (filter === 'all')       return all
    if (filter === 'completed') return all.filter(t => t.status === 'completed' || t.status === 'completed_late')
    return all.filter(t => t.status === 'planned')
  }, [all, filter])

  const completeTask = id => api.completeTask(id).then(load)

  return (
    <Shell onQuickAdd={() => setQuickAdd(true)}>
      <div className="mx-auto max-w-7xl px-4 py-5">
        <SectionCard
          title="Completed & upcoming tasks"
          subtitle="Everything you've added, sorted by planned date."
          action={
            <div className="glass-pill flex gap-1 p-1">
              {FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    filter === f.key ? 'text-white' : 'text-secondary-c hover:text-primary-c'
                  }`}
                  style={filter === f.key ? { backgroundImage: 'var(--accent-gradient)' } : undefined}
                >
                  {f.label}
                </button>
              ))}
            </div>
          }
        >
          {error && <div className="chip-danger mb-3 rounded-xl p-3 text-sm">{error}</div>}
          <TaskList items={filtered} onComplete={completeTask} emptyText="No tasks found for this filter." />
        </SectionCard>
      </div>

      <QuickAddModal
        open={quickAdd}
        onClose={() => setQuickAdd(false)}
        onCreate={p => api.createTask(p).then(load)}
      />
    </Shell>
  )
}

import React, { useEffect, useState } from 'react'
import Shell from '../components/Shell'
import SectionCard from '../components/SectionCard'
import TaskComposer from '../components/TaskComposer'
import TaskList from '../components/TaskList'
import QuickAddModal from '../components/QuickAddModal'
import { api } from '../api'

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function tomorrowDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d
}

export default function PlanTomorrow() {
  const [tasks,    setTasks]    = useState([])
  const [error,    setError]    = useState('')
  const [quickAdd, setQuickAdd] = useState(false)

  const tomorrow   = tomorrowDate()
  const isoTomorrow = tomorrow.toISOString().slice(0, 10)
  const dayName    = DAY_NAMES[tomorrow.getDay()]
  const prettyDate = tomorrow.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

  const load = () =>
    api.tasks('planned')
      .then(all => setTasks(all.filter(t => t.planned_date === isoTomorrow)))
      .catch(e => setError(e.message))

  useEffect(() => { load() }, [])

  const createTask   = p  => api.createTask(p).then(load)
  const completeTask = id => api.completeTask(id).then(load)

  return (
    <Shell onQuickAdd={() => setQuickAdd(true)}>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5">

        <div className="glass p-6 text-center"
             style={{ backgroundImage: 'var(--hero-gradient)', border: 'none' }}>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
            plan your tomorrow
          </div>
          <h1 className="mt-2 text-4xl font-black text-white">{dayName}</h1>
          <div className="mt-1 text-sm text-white/70">{prettyDate}</div>
        </div>

        <SectionCard title="Add a task for tomorrow">
          <TaskComposer
            onCreate={createTask}
            fixedDate={isoTomorrow}
            buttonLabel="Add to tomorrow"
            helperText="Lands on tomorrow's agenda and in the notification box."
          />
        </SectionCard>

        <SectionCard title="Tomorrow's task list">
          {error && <div className="chip-danger mb-3 rounded-xl p-3 text-sm">{error}</div>}
          <TaskList
            items={tasks}
            onComplete={completeTask}
            emptyText="Nothing planned yet. Add the first one above."
            showDate={false}
          />
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

import React, { useEffect, useState } from 'react'
import Shell from '../components/Shell'
import SectionCard from '../components/SectionCard'
import TaskComposer from '../components/TaskComposer'
import TaskList from '../components/TaskList'
import { api } from '../api'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function tomorrowDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d
}

export default function PlanTomorrow() {
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')
  const tomorrow = tomorrowDate()
  const isoTomorrow = tomorrow.toISOString().slice(0, 10)
  const dayName = DAY_NAMES[tomorrow.getDay()]
  const prettyDate = tomorrow.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

  const load = () =>
    api.tasks('planned').then((all) => setTasks(all.filter((t) => t.planned_date === isoTomorrow))).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const createTask = (payload) => api.createTask(payload).then(load)
  const completeTask = (id) => api.completeTask(id).then(load)

  return (
    <Shell>
      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-6">
        <div className="rounded-3xl border border-brand-900/10 bg-gradient-to-br from-brand-500/10 via-white to-white p-6 text-center dark:border-white/10 dark:from-brand-500/10 dark:via-brand-950/40 dark:to-brand-950/40">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600 dark:text-brand-300">plan your tomorrow</div>
          <h1 className="mt-2 text-3xl font-black">{dayName}</h1>
          <div className="text-sm text-brand-700/70 dark:text-brand-300/70">{prettyDate}</div>
        </div>

        <SectionCard title="Add a task for tomorrow">
          <TaskComposer
            onCreate={createTask}
            fixedDate={isoTomorrow}
            buttonLabel="Add to tomorrow"
            helperText="This lands on tomorrow's agenda and the dashboard notification box."
          />
        </SectionCard>

        <SectionCard title="Tomorrow's task list">
          {error && <div className="mb-3 text-sm text-rose-500">{error}</div>}
          <TaskList items={tasks} onComplete={completeTask} emptyText="Nothing planned yet. Add the first one above." showDate={false} />
        </SectionCard>
      </main>
    </Shell>
  )
}

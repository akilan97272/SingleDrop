import React, { useEffect, useState } from 'react'
import Shell from '../components/Shell'
import SectionCard from '../components/SectionCard'
import TaskList from '../components/TaskList'
import { api } from '../api'

export default function Deprecated() {
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')

  const load = () => api.missedTasks().then(setTasks).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const completeLate = (id) => api.completeLateTask(id).then(load)
  const disband = (id) => api.disbandTask(id).then(load)

  return (
    <Shell>
      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-6">
        <div className="rounded-3xl border border-rose-400/20 bg-rose-50 p-6 text-center dark:border-rose-400/20 dark:bg-rose-500/5">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">deprecated</div>
          <h1 className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-300">Missed Tasks</h1>
          <p className="mt-1 text-sm text-rose-500/80 dark:text-rose-300/70">Reason for you being average.</p>
        </div>

        <SectionCard title="Missed tasks" subtitle="They never drag into the next day. Complete them late, or let them go.">
          {error && <div className="mb-3 text-sm text-rose-500">{error}</div>}
          <TaskList
            items={tasks}
            onCompleteLate={completeLate}
            onDisband={disband}
            emptyText="Nothing missed. Keep it that way."
          />
        </SectionCard>
      </main>
    </Shell>
  )
}

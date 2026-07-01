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
      <main className="mx-auto grid max-w-4xl gap-5 px-4 py-6">

        {/* Hero – danger gradient */}
        <div className="glass p-6 text-center" style={{
          backgroundImage: 'linear-gradient(135deg, var(--accent-pink), var(--accent-purple))',
          border: 'none'
        }}>
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">deprecated</div>
          <h1 className="mt-2 text-3xl font-black text-white">Missed Tasks</h1>
          <p className="mt-1 text-sm text-white/70">Reason for you being average.</p>
        </div>

        <SectionCard
          title="Missed tasks"
          subtitle="They never drag into the next day. Complete them late, or let them go."
        >
          {error && <div className="chip-danger mb-3 rounded-lg p-3 text-sm">{error}</div>}
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

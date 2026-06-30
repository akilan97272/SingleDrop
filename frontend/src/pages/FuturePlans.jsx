import React, { useEffect, useState } from 'react'
import Shell from '../components/Shell'
import SectionCard from '../components/SectionCard'
import TaskComposer from '../components/TaskComposer'
import TaskList from '../components/TaskList'
import { api } from '../api'

function minFutureDate() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().slice(0, 10)
}

export default function FuturePlans() {
  const [plans, setPlans] = useState([])
  const [error, setError] = useState('')
  const minDate = minFutureDate()

  const load = () => api.futurePlans().then(setPlans).catch((e) => setError(e.message))
  useEffect(() => { load() }, [])

  const createTask = (payload) => api.createTask(payload).then(load)

  return (
    <Shell>
      <main className="mx-auto grid max-w-4xl gap-6 px-4 py-6">
        <div className="rounded-3xl border border-brand-900/10 bg-gradient-to-br from-brand-500/10 via-white to-white p-6 text-center dark:border-white/10 dark:from-brand-500/10 dark:via-brand-950/40 dark:to-brand-950/40">
          <h1 className="text-xl font-black leading-snug sm:text-2xl">
            "You will become what <em>you do</em>, not what you say <em>you will do</em>."
          </h1>
        </div>

        <SectionCard title="Add a future plan" subtitle="Anything past tomorrow. It will be reminded daily in the notification box until the day arrives.">
          <TaskComposer
            onCreate={createTask}
            minDate={minDate}
            buttonLabel="Add future plan"
            helperText="Pick any date beyond tomorrow."
          />
        </SectionCard>

        <SectionCard title="Future plans">
          {error && <div className="mb-3 text-sm text-rose-500">{error}</div>}
          <TaskList items={plans} emptyText="No future plans yet." />
        </SectionCard>
      </main>
    </Shell>
  )
}

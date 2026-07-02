import React, { useEffect, useState } from 'react'
import Shell from '../components/Shell'
import SectionCard from '../components/SectionCard'
import TaskComposer from '../components/TaskComposer'
import TaskList from '../components/TaskList'
import QuickAddModal from '../components/QuickAddModal'
import { api } from '../api'

function minFutureDate() {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().slice(0, 10)
}

export default function FuturePlans() {
  const [plans,    setPlans]    = useState([])
  const [error,    setError]    = useState('')
  const [quickAdd, setQuickAdd] = useState(false)

  const minDate = minFutureDate()

  const load = () => api.futurePlans().then(setPlans).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const createTask = p => api.createTask(p).then(load)

  return (
    <Shell onQuickAdd={() => setQuickAdd(true)}>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5">

        <div className="glass p-8 text-center"
             style={{ backgroundImage: 'var(--accent-gradient)', border: 'none' }}>
          <h1 className="text-xl font-black leading-snug text-white sm:text-2xl">
            "You will become what <em>you do</em>,<br />
            not what you say <em>you will do</em>."
          </h1>
        </div>

        <SectionCard
          title="Add a future plan"
          subtitle="Anything past tomorrow. Reminded daily in your notification box until the day arrives."
        >
          <TaskComposer
            onCreate={createTask}
            minDate={minDate}
            buttonLabel="Add future plan"
            helperText="Pick any date beyond tomorrow."
          />
        </SectionCard>

        <SectionCard title="Future plans">
          {error && <div className="chip-danger mb-3 rounded-xl p-3 text-sm">{error}</div>}
          <TaskList items={plans} emptyText="No future plans yet." />
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

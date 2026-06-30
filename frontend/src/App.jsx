import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import TasksPage from './pages/TasksPage'
import Tracker from './pages/Tracker'
import PlanTomorrow from './pages/PlanTomorrow'
import FuturePlans from './pages/FuturePlans'
import Deprecated from './pages/Deprecated'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/tracker" element={<Tracker />} />
      <Route path="/plan-tomorrow" element={<PlanTomorrow />} />
      <Route path="/future-plans" element={<FuturePlans />} />
      <Route path="/deprecated" element={<Deprecated />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

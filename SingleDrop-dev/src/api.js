const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = res.statusText
    try { const b = await res.json(); detail = b.detail || detail } catch (_) {}
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Tasks
  dashboard:       ()     => request('/api/dashboard'),
  quote:           ()     => request('/api/quote'),
  tasks:           (s)    => request(`/api/tasks${s ? `?status=${s}` : ''}`),
  futurePlans:     ()     => request('/api/future-plans'),
  missedTasks:     ()     => request('/api/missed'),
  notifications:   ()     => request('/api/notifications'),
  tracker:         (d=90) => request(`/api/tracker?days=${d}`),
  createTask:      (p)    => request('/api/tasks',                        { method: 'POST',   body: JSON.stringify(p) }),
  completeTask:    (id)   => request(`/api/tasks/${id}/complete`,         { method: 'PATCH' }),
  completeLateTask:(id)   => request(`/api/tasks/${id}/complete-late`,    { method: 'PATCH' }),
  disbandTask:     (id)   => request(`/api/tasks/${id}/disband`,          { method: 'PATCH' }),

  // Timelines
  timelines:           ()          => request('/api/timelines'),
  createTimeline:      (p)         => request('/api/timelines',                           { method: 'POST',   body: JSON.stringify(p) }),
  deleteTimeline:      (id)        => request(`/api/timelines/${id}`,                     { method: 'DELETE' }),
  addTimelineTask:     (id, p)     => request(`/api/timelines/${id}/tasks`,               { method: 'POST',   body: JSON.stringify(p) }),
  deleteTimelineTask:  (id, tid)   => request(`/api/timelines/${id}/tasks/${tid}`,        { method: 'DELETE' }),
}

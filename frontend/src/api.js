const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch (_) {
      /* ignore */
    }
    throw new Error(detail)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  dashboard: () => request('/api/dashboard'),
  quote: () => request('/api/quote'),
  tasks: (status) => request(`/api/tasks${status ? `?status=${status}` : ''}`),
  futurePlans: () => request('/api/future-plans'),
  missedTasks: () => request('/api/missed'),
  notifications: () => request('/api/notifications'),
  tracker: (days = 90) => request(`/api/tracker?days=${days}`),
  createTask: (payload) => request('/api/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  completeTask: (id) => request(`/api/tasks/${id}/complete`, { method: 'PATCH' }),
  completeLateTask: (id) => request(`/api/tasks/${id}/complete-late`, { method: 'PATCH' }),
  disbandTask: (id) => request(`/api/tasks/${id}/disband`, { method: 'PATCH' }),
}

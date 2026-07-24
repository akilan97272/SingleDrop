// const BASE = import.meta.env.VITE_API_URL || ''
const BASE = '';
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

  // Pomodoro
  pomodoroSessions: (limit = 30) => request(`/api/pomodoro/sessions?limit=${limit}`),
  pomodoroStats:    ()            => request('/api/pomodoro/stats'),
  startPomodoro:    (p)           => request('/api/pomodoro/sessions',                    { method: 'POST',  body: JSON.stringify(p) }),
  completePomodoro: (id, p)       => request(`/api/pomodoro/sessions/${id}/complete`,     { method: 'PATCH', body: JSON.stringify(p) }),

  // Recurring tasks
  recurringTemplates:   ()          => request('/api/recurring/templates'),
  createRecurring:      (p)         => request('/api/recurring/templates',                    { method: 'POST',  body: JSON.stringify(p) }),
  updateRecurring:      (id, p)     => request(`/api/recurring/templates/${id}`,              { method: 'PATCH', body: JSON.stringify(p) }),
  pauseRecurring:       (id)        => request(`/api/recurring/templates/${id}/pause`,        { method: 'PATCH' }),
  resumeRecurring:      (id)        => request(`/api/recurring/templates/${id}/resume`,       { method: 'PATCH' }),
  deleteRecurring:      (id)        => request(`/api/recurring/templates/${id}`,              { method: 'DELETE' }),
  recurringToday:       ()          => request('/api/recurring/today'),
  completeOccurrence:   (id)        => request(`/api/recurring/occurrences/${id}/complete`,   { method: 'PATCH' }),
  missOccurrence:       (id)        => request(`/api/recurring/occurrences/${id}/miss`,       { method: 'PATCH' }),
  updateOccurrenceNotes:(id, p)     => request(`/api/recurring/occurrences/${id}/notes`,      { method: 'PATCH', body: JSON.stringify(p) }),
  recurringHistory:     (limit=60)  => request(`/api/recurring/history?limit=${limit}`),
  recurringHistoryFor:  (tplId)     => request(`/api/recurring/history/${tplId}`),

  // Tags
  tags:            ()          => request('/api/tags'),
  createTag:       (p)         => request('/api/tags',                        { method: 'POST',  body: JSON.stringify(p) }),
  deleteTag:       (id)        => request(`/api/tags/${id}`,                  { method: 'DELETE' }),
  setTaskTags:     (tid, ids)  => request(`/api/tasks/${tid}/tags`,           { method: 'PATCH', body: JSON.stringify(ids) }),
  tagAnalytics:    ()          => request('/api/tags/analytics'),
  tagDetail:       (id)        => request(`/api/tags/${id}/detail`),
  setPomoTagFocus: (sid,tid,m) => request(`/api/pomodoro/sessions/${sid}/tag-focus?tag_id=${tid}&focus_minutes=${m}`, { method: 'PATCH' }),
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Shell from '../components/Shell'
import QuickAddModal from '../components/QuickAddModal'
import { PlayIcon, PauseIcon, SkipIcon, StopIcon, TimerIcon } from '../components/Icons'
import { api } from '../api'
import TagChip from '../components/TagChip'

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const fmt = (s) => {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}

const fmtMins = (mins) => {
  if (!mins || mins <= 0) return '—'
  if (mins < 60) return `${Math.round(mins)}m`
  const h = Math.floor(mins / 60), m = Math.round(mins % 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

const fmtHour = (h) => {
  if (h == null) return '—'
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = h % 12 || 12
  return `${display}:00 ${suffix}`
}

const fmtDatetime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/* ─────────────────────────────────────────────────────────────
   SOUND FILES  (place in public/assets/sounds/)
───────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────
   REFLECTION MODAL
───────────────────────────────────────────────────────────── */
function ReflectionModal({ onSave, onSkip }) {
  const [fs, setFs] = useState(null) // focus score 1-5
  const [di, setDi] = useState(null) // distracted bool
  const [es, setEs] = useState(null) // energy score 1-5
  const [wr, setWr] = useState(null) // would repeat bool

  const save = () => onSave({ focus_score: fs, distracted: di, energy_score: es, would_repeat: wr })

  const Stars = ({ val, onChange }) => (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n === val ? null : n)}
          className={`text-xl transition ${n <= (val||0) ? 'opacity-100' : 'opacity-25'}`}>
          ★
        </button>
      ))}
    </div>
  )

  const YesNo = ({ val, onChange }) => (
    <div className="flex gap-2">
      {['Yes','No'].map(opt => {
        const bval = opt === 'Yes'
        const active = val === bval
        return (
          <button key={opt} onClick={() => onChange(active ? null : bval)}
            className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${
              active ? 'btn-accent text-white' : 'btn-ghost-glass border border-[var(--glass-border)]'
            }`}>
            {opt}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
         style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-strong w-full max-w-sm p-6">
        <h2 className="mb-1 text-lg font-black text-primary-c">Session reflection</h2>
        <p className="mb-5 text-sm text-secondary-c">Optional — takes under 10 seconds.</p>
        <div className="grid gap-4">
          <div>
            <p className="mb-1.5 text-sm font-semibold text-secondary-c">How focused were you?</p>
            <Stars val={fs} onChange={setFs} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold text-secondary-c">Got distracted?</p>
            <YesNo val={di} onChange={setDi} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold text-secondary-c">Energy level?</p>
            <Stars val={es} onChange={setEs} />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold text-secondary-c">Use another session for this task?</p>
            <YesNo val={wr} onChange={setWr} />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onSkip}
            className="flex-1 btn-ghost-glass rounded-2xl border border-[var(--glass-border)] py-2.5 text-sm font-semibold">
            Skip
          </button>
          <button onClick={save}
            className="flex-1 btn-accent rounded-2xl py-2.5 text-sm font-semibold text-white">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   CYCLE DOTS
───────────────────────────────────────────────────────────── */
function CycleDots({ total, done, phase }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className="h-2.5 w-2.5 rounded-full transition-all duration-300"
          style={{
            background: i < done
              ? 'var(--accent-blue)'
              : (i === done && phase === 'work')
                ? 'var(--accent-pink)'
                : 'var(--glass-border)',
            transform: i === done && phase === 'work' ? 'scale(1.35)' : 'scale(1)',
          }}
        />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SECTION WRAPPER
───────────────────────────────────────────────────────────── */
function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="glass overflow-hidden" style={{ borderRadius: '20px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
        style={{ borderBottom: open ? '1px solid var(--glass-border)' : 'none' }}
      >
        <span className="text-sm font-bold uppercase tracking-widest text-secondary-c">{title}</span>
        <span className="text-disabled-c text-sm">{open ? '▴' : '▾'}</span>
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
export default function PomodoroPage() {
  /* ── session config ── */
  const [workMins,  setWorkMins]  = useState(25)
  const [breakMins, setBreakMins] = useState(5)
  const [cycles,    setCycles]    = useState(4)
  const [linkedTask,    setLinkedTask]    = useState('')
  const [todayTasks,    setTodayTasks]    = useState([])
  const [tagMap,        setTagMap]        = useState({})
  const [tagModal,      setTagModal]      = useState(false)
  const [pendingTask,   setPendingTask]   = useState(null)

  /* ── timer state ── */
  const [phase,      setPhase]      = useState('idle') // idle | work | break
  const [running,    setRunning]    = useState(false)
  const [timeLeft,   setTimeLeft]   = useState(0)
  const [cyclesDone, setCyclesDone] = useState(0)
  const [sessionId,  setSessionId]  = useState(null)

  /* ── accumulator refs (avoid stale closure in interval) ── */
  const phaseRef      = useRef('idle')
  const cyclesRef     = useRef(0)
  const configRef     = useRef({ workMins: 25, breakMins: 5, cycles: 4 })
  const focusSecsRef  = useRef(0)
  const breakSecsRef  = useRef(0)
  const sessionIdRef  = useRef(null)
  const startTimeRef  = useRef(null)

  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { cyclesRef.current = cyclesDone }, [cyclesDone])
  useEffect(() => { configRef.current = { workMins, breakMins, cycles } }, [workMins, breakMins, cycles])
  useEffect(() => { sessionIdRef.current = sessionId }, [sessionId])

  /* ── reflection / data ── */
  const [showReflect, setShowReflect]   = useState(false)
  const [interrupted, setInterrupted]   = useState(false)
  const [sessions,    setSessions]      = useState([])
  const [stats,       setStats]         = useState(null)
  const [quickAdd,    setQuickAdd]      = useState(false)
  const [busy,        setBusy]          = useState(false)

  /* ── computed display elapsed ── */
  const focusElapsed = useMemo(() => {
    if (phase === 'idle') return 0
    return cyclesDone * workMins * 60 + (phase === 'work' ? workMins * 60 - timeLeft : workMins * 60)
  }, [cyclesDone, phase, timeLeft, workMins])

  const breakElapsed = useMemo(() => {
    if (phase === 'idle') return 0
    const completedBreaks = Math.min(cyclesDone, cycles - 1)
    return completedBreaks * breakMins * 60 + (phase === 'break' ? breakMins * 60 - timeLeft : 0)
  }, [cyclesDone, phase, timeLeft, breakMins, cycles])

  /* ── load data ── */
  const loadData = () => {
    api.pomodoroSessions().then(setSessions).catch(() => {})
    api.pomodoroStats().then(setStats).catch(() => {})
  }

  useEffect(() => {
    loadData()
    api.tags().then(ts => setTagMap(Object.fromEntries(ts.map(t => [t.id, t])))).catch(() => {})
    api.tasks('planned').then(all => {
      const today = new Date().toISOString().slice(0, 10)
      setTodayTasks(all.filter(t => t.planned_date === today))
    }).catch(() => {})
  }, [])

  /* ── interval timer ── */
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      if (phaseRef.current === 'work')  focusSecsRef.current += 1
      if (phaseRef.current === 'break') breakSecsRef.current += 1

      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(id)
          const ph  = phaseRef.current
          const done = cyclesRef.current
          const cfg  = configRef.current

          if (ph === 'work') {
            const newDone = done + 1
            cyclesRef.current = newDone
            setCyclesDone(newDone)
            if (newDone >= cfg.cycles) {
              // All cycles complete — auto-end
              setRunning(false)
              setPhase('idle')
              phaseRef.current = 'idle'
              setInterrupted(false)
              setShowReflect(true)
            } else {
              setPhase('break')
              phaseRef.current = 'break'
              setRunning(true)
              return cfg.breakMins * 60
            }
          } else {
            setPhase('work')
            phaseRef.current = 'work'
            setRunning(true)
            return cfg.workMins * 60
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running])

  /* ── actions ── */
  const _doStart = async (focusTagId) => {
    setBusy(true)
    try {
      const res = await api.startPomodoro({
        work_minutes:   workMins,
        break_minutes:  breakMins,
        planned_cycles: cycles,
        linked_task_id: linkedTask || null,
      })
      sessionIdRef.current = res.id
      setSessionId(res.id)
      startTimeRef.current = new Date().toISOString()
      focusSecsRef.current = 0
      breakSecsRef.current = 0
      cyclesRef.current = 0
      setCyclesDone(0)
      setPhase('work')
      phaseRef.current = 'work'
      setTimeLeft(workMins * 60)
      setRunning(true)
      if (focusTagId) {
        api.setPomoTagFocus?.(res.id, focusTagId, configRef.current.workMins).catch(() => {})
      }
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  const startSession = async () => {
    const task = todayTasks.find(t => t.id === linkedTask)
    if (task && (task.tags || []).length > 1) {
      setPendingTask(task)
      setTagModal(true)
    } else {
      await _doStart(null)
    }
  }

  const confirmTag = async (tagId) => {
    setTagModal(false)
    setPendingTask(null)
    await _doStart(tagId)
  }

  const endSession = (wasInterrupted = true) => {
    setRunning(false)
    setPhase('idle')
    phaseRef.current = 'idle'
    setInterrupted(wasInterrupted)
    setShowReflect(true)
  }

  const skip = () => {
    const ph  = phaseRef.current
    const done = cyclesRef.current
    const cfg  = configRef.current

    if (ph === 'work') {
      const newDone = done + 1
      cyclesRef.current = newDone
      setCyclesDone(newDone)
      if (newDone >= cfg.cycles) {
        endSession(true)
        return
      }
      setPhase('break')
      phaseRef.current = 'break'
      setTimeLeft(cfg.breakMins * 60)
    } else {
      setPhase('work')
      phaseRef.current = 'work'
      setTimeLeft(cfg.workMins * 60)
    }
  }

  const saveReflection = async (reflection) => {
    setShowReflect(false)
    if (sessionIdRef.current) {
      try {
        await api.completePomodoro(sessionIdRef.current, {
          end_time: new Date().toISOString(),
          total_focus_minutes: focusSecsRef.current / 60,
          total_break_minutes: breakSecsRef.current / 60,
          completed_cycles: cyclesRef.current,
          interrupted,
          reflection,
        })
      } catch (e) { console.error(e) }
    }
    setSessionId(null)
    sessionIdRef.current = null
    loadData()
  }

  const skipReflection = () => saveReflection(null)

  /* ── UI ── */
  const isActive = phase !== 'idle'
  const phaseLabel = phase === 'work' ? 'FOCUS' : phase === 'break' ? 'BREAK' : ''
  const phaseColor = phase === 'work'
    ? 'var(--accent-blue)'
    : phase === 'break'
      ? 'var(--success)'
      : 'var(--text-disabled)'

  return (
    <Shell onQuickAdd={() => setQuickAdd(true)}>
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[1fr_380px]">

        {/* ═══ LEFT — Timer + Config ═══ */}
        <div className="grid gap-5 content-start">

          {/* Timer card */}
          <div className="glass overflow-hidden" style={{ borderRadius: '24px' }}>

            {/* Phase strip */}
            {isActive && (
              <div className="h-1 w-full transition-all duration-700"
                   style={{ background: phaseColor, opacity: 0.8 }} />
            )}

            <div className="flex flex-col items-center gap-4 px-6 py-10">

              {/* Phase label */}
              {isActive && (
                <span className="text-xs font-bold uppercase tracking-[0.35em]"
                      style={{ color: phaseColor }}>
                  {phaseLabel} — cycle {cyclesDone + (phase === 'work' ? 1 : 0)} of {cycles}
                </span>
              )}

              {/* Big countdown */}
              <div className="font-black text-primary-c tabular-nums leading-none"
                   style={{ fontSize: 'clamp(5rem, 18vw, 9rem)', letterSpacing: '-0.04em' }}>
                {isActive ? fmt(timeLeft) : fmt(workMins * 60)}
              </div>

              {/* Cycle dots */}
              {isActive && <CycleDots total={cycles} done={cyclesDone} phase={phase} />}

              {/* Elapsed row */}
              {isActive && (
                <div className="flex gap-6 text-sm text-secondary-c">
                  <span>Focus: {fmt(focusElapsed)}</span>
                  <span>Break: {fmt(breakElapsed)}</span>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-3 mt-2">
                {!isActive ? (
                  <button
                    onClick={startSession}
                    disabled={busy}
                    className="btn-accent flex items-center gap-2 rounded-2xl px-8 py-3.5 text-base font-bold text-white disabled:opacity-60"
                  >
                    <PlayIcon /> {busy ? 'Starting…' : 'Start Session'}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setRunning(r => !r)}
                      className="btn-accent flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-bold text-white"
                    >
                      {running ? <PauseIcon /> : <PlayIcon />}
                      {running ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={skip}
                      className="btn-ghost-glass flex items-center gap-2 rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-sm font-semibold"
                      title="Skip to next phase"
                    >
                      <SkipIcon /> Skip
                    </button>
                    <button
                      onClick={() => endSession(true)}
                      className="chip-danger flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition hover:brightness-110"
                      title="End session"
                    >
                      <StopIcon /> End
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>

          {/* Session config */}
          <Section title="Session Setup" defaultOpen={!isActive}>
            <div className="grid gap-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Focus (min)', val: workMins,  set: setWorkMins,  min: 1,  max: 120 },
                  { label: 'Break (min)', val: breakMins, set: setBreakMins, min: 1,  max: 60  },
                  { label: 'Cycles',      val: cycles,    set: setCycles,    min: 1,  max: 20  },
                ].map(({ label, val, set, min, max }) => (
                  <div key={label}>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary-c">
                      {label}
                    </label>
                    <input
                      type="number" min={min} max={max} value={val}
                      disabled={isActive}
                      onChange={e => set(Math.min(max, Math.max(min, +e.target.value)))}
                      className="input-glass w-full px-3 py-2.5 text-center text-sm font-bold outline-none disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>

              {/* Link task */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary-c">
                  Link task (optional)
                </label>
                <select
                  value={linkedTask}
                  disabled={isActive}
                  onChange={e => setLinkedTask(e.target.value)}
                  className="input-glass w-full px-3 py-2.5 text-sm outline-none disabled:opacity-50"
                >
                  <option value="">— none —</option>
                  {todayTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </Section>

        </div>

        {/* ═══ RIGHT — Stats + History ═══ */}
        <div className="grid gap-5 content-start">

          {/* Stats */}
          <Section title="Statistics">
            {stats ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Today',     val: fmtMins(stats.total_focus_today) },
                  { label: 'This week', val: fmtMins(stats.total_focus_week)  },
                  { label: 'Longest',   val: fmtMins(stats.longest_session)   },
                  { label: 'Average',   val: fmtMins(stats.average_session)   },
                  { label: 'Completed', val: stats.sessions_completed          },
                  { label: 'Peak hour', val: fmtHour(stats.most_productive_hour) },
                ].map(({ label, val }) => (
                  <div key={label} className="glass rounded-2xl p-4" style={{ borderRadius: '16px' }}>
                    <div className="text-xs font-semibold uppercase tracking-wider text-secondary-c mb-1">
                      {label}
                    </div>
                    <div className="text-xl font-black text-primary-c leading-none">{val}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-secondary-c">No sessions yet.</div>
            )}
          </Section>

          {/* Session history */}
          <Section title="Previous Sessions">
            {sessions.length === 0 ? (
              <p className="text-sm text-secondary-c italic">No completed sessions yet.</p>
            ) : (
              <div className="grid gap-3 max-h-[480px] overflow-y-auto pr-1">
                {sessions.map(s => (
                  <div key={s.id} className="glass rounded-2xl p-4" style={{ borderRadius: '16px' }}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-sm font-semibold text-primary-c">
                        {fmtMins(s.total_focus_minutes)} focus
                      </span>
                      <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold uppercase ${
                        s.interrupted ? 'chip-danger' : 'chip-success'
                      }`}>
                        {s.interrupted ? 'interrupted' : 'complete'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-secondary-c">
                      <span>{s.completed_cycles}/{s.planned_cycles} cycles</span>
                      <span>{fmtMins(s.break_minutes)} break</span>
                      <span>{fmtDatetime(s.start_time)}</span>
                    </div>
                    {s.linked_task_title && (
                      <div className="mt-1.5 text-xs text-disabled-c">
                        ⟐ {s.linked_task_title}
                      </div>
                    )}
                    {s.reflection && (
                      <div className="mt-2 flex flex-wrap gap-2 border-t pt-2"
                           style={{ borderColor: 'var(--glass-border)' }}>
                        {s.reflection.focus_score != null && (
                          <span className="text-xs text-secondary-c">
                            Focus {'★'.repeat(s.reflection.focus_score)}{'☆'.repeat(5-s.reflection.focus_score)}
                          </span>
                        )}
                        {s.reflection.energy_score != null && (
                          <span className="text-xs text-secondary-c">
                            Energy {'★'.repeat(s.reflection.energy_score)}{'☆'.repeat(5-s.reflection.energy_score)}
                          </span>
                        )}
                        {s.reflection.distracted != null && (
                          <span className="text-xs text-secondary-c">
                            {s.reflection.distracted ? '⚡ Distracted' : '✓ Focused'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

        </div>
      </div>

      {showReflect && <ReflectionModal onSave={saveReflection} onSkip={skipReflection} />}
      <QuickAddModal open={quickAdd} onClose={() => setQuickAdd(false)} onCreate={p => api.createTask(p)} />

      {tagModal && pendingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
             style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-strong w-full max-w-sm p-6">
            <h2 className="font-black text-lg text-primary-c mb-1">What are you focusing on?</h2>
            <p className="text-sm text-secondary-c mb-4">
              Task: <span className="font-semibold text-primary-c">{pendingTask.title}</span>
            </p>
            <div className="grid gap-2">
              {(pendingTask.tags || []).map(tid => {
                const tag = tagMap[tid]
                return (
                  <button key={tid} onClick={() => confirmTag(tid)}
                    className="btn-ghost-glass rounded-2xl border border-[var(--glass-border)] px-4 py-3 text-left hover:brightness-110 transition">
                    {tag ? <TagChip tag={tag} /> : <span className="font-semibold text-primary-c">{tid}</span>}
                  </button>
                )
              })}
              <button onClick={() => confirmTag(null)}
                className="mt-1 text-xs text-secondary-c hover:text-primary-c transition py-2">
                Skip — focus on the whole task
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}
import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { api } from '../api'
import {
  TrackerIcon, FutureIcon, DeprecatedIcon, PlanIcon, BellIcon,
  SunIcon, MoonIcon, HomeIcon, ListIcon,
} from './Icons'

function IconLink({ to, title, active, children }) {
  return (
    <Link
      to={to}
      title={title}
      className={`grid h-10 w-10 place-items-center rounded-xl border transition
        ${active
          ? 'border-brand-500 bg-brand-500 text-white shadow-glow'
          : 'border-brand-900/10 bg-white/70 text-brand-700 hover:bg-brand-50 dark:border-white/10 dark:bg-white/5 dark:text-brand-200 dark:hover:bg-white/10'}`}
    >
      {children}
    </Link>
  )
}

function NotificationBell({ notifications, mindsetNote }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        title="Notifications"
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-brand-900/10 bg-white/70 text-brand-700 transition hover:bg-brand-50 dark:border-white/10 dark:bg-white/5 dark:text-brand-200 dark:hover:bg-white/10"
      >
        <BellIcon />
        {notifications?.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
            {notifications.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[88vw] rounded-2xl border border-brand-900/10 bg-white p-3 shadow-2xl dark:border-white/10 dark:bg-brand-950">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">
            Notification box
          </div>
          <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
            {notifications?.length ? (
              notifications.map((n, i) => (
                <div key={i} className="rounded-xl bg-brand-50 p-2.5 text-sm text-brand-900 dark:bg-white/5 dark:text-brand-100">
                  {n.message}
                </div>
              ))
            ) : (
              <div className="text-sm text-brand-700/70 dark:text-brand-200/70">Nothing pending.</div>
            )}
          </div>
          {mindsetNote && (
            <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-2.5 text-xs text-amber-700 dark:text-amber-200">
              {mindsetNote}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Shell({ children }) {
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const is = (p) => location.pathname === p
  const [notif, setNotif] = useState({ notifications: [], mindset_note: '' })

  useEffect(() => {
    let alive = true
    const load = () => api.notifications().then((d) => { if (alive) setNotif(d) }).catch(() => {})
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#eafbf1,_#f6fdf9_45%,_#ffffff_100%)] text-brand-950 transition-colors dark:bg-[radial-gradient(circle_at_top,_#0c2418,_#071a10_45%,_#040f0a_100%)] dark:text-brand-50">
      <header className="sticky top-0 z-20 border-b border-brand-900/10 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-brand-950/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="Single Drop logo" className="h-11 w-11 rounded-2xl shadow-glow" />
            <div>
              <div className="text-lg font-black leading-none tracking-tight">Single Drop</div>
              <div className="text-[11px] text-brand-700/70 dark:text-brand-300/70">one day. one drop. no date dragging.</div>
            </div>
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-2">
            <IconLink to="/" title="Dashboard" active={is('/')}><HomeIcon /></IconLink>
            <IconLink to="/tasks" title="Completed & upcoming tasks" active={is('/tasks')}><ListIcon /></IconLink>
            <IconLink to="/tracker" title="Progress tracker" active={is('/tracker')}><TrackerIcon /></IconLink>
            <IconLink to="/future-plans" title="Future task allocation" active={is('/future-plans')}><FutureIcon /></IconLink>
            <IconLink to="/deprecated" title="Deprecated / missed tasks" active={is('/deprecated')}><DeprecatedIcon /></IconLink>
            <IconLink to="/plan-tomorrow" title="Plan your tomorrow" active={is('/plan-tomorrow')}><PlanIcon /></IconLink>
            <NotificationBell notifications={notif.notifications} mindsetNote={notif.mindset_note} />
            <button
              title="Toggle light / dark"
              onClick={toggle}
              className="grid h-10 w-10 place-items-center rounded-xl border border-brand-900/10 bg-white/70 text-brand-700 transition hover:bg-brand-50 dark:border-white/10 dark:bg-white/5 dark:text-brand-200 dark:hover:bg-white/10"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </nav>
        </div>
      </header>

      {children}

      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-6 text-center text-xs text-brand-700/60 dark:text-brand-300/50">
        built for the days you still show up.
      </footer>
    </div>
  )
}

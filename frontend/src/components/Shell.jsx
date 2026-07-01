import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { api } from '../api'
import {
  TrackerIcon, FutureIcon, DeprecatedIcon, PlanIcon, BellIcon,
  SunIcon, MoonIcon, ZapIcon, HomeIcon, ListIcon,
} from './Icons'

function IconLink({ to, title, active, children }) {
  return (
    <Link
      to={to}
      title={title}
      className={`grid h-10 w-10 place-items-center rounded-xl border transition
        ${active
          ? 'btn-accent border-transparent'
          : 'btn-ghost-glass border-[var(--glass-border)] text-secondary-c hover:text-primary-c'}`}
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
        className="btn-ghost-glass relative grid h-10 w-10 place-items-center rounded-xl border border-[var(--glass-border)] text-secondary-c transition hover:text-primary-c"
      >
        <BellIcon />
        {notifications?.length > 0 && (
          <span className="glow-pink absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold text-white" style={{ backgroundImage: 'var(--accent-gradient)' }}>
            {notifications.length}
          </span>
        )}
      </button>
      {open && (
        <div className="glass-strong absolute right-0 z-30 mt-2 w-80 max-w-[88vw] p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-secondary-c">
            Notification box
          </div>
          <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 scrollbar-glass">
            {notifications?.length ? (
              notifications.map((n, i) => (
                <div key={i} className="glass rounded-xl p-2.5 text-sm text-primary-c">
                  {n.message}
                </div>
              ))
            ) : (
              <div className="text-sm text-secondary-c">Nothing pending.</div>
            )}
          </div>
          {mindsetNote && (
            <div className="chip-warning mt-3 rounded-xl p-2.5 text-xs">
              {mindsetNote}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const THEME_OPTIONS = [
  { key: 'light', label: 'Light', Icon: SunIcon },
  { key: 'dark', label: 'Dark', Icon: MoonIcon },
  { key: 'rage', label: 'Rage', Icon: ZapIcon },
]

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  return (
    <div className="glass-pill flex items-center gap-0.5 p-1">
      {THEME_OPTIONS.map(({ key, label, Icon }) => {
        const active = theme === key
        return (
          <button
            key={key}
            title={label}
            onClick={() => setTheme(key)}
            className={`grid h-8 w-8 place-items-center rounded-full transition ${
              active
                ? key === 'rage'
                  ? 'glow-pink text-white'
                  : 'text-white'
                : 'text-secondary-c hover:text-primary-c'
            }`}
            style={active ? { backgroundImage: 'var(--accent-gradient)' } : undefined}
          >
            <Icon />
          </button>
        )
      })}
    </div>
  )
}

export default function Shell({ children }) {
  const location = useLocation()
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
    <div className="min-h-screen text-primary-c transition-colors">
      <header className="sticky top-0 z-20 border-b" style={{ borderColor: 'var(--glass-border)', background: 'var(--header-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-3">
            <img src="/assets/logo.png" alt="Single Drop logo" className="glow-purple h-11 w-11 rounded-2xl" />
            <div>
              <div className="text-lg font-black leading-none tracking-tight gradient-text">Single Drop</div>
              <div className="text-[11px] text-secondary-c">one day. one drop. no date dragging.</div>
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
            <ThemeSwitcher />
          </nav>
        </div>
      </header>

      {children}

      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-6 text-center text-xs text-disabled-c">
        built for the days you still show up.
      </footer>
    </div>
  )
}

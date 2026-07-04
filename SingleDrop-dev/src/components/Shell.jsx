import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { api } from '../api'
import {
  HomeIcon, ListIcon, TrackerIcon, TimelineIcon,
  FutureIcon, DeprecatedIcon, PlanIcon,
  BellIcon, SunIcon, MoonIcon, ZapIcon, PlusIcon,
} from './Icons'

/* ── theme meta ── */
const THEME_META = {
  light: { Icon: SunIcon,  label: 'Light' },
  dark:  { Icon: MoonIcon, label: 'Dark'  },
  rage:  { Icon: ZapIcon,  label: 'Rage'  },
}

/* ── nav items ── */
const NAV = [
  { to: '/',              Icon: HomeIcon,       label: 'Dashboard'    },
  { to: '/tasks',         Icon: ListIcon,       label: 'Tasks'        },
  { to: '/tracker',       Icon: TrackerIcon,    label: 'Tracker'      },
  { to: '/timeline',      Icon: TimelineIcon,   label: 'Timeline'     },
  { to: '/future-plans',  Icon: FutureIcon,     label: 'Future Plans' },
  { to: '/deprecated',    Icon: DeprecatedIcon, label: 'Deprecated'   },
  { to: '/plan-tomorrow', Icon: PlanIcon,       label: 'Plan Tomorrow'},
]
const DOCK_LEFT  = ['/', '/tasks']
const DOCK_RIGHT = ['/tracker', '/timeline']

/* ── sub-components ── */

function ThemeCycler() {
  const { theme, cycle } = useTheme()
  const { Icon } = THEME_META[theme]
  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme}`}
      className="btn-ghost-glass grid h-8 w-8 place-items-center rounded-full border border-[var(--glass-border)] text-secondary-c transition hover:text-primary-c"
    >
      <Icon />
    </button>
  )
}

function NotifBell({ notifications, mindsetNote }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="btn-ghost-glass relative grid h-8 w-8 place-items-center rounded-full border border-[var(--glass-border)] text-secondary-c transition hover:text-primary-c"
        title="Notifications"
      >
        <BellIcon />
        {notifications?.length > 0 && (
          <span
            className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[11px] font-bold text-white"
            style={{ backgroundImage: 'var(--accent-gradient)' }}
          >
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="glass-strong absolute right-0 top-11 z-50 w-80 max-w-[90vw] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-secondary-c">
            Notifications
          </p>
          <div className="grid max-h-64 gap-2 overflow-y-auto">
            {notifications?.length
              ? notifications.map((n, i) => (
                  <div key={i} className="glass rounded-xl p-3 text-sm text-primary-c">{n.message}</div>
                ))
              : <p className="text-sm text-secondary-c">Nothing pending.</p>
            }
          </div>
          {mindsetNote && (
            <div className="chip-warning mt-3 rounded-xl p-3 text-sm italic">{mindsetNote}</div>
          )}
        </div>
      )}
    </div>
  )
}

function NavLink({ to, Icon, label, active }) {
  return (
    <Link
      to={to}
      className={`group flex h-8 items-center gap-0 overflow-hidden rounded-full border px-2 transition-all duration-200 hover:gap-1.5 hover:px-3 ${
        active
          ? 'border-transparent text-white'
          : 'btn-ghost-glass border-[var(--glass-border)] text-secondary-c hover:text-primary-c'
      }`}
      style={active ? { backgroundImage: 'var(--accent-gradient)' } : undefined}
    >
      <Icon className="shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold opacity-0 transition-all duration-200 group-hover:max-w-[120px] group-hover:opacity-100">
        {label}
      </span>
    </Link>
  )
}

/* ═══════════════════════════════════════════════════
   SHELL
═══════════════════════════════════════════════════ */
export default function Shell({ children, onQuickAdd }) {
  const { pathname } = useLocation()
  const [notif, setNotif] = useState({ notifications: [], mindset_note: '' })

  useEffect(() => {
    let alive = true
    const load = () => api.notifications().then(d => { if (alive) setNotif(d) }).catch(() => {})
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return (
    <div className="min-h-screen text-primary-c">

      {/* ══ DESKTOP TOP BAR — transparent outer, pill has glass ══ */}
      <header
        className="hidden md:block sticky top-0 z-30 px-6 py-3"
        style={{ background: 'transparent' }}
      >
        {/* Pill — matches max-w-7xl so it aligns with all page content */}
        <div
          className="glass mx-auto flex max-w-7xl items-center gap-2 px-4 py-2"
          style={{ borderRadius: '999px' }}
        >
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2 mr-1">
            <img src="/assets/logo.png" alt="logo" className="h-8 w-8 rounded-xl" />
            <span className="text-sm font-black tracking-tight gradient-text">Single Drop</span>
          </Link>

          <div className="h-5 w-px shrink-0" style={{ background: 'var(--glass-border)' }} />

          {/* Nav icons */}
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV.map(({ to, Icon, label }) => (
              <NavLink key={to} to={to} Icon={Icon} label={label} active={pathname === to} />
            ))}
          </nav>

          {/* Right utils */}
          <div className="flex shrink-0 items-center gap-1.5">
            <NotifBell notifications={notif.notifications} mindsetNote={notif.mindset_note} />
            <ThemeCycler />
            <div
              className="grid h-8 w-8 place-items-center rounded-full text-xs font-black text-white"
              style={{ backgroundImage: 'var(--accent-gradient)' }}
            >
              SD
            </div>
          </div>
        </div>
      </header>

      {/* ══ MOBILE TOP BAR — just the floating capsule, no outer box ══ */}
      <header
        className="md:hidden sticky top-0 z-30 px-4 py-3"
        style={{ background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none' }}
      >
        {/* Only the pill is visible — no parent background */}
        <div
          className="glass flex items-center justify-between px-4 py-2.5"
          style={{ borderRadius: '999px' }}
        >
          <Link to="/" className="flex items-center gap-2">
            <img src="/assets/logo.png" alt="logo" className="h-7 w-7 rounded-lg" />
            <span className="text-sm font-black tracking-tight gradient-text">Single Drop</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotifBell notifications={notif.notifications} mindsetNote={notif.mindset_note} />
            <ThemeCycler />
          </div>
        </div>
      </header>

      {/* ══ PAGE CONTENT ══ */}
      <main className="pb-28 md:pb-6">
        {children}
      </main>

      {/* ══ MOBILE BOTTOM DOCK — capsule dock only ══ */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 px-4 pb-4 pt-2"
        style={{ background: 'transparent' }}
      >
        <div
          className="glass flex items-center justify-around px-2 py-2"
          style={{ borderRadius: '999px' }}
        >
          {DOCK_LEFT.map(path => {
            const item = NAV.find(n => n.to === path)
            if (!item) return null
            const active = pathname === path
            return (
              <Link
                key={path} to={path} title={item.label}
                className={`grid h-9 w-9 place-items-center rounded-full transition ${
                  active ? 'text-white' : 'text-secondary-c hover:text-primary-c'
                }`}
                style={active ? { backgroundImage: 'var(--accent-gradient)' } : undefined}
              >
                <item.Icon />
              </Link>
            )
          })}

          {/* Centre ADD pill */}
          <button
            onClick={onQuickAdd}
            className="btn-accent mx-1 flex h-10 items-center gap-1.5 rounded-full px-5 text-sm font-bold text-white"
          >
            <PlusIcon className="h-4 w-4" />
            Add
          </button>

          {DOCK_RIGHT.map(path => {
            const item = NAV.find(n => n.to === path)
            if (!item) return null
            const active = pathname === path
            return (
              <Link
                key={path} to={path} title={item.label}
                className={`grid h-9 w-9 place-items-center rounded-full transition ${
                  active ? 'text-white' : 'text-secondary-c hover:text-primary-c'
                }`}
                style={active ? { backgroundImage: 'var(--accent-gradient)' } : undefined}
              >
                <item.Icon />
              </Link>
            )
          })}
        </div>
      </nav>

    </div>
  )
}
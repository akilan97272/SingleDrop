import React, { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { api } from '../api'
import {
  HomeIcon, ListIcon, TrackerIcon, RecurringIcon, TagIcon, PromiseIcon,
  FutureIcon, DeprecatedIcon, PlanIcon, BellIcon, SunIcon, MoonIcon,
  MonoIcon, PlusIcon, TimerIcon, HelpIcon, MenuIcon,
} from './Icons'

/* ── theme ── */
const THEME_META = {
  light: { Icon: SunIcon,  label: 'Light' },
  dark:  { Icon: MoonIcon, label: 'Dark'  },
  mono:  { Icon: MonoIcon, label: 'Mono'  },
}

/* ── full nav list ── */
const NAV = [
  { to: '/',              Icon: HomeIcon,       label: 'Dashboard'    },
  { to: '/tasks',         Icon: ListIcon,       label: 'Tasks'        },
  { to: '/tracker',       Icon: TrackerIcon,    label: 'Tracker'      },
  { to: '/recurring',     Icon: RecurringIcon,  label: 'Recurring'    },
  { to: '/tags',          Icon: TagIcon,         label: 'Tags'        },
  { to: '/promises',      Icon: PromiseIcon,    label: 'Promises'     },
  { to: '/pomodoro',      Icon: TimerIcon,      label: 'Pomodoro'     },
  { to: '/future-plans',  Icon: FutureIcon,     label: 'Future Plans' },
  { to: '/deprecated',    Icon: DeprecatedIcon, label: 'Deprecated'   },
  { to: '/plan-tomorrow', Icon: PlanIcon,       label: 'Plan Tomorrow'},
]

/* ── sub-components ── */
function ThemeCycler() {
  const { theme, cycle } = useTheme()
  const { Icon } = THEME_META[theme]
  return (
    <button onClick={cycle} title={`Theme: ${theme}`}
      className="btn-ghost-glass grid h-8 w-8 place-items-center rounded-full border border-[var(--glass-border)] text-secondary-c transition hover:text-primary-c">
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
      <button onClick={() => setOpen(o => !o)}
        className="btn-ghost-glass relative grid h-8 w-8 place-items-center rounded-full border border-[var(--glass-border)] text-secondary-c transition hover:text-primary-c">
        <BellIcon />
        {notifications?.length > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundImage: 'var(--accent-gradient)' }}>
            {notifications.length}
          </span>
        )}
      </button>
      {open && (
        <div className="glass-strong absolute right-0 top-11 z-50 w-80 max-w-[90vw] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-secondary-c">Notifications</p>
          <div className="grid max-h-64 gap-2 overflow-y-auto">
            {notifications?.length
              ? notifications.map((n, i) => <div key={i} className="glass rounded-xl p-3 text-sm text-primary-c">{n.message}</div>)
              : <p className="text-sm text-secondary-c">Nothing pending.</p>
            }
          </div>
          {mindsetNote && <div className="chip-warning mt-3 rounded-xl p-3 text-sm italic">{mindsetNote}</div>}
        </div>
      )}
    </div>
  )
}

/* ── Drawer (desktop) ── */
function NavDrawer({ open, onClose, pathname }) {
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  if (!open) return null
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40"
           style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
           onClick={onClose} />

      {/* Panel */}
      <div className="fixed left-0 top-0 z-50 h-full w-72 overflow-y-auto"
           style={{ background: 'var(--glass-bg-strong)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRight: '1px solid var(--glass-border)' }}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--glass-border)' }}>
          <Link to="/" onClick={onClose} className="flex items-center gap-2">
            <img src="/assets/logo.png" alt="logo" className="h-8 w-8 rounded-xl" />
            <span className="font-black tracking-tight gradient-text text-sm">Single Drop</span>
          </Link>
          <button onClick={onClose}
            className="btn-ghost-glass grid h-8 w-8 place-items-center rounded-full border border-[var(--glass-border)] text-secondary-c hover:text-primary-c transition">
            ✕
          </button>
        </div>

        {/* Nav items */}
        <nav className="grid gap-1 p-3">
          {NAV.map(({ to, Icon, label }) => {
            const active = pathname === to
            return (
              <Link key={to} to={to} onClick={onClose}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  active ? 'text-white' : 'text-secondary-c hover:text-primary-c hover:brightness-110'
                }`}
                style={active ? { backgroundImage: 'var(--accent-gradient)' } : { background: 'var(--glass-bg)' }}>
                <Icon className="shrink-0 h-5 w-5" />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════
   SHELL
═══════════════════════════════════════════════════ */
export default function Shell({ children, onQuickAdd }) {
  const { pathname } = useLocation()
  const [notif,      setNotif]      = useState({ notifications: [], mindset_note: '' })
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    let alive = true
    const load = () => api.notifications().then(d => { if (alive) setNotif(d) }).catch(() => {})
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  return (
    <div className="min-h-screen text-primary-c">

      {/* ══ DESKTOP TOP BAR ══ */}
      <header className="hidden md:block sticky top-0 z-30 px-6 py-3" style={{ background: 'transparent' }}>
        <div className="glass mx-auto flex max-w-7xl items-center gap-3 px-4 py-2" style={{ borderRadius: '999px' }}>

          {/* Hamburger — leftmost */}
          <button onClick={() => setDrawerOpen(true)} title="Menu"
            className="btn-ghost-glass grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--glass-border)] text-secondary-c transition hover:text-primary-c">
            <MenuIcon />
          </button>

          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img src="/assets/logo.png" alt="logo" className="h-8 w-8 rounded-xl" />
            <span className="text-sm font-black tracking-tight gradient-text">Single Drop</span>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right utils */}
          <div className="flex items-center gap-1.5 shrink-0">
            <NotifBell notifications={notif.notifications} mindsetNote={notif.mindset_note} />
            <ThemeCycler />
            <div className="btn-ghost-glass grid h-8 w-8 place-items-center rounded-full border border-[var(--glass-border)] text-secondary-c transition hover:text-primary-c" title="Help">
              <HelpIcon />
            </div>
          </div>
        </div>
      </header>

      {/* ══ DESKTOP DRAWER ══ */}
      <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} pathname={pathname} />

      {/* ══ MOBILE TOP BAR ══ */}
      <header className="md:hidden sticky top-0 z-30 px-4 py-3" style={{ background: 'transparent', backdropFilter: 'none' }}>
        <div className="glass flex items-center justify-between px-4 py-2.5" style={{ borderRadius: '999px' }}>
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
      <main className="pb-28 md:pb-6">{children}</main>

      {/* ══ MOBILE BOTTOM DOCK — full-name scrollable capsule pills ══ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 px-3 pb-3 pt-1.5"
           style={{ background: 'transparent' }}>
        <div className="glass overflow-x-auto py-2 px-2" style={{ borderRadius: '999px', scrollbarWidth: 'none' }}>
          <div className="flex items-center gap-2" style={{ width: 'max-content' }}>

            {/* Centre ADD pill */}
            <button onClick={onQuickAdd}
              className="btn-accent shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white">
              <PlusIcon className="h-4 w-4" /> Add
            </button>

            {/* All nav items — icon + full label */}
            {NAV.map(({ to, Icon, label }) => {
              const active = pathname === to
              return (
                <Link key={to} to={to}
                  className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition ${
                    active ? 'text-white' : 'btn-ghost-glass border border-[var(--glass-border)] text-secondary-c hover:text-primary-c'
                  }`}
                  style={active ? { backgroundImage: 'var(--accent-gradient)' } : undefined}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

    </div>
  )
}
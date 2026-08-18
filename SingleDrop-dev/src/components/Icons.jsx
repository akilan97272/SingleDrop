import React from 'react'

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

export const TrackerIcon    = (p) => <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}><path d="M4 19V10M10 19V5M16 19v-7M22 19H2" /></svg>
export const FutureIcon     = (p) => <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4M12 13v4M10 15h4" /></svg>
export const DeprecatedIcon = (p) => <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8M10 13h4" /></svg>
export const PlanIcon       = (p) => <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M9 7h6M9 11h6M9 15h3" /></svg>
export const BellIcon       = (p) => <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}><path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9Z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
export const SunIcon        = (p) => <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>
export const MoonIcon       = (p) => <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}><path d="M21 12.5A9 9 0 1 1 11.5 3a7 7 0 0 0 9.5 9.5Z" /></svg>
export const TimerIcon   = (p) => <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2.5M12 5V3M9 3h6" /></svg>
export const HelpIcon    = (p) => <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4M12 18h.01" /></svg>
export const MonoIcon    = (p) => <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" {...p}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></svg>
export const PlayIcon    = (p) => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" {...p}><path d="M8 5.14v14l11-7-11-7Z" /></svg>
export const PauseIcon   = (p) => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" {...p}><rect x="6"  y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
export const SkipIcon    = (p) => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" {...p}><path d="M7 5v14l10-7L7 5ZM19 5h-2v14h2V5Z" /></svg>
export const StopIcon    = (p) => <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" {...p}><rect x="4" y="4" width="16" height="16" rx="2" /></svg>
export const HomeIcon       = (p) => <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}><path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" /></svg>
export const ListIcon       = (p) => <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" /></svg>
export const CheckIcon      = (p) => <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}><path d="M20 6 9 17l-5-5" /></svg>
export const XIcon          = (p) => <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}><path d="M18 6 6 18M6 6l12 12" /></svg>
export const FlameIcon      = (p) => <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}><path d="M12 22c4.5 0 7-2.7 7-6.4 0-3.2-2-5-3.2-7-1 1.6-1.8 2.2-2.6 1.4C14 8 14 5.5 12 2c-1 3-4 5.7-4 9.5C8 9 7 8 6.5 6.8 5.3 8.6 5 11 5 13c0 5 3 9 7 9Z" /></svg>
export const ShieldIcon     = (p) => <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /></svg>
export const PlusIcon       = (p) => <svg viewBox="0 0 24 24" width={22} height={22} {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
export const RecurringIcon = (p) => <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></svg>
export const TagIcon       = (p) => <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}><path d="M12 2H6a2 2 0 0 0-2 2v6l8.59 8.59a2 2 0 0 0 2.82 0l4.59-4.59a2 2 0 0 0 0-2.82L12 2Z" /><circle cx="7.5" cy="7.5" r="1" fill="currentColor" stroke="none" /></svg>
export const PromiseIcon    = (p) => <svg viewBox="0 0 24 24" width={20} height={20} {...base} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
export const TrashIcon      = (p) => <svg viewBox="0 0 24 24" width={15} height={15} {...base} {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
export const ChevronDown    = (p) => <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}><path d="M6 9l6 6 6-6" /></svg>
export const ChevronUp      = (p) => <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}><path d="M18 15l-6-6-6 6" /></svg>
import React from 'react'

export default function StatCard({ icon, label, value, sub, accent = false }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? 'border-brand-500/30 bg-brand-500 text-white shadow-glow'
          : 'border-brand-900/10 bg-white dark:border-white/10 dark:bg-brand-950/40'
      }`}
    >
      <div className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${accent ? 'text-white/80' : 'text-brand-700/60 dark:text-brand-300/60'}`}>
        {icon}
        {label}
      </div>
      <div className="text-3xl font-black leading-none">{value}</div>
      {sub && <div className={`mt-1 text-xs ${accent ? 'text-white/80' : 'text-brand-700/50 dark:text-brand-300/50'}`}>{sub}</div>}
    </div>
  )
}

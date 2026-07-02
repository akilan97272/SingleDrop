import React from 'react'

export default function StatCard({ icon, label, value, sub, accent = false, glowClass = '' }) {
  return (
    <div
      className={`glass p-4 transition ${glowClass}`}
      style={accent ? { backgroundImage: 'var(--accent-gradient)', border: 'none', color: '#fff' } : undefined}
    >
      <div
        className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
          accent ? 'text-white/80' : 'text-secondary-c'
        }`}
      >
        {icon}
        {label}
      </div>
      <div className={`text-3xl font-black leading-none ${accent ? 'text-white' : 'text-primary-c'}`}>
        {value}
      </div>
      {sub && (
        <div className={`mt-1 text-xs ${accent ? 'text-white/75' : 'text-secondary-c'}`}>{sub}</div>
      )}
    </div>
  )
}

import React from 'react'

export default function SectionCard({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-brand-900/10 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-bold">{title}</h2>}
            {subtitle && <p className="text-xs text-brand-700/60 dark:text-brand-300/60">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

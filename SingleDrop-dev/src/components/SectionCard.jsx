import React from 'react'

export default function SectionCard({ title, subtitle, action, children, className = '' }) {
  return (
    <section className={`glass p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-bold text-primary-c">{title}</h2>}
            {subtitle && <p className="text-xs text-secondary-c">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

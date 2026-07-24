import React from 'react'

const COLOR_STYLES = {
  blue:   { bg: 'rgba(96,165,250,0.18)',  text: 'var(--accent-blue)'    },
  purple: { bg: 'rgba(167,139,250,0.18)', text: 'var(--accent-purple)'  },
  cyan:   { bg: 'rgba(34,211,238,0.18)',  text: 'var(--accent-cyan)'    },
  pink:   { bg: 'rgba(244,114,182,0.18)', text: 'var(--accent-pink)'    },
  green:  { bg: 'rgba(52,211,153,0.18)',  text: 'var(--success)'        },
  orange: { bg: 'rgba(251,146,60,0.18)',  text: 'var(--warning)'        },
  red:    { bg: 'rgba(248,113,113,0.18)', text: 'var(--danger)'         },
  grey:   { bg: 'rgba(148,163,184,0.18)', text: 'var(--text-secondary)' },
}

export const TAG_COLORS = Object.keys(COLOR_STYLES)

export function getTagStyle(color) {
  return COLOR_STYLES[color] || COLOR_STYLES.blue
}

export default function TagChip({ tag, onRemove, onClick, small = false }) {
  const s = getTagStyle(tag.color)
  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full font-semibold select-none
        ${small ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'}
        ${onClick || onRemove ? 'cursor-pointer' : ''}
        ${onClick ? 'hover:brightness-110 transition' : ''}
      `}
      style={{ background: s.bg, color: s.text }}
    >
      {tag.name}
      {onRemove && (
        <button type="button"
          onClick={e => { e.stopPropagation(); onRemove(tag.id) }}
          className="ml-0.5 opacity-60 hover:opacity-100 leading-none font-bold">
          ×
        </button>
      )}
    </span>
  )
}

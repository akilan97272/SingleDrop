import React, { useMemo } from 'react'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function GridTracker({ grid }) {
  const weeks = useMemo(() => {
    if (!grid?.length) return []
    const cells = [...grid]
    const first = new Date(cells[0].day)
    const lead = first.getDay()
    const padded = Array(lead).fill(null).concat(cells)
    const cols = []
    for (let i = 0; i < padded.length; i += 7) cols.push(padded.slice(i, i + 7))
    return cols
  }, [grid])

  const monthLabels = useMemo(() => {
    const labels = []
    let lastMonth = null
    weeks.forEach((week, wi) => {
      const firstReal = week.find(Boolean)
      if (!firstReal) return
      const m = new Date(firstReal.day).getMonth()
      if (m !== lastMonth) { labels.push({ index: wi, label: MONTH_NAMES[m] }); lastMonth = m }
    })
    return labels
  }, [weeks])

  if (!grid?.length) return null

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Month labels */}
        <div className="mb-1 flex gap-[3px] pl-7 text-[13px] text-disabled-c">
          {weeks.map((_, wi) => {
            const found = monthLabels.find((m) => m.index === wi)
            return <div key={wi} className="w-[12px]">{found ? found.label : ''}</div>
          })}
        </div>
        <div className="flex gap-[3px]">
          {/* Cells */}
          <div className="flex gap-[3px]">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-rows-7 gap-[3px]">
                {week.map((cell, di) =>
                  cell ? (
                    <div
                      key={di}
                      title={`${cell.day}: ${cell.count} completed`}
                      className={`heat-${cell.level} h-[12px] w-[12px] rounded-[3px] transition`}
                    />
                  ) : (
                    <div key={di} className="h-[12px] w-[12px]" />
                  )
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center gap-1.5 text-[13px] text-disabled-c">
        Less
        {[0,1,2,3,4].map((l) => (
          <div key={l} className={`heat-${l} h-[12px] w-[12px] rounded-[3px]`} />
        ))}
        More
      </div>
    </div>
  )
}
import { ACTIVITY_MAP } from '../utils/dataUtils'

export default function ActivityChart({ data }) {
  const visible = Object.entries(ACTIVITY_MAP).map(([key, { label, color }]) => ({
    key, label, color,
    value: data.reduce((a, r) => a + (r[key] || 0), 0)
  }))

  const max = Math.max(...visible.map(a => a.value), 1)

  return (
    <div className="space-y-2.5">
      {visible.map(({ key, label, color, value }) => (
        <div key={key} className="flex items-center gap-3">
          <div className="text-xs text-ink-secondary truncate flex-shrink-0" style={{ width: 200 }} title={label}>
            {label}
          </div>
          <div className="flex-1 h-2 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round(value / max * 100)}%`, background: color }}
            />
          </div>
          <div className="text-xs font-bold text-ink tabular-nums w-8 text-right flex-shrink-0">
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}

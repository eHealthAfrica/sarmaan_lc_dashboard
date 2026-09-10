import { useEffect, useRef, useState } from 'react'

function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0)
  const raf = useRef(null)
  useEffect(() => {
    if (raf.current) cancelAnimationFrame(raf.current)
    const start = performance.now()
    const animate = (now) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(eased * target))
      if (p < 1) raf.current = requestAnimationFrame(animate)
    }
    raf.current = requestAnimationFrame(animate)
    return () => raf.current && cancelAnimationFrame(raf.current)
  }, [target, duration])
  return value
}

const THEMES = {
  blue:   { bar: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', light: '#dbeafe' },
  green:  { bar: '#10b981', bg: '#f0fdf4', text: '#047857', light: '#d1fae5' },
  amber:  { bar: '#f59e0b', bg: '#fffbeb', text: '#b45309', light: '#fde68a' },
  red:    { bar: '#ef4444', bg: '#fef2f2', text: '#b91c1c', light: '#fecaca' },
  teal:   { bar: '#155c3a', bg: '#f0fdf4', text: '#155c3a', light: '#a7f3d0' },
  purple: { bar: '#8b5cf6', bg: '#faf5ff', text: '#6d28d9', light: '#e9d5ff' },
}

export default function KPICard({ label, desc, value, suffix = '', color = 'blue', icon: Icon, delay = 0 }) {
  const animated = useCountUp(typeof value === 'number' ? value : 0)
  const theme = THEMES[color] || THEMES.blue

  return (
    <div
      className="card card-hover relative overflow-hidden animate-fade-up flex flex-col"
      style={{ animationDelay: `${delay}ms`, padding: '16px', height: '100%' }}
    >
      {/* Accent bar */}
      <div className="kpi-accent-bar" style={{ background: theme.bar }} />

      <div className="flex items-start justify-between gap-2 mb-3">
        <p className="text-xs font-semibold leading-tight" style={{ color: '#6b7280' }}>{label}</p>
        {Icon && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: theme.light }}>
            <Icon size={14} style={{ color: theme.text }} />
          </div>
        )}
      </div>

      {desc && (
        <p className="text-xs mb-3 leading-snug" style={{ color: '#9ca3af' }}>{desc}</p>
      )}

      <div className="flex items-baseline gap-1 mt-auto">
        <span className="font-bold tabular-nums" style={{ fontSize: 26, lineHeight: 1, color: theme.text }}>
          {typeof value === 'number' ? animated.toLocaleString() : value}
        </span>
        {suffix && <span className="text-sm font-medium" style={{ color: '#9ca3af' }}>{suffix}</span>}
      </div>
    </div>
  )
}

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const LINES = [
  { key: 'wards',       name: 'Wards',          color: '#2563eb' },
  { key: 'settlements', name: 'Settlements',     color: '#1D9E75' },
  { key: 'dcs',         name: 'Data collectors', color: '#d97706' },
  { key: 'hh10',        name: 'Households ÷10',  color: '#dc2626' },
]

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card-lg p-3 text-xs min-w-[160px]">
      <div className="font-semibold text-ink mb-2">{label}</div>
      <div className="space-y-1">
        {payload.map(p => (
          <div key={p.dataKey} className="flex justify-between gap-4">
            <span className="text-ink-muted">{p.name}</span>
            <span className="font-semibold" style={{ color: p.color }}>{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CoverageChart({ timeSeries }) {
  const data = timeSeries.map(d => ({ ...d, hh10: Math.round((d.hh || 0) / 10) }))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        {LINES.map(({ key, name, color }) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 inline-block rounded" style={{ background: color }} />
            {name}
          </span>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0efe8" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#8a8a84' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: '#8a8a84' }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {LINES.map(({ key, name, color }) => (
            <Line key={key} type="monotone" dataKey={key === 'hh10' ? 'hh10' : key}
              name={name} stroke={color} strokeWidth={2} dot={false}
              strokeDasharray={key === 'settlements' ? '4 3' : key === 'dcs' ? '2 3' : key === 'hh10' ? '6 2' : undefined}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

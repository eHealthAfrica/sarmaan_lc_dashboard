import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const CustomTooltip = ({ active, payload, label, showWard }) => {
  if (!active || !payload?.length) return null
  const inside     = payload.find(p => p.dataKey === 'inside')?.value      || 0
  const outside    = payload.find(p => p.dataKey === 'outside')?.value     || 0
  const insideWard = payload.find(p => p.dataKey === 'insideWard')?.value  || 0
  const total      = inside + outside
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card-lg p-3 text-xs min-w-[140px]">
      <div className="font-semibold text-ink mb-2">{label}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-ink-muted">Inside LGA</span>
          <span className="font-semibold" style={{ color: '#1D9E75' }}>{inside}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-ink-muted">Outside LGA</span>
          <span className="font-semibold" style={{ color: '#dc2626' }}>{outside}</span>
        </div>
        {showWard && (
          <div className="flex justify-between gap-4">
            <span className="text-ink-muted">Inside Ward</span>
            <span className="font-semibold" style={{ color: '#0090FC' }}>{insideWard}</span>
          </div>
        )}
        <div className="flex justify-between gap-4 pt-1 border-t border-surface-border">
          <span className="text-ink-muted">Total</span>
          <span className="font-bold text-ink">{total}</span>
        </div>
      </div>
    </div>
  )
}

export default function DailyChart({ timeSeries, showWard = false }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#1D9E75' }} />
          Inside LGA
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#dc2626' }} />
          Outside LGA
        </span>
        {showWard && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#0090FC' }} />
            Inside Ward
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={210}>
        <ComposedChart data={timeSeries} barSize={6} barGap={1}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0efe8" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#8a8a84' }}
            tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: '#8a8a84' }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip showWard={showWard} />} cursor={{ fill: '#f7f6f2' }} />
          <Bar dataKey="inside"  stackId="s" fill="#1D9E75" radius={[0,0,0,0]} name="Inside LGA" />
          <Bar dataKey="outside" stackId="s" fill="#dc2626" radius={[3,3,0,0]} name="Outside LGA" />
          {showWard && (
            <Line type="monotone" dataKey="insideWard" stroke="#0090FC" strokeWidth={2} dot={false} name="Inside Ward" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

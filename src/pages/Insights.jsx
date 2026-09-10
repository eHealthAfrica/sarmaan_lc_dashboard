import { useState, useMemo } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown, Home, Users, MapPin, CheckCircle, Clock, Shield } from 'lucide-react'
import FilterBar from '../components/FilterBar'
import { applyFilters, buildLGAStats, getYesterday, ACTIVITY_MAP } from '../utils/dataUtils'

const DEFAULT_FILTERS = {
  dates: null, status: 'all', lga: 'all', coord: 'all',
  dateRange: { start: '', end: '' },
  ward: 'all', wardStatus: 'all',
}

function HighlightCard({ title, desc, items, color = 'border-brand-300', emptyMsg }) {
  if (!items.length && !emptyMsg) return null
  return (
    <div className={`card border-l-4 ${color} flex flex-col`} style={{ height: 228 }}>
      <div className="p-4 pb-2 flex-shrink-0">
        <div className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1">{title}</div>
        {desc && <div className="text-xs text-ink-muted leading-snug">{desc}</div>}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {items.length === 0 ? (
          <div className="text-xs text-ink-faint italic mt-2">{emptyMsg}</div>
        ) : (
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-surface-muted last:border-0">
                <span className="font-semibold text-ink">{item.label}</span>
                <span className="text-ink-muted text-right flex-shrink-0">{item.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function DQSection({ data }) {
  const flags = []

  // Device Yes but zero count
  const deviceZero = {}
  data.forEach(r => {
    if (r.device === 'Yes' && (r.device_count || 0) === 0) {
      if (!deviceZero[r.lga]) deviceZero[r.lga] = []
      deviceZero[r.lga].push(r.date)
    }
  })
  Object.keys(deviceZero).forEach(lga => {
    flags.push({
      icon: '📱', type: 'Device mismatch', lga,
      desc: `Reported device issues on ${deviceZero[lga].length} day(s) (${deviceZero[lga].join(', ')}) but logged zero affected devices. A coordinator cannot flag device issues and log zero devices - follow up required.`
    })
  })

  // Field coordination selected but zero wards/HH
  const fcZero = new Set()
  data.forEach(r => {
    if (r.fieldCoord === 1 && (r.hh || 0) === 0 && (r.wards || 0) === 0 && !fcZero.has(r.lga)) {
      fcZero.add(r.lga)
      flags.push({
        icon: '📋', type: 'Missing coverage data', lga: r.lga,
        desc: 'Selected Field Coordination activity but recorded 0 wards and 0 households on at least one day. Verify coverage figures are being entered correctly.'
      })
    }
  })

  // Submissions but zero HH and wards overall
  const lgaTotals = {}
  data.forEach(r => {
    if (!lgaTotals[r.lga]) lgaTotals[r.lga] = { hh: 0, wards: 0, n: 0 }
    lgaTotals[r.lga].hh += r.hh || 0
    lgaTotals[r.lga].wards += r.wards || 0
    lgaTotals[r.lga].n++
  })
  Object.entries(lgaTotals).forEach(([lga, s]) => {
    if (s.n > 0 && s.hh === 0 && s.wards === 0 && !fcZero.has(lga)) {
      flags.push({
        icon: '📅', type: 'No field coverage data', lga,
        desc: `Has ${s.n} submission(s) but zero wards and zero households recorded. The coordinator may not be selecting Field Coordination & Implementation as the activity type, which is required to trigger coverage questions in the form.`
      })
    }
  })

  if (!flags.length) {
    return (
      <div className="card p-4 flex items-center gap-3 text-sm text-brand-700">
        <CheckCircle size={18} className="text-brand-500 flex-shrink-0" />
        No data quality issues detected in the current filter.
      </div>
    )
  }

  return (
    <div className="card divide-y divide-surface-muted">
      {flags.map((f, i) => (
        <div key={i} className="flex gap-3 p-4">
          <div className="text-lg flex-shrink-0 mt-0.5">{f.icon}</div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm text-ink">{f.lga} LGA</span>
              <span className="badge badge-red text-xs">{f.type}</span>
            </div>
            <p className="text-xs text-ink-secondary leading-relaxed">{f.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function LGANarrativeCard({ stat, stateKPIs, rank, totalLGAs }) {
  const pct = stat.n ? Math.round(stat.inside / stat.n * 100) : 0
  const yesterday = getYesterday()
  const isInactive = stat.lastDate && stat.lastDate < yesterday
  const zeroHH = stat.hh === 0 && stat.n > 0

  const narrative = (() => {
    if (stat.n === 0) return `No submissions recorded in the selected period.`
    const parts = []
    parts.push(`${stat.lga} submitted ${stat.n} report${stat.n !== 1 ? 's' : ''} across ${stat.days.size} active day${stat.days.size !== 1 ? 's' : ''}.`)
    if (stat.wards > 0 || stat.sett > 0) {
      parts.push(`Covered ${stat.wards} ward${stat.wards !== 1 ? 's' : ''} and ${stat.sett} settlement${stat.sett !== 1 ? 's' : ''}, visiting ~${stat.hh.toLocaleString()} households.`)
    } else {
      parts.push(`No ward or household data recorded - coordinator may not be selecting Field Coordination activity type.`)
    }
    if (stat.dcs > 0) parts.push(`${stat.dcs} DC assignment${stat.dcs !== 1 ? 's' : ''} reported; ${stat.forms} form${stat.forms !== 1 ? 's' : ''} completed.`)
    if (stat.dcs_absent > 0) parts.push(`${stat.dcs_absent} DC absence${stat.dcs_absent > 1 ? 's' : ''} recorded.`)
    if (isInactive) parts.push(`Last submission: ${stat.lastDate}.`)
    return parts.join(' ')
  })()

  return (
    <div className="card flex flex-col" style={{ height: 405 }}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-2 p-4 pb-3 flex-shrink-0">
        <div>
          <div className="font-bold text-sm text-ink">{stat.lga}</div>
          {rank && <div className="text-xs text-ink-muted mt-0.5">Rank #{rank} of {totalLGAs} by submissions</div>}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`badge ${pct >= 60 ? 'badge-green' : 'badge-red'}`}>{pct}% inside</span>
          {isInactive
            ? <span className="badge badge-amber">Last: {stat.lastDate}</span>
            : <span className="badge badge-green">Active</span>
          }
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
        {/* Narrative */}
        <p className="text-xs text-ink-secondary leading-relaxed">{narrative}</p>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Submissions', val: stat.n },
            { label: 'Households', val: stat.hh.toLocaleString() },
            { label: 'Wards', val: stat.wards },
            { label: 'Settlements', val: stat.sett },
            { label: 'DCs assigned', val: stat.dcs },
            { label: 'Forms done', val: stat.forms },
          ].map(({ label, val }) => (
            <div key={label} className="bg-surface-muted rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-ink">{val}</div>
              <div className="text-xs text-ink-muted uppercase tracking-wide mt-0.5" style={{ fontSize: 9 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Issues */}
        {(stat.challenges.length || stat.criticals.length || stat.devices.length || stat.securities.length) ? (
          <div className="space-y-2">
            {stat.challenges.map((c, i) => (
              <div key={`ch-${i}`} className="rounded-lg p-2.5 text-xs" style={{ background: '#fffbeb', borderLeft: '3px solid #d97706' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-amber">⚠ Challenge</span>
                  <span className="text-ink-faint">{c.date}</span>
                </div>
                <p className="text-ink-secondary leading-relaxed">{c.desc}</p>
              </div>
            ))}
            {stat.criticals.map((c, i) => (
              <div key={`cr-${i}`} className="rounded-lg p-2.5 text-xs" style={{ background: '#fef2f2', borderLeft: '3px solid #dc2626' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-red">🚨 Critical</span>
                  <span className="text-ink-faint">{c.date}</span>
                </div>
                <p className="text-ink-secondary leading-relaxed">{c.desc}</p>
              </div>
            ))}
            {stat.devices.map((d, i) => (
              <div key={`dv-${i}`} className="rounded-lg p-2.5 text-xs" style={{ background: '#faf5ff', borderLeft: '3px solid #7c3aed' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-purple">📱 Device</span>
                  {d.type && <span className="text-ink-secondary capitalize">{d.type}</span>}
                  <span className="text-ink-faint">{d.date}</span>
                </div>
                <p className="text-ink-secondary leading-relaxed">{d.desc}</p>
                {d.action && (
                  <p className="mt-1 italic" style={{ color: d.resolved?.toLowerCase() === 'yes' ? '#155c3a' : '#d97706' }}>
                    {d.resolved?.toLowerCase() === 'yes' ? '✓ Resolved: ' : '⏳ Pending: '}{d.action}
                  </p>
                )}
              </div>
            ))}
            {stat.securities.map((s, i) => (
              <div key={`se-${i}`} className="rounded-lg p-2.5 text-xs" style={{ background: '#fff7ed', borderLeft: '3px solid #ea580c' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge" style={{ background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' }}>🔒 Security</span>
                  {s.location && <span className="text-ink-secondary">{s.location}</span>}
                  <span className="text-ink-faint">{s.date}</span>
                </div>
                {s.desc && <p className="text-ink-secondary leading-relaxed">{s.desc}</p>}
                {s.action && <p className="mt-1 text-ink-muted italic">Action: {s.action}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-brand-600 flex items-center gap-1.5 mt-1">
            <CheckCircle size={13} /> No issues flagged in selected period
          </div>
        )}

        {zeroHH && (
          <div className="rounded-lg px-3 py-2 text-xs" style={{ background: '#fffbeb', color: '#92400e' }}>
            ⚠ No household data - check Field Coordination activity selection
          </div>
        )}
      </div>
    </div>
  )
}

export default function Insights({ raw, activeState, lgaCount }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const data     = useMemo(() => applyFilters(raw, filters), [raw, filters])
  const allStats = useMemo(() => buildLGAStats(raw), [raw])  // always the full state, unfiltered
  const filtered = useMemo(() => buildLGAStats(data), [data])

  const yesterday = getYesterday()
  const lv = filters.lga

  // Rankings always from full data
  const bySubmissions = [...allStats].filter(s => s.n > 0).sort((a, b) => b.n - a.n)
  const byHH          = [...allStats].filter(s => s.hh > 0).sort((a, b) => b.hh - a.hh)
  const byInside      = [...allStats].filter(s => s.n > 0)
    .map(s => ({ ...s, pct: Math.round(s.inside / s.n * 100) }))
    .sort((a, b) => b.pct - a.pct)
  const zeroHH        = [...allStats].filter(s => s.hh === 0)
  const inactive      = [...allStats]
    .filter(s => s.lastDate && s.lastDate < yesterday)
    .sort((a, b) => a.lastDate.localeCompare(b.lastDate))
  const lowDC         = [...allStats].filter(s => s.n > 0 && s.dcs > 0).sort((a, b) => a.dcs - b.dcs)

  // Filter each ranked list: if LGA filter active, only show that LGA if it earned a spot
  const filterList = (list) => lv === 'all' ? list : list.filter(s => s.lga === lv)
  const emptyMsg   = lv !== 'all' ? `${lv} is not in this ranking.` : ''

  // Per-LGA cards: seed every LGA from RAW, then overlay filtered stats
  const lgaCardStats = useMemo(() => {
    const base = {}
    allStats.forEach(s => { base[s.lga] = { ...s, n: 0, inside: 0, wards: 0, sett: 0, hh: 0, dcs: 0, dcs_partial: 0, dcs_absent: 0, forms: 0, ch: 0, critical: 0, device: 0, security: 0, days: new Set(), challenges: [], criticals: [], devices: [], securities: [] } })
    filtered.forEach(s => { base[s.lga] = s })
    return Object.values(base).sort((a, b) => a.lga.localeCompare(b.lga))
  }, [allStats, filtered])

  const visibleCards = lv === 'all' ? lgaCardStats : lgaCardStats.filter(s => s.lga === lv)
  const ranksMap = Object.fromEntries(bySubmissions.map((s, i) => [s.lga, i + 1]))

  return (
    <div className="p-5 max-w-[1600px] mx-auto">
      {/* Context - only rendered if this state has one configured */}
      {activeState.contextNote && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-2.5 text-xs text-brand-700 mb-4 leading-relaxed">
          <strong>Context:</strong> {activeState.contextNote}
        </div>
      )}

      <FilterBar raw={raw} filters={filters} onChange={setFilters} />

      {/* Performance Highlights */}
      <div className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-2 mt-2">⚡ Performance Highlights</div>
      <div className="bg-surface-muted border border-surface-border rounded-xl px-4 py-2.5 text-xs text-ink-secondary mb-4">
        <strong>Note:</strong> Performance Highlights reflect the full dataset across all {lgaCount} LGAs and are not affected by filters. They represent the true picture of the entire data collection period.
        {lv !== 'all' && <span className="ml-1 font-semibold text-brand-700"> When filtering to {lv}, only {lv} is shown in cards where it earned a ranked position.</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <HighlightCard title="🏆 Highest submission count" desc="LGAs with the most daily reports. Indicates consistent reporting." color="border-brand-400"
          items={filterList(bySubmissions.slice(0, 5)).map(s => ({ label: s.lga, value: `${s.n} reports · ${s.days.size} days` }))}
          emptyMsg={emptyMsg} />
        <HighlightCard title="👇 Lowest submission count" desc="LGAs with the fewest reports. May indicate reporting gaps." color="border-red-400"
          items={filterList(bySubmissions.slice(-5).reverse()).map(s => ({ label: s.lga, value: `${s.n} reports` }))}
          emptyMsg={emptyMsg} />
        <HighlightCard title="🏘 Highest household coverage" desc="LGAs that visited the most households. Reflects field reach." color="border-brand-400"
          items={filterList(byHH.slice(0, 5)).map(s => ({ label: s.lga, value: `${s.hh.toLocaleString()} households` }))}
          emptyMsg={emptyMsg} />
        <HighlightCard title="👇 Lowest household coverage" desc="LGAs with fewest households among those with any data." color="border-amber-400"
          items={filterList(byHH.slice(-5).reverse()).map(s => ({ label: s.lga, value: `${s.hh.toLocaleString()} households` }))}
          emptyMsg={emptyMsg} />
        <HighlightCard title="⚠ Zero households recorded" desc="These LGAs have no household data. Likely not selecting Field Coordination activity type in the form - follow up needed." color="border-red-400"
          items={filterList(zeroHH).map(s => ({ label: s.lga, value: 'No HH data' }))}
          emptyMsg={emptyMsg || 'No LGAs with zero households.'} />
        <HighlightCard title="⏱ LGAs not yet submitted" desc="Last submission date shown. LGAs that have not submitted on the latest data date may need follow-up." color="border-amber-400"
          items={filterList(inactive.slice(0, 10)).map(s => ({ label: s.lga, value: `Last: ${s.lastDate}` }))}
          emptyMsg={emptyMsg || 'All LGAs submitted recently.'} />
        <HighlightCard title="✅ Best field presence" desc="LGAs with the highest % of reports submitted from within their assigned LGA boundary." color="border-brand-400"
          items={filterList(byInside.slice(0, 5)).map(s => ({ label: s.lga, value: `${s.pct}% inside · ${s.n} reports` }))}
          emptyMsg={emptyMsg} />
        <HighlightCard title="📍 Lowest field presence" desc="LGAs with the lowest inside-LGA %. Coordinators spending more time outside their assigned area." color="border-amber-400"
          items={filterList(byInside.slice(-5).reverse()).map(s => ({ label: s.lga, value: `${s.pct}% inside · ${s.n} reports` }))}
          emptyMsg={emptyMsg} />
        <HighlightCard title="👥 Fewest data collectors" desc="Total DC assignments across all days. Low counts may limit coverage." color="border-blue-400"
          items={filterList(lowDC.slice(0, 5)).map(s => ({ label: s.lga, value: `${s.dcs} DCs total` }))}
          emptyMsg={emptyMsg} />
      </div>

      {/* Data Quality */}
      <div className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-3">⚠ Data Quality Flags</div>
      <div className="mb-6">
        <DQSection data={data} />
      </div>

      {/* Per-LGA Cards */}
      <div className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-3">
        📍 Per-LGA Breakdown - {lv === 'all' ? `All ${lgaCount} LGAs` : lv + ' LGA'}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleCards.map(s => (
          <LGANarrativeCard
            key={s.lga}
            stat={s}
            rank={ranksMap[s.lga]}
            totalLGAs={bySubmissions.length}
          />
        ))}
      </div>
    </div>
  )
}

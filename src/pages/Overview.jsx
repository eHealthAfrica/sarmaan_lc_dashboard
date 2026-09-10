import { useState, useMemo } from 'react'
import {
  FileBarChart2, MapPin, UserCheck, Building2, Home,
  AlertTriangle, Shield, Download
} from 'lucide-react'
import KPICard       from '../components/KPICard'
import ChartCard     from '../components/ChartCard'
import DailyChart    from '../components/DailyChart'
import ActivityChart from '../components/ActivityChart'
import CoverageChart from '../components/CoverageChart'
import LGATable      from '../components/LGATable'
import FilterBar     from '../components/FilterBar'
import ReportModal   from '../components/ReportModal'
import { applyFilters, buildLGAStats, buildTimeSeries, computeKPIs, hasWardData } from '../utils/dataUtils'

const DEFAULT_FILTERS = {
  dates: null, status: 'all', lga: 'all', coord: 'all',
  dateRange: { start: '', end: '' },
  ward: 'all', wardStatus: 'all',
}

export default function Overview({ raw, activeState, lgaCount }) {
  const [filters,    setFilters]    = useState(DEFAULT_FILTERS)
  const [showReport, setShowReport] = useState(false)

  const showWard   = useMemo(() => hasWardData(raw), [raw])
  const data       = useMemo(() => applyFilters(raw, filters), [raw, filters])
  const kpis       = useMemo(() => computeKPIs(data), [data])
  const lgaStats   = useMemo(() => buildLGAStats(data), [data])
  const timeSeries = useMemo(() => buildTimeSeries(raw, data), [raw, data])

  const maxSub = Math.max(...lgaStats.map(s => s.n), 1)

  return (
    <div style={{ padding: '16px 20px', overflowX: 'hidden', width: '100%' }}>

      {/* Context banner - only rendered if this state has one configured */}
      {activeState.contextNote && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
          border: '1px solid #a7f3d0',
          borderRadius: 10, padding: '9px 14px',
          fontSize: 12, color: '#065f46', marginBottom: 14,
          lineHeight: 1.5,
        }}>
          <strong>Context:</strong> {activeState.contextNote}
        </div>
      )}

      {/* Filters + Download Report */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4, width: '100%' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <FilterBar raw={raw} filters={filters} onChange={setFilters} />
        </div>
        <button
          onClick={() => setShowReport(true)}
          className="btn-primary"
          style={{ flexShrink: 0, marginTop: 0 }}
        >
          <Download size={13} />
          Download Report
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 10,
        marginBottom: 14,
        width: '100%',
      }}>
        <KPICard label="Total submissions" desc="Daily reports submitted" value={kpis.total} color="blue" icon={FileBarChart2} delay={0} />
        <KPICard label="Active LGAs" desc="LGAs with at least 1 submission" value={kpis.activeLGAs} color="teal" icon={MapPin} delay={50} />
        {showWard ? (
          <KPICard label="Inside Ward %" desc={`${kpis.insideWard} of ${kpis.wardChecked} checked`} value={kpis.insideWardPct} suffix="%" color={kpis.insideWardPct >= 60 ? 'green' : 'amber'} icon={UserCheck} delay={100} />
        ) : (
          <KPICard label="Inside LGA %" desc={`${kpis.inside} of ${kpis.total} reports`} value={kpis.insidePct} suffix="%" color={kpis.insidePct >= 60 ? 'green' : 'amber'} icon={UserCheck} delay={100} />
        )}
        <KPICard label="Wards covered" desc="Total ward visits" value={kpis.wards} color="blue" icon={Building2} delay={150} />
        <KPICard label="Settlements" desc="Total settlement visits" value={kpis.settlements} color="teal" icon={Home} delay={200} />
        <KPICard label="Challenges flagged" desc="Need follow-up" value={kpis.challenges} color={kpis.challenges > 0 ? 'amber' : 'teal'} icon={AlertTriangle} delay={250} />
        <KPICard label="Security incidents" desc="Access or safety flags" value={kpis.security} color={kpis.security > 0 ? 'red' : 'teal'} icon={Shield} delay={300} />
      </div>

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12, width: '100%' }}>
        <ChartCard title="Daily submissions - inside vs outside LGA" desc={showWard ? "Each bar = one day. Green = inside assigned LGA; red = outside. Blue line = inside assigned ward." : "Each bar = one day. Green = inside assigned LGA; red = outside."}>
          <DailyChart timeSeries={timeSeries} showWard={showWard} />
        </ChartCard>
        <ChartCard title="Activity types breakdown" desc="Reports that included each activity. One report can log multiple activities.">
          <ActivityChart data={data} />
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12, width: '100%' }}>
        <ChartCard title="Coverage trends over time" desc="Daily totals. Households ÷10 to share the same axis scale.">
          <CoverageChart timeSeries={timeSeries} />
        </ChartCard>

        <ChartCard title="Coordinator submission count" desc="All LGAs ranked highest to lowest.">
          <div style={{ maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
            {[...lgaStats].sort((a, b) => b.n - a.n).map((s, i) => (
              <div key={s.lga} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, fontSize: 11 }}>
                <span style={{ color: '#9ca3af', width: 18, textAlign: 'right', flexShrink: 0 }}>{i + 1}</span>
                <span style={{ color: '#4b5563', width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.lga}</span>
                <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(s.n / maxSub * 100)}%`, background: '#155c3a', borderRadius: 4, transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontWeight: 700, color: '#111827', width: 24, textAlign: 'right', flexShrink: 0 }}>{s.n}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Issues flagged */}
      <ChartCard title="Issues flagged" desc="Count of reports where each issue was answered Yes." className="mb-3">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 40px' }}>
          {[
            { label: 'Operational challenges',      val: kpis.challenges, color: '#f59e0b' },
            { label: 'Critical issues to escalate', val: kpis.critical,   color: '#ef4444' },
            { label: 'Device / technical issues',   val: kpis.device,     color: '#8b5cf6' },
            { label: 'Security / access incidents', val: kpis.security,   color: '#dc2626' },
          ].map(({ label, val, color }) => {
            const maxVal = Math.max(kpis.challenges, kpis.critical, kpis.device, kpis.security, 1)
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                <span style={{ color: '#6b7280', width: 190, flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(val / maxVal * 100)}%`, background: color, borderRadius: 4 }} />
                </div>
                <span style={{ fontWeight: 700, width: 20, textAlign: 'right', flexShrink: 0, color: val > 0 ? '#dc2626' : '#9ca3af' }}>{val}</span>
              </div>
            )
          })}
        </div>
      </ChartCard>

      {/* Per-LGA Table */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: 10 }}>
          Per-LGA Summary - A to Z
        </div>
        <div className="card" style={{ overflow: 'hidden' }}>
          <LGATable stats={[...lgaStats].sort((a, b) => a.lga.localeCompare(b.lga))} showWard={showWard} />
        </div>
      </div>

      {showReport && <ReportModal raw={raw} data={data} activeState={activeState} lgaCount={lgaCount} onClose={() => setShowReport(false)} />}
    </div>
  )
}

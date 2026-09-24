import { useState } from 'react'
import { X, Presentation, FileText, Clock, Loader2 } from 'lucide-react'
import { generatePPTXReport } from '../utils/reportUtils'
import { generateTripReportDocx } from '../utils/tripReportUtils'
import { generateTimesheetDocx } from '../utils/timesheetUtils'

export default function ReportModal({ raw, data, activeState, lgaCount, onClose }) {
  const [lga,       setLga]       = useState('all')
  const [start,     setStart]     = useState('')
  const [end,       setEnd]       = useState('')
  const [loading,   setLoading]   = useState(null) // 'pptx' | 'trip' | 'timesheet'
  const [done,      setDone]      = useState(null)

  const lgas = [...new Set(raw.map(r => r.lga))].sort()

  const filteredData = data.filter(r => {
    if (start && r.date < start) return false
    if (end   && r.date > end)   return false
    return true
  })

  const downloadPptx = async () => {
    setLoading('pptx')
    setDone(null)
    try {
      await generatePPTXReport({ lga, data: filteredData, raw, dateRange: { start, end }, activeState, lgaCount })
      setDone('pptx')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  const downloadTripReport = async () => {
    setLoading('trip')
    setDone(null)
    try {
      await generateTripReportDocx({ lga, data: filteredData, raw, dateRange: { start, end }, activeState, lgaCount })
      setDone('trip')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(null)
    }
  }

  // Defaults to this LGA's own most recent month of real data (see
  // timesheetUtils.js) unless "From" above is set, which pins the month.
  const downloadTimesheet = async () => {
    setLoading('timesheet')
    setDone(null)
    try {
      await generateTimesheetDocx({ lga, data: filteredData, raw, monthStart: start || null, activeState })
      setDone('timesheet')
    } catch (e) {
      console.error(e)
      alert(e.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-card-lg w-full max-w-lg animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div>
            <h2 className="text-sm font-bold text-ink">Download Report</h2>
            <p className="text-xs text-ink-muted mt-0.5">Generate a PowerPoint, eHA Trip Report, or Monthly Timesheet for one LGA or the full state</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-muted transition-colors">
            <X size={16} className="text-ink-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* LGA selector */}
          <div>
            <label className="text-xs font-semibold text-ink-secondary block mb-1.5">Report scope</label>
            <select
              value={lga}
              onChange={e => setLga(e.target.value)}
              className="w-full filter-select py-2"
            >
              <option value="all">{activeState.name} — All {lgaCount} LGAs</option>
              {lgas.map(l => <option key={l} value={l}>{l} LGA</option>)}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="text-xs font-semibold text-ink-secondary block mb-1.5">Date range (optional)</label>
            <div className="flex items-center gap-2">
              <input type="date" value={start} onChange={e => setStart(e.target.value)} className="filter-select flex-1 py-2" placeholder="From" />
              <span className="text-ink-muted text-xs">to</span>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="filter-select flex-1 py-2" placeholder="To" />
            </div>
          </div>

          {/* Info */}
          <div className="bg-brand-50 rounded-xl p-3 text-xs text-brand-700 border border-brand-200 space-y-1.5">
            <div><strong>PowerPoint:</strong> condensed executive slide deck — state snapshot, top/bottom 5 LGAs, {lga !== 'all' ? `${lga} performance rank, coverage & team metrics,` : 'state-wide data-quality flags,'} key issues, and auto-generated recommendations.</div>
            <div><strong>eHA Trip Report:</strong> the standard eHA trip-report template (Purpose, Summary, Trip Details, Challenges, Opportunities, Recommended Actions, Photo), with every section written from this scope's real numbers.</div>
            <div><strong>Monthly Timesheet:</strong> requires a specific LGA (not "All"). Identifies the coordinator by Ward/LGA, not name. Hours per day are computed from form-open time to server-submission time — a proxy, not a verified figure.</div>
          </div>

          {/* Preview data summary */}
          <div className="text-xs text-ink-muted">
            {filteredData.length} submission{filteredData.length !== 1 ? 's' : ''} will be included in this report
            {(start || end) && ` (${start || '…'} → ${end || '…'})`}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-surface-border flex items-center justify-end gap-3">
          <button onClick={onClose} className="btn-secondary text-sm px-4 py-2">
            Cancel
          </button>
          <button
            onClick={downloadTimesheet}
            disabled={!!loading || lga === 'all'}
            title={lga === 'all' ? 'Select a specific LGA to generate a timesheet' : ''}
            className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
          >
            {loading === 'timesheet' ? <Loader2 size={13} className="animate-spin" /> : <Clock size={13} />}
            Monthly Timesheet (.docx)
          </button>
          <button
            onClick={downloadTripReport}
            disabled={!!loading}
            className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
          >
            {loading === 'trip' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            eHA Trip Report (.docx)
          </button>
          <button
            onClick={downloadPptx}
            disabled={!!loading}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
          >
            {loading === 'pptx' ? <Loader2 size={13} className="animate-spin" /> : <Presentation size={13} />}
            PowerPoint (.pptx)
          </button>
        </div>

        {done && (
          <div className="px-6 pb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
              ✓ {{ pptx: 'PowerPoint', trip: 'eHA Trip Report', timesheet: 'Monthly Timesheet' }[done]} downloaded successfully.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

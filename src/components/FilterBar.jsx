import { useState, useRef, useEffect } from 'react'
import { SlidersHorizontal, ChevronDown, ChevronUp, X } from 'lucide-react'
import { hasWardData, getUniqueWards } from '../utils/dataUtils'

function DateDropdown({ dates, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef()

  useEffect(() => {
    const handler = e => {
      if (btnRef.current && !btnRef.current.closest('[data-dd]').contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = dates.filter(d => d.includes(search))
  const allSelected = selected === null || selected.size === dates.length
  const count = selected ? selected.size : dates.length

  const toggle = (date) => {
    const next = new Set(selected || dates)
    next.has(date) ? next.delete(date) : next.add(date)
    onChange(next.size === dates.length ? null : next)
  }

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPanelPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX })
    }
    setOpen(o => !o)
  }

  return (
    <div data-dd="true" style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 8px', fontSize: 11,
          border: '1px solid #e5e7eb', borderRadius: 6,
          background: '#fff', cursor: 'pointer',
          whiteSpace: 'nowrap', minWidth: 90,
        }}
      >
        <span style={{ flex: 1, textAlign: 'left' }}>
          {allSelected ? 'All dates' : `${count} date${count !== 1 ? 's' : ''}`}
        </span>
        <ChevronDown size={11} style={{ color: '#9ca3af', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'fixed',
          top: panelPos.top,
          left: panelPos.left,
          width: 200,
          maxHeight: 280,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
            <input
              type="text"
              placeholder="Search date…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', fontSize: 11, padding: '3px 7px', border: '1px solid #e5e7eb', borderRadius: 5, outline: 'none' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map(d => (
              <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <input
                  type="checkbox"
                  checked={allSelected || (selected?.has(d) ?? false)}
                  onChange={() => toggle(d)}
                  style={{ width: 12, height: 12, accentColor: '#155c3a', flexShrink: 0 }}
                />
                {d}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', borderTop: '1px solid #f3f4f6', flexShrink: 0 }}>
            <button onClick={() => { onChange(null) }} style={{ flex: 1, fontSize: 10, padding: '6px', border: 'none', background: '#f9fafb', cursor: 'pointer', color: '#6b7280' }}>Select all</button>
            <div style={{ width: 1, background: '#f3f4f6' }} />
            <button onClick={() => { onChange(new Set()) }} style={{ flex: 1, fontSize: 10, padding: '6px', border: 'none', background: '#f9fafb', cursor: 'pointer', color: '#6b7280' }}>Clear all</button>
          </div>
        </div>
      )}
    </div>
  )
}

const selStyle = {
  fontSize: 11, padding: '4px 7px',
  border: '1px solid #e5e7eb', borderRadius: 6,
  background: '#fff', cursor: 'pointer',
  outline: 'none',
}

export default function FilterBar({ raw, filters, onChange }) {
  const [open, setOpen] = useState(false)

  const dates       = [...new Set(raw.map(r => r.date))].sort()
  const lgas        = [...new Set(raw.map(r => r.lga))].sort()
  const showWardFilters = hasWardData(raw)
  const wards       = showWardFilters ? getUniqueWards(raw) : []

  const activeCount = [
    filters.dates !== null ? 1 : 0,
    filters.status !== 'all' ? 1 : 0,
    filters.lga !== 'all' ? 1 : 0,
    filters.dateRange?.start ? 1 : 0,
    (filters.ward && filters.ward !== 'all') ? 1 : 0,
    (filters.wardStatus && filters.wardStatus !== 'all') ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const reset = () => onChange({
    dates: null, status: 'all', lga: 'all', coord: 'all',
    dateRange: { start: '', end: '' },
    ward: 'all', wardStatus: 'all',
  })

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Toggle row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', fontSize: 12, fontWeight: 500,
            border: '1px solid #e5e7eb', borderRadius: 7,
            background: '#fff', cursor: 'pointer', color: '#4b5563',
          }}
        >
          <SlidersHorizontal size={12} />
          Filters
          {activeCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 16, height: 16, borderRadius: '50%',
              background: '#155c3a', color: '#fff', fontSize: 9, fontWeight: 700,
            }}>{activeCount}</span>
          )}
          {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
        {activeCount > 0 && (
          <button onClick={reset} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9ca3af', border: 'none', background: 'none', cursor: 'pointer' }}>
            <X size={11} /> Reset
          </button>
        )}
      </div>

      {/* Filter panel - all on one row */}
      {open && (
        <div style={{
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
          padding: '10px 14px',
          display: 'flex', alignItems: 'flex-end', gap: 10,
          flexWrap: 'nowrap', overflowX: 'auto',
        }}>
          {/* Date range */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date range</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="date" value={filters.dateRange?.start || ''}
                onChange={e => onChange({ ...filters, dateRange: { ...filters.dateRange, start: e.target.value } })}
                style={{ ...selStyle, width: 118 }} />
              <span style={{ color: '#9ca3af', fontSize: 10 }}>to</span>
              <input type="date" value={filters.dateRange?.end || ''}
                onChange={e => onChange({ ...filters, dateRange: { ...filters.dateRange, end: e.target.value } })}
                style={{ ...selStyle, width: 118 }} />
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: '#e5e7eb', flexShrink: 0 }} />

          {/* Date checkbox dropdown */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dates</div>
            <DateDropdown dates={dates} selected={filters.dates} onChange={d => onChange({ ...filters, dates: d })} />
          </div>

          <div style={{ width: 1, height: 28, background: '#e5e7eb', flexShrink: 0 }} />

          {/* LGA status */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>LGA status</div>
            <select value={filters.status} onChange={e => onChange({ ...filters, status: e.target.value })} style={selStyle}>
              <option value="all">All</option>
              <option value="inside">Inside LGA</option>
              <option value="outside">Outside LGA</option>
            </select>
          </div>

          <div style={{ width: 1, height: 28, background: '#e5e7eb', flexShrink: 0 }} />

          {/* LGA */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>LGA</div>
            <select value={filters.lga} onChange={e => onChange({ ...filters, lga: e.target.value })} style={{ ...selStyle, maxWidth: 120 }}>
              <option value="all">All LGAs</option>
              {lgas.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {showWardFilters && (
            <>
              <div style={{ width: 1, height: 28, background: '#e5e7eb', flexShrink: 0 }} />

              {/* Ward status */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ward status</div>
                <select value={filters.wardStatus || 'all'} onChange={e => onChange({ ...filters, wardStatus: e.target.value })} style={selStyle}>
                  <option value="all">All</option>
                  <option value="inside">Inside Ward</option>
                  <option value="outside">Outside Ward</option>
                </select>
              </div>

              <div style={{ width: 1, height: 28, background: '#e5e7eb', flexShrink: 0 }} />

              {/* Ward */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ward</div>
                <select value={filters.ward || 'all'} onChange={e => onChange({ ...filters, ward: e.target.value })} style={{ ...selStyle, maxWidth: 120 }}>
                  <option value="all">All wards</option>
                  {wards.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

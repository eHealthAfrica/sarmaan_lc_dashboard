import { useState, useRef, useEffect } from 'react'
import { RefreshCw, WifiOff, Clock, ChevronDown, Check } from 'lucide-react'

function StateDropdown({ states, activeState, onChangeState }) {
  const [open, setOpen] = useState(false)
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef()

  useEffect(() => {
    const handler = e => {
      if (btnRef.current && !btnRef.current.closest('[data-state-dd]').contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPanelPos({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX })
    }
    setOpen(o => !o)
  }

  return (
    <div data-state-dd="true" style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          border: 'none', cursor: 'pointer',
          padding: '5px 10px', borderRadius: 20,
          fontSize: 11.5, fontWeight: 600,
          background: 'rgba(255,255,255,0.12)', color: '#fff',
        }}
      >
        {activeState.name}
        <ChevronDown size={12} style={{ opacity: 0.8 }} />
      </button>

      {open && (
        <div style={{
          position: 'fixed',
          top: panelPos.top,
          left: panelPos.left,
          minWidth: 180,
          maxHeight: 280,
          overflowY: 'auto',
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          zIndex: 9999,
          padding: 4,
        }}>
          {states.map(s => {
            const active = s.slug === activeState.slug
            return (
              <button
                key={s.slug}
                onClick={() => { onChangeState(s.slug); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  width: '100%', textAlign: 'left',
                  padding: '7px 10px', borderRadius: 7,
                  border: 'none', cursor: 'pointer',
                  background: active ? '#f0fdf4' : 'transparent',
                  color: active ? '#155c3a' : '#374151',
                  fontSize: 12.5, fontWeight: active ? 600 : 500,
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                {s.name}
                {active && <Check size={13} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Header({ page, fetchedAt, loading, error, onRefresh, activeState, lgaCount, states, onChangeState }) {
  const titles = {
    overview: 'LGA Coordinator Daily Report',
    insights: 'Insights - Performance & Coverage',
  }
  const sub = `${activeState.name}, Nigeria  ·  ${lgaCount} LGAs  ·  ${activeState.shortLabel}`

  return (
    <header style={{
      background: 'linear-gradient(135deg, #155c3a 0%, #1d7a50 50%, #155c3a 100%)',
      padding: '10px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      flexShrink: 0,
      borderBottom: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div>
        <h1 style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.3, margin: 0 }}>
          {titles[page]}
        </h1>
        <p style={{ color: '#86c9a8', fontSize: 11, margin: '2px 0 0' }}>
          {sub}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        {/* State selector - only shown once more than one state is configured */}
        {states.length > 1 && (
          <StateDropdown states={states} activeState={activeState} onChangeState={onChangeState} />
        )}

        {/* Status pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 20, padding: '4px 10px',
          fontSize: 11, color: '#c3e8d4',
        }}>
          {error ? (
            <><WifiOff size={11} style={{ color: '#fca5a5' }} /><span style={{ color: '#fca5a5' }}>Fetch failed</span></>
          ) : loading ? (
            <><RefreshCw size={11} style={{ color: '#fcd34d' }} className="animate-spin" /><span style={{ color: '#fcd34d' }}>Refreshing…</span></>
          ) : (
            <>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block', boxShadow: '0 0 6px #4ade80' }} />
              <span>Live</span>
              {fetchedAt && (
                <><span style={{ color: '#4d9e72' }}>·</span><Clock size={10} /><span>{fetchedAt}</span></>
              )}
            </>
          )}
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
            color: '#fff', fontSize: 12, fontWeight: 500,
            opacity: loading ? 0.6 : 1,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </header>
  )
}

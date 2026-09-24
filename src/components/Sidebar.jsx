import { LayoutDashboard, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react'

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'insights', label: 'Insights', icon: BarChart3 },
]

export default function Sidebar({ page, onNavigate, collapsed, onToggle, activeState, lgaCount }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, height: '100vh',
      width: collapsed ? 56 : 200,
      background: 'linear-gradient(180deg, #155c3a 0%, #0d3d26 100%)',
      display: 'flex', flexDirection: 'column',
      transition: 'width 0.3s ease',
      overflow: 'hidden', zIndex: 50,
      boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 12px 10px', gap: 8, overflow: 'hidden' }}>
        {!collapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>SARMAAN</div>
            <div style={{ color: '#6db896', fontSize: 10, marginTop: 1 }}>{activeState.shortLabel} · {lgaCount} LGAs</div>
          </div>
        )}
        <button
          onClick={onToggle}
          style={{
            flexShrink: 0, width: 28, height: 28, borderRadius: 8,
            background: 'rgba(255,255,255,0.12)', border: 'none',
            color: '#fff', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 12px 8px' }} />

      {!collapsed && (
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#4d8c6a', padding: '0 14px 6px' }}>
          Navigation
        </div>
      )}

      {/* Nav links */}
      <nav style={{ flex: 1, padding: '0 8px' }}>
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: 10, padding: collapsed ? '10px 6px' : '9px 10px',
                borderRadius: 8, border: 'none', cursor: 'pointer',
                background: active ? 'rgba(255,255,255,0.16)' : 'transparent',
                color: active ? '#fff' : '#8fd4b4',
                borderLeft: active ? '3px solid #fff' : '3px solid transparent',
                fontSize: 13, fontWeight: active ? 600 : 400,
                textAlign: 'left', marginBottom: 2,
                transition: 'background 0.15s, color 0.15s',
                justifyContent: collapsed ? 'center' : 'flex-start',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8fd4b4' } }}
              title={collapsed ? label : ''}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div style={{ padding: '10px 14px', fontSize: 10, color: '#3d7a58' }}>
          SARMAAN · {activeState.shortLabel}
        </div>
      )}
    </div>
  )
}

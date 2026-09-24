export default function ChartCard({ title, desc, children, className = '', action }) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #f3f4f6' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', marginBottom: desc ? 3 : 0 }}>
              {title}
            </div>
            {desc && <div style={{ fontSize: 11, color: '#b0b8c4', lineHeight: 1.4 }}>{desc}</div>}
          </div>
          {action && <div style={{ flexShrink: 0 }}>{action}</div>}
        </div>
      </div>
      <div style={{ padding: '14px 18px 16px' }}>
        {children}
      </div>
    </div>
  )
}

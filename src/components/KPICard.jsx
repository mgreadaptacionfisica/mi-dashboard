// type "text": el value ya viene formateado por quien llama (ej. euro(n)
// en Dashboard.jsx), así que se muestra tal cual sin volver a formatear.
function formatValue(value, type) {
  if (type === 'text') return value
  if (type === 'currency') return `$${value.toLocaleString('es-MX')}`
  if (type === 'percent') return `${value}%`
  return value.toLocaleString('es-MX')
}

export default function KPICard({ label, value, change, subtext, type = 'number', icon, iconBg, accent }) {
  const isUp = change >= 0
  return (
    <div className="kpi-card" style={accent ? { borderTop: `3px solid ${accent}` } : undefined}>
      <div className="kpi-card-header">
        <span className="kpi-card-label">{label}</span>
        <div className="kpi-icon" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <div className="kpi-card-value">{formatValue(value, type)}</div>
      <div className="kpi-card-footer">
        {typeof change === 'number' ? (
          <>
            <span className={isUp ? 'badge-up' : 'badge-down'}>
              {isUp ? '▲' : '▼'} {Math.abs(change)}%
            </span>
            <span className="badge-text">vs. mes anterior</span>
          </>
        ) : (
          subtext && <span className="badge-text">{subtext}</span>
        )}
      </div>
    </div>
  )
}

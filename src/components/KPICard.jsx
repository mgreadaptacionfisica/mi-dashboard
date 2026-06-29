function formatValue(value, type) {
  if (type === 'currency') return `$${value.toLocaleString('es-MX')}`
  if (type === 'percent') return `${value}%`
  return value.toLocaleString('es-MX')
}

export default function KPICard({ label, value, change, type = 'number', icon, iconBg }) {
  const isUp = change >= 0
  return (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <span className="kpi-card-label">{label}</span>
        <div className="kpi-icon" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <div className="kpi-card-value">{formatValue(value, type)}</div>
      <div className="kpi-card-footer">
        <span className={isUp ? 'badge-up' : 'badge-down'}>
          {isUp ? '▲' : '▼'} {Math.abs(change)}%
        </span>
        <span className="badge-text">vs. mes anterior</span>
      </div>
    </div>
  )
}

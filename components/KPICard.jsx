function formatValue(value, type) {
  if (type === 'currency') return `${value.toLocaleString('es-ES')}€`
  if (type === 'percent') return `${value}%`
  return value.toLocaleString('es-ES')
}

export default function KPICard({ label, value, subtext, type = 'number', icon, iconBg }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <span className="kpi-card-label">{label}</span>
        <div className="kpi-icon" style={{ background: iconBg }}>
          {icon}
        </div>
      </div>
      <div className="kpi-card-value">{formatValue(value, type)}</div>
      {subtext && (
        <div className="kpi-card-footer">
          <span className="badge-text">{subtext}</span>
        </div>
      )}
    </div>
  )
}

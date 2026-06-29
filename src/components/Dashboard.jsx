import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import KPICard from './KPICard'
import Logo from '../assets/mg-logo.svg'
import {
  fetchKPIs,
  fetchVentasMensuales,
  fetchClientesPorSegmento,
  fetchClientesRecientes,
} from '../api/index'

const SEGMENT_COLORS = ['#4f46e5', '#14b8a6', '#f59e0b']

function StatusPill({ estado }) {
  return (
    <span className={`status-pill status-${estado}`}>
      {estado.charAt(0).toUpperCase() + estado.slice(1)}
    </span>
  )
}

export default function Dashboard() {
  const [kpis, setKpis] = useState(null)
  const [ventas, setVentas] = useState([])
  const [segmentos, setSegmentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [periodo, setPeriodo] = useState('6m')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [kpisData, ventasData, segData, cliData] = await Promise.all([
        fetchKPIs(),
        fetchVentasMensuales(periodo),
        fetchClientesPorSegmento(),
        fetchClientesRecientes(),
      ])
      setKpis(kpisData)
      setVentas(ventasData)
      setSegmentos(segData)
      setClientes(cliData)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => { loadData() }, [loadData])

  const today = new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const totalSegmentos = segmentos.reduce((sum, item) => sum + item.cantidad, 0)
  const topSegment = segmentos.reduce((best, item) => (
    item.cantidad > best.cantidad ? item : best
  ), segmentos[0] || { segmento: 'Sin datos', cantidad: 0 })

  return (
    <>
      <header className="topbar">
        <div className="topbar-brand">
          <img src={Logo} alt="MG Group logo" className="topbar-logo" />
          <div>
            <div className="topbar-title">Dashboard ejecutivo</div>
            <div className="topbar-subtitle">{today}</div>
          </div>
        </div>
        <div className="topbar-right">
          <div className="topbar-pill">Live • Actualizado hoy</div>
          <button className="refresh-btn" onClick={loadData} disabled={loading}>
            {loading ? '⏳ Cargando...' : '↻ Actualizar'}
          </button>
        </div>
      </header>

      <main className="page-content">
        {error && (
          <div className="error-state">
            ⚠️ Error al cargar los datos: {error}
          </div>
        )}

        {loading && !kpis ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Cargando datos...</span>
          </div>
        ) : (
          <>
            {kpis && (
              <div className="hero-card">
                <div className="hero-copy">
                  <span className="hero-eyebrow">Resumen ejecutivo</span>
                  <h2>Tu negocio está creciendo con fuerza</h2>
                  <p>
                    Las ventas acumuladas alcanzan <strong>${kpis.ventas_totales.toLocaleString('es-MX')}</strong> y
                    la retención se mantiene en <strong>{kpis.tasa_retencion}%</strong>.
                    El crecimiento de clientes sigue mostrando una tendencia sólida.
                  </p>
                  <div className="hero-actions">
                    <button className="primary-action">Exportar reporte</button>
                    <span className="hero-chip">Meta del mes: 87%</span>
                  </div>
                </div>
                <div className="hero-highlights">
                  <div className="mini-stat">
                    <span>Clientes activos</span>
                    <strong>{kpis.clientes_activos.toLocaleString('es-MX')}</strong>
                  </div>
                  <div className="mini-stat">
                    <span>Ticket promedio</span>
                    <strong>${kpis.ticket_promedio.toLocaleString('es-MX')}</strong>
                  </div>
                  <div className="mini-stat">
                    <span>Segmento líder</span>
                    <strong>{topSegment.segmento}</strong>
                  </div>
                </div>
              </div>
            )}

            {kpis && (
              <div className="kpi-grid">
                <KPICard
                  label="Ventas Totales"
                  value={kpis.ventas_totales}
                  change={kpis.ventas_cambio}
                  type="currency"
                  icon="💰"
                  iconBg="linear-gradient(135deg, #dbeafe, #bfdbfe)"
                />
                <KPICard
                  label="Clientes Activos"
                  value={kpis.clientes_activos}
                  change={kpis.clientes_cambio}
                  type="number"
                  icon="👥"
                  iconBg="linear-gradient(135deg, #d1fae5, #a7f3d0)"
                />
                <KPICard
                  label="Ticket Promedio"
                  value={kpis.ticket_promedio}
                  change={kpis.ticket_cambio}
                  type="currency"
                  icon="🧾"
                  iconBg="linear-gradient(135deg, #fef3c7, #fde68a)"
                />
                <KPICard
                  label="Tasa de Retención"
                  value={kpis.tasa_retencion}
                  change={kpis.retencion_cambio}
                  type="percent"
                  icon="🔄"
                  iconBg="linear-gradient(135deg, #ede9fe, #ddd6fe)"
                />
              </div>
            )}

            <div className="charts-grid">
              <div className="card chart-card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Crecimiento de ventas</div>
                    <div className="card-subtitle">Comparación mensual entre ventas reales y meta</div>
                  </div>
                  <div className="period-selector">
                    {['3m', '6m', '12m'].map(p => (
                      <button
                        key={p}
                        className={`period-btn ${periodo === p ? 'active' : ''}`}
                        onClick={() => setPeriodo(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={ventas} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={value => [`$${Number(value).toLocaleString('es-MX')}`, '']} />
                    <Area type="monotone" dataKey="ventas" stroke="#4f46e5" strokeWidth={3} fill="url(#salesFill)" />
                    <Area type="monotone" dataKey="meta" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" fill="none" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="card chart-card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Distribución por segmento</div>
                    <div className="card-subtitle">Participación de clientes</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={segmentos}
                      dataKey="cantidad"
                      nameKey="segmento"
                      innerRadius={58}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {segmentos.map((_, i) => (
                        <Cell key={i} fill={SEGMENT_COLORS[i % SEGMENT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={value => [value, 'Clientes']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="legend-list">
                  {segmentos.map((item, index) => (
                    <div key={item.segmento} className="legend-item">
                      <span className="legend-dot" style={{ background: SEGMENT_COLORS[index % SEGMENT_COLORS.length] }} />
                      <span>{item.segmento}</span>
                      <strong>{item.cantidad}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bottom-grid">
              <div className="card insight-card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Indicadores clave</div>
                    <div className="card-subtitle">Lo más relevante de la semana</div>
                  </div>
                </div>
                <ul className="insight-list">
                  <li>
                    <span className="insight-badge positive">+12.4%</span>
                    <div>
                      <strong>Ventas mejoradas</strong>
                      <p>El crecimiento del último periodo supera la media histórica.</p>
                    </div>
                  </li>
                  <li>
                    <span className="insight-badge neutral">{Math.round(totalSegmentos / Math.max(segmentos.length, 1))}</span>
                    <div>
                      <strong>Promedio de clientes</strong>
                      <p>El mix de segmentos está bien balanceado y estable.</p>
                    </div>
                  </li>
                  <li>
                    <span className="insight-badge positive">Alta</span>
                    <div>
                      <strong>Retención</strong>
                      <p>La tasa de permanencia sigue sosteniendo el negocio.</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="table-card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Clientes recientes</div>
                    <div className="card-subtitle">Últimas incorporaciones</div>
                  </div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Plan</th>
                      <th>Estado</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.nombre}</td>
                        <td>{c.plan}</td>
                        <td><StatusPill estado={c.estado} /></td>
                        <td style={{ fontWeight: 600 }}>${c.valor.toLocaleString('es-MX')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  )
}

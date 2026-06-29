import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'
import KPICard from './KPICard'
import {
  fetchKPIs,
  fetchClientesPorServicio,
  fetchClientesPorFormaPago,
  fetchProximasRenovaciones,
} from '../api/index'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
const PAGO_COLORS = { 'Stripe': '#635BFF', 'Bizum': '#00ADEF', 'Transferencia': '#10b981' }

function diasLabel(dias) {
  if (dias < 0) return `Venció hace ${Math.abs(dias)}d`
  if (dias === 0) return 'Vence hoy'
  return `${dias}d restantes`
}

function diasColor(dias) {
  if (dias < 0) return '#ef4444'
  if (dias <= 15) return '#f59e0b'
  return '#10b981'
}

export default function Dashboard() {
  const [kpis, setKpis]           = useState(null)
  const [servicios, setServicios] = useState([])
  const [formas, setFormas]       = useState([])
  const [renovaciones, setRenovaciones] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [vistaClientes, setVistaClientes] = useState('renovaciones')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [k, s, f, r] = await Promise.all([
        fetchKPIs(),
        fetchClientesPorServicio(),
        fetchClientesPorFormaPago(),
        fetchProximasRenovaciones(),
      ])
      setKpis(k)
      setServicios(s)
      setFormas(f)
      setRenovaciones(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const today = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Dashboard</div>
          <div className="topbar-subtitle">{today}</div>
        </div>
        <div className="topbar-right">
          <button className="refresh-btn" onClick={loadData} disabled={loading}>
            {loading ? '⏳ Cargando...' : '↻ Actualizar'}
          </button>
        </div>
      </header>

      <main className="page-content">
        {error && <div className="error-state">⚠️ {error}</div>}

        {loading && !kpis ? (
          <div className="loading-state">
            <div className="spinner" />
            <span>Cargando datos...</span>
          </div>
        ) : kpis && (
          <>
            {/* KPIs */}
            <div className="kpi-grid">
              <KPICard
                label="Clientes Activos"
                value={kpis.clientes_activos}
                subtext={`de ${kpis.total_clientes} totales`}
                type="number"
                icon="✅"
                iconBg="#d1fae5"
              />
              <KPICard
                label="High Ticket (Activos)"
                value={kpis.high_ticket}
                subtext={`${kpis.low_ticket} Low Ticket activos`}
                type="number"
                icon="⭐"
                iconBg="#fef3c7"
              />
              <KPICard
                label="Ingresos Registrados"
                value={kpis.ingresos_registrados}
                subtext="pagos recogidos en Notion"
                type="currency"
                icon="💰"
                iconBg="#dbeafe"
              />
              <KPICard
                label="Tasa de Retención"
                value={kpis.tasa_retencion}
                subtext={`${kpis.clientes_no_activos} clientes no activos`}
                type="percent"
                icon="🔄"
                iconBg="#ede9fe"
              />
            </div>

            {/* Gráficos */}
            <div className="charts-grid">
              {/* Clientes por servicio */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Clientes Activos por Servicio</div>
                    <div className="card-subtitle">Distribución por tipo de contrato</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={servicios} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="servicio" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="cantidad" name="Clientes" radius={[6,6,0,0]}>
                      {servicios.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Formas de pago */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <div className="card-title">Forma de Pago</div>
                    <div className="card-subtitle">Todos los clientes</div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={formas}
                      dataKey="cantidad"
                      nameKey="forma"
                      cx="50%" cy="50%"
                      outerRadius={80}
                      label={({ forma, percent }) => `${forma} ${(percent*100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {formas.map((entry, i) => (
                        <Cell key={i} fill={PAGO_COLORS[entry.forma] || COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla renovaciones */}
            <div className="table-card">
              <div className="card-header">
                <div>
                  <div className="card-title">Próximas Renovaciones</div>
                  <div className="card-subtitle">Clientes activos ordenados por fecha de fin</div>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Tipo</th>
                    <th>Servicio</th>
                    <th>Fecha fin</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {renovaciones.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 500 }}>{c.nombre}</td>
                      <td>
                        <span className={`status-pill ${c.tipo === 'HIGH TICKET' ? 'status-activo' : 'status-pendiente'}`}>
                          {c.tipo === 'HIGH TICKET' ? '⭐ High' : '🔵 Low'}
                        </span>
                      </td>
                      <td>{c.servicio}</td>
                      <td style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                        {c.fecha_fin ? new Date(c.fecha_fin + 'T00:00:00').toLocaleDateString('es-ES') : '—'}
                      </td>
                      <td>
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: diasColor(c.dias_restantes)
                        }}>
                          {diasLabel(c.dias_restantes)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  )
}

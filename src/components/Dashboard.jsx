import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts'
import KPICard from './KPICard'
import CalendarioAvisos from './CalendarioAvisos'
import { parseFechaFlexible } from '../utils/fechasEsp'

// Dashboard con datos reales (clientes + ingresos de empresa), en vez del
// snapshot congelado de src/api/index.js (exportado de Notion el 29/06/2026
// y nunca más actualizado). Todo se calcula aquí mismo a partir de los
// props que ya carga App.jsx desde Supabase.

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
const PAGO_COLORS = { 'Stripe': '#635BFF', 'Bizum': '#00ADEF', 'Transferencia': '#10b981', 'HOTMART': '#f59e0b' }

function euro(n) {
  return `${(Number(n) || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}€`
}

// Misma categorización que usa Clientes.jsx: la categoría se deduce del
// programa contratado, no de un campo "Tipo de cliente" que ya no se pide
// en el formulario (quedó obsoleto en la migración a Supabase).
function categoriaPrograma(nombreServicio) {
  const s = (nombreServicio || '').toUpperCase()
  if (s.includes('PREVIENE')) return 'Programa Previene'
  if (s.includes('READAPTATE')) return 'Programa Readáptate'
  return 'Otro'
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function diasEntre(isoDesde, isoHasta) {
  const a = new Date(`${isoDesde}T00:00:00`)
  const b = new Date(`${isoHasta}T00:00:00`)
  return Math.round((b - a) / 86400000)
}

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

export default function Dashboard({ clientes = [], ventas = [], recontactos = [], ingresosEmpresa = [], tareasPersonales = [], contenidoIdeas = [] }) {
  const hoy = todayISO()

  // Aviso de tareas: el panel no puede mandar notificaciones fuera de sí
  // mismo, así que el "recordatorio" es este banner que se ve al entrar en
  // el Dashboard, cuando hay tareas de "Mis tareas" para hoy o vencidas.
  const tareasAviso = useMemo(() => {
    return tareasPersonales
      .filter((t) => !t.hecha && t.fecha && t.fecha <= hoy)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  }, [tareasPersonales, hoy])

  // Mismo mecanismo para vídeos ya editados por el equipo de contenido:
  // en vez de un mensaje externo (el panel no puede mandarlos), se avisa
  // aquí cuando hay algo en estado "Editado" esperando que Raúl lo programe.
  const videosEditadosAviso = useMemo(
    () => contenidoIdeas.filter((i) => i.estado === 'Editado'),
    [contenidoIdeas]
  )

  const stats = useMemo(() => {
    const activos = clientes.filter(c => (c['Estado del cliente'] || '').toUpperCase() === 'ACTIVO')
    const noActivos = clientes.length - activos.length
    const readaptate = activos.filter(c => categoriaPrograma(c['Servicio contratado']) === 'Programa Readáptate').length
    const previene = activos.filter(c => categoriaPrograma(c['Servicio contratado']) === 'Programa Previene').length
    const tasaRetencion = clientes.length > 0 ? Math.round((activos.length / clientes.length) * 1000) / 10 : 0
    return { totalClientes: clientes.length, activos: activos.length, noActivos, readaptate, previene, tasaRetencion }
  }, [clientes])

  const totalIngresosEmpresa = useMemo(
    () => ingresosEmpresa.reduce((sum, e) => sum + (Number(e.importe) || 0), 0),
    [ingresosEmpresa]
  )

  const servicios = useMemo(() => {
    const counts = {}
    clientes.forEach(c => {
      if ((c['Estado del cliente'] || '').toUpperCase() !== 'ACTIVO') return
      const nombre = c['Servicio contratado'] || 'Sin servicio'
      counts[nombre] = (counts[nombre] || 0) + 1
    })
    return Object.entries(counts)
      .map(([servicio, cantidad]) => ({ servicio, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
  }, [clientes])

  const formas = useMemo(() => {
    const counts = {}
    clientes.forEach(c => {
      const forma = c['Forma de pago'] || 'Sin especificar'
      counts[forma] = (counts[forma] || 0) + 1
    })
    return Object.entries(counts).map(([forma, cantidad]) => ({ forma, cantidad }))
  }, [clientes])

  const renovaciones = useMemo(() => {
    return clientes
      .filter(c => (c['Estado del cliente'] || '').toUpperCase() === 'ACTIVO')
      .map(c => {
        const fechaFinISO = parseFechaFlexible(c['Fecha fin'])
        return {
          id: c.id,
          nombre: c.Nombre,
          categoria: categoriaPrograma(c['Servicio contratado']),
          servicio: c['Servicio contratado'],
          fechaFin: fechaFinISO,
          diasRestantes: fechaFinISO ? diasEntre(hoy, fechaFinISO) : null,
        }
      })
      .filter(c => c.fechaFin)
      .sort((a, b) => a.diasRestantes - b.diasRestantes)
      .slice(0, 15)
  }, [clientes, hoy])

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
      </header>

      <main className="page-content">
        {tareasAviso.length > 0 && (
          <div className="tareas-aviso-banner">
            <div>
              <div className="tareas-aviso-titulo">
                🔔 {tareasAviso.length} tarea{tareasAviso.length === 1 ? '' : 's'} pendiente{tareasAviso.length === 1 ? '' : 's'} para hoy o vencida{tareasAviso.length === 1 ? '' : 's'}
              </div>
              <div className="tareas-aviso-lista">
                {tareasAviso.slice(0, 4).map((t) => (
                  <span key={t.id} className="tareas-aviso-item">
                    {t.fecha < hoy ? '⏰' : '📌'} {t.texto}
                  </span>
                ))}
                {tareasAviso.length > 4 && <span className="tareas-aviso-item">+{tareasAviso.length - 4} más</span>}
              </div>
            </div>
          </div>
        )}

        {videosEditadosAviso.length > 0 && (
          <div className="contenido-aviso-banner">
            <div>
              <div className="contenido-aviso-titulo">
                🎬 {videosEditadosAviso.length} vídeo{videosEditadosAviso.length === 1 ? '' : 's'} editado{videosEditadosAviso.length === 1 ? '' : 's'}, listo{videosEditadosAviso.length === 1 ? '' : 's'} para programar
              </div>
              <div className="tareas-aviso-lista">
                {videosEditadosAviso.slice(0, 4).map((i) => (
                  <span key={i.id} className="contenido-aviso-item">📌 {i.titulo || 'Sin título'}</span>
                ))}
                {videosEditadosAviso.length > 4 && <span className="contenido-aviso-item">+{videosEditadosAviso.length - 4} más</span>}
              </div>
            </div>
          </div>
        )}

        <div className="kpi-grid">
          <KPICard
            label="Clientes Activos"
            value={stats.activos}
            subtext={`de ${stats.totalClientes} totales`}
            type="number"
            icon="✅"
            iconBg="#d1fae5"
            accent="#10b981"
          />
          <KPICard
            label="Readáptate / Previene (Activos)"
            value={stats.readaptate}
            subtext={`${stats.previene} Previene activos`}
            type="number"
            icon="⭐"
            iconBg="#fef3c7"
            accent="#f59e0b"
          />
          <KPICard
            label="Ingresos Empresa"
            value={euro(totalIngresosEmpresa)}
            subtext="registrados en Finanzas"
            type="text"
            icon="💰"
            iconBg="#dbeafe"
            accent="#3b82f6"
          />
          <KPICard
            label="Tasa de Retención"
            value={stats.tasaRetencion}
            subtext={`${stats.noActivos} clientes no activos`}
            type="percent"
            icon="🔄"
            iconBg="#ede9fe"
            accent="#8b5cf6"
          />
        </div>

        <div className="charts-grid">
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
                <XAxis dataKey="servicio" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cantidad" name="Clientes" radius={[6, 6, 0, 0]}>
                  {servicios.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

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
                  label={({ forma, percent }) => `${forma} ${(percent * 100).toFixed(0)}%`}
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

        <CalendarioAvisos clientes={clientes} ventas={ventas} recontactos={recontactos} />

        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">Próximas Renovaciones</div>
              <div className="card-subtitle">Clientes activos ordenados por fecha de fin</div>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Categoría</th>
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
                      <span className={`status-pill ${c.categoria === 'Programa Readáptate' ? 'status-activo' : 'status-pendiente'}`}>
                        {c.categoria === 'Programa Readáptate' ? '⭐ Readáptate' : c.categoria === 'Programa Previene' ? '🔵 Previene' : c.categoria}
                      </span>
                    </td>
                    <td>{c.servicio}</td>
                    <td style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>
                      {c.fechaFin ? new Date(c.fechaFin + 'T00:00:00').toLocaleDateString('es-ES') : '—'}
                    </td>
                    <td>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: diasColor(c.diasRestantes)
                      }}>
                        {diasLabel(c.diasRestantes)}
                      </span>
                    </td>
                  </tr>
                ))}
                {renovaciones.length === 0 && (
                  <tr><td colSpan={5} className="lead-log-empty">No hay clientes activos con fecha de fin reconocible.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}

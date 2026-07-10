import { useMemo, useState } from 'react'
import { parseFechaFlexible, sumarDias, formatFechaISO } from '../utils/fechasEsp'

// Calendario de avisos: reúne en un único calendario todo lo que hay que
// vigilar por fecha — plazos de clientes pendientes de cobro, avisos de
// renovación (2 semanas antes de que acabe el contrato) y recontactos
// pendientes de Ventas. Es de solo lectura: cada dato se sigue editando
// desde su sitio (Clientes > Cobros pendientes, Ventas > Recontactar...).

const DIAS_AVISO_RENOVACION = 14

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const TIPO_INFO = {
  cobro: { emoji: '💳', label: 'Cobro pendiente', clase: 'status-pendiente' },
  avisoRenovacion: { emoji: '🔔', label: 'Avisar renovación', clase: 'status-idea' },
  finContrato: { emoji: '📄', label: 'Fin de contrato', clase: 'status-inactivo' },
  pagoRenovacion: { emoji: '💶', label: 'Cobro renovación', clase: 'status-activo' },
  recontacto: { emoji: '🔁', label: 'Recontactar', clase: 'status-programado' },
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function todayISO() {
  return toISO(new Date())
}

function celdasDelMes(year, monthIndex) {
  const primerDia = new Date(year, monthIndex, 1)
  const ultimoDia = new Date(year, monthIndex + 1, 0)
  const totalDias = ultimoDia.getDate()
  const offset = (primerDia.getDay() + 6) % 7 // Lunes = 0
  const celdas = []
  for (let i = 0; i < offset; i += 1) celdas.push(null)
  for (let d = 1; d <= totalDias; d += 1) celdas.push(new Date(year, monthIndex, d))
  while (celdas.length % 7 !== 0) celdas.push(null)
  return celdas
}

export default function CalendarioAvisos({ clientes = [], ventas = [], recontactos = [] }) {
  const hoy = new Date()
  const [cursor, setCursor] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() })
  const [filtro, setFiltro] = useState('todos')

  const avisos = useMemo(() => {
    const lista = []

    // 1) Plazos de pago pendientes (Clientes > Cobros pendientes)
    clientes.forEach((cliente) => {
      (cliente.Plazos || []).forEach((plazo) => {
        if (!plazo.pagado && plazo.fecha) {
          lista.push({
            tipo: 'cobro',
            fecha: plazo.fecha,
            titulo: `${cliente.Nombre || 'Cliente'} · plazo ${plazo.numero}/${(cliente.Plazos || []).length}`,
            detalle: `${plazo.importe || 0}€`,
          })
        }
      })
    })

    // 2) Renovaciones: aviso 2 semanas antes de "Fecha fin" + el propio fin
    //    de contrato, para clientes activos. Si además hay una fecha de
    //    renovación ya acordada (con importe), también se marca.
    clientes.forEach((cliente) => {
      if ((cliente['Estado del cliente'] || '').toUpperCase() !== 'ACTIVO') return
      const finISO = parseFechaFlexible(cliente['Fecha fin'])
      if (finISO) {
        lista.push({
          tipo: 'avisoRenovacion',
          fecha: sumarDias(finISO, -DIAS_AVISO_RENOVACION),
          titulo: `Avisar renovación · ${cliente.Nombre}`,
          detalle: `Termina el ${formatFechaISO(finISO)}`,
        })
        lista.push({
          tipo: 'finContrato',
          fecha: finISO,
          titulo: `Fin de contrato · ${cliente.Nombre}`,
          detalle: cliente['Servicio contratado'] || '',
        })
      }
      const renovISO = parseFechaFlexible(cliente['Fecha renovación'])
      if (renovISO) {
        lista.push({
          tipo: 'pagoRenovacion',
          fecha: renovISO,
          titulo: `Cobro renovación · ${cliente.Nombre}`,
          detalle: cliente['Importe renovación'] ? `${cliente['Importe renovación']}€` : '',
        })
      }
    })

    // 3) Recontactos pendientes (leads en seguimiento + altas manuales)
    ventas.filter((lead) => lead.etapa === 'seguimiento').forEach((lead) => {
      const r = lead.recontacto
      if (r && !r.contactado && r.fechaContacto) {
        lista.push({
          tipo: 'recontacto',
          fecha: r.fechaContacto,
          titulo: `Recontactar · ${lead.nombre}`,
          detalle: r.motivo || '',
        })
      }
    })
    recontactos.forEach((r) => {
      if (!r.contactado && r.fechaContacto) {
        lista.push({
          tipo: 'recontacto',
          fecha: r.fechaContacto,
          titulo: `Recontactar · ${r.nombre}`,
          detalle: r.motivo || '',
        })
      }
    })

    return lista
  }, [clientes, ventas, recontactos])

  const avisosFiltrados = useMemo(() => {
    if (filtro === 'todos') return avisos
    if (filtro === 'renovacion') {
      return avisos.filter((a) => a.tipo === 'avisoRenovacion' || a.tipo === 'finContrato' || a.tipo === 'pagoRenovacion')
    }
    return avisos.filter((a) => a.tipo === filtro)
  }, [avisos, filtro])

  const avisosPorDia = useMemo(() => {
    const mapa = {}
    avisosFiltrados.forEach((a) => {
      mapa[a.fecha] = mapa[a.fecha] || []
      mapa[a.fecha].push(a)
    })
    return mapa
  }, [avisosFiltrados])

  const proximos = useMemo(() => {
    const hoyISO = todayISO()
    const limite = sumarDias(hoyISO, 7)
    return avisosFiltrados
      .filter((a) => a.fecha >= hoyISO && a.fecha <= limite)
      .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
  }, [avisosFiltrados])

  const stats = useMemo(() => ({
    cobros: avisos.filter((a) => a.tipo === 'cobro').length,
    renovaciones: avisos.filter((a) => a.tipo === 'avisoRenovacion').length,
    recontactos: avisos.filter((a) => a.tipo === 'recontacto').length,
  }), [avisos])

  const celdas = useMemo(() => celdasDelMes(cursor.year, cursor.month), [cursor])

  const irMesAnterior = () => {
    setCursor((c) => {
      const m = c.month === 0 ? 11 : c.month - 1
      const y = c.month === 0 ? c.year - 1 : c.year
      return { year: y, month: m }
    })
  }

  const irMesSiguiente = () => {
    setCursor((c) => {
      const m = c.month === 11 ? 0 : c.month + 1
      const y = c.month === 11 ? c.year + 1 : c.year
      return { year: y, month: m }
    })
  }

  return (
    <div className="table-card" style={{ marginTop: 16 }}>
      <div className="card-header">
        <div>
          <div className="card-title">📅 Calendario de avisos</div>
          <div className="card-subtitle">Cobros pendientes, renovaciones (aviso {DIAS_AVISO_RENOVACION} días antes) y recontactos</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select className="filter-select" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="cobro">💳 Cobros</option>
            <option value="renovacion">🔔 Renovaciones</option>
            <option value="recontacto">🔁 Recontactos</option>
          </select>
          <button type="button" className="secondary-action" onClick={irMesAnterior}>←</button>
          <button type="button" className="secondary-action" onClick={irMesSiguiente}>→</button>
        </div>
      </div>

      <div className="kpi-grid" style={{ padding: '0 20px 16px' }}>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Cobros pendientes</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>💳</div>
          </div>
          <div className="kpi-card-value">{stats.cobros}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Avisos de renovación</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>🔔</div>
          </div>
          <div className="kpi-card-value">{stats.renovaciones}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Recontactos pendientes</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>🔁</div>
          </div>
          <div className="kpi-card-value">{stats.recontactos}</div>
        </div>
      </div>

      {proximos.length > 0 && (
        <div style={{ padding: '0 20px 16px' }}>
          <div className="card-subtitle" style={{ marginBottom: 6, fontWeight: 600 }}>Próximos 7 días</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {proximos.map((a, i) => {
              const info = TIPO_INFO[a.tipo]
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span className={`status-pill ${info.clase}`} style={{ padding: '1px 6px', fontSize: 10 }}>{info.emoji} {info.label}</span>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{formatFechaISO(a.fecha)}</span>
                  <span style={{ fontWeight: 600 }}>{a.titulo}</span>
                  {a.detalle && <span style={{ color: 'var(--color-text-secondary)' }}>· {a.detalle}</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ padding: '0 20px 8px', fontWeight: 700 }}>{NOMBRES_MES[cursor.month]} {cursor.year}</div>

      <div className="calendario-contenido-grid">
        {DIAS_SEMANA_CORTO.map((dia) => (
          <div key={dia} className="calendario-contenido-diasemana">{dia}</div>
        ))}
        {celdas.map((fecha, index) => {
          if (!fecha) return <div key={`vacio-${index}`} className="calendario-contenido-celda calendario-contenido-celda-vacia" />
          const iso = toISO(fecha)
          const avisosDia = avisosPorDia[iso] || []
          const esHoy = iso === todayISO()
          return (
            <div key={iso} className={`calendario-contenido-celda ${esHoy ? 'calendario-contenido-hoy' : ''}`}>
              <div className="calendario-contenido-celda-header">
                <span>{fecha.getDate()}</span>
              </div>
              <div className="calendario-contenido-ideas">
                {avisosDia.map((a, i) => {
                  const info = TIPO_INFO[a.tipo]
                  return (
                    <div
                      key={i}
                      className="calendario-contenido-chip"
                      title={`${a.titulo}${a.detalle ? ' · ' + a.detalle : ''}`}
                      style={{ cursor: 'default' }}
                    >
                      <span className={`status-pill ${info.clase}`} style={{ padding: '1px 6px', fontSize: 10 }}>{info.emoji}</span>
                      <span className="calendario-contenido-chip-titulo">{a.titulo}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

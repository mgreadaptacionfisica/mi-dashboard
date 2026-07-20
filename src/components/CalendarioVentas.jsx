import { useMemo, useState } from 'react'

// Calendario de llamadas agendadas del pipeline (Ventas), con vista de mes
// o de semana. Reutiliza el mismo patrón de rejilla que CalendarioContenido
// y CalendarioTecnico: es de solo lectura y navegación — crear/mover leads
// se sigue haciendo desde el Pipeline de siempre; aquí solo se visualiza
// por fecha y se puede saltar directo a la ficha de un lead con un clic.

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const ETAPA_INFO = {
  agendada: { icono: '📅', clase: 'calendario-ventas-agendada', label: 'Agendada' },
  realizada: { icono: '🎙️', clase: 'calendario-ventas-realizada', label: 'Llamada realizada' },
  seguimiento: { icono: '🔁', clase: 'calendario-ventas-seguimiento', label: 'Seguimiento' },
  ganada: { icono: '✅', clase: 'calendario-ventas-ganada', label: 'Ganada' },
  perdida: { icono: '✖️', clase: 'calendario-ventas-perdida', label: 'Perdida' },
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

function lunesDeLaSemana(fecha) {
  const d = new Date(fecha)
  const dow = (d.getDay() + 6) % 7 // Lunes = 0
  d.setDate(d.getDate() - dow)
  return d
}

export default function CalendarioVentas({ ventas = [], onAbrirLead }) {
  const [vista, setVista] = useState('mes')
  const [cursor, setCursor] = useState(() => new Date())
  const hoy = todayISO()

  const leadsPorFecha = useMemo(() => {
    const map = {}
    ventas.forEach((lead) => {
      if (!lead.fechaAgenda) return
      map[lead.fechaAgenda] = map[lead.fechaAgenda] || []
      map[lead.fechaAgenda].push(lead)
    })
    Object.values(map).forEach((lista) => lista.sort((a, b) => (a.horaAgenda || '').localeCompare(b.horaAgenda || '')))
    return map
  }, [ventas])

  const celdasMes = useMemo(() => celdasDelMes(cursor.getFullYear(), cursor.getMonth()), [cursor])

  const diasSemana = useMemo(() => {
    const lunes = lunesDeLaSemana(cursor)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [cursor])

  const mesKey = `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}`
  const leadsDelMes = useMemo(() => ventas.filter((l) => (l.fechaAgenda || '').startsWith(mesKey)), [ventas, mesKey])

  const statsMes = useMemo(() => ({
    total: leadsDelMes.length,
    agendadas: leadsDelMes.filter((l) => l.etapa === 'agendada').length,
    ganadas: leadsDelMes.filter((l) => l.etapa === 'ganada').length,
    perdidas: leadsDelMes.filter((l) => l.etapa === 'perdida').length,
  }), [leadsDelMes])

  const cambiar = (delta) => {
    setCursor((c) => {
      const d = new Date(c)
      if (vista === 'mes') d.setMonth(d.getMonth() + delta)
      else d.setDate(d.getDate() + delta * 7)
      return d
    })
  }

  const irHoy = () => setCursor(new Date())

  const renderChip = (lead) => {
    const info = ETAPA_INFO[lead.etapa] || ETAPA_INFO.agendada
    return (
      <button
        key={lead.id}
        type="button"
        className={`calendario-ventas-item ${info.clase}`}
        title={`${lead.nombre}${lead.horaAgenda ? ' · ' + lead.horaAgenda : ''} — ${lead.closer || 'sin closer'} — ${info.label}`}
        onClick={() => onAbrirLead && onAbrirLead(lead.id)}
      >
        {info.icono} {lead.horaAgenda ? `${lead.horaAgenda} ` : ''}{lead.nombre}
      </button>
    )
  }

  const tituloRango = vista === 'mes'
    ? `${NOMBRES_MES[cursor.getMonth()]} ${cursor.getFullYear()}`
    : `${diasSemana[0].getDate()} ${NOMBRES_MES[diasSemana[0].getMonth()]} – ${diasSemana[6].getDate()} ${NOMBRES_MES[diasSemana[6].getMonth()]} ${diasSemana[6].getFullYear()}`

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Llamadas este mes</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>🗓️</div>
          </div>
          <div className="kpi-card-value">{statsMes.total}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Agendadas</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>📅</div>
          </div>
          <div className="kpi-card-value">{statsMes.agendadas}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Ganadas</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>✅</div>
          </div>
          <div className="kpi-card-value">{statsMes.ganadas}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Perdidas</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>✖️</div>
          </div>
          <div className="kpi-card-value">{statsMes.perdidas}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="card-header">
          <div>
            <div className="card-title">{tituloRango}</div>
            <div className="card-subtitle">Llamadas agendadas del pipeline</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="tabs-bar" style={{ margin: 0 }}>
              <button type="button" className={`tab-btn ${vista === 'mes' ? 'tab-btn-active' : ''}`} onClick={() => setVista('mes')}>Mes</button>
              <button type="button" className={`tab-btn ${vista === 'semana' ? 'tab-btn-active' : ''}`} onClick={() => setVista('semana')}>Semana</button>
            </div>
            <button type="button" className="secondary-action" onClick={() => cambiar(-1)}>← Anterior</button>
            <button type="button" className="secondary-action" onClick={irHoy}>Hoy</button>
            <button type="button" className="secondary-action" onClick={() => cambiar(1)}>Siguiente →</button>
          </div>
        </div>

        <div className="calendario-ventas-leyenda">
          {Object.values(ETAPA_INFO).map((info) => (
            <span key={info.label}>{info.icono} {info.label}</span>
          ))}
        </div>

        {vista === 'mes' ? (
          <div className="calendario-ventas-grid">
            {DIAS_SEMANA_CORTO.map((d) => <div key={d} className="calendario-ventas-diahead">{d}</div>)}
            {celdasMes.map((fecha, i) => {
              if (!fecha) return <div key={i} className="calendario-ventas-celda calendario-ventas-celda-vacia" />
              const iso = toISO(fecha)
              const leadsDia = leadsPorFecha[iso] || []
              return (
                <div key={iso} className={`calendario-ventas-celda ${iso === hoy ? 'calendario-ventas-celda-hoy' : ''}`}>
                  <span className="calendario-ventas-numero">{fecha.getDate()}</span>
                  {leadsDia.map(renderChip)}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="calendario-ventas-grid calendario-ventas-grid-semana">
            {diasSemana.map((fecha) => {
              const iso = toISO(fecha)
              const leadsDia = leadsPorFecha[iso] || []
              return (
                <div key={iso} className={`calendario-ventas-celda calendario-ventas-celda-semana ${iso === hoy ? 'calendario-ventas-celda-hoy' : ''}`}>
                  <span className="calendario-ventas-numero">{DIAS_SEMANA_CORTO[(fecha.getDay() + 6) % 7]} {fecha.getDate()}</span>
                  {leadsDia.length === 0 && <span className="lead-log-empty" style={{ fontSize: 11 }}>Sin llamadas</span>}
                  {leadsDia.map(renderChip)}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

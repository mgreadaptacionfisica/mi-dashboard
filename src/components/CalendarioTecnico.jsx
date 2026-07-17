import { useMemo, useState } from 'react'

// Calendario mensual de "registro de todo" para el propio técnico: junta en
// una sola vista sus tareas personales (con fecha) y las revisiones de
// cliente que ha ido registrando (día que habló con cada uno). Es una
// vista de solo lectura — crear/marcar tareas se sigue haciendo en "Mis
// tareas", y registrar revisiones en "Mi Ficha"; aquí es para tener el
// conjunto de un vistazo. Reutiliza el mismo patrón de rejilla mensual que
// CalendarioContenido.jsx (celdasDelMes).

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

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

export default function CalendarioTecnico({ tareas = [], clientesAsignados = [], seguimientos = [] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const hoy = todayISO()

  const revisionesPorFecha = useMemo(() => {
    const map = {}
    clientesAsignados.forEach((cliente) => {
      seguimientos
        .filter((s) => s.clienteNombre === cliente.Nombre)
        .forEach((s) => {
          ;(s.revisiones || []).forEach((r) => {
            if (!r.fecha) return
            map[r.fecha] = map[r.fecha] || []
            map[r.fecha].push({ ...r, clienteNombre: cliente.Nombre })
          })
        })
    })
    return map
  }, [clientesAsignados, seguimientos])

  const tareasPorFecha = useMemo(() => {
    const map = {}
    tareas.forEach((t) => {
      if (!t.fecha) return
      map[t.fecha] = map[t.fecha] || []
      map[t.fecha].push(t)
    })
    return map
  }, [tareas])

  const celdas = useMemo(() => celdasDelMes(cursor.year, cursor.month), [cursor])

  const cambiarMes = (delta) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <div className="calendario-tecnico">
      <div className="seguimiento-week-nav">
        <button type="button" className="secondary-action" onClick={() => cambiarMes(-1)}>← Mes anterior</button>
        <strong>{NOMBRES_MES[cursor.month]} {cursor.year}</strong>
        <button type="button" className="secondary-action" onClick={() => cambiarMes(1)}>Mes siguiente →</button>
      </div>

      <div className="calendario-tecnico-leyenda">
        <span>🗒️ Tarea propia</span>
        <span>📞 Revisión de cliente registrada</span>
      </div>

      <div className="calendario-tecnico-grid">
        {DIAS_SEMANA_CORTO.map((d) => <div key={d} className="calendario-tecnico-diahead">{d}</div>)}
        {celdas.map((fecha, i) => {
          if (!fecha) return <div key={i} className="calendario-tecnico-celda calendario-tecnico-celda-vacia" />
          const iso = toISO(fecha)
          const tareasDia = tareasPorFecha[iso] || []
          const revisionesDia = revisionesPorFecha[iso] || []
          return (
            <div key={i} className={`calendario-tecnico-celda ${iso === hoy ? 'calendario-tecnico-celda-hoy' : ''}`}>
              <span className="calendario-tecnico-numero">{fecha.getDate()}</span>
              {tareasDia.map((t, j) => (
                <div
                  key={`t-${j}`}
                  className={`calendario-tecnico-item calendario-tecnico-tarea ${t.hecha ? 'calendario-tecnico-item-hecha' : ''}`}
                  title={t.texto}
                >
                  🗒️ {t.texto}
                </div>
              ))}
              {revisionesDia.map((r, j) => (
                <div
                  key={`r-${j}`}
                  className="calendario-tecnico-item calendario-tecnico-revision"
                  title={`${r.clienteNombre} — ${r.hora || ''}`}
                >
                  📞 {r.clienteNombre}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

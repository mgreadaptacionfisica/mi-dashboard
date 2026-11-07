import { useMemo, useState } from 'react'
import { propuestasCliente, sesionesHarbizDeCliente, esRespondible, TIPOS, ORDEN_TIPOS } from '../utils/progresion'
import { semanaYDiaDeFecha } from '../utils/sesionesHarbiz'
import { formatRangoSemana } from '../utils/seguimientoHelpers'

// 🤖 Propuestas: ÍNDICE de lo que queda sin responder, una línea por cliente.
//
// Las propuestas se responden en ⚡ Registro de sesiones, debajo de la sesión
// de la que salen (PropuestasSesion.jsx): Raúl quiere hacerlas al revisar
// cada sesión, no todas juntas a final de semana. Aquí no se responde nada,
// igual que 🚨 Pendientes: sirve para repasar (p. ej. el viernes) que no se
// ha quedado ninguna atrás, y cada línea lleva a la rejilla de ese cliente.
// Las calcula utils/progresion.js con las reglas de Raúl.

const NIVELES = {
  rojo: { orden: 0, emoji: '🔴' },
  ambar: { orden: 1, emoji: '🟡' },
  verde: { orden: 2, emoji: '🟢' },
  'sin-datos': { orden: 3, emoji: '⚫' },
}

// Lunes (clave de semana, la misma que la rejilla) de hoy ± n semanas. Con
// la fecha LOCAL: toISOString() pasaría a UTC y de madrugada daría el día
// anterior.
function lunesDeHoyMas(semanas) {
  const d = new Date()
  d.setDate(d.getDate() + 7 * semanas)
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return semanaYDiaDeFecha(local).semana
}

export default function PropuestasProgresion({ clientes, todosLosClientes, sesionesHarbiz, respuestas, onIrSesiones }) {
  const [offset, setOffset] = useState(0)
  const [verTodos, setVerTodos] = useState(false)
  const semana = lunesDeHoyMas(offset)

  const filas = useMemo(() => {
    const respondidas = new Set((respuestas || []).map((r) => r.id))
    return (clientes || [])
      .map((cliente) => {
        const sesiones = sesionesHarbizDeCliente(cliente, sesionesHarbiz, todosLosClientes)
        const { nivel, propuestas } = propuestasCliente(cliente.Nombre, sesiones, semana)
        const respondibles = propuestas.filter(esRespondible)
        const pendientes = respondibles.filter((p) => !respondidas.has(p.id))
        // Cuántas de cada tipo quedan, para decir de un vistazo qué hay.
        const porTipo = ORDEN_TIPOS
          .map((tipo) => ({ tipo, n: pendientes.filter((p) => p.tipo === tipo).length }))
          .filter((x) => x.n > 0)
        return { cliente, nivel, total: respondibles.length, pendientes: pendientes.length, porTipo }
      })
      .sort((a, b) => (b.pendientes > 0) - (a.pendientes > 0)
        || NIVELES[a.nivel].orden - NIVELES[b.nivel].orden
        || a.cliente.Nombre.localeCompare(b.cliente.Nombre))
  }, [clientes, todosLosClientes, sesionesHarbiz, respuestas, semana])

  const totalPendientes = filas.reduce((n, f) => n + f.pendientes, 0)
  const conPendientes = filas.filter((f) => f.pendientes > 0).length
  const visibles = verTodos ? filas : filas.filter((f) => f.pendientes > 0)

  return (
    <div className="table-card">
      <div className="card-header propuestas-cabecera">
        <div>
          <div className="card-title">🤖 Propuestas sin responder</div>
          <div className="card-subtitle">
            Las propuestas se responden en ⚡ Registro de sesiones, debajo de cada sesión (botón 🤖), al revisarla.
            Esto es solo el repaso: quién tiene alguna sin responder la semana del {formatRangoSemana(semana)}.
          </div>
        </div>
        <div className="propuestas-semana">
          <button type="button" className="period-btn" onClick={() => setOffset((o) => o - 1)} title="Semana anterior">◀</button>
          <span>{offset === 0 ? 'Esta semana' : offset === -1 ? 'Semana pasada' : `Hace ${-offset} semanas`}</span>
          <button type="button" className="period-btn" disabled={offset >= 0} onClick={() => setOffset((o) => Math.min(0, o + 1))} title="Semana siguiente">▶</button>
        </div>
      </div>

      <div className="propuestas-resumen">
        <span className="propuestas-resumen-pendientes">
          {totalPendientes === 0 ? '✓ Todo respondido' : `${totalPendientes} sin responder en ${conPendientes} cliente${conPendientes === 1 ? '' : 's'}`}
        </span>
        <label className="propuestas-ver-verdes">
          <input type="checkbox" checked={verTodos} onChange={(e) => setVerTodos(e.target.checked)} /> Ver también los que ya están al día
        </label>
      </div>

      {visibles.length === 0 && (
        <p className="lead-log-empty">
          {filas.length === 0 ? 'No hay clientes activos.' : 'Nada pendiente esta semana 🎉'}
        </p>
      )}

      <ul className="propuestas-indice">
        {visibles.map((f) => (
          <li key={f.cliente.Nombre} className={`propuestas-indice-fila propuesta-${f.nivel}`}>
            <span className="propuestas-indice-nombre">{NIVELES[f.nivel].emoji} {f.cliente.Nombre}</span>
            <span className="propuestas-indice-detalle">
              {f.pendientes > 0
                ? f.porTipo.map((x) => `${TIPOS[x.tipo].emoji} ${x.n}`).join('  ')
                : f.nivel === 'sin-datos' ? 'Sin datos de Harbiz' : f.total > 0 ? '✓ Respondidas' : 'Sin cambios'}
            </span>
            {onIrSesiones && (
              <button type="button" className="propuesta-ver-semana" onClick={() => onIrSesiones(f.cliente, offset)}>Ir a sus sesiones →</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { propuestasCliente, sesionesHarbizDeCliente, esRespondible, estadoEnHarbiz, TIPOS, ORDEN_TIPOS, OPCIONES } from '../utils/progresion'
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

export default function PropuestasProgresion({ clientes, todosLosClientes, sesionesHarbiz, respuestas, onIrSesiones, onCambiarPropuestasCliente, esAdmin = false }) {
  const [offset, setOffset] = useState(0)
  const [verTodos, setVerTodos] = useState(false)
  const semana = lunesDeHoyMas(offset)

  const filas = useMemo(() => {
    const respondidas = new Set((respuestas || []).map((r) => r.id))
    return (clientes || [])
      .filter((cliente) => !cliente['Sin propuestas'])
      .map((cliente) => {
        const sesiones = sesionesHarbizDeCliente(cliente, sesionesHarbiz, todosLosClientes)
        const { nivel, propuestas } = propuestasCliente(cliente.Nombre, sesiones, semana)
        const respondibles = propuestas.filter(esRespondible)
        const pendientes = respondibles.filter((p) => !respondidas.has(p.id))
        // ☐ Aceptadas que aún no están en Harbiz (ver estadoEnHarbiz).
        const ids = new Set(respondibles.map((p) => p.id))
        const estados = (respuestas || []).filter((r) => ids.has(r.id)).map(estadoEnHarbiz)
        const aMano = estados.filter((e) => e === 'a_mano').length
        const esperando = estados.filter((e) => e === 'esperando').length
        // Cuántas de cada tipo quedan, para decir de un vistazo qué hay.
        const porTipo = ORDEN_TIPOS
          .map((tipo) => ({ tipo, n: pendientes.filter((p) => p.tipo === tipo).length }))
          .filter((x) => x.n > 0)
        return { cliente, nivel, total: respondibles.length, pendientes: pendientes.length, porTipo, aMano, esperando }
      })
      .sort((a, b) => (b.pendientes > 0) - (a.pendientes > 0)
        || (b.aMano > 0) - (a.aMano > 0)
        || NIVELES[a.nivel].orden - NIVELES[b.nivel].orden
        || a.cliente.Nombre.localeCompare(b.cliente.Nombre))
  }, [clientes, todosLosClientes, sesionesHarbiz, respuestas, semana])

  // Los que tienen las propuestas apagadas (migración 75), aparte y al
  // final, para poder volver a encenderlas.
  const apagados = useMemo(
    () => (clientes || []).filter((c) => c['Sin propuestas']).sort((a, b) => a.Nombre.localeCompare(b.Nombre)),
    [clientes]
  )

  // 📊 Qué opción elige el equipo en cada tipo de propuesta (Raúl,
  // 2026-11-15): las opciones salen en un orden fijo ("subir peso" primero)
  // hasta tener datos. Esto los da, con las respuestas cargadas (las de las
  // últimas 6 semanas, ver DIAS_ATRAS en la query), para decidir después
  // qué poner la primera. Solo lectura y solo admin.
  const estadisticas = useMemo(() => {
    const porTipo = new Map()
    ;(respuestas || []).forEach((r) => {
      if (!TIPOS[r.tipo] || r.tipo === 'nota') return
      const clave = r.estado === 'descartada' ? '__descartada' : (r.opcion || '__sin_opcion')
      const t = porTipo.get(r.tipo) || { total: 0, opciones: new Map() }
      t.total += 1
      t.opciones.set(clave, (t.opciones.get(clave) || 0) + 1)
      porTipo.set(r.tipo, t)
    })
    return ORDEN_TIPOS.filter((tipo) => porTipo.has(tipo)).map((tipo) => {
      const t = porTipo.get(tipo)
      return { tipo, total: t.total, opciones: [...t.opciones.entries()].sort((a, b) => b[1] - a[1]) }
    })
  }, [respuestas])
  const nombreOpcion = (clave) => (clave === '__descartada' ? '❌ Descartada'
    : clave === '__sin_opcion' ? '✅ Aceptada (sin opciones)'
      : `${OPCIONES[clave]?.emoji || ''} ${OPCIONES[clave]?.titulo || clave}`)

  const totalPendientes = filas.reduce((n, f) => n + f.pendientes, 0)
  const conPendientes = filas.filter((f) => f.pendientes > 0).length
  const totalAMano = filas.reduce((n, f) => n + f.aMano, 0)
  const visibles = verTodos ? filas : filas.filter((f) => f.pendientes > 0 || f.aMano > 0)

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
        {totalAMano > 0 && <span className="propuestas-resumen-pendientes">✍️ {totalAMano} aceptada{totalAMano === 1 ? '' : 's'} por pasar a Harbiz a mano</span>}
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
              {f.aMano > 0 ? `  ✍️ ${f.aMano} a Harbiz` : ''}
              {f.esperando > 0 ? `  ⏳ ${f.esperando}` : ''}
            </span>
            {onIrSesiones && (
              <button type="button" className="propuesta-ver-semana" onClick={() => onIrSesiones(f.cliente, offset)}>Ir a sus sesiones →</button>
            )}
            {onCambiarPropuestasCliente && (
              <button
                type="button"
                className="propuesta-btn-deshacer"
                title="Para clientes a los que se les cambia la rutina cada semana: deja de proponer y de escribir en Harbiz"
                onClick={() => {
                  if (window.confirm(`¿Desactivar las propuestas de ${f.cliente.Nombre}? No le saldrán ni en ⚡ Registro ni aquí, y no se escribirá nada en Harbiz. Se pueden volver a activar abajo.`)) onCambiarPropuestasCliente(f.cliente, true)
                }}
              >
                ⏸️ Desactivar
              </button>
            )}
          </li>
        ))}
      </ul>

      {esAdmin && estadisticas.length > 0 && (
        <details className="propuestas-estadisticas">
          <summary>📊 Qué elige el equipo (últimas 6 semanas)</summary>
          <p className="card-subtitle">Por tipo de propuesta, qué opción se ha elegido y cuántas veces. Sirve para decidir qué opción poner la primera (la recomendada).</p>
          {estadisticas.map((e) => (
            <div key={e.tipo} className="propuestas-estadisticas-tipo">
              <strong>{TIPOS[e.tipo].emoji} {TIPOS[e.tipo].titulo}</strong> <span className="card-subtitle">({e.total})</span>
              <ul>
                {e.opciones.map(([clave, n], i) => (
                  <li key={clave}>{i === 0 ? '⭐ ' : ''}{nombreOpcion(clave)}: {n} ({Math.round((n / e.total) * 100)} %)</li>
                ))}
              </ul>
            </div>
          ))}
        </details>
      )}

      {apagados.length > 0 && (
        <div className="propuestas-apagadas">
          <div className="card-subtitle">⏸️ Sin propuestas ({apagados.length}): se les cambia la rutina a mano.</div>
          <ul className="propuestas-indice">
            {apagados.map((c) => (
              <li key={c.Nombre} className="propuestas-indice-fila">
                <span className="propuestas-indice-nombre">⏸️ {c.Nombre}</span>
                {onCambiarPropuestasCliente && (
                  <button type="button" className="propuesta-ver-semana" onClick={() => onCambiarPropuestasCliente(c, false)}>▶️ Activar</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

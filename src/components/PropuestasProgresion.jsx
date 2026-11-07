import { useMemo, useState } from 'react'
import { propuestasCliente, sesionesHarbizDeCliente, esRespondible, TIPOS, ORDEN_TIPOS } from '../utils/progresion'
import { semanaYDiaDeFecha } from '../utils/sesionesHarbiz'
import { formatRangoSemana } from '../utils/seguimientoHelpers'
import { upsertRespuestaPropuestaRemote, deleteRespuestaPropuestaRemote } from '../lib/queries/propuestasProgresion'

// 🤖 Propuestas: tablero de lo que toca cambiar la semana que viene, cliente
// por cliente y ordenado por urgencia (🔴 dolor → 🟡 cambios → 🟢 todo bien).
// La idea es que el fisio empiece por arriba y, al llegar a los verdes, haya
// terminado. Las propuestas las calcula utils/progresion.js con las reglas de
// Raúl; aquí solo se enseñan y se responden.
//
// Fase 1 (desde el 2026-11-07): SOLO propone. El fisio pasa el cambio a
// Harbiz a mano y marca ✅; si no la ve, ❌ con el motivo (eso es lo que
// sirve para pulir las reglas).

const NIVELES = {
  rojo: { orden: 0, emoji: '🔴', texto: 'Dolor: al fisio' },
  ambar: { orden: 1, emoji: '🟡', texto: 'Cambios propuestos' },
  verde: { orden: 2, emoji: '🟢', texto: 'Todo bien' },
  'sin-datos': { orden: 3, emoji: '⚫', texto: 'Sin datos de Harbiz esta semana' },
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

export default function PropuestasProgresion({ clientes, todosLosClientes, sesionesHarbiz, respuestas, setRespuestas, miNombre, onAbrirSeguimiento }) {
  const [offset, setOffset] = useState(0)
  const [descartando, setDescartando] = useState(null) // id de la propuesta
  const [motivo, setMotivo] = useState('')
  const [verVerdes, setVerVerdes] = useState(false)
  const semana = lunesDeHoyMas(offset)

  const tarjetas = useMemo(() => (clientes || [])
    .map((cliente) => {
      const sesiones = sesionesHarbizDeCliente(cliente, sesionesHarbiz, todosLosClientes)
      return { cliente, ...propuestasCliente(cliente.Nombre, sesiones, semana) }
    })
    .sort((a, b) => NIVELES[a.nivel].orden - NIVELES[b.nivel].orden || a.cliente.Nombre.localeCompare(b.cliente.Nombre)),
  [clientes, todosLosClientes, sesionesHarbiz, semana])

  const respuestaDe = (id) => (respuestas || []).find((r) => r.id === id)
  const pendientesDe = (t) => t.propuestas.filter((p) => esRespondible(p) && !respuestaDe(p.id)).length
  const totalPendientes = tarjetas.reduce((n, t) => n + pendientesDe(t), 0)
  const conteo = (nivel) => tarjetas.filter((t) => t.nivel === nivel).length

  const responder = (cliente, propuesta, estado, motivoTexto = '') => {
    const r = {
      id: propuesta.id,
      clienteNombre: cliente.Nombre,
      semana,
      ejercicio: propuesta.ejercicio,
      tipo: propuesta.tipo,
      texto: propuesta.texto,
      estado,
      motivo: motivoTexto.trim(),
      respondidoPor: miNombre || '',
      respondidoEn: new Date().toISOString(),
    }
    setRespuestas((prev) => [...(prev || []).filter((x) => x.id !== r.id), r])
    upsertRespuestaPropuestaRemote(r)
    setDescartando(null)
    setMotivo('')
  }

  const deshacer = (id) => {
    setRespuestas((prev) => (prev || []).filter((x) => x.id !== id))
    deleteRespuestaPropuestaRemote(id)
  }

  const visibles = tarjetas.filter((t) => verVerdes || (t.nivel !== 'verde' && t.nivel !== 'sin-datos'))

  return (
    <div className="table-card">
      <div className="card-header propuestas-cabecera">
        <div>
          <div className="card-title">🤖 Propuestas para la semana que viene</div>
          <div className="card-subtitle">
            Calculadas con lo que cada cliente apuntó en Harbiz la semana del {formatRangoSemana(semana)}.
            Empieza por arriba: al llegar a los 🟢 has terminado. De momento el cambio en Harbiz lo pasas tú; márcalo con ✅,
            o ❌ con el motivo si no lo ves (así se pulen las reglas).
          </div>
        </div>
        <div className="propuestas-semana">
          <button type="button" className="period-btn" onClick={() => setOffset((o) => o - 1)} title="Semana anterior">◀</button>
          <span>{offset === 0 ? 'Esta semana' : offset === -1 ? 'Semana pasada' : `Hace ${-offset} semanas`}</span>
          <button type="button" className="period-btn" disabled={offset >= 0} onClick={() => setOffset((o) => Math.min(0, o + 1))} title="Semana siguiente">▶</button>
        </div>
      </div>

      <div className="propuestas-resumen">
        <span>🔴 {conteo('rojo')}</span>
        <span>🟡 {conteo('ambar')}</span>
        <span>🟢 {conteo('verde')}</span>
        <span>⚫ {conteo('sin-datos')}</span>
        <span className="propuestas-resumen-pendientes">{totalPendientes} propuesta{totalPendientes === 1 ? '' : 's'} sin responder</span>
        <label className="propuestas-ver-verdes">
          <input type="checkbox" checked={verVerdes} onChange={(e) => setVerVerdes(e.target.checked)} /> Ver también 🟢 y ⚫
        </label>
      </div>

      {visibles.length === 0 && (
        <p className="lead-log-empty">
          {tarjetas.length === 0 ? 'No hay clientes activos.' : 'Nada que revisar esta semana 🎉'}
        </p>
      )}

      <div className="propuestas-lista">
        {visibles.map((t) => {
          const nivel = NIVELES[t.nivel]
          const pendientes = pendientesDe(t)
          return (
            <section key={t.cliente.Nombre} className={`propuesta-tarjeta propuesta-${t.nivel}`}>
              <header className="propuesta-tarjeta-cabecera">
                <strong>{nivel.emoji} {t.cliente.Nombre}</strong>
                <span className="propuesta-tarjeta-estado">
                  {t.nivel === 'verde' || t.nivel === 'sin-datos' ? nivel.texto : pendientes > 0 ? `${pendientes} por responder` : '✓ Todo respondido'}
                </span>
                {onAbrirSeguimiento && (
                  <button type="button" className="propuesta-ver-semana" onClick={() => onAbrirSeguimiento(t.cliente, offset)}>Ver semana →</button>
                )}
              </header>

              {ORDEN_TIPOS.map((tipo) => {
                const delTipo = t.propuestas.filter((p) => p.tipo === tipo)
                if (delTipo.length === 0) return null
                return (
                  <div key={tipo} className={`propuesta-grupo propuesta-grupo-${tipo}`}>
                    <div className="propuesta-grupo-titulo" title={TIPOS[tipo].ayuda}>{TIPOS[tipo].emoji} {TIPOS[tipo].titulo}</div>
                    <ul>
                      {delTipo.map((p) => {
                        const r = respuestaDe(p.id)
                        return (
                          <li key={p.id} className={r ? `propuesta-respondida propuesta-${r.estado}` : ''}>
                            <div className="propuesta-texto">
                              {p.tipo !== 'movilidad' && <strong>{p.ejercicio}</strong>}
                              {p.texto && <span>{p.tipo !== 'movilidad' ? ': ' : ''}{p.texto}</span>}
                              {p.cita && <q className={p.tipo === 'movilidad' ? 'propuesta-lista-ejercicios' : 'propuesta-cita'}>{p.cita}</q>}
                            </div>
                            {esRespondible(p) && (
                              <div className="propuesta-acciones">
                                {r ? (
                                  <>
                                    <span className="propuesta-respuesta">
                                      {r.estado === 'aplicada' ? '✅ Aplicada' : `❌ Descartada${r.motivo ? `: ${r.motivo}` : ''}`}
                                      {r.respondidoPor ? ` · ${r.respondidoPor}` : ''}
                                    </span>
                                    <button type="button" className="propuesta-btn-deshacer" onClick={() => deshacer(p.id)}>Deshacer</button>
                                  </>
                                ) : descartando === p.id ? (
                                  <form className="propuesta-motivo" onSubmit={(e) => { e.preventDefault(); responder(t.cliente, p, 'descartada', motivo) }}>
                                    <input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="¿Por qué no? (ej.: prefiero mantener otra semana)" />
                                    <button type="submit" className="propuesta-btn">Guardar</button>
                                    <button type="button" className="propuesta-btn-deshacer" onClick={() => { setDescartando(null); setMotivo('') }}>Cancelar</button>
                                  </form>
                                ) : (
                                  <>
                                    <button type="button" className="propuesta-btn propuesta-btn-ok" onClick={() => responder(t.cliente, p, 'aplicada')} title="Ya lo he cambiado en Harbiz (o lo he hablado con el cliente)">✅ Aplicada</button>
                                    <button type="button" className="propuesta-btn propuesta-btn-no" onClick={() => { setDescartando(p.id); setMotivo('') }}>❌</button>
                                  </>
                                )}
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )
              })}

              {t.nivel === 'verde' && <p className="propuesta-vacia">Sin cambios: que siga igual.</p>}
              {t.nivel === 'sin-datos' && (
                <p className="propuesta-vacia">No hay entrenos de Harbiz con reps y kilos esta semana (o aún no ha entrenado).</p>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

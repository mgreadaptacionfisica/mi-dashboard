import { useState } from 'react'
import { TIPOS, OPCIONES, esRespondible } from '../utils/progresion'

// 🤖 Propuestas de UNA sesión, debajo de su chip en ⚡ Registro de sesiones.
//
// Por qué aquí y no en un tablero aparte: la idea de Raúl es hacer la
// propuesta de la semana que viene en el momento de revisar cada sesión, y
// así no se acumula todo el trabajo al final de la semana. Este es el ÚNICO
// sitio donde se responde (✅/❌); la pestaña 🤖 Propuestas es solo un índice
// de lo que queda sin responder (mismo criterio que 🚨 Pendientes: no
// duplicar la edición en dos sitios).
//
// Va plegado: con 30 clientes, abrirlo todo sería un muro. Las "notas del
// cliente" no se repiten aquí porque ese comentario ya sale justo encima
// (DetalleHarbiz); por lo mismo, la cita del comentario tampoco se repite.
// Solo la movilidad enseña su lista de ejercicios, que no está en otro sitio.
//
// 🧭 Si la propuesta trae `opciones` (ver OPCIONES en progresion.js), el
// fisio elige una, puede retocar lo que cambia (nota para el cliente,
// objetivo, series) y la acepta. Sin opciones (movilidad, comentario
// general) se responde con ✅/❌ como siempre.
//
// 📲 `aHarbiz(p)` dice si al aceptar esa propuesta se escribe sola en Harbiz
// (prueba con los clientes de Raúl, ver HARBIZ_PRUEBA_TRABAJADORES en
// progresion.js). Si es así, se avisa antes de aceptar y después se enseña
// cómo ha ido: la escribe una rutina en la nube, no el navegador. Si no, se
// dice qué hay que pasar a mano.
//
// ✏️ Modificar (Raúl, 2026-11-15): una respuesta ya dada se puede cambiar
// sin perder lo escrito. Abre el editor con lo guardado (misma opción, la
// nota, el objetivo y las series de entonces) y deja cambiar también de
// opción; al aceptar se reescribe la misma fila. Antes solo había
// "Deshacer", que volvía a la nota que propone el panel y había que
// reescribirla entera. Las descartadas reabren el motivo.
const ESTADO_HARBIZ = {
  pendiente: { clase: 'pendiente', texto: () => '📲 Se escribe en Harbiz en la próxima pasada (7:30 o 20:30)' },
  escrita: { clase: 'ok', texto: (d) => `📲 Escrita en Harbiz${d ? `: ${d}` : ''}` },
  sin_sesion: { clase: 'aviso', texto: (d) => `⚠️ No escrita en Harbiz${d ? `: ${d}` : ''}. Pásalo a mano.` },
  error: { clase: 'aviso', texto: (d) => `⚠️ No escrita en Harbiz${d ? `: ${d}` : ''}. Pásalo a mano.` },
}

// Qué se cambia en Harbiz con una elección, en una línea ("objetivo 8-12
// (3) → 12-15 (3) · nota «…»"). Sirve para el aviso previo y para el "pásalo
// a mano".
function resumenCambios(e) {
  const partes = []
  if (e.objetivo) partes.push(`objetivo ${e.objetivoActual ? `${e.objetivoActual} → ` : ''}${e.objetivo}`)
  if (e.series) partes.push(`series ${e.seriesActual ? `${e.seriesActual} → ` : ''}${e.series}`)
  if (e.nota) partes.push(`nota «${e.nota}»`)
  // (Las respuestas guardadas no traen el "antes": solo lo nuevo.)
  return partes.join(' · ')
}

// Lo que se guarda: solo lo que de verdad cambia (si el objetivo de
// "indicación mía" se deja igual, no se manda).
function eleccionLimpia(o, editado) {
  const objetivo = (editado.objetivo ?? '').trim()
  const series = (editado.series ?? '').trim()
  return {
    opcion: o.clave,
    manual: Boolean(o.manual),
    nota: o.manual ? '' : (editado.nota ?? '').trim(),
    objetivo: !o.manual && objetivo && objetivo !== o.objetivoActual ? objetivo : '',
    series: !o.manual && series && series !== o.seriesActual ? series : '',
    objetivoActual: o.objetivoActual,
    seriesActual: o.seriesActual,
  }
}

// Lo que sale en el editor al elegir una opción. Si se está modificando una
// respuesta con esa misma opción, lo guardado manda sobre lo propuesto
// (objetivo y series se guardan vacíos cuando no cambiaban: entonces vale
// el de la opción, o el actual en "indicación mía").
function valoresIniciales(o, r) {
  if (r && r.opcion === o.clave) {
    return {
      nota: r.notaHarbiz || '',
      objetivo: r.objetivoHarbiz || (o.libre ? o.objetivoActual : o.objetivo) || '',
      series: r.seriesHarbiz || o.series || '',
    }
  }
  return { nota: o.nota || '', objetivo: o.objetivo || '', series: o.series || '' }
}

// Al reescribir una respuesta que ya está en Harbiz: lo que antes se cambió
// y ahora va vacío NO se toca en Harbiz (el robot no escribe campos vacíos),
// así que se queda como estaba. Se avisa para que se corrija a mano.
function quedaEnHarbiz(r, eleccion) {
  const quedan = []
  if (r.objetivoHarbiz && !eleccion.objetivo) quedan.push(`el objetivo (${r.objetivoHarbiz})`)
  if (r.seriesHarbiz && !eleccion.series) quedan.push(`las series (${r.seriesHarbiz})`)
  if (r.notaHarbiz && !eleccion.nota) quedan.push('la nota de antes')
  return quedan
}

export default function PropuestasSesion({ propuestas = [], respuestas = [], onResponder, onDeshacer, aHarbiz = () => false }) {
  const [abierto, setAbierto] = useState(false)
  const [descartando, setDescartando] = useState(null)
  const [motivo, setMotivo] = useState('')
  // Opción elegida y en edición: { propuestaId, clave, nota, objetivo, series }.
  const [eligiendo, setEligiendo] = useState(null)

  const lista = propuestas.filter(esRespondible)
  if (lista.length === 0) return null

  const respuestaDe = (id) => respuestas.find((r) => r.id === id)
  const pendientes = lista.filter((p) => !respuestaDe(p.id)).length
  const hayDolor = lista.some((p) => p.tipo === 'dolor' && !respuestaDe(p.id))
  const etiqueta = pendientes === 0
    ? '🤖 ✓'
    : `${hayDolor ? '🔴' : '🤖'} ${pendientes} propuesta${pendientes === 1 ? '' : 's'}`

  return (
    <div className="propuestas-sesion">
      <button
        type="button"
        className={`propuestas-sesion-toggle${hayDolor ? ' propuestas-sesion-dolor' : ''}${pendientes === 0 ? ' propuestas-sesion-hecho' : ''}`}
        onClick={() => setAbierto((v) => !v)}
        title={pendientes === 0 ? 'Propuestas para la semana que viene: todas respondidas' : 'Qué cambiar la semana que viene según lo que apuntó el cliente'}
      >
        {etiqueta} {abierto ? '▾' : '▸'}
      </button>
      {abierto && (
        <ul className="propuestas-sesion-lista">
          {lista.map((p) => {
            const r = respuestaDe(p.id)
            const estadoHarbiz = r?.estado === 'aplicada' && r.harbizEstado ? ESTADO_HARBIZ[r.harbizEstado] : null
            const opciones = p.opciones || []
            const editando = eligiendo?.propuestaId === p.id ? eligiendo : null
            const opcionEditada = editando ? opciones.find((o) => o.clave === editando.clave) : null
            // ✏️ Reescribiendo una respuesta ya dada (ver arriba).
            const modificando = Boolean(r && editando?.modificar)
            // Va detrás de `editando`: antes estaba arriba y lo usaba sin existir aún
            // (pantalla en blanco al abrir el 🤖).
            const irAHarbiz = (!r || modificando) && aHarbiz(p)
            const elegida = r?.opcion ? OPCIONES[r.opcion] : null
            // Aplicada con opción, sin pasar por el robot: hay que pasarlo a mano.
            const aMano = r?.estado === 'aplicada' && !r.harbizEstado && !elegida?.manual && resumenCambios({ nota: r.notaHarbiz, objetivo: r.objetivoHarbiz, series: r.seriesHarbiz })
            return (
              <li key={p.id} className={`propuestas-sesion-item propuesta-tipo-${p.tipo}${r ? ` propuesta-respondida propuesta-${r.estado}` : ''}`}>
                <div className="propuestas-sesion-texto" title={TIPOS[p.tipo]?.ayuda}>
                  {TIPOS[p.tipo]?.emoji}{' '}
                  {p.tipo !== 'movilidad' && <strong>{p.ejercicio}: </strong>}
                  {p.texto}
                  {p.tipo === 'movilidad' && p.cita && <div className="propuesta-lista-ejercicios">{p.cita}</div>}
                  {estadoHarbiz && <div className={`propuesta-harbiz propuesta-harbiz-${estadoHarbiz.clase}`}>{estadoHarbiz.texto(r.harbizDetalle)}</div>}
                  {aMano && <div className="propuesta-harbiz">✍️ Pásalo a Harbiz: {aMano}</div>}
                </div>
                {(!r || modificando) && opciones.length > 0 && descartando !== p.id && (
                  <div className="propuesta-opciones">
                    {opciones.map((o, i) => (
                      <button
                        key={o.clave}
                        type="button"
                        className={`propuesta-opcion${editando?.clave === o.clave ? ' propuesta-opcion-activa' : ''}`}
                        onClick={() => {
                          // Modificando, pulsar la opción activa no cierra (se cierra con Cancelar).
                          if (editando?.clave === o.clave) { if (!modificando) setEligiendo(null); return }
                          setEligiendo({ propuestaId: p.id, clave: o.clave, modificar: modificando, ...valoresIniciales(o, r) })
                        }}
                        title={i === 0 ? 'La recomendada' : undefined}
                      >
                        {o.emoji} {o.titulo}
                        {o.clave !== 'libre' && o.objetivo && <span className="propuesta-opcion-cambio"> · {o.objetivoActual} → {o.objetivo}</span>}
                        {o.series && <span className="propuesta-opcion-cambio"> · {o.seriesActual} → {o.series} series</span>}
                      </button>
                    ))}
                  </div>
                )}
                {(!r || modificando) && opcionEditada && (
                  <form
                    className="propuesta-editor"
                    onSubmit={(e) => {
                      e.preventDefault()
                      const eleccion = eleccionLimpia(opcionEditada, editando)
                      if (opcionEditada.libre && !eleccion.nota && !eleccion.objetivo) return
                      if (modificando && r.harbizEstado === 'escrita') {
                        const quedan = quedaEnHarbiz(r, eleccion)
                        const aviso = irAHarbiz && !eleccion.manual
                          ? 'Ya estaba escrita en Harbiz: se volverá a escribir con lo nuevo en la próxima pasada.'
                          : 'Ya estaba escrita en Harbiz y lo nuevo NO va a Harbiz: lo de antes se queda allí, cámbialo a mano.'
                        const extra = quedan.length && irAHarbiz && !eleccion.manual ? `\n\nOjo: ${quedan.join(', ')} no se toca en Harbiz y se queda como estaba. Si hay que quitarlo, a mano.` : ''
                        if (!window.confirm(`${aviso}${extra}\n\n¿Guardar el cambio?`)) return
                      }
                      onResponder(p, 'aplicada', '', eleccion)
                      setEligiendo(null)
                    }}
                  >
                    {opcionEditada.manual ? (
                      <div className="propuesta-harbiz">No se escribe nada en Harbiz: queda apuntado que {opcionEditada.clave === 'cambio' ? 'cambias tú el ejercicio' : opcionEditada.clave === 'seguir' ? 'lo has revisado y sigue igual' : 'lo hablas con la persona'}.</div>
                    ) : (
                      <>
                        {(opcionEditada.objetivo !== null || opcionEditada.libre) && (
                          <label>Objetivo <input value={editando.objetivo} onChange={(e) => setEligiendo({ ...editando, objetivo: e.target.value })} placeholder="8-12 (2)" /></label>
                        )}
                        {opcionEditada.series !== null && (
                          <label>Series <input value={editando.series} onChange={(e) => setEligiendo({ ...editando, series: e.target.value.replace(/[^0-9]/g, '') })} inputMode="numeric" /></label>
                        )}
                        <label className="propuesta-editor-nota">
                          Nota para el cliente
                          <textarea
                            rows={2}
                            value={editando.nota}
                            autoFocus={opcionEditada.libre}
                            onChange={(e) => setEligiendo({ ...editando, nota: e.target.value })}
                            placeholder={opcionEditada.libre ? 'Hazlo más lento, más rango de movimiento…' : ''}
                          />
                        </label>
                        <div className="propuesta-harbiz propuesta-harbiz-previa">
                          {irAHarbiz ? '📲 Al aceptar se escribe sola en Harbiz (semana que viene).' : '✍️ Esto lo pasas tú a Harbiz.'}
                        </div>
                      </>
                    )}
                    <div className="propuestas-sesion-acciones">
                      <button type="submit" className="propuesta-btn propuesta-btn-ok">{modificando ? '✅ Guardar cambio' : '✅ Aceptar'}</button>
                      <button type="button" className="propuesta-btn-deshacer" onClick={() => setEligiendo(null)}>Cancelar</button>
                    </div>
                  </form>
                )}
                {descartando === p.id ? (
                  <form
                    className="propuesta-motivo"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (r?.harbizEstado === 'escrita' && !window.confirm('Esta propuesta ya está escrita en Harbiz. Descartarla aquí NO la quita de Harbiz: si hace falta, cámbialo a mano. ¿Guardar?')) return
                      onResponder(p, 'descartada', motivo); setDescartando(null); setMotivo('')
                    }}
                  >
                    <input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="¿Por qué no?" />
                    <button type="submit" className="propuesta-btn">Guardar</button>
                    <button type="button" className="propuesta-btn-deshacer" onClick={() => { setDescartando(null); setMotivo('') }}>✕</button>
                  </form>
                ) : modificando ? (
                  <div className="propuestas-sesion-acciones">
                    <button type="button" className="propuesta-btn propuesta-btn-no" onClick={() => { setDescartando(p.id); setMotivo(r.estado === 'descartada' ? r.motivo || '' : ''); setEligiendo(null) }} title="Al final no: di por qué">❌ Ninguna</button>
                  </div>
                ) : r ? (
                  <div className="propuestas-sesion-acciones">
                    <span className="propuesta-respuesta">
                      {r.estado === 'aplicada' ? `✅${elegida ? ` ${elegida.emoji} ${elegida.titulo}` : ''}` : `❌${r.motivo ? ` ${r.motivo}` : ''}`}
                      {r.respondidoPor ? ` · ${r.respondidoPor}` : ''}
                    </span>
                    {(r.estado === 'descartada' || opciones.some((o) => o.clave === r.opcion)) && (
                      <button
                        type="button"
                        className="propuesta-btn-deshacer"
                        title="Cambiar la respuesta sin perder lo que escribiste"
                        onClick={() => {
                          // Descartada sin opciones: solo se reescribe el motivo. Con
                          // opciones, se abren para poder elegir una (❌ vuelve al motivo).
                          const o = opciones.find((x) => x.clave === r.opcion) || opciones[0]
                          if (!o) { setDescartando(p.id); setMotivo(r.motivo || ''); setEligiendo(null); return }
                          setDescartando(null)
                          setEligiendo({ propuestaId: p.id, clave: o.clave, modificar: true, ...valoresIniciales(o, r) })
                        }}
                      >
                        ✏️ Modificar
                      </button>
                    )}
                    <button
                      type="button"
                      className="propuesta-btn-deshacer"
                      onClick={() => {
                        // Deshacer aquí no borra lo que ya está en Harbiz.
                        if (r.harbizEstado === 'escrita' && !window.confirm('Esta propuesta ya está escrita en Harbiz. Deshacerla aquí NO la quita de Harbiz: si hace falta, cámbialo a mano. ¿Deshacer?')) return
                        onDeshacer(p.id)
                      }}
                    >
                      Deshacer
                    </button>
                  </div>
                ) : opcionEditada ? null : (
                  <div className="propuestas-sesion-acciones">
                    {opciones.length === 0 && (
                      <button type="button" className="propuesta-btn propuesta-btn-ok" onClick={() => onResponder(p, 'aplicada')} title="Ya lo he cambiado en Harbiz (o lo he hablado con el cliente)">✅</button>
                    )}
                    <button type="button" className="propuesta-btn propuesta-btn-no" onClick={() => { setDescartando(p.id); setMotivo(''); setEligiendo(null) }} title="No la veo: di por qué (sirve para pulir las reglas)">❌{opciones.length > 0 ? ' Ninguna' : ''}</button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

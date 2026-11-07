import { useState } from 'react'
import { TIPOS, esRespondible } from '../utils/progresion'

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
// 📲 `aHarbiz(p)` dice si al aceptar esa propuesta se escribe sola en Harbiz
// (prueba con los clientes de Raúl, ver TIPOS_A_HARBIZ en progresion.js).
// Si es así, antes de aceptar se enseña lo que leerá el cliente, y después
// cómo ha ido: la escribe una rutina en la nube, no el navegador.
const ESTADO_HARBIZ = {
  pendiente: { clase: 'pendiente', texto: () => '📲 Se escribe en Harbiz en la próxima pasada (7:30 o 20:30)' },
  escrita: { clase: 'ok', texto: (d) => `📲 Escrita en Harbiz${d ? `: ${d}` : ''}` },
  sin_sesion: { clase: 'aviso', texto: (d) => `⚠️ No escrita en Harbiz${d ? `: ${d}` : ''}. Pásalo a mano.` },
  error: { clase: 'aviso', texto: (d) => `⚠️ No escrita en Harbiz${d ? `: ${d}` : ''}. Pásalo a mano.` },
}

export default function PropuestasSesion({ propuestas = [], respuestas = [], onResponder, onDeshacer, aHarbiz = () => false }) {
  const [abierto, setAbierto] = useState(false)
  const [descartando, setDescartando] = useState(null)
  const [motivo, setMotivo] = useState('')

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
            const irAHarbiz = !r && aHarbiz(p)
            const estadoHarbiz = r?.estado === 'aplicada' && r.harbizEstado ? ESTADO_HARBIZ[r.harbizEstado] : null
            return (
              <li key={p.id} className={`propuestas-sesion-item propuesta-tipo-${p.tipo}${r ? ` propuesta-respondida propuesta-${r.estado}` : ''}`}>
                <div className="propuestas-sesion-texto" title={TIPOS[p.tipo]?.ayuda}>
                  {TIPOS[p.tipo]?.emoji}{' '}
                  {p.tipo !== 'movilidad' && <strong>{p.ejercicio}: </strong>}
                  {p.texto}
                  {p.tipo === 'movilidad' && p.cita && <div className="propuesta-lista-ejercicios">{p.cita}</div>}
                  {irAHarbiz && <div className="propuesta-harbiz propuesta-harbiz-previa">📲 Al aceptar, el cliente leerá en Harbiz: «{p.notaHarbiz}»</div>}
                  {estadoHarbiz && <div className={`propuesta-harbiz propuesta-harbiz-${estadoHarbiz.clase}`}>{estadoHarbiz.texto(r.harbizDetalle)}</div>}
                </div>
                {r ? (
                  <div className="propuestas-sesion-acciones">
                    <span className="propuesta-respuesta">
                      {r.estado === 'aplicada' ? '✅' : `❌${r.motivo ? ` ${r.motivo}` : ''}`}
                      {r.respondidoPor ? ` · ${r.respondidoPor}` : ''}
                    </span>
                    <button
                      type="button"
                      className="propuesta-btn-deshacer"
                      onClick={() => {
                        // Deshacer aquí no borra lo que ya está en Harbiz.
                        if (r.harbizEstado === 'escrita' && !window.confirm('Esta propuesta ya está escrita en Harbiz. Deshacerla aquí NO la quita de Harbiz: si hace falta, cambia la nota a mano. ¿Deshacer?')) return
                        onDeshacer(p.id)
                      }}
                    >
                      Deshacer
                    </button>
                  </div>
                ) : descartando === p.id ? (
                  <form
                    className="propuesta-motivo"
                    onSubmit={(e) => { e.preventDefault(); onResponder(p, 'descartada', motivo); setDescartando(null); setMotivo('') }}
                  >
                    <input autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="¿Por qué no?" />
                    <button type="submit" className="propuesta-btn">Guardar</button>
                    <button type="button" className="propuesta-btn-deshacer" onClick={() => { setDescartando(null); setMotivo('') }}>✕</button>
                  </form>
                ) : (
                  <div className="propuestas-sesion-acciones">
                    <button type="button" className="propuesta-btn propuesta-btn-ok" onClick={() => onResponder(p, 'aplicada')} title={irAHarbiz ? 'Aceptar: se escribe sola en la nota del ejercicio en Harbiz' : 'Ya lo he cambiado en Harbiz (o lo he hablado con el cliente)'}>✅</button>
                    <button type="button" className="propuesta-btn propuesta-btn-no" onClick={() => { setDescartando(p.id); setMotivo('') }} title="No la veo: di por qué (sirve para pulir las reglas)">❌</button>
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

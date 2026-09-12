import { useState } from 'react'
import {
  respuestasPorFactor,
  suLectura,
  respuestasSueltas,
  respondidas,
  TOTAL_PREGUNTAS,
  enlaceCuestionario,
} from '../utils/cuestionarioPrevio'
import { factorInfo } from '../utils/redDeterminantes'
import { marcarCuestionarioRevisado } from '../lib/queries/cuestionariosPrevios'

// Lectura del cuestionario previo, para tenerlo delante mientras se monta la
// red de determinantes.
//
// No se enseña en el orden en que lo contestó el cliente, sino AGRUPADO POR EL
// FACTOR al que alimenta cada respuesta. Es la diferencia entre leer 27
// respuestas de arriba abajo y poder preguntarse "¿qué me han contado sobre el
// sueño?" justo cuando estás puntuando el sueño.

function valorLegible(pregunta, valor) {
  if (pregunta?.tipo === 'escala') return `${valor} / 10`
  return String(valor)
}

// Las escalas marcadas como invertidas van al revés que el factor que
// alimentan: "10 = muy buen ánimo" alimenta el factor "ánimo bajo". Es el
// error más fácil de cometer al trasladar, así que se avisa en la propia fila
// y se ofrece ya hecha la cuenta.
function avisoInvertida(pregunta, valor) {
  if (pregunta?.tipo !== 'escala' || !pregunta.invertida) return null
  const n = Number(valor)
  if (Number.isNaN(n)) return null
  return `ojo, va al revés: para el factor son ${10 - n} / 10`
}

export default function RespuestasCuestionario({ cuestionario, onRevisadoChange }) {
  const [abierto, setAbierto] = useState(false)
  const [revisado, setRevisado] = useState(cuestionario?.revisado || false)
  if (!cuestionario) return null

  const porFactor = respuestasPorFactor(cuestionario.respuestas)
  const lectura = suLectura(cuestionario.respuestas)
  const sueltas = respuestasSueltas(cuestionario.respuestas)
  const hechas = respondidas(cuestionario.respuestas)
  const fecha = cuestionario.enviadoEn ? new Date(cuestionario.enviadoEn).toLocaleDateString('es-ES') : ''

  function alternarRevisado() {
    const nuevo = !revisado
    setRevisado(nuevo)
    marcarCuestionarioRevisado(cuestionario.id, nuevo)
    if (onRevisadoChange) onRevisadoChange(cuestionario.id, nuevo)
  }

  return (
    <div className={`cq-panel ${revisado ? 'cq-panel-revisado' : ''}`}>
      <button type="button" className="cq-cabecera" onClick={() => setAbierto((v) => !v)}>
        <span className="cq-cabecera-titulo">
          📋 Cuestionario previo del cliente
          {revisado && <span className="cq-badge cq-badge-ok">ya pasado a la red</span>}
        </span>
        <span className="cq-cabecera-meta">
          {hechas} de {TOTAL_PREGUNTAS} respondidas · {fecha}
          <span className="cq-flecha">{abierto ? '▲' : '▼'}</span>
        </span>
      </button>

      {abierto && (
        <div className="cq-cuerpo">
          {hechas < TOTAL_PREGUNTAS && (
            <p className="cq-incompleto">
              ℹ️ Lo dejó a medias ({TOTAL_PREGUNTAS - hechas} sin contestar). Las que faltan no aparecen abajo.
            </p>
          )}

          {lectura.length > 0 && (
            <div className="cq-lectura">
              <div className="cq-subtitulo">🎯 Su propia lectura</div>
              <p className="cq-lectura-nota">
                Esto no va a ningún factor: es la materia prima de los <strong>porcentajes</strong>. La respuesta
                a "si desapareciera, ¿cuánto mejorarías?" es la misma pregunta ancla del paso 3.
              </p>
              {lectura.map(({ pregunta, valor }) => (
                <div key={pregunta.id} className="cq-item">
                  <div className="cq-item-pregunta">{pregunta.texto}</div>
                  <div className="cq-item-valor">{valorLegible(pregunta, valor)}</div>
                </div>
              ))}
            </div>
          )}

          {porFactor.length > 0 && (
            <>
              <div className="cq-subtitulo">Lo que te sirve para cada factor</div>
              <div className="cq-factores">
                {porFactor.map(({ factor, items }) => {
                  const info = factorInfo(factor)
                  const eje = info?.eje || 'bio'
                  return (
                    <div key={factor} className={`cq-factor cq-factor-${eje}`}>
                      <div className="cq-factor-nombre">
                        <span className={`rd-punto rd-punto-eje-${eje}`} />
                        {info ? info.label : factor}
                      </div>
                      {items.map(({ pregunta, valor }) => {
                        const aviso = avisoInvertida(pregunta, valor)
                        return (
                          <div key={pregunta.id} className="cq-item">
                            <div className="cq-item-pregunta">{pregunta.texto}</div>
                            <div className="cq-item-valor">
                              {valorLegible(pregunta, valor)}
                              {aviso && <span className="cq-item-aviso">⚠️ {aviso}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {sueltas.length > 0 && (
            <div className="cq-sueltas">
              <div className="cq-subtitulo">Respuestas de preguntas que ya no existen</div>
              <p className="cq-lectura-nota">
                Se contestaron con una versión anterior del cuestionario. Se enseñan igual porque son datos del
                cliente, aunque el enunciado ya no esté.
              </p>
              {sueltas.map(({ id, valor }) => (
                <div key={id} className="cq-item">
                  <div className="cq-item-pregunta">{id}</div>
                  <div className="cq-item-valor">{String(valor)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="cq-acciones">
            <button type="button" className="secondary-action" onClick={alternarRevisado}>
              {revisado ? '↺ Marcar como pendiente' : '✅ Ya lo he pasado a la red'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Aviso para el equipo cuando un cuestionario llegó con un nombre que no
// coincide con ningún cliente. Pasa cuando alguien entra a /cuestionario sin
// el parámetro `c` del enlace y teclea su nombre distinto a como está en el
// panel; como todo el historial se enlaza por nombre, si no se arregla el
// cuestionario no se ve en ninguna ficha.
export function CuestionariosHuerfanos({ cuestionarios, clientes, onReasignar }) {
  const nombres = new Set((clientes || []).map((c) => c.Nombre))
  const huerfanos = (cuestionarios || []).filter((c) => !c.clienteNombre || !nombres.has(c.clienteNombre))
  if (huerfanos.length === 0) return null

  return (
    <div className="cq-huerfanos">
      <strong>📋 {huerfanos.length} cuestionario{huerfanos.length === 1 ? '' : 's'} sin cliente asignado</strong>
      <p>
        Llegaron con un nombre que no coincide con ninguna ficha. Asígnalos para que aparezcan en su valoración.
      </p>
      {huerfanos.map((c) => (
        <div key={c.id} className="cq-huerfano">
          <span className="cq-huerfano-nombre">
            {c.clienteNombre || '(sin nombre)'}
            {c.email && <em> · {c.email}</em>}
          </span>
          <select defaultValue="" onChange={(e) => { if (e.target.value) onReasignar(c.id, e.target.value) }}>
            <option value="">Asignar a…</option>
            {(clientes || []).map((cl) => (
              <option key={cl.Nombre} value={cl.Nombre}>{cl.Nombre}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}

// Se enseña en el formulario de valoración cuando el cliente TODAVÍA no ha
// rellenado el cuestionario: es justo el momento en que el fisio se da cuenta
// de que le falta, así que el enlace tiene que estar ahí y no en otra
// pantalla. El nombre va dentro del enlace para que no lo teclee el cliente.
export function EnlaceCuestionario({ clienteNombre }) {
  const [copiado, setCopiado] = useState(false)
  const enlace = enlaceCuestionario(clienteNombre)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch (e) {
      // Sin permiso de portapapeles (o navegador antiguo): se selecciona el
      // texto para que se pueda copiar a mano, que es mejor que no hacer nada.
      const campo = document.getElementById('cq-enlace-campo')
      if (campo) { campo.focus(); campo.select() }
    }
  }

  return (
    <div className="cq-enlace">
      <div className="cq-enlace-texto">
        <strong>Este cliente todavía no ha rellenado el cuestionario previo.</strong>
        <span>Pásale este enlace por WhatsApp: lleva su nombre dentro, así que no tiene que teclearlo.</span>
      </div>
      <div className="cq-enlace-fila">
        <input id="cq-enlace-campo" type="text" readOnly value={enlace} onFocus={(e) => e.target.select()} />
        <button type="button" className="secondary-action" onClick={copiar}>
          {copiado ? '✅ Copiado' : 'Copiar enlace'}
        </button>
      </div>
    </div>
  )
}

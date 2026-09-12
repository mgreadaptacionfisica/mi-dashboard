import { useId, useMemo, useState } from 'react'
import {
  EJES,
  MIN_NODOS,
  MAX_NODOS,
  MAX_CAUSAS,
  factoresDeEje,
  etiquetaNodo,
  esModificable,
  nodosDe,
  dianasDe,
  causasDe,
  desconocidoDe,
  efectoSobre,
  detectarBucles,
  prioridades,
  validarRed,
  tieneNodo,
  alternarNodo,
  quitarNodo,
  anadirNodoOtro,
  fijarGravedad,
  fijarDiana,
  alternarCausa,
  fijarPesoCausa,
  fijarNotas,
  esFactorOtro,
} from '../utils/redDeterminantes'

// Recorta etiquetas largas para que quepan dentro de los nodos del SVG. El
// texto completo va siempre en un <title>, así que al pasar el ratón se lee
// entero y no se pierde nada.
function corta(texto, max = 24) {
  const t = String(texto || '')
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

export function LeyendaRedDeterminantes() {
  return (
    <div className="rd-leyenda">
      <span className="rd-leyenda-titulo">🕸️ Qué es la red de determinantes</span>
      <p>
        Un mapa de lo que le está pasando a este cliente: cada factor es un nodo y cada flecha es
        <strong> "esto causa esto otro, y en esta proporción"</strong>. Sirve para ver no solo QUÉ le afecta,
        sino <strong>cuánto y por qué camino</strong> — un factor puede no tocar el dolor directamente y ser de
        lo más importante porque llega por detrás (turnos de noche → duerme mal → más irritabilidad → más dolor).
      </p>
      <p>
        Se rellena en tres pasos: <strong>1)</strong> eliges los factores presentes, <strong>2)</strong> puntúas
        cuánto le limita cada uno por sí solo y marcas cuál es el problema diana, y <strong>3)</strong> dices qué
        causa cada cosa repartiendo el 100%. Lo que no sepas, déjalo en <strong>"no lo sé"</strong>: es una
        respuesta válida y mejor que inventarse una causa.
      </p>
      <p className="rd-leyenda-aviso">
        ⚠️ Esto refleja la causalidad que TÚ percibes, no una causalidad demostrada. Es una base para hablar con
        el cliente y decidir por dónde empezar, no un diagnóstico automático.
      </p>
    </div>
  )
}

// Cómo decidir el porcentaje. Vive en la pantalla y no en la cabeza de cada
// uno a propósito: si cada técnico se inventa su criterio, los repartos dejan
// de ser comparables entre clientes y el catálogo cerrado no sirve de nada.
// La pregunta ancla es contrafactual, que es la forma estándar de estimar
// peso causal y la que menos se presta a interpretaciones.
export function AyudaPorcentajes() {
  return (
    <div className="rd-ayuda-pct">
      <span className="rd-ayuda-pct-titulo">💡 Cómo decidir el porcentaje</span>
      <p>
        Pregúntate: <strong>si este factor desapareciera del todo mañana y lo demás siguiera igual, ¿cuánto
        mejoraría?</strong> Eso es su porcentaje. Es el reparto de la explicación de <em>ese</em> problema
        concreto, no la importancia del factor en general.
      </p>
      <div className="rd-ayuda-tramos">
        <span><strong>10-20%</strong> influye, pero es secundario</span>
        <span><strong>30-40%</strong> una de las causas principales</span>
        <span><strong>50-70%</strong> es la causa dominante</span>
        <span><strong>80-100%</strong> prácticamente lo explica todo</span>
      </div>
      <p className="rd-ayuda-pct-nota">
        Guíate por tramos y no afines al 1%: lo que importa es el orden y la magnitud, no si son 35 o 40 (por eso
        los controles van de 5 en 5). Y lo que no sepas, déjalo en <strong>"no lo sé"</strong> — un 40% de "no lo
        sé" es información honesta, un 40% inventado ensucia la red.
      </p>
    </div>
  )
}

// --- Grafo -----------------------------------------------------------------
// Una columna por eje (bio / psico / social) y flechas entre nodos. Se dibuja
// a mano en SVG en vez de con una librería de grafos: con 15 nodos como mucho
// y las posiciones fijadas por eje se lee perfectamente, y así no se añade
// una dependencia nueva solo para esto.
const ANCHO_NODO = 184
const ALTO_NODO = 48
const SEP_Y = 28
const SEP_X = 64

export function GrafoRed({ red }) {
  // useId evita que dos grafos en la misma página (por ejemplo el del
  // formulario y el de la evolución) se pisen los marcadores de flecha, que
  // se referencian por id.
  const uid = useId().replace(/:/g, '')
  const nodos = nodosDe(red)

  const { pos, ancho, alto, aristas } = useMemo(() => {
    const columnas = EJES.map((e) => nodos.filter((n) => n.eje === e.id))
    const filas = Math.max(1, ...columnas.map((c) => c.length))
    const posiciones = {}
    columnas.forEach((col, ci) => {
      const x = 16 + ci * (ANCHO_NODO + SEP_X)
      // Cada columna se centra verticalmente respecto de la más larga, para
      // que no quede todo pegado arriba cuando un eje tiene 1 factor y otro 5.
      const hueco = ((filas - col.length) * (ALTO_NODO + SEP_Y)) / 2
      col.forEach((n, ri) => {
        posiciones[n.id] = { x, y: 58 + hueco + ri * (ALTO_NODO + SEP_Y) }
      })
    })
    const lista = []
    nodos.forEach((efecto) => {
      Object.entries(causasDe(red, efecto.id)).forEach(([causaId, peso]) => {
        if (!posiciones[causaId] || !posiciones[efecto.id]) return
        lista.push({ desde: causaId, hasta: efecto.id, peso })
      })
    })
    return {
      pos: posiciones,
      ancho: 32 + EJES.length * ANCHO_NODO + (EJES.length - 1) * SEP_X,
      alto: 58 + filas * (ALTO_NODO + SEP_Y) + 12,
      aristas: lista,
    }
  }, [red, nodos])

  if (nodos.length === 0) return null

  // Punto de salida y de entrada de cada flecha: siempre por el lado que mira
  // al otro nodo, para que la flecha no atraviese la caja de la que sale.
  function trazo(a, b) {
    const ay = a.y + ALTO_NODO / 2
    const by = b.y + ALTO_NODO / 2
    if (a.x === b.x) {
      // Misma columna: la flecha sale y entra por la derecha, rodeando.
      const x = a.x + ANCHO_NODO
      return { d: `M ${x} ${ay} Q ${x + 46} ${(ay + by) / 2} ${x} ${by}`, fin: [x, by] }
    }
    const haciaDerecha = a.x < b.x
    const x1 = haciaDerecha ? a.x + ANCHO_NODO : a.x
    const x2 = haciaDerecha ? b.x : b.x + ANCHO_NODO
    const cx = (x1 + x2) / 2
    const cy = (ay + by) / 2 + (haciaDerecha ? -14 : 14)
    return { d: `M ${x1} ${ay} Q ${cx} ${cy} ${x2} ${by}`, fin: [x2, by] }
  }

  return (
    <div className="rd-grafo-scroll">
      <svg className="rd-grafo" viewBox={`0 0 ${ancho} ${alto}`} width={ancho} height={alto} role="img" aria-label="Red de determinantes del cliente">
        <defs>
          {EJES.map((e) => (
            <marker key={e.id} id={`${uid}-punta-${e.id}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
              <path d="M 0 0 L 7 3.5 L 0 7 z" className={`rd-punta rd-punta-${e.id}`} />
            </marker>
          ))}
        </defs>

        {EJES.map((e, i) => (
          <text key={e.id} x={16 + i * (ANCHO_NODO + SEP_X) + ANCHO_NODO / 2} y={26} textAnchor="middle" className="rd-grafo-eje">
            {e.emoji} {e.label}
          </text>
        ))}

        {aristas.map(({ desde, hasta, peso }) => {
          const a = pos[desde]
          const b = pos[hasta]
          const { d } = trazo(a, b)
          const eje = nodos.find((n) => n.id === desde)?.eje || 'bio'
          return (
            <path
              key={`${desde}->${hasta}`}
              d={d}
              className={`rd-arista rd-arista-${eje}`}
              // El grosor es la fuerza causal: de 1 (flecha testimonial) a 5
              // (esta causa explica casi todo lo de destino).
              strokeWidth={1 + (peso / 100) * 4}
              opacity={0.3 + (peso / 100) * 0.6}
              markerEnd={`url(#${uid}-punta-${eje})`}
              fill="none"
            >
              <title>{`${etiquetaNodo(nodos.find((n) => n.id === desde))} → ${etiquetaNodo(nodos.find((n) => n.id === hasta))}: ${peso}%`}</title>
            </path>
          )
        })}

        {nodos.map((n) => {
          const p = pos[n.id]
          const grav = Number(n.gravedad) || 0
          return (
            <g key={n.id} className={`rd-nodo rd-nodo-${n.eje} ${n.diana ? 'rd-nodo-diana' : ''}`}>
              <title>{`${etiquetaNodo(n)} — gravedad ${grav}/100${n.diana ? ' (problema diana)' : ''}${esModificable(n) ? '' : ' · no modificable'}`}</title>
              <rect x={p.x} y={p.y} width={ANCHO_NODO} height={ALTO_NODO} rx="8" className="rd-nodo-caja" />
              <text x={p.x + 10} y={p.y + 20} className="rd-nodo-texto">
                {n.diana ? '🎯 ' : ''}{esModificable(n) ? '' : '🔒 '}{corta(etiquetaNodo(n), n.diana ? 20 : 22)}
              </text>
              {/* Barra de gravedad: más legible que codificarla en el tamaño
                  del nodo, que obliga a comparar áreas a ojo. */}
              <rect x={p.x + 10} y={p.y + 30} width={ANCHO_NODO - 44} height="6" rx="3" className="rd-nodo-barra-fondo" />
              <rect x={p.x + 10} y={p.y + 30} width={((ANCHO_NODO - 44) * grav) / 100} height="6" rx="3" className="rd-nodo-barra" />
              <text x={p.x + ANCHO_NODO - 10} y={p.y + 36} textAnchor="end" className="rd-nodo-gravedad">{grav}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// --- Vista de lectura ------------------------------------------------------

export function VistaRedDeterminantes({ red }) {
  const nodos = nodosDe(red)
  const ranking = useMemo(() => prioridades(red), [red])
  const bucles = useMemo(() => detectarBucles(red), [red])
  const diana = ranking.diana
  const efectos = useMemo(() => (diana ? efectoSobre(red, diana) : []), [red, diana])
  const nombreDiana = diana ? etiquetaNodo(nodos.find((n) => n.id === diana)) : null

  if (nodos.length === 0) return <p className="lead-log-empty">Esta valoración no tiene red de determinantes.</p>

  return (
    <div className="rd-vista">
      <GrafoRed red={red} />

      {ranking.modificables.length > 0 && (
        <>
          <h5 className="rd-subtitulo">Por dónde empezar</h5>
          <p className="valoracion-referencia" style={{ margin: '0 0 8px' }}>
            ℹ️ Ordenado por peso dentro de la red. Solo aparecen aquí los factores sobre los que se puede actuar.
          </p>
          <div className="rd-ranking">
            {ranking.modificables.map((f) => (
              <div key={f.id} className="rd-ranking-fila">
                <span className={`rd-punto rd-punto-eje-${f.nodo.eje}`} />
                <span className="rd-ranking-label">{etiquetaNodo(f.nodo)}</span>
                <span className="rd-ranking-barra">
                  <span className={`rd-ranking-relleno rd-relleno-${f.nodo.eje}`} style={{ width: `${Math.min(100, f.proporcion * 3)}%` }} />
                </span>
                <span className="rd-ranking-pct">{f.proporcion}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      {ranking.noModificables.length > 0 && (
        <p className="rd-no-modificables">
          🔒 <strong>No modificables</strong> (explican el cuadro y ajustan expectativas, pero no son objetivo):{' '}
          {ranking.noModificables.map((f) => `${etiquetaNodo(f.nodo)} (${f.proporcion}%)`).join(' · ')}
        </p>
      )}

      {bucles.length > 0 && (
        <>
          <h5 className="rd-subtitulo">🔄 Bucles detectados</h5>
          <p className="valoracion-referencia" style={{ margin: '0 0 8px' }}>
            ℹ️ Un bucle se mantiene solo: mientras siga cerrado, bajar la intensidad del cuadro no basta. Hay que
            romperlo por su eslabón más accesible.
          </p>
          {bucles.map((b) => (
            <div key={b.ciclo.join('-')} className="rd-bucle">
              <span className="rd-bucle-ruta">
                {b.ciclo.map((id) => etiquetaNodo(nodos.find((n) => n.id === id)) || id).join(' → ')} → (vuelta)
              </span>
              <span className="rd-bucle-peso">fuerza {b.peso}%</span>
            </div>
          ))}
        </>
      )}

      {diana && efectos.length > 0 && (
        <>
          <h5 className="rd-subtitulo">Qué le llega a "{nombreDiana}"</h5>
          <div className="rd-efectos">
            <div className="rd-efectos-cabecera">
              <span>Factor</span><span>Directo</span><span>Indirecto</span><span>Total</span>
            </div>
            {efectos.map((e) => (
              <div key={e.id} className="rd-efectos-fila">
                <span className="rd-efectos-label">
                  {etiquetaNodo(e.nodo)}
                  {e.caminos.length > 0 && (
                    <span className="rd-efectos-vias">
                      {e.caminos.slice(0, 2).map((c) => (
                        <span key={c.camino.join('-')}>
                          vía {c.camino.slice(1, -1).map((id) => etiquetaNodo(nodos.find((n) => n.id === id)) || id).join(' → ')}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span>{e.directo > 0 ? `${e.directo}%` : '—'}</span>
                <span>{e.indirecto > 0 ? `${e.indirecto}%` : '—'}</span>
                <span className="rd-efectos-total">{e.total}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      {red?.notas && <p className="rd-notas">📝 {red.notas}</p>}
    </div>
  )
}

// --- Editor ----------------------------------------------------------------

// Paso 1: qué factores están presentes. Chips por eje, más un "otro" de texto
// libre por si el catálogo se queda corto.
function PasoFactores({ red, onChange }) {
  const [otroAbierto, setOtroAbierto] = useState(null)
  const [otroTexto, setOtroTexto] = useState('')
  const nodos = nodosDe(red)

  function anadirOtro(ejeId) {
    if (!otroTexto.trim()) return
    onChange(anadirNodoOtro(red, ejeId, otroTexto))
    setOtroTexto('')
    setOtroAbierto(null)
  }

  return (
    <>
      {EJES.map((eje) => {
        const otrosDelEje = nodos.filter((n) => n.eje === eje.id && esFactorOtro(n.id))
        return (
          <div key={eje.id} className="rd-eje-bloque">
            <div className={`rd-eje-titulo rd-eje-titulo-${eje.id}`}>
              {eje.emoji} {eje.label}
              <span className="rd-eje-descripcion">{eje.descripcion}</span>
            </div>
            <div className="rd-chips">
              {factoresDeEje(eje.id).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`rd-chip rd-chip-${eje.id} ${tieneNodo(red, f.id) ? 'rd-chip-activo' : ''}`}
                  title={`${f.ayuda}${f.modificable ? '' : '\n\n🔒 No modificable: explica el cuadro pero no es candidato a objetivo.'}`}
                  onClick={() => onChange(alternarNodo(red, f.id))}
                >
                  {f.modificable ? '' : '🔒 '}{f.label}
                </button>
              ))}
              {otrosDelEje.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`rd-chip rd-chip-${eje.id} rd-chip-activo rd-chip-otro`}
                  title="Factor añadido a mano. Pulsa para quitarlo."
                  onClick={() => onChange(quitarNodo(red, n.id))}
                >
                  {n.etiqueta} ✕
                </button>
              ))}
              {otroAbierto === eje.id ? (
                <span className="rd-otro-form">
                  <input
                    type="text"
                    autoFocus
                    value={otroTexto}
                    placeholder="Nombre del factor"
                    onChange={(e) => setOtroTexto(e.target.value)}
                    onKeyDown={(e) => {
                      // Enter dentro de un formulario enviaría la valoración
                      // entera, así que aquí se intercepta.
                      if (e.key === 'Enter') { e.preventDefault(); anadirOtro(eje.id) }
                      if (e.key === 'Escape') { setOtroAbierto(null); setOtroTexto('') }
                    }}
                  />
                  <button type="button" className="secondary-action" onClick={() => anadirOtro(eje.id)}>Añadir</button>
                  <button type="button" className="secondary-action" onClick={() => { setOtroAbierto(null); setOtroTexto('') }}>✕</button>
                </span>
              ) : (
                <button type="button" className="rd-chip rd-chip-anadir" onClick={() => { setOtroAbierto(eje.id); setOtroTexto('') }}>
                  ＋ Otro
                </button>
              )}
            </div>
          </div>
        )
      })}
    </>
  )
}

// Paso 2: cuánto limita cada factor por sí solo, y cuál es el problema diana.
function PasoGravedad({ red, onChange, sugeridas }) {
  const nodos = nodosDe(red)
  return (
    <div className="rd-gravedades">
      {nodos.map((n) => {
        const grav = Number(n.gravedad) || 0
        const sugerida = sugeridas?.[n.id]
        return (
          <div key={n.id} className={`rd-gravedad-fila ${n.diana ? 'rd-gravedad-diana' : ''}`}>
            <button
              type="button"
              className={`rd-diana-btn ${n.diana ? 'rd-diana-btn-activo' : ''}`}
              title="Marcar como problema diana: la queja u objetivo que estamos explicando. Pulsa otra vez para desmarcarlo."
              onClick={() => onChange(fijarDiana(red, n.id))}
            >
              🎯
            </button>
            <span className={`rd-punto rd-punto-eje-${n.eje}`} />
            <span className="rd-gravedad-label">
              {esModificable(n) ? '' : '🔒 '}{etiquetaNodo(n)}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={grav}
              className={`rd-slider rd-slider-${n.eje}`}
              onChange={(e) => onChange(fijarGravedad(red, n.id, e.target.value))}
            />
            <span className="rd-gravedad-valor">{grav}</span>
            {sugerida !== undefined && sugerida !== grav && (
              <button
                type="button"
                className="rd-sugerida"
                title={`Valor calculado a partir del cuestionario de esta misma valoración (${n.id === 'dolor' ? 'SPADI' : 'TAMPA'})`}
                onClick={() => onChange(fijarGravedad(red, n.id, sugerida))}
              >
                usar {sugerida}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Paso 3: qué causa cada cosa. Se pregunta por EFECTO ("¿qué está causando
// esto?") porque es la forma en que se piensa y la que hace el método
// manejable; el grafo ya se encarga de darle la vuelta.
function PasoCausas({ red, onChange }) {
  const nodos = nodosDe(red)
  return (
    <div className="rd-causas">
      <AyudaPorcentajes />
      {nodos.map((n) => {
        const causas = causasDe(red, n.id)
        const elegidas = Object.keys(causas)
        const noSe = desconocidoDe(red, n.id)
        return (
          <div key={n.id} className={`rd-causa-bloque ${n.diana ? 'rd-causa-bloque-diana' : ''}`}>
            <div className="rd-causa-pregunta">
              {n.diana ? '🎯 ' : ''}¿Qué está causando <strong>{etiquetaNodo(n)}</strong>?
              <span className="rd-causa-contador">{elegidas.length}/{MAX_CAUSAS}</span>
            </div>
            <div className="rd-chips">
              {nodos
                .filter((o) => o.id !== n.id)
                .map((o) => {
                  const activa = o.id in causas
                  const lleno = !activa && elegidas.length >= MAX_CAUSAS
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={lleno}
                      className={`rd-chip rd-chip-${o.eje} ${activa ? 'rd-chip-activo' : ''}`}
                      title={lleno ? `Ya hay ${MAX_CAUSAS} causas. El tope obliga a priorizar: si todo causa todo, la red no dice nada.` : ''}
                      onClick={() => onChange(alternarCausa(red, n.id, o.id))}
                    >
                      {etiquetaNodo(o)}
                    </button>
                  )
                })}
            </div>
            {elegidas.length > 0 && (
              <div className="rd-reparto">
                {elegidas.map((causaId) => {
                  const origen = nodos.find((o) => o.id === causaId)
                  return (
                    <div key={causaId} className="rd-reparto-fila">
                      <span className={`rd-punto rd-punto-eje-${origen?.eje || 'bio'}`} />
                      <span className="rd-reparto-label">{etiquetaNodo(origen)}</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={causas[causaId]}
                        className={`rd-slider rd-slider-${origen?.eje || 'bio'}`}
                        onChange={(e) => onChange(fijarPesoCausa(red, n.id, causaId, e.target.value))}
                      />
                      <span className="rd-reparto-valor">{causas[causaId]}%</span>
                    </div>
                  )
                })}
                <div className="rd-reparto-fila rd-reparto-nose">
                  <span className="rd-punto rd-punto-nose" />
                  <span className="rd-reparto-label">Otras causas / no lo sé</span>
                  <span className="rd-reparto-nose-barra"><span style={{ width: `${noSe}%` }} /></span>
                  <span className="rd-reparto-valor">{noSe}%</span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function EditorRedDeterminantes({ red, onChange, sugeridas = {} }) {
  const actual = red && typeof red === 'object' ? red : { nodos: [], causas: {}, notas: '' }
  const nodos = nodosDe(actual)
  const avisos = useMemo(() => validarRed(actual), [actual])
  const sinDiana = nodos.length > 0 && dianasDe(actual).length === 0

  return (
    <div className="rd-editor">
      <LeyendaRedDeterminantes />

      <div className="rd-paso">
        <div className="rd-paso-titulo">
          <span className="rd-paso-numero">1</span>
          ¿Qué factores están presentes?
          <span className="rd-paso-contador">
            {nodos.length} elegido{nodos.length === 1 ? '' : 's'}
            <em> · recomendado entre {MIN_NODOS} y {MAX_NODOS}</em>
          </span>
        </div>
        <PasoFactores red={actual} onChange={onChange} />
      </div>

      {nodos.length > 0 && (
        <div className="rd-paso">
          <div className="rd-paso-titulo">
            <span className="rd-paso-numero">2</span>
            ¿Cuánto le limita cada uno <em>por sí solo</em>?
          </div>
          {sinDiana && (
            <p className="rd-aviso rd-aviso-fuerte">
              🎯 Marca cuál es el <strong>problema diana</strong> (la queja u objetivo que estás explicando) con el
              botón de la izquierda. Sin él no se puede calcular qué le afecta ni por qué camino.
            </p>
          )}
          <PasoGravedad red={actual} onChange={onChange} sugeridas={sugeridas} />
        </div>
      )}

      {nodos.length >= 2 && (
        <div className="rd-paso">
          <div className="rd-paso-titulo">
            <span className="rd-paso-numero">3</span>
            ¿Qué causa qué?
          </div>
          <PasoCausas red={actual} onChange={onChange} />
        </div>
      )}

      {nodos.length > 0 && (
        <>
          <label className="valoracion-campo" style={{ marginTop: 10 }}>
            <span>Notas sobre la red</span>
            <textarea
              rows={2}
              value={actual.notas || ''}
              placeholder="Matices que no caben en el mapa: de dónde sale una creencia, qué dijo el cliente…"
              onChange={(e) => onChange(fijarNotas(actual, e.target.value))}
            />
          </label>

          {avisos.length > 0 && (
            <div className="rd-avisos">
              {avisos.map((a, i) => (
                <p key={i} className={`rd-aviso rd-aviso-${a.nivel}`}>
                  {a.nivel === 'aviso' ? '⚠️' : 'ℹ️'} {a.texto}
                </p>
              ))}
            </div>
          )}

          <div className="rd-previsualizacion">
            <div className="rd-paso-titulo"><span className="rd-paso-numero">✓</span> Cómo queda</div>
            <VistaRedDeterminantes red={actual} />
          </div>
        </>
      )}
    </div>
  )
}

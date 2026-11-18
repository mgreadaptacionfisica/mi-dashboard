import { useMemo, useState } from 'react'
import { historialEjercicios, claseEjercicio, esAsistido } from '../utils/progresion'

// 📈 Evolución (vista del modal de Seguimiento): una gráfica por ejercicio
// con lo que el cliente apuntó en Harbiz, sesión a sesión: carga, reps y
// series. No guarda nada: lee `detalle.registro` de las filas de
// sesiones_harbiz del cliente (OJO: no de `seguimientos`, porque al volcar
// la sesión a la rejilla `detalleHarbizLimpio()` se queda solo con los
// comentarios y tira el registro). Usa `historialEjercicios()` de
// progresion.js, el mismo historial con el que se calculan las 🤖 Propuestas,
// para que la gráfica y la propuesta cuenten lo mismo.
// En modo demo no llegan sesiones de Harbiz, así que no sale nada.

const METRICAS = [
  { id: 'carga', label: '🏋️ Carga', ayuda: 'Kilos de la serie más pesada de cada sesión.' },
  { id: 'reps', label: '🔁 Repeticiones', ayuda: 'Cada punto gris es una serie; la línea, la media. La franja verde es el rango pautado.' },
  { id: 'series', label: '🧱 Series', ayuda: 'Series hechas (con repeticiones apuntadas) en cada sesión.' },
  { id: 'volumen', label: '📦 Volumen', ayuda: 'Kilos × repeticiones de todas las series de la sesión.' },
]

const fmt = (n) => (Math.round(n * 10) / 10).toLocaleString('es-ES')
const fechaCorta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

function valoresDe(metrica, ap) {
  const reps = ap.series.map((x) => x.reps).filter((r) => r > 0)
  if (metrica === 'carga') return ap.kgMax > 0 ? { v: ap.kgMax } : null
  if (metrica === 'series') return reps.length ? { v: reps.length } : null
  if (metrica === 'volumen') {
    const vol = ap.series.reduce((acc, x) => acc + (x.reps > 0 ? x.reps * x.kg : 0), 0)
    return vol > 0 ? { v: vol } : null
  }
  if (!reps.length) return null
  return { v: reps.reduce((a, b) => a + b, 0) / reps.length, puntos: reps }
}

// Gráfica en SVG (sin librería: son 5–20 puntos). Eje X = sesiones, a
// distancia fija, para que dos sesiones seguidas no se monten.
function Grafica({ apariciones, metrica, unidad }) {
  const W = 560
  const H = 170
  const M = { t: 14, r: 14, b: 26, l: 40 }
  const datos = apariciones.map((ap) => ({ ap, val: valoresDe(metrica, ap) }))
  const conValor = datos.filter((d) => d.val)
  if (!conValor.length) return <p className="evolucion-vacio">Sin datos de {metrica === 'carga' || metrica === 'volumen' ? 'carga (va a peso corporal o sin kilos apuntados)' : 'repeticiones'}.</p>

  const todos = []
  conValor.forEach((d) => { todos.push(d.val.v); (d.val.puntos || []).forEach((p) => todos.push(p)) })
  if (metrica === 'reps') datos.forEach((d) => { if (d.ap.rango) todos.push(d.ap.rango.lo, d.ap.rango.hi) })
  let max = Math.max(...todos)
  let min = metrica === 'series' || metrica === 'volumen' ? 0 : Math.min(...todos)
  if (max === min) { max += 1; min = Math.max(0, min - 1) }
  const pad = (max - min) * 0.12
  max += pad
  min = Math.max(0, min - pad)

  const n = datos.length
  const x = (i) => M.l + (n === 1 ? (W - M.l - M.r) / 2 : (i * (W - M.l - M.r)) / (n - 1))
  const y = (v) => M.t + (1 - (v - min) / (max - min)) * (H - M.t - M.b)
  const ticks = [min, (min + max) / 2, max]
  const cada = Math.ceil(n / 8)
  const linea = datos.map((d, i) => (d.val ? `${x(i)},${y(d.val.v)}` : null)).filter(Boolean).join(' ')
  const barras = metrica === 'series' || metrica === 'volumen'
  const anchoBarra = Math.min(28, ((W - M.l - M.r) / Math.max(n, 1)) * 0.6)

  return (
    <svg className="evolucion-grafica" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Evolución de ${metrica}`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className="evolucion-rejilla" />
          <text x={M.l - 6} y={y(t) + 4} textAnchor="end" className="evolucion-eje">{fmt(t)}</text>
        </g>
      ))}
      {metrica === 'reps' && datos.map((d, i) => d.ap.rango && (
        <rect key={`r${i}`} x={x(i) - (n === 1 ? 30 : (W - M.l - M.r) / (n - 1) / 2)} width={n === 1 ? 60 : (W - M.l - M.r) / (n - 1)}
          y={y(d.ap.rango.hi)} height={Math.max(1, y(d.ap.rango.lo) - y(d.ap.rango.hi))} className="evolucion-rango" />
      ))}
      {barras
        ? datos.map((d, i) => d.val && (
          <rect key={i} x={x(i) - anchoBarra / 2} width={anchoBarra} y={y(d.val.v)} height={y(min) - y(d.val.v)} rx="3" className="evolucion-barra">
            <title>{`${fechaCorta(d.ap.fecha)}: ${fmt(d.val.v)} ${unidad}`}</title>
          </rect>
        ))
        : <polyline points={linea} className="evolucion-linea" />}
      {metrica === 'reps' && datos.map((d, i) => (d.val?.puntos || []).map((p, k) => (
        <circle key={`p${i}-${k}`} cx={x(i)} cy={y(p)} r="2.6" className="evolucion-serie" />
      )))}
      {!barras && datos.map((d, i) => d.val && (
        <circle key={`c${i}`} cx={x(i)} cy={y(d.val.v)} r="4.5" className="evolucion-punto">
          <title>{`${fechaCorta(d.ap.fecha)}: ${metrica === 'reps' ? `${d.val.puntos.join('/')} reps` : `${fmt(d.val.v)} ${unidad}`}${d.ap.objetivo ? ` · objetivo ${d.ap.objetivo}` : ''}`}</title>
        </circle>
      ))}
      {datos.map((d, i) => (i % cada === 0 || i === n - 1) && (
        <text key={`x${i}`} x={x(i)} y={H - 8} textAnchor="middle" className="evolucion-eje">{fechaCorta(d.ap.fecha)}</text>
      ))}
    </svg>
  )
}

// "12 → 16 kg (+33 %)": primera y última sesión con dato de esa métrica.
function cambio(apariciones, metrica, unidad) {
  const vals = apariciones.map((ap) => valoresDe(metrica, ap)).filter(Boolean).map((v) => v.v)
  if (vals.length < 2) return null
  const a = vals[0]
  const b = vals[vals.length - 1]
  const pct = a > 0 ? Math.round(((b - a) / a) * 100) : 0
  return { texto: `${fmt(a)} → ${fmt(b)} ${unidad}`, pct, sube: b > a, baja: b < a }
}

export default function EvolucionEjercicios({ sesiones = [] }) {
  const [metrica, setMetrica] = useState('carga')
  const [filtro, setFiltro] = useState('fuerza')
  const [busqueda, setBusqueda] = useState('')

  const ejercicios = useMemo(() => {
    const historial = historialEjercicios(sesiones)
    return [...historial.values()]
      .map((e) => ({ ...e, clase: claseEjercicio(e.nombre, e.apariciones), asistido: esAsistido(e.nombre), ultima: e.apariciones[e.apariciones.length - 1]?.fecha || '' }))
      // Lo que más se repite y lo más reciente primero: es donde hay evolución que mirar.
      .sort((a, b) => (b.apariciones.length > 1) - (a.apariciones.length > 1) || b.ultima.localeCompare(a.ultima) || b.apariciones.length - a.apariciones.length)
  }, [sesiones])

  const texto = busqueda.trim().toLowerCase()
  const visibles = ejercicios.filter((e) => (filtro === 'todos' || e.clase === filtro) && (!texto || e.nombre.toLowerCase().includes(texto)))
  const infoMetrica = METRICAS.find((m) => m.id === metrica)

  if (!ejercicios.length) {
    return (
      <p className="evolucion-vacio">
        Aún no hay registros de Harbiz con repeticiones y kilos para este cliente. Salen solos en cuanto complete entrenos en Harbiz
        (los datos llegan desde el 26/10/2026).
      </p>
    )
  }

  return (
    <div className="evolucion">
      <div className="evolucion-controles">
        <div className="tabs-bar">
          {METRICAS.map((m) => (
            <button key={m.id} type="button" className={`tab-btn ${metrica === m.id ? 'tab-btn-active' : ''}`} onClick={() => setMetrica(m.id)}>{m.label}</button>
          ))}
        </div>
        <div className="evolucion-filtros">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="fuerza">Fuerza</option>
            <option value="movilidad">Movilidad</option>
            <option value="todos">Todos</option>
          </select>
          <input type="search" placeholder="Buscar ejercicio…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
      </div>
      <p className="evolucion-ayuda">{infoMetrica.ayuda} Pasa el ratón por un punto para ver el detalle.</p>

      {!visibles.length && <p className="evolucion-vacio">Ningún ejercicio con ese filtro.</p>}
      <div className="evolucion-lista">
        {visibles.map((e) => {
          const unidad = metrica === 'carga' || metrica === 'volumen' ? 'kg' : metrica === 'reps' ? 'reps' : 'series'
          const c = cambio(e.apariciones, metrica, unidad)
          const recientes = e.apariciones.slice(-3).reverse()
          return (
            <section key={e.nombre} className="evolucion-card">
              <header className="evolucion-card-cabecera">
                <strong>{e.nombre}</strong>
                <span className="evolucion-meta">
                  {e.apariciones.length} {e.apariciones.length === 1 ? 'sesión' : 'sesiones'}
                  {e.clase === 'movilidad' ? ' · movilidad' : ''}
                  {e.asistido && metrica === 'carga' ? ' · el kilo es la ayuda (menos = progreso)' : ''}
                </span>
                {c && (
                  <span className={`evolucion-cambio ${(e.asistido && metrica === 'carga' ? c.baja : c.sube) ? 'evolucion-cambio-bien' : c.sube || c.baja ? 'evolucion-cambio-ojo' : ''}`}>
                    {c.texto}{c.pct ? ` (${c.pct > 0 ? '+' : ''}${c.pct} %)` : ''}
                  </span>
                )}
              </header>
              <Grafica apariciones={e.apariciones} metrica={metrica} unidad={unidad} />
              <ul className="evolucion-recientes">
                {recientes.map((ap) => {
                  const reps = ap.series.map((x) => x.reps).filter((r) => r > 0)
                  return (
                    <li key={ap.sesionId + ap.fecha}>
                      <span className="evolucion-fecha">{fechaCorta(ap.fecha)}</span>
                      {reps.length ? `${reps.length} × ${reps.join('/')}` : 'sin reps'}
                      {ap.kgMax > 0 ? ` · ${fmt(ap.kgMax)} kg` : ''}
                      {ap.objetivo ? ` · objetivo ${ap.objetivo}` : ''}
                      {ap.valoracion === 'dolor' ? ' · 🔴 dolor' : ap.valoracion === 'molestia' ? ' · 🟠 molestia' : ''}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

import { useState } from 'react'
import {
  BLOQUES,
  SIMETRIA_PARES,
  SPADI_ITEMS,
  SPADI_ENLACE,
  TAMPA_ITEMS,
  TAMPA_INTERPRETACION,
  REFERENCIA_FUERZA_POR_FASE,
  SEMAFORO_OPCIONES,
  DOMINANCIA_OPCIONES,
  PATRON_LUMBAR_OPCIONES,
  valoracionVacia,
  spadiTotal,
  tampaTotal,
  mejoraPct,
  indiceSimetria,
  faseInfo,
  faseAutomatica,
  faseTopeSpadi,
  ultimoSpadiCliente,
  semaforoInfo,
  compararSemaforo,
} from '../utils/valoracionHelpers'
import {
  DD_PASOS,
  DD_VALORES,
  ddMarcarTodoNegativo,
  ddMarcarPasoNegativo,
  ddLimpiar,
  ddResumenPaso,
  ddConclusion,
} from '../utils/diagnosticoDiferencial'
import { insertValoracionRemote, updateValoracionRemote, deleteValoracionRemote } from '../lib/queries/valoracionesClientes'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Leyenda del semáforo de movilidad: se muestra una sola vez, justo antes
// del primer bloque que lo usa, para que quede claro cómo elegir cada color
// sin depender solo del tooltip de cada botón.
function LeyendaSemaforo() {
  return (
    <div className="semaforo-leyenda">
      <span className="semaforo-leyenda-titulo">🚦 Cómo elegir el semáforo de movilidad:</span>
      {SEMAFORO_OPCIONES.map((op) => (
        <div key={op.valor} className="semaforo-leyenda-item">
          <span className={`semaforo-leyenda-punto semaforo-${op.valor}`}>{op.emoji}</span>
          <span><strong>{op.label}</strong> — {op.descripcion}</span>
        </div>
      ))}
    </div>
  )
}

// Leyenda del diagnóstico diferencial: explica de dónde sale el bloque y,
// sobre todo, cómo se rellena — que es al revés de lo que uno espera. Lo
// normal es que TODO salga negativo (no hay nada que descartar) y por eso
// existe el botón de marcarlo todo de golpe.
function LeyendaDiagnosticoDiferencial() {
  return (
    <div className="dd-leyenda">
      <span className="dd-leyenda-titulo">🔍 Cómo se rellena el diagnóstico diferencial</span>
      <p>
        El dolor relacionado con el manguito rotador (RCSRP) es un <strong>diagnóstico por descarte</strong>: los
        test ortopédicos no identifican estructuras concretas, así que no se confirma con un test, se llega a él
        descartando el resto de fuentes en este orden — <strong>cervical → hombro rígido → inestabilidad →
        acromioclavicular → bíceps</strong>. Si los cinco quedan descartados, el cuadro encaja con RCSRP.
      </p>
      <div className="dd-leyenda-valores">
        {DD_VALORES.map((op) => (
          <div key={op.valor} className="dd-leyenda-item">
            <span className={`dd-leyenda-punto dd-punto-${op.valor}`}>{op.emoji}</span>
            <span><strong>{op.label}</strong> — {op.descripcion}</span>
          </div>
        ))}
        <div className="dd-leyenda-item">
          <span className="dd-leyenda-punto dd-punto-vacio">⬜</span>
          <span><strong>Sin marcar</strong> — no lo has evaluado todavía. No es lo mismo que negativo: negativo significa que lo hiciste y salió limpio.</span>
        </div>
      </div>
      <p className="dd-leyenda-atajo">
        💡 Lo habitual es que no haya nada que destacar. Usa <strong>"Marcar todo como negativo"</strong> para
        dejarlo todo descartado de una vez y luego marca a mano solo los pocos que salgan positivos. Cada paso
        tiene también su propio botón, y volver a pulsar un valor ya marcado lo deja sin evaluar.
      </p>
    </div>
  )
}

// Un test: nombre, los dos botones (negativo / positivo) y la ayuda de cómo
// se hace o cuándo se considera positivo, que viene del PDF del protocolo.
function CampoTestDD({ test, valor, onChange }) {
  return (
    <div className={`dd-test ${valor ? `dd-test-${valor}` : ''}`}>
      <div className="dd-test-cabecera">
        <span className="dd-test-label">{test.label}</span>
        <div className="dd-test-botones">
          {DD_VALORES.map((op) => (
            <button
              key={op.valor}
              type="button"
              className={`dd-btn dd-btn-${op.valor} ${valor === op.valor ? 'dd-btn-activo' : ''}`}
              title={`${op.descripcion} (pulsa otra vez para dejarlo sin evaluar)`}
              onClick={() => onChange(valor === op.valor ? undefined : op.valor)}
            >
              {op.emoji} {op.label}
            </button>
          ))}
        </div>
      </div>
      {(test.ayuda || test.positivoSi) && (
        <p className="dd-test-ayuda">
          {test.ayuda && <span>{test.ayuda} </span>}
          {test.positivoSi && <span><strong>Positivo si:</strong> {test.positivoSi}</span>}
        </p>
      )}
    </div>
  )
}

// Banner con la conclusión del algoritmo (bandera roja / fuentes sin
// descartar / compatible con RCSRP). Se reutiliza en el formulario, en la
// evolución y en el historial.
function ConclusionDD({ conclusion }) {
  if (!conclusion || conclusion.estado === 'sin-datos') return null
  return (
    <div className={`dd-conclusion dd-conclusion-${conclusion.estado}`}>
      <strong>{conclusion.titulo}</strong>
      <span> {conclusion.detalle}</span>
      {conclusion.rotura?.length > 0 && (
        <span className="dd-conclusion-rotura">
          {' '}⚠️ Además hay signos de sospecha de rotura ({conclusion.rotura.map((t) => t.label).join(', ')}) — valorar derivación.
        </span>
      )}
    </div>
  )
}

function formatFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// Fila numérica genérica: label + input number + unidad opcional.
function CampoNumerico({ label, unidad, value, onChange }) {
  return (
    <label className="valoracion-campo">
      <span>{label}</span>
      <div className="valoracion-campo-input">
        <input
          type="number"
          step="any"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {unidad && <span className="valoracion-campo-unidad">{unidad}</span>}
      </div>
    </label>
  )
}

// Ejercicios de carga (rotación externa mancuerna, elevaciones laterales,
// press vertical unilateral, press militar): peso Y repeticiones reales de
// la sesión, no un RM fijo.
function CampoPesoReps({ label, value, onChange, nota }) {
  const v = value || {}
  return (
    <label className="valoracion-campo">
      <span>{label}</span>
      <div className="valoracion-campo-input" style={{ gap: 6 }}>
        <input
          type="number" step="any" placeholder="kg"
          value={v.peso ?? ''}
          onChange={(e) => onChange({ ...v, peso: e.target.value === '' ? '' : Number(e.target.value) })}
          style={{ width: 70 }}
        />
        <span className="valoracion-campo-unidad">kg</span>
        <input
          type="number" step="1" placeholder="reps"
          value={v.reps ?? ''}
          onChange={(e) => onChange({ ...v, reps: e.target.value === '' ? '' : Number(e.target.value) })}
          style={{ width: 60 }}
        />
        <span className="valoracion-campo-unidad">reps</span>
      </div>
      {nota && <span className="valoracion-referencia" style={{ display: 'block' }}>⚠️ {nota}</span>}
    </label>
  )
}

// Semáforo de movilidad (verde/amarillo/rojo), con un desplegable extra para
// los ítems que lo necesitan (dominancia cadera/rodilla en sentadillas,
// patrón lumbar en Toe Touch).
function CampoSemaforo({ label, item, value, onChange }) {
  const v = value || {}
  return (
    <div className="valoracion-campo">
      <span>{label}</span>
      <div className="semaforo-botones">
        {SEMAFORO_OPCIONES.map((op) => (
          <button
            key={op.valor}
            type="button"
            className={`semaforo-btn semaforo-${op.valor} ${v.color === op.valor ? 'semaforo-btn-activo' : ''}`}
            title={op.descripcion}
            onClick={() => onChange({ ...v, color: op.valor })}
          >
            {op.emoji} {op.label}
          </button>
        ))}
      </div>
      {item.extra === 'dominancia' && (
        <select value={v.dominancia || ''} onChange={(e) => onChange({ ...v, dominancia: e.target.value || null })}>
          <option value="">¿Dominancia?</option>
          {DOMINANCIA_OPCIONES.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
        </select>
      )}
      {item.extra === 'patronLumbar' && (
        <select value={v.patron || ''} onChange={(e) => onChange({ ...v, patron: e.target.value || null })}>
          <option value="">¿Patrón lumbar?</option>
          {PATRON_LUMBAR_OPCIONES.map((o) => <option key={o.valor} value={o.valor}>{o.label}</option>)}
        </select>
      )}
      {item.nota && <p className="valoracion-referencia" style={{ marginTop: 2 }}>ℹ️ {item.nota}</p>}
    </div>
  )
}

export default function ValoracionCliente({ cliente, valoraciones, setValoraciones, objetivosClienteFase = [], onClose }) {
  const [vista, setVista] = useState('evolucion')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expandido, setExpandido] = useState(null)
  const [formData, setFormData] = useState({ fecha: todayISO(), ...valoracionVacia() })

  const historial = valoraciones
    .filter((v) => v.clienteNombre === cliente.Nombre)
    .slice()
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))

  const historialDesc = historial.slice().reverse()

  // La fase ya no se gestiona aquí (se movió a "Fases y objetivos", propia
  // de cada cliente) — se calcula sola a partir de sus objetivos, y aquí
  // solo se muestra en modo lectura como contexto (y para la referencia de
  // fuerza por fase, más abajo).
  const objetivosDelCliente = objetivosClienteFase.filter((o) => o.clienteNombre === cliente.Nombre)
  const spadiTope = faseTopeSpadi(ultimoSpadiCliente(valoraciones, cliente.Nombre))
  const faseActual = faseAutomatica(objetivosDelCliente, spadiTope)
  const faseActualInfo = faseInfo(faseActual)

  // Evolución por bloque: para cada ítem con al menos un valor registrado,
  // primera vs última medición. Distingue 3 formas de valor: numérico simple,
  // peso+reps (ejercicios de carga) y semáforo (movilidad).
  const evolucionPorBloque = BLOQUES.map((bloque) => {
    const filas = bloque.items.map((item) => {
      if (bloque.esSemaforo) {
        const conValor = historial.filter((v) => v[bloque.id]?.[item.id]?.color)
        if (conValor.length === 0) return null
        const primero = conValor[0]
        const ultimo = conValor[conValor.length - 1]
        const colorPrimero = primero[bloque.id][item.id].color
        const colorUltimo = ultimo[bloque.id][item.id].color
        return {
          item, tipo: 'semaforo',
          colorPrimero, primeroFecha: primero.fecha,
          colorUltimo, ultimoFecha: ultimo.fecha,
          comparacion: compararSemaforo(colorPrimero, colorUltimo),
        }
      }
      if (item.pesoReps) {
        const conValor = historial.filter((v) => v[bloque.id]?.[item.id]?.peso !== undefined && v[bloque.id][item.id].peso !== '')
        if (conValor.length === 0) return null
        const primero = conValor[0]
        const ultimo = conValor[conValor.length - 1]
        const pesoPrimero = primero[bloque.id][item.id].peso
        const pesoUltimo = ultimo[bloque.id][item.id].peso
        return {
          item, tipo: 'pesoReps',
          primero: pesoPrimero, primeroReps: primero[bloque.id][item.id].reps, primeroFecha: primero.fecha,
          ultimo: pesoUltimo, ultimoReps: ultimo[bloque.id][item.id].reps, ultimoFecha: ultimo.fecha,
          pct: mejoraPct(pesoPrimero, pesoUltimo),
        }
      }
      const conValor = historial.filter((v) => v[bloque.id]?.[item.id] !== undefined && v[bloque.id][item.id] !== '')
      if (conValor.length === 0) return null
      const primero = conValor[0]
      const ultimo = conValor[conValor.length - 1]
      return {
        item, tipo: 'numero', unidad: item.unidad || '',
        primero: primero[bloque.id][item.id], primeroFecha: primero.fecha,
        ultimo: ultimo[bloque.id][item.id], ultimoFecha: ultimo.fecha,
        pct: mejoraPct(primero[bloque.id][item.id], ultimo[bloque.id][item.id]),
      }
    }).filter(Boolean)
    return { bloque, filas }
  }).filter((b) => b.filas.length > 0)

  const evolucionCuestionarios = (() => {
    const conSpadi = historial.filter((v) => spadiTotal(v.spadi) !== null)
    const conTampa = historial.filter((v) => tampaTotal(v.tampa) !== null)
    const filas = []
    if (conSpadi.length > 0) {
      const primero = spadiTotal(conSpadi[0].spadi)
      const ultimo = spadiTotal(conSpadi[conSpadi.length - 1].spadi)
      filas.push({
        label: 'SPADI (0-100, menor es mejor)', primero, primeroFecha: conSpadi[0].fecha,
        ultimo, ultimoFecha: conSpadi[conSpadi.length - 1].fecha, pct: mejoraPct(primero, ultimo), invertido: true,
      })
    }
    if (conTampa.length > 0) {
      const primero = tampaTotal(conTampa[0].tampa)
      const ultimo = tampaTotal(conTampa[conTampa.length - 1].tampa)
      filas.push({
        label: 'TAMPA (11-44, menor es mejor)', primero, primeroFecha: conTampa[0].fecha,
        ultimo, ultimoFecha: conTampa[conTampa.length - 1].fecha, pct: mejoraPct(primero, ultimo), invertido: true,
      })
    }
    return filas
  })()

  // Índices de simetría: usan la valoración más reciente que tenga ambos
  // lados rellenados. Para pares "pesoReps" compara el campo .peso de cada lado.
  const indicesSimetria = SIMETRIA_PARES.map((par) => {
    const extraer = (v, id) => {
      const raw = v[par.bloque]?.[id]
      if (raw === undefined || raw === '') return undefined
      return par.pesoReps ? raw.peso : raw
    }
    const conAmbos = historial.filter((v) => {
      const dx = extraer(v, par.dxId)
      const izq = extraer(v, par.izqId)
      return dx !== undefined && dx !== '' && izq !== undefined && izq !== ''
    })
    if (conAmbos.length === 0) return null
    const ultima = conAmbos[conAmbos.length - 1]
    const indice = indiceSimetria(extraer(ultima, par.dxId), extraer(ultima, par.izqId))
    return { par, indice, fecha: ultima.fecha }
  }).filter(Boolean)

  // No hace falta rellenar todo en una sola sesión: se puede evaluar hoy
  // una parte, guardar, y añadir el resto otro día — el historial se va
  // completando con cada valoración, y Evolución compara la primera y la
  // última medición de CADA ítem por separado, sin importar en qué fecha se
  // registró cada una. Para no acabar con dos filas del mismo día si
  // vuelves a pulsar "Nueva valoración" el mismo día, se reabre la de hoy
  // en modo edición en vez de crear una segunda.
  const openNew = () => {
    const deHoy = historial.find((v) => v.fecha === todayISO())
    if (deHoy) {
      openEdit(deHoy)
      return
    }
    setEditingId(null)
    // Las preferencias de entrenamiento (días, material, gustos) casi nunca
    // cambian de una valoración a otra, así que se arrastran automáticamente
    // de la última — el técnico solo las edita si algo ha cambiado.
    const anterior = historialDesc[0]
    setFormData({
      fecha: todayISO(),
      ...valoracionVacia(),
      notasPreferenciasEntrenamiento: anterior?.notasPreferenciasEntrenamiento || '',
    })
    setShowForm(true)
  }

  const openEdit = (valoracion) => {
    const base = { fecha: valoracion.fecha, ...valoracionVacia() }
    BLOQUES.forEach((b) => { base[b.id] = valoracion[b.id] || {} })
    base.spadi = valoracion.spadi || {}
    base.tampa = valoracion.tampa || {}
    base.notasDolor = valoracion.notasDolor || ''
    base.notasEvaluacionInicial = valoracion.notasEvaluacionInicial || ''
    base.notasPreferenciasEntrenamiento = valoracion.notasPreferenciasEntrenamiento || ''
    base.notasMovilidad = valoracion.notasMovilidad || ''
    base.notasFuerza = valoracion.notasFuerza || ''
    base.dolorEnDeporte = valoracion.dolorEnDeporte ?? null
    base.fase = valoracion.fase ?? null
    base.objetivo = valoracion.objetivo || ''
    base.objetivoAnteriorConfirmado = valoracion.objetivoAnteriorConfirmado || false
    base.objetivosSeleccionados = valoracion.objetivosSeleccionados || []
    base.objetivosCumplidos = valoracion.objetivosCumplidos || []
    setEditingId(valoracion.id)
    setFormData(base)
    setShowForm(true)
  }

  const eliminar = (id) => {
    if (typeof setValoraciones !== 'function') return
    setValoraciones((prev) => prev.filter((v) => v.id !== id))
    deleteValoracionRemote(id)
  }

  const setCampo = (bloqueId, itemId, valor) => {
    setFormData((prev) => ({ ...prev, [bloqueId]: { ...prev[bloqueId], [itemId]: valor } }))
  }

  // Diagnóstico diferencial: un nivel más de anidamiento que el resto de
  // bloques (paso → test → valor), por eso tiene su propio setter. Poner el
  // valor a undefined vuelve a dejar el test "sin evaluar".
  const setTestDD = (pasoId, testId, valor) => {
    setFormData((prev) => {
      const dd = prev.diagnosticoDiferencial || {}
      const paso = { ...(dd[pasoId] || {}) }
      if (valor === undefined) delete paso[testId]
      else paso[testId] = valor
      return { ...prev, diagnosticoDiferencial: { ...dd, [pasoId]: paso } }
    })
  }

  const ddForm = formData.diagnosticoDiferencial || {}
  const ddConclusionForm = ddConclusion(ddForm)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (typeof setValoraciones !== 'function') return
    if (editingId) {
      const patch = { ...formData, clienteNombre: cliente.Nombre }
      setValoraciones((prev) => prev.map((v) => (v.id === editingId ? { ...v, ...patch } : v)))
      updateValoracionRemote(editingId, patch)
    } else {
      const nueva = { id: `val-${Date.now()}`, clienteNombre: cliente.Nombre, ...formData }
      setValoraciones((prev) => [...prev, nueva])
      insertValoracionRemote(nueva)
    }
    setShowForm(false)
    setEditingId(null)
  }

  const spadiTotalForm = spadiTotal(formData.spadi)
  const tampaTotalForm = tampaTotal(formData.tampa)

  return (
    <div className="client-modal-overlay" onClick={onClose}>
      <div className="client-modal seguimiento-modal valoracion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div>
            <div className="card-title">Valoración funcional — {cliente.Nombre}</div>
            <div className="card-subtitle">{historial.length} evaluació{historial.length === 1 ? 'n' : 'nes'} registrada{historial.length === 1 ? '' : 's'}</div>
          </div>
          {cliente.Drive && (
            <a
              href={cliente.Drive}
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-action"
              style={{ marginRight: 8 }}
            >
              📁 Abrir Drive
            </a>
          )}
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="valoracion-fase-banner">
          📍 <strong>Fase actual: {faseActual}</strong> — {faseActualInfo?.criterio}
          <span style={{ color: 'var(--color-text-secondary)' }}> (gestiona los objetivos en "Fases y objetivos")</span>
        </div>

        <div className="tabs-bar">
          <button type="button" className={`tab-btn ${vista === 'evolucion' ? 'tab-btn-active' : ''}`} onClick={() => setVista('evolucion')}>Evolución</button>
          <button type="button" className={`tab-btn ${vista === 'historial' ? 'tab-btn-active' : ''}`} onClick={() => setVista('historial')}>Historial</button>
          <button type="button" className="primary-action" style={{ marginLeft: 'auto' }} onClick={openNew}>＋ Nueva valoración</button>
        </div>

        {vista === 'evolucion' && (
          <div className="valoracion-evolucion">
            {historial.length === 0 && <p className="lead-log-empty">Todavía no hay valoraciones registradas para este cliente.</p>}

            {/* Diagnóstico diferencial de la valoración MÁS RECIENTE que
                tenga algo evaluado: es la foto de "qué es este hombro" y
                conviene verla nada más abrir, antes que los números. */}
            {(() => {
              const conDD = historialDesc.find((v) => ddConclusion(v.diagnosticoDiferencial).estado !== 'sin-datos')
              if (!conDD) return null
              const conclusion = ddConclusion(conDD.diagnosticoDiferencial)
              return (
                <>
                  <h4 className="team-activity-subtitle">Diagnóstico diferencial ({formatFecha(conDD.fecha)})</h4>
                  <ConclusionDD conclusion={conclusion} />
                  <div className="dd-resumen-pasos">
                    {DD_PASOS.map((paso) => {
                      const r = ddResumenPaso(conDD.diagnosticoDiferencial, paso)
                      if (r.evaluados === 0) return null
                      return (
                        <div key={paso.id} className="dd-resumen-paso">
                          <span>{paso.label}</span>
                          <span className={r.positivos.length > 0 ? 'valoracion-simetria-baja' : 'valoracion-mejora-positiva'}>
                            {r.positivos.length > 0 ? `🔴 ${r.positivos.map((t) => t.label).join(', ')}` : '✅ sin hallazgos'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </>
              )
            })()}

            {evolucionCuestionarios.length > 0 && (
              <>
                <h4 className="team-activity-subtitle">Cuestionarios</h4>
                <div className="valoracion-evolucion-table">
                  {evolucionCuestionarios.map((fila) => (
                    <div className="valoracion-evolucion-row" key={fila.label}>
                      <span>{fila.label}</span>
                      <span>{fila.primero} ({formatFecha(fila.primeroFecha)})</span>
                      <span>{fila.ultimo} ({formatFecha(fila.ultimoFecha)})</span>
                      <span className={fila.pct != null && fila.pct <= 0 ? 'valoracion-mejora-positiva' : ''}>{fila.pct != null ? `${fila.pct}%` : '—'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {indicesSimetria.length > 0 && (
              <>
                <h4 className="team-activity-subtitle">Índices de simetría (última medición, sano &gt;90%)</h4>
                <div className="valoracion-evolucion-table">
                  {indicesSimetria.map(({ par, indice, fecha }) => (
                    <div className="valoracion-evolucion-row valoracion-simetria-row" key={par.label}>
                      <span>{par.label}</span>
                      <span>{formatFecha(fecha)}</span>
                      <span className={indice >= 90 ? 'valoracion-mejora-positiva' : 'valoracion-simetria-baja'}>{indice}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {evolucionPorBloque.map(({ bloque, filas }) => (
              <div key={bloque.id}>
                <h4 className="team-activity-subtitle">{bloque.label}</h4>
                {bloque.nota && <p className="valoracion-referencia" style={{ marginBottom: 6 }}>ℹ️ {bloque.nota}</p>}
                <div className="valoracion-evolucion-table">
                  <div className="valoracion-evolucion-row valoracion-evolucion-header">
                    <span>Ítem</span><span>Primera</span><span>Última</span><span>Evolución</span>
                  </div>
                  {filas.map((fila) => (
                    <div className="valoracion-evolucion-row" key={fila.item.id}>
                      <span>{fila.item.label}</span>
                      {fila.tipo === 'semaforo' && (
                        <>
                          <span>{semaforoInfo(fila.colorPrimero)?.emoji} ({formatFecha(fila.primeroFecha)})</span>
                          <span>{semaforoInfo(fila.colorUltimo)?.emoji} ({formatFecha(fila.ultimoFecha)})</span>
                          <span className={fila.comparacion === 'mejora' ? 'valoracion-mejora-positiva' : fila.comparacion === 'empeora' ? 'valoracion-simetria-baja' : ''}>
                            {fila.comparacion === 'mejora' ? '↑ mejora' : fila.comparacion === 'empeora' ? '↓ empeora' : fila.comparacion === 'igual' ? '= igual' : '—'}
                          </span>
                        </>
                      )}
                      {fila.tipo === 'pesoReps' && (
                        <>
                          <span>{fila.primero}kg×{fila.primeroReps ?? '—'} ({formatFecha(fila.primeroFecha)})</span>
                          <span>{fila.ultimo}kg×{fila.ultimoReps ?? '—'} ({formatFecha(fila.ultimoFecha)})</span>
                          <span className={fila.pct != null && fila.pct >= 0 ? 'valoracion-mejora-positiva' : ''}>{fila.pct != null ? `${fila.pct}%` : '—'}</span>
                        </>
                      )}
                      {fila.tipo === 'numero' && (
                        <>
                          <span>{fila.primero}{fila.unidad} ({formatFecha(fila.primeroFecha)})</span>
                          <span>{fila.ultimo}{fila.unidad} ({formatFecha(fila.ultimoFecha)})</span>
                          <span className={fila.pct != null && fila.pct >= 0 ? 'valoracion-mejora-positiva' : ''}>{fila.pct != null ? `${fila.pct}%` : '—'}</span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {vista === 'historial' && (
          <div className="valoracion-historial">
            {historialDesc.length === 0 && <p className="lead-log-empty">Todavía no hay valoraciones registradas.</p>}
            <ul className="lead-log-list">
              {historialDesc.map((v) => {
                const sTotal = spadiTotal(v.spadi)
                const tTotal = tampaTotal(v.tampa)
                return (
                  <li key={v.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        className="row-action-btn"
                        style={{ fontWeight: 600, border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                        onClick={() => setExpandido((prev) => (prev === v.id ? null : v.id))}
                      >
                        {expandido === v.id ? '▾' : '▸'} {formatFecha(v.fecha)}
                        {sTotal != null && ` · SPADI ${sTotal}`}
                        {tTotal != null && ` · TAMPA ${tTotal}`}
                      </button>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button type="button" className="row-action-btn" onClick={() => openEdit(v)}>Editar</button>
                        <button type="button" className="row-action-btn" onClick={() => eliminar(v.id)}>Eliminar</button>
                      </div>
                    </div>
                    {expandido === v.id && (
                      <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--color-text-secondary)' }}>
                        {BLOQUES.map((bloque) => bloque.items.map((it) => {
                          const val = v[bloque.id]?.[it.id]
                          if (val === undefined || val === null || val === '') return null
                          if (bloque.esSemaforo) {
                            if (!val.color) return null
                            const info = semaforoInfo(val.color)
                            return (
                              <div key={it.id}>
                                {it.label}: <strong>{info?.emoji} {info?.label}</strong>
                                {val.dominancia && ` · ${DOMINANCIA_OPCIONES.find((d) => d.valor === val.dominancia)?.label}`}
                                {val.patron && ` · ${PATRON_LUMBAR_OPCIONES.find((p) => p.valor === val.patron)?.label}`}
                              </div>
                            )
                          }
                          if (it.pesoReps) {
                            if (val.peso === undefined || val.peso === '') return null
                            return <div key={it.id}>{it.label}: <strong>{val.peso}kg × {val.reps ?? '—'} reps</strong></div>
                          }
                          return <div key={it.id}>{it.label}: <strong>{val}{it.unidad || ''}</strong></div>
                        }))}
                        {(() => {
                          const c = ddConclusion(v.diagnosticoDiferencial)
                          if (c.estado === 'sin-datos') return null
                          return (
                            <div style={{ marginTop: 8 }}>
                              <ConclusionDD conclusion={c} />
                              {DD_PASOS.map((paso) => {
                                const r = ddResumenPaso(v.diagnosticoDiferencial, paso)
                                if (r.positivos.length === 0) return null
                                return (
                                  <div key={paso.id}>
                                    {paso.label}: <strong>🔴 {r.positivos.map((t) => t.label).join(', ')}</strong>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}
                        {v.notasMovilidad && <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>🤸 Movilidad: {v.notasMovilidad}</p>}
                        {v.notasFuerza && <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>💪 Fuerza: {v.notasFuerza}</p>}
                        {v.notasDolor && <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>🩹 Dolor: {v.notasDolor}</p>}
                        {v.notasEvaluacionInicial && <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>📝 Evaluación inicial: {v.notasEvaluacionInicial}</p>}
                        {v.notasPreferenciasEntrenamiento && <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>🗓️ Preferencias: {v.notasPreferenciasEntrenamiento}</p>}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {showForm && (
        <div className="client-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="client-modal valoracion-form-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{editingId ? 'Editar valoración' : 'Nueva valoración'} — {cliente.Nombre}</div>
                <div className="card-subtitle">Rellena solo los ítems que hayas medido en esta sesión</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <form className="modal-form valoracion-form" onSubmit={handleSubmit}>
              <label className="valoracion-campo">
                <span>Fecha</span>
                <input type="date" required value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} />
              </label>

              {/* Diagnóstico diferencial: va el primero porque es lo que se
                  hace antes de nada — decide si el cuadro es RCSRP o si hay
                  que descartar/derivar antes de ponerse a medir fuerza. */}
              <h4 className="team-activity-subtitle">Valoración clínica de hombro — diagnóstico diferencial</h4>
              <LeyendaDiagnosticoDiferencial />

              <div className="dd-acciones-globales">
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => setFormData((prev) => ({ ...prev, diagnosticoDiferencial: ddMarcarTodoNegativo() }))}
                >
                  ✅ Marcar todo como negativo
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setFormData((prev) => ({ ...prev, diagnosticoDiferencial: {} }))}
                >
                  ↺ Vaciar todo
                </button>
              </div>

              <ConclusionDD conclusion={ddConclusionForm} />

              {DD_PASOS.map((paso) => {
                const resumen = ddResumenPaso(ddForm, paso)
                return (
                  <div key={paso.id} className={`dd-paso dd-paso-${paso.tipo}`}>
                    <div className="dd-paso-cabecera">
                      <div>
                        <div className="dd-paso-titulo">
                          {paso.orden ? `${paso.orden}. ` : ''}{paso.label}
                          {resumen.positivos.length > 0 && (
                            <span className="dd-paso-badge dd-paso-badge-positivo">{resumen.positivos.length} positivo{resumen.positivos.length === 1 ? '' : 's'}</span>
                          )}
                          {resumen.limpio && <span className="dd-paso-badge dd-paso-badge-limpio">descartado</span>}
                        </div>
                        <div className="dd-paso-pregunta">{paso.pregunta}</div>
                      </div>
                      <div className="dd-paso-acciones">
                        <span className="dd-paso-progreso">{resumen.evaluados}/{resumen.total}</span>
                        <button
                          type="button"
                          className="secondary-action"
                          title="Marcar todos los test de este paso como negativos"
                          onClick={() => setFormData((prev) => ({ ...prev, diagnosticoDiferencial: ddMarcarPasoNegativo(prev.diagnosticoDiferencial, paso.id) }))}
                        >
                          ✅ Todo negativo
                        </button>
                        <button
                          type="button"
                          className="secondary-action"
                          title="Dejar este paso sin evaluar"
                          onClick={() => setFormData((prev) => ({ ...prev, diagnosticoDiferencial: ddLimpiar(prev.diagnosticoDiferencial, paso.id) }))}
                        >
                          ↺
                        </button>
                      </div>
                    </div>

                    {paso.nota && <p className="valoracion-referencia" style={{ margin: '0 0 8px' }}>ℹ️ {paso.nota}</p>}

                    <div className="dd-tests">
                      {paso.tests.map((test) => (
                        <CampoTestDD
                          key={test.id}
                          test={test}
                          valor={ddForm[paso.id]?.[test.id]}
                          onChange={(v) => setTestDD(paso.id, test.id, v)}
                        />
                      ))}
                    </div>

                    {resumen.positivos.length > 0 && (
                      <p className={`dd-paso-sipositivo dd-paso-sipositivo-${paso.tipo}`}>➡️ {paso.siPositivo}</p>
                    )}
                  </div>
                )
              })}

              {BLOQUES.map((bloque, idx) => (
                <div key={bloque.id}>
                  {bloque.esSemaforo && !BLOQUES.slice(0, idx).some((b) => b.esSemaforo) && <LeyendaSemaforo />}
                  <h4 className="team-activity-subtitle">{bloque.label}</h4>
                  {bloque.nota && <p className="valoracion-referencia" style={{ marginBottom: 6 }}>ℹ️ {bloque.nota}</p>}
                  <div className="valoracion-grid">
                    {bloque.items.map((item) => (
                      <div key={item.id}>
                        {bloque.esSemaforo ? (
                          <CampoSemaforo
                            label={item.label}
                            item={item}
                            value={formData[bloque.id]?.[item.id]}
                            onChange={(v) => setCampo(bloque.id, item.id, v)}
                          />
                        ) : item.pesoReps ? (
                          <CampoPesoReps
                            label={item.label}
                            value={formData[bloque.id]?.[item.id]}
                            onChange={(v) => setCampo(bloque.id, item.id, v)}
                            nota={[
                              item.nota,
                              faseActual && REFERENCIA_FUERZA_POR_FASE[item.id]?.[faseActual]
                                ? `Referencia para Fase ${faseActual}: ${REFERENCIA_FUERZA_POR_FASE[item.id][faseActual]}`
                                : null,
                            ].filter(Boolean).join(' ')}
                          />
                        ) : (
                          <CampoNumerico
                            label={item.label}
                            unidad={item.unidad || ''}
                            value={formData[bloque.id]?.[item.id]}
                            onChange={(v) => setCampo(bloque.id, item.id, v)}
                          />
                        )}
                        {bloque.referencia?.[item.id] && (
                          <span className="valoracion-referencia">Ref: {bloque.referencia[item.id].mujeres} (mujeres) / {bloque.referencia[item.id].hombres} (hombres)</span>
                        )}
                      </div>
                    ))}
                  </div>
                  {bloque.id === 'fuerza' && (
                    <label className="valoracion-campo" style={{ marginTop: 8 }}>
                      <span>Comentario extra de la evaluación de fuerza (opcional)</span>
                      <textarea
                        rows={2}
                        value={formData.notasFuerza}
                        onChange={(e) => setFormData({ ...formData, notasFuerza: e.target.value })}
                        placeholder="Cualquier cosa que detectes durante esta parte y no encaje en un ítem concreto..."
                      />
                    </label>
                  )}
                  {bloque.id === 'movilidadGeneral' && (
                    <label className="valoracion-campo" style={{ marginTop: 8 }}>
                      <span>Comentario extra de la evaluación de movilidad (opcional)</span>
                      <textarea
                        rows={2}
                        value={formData.notasMovilidad}
                        onChange={(e) => setFormData({ ...formData, notasMovilidad: e.target.value })}
                        placeholder="Ej: cabeza adelantada, hombro adelantado, escoliosis visible..."
                      />
                    </label>
                  )}
                </div>
              ))}

              <h4 className="team-activity-subtitle">SPADI (0-10 cada ítem) · <a href={SPADI_ENLACE} target="_blank" rel="noopener noreferrer">ver cuestionario</a></h4>
              <div className="valoracion-cuestionario-grid">
                {SPADI_ITEMS.map((n) => (
                  <label key={n} className="valoracion-item-mini">
                    <span>{n}</span>
                    <input type="number" min="0" max="10" step="1" value={formData.spadi[n] ?? ''} onChange={(e) => setCampo('spadi', n, e.target.value === '' ? '' : Number(e.target.value))} />
                  </label>
                ))}
              </div>
              <p className="valoracion-total-live">Total SPADI: <strong>{spadiTotalForm != null ? `${spadiTotalForm} / 100` : 'Sin datos'}</strong></p>

              <h4 className="team-activity-subtitle">TAMPA — kinesiofobia (1-4 cada ítem)</h4>
              <div className="valoracion-cuestionario-grid">
                {TAMPA_ITEMS.map((n) => (
                  <label key={n} className="valoracion-item-mini">
                    <span>{n}</span>
                    <input type="number" min="1" max="4" step="1" value={formData.tampa[n] ?? ''} onChange={(e) => setCampo('tampa', n, e.target.value === '' ? '' : Number(e.target.value))} />
                  </label>
                ))}
              </div>
              <p className="valoracion-total-live">Total TAMPA: <strong>{tampaTotalForm != null ? `${tampaTotalForm} / 44` : 'Sin datos'}</strong></p>
              <p className="valoracion-interpretacion">{TAMPA_INTERPRETACION}</p>

              <label className="valoracion-campo" style={{ marginTop: 8 }}>
                <span>Notas de evaluación del dolor</span>
                <textarea
                  rows={3}
                  value={formData.notasDolor}
                  onChange={(e) => setFormData({ ...formData, notasDolor: e.target.value })}
                  placeholder="Pega aquí lo relevante del formulario externo de dolor..."
                />
              </label>

              <label className="valoracion-campo">
                <span>Notas de evaluación inicial</span>
                <textarea
                  rows={3}
                  value={formData.notasEvaluacionInicial}
                  onChange={(e) => setFormData({ ...formData, notasEvaluacionInicial: e.target.value })}
                  placeholder="Observaciones de la evaluación inicial..."
                />
              </label>

              <label className="valoracion-campo">
                <span>Preferencias de entrenamiento</span>
                <textarea
                  rows={3}
                  value={formData.notasPreferenciasEntrenamiento}
                  onChange={(e) => setFormData({ ...formData, notasPreferenciasEntrenamiento: e.target.value })}
                  placeholder="Días disponibles, material del que dispone, gustos con los ejercicios..."
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar valoración</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

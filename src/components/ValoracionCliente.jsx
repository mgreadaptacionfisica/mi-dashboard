import { useState } from 'react'
import {
  BLOQUES,
  SIMETRIA_PARES,
  SPADI_ITEMS,
  SPADI_ENLACE,
  TAMPA_ITEMS,
  TAMPA_INTERPRETACION,
  FASES,
  SEMAFORO_OPCIONES,
  DOMINANCIA_OPCIONES,
  PATRON_LUMBAR_OPCIONES,
  valoracionVacia,
  spadiTotal,
  tampaTotal,
  mejoraPct,
  indiceSimetria,
  calcularFaseSugerida,
  faseInfo,
  semaforoInfo,
  compararSemaforo,
  objetivoCombinado,
} from '../utils/valoracionHelpers'
import { insertValoracionRemote, updateValoracionRemote, deleteValoracionRemote } from '../lib/queries/valoracionesClientes'
import { insertObjetivoFaseRemote, updateObjetivoFaseRemote, deleteObjetivoFaseRemote } from '../lib/queries/objetivosFase'

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
    </div>
  )
}

export default function ValoracionCliente({ cliente, valoraciones, setValoraciones, objetivosFase = [], setObjetivosFase, esAdmin = false, onClose }) {
  const [vista, setVista] = useState('evolucion')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expandido, setExpandido] = useState(null)
  const [formData, setFormData] = useState({ fecha: todayISO(), ...valoracionVacia() })
  const [gestionandoCatalogo, setGestionandoCatalogo] = useState(false)
  const [nuevoObjetivoPorFase, setNuevoObjetivoPorFase] = useState({})
  const [editandoObjetivoId, setEditandoObjetivoId] = useState(null)
  const [editandoObjetivoTexto, setEditandoObjetivoTexto] = useState('')

  const historial = valoraciones
    .filter((v) => v.clienteNombre === cliente.Nombre)
    .slice()
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))

  const historialDesc = historial.slice().reverse()

  // Fase/objetivo vigente: la valoración confirmada con fase más reciente
  // (no necesariamente la última valoración en fecha, si esa última todavía
  // no tiene fase confirmada).
  const faseVigente = historialDesc.find((v) => v.fase)

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

  const openNew = () => {
    setEditingId(null)
    setFormData({ fecha: todayISO(), ...valoracionVacia() })
    setShowForm(true)
  }

  const openEdit = (valoracion) => {
    const base = { fecha: valoracion.fecha, ...valoracionVacia() }
    BLOQUES.forEach((b) => { base[b.id] = valoracion[b.id] || {} })
    base.spadi = valoracion.spadi || {}
    base.tampa = valoracion.tampa || {}
    base.notasDolor = valoracion.notasDolor || ''
    base.notasEvaluacionInicial = valoracion.notasEvaluacionInicial || ''
    base.dolorEnDeporte = valoracion.dolorEnDeporte ?? null
    base.fase = valoracion.fase ?? null
    base.objetivo = valoracion.objetivo || ''
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

  const toggleObjetivoSeleccionado = (id) => {
    setFormData((prev) => {
      const actuales = prev.objetivosSeleccionados || []
      const yaEsta = actuales.includes(id)
      return { ...prev, objetivosSeleccionados: yaEsta ? actuales.filter((x) => x !== id) : [...actuales, id] }
    })
  }

  // Marca (o desmarca) si un objetivo de la valoración ANTERIOR se cumplió
  // de verdad, al hacer esta valoración nueva. Es lo que permite comprobar
  // si tocaba subir de fase o no — ver el aviso más abajo en el formulario.
  const toggleObjetivoCumplido = (id) => {
    setFormData((prev) => {
      const actuales = prev.objetivosCumplidos || []
      const yaEsta = actuales.includes(id)
      return { ...prev, objetivosCumplidos: yaEsta ? actuales.filter((x) => x !== id) : [...actuales, id] }
    })
  }

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

  // Gestión del catálogo de objetivos por fase (solo admin, ver botón
  // "⚙️ Gestionar catálogo" más abajo).
  const agregarObjetivoCatalogo = (faseNumero) => {
    const texto = (nuevoObjetivoPorFase[faseNumero] || '').trim()
    if (typeof setObjetivosFase !== 'function' || !texto) return
    const ordenActual = objetivosFase.filter((o) => o.fase === faseNumero).length
    const nuevo = { id: `obj-${Date.now()}`, fase: faseNumero, texto, orden: ordenActual + 1 }
    setObjetivosFase((prev) => [...prev, nuevo])
    insertObjetivoFaseRemote(nuevo)
    setNuevoObjetivoPorFase((prev) => ({ ...prev, [faseNumero]: '' }))
  }

  const editarObjetivoCatalogo = (id) => {
    if (typeof setObjetivosFase !== 'function' || !editandoObjetivoTexto.trim()) return
    const texto = editandoObjetivoTexto.trim()
    setObjetivosFase((prev) => prev.map((o) => (o.id === id ? { ...o, texto } : o)))
    updateObjetivoFaseRemote(id, { texto })
    setEditandoObjetivoId(null)
    setEditandoObjetivoTexto('')
  }

  const eliminarObjetivoCatalogo = (id) => {
    if (typeof setObjetivosFase !== 'function') return
    setObjetivosFase((prev) => prev.filter((o) => o.id !== id))
    deleteObjetivoFaseRemote(id)
    setFormData((prev) => ({ ...prev, objetivosSeleccionados: (prev.objetivosSeleccionados || []).filter((x) => x !== id) }))
  }

  const spadiTotalForm = spadiTotal(formData.spadi)
  const tampaTotalForm = tampaTotal(formData.tampa)
  const faseSugeridaForm = calcularFaseSugerida(spadiTotalForm, formData.dolorEnDeporte)
  const faseSugeridaInfo = faseInfo(faseSugeridaForm)
  const faseConfirmadaInfo = faseInfo(formData.fase)
  const faseParaCatalogo = formData.fase || faseSugeridaForm
  const objetivosDeFaseActual = objetivosFase
    .filter((o) => o.fase === faseParaCatalogo)
    .sort((a, b) => (a.orden || 0) - (b.orden || 0))

  // Objetivos de la valoración anterior (excluyendo la que se está editando,
  // si aplica) — se revisan aquí para marcar cuáles se cumplieron de verdad
  // antes de decidir si toca subir de fase.
  const valoracionAnterior = historialDesc.filter((v) => v.id !== editingId)[0] || null
  const objetivosAnterior = valoracionAnterior?.objetivosSeleccionados?.length
    ? objetivosFase.filter((o) => valoracionAnterior.objetivosSeleccionados.includes(o.id))
    : []
  const subiendoFase = Boolean(valoracionAnterior?.fase && formData.fase && formData.fase > valoracionAnterior.fase)
  const objetivosAnteriorSinMarcar = objetivosAnterior.filter((o) => !(formData.objetivosCumplidos || []).includes(o.id))
  const avisoSubidaFase = subiendoFase && objetivosAnteriorSinMarcar.length > 0

  return (
    <div className="client-modal-overlay" onClick={onClose}>
      <div className="client-modal seguimiento-modal valoracion-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div>
            <div className="card-title">Valoración funcional — {cliente.Nombre}</div>
            <div className="card-subtitle">{historial.length} evaluació{historial.length === 1 ? 'n' : 'nes'} registrada{historial.length === 1 ? '' : 's'}</div>
          </div>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="valoracion-fase-banner">
          {faseVigente ? (
            <>
              📍 <strong>Fase {faseVigente.fase}</strong> — {faseInfo(faseVigente.fase)?.criterio}
              {objetivoCombinado(faseVigente, objetivosFase) && <> · Objetivo: {objetivoCombinado(faseVigente, objetivosFase)}</>}
              <span style={{ color: 'var(--color-text-secondary)' }}> (desde {formatFecha(faseVigente.fecha)})</span>
            </>
          ) : (
            <span style={{ color: 'var(--color-text-secondary)' }}>Todavía no hay una fase confirmada para este cliente — se establece al guardar una valoración.</span>
          )}
        </div>

        <div className="tabs-bar">
          <button type="button" className={`tab-btn ${vista === 'evolucion' ? 'tab-btn-active' : ''}`} onClick={() => setVista('evolucion')}>Evolución</button>
          <button type="button" className={`tab-btn ${vista === 'historial' ? 'tab-btn-active' : ''}`} onClick={() => setVista('historial')}>Historial</button>
          <button type="button" className="primary-action" style={{ marginLeft: 'auto' }} onClick={openNew}>＋ Nueva valoración</button>
        </div>

        {vista === 'evolucion' && (
          <div className="valoracion-evolucion">
            {historial.length === 0 && <p className="lead-log-empty">Todavía no hay valoraciones registradas para este cliente.</p>}

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
                        {v.fase && ` · Fase ${v.fase}`}
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
                        {v.fase && <p style={{ marginTop: 6 }}>📍 Fase {v.fase}{objetivoCombinado(v, objetivosFase) ? ` — ${objetivoCombinado(v, objetivosFase)}` : ''}</p>}
                        {v.objetivosCumplidos?.length > 0 && (
                          <p style={{ marginTop: 6 }}>
                            ✅ Cumplidos de la fase anterior: {v.objetivosCumplidos.map((id) => objetivosFase.find((o) => o.id === id)?.texto).filter(Boolean).join(' · ')}
                          </p>
                        )}
                        {v.notasDolor && <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>🩹 Dolor: {v.notasDolor}</p>}
                        {v.notasEvaluacionInicial && <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>📝 Evaluación inicial: {v.notasEvaluacionInicial}</p>}
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

              {BLOQUES.map((bloque, idx) => (
                <div key={bloque.id}>
                  {bloque.esSemaforo && !BLOQUES.slice(0, idx).some((b) => b.esSemaforo) && <LeyendaSemaforo />}
                  <h4 className="team-activity-subtitle">{bloque.label}</h4>
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
                            nota={item.nota}
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

              <h4 className="team-activity-subtitle">Fase y objetivo</h4>

              {objetivosAnterior.length > 0 && (
                <div className="valoracion-campo">
                  <span>Objetivos marcados en la valoración anterior (Fase {valoracionAnterior.fase || '—'}) — ¿se cumplieron?</span>
                  <div className="valoracion-objetivos-catalogo">
                    {objetivosAnterior.map((o) => (
                      <label key={o.id} className="valoracion-objetivo-checkbox">
                        <input
                          type="checkbox"
                          checked={(formData.objetivosCumplidos || []).includes(o.id)}
                          onChange={() => toggleObjetivoCumplido(o.id)}
                        />
                        <span>{o.texto}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {spadiTotalForm === 0 && (
                <label className="valoracion-campo">
                  <span>¿Dolor en gestos de su deporte?</span>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="radio" name="dolorEnDeporte" checked={formData.dolorEnDeporte === true} onChange={() => setFormData({ ...formData, dolorEnDeporte: true })} /> Sí
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="radio" name="dolorEnDeporte" checked={formData.dolorEnDeporte === false} onChange={() => setFormData({ ...formData, dolorEnDeporte: false })} /> No
                    </label>
                  </div>
                </label>
              )}

              <p className="valoracion-total-live">
                Fase sugerida: <strong>{faseSugeridaForm ? `Fase ${faseSugeridaForm}` : 'Sin datos suficientes'}</strong>
                {faseSugeridaInfo && <span style={{ fontWeight: 400 }}> — {faseSugeridaInfo.criterio}</span>}
              </p>

              <label className="valoracion-campo">
                <span>Fase confirmada</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={formData.fase ?? ''}
                    onChange={(e) => setFormData({ ...formData, fase: e.target.value === '' ? null : Number(e.target.value) })}
                  >
                    <option value="">Sin definir</option>
                    {FASES.map((f) => (
                      <option key={f.numero} value={f.numero}>{f.titulo}</option>
                    ))}
                  </select>
                  {faseSugeridaForm && formData.fase !== faseSugeridaForm && (
                    <button type="button" className="row-action-btn" onClick={() => setFormData({ ...formData, fase: faseSugeridaForm })}>
                      Usar sugerida (Fase {faseSugeridaForm})
                    </button>
                  )}
                </div>
              </label>

              {avisoSubidaFase && (
                <p className="valoracion-aviso-fase">
                  ⚠️ Vas a subir de Fase {valoracionAnterior.fase} a Fase {formData.fase}, pero hay {objetivosAnteriorSinMarcar.length} objetivo{objetivosAnteriorSinMarcar.length === 1 ? '' : 's'} de la fase anterior sin marcar como cumplido{objetivosAnteriorSinMarcar.length === 1 ? '' : 's'} (arriba). Confirma que realmente toca subir antes de guardar.
                </p>
              )}

              <div className="valoracion-campo">
                <span>Objetivos para esta fase{faseParaCatalogo ? ` (Fase ${faseParaCatalogo})` : ''}</span>
                {faseParaCatalogo ? (
                  <div className="valoracion-objetivos-catalogo">
                    {objetivosDeFaseActual.length === 0 && (
                      <p className="lead-log-empty" style={{ margin: '4px 0' }}>Todavía no hay objetivos guardados para la Fase {faseParaCatalogo}.</p>
                    )}
                    {objetivosDeFaseActual.map((o) => (
                      <label key={o.id} className="valoracion-objetivo-checkbox">
                        <input
                          type="checkbox"
                          checked={(formData.objetivosSeleccionados || []).includes(o.id)}
                          onChange={() => toggleObjetivoSeleccionado(o.id)}
                        />
                        <span>{o.texto}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="lead-log-empty" style={{ margin: '4px 0' }}>Confirma o deja que se sugiera una fase para ver su catálogo de objetivos.</p>
                )}
              </div>

              <label className="valoracion-campo">
                <span>Objetivo adicional (texto libre)</span>
                <textarea
                  rows={2}
                  value={formData.objetivo}
                  onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                  placeholder={faseConfirmadaInfo?.objetivoEjemplo || faseSugeridaInfo?.objetivoEjemplo || 'Objetivo concreto para esta fase...'}
                />
              </label>

              {esAdmin && (
                <div className="valoracion-catalogo-admin">
                  <button type="button" className="row-action-btn" onClick={() => setGestionandoCatalogo((v) => !v)}>
                    {gestionandoCatalogo ? 'Ocultar gestión del catálogo' : '⚙️ Gestionar catálogo de objetivos'}
                  </button>
                  {gestionandoCatalogo && (
                    <div className="valoracion-catalogo-editor">
                      {FASES.map((f) => (
                        <div key={f.numero} className="valoracion-catalogo-fase">
                          <strong>Fase {f.numero}</strong>
                          <ul>
                            {objetivosFase.filter((o) => o.fase === f.numero).sort((a, b) => (a.orden || 0) - (b.orden || 0)).map((o) => (
                              <li key={o.id}>
                                {editandoObjetivoId === o.id ? (
                                  <>
                                    <input type="text" value={editandoObjetivoTexto} onChange={(e) => setEditandoObjetivoTexto(e.target.value)} style={{ width: '65%' }} />
                                    <button type="button" className="row-action-btn" onClick={() => editarObjetivoCatalogo(o.id)}>Guardar</button>
                                    <button type="button" className="row-action-btn" onClick={() => setEditandoObjetivoId(null)}>Cancelar</button>
                                  </>
                                ) : (
                                  <>
                                    <span>{o.texto}</span>
                                    <button type="button" className="row-action-btn" onClick={() => { setEditandoObjetivoId(o.id); setEditandoObjetivoTexto(o.texto) }}>Editar</button>
                                    <button type="button" className="row-action-btn" onClick={() => eliminarObjetivoCatalogo(o.id)}>Eliminar</button>
                                  </>
                                )}
                              </li>
                            ))}
                          </ul>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input
                              type="text"
                              placeholder={`Nuevo objetivo para Fase ${f.numero}...`}
                              value={nuevoObjetivoPorFase[f.numero] || ''}
                              onChange={(e) => setNuevoObjetivoPorFase((prev) => ({ ...prev, [f.numero]: e.target.value }))}
                              style={{ flex: 1 }}
                            />
                            <button type="button" className="row-action-btn" onClick={() => agregarObjetivoCatalogo(f.numero)}>Añadir</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

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

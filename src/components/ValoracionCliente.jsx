import { useMemo, useState } from 'react'
import {
  BLOQUES,
  SIMETRIA_PARES,
  SPADI_ITEMS,
  SPADI_ENLACE,
  TAMPA_ITEMS,
  TAMPA_INTERPRETACION,
  FASES,
  valoracionVacia,
  spadiTotal,
  tampaTotal,
  mejoraPct,
  indiceSimetria,
  calcularFaseSugerida,
  faseInfo,
} from '../utils/valoracionHelpers'
import { insertValoracionRemote, updateValoracionRemote, deleteValoracionRemote } from '../lib/queries/valoracionesClientes'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function unidadDe(bloque, item) {
  if (item.unidad !== undefined) return item.unidad
  return bloque.unidadGrados ? 'º' : ''
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

export default function ValoracionCliente({ cliente, valoraciones, setValoraciones, onClose }) {
  const [vista, setVista] = useState('evolucion')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [expandido, setExpandido] = useState(null)
  const [formData, setFormData] = useState({ fecha: todayISO(), ...valoracionVacia() })

  const historial = useMemo(() => {
    return valoraciones
      .filter((v) => v.clienteNombre === cliente.Nombre)
      .slice()
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
  }, [valoraciones, cliente])

  const historialDesc = useMemo(() => historial.slice().reverse(), [historial])

  // Fase/objetivo vigente: la valoración confirmada con fase más reciente
  // (no necesariamente la última valoración en fecha, si esa última todavía
  // no tiene fase confirmada).
  const faseVigente = useMemo(() => historialDesc.find((v) => v.fase), [historialDesc])

  // Evolución por bloque: para cada ítem con al menos un valor registrado, primera vs última medición.
  const evolucionPorBloque = useMemo(() => {
    return BLOQUES.map((bloque) => {
      const filas = bloque.items.map((item) => {
        const conValor = historial.filter((v) => v[bloque.id]?.[item.id] !== undefined && v[bloque.id][item.id] !== '')
        if (conValor.length === 0) return null
        const primero = conValor[0]
        const ultimo = conValor[conValor.length - 1]
        return {
          item,
          unidad: unidadDe(bloque, item),
          primero: primero[bloque.id][item.id],
          primeroFecha: primero.fecha,
          ultimo: ultimo[bloque.id][item.id],
          ultimoFecha: ultimo.fecha,
          pct: mejoraPct(primero[bloque.id][item.id], ultimo[bloque.id][item.id]),
        }
      }).filter(Boolean)
      return { bloque, filas }
    }).filter((b) => b.filas.length > 0)
  }, [historial])

  const evolucionCuestionarios = useMemo(() => {
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
  }, [historial])

  // Índices de simetría: usan la valoración más reciente que tenga ambos lados rellenados.
  const indicesSimetria = useMemo(() => {
    return SIMETRIA_PARES.map((par) => {
      const conAmbos = historial.filter((v) =>
        v[par.bloque]?.[par.dxId] !== undefined && v[par.bloque][par.dxId] !== '' &&
        v[par.bloque]?.[par.izqId] !== undefined && v[par.bloque][par.izqId] !== ''
      )
      if (conAmbos.length === 0) return null
      const ultima = conAmbos[conAmbos.length - 1]
      const indice = indiceSimetria(ultima[par.bloque][par.dxId], ultima[par.bloque][par.izqId])
      return { par, indice, fecha: ultima.fecha }
    }).filter(Boolean)
  }, [historial])

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
    base.notas = valoracion.notas || ''
    base.dolorEnDeporte = valoracion.dolorEnDeporte ?? null
    base.fase = valoracion.fase ?? null
    base.objetivo = valoracion.objetivo || ''
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
  const faseSugeridaForm = calcularFaseSugerida(spadiTotalForm, formData.dolorEnDeporte)
  const faseSugeridaInfo = faseInfo(faseSugeridaForm)
  const faseConfirmadaInfo = faseInfo(formData.fase)

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
              {faseVigente.objetivo && <> · Objetivo: {faseVigente.objetivo}</>}
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
                    <span>Ítem</span><span>Primera</span><span>Última</span><span>% mejoría</span>
                  </div>
                  {filas.map((fila) => (
                    <div className="valoracion-evolucion-row" key={fila.item.id}>
                      <span>{fila.item.label}</span>
                      <span>{fila.primero}{fila.unidad} ({formatFecha(fila.primeroFecha)})</span>
                      <span>{fila.ultimo}{fila.unidad} ({formatFecha(fila.ultimoFecha)})</span>
                      <span className={fila.pct != null && fila.pct >= 0 ? 'valoracion-mejora-positiva' : ''}>{fila.pct != null ? `${fila.pct}%` : '—'}</span>
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
                        {BLOQUES.map((bloque) => (
                          bloque.items.filter((it) => v[bloque.id]?.[it.id] !== undefined && v[bloque.id][it.id] !== '').map((it) => (
                            <div key={it.id}>{it.label}: <strong>{v[bloque.id][it.id]}{unidadDe(bloque, it)}</strong></div>
                          ))
                        ))}
                        {v.fase && <p style={{ marginTop: 6 }}>📍 Fase {v.fase}{v.objetivo ? ` — ${v.objetivo}` : ''}</p>}
                        {v.notas && <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>📝 {v.notas}</p>}
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

              {BLOQUES.map((bloque) => (
                <div key={bloque.id}>
                  <h4 className="team-activity-subtitle">{bloque.label}</h4>
                  <div className="valoracion-grid">
                    {bloque.items.map((item) => (
                      <div key={item.id}>
                        <CampoNumerico
                          label={item.label}
                          unidad={unidadDe(bloque, item)}
                          value={formData[bloque.id]?.[item.id]}
                          onChange={(v) => setCampo(bloque.id, item.id, v)}
                        />
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

              <label className="valoracion-campo">
                <span>Objetivo para esta fase</span>
                <textarea
                  rows={2}
                  value={formData.objetivo}
                  onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                  placeholder={faseConfirmadaInfo?.objetivoEjemplo || faseSugeridaInfo?.objetivoEjemplo || 'Objetivo concreto para esta fase...'}
                />
              </label>

              <label className="valoracion-campo" style={{ marginTop: 8 }}>
                <span>Notas</span>
                <textarea rows={3} value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} placeholder="Observaciones de esta valoración..." />
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

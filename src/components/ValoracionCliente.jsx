import { useMemo, useState } from 'react'
import {
  ITEMS_FUERZA,
  ITEMS_MOVILIDAD_HOMBRO,
  REFERENCIA_FUERZA,
  SPADI_ITEMS,
  SPADI_ENLACE,
  TAMPA_ITEMS,
  TAMPA_INTERPRETACION,
  valoracionVacia,
  spadiTotal,
  tampaTotal,
  mejoraPct,
} from '../utils/valoracionHelpers'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
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

  // Evolución: para cada ítem con al menos un valor registrado, primera vs última medición.
  const evolucionFuerza = useMemo(() => {
    return ITEMS_FUERZA.map((item) => {
      const conValor = historial.filter((v) => v.fuerza?.[item.id] !== undefined && v.fuerza[item.id] !== '')
      if (conValor.length === 0) return null
      const primero = conValor[0]
      const ultimo = conValor[conValor.length - 1]
      return {
        item,
        primero: primero.fuerza[item.id],
        primeroFecha: primero.fecha,
        ultimo: ultimo.fuerza[item.id],
        ultimoFecha: ultimo.fecha,
        pct: mejoraPct(primero.fuerza[item.id], ultimo.fuerza[item.id]),
      }
    }).filter(Boolean)
  }, [historial])

  const evolucionMovilidad = useMemo(() => {
    return ITEMS_MOVILIDAD_HOMBRO.map((item) => {
      const conValor = historial.filter((v) => v.movilidadHombro?.[item.id] !== undefined && v.movilidadHombro[item.id] !== '')
      if (conValor.length === 0) return null
      const primero = conValor[0]
      const ultimo = conValor[conValor.length - 1]
      return {
        item,
        primero: primero.movilidadHombro[item.id],
        primeroFecha: primero.fecha,
        ultimo: ultimo.movilidadHombro[item.id],
        ultimoFecha: ultimo.fecha,
        pct: mejoraPct(primero.movilidadHombro[item.id], ultimo.movilidadHombro[item.id]),
      }
    }).filter(Boolean)
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
        ultimo, ultimoFecha: conSpadi[conSpadi.length - 1].fecha, pct: mejoraPct(primero, ultimo),
      })
    }
    if (conTampa.length > 0) {
      const primero = tampaTotal(conTampa[0].tampa)
      const ultimo = tampaTotal(conTampa[conTampa.length - 1].tampa)
      filas.push({
        label: 'TAMPA (11-44, menor es mejor)', primero, primeroFecha: conTampa[0].fecha,
        ultimo, ultimoFecha: conTampa[conTampa.length - 1].fecha, pct: mejoraPct(primero, ultimo),
      })
    }
    return filas
  }, [historial])

  const openNew = () => {
    setEditingId(null)
    setFormData({ fecha: todayISO(), ...valoracionVacia() })
    setShowForm(true)
  }

  const openEdit = (valoracion) => {
    setEditingId(valoracion.id)
    setFormData({
      fecha: valoracion.fecha,
      fuerza: valoracion.fuerza || {},
      movilidadHombro: valoracion.movilidadHombro || {},
      spadi: valoracion.spadi || {},
      tampa: valoracion.tampa || {},
      notas: valoracion.notas || '',
    })
    setShowForm(true)
  }

  const eliminar = (id) => {
    if (typeof setValoraciones !== 'function') return
    setValoraciones((prev) => prev.filter((v) => v.id !== id))
  }

  const setCampo = (bloque, itemId, valor) => {
    setFormData((prev) => ({ ...prev, [bloque]: { ...prev[bloque], [itemId]: valor } }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (typeof setValoraciones !== 'function') return
    if (editingId) {
      setValoraciones((prev) => prev.map((v) => (v.id === editingId ? { ...v, ...formData, clienteNombre: cliente.Nombre } : v)))
    } else {
      setValoraciones((prev) => [...prev, { id: `val-${Date.now()}`, clienteNombre: cliente.Nombre, ...formData }])
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
          <button className="close-modal-btn" onClick={onClose}>✕</button>
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

            {evolucionFuerza.length > 0 && (
              <>
                <h4 className="team-activity-subtitle">Fuerza</h4>
                <div className="valoracion-evolucion-table">
                  <div className="valoracion-evolucion-row valoracion-evolucion-header">
                    <span>Ítem</span><span>Primera</span><span>Última</span><span>% mejoría</span>
                  </div>
                  {evolucionFuerza.map((fila) => (
                    <div className="valoracion-evolucion-row" key={fila.item.id}>
                      <span>{fila.item.label}</span>
                      <span>{fila.primero}{fila.item.unidad} ({formatFecha(fila.primeroFecha)})</span>
                      <span>{fila.ultimo}{fila.item.unidad} ({formatFecha(fila.ultimoFecha)})</span>
                      <span className={fila.pct != null && fila.pct >= 0 ? 'valoracion-mejora-positiva' : ''}>{fila.pct != null ? `${fila.pct}%` : '—'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {evolucionMovilidad.length > 0 && (
              <>
                <h4 className="team-activity-subtitle">Movilidad de hombro</h4>
                <div className="valoracion-evolucion-table">
                  <div className="valoracion-evolucion-row valoracion-evolucion-header">
                    <span>Ítem</span><span>Primera</span><span>Última</span><span>% mejoría</span>
                  </div>
                  {evolucionMovilidad.map((fila) => (
                    <div className="valoracion-evolucion-row" key={fila.item.id}>
                      <span>{fila.item.label}</span>
                      <span>{fila.primero}º ({formatFecha(fila.primeroFecha)})</span>
                      <span>{fila.ultimo}º ({formatFecha(fila.ultimoFecha)})</span>
                      <span className={fila.pct != null && fila.pct >= 0 ? 'valoracion-mejora-positiva' : ''}>{fila.pct != null ? `${fila.pct}%` : '—'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
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
                        {ITEMS_FUERZA.filter((it) => v.fuerza?.[it.id] !== undefined && v.fuerza[it.id] !== '').map((it) => (
                          <div key={it.id}>{it.label}: <strong>{v.fuerza[it.id]}{it.unidad}</strong></div>
                        ))}
                        {ITEMS_MOVILIDAD_HOMBRO.filter((it) => v.movilidadHombro?.[it.id] !== undefined && v.movilidadHombro[it.id] !== '').map((it) => (
                          <div key={it.id}>{it.label}: <strong>{v.movilidadHombro[it.id]}º</strong></div>
                        ))}
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

              <h4 className="team-activity-subtitle">Fuerza</h4>
              <div className="valoracion-grid">
                {ITEMS_FUERZA.map((item) => (
                  <div key={item.id}>
                    <CampoNumerico
                      label={item.label}
                      unidad={item.unidad}
                      value={formData.fuerza[item.id]}
                      onChange={(v) => setCampo('fuerza', item.id, v)}
                    />
                    {REFERENCIA_FUERZA[item.id] && (
                      <span className="valoracion-referencia">Ref: {REFERENCIA_FUERZA[item.id].mujeres} (mujeres) / {REFERENCIA_FUERZA[item.id].hombres} (hombres)</span>
                    )}
                  </div>
                ))}
              </div>

              <h4 className="team-activity-subtitle">Movilidad de hombro (grados)</h4>
              <div className="valoracion-grid">
                {ITEMS_MOVILIDAD_HOMBRO.map((item) => (
                  <CampoNumerico
                    key={item.id}
                    label={item.label}
                    unidad="º"
                    value={formData.movilidadHombro[item.id]}
                    onChange={(v) => setCampo('movilidadHombro', item.id, v)}
                  />
                ))}
              </div>

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

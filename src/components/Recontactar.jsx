import { useMemo, useState } from 'react'
import { updateLeadRemote } from '../lib/queries/ventas'
import { insertRecontactoRemote, updateRecontactoRemote, deleteRecontactoRemote } from '../lib/queries/recontactos'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const initialManualForm = {
  nombre: '',
  canal: 'WhatsApp',
  contacto: '',
  motivo: '',
  fechaContacto: '',
}

const recontactoVacio = {
  canal: 'WhatsApp',
  contacto: '',
  motivo: '',
  fechaContacto: '',
  contactado: false,
  respondido: null,
  comprado: null,
}

function TriEstado({ value, onChange }) {
  return (
    <select
      value={value === true ? 'si' : value === false ? 'no' : 'pendiente'}
      onChange={(e) => onChange(e.target.value === 'si' ? true : e.target.value === 'no' ? false : null)}
    >
      <option value="pendiente">Pendiente</option>
      <option value="si">Sí</option>
      <option value="no">No</option>
    </select>
  )
}

export default function Recontactar({ ventas = [], setVentas, recontactos = [], setRecontactos }) {
  const [showForm, setShowForm] = useState(false)
  const [manualForm, setManualForm] = useState(initialManualForm)

  const leadsSeguimiento = useMemo(
    () => ventas.filter((l) => l.etapa === 'seguimiento'),
    [ventas]
  )

  const updateLeadRecontacto = (leadId, patch) => {
    if (typeof setVentas !== 'function') return
    const lead = ventas.find((l) => l.id === leadId)
    const recontactoMerged = { ...recontactoVacio, ...(lead?.recontacto || {}), ...patch }
    setVentas((prev) => prev.map((l) => (l.id === leadId ? { ...l, recontacto: recontactoMerged } : l)))
    updateLeadRemote(leadId, { recontacto: recontactoMerged })
  }

  const updateManual = (id, patch) => {
    if (typeof setRecontactos !== 'function') return
    setRecontactos((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    updateRecontactoRemote(id, patch)
  }

  const eliminarManual = (id) => {
    if (typeof setRecontactos !== 'function') return
    setRecontactos((prev) => prev.filter((r) => r.id !== id))
    deleteRecontactoRemote(id)
  }

  const handleSubmitManual = (event) => {
    event.preventDefault()
    if (typeof setRecontactos !== 'function') return
    const nuevo = {
      id: `recontacto-${Date.now()}`,
      nombre: manualForm.nombre.trim(),
      canal: manualForm.canal,
      contacto: manualForm.contacto.trim(),
      motivo: manualForm.motivo.trim(),
      fechaContacto: manualForm.fechaContacto,
      contactado: false,
      respondido: null,
      comprado: null,
    }
    setRecontactos((prev) => [nuevo, ...prev])
    insertRecontactoRemote(nuevo)
    setShowForm(false)
    setManualForm(initialManualForm)
  }

  const filas = useMemo(() => {
    const deLeads = leadsSeguimiento.map((lead) => ({
      origenTipo: 'lead',
      id: lead.id,
      nombre: lead.nombre,
      closer: lead.closer,
      ...recontactoVacio,
      // El canal por defecto es WhatsApp, así que se rellena el contacto con
      // el teléfono que ya tiene el lead (antes quedaba vacío y había que
      // escribirlo a mano aunque el dato ya existiera). Si el recontacto
      // guardado trae ya un "contacto" propio (p. ej. porque se cambió a
      // Instagram y se puso un usuario), ese valor manda sobre el teléfono.
      contacto: lead.telefono || '',
      ...(lead.recontacto || {}),
    }))
    const manuales = recontactos.map((r) => ({
      origenTipo: 'manual',
      ...r,
    }))
    return [...deLeads, ...manuales].sort((a, b) => {
      if (!a.fechaContacto) return 1
      if (!b.fechaContacto) return -1
      return a.fechaContacto < b.fechaContacto ? -1 : 1
    })
  }, [leadsSeguimiento, recontactos])

  const hoy = todayISO()
  const stats = useMemo(() => {
    const pendientesHoy = filas.filter((f) => !f.contactado && f.fechaContacto && f.fechaContacto <= hoy).length
    const respondidos = filas.filter((f) => f.respondido === true).length
    const comprados = filas.filter((f) => f.comprado === true).length
    return { total: filas.length, pendientesHoy, respondidos, comprados }
  }, [filas, hoy])

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Total a recontactar</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>🔁</div>
          </div>
          <div className="kpi-card-value">{stats.total}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Pendientes hoy / atrasados</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>⏰</div>
          </div>
          <div className="kpi-card-value">{stats.pendientesHoy}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Respondieron</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>💬</div>
          </div>
          <div className="kpi-card-value">{stats.respondidos}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Compraron</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>✅</div>
          </div>
          <div className="kpi-card-value">{stats.comprados}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="card-header">
          <div>
            <div className="card-title">Recontactar</div>
            <div className="card-subtitle">Leads en seguimiento + altas manuales</div>
          </div>
          <button type="button" className="add-client-btn" onClick={() => setShowForm(true)}>＋ Añadir recontacto</button>
        </div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Origen</th>
                <th>Canal</th>
                <th>Contacto</th>
                <th>Motivo</th>
                <th>Fecha contacto</th>
                <th>Contactado</th>
                <th>Respondido</th>
                <th>Comprado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => {
                const atrasado = !fila.contactado && fila.fechaContacto && fila.fechaContacto <= hoy
                const onPatch = (patch) => (
                  fila.origenTipo === 'lead'
                    ? updateLeadRecontacto(fila.id, patch)
                    : updateManual(fila.id, patch)
                )
                return (
                  <tr key={`${fila.origenTipo}-${fila.id}`} style={atrasado ? { background: '#fef2f2' } : undefined}>
                    <td style={{ fontWeight: 600 }}>
                      {fila.origenTipo === 'manual' ? (
                        <input
                          value={fila.nombre}
                          style={{ minWidth: 120 }}
                          onChange={(e) => onPatch({ nombre: e.target.value })}
                        />
                      ) : fila.nombre}
                    </td>
                    <td>
                      {fila.origenTipo === 'lead'
                        ? <span className="status-pill status-activo">Lead · {fila.closer || 'sin closer'}</span>
                        : <span className="status-pill status-inactivo">Manual</span>}
                    </td>
                    <td>
                      <select value={fila.canal} onChange={(e) => onPatch({ canal: e.target.value })}>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Instagram">Instagram</option>
                      </select>
                    </td>
                    <td>
                      <input
                        placeholder={fila.canal === 'Instagram' ? 'Usuario de Instagram' : 'Teléfono'}
                        value={fila.contacto}
                        style={{ minWidth: 120 }}
                        onChange={(e) => onPatch({ contacto: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        placeholder="Motivo del recontacto"
                        value={fila.motivo}
                        style={{ minWidth: 140 }}
                        onChange={(e) => onPatch({ motivo: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        value={fila.fechaContacto}
                        onChange={(e) => onPatch({ fechaContacto: e.target.value })}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!fila.contactado}
                        onChange={(e) => onPatch({ contactado: e.target.checked })}
                      />
                    </td>
                    <td>
                      <TriEstado value={fila.respondido} onChange={(v) => onPatch({ respondido: v })} />
                    </td>
                    <td>
                      <TriEstado value={fila.comprado} onChange={(v) => onPatch({ comprado: v })} />
                    </td>
                    <td>
                      {fila.origenTipo === 'manual' && (
                        <button type="button" className="row-action-btn" onClick={() => eliminarManual(fila.id)}>Eliminar</button>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filas.length === 0 && (
                <tr><td colSpan={10} className="lead-log-empty">Nadie pendiente de recontactar.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="client-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="client-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">Añadir recontacto</div>
                <div className="card-subtitle">Persona a la que hay que volver a contactar</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmitManual}>
              <input required placeholder="Nombre" value={manualForm.nombre}
                onChange={(e) => setManualForm({ ...manualForm, nombre: e.target.value })} />
              <select value={manualForm.canal} onChange={(e) => setManualForm({ ...manualForm, canal: e.target.value })}>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Instagram">Instagram</option>
              </select>
              <input
                placeholder={manualForm.canal === 'Instagram' ? 'Usuario de Instagram' : 'Teléfono'}
                value={manualForm.contacto}
                onChange={(e) => setManualForm({ ...manualForm, contacto: e.target.value })}
              />
              <input placeholder="Motivo del recontacto" value={manualForm.motivo}
                onChange={(e) => setManualForm({ ...manualForm, motivo: e.target.value })} />
              <label className="lead-detail-label">Fecha de contacto</label>
              <input type="date" value={manualForm.fechaContacto}
                onChange={(e) => setManualForm({ ...manualForm, fechaContacto: e.target.value })} />
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

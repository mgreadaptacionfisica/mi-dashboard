import { useState } from 'react'
import { insertManualRemote, updateManualRemote, deleteManualRemote } from '../lib/queries/manuales'

const initialForm = { titulo: '', descripcion: '', enlace: '' }

// Archivo de documentos/manuales de la agencia: lo ve todo el mundo (todos
// los roles tienen 'manuales' en SECCIONES_POR_ROL), pero solo el admin
// puede añadir, editar o borrar — el resto solo consulta y descarga.
export default function Manuales({ manuales = [], setManuales, rol }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(initialForm)
  const esAdmin = rol === 'admin'

  const openNew = () => {
    setEditingId(null)
    setFormData(initialForm)
    setShowForm(true)
  }

  const openEdit = (m) => {
    setEditingId(m.id)
    setFormData({ titulo: m.titulo || '', descripcion: m.descripcion || '', enlace: m.enlace || '' })
    setShowForm(true)
  }

  const eliminar = (id) => {
    if (typeof setManuales !== 'function') return
    if (!window.confirm('¿Eliminar este documento del archivo?')) return
    setManuales((prev) => prev.filter((m) => m.id !== id))
    deleteManualRemote(id)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (typeof setManuales !== 'function') return
    if (editingId) {
      const patch = { titulo: formData.titulo.trim(), descripcion: formData.descripcion.trim(), enlace: formData.enlace.trim() }
      setManuales((prev) => prev.map((m) => (m.id === editingId ? { ...m, ...patch } : m)))
      updateManualRemote(editingId, patch)
    } else {
      const nuevo = {
        id: `manual-${Date.now()}`,
        titulo: formData.titulo.trim(),
        descripcion: formData.descripcion.trim(),
        enlace: formData.enlace.trim(),
      }
      setManuales((prev) => [...prev, nuevo])
      insertManualRemote(nuevo)
    }
    setShowForm(false)
    setEditingId(null)
    setFormData(initialForm)
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Manuales</div>
          <div className="topbar-subtitle">Documentos y guías de la agencia, siempre a mano</div>
        </div>
      </header>

      <main className="page-content">
        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">Archivo de documentos</div>
              <div className="card-subtitle">{manuales.length} documento{manuales.length === 1 ? '' : 's'}</div>
            </div>
            {esAdmin && (
              <button type="button" className="add-client-btn" onClick={openNew}>＋ Añadir documento</button>
            )}
          </div>

          <ul className="lead-log-list" style={{ padding: '0 20px 20px' }}>
            {manuales.length === 0 && <li className="lead-log-empty">Todavía no hay documentos guardados aquí.</li>}
            {manuales.map((m) => (
              <li key={m.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{m.titulo || 'Sin título'}</strong>
                    {m.descripcion && (
                      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{m.descripcion}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <a href={m.enlace} target="_blank" rel="noopener noreferrer" className="row-action-btn" style={{ textDecoration: 'none' }}>
                      📄 Ver / descargar
                    </a>
                    {esAdmin && (
                      <>
                        <button type="button" className="row-action-btn" onClick={() => openEdit(m)}>Editar</button>
                        <button type="button" className="row-action-btn" onClick={() => eliminar(m.id)}>Eliminar</button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {showForm && esAdmin && (
        <div className="client-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="client-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{editingId ? 'Editar documento' : 'Añadir documento'}</div>
                <div className="card-subtitle">Manual o guía para el archivo de la agencia</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <input required placeholder="Título" value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
              <input placeholder="Descripción (opcional)" value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} />
              <input required type="url" placeholder="Enlace al documento (PDF, Drive...)" value={formData.enlace}
                onChange={(e) => setFormData({ ...formData, enlace: e.target.value })} />
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar documento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

import { useState } from 'react'
import { insertEnlaceInteresRemote, updateEnlaceInteresRemote, deleteEnlaceInteresRemote } from '../lib/queries/enlacesInteres'

const initialForm = { titulo: '', enlace: '' }

// Zona privada del admin: enlaces que se usan a menudo (ej. el dashboard
// para un cliente concreto) para copiarlos rápido y pasarlos por WhatsApp
// o donde haga falta. Esta vista solo se monta si el rol es admin (ver
// SECCIONES_POR_ROL en auth.js), y la RLS de Supabase también lo obliga
// del lado del servidor — no hace falta ningún check extra aquí dentro.
export default function EnlacesInteres({ enlaces = [], setEnlaces }) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(initialForm)
  const [copiadoId, setCopiadoId] = useState(null)

  const openNew = () => {
    setEditingId(null)
    setFormData(initialForm)
    setShowForm(true)
  }

  const openEdit = (item) => {
    setEditingId(item.id)
    setFormData({ titulo: item.titulo || '', enlace: item.enlace || '' })
    setShowForm(true)
  }

  const eliminar = (id) => {
    if (typeof setEnlaces !== 'function') return
    if (!window.confirm('¿Eliminar este enlace?')) return
    setEnlaces((prev) => prev.filter((item) => item.id !== id))
    deleteEnlaceInteresRemote(id)
  }

  const copiar = async (item) => {
    try {
      await navigator.clipboard.writeText(item.enlace)
      setCopiadoId(item.id)
      setTimeout(() => setCopiadoId((prev) => (prev === item.id ? null : prev)), 1500)
    } catch (err) {
      console.error('[enlaces_interes] no se pudo copiar:', err)
      window.prompt('Copia el enlace manualmente:', item.enlace)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (typeof setEnlaces !== 'function') return
    if (editingId) {
      const patch = { titulo: formData.titulo.trim(), enlace: formData.enlace.trim() }
      setEnlaces((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...patch } : item)))
      updateEnlaceInteresRemote(editingId, patch)
    } else {
      const nuevo = {
        id: `enlace-${Date.now()}`,
        titulo: formData.titulo.trim(),
        enlace: formData.enlace.trim(),
      }
      setEnlaces((prev) => [...prev, nuevo])
      insertEnlaceInteresRemote(nuevo)
    }
    setShowForm(false)
    setEditingId(null)
    setFormData(initialForm)
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Enlaces de interés</div>
          <div className="topbar-subtitle">Tus enlaces frecuentes, listos para copiar y enviar</div>
        </div>
      </header>

      <main className="page-content">
        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">Mis enlaces</div>
              <div className="card-subtitle">{enlaces.length} enlace{enlaces.length === 1 ? '' : 's'} guardado{enlaces.length === 1 ? '' : 's'}</div>
            </div>
            <button type="button" className="add-client-btn" onClick={openNew}>＋ Añadir enlace</button>
          </div>

          <ul className="lead-log-list" style={{ padding: '0 20px 20px' }}>
            {enlaces.length === 0 && <li className="lead-log-empty">Todavía no has guardado ningún enlace.</li>}
            {enlaces.map((item) => (
              <li key={item.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{item.titulo || 'Sin título'}</strong>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2, wordBreak: 'break-all' }}>{item.enlace}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button type="button" className="row-action-btn" onClick={() => copiar(item)}>
                      {copiadoId === item.id ? '✅ Copiado' : '📋 Copiar enlace'}
                    </button>
                    <button type="button" className="row-action-btn" onClick={() => openEdit(item)}>Editar</button>
                    <button type="button" className="row-action-btn" onClick={() => eliminar(item.id)}>Eliminar</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {showForm && (
        <div className="client-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="client-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{editingId ? 'Editar enlace' : 'Añadir enlace'}</div>
                <div className="card-subtitle">Guarda el enlace y para qué sirve</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <input required placeholder="Nombre o para qué es (ej. Dashboard para el cliente)" value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
              <input required type="url" placeholder="Enlace" value={formData.enlace}
                onChange={(e) => setFormData({ ...formData, enlace: e.target.value })} />
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar enlace</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

import { useState } from 'react'
import { insertEnlaceInteresRemote, updateEnlaceInteresRemote, deleteEnlaceInteresRemote } from '../lib/queries/enlacesInteres'

const initialForm = { titulo: '', enlace: '' }

// Zona privada del admin: enlaces y también textos/plantillas que se usan
// a menudo (ej. el dashboard para un cliente, o el SQL para dar de alta a
// un técnico nuevo en Supabase) para copiarlos rápido y pegarlos donde
// haga falta. El campo "enlace" acepta cualquier texto, no solo URLs —
// de ahí el <textarea> en vez de un input type="url": un bloque SQL de
// varias líneas también tiene que caber y copiarse tal cual. Esta vista
// solo se monta si el rol es admin (ver SECCIONES_POR_ROL en auth.js), y
// la RLS de Supabase también lo obliga del lado del servidor — no hace
// falta ningún check extra aquí dentro.
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
          <div className="topbar-subtitle">Tus enlaces y plantillas frecuentes, listos para copiar y pegar</div>
        </div>
      </header>

      <main className="page-content">
        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">Mis enlaces y plantillas</div>
              <div className="card-subtitle">{enlaces.length} guardado{enlaces.length === 1 ? '' : 's'}</div>
            </div>
            <button type="button" className="add-client-btn" onClick={openNew}>＋ Añadir</button>
          </div>

          <ul className="lead-log-list" style={{ padding: '0 20px 20px' }}>
            {enlaces.length === 0 && <li className="lead-log-empty">Todavía no has guardado nada aquí.</li>}
            {enlaces.map((item) => (
              <li key={item.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{item.titulo || 'Sin título'}</strong>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{item.enlace}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <button type="button" className="row-action-btn" onClick={() => copiar(item)}>
                      {copiadoId === item.id ? '✅ Copiado' : '📋 Copiar'}
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
                <div className="card-title">{editingId ? 'Editar' : 'Añadir'}</div>
                <div className="card-subtitle">Un enlace o un texto/plantilla que uses a menudo</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <input required placeholder="Nombre o para qué es (ej. Dashboard para el cliente, Alta técnico en Supabase...)" value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
              <textarea required rows={5} placeholder="Enlace o texto a copiar (puede tener varias líneas)" value={formData.enlace}
                onChange={(e) => setFormData({ ...formData, enlace: e.target.value })} style={{ fontFamily: 'inherit', resize: 'vertical' }} />
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

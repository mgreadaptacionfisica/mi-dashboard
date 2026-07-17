import { useMemo, useState } from 'react'
import { insertSopRemote, updateSopRemote, deleteSopRemote } from '../lib/queries/sops'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function formatFecha(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

const initialForm = { titulo: '', categoria: '', contenido: '', enlace: '' }

// puedeEditar=false oculta "Añadir SOP"/"Editar"/"Eliminar" — así el equipo
// técnico puede consultar los protocolos sin poder tocarlos (solo admin y
// contenido, que son quienes los redactan, pueden editarlos).
export default function SOPs({ sops = [], setSops, puedeEditar = true }) {
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [expandido, setExpandido] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(initialForm)

  const categorias = useMemo(() => {
    const set = new Set(sops.map((s) => s.categoria?.trim() || 'Sin categoría'))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [sops])

  const sopsFiltrados = useMemo(() => {
    if (filtroCategoria === 'Todas') return sops
    return sops.filter((s) => (s.categoria?.trim() || 'Sin categoría') === filtroCategoria)
  }, [sops, filtroCategoria])

  const grupos = useMemo(() => {
    const mapa = {}
    sopsFiltrados.forEach((sop) => {
      const cat = sop.categoria?.trim() || 'Sin categoría'
      mapa[cat] = mapa[cat] || []
      mapa[cat].push(sop)
    })
    return Object.keys(mapa).sort((a, b) => a.localeCompare(b)).map((cat) => ({ categoria: cat, items: mapa[cat] }))
  }, [sopsFiltrados])

  const openNew = () => {
    setEditingId(null)
    setFormData(initialForm)
    setShowForm(true)
  }

  const openEdit = (sop) => {
    setEditingId(sop.id)
    setFormData({ titulo: sop.titulo || '', categoria: sop.categoria || '', contenido: sop.contenido || '', enlace: sop.enlace || '' })
    setShowForm(true)
  }

  const eliminar = (id) => {
    if (typeof setSops !== 'function') return
    setSops((prev) => prev.filter((s) => s.id !== id))
    deleteSopRemote(id)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (typeof setSops !== 'function') return
    if (editingId) {
      const patch = {
        titulo: formData.titulo.trim(),
        categoria: formData.categoria.trim(),
        contenido: formData.contenido,
        enlace: formData.enlace.trim(),
        actualizadoEn: todayISO(),
      }
      setSops((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...patch } : s)))
      updateSopRemote(editingId, patch)
    } else {
      const nuevo = {
        id: `sop-${Date.now()}`,
        titulo: formData.titulo.trim(),
        categoria: formData.categoria.trim(),
        contenido: formData.contenido,
        enlace: formData.enlace.trim(),
        actualizadoEn: todayISO(),
      }
      setSops((prev) => [...prev, nuevo])
      insertSopRemote(nuevo)
    }
    setShowForm(false)
    setEditingId(null)
    setFormData(initialForm)
  }

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Protocolos totales</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>📋</div>
          </div>
          <div className="kpi-card-value">{sops.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-card-label">Categorías</span>
            <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>🗂️</div>
          </div>
          <div className="kpi-card-value">{categorias.length}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="card-header">
          <div>
            <div className="card-title">SOPs / Protocolos</div>
            <div className="card-subtitle">{sopsFiltrados.length} de {sops.length} mostrados</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select className="filter-select" value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
              <option value="Todas">Todas las categorías</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {puedeEditar && (
              <button type="button" className="add-client-btn" onClick={openNew}>＋ Añadir SOP</button>
            )}
          </div>
        </div>

        <div style={{ padding: '0 20px 20px' }}>
          {grupos.length === 0 && <p className="lead-log-empty">Sin protocolos todavía.</p>}
          {grupos.map((grupo) => (
            <div key={grupo.categoria} style={{ marginBottom: 20 }}>
              <p className="plan-subtitle-inline" style={{ marginTop: 16 }}>{grupo.categoria}</p>
              <ul className="lead-log-list">
                {grupo.items.map((sop) => (
                  <li key={sop.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <button
                        type="button"
                        className="row-action-btn"
                        style={{ fontWeight: 600, border: 'none', background: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                        onClick={() => setExpandido((prev) => (prev === sop.id ? null : sop.id))}
                      >
                        {expandido === sop.id ? '▾' : '▸'} {sop.titulo || 'Sin título'} {sop.enlace ? '🔗' : ''}
                      </button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Actualizado {formatFecha(sop.actualizadoEn)}</span>
                        {puedeEditar && (
                          <>
                            <button type="button" className="row-action-btn" onClick={() => openEdit(sop)}>Editar</button>
                            <button type="button" className="row-action-btn" onClick={() => eliminar(sop.id)}>Eliminar</button>
                          </>
                        )}
                      </div>
                    </div>
                    {expandido === sop.id && (
                      <div style={{ marginTop: 6 }}>
                        {sop.enlace && (
                          <a
                            href={sop.enlace}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="row-action-btn"
                            style={{ display: 'inline-block', marginBottom: 8, textDecoration: 'none' }}
                          >
                            📄 Abrir documento
                          </a>
                        )}
                        {sop.contenido && (
                          <p style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)' }}>
                            {sop.contenido}
                          </p>
                        )}
                        {!sop.enlace && !sop.contenido && (
                          <p style={{ color: 'var(--color-text-secondary)' }}>Sin contenido.</p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="client-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="client-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{editingId ? 'Editar SOP' : 'Añadir SOP'}</div>
                <div className="card-subtitle">Protocolo interno</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <input required placeholder="Título del protocolo" value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />
              <input
                required
                placeholder="Categoría (ej: Ventas, Entrenamiento, Contenido...)"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                list="sop-categorias"
              />
              <datalist id="sop-categorias">
                {categorias.map((c) => <option key={c} value={c} />)}
              </datalist>
              <input
                type="url"
                placeholder="Enlace al documento (Google Drive/Doc/PDF) — opcional"
                value={formData.enlace}
                onChange={(e) => setFormData({ ...formData, enlace: e.target.value })}
              />
              <textarea rows={8} placeholder="Contenido del protocolo (opcional, para protocolos simples sin imágenes)" value={formData.contenido}
                onChange={(e) => setFormData({ ...formData, contenido: e.target.value })} />
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar SOP</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

import { useMemo } from 'react'
import { updateIdeaRemote } from '../lib/queries/contenidoIdeas'

// Cola de edición: cuando Raúl pone una idea en estado "En edición", aparece
// aquí para la persona asignada. Se identifica quién ha iniciado sesión
// cruzando su email (auth) con el email de su ficha en Equipo — mismo
// patrón que MuroEquipo. El admin ve la cola de todo el mundo (vista de
// control), cada editor/a solo ve la suya.
export default function VideosParaEditar({ ideas = [], setIdeas, equipoContenido = [], miEmail, rol }) {
  const miPersona = useMemo(
    () => equipoContenido.find((p) => p.email && miEmail && p.email.toLowerCase() === miEmail.toLowerCase()),
    [equipoContenido, miEmail]
  )
  const miNombre = miPersona?.nombre || null
  const miCarpeta = miPersona?.carpetaDrive || ''

  const enEdicion = useMemo(() => ideas.filter((i) => i.estado === 'En edición'), [ideas])

  const videosVisibles = useMemo(() => {
    if (rol === 'admin') return enEdicion
    if (!miNombre) return []
    return enEdicion.filter((i) => (i.editores || []).includes(miNombre))
  }, [enEdicion, miNombre, rol])

  const marcarEditado = (idea) => {
    if (typeof setIdeas !== 'function') return
    setIdeas((prev) => prev.map((i) => (i.id === idea.id ? { ...i, estado: 'Editado' } : i)))
    updateIdeaRemote(idea.id, { estado: 'Editado' })
  }

  return (
    <div className="table-card">
      <div className="card-header">
        <div>
          <div className="card-title">Vídeos para editar</div>
          <div className="card-subtitle">
            {rol === 'admin'
              ? 'Todo lo que está en edición ahora mismo, por persona'
              : 'Lo que tienes pendiente de editar'}
          </div>
        </div>
        {rol !== 'admin' && miCarpeta && (
          <a
            href={miCarpeta}
            target="_blank"
            rel="noopener noreferrer"
            className="add-client-btn"
            style={{ textDecoration: 'none' }}
          >
            📁 Abrir mi carpeta de Drive
          </a>
        )}
      </div>

      {rol !== 'admin' && !miPersona && (
        <p className="lead-log-empty" style={{ padding: '0 20px 20px' }}>
          No encontramos tu ficha en Equipo con este email — pídele a Raúl que revise que el email de tu ficha coincida con el de tu cuenta.
        </p>
      )}

      <ul className="tareas-list">
        {videosVisibles.length === 0 && (miPersona || rol === 'admin') && (
          <li className="lead-log-empty">
            {rol === 'admin' ? 'Nadie tiene vídeos en edición ahora mismo.' : '¡Nada pendiente de editar! 🎉'}
          </li>
        )}
        {videosVisibles.map((idea) => (
          <li key={idea.id} className="tareas-item">
            <div>
              <strong>{idea.titulo || 'Sin título'}</strong>
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                {(idea.editores || []).join(', ') || 'Sin editor asignado'} · {idea.formato || 'Sin formato'}
                {idea.fecha ? ` · ${idea.fecha}` : ''}
              </div>
            </div>
            <div className="tareas-item-meta">
              <button type="button" className="row-action-btn" onClick={() => marcarEditado(idea)}>✅ Marcar como editado</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

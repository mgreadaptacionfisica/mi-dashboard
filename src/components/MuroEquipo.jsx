import { useMemo, useState } from 'react'
import { insertMensajeRemote, deleteMensajeRemote } from '../lib/queries/mensajesEquipo'

function nowISO() {
  return new Date().toISOString()
}

function formatFecha(iso) {
  const d = new Date(iso)
  return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Muro de comunicación interna: todo el equipo (Raúl incluido) puede publicar
// avisos, dudas o cambios y mencionar a compañeros concretos. No hay login
// todavía (pendiente Supabase), así que "publicar como" es un selector manual.
export default function MuroEquipo({ mensajes, setMensajes, team }) {
  const personas = useMemo(() => {
    const nombres = [
      'Raúl',
      ...team.tecnico.map((p) => p.nombre),
      ...team.ventas.map((p) => p.nombre),
      ...(team.contenido || []).map((p) => p.nombre),
    ]
    return [...new Set(nombres)]
  }, [team])

  const [autor, setAutor] = useState(personas[0] || 'Raúl')
  const [texto, setTexto] = useState('')
  const [menciones, setMenciones] = useState([])
  const [soloMenciones, setSoloMenciones] = useState(false)

  const toggleMencion = (nombre) => {
    setMenciones((prev) => prev.includes(nombre) ? prev.filter((n) => n !== nombre) : [...prev, nombre])
  }

  const publicar = (event) => {
    event.preventDefault()
    if (!texto.trim()) return
    const nuevo = { id: `msg-${Date.now()}`, autor, texto: texto.trim(), menciones, fecha: nowISO() }
    setMensajes((prev) => [nuevo, ...prev])
    insertMensajeRemote(nuevo)
    setTexto('')
    setMenciones([])
  }

  const eliminarMensaje = (id) => {
    setMensajes((prev) => prev.filter((m) => m.id !== id))
    deleteMensajeRemote(id)
  }

  const mensajesVisibles = useMemo(() => {
    if (!soloMenciones) return mensajes
    return mensajes.filter((m) => (m.menciones || []).includes(autor))
  }, [mensajes, soloMenciones, autor])

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Comunicación</div>
          <div className="topbar-subtitle">Muro del equipo — avisos, dudas y cambios entre compañeros</div>
        </div>
      </header>

      <main className="page-content muro-page">
        <form className="muro-composer" onSubmit={publicar}>
          <div className="muro-composer-row">
            <label className="lead-detail-label">Publicar como</label>
            <select value={autor} onChange={(e) => setAutor(e.target.value)}>
              {personas.map((nombre) => <option key={nombre} value={nombre}>{nombre}</option>)}
            </select>
          </div>

          <textarea
            rows={3}
            placeholder="Escribe un aviso, una duda o un cambio para el equipo..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />

          <div className="muro-mencion-picker">
            <span className="lead-detail-label">Mencionar a (opcional)</span>
            <div className="muro-mencion-chips">
              {personas.filter((n) => n !== autor).map((nombre) => (
                <button
                  type="button"
                  key={nombre}
                  className={`muro-mencion-chip ${menciones.includes(nombre) ? 'muro-mencion-chip-activo' : ''}`}
                  onClick={() => toggleMencion(nombre)}
                >
                  @{nombre}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="primary-action">Publicar</button>
          </div>
        </form>

        <div className="muro-filtro-bar">
          <label className="muro-filtro-toggle">
            <input type="checkbox" checked={soloMenciones} onChange={(e) => setSoloMenciones(e.target.checked)} />
            Ver solo menciones a {autor}
          </label>
          <span className="muro-filtro-count">{mensajesVisibles.length} mensaje{mensajesVisibles.length === 1 ? '' : 's'}</span>
        </div>

        <div className="muro-feed">
          {mensajesVisibles.length === 0 && (
            <p className="lead-log-empty">
              {soloMenciones ? `Nadie ha mencionado a ${autor} todavía.` : 'Todavía no hay mensajes. ¡Escribe el primero!'}
            </p>
          )}
          {mensajesVisibles.map((m) => (
            <article key={m.id} className={`muro-mensaje ${(m.menciones || []).includes(autor) ? 'muro-mensaje-destacado' : ''}`}>
              <div className="muro-mensaje-header">
                <strong>{m.autor}</strong>
                <span className="muro-mensaje-fecha">{formatFecha(m.fecha)}</span>
                <button type="button" className="muro-mensaje-eliminar" title="Eliminar mensaje" onClick={() => eliminarMensaje(m.id)}>🗑️</button>
              </div>
              <p className="muro-mensaje-texto">{m.texto}</p>
              {(m.menciones || []).length > 0 && (
                <div className="muro-mensaje-menciones">
                  {m.menciones.map((n) => (
                    <span key={n} className={`muro-mencion-pill ${n === autor ? 'muro-mencion-pill-yo' : ''}`}>@{n}</span>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </main>
    </>
  )
}

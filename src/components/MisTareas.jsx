import { useMemo, useState } from 'react'
import { insertTareaRemote, updateTareaRemote, deleteTareaRemote } from '../lib/queries/tareasPersonales'

// "Mis tareas": lista personal de pendientes — de Raúl (admin) y también,
// desde julio 2026, de cada técnico (ver SECCIONES_POR_ROL en lib/auth.js).
// Es la misma tabla para todos, pero cada persona solo ve y crea las suyas:
// se filtra cruzando el email de la sesión con propietarioEmail de cada
// tarea, mismo patrón que ClientesEquipo/MuroEquipo. El aviso de tareas
// para hoy/vencidas en el Dashboard sigue siendo solo el de Raúl (ver
// Dashboard.jsx), porque ahí no se sabe qué técnico está mirando.

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatFecha(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function diasEstado(fecha, hoy) {
  if (!fecha) return null
  if (fecha < hoy) return 'vencida'
  if (fecha === hoy) return 'hoy'
  return 'futura'
}

const ESTADO_CLASS = { vencida: 'status-inactivo', hoy: 'status-pendiente', futura: 'status-idea' }
const ESTADO_LABEL = { vencida: 'Vencida', hoy: 'Hoy', futura: null }

export default function MisTareas({ tareas = [], setTareas, miEmail }) {
  const [filtro, setFiltro] = useState('pendientes')
  const [texto, setTexto] = useState('')
  const [fecha, setFecha] = useState('')
  const hoy = todayISO()

  // Sin miEmail (no debería pasar, login es obligatorio) se ven todas para
  // no perder datos de golpe; con miEmail, solo las propias.
  const misTareas = useMemo(
    () => tareas.filter((t) => !miEmail || t.propietarioEmail === miEmail),
    [tareas, miEmail]
  )

  const stats = useMemo(() => ({
    pendientes: misTareas.filter((t) => !t.hecha).length,
    vencidas: misTareas.filter((t) => !t.hecha && t.fecha && t.fecha < hoy).length,
    hechas: misTareas.filter((t) => t.hecha).length,
  }), [misTareas, hoy])

  const tareasVisibles = useMemo(() => {
    let lista = misTareas
    if (filtro === 'pendientes') lista = misTareas.filter((t) => !t.hecha)
    else if (filtro === 'hechas') lista = misTareas.filter((t) => t.hecha)
    return [...lista].sort((a, b) => {
      if (!a.fecha && !b.fecha) return 0
      if (!a.fecha) return 1
      if (!b.fecha) return -1
      return a.fecha.localeCompare(b.fecha)
    })
  }, [misTareas, filtro])

  const addTarea = (event) => {
    event.preventDefault()
    if (typeof setTareas !== 'function' || !texto.trim()) return
    const nueva = { id: `tarea-${Date.now()}`, texto: texto.trim(), fecha: fecha || null, hecha: false, propietarioEmail: miEmail || null }
    setTareas((prev) => [nueva, ...prev])
    insertTareaRemote(nueva)
    setTexto('')
    setFecha('')
  }

  const toggleHecha = (tarea) => {
    if (typeof setTareas !== 'function') return
    const hecha = !tarea.hecha
    setTareas((prev) => prev.map((t) => (t.id === tarea.id ? { ...t, hecha } : t)))
    updateTareaRemote(tarea.id, { hecha })
  }

  const eliminar = (id) => {
    if (typeof setTareas !== 'function') return
    setTareas((prev) => prev.filter((t) => t.id !== id))
    deleteTareaRemote(id)
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Mis tareas</div>
          <div className="topbar-subtitle">Lista personal de pendientes, solo visible para ti</div>
        </div>
      </header>

      <main className="page-content">
        <div className="kpi-grid">
          <div className="kpi-card" style={{ borderTop: '3px solid #f59e0b' }}>
            <div className="kpi-card-header">
              <span className="kpi-card-label">Pendientes</span>
              <div className="kpi-icon" style={{ background: '#fef3c7' }}>🗒️</div>
            </div>
            <div className="kpi-card-value">{stats.pendientes}</div>
          </div>
          <div className="kpi-card" style={{ borderTop: '3px solid #dc2626' }}>
            <div className="kpi-card-header">
              <span className="kpi-card-label">Vencidas</span>
              <div className="kpi-icon" style={{ background: '#fee2e2' }}>⏰</div>
            </div>
            <div className="kpi-card-value">{stats.vencidas}</div>
          </div>
          <div className="kpi-card" style={{ borderTop: '3px solid #10b981' }}>
            <div className="kpi-card-header">
              <span className="kpi-card-label">Hechas</span>
              <div className="kpi-icon" style={{ background: '#d1fae5' }}>✅</div>
            </div>
            <div className="kpi-card-value">{stats.hechas}</div>
          </div>
        </div>

        <form className="tareas-composer" onSubmit={addTarea}>
          <input
            type="text"
            placeholder="Escribe una tarea nueva..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          <button type="submit" className="add-client-btn">＋ Añadir tarea</button>
        </form>

        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">Tareas</div>
              <div className="card-subtitle">{tareasVisibles.length} mostradas</div>
            </div>
            <div className="period-selector">
              <button type="button" className={`period-btn ${filtro === 'pendientes' ? 'active' : ''}`} onClick={() => setFiltro('pendientes')}>Pendientes</button>
              <button type="button" className={`period-btn ${filtro === 'hechas' ? 'active' : ''}`} onClick={() => setFiltro('hechas')}>Hechas</button>
              <button type="button" className={`period-btn ${filtro === 'todas' ? 'active' : ''}`} onClick={() => setFiltro('todas')}>Todas</button>
            </div>
          </div>

          <ul className="tareas-list">
            {tareasVisibles.length === 0 && <li className="lead-log-empty">Sin tareas aquí.</li>}
            {tareasVisibles.map((t) => {
              const estado = !t.hecha ? diasEstado(t.fecha, hoy) : null
              return (
                <li key={t.id} className={`tareas-item ${t.hecha ? 'tareas-item-hecha' : ''}`}>
                  <label className="tareas-check">
                    <input type="checkbox" checked={t.hecha} onChange={() => toggleHecha(t)} />
                    <span>{t.texto}</span>
                  </label>
                  <div className="tareas-item-meta">
                    {t.fecha && (
                      <span className={`status-pill ${ESTADO_CLASS[estado] || 'status-idea'}`}>
                        {ESTADO_LABEL[estado] ? `${ESTADO_LABEL[estado]} · ` : ''}{formatFecha(t.fecha)}
                      </span>
                    )}
                    <button type="button" className="row-action-btn" onClick={() => eliminar(t.id)}>Eliminar</button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </main>
    </>
  )
}

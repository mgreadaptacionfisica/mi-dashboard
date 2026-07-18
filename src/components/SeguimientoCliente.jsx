import { useMemo, useState } from 'react'
import {
  BLOQUES_SESION,
  DIAS_SEMANA,
  mondayOf,
  toISO,
  formatRangoSemana,
  diaVacio,
  semanaVacia,
  progresoSemana,
} from '../utils/seguimientoHelpers'
import { upsertSeguimientoRemote } from '../lib/queries/seguimientos'
import { ultimaFaseCliente, faseInfo, objetivoCombinado } from '../utils/valoracionHelpers'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export default function SeguimientoCliente({ cliente, seguimientos, setSeguimientos, valoraciones = [], objetivosFase = [], onClose }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [tareaDraft, setTareaDraft] = useState({})
  // Texto libre cuando se elige "Otra" en el desplegable de bloques, para
  // poder escribir algo que no esté en la lista fija (A/1, B/2, Cardio...).
  const [tareaOtroDraft, setTareaOtroDraft] = useState({})

  const mondayISO = useMemo(() => {
    const base = mondayOf(new Date())
    base.setDate(base.getDate() + weekOffset * 7)
    return toISO(base)
  }, [weekOffset])

  const registro = useMemo(() => {
    return seguimientos.find((s) => s.clienteNombre === cliente.Nombre && s.semana === mondayISO)
  }, [seguimientos, cliente, mondayISO])

  const diasActuales = registro?.dias || semanaVacia()
  const comentarios = registro?.comentarios || ''
  const progreso = progresoSemana(registro)

  const actualizarSemana = (patch) => {
    const base = registro || { clienteNombre: cliente.Nombre, semana: mondayISO, dias: semanaVacia(), comentarios: '', revisiones: [] }
    const actualizado = { ...base, ...patch }
    setSeguimientos((prev) => {
      const existe = prev.some((s) => s.clienteNombre === cliente.Nombre && s.semana === mondayISO)
      if (existe) {
        return prev.map((s) =>
          (s.clienteNombre === cliente.Nombre && s.semana === mondayISO) ? actualizado : s
        )
      }
      return [...prev, actualizado]
    })
    upsertSeguimientoRemote(actualizado)
  }

  const addTarea = (diaId) => {
    const bloque = tareaDraft[diaId] || BLOQUES_SESION[0]
    const texto = bloque === 'Otra' ? (tareaOtroDraft[diaId] || '').trim() || 'Otra' : bloque
    const diaActual = diasActuales[diaId] || diaVacio()
    actualizarSemana({
      dias: { ...diasActuales, [diaId]: { tareas: [...diaActual.tareas, { texto, revisado: false, revisadoEn: null }] } },
    })
    if (bloque === 'Otra') setTareaOtroDraft({ ...tareaOtroDraft, [diaId]: '' })
  }

  const removeTarea = (diaId, index) => {
    const diaActual = diasActuales[diaId] || diaVacio()
    actualizarSemana({
      dias: { ...diasActuales, [diaId]: { tareas: diaActual.tareas.filter((_, i) => i !== index) } },
    })
  }

  const toggleTareaRevisado = (diaId, index) => {
    const diaActual = diasActuales[diaId] || diaVacio()
    const tareas = diaActual.tareas.map((t, i) =>
      i === index ? { ...t, revisado: !t.revisado, revisadoEn: !t.revisado ? todayISO() : null } : t
    )
    actualizarSemana({ dias: { ...diasActuales, [diaId]: { tareas } } })
  }

  const setComentarios = (texto) => {
    actualizarSemana({ comentarios: texto })
  }

  const faseVigente = useMemo(() => ultimaFaseCliente(valoraciones, cliente.Nombre), [valoraciones, cliente])

  return (
    <div className="client-modal-overlay" onClick={onClose}>
      <div className="client-modal seguimiento-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div>
            <div className="card-title">Seguimiento semanal — {cliente.Nombre}</div>
            <div className="card-subtitle">{(cliente.Trabajadores || []).join(', ') || 'Sin profesional asignado'}</div>
          </div>
          {cliente.Drive && (
            <a
              href={cliente.Drive}
              target="_blank"
              rel="noopener noreferrer"
              className="secondary-action"
              style={{ marginRight: 8 }}
            >
              📁 Abrir Drive
            </a>
          )}
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        {faseVigente ? (
          <div className="valoracion-fase-banner">
            📍 <strong>Fase {faseVigente.fase}</strong> — {faseInfo(faseVigente.fase)?.criterio}
            {objetivoCombinado(faseVigente, objetivosFase) && <> · Objetivo: {objetivoCombinado(faseVigente, objetivosFase)}</>}
          </div>
        ) : (
          <div className="valoracion-fase-banner" style={{ color: 'var(--color-text-secondary)' }}>
            Sin fase confirmada todavía — revísala en Valoración.
          </div>
        )}

        <div className="seguimiento-week-nav">
          <button type="button" className="secondary-action" onClick={() => setWeekOffset((w) => w - 1)}>← Semana anterior</button>
          <strong>
            Semana del {formatRangoSemana(mondayISO)}{weekOffset === 0 ? ' (actual)' : ''}
            {progreso.total > 0 && ` · ${progreso.revisadas}/${progreso.total} revisadas (${progreso.porcentaje}%)`}
          </strong>
          <button type="button" className="secondary-action" onClick={() => setWeekOffset((w) => w + 1)}>Semana siguiente →</button>
        </div>

        <div className="seguimiento-dias-grid">
          {DIAS_SEMANA.map((dia) => {
            const info = diasActuales[dia.id] || diaVacio()
            return (
              <div key={dia.id} className="seguimiento-dia-card">
                <div className="seguimiento-dia-header">
                  <span>{dia.label}</span>
                  {info.tareas.length > 0 && (
                    <span className="seguimiento-dia-count">
                      {info.tareas.filter((t) => t.revisado).length}/{info.tareas.length}
                    </span>
                  )}
                </div>
                <div className="seguimiento-tareas-list">
                  {info.tareas.length === 0 && <span className="lead-log-empty">Sin tareas</span>}
                  {info.tareas.map((tarea, i) => (
                    <label key={i} className={`seguimiento-tarea-chip ${tarea.revisado ? 'seguimiento-tarea-revisada' : ''}`}>
                      <input type="checkbox" checked={tarea.revisado} onChange={() => toggleTareaRevisado(dia.id, i)} />
                      {tarea.texto}
                      <button type="button" onClick={() => removeTarea(dia.id, i)}>✕</button>
                    </label>
                  ))}
                </div>
                <div className="seguimiento-add-tarea">
                  <select
                    value={tareaDraft[dia.id] || BLOQUES_SESION[0]}
                    onChange={(e) => setTareaDraft({ ...tareaDraft, [dia.id]: e.target.value })}
                  >
                    {BLOQUES_SESION.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                  {(tareaDraft[dia.id] || BLOQUES_SESION[0]) === 'Otra' && (
                    <input
                      type="text"
                      placeholder="Escribe la tarea..."
                      value={tareaOtroDraft[dia.id] || ''}
                      onChange={(e) => setTareaOtroDraft({ ...tareaOtroDraft, [dia.id]: e.target.value })}
                    />
                  )}
                  <button type="button" className="secondary-action" onClick={() => addTarea(dia.id)}>＋</button>
                </div>
              </div>
            )
          })}
        </div>

        <div>
          <label className="lead-detail-label">Cambios y revisado (comentario semanal)</label>
          <textarea
            rows={3}
            value={comentarios}
            onChange={(e) => setComentarios(e.target.value)}
            placeholder="Notas para la próxima semana, cambios propuestos, comentarios del equipo..."
          />
        </div>
      </div>
    </div>
  )
}

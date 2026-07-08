import { useMemo, useState } from 'react'

// Bloques/fases de un plan de entrenamiento (según nos confirmó Raúl:
// A/1, B/2... son bloques del plan; "Otra" cubre cualquier caso suelto).
const BLOQUES_SESION = ['DIA', 'A/1', 'B/2', 'C/3', 'D/4', 'Cardio', 'Entrenamiento', 'Evaluación', 'Semanal', 'Mensual', 'Otra']

const DIAS_SEMANA = [
  { id: 'lunes', label: 'Lunes' },
  { id: 'martes', label: 'Martes' },
  { id: 'miercoles', label: 'Miércoles' },
  { id: 'jueves', label: 'Jueves' },
  { id: 'viernes', label: 'Viernes' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
]

function mondayOf(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toISO(date) {
  return date.toISOString().slice(0, 10)
}

function formatRangoSemana(mondayISO) {
  const inicio = new Date(`${mondayISO}T00:00:00`)
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + 6)
  const fmt = (d) => `${d.getDate()} ${d.toLocaleString('es-ES', { month: 'short' })}`
  return `${fmt(inicio)} – ${fmt(fin)}`
}

function diaVacio() {
  return { tareas: [], revisado: false }
}

function semanaVacia() {
  const dias = {}
  DIAS_SEMANA.forEach((d) => { dias[d.id] = diaVacio() })
  return dias
}

export default function SeguimientoCliente({ cliente, seguimientos, setSeguimientos, onClose }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [tareaDraft, setTareaDraft] = useState({})

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

  const actualizarSemana = (patch) => {
    setSeguimientos((prev) => {
      const existe = prev.some((s) => s.clienteNombre === cliente.Nombre && s.semana === mondayISO)
      if (existe) {
        return prev.map((s) =>
          (s.clienteNombre === cliente.Nombre && s.semana === mondayISO) ? { ...s, ...patch } : s
        )
      }
      return [...prev, {
        clienteNombre: cliente.Nombre,
        semana: mondayISO,
        dias: semanaVacia(),
        comentarios: '',
        ...patch,
      }]
    })
  }

  const addTarea = (diaId) => {
    const bloque = tareaDraft[diaId] || BLOQUES_SESION[0]
    const diaActual = diasActuales[diaId] || diaVacio()
    actualizarSemana({
      dias: { ...diasActuales, [diaId]: { ...diaActual, tareas: [...diaActual.tareas, bloque] } },
    })
  }

  const removeTarea = (diaId, index) => {
    const diaActual = diasActuales[diaId] || diaVacio()
    actualizarSemana({
      dias: { ...diasActuales, [diaId]: { ...diaActual, tareas: diaActual.tareas.filter((_, i) => i !== index) } },
    })
  }

  const toggleRevisado = (diaId) => {
    const diaActual = diasActuales[diaId] || diaVacio()
    actualizarSemana({
      dias: { ...diasActuales, [diaId]: { ...diaActual, revisado: !diaActual.revisado } },
    })
  }

  const setComentarios = (texto) => {
    actualizarSemana({ comentarios: texto })
  }

  return (
    <div className="client-modal-overlay" onClick={onClose}>
      <div className="client-modal seguimiento-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card-header">
          <div>
            <div className="card-title">Seguimiento semanal — {cliente.Nombre}</div>
            <div className="card-subtitle">{(cliente.Trabajadores || []).join(', ') || 'Sin profesional asignado'}</div>
          </div>
          <button className="close-modal-btn" onClick={onClose}>✕</button>
        </div>

        <div className="seguimiento-week-nav">
          <button type="button" className="secondary-action" onClick={() => setWeekOffset((w) => w - 1)}>← Semana anterior</button>
          <strong>Semana del {formatRangoSemana(mondayISO)}{weekOffset === 0 ? ' (actual)' : ''}</strong>
          <button type="button" className="secondary-action" onClick={() => setWeekOffset((w) => w + 1)}>Semana siguiente →</button>
        </div>

        <div className="seguimiento-dias-grid">
          {DIAS_SEMANA.map((dia) => {
            const info = diasActuales[dia.id] || diaVacio()
            return (
              <div key={dia.id} className="seguimiento-dia-card">
                <div className="seguimiento-dia-header">
                  <span>{dia.label}</span>
                  <label className="seguimiento-revisado">
                    <input type="checkbox" checked={info.revisado} onChange={() => toggleRevisado(dia.id)} />
                    Revisado
                  </label>
                </div>
                <div className="seguimiento-tareas-list">
                  {info.tareas.length === 0 && <span className="lead-log-empty">Sin tareas</span>}
                  {info.tareas.map((tarea, i) => (
                    <span key={i} className="seguimiento-tarea-chip">
                      {tarea}
                      <button type="button" onClick={() => removeTarea(dia.id, i)}>✕</button>
                    </span>
                  ))}
                </div>
                <div className="seguimiento-add-tarea">
                  <select
                    value={tareaDraft[dia.id] || BLOQUES_SESION[0]}
                    onChange={(e) => setTareaDraft({ ...tareaDraft, [dia.id]: e.target.value })}
                  >
                    {BLOQUES_SESION.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
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

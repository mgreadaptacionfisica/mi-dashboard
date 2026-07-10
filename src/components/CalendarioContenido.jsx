import { useMemo, useState } from 'react'
import { insertIdeaRemote, updateIdeaRemote, deleteIdeaRemote } from '../lib/queries/contenidoIdeas'

export const REDES_SOCIALES = ['Instagram', 'TikTok', 'Facebook', 'YouTube']
export const FORMATOS_CONTENIDO = ['Reel', 'Carrusel', 'Foto', 'Vídeo corto', 'Vídeo largo']
export const ESTADOS_CONTENIDO = ['Idea', 'Grabado', 'En edición', 'Programado', 'Publicado']

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function todayISO() {
  return toISO(new Date())
}

function celdasDelMes(year, monthIndex) {
  const primerDia = new Date(year, monthIndex, 1)
  const ultimoDia = new Date(year, monthIndex + 1, 0)
  const totalDias = ultimoDia.getDate()
  const offset = (primerDia.getDay() + 6) % 7 // Lunes = 0
  const celdas = []
  for (let i = 0; i < offset; i += 1) celdas.push(null)
  for (let d = 1; d <= totalDias; d += 1) celdas.push(new Date(year, monthIndex, d))
  while (celdas.length % 7 !== 0) celdas.push(null)
  return celdas
}

const ESTADO_CLASS = {
  Idea: 'status-idea',
  Grabado: 'status-grabado',
  'En edición': 'status-pendiente',
  Programado: 'status-programado',
  Publicado: 'status-activo',
}

function MultiSelect({ options, selected, onChange, placeholder = 'Sin seleccionar' }) {
  const [open, setOpen] = useState(false)
  const lista = selected || []

  const toggle = (name) => {
    if (lista.includes(name)) {
      onChange(lista.filter((n) => n !== name))
    } else {
      onChange([...lista, name])
    }
  }

  return (
    <div className="multi-worker-select">
      <button type="button" className="multi-worker-trigger" onClick={() => setOpen((o) => !o)}>
        <span>{lista.length === 0 ? placeholder : lista.join(', ')}</span>
        <span className="multi-worker-caret">▾</span>
      </button>
      {open && (
        <div className="multi-worker-dropdown" onMouseLeave={() => setOpen(false)}>
          {options.length === 0 && <p className="lead-log-empty" style={{ padding: '6px 10px' }}>Sin opciones.</p>}
          {options.map((name) => (
            <label key={name} className="multi-worker-option">
              <input type="checkbox" checked={lista.includes(name)} onChange={() => toggle(name)} />
              {name}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const initialForm = {
  fecha: '',
  titulo: '',
  descripcion: '',
  redes: [],
  formato: FORMATOS_CONTENIDO[0],
  editores: [],
  portadaLista: false,
  estado: ESTADOS_CONTENIDO[0],
}

export default function CalendarioContenido({ ideas = [], setIdeas, equipoContenido = [] }) {
  const hoy = new Date()
  const [vista, setVista] = useState('calendario')
  const [cursor, setCursor] = useState({ year: hoy.getFullYear(), month: hoy.getMonth() })
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(initialForm)

  const editorNames = equipoContenido.map((p) => p.nombre)

  const ideasSinFecha = useMemo(() => ideas.filter((i) => !i.fecha), [ideas])
  const ideasProgramadas = useMemo(() => ideas.filter((i) => !!i.fecha), [ideas])

  const asignarFecha = (id, fechaISO) => {
    if (typeof setIdeas !== 'function') return
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, fecha: fechaISO } : i)))
    updateIdeaRemote(id, { fecha: fechaISO })
  }

  const celdas = useMemo(() => celdasDelMes(cursor.year, cursor.month), [cursor])
  const mesKey = `${cursor.year}-${pad2(cursor.month + 1)}`

  const ideasPorDia = useMemo(() => {
    const mapa = {}
    ideas.forEach((idea) => {
      mapa[idea.fecha] = mapa[idea.fecha] || []
      mapa[idea.fecha].push(idea)
    })
    return mapa
  }, [ideas])

  const ideasDelMes = useMemo(() => ideas.filter((i) => (i.fecha || '').startsWith(mesKey)), [ideas, mesKey])

  const stats = useMemo(() => ({
    total: ideasDelMes.length,
    publicadas: ideasDelMes.filter((i) => i.estado === 'Publicado').length,
    pendientes: ideasDelMes.filter((i) => i.estado !== 'Publicado').length,
    sinPortada: ideasDelMes.filter((i) => !i.portadaLista).length,
  }), [ideasDelMes])

  const irMesAnterior = () => {
    setCursor((c) => {
      const m = c.month === 0 ? 11 : c.month - 1
      const y = c.month === 0 ? c.year - 1 : c.year
      return { year: y, month: m }
    })
  }

  const irMesSiguiente = () => {
    setCursor((c) => {
      const m = c.month === 11 ? 0 : c.month + 1
      const y = c.month === 11 ? c.year + 1 : c.year
      return { year: y, month: m }
    })
  }

  const openNew = (fechaISO) => {
    setEditingId(null)
    setFormData({ ...initialForm, fecha: fechaISO || '' })
    setShowForm(true)
  }

  const openEdit = (idea) => {
    setEditingId(idea.id)
    setFormData({
      fecha: idea.fecha,
      titulo: idea.titulo || '',
      descripcion: idea.descripcion || '',
      redes: idea.redes || [],
      formato: idea.formato || FORMATOS_CONTENIDO[0],
      editores: idea.editores || [],
      portadaLista: !!idea.portadaLista,
      estado: idea.estado || ESTADOS_CONTENIDO[0],
    })
    setShowForm(true)
  }

  const eliminar = (id) => {
    if (typeof setIdeas !== 'function') return
    setIdeas((prev) => prev.filter((i) => i.id !== id))
    deleteIdeaRemote(id)
    setShowForm(false)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (typeof setIdeas !== 'function') return
    if (editingId) {
      const patch = { ...formData, titulo: formData.titulo.trim() }
      setIdeas((prev) => prev.map((i) => (i.id === editingId ? { ...i, ...patch } : i)))
      updateIdeaRemote(editingId, patch)
    } else {
      const nueva = {
        id: `contenido-${Date.now()}`,
        ...formData,
        titulo: formData.titulo.trim(),
      }
      setIdeas((prev) => [...prev, nueva])
      insertIdeaRemote(nueva)
    }
    setShowForm(false)
    setEditingId(null)
    setFormData(initialForm)
  }

  return (
    <>
      <div className="tabs-bar">
        <button type="button" className={`tab-btn ${vista === 'calendario' ? 'tab-btn-active' : ''}`} onClick={() => setVista('calendario')}>
          📅 Calendario
        </button>
        <button type="button" className={`tab-btn ${vista === 'listado' ? 'tab-btn-active' : ''}`} onClick={() => setVista('listado')}>
          📝 Listado de ideas ({ideasSinFecha.length})
        </button>
      </div>

      {vista === 'calendario' && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Ideas este mes</span>
                <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>🗓️</div>
              </div>
              <div className="kpi-card-value">{stats.total}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Publicadas</span>
                <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>✅</div>
              </div>
              <div className="kpi-card-value">{stats.publicadas}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Pendientes</span>
                <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>⏳</div>
              </div>
              <div className="kpi-card-value">{stats.pendientes}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Sin portada/miniatura</span>
                <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>🖼️</div>
              </div>
              <div className="kpi-card-value">{stats.sinPortada}</div>
            </div>
          </div>

          <div className="table-card">
            <div className="card-header">
              <div>
                <div className="card-title">{NOMBRES_MES[cursor.month]} {cursor.year}</div>
                <div className="card-subtitle">Calendario de contenido</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="secondary-action" onClick={irMesAnterior}>← Mes anterior</button>
                <button type="button" className="secondary-action" onClick={irMesSiguiente}>Mes siguiente →</button>
                <button type="button" className="add-client-btn" onClick={() => openNew(todayISO())}>＋ Añadir idea</button>
              </div>
            </div>

            <div className="calendario-contenido-grid">
              {DIAS_SEMANA_CORTO.map((dia) => (
                <div key={dia} className="calendario-contenido-diasemana">{dia}</div>
              ))}
              {celdas.map((fecha, index) => {
                if (!fecha) return <div key={`vacio-${index}`} className="calendario-contenido-celda calendario-contenido-celda-vacia" />
                const iso = toISO(fecha)
                const ideasDia = ideasPorDia[iso] || []
                const esHoy = iso === todayISO()
                return (
                  <div key={iso} className={`calendario-contenido-celda ${esHoy ? 'calendario-contenido-hoy' : ''}`}>
                    <div className="calendario-contenido-celda-header">
                      <span>{fecha.getDate()}</span>
                      <button type="button" className="calendario-contenido-add" onClick={() => openNew(iso)}>＋</button>
                    </div>
                    <div className="calendario-contenido-ideas">
                      {ideasDia.map((idea) => (
                        <button
                          key={idea.id}
                          type="button"
                          className="calendario-contenido-chip"
                          onClick={() => openEdit(idea)}
                          title={idea.titulo}
                        >
                          <span className={`status-pill ${ESTADO_CLASS[idea.estado] || 'status-idea'}`} style={{ padding: '1px 6px', fontSize: 10 }}>
                            {idea.estado}
                          </span>
                          <span className="calendario-contenido-chip-titulo">{idea.titulo || 'Sin título'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {vista === 'listado' && (
        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">Listado de ideas</div>
              <div className="card-subtitle">{ideasSinFecha.length} sin fecha asignada · {ideasProgramadas.length} ya programadas</div>
            </div>
            <button type="button" className="add-client-btn" onClick={() => openNew()}>＋ Añadir idea</button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Redes</th>
                  <th>Formato</th>
                  <th>Estado</th>
                  <th>Editores</th>
                  <th>Asignar fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ideasSinFecha.map((idea) => (
                  <tr key={idea.id}>
                    <td style={{ fontWeight: 600 }}>{idea.titulo || 'Sin título'}</td>
                    <td>{(idea.redes || []).join(', ') || '—'}</td>
                    <td>{idea.formato || '—'}</td>
                    <td><span className={`status-pill ${ESTADO_CLASS[idea.estado] || 'status-idea'}`}>{idea.estado}</span></td>
                    <td>{(idea.editores || []).join(', ') || '—'}</td>
                    <td>
                      <input
                        type="date"
                        onChange={(e) => asignarFecha(idea.id, e.target.value)}
                      />
                    </td>
                    <td>
                      <button type="button" className="row-action-btn" onClick={() => openEdit(idea)}>Editar</button>
                      <button type="button" className="row-action-btn" onClick={() => eliminar(idea.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {ideasSinFecha.length === 0 && (
                  <tr><td colSpan={7} className="lead-log-empty">Sin ideas pendientes de programar. Añade alguna con "＋ Añadir idea".</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="client-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="client-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{editingId ? 'Editar idea de contenido' : 'Nueva idea de contenido'}</div>
                <div className="card-subtitle">Calendario de contenido</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <label className="lead-detail-label">Fecha (opcional — puedes dejarla sin poner y asignarla luego desde el Listado de ideas)</label>
              <input type="date" value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} />

              <input required placeholder="Título" value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} />

              <textarea rows={3} placeholder="Descripción de la idea" value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} />

              <label className="lead-detail-label">Red social</label>
              <MultiSelect options={REDES_SOCIALES} selected={formData.redes}
                onChange={(nuevas) => setFormData({ ...formData, redes: nuevas })} placeholder="Sin red asignada" />

              <label className="lead-detail-label">Formato</label>
              <select value={formData.formato} onChange={(e) => setFormData({ ...formData, formato: e.target.value })}>
                {FORMATOS_CONTENIDO.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>

              <label className="lead-detail-label">Editor(es) de vídeo</label>
              <MultiSelect options={editorNames} selected={formData.editores}
                onChange={(nuevos) => setFormData({ ...formData, editores: nuevos })} placeholder="Sin editor asignado" />

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={formData.portadaLista}
                  onChange={(e) => setFormData({ ...formData, portadaLista: e.target.checked })} />
                Portada / miniatura ya hecha
              </label>

              <label className="lead-detail-label">Estado</label>
              <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })}>
                {ESTADOS_CONTENIDO.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>

              <div className="modal-actions">
                {editingId && (
                  <button type="button" className="danger-action" onClick={() => eliminar(editingId)}>Eliminar</button>
                )}
                <button type="button" className="secondary-action" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar idea</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

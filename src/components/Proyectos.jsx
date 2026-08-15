import { useMemo, useState } from 'react'
import { insertProyectoRemote, updateProyectoRemote, deleteProyectoRemote } from '../lib/queries/proyectos'
import { insertProyectoPasoRemote, updateProyectoPasoRemote, deleteProyectoPasoRemote } from '../lib/queries/proyectoPasos'

// "Proyectos": herramienta de organización solo para admin (ver
// SECCIONES_POR_ROL en lib/auth.js), al estilo de "Enlaces de interés".
// Cada proyecto se parte en pasos con checkbox y el avance se ve de un
// vistazo con una barra.
//
// Decisión importante: el % de avance NO se guarda en ningún sitio, se
// calcula siempre con pasos hechos ÷ pasos totales. Así no puede quedarse
// desincronizado con la realidad (que es lo que pasa siempre que se deja
// un "% completado" a mano), y marcar un paso actualiza la barra solo.

const PRIORIDADES = [
  { id: 'alta', label: 'Alta' },
  { id: 'media', label: 'Media' },
  { id: 'baja', label: 'Baja' },
]

const ESTADOS = [
  { id: 'planificado', label: 'Planificado', clase: 'status-idea' },
  { id: 'en_curso', label: 'En curso', clase: 'status-pendiente' },
  { id: 'completado', label: 'Completado', clase: 'status-activo' },
]

const AMBITOS = [
  { id: 'profesional', label: 'Profesional' },
  { id: 'personal', label: 'Personal' },
]

const initialForm = {
  nombre: '',
  descripcion: '',
  fechaObjetivo: '',
  prioridad: 'media',
  estado: 'planificado',
  ambito: 'profesional',
}

const initialPaso = { texto: '', prioridad: '', fecha: '' }

function etiquetaEstado(id) {
  return ESTADOS.find((e) => e.id === id) || ESTADOS[0]
}

function etiquetaPrioridad(id) {
  return (PRIORIDADES.find((p) => p.id === id) || {}).label || ''
}

function formatFecha(iso) {
  if (!iso) return null
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Proyectos({ proyectos = [], setProyectos, pasos = [], setPasos }) {
  const [filtroAmbito, setFiltroAmbito] = useState('todos')
  const [abiertoId, setAbiertoId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(initialForm)
  const [nuevoPaso, setNuevoPaso] = useState(initialPaso)
  const hoy = todayISO()

  // Pasos agrupados por proyecto una sola vez, para no recorrer la lista
  // entera dentro del map de tarjetas (son pocos datos, pero así el avance
  // de cada tarjeta se lee directo).
  const pasosPorProyecto = useMemo(() => {
    const mapa = {}
    pasos.forEach((p) => {
      if (!mapa[p.proyectoId]) mapa[p.proyectoId] = []
      mapa[p.proyectoId].push(p)
    })
    Object.values(mapa).forEach((lista) => lista.sort((a, b) => (a.orden || 0) - (b.orden || 0)))
    return mapa
  }, [pasos])

  // Avance calculado: pasos hechos ÷ totales. Un proyecto sin pasos se
  // queda a 0% (no a 100%), que es lo que se espera al crearlo.
  const avanceDe = (proyectoId) => {
    const lista = pasosPorProyecto[proyectoId] || []
    if (lista.length === 0) return { hechos: 0, total: 0, pct: 0 }
    const hechos = lista.filter((p) => p.hecho).length
    return { hechos, total: lista.length, pct: Math.round((hechos / lista.length) * 100) }
  }

  const proyectosVisibles = useMemo(() => {
    const lista = filtroAmbito === 'todos' ? proyectos : proyectos.filter((p) => p.ambito === filtroAmbito)
    // Los completados al final; dentro de cada grupo, la prioridad alta primero.
    const pesoPrioridad = { alta: 0, media: 1, baja: 2 }
    return [...lista].sort((a, b) => {
      const compA = a.estado === 'completado' ? 1 : 0
      const compB = b.estado === 'completado' ? 1 : 0
      if (compA !== compB) return compA - compB
      return (pesoPrioridad[a.prioridad] ?? 1) - (pesoPrioridad[b.prioridad] ?? 1)
    })
  }, [proyectos, filtroAmbito])

  // Los KPIs se calculan sobre lo que hay en pantalla (respetan el filtro
  // de ámbito), para que "avance medio" signifique lo mismo que la lista
  // que se está viendo debajo.
  const kpis = useMemo(() => {
    const activos = proyectosVisibles.filter((p) => p.estado !== 'completado')
    const completados = proyectosVisibles.filter((p) => p.estado === 'completado').length
    const alta = activos.filter((p) => p.prioridad === 'alta').length
    const avances = activos.map((p) => avanceDe(p.id).pct)
    const medio = avances.length ? Math.round(avances.reduce((s, n) => s + n, 0) / avances.length) : 0
    return { activos: activos.length, medio, alta, completados }
  }, [proyectosVisibles, pasosPorProyecto])

  const openNew = () => {
    setEditingId(null)
    // Si hay un filtro de ámbito puesto, el proyecto nuevo nace en ese
    // ámbito — evita crearlo en "profesional" y no verlo aparecer.
    setFormData({ ...initialForm, ambito: filtroAmbito === 'todos' ? 'profesional' : filtroAmbito })
    setShowForm(true)
  }

  const openEdit = (proyecto) => {
    setEditingId(proyecto.id)
    setFormData({
      nombre: proyecto.nombre || '',
      descripcion: proyecto.descripcion || '',
      fechaObjetivo: proyecto.fechaObjetivo || '',
      prioridad: proyecto.prioridad || 'media',
      estado: proyecto.estado || 'planificado',
      ambito: proyecto.ambito || 'profesional',
    })
    setShowForm(true)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (typeof setProyectos !== 'function') return
    const patch = {
      nombre: formData.nombre.trim(),
      descripcion: formData.descripcion.trim(),
      fechaObjetivo: formData.fechaObjetivo || null,
      prioridad: formData.prioridad,
      estado: formData.estado,
      ambito: formData.ambito,
    }
    if (editingId) {
      setProyectos((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...patch } : p)))
      updateProyectoRemote(editingId, patch)
    } else {
      const nuevo = { id: `proyecto-${Date.now()}`, ...patch }
      setProyectos((prev) => [...prev, nuevo])
      insertProyectoRemote(nuevo)
    }
    setShowForm(false)
    setEditingId(null)
    setFormData(initialForm)
  }

  const eliminarProyecto = (proyecto) => {
    if (typeof setProyectos !== 'function') return
    if (!window.confirm(`¿Eliminar el proyecto "${proyecto.nombre}" y todos sus pasos?`)) return
    setProyectos((prev) => prev.filter((p) => p.id !== proyecto.id))
    // Los pasos se borran solos en Supabase (on delete cascade); aquí se
    // quitan del estado local para que la pantalla quede coherente.
    if (typeof setPasos === 'function') setPasos((prev) => prev.filter((p) => p.proyectoId !== proyecto.id))
    deleteProyectoRemote(proyecto.id)
    setAbiertoId((prev) => (prev === proyecto.id ? null : prev))
  }

  const togglePaso = (paso) => {
    if (typeof setPasos !== 'function') return
    const hecho = !paso.hecho
    setPasos((prev) => prev.map((p) => (p.id === paso.id ? { ...p, hecho } : p)))
    updateProyectoPasoRemote(paso.id, { hecho })
  }

  const eliminarPaso = (paso) => {
    if (typeof setPasos !== 'function') return
    setPasos((prev) => prev.filter((p) => p.id !== paso.id))
    deleteProyectoPasoRemote(paso.id)
  }

  const agregarPaso = (event, proyectoId) => {
    event.preventDefault()
    if (typeof setPasos !== 'function' || !nuevoPaso.texto.trim()) return
    const lista = pasosPorProyecto[proyectoId] || []
    const paso = {
      id: `paso-${Date.now()}`,
      proyectoId,
      texto: nuevoPaso.texto.trim(),
      hecho: false,
      prioridad: nuevoPaso.prioridad || null,
      fecha: nuevoPaso.fecha || null,
      orden: lista.length ? Math.max(...lista.map((p) => p.orden || 0)) + 1 : 0,
    }
    setPasos((prev) => [...prev, paso])
    insertProyectoPasoRemote(paso)
    setNuevoPaso(initialPaso)
  }

  const abrirProyecto = (id) => {
    setAbiertoId((prev) => (prev === id ? null : id))
    setNuevoPaso(initialPaso)
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Proyectos</div>
          <div className="topbar-subtitle">Tus proyectos, partidos en pasos, con el avance a la vista</div>
        </div>
      </header>

      <main className="page-content">
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card-header"><span className="kpi-card-label">Proyectos activos</span></div>
            <div className="kpi-card-value">{kpis.activos}</div>
            <div className="kpi-card-footer"><span className="badge-text">Sin contar los completados</span></div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header"><span className="kpi-card-label">Avance medio</span></div>
            <div className="kpi-card-value">{kpis.medio}%</div>
            <div className="kpi-card-footer"><span className="badge-text">Media de los activos</span></div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header"><span className="kpi-card-label">Prioridad alta</span></div>
            <div className="kpi-card-value">{kpis.alta}</div>
            <div className="kpi-card-footer"><span className="badge-text">Lo que va primero</span></div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header"><span className="kpi-card-label">Completados</span></div>
            <div className="kpi-card-value">{kpis.completados}</div>
            <div className="kpi-card-footer"><span className="badge-text">Ya cerrados</span></div>
          </div>
        </section>

        <div className="table-card" style={{ marginTop: 18 }}>
          <div className="card-header" style={{ flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div className="card-title">Mis proyectos</div>
              <div className="card-subtitle">{proyectosVisibles.length} proyecto{proyectosVisibles.length === 1 ? '' : 's'} en esta vista</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="seguimiento-filtro-chips">
                <button type="button" className={`period-btn ${filtroAmbito === 'todos' ? 'active' : ''}`} onClick={() => setFiltroAmbito('todos')}>
                  Todos
                </button>
                {AMBITOS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`period-btn ${filtroAmbito === a.id ? 'active' : ''}`}
                    onClick={() => setFiltroAmbito(a.id)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <button type="button" className="add-client-btn" onClick={openNew}>＋ Nuevo proyecto</button>
            </div>
          </div>

          <div className="proyectos-lista">
            {proyectosVisibles.length === 0 && (
              <div className="lead-log-empty">
                {filtroAmbito === 'todos' ? 'Todavía no has creado ningún proyecto.' : 'No hay proyectos en este ámbito.'}
              </div>
            )}

            {proyectosVisibles.map((proyecto) => {
              const { hechos, total, pct } = avanceDe(proyecto.id)
              const estado = etiquetaEstado(proyecto.estado)
              const abierto = abiertoId === proyecto.id
              const listaPasos = pasosPorProyecto[proyecto.id] || []
              const vencido = proyecto.fechaObjetivo && proyecto.fechaObjetivo < hoy && proyecto.estado !== 'completado'
              return (
                <article key={proyecto.id} className={`proyecto-card ${abierto ? 'proyecto-card-abierta' : ''}`}>
                  <div className="proyecto-card-head">
                    <button type="button" className="proyecto-card-titulo" onClick={() => abrirProyecto(proyecto.id)}>
                      <span
                        className={`proyecto-semaforo proyecto-semaforo-${proyecto.prioridad || 'media'}`}
                        title={`Prioridad ${etiquetaPrioridad(proyecto.prioridad).toLowerCase()}`}
                      />
                      <strong>{proyecto.nombre || 'Sin nombre'}</strong>
                      <span className={`status-pill ${estado.clase}`}>{estado.label}</span>
                      <span className="proyecto-ambito">{proyecto.ambito === 'personal' ? 'Personal' : 'Profesional'}</span>
                    </button>
                    <div className="proyecto-card-acciones">
                      <button type="button" className="row-action-btn" onClick={() => abrirProyecto(proyecto.id)}>
                        {abierto ? 'Cerrar' : `Pasos (${total})`}
                      </button>
                      <button type="button" className="row-action-btn" onClick={() => openEdit(proyecto)}>Editar</button>
                      <button type="button" className="row-action-btn" onClick={() => eliminarProyecto(proyecto)}>Eliminar</button>
                    </div>
                  </div>

                  {proyecto.descripcion && <p className="proyecto-descripcion">{proyecto.descripcion}</p>}

                  <div className="proyecto-meta">
                    {proyecto.fechaObjetivo && (
                      <span className={vencido ? 'proyecto-fecha-vencida' : ''}>
                        🎯 Objetivo: {formatFecha(proyecto.fechaObjetivo)}{vencido ? ' · fecha pasada' : ''}
                      </span>
                    )}
                    <span>{total === 0 ? 'Sin pasos todavía' : `${hechos} de ${total} pasos`}</span>
                  </div>

                  <div className="proyecto-progreso">
                    <div className="proyecto-progreso-barra">
                      <div className="proyecto-progreso-relleno" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="proyecto-progreso-pct">{pct}%</span>
                  </div>

                  {abierto && (
                    <div className="proyecto-pasos">
                      {listaPasos.length === 0 && <div className="lead-log-empty">Este proyecto todavía no tiene pasos.</div>}
                      {listaPasos.map((paso) => (
                        <div key={paso.id} className={`proyecto-paso ${paso.hecho ? 'proyecto-paso-hecho' : ''}`}>
                          <label className="proyecto-paso-check">
                            <input type="checkbox" checked={paso.hecho} onChange={() => togglePaso(paso)} />
                            <span>{paso.texto}</span>
                          </label>
                          <div className="proyecto-paso-meta">
                            {paso.prioridad && (
                              <span
                                className={`proyecto-semaforo proyecto-semaforo-${paso.prioridad}`}
                                title={`Prioridad ${etiquetaPrioridad(paso.prioridad).toLowerCase()}`}
                              />
                            )}
                            {paso.fecha && <span className="proyecto-paso-fecha">{formatFecha(paso.fecha)}</span>}
                            <button type="button" className="row-action-btn" onClick={() => eliminarPaso(paso)}>✕</button>
                          </div>
                        </div>
                      ))}

                      <form className="proyecto-paso-form" onSubmit={(e) => agregarPaso(e, proyecto.id)}>
                        <input
                          placeholder="Añadir un paso…"
                          value={nuevoPaso.texto}
                          onChange={(e) => setNuevoPaso({ ...nuevoPaso, texto: e.target.value })}
                        />
                        <select value={nuevoPaso.prioridad} onChange={(e) => setNuevoPaso({ ...nuevoPaso, prioridad: e.target.value })}>
                          <option value="">Prioridad (opcional)</option>
                          {PRIORIDADES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                        <input type="date" value={nuevoPaso.fecha} onChange={(e) => setNuevoPaso({ ...nuevoPaso, fecha: e.target.value })} />
                        <button type="submit" className="add-client-btn">＋ Añadir</button>
                      </form>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </main>

      {showForm && (
        <div className="client-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="client-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{editingId ? 'Editar proyecto' : 'Nuevo proyecto'}</div>
                <div className="card-subtitle">El avance se calcula solo con los pasos que marques</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <input required placeholder="Nombre del proyecto" value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
              <textarea rows={3} placeholder="Descripción: qué es y para qué (opcional)" value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                style={{ fontFamily: 'inherit', resize: 'vertical' }} />
              <label className="proyecto-form-label">
                Fecha objetivo
                <input type="date" value={formData.fechaObjetivo}
                  onChange={(e) => setFormData({ ...formData, fechaObjetivo: e.target.value })} />
              </label>
              <select value={formData.prioridad} onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}>
                {PRIORIDADES.map((p) => <option key={p.id} value={p.id}>Prioridad: {p.label}</option>)}
              </select>
              <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })}>
                {ESTADOS.map((e2) => <option key={e2.id} value={e2.id}>Estado: {e2.label}</option>)}
              </select>
              <select value={formData.ambito} onChange={(e) => setFormData({ ...formData, ambito: e.target.value })}>
                {AMBITOS.map((a) => <option key={a.id} value={a.id}>Ámbito: {a.label}</option>)}
              </select>
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

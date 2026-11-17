import { useMemo, useState } from 'react'
import { insertIdeaRemote, insertIdeasRemote, updateIdeaRemote, deleteIdeaRemote } from '../lib/queries/contenidoIdeas'
import {
  FORMATO_LARGO,
  FORMATO_CORTE,
  FORMATO_HISTORIAS,
  NUM_CORTES,
  SEMANA_HISTORIAS,
  coberturaDia,
  crearCortes,
  diferenciaDias,
  distribuirIdeas,
  huecoDeIdea,
  ordenarBanco,
  sumarDias,
} from '../utils/distribuirContenido'

export const REDES_SOCIALES = ['Instagram', 'TikTok', 'Facebook', 'YouTube']
// '' = «Sin decidir»: el reparto automático la pone donde haya hueco (largo o Reel).
export const FORMATOS_CONTENIDO = ['Reel', FORMATO_CORTE, FORMATO_HISTORIAS, 'Carrusel', 'Foto', 'Vídeo corto', FORMATO_LARGO]
export const ESTADOS_CONTENIDO = ['Idea', 'Grabado', 'En edición', 'Editado', 'Programado', 'Publicado']

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const DIAS_SEMANA_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const DIAS_SEMANA_GETDAY = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const ETIQUETA_HUECO = {
  largo: '▶️ YouTube · vídeo largo',
  corte: '✂️ Short + Reel (corte)',
  vertical: '📱 Reel + Short',
  historias: '⭕ Historias',
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function todayISO() {
  return toISO(new Date())
}

function fechaCorta(iso) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  const dia = DIAS_SEMANA_GETDAY[new Date(y, m - 1, d).getDay()]
  return `${dia} ${pad2(d)}/${pad2(m)}`
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
  Editado: 'status-editado',
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

// Las tres piezas diarias del ritmo: verde = cubierto, gris = falta.
function CoberturaDia({ ideasDia }) {
  const cob = coberturaDia(ideasDia)
  const items = [
    ['youtube', 'YT', 'YouTube (vídeo largo o Short)'],
    ['instagram', 'IG', 'Reel de Instagram'],
    ['historias', 'H', 'Historias'],
  ]
  return (
    <span className="cobertura-dia">
      {items.map(([clave, texto, titulo]) => (
        <span
          key={clave}
          className={`cobertura-dia-item ${cob[clave] ? 'cobertura-dia-ok' : ''}`}
          title={`${titulo}: ${cob[clave] ? 'cubierto' : 'falta'}`}
        >
          {texto}
        </span>
      ))}
    </span>
  )
}

const initialForm = {
  fecha: '',
  titulo: '',
  descripcion: '',
  redes: [],
  formato: '',
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
  const [showReparto, setShowReparto] = useState(false)
  const [reparto, setReparto] = useState({ desde: sumarDias(todayISO(), 1), semanas: 4, rellenarHistorias: true })

  const editorNames = equipoContenido.map((p) => p.nombre)

  const ideasSinFecha = useMemo(() => ideas.filter((i) => !i.fecha).sort(ordenarBanco), [ideas])
  const ideasProgramadas = useMemo(() => ideas.filter((i) => !!i.fecha), [ideas])

  const planReparto = useMemo(
    () => (showReparto && reparto.desde ? distribuirIdeas({ ideas, ...reparto }) : { plan: [], sobrantes: 0 }),
    [showReparto, reparto, ideas]
  )

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

  const stats = useMemo(() => {
    const diasMes = celdas.filter(Boolean).map(toISO)
    const diasCompletos = diasMes.filter((iso) => {
      const cob = coberturaDia(ideasPorDia[iso])
      return cob.youtube && cob.instagram && cob.historias
    }).length
    return {
      total: ideasDelMes.length,
      publicadas: ideasDelMes.filter((i) => i.estado === 'Publicado').length,
      pendientes: ideasDelMes.filter((i) => i.estado !== 'Publicado').length,
      sinPortada: ideasDelMes.filter((i) => !i.portadaLista).length,
      diasCompletos,
      diasMes: diasMes.length,
    }
  }, [ideasDelMes, celdas, ideasPorDia])

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
      formato: idea.formato || '',
      editores: idea.editores || [],
      portadaLista: !!idea.portadaLista,
      estado: idea.estado || ESTADOS_CONTENIDO[0],
    })
    setShowForm(true)
  }

  // Al borrar un vídeo largo se ofrece borrar también sus cortes no publicados,
  // para que no queden Shorts/Reels huérfanos en el calendario.
  const eliminar = (id) => {
    if (typeof setIdeas !== 'function') return
    const cortes = ideas.filter((i) => i.origenId === id && i.estado !== 'Publicado')
    const borrarCortes = cortes.length > 0
      && window.confirm(`Este vídeo tiene ${cortes.length} corte(s) sin publicar. ¿Los borro también?`)
    const ids = new Set([id, ...(borrarCortes ? cortes.map((c) => c.id) : [])])
    setIdeas((prev) => prev.filter((i) => !ids.has(i.id)))
    ids.forEach((x) => deleteIdeaRemote(x))
    setShowForm(false)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (typeof setIdeas !== 'function') return
    if (editingId) {
      const patch = { ...formData, titulo: formData.titulo.trim() }
      const anterior = ideas.find((i) => i.id === editingId)
      // Si un vídeo largo cambia de fecha, sus cortes pendientes se mueven los
      // mismos días para mantener el +0/+1/+2.
      const delta = anterior?.fecha && patch.fecha ? diferenciaDias(anterior.fecha, patch.fecha) : 0
      const cortesAMover = delta !== 0
        ? ideas.filter((i) => i.origenId === editingId && i.fecha && i.estado !== 'Publicado')
        : []
      const nuevasFechas = new Map(cortesAMover.map((c) => [c.id, sumarDias(c.fecha, delta)]))
      setIdeas((prev) => prev.map((i) => {
        if (i.id === editingId) return { ...i, ...patch }
        if (nuevasFechas.has(i.id)) return { ...i, fecha: nuevasFechas.get(i.id) }
        return i
      }))
      updateIdeaRemote(editingId, patch)
      nuevasFechas.forEach((fecha, id) => updateIdeaRemote(id, { fecha }))
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

  const crearCortesDe = (largoId) => {
    if (typeof setIdeas !== 'function') return
    const largo = ideas.find((i) => i.id === largoId)
    if (!largo?.fecha) return
    const nuevos = crearCortes(largo).filter((c) => !ideas.some((i) => i.id === c.id))
    if (nuevos.length === 0) return
    setIdeas((prev) => [...prev, ...nuevos])
    insertIdeasRemote(nuevos)
  }

  const guardarReparto = () => {
    if (typeof setIdeas !== 'function') return
    const { plan } = planReparto
    const asignadas = plan.filter((p) => p.accion === 'asignar').map((p) => p.idea)
    const nuevas = plan.filter((p) => p.accion === 'nuevo').map((p) => p.idea)
    const porId = new Map(asignadas.map((i) => [i.id, i]))
    setIdeas((prev) => {
      const existentes = new Set(prev.map((i) => i.id))
      return [...prev.map((i) => porId.get(i.id) || i), ...nuevas.filter((n) => !existentes.has(n.id))]
    })
    asignadas.forEach((i) => updateIdeaRemote(i.id, { fecha: i.fecha, formato: i.formato, redes: i.redes }))
    insertIdeasRemote(nuevas)
    setShowReparto(false)
    if (plan.length > 0) {
      const [y, m] = plan[0].idea.fecha.split('-').map(Number)
      setCursor({ year: y, month: m - 1 })
      setVista('calendario')
    }
  }

  const ideaEditando = editingId ? ideas.find((i) => i.id === editingId) : null
  const cortesDeEditando = editingId ? ideas.filter((i) => i.origenId === editingId).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '')) : []
  const largoDeEditando = ideaEditando?.origenId ? ideas.find((i) => i.id === ideaEditando.origenId) : null

  const botonDistribuir = (
    <button type="button" className="secondary-action" onClick={() => setShowReparto(true)}>🪄 Distribuir ideas</button>
  )

  return (
    <>
      <div className="tabs-bar">
        <button type="button" className={`tab-btn ${vista === 'calendario' ? 'tab-btn-active' : ''}`} onClick={() => setVista('calendario')}>
          📅 Calendario
        </button>
        <button type="button" className={`tab-btn ${vista === 'listado' ? 'tab-btn-active' : ''}`} onClick={() => setVista('listado')}>
          📝 Listado de ideas ({ideasSinFecha.length})
        </button>
        <button type="button" className={`tab-btn ${vista === 'historias' ? 'tab-btn-active' : ''}`} onClick={() => setVista('historias')}>
          ⭕ Semana de historias
        </button>
      </div>

      {vista === 'calendario' && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Días completos (YT + IG + historias)</span>
                <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>📆</div>
              </div>
              <div className="kpi-card-value">{stats.diasCompletos}/{stats.diasMes}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-header">
                <span className="kpi-card-label">Piezas este mes</span>
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
                <div className="card-subtitle">
                  Ritmo: YouTube largo martes y viernes · Short + Reel cada día · historias cada día
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="secondary-action" onClick={irMesAnterior}>← Mes anterior</button>
                <button type="button" className="secondary-action" onClick={irMesSiguiente}>Mes siguiente →</button>
                {botonDistribuir}
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
                const ideasDia = (ideasPorDia[iso] || []).slice().sort((a, b) => {
                  const orden = { largo: 0, vertical: 1, historias: 2 }
                  return (orden[huecoDeIdea(a)] ?? 3) - (orden[huecoDeIdea(b)] ?? 3)
                })
                const esHoy = iso === todayISO()
                return (
                  <div key={iso} className={`calendario-contenido-celda ${esHoy ? 'calendario-contenido-hoy' : ''}`}>
                    <div className="calendario-contenido-celda-header">
                      <span>{fecha.getDate()}</span>
                      <CoberturaDia ideasDia={ideasDia} />
                      <button type="button" className="calendario-contenido-add" onClick={() => openNew(iso)}>＋</button>
                    </div>
                    <div className="calendario-contenido-ideas">
                      {ideasDia.map((idea) => (
                        <button
                          key={idea.id}
                          type="button"
                          className="calendario-contenido-chip"
                          onClick={() => openEdit(idea)}
                          title={`${idea.formato ? `${idea.formato} · ` : ''}${idea.titulo}`}
                        >
                          <span className={`status-pill ${ESTADO_CLASS[idea.estado] || 'status-idea'}`} style={{ padding: '1px 6px', fontSize: 10 }}>
                            {idea.estado}
                          </span>
                          <span className="calendario-contenido-chip-titulo">
                            {idea.formato === FORMATO_LARGO ? '▶️ ' : ''}{idea.titulo || 'Sin título'}
                          </span>
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

      {vista === 'historias' && (
        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">Semana de historias</div>
              <div className="card-subtitle">
                Qué objetivo tiene cada día y cómo repartir las historias. La idea concreta la pones tú ese día.
                Al usar «🪄 Distribuir ideas», cada día de historias se crea con esto ya escrito.
              </div>
            </div>
          </div>
          <div className="semana-historias">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const h = SEMANA_HISTORIAS[d]
              return (
                <div key={d} className="semana-historias-dia">
                  <div className="semana-historias-cab">
                    <strong>{h.dia}</strong>
                    <span className="status-pill status-programado">{h.objetivo}</span>
                  </div>
                  <p className="semana-historias-para">{h.para}</p>
                  <p className="semana-historias-cuantas">{h.cuantas} historias</p>
                  <ul>
                    {h.reparto.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              )
            })}
          </div>
          <div className="reparto-explicacion" style={{ marginTop: 14 }}>
            <strong>Reglas para todos los días:</strong> la 1.ª historia en vídeo y con texto grande (es donde más gente se va);
            la última siempre pide algo (encuesta, pregunta o «escríbeme»); mejor 3-5 bien hechas que 10 seguidas.
          </div>
        </div>
      )}

      {vista === 'listado' && (
        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">Listado de ideas</div>
              <div className="card-subtitle">
                {ideasSinFecha.length} sin fecha asignada · {ideasProgramadas.length} ya programadas · «Distribuir ideas» las reparte en este orden
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {botonDistribuir}
              <button type="button" className="add-client-btn" onClick={() => openNew()}>＋ Añadir idea</button>
            </div>
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
                    <td>{idea.formato || 'Sin decidir'}</td>
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

      {showReparto && (
        <div className="client-modal-overlay" onClick={() => setShowReparto(false)}>
          <div className="client-modal client-modal-ancho" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">🪄 Distribuir ideas</div>
                <div className="card-subtitle">
                  Reparte las ideas sin fecha en los huecos libres. No se guarda nada hasta que pulses «Guardar en el calendario».
                </div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowReparto(false)}>✕</button>
            </div>
            <div className="modal-form">
              <p className="reparto-explicacion">
                Martes y viernes → <strong>vídeo largo</strong> de YouTube, con {NUM_CORTES} cortes (Short + Reel) ese día y los dos siguientes.
                Los días sin corte → una idea de <strong>Reel + Short</strong>. Cada día → <strong>historias</strong>.
                Las ideas «Sin decidir» ocupan el primer hueco libre de largo o de Reel.
              </p>
              <div className="reparto-opciones">
                <label className="lead-detail-label">
                  Desde
                  <input type="date" value={reparto.desde} onChange={(e) => setReparto({ ...reparto, desde: e.target.value })} />
                </label>
                <label className="lead-detail-label">
                  Semanas
                  <select value={reparto.semanas} onChange={(e) => setReparto({ ...reparto, semanas: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 6, 8, 12].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={reparto.rellenarHistorias}
                    onChange={(e) => setReparto({ ...reparto, rellenarHistorias: e.target.checked })} />
                  Rellenar las historias con la temática del día
                </label>
              </div>

              <div className="table-wrapper" style={{ maxHeight: '45vh', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Día</th>
                      <th>Hueco</th>
                      <th>Contenido</th>
                      <th>Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planReparto.plan.map((p) => (
                      <tr key={`${p.idea.id}-${p.idea.fecha}`}>
                        <td style={{ whiteSpace: 'nowrap' }}>{fechaCorta(p.idea.fecha)}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{ETIQUETA_HUECO[p.hueco]}</td>
                        <td>{p.idea.titulo || 'Sin título'}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{p.accion === 'asignar' ? 'Del listado' : 'Nueva'}</td>
                      </tr>
                    ))}
                    {planReparto.plan.length === 0 && (
                      <tr><td colSpan={4} className="lead-log-empty">No hay huecos libres o no quedan ideas sin fecha para ese periodo.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <p className="card-subtitle">
                {planReparto.plan.filter((p) => p.accion === 'asignar').length} ideas del listado se programan ·{' '}
                {planReparto.plan.filter((p) => p.accion === 'nuevo').length} piezas nuevas (cortes e historias) ·{' '}
                {planReparto.sobrantes} ideas siguen en el listado
              </p>

              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowReparto(false)}>Cancelar</button>
                <button type="button" className="primary-action" disabled={planReparto.plan.length === 0} onClick={guardarReparto}>
                  Guardar en el calendario
                </button>
              </div>
            </div>
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
              <label className="lead-detail-label">Fecha (opcional — déjala vacía y usa «🪄 Distribuir ideas» o asígnala luego desde el Listado de ideas)</label>
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
                <option value="">Sin decidir (lo decide el reparto)</option>
                {FORMATOS_CONTENIDO.map((f) => <option key={f} value={f}>{f}</option>)}
                {formData.formato && !FORMATOS_CONTENIDO.includes(formData.formato) && (
                  <option value={formData.formato}>{formData.formato}</option>
                )}
              </select>

              {largoDeEditando && (
                <p className="reparto-explicacion">✂️ Corte del vídeo largo «{largoDeEditando.titulo}» ({fechaCorta(largoDeEditando.fecha)}).</p>
              )}

              {ideaEditando && ideaEditando.formato === FORMATO_LARGO && (
                <div className="reparto-explicacion">
                  {cortesDeEditando.length > 0 ? (
                    <>
                      <strong>✂️ Cortes (Short + Reel):</strong>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                        {cortesDeEditando.map((c) => (
                          <li key={c.id}>{fechaCorta(c.fecha)} · {c.estado}</li>
                        ))}
                      </ul>
                    </>
                  ) : ideaEditando.fecha ? (
                    <button type="button" className="secondary-action" onClick={() => crearCortesDe(ideaEditando.id)}>
                      ✂️ Crear {NUM_CORTES} cortes (Short + Reel)
                    </button>
                  ) : (
                    <span>Guarda una fecha para poder crear sus {NUM_CORTES} cortes (Short + Reel).</span>
                  )}
                </div>
              )}

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

import { useEffect, useMemo, useState } from 'react'
import {
  insertFormacionInteresadoRemote, updateFormacionInteresadoRemote, deleteFormacionInteresadoRemote,
  guardarFormacionProgramaRemote,
} from '../lib/queries/formacion'

// 🎓 Formación: el programa de formación para otros profesionales (fisios,
// entrenadores…) y la lista de gente interesada. Mientras el programa se
// prepara, aquí se va apuntando a quien pregunta (con el Instagram, WhatsApp
// o email que haya dado) para avisarles cuando se lance. Es otro público y
// otro producto que los clientes, por eso no entra en el Pipeline de ventas.
// Solo admin (SECCIONES_POR_ROL + RLS de supabase-sql/69_formacion.sql).

export const ESTADOS_INTERESADO = [
  { id: 'interesado', label: 'Interesado', color: '#075985', fondo: '#e0f2fe' },
  { id: 'contactado', label: 'Contactado', color: '#92400e', fondo: '#fef3c7' },
  { id: 'inscrito', label: 'Inscrito', color: '#166534', fondo: '#dcfce7' },
  { id: 'descartado', label: 'Descartado', color: '#475569', fondo: '#f1f5f9' },
]

const PROFESIONES = ['Fisioterapeuta', 'Entrenador/a', 'Readaptador/a', 'Estudiante', 'Otro']

const initialForm = { nombre: '', instagram: '', whatsapp: '', email: '', profesion: '', origen: '', estado: 'interesado', notas: '' }

// Acepta "@usuario", "usuario" o el enlace entero de Instagram.
function urlInstagram(valor) {
  const v = (valor || '').trim()
  if (!v) return null
  if (/^https?:\/\//i.test(v)) return v
  const usuario = v.replace(/^@/, '').replace(/^(www\.)?instagram\.com\//i, '').replace(/\/+$/, '')
  return usuario ? `https://instagram.com/${usuario}` : null
}

// wa.me necesita solo dígitos con prefijo de país. Si se apunta un móvil
// español sin prefijo (9 cifras), se le pone el 34. Abre el chat como
// borrador, no envía nada (igual que las plantillas del protocolo de llamada).
function urlWhatsapp(valor) {
  let digitos = (valor || '').replace(/\D/g, '')
  if (!digitos) return null
  if (digitos.startsWith('00')) digitos = digitos.slice(2)
  if (digitos.length === 9) digitos = `34${digitos}`
  return `https://wa.me/${digitos}`
}

function fechaCorta(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

// En modo demo no se enseñan nombres ni contactos reales (son terceros).
function enmascarar(lista) {
  return lista.map((p, i) => ({
    ...p,
    nombre: `Interesado ${i + 1}`,
    instagram: p.instagram ? `@usuario${i + 1}` : '',
    whatsapp: p.whatsapp ? `600 000 ${String(i + 1).padStart(3, '0')}` : '',
    email: p.email ? `interesado${i + 1}@ejemplo.com` : '',
    notas: p.notas ? '…' : '',
  }))
}

export default function Formacion({ interesados = [], setInteresados, programa, setPrograma, modoDemo = false }) {
  const [tab, setTab] = useState('interesados')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState(initialForm)

  const visibles = useMemo(() => (modoDemo ? enmascarar(interesados) : interesados), [interesados, modoDemo])

  const conteo = useMemo(() => {
    const c = { todos: visibles.length }
    ESTADOS_INTERESADO.forEach((e) => { c[e.id] = visibles.filter((p) => p.estado === e.id).length })
    return c
  }, [visibles])

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return visibles.filter((p) => {
      if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false
      if (!q) return true
      return [p.nombre, p.instagram, p.whatsapp, p.email, p.profesion, p.origen, p.notas]
        .some((v) => (v || '').toLowerCase().includes(q))
    })
  }, [visibles, filtroEstado, busqueda])

  const openNew = () => {
    setEditingId(null)
    setFormData(initialForm)
    setShowForm(true)
  }

  const openEdit = (item) => {
    // En modo demo se edita la versión enmascarada (y no se guarda: demoGuard).
    const original = modoDemo ? item : (interesados.find((p) => p.id === item.id) || item)
    setEditingId(original.id)
    setFormData({ ...initialForm, ...original })
    setShowForm(true)
  }

  const cambiarEstado = (id, estado) => {
    setInteresados((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)))
    updateFormacionInteresadoRemote(id, { estado })
  }

  const eliminar = (id) => {
    if (!window.confirm('¿Eliminar este interesado?')) return
    setInteresados((prev) => prev.filter((p) => p.id !== id))
    deleteFormacionInteresadoRemote(id)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const datos = {}
    Object.keys(initialForm).forEach((k) => { datos[k] = (formData[k] || '').trim() })
    datos.estado = datos.estado || 'interesado'
    // Sin al menos una forma de contacto el registro no sirve para nada.
    if (!datos.instagram && !datos.whatsapp && !datos.email) {
      window.alert('Apunta al menos un Instagram, un WhatsApp o un email para poder contactar.')
      return
    }
    if (editingId) {
      setInteresados((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...datos } : p)))
      updateFormacionInteresadoRemote(editingId, datos)
    } else {
      const nuevo = { id: `formacion-${Date.now()}`, ...datos, creadoEn: new Date().toISOString() }
      setInteresados((prev) => [nuevo, ...prev])
      insertFormacionInteresadoRemote(nuevo)
    }
    setShowForm(false)
    setEditingId(null)
    setFormData(initialForm)
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Formación</div>
          <div className="topbar-subtitle">Programa para profesionales y lista de interesados</div>
        </div>
      </header>

      <main className="page-content">
        <div className="tabs-bar">
          <button type="button" className={`tab-btn ${tab === 'interesados' ? 'tab-btn-active' : ''}`} onClick={() => setTab('interesados')}>
            👥 Interesados ({interesados.length})
          </button>
          <button type="button" className={`tab-btn ${tab === 'programa' ? 'tab-btn-active' : ''}`} onClick={() => setTab('programa')}>
            📘 Programa
          </button>
        </div>

        {tab === 'interesados' && (
          <div className="table-card">
            <div className="card-header">
              <div>
                <div className="card-title">Interesados en la formación</div>
                <div className="card-subtitle">Quien te ha preguntado, para avisarle cuando se lance</div>
              </div>
              <button type="button" className="add-client-btn" onClick={openNew}>＋ Añadir interesado</button>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', padding: '0 20px 12px' }}>
              {[{ id: 'todos', label: 'Todos' }, ...ESTADOS_INTERESADO].map((e) => (
                <button key={e.id} type="button" className={`tab-btn ${filtroEstado === e.id ? 'tab-btn-active' : ''}`}
                  style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setFiltroEstado(e.id)}>
                  {e.label} ({conteo[e.id] || 0})
                </button>
              ))}
              <input type="search" placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                style={{ marginLeft: 'auto', padding: '7px 10px', borderRadius: 10, border: '1px solid var(--color-border)', minWidth: 160 }} />
            </div>

            <ul className="lead-log-list" style={{ padding: '0 20px 20px' }}>
              {filtrados.length === 0 && (
                <li className="lead-log-empty">
                  {interesados.length === 0 ? 'Todavía no hay nadie apuntado. Añade al primero con "＋ Añadir interesado".' : 'Nadie coincide con el filtro.'}
                </li>
              )}
              {filtrados.map((p) => {
                const estado = ESTADOS_INTERESADO.find((e) => e.id === p.estado) || ESTADOS_INTERESADO[0]
                const ig = urlInstagram(p.instagram)
                const wa = urlWhatsapp(p.whatsapp)
                return (
                  <li key={p.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong>{p.nombre || 'Sin nombre'}</strong>
                          <span className="status-pill" style={{ background: estado.fondo, color: estado.color }}>{estado.label}</span>
                          {p.profesion && <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{p.profesion}</span>}
                        </div>
                        <div style={{ fontSize: 12.5, marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {p.instagram && <span>📸 {p.instagram}</span>}
                          {p.whatsapp && <span>📱 {p.whatsapp}</span>}
                          {p.email && <span>✉️ {p.email}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                          {[p.origen && `Vía ${p.origen}`, p.creadoEn && `apuntado el ${fechaCorta(p.creadoEn)}`].filter(Boolean).join(' · ')}
                        </div>
                        {p.notas && (
                          <div style={{ fontSize: 12.5, marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p.notas}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
                        {ig && !modoDemo && <a className="row-action-btn" href={ig} target="_blank" rel="noreferrer">Instagram</a>}
                        {wa && !modoDemo && <a className="row-action-btn" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
                        {p.email && !modoDemo && <a className="row-action-btn" href={`mailto:${p.email}`}>Email</a>}
                        <select value={p.estado} onChange={(e) => cambiarEstado(p.id, e.target.value)}
                          style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 12.5 }}>
                          {ESTADOS_INTERESADO.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                        </select>
                        <button type="button" className="row-action-btn" onClick={() => openEdit(p)}>Editar</button>
                        <button type="button" className="row-action-btn" onClick={() => eliminar(p.id)}>Eliminar</button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {tab === 'programa' && <ProgramaFormacion programa={programa} setPrograma={setPrograma} />}
      </main>

      {showForm && (
        <div className="client-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="client-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{editingId ? 'Editar interesado' : 'Nuevo interesado'}</div>
                <div className="card-subtitle">Con un contacto basta (Instagram, WhatsApp o email)</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="modal-form" onSubmit={handleSubmit}>
              <input required placeholder="Nombre" value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
              <input placeholder="Instagram (@usuario)" value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })} />
              <input placeholder="WhatsApp (ej. 612 345 678 o +34 612…)" value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} />
              <input type="email" placeholder="Email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              <select value={formData.profesion} onChange={(e) => setFormData({ ...formData, profesion: e.target.value })}>
                <option value="">Profesión…</option>
                {PROFESIONES.map((p) => <option key={p} value={p}>{p}</option>)}
                {formData.profesion && !PROFESIONES.includes(formData.profesion) && <option value={formData.profesion}>{formData.profesion}</option>}
              </select>
              <input placeholder="¿Por dónde llegó? (Instagram, recomendación, un curso…)" value={formData.origen}
                onChange={(e) => setFormData({ ...formData, origen: e.target.value })} />
              <select value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })}>
                {ESTADOS_INTERESADO.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
              <textarea rows={3} placeholder="Notas (qué le interesa, cuándo podría empezar…)" value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })} style={{ fontFamily: 'inherit', resize: 'vertical' }} />
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

// El programa es texto libre mientras se prepara (a quién va, temario,
// formato, fechas, precio…). Se edita en borrador y se guarda con el botón,
// no en cada tecla, para no lanzar un upsert por letra.
function ProgramaFormacion({ programa, setPrograma }) {
  const [borrador, setBorrador] = useState({ titulo: programa?.titulo || '', contenido: programa?.contenido || '' })
  const [guardado, setGuardado] = useState(false)

  // Si el programa llega del servidor después de montar, se carga en el borrador.
  useEffect(() => {
    setBorrador({ titulo: programa?.titulo || '', contenido: programa?.contenido || '' })
  }, [programa?.titulo, programa?.contenido])

  const cambiado = borrador.titulo !== (programa?.titulo || '') || borrador.contenido !== (programa?.contenido || '')

  const guardar = () => {
    const datos = { titulo: borrador.titulo.trim(), contenido: borrador.contenido }
    setPrograma({ ...datos, actualizadoEn: new Date().toISOString() })
    guardarFormacionProgramaRemote(datos)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 1500)
  }

  return (
    <div className="table-card">
      <div className="card-header">
        <div>
          <div className="card-title">El programa</div>
          <div className="card-subtitle">
            {programa?.actualizadoEn ? `Última edición: ${fechaCorta(programa.actualizadoEn)}` : 'A quién va, temario, formato, fechas, precio…'}
          </div>
        </div>
        <button type="button" className="add-client-btn" onClick={guardar} disabled={!cambiado}>
          {guardado ? '✅ Guardado' : 'Guardar'}
        </button>
      </div>
      <div className="modal-form" style={{ padding: '0 20px 20px' }}>
        <input placeholder="Nombre del programa" value={borrador.titulo}
          onChange={(e) => setBorrador({ ...borrador, titulo: e.target.value })} />
        <textarea rows={18} value={borrador.contenido}
          placeholder={'Para quién es:\n\nObjetivos:\n\nTemario / módulos:\n\nFormato (online, presencial, duración):\n\nFechas previstas:\n\nPrecio:'}
          onChange={(e) => setBorrador({ ...borrador, contenido: e.target.value })}
          style={{ fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.5 }} />
      </div>
    </div>
  )
}

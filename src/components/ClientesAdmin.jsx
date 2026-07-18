import { useMemo, useState } from 'react'
import SERVICIOS from '../data/servicios'
import RENOVACIONES from '../data/renovaciones'
import SeguimientoCliente from './SeguimientoCliente'
import ValoracionCliente from './ValoracionCliente'
import CobrosPendientes from './CobrosPendientes'
import { insertClienteRemote, updateClienteRemote, deleteClienteRemote } from '../lib/queries/clientes'
import { generarPlazosPorNumero } from '../lib/plazos'

const estadoOptions = ['Todos', 'ACTIVO', 'NO ACTIVO']

const initialForm = {
  nombre: '',
  email: '',
  servicioId: SERVICIOS[0].id,
  otroServicio: '',
  estado: 'ACTIVO',
  formaPago: 'Stripe',
  trabajadores: [],
  fechaInicio: '',
  fechaFin: '',
  renueva: 'No',
  renovacionId: RENOVACIONES[0].id,
  otraRenovacion: '',
  importeRenovacion: RENOVACIONES[0].precio,
  fechaRenovacion: '',
  pago: 'COMPLETO',
  importeTotal: '',
  plazosDetalle: [],
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Genera el plan de cobros: 1 pago único si es COMPLETO, o 2/3 plazos
// repartiendo el importe total a partes iguales, con fechas mensuales a
// partir de hoy. Todos empiezan como pendientes y se marcan como
// cobrados después desde "Cobros pendientes" (que es lo que crea el
// ingreso automático en Finanzas).
function generarPlazos(pago, importeTotal) {
  const n = pago === '3 PLAZOS' ? 3 : pago === '2 PLAZOS' ? 2 : 1
  return generarPlazosPorNumero(n, importeTotal)
}

// El valor "Renueva" de los clientes sincronizados de Notion venía en inglés
// (Yes/No); lo normalizamos para no duplicar lógica por todo el componente.
function normalizaRenueva(valor) {
  const v = (valor || '').toString().trim().toLowerCase()
  if (v === 'yes' || v === 'sí' || v === 'si' || v === 'true') return 'Sí'
  return 'No'
}

function formatDate(value) {
  if (!value) return '—'
  return value
}

// Ya no se pide "HIGH TICKET / LOW TICKET" a mano: la categoría se deduce
// del propio programa contratado (Readáptate = alto valor, Previene = low ticket).
function categoriaPrograma(nombreServicio) {
  const s = (nombreServicio || '').toUpperCase()
  if (s.includes('PREVIENE')) return 'Programa Previene'
  if (s.includes('READAPTATE')) return 'Programa Readáptate'
  return 'Otro'
}

function StatusPill({ estado }) {
  const normalized = (estado || '').toLowerCase()
  const className = normalized === 'activo' ? 'status-activo' : 'status-inactivo'
  return <span className={`status-pill ${className}`}>{estado || 'Sin estado'}</span>
}

// Permite asignar varios profesionales a un mismo cliente
// (ej. fisioterapeuta + entrenador, o fisioterapeuta + nutricionista).
function MultiTrabajadorSelect({ options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const lista = selected || []

  const toggle = (name) => {
    if (lista.includes(name)) {
      onChange(lista.filter(n => n !== name))
    } else {
      onChange([...lista, name])
    }
  }

  return (
    <div className="multi-worker-select">
      <button type="button" className="multi-worker-trigger" onClick={() => setOpen(o => !o)}>
        <span>{lista.length === 0 ? 'Sin asignar' : lista.join(', ')}</span>
        <span className="multi-worker-caret">▾</span>
      </button>
      {open && (
        <div className="multi-worker-dropdown" onMouseLeave={() => setOpen(false)}>
          {options.length === 0 && <p className="lead-log-empty" style={{ padding: '6px 10px' }}>Sin técnicos en el equipo.</p>}
          {options.map(name => (
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

export default function ClientesAdmin({ clientes, setClientes, team, seguimientos = [], setSeguimientos, valoraciones = [], setValoraciones, ingresosEmpresa = [], setIngresosEmpresa, gastosEmpresa = [], setGastosEmpresa, tarifasPasarela = [], objetivosFase = [], setObjetivosFase }) {
  const [vista, setVista] = useState('listado')
  const [search, setSearch] = useState('')
  // Por defecto solo se ven los clientes ACTIVO (menos ruido visual); desde
  // el desplegable de estado se puede cambiar a "NO ACTIVO" o "Todos".
  const [estado, setEstado] = useState('ACTIVO')
  const [servicio, setServicio] = useState('Todos')
  const [categoria, setCategoria] = useState('Todos')
  const [trabajador, setTrabajador] = useState('Todos')
  const [renuevaFiltro, setRenuevaFiltro] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingIndex, setEditingIndex] = useState(null)
  const [formData, setFormData] = useState(initialForm)
  const [seguimientoCliente, setSeguimientoCliente] = useState(null)
  const [valoracionCliente, setValoracionCliente] = useState(null)

  const tecnicoNames = useMemo(
    () => team?.tecnico.map(persona => persona.nombre) ?? [],
    [team]
  )

  // Compatibilidad: clientes antiguos guardaban un único "Trabajador" (string);
  // los nuevos guardan "Trabajadores" (array), para poder asignar varios.
  const clientesConTrabajador = useMemo(() =>
    clientes.map(cliente => ({
      ...cliente,
      Trabajadores: cliente.Trabajadores || (cliente.Trabajador ? [cliente.Trabajador] : []),
    })),
    [clientes]
  )

  const trabajadorOptions = useMemo(() => {
    const opciones = new Set([
      ...tecnicoNames,
      ...clientesConTrabajador.flatMap(cliente => cliente.Trabajadores),
    ])
    return ['Todos', 'Sin asignar', ...Array.from(opciones)]
  }, [clientesConTrabajador, tecnicoNames])

  const servicioCounts = useMemo(() => {
    const counts = {}
    clientesConTrabajador.forEach(cliente => {
      const nombreServicio = cliente['Servicio contratado'] || 'Sin servicio'
      counts[nombreServicio] = (counts[nombreServicio] || 0) + 1
    })
    return counts
  }, [clientesConTrabajador])

  const filteredClientes = useMemo(() => {
    const term = search.toLowerCase().trim()
    return clientesConTrabajador
      .map((cliente, index) => ({ ...cliente, originalIndex: index }))
      .filter(cliente => {
        const matchesSearch = !term || [
          cliente.Nombre,
          cliente.Email,
          cliente['Servicio contratado'],
          cliente['Forma de pago'],
          cliente.Trabajadores.join(' '),
        ].some(value => (value || '').toLowerCase().includes(term))

        const matchesEstado = estado === 'Todos' || (cliente['Estado del cliente'] || '').toUpperCase() === estado
        const matchesServicio = servicio === 'Todos' || (cliente['Servicio contratado'] || '').toUpperCase() === servicio.toUpperCase()
        const matchesCategoria = categoria === 'Todos' || categoriaPrograma(cliente['Servicio contratado']) === categoria
        const matchesTrabajador = trabajador === 'Todos' ||
          (trabajador === 'Sin asignar' ? cliente.Trabajadores.length === 0 : cliente.Trabajadores.includes(trabajador))
        const matchesRenueva = renuevaFiltro === 'Todos' || normalizaRenueva(cliente.Renueva) === renuevaFiltro

        return matchesSearch && matchesEstado && matchesServicio && matchesCategoria && matchesTrabajador && matchesRenueva
      })
  }, [search, estado, servicio, categoria, trabajador, renuevaFiltro, clientesConTrabajador])

  const stats = useMemo(() => {
    const activos = clientesConTrabajador.filter(c => (c['Estado del cliente'] || '').toUpperCase() === 'ACTIVO').length
    const noActivos = clientesConTrabajador.filter(c => (c['Estado del cliente'] || '').toUpperCase() === 'NO ACTIVO').length
    const readaptate = clientesConTrabajador.filter(c => categoriaPrograma(c['Servicio contratado']) === 'Programa Readáptate').length
    const previene = clientesConTrabajador.filter(c => categoriaPrograma(c['Servicio contratado']) === 'Programa Previene').length
    const renuevan = clientesConTrabajador.filter(c => normalizaRenueva(c.Renueva) === 'Sí').length
    return { activos, noActivos, readaptate, previene, renuevan }
  }, [clientesConTrabajador])

  const plazosPendientesCount = useMemo(
    () => clientes.reduce((sum, c) => sum + (c.Plazos || []).filter(p => !p.pagado).length, 0),
    [clientes]
  )

  const handleSubmit = (event) => {
    event.preventDefault()
    const servicioSeleccionado = SERVICIOS.find(s => s.id === formData.servicioId)
    const nombreServicio = formData.servicioId === 'otro'
      ? (formData.otroServicio.trim() || 'Servicio personalizado')
      : (servicioSeleccionado?.nombre || '')

    const renovacionSeleccionada = RENOVACIONES.find(r => r.id === formData.renovacionId)
    const nombreRenovacion = formData.renovacionId === 'otro'
      ? (formData.otraRenovacion.trim() || 'Renovación personalizada')
      : (renovacionSeleccionada?.nombre || '')

    // Si el cliente pasa a NO ACTIVO, se le quita automáticamente
    // la asignación de profesionales del equipo técnico.
    const trabajadoresFinal = formData.estado === 'NO ACTIVO' ? [] : (formData.trabajadores || [])

    // El plan de plazos solo se genera la primera vez (cliente nuevo, o
    // cliente editado que todavía no tenía uno). Si ya existe un plan
    // (con plazos quizá ya cobrados), no se toca aquí para no perder ese
    // historial: las correcciones de importe/fecha se hacen desde
    // "Cobros pendientes".
    const planExistente = isEditing && editingIndex !== null ? (clientes[editingIndex].Plazos || []) : []
    const plazosFinal = planExistente.length > 0 ? planExistente : generarPlazos(formData.pago, formData.importeTotal)

    // Los clientes nunca tuvieron id propio (ni en el CSV ni en el estado
    // en memoria); se genera uno estable al crear y se conserva al editar,
    // igual que se hizo con anuncios/miembros_equipo/recontactos.
    const idExistente = isEditing && editingIndex !== null ? clientes[editingIndex].id : null
    const id = idExistente || `cliente-${Date.now()}`

    const clienteActualizado = {
      id,
      Nombre: formData.nombre,
      Email: formData.email,
      'Servicio contratado': nombreServicio,
      'Estado del cliente': formData.estado,
      'Forma de pago': formData.formaPago,
      Trabajadores: trabajadoresFinal,
      'Fecha inicio': formData.fechaInicio,
      'Fecha fin': formData.fechaFin,
      Renueva: formData.renueva,
      'Forma de renovación': formData.renueva === 'Sí' ? nombreRenovacion : '',
      'Importe renovación': formData.renueva === 'Sí' ? formData.importeRenovacion : '',
      'Fecha renovación': formData.renueva === 'Sí' ? formData.fechaRenovacion : '',
      Pago: formData.pago,
      'Importe total': formData.importeTotal,
      Plazos: plazosFinal,
    }

    if (isEditing && editingIndex !== null) {
      setClientes(prev => prev.map((item, index) => index === editingIndex ? clienteActualizado : item))
      updateClienteRemote(id, clienteActualizado)
    } else {
      setClientes(prev => [clienteActualizado, ...prev])
      insertClienteRemote(clienteActualizado)
    }

    setFormData(initialForm)
    setShowModal(false)
    setIsEditing(false)
    setEditingIndex(null)
  }

  const openNewClientModal = () => {
    setFormData(initialForm)
    setIsEditing(false)
    setEditingIndex(null)
    setShowModal(true)
  }

  const startEditCliente = (index) => {
    const cliente = clientes[index]
    const servicioActual = cliente['Servicio contratado'] || ''
    const servicioEncontrado = SERVICIOS.find(s => s.nombre === servicioActual)
    const renovacionActual = cliente['Forma de renovación'] || ''
    const renovacionEncontrada = RENOVACIONES.find(r => r.nombre === renovacionActual)
    setFormData({
      nombre: cliente.Nombre || '',
      email: cliente.Email || '',
      servicioId: servicioEncontrado ? servicioEncontrado.id : 'otro',
      otroServicio: servicioEncontrado ? '' : servicioActual,
      estado: cliente['Estado del cliente'] || 'ACTIVO',
      formaPago: cliente['Forma de pago'] || 'Stripe',
      trabajadores: cliente.Trabajadores || (cliente.Trabajador ? [cliente.Trabajador] : []),
      fechaInicio: cliente['Fecha inicio'] || '',
      fechaFin: cliente['Fecha fin'] || '',
      renueva: normalizaRenueva(cliente.Renueva),
      renovacionId: renovacionActual ? (renovacionEncontrada ? renovacionEncontrada.id : 'otro') : RENOVACIONES[0].id,
      otraRenovacion: renovacionActual && !renovacionEncontrada ? renovacionActual : '',
      importeRenovacion: cliente['Importe renovación'] || RENOVACIONES[0].precio,
      fechaRenovacion: cliente['Fecha renovación'] || '',
      pago: cliente.Pago || 'COMPLETO',
      importeTotal: cliente['Importe total'] || '',
      plazosDetalle: cliente.Plazos || [],
    })
    setIsEditing(true)
    setEditingIndex(index)
    setShowModal(true)
  }

  // Por si se crea un cliente de más (ej. explicando el proceso a alguien
  // y se guarda sin querer). No existía ninguna forma de borrar un
  // cliente, solo de crear/editar.
  const eliminarCliente = () => {
    if (editingIndex === null) return
    const cliente = clientes[editingIndex]
    if (!window.confirm(`¿Eliminar a "${cliente?.Nombre || 'este cliente'}"? Esta acción no se puede deshacer.`)) return
    setClientes(prev => prev.filter((_, index) => index !== editingIndex))
    if (cliente?.id) deleteClienteRemote(cliente.id)
    setShowModal(false)
    setIsEditing(false)
    setEditingIndex(null)
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Clientes</div>
          <div className="topbar-subtitle">Gestión y seguimiento de clientes</div>
        </div>
      </header>

      <main className="page-content">
        <div className="tabs-bar">
          <button
            type="button"
            className={`tab-btn ${vista === 'listado' ? 'tab-btn-active' : ''}`}
            onClick={() => setVista('listado')}
          >
            👥 Listado
          </button>
          <button
            type="button"
            className={`tab-btn ${vista === 'cobros' ? 'tab-btn-active' : ''}`}
            onClick={() => setVista('cobros')}
          >
            💳 Cobros pendientes{plazosPendientesCount > 0 ? ` (${plazosPendientesCount})` : ''}
          </button>
        </div>

        {vista === 'cobros' && (
          <CobrosPendientes
            clientes={clientes}
            setClientes={setClientes}
            setIngresosEmpresa={setIngresosEmpresa}
            setGastosEmpresa={setGastosEmpresa}
            tarifasPasarela={tarifasPasarela}
          />
        )}

        {vista === 'listado' && (
        <>
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Total clientes</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>👥</div>
            </div>
            <div className="kpi-card-value">{clientes.length}</div>
            <div className="kpi-card-footer">
              <span className="badge-up">▲ 100%</span>
              <span className="badge-text">base cargada</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Activos</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>✅</div>
            </div>
            <div className="kpi-card-value">{stats.activos}</div>
            <div className="kpi-card-footer">
              <span className="badge-up">▲ {Math.round((stats.activos / Math.max(clientes.length, 1)) * 100)}%</span>
              <span className="badge-text">del total</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">No activos</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>⏸️</div>
            </div>
            <div className="kpi-card-value">{stats.noActivos}</div>
            <div className="kpi-card-footer">
              <span className="badge-down">▼ {Math.round((stats.noActivos / Math.max(clientes.length, 1)) * 100)}%</span>
              <span className="badge-text">necesitan seguimiento</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Programa Readáptate</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>⭐</div>
            </div>
            <div className="kpi-card-value">{stats.readaptate}</div>
            <div className="kpi-card-footer">
              <span className="badge-up">▲ {Math.round((stats.readaptate / Math.max(clientes.length, 1)) * 100)}%</span>
              <span className="badge-text">del total</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Programa Previene</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>🛡️</div>
            </div>
            <div className="kpi-card-value">{stats.previene}</div>
            <div className="kpi-card-footer">
              <span className="badge-up">▲ {Math.round((stats.previene / Math.max(clientes.length, 1)) * 100)}%</span>
              <span className="badge-text">del total</span>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">Renuevan</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>🔄</div>
            </div>
            <div className="kpi-card-value">{stats.renuevan}</div>
            <div className="kpi-card-footer">
              <span className="badge-up">▲ {Math.round((stats.renuevan / Math.max(clientes.length, 1)) * 100)}%</span>
              <span className="badge-text">del total</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Vista rápida</div>
              <div className="card-subtitle">Distribuye y visualiza clientes por servicio contratado</div>
            </div>
            <button className="add-client-btn" onClick={openNewClientModal}>＋ Añadir cliente</button>
          </div>

          <div className="quick-view-grid">
            <button
              className={`quick-view-pill ${categoria === 'Todos' ? 'active' : ''}`}
              onClick={() => setCategoria('Todos')}
            >
              <span>Todos</span>
              <strong>{clientesConTrabajador.length}</strong>
            </button>
            <button
              className={`quick-view-pill ${categoria === 'Programa Readáptate' ? 'active' : ''}`}
              onClick={() => setCategoria('Programa Readáptate')}
            >
              <span>Programa Readáptate</span>
              <strong>{stats.readaptate}</strong>
            </button>
            <button
              className={`quick-view-pill ${categoria === 'Programa Previene' ? 'active' : ''}`}
              onClick={() => setCategoria('Programa Previene')}
            >
              <span>Programa Previene</span>
              <strong>{stats.previene}</strong>
            </button>
          </div>

          <div className="filters-grid">
            <input
              className="filter-input"
              placeholder="Buscar por nombre, email, servicio o trabajador..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select className="filter-select" value={estado} onChange={e => setEstado(e.target.value)}>
              {estadoOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <select className="filter-select" value={servicio} onChange={e => setServicio(e.target.value)}>
              <option value="Todos">Todos los programas</option>
              {SERVICIOS.map(s => <option key={s.id} value={s.nombre}>{s.nombre}</option>)}
              {Object.keys(servicioCounts).filter(nombre => !SERVICIOS.some(s => s.nombre === nombre)).map(nombre => (
                <option key={nombre} value={nombre}>{nombre}</option>
              ))}
            </select>
            <select className="filter-select" value={trabajador} onChange={e => setTrabajador(e.target.value)}>
              {trabajadorOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <select className="filter-select" value={renuevaFiltro} onChange={e => setRenuevaFiltro(e.target.value)}>
              <option value="Todos">Renueva: Todos</option>
              <option value="Sí">Renueva: Sí</option>
              <option value="No">Renueva: No</option>
            </select>
          </div>
        </div>

        <div className="table-card">
          <div className="card-header">
            <div>
              <div className="card-title">Listado de clientes</div>
              <div className="card-subtitle">{filteredClientes.length} resultados</div>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Categoría</th>
                  <th>Servicio</th>
                  <th>Estado</th>
                  <th>Profesionales</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Renueva</th>
                  <th>Forma de pago</th>
                  <th>Email</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((cliente, index) => (
                  <tr key={`${cliente.Nombre}-${index}`}>
                    <td style={{ fontWeight: 600 }}>{cliente.Nombre || '—'}</td>
                    <td>{categoriaPrograma(cliente['Servicio contratado'])}</td>
                    <td>{cliente['Servicio contratado'] || '—'}</td>
                    <td><StatusPill estado={cliente['Estado del cliente']} /></td>
                    <td>
                      <MultiTrabajadorSelect
                        options={tecnicoNames}
                        selected={cliente.Trabajadores}
                        onChange={(nuevos) => {
                          setClientes(prev => prev.map((item, i) => i === cliente.originalIndex ? { ...item, Trabajadores: nuevos } : item))
                          if (cliente.id) updateClienteRemote(cliente.id, { Trabajadores: nuevos })
                        }}
                      />
                    </td>
                    <td>{formatDate(cliente['Fecha inicio'])}</td>
                    <td>{formatDate(cliente['Fecha fin'])}</td>
                    <td>
                      <span className={`status-pill ${normalizaRenueva(cliente.Renueva) === 'Sí' ? 'status-activo' : 'status-inactivo'}`}>
                        {normalizaRenueva(cliente.Renueva)}
                      </span>
                      {normalizaRenueva(cliente.Renueva) === 'Sí' && cliente['Forma de renovación'] && (
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 3 }}>
                          {cliente['Forma de renovación']}{cliente['Importe renovación'] ? ` · ${cliente['Importe renovación']}€` : ''}
                        </div>
                      )}
                    </td>
                    <td>{cliente['Forma de pago'] || '—'}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{cliente.Email || '—'}</td>
                    <td>
                      <button
                        type="button"
                        className="row-action-btn"
                        onClick={() => startEditCliente(cliente.originalIndex)}
                      >
                        Editar
                      </button>
                      {typeof setSeguimientos === 'function' && (
                        <button
                          type="button"
                          className="row-action-btn"
                          onClick={() => setSeguimientoCliente(cliente)}
                        >
                          📋 Seguimiento
                        </button>
                      )}
                      {typeof setValoraciones === 'function' && (
                        <button
                          type="button"
                          className="row-action-btn"
                          onClick={() => setValoracionCliente(cliente)}
                        >
                          📈 Valoración
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>
        )}
      </main>

      {showModal && (
        <div className="client-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="client-modal" onClick={event => event.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">{isEditing ? 'Editar cliente' : 'Añadir cliente'}</div>
                <div className="card-subtitle">{isEditing ? 'Actualiza los datos del cliente' : 'Registra un nuevo cliente desde aquí'}</div>
              </div>
              <div className="lead-detail-actions" style={{ gap: 8 }}>
                {isEditing && (
                  <button type="button" className="danger-action" onClick={eliminarCliente}>🗑 Eliminar cliente</button>
                )}
                <button className="close-modal-btn" onClick={() => { setShowModal(false); setIsEditing(false); setEditingIndex(null) }}>✕</button>
              </div>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <input
                required
                placeholder="Nombre del cliente"
                value={formData.nombre}
                onChange={event => setFormData({ ...formData, nombre: event.target.value })}
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={event => setFormData({ ...formData, email: event.target.value })}
              />
              <label className="lead-detail-label">Programa contratado</label>
              <select
                value={formData.servicioId}
                onChange={event => {
                  const nuevoId = event.target.value
                  const servicioElegido = SERVICIOS.find(s => s.id === nuevoId)
                  setFormData({
                    ...formData,
                    servicioId: nuevoId,
                    importeTotal: servicioElegido ? servicioElegido.precio : formData.importeTotal,
                  })
                }}
              >
                {SERVICIOS.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre} — {s.precio}€</option>
                ))}
                <option value="otro">Otro (personalizado)</option>
              </select>
              {formData.servicioId === 'otro' && (
                <input
                  placeholder="Nombre del servicio"
                  value={formData.otroServicio}
                  onChange={event => setFormData({ ...formData, otroServicio: event.target.value })}
                />
              )}
              <label className="lead-detail-label">Importe total del servicio (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Importe total (€)"
                value={formData.importeTotal}
                onChange={event => setFormData({ ...formData, importeTotal: event.target.value })}
              />
              <label className="lead-detail-label">Tipo de pago</label>
              <select value={formData.pago} onChange={event => setFormData({ ...formData, pago: event.target.value })}>
                <option value="COMPLETO">COMPLETO (pago único)</option>
                <option value="2 PLAZOS">2 PLAZOS</option>
                <option value="3 PLAZOS">3 PLAZOS</option>
              </select>
              {formData.plazosDetalle.length > 0 ? (
                <p className="plan-subtitle-inline" style={{ fontSize: 12 }}>
                  Ya existe un plan de cobro para este cliente ({formData.plazosDetalle.filter(p => p.pagado).length}/{formData.plazosDetalle.length} cobrados).
                  Para corregir importes o fechas pendientes, ve a Clientes → Cobros pendientes.
                </p>
              ) : (
                formData.pago !== 'COMPLETO' && Number(formData.importeTotal) > 0 && (
                  <p className="plan-subtitle-inline" style={{ fontSize: 12 }}>
                    Al guardar se creará un plan de {formData.pago === '3 PLAZOS' ? 3 : 2} pagos de aprox. {Math.round((Number(formData.importeTotal) / (formData.pago === '3 PLAZOS' ? 3 : 2)) * 100) / 100}€ cada uno, visible en "Cobros pendientes".
                  </p>
                )
              )}
              <select
                value={formData.estado}
                onChange={event => {
                  const nuevoEstado = event.target.value
                  // Al pasar a NO ACTIVO se desasignan automáticamente los profesionales.
                  setFormData({
                    ...formData,
                    estado: nuevoEstado,
                    trabajadores: nuevoEstado === 'NO ACTIVO' ? [] : formData.trabajadores,
                  })
                }}
              >
                <option value="ACTIVO">ACTIVO</option>
                <option value="NO ACTIVO">NO ACTIVO</option>
              </select>
              <select value={formData.formaPago} onChange={event => setFormData({ ...formData, formaPago: event.target.value })}>
                <option value="Stripe">Stripe</option>
                <option value="Bizum">Bizum</option>
                <option value="Transferencia">Transferencia</option>
                <option value="HOTMART">HOTMART</option>
              </select>
              <div>
                <label className="lead-detail-label">Profesionales asignados</label>
                <MultiTrabajadorSelect
                  options={tecnicoNames}
                  selected={formData.trabajadores}
                  onChange={(nuevos) => setFormData({ ...formData, trabajadores: nuevos })}
                />
              </div>
              <input
                placeholder="Fecha inicio"
                value={formData.fechaInicio}
                onChange={event => setFormData({ ...formData, fechaInicio: event.target.value })}
              />
              <input
                placeholder="Fecha fin"
                value={formData.fechaFin}
                onChange={event => setFormData({ ...formData, fechaFin: event.target.value })}
              />
              <label className="lead-detail-label">¿Renueva?</label>
              <select
                value={formData.renueva}
                onChange={event => setFormData({ ...formData, renueva: event.target.value })}
              >
                <option value="No">No</option>
                <option value="Sí">Sí</option>
              </select>
              {formData.renueva === 'Sí' && (
                <div className="lead-venta-form">
                  <p className="plan-subtitle-inline">Datos de la renovación</p>
                  <select
                    value={formData.renovacionId}
                    onChange={event => {
                      const nuevoId = event.target.value
                      const renovacionElegida = RENOVACIONES.find(r => r.id === nuevoId)
                      setFormData({
                        ...formData,
                        renovacionId: nuevoId,
                        importeRenovacion: renovacionElegida ? renovacionElegida.precio : formData.importeRenovacion,
                      })
                    }}
                  >
                    {RENOVACIONES.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre} — {r.precio}€</option>
                    ))}
                    <option value="otro">Otro (personalizado)</option>
                  </select>
                  {formData.renovacionId === 'otro' && (
                    <input
                      placeholder="Forma de renovación (personalizada)"
                      value={formData.otraRenovacion}
                      onChange={event => setFormData({ ...formData, otraRenovacion: event.target.value })}
                    />
                  )}
                  <input
                    type="number"
                    placeholder="Importe de la renovación (€)"
                    value={formData.importeRenovacion}
                    onChange={event => setFormData({ ...formData, importeRenovacion: event.target.value })}
                  />
                  <input
                    placeholder="Fecha de renovación"
                    value={formData.fechaRenovacion}
                    onChange={event => setFormData({ ...formData, fechaRenovacion: event.target.value })}
                  />
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {seguimientoCliente && typeof setSeguimientos === 'function' && (
        <SeguimientoCliente
          cliente={seguimientoCliente}
          seguimientos={seguimientos}
          setSeguimientos={setSeguimientos}
          valoraciones={valoraciones}
          objetivosFase={objetivosFase}
          onClose={() => setSeguimientoCliente(null)}
        />
      )}

      {valoracionCliente && typeof setValoraciones === 'function' && (
        <ValoracionCliente
          cliente={valoracionCliente}
          valoraciones={valoraciones}
          setValoraciones={setValoraciones}
          objetivosFase={objetivosFase}
          setObjetivosFase={setObjetivosFase}
          esAdmin
          onClose={() => setValoracionCliente(null)}
        />
      )}
    </>
  )
}

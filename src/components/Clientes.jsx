import { useMemo, useState } from 'react'
import clientes from '../data/clientes'

const estadoOptions = ['Todos', 'ACTIVO', 'NO ACTIVO']
const tipoOptions = ['Todos', 'HIGH TICKET', 'LOW TICKET']
const servicioOptions = ['Todos', 'Mensual', 'Trimestral', 'Cuatrimestral', 'Semestral', 'Anual']
const workerNames = ['Laura', 'Mateo', 'Sofía', 'Javier', 'Clara']

const initialForm = {
  nombre: '',
  email: '',
  tipo: 'HIGH TICKET',
  servicio: 'Trimestral',
  estado: 'ACTIVO',
  formaPago: 'Stripe',
  trabajador: 'Laura',
  fechaInicio: '',
  fechaFin: '',
}

function formatDate(value) {
  if (!value) return '—'
  return value
}

function StatusPill({ estado }) {
  const normalized = (estado || '').toLowerCase()
  const className = normalized === 'activo' ? 'status-activo' : 'status-inactivo'
  return <span className={`status-pill ${className}`}>{estado || 'Sin estado'}</span>
}

export default function Clientes() {
  const [clientesData, setClientesData] = useState(clientes)
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('Todos')
  const [tipo, setTipo] = useState('Todos')
  const [servicio, setServicio] = useState('Todos')
  const [trabajador, setTrabajador] = useState('Todos')
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState(initialForm)

  const clientesConTrabajador = useMemo(() =>
    clientesData.map((cliente, index) => ({
      ...cliente,
      Trabajador: cliente.Trabajador || workerNames[index % workerNames.length],
    })),
    [clientesData]
  )

  const trabajadorOptions = useMemo(() => {
    const opciones = Array.from(new Set(clientesConTrabajador.map(cliente => cliente.Trabajador).filter(Boolean)))
    return ['Todos', ...opciones]
  }, [clientesConTrabajador])

  const filteredClientes = useMemo(() => {
    const term = search.toLowerCase().trim()
    return clientesConTrabajador.filter(cliente => {
      const matchesSearch = !term || [
        cliente.Nombre,
        cliente.Email,
        cliente['Tipo de cliente'],
        cliente['Servicio contratado'],
        cliente['Forma de pago'],
        cliente.Trabajador,
      ].some(value => (value || '').toLowerCase().includes(term))

      const matchesEstado = estado === 'Todos' || (cliente['Estado del cliente'] || '').toUpperCase() === estado
      const matchesTipo = tipo === 'Todos' || (cliente['Tipo de cliente'] || '').toUpperCase() === tipo
      const matchesServicio = servicio === 'Todos' || (cliente['Servicio contratado'] || '').toUpperCase() === servicio.toUpperCase()
      const matchesTrabajador = trabajador === 'Todos' || cliente.Trabajador === trabajador

      return matchesSearch && matchesEstado && matchesTipo && matchesServicio && matchesTrabajador
    })
  }, [search, estado, tipo, servicio, trabajador, clientesConTrabajador])

  const stats = useMemo(() => {
    const activos = clientesConTrabajador.filter(c => (c['Estado del cliente'] || '').toUpperCase() === 'ACTIVO').length
    const noActivos = clientesConTrabajador.filter(c => (c['Estado del cliente'] || '').toUpperCase() === 'NO ACTIVO').length
    const highTicket = clientesConTrabajador.filter(c => (c['Tipo de cliente'] || '').toUpperCase() === 'HIGH TICKET').length
    return { activos, noActivos, highTicket }
  }, [clientesConTrabajador])

  const handleSubmit = (event) => {
    event.preventDefault()
    const nuevoCliente = {
      Nombre: formData.nombre,
      Email: formData.email,
      'Tipo de cliente': formData.tipo,
      'Servicio contratado': formData.servicio,
      'Estado del cliente': formData.estado,
      'Forma de pago': formData.formaPago,
      Trabajador: formData.trabajador,
      'Fecha inicio': formData.fechaInicio,
      'Fecha fin': formData.fechaFin,
    }

    setClientesData(prev => [nuevoCliente, ...prev])
    setFormData(initialForm)
    setShowModal(false)
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
              <span className="kpi-card-label">High Ticket</span>
              <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>⭐</div>
            </div>
            <div className="kpi-card-value">{stats.highTicket}</div>
            <div className="kpi-card-footer">
              <span className="badge-up">▲ {Math.round((stats.highTicket / Math.max(clientes.length, 1)) * 100)}%</span>
              <span className="badge-text">clientes premium</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Vista rápida</div>
              <div className="card-subtitle">Distribuye y visualiza clientes por prioridad</div>
            </div>
            <button className="add-client-btn" onClick={() => setShowModal(true)}>＋ Añadir cliente</button>
          </div>

          <div className="quick-view-grid">
            <button
              className={`quick-view-pill ${tipo === 'Todos' ? 'active' : ''}`}
              onClick={() => setTipo('Todos')}
            >
              <span>Todos</span>
              <strong>{clientesConTrabajador.length}</strong>
            </button>
            <button
              className={`quick-view-pill ${tipo === 'HIGH TICKET' ? 'active' : ''}`}
              onClick={() => setTipo('HIGH TICKET')}
            >
              <span>High Ticket</span>
              <strong>{stats.highTicket}</strong>
            </button>
            <button
              className={`quick-view-pill ${tipo === 'LOW TICKET' ? 'active' : ''}`}
              onClick={() => setTipo('LOW TICKET')}
            >
              <span>Low Ticket</span>
              <strong>{clientesConTrabajador.length - stats.highTicket}</strong>
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
            <select className="filter-select" value={tipo} onChange={e => setTipo(e.target.value)}>
              {tipoOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <select className="filter-select" value={servicio} onChange={e => setServicio(e.target.value)}>
              {servicioOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            <select className="filter-select" value={trabajador} onChange={e => setTrabajador(e.target.value)}>
              {trabajadorOptions.map(option => <option key={option} value={option}>{option}</option>)}
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
                  <th>Tipo</th>
                  <th>Servicio</th>
                  <th>Estado</th>
                  <th>Trabajador</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Forma de pago</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((cliente, index) => (
                  <tr key={`${cliente.Nombre}-${index}`}>
                    <td style={{ fontWeight: 600 }}>{cliente.Nombre || '—'}</td>
                    <td>{cliente['Tipo de cliente'] || '—'}</td>
                    <td>{cliente['Servicio contratado'] || '—'}</td>
                    <td><StatusPill estado={cliente['Estado del cliente']} /></td>
                    <td><span className="worker-badge">{cliente.Trabajador || 'Sin asignar'}</span></td>
                    <td>{formatDate(cliente['Fecha inicio'])}</td>
                    <td>{formatDate(cliente['Fecha fin'])}</td>
                    <td>{cliente['Forma de pago'] || '—'}</td>
                    <td style={{ color: 'var(--color-text-secondary)' }}>{cliente.Email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showModal && (
        <div className="client-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="client-modal" onClick={event => event.stopPropagation()}>
            <div className="card-header">
              <div>
                <div className="card-title">Añadir cliente</div>
                <div className="card-subtitle">Registra un nuevo cliente desde aquí</div>
              </div>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}>✕</button>
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
              <select value={formData.tipo} onChange={event => setFormData({ ...formData, tipo: event.target.value })}>
                <option value="HIGH TICKET">HIGH TICKET</option>
                <option value="LOW TICKET">LOW TICKET</option>
              </select>
              <select value={formData.servicio} onChange={event => setFormData({ ...formData, servicio: event.target.value })}>
                {servicioOptions.filter(option => option !== 'Todos').map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select value={formData.estado} onChange={event => setFormData({ ...formData, estado: event.target.value })}>
                <option value="ACTIVO">ACTIVO</option>
                <option value="NO ACTIVO">NO ACTIVO</option>
              </select>
              <select value={formData.formaPago} onChange={event => setFormData({ ...formData, formaPago: event.target.value })}>
                <option value="Stripe">Stripe</option>
                <option value="Bizum">Bizum</option>
                <option value="Transferencia">Transferencia</option>
              </select>
              <input
                placeholder="Trabajador asignado"
                value={formData.trabajador}
                onChange={event => setFormData({ ...formData, trabajador: event.target.value })}
              />
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
              <div className="modal-actions">
                <button type="button" className="secondary-action" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="primary-action">Guardar cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

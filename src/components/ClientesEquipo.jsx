import { useMemo, useState } from 'react'
import SeguimientoCliente from './SeguimientoCliente'
import ValoracionCliente from './ValoracionCliente'

// Vista de Clientes para el equipo técnico: separada a propósito de
// ClientesAdmin.jsx, que lleva toda la parte de contabilidad/gestión
// (importes, plazos, cobros, altas/bajas, renovaciones). Un técnico no
// necesita ni debe ver esos datos — solo los suyos: quién es, qué programa
// tiene, y las dos herramientas de trabajo real con el cliente: Seguimiento
// y Valoración. Se identifica quién ha iniciado sesión cruzando su email
// con su ficha en Equipo, mismo patrón que MuroEquipo/VideosParaEditar.
function StatusPill({ estado }) {
  const normalized = (estado || '').toLowerCase()
  const className = normalized === 'activo' ? 'status-activo' : 'status-inactivo'
  return <span className={`status-pill ${className}`}>{estado || 'Sin estado'}</span>
}

function formatDate(value) {
  return value || '—'
}

export default function ClientesEquipo({ clientes = [], team, miEmail, rol, seguimientos = [], setSeguimientos, valoraciones = [], setValoraciones }) {
  const [search, setSearch] = useState('')
  const [seguimientoCliente, setSeguimientoCliente] = useState(null)
  const [valoracionCliente, setValoracionCliente] = useState(null)

  // Admin: acceso a Seguimiento/Valoración de TODOS los clientes (no solo
  // los suyos), porque necesita poder supervisar el trabajo de cualquier
  // entrenador. Técnico: solo ve los suyos, cruzando su email de login con
  // su ficha en Equipo (team.tecnico) para saber su nombre real.
  const esAdmin = rol === 'admin'

  const miPersona = useMemo(
    () => (team?.tecnico || []).find((p) => p.email && miEmail && p.email.toLowerCase() === miEmail.toLowerCase()),
    [team, miEmail]
  )
  const miNombre = miPersona?.nombre || null

  const misClientes = useMemo(() => {
    if (esAdmin) return clientes
    if (!miNombre) return []
    return clientes.filter((c) => {
      const trabajadores = c.Trabajadores || (c.Trabajador ? [c.Trabajador] : [])
      return trabajadores.includes(miNombre)
    })
  }, [clientes, miNombre, esAdmin])

  const filtrados = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) return misClientes
    return misClientes.filter((c) => [c.Nombre, c.Email, c['Servicio contratado']]
      .some((value) => (value || '').toLowerCase().includes(term)))
  }, [misClientes, search])

  const stats = useMemo(() => {
    const activos = misClientes.filter((c) => (c['Estado del cliente'] || '').toUpperCase() === 'ACTIVO').length
    return { total: misClientes.length, activos, noActivos: misClientes.length - activos }
  }, [misClientes])

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Clientes</div>
          <div className="topbar-subtitle">{esAdmin ? 'Todos los clientes: seguimiento y valoración' : 'Tus clientes: seguimiento y valoración'}</div>
        </div>
      </header>

      <main className="page-content">
        {!esAdmin && !miPersona && (
          <p className="lead-log-empty">
            No encontramos tu ficha en Equipo con este email — pídele a Raúl que revise que el email de tu ficha coincida con el de tu cuenta.
          </p>
        )}

        {(esAdmin || miPersona) && (
          <>
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-label">{esAdmin ? 'Total clientes' : 'Mis clientes'}</span>
                  <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>👥</div>
                </div>
                <div className="kpi-card-value">{stats.total}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-label">Activos</span>
                  <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>✅</div>
                </div>
                <div className="kpi-card-value">{stats.activos}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-label">No activos</span>
                  <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fee2e2, #fecaca)' }}>⏸️</div>
                </div>
                <div className="kpi-card-value">{stats.noActivos}</div>
              </div>
            </div>

            <div className="table-card">
              <div className="card-header">
                <div>
                  <div className="card-title">{esAdmin ? 'Todos los clientes' : 'Tus clientes'}</div>
                  <div className="card-subtitle">{filtrados.length} de {misClientes.length} mostrados</div>
                </div>
                <input
                  className="filter-input"
                  placeholder="Buscar por nombre, email o servicio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ maxWidth: 260 }}
                />
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Servicio</th>
                      {esAdmin && <th>Entrenador</th>}
                      <th>Estado</th>
                      <th>Inicio</th>
                      <th>Contacto</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((cliente, index) => {
                      const trabajadores = cliente.Trabajadores || (cliente.Trabajador ? [cliente.Trabajador] : [])
                      return (
                        <tr key={`${cliente.id || cliente.Nombre}-${index}`}>
                          <td style={{ fontWeight: 600 }}>{cliente.Nombre || '—'}</td>
                          <td>{cliente['Servicio contratado'] || '—'}</td>
                          {esAdmin && <td>{trabajadores.length ? trabajadores.join(', ') : '—'}</td>}
                          <td><StatusPill estado={cliente['Estado del cliente']} /></td>
                          <td>{formatDate(cliente['Fecha inicio'])}</td>
                          <td style={{ color: 'var(--color-text-secondary)' }}>
                            {cliente.Email || '—'}{cliente.Teléfono ? ` · ${cliente.Teléfono}` : ''}
                            {cliente.Drive && (
                              <> · <a href={cliente.Drive} target="_blank" rel="noopener noreferrer">Drive</a></>
                            )}
                          </td>
                          <td>
                            <button type="button" className="row-action-btn" onClick={() => setSeguimientoCliente(cliente)}>📋 Seguimiento</button>
                            <button type="button" className="row-action-btn" onClick={() => setValoracionCliente(cliente)}>📈 Valoración</button>
                          </td>
                        </tr>
                      )
                    })}
                    {filtrados.length === 0 && (
                      <tr><td colSpan={esAdmin ? 7 : 6} className="lead-log-empty">
                        {misClientes.length === 0 ? 'Todavía no tienes clientes asignados.' : 'Sin resultados con ese filtro.'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {seguimientoCliente && (
        <SeguimientoCliente
          cliente={seguimientoCliente}
          seguimientos={seguimientos}
          setSeguimientos={setSeguimientos}
          onClose={() => setSeguimientoCliente(null)}
        />
      )}

      {valoracionCliente && (
        <ValoracionCliente
          cliente={valoracionCliente}
          valoraciones={valoraciones}
          setValoraciones={setValoraciones}
          onClose={() => setValoracionCliente(null)}
        />
      )}
    </>
  )
}

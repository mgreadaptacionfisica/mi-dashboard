import { useMemo, useState } from 'react'
import CalendarioTecnico from './CalendarioTecnico'
import {
  actividadTecnico,
  seguimientoTecnico,
  contactoTecnico,
  mesActualISO,
  mesLabel,
} from '../utils/equipoHelpers'
import { semanaActualISO, progresoSemana, progresoContacto, ultimaRevisionCliente, resumenRevisionesSemana } from '../utils/seguimientoHelpers'

const SEGUIMIENTO_HELPERS = { semanaActualISO, progresoSemana, progresoContacto, ultimaRevisionCliente }

// Vista de auto-servicio del equipo técnico — a petición de Raúl, esta
// página ya NO tiene operatividad (nada de marcar tareas, contacto,
// check final ni registrar revisiones: todo eso vive en "Seguimiento y
// Valoración", ver ClientesEquipo.jsx). Aquí solo hay datos propios del
// técnico (ficha, pago) y un resumen tipo dashboard de lo que ha hecho y
// lo que le falta por hacer esta semana, con un botón para ir a hacer el
// trabajo real. Se identifica quién ha iniciado sesión cruzando su email
// con su ficha en Equipo, mismo patrón que ClientesEquipo/MuroEquipo.
export default function MiFicha({ team, clientes = [], seguimientos = [], contactosSemanales = [], gastosEmpresa = [], tareas = [], revisionesSemanales = [], miEmail, onNavigate }) {
  const [vista, setVista] = useState('resumen')

  const misTareasConFecha = useMemo(
    () => tareas.filter((t) => t.propietarioEmail === miEmail && t.fecha),
    [tareas, miEmail]
  )

  const miPersona = useMemo(
    () => (team?.tecnico || []).find((p) => p.email && miEmail && p.email.toLowerCase() === miEmail.toLowerCase()),
    [team, miEmail]
  )

  const actividad = useMemo(
    () => (miPersona ? actividadTecnico(miPersona, clientes) : null),
    [miPersona, clientes]
  )

  const seguimiento = useMemo(
    () => (actividad ? seguimientoTecnico(actividad.clientesAsignados, seguimientos, SEGUIMIENTO_HELPERS) : null),
    [actividad, seguimientos]
  )

  const contacto = useMemo(
    () => (actividad ? contactoTecnico(actividad.clientesAsignados, contactosSemanales, SEGUIMIENTO_HELPERS) : null),
    [actividad, contactosSemanales]
  )

  const semanaActual = semanaActualISO()
  const checkFinal = useMemo(
    () => (actividad ? resumenRevisionesSemana(actividad.clientesAsignados, revisionesSemanales, semanaActual) : null),
    [actividad, revisionesSemanales, semanaActual]
  )
  const pendientesCheckFinal = useMemo(() => {
    if (!actividad) return []
    return actividad.clientesAsignados.filter(
      (c) => !revisionesSemanales.some((r) => r.clienteNombre === c.Nombre && r.semana === semanaActual && r.revisado)
    )
  }, [actividad, revisionesSemanales, semanaActual])

  const mesKey = mesActualISO()
  const pagoRegistrado = miPersona && gastosEmpresa.find((g) => g.origen === 'equipo' && g.personaNombre === miPersona.nombre && g.mes === mesKey)

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Mi Ficha</div>
          <div className="topbar-subtitle">Tus datos, tu pago y un resumen de tu semana</div>
        </div>
        {typeof onNavigate === 'function' && (
          <button type="button" className="primary-action" onClick={() => onNavigate('clientes-equipo')}>📋 Ir a Seguimiento y Valoración</button>
        )}
      </header>

      <main className="page-content">
        {!miPersona && (
          <p className="lead-log-empty">
            No encontramos tu ficha en Equipo con este email — pídele a Raúl que revise que el email de tu ficha coincida con el de tu cuenta.
          </p>
        )}

        {miPersona && actividad && (
          <>
            <div className="tabs-bar" style={{ marginBottom: 20 }}>
              <button type="button" className={`tab-btn ${vista === 'resumen' ? 'tab-btn-active' : ''}`} onClick={() => setVista('resumen')}>📊 Resumen</button>
              <button type="button" className={`tab-btn ${vista === 'calendario' ? 'tab-btn-active' : ''}`} onClick={() => setVista('calendario')}>🗓️ Calendario</button>
            </div>

            {vista === 'calendario' && (
              <CalendarioTecnico
                tareas={misTareasConFecha}
                clientesAsignados={actividad.clientesAsignados}
                seguimientos={seguimientos}
              />
            )}

            {vista === 'resumen' && (
              <>
                <div className="team-grid" style={{ marginBottom: 20 }}>
                  <div className="team-card">
                    <div className="team-card-header">
                      <div>
                        <h3>{miPersona.nombre}</h3>
                        <p className="team-role">{miPersona.rol}</p>
                      </div>
                    </div>
                    <div className="team-card-body">
                      <p><strong>Email:</strong> {miPersona.email}</p>
                      <p><strong>Teléfono:</strong> {miPersona.telefono}</p>
                      {miPersona.carpetaDrive && (
                        <p><strong>Carpeta Drive:</strong> <a href={miPersona.carpetaDrive} target="_blank" rel="noopener noreferrer">Abrir 📁</a></p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="kpi-grid">
                  <div className="kpi-card">
                    <div className="kpi-card-header"><span className="kpi-card-label">Clientes activos</span><div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>✅</div></div>
                    <div className="kpi-card-value">{actividad.activos}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-card-header"><span className="kpi-card-label">Tarifa actual</span><div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)' }}>💶</div></div>
                    <div className="kpi-card-value">{actividad.tarifaActual}€/cliente</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-card-header"><span className="kpi-card-label">Contacto semanal</span><div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>📞</div></div>
                    <div className="kpi-card-value">{contacto?.total > 0 ? `${contacto.hechos}/${contacto.total}` : '—'}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-card-header"><span className="kpi-card-label">Progreso tareas semana</span><div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>🗓️</div></div>
                    <div className="kpi-card-value">{seguimiento?.porcentajeGeneral != null ? `${seguimiento.porcentajeGeneral}%` : '—'}</div>
                  </div>
                  <div className="kpi-card">
                    <div className="kpi-card-header">
                      <span className="kpi-card-label">Seguimiento revisado</span>
                      <div className="kpi-icon" style={{ background: checkFinal?.total > 0 && checkFinal.revisados === checkFinal.total ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' : 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
                        {checkFinal?.total > 0 && checkFinal.revisados === checkFinal.total ? '✅' : '⏳'}
                      </div>
                    </div>
                    <div className="kpi-card-value">{checkFinal?.total > 0 ? `${checkFinal.revisados}/${checkFinal.total}` : '—'}</div>
                  </div>
                </div>

                {pendientesCheckFinal.length > 0 && (
                  <div className="seguimiento-cierre-banner" style={{ marginTop: 16 }}>
                    <div>
                      <strong>Te falta cerrar la semana</strong>{' '}
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        de {pendientesCheckFinal.length} cliente{pendientesCheckFinal.length === 1 ? '' : 's'} — mira
                        el aviso ⏳ junto al nombre en la lista de abajo.
                      </span>
                    </div>
                    {typeof onNavigate === 'function' && (
                      <button type="button" className="secondary-action" onClick={() => onNavigate('clientes-equipo')}>Ir a revisar →</button>
                    )}
                  </div>
                )}

                <div className="team-payment-box" style={{ marginTop: 20 }}>
                  <div>
                    <p className="team-payment-label">Pago de {mesLabel(mesKey)}</p>
                    <p className="team-payment-amount">{actividad.totalMes.toLocaleString('es-ES')}€</p>
                  </div>
                  {pagoRegistrado ? (
                    <span className="status-pill status-activo">✅ Pagado el {pagoRegistrado.fecha}</span>
                  ) : (
                    <span className="status-pill status-pendiente">⏳ Pendiente de pago</span>
                  )}
                </div>

                <div className="table-card" style={{ marginTop: 20 }}>
                  <div className="card-header">
                    <div><div className="card-title">Historial mensual de pago</div></div>
                  </div>
                  <div className="team-history-table">
                    <div className="team-history-row team-history-header" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                      <span>Mes</span><span>Clientes activos</span><span>Tarifa</span><span>Total</span>
                    </div>
                    {actividad.historial.length === 0 && <p className="lead-log-empty">Sin historial todavía.</p>}
                    {actividad.historial.map((row) => (
                      <div className="team-history-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }} key={row.mes}>
                        <span>{row.mes}</span>
                        <span>{row.clientes}</span>
                        <span>{row.tarifa}€</span>
                        <strong>{row.total.toLocaleString('es-ES')}€</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="table-card" style={{ marginTop: 20 }}>
                  <div className="card-header">
                    <div>
                      <div className="card-title">Seguimiento semanal por cliente</div>
                      <div className="card-subtitle">Solo consulta — las tareas, el contacto, la valoración, las fases y el registro de revisiones se gestionan desde "📋 Seguimiento y Valoración".</div>
                    </div>
                  </div>
                  <ul className="lead-log-list seguimiento-resumen-list">
                    {seguimiento?.resumenClientes.map(({ cliente, progreso, ultimaRevision }, i) => (
                      <li key={i} className="seguimiento-resumen-item">
                        <div>
                          <strong>{cliente.Nombre}</strong>
                          {pendientesCheckFinal.some((c) => c.Nombre === cliente.Nombre) && (
                            <span className="semana-pendiente-badge" title="Semana sin revisar y cerrar todavía">⏳</span>
                          )}
                          {' '}— {cliente['Servicio contratado'] || 'Sin servicio'}
                          <div className="seguimiento-resumen-meta">
                            {progreso.total > 0 ? (
                              <span className={`seguimiento-progreso-badge ${progreso.porcentaje === 100 ? 'seguimiento-progreso-completo' : progreso.porcentaje === 0 ? 'seguimiento-progreso-pendiente' : ''}`}>
                                {progreso.revisadas}/{progreso.total} ({progreso.porcentaje}%)
                              </span>
                            ) : (
                              <span className="seguimiento-progreso-badge seguimiento-progreso-vacio">Sin tareas esta semana</span>
                            )}
                            <span className="seguimiento-ultima-revision">Última revisión: {ultimaRevision || 'nunca'}</span>
                          </div>
                        </div>
                      </li>
                    ))}
                    {(!seguimiento || seguimiento.resumenClientes.length === 0) && (
                      <p className="lead-log-empty">Sin clientes activos asignados.</p>
                    )}
                  </ul>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </>
  )
}

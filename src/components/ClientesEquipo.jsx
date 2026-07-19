import { useMemo, useState } from 'react'
import SeguimientoCliente from './SeguimientoCliente'
import ValoracionCliente from './ValoracionCliente'
import FasesObjetivos from './FasesObjetivos'
import { faseAutomatica, faseTopeSpadi, ultimoSpadiCliente } from '../utils/valoracionHelpers'
import { parseFechaFlexible, formatFechaISO } from '../utils/fechasEsp'
import { semanaActualISO, formatRangoSemana, resumenSemana } from '../utils/seguimientoHelpers'
import { upsertCierreSeguimientoRemote } from '../lib/queries/cierresSeguimiento'

// Vista de "Seguimiento y Valoración" para el equipo técnico: separada a
// propósito de ClientesAdmin.jsx (sidebar item "Clientes"), que lleva toda
// la parte de contabilidad/gestión (importes, plazos, cobros, altas/bajas,
// renovaciones). Un técnico no necesita ni debe ver esos datos — solo los
// suyos: quién es, qué programa tiene, y las dos herramientas de trabajo
// real con el cliente: Seguimiento y Valoración. Se identifica quién ha
// iniciado sesión cruzando su email con su ficha en Equipo, mismo patrón
// que MuroEquipo/VideosParaEditar.
//
// Solo se muestran clientes ACTIVOS aquí: no tiene sentido hacer
// seguimiento/valoración de alguien que ya no es cliente. Los no activos
// solo se gestionan desde ClientesAdmin (altas/bajas).
function formatDate(value) {
  if (!value) return '—'
  const iso = parseFechaFlexible(value)
  return iso ? formatFechaISO(iso) : value
}

export default function ClientesEquipo({ clientes = [], team, miEmail, rol, seguimientos = [], setSeguimientos, valoraciones = [], setValoraciones, objetivosClienteFase = [], setObjetivosClienteFase, cierresSeguimiento = [], setCierresSeguimiento }) {
  const [search, setSearch] = useState('')
  const [seguimientoCliente, setSeguimientoCliente] = useState(null)
  const [valoracionCliente, setValoracionCliente] = useState(null)
  const [fasesCliente, setFasesCliente] = useState(null)

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
    const base = esAdmin
      ? clientes
      : (miNombre
        ? clientes.filter((c) => {
          const trabajadores = c.Trabajadores || (c.Trabajador ? [c.Trabajador] : [])
          return trabajadores.includes(miNombre)
        })
        : [])
    // Solo activos: seguimiento/valoración no aplica a quien ya no es cliente.
    return base.filter((c) => (c['Estado del cliente'] || '').toUpperCase() === 'ACTIVO')
  }, [clientes, miNombre, esAdmin])

  const filtrados = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) return misClientes
    return misClientes.filter((c) => [c.Nombre, c.Email, c['Servicio contratado']]
      .some((value) => (value || '').toLowerCase().includes(term)))
  }, [misClientes, search])

  // "Check final" del seguimiento semanal (a petición de Raúl): contador de
  // cuántos de MIS clientes (los del técnico, o todos si es admin) tienen
  // ya el seguimiento de esta semana 100% revisado, más un cierre manual y
  // persistente para dejar constancia de que se revisó todo. Se identifica
  // por persona: el nombre del técnico, o 'ADMIN' para el cierre global del
  // admin sobre todo el equipo — cada uno cierra su propio ámbito.
  const semanaActual = semanaActualISO()
  const personaCierre = esAdmin ? 'ADMIN' : miNombre
  const resumen = useMemo(
    () => resumenSemana(misClientes, seguimientos, semanaActual),
    [misClientes, seguimientos, semanaActual]
  )
  const cierreActual = cierresSeguimiento.find((c) => c.persona === personaCierre && c.semana === semanaActual)
  const semanaCerrada = cierreActual?.cerrado || false
  const todoRevisado = resumen.total > 0 && resumen.revisados === resumen.total

  const toggleCierreSemana = () => {
    if (!personaCierre || typeof setCierresSeguimiento !== 'function') return
    const cerrando = !semanaCerrada
    if (cerrando && !todoRevisado) {
      const seguir = window.confirm(
        `Todavía hay ${resumen.total - resumen.revisados} de ${resumen.total} clientes sin el seguimiento de esta semana 100% revisado. ¿Cerrar la semana igualmente?`
      )
      if (!seguir) return
    }
    const actualizado = {
      persona: personaCierre,
      semana: semanaActual,
      cerrado: cerrando,
      cerradoEn: new Date().toISOString(),
      cerradoPor: miEmail || '',
    }
    setCierresSeguimiento((prev) => {
      const existe = prev.some((c) => c.persona === personaCierre && c.semana === semanaActual)
      if (existe) return prev.map((c) => (c.persona === personaCierre && c.semana === semanaActual ? { ...c, ...actualizado } : c))
      return [...prev, actualizado]
    })
    upsertCierreSeguimientoRemote(actualizado)
  }

  return (
    <>
      <header className="topbar">
        <div>
          <div className="topbar-title">Seguimiento y Valoración</div>
          <div className="topbar-subtitle">{esAdmin ? 'Clientes activos de todo el equipo' : 'Tus clientes activos'}</div>
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
                  <span className="kpi-card-label">{esAdmin ? 'Clientes activos (todos)' : 'Mis clientes activos'}</span>
                  <div className="kpi-icon" style={{ background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)' }}>✅</div>
                </div>
                <div className="kpi-card-value">{misClientes.length}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-card-header">
                  <span className="kpi-card-label">Seguimiento revisado esta semana</span>
                  <div className="kpi-icon" style={{ background: todoRevisado ? 'linear-gradient(135deg, #d1fae5, #a7f3d0)' : 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
                    {todoRevisado ? '✅' : '⏳'}
                  </div>
                </div>
                <div className="kpi-card-value">{resumen.revisados}/{resumen.total}</div>
              </div>
            </div>

            {personaCierre && (
              <div className={`seguimiento-cierre-banner${semanaCerrada ? ' seguimiento-cierre-banner-cerrado' : ''}`}>
                <div>
                  <strong>Semana del {formatRangoSemana(semanaActual)}</strong>
                  {semanaCerrada ? (
                    <span> — ✅ Cerrada{cierreActual?.cerradoPor ? ` por ${cierreActual.cerradoPor}` : ''}{cierreActual?.cerradoEn ? ` el ${new Date(cierreActual.cerradoEn).toLocaleDateString('es-ES')}` : ''}.</span>
                  ) : (
                    <span style={{ color: 'var(--color-text-secondary)' }}> — todavía sin cerrar {esAdmin ? '(cierre global del equipo)' : '(tus clientes)'}.</span>
                  )}
                </div>
                <button type="button" className="secondary-action" onClick={toggleCierreSemana}>
                  {semanaCerrada ? '🔓 Reabrir semana' : '✅ Cerrar semana'}
                </button>
              </div>
            )}

            <div className="table-card">
              <div className="card-header">
                <div>
                  <div className="card-title">{esAdmin ? 'Clientes activos' : 'Tus clientes activos'}</div>
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
                      <th>Fase</th>
                      <th>Inicio</th>
                      <th>Contacto</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((cliente, index) => {
                      const trabajadores = cliente.Trabajadores || (cliente.Trabajador ? [cliente.Trabajador] : [])
                      const spadiTope = faseTopeSpadi(ultimoSpadiCliente(valoraciones, cliente.Nombre))
                      const fase = faseAutomatica(objetivosClienteFase.filter((o) => o.clienteNombre === cliente.Nombre), spadiTope)
                      return (
                        <tr key={`${cliente.id || cliente.Nombre}-${index}`}>
                          <td style={{ fontWeight: 600 }}>{cliente.Nombre || '—'}</td>
                          <td>{cliente['Servicio contratado'] || '—'}</td>
                          {esAdmin && <td>{trabajadores.length ? trabajadores.join(', ') : '—'}</td>}
                          <td>
                            <span className="status-pill status-activo">Fase {fase}</span>
                          </td>
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
                            <button type="button" className="row-action-btn" onClick={() => setFasesCliente(cliente)}>🎯 Fases y objetivos</button>
                          </td>
                        </tr>
                      )
                    })}
                    {filtrados.length === 0 && (
                      <tr><td colSpan={esAdmin ? 7 : 6} className="lead-log-empty">
                        {misClientes.length === 0 ? 'No hay clientes activos asignados.' : 'Sin resultados con ese filtro.'}
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
          valoraciones={valoraciones}
          objetivosClienteFase={objetivosClienteFase}
          onClose={() => setSeguimientoCliente(null)}
        />
      )}

      {valoracionCliente && (
        <ValoracionCliente
          cliente={valoracionCliente}
          valoraciones={valoraciones}
          setValoraciones={setValoraciones}
          objetivosClienteFase={objetivosClienteFase}
          onClose={() => setValoracionCliente(null)}
        />
      )}

      {fasesCliente && (
        <FasesObjetivos
          cliente={fasesCliente}
          objetivosClienteFase={objetivosClienteFase}
          setObjetivosClienteFase={setObjetivosClienteFase}
          valoraciones={valoraciones}
          onClose={() => setFasesCliente(null)}
        />
      )}
    </>
  )
}
